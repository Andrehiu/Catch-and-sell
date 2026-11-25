import { expect, test, type Page } from '@playwright/test';

const SHOT = 'docs/screenshots/v0.1';
const SHOT2 = 'docs/screenshots/v0.1.2';
const KEEP = { x: 195, y: 56 + 70 + 318 }; // 'Keep fishing' button centre
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

/** Force the catch and close the card the quick way (debug), so loops can cast again. */
async function landAndClose(page: Page) {
  await page.evaluate(() => (window as any).__debug.forceCatch());
  await waitPhase(page, 'result');
  await page.evaluate(() => (window as any).__debug.dismissCard());
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
  await page.evaluate(() => (window as any).__debug.dismissCard());

  let s = await state(page);
  expect(s.cooler.length).toBe(1);
  expect(Object.keys(s.dex).length).toBe(1);
  const coinsBefore = s.coins;

  // catch two more so the shop has something to sell while we look at it
  for (let i = 0; i < 2; i++) {
    await catchOne(page);
    await landAndClose(page);
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
    await landAndClose(page);
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

const hint = (page: Page) => page.evaluate(() => (window as any).__debug.hint());

test('catch card stays readable, then Keep fishing closes it', async ({ page }) => {
  await page.evaluate(() => (window as any).__debug.pauseShop(true));
  // early tap (inside the 0.6 s lock) does nothing
  await catchOne(page);
  await page.evaluate(() => (window as any).__debug.forceCatch());
  await waitPhase(page, 'result');
  await page.mouse.click(KEEP.x, KEEP.y);
  expect((await hint(page)).cardVisible).toBe(true);
  await page.evaluate(() => (window as any).__debug.dismissCard());

  // a press that starts while reeling and is still held when the catch lands
  await catchOne(page);
  await page.mouse.move(195, 600);
  await page.mouse.down();
  await page.waitForTimeout(200);
  await page.evaluate(() => (window as any).__debug.forceCatch());
  await waitPhase(page, 'result');
  await page.waitForTimeout(1000);
  let h = await hint(page);
  expect(h.cardVisible).toBe(true);
  expect(h.cardName).not.toBe('');
  await page.mouse.up();
  await page.waitForTimeout(200);
  expect((await hint(page)).cardVisible).toBe(true);
  await page.screenshot({ path: `${SHOT2}/catch-card.png` });

  await page.mouse.click(KEEP.x, KEEP.y);
  await page.waitForFunction(() => !(window as any).__debug.hint().cardVisible);
  h = await hint(page);
  expect(h.label).toBe('CAST');
  expect(h.castEnabled).toBe(true);
});

test('reeling is calm: a 1 s hold moves the needle right but not to the edge', async ({ page }) => {
  await page.evaluate(() => (window as any).__debug.pauseShop(true));
  await catchOne(page);
  await page.mouse.move(120, 700);
  await page.mouse.down();
  await page.waitForTimeout(1000);
  const r = await page.evaluate(() => (window as any).__debug.reel());
  await page.screenshot({ path: `${SHOT2}/reeling.png` });
  await page.mouse.move(300, 500); // sliding the thumb does not release
  await page.waitForTimeout(300);
  const r2 = await page.evaluate(() => (window as any).__debug.reel());
  await page.mouse.up();
  expect(r.needle).toBeGreaterThan(0.52);
  expect(r.needle).toBeLessThan(0.95);
  expect(r2.needle).toBeGreaterThan(r.needle);
  expect(r2.velocity).toBeGreaterThan(0);
});

test('a sale off the Shop tab shows a toast', async ({ page }) => {
  await catchOne(page);
  await landAndClose(page);
  await page.waitForFunction(() => (window as any).__debug.toast().visible);
  const t = await page.evaluate(() => (window as any).__debug.toast());
  expect(t.text).toMatch(/^\+\d+ · .+ sold$/);
  await page.screenshot({ path: `${SHOT2}/sale-toast.png` });
});
