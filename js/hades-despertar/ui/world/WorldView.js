/**
 * WorldView — prateleiras do Domínio (Task B1 / F1).
 * NPCs em colunas; canvas cresce com qty + overflow-x.
 * T1 (Sombra Vagante) fica só na órbita do altar — sem prateleira duplicada.
 * Teto alto de segurança (perf); órbita do altar tem cap próprio.
 */

import { GENERATORS } from '../../config/generators.js';
import {
  DEFAULT_PERF_PREFS,
  PERF_ANIMATED_VARIANT_CAP_PER_SHELF,
  PERF_SHELF_NONFANCY_FRAME_SKIP,
} from '../../config/constants.js';
import {
  activeCosmetics,
  cosmeticsForGenerator,
  indexMatchesCoverage,
  pickCoveredCosmetic,
  UPGRADE_COSMETICS,
} from '../../config/upgrade-cosmetics.js';
import { setMarqueeTextIfOverflow } from '../Marquee.js';
import { acquirePooledNode, releasePooledNode } from '../particles.js';
import { withPerfMeasure } from '../perfTelemetry.js';
import {
  shinyChromaticPx,
  shinyGlitchNow,
  shinyTearBands,
} from './shinyGlitch.js';
import {
  GOLD_ACCENT,
  GOLD_BODY,
  GOLD_BORDER,
  GOLD_SHADOW,
  drawImageAsGold,
  goldPulse,
  paintGoldAura,
  paintGoldSparkles,
} from './goldJuice.js';
import { loadHabitatBackgroundImage, loadHabitatImage, loadHabitatVariantImage } from './SpriteAtlas.js';
import { peekCosmeticImage, prefetchCosmeticImages } from './CosmeticsAtlas.js';
import { unitRarityAt } from './unitRarity.js';

/**
 * Resolve raridade a partir de opts `{ rarity }` ou `{ shiny, gold }`.
 * @param {{ rarity?: string, shiny?: boolean, gold?: boolean }} [opts]
 * @returns {'normal'|'gold'|'negativo'}
 */
function rarityFromOpts(opts = {}) {
  if (opts.rarity === 'gold' || opts.rarity === 'negativo' || opts.rarity === 'normal') {
    return opts.rarity;
  }
  if (opts.gold) return 'gold';
  if (opts.shiny) return 'negativo';
  return 'normal';
}

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
/**
 * Célula quadrada em px lógicos (sprites contain).
 */
export const SHELF_CELL = 36;
/** Célula do preview no tooltip NPC (mesmo pipeline da prateleira, só maior). */
export const NPC_PORTRAIT_CELL = 72;
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
  7: { body: 'rgba(12, 16, 24, 0.94)', accent: 'rgba(192, 132, 252, 0.9)' },
  8: { body: 'rgba(8, 20, 18, 0.94)', accent: 'rgba(45, 212, 191, 0.9)' },
  9: { body: 'rgba(10, 14, 26, 0.95)', accent: 'rgba(232, 212, 168, 0.92)' },
  10: { body: 'rgba(22, 12, 14, 0.95)', accent: 'rgba(251, 146, 60, 0.9)' },
  11: { body: 'rgba(12, 8, 24, 0.96)', accent: 'rgba(168, 85, 247, 0.95)' },
  12: { body: 'rgba(18, 16, 10, 0.96)', accent: 'rgba(245, 197, 66, 0.95)' },
  13: { body: 'rgba(8, 12, 26, 0.96)', accent: 'rgba(56, 189, 248, 0.92)' },
  14: { body: 'rgba(18, 10, 26, 0.96)', accent: 'rgba(244, 114, 182, 0.92)' },
  15: { body: 'rgba(20, 18, 8, 0.96)', accent: 'rgba(250, 204, 21, 0.94)' },
  16: { body: 'rgba(8, 22, 20, 0.96)', accent: 'rgba(52, 211, 153, 0.92)' },
  17: { body: 'rgba(10, 18, 14, 0.96)', accent: 'rgba(163, 230, 53, 0.92)' },
  18: { body: 'rgba(14, 8, 28, 0.97)', accent: 'rgba(129, 140, 248, 0.94)' },
  19: { body: 'rgba(24, 10, 20, 0.97)', accent: 'rgba(251, 113, 133, 0.94)' },
  20: { body: 'rgba(16, 12, 6, 0.98)', accent: 'rgba(253, 224, 71, 0.98)' },
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
  return Math.max(1, Math.floor((inner + SHELF_CELL_GAP) / stride));
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

/** Tile 64×64 desenhado 1:1, para o chão cobrir a prateleira sem esticar. */
export const SHELF_BG_SCALE = 1;

/**
 * Chão do habitat, em pixels inteiros, repetido na horizontal e na vertical.
 * Desenha o tile inteiro mesmo na borda: o canvas corta o excesso e não sobra faixa.
 * @param {CanvasRenderingContext2D} ctx
 * @param {CanvasImageSource|null|undefined} image
 * @param {number} width
 * @param {number} height
 */
export function drawShelfBackground(ctx, image, width, height) {
  if (!ctx || !image) return;
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  if (w < 1 || h < 1) return;
  const iw = Number(image.naturalWidth || image.width) || 0;
  const ih = Number(image.naturalHeight || image.height) || 0;
  if (iw < 1 || ih < 1) return;
  const dw = iw * SHELF_BG_SCALE;
  const dh = ih * SHELF_BG_SCALE;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < h; y += dh) {
    for (let x = 0; x < w; x += dw) {
      ctx.drawImage(image, x, y, dw, dh);
    }
  }
  ctx.restore();
}

