import { DEFAULT_REGION, type RegionId } from '../data/regions';
import type { CaughtFish } from './fish';

export const COOLER_CAPACITY = 10;
export const SAVE_VERSION = 1;

export interface DexEntry {
  count: number;
  bestSizeCm: number;
}

export interface GameState {
  version: number;
  coins: number;
  cooler: CaughtFish[];
  dex: Record<string, DexEntry>;
  region: RegionId;
  /** Coins earned on the given local calendar day. */
  today: { date: string; coins: number };
  /** Reserved for v0.2 upgrades. */
  upgrades: Record<string, number>;
  settings: Record<string, unknown>;
}

export function localDateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function createDefaultState(now: Date = new Date()): GameState {
  return {
    version: SAVE_VERSION,
    coins: 0,
    cooler: [],
    dex: {},
    region: DEFAULT_REGION,
    today: { date: localDateKey(now), coins: 0 },
    upgrades: {},
    settings: {},
  };
}
