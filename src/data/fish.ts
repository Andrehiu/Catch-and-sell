import type { RarityId } from './rarities';
import type { RegionId } from './regions';

export interface FishSpecies {
  id: string;
  name: string;
  region: RegionId;
  rarity: RarityId;
  /** Average length in cm; each catch is ±20%. */
  avgSizeCm: number;
  /**
   * Sell price at average size. Chosen so that base × 0.8 .. base × 1.2
   * stays inside the rarity's price range from the design doc.
   */
  basePrice: number;
}

export const FISH: readonly FishSpecies[] = [
  { id: 'yellowstripe_scad', name: 'Yellowstripe Scad', region: 'coral_bay', rarity: 'common', avgSizeCm: 20, basePrice: 10 },
  { id: 'mangrove_jack', name: 'Mangrove Jack', region: 'coral_bay', rarity: 'uncommon', avgSizeCm: 50, basePrice: 40 },
  { id: 'giant_trevally', name: 'Giant Trevally', region: 'coral_bay', rarity: 'rare', avgSizeCm: 90, basePrice: 150 },
  { id: 'atlantic_mackerel', name: 'Atlantic Mackerel', region: 'north_atlantic', rarity: 'common', avgSizeCm: 35, basePrice: 12 },
  { id: 'atlantic_cod', name: 'Atlantic Cod', region: 'north_atlantic', rarity: 'uncommon', avgSizeCm: 80, basePrice: 50 },
  { id: 'atlantic_salmon', name: 'Atlantic Salmon', region: 'north_atlantic', rarity: 'rare', avgSizeCm: 75, basePrice: 130 },
  { id: 'red_bellied_piranha', name: 'Red-bellied Piranha', region: 'amazon_river', rarity: 'common', avgSizeCm: 25, basePrice: 14 },
  { id: 'arapaima', name: 'Arapaima', region: 'amazon_river', rarity: 'epic', avgSizeCm: 200, basePrice: 475 },
];

export function getSpecies(id: string): FishSpecies | undefined {
  return FISH.find((f) => f.id === id);
}

export function speciesInRegion(region: RegionId): FishSpecies[] {
  return FISH.filter((f) => f.region === region);
}
