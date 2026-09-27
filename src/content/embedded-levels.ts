import demo from './levels/demo.json';
import campaignOne from './levels/campaign-01-la-bille-de-service.json';
import campaignTwo from './levels/campaign-02-par-dessus-le-mur.json';
import campaignThree from './levels/campaign-03-la-balancoire.json';
import campaignFour from './levels/campaign-04-retour-a-l-expediteur.json';
import campaignFive from './levels/campaign-05-l-electricien.json';
import campaignSix from './levels/campaign-06-la-porte-de-trop.json';
import campaignSeven from './levels/campaign-07-service-a-l-etage.json';
import campaignEight from './levels/campaign-08-le-courant-d-air.json';
import campaignNine from './levels/campaign-09-lever-le-rideau.json';
import campaignTen from './levels/campaign-10-le-paravent-de-balles.json';
import campaignEleven from './levels/campaign-11-apres-vous.json';
import campaignTwelve from './levels/campaign-12-treize-secondes.json';
import campaignThirteen from './levels/campaign-13-une-seule-main.json';
import campaignFourteen from './levels/campaign-14-l-aiguillage.json';
import campaignFifteen from './levels/campaign-15-le-sonneur.json';
import campaignSixteen from './levels/campaign-16-deux-souffles.json';
import campaignSeventeen from './levels/campaign-17-la-grande-machine.json';
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
    id: 'les-billes-de-service',
    title: 'Les billes de service',
    levels: [
      parseEmbeddedLevel(campaignOne),
      parseEmbeddedLevel(campaignTwo),
      parseEmbeddedLevel(campaignThree),
    ],
  },
  {
    id: 'commandes-a-distance',
    title: 'Commandes à distance',
    levels: [
      parseEmbeddedLevel(campaignFour),
      parseEmbeddedLevel(campaignFive),
      parseEmbeddedLevel(campaignSix),
    ],
  },
  {
    id: 'le-vent',
    title: 'Le vent',
    levels: [
      parseEmbeddedLevel(campaignSeven),
      parseEmbeddedLevel(campaignEight),
      parseEmbeddedLevel(campaignNine),
      parseEmbeddedLevel(campaignTen),
    ],
  },
  {
    id: 'l-ordre-et-le-temps',
    title: "L'ordre et le temps",
    levels: [
      parseEmbeddedLevel(campaignEleven),
      parseEmbeddedLevel(campaignTwelve),
      parseEmbeddedLevel(campaignThirteen),
      parseEmbeddedLevel(campaignFourteen),
    ],
  },
  {
    id: 'grandes-machines',
    title: 'Grandes machines',
    levels: [
      parseEmbeddedLevel(campaignFifteen),
      parseEmbeddedLevel(campaignSixteen),
      parseEmbeddedLevel(campaignSeventeen),
    ],
  },
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
 * pixel units is retired). It is a validated embedded document exactly like a
 * campaign level, but it is explicitly not campaign content: `App.tsx`
 * must not list it in the level list, and no code should infer "is the
 * workshop" from `id` string matching elsewhere.
 */
export const embeddedWorkshopDocument: LevelDocument = parseEmbeddedLevel(workshop);

/**
 * `/demo`: a chain-reaction machine that solves itself, to show the concept
 * at a glance. Like the workshop, it is not campaign content.
 */
export const embeddedDemoDocument: LevelDocument = parseEmbeddedLevel(demo);
