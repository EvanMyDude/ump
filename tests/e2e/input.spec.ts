import { devices, expect, test } from '@playwright/test';
import { callAndAdvance, currentPitch, nextFrames, openGame } from './helpers';

test.describe('calls (U6, U24)', () => {
  test('a STRIKE key press after the settle delay is graded clean, scores, and plays the hammer', async ({
    page,
  }) => {
    await openGame(page, 'seed=e2e-streak-8&autostart=1&quality=low');
    await page.evaluate(() => window.__ump!.pause());
    const p = await currentPitch(page);
    expect(p.truthIsStrike).toBe(true);
    await page.evaluate((t) => window.__ump!.advanceTo(t), p.times.catch + 0.5);
    await page.keyboard.press('KeyJ');
    await page.waitForFunction(() => window.__ump!.pitch()!.resolved);
    const done = await currentPitch(page);
    expect(done.call).toBe('strike');
    expect(done.grade).toBe('clean');
    expect(done.correct).toBe(true);
    expect(await page.evaluate(() => window.__ump!.score)).toBeGreaterThan(0);
    await nextFrames(page, 1);
    expect(await page.evaluate(() => window.__ump!.armsVisible())).toBe(true);
    await expect(page.locator('.result-card')).toContainText('Correct');
  });

  test('a call before the glove settles is graded quick', async ({ page }) => {
    await openGame(page, 'seed=e2e-streak-8&autostart=1&quality=low');
    await page.evaluate(() => window.__ump!.pause());
    const p = await currentPitch(page);
    await page.evaluate((t) => window.__ump!.advanceTo(t), p.times.catch + 0.1);
    await page.keyboard.press('KeyF');
    await page.waitForFunction(() => window.__ump!.pitch()!.resolved);
    const done = await currentPitch(page);
    expect(done.call).toBe('ball');
    expect(done.grade).toBe('quick');
    expect(done.correct).toBe(false);
  });

  test('R replays the last pitch, C changes the view, and R closes it', async ({ page }) => {
    await openGame(page, 'seed=e2e-streak-8&autostart=1&quality=low');
    await page.evaluate(() => window.__ump!.pause());
    const p = await currentPitch(page);
    await page.evaluate((t) => {
      window.__ump!.advanceTo(t);
      window.__ump!.inputNow('strike');
    }, p.times.catch + 0.9);
    await page.keyboard.press('KeyR');
    await page.waitForFunction(() => window.__ump!.replayView() === 'umpire');
    await expect(page.locator('.replay-badge')).toBeVisible();
    await page.keyboard.press('KeyC');
    await page.waitForFunction(() => window.__ump!.replayView() === 'catcher');
    await page.keyboard.press('KeyR');
    await page.waitForFunction(() => window.__ump!.replayView() === null);
    await expect(page.locator('.replay-badge')).toBeHidden();
  });
});

// The browser type comes from the project; only the phone's viewport, touch, and user agent apply here.
const { defaultBrowserType: _browser, ...phone } = devices['Pixel 7 landscape'];

test.describe('touch (U6)', () => {
  test.use(phone);

  test('a tap on the on-screen BALL button calls a ball in a phone viewport', async ({ page }) => {
    await openGame(page, 'seed=e2e-streak-8&autostart=1&quality=low');
    await expect(page.locator('.touch-btn.ball')).toBeVisible();
    await page.evaluate(() => window.__ump!.pause());
    // Play one pitch through so the tap lands on the second pitch, which tests the steady state.
    await callAndAdvance(page);
    const p = await currentPitch(page);
    await page.evaluate((t) => window.__ump!.advanceTo(t), p.times.catch + 0.6);
    await page.locator('.touch-btn.ball').tap();
    await page.waitForFunction(
      (i) => window.__ump!.pitch()!.index === i && window.__ump!.pitch()!.resolved,
      p.index,
    );
    expect((await currentPitch(page)).call).toBe('ball');
  });
});
