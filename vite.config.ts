
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const base = '/logixgridos/';

export default defineConfig(() => {
  return {
    base,

    plugins: [
      react(),
      tailwindcss(),

      VitePWA({
        registerType: 'autoUpdate',

        includeAssets: [
          'favicon.ico',
          'apple-touch-icon.png',
          'icon.svg',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png'
        ],

        manifest: {
          id: base,
          name: 'LogiXGridOS - Workstation',
          short_name: 'LogiXGridOS',

          description:
            'LogiXGridOS: Smart, Secure & Powerful dynamic register builder, spreadsheet ledger, and data analytics workstation.',

          theme_color: '#000000',
          background_color: '#000000',

          display: 'standalone',
          orientation: 'any',

          start_url: base,
          scope: base,

          icons: [
            {
              src: `${base}assets/aistudio/final_9ab59f78.jpeg`,
              sizes: '512x512',
              type: 'image/jpeg',
              purpose: 'any'
            },
            {
              src: `${base}assets/aistudio/final_9ab59f78.jpeg`,
              sizes: '512x512',
              type: 'image/jpeg',
              purpose: 'maskable'
            },
            {
              src: `${base}pwa-192x192.png`,
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: `${base}pwa-512x512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: `${base}pwa-maskable-512x512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },

        workbox: {
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,

          globPatterns: [
            '**/*.{js,css,html,ico,png,jpg,jpeg,svg,webp,woff,woff2}'
          ],

          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',

              options: {
                cacheName: 'google-fonts-cache',

                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },

                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },

            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',

              options: {
                cacheName: 'gstatic-fonts-cache',

                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },

                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        },

        devOptions: {
          enabled: true,
          type: 'module'
        }
      })
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.')
      }
    },

    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify this configuration.

      hmr: process.env.DISABLE_HMR !== 'true',

      watch:
        process.env.DISABLE_HMR === 'true'
          ? null
          : {}
    }
  };
});
