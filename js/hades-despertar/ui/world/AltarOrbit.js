/**
 * AltarOrbit — órbita + chuva + véu do Acheron.
 * T1 (wandering_shade) em auréolas Cookie: slots fixos por anel, lado a lado (G1.1).
 */

import { cmp } from '../../core/decimal.js';
import {
  BUY_PULSE_MS,
  buyPulseScale,
  cappedNpcCount,
  prefersReducedMotion,
} from './WorldView.js';

/** Cap visual de cursors na órbita (Cookie: muitos; budget canvas). */
export const ORBIT_CURSOR_CAP = 200;

/**
 * Slots por anel, do interno ao externo (densos, lado a lado como Cookie).
 * Soma 210 ≥ cap. Qty 63 → anéis 12+18+24+9.
 */
export const ORBIT_RING_SLOTS = Object.freeze([12, 18, 24, 30, 36, 42, 48]);

/** Raio do anel 0 e espaçamento entre anéis (fração do min(w,h)). */
export const ORBIT_BASE_RADIUS_FRAC = 0.26;
export const ORBIT_RING_GAP_FRAC = 0.072;

/** Spin base (rad/s); anéis externos mais lentos (parallax). */
export const ORBIT_SPIN_RAD_PER_SEC = 0.55;
export const ORBIT_RING_PARALLAX = 0.07;

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
 * Layout Cookie: preenche anel interno slot a slot; overflow → próximo raio.
 * Ângulos dos slots são fixos (`2π / slotsInRing`) — arco incompleto **não** reespalha.
 *
 * @param {number} count
 * @param {readonly number[]} [ringSlots]
 * @param {number} [cap]
 * @returns {{ ring: number, slot: number, slotsInRing: number }[]}
 */
export function orbitSlotLayout(count, ringSlots = ORBIT_RING_SLOTS, cap = ORBIT_CURSOR_CAP) {
  const n = Math.min(Math.max(0, Math.floor(Number(count) || 0)), Math.max(0, Math.floor(Number(cap) || 0)));
  const rings = Array.isArray(ringSlots) && ringSlots.length > 0 ? ringSlots : ORBIT_RING_SLOTS;
  /** @type {{ ring: number, slot: number, slotsInRing: number }[]} */
  const placements = [];
  let remaining = n;
  for (let ring = 0; ring < rings.length && remaining > 0; ring += 1) {
    const slotsInRing = Math.max(1, Math.floor(Number(rings[ring]) || 0));
    const filled = Math.min(slotsInRing, remaining);
    for (let slot = 0; slot < filled; slot += 1) {
      placements.push({ ring, slot, slotsInRing });
    }
    remaining -= filled;
  }
  return placements;
}

/**
 * Polar → cartesiano para um slot de anel.
 * @param {{ ring: number, slot: number, slotsInRing: number }} placement
 * @param {{ cx: number, cy: number, baseRadius: number, ringGap: number, angleOffset?: number, ringParallax?: number }} geom
 */
export function orbitPlacementXY(placement, geom) {
  const ring = Math.max(0, Math.floor(Number(placement.ring) || 0));
  const slot = Math.max(0, Math.floor(Number(placement.slot) || 0));
  const slotsInRing = Math.max(1, Math.floor(Number(placement.slotsInRing) || 1));
  const base = Number(geom.baseRadius) || 0;
  const gap = Number(geom.ringGap) || 0;
  const angleOffset = Number(geom.angleOffset) || 0;
  const parallax = Number(geom.ringParallax) || 0;
  const radius = base + ring * gap;
  const ringSpin = angleOffset * (1 - ring * parallax);
  const theta = ringSpin + (slot / slotsInRing) * Math.PI * 2;
  return {
    radius,
    theta,
    x: geom.cx + Math.cos(theta) * radius,
    y: geom.cy + Math.sin(theta) * radius,
  };
}

/**
 * Quantos anéis têm pelo menos um cursor (para guias).
 * @param {{ ring: number }[]} placements
 */
