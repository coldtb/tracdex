import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, existsSync } from 'node:fs';

let controlToken = '';
try {
  const tokenPath = 'C:/Users/hitech/.gemini/antigravity/scratch/dex-data/control.token';
  if (existsSync(tokenPath)) {
    controlToken = readFileSync(tokenPath, 'utf8').trim();
  }
} catch (e) {}

let dashToken = '';
try {
  const dashPath = 'C:/Users/hitech/.gemini/antigravity/scratch/dex-data/trader/dashboard.token';
  if (existsSync(dashPath)) {
    dashToken = readFileSync(dashPath, 'utf8').trim();
  }
} catch (e) {}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  server: {
    port: 3000,
    host: '127.0.0.1',
    proxy: {
      '/api/solana-rpc': {
        target: 'https://api.mainnet-beta.solana.com',
        changeOrigin: true,
        rewrite: () => '',
      },
      '/api/live-candles': {
        target: 'https://reset.much.fun',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/live-candles/, '/v1/market/candles'),
      },
      '/api/live-trades': {
        target: 'https://reset.much.fun',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/live-trades/, '/v1/market/trades'),
      },
      '/api/candles': {
        target: 'http://127.0.0.1:47202',
        changeOrigin: true,
        headers: {
          Cookie: `dexdash47202=${dashToken}`,
          Host: '127.0.0.1:47202',
          Origin: 'http://127.0.0.1:47202',
        },
      },
      '/api/dex': {
        target: 'http://127.0.0.1:47201',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/dex/, ''),
        headers: controlToken ? { Authorization: `Bearer ${controlToken}` } : {},
      },
    },
  },
});
