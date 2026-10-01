import type { ConstructionAttempt } from '../construction';
import { countObjectsUsed } from '../progression';
import { solutionFromAttempt } from '../puzzle/player-solution';
import type {
  ReceivedLevel,
  ReceivedLevelRepository,
  ReceivedLevelRepositoryErrorCode,
} from './received-level-repository';

type RecordReceivedVictoryResult =
  | { readonly status: 'recorded'; readonly level: ReceivedLevel }
  /** The entry is gone (deleted elsewhere): nothing is written. */
  | { readonly status: 'not-found' }
  /** The victory could not be stored; the game goes on. */
  | { readonly status: 'not-kept'; readonly code: ReceivedLevelRepositoryErrorCode };

/**
 * ADR 0015 § Victoire sur un niveau reçu: a victory marks the entry solved,
 * keeps the best object count (ADR 0010 definition) and replaces the
 * player's solution by the winning one. `attempt` is the snapshot taken at
 * launch, as for the campaign progression. A storage failure is a result,
 * never an exception.
 */
export const recordReceivedVictory = (
  repository: ReceivedLevelRepository,
  id: string,
  attempt: ConstructionAttempt,
): RecordReceivedVictoryResult => {
  const loaded = repository.load(id);
  if (loaded.status === 'error') return { status: 'not-kept', code: loaded.code };
  if (loaded.level === null) return { status: 'not-found' };

  const objectsUsed = countObjectsUsed(attempt);
  const previousBest = loaded.level.solved ? loaded.level.bestObjectCount : undefined;
  const level: ReceivedLevel = {
    ...loaded.level,
    solved: true,
    bestObjectCount: previousBest === undefined ? objectsUsed : Math.min(previousBest, objectsUsed),
    playerSolution: solutionFromAttempt(attempt),
  };
  const saved = repository.save(level);
  if (saved.status === 'error') return { status: 'not-kept', code: saved.code };
  return { status: 'recorded', level };
};
