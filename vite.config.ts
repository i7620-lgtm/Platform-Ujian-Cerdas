
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
}

const CRC_TABLE = createCrc32Table();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generateBrandIconPng(size: number, maskable = false): Buffer {
  const raw = Buffer.alloc(size * (1 + size * 4));
  const padScale = maskable ? 0.72 : 0.88;

  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0;
    for (let x = 0; x < size; x++) {
      const t = (x + y) / (2 * size);
      let r = Math.round(79 + (55 - 79) * t);   // #4F46E5 -> #3730A3
      let g = Math.round(70 + (48 - 70) * t);
      let b = Math.round(229 + (163 - 229) * t);
      const a = 255;

      // Normalized coords [-1, 1] scaled for safe zone
      const nx = ((x / (size - 1)) * 2 - 1) / padScale;
      const ny = ((y / (size - 1)) * 2 - 1) / padScale;

      // White graduation cap diamond top
      const inDiamond = Math.abs(nx) / 0.72 + Math.abs(ny + 0.14) / 0.34 <= 1;
      // Cap base
      const inBase =
        Math.abs(nx) <= 0.42 &&
        ny >= 0.08 &&
        ny <= 0.42 &&
        Math.abs(nx) <= 0.42 - (ny - 0.08) * 0.18;
      // Gold tassel line & dot
      const inTassel =
        (Math.abs(nx - 0.56) <= 0.04 && ny >= -0.05 && ny <= 0.42) ||
        ((nx - 0.56) ** 2 + (ny - 0.46) ** 2 <= 0.07 ** 2);

      if (inDiamond) {
        r = 255; g = 255; b = 255;
      } else if (inBase) {
        r = 224; g = 231; b = 255;
      } else if (inTassel) {
        r = 250; g = 204; b = 21;
      }

      const px = rowStart + 1 + x * 4;
      raw[px] = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
      raw[px + 3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

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

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
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
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
          // Exclude large vendor chunks from precache to speed up sharing
          globIgnores: ['**/vendor-jspdf-*.js', '**/vendor-html-to-image-*.js', '**/vendor-xlsx-*.js', '**/vendor-charts-*.js', '**/vendor-math-markdown-*.js'],
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
      })
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