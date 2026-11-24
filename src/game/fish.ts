import { getSpecies } from '../data/fish';
import type { RegionId } from '../data/regions';
import { rollSpecies } from './rarity';
import { randRange, type Rng } from './rng';

export interface CaughtFish {
  speciesId: string;
  sizeCm: number;
}

export const SIZE_VARIATION = 0.2;

export function rollSize(rng: Rng, avgCm: number): number {
  const factor = randRange(rng, 1 - SIZE_VARIATION, 1 + SIZE_VARIATION);
  return Math.round(avgCm * factor * 10) / 10;
}

export function rollCatch(rng: Rng, region: RegionId): CaughtFish {
  const species = rollSpecies(rng, region);
  return { speciesId: species.id, sizeCm: rollSize(rng, species.avgSizeCm) };
}

export function sizeFactor(fish: CaughtFish): number {
  const sp = getSpecies(fish.speciesId);
  return sp ? fish.sizeCm / sp.avgSizeCm : 1;
}

/** Sell price = base price × size factor, rounded. */
export function priceFor(fish: CaughtFish): number {
  const sp = getSpecies(fish.speciesId);
  if (!sp) return 0;
  return Math.round(sp.basePrice * sizeFactor(fish));
}
