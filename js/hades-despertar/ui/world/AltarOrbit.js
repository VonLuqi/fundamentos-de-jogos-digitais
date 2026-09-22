/**
 * AltarOrbit — órbita + chuva + véu do Acheron (Task B2).
 * Anel principal = T1 (wandering_shade), cap de cursors; Canvas2D sem p5.
 */

import { cmp } from '../../core/decimal.js';
import { cappedNpcCount, prefersReducedMotion } from './WorldView.js';

/** Cap visual de cursors na órbita (budget / §13). */
export const ORBIT_CURSOR_CAP = 40;

/** Chuva passiva: teto de spawns/s e motes simultâneos. */
export const SOUL_RAIN_MAX_PER_SEC = 6;
export const SOUL_RAIN_MAX_MOTES = 16;

const T1_ID = 'wandering_shade';

/**
 * Quantos cursors desenhar a partir das Sombras Vagantes.
 * @param {number|string} shadeQty
 * @param {number} [cap]
 */
export function orbitCursorCount(shadeQty, cap = ORBIT_CURSOR_CAP) {
  return cappedNpcCount(shadeQty, cap);
}

/**
 * Altura do véu (milk) em % — prestígio + marcos leves.
 * @param {{ prestigeCount?: number, lifetimeSouls?: string|number }} state
 */
export function veilPercent(state = {}) {
  const prestige = Math.max(0, Number(state.prestigeCount) || 0);
  let pct = 6 + prestige * 3;
  const life = Number(state.lifetimeSouls);
  if (Number.isFinite(life)) {
    if (life >= 1e9) pct += 4;
    else if (life >= 1e6) pct += 3;
    else if (life >= 1e4) pct += 1;
  }
  return Math.min(22, Math.max(5, pct));
}

/**
 * Spawns/s da chuva a partir do SPS (log, rate-limited).
 * @param {string|number} sps
 */
export function soulRainRate(sps) {
  const n = Number(sps);
  if (!Number.isFinite(n) || n <= 0) return 0;
  // ~0.4/s em SPS baixo → asymptote SOUL_RAIN_MAX_PER_SEC
  const soft = Math.log10(1 + n) * 1.35;
  return Math.min(SOUL_RAIN_MAX_PER_SEC, Math.max(0, soft));
}

