import { expect, test } from '@playwright/test';

const BASE = 'http://127.0.0.1:4174/catch-and-sell/';

test('manifest is valid and icons load under the sub-path', async ({ page, request }) => {
  await page.goto(BASE);
  const href = await page.locator('link[rel=manifest]').getAttribute('href');
  const manifestUrl = new URL(href!, page.url()).href;
  const res = await request.get(manifestUrl);
  expect(res.status()).toBe(200);
  const m = await res.json();
  expect(m).toMatchObject({
    name: 'Catch & Sell', short_name: 'Catch & Sell', display: 'standalone', orientation: 'portrait',
    start_url: './', scope: './', background_color: '#24324A', theme_color: '#24324A',
  });
  expect(m.icons.length).toBeGreaterThanOrEqual(3);
  const iconUrls = [...m.icons.map((i: { src: string }) => new URL(i.src, manifestUrl).href)];
  for (const sel of ['link[rel=apple-touch-icon]', 'link[rel=icon]']) {
    iconUrls.push(new URL((await page.locator(sel).getAttribute('href'))!, page.url()).href);
  }
  for (const u of iconUrls) expect((await request.get(u)).status(), u).toBe(200);
  expect((await request.get(BASE + 'version.json')).status()).toBe(200);
});

test('service worker controls the page and the game works offline', async ({ page, context }) => {
  await page.goto(BASE);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null || navigator.serviceWorker.ready.then(() => true));
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // now controlled
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const cacheNames = await page.evaluate(() => caches.keys());
  expect(cacheNames.some((n) => n.startsWith('catchandsell-'))).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#game canvas')).toBeVisible();
  const box = await page.locator('#game canvas').boundingBox();
  expect(box!.width).toBeGreaterThan(100);
});
