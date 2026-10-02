import { describe, expect, it } from 'vitest';

import {
  createConstructionAttempt,
  movePlacement,
  placeFromInventory,
} from '../application/construction';
import {
  beginEditorManipulation,
  commitEditorManipulation,
  createEditorSession,
  previewEditorManipulation,
  previewInvalidEditorManipulation,
  type EditorSession,
} from '../application/editor-session';
import type { LevelDocument } from '../domain/level-document';
import { placementGhost } from './placement-ghost';

const locked = { move: false, rotate: false, remove: false } as const;

const level: LevelDocument = {
  schemaVersion: 2,
  id: 'placement-ghost',
  metadata: { title: 'Fantôme de placement' },
  objects: [
    {
      id: 'ball',
      type: 'ball',
      props: {},
      transform: { position: { x: 1, y: 1 }, rotation: 0 },
      permissions: locked,
    },
    {
      id: 'basket',
      type: 'basket',
      props: {},
      transform: { position: { x: 7, y: 4 }, rotation: 0 },
      permissions: locked,
    },
    {
      id: 'beam',
      type: 'beam',
      props: { size: 'medium' },
      transform: { position: { x: 3, y: 3 }, rotation: 0 },
      permissions: { move: true, rotate: true, remove: false },
    },
  ],
  inventory: [
    {
      id: 'short-beams',
      type: 'beam',
      props: { size: 'short' },
      quantity: 1,
      permissions: { move: true, rotate: true, remove: true },
    },
  ],
  goal: { type: 'basket', ballId: 'ball', basketId: 'basket' },
  buildZones: [{ min: { x: 0, y: 0 }, max: { x: 4, y: 5.5 } }],
  scene: { min: { x: 0, y: 0 }, max: { x: 8, y: 5.5 } },
  wires: [],
};

const placeAt = (context: 'player' | 'author', x: number) =>
  placeFromInventory({
    context,
    inventoryEntryId: 'short-beams',
    placementId: 'placement-1',
    transform: { position: { x, y: 2 }, rotation: 0 },
  });

const accepted = (result: { readonly status: string; readonly session: EditorSession }) => {
  if (result.status !== 'accepted') throw new Error('L’action devait être acceptée.');
  return result.session;
};

const placing = (): EditorSession =>
  accepted(
    beginEditorManipulation(createEditorSession('resolution', createConstructionAttempt(level)), {
      kind: 'placement',
      placementId: 'placement-1',
    }),
  );

describe('placementGhost (U1)', () => {
  it('ne montre aucun fantôme hors placement', () => {
    expect(
      placementGhost(createEditorSession('resolution', createConstructionAttempt(level))),
    ).toBeNull();
  });

  it('ne montre aucun fantôme tant que le placement n’a pas de position candidate', () => {
    expect(placementGhost(placing())).toBeNull();
  });

  it('désigne le placement candidat, valide, dans une zone de construction', () => {
    const session = accepted(previewEditorManipulation(placing(), placeAt('player', 2)));

    expect(placementGhost(session)).toEqual({
      ghostPlacementId: 'placement-1',
      isGhostValid: true,
    });
  });

  it('désigne le placement candidat, invalide, hors de toute zone de construction', () => {
    const session = accepted(
      previewInvalidEditorManipulation(placing(), placeAt('author', 6), 'outside-build-zone'),
    );

    expect(placementGhost(session)).toEqual({
      ghostPlacementId: 'placement-1',
      isGhostValid: false,
    });
  });

  it('ne fait pas d’un déplacement un fantôme de placement', () => {
    const moving = accepted(
      beginEditorManipulation(createEditorSession('resolution', createConstructionAttempt(level)), {
        kind: 'move',
        placementId: 'beam',
      }),
    );
    const session = accepted(
      previewEditorManipulation(
        moving,
        movePlacement({ context: 'player', placementId: 'beam', position: { x: 2, y: 2 } }),
      ),
    );

    expect(placementGhost(session)).toBeNull();
  });

  it('disparaît une fois le placement confirmé, sans avoir touché l’historique avant', () => {
    const previewed = accepted(previewEditorManipulation(placing(), placeAt('player', 2)));
    expect(previewed.history.past).toHaveLength(0);

    const committed = accepted(commitEditorManipulation(previewed));

    expect(placementGhost(committed)).toBeNull();
    expect(committed.history.past).toHaveLength(1);
  });
});
