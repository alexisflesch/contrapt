import { useEffect, useRef, useState } from 'react';

import type { LevelDocument } from '../domain/level-document';
import { levelPreviewImages } from './level-preview-images';
import type { LevelPreviewCache, LevelPreviewLease } from './level-preview-cache';

/** Cards start drawing a little before they scroll into view. */
const PREVIEW_ROOT_MARGIN = '200px';

type LevelPreviewProps = Readonly<{
  readonly document: LevelDocument;
  /** The picture's text alternative; empty, as by default, when the card already says it. */
  readonly alt?: string;
  /** The image source, replaceable in tests. */
  readonly cache?: LevelPreviewCache;
}>;

/**
 * A level as it starts (V5): the board's own rendering of the document, in a
 * 16:9 frame. It draws only once the frame is near the screen, over a plain
 * parchment that stands in until the image is ready (or if it never is), so a
 * long list is never held up. A locked card greys it with its own style.
 */
export function LevelPreview({
  document,
  alt = '',
  cache = levelPreviewImages,
}: LevelPreviewProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  // Without IntersectionObserver there is no way to wait: draw at once.
  const [isNear, setIsNear] = useState(() => typeof IntersectionObserver === 'undefined');
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (isNear || frame === null) return undefined;

    const observer = new IntersectionObserver(
      (observed) => {
        if (observed.some(({ isIntersecting }) => isIntersecting)) setIsNear(true);
      },
      { rootMargin: PREVIEW_ROOT_MARGIN },
    );
    observer.observe(frame);
    return () => {
      observer.disconnect();
    };
  }, [isNear]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!isNear || frame === null) return undefined;

    const { width, height } = frame.getBoundingClientRect();
    if (width <= 0 || height <= 0) return undefined;

    let isCancelled = false;
    let lease: LevelPreviewLease | undefined;
    cache
      .acquire({
        document,
        cssWidth: width,
        cssHeight: height,
        devicePixelRatio: window.devicePixelRatio > 0 ? window.devicePixelRatio : 1,
      })
      .then(
        (acquired) => {
          if (isCancelled) {
            acquired.release();
            return;
          }
          lease = acquired;
          setUrl(acquired.url);
        },
        () => undefined,
      );

    return () => {
      isCancelled = true;
      lease?.release();
    };
  }, [isNear, document, cache]);

  return (
    <div className="level-preview" ref={frameRef}>
      {url !== null && (
        <img className="level-preview-image" src={url} alt={alt} draggable={false} />
      )}
    </div>
  );
}
