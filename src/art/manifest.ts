/**
 * Art manifest — the ONLY place that knows what things look like.
 * Everything visual is requested by id (`fish.arapaima`, `scene.coral_bay`, `ui.coin` …).
 * Style B (pixel prototype): textures are drawn in code at low resolution and scaled up
 * with nearest-neighbour. For the painted style (D), replace entries (and THEME) here.
 */
import type { RarityId } from '../data/rarities';

export const THEME = {
  font: '"Pixelify Sans", monospace',
  navy: '#24324A',
  cream: '#FFF3D6',
  shadow: '#111827',
  accent: '#E0663C',
  sea: '#2F8AA0',
  green: '#6BCB77',
  dim: '#8C97A8',
  silhouette: '#1A2433',
  hex: {
    navy: 0x24324a,
    cream: 0xfff3d6,
    shadow: 0x111827,
    accent: 0xe0663c,
    sea: 0x2f8aa0,
    green: 0x6bcb77,
    silhouette: 0x1a2433,
  },
} as const;

export const RARITY_COLOR: Record<RarityId, string> = {
  common: '#B8C2CC',
  uncommon: '#6BCB77',
  rare: '#5AA9E6',
  epic: '#B48CF2',
  legendary: '#F5B93A',
};

/** Pixel scale used when showing each kind of texture. */
export const PIXEL_SCALE = { fish: 5, fishSmall: 3, scene: 3, coin: 3, customer: 4, stall: 3, bobber: 4, rod: 3 };

export interface ArtEntry {
  w: number;
  h: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

export const fishArtId = (speciesId: string) => `fish.${speciesId}`;
export const sceneArtId = (regionId: string) => `scene.${regionId}`;

// ---------- drawing helpers ----------
type Ctx = CanvasRenderingContext2D;
const rect = (c: Ctx, color: string, x: number, y: number, w: number, h: number) => {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
};
const grid = (c: Ctx, rows: string[], pal: Record<string, string>) => {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = pal[row[x]];
      if (col) rect(c, col, x, y, 1, 1);
    }
  });
};
const bands = (c: Ctx, y0: number, y1: number, colors: string[], w: number) => {
  const h = (y1 - y0) / colors.length;
  colors.forEach((col, i) => rect(c, col, 0, Math.round(y0 + i * h), w, Math.ceil(h) + 1));
};
/** Tiny deterministic generator for decoration so art never changes between loads. */
const deco = (seed: number) => {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
};
const disc = (c: Ctx, color: string, cx: number, cy: number, r: number) => {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + 1) rect(c, color, cx + x, cy + y, 1, 1);
};

// ---------- fish (16×8 template, tinted per species) ----------
const FISH_ROWS = [
  '......DD........',
  '.....DDDD....FF.',
  '..BBBBSBBBB.FFF.',
  '.BBBBBSBBBBBFFF.',
  'BBEBBBSBBBBBFFF.',
  '.LLLLLLLLLLLFFF.',
  '..LLLLLLLLL.FF..',
  '......PP........',
];
interface FishPal { B: string; L: string; F: string; D: string; P: string; S: string }
const FISH_PALETTES: Record<string, FishPal> = {
  yellowstripe_scad: { B: '#8FB8C9', L: '#E8F0F2', F: '#E6C94A', D: '#5E8FA3', P: '#E6C94A', S: '#F2D544' },
  mangrove_jack: { B: '#B5503A', L: '#E8B9A0', F: '#8E3A2B', D: '#8E3A2B', P: '#8E3A2B', S: '#B5503A' },
  giant_trevally: { B: '#6E7F8C', L: '#C9D1D6', F: '#3F4B55', D: '#3F4B55', P: '#3F4B55', S: '#9BAAB5' },
  atlantic_mackerel: { B: '#3E7C8F', L: '#DDE7EA', F: '#2D5866', D: '#2D5866', P: '#2D5866', S: '#1F3A45' },
  atlantic_cod: { B: '#8C8A5A', L: '#E5E0C0', F: '#6B6944', D: '#6B6944', P: '#6B6944', S: '#5C5A38' },
  atlantic_salmon: { B: '#9AA7B3', L: '#F2C8B8', F: '#5E6B78', D: '#5E6B78', P: '#5E6B78', S: '#C77B6B' },
  red_bellied_piranha: { B: '#6F7C80', L: '#D9503A', F: '#3A4448', D: '#3A4448', P: '#D9503A', S: '#8FA0A4' },
  arapaima: { B: '#4A6A4A', L: '#C8573F', F: '#A83C2B', D: '#365036', P: '#365036', S: '#5E8A5E' },
};
const fishEntry = (p: FishPal): ArtEntry => ({
  w: 16,
  h: 8,
  draw: (c) => grid(c, FISH_ROWS, { ...p, E: '#111827' }),
});

// ---------- scenes (130×242 → ×3 = 390×726) ----------
const SCENE_W = 130;
const SCENE_H = 242;
const waves = (c: Ctx, seed: number, y0: number, color: string, count: number) => {
  const r = deco(seed);
  for (let i = 0; i < count; i++) rect(c, color, Math.floor(r() * 120), Math.floor(y0 + r() * (SCENE_H - y0 - 8)), 4 + Math.floor(r() * 6), 1);
};