export function orbitActiveRingCount(placements) {
  if (!placements?.length) return 0;
  let max = 0;
  for (const p of placements) {
    const r = Math.floor(Number(p.ring) || 0);
    if (r > max) max = r;
  }
  return max + 1;
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

/** Escala: anel externo ~8% menor por nível (piso 0.72). */
export const ORBIT_RING_SCALE_STEP = 0.08;
export const ORBIT_RING_SCALE_MIN = 0.72;

/**
 * Escala visual do cursor por índice de anel (G1.2).
 * @param {number} ring
 */
export function orbitRingScale(ring) {
  const r = Math.max(0, Math.floor(Number(ring) || 0));
  return Math.max(ORBIT_RING_SCALE_MIN, 1 - r * ORBIT_RING_SCALE_STEP);
}

/**
 * Marca os primeiros `shinyCount` placements como shiny (convenção G4).
 * @param {{ ring: number, slot: number, slotsInRing: number, shiny?: boolean }[]} placements
 * @param {number} shinyCount
 */
export function markShinyPlacements(placements, shinyCount = 0) {
  const n = Math.max(0, Math.floor(Number(shinyCount) || 0));
  if (!placements?.length) return placements || [];
  for (let i = 0; i < placements.length; i += 1) {
    placements[i].shiny = i < n;
  }
  return placements;
}

/**
 * Lê shinyCount de T1 no state (gancho G4; default 0).
 * @param {object} state
 * @param {number} cursorCount
 */
export function orbitShinyCountFromState(state, cursorCount = 0) {
  if (!state) return 0;
  let raw = 0;
  if (typeof state.shinyCounts === 'function') {
    const map = state.shinyCounts();
    raw = Number(map?.[T1_ID] || 0);
  } else if (state.shinyCounts && typeof state.shinyCounts === 'object') {
    raw = Number(state.shinyCounts[T1_ID] || 0);
  }
  const cap = Math.max(0, Math.floor(Number(cursorCount) || 0));
  return Math.min(cap, Math.max(0, Math.floor(raw) || 0));
}

/** Raio base de hit-test do cursor (px lógicos; escala com anel). */
export const ORBIT_HIT_RADIUS = 12;

/**
 * Hit-test ponto → índice de placement (G3.1).
 * Escolhe o cursor mais próximo dentro do raio (escalado por anel).
 *
 * @param {number} mx
 * @param {number} my
 * @param {{ ring: number, slot: number, slotsInRing: number }[]} placements
 * @param {{ cx: number, cy: number, baseRadius: number, ringGap: number, angleOffset?: number, ringParallax?: number }} geom
 * @param {number} [hitRadiusBase]
 * @returns {number} índice ou -1
 */
export function orbitHitIndex(mx, my, placements, geom, hitRadiusBase = ORBIT_HIT_RADIUS) {
  if (!placements?.length || !geom) return -1;
  const x0 = Number(mx);
  const y0 = Number(my);
  if (!Number.isFinite(x0) || !Number.isFinite(y0)) return -1;
  const baseR = Number(hitRadiusBase) > 0 ? Number(hitRadiusBase) : ORBIT_HIT_RADIUS;
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < placements.length; i += 1) {
    const placement = placements[i];
    const { x, y } = orbitPlacementXY(placement, geom);
    const scale = orbitRingScale(placement.ring);
    const r = baseR * scale;
    const dx = x0 - x;
    const dy = y0 - y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= r * r && d2 < bestDist) {
      bestDist = d2;
      best = i;
    }
  }
  return best;
}

/**
 * Cursor procedural Hades (Q2). Shiny = invert + glow Styx; reduced = borda dourada (Q11).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} angle
 * @param {number} [scale]
 * @param {{ shiny?: boolean, reducedMotion?: boolean }} [opts]
 */
