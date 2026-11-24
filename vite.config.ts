import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { stampServiceWorker } from './src/pwa/build';

function gitBuildId(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 8);
  try {
    return execSync('git rev-parse --short=8 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return Date.now().toString(36);
  }
}

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));

/** Writes dist/version.json and stamps the build id + precache list into dist/sw.js. */
function pwaStamp(buildId: string): Plugin {
  let outDir = 'dist';
  return {
    name: 'pwa-stamp',
    apply: 'build',
    configResolved: (c) => { outDir = c.build.outDir; },
    closeBundle() {
      const files = walk(outDir)
        .map((f) => relative(outDir, f).split('\\').join('/'))
        .filter((f) => f !== 'sw.js' && f !== 'version.json');
      const urls = ['./', ...files];
      writeFileSync(join(outDir, 'version.json'), JSON.stringify({ build: buildId }));
      const sw = join(outDir, 'sw.js');
      writeFileSync(sw, stampServiceWorker(readFileSync(sw, 'utf8'), buildId, urls));
    },
  };
}

export default defineConfig(({ command }) => {
  const buildId = command === 'build' ? gitBuildId() : 'dev';
  return {
    base: './',
    define: { __BUILD_ID__: JSON.stringify(buildId) },
    plugins: [pwaStamp(buildId)],
    build: { chunkSizeWarningLimit: 2000 },
    server: { host: '127.0.0.1', port: 5173 },
  };
});
