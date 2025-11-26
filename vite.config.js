import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path cho GitHub Pages
  // REPO_NAME sẽ được set tự động từ GitHub Actions
  base: process.env.GITHUB_PAGES === 'true' && process.env.REPO_NAME
    ? `/${process.env.REPO_NAME}/`
    : '/',
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
        target: 'https://corsproxy.io',
        changeOrigin: true,
        rewrite: (path) => {
          // Extract URL from query and use corsproxy.io
          const url = new URL(path, 'http://localhost');
          const imageUrl = url.searchParams.get('url');
          if (imageUrl) {
            // corsproxy.io uses ?url= format
            return `/?${encodeURIComponent(imageUrl)}`;
          }
          return path;
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.error('Proxy error:', err.message);
            res.writeHead(500, {
              'Content-Type': 'text/plain',
            });
            res.end('Proxy error: ' + err.message);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Set CORS headers
            proxyRes.headers['access-control-allow-origin'] = '*';
            proxyRes.headers['access-control-allow-methods'] = 'GET, OPTIONS';
            proxyRes.headers['access-control-allow-headers'] = '*';
          });
        }
      }
    }
  }
})
