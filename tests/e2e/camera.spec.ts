import { expect, test } from '@playwright/test';
import { currentPitch, diffPixels, hideOverlays, nextFrames, openGame, samplePixels } from './helpers';

// Pitch 0 of this seed is a strike about 4 in inside the zone with a clear sightline (checked offline with the
// same raycast the unit tests use).
const SEED = 'e2e-streak-8';

test.describe('umpire camera and ball (U5)', () => {
  test('holds the camera still from the set to the catch, and sways between pitches', async ({ page }) => {
    await openGame(page, `seed=${SEED}&autostart=1&quality=low`);
    await page.evaluate(() => window.__ump!.pause());
    const p = await currentPitch(page);
    const matrixAt = async (t: number) => {
      await page.evaluate((tt) => window.__ump!.freeze(tt, tt - 1 / 60), t);
      await nextFrames(page, 2);
      return page.evaluate(() => window.__ump!.cameraMatrix());
    };
    const { setStart, release, cross, catch: catchT } = p.times;
    const steady = await matrixAt(setStart);
    for (const t of [setStart + 0.25, (setStart + release) / 2, release, cross, catchT]) {
      expect(await matrixAt(t)).toEqual(steady);
    }
    // Not vacuous: before the set the camera breathes.
    const idle = [await matrixAt(p.times.start + 0.2), await matrixAt(p.times.start + 0.9)];
    const moved = idle.some((m) => m.some((v, i) => Math.abs(v - steady[i]!) > 1e-5));
    expect(moved).toBe(true);
  });

  test('the streak covers the projected crossing in a frozen crossing frame', async ({ page }) => {
    // Software WebGL on CI runners is slow; a frozen frame draws once, and this leaves margin for the load.
    test.setTimeout(60_000);
    await openGame(page, `seed=${SEED}&autostart=1&quality=low`);
    await page.evaluate(() => window.__ump!.pause());
    await hideOverlays(page);
    const p = await currentPitch(page);
    await page.evaluate((t) => window.__ump!.freeze(t + 1 / 120, t - 1 / 120), p.times.cross);
    await nextFrames(page, 3);
    const seg = await page.evaluate(() => window.__ump!.streakSegment());
    expect(seg.visible).toBe(true);
    const at = await page.evaluate((c) => window.__ump!.project(c), p.crossing);
    const png = await page.locator('canvas#scene').screenshot({ path: 'test-results/crossing.png' });
    const x = Math.round(at.x);
    const y = Math.round(at.y);
    const pixels = await samplePixels(page, png, [
      [x, y],
      [x - 2, y],
      [x + 2, y],
      [x, y - 2],
      [x, y + 2],
    ]);
    for (const px of pixels) {
      for (const channel of px.slice(0, 3)) expect(channel).toBeGreaterThan(200);
    }
  });

  test('captures the set, mid-flight, and crossing frames, and the zone overlay shows when enabled', async ({
    page,
  }) => {
    // Full quality (shadows, antialiasing) renders slowly in software WebGL, so this test gets more time.
    test.setTimeout(120_000);
    await openGame(page, `seed=${SEED}&autostart=1`);
    await page.evaluate(() => window.__ump!.pause());
    const p = await currentPitch(page);
    const frames = {
      set: p.times.setStart + 0.3,
      mid: (p.times.release + p.times.cross) / 2,
      cross: p.times.cross + 1 / 120,
    };
    for (const [name, t] of Object.entries(frames)) {
      await page.evaluate((tt) => window.__ump!.freeze(tt, tt - 1 / 60), t);
      await nextFrames(page, 2);
      const png = await page.screenshot({ path: `test-results/frame-${name}.png` });
      // Non-blank: the frame has real contrast, not one flat color.
      const samples = await samplePixels(page, png, [
        [100, 100],
        [640, 360],
        [1000, 600],
        [640, 650],
      ]);
      const sums = samples.map((s) => s[0]! + s[1]! + s[2]!);
      expect(Math.max(...sums) - Math.min(...sums)).toBeGreaterThan(60);
    }
    await hideOverlays(page);
    const plain = await page.locator('canvas#scene').screenshot();
    await page.evaluate(() => window.__ump!.setOverlays({ zone: true, path: true }));
    await nextFrames(page, 2);
    const withOverlay = await page
      .locator('canvas#scene')
      .screenshot({ path: 'test-results/frame-overlay.png' });
    expect(await diffPixels(page, plain, withOverlay)).toBeGreaterThan(300);
  });
});
