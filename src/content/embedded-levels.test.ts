import { describe, expect, it } from 'vitest';

import {
  campaignChapters,
  createCampaign,
  embeddedLevels,
  embeddedWorkshopDocument,
  flattenCampaignLevels,
  nextCampaignLevel,
} from './embedded-levels';
import { levelDocumentSchema } from '../domain/level-document';

const expectedIds = [
  'campaign-01-la-bille-de-service',
  'campaign-02-par-dessus-le-mur',
  'campaign-03-la-balancoire',
  'campaign-04-retour-a-l-expediteur',
  'campaign-05-l-electricien',
  'campaign-06-la-porte-de-trop',
  'campaign-07-service-a-l-etage',
  'campaign-08-le-courant-d-air',
  'campaign-09-lever-le-rideau',
  'campaign-10-le-paravent-de-balles',
  'campaign-11-apres-vous',
  'campaign-12-treize-secondes',
  'campaign-13-une-seule-main',
  'campaign-14-l-aiguillage',
  'campaign-15-le-sonneur',
  'campaign-16-deux-souffles',
  'campaign-17-la-grande-machine',
] as const;

describe('campagne embarquée', () => {
  it('remplace les anciens niveaux par les 17 esquisses ordonnées en cinq chapitres', () => {
    expect(campaignChapters.map(({ id, title }) => ({ id, title }))).toEqual([
      { id: 'les-billes-de-service', title: 'Les billes de service' },
      { id: 'commandes-a-distance', title: 'Commandes à distance' },
      { id: 'le-vent', title: 'Le vent' },
      { id: 'l-ordre-et-le-temps', title: "L'ordre et le temps" },
      { id: 'grandes-machines', title: 'Grandes machines' },
    ]);
    expect(embeddedLevels.map(({ id }) => id)).toEqual(expectedIds);
    expect(campaignChapters.map(({ levels }) => levels.length)).toEqual([3, 3, 4, 4, 3]);
    expect(flattenCampaignLevels(campaignChapters)).toEqual(embeddedLevels);
  });

  it('marque les documents comme esquisses U22 sans défi de palier', () => {
    expect(embeddedLevels).toHaveLength(expectedIds.length);
    for (const level of embeddedLevels) {
      expect(level.metadata.description).toMatch(/^Esquisse non calibrée\./u);
      expect(level.challenge).toBeUndefined();
      expect(level.solution).toBeDefined();
      expect(
        level.objects.every(
          ({ permissions }) => !permissions.move && !permissions.rotate && !permissions.remove,
        ),
      ).toBe(true);
    }
    expect(embeddedLevels.map(({ scene }) => scene.max)).toEqual([
      ...Array.from({ length: 10 }, () => ({ x: 8, y: 5.5 })),
      ...Array.from({ length: 4 }, () => ({ x: 10, y: 6.5 })),
      ...Array.from({ length: 3 }, () => ({ x: 12, y: 7.5 })),
    ]);
  });

  it('ne publie pas le niveau 15 reporté dans la campagne', () => {
    expect(embeddedLevels.some(({ metadata }) => metadata.title === 'Prenez votre temps')).toBe(
      false,
    );
  });

  it('donne le niveau suivant dans l’ordre, puis aucun après le dernier', () => {
    const first = embeddedLevels[0];
    const second = embeddedLevels[1];
    const last = embeddedLevels.at(-1);
    if (first === undefined || second === undefined || last === undefined) {
      throw new Error('La campagne doit contenir ses niveaux esquissés.');
    }

    expect(nextCampaignLevel(first.id)).toBe(second);
    expect(nextCampaignLevel(last.id)).toBeUndefined();
    expect(nextCampaignLevel('unknown-level')).toBeUndefined();
  });

  it('refuse les identifiants de chapitre ou de niveau dupliqués sur toute la campagne', () => {
    const level = embeddedLevels[0];
    if (level === undefined) throw new Error('Le premier niveau est absent.');

    expect(() =>
      createCampaign([
        { id: 'chapter-one', title: 'Premier', levels: [level] },
        { id: 'chapter-two', title: 'Second', levels: [level] },
      ]),
    ).toThrow(/identifiant de niveau/);
    expect(() =>
      createCampaign([
        { id: 'same-chapter', title: 'Premier', levels: [] },
        { id: 'same-chapter', title: 'Second', levels: [] },
      ]),
    ).toThrow(/identifiant de chapitre/);
  });
});

describe('atelier libre embarqué (M14b)', () => {
  it('n’a pas de description : une création partie de zéro n’en hérite pas', () => {
    expect(embeddedWorkshopDocument.metadata).toEqual({ title: 'Atelier de niveau' });
    expect('description' in embeddedWorkshopDocument.metadata).toBe(false);
  });
});

describe('niveaux embarqués', () => {
  it('expose des documents v2 valides et conserve les documents hors campagne hors liste', () => {
    for (const level of embeddedLevels) {
      expect(levelDocumentSchema.safeParse(level).success).toBe(true);
    }
    expect(embeddedLevels.some((level) => level.id === embeddedWorkshopDocument.id)).toBe(false);
    expect(embeddedLevels.map((level) => level.id)).not.toContain('free-workshop');
  });
});
