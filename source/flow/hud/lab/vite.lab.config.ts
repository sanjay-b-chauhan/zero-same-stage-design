/* HUD lab build, test only: ../node_modules/.bin/vite build --config flow/hud/lab/vite.lab.config.ts */
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

const SA = '/Users/sanjaychauhan/claudecode/zero-core-ui/worktrees/stage-proto/standalone';
const OUT = path.join(SA, 'dist-hud-lab');
export default defineConfig({
  root: path.join(SA, 'flow/hud/lab'),
  base: './',
  publicDir: false,
  plugins: [react(), { name: 'z-static', closeBundle() { fs.cpSync(path.join(SA, 'static/badges'), path.join(OUT, 'static/badges'), { recursive: true }); fs.cpSync(path.join(SA, 'static/faces'), path.join(OUT, 'static/faces'), { recursive: true }); fs.cpSync(path.join(SA, 'static/world'), path.join(OUT, 'static/world'), { recursive: true }); } }],
  resolve: { alias: [
    { find: 'thinking-orbs', replacement: path.join(SA, '_libs/thinking-orbs/dist/index.es.js') },
    { find: 'voice-glow', replacement: path.join(SA, '_libs/voice-glow/dist/index.es.js') },
    { find: 'border-beam', replacement: path.join(SA, '_libs/border-beam/dist/index.es.js') },
    { find: '@', replacement: path.resolve(SA, '../src') },
  ] },
  build: { outDir: OUT, emptyOutDir: true, chunkSizeWarningLimit: 4000, minify: false },
});
