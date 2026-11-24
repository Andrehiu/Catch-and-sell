import { getSpecies } from '../data/fish';
import type { RegionId } from '../data/regions';
import type { GameConfig } from './config';
import { priceFor, type CaughtFish } from './fish';
import { COOLER_CAPACITY, createDefaultState, localDateKey, type GameState } from './state';

export interface Sale {
  fish: CaughtFish;
  price: number;
}

export interface CatchResult {
  added: boolean;
  newSpecies: boolean;
  newBest: boolean;
}

/** Core game rules: cooler, Fishdex, auto-sell, coins. No Phaser, no rendering. */
export class Game {
  state: GameState;
  private shopTimer = 0;
  private listeners: Array<() => void> = [];

  constructor(
    private readonly config: GameConfig,
    state?: GameState,
    private readonly clock: () => Date = () => new Date(),
  ) {
    this.state = state ?? createDefaultState(clock());
  }

  onChange(fn: () => void): void {
    this.listeners.push(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }

  get coolerCount(): number {
    return this.state.cooler.length;
  }

  get coolerFull(): boolean {
    return this.state.cooler.length >= COOLER_CAPACITY;
  }

  canCast(): boolean {
    return !this.coolerFull;
  }

  setRegion(region: RegionId): void {
    if (this.state.region === region) return;
    this.state.region = region;
    this.emit();
  }

  /** Put a caught fish in the cooler and record it in the Fishdex. */
  addCatch(fish: CaughtFish): CatchResult {
    if (this.coolerFull || !getSpecies(fish.speciesId)) return { added: false, newSpecies: false, newBest: false };
    this.state.cooler.push(fish);
    const prev = this.state.dex[fish.speciesId];
    const newSpecies = !prev;
    const newBest = !!prev && fish.sizeCm > prev.bestSizeCm;
    this.state.dex[fish.speciesId] = {
      count: (prev?.count ?? 0) + 1,
      bestSizeCm: Math.max(prev?.bestSizeCm ?? 0, fish.sizeCm),
    };
    this.emit();
    return { added: true, newSpecies, newBest };
  }

  /** Sell the oldest fish in the cooler. */
  sellOldest(): Sale | null {
    const fish = this.state.cooler.shift();
    if (!fish) return null;
    const price = priceFor(fish);
    this.state.coins += price;
    const key = localDateKey(this.clock());
    if (this.state.today.date !== key) this.state.today = { date: key, coins: 0 };
    this.state.today.coins += price;
    this.emit();
    return { fish, price };
  }

  /**
   * Advance the shop clock. Sells one fish per interval while the cooler has fish;
   * the timer only runs while there is something to sell.
   */
  tickShop(dtSec: number): Sale[] {
    const sales: Sale[] = [];
    if (this.state.cooler.length === 0) {
      this.shopTimer = 0;
      return sales;
    }
    this.shopTimer += dtSec;
    while (this.shopTimer >= this.config.sellIntervalSec && this.state.cooler.length > 0) {
      this.shopTimer -= this.config.sellIntervalSec;
      const sale = this.sellOldest();
      if (sale) sales.push(sale);
    }
    if (this.state.cooler.length === 0) this.shopTimer = 0;
    return sales;
  }

  /** Coins earned today (resets if the date rolled over). */
  todayCoins(): number {
    return this.state.today.date === localDateKey(this.clock()) ? this.state.today.coins : 0;
  }
}
