/**
 * WorldView — prateleiras do Domínio (Task B1 / F1).
 * NPCs em colunas; canvas cresce com qty + overflow-x.
 * T1 (Sombra Vagante) fica só na órbita do altar — sem prateleira duplicada.
 * Teto alto de segurança (perf); órbita do altar tem cap próprio.
 */

import { GENERATORS } from '../../config/generators.js';
import { setMarqueeTextIfOverflow } from '../Marquee.js';
import { loadGeneratorImage } from './SpriteAtlas.js';

/**
 * Teto de segurança de sprites por prateleira (não o “máx. Cookie” antigo de 40).
 * Qty acima disso ainda conta no HUD; só a prateleira para de desenhar.
 */
export const SHELF_NPC_CAP = 400;

/**
 * Ids que já têm teatro na órbita da Foice — não montam prateleira no Mundo.
 * (Anel principal = T1 / wandering_shade.)
 */
export const SHELF_ORBIT_ONLY_IDS = Object.freeze(['wandering_shade']);

/** @param {{ id?: string, tier?: number }|string|null|undefined} defOrId */
export function isShelfGenerator(defOrId) {
  const id = typeof defOrId === 'string' ? defOrId : defOrId?.id;
  if (!id) return false;
  return !SHELF_ORBIT_ONLY_IDS.includes(id);
}

/**
 * Grade Cookie: preenche por **colunas** (cima→baixo, depois próxima coluna).
 * Altura fixa em ROWS; largura do canvas = colunas necessárias (overflow-x).
 */
export const SHELF_GRID_ROWS = 4;
/** Colunas de referência (viewport mínimo / docs). */
export const SHELF_GRID_COLS = 10;
/** Teto de colunas vazias só para preencher a largura visível do campo. */
export const SHELF_COLS_MAX_FILL = 32;
/**
 * Célula quadrada em px lógicos (sprites contain).
 */
export const SHELF_CELL = 36;
export const SHELF_CELL_GAP = 4;
export const SHELF_PAD = 10;

/**
 * Task C2 — motes passivos nas prateleiras.
 * Teatro visual com budget global; NUNCA espelha o saldo (HUD = verdade).
 */
export const SHELF_MOTE_MAX_PER_SEC = 8;
export const SHELF_MOTE_MAX_ON_SCREEN = 20;

const TIER_PALETTE = Object.freeze({
  1: { body: 'rgba(8, 16, 20, 0.92)', accent: 'rgba(0, 168, 150, 0.85)' },
  2: { body: 'rgba(18, 14, 10, 0.92)', accent: 'rgba(207, 167, 89, 0.85)' },
  3: { body: 'rgba(16, 10, 12, 0.94)', accent: 'rgba(217, 4, 41, 0.75)' },
  4: { body: 'rgba(14, 10, 22, 0.94)', accent: 'rgba(168, 85, 247, 0.8)' },
  5: { body: 'rgba(20, 8, 10, 0.94)', accent: 'rgba(217, 4, 41, 0.9)' },
  6: { body: 'rgba(10, 8, 18, 0.96)', accent: 'rgba(207, 167, 89, 0.95)' },
});

/**
 * @param {number|string} qty
 * @param {number} [cap]
 */
export function cappedNpcCount(qty, cap = SHELF_NPC_CAP) {
  const n = Math.floor(Number(qty) || 0);
  if (n <= 0) return 0;
  const limit = Number(cap) > 0 ? Math.floor(Number(cap)) : SHELF_NPC_CAP;
  return Math.min(limit, n);
}

/**
 * Dimensão lógica do canvas (coords de paint).
 * @param {number} [cols]
 * @param {number} [rows]
 */
export function shelfCanvasSize(cols = SHELF_GRID_COLS, rows = SHELF_GRID_ROWS) {
  const c = Math.max(1, Math.floor(Number(cols) || SHELF_GRID_COLS));
  const r = Math.max(1, Math.floor(Number(rows) || SHELF_GRID_ROWS));
  return {
    width: SHELF_PAD * 2 + c * SHELF_CELL + Math.max(0, c - 1) * SHELF_CELL_GAP,
    height: SHELF_PAD * 2 + r * SHELF_CELL + Math.max(0, r - 1) * SHELF_CELL_GAP,
  };
}

/** Colunas necessárias para caber `count` NPCs (ordem por coluna). Cresce sem teto 10. */
export function shelfColumnsForCount(count, rows = SHELF_GRID_ROWS) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  const r = Math.max(1, Math.floor(Number(rows) || SHELF_GRID_ROWS));
  if (n <= 0) return 1;
  const maxCols = Math.max(SHELF_GRID_COLS, Math.ceil(SHELF_NPC_CAP / r));
  return Math.min(maxCols, Math.ceil(n / r));
}

