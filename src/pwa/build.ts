/** Pure helpers for build ids / versions (unit-tested). */
export const CACHE_PREFIX = 'catchandsell-';

export function cacheNameFor(buildId: string): string {
  return CACHE_PREFIX + buildId;
}

/** True when the server reports a build id different from the running one. Dev/unknown builds never prompt. */
export function isNewBuild(current: string, remote: unknown): boolean {
  if (!current || current === 'dev') return false;
  return typeof remote === 'string' && remote.length > 0 && remote !== current;
}

/** Replace the build-time placeholders in the service worker source. */
export function stampServiceWorker(src: string, buildId: string, files: string[]): string {
  return src.replace('__BUILD_ID__', buildId).replace('__PRECACHE__', JSON.stringify(files));
}
