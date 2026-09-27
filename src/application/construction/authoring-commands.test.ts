import { describe, expect, it } from 'vitest';

import type { LevelDocument } from '../../domain/level-document';
import { createHistory, executeCommand, redo, undo, type Command } from '../history';
import type { ConstructionAttempt } from './construction-attempt';
import {
  addBuildZone,
  addInventoryEntry,
  moveBuildZone,
  removeBuildZone,
  removeInventoryEntry,
  removeLevelChallenge,
  resizeBuildZone,
  setLevelChallenge,
  updateInventoryPermissions,
  updateInventoryProperties,
  updateInventoryQuantity,
  updateLevelDescription,
  updateLevelGoal,
  updateLevelTitle,
  updatePlacementPermissions,
  updateScene,
} from './index';

const createLevel = (overrides: Partial<LevelDocument> = {}): LevelDocument => ({
  schemaVersion: 2,
  id: 'authoring-test',
  metadata: { title: 'Authoring test', description: 'Description' },
  objects: [
    {
      id: 'ball-1',
      type: 'ball',
      props: {},
      transform: { position: { x: 2, y: 2 }, rotation: 0 },
      permissions: { move: false, rotate: false, remove: false },
    },
    {
      id: 'basket-1',
      type: 'basket',
      props: {},
      transform: { position: { x: 10, y: 2 }, rotation: 0 },
      permissions: { move: false, rotate: false, remove: false },
    },
    {
      id: 'ball-2',
      type: 'ball',
      props: {},
      transform: { position: { x: 2, y: 8 }, rotation: 0 },
      permissions: { move: false, rotate: false, remove: false },
    },
    {
      id: 'basket-2',
      type: 'basket',
      props: {},
      transform: { position: { x: 10, y: 8 }, rotation: 0 },
      permissions: { move: false, rotate: false, remove: false },
    },
    {
      id: 'beam-1',
      type: 'beam',
      props: { size: 'short' },
      transform: { position: { x: 5, y: 5 }, rotation: 0 },
      permissions: { move: true, rotate: true, remove: true },
    },
  ],
  inventory: [
    {
      id: 'beam-stock',
      type: 'beam',
      props: { size: 'short' },
      quantity: 4,
      permissions: { move: true, rotate: true, remove: true },
    },
  ],
  buildZones: [{ min: { x: 1, y: 1 }, max: { x: 6, y: 6 } }],
  goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
  scene: { min: { x: 0, y: 0 }, max: { x: 20, y: 20 } },
  wires: [],
  ...overrides,
});

const addedZone = { min: { x: 7, y: 7 }, max: { x: 9, y: 9 } } as const;
const addedInventoryEntry = {
  id: 'mass-stock',
  type: 'mass',
  props: { weight: '10kg' },
  quantity: 2,
  permissions: { move: true, rotate: false, remove: true },
} as const;
const lockedPermissions = { move: false, rotate: false, remove: false } as const;

