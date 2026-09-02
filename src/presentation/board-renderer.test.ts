import { describe, expect, it } from 'vitest';

import {
  spriteAssetPath,
  type DecodedSprite,
  type SpriteFamily,
  type SpriteLoader,
} from './sprite-loader';
import { levelDocumentSchema } from '../domain/level-document';
import {
  createBoardRenderer,
  projectLevel,
  worldToPixels,
  type BoardCanvasContext,
  type BoardViewport,
} from './board-renderer';

type Operation =
  | { readonly kind: 'setTransform'; readonly values: readonly number[] }
  | { readonly kind: 'save' }
  | { readonly kind: 'restore' }
  | { readonly kind: 'translate'; readonly values: readonly number[] }
  | { readonly kind: 'rotate'; readonly values: readonly number[] }
  | { readonly kind: 'drawImage'; readonly values: readonly unknown[] };

type ProjectedObject = Readonly<{
  readonly family: SpriteFamily;
  readonly assetPath: string;
  readonly destination: Readonly<{
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  }>;
}>;

type BeamSize = 'short' | 'medium' | 'long';

const createBeamDocument = (size: BeamSize) =>
  levelDocumentSchema.parse({
    ...levelDocument,
    objects: [
      ...levelDocument.objects.filter(
        (object) => object.type === 'ball' || object.type === 'basket',
      ),
      {
        id: `beam-${size}`,
        type: 'beam',
        transform: { position: { x: 12, y: 8 }, rotation: 0 },
        props: { size },
        permissions: { move: true, rotate: true, remove: true },
      },
    ],
  });

const renderDestination = async (
  document: Parameters<typeof projectLevel>[0],
  renderViewport: BoardViewport,
): Promise<{
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}> => {
  const { context, operations } = createContext();
  const spriteLoader = createPendingSpriteLoader();
  spriteLoader.setReady();
  const renderer = createBoardRenderer({
    canvas: { width: 0, height: 0 },
    context,
    viewport: renderViewport,
    spriteLoader: spriteLoader.loader,
  });

  await renderer.render(projectLevel(document));

  const drawOperations = operations.filter(
    (candidate): candidate is Extract<Operation, { readonly kind: 'drawImage' }> =>
      candidate.kind === 'drawImage',
  );
  const operation = drawOperations[drawOperations.length - 1];
  if (operation === undefined) {
    throw new Error('Aucune opération drawImage n’a été enregistrée.');
  }

  const [x, y, width, height] = operation.values.slice(-4);
  if (
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    typeof width !== 'number' ||
    typeof height !== 'number'
  ) {
    throw new Error('La destination Canvas enregistrée est invalide.');
  }

  return { x, y, width, height };
};

const viewport = {
  cssWidth: 320,
  cssHeight: 240,
  origin: { x: 10, y: 5 },
  pixelsPerWorldUnit: 4,
  devicePixelRatio: 2,
} satisfies BoardViewport;

const levelDocument = levelDocumentSchema.parse({
  schemaVersion: 1,
  id: 'presentation-contract',
  metadata: { title: 'Contrat de rendu' },
  objects: [
    {
      id: 'ball-1',
      type: 'ball',
      transform: { position: { x: 12, y: 8 }, rotation: 0 },
      props: {},
      permissions: { move: true, rotate: false, remove: true },
    },
    {
      id: 'basket-1',
      type: 'basket',
      transform: { position: { x: 14, y: 9 }, rotation: 0 },
      props: {},
      permissions: { move: true, rotate: false, remove: true },
    },
    {
      id: 'beam-1',
      type: 'beam',
      transform: { position: { x: 16, y: 10 }, rotation: Math.PI / 4 },
      props: { size: 'medium' },
      permissions: { move: true, rotate: true, remove: true },
    },
    {
      id: 'seesaw-1',
      type: 'seesaw',
      transform: { position: { x: 18, y: 11 }, rotation: 0 },
      props: {},
      permissions: { move: true, rotate: false, remove: true },
    },
  ],
  inventory: [],
  goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
  buildZones: [],
});

