// Generates PWA icons (pixel-art fish on navy). Run: node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const NAVY = [0x24, 0x32, 0x4a], CREAM = [0xff, 0xf3, 0xd6], ORANGE = [0xe0, 0x66, 0x3c], SEA = [0x2f, 0x8a, 0xa0], SHADOW = [0x11, 0x18, 0x27];
const PAL = { '.': null, o: ORANGE, c: CREAM, s: SEA, k: SHADOW };
// 16x16 fish facing left
const FISH = [
  '................',
  '................',
  '................',
  '.....oooo.......',
  '....oooooo...o..',
  '..ooooooooo.ooo.',
  '.ooocoooooooooo.',
  '.ookkooooooooo..',
  '.ooooooooooooo..',
  '..ooooooooo.ooo.',
  '....ssssss...o..',
  '.....ssss.......',
  '................',
  '................',
  '................',
  '................',
];

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
function png(size, fishFrac) {
  const cell = Math.max(1, Math.floor((size * fishFrac) / 16));
  const off = Math.floor((size - cell * 16) / 2);
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const gx = Math.floor((x - off) / cell), gy = Math.floor((y - off) / cell);
      const ch = gx >= 0 && gx < 16 && gy >= 0 && gy < 16 ? FISH[gy][gx] : '.';
      const col = PAL[ch] ?? NAVY;
      raw.set(col, y * (size * 3 + 1) + 1 + x * 3);
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

mkdirSync('public/icons', { recursive: true });
const out = [
  ['icon-192.png', 192, 0.85],
  ['icon-512.png', 512, 0.85],
  ['icon-maskable-512.png', 512, 0.6], // fish inside the 80% safe zone
  ['apple-touch-icon.png', 180, 0.85],
  ['favicon-32.png', 32, 1],
];
for (const [name, size, frac] of out) writeFileSync(`public/icons/${name}`, png(size, frac));
console.log('icons written');
