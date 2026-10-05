import type { Page } from '@playwright/test';

/** Decode a PNG screenshot in the page and return RGBA values at the given pixel coordinates. */
export async function samplePixels(page: Page, png: Buffer, points: Array<[number, number]>): Promise<number[][]> {
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
