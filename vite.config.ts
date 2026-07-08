import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// NoaCG Studio — dev/build config.
// Two pages: index.html is the static public landing at "/", app.html is the editor at
// "/app". Vercel serves /app via cleanUrls (vercel.json); this tiny plugin gives the dev
// and preview servers the same clean URL. `?raw` imports bundle GSAP + template snippets.
function appCleanUrl(): Plugin {
  const rewrite = (req: { url?: string }) => {
    if (req.url === '/app' || req.url?.startsWith('/app?')) {
      req.url = '/app.html' + (req.url.slice('/app'.length) || '');
    }
  };
  return {
    name: 'app-clean-url',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        rewrite(req);
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        rewrite(req);
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), appCleanUrl()],
  server: { port: 5174, open: true },
  build: {
    target: 'es2020',
    outDir: 'dist',
    rollupOptions: {
      input: { landing: 'index.html', app: 'app.html' },
    },
  },
});
