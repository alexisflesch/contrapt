import {
  verifyPuzzle,
  type PuzzleRefusalReason,
  type PuzzleRunner,
} from '../application/puzzle/puzzle-workshop';
import { levelDocumentSchema, type LevelDocument } from '../domain/level-document';
import { encodeLevelFile } from '../infrastructure/level-file/level-file-codec';
import { encodeShareFragment } from '../infrastructure/level-share/level-share-codec';
import { runLevelOutcome } from '../simulation/level-outcome';

type LevelExportPreparation =
  | {
      readonly status: 'ready';
      /** The verified puzzle: the file holds it, and so does the share link. */
      readonly puzzle: LevelDocument;
      readonly fileName: string;
      readonly mimeType: string;
      readonly fileText: string;
    }
  | { readonly status: 'invalid'; readonly reasons: readonly string[] };

const refusalMessages: Readonly<Record<PuzzleRefusalReason, string>> = {
  'no-object-to-place':
    'Aucun objet n’est à placer : touchez chaque objet que le joueur devra poser, puis choisissez « À placer » dans ses propriétés.',
  'invalid-puzzle': 'Le puzzle obtenu depuis l’atelier n’est pas un niveau valide.',
  'solution-not-playable':
    'Le joueur ne pourrait pas poser tous les objets à placer là où ils sont : gardez-les dans une zone de construction.',
  'solution-does-not-win':
    'La machine complète ne gagne pas : avec tous les objets en place, la balle doit atteindre le panier.',
  'wins-without-player':
    'La balle atteint le panier sans les objets à placer : le joueur n’aurait rien à faire.',
};

/** U22: why the workshop cannot be played or exported as a puzzle, in the author's words. */
export const puzzleRefusalMessage = (reason: PuzzleRefusalReason): string =>
  refusalMessages[reason];

/**
 * U16, U22 (ADR 0013): validates the author's committed workshop, turns it
 * into a puzzle and checks it by deterministic simulation before any export.
 * The schema messages are already written for people, so they are shown
 * as-is, without duplicates. `run` is injected for tests.
 */
export const prepareLevelExport = (
  document: LevelDocument,
  run: PuzzleRunner = runLevelOutcome,
): LevelExportPreparation => {
  const validation = levelDocumentSchema.safeParse(document);
  if (!validation.success) {
    return {
      status: 'invalid',
      reasons: [...new Set(validation.error.issues.map(({ message }) => message))],
    };
  }

  const verification = verifyPuzzle(validation.data, run);
  if (verification.status === 'refused') {
    return { status: 'invalid', reasons: [refusalMessages[verification.reason]] };
  }

  return {
    status: 'ready',
    puzzle: verification.puzzle,
    fileName: `${verification.puzzle.id}.json`,
    mimeType: 'application/json',
    fileText: encodeLevelFile(verification.puzzle),
  };
};

/** `/shared` under the app's base path (ADR 0008 amendment), followed by the L23 fragment. */
export const buildShareUrl = (fragment: string, origin: string, basePath: string): string =>
  `${origin}${basePath.endsWith('/') ? basePath : `${basePath}/`}shared${fragment}`;

/** Encodes a level with the L23 codec and returns its absolute share link. */
export const createShareLink = async (
  document: LevelDocument,
  origin: string,
  basePath: string,
): Promise<string> => buildShareUrl(await encodeShareFragment(document), origin, basePath);
