/**
 * Partículas CSS do Acheron — clique Ceifar (alminhas subindo).
 * Quantidade escala com almas/clique; `prefers-reduced-motion` desliga tudo.
 */

/** Teto de motes vivos na camada (chuva + clique). */
export const REAP_PARTICLE_LAYER_CAP = 56;
/** Burst máximo por clique. */
export const REAP_PARTICLE_BURST_MAX = 22;
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
 * Object Pool para reutilizar nós DOM de partículas (`span`) sem `createElement`/`remove` contínuo (Perf-5).
 * @type {WeakMap<object, Map<string, Element[]>>}
 */
const _domPools = new WeakMap();
const DOM_POOL_MAX_PER_KEY = 48;

export function acquirePooledNode(doc, poolKey, className) {
  if (!doc || typeof doc.createElement !== 'function') return null;
  let byKey = _domPools.get(doc);
  if (!byKey) {
    byKey = new Map();
    _domPools.set(doc, byKey);
  }
  const bucket = byKey.get(poolKey);
  if (bucket && bucket.length > 0) {
    const node = bucket.pop();
    node.className = className;
    node.hidden = false;
    return node;
  }
  const node = doc.createElement('span');
  node.className = className;
  node.setAttribute?.('aria-hidden', 'true');
  return node;
}

export function releasePooledNode(doc, poolKey, node) {
  if (!node) return;
  try {
    node.remove?.();
  } catch {
    /* ignore */
  }
  if (!doc || typeof doc !== 'object') return;
  let byKey = _domPools.get(doc);
  if (!byKey) {
    byKey = new Map();
    _domPools.set(doc, byKey);
  }
  let bucket = byKey.get(poolKey);
  if (!bucket) {
    bucket = [];
    byKey.set(poolKey, bucket);
  }
  if (bucket.length < DOM_POOL_MAX_PER_KEY) {
    bucket.push(node);
  }
}

export function getDomPoolSize(doc, poolKey) {
  return _domPools.get(doc)?.get(poolKey)?.length ?? 0;
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
  if (options.particles === false) return 0;
  const reduced = options.reducedMotion ?? prefersReducedMotion(options.matchMedia);
  if (reduced) return 0;

  const power = options.clickPower ?? options.gained;
  const count = Number(options.count) > 0
    ? Math.min(Math.floor(Number(options.count)), REAP_PARTICLE_BURST_MAX)
    : reapParticleCount(power);

  const originX = options.x ?? 50;
  const originY = options.y ?? 58;
  let spawned = 0;
  const doc = layer.ownerDocument || (typeof document !== 'undefined' ? document : null);
  if (!doc?.createElement) return 0;

  // Cap só das alminhas do clique (chuva/+N compartilham a layer).
  let soulLive = 0;
  if (layer.children) {
    for (const child of layer.children) {
      if (String(child?.className || '').includes('despertar-particle--soul')) soulLive += 1;
    }
  } else {
    soulLive = layer.childElementCount || 0;
  }
  const room = Math.max(0, REAP_PARTICLE_LAYER_CAP - soulLive);
  const toSpawn = Math.min(count, room);
  if (toSpawn <= 0) return 0;

  for (let i = 0; i < toSpawn; i += 1) {
    const mote = acquirePooledNode(doc, 'reap-soul', 'despertar-particle despertar-particle--soul');
    if (!mote) break;
    // Sempre sobe bem (dy negativo) até sumir perto do contador; drift leve.
    const dx = randomBetween(-48, 48);
    const dy = randomBetween(-260, -150);
    const size = randomBetween(0.42, 0.78);
    const dur = randomBetween(1.15, 1.85);
    mote.style.setProperty('--px', `${originX + randomBetween(-14, 14)}%`);
    mote.style.setProperty('--py', `${originY + randomBetween(-10, 10)}%`);
    mote.style.setProperty('--dx', `${dx}px`);
    mote.style.setProperty('--dy', `${dy}px`);
    mote.style.setProperty('--soul-size', `${size}rem`);
    mote.style.setProperty('--soul-dur', `${dur}s`);
    // Reinicia só ESTE mote (pool); não mexe nos que já estão voando.
    if (mote.style) mote.style.animation = 'none';
    mote.addEventListener('animationend', () => releasePooledNode(doc, 'reap-soul', mote), { once: true });
    layer.appendChild(mote);
    try { void mote.offsetWidth; } catch { /* jsdom/mock */ }
    if (mote.style) mote.style.animation = '';
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
