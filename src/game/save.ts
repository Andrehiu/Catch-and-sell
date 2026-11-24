import { getSpecies } from '../data/fish';
import { isRegionId } from '../data/regions';
import type { CaughtFish } from './fish';
import { COOLER_CAPACITY, SAVE_VERSION, createDefaultState, type DexEntry, type GameState } from './state';

export const SAVE_KEY = 'catchandsell.save.v1';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function serializeState(state: GameState): string {
  return JSON.stringify(state);
}

/** Parse a save string. Any problem → a fresh default state (never throws). */
export function parseSave(raw: string | null, now: Date = new Date()): GameState {
  const fresh = createDefaultState(now);
  if (!raw) return fresh;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return fresh;
  }
  if (!isObj(data) || data.version !== SAVE_VERSION) return fresh;

  const cooler: CaughtFish[] = [];
  if (Array.isArray(data.cooler)) {
    for (const f of data.cooler) {
      if (isObj(f) && typeof f.speciesId === 'string' && getSpecies(f.speciesId) && isNum(f.sizeCm) && f.sizeCm > 0) {
        if (cooler.length < COOLER_CAPACITY) cooler.push({ speciesId: f.speciesId, sizeCm: f.sizeCm });
      }
    }
  }

  const dex: Record<string, DexEntry> = {};
  if (isObj(data.dex)) {
    for (const [id, e] of Object.entries(data.dex)) {
      if (getSpecies(id) && isObj(e) && isNum(e.count) && e.count > 0 && isNum(e.bestSizeCm)) {
        dex[id] = { count: Math.floor(e.count), bestSizeCm: e.bestSizeCm };
      }
    }
  }

  const today = isObj(data.today) && typeof data.today.date === 'string' && isNum(data.today.coins)
    ? { date: data.today.date, coins: Math.max(0, Math.floor(data.today.coins)) }
    : fresh.today;

  return {
    version: SAVE_VERSION,
    coins: isNum(data.coins) && data.coins >= 0 ? Math.floor(data.coins) : 0,
    cooler,
    dex,
    region: isRegionId(data.region) ? data.region : fresh.region,
    today,
    upgrades: isObj(data.upgrades) ? (data.upgrades as Record<string, number>) : {},
    settings: isObj(data.settings) ? data.settings : {},
  };
}

export function loadState(storage: StorageLike | null, now: Date = new Date()): GameState {
  try {
    return parseSave(storage ? storage.getItem(SAVE_KEY) : null, now);
  } catch {
    return createDefaultState(now);
  }
}

export function saveState(storage: StorageLike | null, state: GameState): boolean {
  try {
    storage?.setItem(SAVE_KEY, serializeState(state));
    return !!storage;
  } catch {
    return false;
  }
}
