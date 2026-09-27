import { describe, expect, it } from 'vitest';

import { embeddedLevels, embeddedWorkshopDocument } from '../content/embedded-levels';
import { decodeLevelFile } from '../infrastructure/level-file/level-file-codec';
import { decodeShareFragment } from '../infrastructure/level-share/level-share-codec';

import { buildShareUrl, createShareLink, prepareLevelExport } from './level-export';

const levelFour = embeddedLevels.find(({ id }) => id === 'level-4-moins-c-est-mieux');
if (levelFour === undefined) throw new Error('Niveau 4 embarqué introuvable.');

describe('export d’un niveau (U16)', () => {
  it('prépare un fichier JSON du codec L22 nommé d’après l’identifiant du niveau', () => {
    const result = prepareLevelExport(embeddedWorkshopDocument);

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.fileName).toBe('free-workshop.json');
    expect(result.mimeType).toBe('application/json');
    expect(decodeLevelFile(result.fileText)).toEqual({
      status: 'ok',
      document: embeddedWorkshopDocument,
    });
  });

  it('explique pourquoi un document invalide ne peut pas être exporté', () => {
    const depleted = {
      ...levelFour,
      inventory: levelFour.inventory.map((entry) => ({ ...entry, quantity: 0 })),
    };

    const result = prepareLevelExport(depleted);

    expect(result).toEqual({
      status: 'invalid',
      reasons: ['Le nombre minimal connu ne peut pas dépasser la quantité totale de l’inventaire.'],
    });
  });

  it('construit un lien /shared sous le chemin de base, décodable par le codec L23', async () => {
    const link = await createShareLink(
      embeddedWorkshopDocument,
      'https://exemple.test',
      '/tinkerbolt/',
    );

    expect(link.startsWith('https://exemple.test/tinkerbolt/shared#level=1.')).toBe(true);
    const fragment = new URL(link).hash;
    await expect(decodeShareFragment(fragment)).resolves.toEqual({
      status: 'ok',
      document: embeddedWorkshopDocument,
    });
  });

  it('accepte un chemin de base à la racine', () => {
    expect(buildShareUrl('#level=x', 'http://127.0.0.1:4173', '/')).toBe(
      'http://127.0.0.1:4173/shared#level=x',
    );
  });
});