const createContext = (): {
  readonly context: BoardCanvasContext;
  readonly operations: Operation[];
} => {
  const operations: Operation[] = [];

  const context = {
    save: (): void => {
      operations.push({ kind: 'save' });
    },
    restore: (): void => {
      operations.push({ kind: 'restore' });
    },
    setTransform: (...values: [number, number, number, number, number, number]): void => {
      operations.push({ kind: 'setTransform', values });
    },
    translate: (...values: [number, number]): void => {
      operations.push({ kind: 'translate', values });
    },
    rotate: (...values: [number]): void => {
      operations.push({ kind: 'rotate', values });
    },
    drawImage: (...values: readonly unknown[]): void => {
      operations.push({ kind: 'drawImage', values });
    },
  } satisfies BoardCanvasContext;

  return { context, operations };
};

const createPendingSpriteLoader = (): {
  readonly loader: SpriteLoader;
  readonly requestedFamilies: SpriteFamily[];
  readonly sprites: Readonly<Record<SpriteFamily, DecodedSprite>>;
  readonly release: () => void;
  readonly setReady: () => void;
} => {
  const requestedFamilies: SpriteFamily[] = [];
  const sprites: Readonly<Record<SpriteFamily, DecodedSprite>> = {
    ball: { width: 64, height: 32 },
    basket: { width: 64, height: 32 },
    beam: { width: 64, height: 32 },
    seesaw: { width: 64, height: 32 },
  };
  let ready = false;
  let releasePending: () => void = () => {
    throw new Error('Le chargement des sprites n’a pas été initialisé.');
  };
  const loading = new Promise<void>((resolve) => {
    releasePending = resolve;
  });

  const loader = {
    getState: (family: SpriteFamily) => {
      void family;
      return ready ? 'ready' : 'loading';
    },
    getSprite: (family: SpriteFamily) => {
      return ready ? sprites[family] : undefined;
    },
    loadForFamilies: async (families: readonly SpriteFamily[]): Promise<void> => {
      requestedFamilies.push(...families);
      if (ready) {
        return;
      }
      await loading;
      ready = true;
    },
  } satisfies SpriteLoader;

  return {
    loader,
    requestedFamilies,
    sprites,
    release: releasePending,
    setReady: (): void => {
      ready = true;
    },
  };
};

describe('projection du plateau', () => {
  it('contient les quatre familles et porte les assets visuels hors du document', () => {
    const projection = projectLevel(levelDocument);

    expect(projection.objects.map((object: ProjectedObject) => object.family)).toEqual([
      'ball',
      'basket',
      'beam',
      'seesaw',
    ]);
    expect(
      projection.objects.every((object: ProjectedObject) => typeof object.assetPath === 'string'),
    ).toBe(true);
    expect(projection.objects.map((object) => object.assetPath)).toEqual(
      projection.objects.map((object) => spriteAssetPath(object.family, 2)),
    );
    expect(levelDocument.objects.every((object) => !('assetPath' in object))).toBe(true);
  });

  it('convertit les positions monde avec une origine et une échelle uniques', () => {
    expect(worldToPixels({ x: 12, y: 8 }, viewport)).toEqual({ x: 8, y: 12 });
    expect(worldToPixels({ x: 10, y: 5 }, viewport)).toEqual({ x: 0, y: 0 });
  });
});