const coralBay: ArtEntry = {
  w: SCENE_W,
  h: SCENE_H,
  draw: (c) => {
    bands(c, 0, 100, ['#6CC6E8', '#8CD4EA', '#B3E3E8', '#D5EBD8', '#FFE3B0'], SCENE_W);
    disc(c, '#FFF1C2', 98, 72, 7);
    // distant island with palm
    rect(c, '#2F7A5A', 6, 92, 34, 8);
    rect(c, '#2F7A5A', 12, 88, 20, 4);
    rect(c, '#6B4423', 22, 78, 2, 12);
    rect(c, '#3E9B6A', 17, 76, 12, 2);
    rect(c, '#3E9B6A', 19, 74, 8, 2);
    bands(c, 100, SCENE_H, ['#3AA0B8', '#2F8AA0', '#2A7C94', '#256F86', '#1F6178', '#1B5468'], SCENE_W);
    waves(c, 11, 104, '#7FD0DC', 40);
    // corals at the bottom
    const cols = ['#E0663C', '#F28BA8', '#F5B93A'];
    const r = deco(5);
    for (let i = 0; i < 14; i++) {
      const x = Math.floor(r() * 124);
      const h = 4 + Math.floor(r() * 9);
      rect(c, cols[i % 3], x, SCENE_H - h, 3, h);
      rect(c, cols[(i + 1) % 3], x - 1, SCENE_H - h + 2, 1, 3);
    }
  },
};

const northAtlantic: ArtEntry = {
  w: SCENE_W,
  h: SCENE_H,
  draw: (c) => {
    bands(c, 0, 100, ['#8FA3B5', '#A3B4C3', '#B8C6D0', '#CCD6DC', '#DDE4E6'], SCENE_W);
    const clouds: Array<[number, number, number]> = [[18, 24, 20], [74, 38, 26], [40, 60, 16]];
    for (const [x, y, w] of clouds) {
      rect(c, '#F4F7F8', x, y, w, 4);
      rect(c, '#F4F7F8', x + 3, y - 3, w - 8, 3);
    }
    // lighthouse on a rock
    rect(c, '#55606C', 92, 92, 30, 8);
    rect(c, '#55606C', 98, 88, 18, 4);
    rect(c, '#F4F7F8', 102, 66, 8, 22);
    rect(c, '#C0392B', 102, 74, 8, 4);
    rect(c, '#C0392B', 102, 82, 8, 3);
    rect(c, '#24324A', 101, 62, 10, 4);
    rect(c, '#F5B93A', 104, 63, 4, 2);
    bands(c, 100, SCENE_H, ['#3F6E8C', '#37627F', '#2F5673', '#284B66', '#213F58', '#1B344A'], SCENE_W);
    waves(c, 21, 104, '#8FB6CC', 40);
  },
};

const amazonRiver: ArtEntry = {
  w: SCENE_W,
  h: SCENE_H,
  draw: (c) => {
    bands(c, 0, 100, ['#B5E0C0', '#CBEAC8', '#E1F0CF'], SCENE_W);
    const r = deco(33);
    // far tree line
    for (let x = 0; x < SCENE_W; x += 5) {
      const h = 10 + Math.floor(r() * 12);
      rect(c, '#2F6B3A', x, 100 - h, 6, h);
    }
    rect(c, '#24552E', 0, 94, SCENE_W, 8);
    // river
    bands(c, 100, SCENE_H, ['#6E8F4E', '#5F8047', '#51733F', '#466736', '#3C5B2F', '#324F28'], SCENE_W);
    waves(c, 41, 106, '#9DBA6E', 36);
    // foreground banks and trunks
    rect(c, '#24552E', 0, 100, 14, 40);
    rect(c, '#24552E', 118, 100, 12, 34);
    rect(c, '#6B4423', 5, 60, 4, 50);
    rect(c, '#6B4423', 121, 50, 4, 56);
    rect(c, '#2F7A3E', -2, 52, 22, 12);
    rect(c, '#2F7A3E', 110, 44, 22, 12);
  },
};

const shopScene: ArtEntry = {
  w: SCENE_W,
  h: SCENE_H,
  draw: (c) => {
    bands(c, 0, 110, ['#FFD59A', '#FFE0AC', '#FFE9C0', '#FFF0D2'], SCENE_W);
    disc(c, '#FFF6DC', 100, 40, 7);
    rect(c, '#2F8AA0', 0, 104, SCENE_W, 26);
    waves(c, 51, 106, '#7FD0DC', 14);
    // boardwalk
    rect(c, '#8A5A3A', 0, 130, SCENE_W, SCENE_H - 130);
    for (let y = 130; y < SCENE_H; y += 9) rect(c, '#6B4423', 0, y, SCENE_W, 1);
    const r = deco(8);
    for (let i = 0; i < 40; i++) rect(c, '#6B4423', Math.floor(r() * SCENE_W), 131 + Math.floor(r() * (SCENE_H - 133)), 1, 8);
    rect(c, '#B07A4F', 0, 130, SCENE_W, 2);
  },
};

