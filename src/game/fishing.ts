import { getSpecies } from '../data/fish';
import { getRarity } from '../data/rarities';
import type { GameConfig } from './config';
import type { CaughtFish } from './fish';
import { randRange, type Rng } from './rng';

export type FishingPhase = 'idle' | 'waiting' | 'bite' | 'reeling' | 'result';
export type FishingOutcome = 'caught' | 'lost' | 'missed';
export type FishingEvent = 'bite' | 'hooked' | 'caught' | 'lost' | 'missed';

export const REEL = {
  push: 1.1, // needle speed (track/s) while holding
  drift: 0.8, // needle speed to the left while released
  fill: 0.25, // catch meter per second while in the green
  drain: 0.12, // catch meter per second while outside
  startMeter: 0.35,
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
  meter = 0;
  zoneCenter = 0.5;
  zoneWidth = 0.4;

  private waitLeft = 0;
  private biteLeft = 0;
  private reelTime = 0;
  private wobble = 0;
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

  /** Tap on the bite → fish is rolled and the reel mini-game starts. */
  hook(): boolean {
    if (this.phase !== 'bite') return false;
    this.fish = this.rollFish();
    const sp = getSpecies(this.fish.speciesId);
    const diff = getRarity(sp ? sp.rarity : 'common').reel;
    this.zoneWidth = diff.zoneWidth;
    this.wobble = diff.wobble;
    this.zoneDrift = diff.zoneDrift;
    this.phaseA = this.rng() * Math.PI * 2;
    this.phaseB = this.rng() * Math.PI * 2;
    this.reelTime = 0;
    this.needle = 0.5;
    this.meter = REEL.startMeter;
    this.zoneCenter = 0.5;
    this.phase = 'reeling';
    return true;
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
    this.reelTime += dt;
    const t = this.reelTime;
    const disturbance = this.wobble * 0.25 * (Math.sin(t * 2.1 + this.phaseA) + Math.sin(t * 3.7 + this.phaseB)) * 0.5;
    this.needle += ((holding ? REEL.push : -REEL.drift) + disturbance) * dt;
    this.needle = Math.min(1, Math.max(0, this.needle));

    const half = this.zoneWidth / 2;
    this.zoneCenter = Math.min(1 - half, Math.max(half, 0.5 + this.zoneDrift * Math.sin(t * 1.1 + this.phaseA)));
    const inZone = Math.abs(this.needle - this.zoneCenter) <= half;
    this.meter += (inZone ? REEL.fill : -REEL.drain) * dt;

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
