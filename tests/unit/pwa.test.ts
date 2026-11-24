import { describe, expect, it } from 'vitest';
import { cacheNameFor, isNewBuild, stampServiceWorker } from '../../src/pwa/build';

describe('pwa build helpers', () => {
  it('names the cache by build id', () => expect(cacheNameFor('abc123')).toBe('catchandsell-abc123'));
  it('detects a newer build', () => {
    expect(isNewBuild('abc', 'def')).toBe(true);
    expect(isNewBuild('abc', 'abc')).toBe(false);
    expect(isNewBuild('abc', undefined)).toBe(false);
    expect(isNewBuild('dev', 'def')).toBe(false);
  });
  it('stamps the service worker', () => {
    const out = stampServiceWorker("const B='__BUILD_ID__';const P=__PRECACHE__;", 'x1', ['./', 'a.js']);
    expect(out).toBe("const B='x1';const P=[\"./\",\"a.js\"];");
  });
});
