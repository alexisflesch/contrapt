import type { LevelDocument } from '../domain/level-document';

/** What a preview image is drawn from: the document, the CSS size shown and the pixel density. */
export type LevelPreviewRequest = Readonly<{
  readonly document: LevelDocument;
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly devicePixelRatio: number;
}>;

/**
 * A claim on a cached image. The URL stays valid until `release` is called;
 * only then may the cache revoke it.
 */
export type LevelPreviewLease = Readonly<{
  readonly url: string;
  readonly release: () => void;
}>;

type LevelPreviewCacheOptions = Readonly<{
  /** Entries kept once nobody displays them; entries in use are never evicted. */
  readonly capacity: number;
  /** Identifies a document's content: equal documents share it (`levelFingerprint`). */
  readonly fingerprint: (document: LevelDocument) => Promise<string>;
  readonly render: (request: LevelPreviewRequest) => Promise<Blob>;
  readonly createObjectUrl: (blob: Blob) => string;
  readonly revokeObjectUrl: (url: string) => void;
}>;

export type LevelPreviewCache = Readonly<{
  readonly acquire: (request: LevelPreviewRequest) => Promise<LevelPreviewLease>;
}>;

type Entry = {
  readonly ready: Promise<string>;
  /** Set once the image is drawn; an entry with no URL yet is never evicted. */
  url: string | undefined;
  /** Leases not yet released. */
  leases: number;
};

const cacheKey = (fingerprint: string, request: LevelPreviewRequest): string =>
  [
    fingerprint,
    `${String(Math.round(request.cssWidth))}x${String(Math.round(request.cssHeight))}`,
    String(request.devicePixelRatio),
  ].join('|');

/**
 * Cache of preview images keyed by the document's fingerprint (V5): the same
 * document, size and density are drawn once; a modified document is a new entry.
 * It is a least-recently-used cache of object URLs, revoked on eviction. A URL
 * a card still displays is not evicted: the cache may run over its capacity
 * while images are in use and trims back as they are released.
 */
export const createLevelPreviewCache = ({
  capacity,
  fingerprint,
  render,
  createObjectUrl,
  revokeObjectUrl,
}: LevelPreviewCacheOptions): LevelPreviewCache => {
  // A Map iterates in insertion order: re-inserting on use keeps the oldest use first.
  const entries = new Map<string, Entry>();

  const trim = (): void => {
    for (const [key, entry] of entries) {
      if (entries.size <= capacity) return;
      if (entry.leases > 0 || entry.url === undefined) continue;
      entries.delete(key);
      revokeObjectUrl(entry.url);
    }
  };

  const draw = (key: string, request: LevelPreviewRequest): Entry => {
    const ready = render(request).then(createObjectUrl);
    const entry: Entry = { ready, url: undefined, leases: 0 };
    ready.then(
      (url) => {
        entry.url = url;
        trim();
      },
      () => {
        // A failure is not remembered: the next request draws again.
        if (entries.get(key) === entry) entries.delete(key);
      },
    );
    return entry;
  };

  const acquire = async (request: LevelPreviewRequest): Promise<LevelPreviewLease> => {
    const key = cacheKey(await fingerprint(request.document), request);
    const known = entries.get(key);
    entries.delete(key);
    const entry = known ?? draw(key, request);
    entries.set(key, entry);

    entry.leases += 1;
    let url: string;
    try {
      url = await entry.ready;
    } catch (error: unknown) {
      entry.leases -= 1;
      throw error;
    }

    let released = false;
    return {
      url,
      release: () => {
        if (released) return;
        released = true;
        entry.leases -= 1;
        trim();
      },
    };
  };

  return { acquire };
};