describe('renderer Canvas 2D du plateau', () => {
  it('projette les dimensions visuelles selon pixelsPerWorldUnit', async () => {
    const destinationAtTwoPixels = await renderDestination(createBeamDocument('medium'), {
      ...viewport,
      pixelsPerWorldUnit: 2,
    });
    const destinationAtFourPixels = await renderDestination(createBeamDocument('medium'), {
      ...viewport,
      pixelsPerWorldUnit: 4,
    });

    expect(destinationAtFourPixels.width).toBe(destinationAtTwoPixels.width * 2);
    expect(destinationAtFourPixels.height).toBe(destinationAtTwoPixels.height * 2);
  });

  it('projette les longueurs de poutre dans l’ordre short, medium, long', async () => {
    const destinations = await Promise.all(
      (['short', 'medium', 'long'] as const).map((size) =>
        renderDestination(createBeamDocument(size), viewport),
      ),
    );
    const [shortDestination, mediumDestination, longDestination] = destinations;
    if (
      shortDestination === undefined ||
      mediumDestination === undefined ||
      longDestination === undefined
    ) {
      throw new Error('Les trois longueurs de poutre doivent être rendues.');
    }

    expect(shortDestination.width).toBeLessThan(mediumDestination.width);
    expect(mediumDestination.width).toBeLessThan(longDestination.width);
  });

  it('dimensionne le canvas en pixels physiques sans muter le LevelDocument', async () => {
    const { context } = createContext();
    const spriteLoader = createPendingSpriteLoader();
    spriteLoader.setReady();
    const canvas = { width: 0, height: 0 };
    const documentBeforeRender = JSON.stringify(levelDocument);
    const projection = projectLevel(levelDocument);
    const renderer = createBoardRenderer({
      canvas,
      context,
      viewport,
      spriteLoader: spriteLoader.loader,
    });

    await renderer.render(projection);

    expect(canvas).toEqual({ width: 640, height: 480 });
    expect(JSON.stringify(levelDocument)).toBe(documentBeforeRender);
  });

  it('attend tous les sprites requis avant le premier dessin', async () => {
    const { context, operations } = createContext();
    const spriteLoader = createPendingSpriteLoader();
    const canvas = { width: 0, height: 0 };
    const projection = projectLevel(levelDocument);
    const renderer = createBoardRenderer({
      canvas,
      context,
      viewport,
      spriteLoader: spriteLoader.loader,
    });
    const rendering = renderer.render(projection);

    await Promise.resolve();
    expect(operations.some((operation) => operation.kind === 'drawImage')).toBe(false);
    expect(spriteLoader.requestedFamilies).toEqual(['ball', 'basket', 'beam', 'seesaw']);

    spriteLoader.release();
    await rendering;

    expect(operations.some((operation) => operation.kind === 'drawImage')).toBe(true);
  });

  it('dessine dans un ordre déterministe avec rotation et destinations projetées', async () => {
    const { context, operations } = createContext();
    const spriteLoader = createPendingSpriteLoader();
    spriteLoader.setReady();
    const canvas = { width: 0, height: 0 };
    const projection = projectLevel(levelDocument);
    const renderer = createBoardRenderer({
      canvas,
      context,
      viewport,
      spriteLoader: spriteLoader.loader,
    });

    await renderer.render(projection);

    expect(operations.find((operation) => operation.kind === 'setTransform')).toEqual({
      kind: 'setTransform',
      values: [2, 0, 0, 2, 0, 0],
    });
    expect(
      operations
        .filter(
          (operation): operation is Extract<Operation, { readonly kind: 'translate' }> =>
            operation.kind === 'translate',
        )
        .map((operation) => operation.values),
    ).toEqual([
      [8, 12],
      [16, 16],
      [24, 20],
      [32, 24],
    ]);
    expect(
      operations
        .filter(
          (operation): operation is Extract<Operation, { readonly kind: 'rotate' }> =>
            operation.kind === 'rotate',
        )
        .map((operation) => operation.values),
    ).toEqual([[0], [0], [Math.PI / 4], [0]]);

    const drawOperations = operations.filter(
      (operation): operation is Extract<Operation, { readonly kind: 'drawImage' }> =>
        operation.kind === 'drawImage',
    );
    expect(drawOperations).toHaveLength(projection.objects.length);
    expect(drawOperations.map((operation) => operation.values.slice(-4))).toEqual(
      projection.objects.map((object: ProjectedObject) => [
        object.destination.x * viewport.pixelsPerWorldUnit,
        object.destination.y * viewport.pixelsPerWorldUnit,
        object.destination.width * viewport.pixelsPerWorldUnit,
        object.destination.height * viewport.pixelsPerWorldUnit,
      ]),
    );
    for (const [index, object] of projection.objects.entries()) {
      const drawOperation = drawOperations[index];
      if (drawOperation === undefined) {
        continue;
      }

      expect(drawOperation.values[0]).toBe(spriteLoader.sprites[object.family]);
    }
  });

  it('expose une API de rendu sans victoire ni sérialisation', () => {
    const { context } = createContext();
    const spriteLoader = createPendingSpriteLoader();
    const renderer = createBoardRenderer({
      canvas: { width: 0, height: 0 },
      context,
      viewport,
      spriteLoader: spriteLoader.loader,
    });

    expect('hasWon' in renderer).toBe(false);
    expect('serialize' in renderer).toBe(false);
  });
});
