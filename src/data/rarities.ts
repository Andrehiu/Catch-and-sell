export type RarityId = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface ReelDifficulty {
  /** Width of the green zone as a fraction of the track (0..1). */
  zoneWidth: number;
  /** How strongly the needle wobbles by itself. */
  wobble: number;
  /** How far the green zone drifts left/right (fraction of the track). */
  zoneDrift: number;
}

export interface RarityDef {
  id: RarityId;
  label: string;
  /** Base chance in percent; all weights sum to 100. */
  weight: number;
  priceMin: number;
  priceMax: number;
  reel: ReelDifficulty;
}

/** Ordered from lowest to highest rarity. */
export const RARITIES: readonly RarityDef[] = [
  { id: 'common', label: 'Common', weight: 60, priceMin: 8, priceMax: 20, reel: { zoneWidth: 0.4, wobble: 0.5, zoneDrift: 0 } },
  { id: 'uncommon', label: 'Uncommon', weight: 25, priceMin: 30, priceMax: 60, reel: { zoneWidth: 0.34, wobble: 0.8, zoneDrift: 0.05 } },
  { id: 'rare', label: 'Rare', weight: 10, priceMin: 100, priceMax: 180, reel: { zoneWidth: 0.28, wobble: 1.2, zoneDrift: 0.1 } },
  { id: 'epic', label: 'Epic', weight: 4, priceMin: 350, priceMax: 600, reel: { zoneWidth: 0.22, wobble: 1.8, zoneDrift: 0.15 } },
  { id: 'legendary', label: 'Legendary', weight: 1, priceMin: 1200, priceMax: 2000, reel: { zoneWidth: 0.18, wobble: 2.4, zoneDrift: 0.2 } },
];

export const RARITY_ORDER: readonly RarityId[] = RARITIES.map((r) => r.id);

export function getRarity(id: RarityId): RarityDef {
  const r = RARITIES.find((x) => x.id === id);
  if (!r) throw new Error(`Unknown rarity ${id}`);
  return r;
}
