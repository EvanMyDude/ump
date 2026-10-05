import { BALL_RADIUS } from '../sim/field';
import type { PitchRecord } from '../sim/game/session';

const S = 5.2; // px per inch
const W = 44; // inches shown across
const PAD_IN = 13;

/** Catcher's-view zone card in the style of a broadcast strike-zone box (R4). */
export function kzoneSvg(r: PitchRecord): string {
  const z = r.zone;
  const top = z.top * 12;
  const bottom = z.bottom * 12;
  const hIn = top - bottom + PAD_IN * 2;
  const w = W * S;
  const h = hIn * S;
  const X = (xIn: number) => w / 2 + xIn * S;
  const Y = (zIn: number) => h - (zIn - (bottom - PAD_IN)) * S;
  const half = (z.right - z.left) * 6;
  const rIn = BALL_RADIUS * 12;
  const cx = X(r.truth.crossing.x * 12);
  const cy = Y(r.truth.crossing.z * 12);
  const strike = r.truth.isStrike;
  const color = strike ? 'var(--bad)' : 'var(--good)';
  const label = strike ? 'STRIKE' : 'BALL';
  return `
  <svg class="kzone" viewBox="0 0 ${w.toFixed(1)} ${h.toFixed(1)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" role="img"
       aria-label="Pitch location: ${label}, ${Math.abs(r.truth.edgeDistanceIn).toFixed(1)} inches ${r.truth.edgeDistanceIn > 0 ? 'outside' : 'inside'} the zone">
    <rect x="0" y="0" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="10" fill="rgba(6,10,18,0.78)" />
    <rect x="${X(-half - rIn)}" y="${Y(top + rIn)}" width="${(2 * (half + rIn) * S).toFixed(1)}" height="${((top - bottom + 2 * rIn) * S).toFixed(1)}"
          rx="${(rIn * S).toFixed(1)}" fill="none" stroke="rgba(255,255,255,0.28)" stroke-dasharray="4 4" />
    <rect x="${X(-half)}" y="${Y(top)}" width="${(2 * half * S).toFixed(1)}" height="${((top - bottom) * S).toFixed(1)}"
          fill="rgba(255,255,255,0.06)" stroke="var(--zone)" stroke-width="2" />
    <line x1="${X(-half / 3)}" y1="${Y(top)}" x2="${X(-half / 3)}" y2="${Y(bottom)}" stroke="rgba(255,255,255,0.15)" />
    <line x1="${X(half / 3)}" y1="${Y(top)}" x2="${X(half / 3)}" y2="${Y(bottom)}" stroke="rgba(255,255,255,0.15)" />
    <line x1="${X(-half)}" y1="${Y(bottom + (top - bottom) / 3)}" x2="${X(half)}" y2="${Y(bottom + (top - bottom) / 3)}" stroke="rgba(255,255,255,0.15)" />
    <line x1="${X(-half)}" y1="${Y(bottom + (2 * (top - bottom)) / 3)}" x2="${X(half)}" y2="${Y(bottom + (2 * (top - bottom)) / 3)}" stroke="rgba(255,255,255,0.15)" />
    <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(rIn * S).toFixed(1)}" fill="${color}" stroke="#fff" stroke-width="1.5" />
    <text x="${(w / 2).toFixed(1)}" y="${(h - 8).toFixed(1)}" text-anchor="middle" class="kzone-label">${label} · ${
      strike
        ? `${Math.abs(r.truth.edgeDistanceIn).toFixed(1)} in inside`
        : `${r.truth.edgeDistanceIn.toFixed(1)} in off`
    }</text>
  </svg>`;
}
