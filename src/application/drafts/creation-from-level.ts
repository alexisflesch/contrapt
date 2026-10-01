import {
  MAX_BASED_ON_ENTRIES,
  MAX_TITLE_LENGTH,
  type LevelDocument,
  type Solution,
} from '../../domain/level-document';
import { restoreSolution } from '../puzzle/restore-solution';
import type { DraftCreationContent } from './draft-repository';

interface CreationFromLevelOptions {
  /** A winning solution of the player (M5), posed to place; none by default. */
  readonly playerSolution?: Solution;
  /** The creation's identifier (`<id>-brouillon`, `creation-<aléa>`), injected. */
  readonly createId: () => string;
}

const REMIX_SUFFIX = ' (remix)';

/**
 * ADR 0016 § Remplissage automatique: the remixer is not the original's
 * author; the original becomes the most recent source, the oldest ones fall.
 */
const remixMetadata = ({
  author,
  basedOn = [],
  ...metadata
}: LevelDocument['metadata']): LevelDocument['metadata'] => ({
  ...metadata,
  // The original title is shortened so that the suffix always stays whole (M6b).
  title: `${metadata.title.slice(0, MAX_TITLE_LENGTH - REMIX_SUFFIX.length)}${REMIX_SUFFIX}`,
  basedOn: [
    { title: metadata.title, ...(author === undefined ? {} : { author }) },
    ...basedOn,
  ].slice(0, MAX_BASED_ON_ENTRIES),
});

/**
 * ADR 0015 § Ouvrir dans l'atelier: a creation built from a puzzle level
 * (received or from the campaign). The decor stays; the solution, inventory
 * and challenge go (the author's catalogue places, the export derives the
 * inventory again). A player's solution comes back to place, as
 * `workshopFromPuzzle` restores an author's. The level is kept intact as the
 * creation's `source`, outside the document.
 */
export const creationFromLevel = (
  level: LevelDocument,
  { playerSolution, createId }: CreationFromLevelOptions,
): DraftCreationContent => {
  const source = structuredClone(level);
  const {
    solution: ignoredSolution,
    challenge: ignoredChallenge,
    ...decor
  } = structuredClone(level);
  void ignoredSolution;
  void ignoredChallenge;
  // Reserving the inventory's ids too gives the restored objects the same ids
  // as `workshopFromPuzzle`.
  const usedIds = new Set([
    ...decor.objects.map(({ id }) => id),
    ...decor.inventory.map(({ id }) => id),
    ...decor.wires.map(({ id }) => id),
  ]);
  const restored =
    playerSolution === undefined
      ? { objects: [], wires: [] }
      : restoreSolution(structuredClone(playerSolution), decor.inventory, usedIds);

  return {
    document: {
      ...decor,
      id: createId(),
      metadata: remixMetadata(decor.metadata),
      objects: [...decor.objects, ...restored.objects],
      inventory: [],
      wires: [...decor.wires, ...restored.wires],
    },
    source,
  };
};
