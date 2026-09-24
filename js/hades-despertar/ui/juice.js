/**
 * Polarização juice do Despertar (Task 15 + Task C1).
 * Feedback visual sem alterar saldo — reduced-motion desliga tudo.
 */

import { formatSouls } from './NumberFormatter.js';

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

function bumpClass(el, className, ms = 700) {
  if (!el) return;
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
  const timer = typeof globalThis.setTimeout === 'function' ? globalThis.setTimeout.bind(globalThis) : null;
  timer?.(() => el.classList.remove(className), ms);
}

function resolveReduced(options = {}) {
  if (typeof options.reducedMotion === 'boolean') return options.reducedMotion;
  return prefersReducedMotion(options.matchMedia);
}

/**
 * Flash Styx ao jurar (teal) — cobre a coluna/aba, não a carteira.
 */
export function flashStyx(options = {}) {
  if (resolveReduced(options)) return false;
  const root = options.root ?? (typeof document !== 'undefined' ? document : null);
  if (!root) return false;
  const flash = root.getElementById('despertar-styx-flash');
  if (!flash) return false;
  bumpClass(flash, 'is-active', 760);
  return true;
}

/**
 * Flash roxo na primeira abertura do Lethe (Fase C / C1).
 * Reusa #despertar-styx-flash com modificador `.is-lethe`.
 */
export function flashLetheUnlock(options = {}) {
  if (resolveReduced(options)) return false;
  const root = options.root ?? (typeof document !== 'undefined' ? document : null);
  if (!root) return false;
  const flash = root.getElementById('despertar-styx-flash');
  if (!flash) return false;
  flash.classList.add('is-lethe');
  bumpClass(flash, 'is-active', 920);
  const timer = typeof globalThis.setTimeout === 'function' ? globalThis.setTimeout.bind(globalThis) : null;
  timer?.(() => flash.classList.remove('is-lethe'), 920);
  return true;
}

let _tutorialToastTimer = null;
let _tutorialToastBound = false;

/**
 * Toast tutorial leve (Fase C / C3) — uma linha + “Entendi”. Não bloqueia.
 * @param {{ text?: string, root?: Document|Element, reducedMotion?: boolean, holdMs?: number }} [options]
 */
export function showTutorialToast(options = {}) {
  const root = options.root ?? (typeof document !== 'undefined' ? document : null);
  if (!root) return false;
  const toast = root.getElementById('despertar-tutorial-toast');
  const textEl = root.getElementById('despertar-tutorial-toast-text');
  const dismiss = root.getElementById('despertar-tutorial-toast-dismiss');
  if (!toast || !textEl) return false;

  const message = String(options.text ?? '').trim();
  if (!message) return false;

  textEl.textContent = message;
  toast.hidden = false;
  toast.classList.add('is-visible');

  const hide = () => {
    toast.classList.remove('is-visible');
    toast.hidden = true;
    if (_tutorialToastTimer != null && typeof globalThis.clearTimeout === 'function') {
      globalThis.clearTimeout(_tutorialToastTimer);
      _tutorialToastTimer = null;
    }
  };

  if (!_tutorialToastBound && dismiss) {
    dismiss.addEventListener('click', hide);
    _tutorialToastBound = true;
  }

  if (_tutorialToastTimer != null && typeof globalThis.clearTimeout === 'function') {
    globalThis.clearTimeout(_tutorialToastTimer);
    _tutorialToastTimer = null;
  }
  const holdMs = Number(options.holdMs) > 0 ? Number(options.holdMs) : 12_000;
  if (typeof globalThis.setTimeout === 'function') {
    _tutorialToastTimer = globalThis.setTimeout(hide, holdMs);
  }
  return true;
}

/**
 * Vinheta roxa + card no Ritual do Lethe. Copy própria — sem XP falso.
 */
export function playLetheRitualFeel({
  title = 'Catábase',
  detail = 'O Lethe bebeu a corrida. Óbolos e Essência permanecem.',
  reducedMotion,
  matchMedia: matchMediaFn,
  root,
  durationMs = 2600,
} = {}) {
  if (reducedMotion ?? prefersReducedMotion(matchMediaFn)) return false;
  const doc = root ?? (typeof document !== 'undefined' ? document : null);
  if (!doc) return false;

  const overlay = doc.getElementById('despertar-lethe-overlay');
  const titleEl = doc.getElementById('despertar-lethe-overlay-title');
  const detailEl = doc.getElementById('despertar-lethe-overlay-detail');
  if (!overlay || !titleEl || !detailEl) return false;

  titleEl.textContent = title;
  detailEl.textContent = detail;
  overlay.classList.remove('is-active');
  void overlay.offsetWidth;
  overlay.classList.add('is-active');
  const clear = typeof globalThis.clearTimeout === 'function' ? globalThis.clearTimeout.bind(globalThis) : null;
  const timer = typeof globalThis.setTimeout === 'function' ? globalThis.setTimeout.bind(globalThis) : null;
  clear?.(overlay._hideTimer);
  overlay._hideTimer = timer?.(() => {
    overlay.classList.remove('is-active');
  }, durationMs);
  return true;
}

