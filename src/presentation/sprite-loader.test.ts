import { describe, expect, it, vi } from 'vitest';

import { levelDocumentSchema } from '../domain/level-document';
import {
  createImageBitmapSpriteDecoder,
  createSpriteLoader,
  spriteAssetPath,
  spriteAssetsForFamily,
} from './sprite-loader';

const spriteFamilies = ['ball', 'basket', 'beam', 'seesaw'] as const;

const spriteScales = [2, 3] as const;

type SpriteAssetBlob = Readonly<{
  readonly name: string;
}>;

type SpriteAssetResponse = Readonly<{
  readonly ok: boolean;
  readonly blob: () => Promise<SpriteAssetBlob>;
}>;

type DecodedBitmapFixture = Readonly<{
  readonly width: number;
  readonly height: number;
  readonly source: SpriteAssetBlob;
}>;

type DecodedSpriteFixture = Readonly<{
  readonly width: number;
  readonly height: number;
}>;

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason: unknown) => void;
}

const createDeferred = <T>(): Deferred<T> => {
  let resolvePromise: ((value: T) => void) | undefined;
  let rejectPromise: ((reason: unknown) => void) | undefined;

  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  if (resolvePromise === undefined || rejectPromise === undefined) {
    throw new Error('Le deferred doit exposer ses fonctions de résolution.');
  }

  return {
    promise,
    resolve: resolvePromise,
    reject: rejectPromise,
  };
};

const collectObjectKeys = (value: unknown): readonly string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(collectObjectKeys);
  }

  if (typeof value !== 'object' || value === null) {
    return [];
  }

  return Object.entries(value).flatMap(([key, child]) => [key, ...collectObjectKeys(child)]);
};

const levelDocumentFixture = levelDocumentSchema.parse({
  schemaVersion: 2,
  id: 'sprite-loader-fixture',
  metadata: {
    title: 'Sprite loader fixture',
  },
  objects: [
    {
      id: 'ball-1',
      type: 'ball',
      props: {},
      transform: {
        position: { x: 1, y: 2 },
        rotation: 0,
      },
      permissions: { move: true, rotate: false, remove: true },
    },
    {
      id: 'basket-1',
      type: 'basket',
      props: {},
      transform: {
        position: { x: 5, y: 2 },
        rotation: 0,
      },
      permissions: { move: true, rotate: false, remove: true },
    },
    {
      id: 'beam-1',
      type: 'beam',
      props: { size: 'medium' },
      transform: {
        position: { x: 3, y: 2 },
        rotation: 0,
      },
      permissions: { move: true, rotate: true, remove: true },
    },
    {
      id: 'seesaw-1',
      type: 'seesaw',
      props: {},
      transform: {
        position: { x: 7, y: 2 },
        rotation: 0,
      },
      permissions: { move: true, rotate: false, remove: true },
    },
  ],
  inventory: [],
  goal: {
    type: 'basket',
    ballId: 'ball-1',
    basketId: 'basket-1',
  },
  buildZones: [
    {
      min: { x: 0, y: 0 },
      max: { x: 10, y: 10 },
    },
  ],
  scene: {
    min: { x: -2, y: -2 },
    max: { x: 12, y: 12 },
  },
});

