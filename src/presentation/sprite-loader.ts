export type SpriteFamily = 'ball' | 'basket' | 'beam' | 'seesaw';
export type SpriteAsset = Exclude<SpriteFamily, 'basket'> | 'basket-back' | 'basket-front';
type SpriteScale = 2 | 3;
type SpriteLoadState = 'idle' | 'loading' | 'ready' | 'failed';

export const spriteAssetsForFamily = (family: SpriteFamily): readonly SpriteAsset[] =>
  family === 'basket' ? ['basket-back', 'basket-front'] : [family];

export type DecodedSprite = Readonly<{
  readonly width: number;
  readonly height: number;
  readonly source?: unknown;
}>;

export type SpriteDecoder = (path: string) => Promise<DecodedSprite>;

type MaybePromise<T> = T | PromiseLike<T>;

type SpriteAssetResponse<TBlob> = Readonly<{
  readonly ok: boolean;
  readonly blob: () => Promise<TBlob>;
}>;

type SpriteBitmap<TSource> = Readonly<{
  readonly width: number;
  readonly height: number;
  readonly source: TSource;
}>;

type ImageBitmapSpriteDecoderOptions<TBlob, TSource> = Readonly<{
  readonly fetchAsset: (path: string) => MaybePromise<SpriteAssetResponse<TBlob>>;
  readonly createImageBitmap: (blob: TBlob) => MaybePromise<SpriteBitmap<TSource>>;
}>;

type SpriteLoaderOptions = Readonly<{
  readonly scale: SpriteScale;
  readonly decode: SpriteDecoder;
}>;

export type SpriteLoader = Readonly<{
  readonly getState: (family: SpriteFamily) => SpriteLoadState;
  readonly getSprite: (asset: SpriteAsset) => DecodedSprite | undefined;
  readonly loadForFamilies: (families: readonly SpriteFamily[]) => Promise<void>;
}>;

type SpriteRecord = {
  state: SpriteLoadState;
  sprite: DecodedSprite | undefined;
  error: Error | undefined;
  promise: Promise<void> | undefined;
};

const createSpriteRecord = (): SpriteRecord => ({
  state: 'idle',
  sprite: undefined,
  error: undefined,
  promise: undefined,
});

const createRecords = (): Record<SpriteAsset, SpriteRecord> => ({
  ball: createSpriteRecord(),
  'basket-back': createSpriteRecord(),
  'basket-front': createSpriteRecord(),
  beam: createSpriteRecord(),
  seesaw: createSpriteRecord(),
});

export const spriteAssetPath = (asset: SpriteAsset, scale: SpriteScale): string =>
  `/assets/sprites/${asset}@${String(scale)}x.png`;

const toError = (reason: unknown): Error =>
  reason instanceof Error ? reason : new Error(String(reason));

const rejectedPromise = (reason: Error): Promise<void> => Promise.reject(reason);

export const createImageBitmapSpriteDecoder =
  <TBlob, TSource>({
    fetchAsset,
    createImageBitmap,
  }: ImageBitmapSpriteDecoderOptions<TBlob, TSource>): SpriteDecoder =>
  async (path: string): Promise<DecodedSprite> => {
    try {
      const response = await fetchAsset(path);
      if (!response.ok) {
        throw new Error(`Impossible de charger l'asset local: ${path}`);
      }

      const blob = await response.blob();
      return await createImageBitmap(blob);
    } catch (error: unknown) {
      throw toError(error);
    }
  };

export const createSpriteLoader = ({ scale, decode }: SpriteLoaderOptions): SpriteLoader => {
  const records = createRecords();

  const loadAsset = (asset: SpriteAsset): Promise<void> => {
    const record = records[asset];

    if (record.state === 'ready') {
      return Promise.resolve();
    }

    if (record.state === 'failed') {
      return rejectedPromise(record.error ?? new Error('Le sprite est en échec de chargement.'));
    }

    if (record.state === 'loading' && record.promise !== undefined) {
      return record.promise;
    }

    record.state = 'loading';

    let decoded: Promise<DecodedSprite>;
    try {
      decoded = decode(spriteAssetPath(asset, scale));
    } catch (error: unknown) {
      const failure = toError(error);
      record.sprite = undefined;
      record.error = failure;
      record.state = 'failed';
      return rejectedPromise(failure);
    }

    record.promise = decoded
      .then((sprite) => {
        record.sprite = sprite;
        record.state = 'ready';
      })
      .catch((error: unknown) => {
        const failure = toError(error);
        record.sprite = undefined;
        record.error = failure;
        record.state = 'failed';
        throw failure;
      });

    return record.promise;
  };

  const getState = (family: SpriteFamily): SpriteLoadState => {
    const states = spriteAssetsForFamily(family).map((asset) => records[asset].state);
    if (states.some((state) => state === 'failed')) return 'failed';
    if (states.every((state) => state === 'ready')) return 'ready';
    if (states.some((state) => state === 'loading')) return 'loading';
    return 'idle';
  };

  const getSprite = (asset: SpriteAsset): DecodedSprite | undefined => {
    const record = records[asset];
    return record.state === 'ready' ? record.sprite : undefined;
  };

  const loadForFamilies = async (families: readonly SpriteFamily[]): Promise<void> => {
    const uniqueAssets = [...new Set(families.flatMap((family) => spriteAssetsForFamily(family)))];
    await Promise.all(uniqueAssets.map(loadAsset));
  };

  return {
    getState,
    getSprite,
    loadForFamilies,
  };
};
