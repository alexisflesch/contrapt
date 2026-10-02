import { encodeLevelFile } from '../infrastructure/level-file/level-file-codec';
import { levelFingerprint } from '../infrastructure/level-file/level-fingerprint';
import type { LevelDocument } from '../domain/level-document';
import { renderLevelPreview } from '../presentation/level-preview';
import { createSpriteLoader, type SpriteLoader } from '../presentation/sprite-loader';
import { createCanvasContextAdapter, createCanvasSpriteDecoder } from '../ui/board-canvas';
import {
  createLevelPreviewCache,
  type LevelPreviewCache,
  type LevelPreviewRequest,
} from './level-preview-cache';

/** Previews no card displays any more: enough for the campaign and a screenful of levels. */
const PREVIEW_CACHE_CAPACITY = 48;

/** One sprite loader for every preview: the pictures are decoded once, then shared. */
let sharedSpriteLoader: SpriteLoader | undefined;

const previewSpriteLoader = (): SpriteLoader => {
  if (sharedSpriteLoader !== undefined) return sharedSpriteLoader;
  const decode = createCanvasSpriteDecoder();
  if (decode === null) throw new Error('Ce navigateur ne peut pas décoder les sprites.');
  sharedSpriteLoader = createSpriteLoader({ scale: 2, decode });
  return sharedSpriteLoader;
};

/**
 * `crypto.subtle` is missing outside a secure context (HTTP on a local IP): the
 * level's file text then serves as its key, longer but just as exact.
 */
const documentKey = async (document: LevelDocument): Promise<string> => {
  try {
    return await levelFingerprint(document);
  } catch {
    return encodeLevelFile(document);
  }
};

const drawPreviewBlob = async (request: LevelPreviewRequest): Promise<Blob> => {
  const canvas = globalThis.document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('Le canevas 2D est indisponible.');

  await renderLevelPreview({
    ...request,
    canvas,
    context: createCanvasContextAdapter(context),
    spriteLoader: previewSpriteLoader(),
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error('Impossible de produire l’image de l’aperçu.'));
      } else {
        resolve(blob);
      }
    }, 'image/png');
  });
};

/** The application's preview images, drawn by the board's renderer and kept by fingerprint. */
export const levelPreviewImages: LevelPreviewCache = createLevelPreviewCache({
  capacity: PREVIEW_CACHE_CAPACITY,
  fingerprint: documentKey,
  render: drawPreviewBlob,
  createObjectUrl: (blob) => URL.createObjectURL(blob),
  revokeObjectUrl: (url) => {
    URL.revokeObjectURL(url);
  },
});