// ---------- UI sprites ----------
const stall: ArtEntry = {
  w: 90,
  h: 64,
  draw: (c) => {
    rect(c, '#3B4A66', 4, 14, 82, 26); // interior
    rect(c, '#24324A', 4, 14, 82, 3);
    for (let i = 0; i < 15; i++) rect(c, i % 2 ? '#FFF3D6' : '#E0663C', i * 6, 0, 6, 14); // awning
    for (let i = 0; i < 15; i++) rect(c, i % 2 ? '#FFF3D6' : '#E0663C', i * 6, 14, 6, 3);
    rect(c, '#6B4423', 2, 17, 3, 47);
    rect(c, '#6B4423', 85, 17, 3, 47);
    // hanging fish on a line
    rect(c, '#B07A4F', 10, 20, 70, 1);
    for (const x of [18, 38, 58]) {
      rect(c, '#9BC1D1', x, 21, 3, 8);
      rect(c, '#E8F0F2', x, 25, 3, 3);
    }
    rect(c, '#B07A4F', 0, 38, 90, 4); // counter top
    rect(c, '#8A5A3A', 2, 42, 86, 22);
    for (let x = 8; x < 88; x += 14) rect(c, '#6B4423', x, 44, 1, 18);
    rect(c, '#FFF3D6', 30, 48, 30, 10); // sign plate
    rect(c, '#24324A', 32, 50, 26, 6);
    rect(c, '#E0663C', 36, 52, 4, 2);
    rect(c, '#FFF3D6', 42, 52, 4, 2);
    rect(c, '#6BCB77', 48, 52, 4, 2);
  },
};

const customer = (shirt: string, hair: string): ArtEntry => ({
  w: 14,
  h: 24,
  draw: (c) => {
    rect(c, hair, 4, 1, 6, 3);
    rect(c, '#E8B58F', 4, 3, 6, 5);
    rect(c, '#111827', 5, 5, 1, 1);
    rect(c, '#111827', 8, 5, 1, 1);
    rect(c, shirt, 3, 8, 8, 8);
    rect(c, '#E8B58F', 1, 9, 2, 6);
    rect(c, '#E8B58F', 11, 9, 2, 6);
    rect(c, '#2B3550', 4, 16, 6, 6);
    rect(c, '#111827', 3, 22, 4, 2);
    rect(c, '#111827', 7, 22, 4, 2);
  },
});

const coin: ArtEntry = {
  w: 8,
  h: 8,
  draw: (c) =>
    grid(c, ['..RRRR..', '.RGGGGR.', 'RGGHHGGR', 'RGHGGGGR', 'RGHGGGGR', 'RGGGGGGR', '.RGGGGR.', '..RRRR..'], {
      R: '#B5791F',
      G: '#F5B93A',
      H: '#FFE08A',
    }),
};

const bobber: ArtEntry = {
  w: 6,
  h: 8,
  draw: (c) =>
    grid(c, ['..RR..', '.RRRR.', 'RRRRRR', 'RRRRRR', 'WWWWWW', 'WWWWWW', '.WWWW.', '..WW..'], { R: '#E0663C', W: '#FFF3D6' }),
};

const rod: ArtEntry = {
  w: 40,
  h: 56,
  draw: (c) => {
    // diagonal rod from bottom-right handle to top-left tip
    for (let i = 0; i <= 52; i++) {
      const x = 38 - Math.round(i * 0.69);
      const y = 54 - i;
      rect(c, i < 12 ? '#4B2E17' : '#8A5A3A', x, y, 2, 2);
    }
    rect(c, '#FFF3D6', 2, 0, 2, 2);
  },
};

export const ART: Record<string, ArtEntry> = {
  ...Object.fromEntries(Object.entries(FISH_PALETTES).map(([id, p]) => [fishArtId(id), fishEntry(p)])),
  'scene.coral_bay': coralBay,
  'scene.north_atlantic': northAtlantic,
  'scene.amazon_river': amazonRiver,
  'scene.shop': shopScene,
  'ui.stall': stall,
  'ui.customer_1': customer('#E0663C', '#4B2E17'),
  'ui.customer_2': customer('#5AA9E6', '#111827'),
  'ui.customer_3': customer('#6BCB77', '#B5791F'),
  'ui.coin': coin,
  'ui.bobber': bobber,
  'ui.rod': rod,
};

export const CUSTOMER_ART_IDS = ['ui.customer_1', 'ui.customer_2', 'ui.customer_3'];

/** Create a Phaser canvas texture for every manifest entry. */
export function registerArt(textures: Phaser.Textures.TextureManager): void {
  for (const [id, entry] of Object.entries(ART)) {
    if (textures.exists(id)) continue;
    const tex = textures.createCanvas(id, entry.w, entry.h);
    if (!tex) continue;
    entry.draw(tex.getContext());
    tex.refresh();
  }
}
