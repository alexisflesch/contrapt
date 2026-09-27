import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the site under `/<repository>/`; the deploy workflow sets
// this variable. Locally, in tests and in Playwright, the app lives at `/`.
const basePath = process.env.CONTRAPT_BASE_PATH ?? '/';
const basePathPrefix = basePath === '/' ? '' : basePath.replace(/\/$/, '');
const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const routeBasePattern = escapeRegExp(basePathPrefix);
const navigateFallbackAllowlist = new RegExp(
  `^${routeBasePattern}/(?:levels(?:/.*)?|editor|demo|settings|shared|bench(?:/.*)?)/?$|^${routeBasePattern}/?$`,
);

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'prompt',
      injectRegister: false,
      devOptions: { enabled: false },
      manifest: {
        name: 'Contrapt!',
        short_name: 'Contrapt!',
        lang: 'fr',
        description: 'Construisez, testez et améliorez vos machines mécaniques.',
        start_url: basePath,
        scope: basePath,
        display: 'standalone',
        orientation: 'any',
        background_color: '#101923',
        theme_color: '#101923',
        icons: [
          {
            src: 'icons/contrapt-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icons/contrapt-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icons/contrapt-maskable-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{html,js,css,svg,png,ico,webp,webmanifest}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: 'index.html',
        navigateFallbackAllowlist: [navigateFallbackAllowlist],
      },
    }),
  ],
  build: {
    target: 'es2022',
  },
});