/** Cobre a faixa do campo que o canvas não alcança (sobra da grade e a barra). */
export function applyShelfFloor(field, image) {
  if (!field?.style || !image) return;
  const src = image.currentSrc || image.src;
  if (!src) return;
  const w = Number(image.naturalWidth || image.width) || 64;
  const h = Number(image.naturalHeight || image.height) || 64;
  const size = `${w * SHELF_BG_SCALE}px ${h * SHELF_BG_SCALE}px`;
  // Shorthand inline vence o `background:` dos tiers no CSS (senão o chão some).
  field.style.setProperty('background', `#101218 url("${src}") 0 0 / ${size} repeat`);
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
 * Lê shinyCount (negativo) de um gerador no state (gancho G4; default 0).
 * Convenção de índice: 0..shiny-1 = negativo; shiny..shiny+gold-1 = gold.
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
 * Lê goldCount de um gerador no state (default 0).
 * Convenção: índices 0..shinyCount-1 = negativo; seguintes = gold.
 *
 * @param {object|null|undefined} state
 * @param {string} generatorId
 * @param {number} [visualCap]
 */
export function goldCountFromState(state, generatorId, visualCap = Infinity) {
  if (!state || !generatorId) return 0;
  let raw = 0;
  if (typeof state.goldCounts === 'function') {
    const map = state.goldCounts();
    raw = Number(map?.[generatorId] || 0);
  } else if (state.goldCounts && typeof state.goldCounts === 'object') {
    raw = Number(state.goldCounts[generatorId] || 0);
  }
  const cap = Number.isFinite(visualCap) ? Math.max(0, Math.floor(visualCap)) : Infinity;
  const n = Math.max(0, Math.floor(raw) || 0);
  return Number.isFinite(cap) ? Math.min(cap, n) : n;
}

/**
 * drawImage com object-fit: contain dentro da célula (nunca stretch assimétrico).
 * Gold: glow dourado quente (sem invert/glitch); reduced = borda dourada.
 * Negativo (legacy shiny): invert + glow + glitch; reduced = borda dourada.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {CanvasImageSource} img
 * @param {number} cellX
 * @param {number} cellY
 * @param {number} [cell]
 * @param {number} [bobY]
 * @param {{ rarity?: 'gold'|'negativo'|false, shiny?: boolean, gold?: boolean, reducedMotion?: boolean }} [opts]
 */
export function drawContainedInCell(ctx, img, cellX, cellY, cell = SHELF_CELL, bobY = 0, opts = {}) {
  if (!ctx || !img) return;
  const rarity = rarityFromOpts(opts);
  const isGold = rarity === 'gold';
  const isNegativo = rarity === 'negativo';
  const reduced = Boolean(opts.reducedMotion);
  const iw = Number(img.naturalWidth || img.width) || 1;
  const ih = Number(img.naturalHeight || img.height) || 1;
  const scale = Math.min(cell / iw, cell / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = cellX + (cell - dw) / 2;
  const dy = cellY + (cell - dh) / 2 + bobY;
  const crisp = Boolean(opts.crisp);
  const prev = ctx.imageSmoothingEnabled;
  const prevQuality = ctx.imageSmoothingQuality;
  ctx.save();
  ctx.imageSmoothingEnabled = !crisp;
  if (!crisp && prevQuality != null) ctx.imageSmoothingQuality = 'high';

  const drawInvertSprite = (ox = 0) => {
    if (typeof ctx.filter === 'string' || 'filter' in ctx) {
      ctx.filter = 'invert(1) hue-rotate(180deg)';
    }
    ctx.drawImage(img, dx + ox, dy, dw, dh);
    if (typeof ctx.filter === 'string' || 'filter' in ctx) {
      ctx.filter = 'none';
    }
  };

  if (isGold) {
    const midX = cellX + cell / 2;
    const midY = cellY + cell / 2 + bobY;
    if (reduced) {
      ctx.strokeStyle = GOLD_BORDER;
      ctx.lineWidth = 1.75;
      ctx.strokeRect(cellX + 0.75, cellY + 0.75 + bobY, cell - 1.5, cell - 1.5);
      drawImageAsGold(ctx, img, dx, dy, dw, dh, { reducedMotion: true, pulse: 0.7 });
    } else {
      const t = shinyGlitchNow();
      const pulse = goldPulse(t);
      paintGoldAura(ctx, midX, midY, cell * 0.58, pulse);
      drawImageAsGold(ctx, img, dx, dy, dw, dh, {
        pulse,
        reducedMotion: false,
        shadowBlur: 12 + pulse * 14,
      });
      paintGoldSparkles(ctx, midX, midY, cell * 0.48, t);
    }
  } else if (isNegativo) {
    if (reduced) {
      ctx.strokeStyle = GOLD_BORDER;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cellX + 0.75, cellY + 0.75 + bobY, cell - 1.5, cell - 1.5);
      ctx.drawImage(img, dx, dy, dw, dh);
    } else {
      const t = shinyGlitchNow();
      const chroma = shinyChromaticPx(t);
      ctx.shadowColor = 'rgba(0, 168, 150, 0.9)';
      ctx.shadowBlur = 12;
      drawInvertSprite(0);
      ctx.shadowBlur = 0;

      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.globalCompositeOperation = 'screen';
      drawInvertSprite(-chroma);
      drawInvertSprite(chroma);
      ctx.restore();

      for (const band of shinyTearBands(cellY + bobY, cell, t)) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(cellX - 4, band.y, cell + 8, band.h);
        ctx.clip();
        drawInvertSprite(band.dx);
        ctx.restore();
      }
    }
  } else {
    ctx.drawImage(img, dx, dy, dw, dh);
  }

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
 * Gold: corpo/glow quentes (sem invert/glitch); reduced = borda dourada.
 * Negativo (legacy shiny): invert de cores + glow + glitch; reduced = borda dourada.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cellX
 * @param {number} cellY
 * @param {number} tier
 * @param {number} [bobY]
 * @param {number} [cell]
 * @param {{ rarity?: 'gold'|'negativo'|false, shiny?: boolean, gold?: boolean, reducedMotion?: boolean }} [opts]
 */
export function drawNpcSilhouette(ctx, cellX, cellY, tier, bobY = 0, cell = SHELF_CELL, opts = {}) {
  const rarity = rarityFromOpts(opts);
  const isGold = rarity === 'gold';
  const isNegativo = rarity === 'negativo';
  const reduced = Boolean(opts.reducedMotion);
  const palette = TIER_PALETTE[tier] || TIER_PALETTE[1];
  let body = palette.body;
  let accent = palette.accent;
  if (isGold) {
    // Sempre ouro no corpo (reduced também) — não só a sombra.
    body = GOLD_BODY;
    accent = GOLD_ACCENT;
  } else if (isNegativo && !reduced) {
    body = 'rgba(242, 232, 220, 0.95)';
    accent = 'rgba(217, 4, 41, 0.9)';
  }
  const s = cell / 24;
  const cx = cellX + cell / 2;
  const cy = cellY + cell / 2 + bobY + 1 * s;

  const paintFigure = (bodyColor, accentColor) => {
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, -1, 5.5, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -11, 4.2, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.ellipse(0, 6, 6, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.ellipse(-1.6, -11, 0.9, 0.75, 0, 0, Math.PI * 2);
    ctx.ellipse(1.6, -11, 0.9, 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);

  if (isGold) {
    if (reduced) {
      ctx.strokeStyle = GOLD_BORDER;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, -2, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowColor = GOLD_SHADOW;
      ctx.shadowBlur = 8;
      paintFigure(body, accent);
      ctx.shadowBlur = 0;
    } else {
      const t = shinyGlitchNow();
      const pulse = goldPulse(t);
      // aura em coords locais (já translate+scale)
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      paintGoldAura(ctx, cx, cy, cell * 0.55, pulse);
      ctx.restore();
      ctx.shadowColor = GOLD_SHADOW;
      ctx.shadowBlur = 14 + pulse * 12;
      paintFigure(body, accent);
      // highlight warm ghost
      ctx.save();
      ctx.globalAlpha = 0.35 + pulse * 0.2;
      ctx.globalCompositeOperation = 'screen';
      paintFigure('rgba(255, 236, 180, 0.9)', 'rgba(255, 248, 220, 0.95)');
      ctx.restore();
      ctx.shadowBlur = 0;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      paintGoldSparkles(ctx, cx, cy, cell * 0.45, t);
      ctx.restore();
    }
  } else if (isNegativo) {
    if (reduced) {
      ctx.strokeStyle = GOLD_BORDER;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, -2, 12, 0, Math.PI * 2);
      ctx.stroke();
      paintFigure(body, accent);
    } else {
      const t = shinyGlitchNow();
      const chroma = shinyChromaticPx(t) / Math.max(s, 0.01);
      ctx.shadowColor = 'rgba(0, 168, 150, 0.9)';
      ctx.shadowBlur = 12;
      paintFigure(body, accent);
      ctx.shadowBlur = 0;

      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.globalCompositeOperation = 'screen';
      ctx.translate(-chroma, 0);
      paintFigure('rgba(0, 255, 220, 0.85)', 'rgba(255, 40, 80, 0.9)');
      ctx.translate(chroma * 2, 0);
      paintFigure('rgba(255, 40, 120, 0.85)', 'rgba(0, 255, 200, 0.9)');
      ctx.restore();

      for (const band of shinyTearBands(cellY + bobY, cell, t)) {
        const localY = (band.y - (cellY + bobY) - cell / 2) / s;
        const localH = band.h / s;
        ctx.save();
        ctx.beginPath();
        ctx.rect(-14, localY, 28, Math.max(0.4, localH));
        ctx.clip();
        ctx.translate(band.dx / s, 0);
        paintFigure(body, accent);
        ctx.restore();
      }
    }
  } else {
    paintFigure(body, accent);
  }

  ctx.restore();
}

/**
 * Uma unidade exatamente como na prateleira: variante (chapéu etc.), raridade, overlays.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{
 *   cell?: number,
 *   sprite?: CanvasImageSource|null,
 *   variants?: Map<string, CanvasImageSource>|Record<string, CanvasImageSource>|null,
 *   cosmetics?: Array<{ accessory?: string, coverage?: number, priority?: number, upgradeId?: string }>,
 *   tier?: number,
 *   index?: number,
 *   rarity?: 'normal'|'gold'|'negativo'|false,
 *   reducedMotion?: boolean,
 *   timeSec?: number,
 * }} [opts]
 */
export function paintShelfUnitPortrait(ctx, opts = {}) {
  if (!ctx) return false;
  const cell = Number(opts.cell) > 0 ? Number(opts.cell) : NPC_PORTRAIT_CELL;
  const index = Math.max(0, Math.floor(Number(opts.index) || 0));
  const tier = Number(opts.tier) || 1;
  const rarityRaw = opts.rarity;
  const rarity = rarityRaw === 'gold' || rarityRaw === 'negativo' || rarityRaw === 'normal'
    ? rarityRaw
    : rarityFromOpts(opts);
  const reducedMotion = Boolean(opts.reducedMotion);
  const timeSec = Number(opts.timeSec) || 0;
  const cosmetics = Array.isArray(opts.cosmetics) ? opts.cosmetics : [];
  const variants = opts.variants || null;
  const hasVariant = (accessory) => {
    if (!variants || !accessory) return false;
    if (typeof variants.get === 'function') return Boolean(variants.get(accessory));
    return Boolean(variants[accessory]);
  };
  const getVariant = (accessory) => {
    if (!variants || !accessory) return null;
    if (typeof variants.get === 'function') return variants.get(accessory) || null;
    return variants[accessory] || null;
  };

  ctx.clearRect(0, 0, cell, cell);
  const rarityOpts = {
    rarity: rarity === 'normal' ? false : rarity,
    shiny: rarity === 'negativo',
    gold: rarity === 'gold',
    // Tip é snapshot: raridade precisa do look real (invert/gold), não do fallback “borda”.
    reducedMotion: false,
    crisp: true,
  };
  void reducedMotion;

  const variant = pickCoveredCosmetic(cosmetics, index, (cos) => hasVariant(cos.accessory));
  const paintSprite = variant ? getVariant(variant.accessory) : (opts.sprite || null);
  if (paintSprite) {
    drawContainedInCell(ctx, paintSprite, 0, 0, cell, 0, rarityOpts);
  } else {
    drawNpcSilhouette(ctx, 0, 0, tier, 0, cell, rarityOpts);
  }
  if (variant) return true;

  for (const cos of cosmetics) {
    if (!cos?.accessory) continue;
    const salt = cos.upgradeId || cos.accessory || 0;
    if (!indexMatchesCoverage(index, cos.coverage, salt)) continue;
    drawAccessory(ctx, cos.accessory, 0, 0, cell, 0, {
      tier,
      reducedMotion: true,
      timeSec,
      image: peekCosmeticImage(cos.accessory) || undefined,
    });
  }
  return true;
}

/**
 * Overlay procedural de accessory (Fase E / E2).
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} accessory
 * @param {number} cellX
 * @param {number} cellY
 * @param {number} [cell]
 * @param {number} [bobY]
 * @param {{ tier?: number, reducedMotion?: boolean, timeSec?: number }} [opts]
 */
export function drawAccessory(ctx, accessory, cellX, cellY, cell = SHELF_CELL, bobY = 0, opts = {}) {
  if (!ctx || !accessory) return false;
  const id = String(accessory);
  const tier = Number(opts.tier) || 2;
  const palette = TIER_PALETTE[tier] || TIER_PALETTE[2];
  const x = Number(cellX) || 0;
  const y = (Number(cellY) || 0) + (Number(bobY) || 0);
  const s = Number(cell) > 0 ? Number(cell) : SHELF_CELL;
  const reduced = Boolean(opts.reducedMotion);
  const t = Number(opts.timeSec) || 0;
  const cx = x + s * 0.5;

  // E3: WebP/SVG se o Mestre entregou; senão procedural abaixo.
  const asset = opts.image !== undefined ? opts.image : peekCosmeticImage(id);
  if (asset) {
    const pad = s * 0.06;
    try {
      ctx.drawImage(asset, x + pad, y + pad, s - pad * 2, s - pad * 2);
      return true;
    } catch {
      /* fallback procedural */
    }
  }

  if (id === 'hat_charon') {
    const peak = y + s * 0.06;
    const brimY = y + s * 0.3;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, peak);
    ctx.lineTo(x + s * 0.2, brimY);
    ctx.lineTo(x + s * 0.8, brimY);
    ctx.closePath();
    ctx.fillStyle = palette.accent;
    ctx.fill();
    ctx.strokeStyle = 'rgba(242, 232, 220, 0.5)';
    ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + s * 0.12, brimY);
    ctx.lineTo(x + s * 0.88, brimY);
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = Math.max(1.2, s * 0.04);
    ctx.stroke();
    ctx.restore();
    return true;
  }

  if (id === 'boat_wake') {
    const baseY = y + s * 0.82;
    ctx.save();
    ctx.strokeStyle = 'rgba(94, 234, 212, 0.55)';
    ctx.lineWidth = Math.max(1, s * 0.035);
    ctx.lineCap = 'round';
    const phase = reduced ? 0 : Math.sin(t * 3 + cx * 0.05) * s * 0.02;
    for (let i = 0; i < 3; i += 1) {
      const yy = baseY + i * s * 0.06 + phase;
      const spread = s * (0.18 + i * 0.1);
      ctx.globalAlpha = 0.55 - i * 0.12;
      ctx.beginPath();
      ctx.arc(cx, yy, spread, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
    ctx.restore();
    return true;
  }

  if (id === 'shade_wisp') {
    ctx.save();
    const drift = reduced ? 0 : Math.sin(t * 2.4 + cx) * s * 0.04;
    ctx.fillStyle = 'rgba(0, 168, 150, 0.28)';
    ctx.beginPath();
    ctx.ellipse(cx + drift, y + s * 0.22, s * 0.22, s * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(94, 234, 212, 0.35)';
    ctx.beginPath();
    ctx.ellipse(cx - drift * 0.6, y + s * 0.12, s * 0.12, s * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return true;
  }

  if (id === 'hound_chain') {
    ctx.save();
    ctx.strokeStyle = 'rgba(207, 167, 89, 0.75)';
    ctx.lineWidth = Math.max(1, s * 0.04);
    const linkY = y + s * 0.38;
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.ellipse(cx + i * s * 0.12, linkY + Math.abs(i) * s * 0.04, s * 0.08, s * 0.06, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(217, 4, 41, 0.7)';
    ctx.beginPath();
    ctx.arc(cx - s * 0.1, y + s * 0.28, s * 0.035, 0, Math.PI * 2);
    ctx.arc(cx + s * 0.1, y + s * 0.28, s * 0.035, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return true;
  }

  if (id === 'hound_triple_aura') {
    ctx.save();
    const pulse = reduced ? 0.85 : 0.7 + 0.3 * Math.sin(t * 2.8);
    ctx.strokeStyle = `rgba(217, 4, 41, ${0.35 * pulse})`;
    ctx.lineWidth = Math.max(1, s * 0.03);
    for (let i = 0; i < 3; i += 1) {
      const ox = (i - 1) * s * 0.16;
      ctx.beginPath();
      ctx.arc(cx + ox, y + s * 0.42, s * 0.28, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    return true;
  }

  if (id === 'judge_scale_fx') {
    ctx.save();
    const beamY = y + s * 0.18;
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.85)';
    ctx.fillStyle = 'rgba(207, 167, 89, 0.7)';
    ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.beginPath();
    ctx.moveTo(cx, y + s * 0.08);
    ctx.lineTo(cx, beamY);
    ctx.moveTo(cx - s * 0.22, beamY);
    ctx.lineTo(cx + s * 0.22, beamY);
    ctx.stroke();
    const tip = reduced ? 0 : Math.sin(t * 2) * s * 0.02;
    ctx.beginPath();
    ctx.arc(cx - s * 0.2, beamY + tip + s * 0.08, s * 0.07, 0, Math.PI * 2);
    ctx.arc(cx + s * 0.2, beamY - tip + s * 0.08, s * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return true;
  }

  return false;
}

/**
 * Aureola do altar (`orbit_halo`) — anel dourado ao redor da órbita.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} radius
 * @param {{ reducedMotion?: boolean, timeSec?: number }} [opts]
 */
export function drawOrbitHalo(ctx, cx, cy, radius, opts = {}) {
  if (!ctx || !(radius > 0)) return false;
  const reduced = Boolean(opts.reducedMotion);
  const t = Number(opts.timeSec) || 0;
  const pulse = reduced ? 1 : 0.85 + 0.15 * Math.sin(t * 1.6);
  ctx.save();
  ctx.strokeStyle = `rgba(207, 167, 89, ${0.42 * pulse})`;
  ctx.lineWidth = Math.max(2, radius * 0.035);
  ctx.shadowColor = 'rgba(207, 167, 89, 0.55)';
  ctx.shadowBlur = reduced ? 6 : 14;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.06, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = `rgba(242, 232, 220, ${0.22 * pulse})`;
  ctx.lineWidth = Math.max(1, radius * 0.015);
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  return true;
}

/**
 * Aplica classes `has-cosmetic-*` num shelf (prateleira).
 * @param {Element|null|undefined} element
 * @param {ReturnType<typeof activeCosmetics>} active
 * @param {string} generatorId
 */
export function applyShelfCosmeticClasses(element, active, generatorId) {
  if (!element?.classList) return [];
  const next = new Set(
    cosmeticsForGenerator(active, generatorId)
      .filter((c) => c.accessory)
      .map((c) => `has-cosmetic-${c.accessory}`),
  );
  const list = element.classList;
  const existing = typeof list.values === 'function'
    ? [...list]
    : (list._on ? [...list._on] : []);
  for (const cls of existing) {
    const name = String(cls);
    if (name.startsWith('has-cosmetic-') && !next.has(name)) list.remove(name);
  }
  for (const cls of next) list.add(cls);
  return [...next];
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
    this._reducedMotion = false;
    this._prefs = {
      ...DEFAULT_PERF_PREFS,
      ...(options.prefs && typeof options.prefs === 'object' ? options.prefs : {}),
    };
    this.animatedVariantCap = Number(options.animatedVariantCap) > 0
      ? Math.floor(Number(options.animatedVariantCap))
      : PERF_ANIMATED_VARIANT_CAP_PER_SHELF;
    this._frameCounter = 0;
    this._hasSprites = false;
    this._artFlush = false;
    this._mounted = false;
    this._moteRates = {};
    this._moteCarry = {};
    this._moteLast = null;
    this._baseSize = shelfCanvasSize(SHELF_GRID_COLS, SHELF_GRID_ROWS);
    this._dpr = shelfDevicePixelRatio();
    this._resizeObserver = null;
    this._intersectionObserver = null;
    /** @type {((hit: { generatorId: string, index: number, rarity?: string, shiny: boolean, gold?: boolean }|null, event?: PointerEvent) => void)|null} */
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
        cachedFieldWidth: Number(field?.clientWidth) || 0,
        cachedCanvasRect: null,
        logicalSize: shelfCanvasSize(SHELF_GRID_COLS, SHELF_GRID_ROWS),
        phase: Math.random() * Math.PI * 2,
        sprite: null,
        spriteTried: false,
        background: null,
        backgroundTried: false,
        variants: new Map(),
        shinyCount: 0,
        goldCount: 0,
        cosmetics: [],
        cosmeticSig: '',
        inViewport: true,
      };
      this.#layoutShelf(nodes);
      this.#bindShelfPointer(nodes);
      this._shelves.set(def.id, nodes);
    }

    this.#bindResizeObserver();
    this.#bindIntersectionObserver();
    this._mounted = true;
    this._reducedMotion = prefersReducedMotion(this.matchMedia);
    this.#prefetchSprites();
    this.#prefetchCosmetics();
    return this;
  }

  /**
   * Atualiza preferências de performance (Perf-4: particles / fancy).
   * @param {{ particles?: boolean, fancy?: boolean, cursors?: boolean }} [prefs]
   */
  setPrefs(prefs = {}) {
    if (!prefs || typeof prefs !== 'object') return this._prefs;
    const prevFancy = this._prefs.fancy;
    const prevParticles = this._prefs.particles;
    if (typeof prefs.cursors === 'boolean') this._prefs.cursors = prefs.cursors;
    if (typeof prefs.particles === 'boolean') this._prefs.particles = prefs.particles;
    if (typeof prefs.fancy === 'boolean') this._prefs.fancy = prefs.fancy;
    if (!this._prefs.particles && prevParticles) {
      this.#clearAllMotes();
    }
    if (this._prefs.fancy !== prevFancy && this._hasSprites) {
      this.#paintAll(this._reducedMotion || !this._prefs.fancy);
    }
    return { ...this._prefs };
  }

  get prefs() {
    return { ...this._prefs };
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
    if (meta.prefs && typeof meta.prefs === 'object') {
      this.setPrefs(meta.prefs);
    }

    const qtyMap = typeof state.quantities === 'function'
      ? state.quantities()
      : (state.generators || {});
    const souls = state.souls ?? '0';
    const cosmeticsActive = activeCosmetics(state);
    let any = false;
    let sprites = 0;
    const weights = {};
    this._dpr = shelfDevicePixelRatio();
    const staticPose = this._reducedMotion || !this._prefs.fancy;

    for (const def of GENERATORS) {
      if (!isShelfGenerator(def)) continue;
      const nodes = this._shelves.get(def.id);
      if (!nodes) continue;
      const qty = Number(qtyMap[def.id] || 0);
      const revealed = this.isGeneratorRevealed(def.id, { souls, generators: qtyMap });
      const show = revealed && qty > 0;
      const visibilityChanged = nodes.shelf.hidden !== !show;
      nodes.shelf.hidden = !show;
      if (!show) {
        if (nodes.count !== 0) {
          nodes.count = 0;
          nodes.cosmetics = [];
          nodes.cosmeticSig = '';
          applyShelfCosmeticClasses(nodes.shelf, [], def.id);
          this.#paintShelf(nodes, true);
        }
        this.#clearShelfMotes(nodes);
        continue;
      }

      any = true;
      nodes.shelf.classList.toggle('is-empty', qty <= 0);
      const visual = cappedNpcCount(qty, this.cap);
      sprites += visual;
      nodes.shelf.removeAttribute?.('title');
      nodes.shelf.title = '';
      const nextShiny = shinyCountFromState(state, def.id, visual);
      const nextGold = goldCountFromState(state, def.id, visual);
      const rarityChanged = nextShiny !== (nodes.shinyCount || 0)
        || nextGold !== (nodes.goldCount || 0);
      nodes.shinyCount = nextShiny;
      nodes.goldCount = nextGold;
      const shelfCosmetics = cosmeticsForGenerator(cosmeticsActive, def.id);
      const cosSig = shelfCosmetics
        .map((c) => `${c.upgradeId}:${c.accessory}:${c.coverage}`)
        .join('|');
      const cosChanged = cosSig !== (nodes.cosmeticSig || '');
      nodes.cosmetics = shelfCosmetics;
      nodes.cosmeticSig = cosSig;
      applyShelfCosmeticClasses(nodes.shelf, cosmeticsActive, def.id);
      if (visibilityChanged) {
        this.#refreshShelfLabel(nodes);
      }
      weights[def.id] = shelfLineMoteWeight(qty, def.baseRate);

      const countChanged = visual !== nodes.count;
      nodes.count = visual;
      if (countChanged || visibilityChanged) {
        this.#layoutShelf(nodes);
      }
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
      if (countChanged || rarityChanged || cosChanged || nodes._needsPaint) {
        nodes._needsPaint = false;
        this.#paintShelf(nodes, staticPose, staticPose ? 0 : this.now() / 1000);
      }
    }

    this._moteRates = (this._reducedMotion || !this._prefs.particles)
      ? {}
      : allocateShelfMoteRates(weights, SHELF_MOTE_MAX_PER_SEC);

    if (this._hint) {
      this._hint.hidden = any;
    }

    this._hasSprites = sprites > 0;
    if (!this._hasSprites || this._reducedMotion || !this._prefs.particles) {
      this.#clearAllMotes();
    }
    if (this._hasSprites && staticPose) {
      this.#paintAll(true);
    }
    return this;
  }

  /**
   * Avança um frame das prateleiras a partir do GameLoop único (Perf-1: sem RAF próprio).
   * @param {number} [dtSeconds]
   * @param {{ reducedMotion?: boolean, fancy?: boolean, particles?: boolean }} [meta]
   */
  frame(dtSeconds = 1 / 60, meta = {}) {
    if (!this._mounted || !this._hasSprites) return;
    const reduced = typeof meta.reducedMotion === 'boolean'
      ? meta.reducedMotion
      : this._reducedMotion;
    const fancy = typeof meta.fancy === 'boolean' ? meta.fancy : this._prefs.fancy;
    const particles = typeof meta.particles === 'boolean' ? meta.particles : this._prefs.particles;

    if (reduced) return;

    const dt = Math.min(0.05, Math.max(0, Number(dtSeconds) || 0));
    this._frameCounter = (this._frameCounter + 1) % 10000;

    if (fancy) {
      this.#paintAll(false);
    } else if (this._frameCounter % PERF_SHELF_NONFANCY_FRAME_SKIP === 0) {
      // Sem fancy (estilo Cookie Clicker): repinta apenas se houver buyPulse ativo
      for (const nodes of this._shelves.values()) {
        if (nodes.count > 0 && nodes._buyPulse) {
          this.#paintShelf(nodes, true, this.now() / 1000);
        }
      }
    }

    if (particles && dt > 0) {
      this.#tickMotes(dt);
    }
  }

  /** Força um frame (testes / reduced-motion). */
  paint(staticPose = false) {
    this.#paintAll(staticPose || this._reducedMotion || !this._prefs.fancy);
  }

  destroy() {
    this.#unbindResizeObserver();
    this.#unbindIntersectionObserver();
    this.#clearAllMotes();
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
    return Boolean(this._mounted && this._hasSprites && !this._reducedMotion && this._prefs.fancy);
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
      this.#paintShelf(nodes, !this._prefs.fancy, now / 1000);
      return true;
    }
    this._pendingBuyPulse = { generatorId, ...pulse };
    return true;
  }

  /**
   * Fase F7 (Viewport Culling): controla se uma prateleira está visível no scroll da coluna central.
   * Prateleiras com `inViewport === false` não executam `#paintShelf` a 60 Hz no loop de animação.
   */
  setShelfViewportVisibility(generatorId, inViewport = true) {
    const nodes = this._shelves.get(generatorId);
    if (!nodes) return false;
    const next = Boolean(inViewport);
    const prev = nodes.inViewport !== false;
    nodes.inViewport = next;
    if (next && !prev && nodes.count > 0 && !nodes.shelf?.hidden) {
      this.#paintShelf(nodes, this._reducedMotion || !this._prefs.fancy, this.now() / 1000);
    }
    return next;
  }

  #paintAll(staticPose) {
    const t = this.now() / 1000;
    for (const nodes of this._shelves.values()) {
      if (nodes.count <= 0 || nodes.shelf?.hidden) continue;
      if (!staticPose && nodes.inViewport === false) continue;
      this.#paintShelf(nodes, staticPose, t);
    }
  }

  #clearShelfMotes(nodes) {
    if (!nodes?.motes) return;
    const doc = nodes.motes.ownerDocument || this.root;
    const kids = Array.isArray(nodes.motes.childNodes) ? [...nodes.motes.childNodes] : [];
    for (const child of kids) {
      releasePooledNode(doc, 'shelf-mote', child);
    }
    nodes.motes.replaceChildren?.();
  }

  #clearAllMotes() {
    this._moteCarry = {};
    this._moteLast = null;
    for (const nodes of this._shelves.values()) {
      this.#clearShelfMotes(nodes);
    }
  }

  #tickMotes(dt) {
    if (this._reducedMotion || !this._prefs.particles || dt <= 0) return;
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
          const oldest = layer.firstElementChild;
          if (!oldest) break;
          releasePooledNode(doc, 'shelf-mote', oldest);
        }
        const mote = acquirePooledNode(doc, 'shelf-mote', 'despertar-shelf__mote');
        if (!mote) break;
        const x = 8 + Math.random() * 84;
        mote.style.setProperty('--mote-x', `${x}%`);
        mote.style.setProperty('--mote-dur', `${0.9 + Math.random() * 0.7}s`);
        mote.addEventListener('animationend', () => releasePooledNode(doc, 'shelf-mote', mote), { once: true });
        layer.appendChild(mote);
      }
    }
  }

  #layoutShelf(nodes) {
    if (!nodes) return;
    // Largura ao vivo: o cache do RO atrasa e o canvas ficava curto (sprite cortado no meio da faixa).
    const measured = Math.floor(Number(nodes.field?.clientWidth) || 0);
    if (measured > 0) nodes.cachedFieldWidth = measured;
    const fieldW = Number(nodes.cachedFieldWidth) || 0;
    const colsNeeded = shelfColumnsForCount(nodes.count);
    // Viewport cheio quando qty é baixa; quando qty exige mais colunas → overflow-x.
    const colsFit = fieldW > 0 ? shelfColumnsForWidth(fieldW) : SHELF_GRID_COLS;
    const layoutCols = Math.max(1, colsNeeded, colsFit);
    const grid = shelfCanvasSize(layoutCols, SHELF_GRID_ROWS);
    // Cobre a faixa inteira em px (não só a grade): evita buraco de chão CSS à direita do canvas.
    const coverW = Math.max(grid.width, fieldW > 0 ? fieldW : 0);
    const logical = { width: coverW, height: grid.height };
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
    // Tamanho intrínseco em px — min 100% do field; overflow-x só se qty exigir mais colunas.
    if (canvas.style) {
      canvas.style.width = `${logical.width}px`;
      canvas.style.minWidth = '100%';
      canvas.style.height = `${logical.height}px`;
      canvas.style.maxWidth = 'none';
    }
    if (nodes.ctx?.setTransform) {
      nodes.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  #paintShelf(nodes, staticPose, timeSec = 0) {
    return withPerfMeasure('WorldView.#paintShelf', () => {
      const { ctx, canvas, count, def, phase, sprite } = nodes;
      if (!ctx || !canvas) return;
      const logical = nodes.logicalSize || shelfCanvasSize(nodes.cols || SHELF_GRID_COLS, SHELF_GRID_ROWS);
      ctx.clearRect(0, 0, logical.width, logical.height);
      if (count <= 0) return;
      drawShelfBackground(ctx, nodes.background, logical.width, logical.height);

      const n = Math.min(count, this.cap);
      const bobAmp = Math.max(1.2, SHELF_CELL * 0.06);
      const shinyCount = Math.max(0, Math.floor(Number(nodes.shinyCount) || 0));
      const goldCount = Math.max(0, Math.floor(Number(nodes.goldCount) || 0));
      const cosmetics = Array.isArray(nodes.cosmetics) ? nodes.cosmetics : [];
      const pulse = nodes._buyPulse;
      const nowMs = this.now();
      let pulseScaleFor = null;
      const fancyActive = !this._reducedMotion && this._prefs.fancy;
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

      // Perf-5: Cap estrito de variantes gold/negativo animadas por prateleira por frame.
      let animatedVariantsRemaining = fancyActive ? this.animatedVariantCap : 0;

      for (let i = 0; i < n; i += 1) {
        const { x, y } = shelfCellOrigin(i, SHELF_GRID_ROWS);
        let bob = 0;
        if (!staticPose && fancyActive) {
          bob = Math.sin(timeSec * 2.2 + phase + i * 0.37) * bobAmp;
        }
        const rarity = unitRarityAt(i, { gold: goldCount, shiny: shinyCount });
        const isVariant = rarity === 'gold' || rarity === 'negativo';
        let useStaticVariant = !fancyActive;
        if (isVariant && !useStaticVariant) {
          if (animatedVariantsRemaining > 0) {
            animatedVariantsRemaining -= 1;
          } else {
            useStaticVariant = true;
          }
        }
        const rarityOpts = {
          rarity: rarity === 'normal' ? false : rarity,
          shiny: rarity === 'negativo',
          gold: rarity === 'gold',
          reducedMotion: useStaticVariant,
        };
        const cellScale = pulseScaleFor ? pulseScaleFor(i) : 1;

        const paintCell = (ox, oy) => {
          const variant = pickCoveredCosmetic(
            cosmetics,
            i,
            (cos) => Boolean(nodes.variants?.get(cos.accessory)),
          );
          const paintSprite = variant ? nodes.variants.get(variant.accessory) : sprite;
          if (paintSprite) {
            drawContainedInCell(ctx, paintSprite, ox, oy, SHELF_CELL, bob, {
              ...rarityOpts,
              crisp: true,
            });
          } else {
            drawNpcSilhouette(ctx, ox, oy, def.tier, bob, SHELF_CELL, rarityOpts);
          }
          if (variant) return;
          for (const cos of cosmetics) {
            const salt = cos.upgradeId || cos.accessory || 0;
            if (!indexMatchesCoverage(i, cos.coverage, salt)) continue;
            drawAccessory(ctx, cos.accessory, ox, oy, SHELF_CELL, bob, {
              tier: def.tier,
              reducedMotion: !fancyActive,
              timeSec,
            });
          }
        };

        if (cellScale !== 1) {
          const cx = x + SHELF_CELL / 2;
          const cy = y + SHELF_CELL / 2;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(cellScale, cellScale);
          paintCell(-SHELF_CELL / 2, -SHELF_CELL / 2);
          ctx.restore();
        } else {
          paintCell(x, y);
        }
      }

      const hover = this._hoverHit;
      if (hover && hover.generatorId === def.id && hover.index >= 0 && hover.index < n) {
        const { x, y } = shelfCellOrigin(hover.index, SHELF_GRID_ROWS);
        drawShelfCellHighlight(ctx, x, y, SHELF_CELL);
      }
    });
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
    const rarity = unitRarityAt(index, {
      gold: nodes.goldCount || 0,
      shiny: nodes.shinyCount || 0,
    });
    this.#emitNpcHover({
      generatorId: nodes.def.id,
      index,
      rarity,
      shiny: rarity === 'negativo',
      gold: rarity === 'gold',
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
      ? `${hit.source || 'shelf'}:${hit.generatorId}:${hit.index}:${hit.rarity || 'normal'}`
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
    this.#paintShelf(nodes, this._reducedMotion || !this._prefs.fancy, this.now() / 1000);
  }

  /**
   * Preview do tip = mesma unidade da prateleira (chapéu / negativo / gold).
   * @param {HTMLCanvasElement} canvas
   * @param {{ generatorId: string, index: number, rarity?: string, shiny?: boolean, gold?: boolean }} hit
   */
  paintNpcPortrait(canvas, hit) {
    if (!canvas || !hit?.generatorId) return false;
    const nodes = this._shelves.get(hit.generatorId);
    const cell = NPC_PORTRAIT_CELL;
    const dpr = Math.min(2, (typeof globalThis.devicePixelRatio === 'number' && globalThis.devicePixelRatio > 0)
      ? globalThis.devicePixelRatio
      : 1);
    canvas.width = Math.round(cell * dpr);
    canvas.height = Math.round(cell * dpr);
    if (canvas.style) {
      canvas.style.width = `${cell}px`;
      canvas.style.height = `${cell}px`;
    }
    const ctx = canvas.getContext?.('2d');
    if (!ctx) return false;
    if (typeof ctx.setTransform === 'function') ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rarity = hit.rarity
      || (hit.gold ? 'gold' : (hit.shiny ? 'negativo' : 'normal'));
    return paintShelfUnitPortrait(ctx, {
      cell,
      sprite: nodes?.sprite || null,
      variants: nodes?.variants || null,
      cosmetics: Array.isArray(nodes?.cosmetics) ? nodes.cosmetics : [],
      tier: nodes?.def?.tier || 1,
      index: hit.index,
      rarity,
      timeSec: this.now() / 1000,
    });
  }

  #bindResizeObserver() {
    this.#unbindResizeObserver();
    if (typeof ResizeObserver !== 'function') return;
    this._resizeObserver = new ResizeObserver((entries) => {
      if (!this._mounted) return;
      const byField = new Map();
      for (const entry of entries || []) {
        const w = entry?.contentRect?.width;
        if (entry?.target && Number.isFinite(w) && w > 0) {
          byField.set(entry.target, Math.floor(w));
        }
      }
      for (const nodes of this._shelves.values()) {
        if (nodes.field && byField.has(nodes.field)) {
          nodes.cachedFieldWidth = byField.get(nodes.field);
        } else if (nodes.field && !nodes.shelf?.hidden) {
          const live = Math.floor(Number(nodes.field.clientWidth) || 0);
          if (live > 0) nodes.cachedFieldWidth = live;
        }
        if (nodes.shelf?.hidden) continue;
        this.#layoutShelf(nodes);
        this.#refreshShelfLabel(nodes);
        if (nodes._needsPaint && nodes.count > 0) {
          nodes._needsPaint = false;
          const staticPose = this._reducedMotion || !this._prefs.fancy;
          this.#paintShelf(nodes, staticPose, staticPose ? 0 : this.now() / 1000);
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

  #bindIntersectionObserver() {
    this.#unbindIntersectionObserver();
    if (typeof IntersectionObserver !== 'function') return;
    const byShelf = new Map();
    for (const nodes of this._shelves.values()) {
      if (nodes.shelf) byShelf.set(nodes.shelf, nodes);
    }
    this._intersectionObserver = new IntersectionObserver((entries) => {
      if (!this._mounted) return;
      for (const entry of entries || []) {
        const nodes = byShelf.get(entry?.target);
        if (!nodes) continue;
        const visible = Boolean(entry.isIntersecting || entry.intersectionRatio > 0);
        this.setShelfViewportVisibility(nodes.def.id, visible);
      }
    }, { root: null, rootMargin: '120px 0px' });
    for (const nodes of this._shelves.values()) {
      if (nodes.shelf) this._intersectionObserver.observe(nodes.shelf);
    }
  }

  #unbindIntersectionObserver() {
    this._intersectionObserver?.disconnect?.();
    this._intersectionObserver = null;
  }

  #prefetchSprites() {
    const accessoriesByGenerator = new Map();
    for (const def of Object.values(UPGRADE_COSMETICS)) {
      if (!def?.targetGeneratorId || !def.accessory) continue;
      const list = accessoriesByGenerator.get(def.targetGeneratorId) || [];
      list.push(def.accessory);
      accessoriesByGenerator.set(def.targetGeneratorId, list);
    }
    for (const [id, nodes] of this._shelves) {
      if (!nodes.spriteTried) {
        nodes.spriteTried = true;
        loadHabitatImage(id).then((img) => {
          if (!img || !this._mounted) return;
          nodes.sprite = img;
          this.#scheduleShelfArt(nodes);
        });
      }
      if (!nodes.backgroundTried) {
        nodes.backgroundTried = true;
        loadHabitatBackgroundImage(id).then((img) => {
          if (!img || !this._mounted) return;
          nodes.background = img;
          applyShelfFloor(nodes.field, img);
          this.#scheduleShelfArt(nodes);
        });
      }
      for (const accessory of accessoriesByGenerator.get(id) || []) {
        if (nodes.variants?.has(accessory) || nodes.variants?.get(`${accessory}:tried`)) continue;
        nodes.variants?.set(`${accessory}:tried`, true);
        loadHabitatVariantImage(accessory).then((img) => {
          if (!img || !this._mounted) return;
          nodes.variants.set(accessory, img);
          this.#scheduleShelfArt(nodes);
        });
      }
    }
  }

  /** E3: tenta WebP dos accessories; falha → procedural. */
  #prefetchCosmetics() {
    prefetchCosmeticImages().then(() => {
      if (!this._mounted) return;
      for (const nodes of this._shelves.values()) {
        if (nodes.count > 0 && nodes.cosmetics?.length) this.#scheduleShelfArt(nodes);
      }
    }).catch(() => {});
  }

  /**
   * A arte chegou. Com o jogo animando, o próximo frame pega o sprite
   * sem pregar o bob em t=0. Parado, um único frame pinta o lote.
   */
  #scheduleShelfArt(nodes) {
    if (!nodes || nodes.count <= 0) return;
    nodes._artDirty = true;
    if (this._artFlush) return;
    this._artFlush = true;
    const flush = () => {
      this._artFlush = false;
      if (!this._mounted) return;
      const staticPose = this._reducedMotion || !this._prefs.fancy;
      for (const shelf of this._shelves.values()) {
        if (!shelf._artDirty) continue;
        shelf._artDirty = false;
        if (shelf.count <= 0) continue;
        if (!staticPose && shelf.inViewport !== false) continue;
        this.#paintShelf(shelf, true, 0);
      }
    };
    if (typeof this.requestFrame === 'function') this.requestFrame(flush);
    else flush();
  }
}
