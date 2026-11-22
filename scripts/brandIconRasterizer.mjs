import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createCrc32Table() {
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

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function distToSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const lenSq = vx * vx + vy * vy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / lenSq));
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
}

function inRoundedRect(x, y, left, top, right, bottom, radius) {
  const cx = (left + right) * 0.5;
  const cy = (top + bottom) * 0.5;
  const hw = (right - left) * 0.5 - radius;
  const hh = (bottom - top) * 0.5 - radius;
  const dx = Math.max(Math.abs(x - cx) - hw, 0);
  const dy = Math.max(Math.abs(y - cy) - hh, 0);
  return dx * dx + dy * dy <= radius * radius;
}

function inDiamond(x, y, cx, cy, rx, ry) {
  return Math.abs(x - cx) / rx + Math.abs(y - cy) / ry <= 1;
}

function blendOver(base, r, g, b, alpha) {
  const inv = 1 - alpha;
  base[0] = base[0] * inv + r * alpha;
  base[1] = base[1] * inv + g * alpha;
  base[2] = base[2] * inv + b * alpha;
  base[3] = Math.min(255, base[3] + (255 - base[3]) * alpha);
}

/**
 * Samples a single subpixel on the canonical 512x512 vector artboard.
 * Matches `public/icon.svg` and `LogoIcon` geometry 1:1.
 */
function sampleUnifiedBrandPixel(px, py, maskable) {
  const bgT = Math.max(0, Math.min(1, (px + py) / 1024));
  const bgR = 79 + (55 - 79) * bgT;   // #4F46E5 -> #3730A3
  const bgG = 70 + (48 - 70) * bgT;
  const bgB = 229 + (163 - 229) * bgT;

  // Outside rounded squircle container for standard icons
  if (!maskable && !inRoundedRect(px, py, 0, 0, 512, 512, 108)) {
    return [0, 0, 0, 0];
  }

  const rgba = [bgR, bgG, bgB, 255];

  // For maskable icons, scale inner artwork cleanly into central 78% safe zone
  const scale = maskable ? 0.78 : 1.0;
  const x = (px - 256) / scale + 256;
  const y = (py - 256) / scale + 256;

  // 1. Signature Circle Emblem Crest centered at (256, 260) framing the entire "I"-Toga monogram
  const distCircle = Math.hypot(x - 256, y - 260);
  if (distCircle < 172) {
    blendOver(rgba, 255, 255, 255, 0.08);
  }
  if (distCircle >= 172 && distCircle <= 194) {
    blendOver(rgba, 224, 231, 255, 0.92);
  }

  // 2. Monogram "I" Stem & Bottom Serif Foot (#FFFFFF)
  const inBottomSerif = inRoundedRect(x, y, 198, 356, 314, 390, 14);
  const inStem = x >= 230 && x <= 282 && y >= 228 && y <= 366;
  if (inBottomSerif || inStem) {
    rgba[0] = 255;
    rgba[1] = 255;
    rgba[2] = 255;
  }

  // 3. Toga Crown / Headband uniting Mortarboard Roof with Top of "I" (#E0E7FF)
  if (y >= 194 && y <= 252) {
    const progress = (y - 194) / 58;
    const halfWidth = 66 - 20 * Math.pow(progress, 0.85);
    const maxBottomY = 250 - Math.pow((x - 256) / 66, 2) * 12;
    if (Math.abs(x - 256) <= halfWidth && y <= maxBottomY) {
      rgba[0] = 224;
      rgba[1] = 231;
      rgba[2] = 255;
    }
  }

  // 4. Graduation Cap Mortarboard Diamond (#FFFFFF)
  if (inDiamond(x, y, 256, 174, 132, 58)) {
    rgba[0] = 255;
    rgba[1] = 255;
    rgba[2] = 255;
  }

  // 5. Gold Tassel Cord & Tip (#FACC15 / #FDE047)
  const inAnchorCord = distToSegment(x, y, 256, 174, 362, 186) <= 6;
  const distCenterButton = Math.hypot(x - 256, y - 174);
  const inTasselCord = distToSegment(x, y, 362, 186, 362, 286) <= 8;
  const distBulb = Math.hypot(x - 362, y - 294);

  if (inAnchorCord || distCenterButton <= 10) {
    rgba[0] = 253;
    rgba[1] = 224;
    rgba[2] = 71; // #FDE047
  }
  if (inTasselCord || distBulb <= 16) {
    rgba[0] = 250;
    rgba[1] = 204;
    rgba[2] = 21; // #FACC15
  }

  return rgba;
}

