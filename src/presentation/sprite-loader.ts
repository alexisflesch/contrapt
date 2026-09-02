export type SpriteFamily = 'ball' | 'basket' | 'beam' | 'seesaw';
type SpriteScale = 2 | 3;
type SpriteLoadState = 'idle' | 'loading' | 'ready' | 'failed';

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
  readonly getSprite: (family: SpriteFamily) => DecodedSprite | undefined;
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

const createRecords = (): Record<SpriteFamily, SpriteRecord> => ({
  ball: createSpriteRecord(),
  basket: createSpriteRecord(),
  beam: createSpriteRecord(),
  seesaw: createSpriteRecord(),
});

export const spriteAssetPath = (family: SpriteFamily, scale: SpriteScale): string =>
  `./assets/sprites/${family}@${String(scale)}x.png`;

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

  const loadFamily = (family: SpriteFamily): Promise<void> => {
    const record = records[family];

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
      decoded = decode(spriteAssetPath(family, scale));
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

  const getState = (family: SpriteFamily): SpriteLoadState => records[family].state;

  const getSprite = (family: SpriteFamily): DecodedSprite | undefined => {
    const record = records[family];
    return record.state === 'ready' ? record.sprite : undefined;
  };

  const loadForFamilies = async (families: readonly SpriteFamily[]): Promise<void> => {
    const uniqueFamilies = [...new Set(families)];
    await Promise.all(uniqueFamilies.map(loadFamily));
  };

  return {
    getState,
    getSprite,
    loadForFamilies,
  };
};
