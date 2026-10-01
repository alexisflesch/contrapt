import type { LevelFingerprintResult } from '../application/received/receive-level';
import type { LevelDocument } from '../domain/level-document';
import { levelFingerprint } from '../infrastructure/level-file/level-fingerprint';

/**
 * `crypto.subtle` is missing outside a secure context (HTTP on a local IP):
 * the level is then not kept (ADR 0015 § Réception), never refused.
 */
export const fingerprintOf = async (document: LevelDocument): Promise<LevelFingerprintResult> => {
  try {
    return { status: 'ok', fingerprint: await levelFingerprint(document) };
  } catch {
    return { status: 'unavailable' };
  }
};
