import { expect, test, type Page } from '@playwright/test';

const SHOT = 'docs/screenshots/v0.1';
const TAB_Y = 812;
const tabX = (i: number) => 48.75 + 97.5 * i;
const ACTION = { x: 195, y: 740 };

const state = (page: Page) => page.evaluate(() => (window as any).__debug.state());
const phase = (page: Page) => page.evaluate(() => (window as any).__debug.phase());
const waitPhase = (page: Page, p: string) => page.waitForFunction((x) => (window as any).__debug?.phase() === x, p);
const goTab = async (page: Page, i: number) => { await page.mouse.click(tabX(i), TAB_Y); };

async function catchOne(page: Page) {
  await page.mouse.click(ACTION.x, ACTION.y); // cast
  // debug mode can bite within 0.3 s, so 'waiting' may already be over: accept either, then make sure of the bite
  await page.waitForFunction(() => ['waiting', 'bite'].includes((window as any).__debug?.phase()));
  if ((await phase(page)) === 'waiting') await page.evaluate(() => (window as any).__debug.forceBite());
  await waitPhase(page, 'bite');
  // hook: a tap landing right after the cast tap can be swallowed by the button, so tap until it takes
  await expect(async () => {
    if ((await phase(page)) === 'bite') await page.mouse.click(ACTION.x, ACTION.y);
    expect(await phase(page)).toBe('reeling');
  }).toPass({ timeout: 10_000 });
  return;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?debug=1');
  await page.waitForFunction(() => !!(window as any).__debug);
});

test('tabs switch', async ({ page }) => {
  expect(await page.evaluate(() => (window as any).__debug.tab())).toBe('Fish');
  for (const [i, name] of ['Fish', 'Shop', 'Upgrades', 'Fishdex'].entries()) {
    await goTab(page, i);
    expect(await page.evaluate(() => (window as any).__debug.tab())).toBe(name);
  }
  await goTab(page, 2);
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${SHOT}/upgrades.png` });
});

test('catch, sell, persist', async ({ page }) => {
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOT}/fish-idle.png` });

  await catchOne(page);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${SHOT}/fish-reeling.png` });
  await page.evaluate(() => (window as any).__debug.forceCatch());
  await waitPhase(page, 'result');

  let s = await state(page);
  expect(s.cooler.length).toBe(1);
  expect(Object.keys(s.dex).length).toBe(1);
  const coinsBefore = s.coins;

  // catch two more so the shop has something to sell while we look at it
  for (let i = 0; i < 2; i++) {
    await catchOne(page);
    await page.evaluate(() => (window as any).__debug.forceCatch());
    await waitPhase(page, 'result');
  }

  await goTab(page, 1);
  await page.waitForFunction(() => (window as any).__debug.saleInFlight() > 0);
  await page.screenshot({ path: `${SHOT}/shop-mid-sale.png` });

  await page.waitForFunction(() => {
    const s = (window as any).__debug.state();
    return s.cooler.length === 0 && s.coins > 0;
  });
  s = await state(page);
  expect(s.coins).toBeGreaterThan(coinsBefore);
  expect(s.today.coins).toBe(s.coins);

  await goTab(page, 3);
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${SHOT}/fishdex.png` });

  const saved = await state(page);
  await page.reload();
  await page.waitForFunction(() => !!(window as any).__debug);
  const after = await state(page);
  expect(after.coins).toBe(saved.coins);
  expect(after.dex).toEqual(saved.dex);
  expect(Object.keys(after.dex).length).toBeGreaterThan(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('catchandsell.save.v1')!).version)).toBe(1);
});

test('cooler full disables Cast and hints at the shop; selling re-enables it', async ({ page }) => {
  await page.evaluate(() => (window as any).__debug.pauseShop(true));
  for (let i = 0; i < 10; i++) {
    await catchOne(page);
    await page.evaluate(() => (window as any).__debug.forceCatch());
    await waitPhase(page, 'result');
  }
  expect((await state(page)).cooler.length).toBe(10);
  const full = await page.evaluate(() => (window as any).__debug.hint());
  expect(full.castEnabled).toBe(false);
  expect(full.status).toContain('Shop');
  // clicking Cast does nothing
  await page.mouse.click(ACTION.x, ACTION.y);
  expect(await phase(page)).toBe('result');

  await page.evaluate(() => (window as any).__debug.pauseShop(false));
  await page.waitForFunction(() => (window as any).__debug.state().cooler.length < 10);
  await page.waitForFunction(() => (window as any).__debug.hint().castEnabled);
});

test('corrupt save falls back to a fresh game', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('catchandsell.save.v1', '{oops'));
  await page.reload();
  await page.waitForFunction(() => !!(window as any).__debug);
  const s = await state(page);
  expect(s.coins).toBe(0);
  expect(s.cooler).toEqual([]);
});
