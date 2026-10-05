import * as THREE from 'three';

function canvasTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Mowed stripes give strong perspective cues for judging depth down the pitching line. */
export function grassTexture(): THREE.CanvasTexture {
  const tex = canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#3c8a37';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#459a3f';
    ctx.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 1800; i++) {
      const v = 40 + Math.floor(Math.random() * 40);
      ctx.fillStyle = `rgba(${v}, ${110 + v}, ${v}, 0.08)`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function dirtTexture(): THREE.CanvasTexture {
  const tex = canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#b07a4f';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4000; i++) {
      const v = Math.floor(Math.random() * 40) - 20;
      ctx.fillStyle = `rgba(${150 + v}, ${100 + v}, ${65 + v}, 0.35)`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Speckled crowd for the stands. */
export function crowdTexture(): THREE.CanvasTexture {
  const palette = [
    '#e63946',
    '#f1faee',
    '#a8dadc',
    '#457b9d',
    '#1d3557',
    '#ffb703',
    '#fb8500',
    '#2a9d8f',
    '#ffffff',
    '#222222',
  ];
  const tex = canvasTexture(512, 128, (ctx) => {
    ctx.fillStyle = '#2b3445';
    ctx.fillRect(0, 0, 512, 128);
    for (let y = 2; y < 128; y += 5) {
      for (let x = (y % 2) * 2; x < 512; x += 4) {
        if (Math.random() < 0.82) {
          ctx.fillStyle = palette[Math.floor(Math.random() * palette.length)]!;
          ctx.fillRect(x, y, 3, 4);
        }
      }
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

export function skyTexture(): THREE.CanvasTexture {
  return canvasTexture(4, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#3d7fd6');
    g.addColorStop(0.6, '#8fbdf0');
    g.addColorStop(1, '#d9ecff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
  });
}
