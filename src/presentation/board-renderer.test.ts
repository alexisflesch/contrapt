import { describe, expect, it } from 'vitest';

import {
  spriteAssetPath,
  type DecodedSprite,
  type SpriteAsset,
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
  readonly assetKey: SpriteAsset;
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

/**
 * Renders `document` and returns the destination Canvas rectangle drawn for
 * its (single) beam. Locates the beam's `drawImage` op by its position in
 * `projection.objects` rather than assuming it is drawn last: B4 introduced
 * a draw order where a ball is drawn after every non-ball object, so "last
 * drawn" no longer means "last in the document" once a ball is present.
 */
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
  const projection = projectLevel(document);
  const renderer = createBoardRenderer({
    canvas: { width: 0, height: 0 },
    context,
    viewport: renderViewport,
    spriteLoader: spriteLoader.loader,
  });

  await renderer.render(projection);

  const drawOperations = operations.filter(
    (candidate): candidate is Extract<Operation, { readonly kind: 'drawImage' }> =>
      candidate.kind === 'drawImage',
  );
  const beamIndex = projection.objects.findIndex(
    (object: ProjectedObject) => object.family === 'beam',
  );
  if (beamIndex === -1) {
    throw new Error('Aucune poutre n’est présente dans la projection.');
  }
  const operation = drawOperations[beamIndex];
  if (operation === undefined) {
    throw new Error('Aucune opération drawImage n’a été enregistrée pour la poutre.');
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

const drawnAssetOrder = async (
  document: Parameters<typeof projectLevel>[0],
): Promise<readonly SpriteAsset[]> => {
  const { context, operations } = createContext();
  const spriteLoader = createPendingSpriteLoader();
  spriteLoader.setReady();
  const renderer = createBoardRenderer({
    canvas: { width: 0, height: 0 },
    context,
    viewport,
    spriteLoader: spriteLoader.loader,
  });

  await renderer.render(projectLevel(document));

  const drawOperations = operations.filter(
    (candidate): candidate is Extract<Operation, { readonly kind: 'drawImage' }> =>
      candidate.kind === 'drawImage',
  );

  return drawOperations.map((operation) => {
    const source = operation.values[0];
    const entry = (
      Object.entries(spriteLoader.sprites) as ReadonlyArray<[SpriteAsset, unknown]>
    ).find(([, sprite]) => sprite === source);
    if (entry === undefined) {
      throw new Error('Le sprite dessiné est introuvable parmi les sprites chargés.');
    }
    return entry[0];
  });
};

const viewport = {
  cssWidth: 320,
  cssHeight: 240,
  origin: { x: 10, y: 5 },
  pixelsPerWorldUnit: 4,
  devicePixelRatio: 2,
} satisfies BoardViewport;

const levelDocument = levelDocumentSchema.parse({
  schemaVersion: 2,
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
  scene: { min: { x: 10, y: 6 }, max: { x: 20, y: 13 } },
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
  readonly sprites: Readonly<Record<SpriteAsset, DecodedSprite>>;
  readonly release: () => void;
  readonly setReady: () => void;
} => {
  const requestedFamilies: SpriteFamily[] = [];
  const sprites: Readonly<Record<SpriteAsset, DecodedSprite>> = {
    ball: { width: 64, height: 32 },
    'basket-back': { width: 64, height: 32 },
    'basket-front': { width: 64, height: 32 },
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
    getSprite: (asset: SpriteAsset) => {
      return ready ? sprites[asset] : undefined;
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

    // Ordre de dessin, pas ordre du document : la balle est entre les deux
    // calques du panier.
    expect(projection.objects.map((object: ProjectedObject) => object.assetKey)).toEqual([
      'basket-back',
      'beam',
      'seesaw',
      'ball',
      'basket-front',
    ]);
    expect(
      projection.objects.every((object: ProjectedObject) => typeof object.assetPath === 'string'),
    ).toBe(true);
    expect(projection.objects.map((object) => object.assetPath)).toEqual(
      projection.objects.map((object) => spriteAssetPath(object.assetKey, 2)),
    );
    expect(levelDocument.objects.every((object) => !('assetPath' in object))).toBe(true);
  });

  it('centre la destination de la bascule sur son empreinte réelle, pas sur son pivot (A4)', () => {
    const projection = projectLevel(levelDocument);
    const seesaw = projection.objects.find((object) => object.family === 'seesaw');
    if (seesaw === undefined) throw new Error('La bascule est absente de la projection.');

    // Empreinte mesurée par A4 (simulation-session.ts) : socle x∈[-0,25,0,25]
    // y∈[0,+0,70], tablier x∈[-1,5,1,5] y∈[-0,12,+0,12] — union 3 × 0,82,
    // sommet à y=-0,12 relatif au pivot. Le socle étant posé sous le pivot et
    // non centré dessus, cette destination ne peut pas être symétrique comme
    // pour les trois autres familles.
    expect(seesaw.destination).toEqual({ x: -1.5, y: -0.12, width: 3, height: 0.82 });
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
    // Ordre de dessin (B4) : basket, beam, seesaw, puis ball en dernier.
    expect(spriteLoader.requestedFamilies).toEqual(['basket', 'beam', 'seesaw', 'ball']);

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
    // Ordre de dessin : calques arrière, balle, puis lèvres avant — pas
    // l'ordre du document.
    expect(
      operations
        .filter(
          (operation): operation is Extract<Operation, { readonly kind: 'translate' }> =>
            operation.kind === 'translate',
        )
        .map((operation) => operation.values),
    ).toEqual([
      [16, 16],
      [24, 20],
      [32, 24],
      [8, 12],
      [16, 16],
    ]);
    expect(
      operations
        .filter(
          (operation): operation is Extract<Operation, { readonly kind: 'rotate' }> =>
            operation.kind === 'rotate',
        )
        .map((operation) => operation.values),
    ).toEqual([[0], [Math.PI / 4], [0], [0], [0]]);

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

      expect(drawOperation.values[0]).toBe(spriteLoader.sprites[object.assetKey]);
    }
  });

  it('dessine le panier arrière, la balle, puis le panier avant', async () => {
    const document = levelDocumentSchema.parse({
      schemaVersion: 2,
      id: 'b4-ball-before-basket',
      metadata: { title: 'Balle avant panier' },
      objects: [
        {
          id: 'ball-1',
          type: 'ball',
          transform: { position: { x: 4, y: 4 }, rotation: 0 },
          props: {},
          permissions: { move: false, rotate: false, remove: false },
        },
        {
          id: 'basket-1',
          type: 'basket',
          transform: { position: { x: 4, y: 4 }, rotation: 0 },
          props: {},
          permissions: { move: false, rotate: false, remove: false },
        },
      ],
      inventory: [],
      goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
      buildZones: [],
      scene: { min: { x: 0, y: 0 }, max: { x: 8, y: 8 } },
    });

    const order = await drawnAssetOrder(document);

    expect(order).toEqual(['basket-back', 'ball', 'basket-front']);
  });

  it('conserve l’ordre du document entre deux objets qui ne sont pas des balles', async () => {
    const document = levelDocumentSchema.parse({
      schemaVersion: 2,
      id: 'b4-non-ball-order',
      metadata: { title: 'Poutre et bascule' },
      objects: [
        {
          id: 'seesaw-1',
          type: 'seesaw',
          transform: { position: { x: 4, y: 4 }, rotation: 0 },
          props: {},
          permissions: { move: false, rotate: false, remove: false },
        },
        {
          id: 'beam-1',
          type: 'beam',
          transform: { position: { x: 4, y: 4 }, rotation: 0 },
          props: { size: 'medium' },
          permissions: { move: false, rotate: false, remove: false },
        },
        {
          id: 'ball-1',
          type: 'ball',
          transform: { position: { x: 1, y: 1 }, rotation: 0 },
          props: {},
          permissions: { move: false, rotate: false, remove: false },
        },
        {
          id: 'basket-1',
          type: 'basket',
          transform: { position: { x: 7, y: 7 }, rotation: 0 },
          props: {},
          permissions: { move: false, rotate: false, remove: false },
        },
      ],
      inventory: [],
      goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
      buildZones: [],
      scene: { min: { x: 0, y: 0 }, max: { x: 8, y: 8 } },
    });

    const order = await drawnAssetOrder(document);

    // Les éléments de fond conservent leur ordre document, puis la balle, puis
    // la lèvre avant du panier.
    expect(order).toEqual(['seesaw', 'beam', 'basket-back', 'ball', 'basket-front']);
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