const authoringCommands: readonly {
  readonly label: string;
  readonly command: Command<ConstructionAttempt>;
  readonly document?: LevelDocument;
}[] = [
  {
    label: 'change la scène',
    command: updateScene({
      context: 'author',
      scene: { min: { x: -1, y: -1 }, max: { x: 21, y: 21 } },
    }),
  },
  { label: 'ajoute une zone', command: addBuildZone({ context: 'author', zone: addedZone }) },
  {
    label: 'déplace une zone',
    command: moveBuildZone({ context: 'author', index: 0, offset: { x: 1, y: 1 } }),
  },
  {
    label: 'redimensionne une zone',
    command: resizeBuildZone({
      context: 'author',
      index: 0,
      zone: { min: { x: 1, y: 1 }, max: { x: 7, y: 7 } },
    }),
  },
  { label: 'supprime une zone', command: removeBuildZone({ context: 'author', index: 0 }) },
  {
    label: 'ajoute une entrée d’inventaire',
    command: addInventoryEntry({ context: 'author', entry: addedInventoryEntry }),
  },
  {
    label: 'change une quantité',
    command: updateInventoryQuantity({ context: 'author', entryId: 'beam-stock', quantity: 5 }),
  },
  {
    label: 'change les propriétés d’inventaire',
    command: updateInventoryProperties({
      context: 'author',
      entryId: 'beam-stock',
      props: { size: 'long' },
    }),
  },
  {
    label: 'change les permissions d’inventaire',
    command: updateInventoryPermissions({
      context: 'author',
      entryId: 'beam-stock',
      permissions: lockedPermissions,
    }),
  },
  {
    label: 'supprime une entrée d’inventaire',
    command: removeInventoryEntry({ context: 'author', entryId: 'beam-stock' }),
  },
  {
    label: 'change les permissions d’un objet placé',
    command: updatePlacementPermissions({
      context: 'author',
      placementId: 'beam-1',
      permissions: lockedPermissions,
    }),
  },
  {
    label: 'choisit la balle et le panier de l’objectif',
    command: updateLevelGoal({ context: 'author', ballId: 'ball-2', basketId: 'basket-2' }),
  },
  { label: 'change le titre', command: updateLevelTitle({ context: 'author', title: 'Nouveau' }) },
  {
    label: 'change la description',
    command: updateLevelDescription({ context: 'author', description: 'Nouvelle description' }),
  },
  {
    label: 'retire la description',
    command: updateLevelDescription({ context: 'author', description: undefined }),
  },
  {
    label: 'définit le défi',
    command: setLevelChallenge({
      context: 'author',
      challenge: { elegantObjectCount: 3, minimalObjectCount: 2 },
    }),
  },
  {
    label: 'retire le défi',
    command: removeLevelChallenge({ context: 'author' }),
    document: createLevel({ challenge: { elegantObjectCount: 2, minimalObjectCount: 1 } }),
  },
];

const playerCommands: readonly Command<ConstructionAttempt>[] = [
  updateScene({ context: 'player', scene: { min: { x: 0, y: 0 }, max: { x: 20, y: 20 } } }),
  addBuildZone({ context: 'player', zone: addedZone }),
  moveBuildZone({ context: 'player', index: 0, offset: { x: 1, y: 1 } }),
  resizeBuildZone({
    context: 'player',
    index: 0,
    zone: { min: { x: 1, y: 1 }, max: { x: 7, y: 7 } },
  }),
  removeBuildZone({ context: 'player', index: 0 }),
  addInventoryEntry({ context: 'player', entry: addedInventoryEntry }),
  updateInventoryQuantity({ context: 'player', entryId: 'beam-stock', quantity: 5 }),
  updateInventoryProperties({ context: 'player', entryId: 'beam-stock', props: { size: 'long' } }),
  updateInventoryPermissions({
    context: 'player',
    entryId: 'beam-stock',
    permissions: lockedPermissions,
  }),
  removeInventoryEntry({ context: 'player', entryId: 'beam-stock' }),
  updatePlacementPermissions({
    context: 'player',
    placementId: 'beam-1',
    permissions: lockedPermissions,
  }),
  updateLevelGoal({ context: 'player', ballId: 'ball-2', basketId: 'basket-2' }),
  updateLevelTitle({ context: 'player', title: 'Nouveau' }),
  updateLevelDescription({ context: 'player', description: 'Nouvelle' }),
  setLevelChallenge({
    context: 'player',
    challenge: { elegantObjectCount: 2, minimalObjectCount: 1 },
  }),
  removeLevelChallenge({ context: 'player' }),
];

const expectUndoRedoRoundTrip = (
  command: Command<ConstructionAttempt>,
  initialDocument: LevelDocument = createLevel(),
): void => {
  const initialAttempt: ConstructionAttempt = { document: initialDocument, provenance: {} };
  const history = createHistory(initialAttempt);
  const applied = executeCommand(history, command);
  expect(applied.status).toBe('accepted');
  if (applied.status !== 'accepted') throw new Error('authoring command should be accepted');
  expect(applied.recorded).toBe(true);

  const undone = undo(applied.history);
  expect(undone.status).toBe('accepted');
  if (undone.status !== 'accepted') throw new Error('authoring command should be undoable');
  expect(undone.history.state.document).toEqual(initialAttempt.document);

  const redone = redo(undone.history);
  expect(redone.status).toBe('accepted');
  if (redone.status !== 'accepted') throw new Error('authoring command should be redoable');
  expect(redone.history.state).toEqual(applied.history.state);
};

