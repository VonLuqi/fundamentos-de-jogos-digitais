/**
 * Partículas CSS do Acheron — clique Ceifar (alminhas subindo).
 * Quantidade escala com almas/clique; `prefers-reduced-motion` desliga tudo.
 */

/** Teto de motes vivos na camada (chuva + clique). */
export const REAP_PARTICLE_LAYER_CAP = 40;
/** Burst máximo por clique. */
export const REAP_PARTICLE_BURST_MAX = 28;
export const REAP_PARTICLE_BURST_MIN = 4;

function prefersReducedMotion(matchMediaFn) {
  try {
    const probe = matchMediaFn
      ?? (typeof matchMedia === 'function' ? matchMedia.bind(globalThis) : null);
    if (typeof probe !== 'function') return false;
    return Boolean(probe('(prefers-reduced-motion: reduce)')?.matches);
  } catch {
    return false;
  }
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Quantas alminhas sair no Ceifar a partir do poder de clique.
 * Escala log — late game não explode o DOM.
 * @param {string|number} clickPower
 * @param {{ min?: number, max?: number }} [options]
 */
export function reapParticleCount(clickPower, options = {}) {
  const min = Number(options.min) > 0 ? Math.floor(Number(options.min)) : REAP_PARTICLE_BURST_MIN;
  const max = Number(options.max) > 0 ? Math.floor(Number(options.max)) : REAP_PARTICLE_BURST_MAX;
  const n = Number(clickPower);
  if (!Number.isFinite(n) || n <= 0) return min;
  // 4 em 1 alma/clique · ~9 em 10 · ~14 em 100 · asymptote max
  const soft = min + Math.log10(Math.max(1, n)) * 5.2;
  return Math.min(max, Math.max(min, Math.round(soft)));
}

/**
 * Burst de alminhas subindo e sumindo no altar.
 * @param {Element|null} layer
 * @param {{
 *   reducedMotion?: boolean,
 *   matchMedia?: Function,
 *   count?: number,
 *   clickPower?: string|number,
 *   gained?: string|number,
 *   x?: number,
 *   y?: number,
 * }} [options]
 */
export function spawnReapParticles(layer, options = {}) {
  if (!layer) return 0;
  const reduced = options.reducedMotion ?? prefersReducedMotion(options.matchMedia);
  if (reduced) return 0;

  const power = options.clickPower ?? options.gained;
  const count = Number(options.count) > 0
    ? Math.min(Math.floor(Number(options.count)), REAP_PARTICLE_BURST_MAX)
    : reapParticleCount(power);

  const originX = options.x ?? 50;
  const originY = options.y ?? 52;
  let spawned = 0;
  const doc = layer.ownerDocument || (typeof document !== 'undefined' ? document : null);
  if (!doc?.createElement) return 0;

  for (let i = 0; i < count; i += 1) {
    while (layer.childElementCount >= REAP_PARTICLE_LAYER_CAP) {
      layer.firstElementChild?.remove();
    }
    const mote = doc.createElement('span');
    mote.className = 'despertar-particle despertar-particle--soul';
    mote.setAttribute('aria-hidden', 'true');
    // Sempre sobe (dy negativo); drift horizontal leve.
    const dx = randomBetween(-36, 36);
    const dy = randomBetween(-110, -52);
    const size = randomBetween(0.38, 0.72);
    const dur = randomBetween(0.72, 1.15);
    mote.style.setProperty('--px', `${originX + randomBetween(-10, 10)}%`);
    mote.style.setProperty('--py', `${originY + randomBetween(-8, 8)}%`);
    mote.style.setProperty('--dx', `${dx}px`);
    mote.style.setProperty('--dy', `${dy}px`);
    mote.style.setProperty('--soul-size', `${size}rem`);
    mote.style.setProperty('--soul-dur', `${dur}s`);
    mote.addEventListener('animationend', () => mote.remove(), { once: true });
    layer.appendChild(mote);
    spawned += 1;
  }
  return spawned;
}

export function pulseReapButton(button, { reducedMotion } = {}) {
  if (!button) return false;
  button.classList.remove('is-reaping');
  void button.offsetWidth;
  button.classList.add('is-reaping');
  if (reducedMotion) {
    /* slash soft fica a cargo de playFoiceSlash */
  }
  return true;
}

export function bindReapFeel(button, { reducedMotion } = {}) {
  if (!button) return () => {};
  const onEnd = (event) => {
    if (event?.animationName && !/despertar(ReapPulse|FoiceSlash|FoicePulse)/.test(event.animationName)) {
      return;
    }
    button.classList.remove('is-reaping', 'is-slashing', 'is-slash-soft');
  };
  button.addEventListener('animationend', onEnd);
  return () => button.removeEventListener('animationend', onEnd);
}

/**
 * Fallback se Foice.png falhar — mostra glyph ⚔.
 * @param {HTMLElement|null} button
 */
export function bindFoiceAsset(button) {
  if (!button) return () => {};
  const img = button.querySelector?.('[data-reap-foice]');
  const glyph = button.querySelector?.('[data-reap-glyph]');
  if (!img) return () => {};

  const showFallback = () => {
    img.hidden = true;
    if (glyph) glyph.hidden = false;
  };

  if (img.complete && img.naturalWidth === 0) {
    showFallback();
    return () => {};
  }

  const onError = () => showFallback();
  img.addEventListener('error', onError);
  return () => img.removeEventListener('error', onError);
}
