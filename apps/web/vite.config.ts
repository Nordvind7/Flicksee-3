import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config for the Flicksee web client.
// TMDB is now reached through the API proxy (/api/*) instead of calling TMDB
// directly with a baked-in key, so no secret defines live here anymore.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), '');
  const apiTarget = env.VITE_API_URL ?? 'http://localhost:3001';

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@flicksee/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      },
    },
  };
});
