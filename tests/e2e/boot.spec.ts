import { expect, test } from '@playwright/test';
import { samplePixels } from './helpers';

test('boots and renders the scene', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page).toHaveTitle(/UMP/);
  const canvas = page.locator('canvas#scene');
  await expect(canvas).toBeVisible();
  await page.waitForFunction(() => (window as unknown as { __ump?: { frames: number } }).__ump!.frames > 5);
  const png = await canvas.screenshot({ path: 'test-results/boot.png' });
  const box = (await canvas.boundingBox())!;
  const [top, bottom] = await samplePixels(page, png, [
    [Math.floor(box.width / 2), 5],
    [Math.floor(box.width / 2), Math.floor(box.height - 5)],
  ]);
  // Sky at the top and grass at the bottom: two different, non-black colors.
  expect(top!.slice(0, 3)).not.toEqual(bottom!.slice(0, 3));
  expect(top!.slice(0, 3).reduce((s, v) => s + v, 0)).toBeGreaterThan(60);
  expect(errors).toEqual([]);
});
