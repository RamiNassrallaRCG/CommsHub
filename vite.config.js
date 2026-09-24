import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves project sites from https://<user>.github.io/<repo>/,
// so all asset URLs need the repo name as a base path in production.
// Locally (`npm run dev`) this has no effect — Vite still serves from '/'.
export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/GenieHub/' : '/',
  plugins: [react()],
});
