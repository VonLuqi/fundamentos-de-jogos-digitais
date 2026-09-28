/**
 * CosmeticsAtlas — WebP/SVG opcional para accessories (Fase E / E3).
 * Sem arquivo → null; drawAccessory continua procedural.
 */

import { P0_COSMETIC_ACCESSORIES } from '../../config/upgrade-cosmetics.js';
import { loadSpriteImage } from './SpriteAtlas.js';

/** Relativo a pages/*.html */
export const COSMETIC_BASE = '../assets/despertar/cosmetics';

/**
 * @param {string} accessoryId
 */
export function cosmeticPaths(accessoryId) {
  const safe = String(accessoryId || '').replace(/[^\w-]/g, '');
  if (!safe) return { webp: null, svg: null };
  return {
    webp: `${COSMETIC_BASE}/${safe}.webp`,
    svg: `${COSMETIC_BASE}/${safe}.svg`,
  };
}

/** Cache em memória: accessory → Image | null (null = tentou e falhou). */
const cache = new Map();
const inflight = new Map();

/**
 * @param {string} accessoryId
 * @param {{ Image?: typeof Image }} [env]
 * @returns {Promise<CanvasImageSource|null>}
 */
export async function loadCosmeticImage(accessoryId, env = {}) {
  const id = String(accessoryId || '');
  if (!id) return null;
  if (cache.has(id)) return cache.get(id);

  if (inflight.has(id)) return inflight.get(id);

  const paths = cosmeticPaths(id);
  const job = (async () => {
    const webpImg = await loadSpriteImage(paths.webp, env);
    if (webpImg) {
      cache.set(id, webpImg);
      return webpImg;
    }
    const svgImg = await loadSpriteImage(paths.svg, env);
    cache.set(id, svgImg);
    return svgImg;
  })();

  inflight.set(id, job);
  try {
    return await job;
  } finally {
    inflight.delete(id);
  }
}

/**
 * Sync peek do cache (sem I/O).
 * @param {string} accessoryId
 * @returns {CanvasImageSource|null|undefined} undefined = ainda não tentou
 */
export function peekCosmeticImage(accessoryId) {
  const id = String(accessoryId || '');
  if (!cache.has(id)) return undefined;
  return cache.get(id);
}

/**
 * Prefetch P0 (ou lista). Falhas viram null no cache — procedural segue.
 * @param {string[]} [ids]
 * @param {{ Image?: typeof Image }} [env]
 */
export async function prefetchCosmeticImages(
  ids = [...P0_COSMETIC_ACCESSORIES],
  env = {},
) {
  const list = Array.isArray(ids) ? ids : [];
  await Promise.all(list.map((id) => loadCosmeticImage(id, env)));
  return list.map((id) => ({ id, ok: Boolean(peekCosmeticImage(id)) }));
}

/** Só para testes. */
export function clearCosmeticImageCache() {
  cache.clear();
  inflight.clear();
}
