/**
 * Juice visual para unidades gold — glow, brilho e sparkles.
 * Respeitar prefers-reduced-motion no caller (só aura estática / borda).
 */

import { shinyGlitchNow } from './shinyGlitch.js';

export const GOLD_SHADOW = 'rgba(255, 210, 110, 0.95)';
export const GOLD_BORDER = 'rgba(232, 196, 120, 0.98)';
export const GOLD_BODY = 'rgba(232, 196, 110, 0.97)';
export const GOLD_ACCENT = 'rgba(255, 236, 180, 0.98)';
export const GOLD_GEM = 'rgba(255, 244, 200, 0.98)';
export const GOLD_BLOOM = 'rgba(255, 220, 130, 0.55)';

/**
 * Pulso suave 0.55..1 (respiração do brilho).
 * @param {number} [t]
 */
export function goldPulse(t = shinyGlitchNow()) {
  const a = Math.sin(t * 0.0042);
  const b = Math.sin(t * 0.0091 + 1.1);
  return 0.55 + 0.45 * (0.5 + 0.5 * a) * (0.85 + 0.15 * b);
}

/**
 * Sparkles orbitando levemente o centro.
 * @param {number} cx
 * @param {number} cy
 * @param {number} radius
 * @param {number} [t]
 * @param {number} [count]
 * @returns {{ x: number, y: number, r: number, a: number }[]}
 */
export function goldSparkles(cx, cy, radius, t = shinyGlitchNow(), count = 6) {
  const out = [];
  const n = Math.max(3, Math.min(8, Math.floor(Number(count) || 6)));
  const R = Math.max(4, Number(radius) || 10);
  for (let i = 0; i < n; i += 1) {
    const phase = t * 0.0024 + i * ((Math.PI * 2) / n);
    const twinkle = 0.35 + 0.65 * Math.max(0, Math.sin(t * 0.012 + i * 1.7));
    if (twinkle < 0.4) continue;
    const orbit = R * (0.55 + 0.35 * Math.sin(phase * 0.7 + i));
    out.push({
      x: cx + Math.cos(phase) * orbit,
      y: cy + Math.sin(phase * 1.15) * orbit * 0.85,
      r: 0.6 + twinkle * 1.4,
      a: 0.35 + twinkle * 0.55,
    });
  }
  return out;
}

/**
 * Aura radial dourada atrás do sprite.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} radius
 * @param {number} [pulse]
 */
export function paintGoldAura(ctx, cx, cy, radius, pulse = 1) {
  if (!ctx) return;
  const r = Math.max(4, Number(radius) || 12);
  const p = Math.min(1.2, Math.max(0.4, Number(pulse) || 1));
  const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * (1.15 + p * 0.25));
  g.addColorStop(0, `rgba(255, 236, 170, ${0.35 * p})`);
  g.addColorStop(0.45, `rgba(207, 167, 89, ${0.22 * p})`);
  g.addColorStop(1, 'rgba(207, 167, 89, 0)');
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r * (1.2 + p * 0.2), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Scratch p/ getImageData (willReadFrequently). */
let _goldScratch = null;
let _goldScratchCtx = null;
/** @type {WeakMap<object, Map<string, HTMLCanvasElement|OffscreenCanvas>>} */
const _goldTintCache = new WeakMap();

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(w, h);
  }
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  return null;
}

function goldScratchCtx(w, h) {
  const width = Math.max(1, Math.ceil(w));
  const height = Math.max(1, Math.ceil(h));
  if (
    !_goldScratch
    || _goldScratch.width !== width
    || _goldScratch.height !== height
  ) {
    _goldScratch = makeCanvas(width, height);
    if (!_goldScratch) return null;
    _goldScratchCtx = _goldScratch.getContext('2d', { willReadFrequently: true });
  }
  return _goldScratchCtx;
}

/**
 * Remapeia RGB → ouro preservando alpha e o contraste relativo.
 * Sprites quase pretos (Cerberus etc.) não respondem a sepia; precisa subir o piso.
 *
 * @param {ImageData} imageData
 * @param {number} [pulse]
 */
export function recolorImageDataToGold(imageData, pulse = 1) {
  if (!imageData?.data) return imageData;
  const d = imageData.data;
  const p = Math.min(1.2, Math.max(0.4, Number(pulse) || 1));
  // Piso alto: preto puro vira ouro escuro legível (~#c49a3a).
  const floor = 0.42 + p * 0.05;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a < 6) continue;
    const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    const t = Math.min(1, Math.max(0, Math.pow(floor + lum * (1 - floor), 0.75)));
    // #b8862a → #f0d078 → #fff8dc
    d[i] = Math.round(184 + t * 71);
    d[i + 1] = Math.round(134 + t * 114);
    d[i + 2] = Math.round(42 + t * 178);
  }
  return imageData;
}

