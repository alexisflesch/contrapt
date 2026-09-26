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

describe('campagne embarquée', () => {
  it('conserve les chapitres ordonnés et dérive la liste à plat', () => {
    expect(campaignChapters.map(({ id, title }) => ({ id, title }))).toEqual([
      { id: 'poutres-et-bascule', title: 'Poutres et bascule' },
      { id: 'mecanismes', title: 'Mécanismes' },
    ]);
    expect(campaignChapters[1]?.levels).toEqual([]);
    expect(flattenCampaignLevels(campaignChapters)).toEqual(embeddedLevels);
  });

  it('donne le niveau suivant dans un chapitre puis dans le suivant, sans suivant au dernier', () => {
    const first = embeddedLevels[0];
    if (first === undefined) throw new Error('Le niveau 1 est absent.');
    const second = levelDocumentSchema.parse({ ...first, id: 'second-level' });
    const third = levelDocumentSchema.parse({ ...first, id: 'third-level' });
    const chapters = [
      { id: 'chapter-one', title: 'Premier', levels: [first, second] },
      { id: 'chapter-two', title: 'Second', levels: [third] },
    ];

    expect(nextCampaignLevel(first.id, chapters)).toEqual(second);
    expect(nextCampaignLevel(second.id, chapters)).toEqual(third);
    expect(nextCampaignLevel(third.id, chapters)).toBeUndefined();
    expect(nextCampaignLevel('unknown-level', chapters)).toBeUndefined();
  });

  it('refuse les identifiants de chapitre ou de niveau dupliqués sur toute la campagne', () => {
    const level = embeddedLevels[0];
    if (level === undefined) throw new Error('Le niveau 1 est absent.');

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

describe('niveaux embarqués', () => {
  it('expose Prolonger la pente puis Le pont comme les deux premiers niveaux v2 valides', () => {
    expect(embeddedLevels).toHaveLength(2);
    expect(embeddedLevels[0]).toMatchObject({
      schemaVersion: 2,
      id: 'level-1-prolonger-la-pente',
      metadata: { title: 'Prolonger la pente' },
      inventory: [
        {
          id: 'inventory-beam',
          type: 'beam',
          props: { size: 'short' },
          quantity: 1,
          permissions: { move: true, rotate: false, remove: true },
        },
      ],
      goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
      buildZones: [{ min: { x: 3.6, y: 1.7 }, max: { x: 7, y: 2.9 } }],
      scene: { min: { x: 0, y: 0 }, max: { x: 8, y: 5.5 } },
    });

    expect(embeddedLevels[0]?.objects).toEqual([
      expect.objectContaining({
        id: 'ball-1',
        type: 'ball',
        transform: { position: { x: 2.3, y: 1.177 }, rotation: 0 },
        permissions: { move: false, rotate: false, remove: false },
      }),
      expect.objectContaining({
        id: 'slope',
        type: 'beam',
        transform: { position: { x: 2.2, y: 1.6 }, rotation: Math.PI / 12 },
        props: { size: 'medium' },
        permissions: { move: false, rotate: false, remove: false },
      }),
      expect.objectContaining({
        id: 'basket-1',
        type: 'basket',
        transform: { position: { x: 6.9, y: 4.9 }, rotation: 0 },
        permissions: { move: false, rotate: false, remove: false },
      }),
    ]);

    expect(embeddedLevels[1]).toMatchObject({
      schemaVersion: 2,
      id: 'level-2-le-pont',
      metadata: { title: 'Le pont' },
      inventory: [
        {
          id: 'inventory-beam',
          type: 'beam',
          props: { size: 'short' },
          quantity: 1,
          permissions: { move: true, rotate: false, remove: true },
        },
      ],
      goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
      buildZones: [{ min: { x: 1.7, y: 1.4 }, max: { x: 4.9, y: 2.6 } }],
      scene: { min: { x: 0, y: 0 }, max: { x: 8, y: 5.5 } },
    });
    expect(embeddedLevels[1]?.objects).toEqual([
      expect.objectContaining({
        id: 'ball-1',
        type: 'ball',
        transform: { position: { x: 0.9, y: 0.862 }, rotation: 0 },
        permissions: { move: false, rotate: false, remove: false },
      }),
      expect.objectContaining({
        id: 'slope',
        type: 'beam',
        transform: { position: { x: 1.6, y: 1.5 }, rotation: Math.PI / 12 },
        props: { size: 'short' },
        permissions: { move: false, rotate: false, remove: false },
      }),
      expect.objectContaining({
        id: 'ramp',
        type: 'beam',
        transform: { position: { x: 5, y: 2.3 }, rotation: Math.PI / 18 },
        props: { size: 'short' },
        permissions: { move: false, rotate: false, remove: false },
      }),
      expect.objectContaining({
        id: 'basket-1',
        type: 'basket',
        transform: { position: { x: 7.1, y: 4.9 }, rotation: 0 },
        permissions: { move: false, rotate: false, remove: false },
      }),
    ]);
  });

  it('expose l’atelier libre comme un document v2 valide distinct de la campagne', () => {
    expect(embeddedWorkshopDocument).toMatchObject({
      schemaVersion: 2,
      id: 'free-workshop',
      scene: { min: { x: 0, y: 0 }, max: { x: 16, y: 9 } },
    });

    expect(embeddedLevels.some((level) => level.id === embeddedWorkshopDocument.id)).toBe(false);
    expect(embeddedLevels.map((level) => level.id)).not.toContain('free-workshop');
  });
});
