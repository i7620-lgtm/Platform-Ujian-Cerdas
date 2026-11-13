
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png', 'favicon.png', 'icon.svg'],
        workbox: {
          maximumFileSizeToCacheInBytes: 15000000,
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          navigateFallbackDenylist: [/^\/api/],
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
          // Exclude large vendor chunks from precache to speed up sharing
          globIgnores: ['**/vendor-pdf-export-*.js', '**/vendor-xlsx-*.js', '**/vendor-charts-*.js', '**/vendor-math-markdown-*.js'],
          runtimeCaching: [
            {
              urlPattern: /assets\/vendor-(pdf-export|xlsx|charts|math-markdown).*\.js$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'large-vendor-chunks',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
              },
            },
            {
              urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'external-cdn-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'cdnjs-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        manifest: {
          id: '/',
          name: 'Platform Ujian Cerdas Supabase DB',
          short_name: 'UjianCerdas',
          description: 'Sebuah platform ujian online yang elegan dan modern untuk guru dan siswa.',
          theme_color: '#4F46E5',
          background_color: '#FAFAFA',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/favicon.png',
              sizes: '32x32',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        }
      })
    ],
    optimizeDeps: {
      include: ['@vercel/analytics/react']
    },
    resolve: {
      dedupe: ['react', 'react-dom']
    },
    server: {
      host: true,
      port: 3000,
    },
    build: {
      target: 'es2015',
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild',
      chunkSizeWarningLimit: 3000,
      modulePreload: {
        polyfill: false
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'vendor-react-core';
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('zustand') || id.includes('immer')) {
                return 'vendor-state';
              }
              if (id.includes('html5-qrcode') || id.includes('qrcode.react')) {
                return 'vendor-qrcode';
              }
              if (id.includes('@vercel/analytics')) {
                return 'vendor-analytics';
              }
              if (id.includes('katex') || id.includes('marked') || id.includes('react-markdown') || id.includes('remark-gfm')) {
                return 'vendor-math-markdown';
              }
              if (id.includes('recharts')) {
                return 'vendor-charts';
              }
              if (id.includes('xlsx')) {
                return 'vendor-xlsx';
              }
              if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('html2pdf.js') || id.includes('html-to-image')) {
                return 'vendor-pdf-export';
              }
            }
          }
        }
      },
    },
  };
});
