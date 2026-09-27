import { levelDocumentSchema, rotationMode, type LevelDocument } from '../../domain/level-document';
import { createConstructionAttempt, placeFromInventory } from '../construction';

type Placement = LevelDocument['objects'][number];
type InventoryEntry = LevelDocument['inventory'][number];
type SolutionPlacement = NonNullable<LevelDocument['solution']>['placements'][number];

/** Why a workshop cannot become a puzzle, or a puzzle cannot be exported (U22, ADR 0013). */
type PuzzleRefusalReason =
  | 'no-object-to-place'
  | 'wired-object-to-place'
  | 'invalid-puzzle'
  | 'solution-not-playable'
  | 'solution-does-not-win'
  | 'wins-without-player';

type PuzzleConversion =
  | { readonly status: 'ok'; readonly puzzle: LevelDocument }
  | { readonly status: 'refused'; readonly reason: PuzzleRefusalReason };

type PuzzleVerification =
  | { readonly status: 'verified'; readonly puzzle: LevelDocument }
  | { readonly status: 'refused'; readonly reason: PuzzleRefusalReason };

export type PuzzleRunOutcome = 'won' | 'lost';

/**
 * Port to a deterministic, fixed-step simulation of a level with no player
 * action during the run: the application never depends on the engine.
 */
type PuzzleRunner = (document: LevelDocument) => PuzzleRunOutcome;

/** An object present in the workshop is locked, like any object of the decor. */
const lockedPermissions = { move: false, rotate: false, remove: false } as const;

/** Properties are flat objects of strings, so comparing their entries is exact. */
const sameProperties = (
  left: Readonly<Record<string, unknown>>,
  right: Readonly<Record<string, unknown>>,
): boolean =>
  Object.keys(left).length === Object.keys(right).length &&
  Object.entries(left).every(([key, value]) => right[key] === value);

/** `base`, then `base-2`, `base-3`… : the first identifier nobody uses yet. */
const uniqueIdentifier = (base: string, used: Set<string>): string => {
  let candidate = base;
  for (let suffix = 2; used.has(candidate); suffix += 1) candidate = `${base}-${String(suffix)}`;
  used.add(candidate);
  return candidate;
};

const isToPlace = (placement: Placement): boolean => placement.toPlace === true;

interface EntryDraft {
  readonly id: string;
  readonly type: Placement['type'];
  readonly props: Placement['props'];
  quantity: number;
  readonly permissions: InventoryEntry['permissions'];
}

/**
 * U22 (ADR 0013): the fixed objects stay as the decor; the objects to place
 * become the inventory, grouped by family and properties, and their poses the
 * reference solution. The workshop's own stock is the author's and is
 * dropped. Without a build zone, the player may place anywhere in the scene.
 * The result is validated like any document before it is returned.
 */
export const puzzleFromWorkshop = (workshop: LevelDocument): PuzzleConversion => {
  const toPlace = workshop.objects.filter(isToPlace);
  if (toPlace.length === 0) return { status: 'refused', reason: 'no-object-to-place' };

  const toPlaceIds = new Set(toPlace.map(({ id }) => id));
  if (
    workshop.wires.some(
      ({ sourceId, targetId }) => toPlaceIds.has(sourceId) || toPlaceIds.has(targetId),
    )
  ) {
    return { status: 'refused', reason: 'wired-object-to-place' };
  }

  const decor = workshop.objects.filter((placement) => !isToPlace(placement));
  const usedIds = new Set(decor.map(({ id }) => id));
  const inventory: EntryDraft[] = [];
  const placements: SolutionPlacement[] = toPlace.map((placement) => {
    let entry = inventory.find(
      (candidate) =>
        candidate.type === placement.type && sameProperties(candidate.props, placement.props),
    );
    if (entry === undefined) {
      entry = {
        id: uniqueIdentifier(`${placement.type}-a-placer`, usedIds),
        type: placement.type,
        props: placement.props,
        quantity: 0,
        permissions: {
          move: true,
          rotate: rotationMode(placement.type) !== 'fixed',
          remove: true,
        },
      };
      inventory.push(entry);
    }
    entry.quantity += 1;
    return { inventoryId: entry.id, transform: placement.transform };
  });

  const validation = levelDocumentSchema.safeParse({
    ...workshop,
    objects: decor,
    inventory,
    buildZones:
      workshop.buildZones.length > 0
        ? workshop.buildZones
        : [{ min: workshop.scene.min, max: workshop.scene.max }],
    challenge: { elegantObjectCount: toPlace.length, minimalObjectCount: toPlace.length },
    solution: { placements },
  });
  return validation.success
    ? { status: 'ok', puzzle: validation.data }
    : { status: 'refused', reason: 'invalid-puzzle' };
};

/**
 * The inverse of `puzzleFromWorkshop`, to reopen a puzzle in the workshop
 * (U17): each pose of the solution is back on the board, marked to place.
 * The inventory and the challenge stay: the workshop never shows them, and
 * the export derives both again. A document without solution is returned
 * as is, and so is one whose workshop form would not be valid.
 */
export const workshopFromPuzzle = (puzzle: LevelDocument): LevelDocument => {
  const { solution, ...workshop } = puzzle;
  if (solution === undefined) return puzzle;

  const usedIds = new Set([
    ...puzzle.objects.map(({ id }) => id),
    ...puzzle.inventory.map(({ id }) => id),
  ]);
  const restored = solution.placements.flatMap((pose) => {
    const entry = puzzle.inventory.find(({ id }) => id === pose.inventoryId);
    if (entry === undefined || entry.type === 'wire') return [];
    return [
      {
        id: uniqueIdentifier(entry.id, usedIds),
        type: entry.type,
        props: entry.props,
        transform: pose.transform,
        permissions: lockedPermissions,
        toPlace: true,
      },
    ];
  });

  const validation = levelDocumentSchema.safeParse({
    ...workshop,
    objects: [...puzzle.objects, ...restored],
  });
  return validation.success ? validation.data : puzzle;
};

/** Poses the reference solution with the player's own command, build zones included. */
const playSolution = (puzzle: LevelDocument): LevelDocument | null => {
  const usedIds = new Set(puzzle.objects.map(({ id }) => id));
  let attempt = createConstructionAttempt(puzzle);
  for (const pose of puzzle.solution?.placements ?? []) {
    const outcome = placeFromInventory({
      context: 'player',
      inventoryEntryId: pose.inventoryId,
      placementId: uniqueIdentifier('solution', usedIds),
      transform: pose.transform,
    }).execute(attempt);
    if (outcome.status === 'rejected') return null;
    attempt = outcome.state;
  }
  return attempt.document;
};

/**
 * U22: the checks run before any export, without the author's help. The
 * complete machine, posed by the player's commands, wins; the decor alone
 * does not.
 */
export const verifyPuzzle = (workshop: LevelDocument, run: PuzzleRunner): PuzzleVerification => {
  const conversion = puzzleFromWorkshop(workshop);
  if (conversion.status === 'refused') return conversion;

  const { puzzle } = conversion;
  const solved = playSolution(puzzle);
  if (solved === null) return { status: 'refused', reason: 'solution-not-playable' };
  if (run(solved) !== 'won') return { status: 'refused', reason: 'solution-does-not-win' };
  if (run(puzzle) === 'won') return { status: 'refused', reason: 'wins-without-player' };
  return { status: 'verified', puzzle };
};
