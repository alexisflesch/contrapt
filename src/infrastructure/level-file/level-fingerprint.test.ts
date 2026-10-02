import { describe, expect, it } from 'vitest';

import { selfSolvingLevel } from '../../../test/fixtures/self-solving-level';
import { levelDocumentSchema, type LevelDocument } from '../../domain/level-document';
import { encodeLevelFile } from './level-file-codec';
import { levelFingerprint } from './level-fingerprint';

const receivedIdSchema = levelDocumentSchema.shape.id;

const sha256Hex = async (text: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const withObjectMoved = (document: LevelDocument): LevelDocument => {
  const [first, ...rest] = document.objects;
  if (first === undefined) throw new Error('Le document de test doit contenir un objet.');
  return levelDocumentSchema.parse({
    ...document,
    objects: [
      {
        ...first,
        transform: {
          ...first.transform,
          position: { x: first.transform.position.x + 0.5, y: first.transform.position.y },
        },
      },
      ...rest,
    ],
  });
};

describe('empreinte d’un niveau (M2, ADR 0015)', () => {
  it('donne la même empreinte à deux documents égaux', async () => {
    const copy = levelDocumentSchema.parse(structuredClone(selfSolvingLevel));

    expect(copy).not.toBe(selfSolvingLevel);
    expect(await levelFingerprint(copy)).toBe(await levelFingerprint(selfSolvingLevel));
  });

  it('change quand un objet change', async () => {
    const moved = withObjectMoved(selfSolvingLevel);

    expect(await levelFingerprint(moved)).not.toBe(await levelFingerprint(selfSolvingLevel));
  });

  it('respecte seize chiffres hexadécimaux en minuscules', async () => {
    expect(await levelFingerprint(selfSolvingLevel)).toMatch(/^[0-9a-f]{16}$/);
  });

  it('est le début du SHA-256 des octets UTF-8 du texte du codec de fichier', async () => {
    const expected = (await sha256Hex(encodeLevelFile(selfSolvingLevel))).slice(0, 16);

    expect(await levelFingerprint(selfSolvingLevel)).toBe(expected);
  });

  it('fournit un identifiant `recu-<empreinte>` accepté par le schéma d’identifiant', async () => {
    const fingerprint = await levelFingerprint(selfSolvingLevel);

    expect(receivedIdSchema.safeParse(`recu-${fingerprint}`).success).toBe(true);
  });
});