/** Quantas colunas cabem na largura útil do campo (para preencher o viewport). */
export function shelfColumnsForWidth(widthPx) {
  const inner = Number(widthPx) - SHELF_PAD * 2;
  if (!(inner > 0)) return 1;
  const stride = SHELF_CELL + SHELF_CELL_GAP;
  return Math.max(1, Math.min(SHELF_COLS_MAX_FILL, Math.floor((inner + SHELF_CELL_GAP) / stride)));
}

/** Cap de DPR para nitidez em telas HiDPI sem estourar VRAM. */
export function shelfDevicePixelRatio(env = globalThis) {
  const raw = Number(env?.devicePixelRatio);
  if (!Number.isFinite(raw) || raw <= 1) return 1;
  return Math.min(2, raw);
}

/**
 * Origem (topo-esquerda) da célula i — **coluna-major** (enche a coluna, depois a seguinte).
 * @param {number} index
 * @param {number} [rows]
 */
export function shelfCellOrigin(index, rows = SHELF_GRID_ROWS) {
  const r = Math.max(1, Math.floor(Number(rows) || SHELF_GRID_ROWS));
  const i = Math.max(0, Math.floor(Number(index) || 0));
  const col = Math.floor(i / r);
  const row = i % r;
  return {
    x: SHELF_PAD + col * (SHELF_CELL + SHELF_CELL_GAP),
    y: SHELF_PAD + row * (SHELF_CELL + SHELF_CELL_GAP),
    col,
    row,
  };
}

/**
 * Hit-test canvas lógico → índice de célula (G3.1).
 * Ordem coluna-major; rejeita gap entre células e índices ≥ count.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} count
 * @param {number} [rows]
 * @returns {number} índice ou -1
 */
export function shelfHitIndex(x, y, count, rows = SHELF_GRID_ROWS) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (n <= 0) return -1;
  const r = Math.max(1, Math.floor(Number(rows) || SHELF_GRID_ROWS));
  const stride = SHELF_CELL + SHELF_CELL_GAP;
  const localX = Number(x) - SHELF_PAD;
  const localY = Number(y) - SHELF_PAD;
  if (!(localX >= 0) || !(localY >= 0)) return -1;
  const col = Math.floor(localX / stride);
  const row = Math.floor(localY / stride);
  if (row < 0 || row >= r || col < 0) return -1;
  const inCellX = localX - col * stride;
  const inCellY = localY - row * stride;
  if (inCellX >= SHELF_CELL || inCellY >= SHELF_CELL) return -1;
  const i = col * r + row;
  if (i < 0 || i >= n) return -1;
  return i;
}

/** Duração do scale no buy (G5.2). */
export const BUY_PULSE_MS = 420;
/** Pico de scale (+20%). */
export const BUY_PULSE_PEAK = 0.2;

/**
 * Fator de scale 1→peak→1 ao longo do pulse (G5.2).
 * @param {number} progress 0..1
 */
export function buyPulseScale(progress) {
  const p = Math.min(1, Math.max(0, Number(progress) || 0));
  return 1 + BUY_PULSE_PEAK * Math.sin(Math.PI * p);
}

/**
 * Highlight de célula sob o cursor (G5.2) — estático; ok com reduced-motion.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cellX
 * @param {number} cellY
 * @param {number} [cell]
 */
export function drawShelfCellHighlight(ctx, cellX, cellY, cell = SHELF_CELL) {
  if (!ctx) return;
  const pad = 1;
  ctx.save();
  ctx.fillStyle = 'rgba(0, 168, 150, 0.14)';
  ctx.strokeStyle = 'rgba(0, 168, 150, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.fillRect(cellX + pad, cellY + pad, cell - pad * 2, cell - pad * 2);
  ctx.strokeRect(cellX + pad, cellY + pad, cell - pad * 2, cell - pad * 2);
  ctx.restore();
}

/**
 * Lê shinyCount de um gerador no state (gancho G4; default 0).
 * Convenção: primeiros `shinyCount` índices são shiny.
 *
 * @param {object|null|undefined} state
 * @param {string} generatorId
 * @param {number} [visualCap]
 */
export function shinyCountFromState(state, generatorId, visualCap = Infinity) {
  if (!state || !generatorId) return 0;
  let raw = 0;
  if (typeof state.shinyCounts === 'function') {
    const map = state.shinyCounts();
    raw = Number(map?.[generatorId] || 0);
  } else if (state.shinyCounts && typeof state.shinyCounts === 'object') {
    raw = Number(state.shinyCounts[generatorId] || 0);
  }
  const cap = Number.isFinite(visualCap) ? Math.max(0, Math.floor(visualCap)) : Infinity;
  const n = Math.max(0, Math.floor(raw) || 0);
  return Number.isFinite(cap) ? Math.min(cap, n) : n;
}

