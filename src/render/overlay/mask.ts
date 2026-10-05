/**
 * The umpire's mask, drawn as soft, out-of-focus bars at the edges of the view. The mask moves with the head,
 * so a screen-fixed overlay is the correct place for it; the bars never cross the zone.
 */
export function mountMask(parent: HTMLElement): HTMLElement {
  const el = document.createElement('div');
  el.className = 'mask-overlay';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" width="100%" height="100%">
      <defs>
        <filter id="maskBlur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9" /></filter>
        <radialGradient id="vignette" cx="50%" cy="46%" r="75%">
          <stop offset="62%" stop-color="#000" stop-opacity="0" />
          <stop offset="100%" stop-color="#000" stop-opacity="0.55" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="1000" height="1000" fill="url(#vignette)" />
      <g filter="url(#maskBlur)" fill="#0b0d12" opacity="0.88">
        <rect x="-40" y="-30" width="1080" height="62" rx="30" />
        <rect x="-40" y="968" width="1080" height="70" rx="30" />
        <rect x="-30" y="-20" width="58" height="1040" rx="28" />
        <rect x="972" y="-20" width="58" height="1040" rx="28" />
        <rect x="80" y="900" width="190" height="34" rx="17" transform="rotate(-8 175 917)" />
        <rect x="730" y="900" width="190" height="34" rx="17" transform="rotate(8 825 917)" />
      </g>
    </svg>`;
  parent.appendChild(el);
  return el;
}
