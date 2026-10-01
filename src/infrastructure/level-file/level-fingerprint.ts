import type { LevelDocument } from '../../domain/level-document';
import { encodeLevelFile } from './level-file-codec';

const FINGERPRINT_HEX_DIGITS = 16;

/**
 * Fingerprint of a level (ADR 0015 § Empreinte et doublons): the first 16 hexadecimal
 * digits of the SHA-256 of the UTF-8 bytes of the file codec text. Two equal documents
 * share a fingerprint; it identifies a received level (`recu-<empreinte>`).
 */
export const levelFingerprint = async (document: LevelDocument): Promise<string> => {
  const bytes = new TextEncoder().encode(encodeLevelFile(document));
  const digest = await crypto.subtle.digest('SHA-256', bytes);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, FINGERPRINT_HEX_DIGITS);
};
