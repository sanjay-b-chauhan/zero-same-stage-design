/* Builds only the card lab, into <standalone>/dist-games, from the app's own config:
   Z_OUT=dist-games ../node_modules/.bin/vite build --config flow/games/lab/vite.config.ts */
import path from 'path';
import { defineConfig, type UserConfig } from 'vite';
import base from '../../../vite.config';

const APP = path.resolve(__dirname, '../../..');

export default defineConfig((env): UserConfig => {
  const b = (typeof base === 'function' ? base(env) : base) as UserConfig;
  return {
    ...b,
    root: __dirname,
    build: {
      ...b.build,
      outDir: path.resolve(APP, process.env.Z_OUT || 'dist-games'),
      emptyOutDir: true,
      rollupOptions: { input: path.resolve(__dirname, 'index.html') },
    },
  };
});
