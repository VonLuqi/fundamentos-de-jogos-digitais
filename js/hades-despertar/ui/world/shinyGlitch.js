/**
 * Glitch visual para unidades shiny (chroma + tears).
 * Sem prefers-reduced-motion: animação leve baseada em tempo.
 */

export function shinyGlitchNow() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

/**
 * Intensidade 0..1 com pulsos irregulares (look “glitch”).
 * @param {number} [t]
 */
export function shinyGlitchIntensity(t = shinyGlitchNow()) {
  const a = Math.sin(t * 0.011);
  const b = Math.sin(t * 0.029 + 1.7);
  const c = Math.sin(t * 0.047 + 0.4);
  return Math.min(1, Math.max(0, (a + b + c) * 0.42 + 0.15));
}

/**
 * Offset chromatic (px) — canal “fantasma”.
 * @param {number} [t]
 */
export function shinyChromaticPx(t = shinyGlitchNow()) {
  const i = shinyGlitchIntensity(t);
  return Math.max(1, Math.round(1 + i * 3));
}

/**
 * Faixas horizontais deslocadas (tears).
 * @param {number} boxY
 * @param {number} boxH
 * @param {number} [t]
 * @returns {{ y: number, h: number, dx: number }[]}
 */
export function shinyTearBands(boxY, boxH, t = shinyGlitchNow()) {
  const i = shinyGlitchIntensity(t);
  if (i < 0.2 || boxH <= 2) return [];
  const n = i > 0.7 ? 3 : 2;
  const bands = [];
  for (let k = 0; k < n; k += 1) {
    const h = 1 + ((k + Math.floor(t / 90)) % 3);
    const yFrac = (Math.sin(t * 0.008 + k * 2.1) * 0.5 + 0.5);
    const y = boxY + yFrac * Math.max(0, boxH - h);
    const dx = Math.round(
      (Math.sin(t * 0.021 + k * 1.3) * 5 + Math.cos(t * 0.013 + k) * 2) * i,
    );
    if (dx === 0) continue;
    bands.push({ y, h, dx });
  }
  return bands;
}
