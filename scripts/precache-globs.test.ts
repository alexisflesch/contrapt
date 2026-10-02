import { readdirSync } from 'node:fs';
import { join, matchesGlob, relative, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

import { precacheGlobIgnores, precacheGlobPatterns } from './precache-globs';

const publicDirectory = join(import.meta.dirname, '..', 'public');

/** `public/` is copied as is at the root of `dist/`, where Workbox globs. */
const publicFiles = (): readonly string[] =>
  readdirSync(publicDirectory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) =>
      relative(publicDirectory, join(entry.parentPath, entry.name)).split(sep).join('/'),
    );

const isPrecached = (file: string): boolean =>
  precacheGlobPatterns.some((pattern) => matchesGlob(file, pattern)) &&
  !precacheGlobIgnores.some((pattern) => matchesGlob(file, pattern));

describe('précache du service worker (ADR 0012, V7)', () => {
  it('n’emporte aucun fond de `public/assets/backgrounds/`, laissés en place mais inutilisés', () => {
    const backgrounds = publicFiles().filter((file) => file.startsWith('assets/backgrounds/'));
    expect(backgrounds.length).toBeGreaterThan(0);
    expect(backgrounds.filter(isPrecached)).toEqual([]);
  });

  it('emporte la police Nunito embarquée, pour un affichage hors ligne', () => {
    expect(isPrecached('fonts/Nunito.woff2')).toBe(true);
  });

  it('emporte toujours les sprites, leurs vignettes, les icônes et la coque', () => {
    const sprites = publicFiles().filter((file) => file.startsWith('assets/sprites/'));
    expect(sprites.length).toBeGreaterThan(0);
    expect(sprites.filter((file) => !isPrecached(file))).toEqual([]);
    for (const file of ['index.html', 'assets/index-abc123.js', 'assets/index-abc123.css']) {
      expect(isPrecached(file)).toBe(true);
    }
    expect(publicFiles().filter((file) => file.startsWith('icons/') && !isPrecached(file))).toEqual(
      [],
    );
  });
});
