import selfSolving from './self-solving-level.json';

import { levelDocumentSchema, type LevelDocument } from '../../src/domain/level-document';

/**
 * A non-campaign chain-reaction machine that wins on its own once launched
 * (no object to place). Tests use it where they need a level that resolves
 * without player input, or a realistic document with every family.
 */
export const selfSolvingLevel: LevelDocument = levelDocumentSchema.parse(selfSolving);
