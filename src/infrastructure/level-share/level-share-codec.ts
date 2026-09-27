import type { LevelDocument } from '../../domain/level-document';
import {
  MAX_LEVEL_FILE_SIZE_BYTES,
  decodeLevelFile,
  encodeLevelFile,
} from '../level-file/level-file-codec';

const MAX_SHARE_CHARGE_CHARACTERS = 16_384;
const MAX_FRAGMENT_PREFIX = '#level=';
const CRC32_POLYNOMIAL_IEEE = 0xedb88320;

const crc32Table = Array.from({ length: 256 }, (_, tableIndex) => {
  let value = tableIndex;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 1 ? CRC32_POLYNOMIAL_IEEE ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

export const crc32Ieee = (bytes: Uint8Array): number => {
  let checksum = 0xffffffff;
  for (const byte of bytes) {
    checksum = (crc32Table[(checksum ^ byte) & 0xff] ?? 0) ^ (checksum >>> 8);
  }
  return (checksum ^ 0xffffffff) >>> 0;
};

const checksumHex = (bytes: Uint8Array): string => crc32Ieee(bytes).toString(16).padStart(8, '0');

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
};

const fromBase64Url = (value: string): Uint8Array | null => {
  if (!/^[A-Za-z0-9_-]*$/u.test(value) || value.length % 4 === 1) return null;

  const padded =
    value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return toBase64Url(bytes) === value ? bytes : null;
  } catch {
    return null;
  }
};

const createByteStream = (bytes: Uint8Array): ReadableStream<BufferSource> =>
  new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(bytes));
      controller.close();
    },
  });

const compressRaw = async (bytes: Uint8Array): Promise<Uint8Array> => {
  const compressed = createByteStream(bytes).pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(compressed).arrayBuffer());
};

const decompressRawWithinSize = async (
  compressed: Uint8Array,
  expectedSize: number,
): Promise<Uint8Array | null> => {
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const decompressed = createByteStream(compressed).pipeThrough(
      new DecompressionStream('deflate-raw'),
    );
    reader = decompressed.getReader();

    let totalSize = 0;
    const chunks: Uint8Array[] = [];
    let result = await reader.read();
    while (!result.done) {
      totalSize += result.value.byteLength;
      if (totalSize > expectedSize) {
        await reader.cancel();
        return null;
      }
      chunks.push(result.value);
      result = await reader.read();
    }

    if (totalSize !== expectedSize) return null;

    const bytes = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  } catch {
    if (reader !== undefined) {
      try {
        await reader.cancel();
      } catch {
        // A failed decompression stream may already be errored or cancelled.
      }
    }
    return null;
  } finally {
    reader?.releaseLock();
  }
};

type LevelFileError = Extract<ReturnType<typeof decodeLevelFile>, { readonly status: 'error' }>;
type ShareDecodeResult =
  | { readonly status: 'ok'; readonly document: LevelDocument }
  | LevelFileError
  | {
      readonly status: 'error';
      readonly code:
        | 'too-large'
        | 'unsupported-version'
        | 'invalid-encoding'
        | 'size-mismatch'
        | 'checksum-mismatch';
    };

const error = (
  code: Exclude<ShareDecodeResult, { readonly status: 'ok' }>['code'],
): ShareDecodeResult => ({ status: 'error', code });

/** Encode a level as a browser-ready `#level=...` fragment. */
export const encodeShareFragment = async (document: LevelDocument): Promise<string> => {
  const json = encodeLevelFile(document);
  const jsonBytes = new TextEncoder().encode(json);
  if (jsonBytes.byteLength > MAX_LEVEL_FILE_SIZE_BYTES) {
    throw new RangeError('Le document dépasse la taille maximale de partage.');
  }

  const compressed = await compressRaw(jsonBytes);
  const charge = `1.${checksumHex(jsonBytes)}.${String(jsonBytes.byteLength)}.${toBase64Url(compressed)}`;
  if (charge.length > MAX_SHARE_CHARGE_CHARACTERS) {
    throw new RangeError('Le fragment dépasse la taille maximale de partage.');
  }
  return `${MAX_FRAGMENT_PREFIX}${charge}`;
};

const decodeShareFragmentUnchecked = async (fragment: string): Promise<ShareDecodeResult> => {
  if (fragment.length > MAX_FRAGMENT_PREFIX.length + MAX_SHARE_CHARGE_CHARACTERS) {
    return error('too-large');
  }
  if (!fragment.startsWith(MAX_FRAGMENT_PREFIX)) return error('invalid-encoding');

  const charge = fragment.slice(MAX_FRAGMENT_PREFIX.length);
  if (charge.length > MAX_SHARE_CHARGE_CHARACTERS) return error('too-large');

  const parts = charge.split('.');
  if (parts.length !== 4) return error('unsupported-version');
  const [version, checksum, sizeText, encodedData] = parts;
  if (
    version !== '1' ||
    checksum === undefined ||
    !/^[0-9a-f]{8}$/u.test(checksum) ||
    sizeText === undefined ||
    !/^\d+$/u.test(sizeText) ||
    encodedData === undefined
  ) {
    return error('unsupported-version');
  }

  const expectedSize = Number(sizeText);
  if (!Number.isSafeInteger(expectedSize) || expectedSize > MAX_LEVEL_FILE_SIZE_BYTES) {
    return error('too-large');
  }

  const compressed = fromBase64Url(encodedData);
  if (compressed === null) return error('invalid-encoding');

  const jsonBytes = await decompressRawWithinSize(compressed, expectedSize);
  if (jsonBytes === null) return error('size-mismatch');
  if (checksumHex(jsonBytes) !== checksum) return error('checksum-mismatch');

  let json: string;
  try {
    json = new TextDecoder('utf-8', { fatal: true }).decode(jsonBytes);
  } catch {
    return error('invalid-json');
  }

  return decodeLevelFile(json);
};

/** Validate and decode an untrusted browser hash without unbounded decompression. */
export const decodeShareFragment = async (fragment: string): Promise<ShareDecodeResult> => {
  if (typeof fragment !== 'string') return error('invalid-encoding');
  try {
    return await decodeShareFragmentUnchecked(fragment);
  } catch {
    return error('size-mismatch');
  }
};