/**
 * Renders a supersampled anti-aliased RGBA PNG buffer of the unified brand icon.
 */
export function generateBrandIconPng(size, maskable = false) {
  const raw = Buffer.alloc(size * (1 + size * 4));
  const subSamples = size <= 64 ? 4 : 3;
  const invTotal = 1 / (subSamples * subSamples);

  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0;
    for (let x = 0; x < size; x++) {
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let sumA = 0;

      for (let sy = 0; sy < subSamples; sy++) {
        const fy = (y + (sy + 0.5) / subSamples) * (512 / size);
        for (let sx = 0; sx < subSamples; sx++) {
          const fx = (x + (sx + 0.5) / subSamples) * (512 / size);
          const s = sampleUnifiedBrandPixel(fx, fy, maskable);
          const w = s[3] / 255;
          sumR += s[0] * w;
          sumG += s[1] * w;
          sumB += s[2] * w;
          sumA += s[3];
        }
      }

      const avgA = sumA * invTotal;
      const pxIdx = rowStart + 1 + x * 4;
      if (avgA < 0.5) {
        raw[pxIdx] = 0;
        raw[pxIdx + 1] = 0;
        raw[pxIdx + 2] = 0;
        raw[pxIdx + 3] = 0;
      } else {
        const norm = (avgA / 255) / invTotal;
        raw[pxIdx] = Math.min(255, Math.round(sumR / norm));
        raw[pxIdx + 1] = Math.min(255, Math.round(sumG / norm));
        raw[pxIdx + 2] = Math.min(255, Math.round(sumB / norm));
        raw[pxIdx + 3] = Math.min(255, Math.round(avgA));
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Packages 16x16 and 32x32 PNG buffers into a standard multi-resolution `.ico` file.
 */
export function generateBrandFaviconIco() {
  const frames = [
    { size: 16, png: generateBrandIconPng(16, false) },
    { size: 32, png: generateBrandIconPng(32, false) },
  ];

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = ICO
  header.writeUInt16LE(frames.length, 4);

  const entries = [];
  let offset = 6 + frames.length * 16;

  for (const frame of frames) {
    const entry = Buffer.alloc(16);
    entry[0] = frame.size === 256 ? 0 : frame.size;
    entry[1] = frame.size === 256 ? 0 : frame.size;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(frame.png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += frame.png.length;
  }

  return Buffer.concat([header, ...entries, ...frames.map((f) => f.png)]);
}

if (process.argv.includes('--write-public')) {
  const publicDir = path.resolve(process.cwd(), 'public');
  fs.mkdirSync(publicDir, { recursive: true });

  const outputs = [
    { name: 'favicon.png', buf: generateBrandIconPng(32, false) },
    { name: 'favicon.ico', buf: generateBrandFaviconIco() },
    { name: 'apple-touch-icon.png', buf: generateBrandIconPng(180, false) },
    { name: 'pwa-192x192.png', buf: generateBrandIconPng(192, false) },
    { name: 'pwa-512x512.png', buf: generateBrandIconPng(512, false) },
    { name: 'pwa-maskable-512x512.png', buf: generateBrandIconPng(512, true) },
  ];

  for (const item of outputs) {
    fs.writeFileSync(path.join(publicDir, item.name), item.buf);
    console.log(`Generated public/${item.name} (${item.buf.length} bytes)`);
  }
}
