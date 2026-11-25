import { getSpecies } from '../data/fish';
import { getRarity, type RarityId } from '../data/rarities';
import type { GameConfig } from './config';
import type { CaughtFish } from './fish';
import { randRange, type Rng } from './rng';

export type FishingPhase = 'idle' | 'waiting' | 'bite' | 'reeling' | 'result';
export type FishingOutcome = 'caught' | 'lost' | 'missed';
export type FishingEvent = 'bite' | 'hooked' | 'caught' | 'lost' | 'missed';

/** All reel-feel numbers live here (rarity-specific ones: `reel` in src/data/rarities.ts). */
export const REEL = {
  accel: 4, // needle acceleration (track/s²) while holding
  fall: 3.5, // needle acceleration to the left while released
  maxUp: 0.5, // top speed to the right (track/s)
  maxDown: 0.37, // top speed to the left (track/s)
  wobbleAccel: 0.3, // wobble strength multiplier (× rarity wobble) as acceleration
  drainRatio: 0.75, // catch meter drains at this fraction of the fill rate
  startMeter: 0.4,
  surgeMin: 1.0, // seconds between random fish surges (min..max)
  surgeMax: 2.5,
  surgeKick: 0.2, // surge size: velocity kick = ±(rarity wobble × this) track/s
  widthJitter: 0.2, // each hooked fish has its green zone ±this fraction wider/narrower
  graceSec: 0.8, // after hooking: needle and meter frozen, holding ignored
};

/**
 * The cast → wait → bite → reel state machine. Pure logic: the scene feeds it
 * time and the "holding" flag, and draws whatever it reports.
 */
export class FishingSession {
  phase: FishingPhase = 'idle';
  outcome: FishingOutcome | null = null;
  fish: CaughtFish | null = null;

  // reel state (0..1 along the track)
  needle = 0.5;
  velocity = 0;
  meter = 0;
  /** Rarity wobble strength; public so tests can switch it off. */
  wobble = 0;
  private fillRate = 0.13;
  zoneCenter = 0.5;
  zoneWidth = 0.4;

  private waitLeft = 0;
  private biteLeft = 0;
  private reelTime = 0;
  private surgeLeft = 0;
  private zoneDrift = 0;
  private phaseA = 0;
  private phaseB = 0;

  constructor(
    private readonly rng: Rng,
    private readonly config: GameConfig,
    private readonly rollFish: () => CaughtFish,
  ) {}

  get canCast(): boolean {
    return this.phase === 'idle' || this.phase === 'result';
  }

  cast(): boolean {
    if (!this.canCast) return false;
    this.phase = 'waiting';
    this.outcome = null;
    this.fish = null;
    this.waitLeft = randRange(this.rng, this.config.biteWaitMinSec, this.config.biteWaitMaxSec);
    return true;
  }

  /** Tap on the bite (the optional rarity is for tests: no legendary species exists yet) → fish is rolled and the reel mini-game starts. */
  hook(rarityOverride?: RarityId): boolean {
    if (this.phase !== 'bite') return false;
    this.fish = this.rollFish();
    const sp = getSpecies(this.fish.speciesId);
    const diff = getRarity(rarityOverride ?? (sp ? sp.rarity : 'common')).reel;
    this.zoneWidth = diff.zoneWidth * (1 + (this.rng() * 2 - 1) * REEL.widthJitter);
    this.wobble = diff.wobble;
    this.fillRate = (1 - REEL.startMeter) / diff.landSec;
    this.velocity = 0;
    this.zoneDrift = diff.zoneDrift;
    this.phaseA = this.rng() * Math.PI * 2;
    this.phaseB = this.rng() * Math.PI * 2;
    this.reelTime = 0;
    this.surgeLeft = randRange(this.rng, REEL.surgeMin, REEL.surgeMax);
    this.needle = 0.5;
    this.meter = REEL.startMeter;
    this.zoneCenter = 0.5;
    this.phase = 'reeling';
    return true;
  }

  /** True during the first moments of reeling (needle frozen, holding ignored). */
  get inGrace(): boolean {
    return this.phase === 'reeling' && this.reelTime < REEL.graceSec;
  }

  update(dt: number, holding: boolean): FishingEvent | null {
    switch (this.phase) {
      case 'waiting':
        this.waitLeft -= dt;
        if (this.waitLeft <= 0) return this.startBite();
        return null;
      case 'bite':
        this.biteLeft -= dt;
        if (this.biteLeft <= 0) {
          this.finish('missed');
          return 'missed';
        }
        return null;
      case 'reeling':
        return this.reel(dt, holding);
      default:
        return null;
    }
  }

  private startBite(): FishingEvent {
    this.phase = 'bite';
    this.biteLeft = this.config.biteWindowSec;
    return 'bite';
  }

  private reel(dt: number, holding: boolean): FishingEvent | null {
    const wasGrace = this.reelTime < REEL.graceSec;
    this.reelTime += dt;
    const t = this.reelTime;
    const half = this.zoneWidth / 2;
    this.zoneCenter = Math.min(1 - half, Math.max(half, 0.5 + this.zoneDrift * (Math.sin(t * 1.1 + this.phaseA) + 0.6 * Math.sin(t * 2.3 + this.phaseB)) / 1.6));
    if (wasGrace) return null; // grace: nothing moves except the zone, holding is ignored

    const disturbance = this.wobble * REEL.wobbleAccel * (Math.sin(t * 2.1 + this.phaseA) + Math.sin(t * 3.7 + this.phaseB)) * 0.5;
    this.surgeLeft -= dt;
    if (this.surgeLeft <= 0) {
      this.surgeLeft = randRange(this.rng, REEL.surgeMin, REEL.surgeMax);
      this.velocity += (this.rng() * 2 - 1) * this.wobble * REEL.surgeKick;
    }
    this.velocity += ((holding ? REEL.accel : -REEL.fall) + disturbance) * dt;
    this.velocity = Math.min(REEL.maxUp, Math.max(-REEL.maxDown, this.velocity));
    this.needle += this.velocity * dt;
    if (this.needle >= 1 || this.needle <= 0) {
      this.needle = Math.min(1, Math.max(0, this.needle));
      this.velocity = 0;
    }

    const inZone = Math.abs(this.needle - this.zoneCenter) <= half;
    this.meter += (inZone ? this.fillRate : -this.fillRate * REEL.drainRatio) * dt;

    if (this.meter >= 1) {
      this.meter = 1;
      this.finish('caught');
      return 'caught';
    }
    if (this.meter <= 0) {
      this.meter = 0;
      this.finish('lost');
      return 'lost';
    }
    return null;
  }

  private finish(outcome: FishingOutcome): void {
    this.phase = 'result';
    this.outcome = outcome;
  }

  // ---- debug helpers (used only when ?debug=1) ----
  forceBite(): boolean {
    if (this.phase !== 'waiting') return false;
    this.startBite();
    return true;
  }

  forceCatch(): boolean {
    if (this.phase !== 'reeling') return false;
    this.meter = 1;
    this.finish('caught');
    return true;
  }
}
