import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// SPX HTML GFX Builder — dev/build config.
// `?raw` imports are used to bundle GSAP and template snippets as strings.
export default defineConfig({
  plugins: [react()],
  server: { port: 5174, open: true },
  build: { target: 'es2020', outDir: 'dist' },
});
