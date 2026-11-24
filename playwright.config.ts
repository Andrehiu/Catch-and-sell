import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: false,
  },
  webServer: [
    {
      command: 'npx vite --host 127.0.0.1 --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: true,
    },
    {
      // production build served under the GitHub Pages sub-path (used by tests/e2e/pwa.spec.ts)
      command: 'npm run build && npx vite preview --host 127.0.0.1 --port 4174 --strictPort --base /catch-and-sell/',
      url: 'http://127.0.0.1:4174/catch-and-sell/',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
