// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { embeddedLevels } from '../content/embedded-levels';
import type { LevelDocument } from '../domain/level-document';
import { LevelPreview } from './LevelPreview';
import type { LevelPreviewCache, LevelPreviewRequest } from './level-preview-cache';

const tutorial = (index: number): LevelDocument => {
  const level = embeddedLevels[index];
  if (level === undefined) throw new Error(`Tutoriel ${String(index + 1)} introuvable.`);
  return level;
};

type ObserverCallback = (
  entries: readonly Pick<IntersectionObserverEntry, 'isIntersecting'>[],
) => void;

/** An IntersectionObserver the test drives by hand. */
const observers: { readonly callback: ObserverCallback; disconnected: boolean }[] = [];

class FakeIntersectionObserver {
  private readonly record: { readonly callback: ObserverCallback; disconnected: boolean };

  constructor(callback: ObserverCallback) {
    this.record = { callback, disconnected: false };
    observers.push(this.record);
  }

  observe(): void {}

  disconnect(): void {
    this.record.disconnected = true;
  }
}

const scrollIntoView = (): void => {
  act(() => {
    for (const observer of observers) observer.callback([{ isIntersecting: true }]);
  });
};

const createCache = () => {
  const requests: LevelPreviewRequest[] = [];
  const released: string[] = [];
  const cache: LevelPreviewCache = {
    acquire: (request) => {
      requests.push(request);
      const url = `blob:preview-${String(requests.length)}`;
      return Promise.resolve({
        url,
        release: () => {
          released.push(url);
        },
      });
    },
  };
  return { cache, requests, released };
};

describe('LevelPreview — aperçu paresseux (V5)', () => {
  beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    vi.stubGlobal('devicePixelRatio', 2);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 320,
      height: 180,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 320,
      bottom: 180,
      toJSON: () => ({}),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('ne dessine rien tant que la carte est loin de l’écran, et montre le parchemin', () => {
    const { cache, requests } = createCache();

    const { container } = render(<LevelPreview document={tutorial(0)} cache={cache} />);

    expect(container.querySelector('.level-preview')).toBeInTheDocument();
    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(requests).toEqual([]);
  });

  it('demande l’image à la taille affichée et à la densité de l’écran dès qu’elle approche', async () => {
    const { cache, requests } = createCache();
    const { container } = render(<LevelPreview document={tutorial(0)} cache={cache} />);

    scrollIntoView();

    expect(await screen.findByRole('presentation', { hidden: true })).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('src', 'blob:preview-1');
    expect(requests).toEqual([
      { document: tutorial(0), cssWidth: 320, cssHeight: 180, devicePixelRatio: 2 },
    ]);
  });

  it('cesse d’observer une fois la carte visible', () => {
    const { cache } = createCache();
    render(<LevelPreview document={tutorial(0)} cache={cache} />);

    scrollIntoView();

    expect(observers.every(({ disconnected }) => disconnected)).toBe(true);
  });

  it('reste décorative par défaut et nomme l’image quand on lui donne un texte', async () => {
    const { cache } = createCache();
    const { rerender } = render(<LevelPreview document={tutorial(0)} cache={cache} />);
    scrollIntoView();
    await screen.findByRole('presentation', { hidden: true });

    rerender(<LevelPreview document={tutorial(0)} cache={cache} alt="Aperçu du petit pont" />);

    expect(await screen.findByRole('img', { name: 'Aperçu du petit pont' })).toBeInTheDocument();
  });

  it('redemande l’image quand le document change, et libère l’ancienne prise', async () => {
    const { cache, requests, released } = createCache();
    const { container, rerender } = render(<LevelPreview document={tutorial(0)} cache={cache} />);
    scrollIntoView();
    await screen.findByRole('presentation', { hidden: true });

    rerender(<LevelPreview document={tutorial(1)} cache={cache} />);

    await vi.waitFor(() => {
      expect(container.querySelector('img')).toHaveAttribute('src', 'blob:preview-2');
    });
    expect(requests.map(({ document }) => document.id)).toEqual([tutorial(0).id, tutorial(1).id]);
    expect(released).toEqual(['blob:preview-1']);
  });

  it('libère l’image au démontage', async () => {
    const { cache, released } = createCache();
    const { unmount } = render(<LevelPreview document={tutorial(0)} cache={cache} />);
    scrollIntoView();
    await screen.findByRole('presentation', { hidden: true });

    unmount();

    expect(released).toEqual(['blob:preview-1']);
  });

  it('laisse le parchemin si le dessin échoue', async () => {
    const cache: LevelPreviewCache = { acquire: () => Promise.reject(new Error('échec')) };
    const { container } = render(<LevelPreview document={tutorial(0)} cache={cache} />);

    scrollIntoView();
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.querySelector('.level-preview')).toBeInTheDocument();
  });

  it('dessine tout de suite quand le navigateur n’a pas d’IntersectionObserver', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { cache, requests } = createCache();

    render(<LevelPreview document={tutorial(0)} cache={cache} />);

    await vi.waitFor(() => {
      expect(requests).toHaveLength(1);
    });
  });
});