export function drawOrbitCursor(ctx, x, y, angle, scale = 1, opts = {}) {
  const shiny = Boolean(opts.shiny);
  const reduced = Boolean(opts.reducedMotion);
  const body = shiny && !reduced ? 'rgba(242, 232, 220, 0.95)' : 'rgba(8, 16, 20, 0.92)';
  const gem = shiny && !reduced ? 'rgba(217, 4, 41, 0.95)' : 'rgba(0, 168, 150, 0.9)';

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);
  ctx.scale(scale, scale);

  if (shiny) {
    if (reduced) {
      ctx.strokeStyle = 'rgba(207, 167, 89, 0.95)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.shadowColor = 'rgba(0, 168, 150, 0.85)';
      ctx.shadowBlur = 10;
    }
  }

  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.quadraticCurveTo(5, -1, 3, 8);
  ctx.lineTo(0, 5);
  ctx.lineTo(-3, 8);
  ctx.quadraticCurveTo(-5, -1, 0, -7);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = gem;
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
    this.ringSlots = Array.isArray(options.ringSlots) ? options.ringSlots : ORBIT_RING_SLOTS;
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
    this._placements = [];
    this._sps = '0';
    this._reducedMotion = false;
    this._mounted = false;
    this._lastFrame = null;
    this._rainCarry = 0;
    this._angle = 0;
    this._lastGeom = null;
    /** @type {((hit: { generatorId: string, index: number, shiny: boolean, source: string }|null, event?: PointerEvent) => void)|null} */
    this.onNpcHover = typeof options.onNpcHover === 'function' ? options.onNpcHover : null;
    this._hoverKey = null;
    this._hoverIndex = -1;
    this._buyPulse = null;
    /** @type {{ from: number, count: number, start: number, duration: number }|null} */
    this._pendingBuyPulse = null;
    this._stage = null;
    this._onStageMove = null;
    this._onStageLeave = null;
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
    this.#bindStagePointer();
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
    this._placements = orbitSlotLayout(this._cursorCount, this.ringSlots, this.cap);
    markShinyPlacements(this._placements, orbitShinyCountFromState(state, this._cursorCount));
    this._sps = typeof state.sps === 'function' ? state.sps() : (state.sps || '0');

    if (this._pendingBuyPulse && this._cursorCount > 0) {
      this._buyPulse = this._pendingBuyPulse;
      this.#bumpOrbitHost(this._pendingBuyPulse.duration);
      this._pendingBuyPulse = null;
    }

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

    this._angle += dt * ORBIT_SPIN_RAD_PER_SEC;
    this.#paintOrbit(this._angle);
    this.#tickRain(dt);
  }

  get cursorCount() {
    return this._cursorCount;
  }

  /** @returns {{ ring: number, slot: number, slotsInRing: number }[]} */
  get placements() {
    return this._placements;
  }

  /**
   * Scale curto nos cursors recém-comprados (G5.2). No-op com reduced-motion.
   * Pode ficar pendente até o próximo `sync` se a órbita ainda estiver vazia.
   * @param {{ fromIndex?: number, count?: number, durationMs?: number }} [opts]
   */
  pulseBuy(opts = {}) {
    if (this._reducedMotion) return false;
    const count = Math.max(0, Math.floor(Number(opts.count) || 0));
    if (count <= 0) return false;
    const fromIndex = Math.max(0, Math.floor(Number(opts.fromIndex) || 0));
    const duration = Number(opts.durationMs) > 0 ? Number(opts.durationMs) : BUY_PULSE_MS;
    const pulse = {
      from: fromIndex,
      count,
      start: this.now(),
      duration,
    };
    if (this._cursorCount > 0) {
      this._buyPulse = pulse;
      this._pendingBuyPulse = null;
      this.#bumpOrbitHost(duration);
      this.#paintOrbit(this._reducedMotion ? 0 : this._angle);
      return true;
    }
    this._pendingBuyPulse = pulse;
    return true;
  }

  #bumpOrbitHost(durationMs) {
    const host = this._orbitHost;
    if (!host?.classList) return;
    host.classList.remove('is-buy-pulse');
    void host.offsetWidth;
    host.classList.add('is-buy-pulse');
    const timer = typeof globalThis.setTimeout === 'function' ? globalThis.setTimeout.bind(globalThis) : null;
    timer?.(() => host.classList.remove('is-buy-pulse'), durationMs || BUY_PULSE_MS);
  }

  destroy() {
    this.#unbindStagePointer();
    this.#clearOrbit();
    this._orbitHost?.replaceChildren();
    this._canvas = null;
    this._ctx = null;
    this._lastGeom = null;
    this._mounted = false;
    this._hoverKey = null;
    this._hoverIndex = -1;
    this._buyPulse = null;
    this._pendingBuyPulse = null;
  }

  #bindStagePointer() {
    this.#unbindStagePointer();
    const stage = this._orbitHost?.parentElement || this._orbitHost;
    if (!stage?.addEventListener) return;
    this._stage = stage;
    this._onStageMove = (event) => this.#onStagePointerMove(event);
    this._onStageLeave = () => this.#emitNpcHover(null);
    stage.addEventListener('pointermove', this._onStageMove);
    stage.addEventListener('pointerleave', this._onStageLeave);
  }

  #unbindStagePointer() {
    if (this._stage && this._onStageMove) {
      this._stage.removeEventListener?.('pointermove', this._onStageMove);
    }
    if (this._stage && this._onStageLeave) {
      this._stage.removeEventListener?.('pointerleave', this._onStageLeave);
    }
    this._stage = null;
    this._onStageMove = null;
    this._onStageLeave = null;
  }

  #canvasLocalPoint(clientX, clientY) {
    const canvas = this._canvas;
    if (!canvas || typeof canvas.getBoundingClientRect !== 'function') {
      return { x: Number(clientX) || 0, y: Number(clientY) || 0 };
    }
    const rect = canvas.getBoundingClientRect();
    const cssW = rect.width || canvas.width || 1;
    const cssH = rect.height || canvas.height || 1;
    // Canvas bitmap = CSS size (sem DPR neste módulo).
    return {
      x: ((Number(clientX) - rect.left) / cssW) * (canvas.width || cssW),
      y: ((Number(clientY) - rect.top) / cssH) * (canvas.height || cssH),
    };
  }

  #onStagePointerMove(event) {
    if (!this._placements?.length || !this._lastGeom) {
      this.#emitNpcHover(null, event);
      return;
    }
    const { x, y } = this.#canvasLocalPoint(event.clientX, event.clientY);
    const index = orbitHitIndex(x, y, this._placements, this._lastGeom);
    if (index < 0) {
      this.#emitNpcHover(null, event);
      return;
    }
    const placement = this._placements[index];
    this.#emitNpcHover({
      generatorId: T1_ID,
      index,
      shiny: Boolean(placement?.shiny),
      source: 'orbit',
    }, event);
  }

  #emitNpcHover(hit, event = null) {
    if (!hit) {
      if (this._hoverKey == null) return;
      this._hoverKey = null;
      this._hoverIndex = -1;
      this.onNpcHover?.(null, event);
      return;
    }
    this._hoverKey = `orbit:${hit.generatorId}:${hit.index}:${hit.shiny ? 1 : 0}`;
    this._hoverIndex = hit.index;
    this.onNpcHover?.(hit, event);
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
    this._lastGeom = null;
  }

  #paintOrbit(angle) {
    if (!this._ctx || !this._canvas) return;
    this.#resizeCanvas();
    const { width: w, height: h } = this._canvas;
    this._ctx.clearRect(0, 0, w, h);
    const placements = this._placements;
    if (!placements.length) return;

    const cx = w / 2;
    const cy = h / 2;
    const minDim = Math.min(w, h);
    const baseRadius = minDim * ORBIT_BASE_RADIUS_FRAC;
    const ringGap = minDim * ORBIT_RING_GAP_FRAC;
    const ringsActive = orbitActiveRingCount(placements);

    this._ctx.strokeStyle = 'rgba(0, 168, 150, 0.22)';
    this._ctx.setLineDash([4, 6]);
    for (let ring = 0; ring < ringsActive; ring += 1) {
      const r = baseRadius + ring * ringGap;
      this._ctx.beginPath();
      this._ctx.arc(cx, cy, r, 0, Math.PI * 2);
      this._ctx.stroke();
    }
    this._ctx.setLineDash([]);

    const geom = {
      cx,
      cy,
      baseRadius,
      ringGap,
      angleOffset: angle,
      ringParallax: ORBIT_RING_PARALLAX,
    };
    this._lastGeom = geom;

    const pulse = this._buyPulse;
    const nowMs = this.now();
    let pulseFactor = null;
    if (pulse && !this._reducedMotion) {
      const elapsed = nowMs - pulse.start;
      if (elapsed >= pulse.duration) {
        this._buyPulse = null;
      } else {
        const factor = buyPulseScale(elapsed / pulse.duration);
        pulseFactor = (i) => (
          i >= pulse.from && i < pulse.from + pulse.count ? factor : 1
        );
      }
    }

    for (let i = 0; i < placements.length; i += 1) {
      const placement = placements[i];
      const { x, y, theta } = orbitPlacementXY(placement, geom);
      const ringScale = orbitRingScale(placement.ring);
      const buyScale = pulseFactor ? pulseFactor(i) : 1;
      const scale = ringScale * buyScale;
      drawOrbitCursor(this._ctx, x, y, theta, scale, {
        shiny: Boolean(placement.shiny),
        reducedMotion: this._reducedMotion,
      });
      if (this._hoverIndex === i) {
        this._ctx.save();
        this._ctx.strokeStyle = 'rgba(0, 168, 150, 0.95)';
        this._ctx.lineWidth = 2;
        this._ctx.beginPath();
        this._ctx.arc(x, y, 11 * ringScale, 0, Math.PI * 2);
        this._ctx.stroke();
        this._ctx.restore();
      }
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
