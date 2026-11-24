import { describe, expect, it } from 'vitest';
import { FISH } from '../../src/data/fish';
import { RARITIES, RARITY_ORDER, type RarityId } from '../../src/data/rarities';
import { makeConfig } from '../../src/game/config';
import { priceFor, rollCatch, rollSize } from '../../src/game/fish';
import { FishingSession, REEL } from '../../src/game/fishing';
import { Game } from '../../src/game/game';
import { availableRarities, resolveRarity, rollRarity } from '../../src/game/rarity';
import { mulberry32 } from '../../src/game/rng';
import { SAVE_KEY, loadState, parseSave, saveState, serializeState } from '../../src/game/save';
import { COOLER_CAPACITY, createDefaultState } from '../../src/game/state';

const cfg = makeConfig(false);
const NOON = new Date(2026, 5, 1, 12, 0, 0);

describe('rarity rolls', () => {
  it('10k rolls match the base weights within ±2 percentage points', () => {
    const rng = mulberry32(12345);
    const all = new Set<RarityId>(RARITY_ORDER);
    const n = 10_000;
    const counts: Record<string, number> = {};
    for (let i = 0; i < n; i++) {
      const r = rollRarity(rng, all);
      counts[r] = (counts[r] ?? 0) + 1;
    }
    for (const r of RARITIES) {
      const pct = ((counts[r.id] ?? 0) / n) * 100;
      expect(Math.abs(pct - r.weight)).toBeLessThanOrEqual(2);
    }
  });

  it('weights sum to 100', () => {
    expect(RARITIES.reduce((s, r) => s + r.weight, 0)).toBe(100);
  });

  it('rolls down to the next lower rarity the region has', () => {
    const amazon = availableRarities('amazon_river'); // common + epic
    expect(resolveRarity('uncommon', amazon)).toBe('common');
    expect(resolveRarity('rare', amazon)).toBe('common');
    expect(resolveRarity('epic', amazon)).toBe('epic');
    expect(resolveRarity('legendary', amazon)).toBe('epic');
    const coral = availableRarities('coral_bay'); // common, uncommon, rare
    expect(resolveRarity('epic', coral)).toBe('rare');
    expect(resolveRarity('legendary', coral)).toBe('rare');
  });

  it('regional rolls only produce species of that region', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 500; i++) {
      const c = rollCatch(rng, 'amazon_river');
      expect(FISH.find((f) => f.id === c.speciesId)?.region).toBe('amazon_river');
    }
  });

  it('amazon: ~95% common / ~5% epic after roll-down', () => {
    const rng = mulberry32(99);
    let epic = 0;
    const n = 10_000;
    for (let i = 0; i < n; i++) if (rollCatch(rng, 'amazon_river').speciesId === 'arapaima') epic++;
    expect(Math.abs((epic / n) * 100 - 5)).toBeLessThanOrEqual(2);
  });
});

describe('size and price', () => {
  it('size is within ±20% of average', () => {
    const rng = mulberry32(1);
    for (const sp of FISH) {
      for (let i = 0; i < 200; i++) {
        const s = rollSize(rng, sp.avgSizeCm);
        expect(s).toBeGreaterThanOrEqual(sp.avgSizeCm * 0.8 - 0.05);
        expect(s).toBeLessThanOrEqual(sp.avgSizeCm * 1.2 + 0.05);
      }
    }
  });

  it('price = base × size factor, rounded', () => {
    expect(priceFor({ speciesId: 'atlantic_cod', sizeCm: 80 })).toBe(50);
    expect(priceFor({ speciesId: 'atlantic_cod', sizeCm: 64 })).toBe(40);
    expect(priceFor({ speciesId: 'atlantic_cod', sizeCm: 96 })).toBe(60);
  });

  it('prices at ±20% size stay inside the rarity price range', () => {
    for (const sp of FISH) {
      const r = RARITIES.find((x) => x.id === sp.rarity)!;
      const lo = priceFor({ speciesId: sp.id, sizeCm: sp.avgSizeCm * 0.8 });
      const hi = priceFor({ speciesId: sp.id, sizeCm: sp.avgSizeCm * 1.2 });
      expect(lo).toBeGreaterThanOrEqual(r.priceMin);
      expect(hi).toBeLessThanOrEqual(r.priceMax);
    }
  });

  it('has the 8 fish across 3 regions from the design doc', () => {
    expect(FISH).toHaveLength(8);
    expect(new Set(FISH.map((f) => f.region)).size).toBe(3);
  });
});

