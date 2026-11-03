import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, type UserConfig } from 'vite';

const REPO = path.resolve(__dirname, '..');

/* b4: one flow in one design language. No real product component is mounted any more, so no Tailwind and no
   public folder. The `@` alias stays for three small pure helpers the stage parts still import. */
export default defineConfig((): UserConfig => ({
  root: __dirname,
  base: './',
  publicDir: false,
  plugins: [
    react(),
    {
      /* our own media and logos, copied as they are to <out>/static */
      name: 'z-static',
      closeBundle() {
        const from = path.resolve(__dirname, 'static');
        const to = path.resolve(__dirname, process.env.Z_OUT || 'dist', 'static');
        if (fs.existsSync(from)) fs.cpSync(from, to, { recursive: true });
      },
    },
  ],
  resolve: {
    alias: [
      { find: 'thinking-orbs', replacement: path.resolve(__dirname, '_libs/thinking-orbs/dist/index.es.js') },
      { find: 'voice-glow', replacement: path.resolve(__dirname, '_libs/voice-glow/dist/index.es.js') },
      { find: 'border-beam', replacement: path.resolve(__dirname, '_libs/border-beam/dist/index.es.js') },
      { find: '@', replacement: path.resolve(REPO, 'src') },
    ],
  },
  server: { port: 5199, fs: { allow: [REPO] } },
  build: {
    outDir: path.resolve(__dirname, process.env.Z_OUT || 'dist'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 4000,
    sourcemap: false,
    minify: process.env.Z_MIN === '1' ? 'esbuild' : false,
  },
}));
