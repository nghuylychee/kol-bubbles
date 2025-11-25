import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path for GitHub Pages (change 'kol-bubbles' to your repo name if different)
  // If your repo is username.github.io, set base to '/'
  base: process.env.GITHUB_PAGES === 'true' ? '/kol-bubbles/' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    proxy: {
      '/api/apify': {
        target: 'https://api.apify.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/apify/, '/v2'),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Forward X-Apify-Token header as Authorization
            const token = req.headers['x-apify-token'];
            if (token) {
              proxyReq.setHeader('Authorization', `Bearer ${token}`);
              // Remove the custom header to avoid issues
              proxyReq.removeHeader('x-apify-token');
            }
          });
        }
      },
      '/api/image-proxy': {
        target: 'https://api.allorigins.win',
        changeOrigin: true,
        rewrite: (path) => {
          // Extract URL from query and use allorigins proxy
          const url = new URL(path, 'http://localhost');
          const imageUrl = url.searchParams.get('url');
          if (imageUrl) {
            return `/raw?url=${encodeURIComponent(imageUrl)}`;
          }
          return path;
        },
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Remove any existing origin header to avoid CORS issues
            proxyReq.removeHeader('origin');
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Set CORS headers to allow all origins
            proxyRes.headers['access-control-allow-origin'] = '*';
            proxyRes.headers['access-control-allow-methods'] = 'GET, OPTIONS';
            proxyRes.headers['access-control-allow-headers'] = '*';
            // Preserve content-type for images
            if (proxyRes.headers['content-type']) {
              res.setHeader('content-type', proxyRes.headers['content-type']);
            }
          });
        }
      }
    }
  }
})