describe('cooler and auto-sell', () => {
  const fish = (id: string, sizeCm: number) => ({ speciesId: id, sizeCm });

  it('cooler holds 10; the 11th is refused and Cast is disabled', () => {
    const g = new Game(cfg, createDefaultState(NOON), () => NOON);
    for (let i = 0; i < COOLER_CAPACITY; i++) expect(g.addCatch(fish('yellowstripe_scad', 20)).added).toBe(true);
    expect(g.coolerFull).toBe(true);
    expect(g.canCast()).toBe(false);
    expect(g.addCatch(fish('yellowstripe_scad', 20)).added).toBe(false);
    expect(g.coolerCount).toBe(10);
  });

  it('sells the oldest fish first, every 4 s, and totals coins', () => {
    const g = new Game(cfg, createDefaultState(NOON), () => NOON);
    g.addCatch(fish('atlantic_cod', 80)); // 50
    g.addCatch(fish('yellowstripe_scad', 20)); // 10
    g.addCatch(fish('arapaima', 200)); // 475
    expect(g.tickShop(3.9)).toHaveLength(0);
    const s1 = g.tickShop(0.2);
    expect(s1.map((s) => s.fish.speciesId)).toEqual(['atlantic_cod']);
    expect(g.state.coins).toBe(50);
    const s2 = g.tickShop(8);
    expect(s2.map((s) => s.fish.speciesId)).toEqual(['yellowstripe_scad', 'arapaima']);
    expect(g.state.coins).toBe(535);
    expect(g.todayCoins()).toBe(535);
    expect(g.coolerCount).toBe(0);
  });

  it('debug config sells every 0.5 s', () => {
    const g = new Game(makeConfig(true), createDefaultState(NOON), () => NOON);
    g.addCatch(fish('yellowstripe_scad', 20));
    g.addCatch(fish('yellowstripe_scad', 20));
    expect(g.tickShop(0.5)).toHaveLength(1);
    expect(g.tickShop(0.5)).toHaveLength(1);
  });

  it('timer does not bank time while the cooler is empty', () => {
    const g = new Game(cfg, createDefaultState(NOON), () => NOON);
    g.tickShop(100);
    g.addCatch(fish('yellowstripe_scad', 20));
    expect(g.tickShop(1)).toHaveLength(0);
  });

  it("today's total resets on a new day", () => {
    let now = NOON;
    const g = new Game(cfg, createDefaultState(now), () => now);
    g.addCatch(fish('yellowstripe_scad', 20));
    g.sellOldest();
    expect(g.todayCoins()).toBe(10);
    now = new Date(2026, 5, 2, 9, 0, 0);
    expect(g.todayCoins()).toBe(0);
    g.addCatch(fish('yellowstripe_scad', 20));
    g.sellOldest();
    expect(g.todayCoins()).toBe(10);
    expect(g.state.coins).toBe(20);
  });

  it('Fishdex tracks count, best size, and new species', () => {
    const g = new Game(cfg, createDefaultState(NOON), () => NOON);
    expect(g.addCatch(fish('arapaima', 180)).newSpecies).toBe(true);
    const r = g.addCatch(fish('arapaima', 210));
    expect(r.newSpecies).toBe(false);
    expect(r.newBest).toBe(true);
    expect(g.state.dex.arapaima).toEqual({ count: 2, bestSizeCm: 210 });
  });
});

