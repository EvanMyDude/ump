import { expect, test } from '@playwright/test';
import { hideOverlays, nextFrames, openGame, samplePixels } from './helpers';

test('boots to the title and starts on PLAY BALL', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openGame(page, 'seed=boot-1&quality=low');
  await expect(page).toHaveTitle(/UMP/);
  await expect(page.locator('.title-screen')).toBeVisible();
  expect(await page.evaluate(() => window.__ump!.phase)).toBe('ready');
  await page.getByRole('button', { name: 'PLAY BALL' }).click();
  await expect(page.locator('.title-screen')).toHaveCount(0);
  await page.waitForFunction(() => window.__ump!.phase !== 'ready');
  await expect(page.locator('.scorebug')).toContainText('0-0');
  expect(errors).toEqual([]);
});

test('Enter on the title starts the game too', async ({ page }) => {
  await openGame(page, 'seed=boot-2&quality=low');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__ump!.phase !== 'ready');
  await expect(page.locator('.title-screen')).toHaveCount(0);
});

test('renders sky above and ground below', async ({ page }) => {
  test.setTimeout(90_000);
  await openGame(page, 'seed=boot-3&autostart=1');
  await hideOverlays(page);
  await nextFrames(page, 2);
  const canvas = page.locator('canvas#scene');
  const png = await canvas.screenshot({ path: 'test-results/boot.png' });
  const box = (await canvas.boundingBox())!;
  const [top, bottom] = await samplePixels(page, png, [
    [Math.floor(box.width / 2), 4],
    [Math.floor(box.width * 0.1), Math.floor(box.height - 4)],
  ]);
  // Sky at the top and dirt at the bottom: two different, non-black colors.
  expect(top!.slice(0, 3)).not.toEqual(bottom!.slice(0, 3));
  expect(top!.slice(0, 3).reduce((s, v) => s + v, 0)).toBeGreaterThan(150);
  expect(bottom!.slice(0, 3).reduce((s, v) => s + v, 0)).toBeGreaterThan(150);
});