/**
 * Gera (e cacheia) bitmap dourado do sprite no tamanho pedido.
 * @param {CanvasImageSource} img
 * @param {number} w
 * @param {number} h
 * @returns {HTMLCanvasElement|OffscreenCanvas|null}
 */
function tintedGoldSprite(img, w, h) {
  const width = Math.max(1, Math.ceil(w));
  const height = Math.max(1, Math.ceil(h));
  const key = `${width}x${height}`;
  let bySize = _goldTintCache.get(img);
  if (!bySize) {
    bySize = new Map();
    _goldTintCache.set(img, bySize);
  }
  const hit = bySize.get(key);
  if (hit) return hit;

  const out = makeCanvas(width, height);
  if (!out) return null;
  const octx = out.getContext('2d');
  const scratch = goldScratchCtx(width, height);
  if (!octx) return null;

  if (scratch) {
    scratch.setTransform(1, 0, 0, 1, 0, 0);
    scratch.globalAlpha = 1;
    scratch.globalCompositeOperation = 'source-over';
    if (typeof scratch.filter === 'string' || 'filter' in scratch) {
      scratch.filter = 'none';
    }
    scratch.clearRect(0, 0, width, height);
    scratch.drawImage(img, 0, 0, width, height);
    try {
      const data = scratch.getImageData(0, 0, width, height);
      recolorImageDataToGold(data, 1);
      scratch.putImageData(data, 0, 0);
      octx.clearRect(0, 0, width, height);
      octx.drawImage(scratch.canvas, 0, 0);
      bySize.set(key, out);
      return out;
    } catch {
      // fall through → silhueta sólida
    }
  }

  // Fallback: silhueta 100% ouro (source-atop opaco) — ainda melhor que preto.
  octx.clearRect(0, 0, width, height);
  octx.drawImage(img, 0, 0, width, height);
  octx.globalCompositeOperation = 'source-atop';
  octx.fillStyle = '#e8c46e';
  octx.fillRect(0, 0, width, height);
  octx.fillStyle = 'rgba(255, 244, 200, 0.45)';
  octx.fillRect(0, 0, width, height);
  octx.globalCompositeOperation = 'source-over';
  bySize.set(key, out);
  return out;
}

/**
 * Desenha o sprite **recolorido** de ouro (não só glow/sombra).
 * Remap de luminância cacheado — funciona em silhuetas pretas.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {CanvasImageSource} img
 * @param {number} dx
 * @param {number} dy
 * @param {number} dw
 * @param {number} dh
 * @param {{ pulse?: number, reducedMotion?: boolean, shadowBlur?: number }} [opts]
 */
export function drawImageAsGold(ctx, img, dx, dy, dw, dh, opts = {}) {
  if (!ctx || !img) return;
  const pulse = Math.min(1.2, Math.max(0.4, Number(opts.pulse) || 1));
  const reduced = Boolean(opts.reducedMotion);
  const w = Math.max(1, Math.ceil(Number(dw) || 1));
  const h = Math.max(1, Math.ceil(Number(dh) || 1));
  const tinted = tintedGoldSprite(img, w, h);

  ctx.save();
  if (!reduced) {
    ctx.shadowColor = GOLD_SHADOW;
    ctx.shadowBlur = Number.isFinite(Number(opts.shadowBlur))
      ? Number(opts.shadowBlur)
      : 12 + pulse * 14;
  }

  if (tinted) {
    ctx.drawImage(tinted, 0, 0, w, h, dx, dy, dw, dh);
  } else {
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = '#e8c46e';
    ctx.fillRect(dx, dy, dw, dh);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}

/**
 * Pontos de brilho.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} radius
 * @param {number} [t]
 */
export function paintGoldSparkles(ctx, cx, cy, radius, t = shinyGlitchNow()) {
  if (!ctx) return;
  for (const sp of goldSparkles(cx, cy, radius, t)) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = sp.a;
    ctx.fillStyle = 'rgba(255, 248, 220, 1)';
    ctx.shadowColor = 'rgba(255, 220, 120, 0.95)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
    ctx.fill();
    // cruzinha de sparkle
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 240, 0.9)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(sp.x - sp.r * 1.8, sp.y);
    ctx.lineTo(sp.x + sp.r * 1.8, sp.y);
    ctx.moveTo(sp.x, sp.y - sp.r * 1.8);
    ctx.lineTo(sp.x, sp.y + sp.r * 1.8);
    ctx.stroke();
    ctx.restore();
  }
}