describe('save / load', () => {
  const mem = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
  };

  it('round-trips', () => {
    const g = new Game(cfg, createDefaultState(NOON), () => NOON);
    g.addCatch({ speciesId: 'atlantic_salmon', sizeCm: 70 });
    g.addCatch({ speciesId: 'arapaima', sizeCm: 190 });
    g.sellOldest();
    g.setRegion('amazon_river');
    const store = mem();
    expect(saveState(store, g.state)).toBe(true);
    expect(store.m.has(SAVE_KEY)).toBe(true);
    expect(SAVE_KEY).toBe('catchandsell.save.v1');
    const loaded = loadState(store, NOON);
    expect(loaded).toEqual(g.state);
    expect(JSON.parse(serializeState(loaded)).version).toBe(1);
  });

  it('falls back to a fresh state on missing or corrupt data', () => {
    const fresh = createDefaultState(NOON);
    expect(parseSave(null, NOON)).toEqual(fresh);
    expect(parseSave('{not json', NOON)).toEqual(fresh);
    expect(parseSave('42', NOON)).toEqual(fresh);
    expect(parseSave('[]', NOON)).toEqual(fresh);
    expect(parseSave(JSON.stringify({ version: 99, coins: 5 }), NOON)).toEqual(fresh);
  });

  it('repairs bad fields instead of crashing', () => {
    const s = parseSave(
      JSON.stringify({
        version: 1,
        coins: 'lots',
        cooler: [{ speciesId: 'nope', sizeCm: 3 }, { speciesId: 'arapaima', sizeCm: 190 }, 5],
        dex: { arapaima: { count: 2, bestSizeCm: 200 }, ghost: { count: 1, bestSizeCm: 1 } },
        region: 'moon',
      }),
      NOON,
    );
    expect(s.coins).toBe(0);
    expect(s.cooler).toEqual([{ speciesId: 'arapaima', sizeCm: 190 }]);
    expect(Object.keys(s.dex)).toEqual(['arapaima']);
    expect(s.region).toBe('coral_bay');
  });

  it('survives storage that throws', () => {
    const bad = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); } };
    expect(loadState(bad, NOON)).toEqual(createDefaultState(NOON));
    expect(saveState(bad, createDefaultState(NOON))).toBe(false);
  });
});

describe('fishing session', () => {
  const setup = (seed: number, speciesId = 'yellowstripe_scad') => {
    const rng = mulberry32(seed);
    return new FishingSession(rng, cfg, () => ({ speciesId, sizeCm: 20 }));
  };

  it('cast → wait 2–6 s → bite → 1.2 s window', () => {
    const s = setup(3);
    expect(s.cast()).toBe(true);
    expect(s.update(1.9, false)).toBeNull();
    expect(s.phase).toBe('waiting');
    expect(s.update(4.2, false)).toBe('bite');
    expect(s.update(1.1, false)).toBeNull();
    expect(s.update(0.2, false)).toBe('missed');
    expect(s.outcome).toBe('missed');
    expect(s.canCast).toBe(true);
  });

  it('a hold-when-left-of-zone bot catches a common fish; never-holding loses', () => {
    const play = (bot: boolean) => {
      const s = setup(5);
      s.cast();
      s.forceBite();
      s.hook();
      for (let i = 0; i < 60 * 60 && s.phase === 'reeling'; i++) {
        s.update(1 / 60, bot && s.needle < s.zoneCenter);
      }
      return s.outcome;
    };
    expect(play(true)).toBe('caught');
    expect(play(false)).toBe('lost');
  });

  it('a bot can also catch the hardest rarity (difficulty is fair)', () => {
    let caught = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const s = setup(seed, 'arapaima');
      s.cast();
      s.forceBite();
      s.hook();
      for (let i = 0; i < 60 * 120 && s.phase === 'reeling'; i++) s.update(1 / 60, s.needle < s.zoneCenter);
      if (s.outcome === 'caught') caught++;
    }
    expect(caught).toBeGreaterThanOrEqual(15);
    expect(REEL.fill).toBeGreaterThan(REEL.drain);
  });
});
