import type { ConstructionAttempt } from '../construction';

export interface Challenge {
  readonly elegantObjectCount: number;
  readonly minimalObjectCount: number;
}

interface LevelProgress {
  readonly resolved: boolean;
  readonly bestObjectCount: number | null;
}

/** Sparse, immutable progress keyed by campaign level ID. */
export type CampaignProgress = Readonly<Partial<Record<string, LevelProgress>>>;

/** The next threshold an interface may reveal after the saved best result. */
export type ChallengeHint =
  | { readonly nextTier: 'elegant'; readonly objectCount: number }
  | { readonly nextTier: 'minimal'; readonly objectCount: number }
  | null;

/** Structural input keeps application logic independent of the content layer. */
interface CampaignChapter {
  readonly levels: readonly { readonly id: string }[];
}

const assertObjectCount = (objectsUsed: number): void => {
  if (!Number.isSafeInteger(objectsUsed) || objectsUsed < 0) {
    throw new RangeError('Le nombre d’objets utilisés doit être un entier positif ou nul.');
  }
};

/**
 * Count live placements and wires (U21) whose attempt provenance identifies an
 * inventory entry: a wire the player laid counts as one object.
 */
export const countObjectsUsed = (attempt: ConstructionAttempt): number => {
  const takenIds = new Set([
    ...attempt.document.objects.map(({ id }) => id),
    ...attempt.document.wires.map(({ id }) => id),
  ]);
  const inventoryEntryIds = new Set(attempt.document.inventory.map(({ id }) => id));

  return Object.entries(attempt.provenance).reduce(
    (count, [takenId, inventoryEntryId]) =>
      count + Number(takenIds.has(takenId) && inventoryEntryIds.has(inventoryEntryId)),
    0,
  );
};

/** Evaluate a successful attempt against the challenge thresholds on its level. */
export const evaluateTier = (
  objectsUsed: number,
  challenge?: Challenge,
): 'resolved' | 'elegant' | 'minimal' => {
  assertObjectCount(objectsUsed);
  if (challenge === undefined) return 'resolved';
  if (objectsUsed <= challenge.minimalObjectCount) return 'minimal';
  if (objectsUsed <= challenge.elegantObjectCount) return 'elegant';
  return 'resolved';
};

/** Reveal one next object-count target, or none after the known minimum is met. */
export const nextChallengeHint = (
  bestObjectCount: number | null,
  challenge?: Challenge,
): ChallengeHint => {
  if (bestObjectCount === null || challenge === undefined) return null;
  assertObjectCount(bestObjectCount);

  if (bestObjectCount <= challenge.minimalObjectCount) return null;
  if (bestObjectCount <= challenge.elegantObjectCount) {
    return { nextTier: 'minimal', objectCount: challenge.minimalObjectCount };
  }
  return { nextTier: 'elegant', objectCount: challenge.elegantObjectCount };
};

/** Record a successful attempt without mutating progress or replacing a better record. */
export const recordSuccess = (
  progress: CampaignProgress,
  levelId: string,
  objectsUsed: number,
): CampaignProgress => {
  assertObjectCount(objectsUsed);
  const current = progress[levelId];
  const bestObjectCount =
    current?.bestObjectCount === null || current === undefined
      ? objectsUsed
      : Math.min(current.bestObjectCount, objectsUsed);

  return {
    ...progress,
    [levelId]: { resolved: true, bestObjectCount },
  };
};

/** A level unlocks after the previous level in campaign order has been resolved. */
export const isLevelUnlocked = (
  campaign: readonly CampaignChapter[],
  progress: CampaignProgress,
  levelId: string,
): boolean => {
  const levels = campaign.flatMap(({ levels: chapterLevels }) => chapterLevels);
  const levelIndex = levels.findIndex(({ id }) => id === levelId);

  if (levelIndex === 0) return true;
  if (levelIndex < 0) return false;

  const previousLevel = levels[levelIndex - 1];
  return previousLevel !== undefined && progress[previousLevel.id]?.resolved === true;
};
