import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  server: {
    proxy: {
      // In dev, proxy /api/tides to api.met.no adding the required User-Agent header.
      // In production this is handled by the Vercel Edge Function at api/tides.ts.
      '/api/tides': {
        target: 'https://api.met.no',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/tides', '/weatherapi/tidalwater/1.1/'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('User-Agent', 'MeloyvaerApp/1.0 (https://github.com/meloyvaer/app)');
          });
        },
      },
    },
  },
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@yr/weather-symbols/dist/svg/*.svg',
          dest: 'weather-icons',
        },
      ],
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Meloyvaer',
        short_name: 'Vær',
        description: 'Local weather and tidal forecast',
        theme_color: '#0a1628',
        background_color: '#0a1628',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.met\.no\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'yr-api-cache', expiration: { maxAgeSeconds: 3600 } },
          },
          {
            urlPattern: /\/api\/tides/,
            handler: 'NetworkFirst',
            options: { cacheName: 'tides-proxy-cache', expiration: { maxAgeSeconds: 3600 } },
          },
        ],
      },
    }),
  ],
});