describe('commandes d’auteur', () => {
  it.each(authoringCommands)('$label est annulable et rétablissable', ({ command, document }) => {
    expectUndoRedoRoundTrip(command, document);
  });

  it.each(playerCommands)('refuse une commande auteur au joueur sans mutation', (command) => {
    const state: ConstructionAttempt = { document: createLevel(), provenance: {} };
    const before = structuredClone(state);

    expect(command.execute(state)).toEqual({ status: 'rejected', reason: 'authoring-only' });
    expect(state).toEqual(before);
  });

  it('refuse une scène qui exclurait le centre d’un objet ou une zone', () => {
    const state = createLevel();

    expect(
      updateScene({
        context: 'author',
        scene: { min: { x: 0, y: 0 }, max: { x: 9, y: 9 } },
      }).execute({ document: state, provenance: {} }),
    ).toEqual({ status: 'rejected', reason: 'scene-excludes-content' });

    const zoneOutsideIfShrunk = createLevel({
      objects: createLevel().objects.filter((placement) => placement.id !== 'basket-1'),
      goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-2' },
      buildZones: [{ min: { x: 14, y: 14 }, max: { x: 16, y: 16 } }],
    });
    expect(
      updateScene({
        context: 'author',
        scene: { min: { x: 0, y: 0 }, max: { x: 13, y: 13 } },
      }).execute({ document: zoneOutsideIfShrunk, provenance: {} }),
    ).toEqual({ status: 'rejected', reason: 'scene-excludes-content' });
  });

  it('valide les entrées et les relations avant d’accepter une commande auteur', () => {
    const state = { document: createLevel(), provenance: {} };

    expect(
      moveBuildZone({ context: 'author', index: 4, offset: { x: 1, y: 1 } }).execute(state),
    ).toEqual({ status: 'rejected', reason: 'build-zone-not-found' });
    expect(
      resizeBuildZone({ context: 'author', index: 4, zone: addedZone }).execute(state),
    ).toEqual({ status: 'rejected', reason: 'build-zone-not-found' });
    expect(removeBuildZone({ context: 'author', index: 4 }).execute(state)).toEqual({
      status: 'rejected',
      reason: 'build-zone-not-found',
    });
    expect(
      addBuildZone({
        context: 'author',
        zone: { min: { x: 19, y: 19 }, max: { x: 21, y: 21 } },
      }).execute(state),
    ).toEqual({ status: 'rejected', reason: 'invalid-level-document' });
    expect(
      addInventoryEntry({
        context: 'author',
        entry: { ...addedInventoryEntry, id: 'ball-1' },
      }).execute(state),
    ).toEqual({ status: 'rejected', reason: 'identifier-already-used' });
    expect(
      updateInventoryQuantity({ context: 'author', entryId: 'beam-stock', quantity: 1.5 }).execute(
        state,
      ),
    ).toEqual({ status: 'rejected', reason: 'invalid-level-document' });
    expect(
      updateInventoryProperties({ context: 'author', entryId: 'beam-stock', props: {} }).execute(
        state,
      ),
    ).toEqual({ status: 'rejected', reason: 'invalid-level-document' });
    expect(
      updateLevelGoal({ context: 'author', ballId: 'basket-1', basketId: 'ball-1' }).execute(state),
    ).toEqual({ status: 'rejected', reason: 'goal-ball-not-found' });
    expect(
      setLevelChallenge({
        context: 'author',
        challenge: { elegantObjectCount: 1, minimalObjectCount: 2 },
      }).execute(state),
    ).toEqual({ status: 'rejected', reason: 'invalid-level-document' });
    expect(state.document).toEqual(createLevel());
  });

  it('n’enregistre pas d’entrée d’historique lorsqu’une valeur ne change pas', () => {
    const state = { document: createLevel(), provenance: {} };
    const history = createHistory(state);

    const unchanged = executeCommand(
      history,
      updateLevelTitle({ context: 'author', title: 'Authoring test' }),
    );

    expect(unchanged).toEqual({ status: 'accepted', history, recorded: false });
  });
});
