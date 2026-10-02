import { describe, expect, it } from 'vitest';

import { embeddedLevels } from '../content/embedded-levels';
import type { LevelDocument } from '../domain/level-document';
import { levelFingerprint } from '../infrastructure/level-file/level-fingerprint';
import { createLevelPreviewCache, type LevelPreviewRequest } from './level-preview-cache';

const tutorial = (index: number): LevelDocument => {
  const level = embeddedLevels[index];
  if (level === undefined) throw new Error(`Tutoriel ${String(index + 1)} introuvable.`);
  return level;
};

const request = (
  document: LevelDocument,
  overrides: Partial<Omit<LevelPreviewRequest, 'document'>> = {},
): LevelPreviewRequest => ({
  document,
  cssWidth: 320,
  cssHeight: 180,
  devicePixelRatio: 2,
  ...overrides,
});

/** A copy with the same content but no shared object with the original. */
const copyOf = (document: LevelDocument): LevelDocument => structuredClone(document);

const moved = (document: LevelDocument): LevelDocument => {
  const [first, ...others] = document.objects;
  if (first === undefined) throw new Error('Le niveau devrait avoir un objet.');
  return {
    ...document,
    objects: [
      {
        ...first,
        transform: {
          ...first.transform,
          position: { x: first.transform.position.x + 0.5, y: first.transform.position.y },
        },
      },
      ...others,
    ],
  };
};

const setup = (capacity = 2) => {
  const rendered: LevelDocument[] = [];
  const created: string[] = [];
  const revoked: string[] = [];
  const cache = createLevelPreviewCache({
    capacity,
    fingerprint: levelFingerprint,
    render: (preview) => {
      rendered.push(preview.document);
      return Promise.resolve(new Blob([String(rendered.length)]));
    },
    createObjectUrl: () => {
      const url = `blob:preview-${String(created.length)}`;
      created.push(url);
      return url;
    },
    revokeObjectUrl: (url) => {
      revoked.push(url);
    },
  });
  return { cache, rendered, created, revoked };
};

describe('createLevelPreviewCache — cache par empreinte (V5)', () => {
  it('donne la même entrée à deux documents égaux, sans les dessiner deux fois', async () => {
    const { cache, rendered, created } = setup();

    const first = await cache.acquire(request(tutorial(0)));
    const second = await cache.acquire(request(copyOf(tutorial(0))));

    expect(second.url).toBe(first.url);
    expect(rendered).toHaveLength(1);
    expect(created).toHaveLength(1);
  });

  it('crée une entrée nouvelle quand le document est modifié', async () => {
    const { cache, rendered } = setup();

    const original = await cache.acquire(request(tutorial(0)));
    const edited = await cache.acquire(request(moved(tutorial(0))));

    expect(edited.url).not.toBe(original.url);
    expect(rendered).toHaveLength(2);
  });

  it('distingue la taille et la densité demandées', async () => {
    const { cache, rendered } = setup(8);

    const base = await cache.acquire(request(tutorial(0)));
    const larger = await cache.acquire(request(tutorial(0), { cssWidth: 480, cssHeight: 270 }));
    const sharper = await cache.acquire(request(tutorial(0), { devicePixelRatio: 3 }));

    expect(new Set([base.url, larger.url, sharper.url]).size).toBe(3);
    expect(rendered).toHaveLength(3);
  });

  it('partage un dessin en cours entre deux demandes simultanées', async () => {
    const { cache, rendered } = setup();

    const [first, second] = await Promise.all([
      cache.acquire(request(tutorial(1))),
      cache.acquire(request(copyOf(tutorial(1)))),
    ]);

    expect(second.url).toBe(first.url);
    expect(rendered).toHaveLength(1);
  });

  it('évince la plus ancienne entrée libérée et révoque son URL', async () => {
    const { cache, revoked } = setup(2);

    const first = await cache.acquire(request(tutorial(0)));
    first.release();
    const second = await cache.acquire(request(tutorial(1)));
    second.release();
    const third = await cache.acquire(request(tutorial(2)));
    third.release();

    expect(revoked).toEqual([first.url]);
  });

  it('garde les entrées récemment réutilisées : l’éviction suit l’ancienneté d’usage', async () => {
    const { cache, revoked } = setup(2);

    const first = await cache.acquire(request(tutorial(0)));
    first.release();
    const second = await cache.acquire(request(tutorial(1)));
    second.release();
    (await cache.acquire(request(tutorial(0)))).release();
    (await cache.acquire(request(tutorial(2)))).release();

    expect(revoked).toEqual([second.url]);
  });

  it('ne révoque pas une URL encore affichée, puis la révoque une fois libérée', async () => {
    const { cache, revoked } = setup(1);

    const shown = await cache.acquire(request(tutorial(0)));
    const other = await cache.acquire(request(tutorial(1)));

    // Two images in use over a capacity of one: neither may be revoked.
    expect(revoked).toEqual([]);

    shown.release();

    expect(revoked).toEqual([shown.url]);

    other.release();

    expect(revoked).toEqual([shown.url]);
  });

  it('recrée un dessin après éviction, sans réutiliser l’URL révoquée', async () => {
    const { cache, rendered } = setup(1);

    const first = await cache.acquire(request(tutorial(0)));
    first.release();
    (await cache.acquire(request(tutorial(1)))).release();
    const again = await cache.acquire(request(tutorial(0)));

    expect(again.url).not.toBe(first.url);
    expect(rendered).toHaveLength(3);
  });

  it('ne libère une prise qu’une fois', async () => {
    const { cache, revoked } = setup(1);

    const first = await cache.acquire(request(tutorial(0)));
    const sameEntry = await cache.acquire(request(copyOf(tutorial(0))));
    first.release();
    first.release();
    const other = await cache.acquire(request(tutorial(1)));

    // `sameEntry` still holds the first image.
    expect(revoked).toEqual([]);

    sameEntry.release();

    expect(revoked).toEqual([first.url]);
    other.release();
  });

  it('n’enregistre pas un échec de dessin : la demande suivante réessaie', async () => {
    let attempts = 0;
    const cache = createLevelPreviewCache({
      capacity: 2,
      fingerprint: levelFingerprint,
      render: () => {
        attempts += 1;
        return attempts === 1
          ? Promise.reject(new Error('échec'))
          : Promise.resolve(new Blob(['ok']));
      },
      createObjectUrl: () => 'blob:retry',
      revokeObjectUrl: () => undefined,
    });

    await expect(cache.acquire(request(tutorial(0)))).rejects.toThrow('échec');
    const lease = await cache.acquire(request(tutorial(0)));

    expect(lease.url).toBe('blob:retry');
    expect(attempts).toBe(2);
  });
});

describe('empreinte d’un document pour le cache (V5)', () => {
  it('est identique pour deux documents égaux et change dès qu’un objet bouge', async () => {
    expect(await levelFingerprint(copyOf(tutorial(0)))).toBe(await levelFingerprint(tutorial(0)));
    expect(await levelFingerprint(moved(tutorial(0)))).not.toBe(
      await levelFingerprint(tutorial(0)),
    );
  });
});
