import { FISH, speciesInRegion, type FishSpecies } from '../data/fish';
import { RARITIES, RARITY_ORDER, type RarityId } from '../data/rarities';
import type { RegionId } from '../data/regions';
import { pickOne, pickWeighted, type Rng } from './rng';

export function availableRarities(region: RegionId): Set<RarityId> {
  return new Set(speciesInRegion(region).map((f) => f.rarity));
}

/**
 * Roll-down rule: if the region has no fish of the rolled rarity, use the next
 * lower rarity it has. (If nothing lower exists, fall back upward.)
 */
export function resolveRarity(rolled: RarityId, available: ReadonlySet<RarityId>): RarityId {
  const idx = RARITY_ORDER.indexOf(rolled);
  for (let i = idx; i >= 0; i--) if (available.has(RARITY_ORDER[i])) return RARITY_ORDER[i];
  for (let i = idx + 1; i < RARITY_ORDER.length; i++) if (available.has(RARITY_ORDER[i])) return RARITY_ORDER[i];
  throw new Error('No rarities available');
}

export function rollRarity(rng: Rng, available: ReadonlySet<RarityId>): RarityId {
  const rolled = pickWeighted(rng, RARITIES, (r) => r.weight).id;
  return resolveRarity(rolled, available);
}

export function rollSpecies(rng: Rng, region: RegionId): FishSpecies {
  const rarity = rollRarity(rng, availableRarities(region));
  const pool = FISH.filter((f) => f.region === region && f.rarity === rarity);
  return pickOne(rng, pool);
}
