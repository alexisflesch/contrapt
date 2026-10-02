/**
 * What the service worker precaches (ADR 0012), relative to `dist/`.
 *
 * `woff2` carries the embedded Nunito font (V7), shown offline like the rest.
 * The board backgrounds of `public/assets/backgrounds/` are no longer drawn
 * anywhere (V2b, V7): they stay in the repository, as the author's assets, but
 * out of the precache (≈ 7.6 MB that every install would download for nothing).
 */
export const precacheGlobPatterns: readonly string[] = [
  '**/*.{html,js,css,svg,png,ico,webp,webmanifest,woff2}',
];

export const precacheGlobIgnores: readonly string[] = ['assets/backgrounds/**'];
