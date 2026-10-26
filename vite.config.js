import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, existsSync } from 'node:fs';

function getDashToken() {
  try {
    const dashPath = 'C:/Users/hitech/.gemini/antigravity/scratch/dex-data/trader/dashboard.token';
    if (existsSync(dashPath)) {
      return readFileSync(dashPath, 'utf8').trim();
    }
  } catch (e) {}
  return '';
}

function getControlToken() {
  try {
    const tokenPath = 'C:/Users/hitech/.gemini/antigravity/scratch/dex-data/control.token';
    if (existsSync(tokenPath)) {
      return readFileSync(tokenPath, 'utf8').trim();
    }
  } catch (e) {}
  return '';
}

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
      '/api/book': {
        target: 'http://127.0.0.1:47202',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            const token = getDashToken();
            if (token) {
              proxyReq.setHeader('Cookie', `dexdash47202=${token}`);
              proxyReq.setHeader('Origin', 'http://127.0.0.1:47202');
            }
          });
        },
      },
      '/api/state': {
        target: 'http://127.0.0.1:47202',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            const token = getDashToken();
            if (token) {
              proxyReq.setHeader('Cookie', `dexdash47202=${token}`);
              proxyReq.setHeader('Origin', 'http://127.0.0.1:47202');
            }
          });
        },
      },
      '/api/trades-dex': {
        target: 'http://127.0.0.1:47202',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/trades-dex/, '/api/trades'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            const token = getDashToken();
            if (token) {
              proxyReq.setHeader('Cookie', `dexdash47202=${token}`);
              proxyReq.setHeader('Origin', 'http://127.0.0.1:47202');
            }
          });
        },
      },
      '/api/candles': {
        target: 'http://127.0.0.1:47202',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            const token = getDashToken();
            if (token) {
              proxyReq.setHeader('Cookie', `dexdash47202=${token}`);
              proxyReq.setHeader('Origin', 'http://127.0.0.1:47202');
            }
          });
        },
      },
      '/api/dex': {
        target: 'http://127.0.0.1:47201',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/dex/, ''),
        headers: getControlToken() ? { Authorization: `Bearer ${getControlToken()}` } : {},
      },
    },
  },
});
