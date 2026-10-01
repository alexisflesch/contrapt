import type { LevelDocument } from '../../domain/level-document';
import type {
  ReceivedLevel,
  ReceivedLevelRepository,
  ReceivedLevelRepositoryErrorCode,
  ReceivedLevelRepositoryWarning,
} from './received-level-repository';

/**
 * The fingerprint of the received document (ADR 0015 § Empreinte), computed
 * by the caller: `unavailable` when it could not be (no `crypto.subtle`
 * outside a secure context, for instance).
 */
export type LevelFingerprintResult =
  | { readonly status: 'ok'; readonly fingerprint: string }
  | { readonly status: 'unavailable' };

type ReceiveLevelResult =
  | {
      readonly status: 'received';
      readonly level: ReceivedLevel;
      /** `false` when the same document was already received: the entry is left as it was. */
      readonly isNew: boolean;
      readonly warning?: ReceivedLevelRepositoryWarning;
    }
  /** A workshop (object or wire to place) is not a level to play. */
  | { readonly status: 'refused'; readonly code: 'workshop-document' }
  /** The level may still be played; it was not stored. */
  | {
      readonly status: 'not-kept';
      readonly code: 'fingerprint-unavailable' | ReceivedLevelRepositoryErrorCode;
    };

const isWorkshop = (document: LevelDocument): boolean =>
  document.objects.some(({ toPlace }) => toPlace === true) ||
  document.wires.some(({ toPlace }) => toPlace === true);

/**
 * ADR 0015 § Réception: a level received by link or file is always stored,
 * once per document (`recu-<empreinte>`); receiving it again keeps its
 * resolution, record and player solution. A storage failure is a result,
 * never an exception: the caller still lets the level be played.
 */
export const receiveLevel = (
  repository: ReceivedLevelRepository,
  document: LevelDocument,
  origin: ReceivedLevel['origin'],
  fingerprint: LevelFingerprintResult,
  clock: () => Date,
): ReceiveLevelResult => {
  if (isWorkshop(document)) return { status: 'refused', code: 'workshop-document' };
  if (fingerprint.status === 'unavailable') {
    return { status: 'not-kept', code: 'fingerprint-unavailable' };
  }

  const id = `recu-${fingerprint.fingerprint}`;
  const existing = repository.load(id);
  if (existing.status === 'error') return { status: 'not-kept', code: existing.code };
  if (existing.level !== null) return { status: 'received', level: existing.level, isNew: false };

  const level: ReceivedLevel = {
    id,
    document,
    origin,
    receivedAt: clock().toISOString(),
    solved: false,
  };
  const saved = repository.save(level);
  if (saved.status === 'error') return { status: 'not-kept', code: saved.code };
  return {
    status: 'received',
    level,
    isNew: true,
    ...(saved.warning === undefined ? {} : { warning: saved.warning }),
  };
};
