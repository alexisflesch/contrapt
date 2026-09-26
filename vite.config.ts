import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site under `/<repository>/`; the deploy workflow sets
// this variable. Locally, in tests and in Playwright, the app lives at `/`.
const basePath = process.env.CONTRAPT_BASE_PATH ?? '/';

export default defineConfig({
  base: basePath,
  plugins: [react()],
  build: {
    target: 'es2022',
  },
});
