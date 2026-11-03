/* The plan owner's test bench, its own entry and its own out folder. Not part of the flow's build. */
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, type UserConfig } from 'vite';

const HOME = path.resolve(__dirname, '../../../..');
const REPO = path.resolve(HOME, '..');
const OUT = path.resolve(HOME, 'dist-plan-lab');

export default defineConfig((): UserConfig => ({
  root: __dirname,
  base: './',
  publicDir: false,
  plugins: [
    react(),
    {
      name: 'z-static',
      closeBundle() {
        const from = path.resolve(HOME, 'static');
        const to = path.resolve(OUT, 'static');
        if (fs.existsSync(from) && !fs.existsSync(to)) fs.cpSync(from, to, { recursive: true });
      },
    },
  ],
  resolve: {
    alias: [
      { find: 'thinking-orbs', replacement: path.resolve(HOME, '_libs/thinking-orbs/dist/index.es.js') },
      { find: 'voice-glow', replacement: path.resolve(HOME, '_libs/voice-glow/dist/index.es.js') },
      { find: 'border-beam', replacement: path.resolve(HOME, '_libs/border-beam/dist/index.es.js') },
      { find: '@', replacement: path.resolve(REPO, 'src') },
    ],
  },
  build: {
    outDir: OUT,
    emptyOutDir: false,
    chunkSizeWarningLimit: 4000,
    sourcemap: false,
    minify: false,
  },
}));
