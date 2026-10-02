import { describe, expect, it } from 'vitest';

import { createNavigateFallbackAllowlist } from './navigate-fallback-allowlist';

const servedOffline = [
  '/',
  '/levels',
  '/levels/',
  '/levels/tuto-1/play',
  '/editor',
  '/settings',
  '/shared',
  '/my-levels',
  '/my-levels/',
  '/my-levels/recu-0123456789abcdef/play',
  '/import',
  '/import/',
  '/bench',
  '/bench/play',
] as const;

const notServedOffline = [
  '/demo',
  '/demo/',
  '/inconnue',
  '/my-levels-autre',
  '/editor/x',
  '/import-autre',
  '/import/x',
] as const;

describe('repli hors ligne de la PWA (V2c, V3)', () => {
  it.each(servedOffline)('sert %s hors ligne', (path) => {
    expect(createNavigateFallbackAllowlist('/').test(path)).toBe(true);
  });

  it.each(notServedOffline)('ne sert pas %s hors ligne', (path) => {
    expect(createNavigateFallbackAllowlist('/').test(path)).toBe(false);
  });

  it('respecte le sous-répertoire de déploiement', () => {
    const allowlist = createNavigateFallbackAllowlist('/tinkerbolt/');

    for (const path of servedOffline) {
      const prefixed = path === '/' ? '/tinkerbolt/' : `/tinkerbolt${path}`;
      expect(allowlist.test(prefixed)).toBe(true);
      expect(allowlist.test(path === '/' ? '/autre/' : `/autre${path}`)).toBe(false);
    }
    expect(allowlist.test('/tinkerbolt')).toBe(true);
    expect(allowlist.test('/my-levels')).toBe(false);
    expect(allowlist.test('/tinkerbolt/demo')).toBe(false);
  });

  it('échappe les caractères spéciaux du sous-répertoire', () => {
    const allowlist = createNavigateFallbackAllowlist('/v1.2+beta/');

    expect(allowlist.test('/v1.2+beta/my-levels')).toBe(true);
    expect(allowlist.test('/v1x2+beta/my-levels')).toBe(false);
  });
});
