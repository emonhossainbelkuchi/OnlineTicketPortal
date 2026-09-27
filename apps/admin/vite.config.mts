/// <reference types='vitest' />
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

/**
 * The management console (src/console) is a second HTML entry of this app, served at /admin/*.
 * It keeps its own Bootstrap + Tailwind styling, which must never load on the pages that use
 * the shared design tokens, so it is a separate document instead of a route of the main SPA.
 * This maps every /admin URL (deep links and page refreshes included) to that entry, in both
 * `nx serve admin` and `nx run admin:preview`. A production host needs the same rewrite:
 * /admin/* -> /console/index.html, everything else -> /index.html.
 */
function consoleEntryFallback(): Plugin {
  const rewrite = (req: { url?: string }, _res: unknown, next: () => void) => {
    const url = req.url ?? '';
    if (url === '/admin' || url.startsWith('/admin/') || url.startsWith('/admin?')) {
      req.url = '/console/index.html';
    }
    next();
  };
  return {
    name: 'ticketportal-console-entry-fallback',
    configureServer: (server) => void server.middlewares.use(rewrite),
    configurePreviewServer: (server) => void server.middlewares.use(rewrite),
  };
}

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/admin',
  server: {
    // 4300, not 4200 — the Angular app (apps/frontend) already uses 4200,
    // and you'll often want both running side by side during development.
    port: 4300,
    host: 'localhost',
  },
  preview: {
    port: 4300,
    host: 'localhost',
  },
  plugins: [react(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md']), consoleEntryFallback()],
  resolve: {
    // "@/..." is the management console's own import alias (see src/console/tsconfig.json).
    alias: { '@': path.resolve(import.meta.dirname, 'src/console') },
  },
  // Uncomment this if you are using workers.
  // worker: {
  //   plugins: () => [ nxViteTsPaths() ],
  // },
  build: {
    outDir: '../../dist/apps/admin',
    emptyOutDir: true,
    reportCompressedSize: true,
    rollupOptions: {
      input: {
        main: path.resolve(import.meta.dirname, 'index.html'),
        console: path.resolve(import.meta.dirname, 'console/index.html'),
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}));
