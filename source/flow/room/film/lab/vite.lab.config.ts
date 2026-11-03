/* The film lab, a dev page of its own (not part of the app build): the film inside a stand-in of the Room's light chrome,
   driven by window.__lab. Build: from standalone, ../node_modules/.bin/vite build --config flow/room/film/lab/vite.lab.config.ts
   Output: dist-film. Delete this folder before ship. */
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, type UserConfig } from 'vite';

const SA = path.resolve(__dirname, '../../../..');
const OUT = path.resolve(SA, 'dist-film');

export default defineConfig((): UserConfig => ({
  root: __dirname,
  base: './',
  publicDir: false,
  plugins: [
    react(),
    {
      name: 'film-static',
      closeBundle() {
        const from = path.resolve(SA, 'static');
        const to = path.resolve(OUT, 'static');
        if (fs.existsSync(from)) fs.cpSync(from, to, { recursive: true });
      },
    },
  ],
  resolve: {
    alias: [{ find: '@', replacement: path.resolve(SA, '..', 'src') }],
  },
  build: {
    outDir: OUT,
    emptyOutDir: true,
    chunkSizeWarningLimit: 4000,
    sourcemap: false,
    minify: false,
  },
}));