/**
 * drawImage com object-fit: contain dentro da célula (nunca stretch assimétrico).
 * Shiny (G4.2 / Q11): invert + glow Styx; reduced-motion = borda dourada.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {CanvasImageSource} img
 * @param {number} cellX
 * @param {number} cellY
 * @param {number} [cell]
 * @param {number} [bobY]
 * @param {{ shiny?: boolean, reducedMotion?: boolean }} [opts]
 */
export function drawContainedInCell(ctx, img, cellX, cellY, cell = SHELF_CELL, bobY = 0, opts = {}) {
  if (!ctx || !img) return;
  const shiny = Boolean(opts.shiny);
  const reduced = Boolean(opts.reducedMotion);
  const iw = Number(img.naturalWidth || img.width) || 1;
  const ih = Number(img.naturalHeight || img.height) || 1;
  const scale = Math.min(cell / iw, cell / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = cellX + (cell - dw) / 2;
  const dy = cellY + (cell - dh) / 2 + bobY;
  const prev = ctx.imageSmoothingEnabled;
  const prevQuality = ctx.imageSmoothingQuality;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  if (prevQuality != null) ctx.imageSmoothingQuality = 'high';

  if (shiny) {
    if (reduced) {
      ctx.strokeStyle = 'rgba(207, 167, 89, 0.95)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cellX + 0.75, cellY + 0.75 + bobY, cell - 1.5, cell - 1.5);
    } else {
      ctx.shadowColor = 'rgba(0, 168, 150, 0.85)';
      ctx.shadowBlur = 10;
      if (typeof ctx.filter === 'string' || 'filter' in ctx) {
        ctx.filter = 'invert(1) hue-rotate(180deg)';
      }
    }
  }

  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  ctx.imageSmoothingEnabled = prev;
  if (prevQuality != null) ctx.imageSmoothingQuality = prevQuality;
}

/**
 * Peso “sabor” da linha (log). 100× qty ≠ 100× motes.
 * @param {number|string} qty
 * @param {string|number} baseRate
 */
export function shelfLineMoteWeight(qty, baseRate) {
  const n = Math.max(0, Math.floor(Number(qty) || 0));
  const rate = Number(baseRate);
  if (n <= 0 || !Number.isFinite(rate) || rate <= 0) return 0;
  return Math.log10(1 + n * rate);
}

/**
 * Distribui o budget global (máx. N/s) entre prateleiras por peso.
 * @param {Record<string, number>} weights
 * @param {number} [maxPerSec]
 * @returns {Record<string, number>}
 */
export function allocateShelfMoteRates(weights, maxPerSec = SHELF_MOTE_MAX_PER_SEC) {
  const entries = Object.entries(weights || {}).filter(([, w]) => Number(w) > 0);
  const sum = entries.reduce((acc, [, w]) => acc + Number(w), 0);
  if (sum <= 0) return {};
  const cap = Number(maxPerSec) > 0 ? Number(maxPerSec) : SHELF_MOTE_MAX_PER_SEC;
  const total = Math.min(cap, Math.max(0.15, sum * 0.85));
  const out = {};
  for (const [id, w] of entries) {
    out[id] = (Number(w) / sum) * total;
  }
  return out;
}

export function prefersReducedMotion(matchMediaFn) {
  try {
    const mm = typeof matchMediaFn === 'function'
      ? matchMediaFn
      : (typeof matchMedia === 'function' ? matchMedia : null);
    return Boolean(mm?.('(prefers-reduced-motion: reduce)')?.matches);
  } catch {
    return false;
  }
}

/**
 * Silhueta flat centrada na célula (escala para caber sem distorcer).
 * Shiny (G4.2): invert de cores + glow; reduced = borda dourada.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cellX
 * @param {number} cellY
 * @param {number} tier
 * @param {number} [bobY]
 * @param {number} [cell]
 * @param {{ shiny?: boolean, reducedMotion?: boolean }} [opts]
 */
export function drawNpcSilhouette(ctx, cellX, cellY, tier, bobY = 0, cell = SHELF_CELL, opts = {}) {
  const shiny = Boolean(opts.shiny);
  const reduced = Boolean(opts.reducedMotion);
  const palette = TIER_PALETTE[tier] || TIER_PALETTE[1];
  const body = shiny && !reduced ? 'rgba(242, 232, 220, 0.95)' : palette.body;
  const accent = shiny && !reduced ? 'rgba(217, 4, 41, 0.9)' : palette.accent;
  const s = cell / 24;
  const cx = cellX + cell / 2;
  const cy = cellY + cell / 2 + bobY + 1 * s;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);

  if (shiny) {
    if (reduced) {
      ctx.strokeStyle = 'rgba(207, 167, 89, 0.95)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, -2, 12, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.shadowColor = 'rgba(0, 168, 150, 0.85)';
      ctx.shadowBlur = 10;
    }
  }

  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, -1, 5.5, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -11, 4.2, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.ellipse(0, 6, 6, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.ellipse(-1.6, -11, 0.9, 0.75, 0, 0, Math.PI * 2);
  ctx.ellipse(1.6, -11, 0.9, 0.75, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * @param {object} [options]
 * @param {Document} [options.document]
 * @param {number} [options.cap]
 * @param {(id: string, ctx: object) => boolean} [options.isGeneratorRevealed]
 * @param {(query: string) => { matches?: boolean }|null} [options.matchMedia]
 * @param {(cb: FrameRequestCallback) => number} [options.requestFrame]
 * @param {(id: number) => void} [options.cancelFrame]
 * @param {() => number} [options.now]
 */
export class WorldView {
  constructor(options = {}) {
    this.root = options.document ?? (typeof document !== 'undefined' ? document : null);
    this.cap = Number(options.cap) > 0 ? Number(options.cap) : SHELF_NPC_CAP;
    this.isGeneratorRevealed = typeof options.isGeneratorRevealed === 'function'
      ? options.isGeneratorRevealed
      : () => true;
    this.matchMedia = options.matchMedia;
    this.requestFrame = typeof options.requestFrame === 'function'
      ? options.requestFrame
      : (typeof requestAnimationFrame === 'function' ? requestAnimationFrame.bind(globalThis) : null);
    this.cancelFrame = typeof options.cancelFrame === 'function'
      ? options.cancelFrame
      : (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame.bind(globalThis) : null);
    this.now = typeof options.now === 'function'
      ? options.now
      : () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

    this._host = null;
    this._hint = null;
    this._shelves = new Map();
    this._raf = null;
    this._running = false;
    this._reducedMotion = false;
    this._hasSprites = false;
    this._mounted = false;
    this._moteRates = {};
    this._moteCarry = {};
    this._moteLast = null;
    this._baseSize = shelfCanvasSize(SHELF_GRID_COLS, SHELF_GRID_ROWS);
    this._dpr = shelfDevicePixelRatio();
    this._resizeObserver = null;
    this._onVisibility = () => this.#onVisibility();
    /** @type {((hit: { generatorId: string, index: number, shiny: boolean }|null, event?: PointerEvent) => void)|null} */
    this.onNpcHover = typeof options.onNpcHover === 'function' ? options.onNpcHover : null;
    this._hoverKey = null;
    /** @type {{ generatorId: string, index: number }|null} */
    this._hoverHit = null;
    /** @type {{ generatorId: string, from: number, count: number, start: number, duration: number }|null} */
    this._pendingBuyPulse = null;
  }

  mount(host, hint = null) {
    if (!host || !this.root || this._mounted) return this;
    this._host = host;
    this._hint = hint;
    host.replaceChildren();
    this._shelves.clear();

    const baseH = this._baseSize.height;
    this._dpr = shelfDevicePixelRatio();

    for (const def of GENERATORS) {
      if (!isShelfGenerator(def)) continue;

      const shelf = this.root.createElement('div');
      shelf.className = 'despertar-shelf is-empty';
      shelf.dataset.generatorId = def.id;
      shelf.dataset.tier = String(def.tier);
      shelf.hidden = true;

      const label = this.root.createElement('span');
      label.className = 'despertar-shelf__label';
      label.textContent = def.name;
      label.dataset.shelfLabel = '1';

      const field = this.root.createElement('div');
      field.className = 'despertar-shelf__field';
      field.style.setProperty('--shelf-h', `${baseH}px`);

      const canvas = this.root.createElement('canvas');
      canvas.className = 'despertar-shelf__canvas';
      canvas.setAttribute('aria-hidden', 'true');

      const motes = this.root.createElement('div');
      motes.className = 'despertar-shelf__motes';
      motes.setAttribute('aria-hidden', 'true');

      field.append(canvas, motes);
      shelf.append(label, field);
      host.append(shelf);

      const ctx = typeof canvas.getContext === 'function'
        ? canvas.getContext('2d')
        : null;

      const nodes = {
        def,
        shelf,
        label,
        field,
        canvas,
        ctx,
        motes,
        count: 0,
        cols: SHELF_GRID_COLS,
        logicalSize: shelfCanvasSize(SHELF_GRID_COLS, SHELF_GRID_ROWS),
        phase: Math.random() * Math.PI * 2,
        sprite: null,
        spriteTried: false,
        shinyCount: 0,
      };
      this.#layoutShelf(nodes);
      this.#bindShelfPointer(nodes);
      this._shelves.set(def.id, nodes);
    }

    this.#bindResizeObserver();
    this._mounted = true;
    this._reducedMotion = prefersReducedMotion(this.matchMedia);
    this.#listenVisibility(true);
    this.#prefetchSprites();
    return this;
  }

  /**
   * Atualiza prateleiras a partir do estado (qty ≥ 1 e revelado).
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
    const souls = state.souls ?? '0';
    let any = false;
    let sprites = 0;
    const weights = {};
    this._dpr = shelfDevicePixelRatio();

    for (const def of GENERATORS) {
      if (!isShelfGenerator(def)) continue;
      const nodes = this._shelves.get(def.id);
      if (!nodes) continue;
      const qty = Number(qtyMap[def.id] || 0);
      const revealed = this.isGeneratorRevealed(def.id, { souls, generators: qtyMap });
      const show = revealed && qty > 0;
      nodes.shelf.hidden = !show;
      if (!show) {
        if (nodes.count !== 0) {
          nodes.count = 0;
          this.#paintShelf(nodes, true);
        }
        nodes.motes?.replaceChildren?.();
        continue;
      }

      any = true;
      nodes.shelf.classList.toggle('is-empty', qty <= 0);
      const visual = cappedNpcCount(qty, this.cap);
      sprites += visual;
      nodes.shelf.removeAttribute?.('title');
      nodes.shelf.title = '';
      const nextShiny = shinyCountFromState(state, def.id, visual);
      const shinyChanged = nextShiny !== (nodes.shinyCount || 0);
      nodes.shinyCount = nextShiny;
      this.#refreshShelfLabel(nodes);
      weights[def.id] = shelfLineMoteWeight(qty, def.baseRate);

      const countChanged = visual !== nodes.count;
      nodes.count = visual;
      this.#layoutShelf(nodes);
      if (this._pendingBuyPulse?.generatorId === def.id && show) {
        nodes._buyPulse = {
          from: this._pendingBuyPulse.from,
          count: this._pendingBuyPulse.count,
          start: this._pendingBuyPulse.start,
          duration: this._pendingBuyPulse.duration,
        };
        this._pendingBuyPulse = null;
        nodes._needsPaint = true;
      }
      if (countChanged || shinyChanged || nodes._needsPaint) {
        nodes._needsPaint = false;
        this.#paintShelf(nodes, true);
      }
    }

    this._moteRates = this._reducedMotion
      ? {}
      : allocateShelfMoteRates(weights, SHELF_MOTE_MAX_PER_SEC);

    if (this._hint) {
      this._hint.hidden = any;
    }

    this._hasSprites = sprites > 0;
    if (this._hasSprites && !this._reducedMotion) {
      this.#startLoop();
    } else {
      this.#stopLoop();
      this.#clearAllMotes();
      if (this._hasSprites && this._reducedMotion) {
        this.#paintAll(true);
      }
    }
    return this;
  }

  /** Força um frame (testes / reduced-motion). */
  paint(staticPose = false) {
    this.#paintAll(staticPose || this._reducedMotion);
  }

  destroy() {
    this.#stopLoop();
    this.#listenVisibility(false);
    this.#unbindResizeObserver();
    for (const nodes of this._shelves.values()) {
      this.#unbindShelfPointer(nodes);
    }
    this._host?.replaceChildren();
    this._shelves.clear();
    this._mounted = false;
    this._hasSprites = false;
    this._hoverKey = null;
    this._hoverHit = null;
    this._pendingBuyPulse = null;
  }

  get hasSprites() {
    return this._hasSprites;
  }

  get isAnimating() {
    return this._running;
  }

  get moteRates() {
    return { ...this._moteRates };
  }

  /**
   * Scale curto nas células recém-compradas (G5.2). No-op com reduced-motion.
   * Pode ficar pendente até o próximo `sync` se a prateleira ainda não existir.
   * @param {string} generatorId
   * @param {{ fromIndex?: number, count?: number, durationMs?: number }} [opts]
   */
  pulseBuy(generatorId, opts = {}) {
    if (this._reducedMotion || !generatorId) return false;
    const count = Math.max(0, Math.floor(Number(opts.count) || 0));
    if (count <= 0) return false;
    const fromIndex = Math.max(0, Math.floor(Number(opts.fromIndex) || 0));
    const duration = Number(opts.durationMs) > 0 ? Number(opts.durationMs) : BUY_PULSE_MS;
    const now = this.now();
    const pulse = {
      from: fromIndex,
      count,
      start: now,
      duration,
    };
    const nodes = this._shelves.get(generatorId);
    if (nodes && !nodes.shelf?.hidden && nodes.count > 0) {
      nodes._buyPulse = pulse;
      this._pendingBuyPulse = null;
      this.#paintShelf(nodes, false, now / 1000);
      if (this._hasSprites && !this._running) this.#startLoop();
      return true;
    }
    this._pendingBuyPulse = { generatorId, ...pulse };
    return true;
  }

  #paintAll(staticPose) {
    const t = this.now() / 1000;
    for (const nodes of this._shelves.values()) {
      if (nodes.count > 0) this.#paintShelf(nodes, staticPose, t);
    }
  }

  #clearAllMotes() {
    this._moteCarry = {};
    this._moteLast = null;
    for (const nodes of this._shelves.values()) {
      nodes.motes?.replaceChildren?.();
    }
  }

  #tickMotes(dt) {
    if (this._reducedMotion || dt <= 0) return;
    const rates = this._moteRates || {};
    for (const [id, rate] of Object.entries(rates)) {
      if (!(rate > 0)) continue;
      const nodes = this._shelves.get(id);
      if (!nodes?.motes || nodes.count <= 0) continue;

      this._moteCarry[id] = (this._moteCarry[id] || 0) + rate * dt;
      const spawn = Math.floor(this._moteCarry[id]);
      if (spawn <= 0) continue;
      this._moteCarry[id] -= spawn;

      const layer = nodes.motes;
      const doc = layer.ownerDocument || this.root;
      if (!doc?.createElement) continue;

      for (let i = 0; i < spawn; i += 1) {
        while (layer.childElementCount >= SHELF_MOTE_MAX_ON_SCREEN) {
          layer.firstElementChild?.remove();
        }
        const mote = doc.createElement('span');
        mote.className = 'despertar-shelf__mote';
        mote.setAttribute('aria-hidden', 'true');
        const x = 8 + Math.random() * 84;
        mote.style.setProperty('--mote-x', `${x}%`);
        mote.style.setProperty('--mote-dur', `${0.9 + Math.random() * 0.7}s`);
        mote.addEventListener('animationend', () => mote.remove(), { once: true });
        layer.appendChild(mote);
      }
    }
  }

  #layoutShelf(nodes) {
    if (!nodes) return;
    const fieldW = Number(nodes.field?.clientWidth) || 0;
    const colsNeeded = shelfColumnsForCount(nodes.count);
    // Viewport cheio quando qty é baixa; quando qty exige mais colunas → overflow-x.
    const colsFit = fieldW > 0 ? shelfColumnsForWidth(fieldW) : SHELF_GRID_COLS;
    const layoutCols = Math.max(1, colsNeeded, colsFit);
    const logical = shelfCanvasSize(layoutCols, SHELF_GRID_ROWS);
    const changed = nodes.cols !== layoutCols
      || nodes.logicalSize?.width !== logical.width
      || nodes.logicalSize?.height !== logical.height;
    nodes.cols = layoutCols;
    nodes.logicalSize = logical;
    nodes.field?.style?.setProperty?.('--shelf-h', `${logical.height}px`);
    this.#syncCanvasResolution(nodes);
    if (changed) nodes._needsPaint = true;
  }

  #syncCanvasResolution(nodes) {
    if (!nodes?.canvas) return;
    const logical = nodes.logicalSize || shelfCanvasSize(nodes.cols || SHELF_GRID_COLS, SHELF_GRID_ROWS);
    const dpr = this._dpr || 1;
    const bw = Math.max(1, Math.round(logical.width * dpr));
    const bh = Math.max(1, Math.round(logical.height * dpr));
    const canvas = nodes.canvas;
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
      nodes._needsPaint = true;
    }
    // Tamanho intrínseco em px — o field faz overflow-x se o canvas for mais largo.
    if (canvas.style) {
      canvas.style.width = `${logical.width}px`;
      canvas.style.height = `${logical.height}px`;
    }
    if (nodes.ctx?.setTransform) {
      nodes.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  #paintShelf(nodes, staticPose, timeSec = 0) {
    const { ctx, canvas, count, def, phase, sprite } = nodes;
    if (!ctx || !canvas) return;
    const logical = nodes.logicalSize || shelfCanvasSize(nodes.cols || SHELF_GRID_COLS, SHELF_GRID_ROWS);
    ctx.clearRect(0, 0, logical.width, logical.height);
    if (count <= 0) return;

    const n = Math.min(count, this.cap);
    const bobAmp = Math.max(1.2, SHELF_CELL * 0.06);
    const shinyCount = Math.max(0, Math.floor(Number(nodes.shinyCount) || 0));
    const pulse = nodes._buyPulse;
    const nowMs = this.now();
    let pulseScaleFor = null;
    if (pulse && !this._reducedMotion) {
      const elapsed = nowMs - pulse.start;
      if (elapsed >= pulse.duration) {
        nodes._buyPulse = null;
      } else {
        const factor = buyPulseScale(elapsed / pulse.duration);
        pulseScaleFor = (i) => (
          i >= pulse.from && i < pulse.from + pulse.count ? factor : 1
        );
      }
    }

    for (let i = 0; i < n; i += 1) {
      const { x, y } = shelfCellOrigin(i, SHELF_GRID_ROWS);
      let bob = 0;
      if (!staticPose && !this._reducedMotion) {
        bob = Math.sin(timeSec * 2.2 + phase + i * 0.37) * bobAmp;
      }
      const shinyOpts = {
        shiny: i < shinyCount,
        reducedMotion: this._reducedMotion,
      };
      const cellScale = pulseScaleFor ? pulseScaleFor(i) : 1;
      if (cellScale !== 1) {
        const cx = x + SHELF_CELL / 2;
        const cy = y + SHELF_CELL / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(cellScale, cellScale);
        if (sprite) {
          drawContainedInCell(ctx, sprite, -SHELF_CELL / 2, -SHELF_CELL / 2, SHELF_CELL, bob, shinyOpts);
        } else {
          drawNpcSilhouette(ctx, -SHELF_CELL / 2, -SHELF_CELL / 2, def.tier, bob, SHELF_CELL, shinyOpts);
        }
        ctx.restore();
      } else if (sprite) {
        drawContainedInCell(ctx, sprite, x, y, SHELF_CELL, bob, shinyOpts);
      } else {
        drawNpcSilhouette(ctx, x, y, def.tier, bob, SHELF_CELL, shinyOpts);
      }
    }

    const hover = this._hoverHit;
    if (hover && hover.generatorId === def.id && hover.index >= 0 && hover.index < n) {
      const { x, y } = shelfCellOrigin(hover.index, SHELF_GRID_ROWS);
      drawShelfCellHighlight(ctx, x, y, SHELF_CELL);
    }
  }

  #refreshShelfLabel(nodes) {
    if (!nodes?.label || !nodes.def) return;
    setMarqueeTextIfOverflow(nodes.label, nodes.def.name, {
      reducedMotion: this._reducedMotion,
      matchMedia: this.matchMedia,
      speed: 36,
    });
  }

  #bindShelfPointer(nodes) {
    if (!nodes?.field) return;
    this.#unbindShelfPointer(nodes);
    nodes._onPointerMove = (event) => this.#onShelfPointerMove(nodes, event);
    nodes._onPointerLeave = () => this.#onShelfPointerLeave(nodes);
    nodes.field.addEventListener?.('pointermove', nodes._onPointerMove);
    nodes.field.addEventListener?.('pointerleave', nodes._onPointerLeave);
  }

  #unbindShelfPointer(nodes) {
    if (!nodes) return;
    if (nodes._onPointerMove) {
      nodes.field?.removeEventListener?.('pointermove', nodes._onPointerMove);
    }
    if (nodes._onPointerLeave) {
      nodes.field?.removeEventListener?.('pointerleave', nodes._onPointerLeave);
    }
    nodes._onPointerMove = null;
    nodes._onPointerLeave = null;
  }

  #canvasLocalPoint(nodes, clientX, clientY) {
    const canvas = nodes?.canvas;
    const logical = nodes?.logicalSize || shelfCanvasSize(nodes?.cols || SHELF_GRID_COLS, SHELF_GRID_ROWS);
    if (!canvas || typeof canvas.getBoundingClientRect !== 'function') {
      return { x: Number(clientX) || 0, y: Number(clientY) || 0 };
    }
    const rect = canvas.getBoundingClientRect();
    const cssW = rect.width || logical.width || 1;
    const cssH = rect.height || logical.height || 1;
    return {
      x: ((Number(clientX) - rect.left) / cssW) * logical.width,
      y: ((Number(clientY) - rect.top) / cssH) * logical.height,
    };
  }

  #onShelfPointerMove(nodes, event) {
    if (!nodes || nodes.count <= 0 || nodes.shelf?.hidden) {
      this.#emitNpcHover(null, event);
      return;
    }
    const { x, y } = this.#canvasLocalPoint(nodes, event.clientX, event.clientY);
    const index = shelfHitIndex(x, y, nodes.count, SHELF_GRID_ROWS);
    if (index < 0) {
      this.#emitNpcHover(null, event);
      return;
    }
    const shiny = index < (nodes.shinyCount || 0);
    this.#emitNpcHover({
      generatorId: nodes.def.id,
      index,
      shiny,
      source: 'shelf',
    }, event);
  }

  #onShelfPointerLeave(nodes) {
    if (!this._hoverKey || !nodes?.def?.id) return;
    if (String(this._hoverKey).startsWith(`shelf:${nodes.def.id}:`)) {
      this.#clearHoverHit(nodes.def.id);
      this._hoverKey = null;
      this.onNpcHover?.(null);
    }
  }

  #emitNpcHover(hit, event = null) {
    const key = hit
      ? `${hit.source || 'shelf'}:${hit.generatorId}:${hit.index}:${hit.shiny ? 1 : 0}`
      : null;
    if (!hit) {
      if (this._hoverKey == null) return;
      const prevId = this._hoverHit?.generatorId;
      this._hoverKey = null;
      this._hoverHit = null;
      if (prevId) this.#repaintShelfId(prevId);
      this.onNpcHover?.(null, event);
      return;
    }
    const prevId = this._hoverHit?.generatorId;
    const prevIndex = this._hoverHit?.index;
    this._hoverKey = key;
    this._hoverHit = { generatorId: hit.generatorId, index: hit.index };
    if (prevId && prevId !== hit.generatorId) this.#repaintShelfId(prevId);
    if (prevId !== hit.generatorId || prevIndex !== hit.index) {
      this.#repaintShelfId(hit.generatorId);
    }
    // Sempre notifica no move (reposiciona tip perto do cursor).
    this.onNpcHover?.(hit, event);
  }

  #clearHoverHit(generatorId = null) {
    const prevId = this._hoverHit?.generatorId;
    this._hoverHit = null;
    if (prevId && (!generatorId || prevId === generatorId)) {
      this.#repaintShelfId(prevId);
    }
  }

  #repaintShelfId(generatorId) {
    const nodes = this._shelves.get(generatorId);
    if (!nodes || nodes.count <= 0 || nodes.shelf?.hidden) return;
    this.#paintShelf(nodes, this._reducedMotion || !this._running, this.now() / 1000);
  }

  #bindResizeObserver() {
    this.#unbindResizeObserver();
    if (typeof ResizeObserver !== 'function') return;
    this._resizeObserver = new ResizeObserver(() => {
      if (!this._mounted) return;
      for (const nodes of this._shelves.values()) {
        if (nodes.shelf?.hidden) continue;
        this.#layoutShelf(nodes);
        this.#refreshShelfLabel(nodes);
        if (nodes._needsPaint && nodes.count > 0) {
          nodes._needsPaint = false;
          this.#paintShelf(nodes, this._reducedMotion);
        }
      }
    });
    for (const nodes of this._shelves.values()) {
      if (nodes.field) this._resizeObserver.observe(nodes.field);
    }
  }

  #unbindResizeObserver() {
    this._resizeObserver?.disconnect?.();
    this._resizeObserver = null;
  }

  #prefetchSprites() {
    for (const [id, nodes] of this._shelves) {
      if (nodes.spriteTried) continue;
      nodes.spriteTried = true;
      loadGeneratorImage(id).then((img) => {
        if (!img || !this._mounted) return;
        nodes.sprite = img;
        if (nodes.count > 0) this.#paintShelf(nodes, this._reducedMotion);
      });
    }
  }

  #startLoop() {
    if (this._running || !this.requestFrame) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    this._running = true;
    this._moteLast = this.now();
    const tick = (nowArg) => {
      if (!this._running) return;
      const now = Number.isFinite(nowArg) ? nowArg : this.now();
      const last = this._moteLast == null ? now : this._moteLast;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      this._moteLast = now;
      this.#paintAll(false);
      this.#tickMotes(dt);
      this._raf = this.requestFrame(tick);
    };
    this._raf = this.requestFrame(tick);
  }

  #stopLoop() {
    this._running = false;
    this._moteLast = null;
    if (this._raf != null && this.cancelFrame) {
      this.cancelFrame(this._raf);
    }
    this._raf = null;
  }

  #onVisibility() {
    if (typeof document === 'undefined') return;
    if (document.hidden) {
      this.#stopLoop();
      return;
    }
    if (this._hasSprites && !this._reducedMotion) {
      this.#startLoop();
    }
  }

  #listenVisibility(on) {
    if (typeof document === 'undefined' || !document.addEventListener) return;
    if (on) {
      document.addEventListener('visibilitychange', this._onVisibility);
    } else {
      document.removeEventListener('visibilitychange', this._onVisibility);
    }
  }
}
