import { expect, test } from '@playwright/test';
import { callAndAdvance, currentPitch, openGame } from './helpers';

test.describe('session flow (U7, U8, U24)', () => {
  test('a scripted short session runs to the Ump Card', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await openGame(page, 'seed=e2e-flow-1&autostart=1&quality=low&pitches=6');
    await page.evaluate(() => window.__ump!.pause());
    for (let i = 0; i < 20 && (await page.evaluate(() => window.__ump!.phase)) !== 'done'; i++) {
      await callAndAdvance(page);
    }
    await expect(page.locator('.summary-screen')).toBeVisible();
    await expect(page.locator('.summary-screen')).toContainText('UMP CARD');
    await expect(page.locator('.big-stats')).toContainText('100.0%');
    expect(errors).toEqual([]);
  });

  test('a no-stop delivery with a runner on can be called a balk with Space', async ({ page }) => {
    // Calling every pitch right, this seed's first no-stop delivery is pitch 6 (checked offline).
    await openGame(page, 'seed=e2e-balk-2&autostart=1&quality=low');
    await page.evaluate(() => window.__ump!.pause());
    for (let i = 0; i < 6; i++) await callAndAdvance(page);
    const p = await currentPitch(page);
    expect(p.index).toBe(6);
    expect(p.runnersOn).toBe(true);
    expect(p.variant).toBe('noStop');
    await expect(page.locator('.balk-pill')).toHaveClass(/show/);
    await page.evaluate((t) => window.__ump!.advanceTo(t), p.violationTime! + 0.25);
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__ump!.pitch()!.resolved);
    const done = await currentPitch(page);
    expect(done.outcome).toBe('balk');
    expect(done.balkCorrect).toBe(true);
    await expect(page.locator('.result-card')).toContainText('BALK');
  });
});

test.describe('spot-the-balk drill (U8)', () => {
  test('a run that spots every no-stop delivery passes the drill', async ({ page }) => {
    await openGame(page, 'seed=e2e-drill-1&drill=balk&quality=low');
    await page.evaluate(() => window.__ump!.pause());
    await expect(page.locator('.score-panel')).toContainText('BALK DRILL');
    for (let i = 0; i < 40 && (await page.evaluate(() => window.__ump!.phase)) !== 'done'; i++) {
      await page.evaluate(() => {
        const u = window.__ump!;
        const p = u.pitch()!;
        if (!p.resolved && p.variant === 'noStop') {
          u.advanceTo(p.violationTime! + 0.25);
          u.inputNow('balk');
        }
        // Step until the next delivery starts, so no delivery passes without a decision.
        for (let k = 0; k < 400 && u.phase !== 'done' && u.pitch()!.index === p.index; k++)
          u.advanceTo(u.simTime + 0.25);
      });
    }
    await expect(page.locator('.drill-summary')).toBeVisible();
    await expect(page.locator('.drill-summary')).toContainText('PASS');
    await expect(page.locator('.drill-summary')).toContainText('100%');
  });

  test('the title screen starts the drill', async ({ page }) => {
    await openGame(page, 'seed=e2e-drill-2&quality=low');
    await page.getByRole('button', { name: /Balk drill/ }).click();
    await page.waitForFunction(() => window.__ump!.phase !== 'ready');
    await expect(page.locator('.score-panel')).toContainText('BALK DRILL');
    await expect(page.locator('.scorebug .b1')).toHaveClass(/on/);
  });
});
