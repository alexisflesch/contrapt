import { describe, expect, it } from 'vitest';

import { validateContentCatalog, type ContentLevelFile } from './catalogue-validator';

const validLevel = {
  schemaVersion: 1,
  id: 'first-drop',
  metadata: { title: 'Laisser tomber' },
  objects: [
    {
      id: 'ball-1',
      type: 'ball',
      transform: { position: { x: 0, y: 4 }, rotation: 0 },
      props: {},
      permissions: { move: false, rotate: false, remove: false },
    },
    {
      id: 'basket-1',
      type: 'basket',
      transform: { position: { x: 0, y: 0 }, rotation: 0 },
      props: {},
      permissions: { move: false, rotate: false, remove: false },
    },
  ],
  inventory: [],
  goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
  buildZones: [],
};

const file = (filePath: string, value: unknown): ContentLevelFile => ({ filePath, value });

describe('validateContentCatalog', () => {
  it('valide un catalogue de niveaux v1 et retourne les documents valides', () => {
    const result = validateContentCatalog([file('level-1.json', validLevel)]);

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.levels).toEqual([validLevel]);
  });

  it('signale le fichier dont le document ne respecte pas le schema strict', () => {
    const invalidLevel = {
      ...validLevel,
      unexpected: true,
    };

    const result = validateContentCatalog([file('broken-level.json', invalidLevel)]);

    expect(result.valid).toBe(false);
    expect(result.levels).toEqual([]);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({
      filePath: 'broken-level.json',
      kind: 'invalid-file',
    });
    expect(result.issues[0]?.message).toContain('unexpected');
  });

  it('signale les identifiants de niveau dupliques', () => {
    const result = validateContentCatalog([
      file('first.json', validLevel),
      file('copy.json', { ...validLevel, metadata: { title: 'Copie' } }),
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      filePath: 'copy.json',
      kind: 'duplicate-id',
      message: 'L’identifiant de niveau « first-drop » est dupliqué (déjà défini dans first.json).',
    });
  });

  it('signale une erreur de lecture JSON avec un message exploitable', () => {
    const result = validateContentCatalog([
      {
        filePath: 'malformed.json',
        value: null,
        parseError: 'JSON invalide à la ligne 1, colonne 2.',
      },
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      filePath: 'malformed.json',
      kind: 'invalid-file',
      message: 'JSON invalide à la ligne 1, colonne 2.',
    });
  });
});
