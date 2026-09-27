import { describe, expect, it } from 'vitest';

import { embeddedWorkshopDocument } from '../content/embedded-levels';
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
  type BoardConveyorBelt,
  type BoardDeviceView,
  type BoardPose,
  type BoardSimulationView,
  type BoardViewport,
} from './board-renderer';

type Operation =
  | { readonly kind: 'setTransform'; readonly values: readonly number[] }
  | { readonly kind: 'save' }
  | { readonly kind: 'restore' }
  | { readonly kind: 'translate'; readonly values: readonly number[] }
  | { readonly kind: 'rotate'; readonly values: readonly number[] }
  | { readonly kind: 'scale'; readonly values: readonly number[] }
  | { readonly kind: 'lineWidth'; readonly values: readonly number[] }
  | { readonly kind: 'strokeRect'; readonly values: readonly number[] }
  | { readonly kind: 'fillRect'; readonly values: readonly number[] }
  | { readonly kind: 'drawImage'; readonly values: readonly unknown[] }
  | { readonly kind: 'beginPath' }
  | { readonly kind: 'stroke' }
  | { readonly kind: 'globalAlpha'; readonly values: readonly number[] }
  | { readonly kind: 'fillText'; readonly values: readonly unknown[] };

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
  readonly layer: Readonly<{
    readonly destination: Readonly<{
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    }>;
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
  let lineWidth = 1;
  let globalAlpha = 1;

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
    scale: (...values: [number, number]): void => {
      operations.push({ kind: 'scale', values });
    },
    get lineWidth(): number {
      return lineWidth;
    },
    set lineWidth(value: number) {
      lineWidth = value;
      operations.push({ kind: 'lineWidth', values: [value] });
    },
    strokeRect: (...values: [number, number, number, number]): void => {
      operations.push({ kind: 'strokeRect', values });
    },
    fillRect: (...values: [number, number, number, number]): void => {
      operations.push({ kind: 'fillRect', values });
    },
    drawImage: (...values: readonly unknown[]): void => {
      operations.push({ kind: 'drawImage', values });
    },
    drawImageRegion: (...values: readonly unknown[]): void => {
      operations.push({ kind: 'drawImage', values });
    },
    get globalAlpha(): number {
      return globalAlpha;
    },
    set globalAlpha(value: number) {
      globalAlpha = value;
      operations.push({ kind: 'globalAlpha', values: [value] });
    },
    strokeStyle: '',
    fillStyle: '',
    lineCap: 'butt',
    lineJoin: 'miter',
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    beginPath: (): void => {
      operations.push({ kind: 'beginPath' });
    },
    moveTo: (): void => undefined,
    lineTo: (): void => undefined,
    arcTo: (): void => undefined,
    arc: (): void => undefined,
    stroke: (): void => {
      operations.push({ kind: 'stroke' });
    },
    fill: (): void => undefined,
    fillText: (...values: readonly unknown[]): void => {
      operations.push({ kind: 'fillText', values });
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
    'ball-base': { width: 64, height: 32 },
    'ball-spin': { width: 64, height: 32 },
    'ball-highlight': { width: 64, height: 32 },
    'basket-back': { width: 64, height: 32 },
    'basket-front': { width: 64, height: 32 },
    beam: { width: 64, height: 32 },
    'seesaw-fulcrum': { width: 64, height: 32 },
    'seesaw-beam': { width: 64, height: 32 },
    'mass-10kg': { width: 64, height: 32 },
    'lever-base': { width: 64, height: 32 },
    'lever-handle': { width: 64, height: 32 },
    'conveyor-belt': { width: 64, height: 32 },
    'conveyor-belt-left': { width: 64, height: 32 },
    'conveyor-frame': { width: 64, height: 32 },
    'button-base': { width: 64, height: 32 },
    'button-cap': { width: 64, height: 32 },
    'fan-blades': { width: 64, height: 32 },
    'fan-body': { width: 64, height: 32 },
    'barrier-bar': { width: 64, height: 32 },
    'barrier-pillar': { width: 64, height: 32 },
    'springboard-spring': { width: 64, height: 32 },
    'springboard-base': { width: 64, height: 32 },
    'springboard-platform': { width: 64, height: 32 },
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

const simulationView = (
  poses: readonly (readonly [string, BoardPose])[],
  belts: readonly (readonly [string, BoardConveyorBelt])[] = [],
  devices: readonly (readonly [string, BoardDeviceView])[] = [],
): BoardSimulationView => ({
  bodyPoses: new Map(poses),
  conveyorBelts: new Map(belts),
  devices: new Map(devices),
});

/** One object of the given family at (3, 3), next to the goal pair. */
const createDeviceDocument = (
  type: string,
  props: Readonly<Record<string, string>> = {},
  rotation = 0,
) =>
  levelDocumentSchema.parse({
    schemaVersion: 2,
    id: 'device-presentation',
    metadata: { title: 'Dispositif' },
    objects: [
      {
        id: 'ball-1',
        type: 'ball',
        transform: { position: { x: 1, y: 1 }, rotation: 0 },
        props: {},
        permissions: lockedPermissions,
      },
      {
        id: 'basket-1',
        type: 'basket',
        transform: { position: { x: 1, y: 7 }, rotation: 0 },
        props: {},
        permissions: lockedPermissions,
      },
      {
        id: 'device-1',
        type,
        transform: { position: { x: 3, y: 3 }, rotation },
        props,
        permissions: lockedPermissions,
      },
    ],
    inventory: [],
    goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
    buildZones: [],
    scene: { min: { x: 0, y: 0 }, max: { x: 10, y: 8 } },
  });

const lockedPermissions = { move: false, rotate: false, remove: false } as const;

/** A lever wired to a conveyor, with the goal pair out of the way. */
const createWiredDocument = (
  leverPosition: 'left' | 'center' | 'right',
  conveyorDirection: 'left' | 'stopped' | 'right',
) =>
  levelDocumentSchema.parse({
    schemaVersion: 2,
    id: 'wired-presentation',
    metadata: { title: 'Levier et convoyeur' },
    objects: [
      {
        id: 'ball-1',
        type: 'ball',
        transform: { position: { x: 1, y: 1 }, rotation: 0 },
        props: {},
        permissions: lockedPermissions,
      },
      {
        id: 'basket-1',
        type: 'basket',
        transform: { position: { x: 1, y: 7 }, rotation: 0 },
        props: {},
        permissions: lockedPermissions,
      },
      {
        id: 'lever-1',
        type: 'lever',
        transform: { position: { x: 2, y: 4 }, rotation: 0 },
        props: { position: leverPosition },
        permissions: lockedPermissions,
      },
      {
        id: 'conveyor-1',
        type: 'conveyor',
        transform: { position: { x: 7, y: 5 }, rotation: 0 },
        props: { direction: conveyorDirection },
        permissions: lockedPermissions,
      },
    ],
    inventory: [],
    goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
    buildZones: [],
    scene: { min: { x: 0, y: 0 }, max: { x: 10, y: 8 } },
    wires: [{ id: 'wire-1', sourceId: 'lever-1', targetId: 'conveyor-1' }],
  });

const layerOf = (projection: ReturnType<typeof projectLevel>, asset: SpriteAsset) => {
  const found = projection.objects.find((object) => object.assetKey === asset);
  if (found === undefined) throw new Error(`Calque « ${asset} » absent.`);
  return found.layer;
};

describe('projection du plateau', () => {
  it('pose la poignée du levier à sa position de départ, sur un socle immobile', () => {
    const projection = projectLevel(createWiredDocument('right', 'stopped'));

    expect(layerOf(projection, 'lever-handle').rotation).toBeCloseTo(Math.PI / 4);
    expect(layerOf(projection, 'lever-base').rotation).toBe(0);
    const handlePose = { position: { x: 2, y: 4 }, rotation: -0.5 };
    expect(
      layerOf(
        projectLevel(
          createWiredDocument('right', 'stopped'),
          simulationView([['lever-1', handlePose]]),
        ),
        'lever-handle',
      ).rotation,
    ).toBe(-0.5);
  });

  it('montre la bande du convoyeur dans son sens, derrière le cadre', () => {
    const construction = projectLevel(createWiredDocument('center', 'left'));
    const assets = construction.objects
      .filter((object) => object.family === 'conveyor')
      .map((object) => object.assetKey);

    expect(assets).toEqual(['conveyor-belt-left', 'conveyor-frame']);
    expect(layerOf(construction, 'conveyor-belt-left').source?.x).toBe(0);
  });

  it('fait défiler la bande d’après le déplacement simulé', () => {
    const projection = projectLevel(
      createWiredDocument('center', 'stopped'),
      simulationView([], [['conveyor-1', { offset: 0.15, facing: 1 }]]),
    );
    const belt = layerOf(projection, 'conveyor-belt');

    // A belt moving right shifts its pattern right: the source window moves left.
    expect(belt.source?.width).toBe(247);
    expect(belt.source?.x).toBeCloseTo(77 * (1 - 0.15 / 0.6006));
  });

  it('enfonce le capuchon du bouton pressé, sans bouger son socle', () => {
    const document = createDeviceDocument('button');
    const resting = projectLevel(document);
    const pressed = projectLevel(
      document,
      simulationView([], [], [['device-1', { kind: 'button', pressed: true }]]),
    );

    expect(
      resting.objects.map((object) => object.assetKey).filter((key) => key.startsWith('button')),
    ).toEqual(['button-base', 'button-cap']);
    expect(layerOf(pressed, 'button-cap').destination.y).toBeCloseTo(
      layerOf(resting, 'button-cap').destination.y + 0.06,
    );
    expect(layerOf(pressed, 'button-base')).toEqual(layerOf(resting, 'button-base'));
  });

  it('fait tourner les pales du ventilateur, écrasées en largeur, derrière son corps', () => {
    const document = createDeviceDocument('fan', { state: 'on' });
    const resting = projectLevel(document);
    const spinning = projectLevel(
      document,
      simulationView([], [], [['device-1', { kind: 'fan', bladeAngle: 1.2 }]]),
    );
    const blades = layerOf(spinning, 'fan-blades');

    expect(
      resting.objects.map((object) => object.assetKey).filter((key) => key.startsWith('fan')),
    ).toEqual(['fan-blades', 'fan-body']);
    expect(layerOf(resting, 'fan-blades').spin).toEqual({ angle: 0, squash: 0.53 });
    expect(blades.spin).toEqual({ angle: 1.2, squash: 0.53 });
    expect(blades.position.x).toBeCloseTo(3 + 0.1986);
    expect(blades.destination.x).toBeCloseTo(-blades.destination.width / 2);
  });

  it('retourne en miroir le ventilateur tourné d’un demi-tour, et tourne celui qui souffle en hauteur', () => {
    const left = projectLevel(createDeviceDocument('fan', { state: 'off' }, Math.PI));
    const up = projectLevel(createDeviceDocument('fan', { state: 'off' }, -Math.PI / 2));
    const device = (projection: ReturnType<typeof projectLevel>) => {
      const found = projection.objects.find((object) => object.id === 'device-1');
      if (found === undefined) throw new Error('Ventilateur absent.');
      return found;
    };

    expect(layerOf(left, 'fan-body').mirrored).toBe(true);
    expect(layerOf(left, 'fan-body').rotation).toBeCloseTo(0);
    expect(layerOf(left, 'fan-blades').position.x).toBeCloseTo(3 - 0.1986);
    expect(layerOf(up, 'fan-body').rotation).toBeCloseTo(-Math.PI / 2);
    expect(layerOf(up, 'fan-body').mirrored).toBe(false);
    expect(layerOf(up, 'fan-blades').position.y).toBeCloseTo(3 - 0.1986);
    // Selection follows the placement's own rotation around the unturned footprint.
    expect(device(up).destination.width).toBeCloseTo(1.2);
    expect(device(up).rotation).toBeCloseTo(-Math.PI / 2);
  });

  it('ne dessine de la barre que ce qui sort du poteau, de son côté', () => {
    const right = projectLevel(createDeviceDocument('barrier', { state: 'closed' }));
    const left = projectLevel(createDeviceDocument('barrier', { state: 'closed' }, Math.PI));
    const down = projectLevel(createDeviceDocument('barrier', { state: 'closed' }, Math.PI / 2));
    const open = projectLevel(
      createDeviceDocument('barrier', { state: 'closed' }),
      simulationView([], [], [['device-1', { kind: 'barrier', retraction: 1 }]]),
    );

    expect(
      right.objects.map((object) => object.assetKey).filter((key) => key.startsWith('barrier')),
    ).toEqual(['barrier-bar', 'barrier-pillar']);
    expect(layerOf(right, 'barrier-bar').destination).toMatchObject({ x: 0, width: 1.2536 });
    expect(layerOf(right, 'barrier-bar').source).toBeUndefined();
    expect(layerOf(left, 'barrier-bar').mirrored).toBe(true);
    expect(layerOf(left, 'barrier-pillar').mirrored).toBe(true);
    expect(layerOf(left, 'barrier-bar').destination).toMatchObject({ x: 0, width: 1.2536 });
    expect(layerOf(down, 'barrier-bar').rotation).toBeCloseTo(Math.PI / 2);
    expect(layerOf(down, 'barrier-bar').mirrored).toBe(false);

    const retracted = layerOf(open, 'barrier-bar');
    expect(retracted.destination.x).toBe(0);
    expect(retracted.destination.width).toBeCloseTo(0.2867);
    // The tip of the bar stays visible: the source keeps its right end, 160 px wide.
    expect(retracted.source?.x).toBeGreaterThan(0);
    expect((retracted.source?.x ?? 0) + (retracted.source?.width ?? 0)).toBeCloseTo(160);
  });

  it('tasse le ressort du tremplin et descend son plateau d’autant', () => {
    const document = createDeviceDocument('springboard');
    const resting = projectLevel(document);
    const squashed = projectLevel(
      document,
      simulationView([], [], [['device-1', { kind: 'springboard', compression: 0.5 }]]),
    );
    const sink = 0.5 * 0.12;

    expect(
      resting.objects
        .map((object) => object.assetKey)
        .filter((key) => key.startsWith('springboard')),
    ).toEqual(['springboard-spring', 'springboard-base', 'springboard-platform']);
    expect(layerOf(squashed, 'springboard-platform').destination.y).toBeCloseTo(
      layerOf(resting, 'springboard-platform').destination.y + sink,
    );
    const spring = layerOf(squashed, 'springboard-spring').destination;
    const restingSpring = layerOf(resting, 'springboard-spring').destination;
    expect(spring.height).toBeCloseTo(restingSpring.height - sink);
    expect(spring.y + spring.height).toBeCloseTo(restingSpring.y + restingSpring.height);
  });

  it('route les fils avec leur lettre de circuit, hors du document', () => {
    const projection = projectLevel(createWiredDocument('center', 'stopped'));

    expect(projection.wires).toEqual([
      expect.objectContaining({ id: 'wire-1', label: 'A', circuitIndex: 0 }),
    ]);
    expect(projection.wires[0]?.points[0]).toEqual({ x: 2.4, y: 4.05 });
    expect(projection.wires[0]?.points.at(-1)).toEqual({ x: 5.5, y: 5 });
  });

  it('contient les quatre familles et porte les assets visuels hors du document', () => {
    const projection = projectLevel(levelDocument);

    // Ordre de dessin, pas ordre du document : la balle est entre les deux
    // calques du panier.
    expect(projection.objects.map((object: ProjectedObject) => object.assetKey)).toEqual([
      'basket-back',
      'beam',
      'seesaw-fulcrum',
      'seesaw-beam',
      'ball-base',
      'ball-spin',
      'ball-highlight',
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

  it('laisse le pied de la bascule en place quand le tablier pivote', () => {
    const boardPose = { position: { x: 18, y: 11 }, rotation: 0.4 };
    const projection = projectLevel(levelDocument, simulationView([['seesaw-1', boardPose]]));
    const layer = (asset: string) => {
      const found = projection.objects.find((object) => object.assetKey === asset);
      if (found === undefined) throw new Error(`Calque « ${asset} » absent.`);
      return found.layer;
    };

    expect(layer('seesaw-beam').rotation).toBe(0.4);
    expect(layer('seesaw-beam').destination).toEqual({ x: -1.5, y: -0.12, width: 3, height: 0.24 });
    expect(layer('seesaw-fulcrum').rotation).toBe(0);
    expect(layer('seesaw-fulcrum').destination.y).toBeCloseTo(0.12);
  });

  it('fait tourner le motif de la balle sans faire tourner son ombrage ni son reflet', () => {
    const ballPose = { position: { x: 13, y: 9 }, rotation: 2 };
    const projection = projectLevel(levelDocument, simulationView([['ball-1', ballPose]]));
    const ballLayers = projection.objects.filter((object) => object.family === 'ball');

    expect(ballLayers.map((object) => [object.assetKey, object.layer.rotation])).toEqual([
      ['ball-base', 0],
      ['ball-spin', 2],
      ['ball-highlight', 0],
    ]);
    expect(ballLayers.every((object) => object.layer.position.x === 13)).toBe(true);
    // Hit-test and selection keep reading the placement, not the moving body.
    expect(ballLayers.every((object) => object.position.x === 12)).toBe(true);
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
      [32, 24],
      [8, 12],
      [8, 12],
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
    ).toEqual([[0], [Math.PI / 4], [0], [0], [0], [0], [0], [0]]);

    const drawOperations = operations.filter(
      (operation): operation is Extract<Operation, { readonly kind: 'drawImage' }> =>
        operation.kind === 'drawImage',
    );
    expect(drawOperations).toHaveLength(projection.objects.length);
    expect(drawOperations.map((operation) => operation.values.slice(-4))).toEqual(
      projection.objects.map((object: ProjectedObject) => [
        object.layer.destination.x * viewport.pixelsPerWorldUnit,
        object.layer.destination.y * viewport.pixelsPerWorldUnit,
        object.layer.destination.width * viewport.pixelsPerWorldUnit,
        object.layer.destination.height * viewport.pixelsPerWorldUnit,
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

    expect(order).toEqual([
      'basket-back',
      'ball-base',
      'ball-spin',
      'ball-highlight',
      'basket-front',
    ]);
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
    expect(order).toEqual([
      'seesaw-fulcrum',
      'seesaw-beam',
      'beam',
      'basket-back',
      'ball-base',
      'ball-spin',
      'ball-highlight',
      'basket-front',
    ]);
  });

  it('dessine les fils sous les objets, avec leur lettre aux deux bouts', async () => {
    const { context, operations } = createContext();
    const spriteLoader = createPendingSpriteLoader();
    spriteLoader.setReady();
    const renderer = createBoardRenderer({
      canvas: { width: 0, height: 0 },
      context,
      viewport,
      spriteLoader: spriteLoader.loader,
    });

    await renderer.render(projectLevel(createWiredDocument('center', 'stopped')));

    const firstSprite = operations.findIndex((operation) => operation.kind === 'drawImage');
    const firstStroke = operations.findIndex((operation) => operation.kind === 'stroke');
    expect(firstStroke).toBeGreaterThanOrEqual(0);
    expect(firstStroke).toBeLessThan(firstSprite);
    expect(
      operations
        .filter(
          (operation): operation is Extract<Operation, { readonly kind: 'fillText' }> =>
            operation.kind === 'fillText',
        )
        .map((operation) => operation.values[0]),
    ).toEqual(['A', 'A']);
  });

  it('atténue les fils pendant la simulation', async () => {
    const { context, operations } = createContext();
    const spriteLoader = createPendingSpriteLoader();
    spriteLoader.setReady();
    const renderer = createBoardRenderer({
      canvas: { width: 0, height: 0 },
      context,
      viewport,
      spriteLoader: spriteLoader.loader,
    });

    await renderer.render(
      projectLevel(createWiredDocument('center', 'stopped'), simulationView([])),
    );

    const alphas = operations
      .filter(
        (operation): operation is Extract<Operation, { readonly kind: 'globalAlpha' }> =>
          operation.kind === 'globalAlpha',
      )
      .map((operation) => operation.values[0]);
    expect(alphas.some((alpha) => alpha !== undefined && alpha < 0.5)).toBe(true);
  });

  it('dessine les zones de construction sous les objets, en unités monde', async () => {
    const { context, operations } = createContext();
    const spriteLoader = createPendingSpriteLoader();
    spriteLoader.setReady();
    const renderer = createBoardRenderer({
      canvas: { width: 0, height: 0 },
      context,
      viewport,
      spriteLoader: spriteLoader.loader,
    });

    await renderer.render({
      ...projectLevel(levelDocument),
      buildZones: [{ min: { x: 11, y: 6 }, max: { x: 14, y: 9 } }],
    });

    const zoneFill = operations.findIndex(
      (operation) =>
        operation.kind === 'fillRect' && operation.values.join(',') === [4, 4, 12, 12].join(','),
    );
    const firstSprite = operations.findIndex((operation) => operation.kind === 'drawImage');
    expect(zoneFill).toBeGreaterThanOrEqual(0);
    expect(zoneFill).toBeLessThan(firstSprite);
  });

  it('atténue l’objet dont la position est refusée, et lui seul', async () => {
    const renderWith = async (invalidPlacementId?: string): Promise<readonly Operation[]> => {
      const { context, operations } = createContext();
      const spriteLoader = createPendingSpriteLoader();
      spriteLoader.setReady();
      const renderer = createBoardRenderer({
        canvas: { width: 0, height: 0 },
        context,
        viewport,
        spriteLoader: spriteLoader.loader,
      });
      const projection = projectLevel(levelDocument);
      await renderer.render(
        invalidPlacementId === undefined ? projection : { ...projection, invalidPlacementId },
      );
      return operations;
    };
    const translucentDraws = (operations: readonly Operation[]): number => {
      let alpha = 1;
      let count = 0;
      for (const operation of operations) {
        if (operation.kind === 'globalAlpha') alpha = operation.values[0] ?? 1;
        if (operation.kind === 'restore') alpha = 1;
        if (operation.kind === 'drawImage' && alpha < 1) count += 1;
      }
      return count;
    };

    expect(translucentDraws(await renderWith())).toBe(0);
    expect(translucentDraws(await renderWith('beam-1'))).toBe(1);
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

  it('dessine la sélection avec une épaisseur CSS fixe et une poignée de rotation tactile distincte', async () => {
    const renderSelected = async (
      selectedPlacementId: string,
      pixelsPerWorldUnit: number,
    ): Promise<readonly Operation[]> => {
      const { context, operations } = createContext();
      const spriteLoader = createPendingSpriteLoader();
      spriteLoader.setReady();
      const renderer = createBoardRenderer({
        canvas: { width: 0, height: 0 },
        context,
        viewport: { ...viewport, pixelsPerWorldUnit },
        spriteLoader: spriteLoader.loader,
      });

      // Selection is view state: it is deliberately carried by the
      // projection rather than persisted in LevelDocument.
      const projection = { ...projectLevel(levelDocument), selectedPlacementId };
      await renderer.render(projection);
      return operations;
    };

    const atTwoPixels = await renderSelected('beam-1', 2);
    const atFourPixels = await renderSelected('beam-1', 4);
    const rectangleOperations = (operations: readonly Operation[]) =>
      operations.filter(
        (
          operation,
        ): operation is Extract<Operation, { readonly kind: 'strokeRect' | 'fillRect' }> =>
          operation.kind === 'strokeRect' || operation.kind === 'fillRect',
      );

    const twoPixelRects = rectangleOperations(atTwoPixels);
    const fourPixelRects = rectangleOperations(atFourPixels);

    // The selected medium beam's 4 × 0.25 world-unit footprint is outlined;
    // the 44 × 44 CSS-pixel rectangle is its separate rotation handle.
    expect(
      twoPixelRects.some((operation) => {
        const [, , width, height] = operation.values;
        return width === 8 && height === 0.5;
      }),
    ).toBe(true);
    expect(
      fourPixelRects.some((operation) => {
        const [, , width, height] = operation.values;
        return width === 44 && height === 44;
      }),
    ).toBe(true);
    expect(
      fourPixelRects.some((operation) => {
        const [, , width, height] = operation.values;
        return width === 16 && height === 1;
      }),
    ).toBe(true);

    const twoPixelLineWidths = atTwoPixels
      .filter(
        (operation): operation is Extract<Operation, { readonly kind: 'lineWidth' }> =>
          operation.kind === 'lineWidth',
      )
      .map((operation) => operation.values[0]);
    const fourPixelLineWidths = atFourPixels
      .filter(
        (operation): operation is Extract<Operation, { readonly kind: 'lineWidth' }> =>
          operation.kind === 'lineWidth',
      )
      .map((operation) => operation.values[0]);
    expect(twoPixelLineWidths.length).toBeGreaterThan(0);
    expect(twoPixelLineWidths).toEqual(fourPixelLineWidths);
  });

  it('ne dessine pas de poignée de rotation pour un objet non rotatable sélectionné', async () => {
    const { context, operations } = createContext();
    const spriteLoader = createPendingSpriteLoader();
    spriteLoader.setReady();
    const renderer = createBoardRenderer({
      canvas: { width: 0, height: 0 },
      context,
      viewport,
      spriteLoader: spriteLoader.loader,
    });

    const projection = { ...projectLevel(levelDocument), selectedPlacementId: 'ball-1' };
    await renderer.render(projection);

    const handle = operations.find(
      (operation) =>
        (operation.kind === 'strokeRect' || operation.kind === 'fillRect') &&
        operation.values[2] === 44 &&
        operation.values[3] === 44,
    );
    expect(handle).toBeUndefined();
  });

  it('dessine la poignée quand la projection effective rend la rotation disponible', async () => {
    const { context, operations } = createContext();
    const spriteLoader = createPendingSpriteLoader();
    spriteLoader.setReady();
    const renderer = createBoardRenderer({
      canvas: { width: 0, height: 0 },
      context,
      viewport,
      spriteLoader: spriteLoader.loader,
    });

    const sourceProjection = projectLevel(embeddedWorkshopDocument);
    const projection = {
      ...sourceProjection,
      objects: sourceProjection.objects.map((object) =>
        object.family === 'beam' ? { ...object, rotatable: true } : object,
      ),
      selectedPlacementId: 'workshop-floor',
    };
    await renderer.render(projection);

    expect(
      operations.find(
        (operation) =>
          (operation.kind === 'strokeRect' || operation.kind === 'fillRect') &&
          operation.values[2] === 44 &&
          operation.values[3] === 44,
      ),
    ).toBeDefined();
  });
});