function drawCursor(ctx, x, y, angle, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(8, 16, 20, 0.92)';
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.quadraticCurveTo(5, -1, 3, 8);
  ctx.lineTo(0, 5);
  ctx.lineTo(-3, 8);
  ctx.quadraticCurveTo(-5, -1, 0, -7);
  ctx.fill();
  ctx.fillStyle = 'rgba(0, 168, 150, 0.9)';
  ctx.beginPath();
  ctx.arc(0, -3, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * @param {object} [options]
 */
export class AltarOrbit {
  constructor(options = {}) {
    this.root = options.document ?? (typeof document !== 'undefined' ? document : null);
    this.cap = Number(options.cap) > 0 ? Number(options.cap) : ORBIT_CURSOR_CAP;
    this.matchMedia = options.matchMedia;
    this.now = typeof options.now === 'function'
      ? options.now
      : () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

    this._orbitHost = null;
    this._canvas = null;
    this._ctx = null;
    this._particles = null;
    this._veil = null;
    this._cursorCount = 0;
    this._sps = '0';
    this._reducedMotion = false;
    this._mounted = false;
    this._lastFrame = null;
    this._rainCarry = 0;
    this._angle = 0;
  }

  /**
   * @param {{ orbitHost?: Element|null, particleLayer?: Element|null, veil?: Element|null }} hosts
   */
  mount(hosts = {}) {
    if (!this.root || this._mounted) return this;
    this._orbitHost = hosts.orbitHost || null;
    this._particles = hosts.particleLayer || null;
    this._veil = hosts.veil || null;

    if (this._orbitHost) {
      this._orbitHost.replaceChildren();
      const canvas = this.root.createElement('canvas');
      canvas.className = 'despertar-reap-orbit__canvas';
      canvas.setAttribute('aria-hidden', 'true');
      this._orbitHost.append(canvas);
      this._canvas = canvas;
      this._ctx = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
      this.#resizeCanvas();
    }

    this._mounted = true;
    this._reducedMotion = prefersReducedMotion(this.matchMedia);
    this._lastFrame = this.now();
    return this;
  }

  /**
   * @param {object} state
   * @param {{ reducedMotion?: boolean }} [meta]
   */
  sync(state, meta = {}) {
    if (!this._mounted || !state) return this;
    if (typeof meta.reducedMotion === 'boolean') {
      this._reducedMotion = meta.reducedMotion;
    } else {
      this._reducedMotion = prefersReducedMotion(this.matchMedia);
    }

    const qtyMap = typeof state.quantities === 'function'
      ? state.quantities()
      : (state.generators || {});
    const shades = Number(qtyMap[T1_ID] || 0);
    this._cursorCount = orbitCursorCount(shades, this.cap);
    this._sps = typeof state.sps === 'function' ? state.sps() : (state.sps || '0');

    if (this._veil) {
      const pct = veilPercent(state);
      this._veil.style.setProperty('--despertar-veil', `${pct}%`);
      this._veil.classList.toggle('is-milk', pct > 14);
      this._veil.hidden = false;
    }

    if (this._cursorCount === 0) {
      this.#clearOrbit();
    }
    return this;
  }

  /**
   * Frame de animação (chamar no render do GameLoop).
   * @param {number} [nowMs]
   */
  frame(nowMs) {
    if (!this._mounted) return;
    const now = Number.isFinite(nowMs) ? nowMs : this.now();
    const last = this._lastFrame == null ? now : this._lastFrame;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    this._lastFrame = now;

    if (this._reducedMotion) {
      this.#paintOrbit(0);
      return;
    }

    this._angle += dt * 0.55;
    this.#paintOrbit(this._angle);
    this.#tickRain(dt);
  }

  get cursorCount() {
    return this._cursorCount;
  }

  destroy() {
    this.#clearOrbit();
    this._orbitHost?.replaceChildren();
    this._canvas = null;
    this._ctx = null;
    this._mounted = false;
  }

  #resizeCanvas() {
    if (!this._canvas || !this._orbitHost) return;
    const rect = typeof this._orbitHost.getBoundingClientRect === 'function'
      ? this._orbitHost.getBoundingClientRect()
      : { width: 280, height: 280 };
    const w = Math.max(120, Math.floor(rect.width || 280));
    const h = Math.max(120, Math.floor(rect.height || 280));
    if (this._canvas.width !== w) this._canvas.width = w;
    if (this._canvas.height !== h) this._canvas.height = h;
  }

  #clearOrbit() {
    if (!this._ctx || !this._canvas) return;
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
  }

  #paintOrbit(angle) {
    if (!this._ctx || !this._canvas) return;
    this.#resizeCanvas();
    const { width: w, height: h } = this._canvas;
    this._ctx.clearRect(0, 0, w, h);
    const count = this._cursorCount;
    if (count <= 0) return;

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.42;
    this._ctx.strokeStyle = 'rgba(0, 168, 150, 0.22)';
    this._ctx.setLineDash([4, 6]);
    this._ctx.beginPath();
    this._ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this._ctx.stroke();
    this._ctx.setLineDash([]);

    for (let i = 0; i < count; i += 1) {
      const theta = angle + (i / count) * Math.PI * 2;
      const x = cx + Math.cos(theta) * radius;
      const y = cy + Math.sin(theta) * radius;
      drawCursor(this._ctx, x, y, theta, 1);
    }
  }

  #tickRain(dt) {
    if (!this._particles || this._reducedMotion || dt <= 0) return;
    if (cmp(this._sps, '0') <= 0 && this._cursorCount <= 0) return;

    const rate = soulRainRate(this._sps);
    if (rate <= 0) return;

    this._rainCarry += rate * dt;
    const spawn = Math.floor(this._rainCarry);
    if (spawn <= 0) return;
    this._rainCarry -= spawn;

    const doc = this._particles.ownerDocument || this.root;
    if (!doc?.createElement) return;

    for (let i = 0; i < spawn; i += 1) {
      while (this._particles.childElementCount >= SOUL_RAIN_MAX_MOTES) {
        this._particles.firstElementChild?.remove();
      }
      const mote = doc.createElement('span');
      mote.className = 'despertar-particle despertar-particle--rain';
      mote.setAttribute('aria-hidden', 'true');
      const x = 8 + Math.random() * 84;
      mote.style.setProperty('--rain-x', `${x}%`);
      mote.style.setProperty('--rain-delay', `${Math.random() * 0.2}s`);
      mote.style.setProperty('--rain-dur', `${1.4 + Math.random() * 1.1}s`);
      mote.addEventListener('animationend', () => mote.remove(), { once: true });
      this._particles.appendChild(mote);
    }
  }
}
