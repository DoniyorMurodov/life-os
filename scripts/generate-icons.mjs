/**
 * Generates the PWA PNG icons with zero dependencies (pure Node + zlib).
 * Run: npm run icons
 * Design: navy square, blue rounded "L", light-blue dot (same as public/favicon.svg).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [15, 23, 42];
const BLUE = [59, 130, 246];
const LIGHT = [147, 197, 253];

// Shapes in a 512×512 design space.
const roundRect = (x, y, w, h, r) => (px, py) => {
  const dx = Math.max(x + r - px, 0, px - (x + w - r));
  const dy = Math.max(y + r - py, 0, py - (y + h - r));
  return dx * dx + dy * dy <= r * r;
};
const circle = (cx, cy, r) => (px, py) => (px - cx) ** 2 + (py - cy) ** 2 <= r * r;

const SHAPES = [
  { color: BLUE, hit: roundRect(176, 140, 60, 232, 30) },
  { color: BLUE, hit: roundRect(176, 312, 160, 60, 30) },
  { color: LIGHT, hit: circle(316, 176, 32) },
];

function render(size, { rounded = false } = {}) {
  const SS = 4; // 4×4 supersampling for smooth edges
  const scale = 512 / size;
  const bgShape = rounded ? roundRect(0, 0, 512, 512, 120) : () => true;
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = (x + (sx + 0.5) / SS) * scale;
          const py = (y + (sy + 0.5) / SS) * scale;
          if (!bgShape(px, py)) continue;
          let c = BG;
          for (const s of SHAPES) if (s.hit(px, py)) c = s.color;
          r += c[0]; g += c[1]; b += c[2]; a += 255;
        }
      }
      const n = SS * SS;
      const covered = a / 255 || 1;
      const o = 1 + x * 4;
      row[o] = Math.round(r / covered);
      row[o + 1] = Math.round(g / covered);
      row[o + 2] = Math.round(b / covered);
      row[o + 3] = Math.round(a / n);
    }
    rows.push(row);
  }
  return encodePNG(size, size, Buffer.concat(rows));
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

function encodePNG(width, height, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icons', { recursive: true });
// Full-bleed squares: Android masks them (maskable-safe), iOS rounds them itself.
writeFileSync('public/icons/icon-192.png', render(192));
writeFileSync('public/icons/icon-512.png', render(512));
writeFileSync('public/icons/apple-touch-icon.png', render(180));
console.log('Icons written to public/icons/');
