import levelOne from './levels/level-1-laisser-tomber.json';

import { levelDocumentSchema, type LevelDocument } from '../domain/level-document';

const parseEmbeddedLevel = (value: unknown): LevelDocument => levelDocumentSchema.parse(value);

/**
 * The statically bundled campaign levels. Parsing here keeps raw JSON outside
 * the domain: every embedded document crosses the same runtime schema boundary
 * as an imported level.
 */
export const embeddedLevels: readonly LevelDocument[] = [parseEmbeddedLevel(levelOne)];
