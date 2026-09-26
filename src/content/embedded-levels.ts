import demo from './levels/demo.json';
import levelOne from './levels/level-1-laisser-tomber.json';
import workshop from './levels/workshop.json';

import { levelDocumentSchema, type LevelDocument } from '../domain/level-document';

const parseEmbeddedLevel = (value: unknown): LevelDocument => levelDocumentSchema.parse(value);

/**
 * The statically bundled campaign levels. Parsing here keeps raw JSON outside
 * the domain: every embedded document crosses the same runtime schema boundary
 * as an imported level. This list is campaign content only: it drives the
 * level list menu, so the free-creation workshop document must never be
 * added here (see `embeddedWorkshopDocument`).
 */
export const embeddedLevels: readonly LevelDocument[] = [parseEmbeddedLevel(levelOne)];

/**
 * The free-form creation starting point (ADR 0007 - `App.tsx:80-132` in
 * pixel units is retired). It is a validated embedded document exactly like
 * a campaign level, but it is explicitly not campaign content: `App.tsx`
 * must not list it in the level list, and no code should infer "is the
 * workshop" from `id` string matching elsewhere.
 */
export const embeddedWorkshopDocument: LevelDocument = parseEmbeddedLevel(workshop);

/**
 * `/demo`: a chain-reaction machine that solves itself, to show the concept
 * at a glance. Like the workshop, it is not campaign content.
 */
export const embeddedDemoDocument: LevelDocument = parseEmbeddedLevel(demo);