/**
 * Float `+N` no altar (Task C1) — teatro; não muda o saldo.
 */
export function spawnFloatText(layer, options = {}) {
  if (!layer || resolveReduced(options)) return false;
  const doc = layer.ownerDocument || options.root || (typeof document !== 'undefined' ? document : null);
  if (!doc?.createElement) return false;

  const amount = options.amount ?? options.gained ?? '1';
  const node = doc.createElement('span');
  node.className = 'despertar-float';
  node.setAttribute('aria-hidden', 'true');
  node.textContent = `+${formatSouls(amount)}`;
  const x = Number.isFinite(options.x) ? options.x : 50 + (Math.random() * 18 - 9);
  const y = Number.isFinite(options.y) ? options.y : 42 + (Math.random() * 10 - 5);
  node.style.setProperty('--float-x', `${x}%`);
  node.style.setProperty('--float-y', `${y}%`);
  node.addEventListener('animationend', () => node.remove(), { once: true });
  layer.appendChild(node);
  return true;
}

/**
 * Anel de shockwave no Ceifar.
 */
export function spawnShockwave(stage, options = {}) {
  if (!stage || resolveReduced(options)) return false;
  const doc = stage.ownerDocument || options.root || (typeof document !== 'undefined' ? document : null);
  if (!doc?.createElement) return false;
  const wave = doc.createElement('span');
  wave.className = 'despertar-shockwave';
  wave.setAttribute('aria-hidden', 'true');
  wave.addEventListener('animationend', () => wave.remove(), { once: true });
  stage.appendChild(wave);
  return true;
}

/**
 * Screen shake suave no stage do altar (Q17: sim, opt-out reduced-motion).
 */
export function shakeAltar(stage, options = {}) {
  if (!stage || resolveReduced(options)) return false;
  bumpClass(stage, 'is-shaking', options.durationMs ?? 280);
  return true;
}

/**
 * Pacote Ceifar: float + shockwave + shake (partículas ficam em particles.js).
 * Foice slash é disparado via pulseReapButton (is-slashing) — sem dobrar shake.
 */
export function playReapJuice(options = {}) {
  if (resolveReduced(options)) return false;
  const root = options.root ?? (typeof document !== 'undefined' ? document : null);
  const stage = options.stage
    || root?.querySelector?.('.despertar-reap-stage')
    || null;
  const layer = options.floatLayer || options.particleLayer || null;
  let any = false;
  if (spawnFloatText(layer, options)) any = true;
  if (spawnShockwave(stage, options)) any = true;
  if (shakeAltar(stage, options)) any = true;
  return any;
}

/**
 * Task F2 — classe de corte na Foice (ou pulse soft se reduced-motion).
 * @param {HTMLElement|null} button
 * @param {{ reducedMotion?: boolean, matchMedia?: Function, durationMs?: number }} [options]
 */
export function playFoiceSlash(button, options = {}) {
  if (!button) return false;
  const reduced = resolveReduced(options);
  button.classList.remove('is-slashing', 'is-slash-soft');
  void button.offsetWidth;
  bumpClass(button, reduced ? 'is-slash-soft' : 'is-slashing', options.durationMs ?? (reduced ? 300 : 260));
  return true;
}

/**
 * Flash na row do mercado ao contratar.
 */
export function flashBuyRow(root, generatorId, options = {}) {
  if (!root || !generatorId || resolveReduced(options)) return false;
  const card = root.querySelector?.(`.despertar-card--store[data-generator-id="${generatorId}"]`)
    || root.querySelector?.(`[data-generator-id="${generatorId}"]`);
  if (!card) return false;
  bumpClass(card, 'is-bought-flash', options.durationMs ?? 520);
  return true;
}

/**
 * Tween de spawn na prateleira (sprite aparece com pop).
 */
export function tweenShelfSpawn(root, generatorId, options = {}) {
  if (!root || !generatorId || resolveReduced(options)) return false;
  const shelf = root.querySelector?.(`.despertar-shelf[data-generator-id="${generatorId}"]`);
  if (!shelf || shelf.hidden) return false;
  bumpClass(shelf, 'is-spawn-pop', options.durationMs ?? 480);
  return true;
}

/**
 * Upgrade: ícone selado → ativo (além do is-owned do render).
 */
export function sealUpgradeIcon(root, upgradeId, options = {}) {
  if (!root || !upgradeId || resolveReduced(options)) return false;
  const buy = root.querySelector?.(`[data-buy-upgrade="${upgradeId}"]`);
  if (!buy) return false;
  // F4: juice de selo; o renderer remove o ícone da strip quando is-sealing acaba.
  bumpClass(buy, 'is-sealing', options.durationMs ?? 700);
  return true;
}

export { prefersReducedMotion as juicePrefersReducedMotion, bumpClass as juiceBumpClass };
