/**
 * SpriteAtlas — resolve WebP + fallback SVG (Task B3).
 * Mercado / Styx / prateleiras nunca quebram se o asset faltar.
 */

import { GENERATOR_BY_ID } from '../../config/generators.js';
import { UPGRADES } from '../../config/upgrades.js';

/** Relativo a pages/*.html */
export const SPRITE_BASE = '../assets/despertar/sprites';

const UPGRADE_BY_ID = Object.freeze(
  Object.fromEntries(UPGRADES.map((item) => [item.id, item])),
);

function markFrom(name, id) {
  const raw = String(name || id || '?').trim();
  return raw.slice(0, 1).toUpperCase() || '?';
}

/**
 * @param {'generators'|'upgrades'} folder
 * @param {string} id
 */
export function spritePaths(folder, id) {
  const safe = String(id || '').replace(/[^\w-]/g, '');
  if (!safe) {
    return { webp: null, svg: null };
  }
  return {
    webp: `${SPRITE_BASE}/${folder}/${safe}.webp`,
    svg: `${SPRITE_BASE}/${folder}/${safe}.svg`,
  };
}

export function generatorSprite(id) {
  const def = GENERATOR_BY_ID[id];
  const paths = spritePaths('generators', id);
  return {
    id,
    ...paths,
    mark: markFrom(def?.name, id),
    tier: def?.tier ?? 1,
  };
}

/** Pixel art dos habitats (prateleiras e órbita). Não substitui o ícone da loja. */
export function habitatSprite(id) {
  const def = GENERATOR_BY_ID[id];
  const paths = spritePaths('habitats', id);
  return {
    id,
    ...paths,
    mark: markFrom(def?.name, id),
    tier: def?.tier ?? 1,
    pixel: true,
  };
}

export function upgradeSprite(id) {
  const def = UPGRADE_BY_ID[id];
  const paths = spritePaths('upgrades', id);
  return {
    id,
    ...paths,
    mark: markFrom(def?.name, id),
  };
}

export function shimmerSprite(id) {
  const spriteId = id === 'wrath' || id === 'eco_colerico' ? 'eco_colerico' : 'eco_dourado';
  const paths = spritePaths('shimmers', spriteId);
  return {
    id: spriteId,
    ...paths,
    mark: spriteId === 'eco_colerico' ? 'Ψ' : '✦',
  };
}

/**
 * Monta <img> com cadeia WebP → SVG → marca de texto.
 * @param {Document} doc
 * @param {{ webp?: string|null, svg?: string|null, mark?: string }} sprite
 * @param {{ className?: string }} [options]
 * @returns {HTMLElement}
 */
export function createSpriteNode(doc, sprite, options = {}) {
  const host = doc.createElement('div');
  host.className = options.className || 'despertar-sprite';
  host.setAttribute('aria-hidden', 'true');

  const mark = doc.createElement('span');
  mark.className = 'despertar-sprite__mark';
  mark.textContent = sprite?.mark || '?';

  const webp = sprite?.webp || null;
  const svg = sprite?.svg || null;

  if (!webp && !svg) {
    host.append(mark);
    return host;
  }

  const img = doc.createElement('img');
  img.className = 'despertar-sprite__img';
  img.alt = '';
  img.decoding = 'async';
  img.loading = 'lazy';
  img.src = webp || svg;
  if (webp && svg) img.dataset.fallback = svg;

  const showMark = () => {
    img.remove();
    if (!host.contains(mark)) host.append(mark);
  };

  img.addEventListener('error', () => {
    if (img.dataset.fallback) {
      img.src = img.dataset.fallback;
      delete img.dataset.fallback;
      return;
    }
    showMark();
  });

  host.append(img);
  return host;
}

/**
 * Tenta carregar uma imagem (prateleiras / canvas). Falha → null.
 * @param {string|null|undefined} url
 * @param {{ Image?: typeof Image }} [env]
 * @returns {Promise<CanvasImageSource|null>}
 */
export function loadSpriteImage(url, env = {}) {
  if (!url) return Promise.resolve(null);
  const ImageCtor = env.Image
    ?? (typeof Image !== 'undefined' ? Image : null);
  if (!ImageCtor) return Promise.resolve(null);

  return new Promise((resolve) => {
    const img = new ImageCtor();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Carrega gerador: WebP, depois SVG.
 * @param {string} id
 */
export async function loadGeneratorImage(id, env = {}) {
  const sprite = generatorSprite(id);
  const webpImg = await loadSpriteImage(sprite.webp, env);
  if (webpImg) return webpImg;
  return loadSpriteImage(sprite.svg, env);
}

/** Habitat pixel art. Sem fallback para a ilustração da loja. */
export async function loadHabitatImage(id, env = {}) {
  const sprite = habitatSprite(id);
  const webpImg = await loadSpriteImage(sprite.webp, env);
  if (webpImg) return webpImg;
  return loadSpriteImage(sprite.svg, env);
}

/** Variação de habitat (o upgrade troca o personagem, não desenha um overlay). */
export function habitatVariantSprite(accessory) {
  return spritePaths('habitats/variants', accessory);
}

export async function loadHabitatVariantImage(accessory, env = {}) {
  const sprite = habitatVariantSprite(accessory);
  const webpImg = await loadSpriteImage(sprite.webp, env);
  if (webpImg) return webpImg;
  return loadSpriteImage(sprite.svg, env);
}

/** Fundo pixel art da prateleira. O query troca o cache quando o chão muda. */
export function habitatBackgroundSprite(id) {
  const sprite = spritePaths('habitats/backgrounds', id);
  if (sprite.webp) sprite.webp += '?v=floor3';
  return sprite;
}

export async function loadHabitatBackgroundImage(id, env = {}) {
  const sprite = habitatBackgroundSprite(id);
  const webpImg = await loadSpriteImage(sprite.webp, env);
  if (webpImg) return webpImg;
  return loadSpriteImage(sprite.svg, env);
}
