
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'node:fs';
import path from 'node:path';
import {
  generateBrandIconPng,
  generateBrandFaviconIco,
} from './scripts/brandIconRasterizer.mjs';

function ensurePwaIconsPlugin(): Plugin {
  const ensureIcons = (targetDir: string) => {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const required: Array<{ name: string; size: number; maskable?: boolean }> = [
      { name: 'favicon.png', size: 32 },
      { name: 'apple-touch-icon.png', size: 180 },
      { name: 'pwa-192x192.png', size: 192 },
      { name: 'pwa-512x512.png', size: 512 },
      { name: 'pwa-maskable-512x512.png', size: 512, maskable: true },
    ];
    for (const icon of required) {
      const fullPath = path.join(targetDir, icon.name);
      if (!fs.existsSync(fullPath)) {
        fs.writeFileSync(fullPath, generateBrandIconPng(icon.size, icon.maskable));
      }
    }
    const icoPath = path.join(targetDir, 'favicon.ico');
    if (!fs.existsSync(icoPath)) {
      fs.writeFileSync(icoPath, generateBrandFaviconIco());
    }
  };

  return {
    name: 'ensure-pwa-icons',
    buildStart() {
      ensureIcons(path.resolve(process.cwd(), 'public'));
    },
    closeBundle() {
      const distDir = path.resolve(process.cwd(), 'dist');
      if (fs.existsSync(distDir)) {
        ensureIcons(distDir);
      }
    },
  };
}

function cdnBuildMetaPlugin(cdnBaseUrl: string): Plugin {
  return {
    name: 'cdn-build-meta',
    enforce: 'post',
    closeBundle() {
      if (!cdnBaseUrl) return;
      const distDir = path.resolve(process.cwd(), 'dist');
      const indexPath = path.join(distDir, 'index.html');
      if (!fs.existsSync(distDir) || !fs.existsSync(indexPath)) return;

      const html = fs.readFileSync(indexPath, 'utf8');
      const escapedBase = cdnBaseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const assetRegex = new RegExp(`${escapedBase}/(assets/[^"'\\s>]+)`, 'g');
      const entryAssetsSet = new Set<string>();
      let match: RegExpExecArray | null;
      while ((match = assetRegex.exec(html)) !== null) {
        entryAssetsSet.add(match[1]);
      }

      const rootFiles = fs
        .readdirSync(distDir, { withFileTypes: true })
        .filter(
          (entry) =>
            entry.isFile() &&
            !entry.name.startsWith('.') &&
            entry.name !== 'cdn-build-meta.json'
        )
        .map((entry) => entry.name);

      const meta = {
        tag: (process.env.VITE_CDN_TAG || '').trim(),
        cdnBaseUrl,
        builtAt: new Date().toISOString(),
        entryAssets: Array.from(entryAssetsSet),
        rootFiles,
      };

      fs.writeFileSync(
        path.join(distDir, 'cdn-build-meta.json'),
        JSON.stringify(meta, null, 2),
        'utf8'
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => {
  const isCdnDisabled =
    process.env.VITE_DISABLE_CDN === 'true' || process.env.VITE_DISABLE_CDN === '1';
  const rawCdnBase = (process.env.VITE_CDN_BASE_URL || '').trim().replace(/\/+$/, '');
  const cdnBaseUrl = !isCdnDisabled && rawCdnBase ? rawCdnBase : '';

  const baseGlobIgnores = [
    '**/vendor-jspdf-*.js',
    '**/vendor-html-to-image-*.js',
    '**/vendor-xlsx-*.js',
    '**/vendor-charts-*.js',
    '**/vendor-math-markdown-*.js',
    '**/cdn-build-meta.json',
  ];

  return {
    base: '/',
    experimental: cdnBaseUrl
      ? {
          renderBuiltUrl(filename, { type }) {
            if (type === 'asset') {
              return `${cdnBaseUrl}/${filename.replace(/^\/+/, '')}`;
            }
            return undefined;
          },
        }
      : undefined,
    plugins: [
      ensurePwaIconsPlugin(),
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png', 'favicon.png', 'icon.svg', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png'],
        devOptions: {
          enabled: true,
          type: 'module',
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 15000000,
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          navigateFallbackDenylist: [/^\/api/],
          globPatterns: cdnBaseUrl
            ? ['**/*.{html,ico,png,svg,webp,woff2}']
            : ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
          // Exclude large vendor chunks (and CDN-offloaded assets when CDN mode is active) from same-origin precache
          globIgnores: cdnBaseUrl ? [...baseGlobIgnores, '**/assets/**'] : baseGlobIgnores,
          runtimeCaching: [
            {
              urlPattern: /assets\/vendor-(jspdf|html-to-image|xlsx|charts|math-markdown).*\.js$/,
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
                  maxEntries: 120,
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
            {
              urlPattern: /^https:\/\/unpkg\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'unpkg-cdn-cache',
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
      }),
      cdnBuildMetaPlugin(cdnBaseUrl),
    ],
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
        external: ['html2canvas', 'canvg'],
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
              if (id.includes('katex') || id.includes('marked') || id.includes('react-markdown') || id.includes('remark-gfm')) {
                return 'vendor-math-markdown';
              }
              if (id.includes('recharts')) {
                return 'vendor-charts';
              }
              if (id.includes('xlsx')) {
                return 'vendor-xlsx';
              }
              if (id.includes('jspdf')) {
                return 'vendor-jspdf';
              }
              if (id.includes('html-to-image')) {
                return 'vendor-html-to-image';
              }
            }
          }
        }
      },
    },
  };
});
