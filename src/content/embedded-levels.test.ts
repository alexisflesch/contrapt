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
    expect(campaignChapters[1]?.levels).toEqual([
      embeddedLevels[8],
      embeddedLevels[9],
      embeddedLevels[10],
    ]);
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
  it('expose les onze premiers niveaux v2 valides dans l’ordre de campagne', () => {
    expect(embeddedLevels).toHaveLength(11);
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

    expect(embeddedLevels[2]).toMatchObject({
      schemaVersion: 2,
      id: 'level-3-incliner',
      metadata: { title: 'Incliner' },
      inventory: [
        {
          id: 'inventory-beam',
          type: 'beam',
          props: { size: 'medium' },
          quantity: 1,
          permissions: { move: true, rotate: true, remove: true },
        },
      ],
      goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
      buildZones: [{ min: { x: 0.4, y: 1.2 }, max: { x: 5.4, y: 4 } }],
      scene: { min: { x: 0, y: 0 }, max: { x: 8, y: 5.5 } },
    });
    expect(embeddedLevels[2]?.objects).toEqual([
      expect.objectContaining({
        id: 'ball-1',
        type: 'ball',
        transform: { position: { x: 1.8, y: 0.6 }, rotation: 0 },
        permissions: { move: false, rotate: false, remove: false },
      }),
      expect.objectContaining({
        id: 'basket-1',
        type: 'basket',
        transform: { position: { x: 6.4, y: 4.9 }, rotation: 0 },
        permissions: { move: false, rotate: false, remove: false },
      }),
      expect.objectContaining({
        id: 'wall',
        type: 'beam',
        transform: { position: { x: 7.35, y: 3.4 }, rotation: Math.PI / 2 },
        props: { size: 'medium' },
        permissions: { move: false, rotate: false, remove: false },
      }),
    ]);

    expect(embeddedLevels[3]).toMatchObject({
      schemaVersion: 2,
      id: 'level-4-moins-c-est-mieux',
      metadata: { title: 'Moins, c’est mieux' },
      inventory: [
        { id: 'inventory-beam-short', type: 'beam', props: { size: 'short' }, quantity: 2 },
        { id: 'inventory-beam-long', type: 'beam', props: { size: 'long' }, quantity: 1 },
      ],
      goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
      buildZones: [{ min: { x: 0.2, y: 1 }, max: { x: 6.4, y: 4 } }],
      challenge: { elegantObjectCount: 2, minimalObjectCount: 1 },
      scene: { min: { x: 0, y: 0 }, max: { x: 8, y: 5.5 } },
    });
    expect(embeddedLevels[3]?.objects).toEqual([
      expect.objectContaining({
        id: 'ball-1',
        type: 'ball',
        permissions: { move: false, rotate: false, remove: false },
      }),
      expect.objectContaining({
        id: 'basket-1',
        type: 'basket',
        permissions: { move: false, rotate: false, remove: false },
      }),
      expect.objectContaining({
        id: 'back',
        type: 'beam',
        props: { size: 'short' },
        permissions: { move: false, rotate: false, remove: false },
      }),
    ]);

    expect(embeddedLevels[4]).toMatchObject({
      schemaVersion: 2,
      id: 'level-5-le-detour',
      metadata: { title: 'Le détour' },
      inventory: [
        { id: 'inventory-beam-short', type: 'beam', props: { size: 'short' }, quantity: 1 },
        { id: 'inventory-beam-medium', type: 'beam', props: { size: 'medium' }, quantity: 1 },
      ],
      goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
      buildZones: [
        { min: { x: 0.6, y: 0.9 }, max: { x: 4, y: 2.05 } },
        { min: { x: 1.6, y: 2.7 }, max: { x: 6.2, y: 4.3 } },
      ],
      challenge: { elegantObjectCount: 2, minimalObjectCount: 2 },
      scene: { min: { x: 0, y: 0 }, max: { x: 8, y: 5.5 } },
    });
    expect(embeddedLevels[4]?.objects).toEqual([
      expect.objectContaining({
        id: 'ball-1',
        type: 'ball',
        transform: { position: { x: 1.5, y: 0.6 }, rotation: 0 },
        permissions: { move: false, rotate: false, remove: false },
      }),
      expect.objectContaining({
        id: 'roof',
        type: 'beam',
        transform: { position: { x: 1.6, y: 2.3 }, rotation: 0 },
        props: { size: 'medium' },
        permissions: { move: false, rotate: false, remove: false },
      }),
      expect.objectContaining({
        id: 'basket-1',
        type: 'basket',
        transform: { position: { x: 1.2, y: 4.9 }, rotation: 0 },
        permissions: { move: false, rotate: false, remove: false },
      }),
    ]);

    expect(embeddedLevels[5]).toMatchObject({
      schemaVersion: 2,
      id: 'level-6-la-bascule',
      metadata: { title: 'La bascule' },
      inventory: [],
      goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
      buildZones: [],
      scene: { min: { x: 0, y: 0 }, max: { x: 8, y: 5.5 } },
    });
    expect(embeddedLevels[5]?.objects).toEqual([
      expect.objectContaining({
        id: 'ball-1',
        type: 'ball',
        transform: { position: { x: 4.2, y: 0.8 }, rotation: 0 },
        permissions: { move: false, rotate: false, remove: false },
      }),
      expect.objectContaining({
        id: 'seesaw-1',
        type: 'seesaw',
        transform: { position: { x: 3.2, y: 2.8 }, rotation: 0 },
        permissions: { move: false, rotate: false, remove: false },
      }),
      expect.objectContaining({
        id: 'basket-1',
        type: 'basket',
        transform: { position: { x: 5.6, y: 4.9 }, rotation: 0 },
        permissions: { move: false, rotate: false, remove: false },
      }),
    ]);

    expect(embeddedLevels[6]).toMatchObject({
      schemaVersion: 2,
      id: 'level-7-placer-la-bascule',
      metadata: { title: 'Placer la bascule' },
      inventory: [
        {
          id: 'inventory-seesaw',
          type: 'seesaw',
          props: {},
          quantity: 1,
          permissions: { move: true, rotate: false, remove: true },
        },
      ],
      goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
      buildZones: [{ min: { x: 0.2, y: 2 }, max: { x: 6, y: 4.4 } }],
      scene: { min: { x: 0, y: 0 }, max: { x: 8, y: 5.5 } },
    });
    expect(embeddedLevels[6]?.objects).toEqual([
      expect.objectContaining({
        id: 'ball-1',
        type: 'ball',
        transform: { position: { x: 3, y: 0.6 }, rotation: 0 },
        permissions: { move: false, rotate: false, remove: false },
      }),
      expect.objectContaining({
        id: 'basket-1',
        type: 'basket',
        transform: { position: { x: 4.8, y: 4.9 }, rotation: 0 },
        permissions: { move: false, rotate: false, remove: false },
      }),
    ]);

    expect(embeddedLevels[7]).toMatchObject({
      schemaVersion: 2,
      id: 'level-8-poutre-et-bascule',
      metadata: { title: 'Poutre et bascule' },
      inventory: [
        {
          id: 'inventory-beam-medium',
          type: 'beam',
          props: { size: 'medium' },
          quantity: 1,
          permissions: { move: true, rotate: true, remove: true },
        },
        {
          id: 'inventory-seesaw',
          type: 'seesaw',
          props: {},
          quantity: 1,
          permissions: { move: true, rotate: false, remove: true },
        },
      ],
      goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
      buildZones: [
        { min: { x: 0.2, y: 0.8 }, max: { x: 4.6, y: 2.6 } },
        { min: { x: 2.2, y: 3 }, max: { x: 6, y: 4.5 } },
      ],
      challenge: { elegantObjectCount: 2, minimalObjectCount: 2 },
      scene: { min: { x: 0, y: 0 }, max: { x: 8, y: 5.5 } },
    });
    expect(embeddedLevels[7]?.objects).toEqual([
      expect.objectContaining({
        id: 'ball-1',
        type: 'ball',
        transform: { position: { x: 1, y: 0.6 }, rotation: 0 },
        permissions: { move: false, rotate: false, remove: false },
      }),
      expect.objectContaining({
        id: 'wall',
        type: 'beam',
        transform: { position: { x: 5.3, y: 1.9 }, rotation: Math.PI / 2 },
        props: { size: 'short' },
        permissions: { move: false, rotate: false, remove: false },
      }),
      expect.objectContaining({
        id: 'basket-1',
        type: 'basket',
        transform: { position: { x: 6.2, y: 4.9 }, rotation: 0 },
        permissions: { move: false, rotate: false, remove: false },
      }),
    ]);

    expect(embeddedLevels[8]).toMatchObject({
      schemaVersion: 2,
      id: 'level-9-le-tapis',
      metadata: { title: 'Le tapis' },
      inventory: [
        {
          id: 'inventory-conveyor',
          type: 'conveyor',
          props: { direction: 'right' },
          quantity: 1,
          permissions: { move: true, rotate: false, remove: true },
        },
      ],
      goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
      buildZones: [{ min: { x: 0.2, y: 1.2 }, max: { x: 4.4, y: 2.87 } }],
      scene: { min: { x: 0, y: 0 }, max: { x: 8, y: 5.5 } },
    });
    expect(embeddedLevels[8]?.objects).toEqual([
      expect.objectContaining({
        id: 'ball-1',
        type: 'ball',
        transform: { position: { x: 1.6, y: 0.6 }, rotation: 0 },
        permissions: { move: false, rotate: false, remove: false },
      }),
      expect.objectContaining({
        id: 'floor',
        type: 'beam',
        transform: { position: { x: 2.2, y: 3 }, rotation: 0 },
        props: { size: 'medium' },
        permissions: { move: false, rotate: false, remove: false },
      }),
      expect.objectContaining({
        id: 'basket-1',
        type: 'basket',
        transform: { position: { x: 5.6, y: 4.9 }, rotation: 0 },
        permissions: { move: false, rotate: false, remove: false },
      }),
    ]);

    expect(embeddedLevels[9]).toMatchObject({
      schemaVersion: 2,
      id: 'level-10-le-butoir',
      metadata: { title: 'Le butoir' },
      inventory: [
        {
          id: 'inventory-mass',
          type: 'mass',
          props: { weight: '10kg' },
          quantity: 1,
          permissions: { move: true, rotate: false, remove: true },
        },
      ],
      goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
      buildZones: [{ min: { x: 5.4, y: 2 }, max: { x: 7.6, y: 3.5 } }],
      scene: { min: { x: 0, y: 0 }, max: { x: 8, y: 5.5 } },
    });
    expect(embeddedLevels[9]?.objects).toEqual([
      expect.objectContaining({
        id: 'ball-1',
        type: 'ball',
        transform: { position: { x: 0.7, y: 0.584 }, rotation: 0 },
        permissions: { move: false, rotate: false, remove: false },
      }),
      expect.objectContaining({
        id: 'slope',
        type: 'beam',
        transform: { position: { x: 2.2, y: 1.6 }, rotation: Math.PI / 9 },
        props: { size: 'medium' },
        permissions: { move: false, rotate: false, remove: false },
      }),
      expect.objectContaining({
        id: 'basket-1',
        type: 'basket',
        transform: { position: { x: 4.6, y: 4.9 }, rotation: 0 },
        permissions: { move: false, rotate: false, remove: false },
      }),
      expect.objectContaining({
        id: 'ledge',
        type: 'beam',
        transform: { position: { x: 6.5, y: 3.6 }, rotation: 0 },
        props: { size: 'short' },
        permissions: { move: false, rotate: false, remove: false },
      }),
    ]);

    expect(embeddedLevels[10]).toMatchObject({
      schemaVersion: 2,
      id: 'level-11-l-interrupteur',
      metadata: { title: 'L’interrupteur' },
      inventory: [
        {
          id: 'inventory-mass',
          type: 'mass',
          props: { weight: '10kg' },
          quantity: 1,
          permissions: { move: true, rotate: false, remove: true },
        },
      ],
      goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
      buildZones: [{ min: { x: 5.2, y: 0.4 }, max: { x: 7.8, y: 1.9 } }],
      scene: { min: { x: 0, y: 0 }, max: { x: 8, y: 5.5 } },
      wires: [{ id: 'wire-1', sourceId: 'lever', targetId: 'belt' }],
    });
    expect(embeddedLevels[10]?.objects).toEqual([
      expect.objectContaining({
        id: 'ball-1',
        type: 'ball',
        transform: { position: { x: 1.9, y: 1.8 }, rotation: 0 },
        permissions: { move: false, rotate: false, remove: false },
      }),
      expect.objectContaining({
        id: 'belt',
        type: 'conveyor',
        transform: { position: { x: 2.2, y: 2.4 }, rotation: 0 },
        props: { direction: 'stopped' },
        permissions: { move: false, rotate: false, remove: false },
      }),
      expect.objectContaining({
        id: 'lever',
        type: 'lever',
        transform: { position: { x: 6.5, y: 3.2 }, rotation: 0 },
        props: { position: 'center' },
        permissions: { move: false, rotate: false, remove: false },
      }),
      expect.objectContaining({
        id: 'basket-1',
        type: 'basket',
        transform: { position: { x: 4.4, y: 4.9 }, rotation: 0 },
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
