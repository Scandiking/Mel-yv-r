import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { parseTidalText } from './api/_tidalParse.ts';

// Dev-only stand-in for the Vercel Edge Function at api/tides.ts: fetches the
// plain-text Tidalwater response from api.met.no (with the mandatory User-Agent
// header) and parses it into the same JSON shape the client expects.
function tidalDevProxy(): Plugin {
  return {
    name: 'tidal-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/tides', async (req, res) => {
        const url = new URL(req.url ?? '', 'http://localhost');
        const harbor = url.searchParams.get('harbor');
        if (!harbor) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing harbor' }));
          return;
        }

        try {
          const upstream = `https://api.met.no/weatherapi/tidalwater/1.1/?harbor=${encodeURIComponent(harbor)}`;
          const upstreamRes = await fetch(upstream, {
            headers: { 'User-Agent': 'MeloyvaerApp/1.0 (https://github.com/meloyvaer/app)' },
          });

          if (!upstreamRes.ok) {
            res.statusCode = upstreamRes.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `Upstream ${upstreamRes.status}` }));
            return;
          }

          const text = await upstreamRes.text();
          const displayName = harbor.charAt(0).toUpperCase() + harbor.slice(1);
          const json = parseTidalText(text, displayName);

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(json));
        } catch {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Upstream failed' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    tidalDevProxy(),
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
