import { describe, expect, it } from 'vitest';

import { embeddedLevels, embeddedWorkshopDocument } from '../content/embedded-levels';
import type { LevelDocument } from '../domain/level-document';
import { decodeLevelFile } from '../infrastructure/level-file/level-file-codec';
import { decodeShareFragment } from '../infrastructure/level-share/level-share-codec';

import {
  buildShareUrl,
  createShareLink,
  nameExportedLevel,
  prepareLevelExport,
} from './level-export';

const levelFour = embeddedLevels.find(({ id }) => id === 'campaign-04-retour-a-l-expediteur');
if (levelFour === undefined) throw new Error('Niveau 4 embarqué introuvable.');
const { solution: ignoredLevelFourSolution, ...levelFourWithoutSolution } = levelFour;
void ignoredLevelFourSolution;
const levelOne = embeddedLevels.find(({ id }) => id === 'campaign-01-la-bille-de-service');
if (levelOne === undefined) throw new Error('Niveau 1 embarqué introuvable.');
const { solution: ignoredSolution, ...levelOneWithoutSolution } = levelOne;
void ignoredSolution;

/** Level 1 as its author would build it: the reference beam in place, marked to place. */
const levelOneWorkshop: LevelDocument = {
  ...levelOneWithoutSolution,
  objects: [
    ...levelOneWithoutSolution.objects,
    {
      id: 'placement-1',
      type: 'beam',
      props: { size: 'short' },
      transform: { position: { x: 5, y: 2.15 }, rotation: 0 },
      permissions: { move: false, rotate: false, remove: false },
      toPlace: true,
    },
  ],
};

const successfulExportRun = (document: LevelDocument): 'won' | 'lost' =>
  document.objects.length > levelOne.objects.length ? 'won' : 'lost';

describe('export d’un niveau (U16, U22)', () => {
  it('exporte le puzzle vérifié : décor fixe, objets à placer en inventaire, solution de référence', () => {
    const result = prepareLevelExport(levelOneWorkshop, successfulExportRun);

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.fileName).toBe('campaign-01-la-bille-de-service.json');
    expect(result.mimeType).toBe('application/json');
    const decoded = decodeLevelFile(result.fileText);
    expect(decoded).toEqual({ status: 'ok', document: result.puzzle });
    expect(result.puzzle.objects.map(({ id }) => id)).toEqual(levelOne.objects.map(({ id }) => id));
    expect(result.puzzle.inventory).toEqual([
      {
        id: 'beam-a-placer',
        type: 'beam',
        props: { size: 'short' },
        quantity: 1,
        permissions: { move: true, rotate: true, remove: true },
      },
    ]);
    expect(result.puzzle.solution).toEqual({
      placements: [
        {
          inventoryId: 'beam-a-placer',
          transform: { position: { x: 5, y: 2.15 }, rotation: 0 },
        },
      ],
    });
  });

  it('nomme le niveau exporté : titre, identifiant et fichier suivent le nom choisi', () => {
    const preparation = prepareLevelExport(levelOneWorkshop, successfulExportRun);
    if (preparation.status !== 'ready') throw new Error('Le puzzle du niveau 1 est refusé.');

    const named = nameExportedLevel(preparation.puzzle, '  Le Grand Saut de l’été !  ');

    expect(named).not.toBeNull();
    if (named === null) return;
    expect(named.puzzle.metadata.title).toBe('Le Grand Saut de l’été !');
    expect(named.puzzle.id).toBe('le-grand-saut-de-l-ete');
    expect(named.fileName).toBe('le-grand-saut-de-l-ete.json');
    expect(decodeLevelFile(named.fileText)).toEqual({ status: 'ok', document: named.puzzle });
    expect(named.puzzle.objects).toEqual(preparation.puzzle.objects);
  });

  it('refuse un nom vide et garde l’identifiant quand le nom n’a ni lettre ni chiffre', () => {
    const preparation = prepareLevelExport(levelOneWorkshop, successfulExportRun);
    if (preparation.status !== 'ready') throw new Error('Le puzzle du niveau 1 est refusé.');

    expect(nameExportedLevel(preparation.puzzle, '   ')).toBeNull();
    expect(nameExportedLevel(preparation.puzzle, '!?')?.puzzle.id).toBe(preparation.puzzle.id);
  });

  it('refuse un atelier sans objet à placer et invite à toucher ceux à retirer', () => {
    expect(prepareLevelExport(embeddedWorkshopDocument)).toEqual({
      status: 'invalid',
      reasons: [
        'Aucun objet n’est à placer : touchez chaque objet que le joueur devra poser, puis choisissez « À placer » dans ses propriétés.',
      ],
    });
  });

  it('refuse une machine complète qui ne gagne pas, ou un décor qui gagne seul', () => {
    expect(prepareLevelExport(levelOneWorkshop, () => 'lost')).toEqual({
      status: 'invalid',
      reasons: [
        'La machine complète ne gagne pas : avec tous les objets en place, la balle doit atteindre le panier.',
      ],
    });
    expect(prepareLevelExport(levelOneWorkshop, () => 'won')).toEqual({
      status: 'invalid',
      reasons: [
        'La balle atteint le panier sans les objets à placer : le joueur n’aurait rien à faire.',
      ],
    });
  });

  it('explique pourquoi un document invalide ne peut pas être exporté', () => {
    const depleted = {
      ...levelFourWithoutSolution,
      inventory: levelFour.inventory.map((entry) => ({ ...entry, quantity: 0 })),
    };

    const result = prepareLevelExport(depleted);

    expect(result).toEqual({
      status: 'invalid',
      reasons: [
        'Aucun objet n’est à placer : touchez chaque objet que le joueur devra poser, puis choisissez « À placer » dans ses propriétés.',
      ],
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