describe('sprite loader contract', () => {
  it('keeps assets outside the LevelDocument', () => {
    const keys = collectObjectKeys(levelDocumentFixture);

    expect(keys.some((key) => /asset|url/i.test(key))).toBe(false);
  });

  it.each(spriteScales)('loads every family from the local %sx convention', async (scale) => {
    const pendingByPath = new Map<string, Deferred<DecodedSpriteFixture>>();
    const decodedByPath = new Map<string, DecodedSpriteFixture>();
    const spriteAssets = spriteFamilies.flatMap(spriteAssetsForFamily);

    const decoder = vi.fn((path: string): Promise<DecodedSpriteFixture> => {
      const pending = pendingByPath.get(path);
      if (pending === undefined) {
        throw new Error(`Chemin inattendu: ${path}`);
      }
      return pending.promise;
    });

    for (const asset of spriteAssets) {
      const path = spriteAssetPath(asset, scale);
      pendingByPath.set(path, createDeferred<DecodedSpriteFixture>());
      decodedByPath.set(path, {
        width: 64 * scale,
        height: 48 * scale,
      });
    }

    const loader = createSpriteLoader({ scale, decode: decoder });
    expect(loader.getState('ball')).toBe('idle');
    const load = loader.loadForFamilies(spriteFamilies);

    for (const family of spriteFamilies) {
      expect(loader.getState(family)).toBe('loading');
      if (family !== 'basket') expect(loader.getSprite(family)).toBeUndefined();
    }
    for (const asset of spriteAssets) {
      expect(decoder).toHaveBeenCalledWith(spriteAssetPath(asset, scale));
    }

    expect(decoder.mock.calls).toHaveLength(spriteAssets.length);

    for (const asset of spriteAssets) {
      const path = spriteAssetPath(asset, scale);
      const pending = pendingByPath.get(path);
      const decoded = decodedByPath.get(path);
      if (pending === undefined || decoded === undefined) {
        throw new Error(`Fixture incomplet pour ${path}`);
      }
      pending.resolve(decoded);
    }

    await load;

    for (const asset of spriteAssets) {
      const path = spriteAssetPath(asset, scale);
      expect(loader.getSprite(asset)).toBe(decodedByPath.get(path));
    }
    for (const family of spriteFamilies) {
      expect(loader.getState(family)).toBe('ready');
    }
  });

  it('deduplicates concurrent requests and stays non-ready until decoding resolves', async () => {
    const pendingByPath = new Map<string, Deferred<DecodedSpriteFixture>>();
    const decodedByPath = new Map<string, DecodedSpriteFixture>();
    const decoder = vi.fn((path: string): Promise<DecodedSpriteFixture> => {
      const pending = pendingByPath.get(path);
      if (pending === undefined) {
        throw new Error(`Chemin inattendu: ${path}`);
      }
      return pending.promise;
    });

    for (const family of spriteFamilies) {
      for (const asset of spriteAssetsForFamily(family)) {
        const path = spriteAssetPath(asset, 2);
        pendingByPath.set(path, createDeferred<DecodedSpriteFixture>());
        decodedByPath.set(path, { width: 128, height: 96 });
      }
    }

    const loader = createSpriteLoader({ scale: 2, decode: decoder });
    const firstLoad = loader.loadForFamilies(spriteFamilies);
    const secondLoad = loader.loadForFamilies(['ball', 'ball', 'basket']);

    expect(decoder).toHaveBeenCalledTimes(spriteFamilies.flatMap(spriteAssetsForFamily).length);
    expect(loader.getState('ball')).toBe('loading');
    expect(loader.getSprite('ball')).toBeUndefined();

    for (const asset of spriteFamilies.flatMap(spriteAssetsForFamily)) {
      const path = spriteAssetPath(asset, 2);
      const pending = pendingByPath.get(path);
      const decoded = decodedByPath.get(path);
      if (pending === undefined || decoded === undefined) {
        throw new Error(`Fixture incomplet pour ${path}`);
      }
      pending.resolve(decoded);
    }

    await Promise.all([firstLoad, secondLoad]);

    expect(loader.getState('ball')).toBe('ready');
    expect(loader.getSprite('ball')).toBe(decodedByPath.get(spriteAssetPath('ball', 2)));
    expect(loader.getSprite('basket-back')).toBe(
      decodedByPath.get(spriteAssetPath('basket-back', 2)),
    );
    expect(loader.getSprite('basket-front')).toBe(
      decodedByPath.get(spriteAssetPath('basket-front', 2)),
    );
  });

  it('exposes failed after a decoder rejection', async () => {
    const failedPath = spriteAssetPath('beam', 3);
    const decoder = vi.fn((path: string): Promise<DecodedSpriteFixture> => {
      if (path === failedPath) {
        return Promise.reject(new Error('Décodage impossible'));
      }
      return Promise.resolve({ width: 192, height: 144 });
    });
    const loader = createSpriteLoader({ scale: 3, decode: decoder });

    await expect(loader.loadForFamilies(spriteFamilies)).rejects.toThrow('Décodage impossible');

    expect(loader.getState('beam')).toBe('failed');
    expect(loader.getSprite('beam')).toBeUndefined();
  });

  it('adapts injectable asset fetching and bitmap creation in Node', async () => {
    const path = spriteAssetPath('ball', 2);
    const blob: SpriteAssetBlob = { name: 'ball@2x.png' };
    const bitmap: DecodedBitmapFixture = {
      width: 128,
      height: 96,
      source: blob,
    };
    const blobFactory = vi.fn((): Promise<SpriteAssetBlob> => Promise.resolve(blob));
    const fetchAsset = vi.fn((requestedPath: string): Promise<SpriteAssetResponse> => {
      expect(requestedPath).toBe(path);
      return Promise.resolve({ ok: true, blob: blobFactory });
    });
    const createImageBitmap = vi.fn(
      (receivedBlob: SpriteAssetBlob): Promise<DecodedBitmapFixture> => {
        expect(receivedBlob).toBe(blob);
        return Promise.resolve(bitmap);
      },
    );
    const decode = createImageBitmapSpriteDecoder({ fetchAsset, createImageBitmap });

    const decoded = await decode(path);

    expect(fetchAsset).toHaveBeenCalledWith(path);
    expect(blobFactory).toHaveBeenCalledTimes(1);
    expect(createImageBitmap).toHaveBeenCalledWith(blob);
    expect(decoded).toBe(bitmap);
    expect(decoded.width).toBe(bitmap.width);
    expect(decoded.height).toBe(bitmap.height);
    expect(decoded.source).toBe(blob);
  });
});
