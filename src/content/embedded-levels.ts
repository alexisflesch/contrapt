import demo from './levels/demo.json';
import levelOne from './levels/level-1-prolonger-la-pente.json';
import levelTwo from './levels/level-2-le-pont.json';
import levelThree from './levels/level-3-incliner.json';
import levelFour from './levels/level-4-moins-c-est-mieux.json';
import levelFive from './levels/level-5-le-detour.json';
import levelSix from './levels/level-6-la-bascule.json';
import workshop from './levels/workshop.json';

import { levelDocumentSchema, type LevelDocument } from '../domain/level-document';

const parseEmbeddedLevel = (value: unknown): LevelDocument => levelDocumentSchema.parse(value);

export interface CampaignChapter {
  readonly id: string;
  readonly title: string;
  readonly levels: readonly LevelDocument[];
}

/** Validates chapter and level identifiers across one ordered campaign. */
export const createCampaign = (
  chapters: readonly CampaignChapter[],
): readonly CampaignChapter[] => {
  const identifiers = new Map<string, 'chapter' | 'level'>();

  for (const chapter of chapters) {
    const previousChapterId = identifiers.get(chapter.id);
    if (previousChapterId !== undefined) {
      throw new Error(
        `L’identifiant de chapitre « ${chapter.id} » est déjà utilisé dans la campagne.`,
      );
    }
    identifiers.set(chapter.id, 'chapter');

    for (const level of chapter.levels) {
      const previousIdentifier = identifiers.get(level.id);
      if (previousIdentifier !== undefined) {
        throw new Error(
          `L’identifiant de niveau « ${level.id} » est déjà utilisé dans la campagne.`,
        );
      }
      identifiers.set(level.id, 'level');
    }
  }

  return chapters;
};

export const campaignChapters = createCampaign([
  {
    id: 'poutres-et-bascule',
    title: 'Poutres et bascule',
    levels: [
      parseEmbeddedLevel(levelOne),
      parseEmbeddedLevel(levelTwo),
      parseEmbeddedLevel(levelThree),
      parseEmbeddedLevel(levelFour),
      parseEmbeddedLevel(levelFive),
      parseEmbeddedLevel(levelSix),
    ],
  },
  { id: 'mecanismes', title: 'Mécanismes', levels: [] },
]);

export const flattenCampaignLevels = (
  chapters: readonly CampaignChapter[],
): readonly LevelDocument[] => chapters.flatMap(({ levels }) => levels);

/**
 * Compatibility list derived from the ordered chapters. The workshop and demo
 * are validated embedded documents, but neither belongs to the campaign.
 */
export const embeddedLevels: readonly LevelDocument[] = flattenCampaignLevels(campaignChapters);

export const nextCampaignLevel = (
  levelId: string,
  chapters: readonly CampaignChapter[] = campaignChapters,
): LevelDocument | undefined => {
  const levels = flattenCampaignLevels(chapters);
  const currentIndex = levels.findIndex((level) => level.id === levelId);
  return currentIndex < 0 ? undefined : levels[currentIndex + 1];
};

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
