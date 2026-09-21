/**
 * Partículas CSS do Acheron — clique Ceifar.
 * Sem VFX rainbow; `prefers-reduced-motion` desliga tudo.
 */

const MAX_MOTES = 24;
const DEFAULT_COUNT = 8;

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

export function spawnReapParticles(layer, options = {}) {
  if (!layer) return 0;
  const reduced = options.reducedMotion ?? prefersReducedMotion(options.matchMedia);
  if (reduced) return 0;

  const count = Number(options.count) > 0 ? Math.min(Number(options.count), 12) : DEFAULT_COUNT;
  const originX = options.x ?? 50;
  const originY = options.y ?? 55;
  let spawned = 0;

  for (let i = 0; i < count; i += 1) {
    while (layer.childElementCount >= MAX_MOTES) {
      layer.firstElementChild?.remove();
    }
    const mote = layer.ownerDocument.createElement('span');
    mote.className = 'despertar-particle';
    mote.setAttribute('aria-hidden', 'true');
    const dx = randomBetween(-48, 48);
    const dy = randomBetween(-88, -28);
    mote.style.setProperty('--px', `${originX + randomBetween(-8, 8)}%`);
    mote.style.setProperty('--py', `${originY + randomBetween(-6, 6)}%`);
    mote.style.setProperty('--dx', `${dx}px`);
    mote.style.setProperty('--dy', `${dy}px`);
    mote.addEventListener('animationend', () => mote.remove(), { once: true });
    layer.appendChild(mote);
    spawned += 1;
  }
  return spawned;
}

export function pulseReapButton(button, { reducedMotion } = {}) {
  if (!button || reducedMotion) return;
  button.classList.remove('is-reaping');
  void button.offsetWidth;
  button.classList.add('is-reaping');
}

export function bindReapFeel(button, { reducedMotion } = {}) {
  if (!button) return () => {};
  const onEnd = () => button.classList.remove('is-reaping');
  button.addEventListener('animationend', onEnd);
  return () => button.removeEventListener('animationend', onEnd);
}
