import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Set CORS headers
            proxyRes.headers['access-control-allow-origin'] = '*';
            proxyRes.headers['access-control-allow-methods'] = 'GET';
          });
        }
      }
    }
  }
})
