export interface GameConfig {
  debug: boolean;
  sellIntervalSec: number;
  biteWaitMinSec: number;
  biteWaitMaxSec: number;
  biteWindowSec: number;
}

export function isDebug(search: string): boolean {
  return new URLSearchParams(search).get('debug') === '1';
}

export function makeConfig(debug: boolean): GameConfig {
  if (debug) {
    // Short timers so e2e tests run fast. Longer bite window avoids flaky misses.
    return { debug, sellIntervalSec: 0.5, biteWaitMinSec: 0.05, biteWaitMaxSec: 0.3, biteWindowSec: 5 };
  }
  return { debug, sellIntervalSec: 4, biteWaitMinSec: 2, biteWaitMaxSec: 6, biteWindowSec: 1.2 };
}
