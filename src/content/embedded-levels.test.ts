import { describe, expect, it } from 'vitest';

import { embeddedLevels } from './embedded-levels';

describe('niveaux embarques', () => {
  it('expose la fixture du niveau 1 Laisser tomber comme un document v1 valide', () => {
    expect(embeddedLevels).toHaveLength(1);
    expect(embeddedLevels[0]).toMatchObject({
      schemaVersion: 1,
      id: 'level-1-laisser-tomber',
      metadata: { title: 'Laisser tomber' },
      inventory: [],
      buildZones: [],
      goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
    });

    const level = embeddedLevels[0];
    expect(level?.objects).toEqual([
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
    ]);
  });
});
