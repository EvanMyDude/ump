import type { Page } from '@playwright/test';
import type { HookPitch } from '../../src/game';

/** Decode a PNG screenshot in the page and return RGBA values at the given pixel coordinates. */
export async function samplePixels(
  page: Page,
  png: Buffer,
  points: Array<[number, number]>,
): Promise<number[][]> {
  return page.evaluate(
    async ({ b64, pts }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      return pts.map(([x, y]) => Array.from(ctx.getImageData(x, y, 1, 1).data));
    },
    { b64: png.toString('base64'), pts: points },
  );
}

/** Count pixels that differ by more than `threshold` in any channel between two same-size PNGs. */
export async function diffPixels(page: Page, a: Buffer, b: Buffer, threshold = 24): Promise<number> {
  return page.evaluate(
    async ({ a64, b64, threshold }) => {
      const load = async (s: string) => {
        const img = new Image();
        img.src = `data:image/png;base64,${s}`;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, img.width, img.height).data;
      };
      const [pa, pb] = await Promise.all([load(a64), load(b64)]);
      let n = 0;
      for (let i = 0; i < pa.length; i += 4) {
        if (
          Math.abs(pa[i]! - pb[i]!) > threshold ||
          Math.abs(pa[i + 1]! - pb[i + 1]!) > threshold ||
          Math.abs(pa[i + 2]! - pb[i + 2]!) > threshold
        )
          n++;
      }
      return n;
    },
    { a64: a.toString('base64'), b64: b.toString('base64'), threshold },
  );
}

/** Open the game and wait for it to render; `query` is the URL's search string without the `?`. */
export async function openGame(page: Page, query: string): Promise<void> {
  await page.goto(`/?${query}`);
  await page.waitForFunction(() => (window.__ump?.frames ?? 0) > 2);
}

/** Wait until `n` more frames have rendered. */
export async function nextFrames(page: Page, n = 2): Promise<void> {
  const start = await page.evaluate(() => window.__ump!.frames);
  await page.waitForFunction((target) => window.__ump!.frames >= target, start + n);
}

export const currentPitch = (page: Page): Promise<HookPitch> => page.evaluate(() => window.__ump!.pitch()!);

/** Hide the HUD and mask so screenshots show only the 3D view. */
export const hideOverlays = (page: Page) =>
  page.addStyleTag({ content: '#hud, .mask-overlay { display: none !important; }' });

/**
 * With the clock paused, call the current pitch at `afterCatchS` after the catch (the truth by default), then
 * step past the result so the next pitch starts. Returns the pitch as it resolved.
 */
export async function callAndAdvance(
  page: Page,
  kind?: 'strike' | 'ball',
  afterCatchS = 0.9,
): Promise<HookPitch> {
  return page.evaluate(
    ({ kind, afterCatchS }) => {
      const u = window.__ump!;
      const p = u.pitch()!;
      if (!p.resolved) {
        u.advanceTo(p.times.catch + afterCatchS);
        u.inputNow(kind ?? (p.truthIsStrike ? 'strike' : 'ball'));
      }
      const resolved = u.pitch()!;
      // The challenge card and the result hold both fit in five seconds.
      u.advanceTo(u.simTime + 5);
      return resolved;
    },
    { kind, afterCatchS },
  );
}
