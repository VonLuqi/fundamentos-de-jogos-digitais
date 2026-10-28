/**
 * SpriteAtlas — resolve WebP + fallback SVG (Task B3).
 * Mercado / Styx / prateleiras nunca quebram se o asset faltar.
 */

import { GENERATOR_BY_ID } from '../../config/generators.js';
import { getTalent } from '../../config/talents.js';
import { UPGRADES } from '../../config/upgrades.js';
import { ART_VERSIONS } from '../../config/art-versions.js';

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
 * URLs do sprite com a versão de cache da pasta (hash do conteúdo, config/art-versions.js):
 * arte nova troca a URL e fura o cache de 7 dias do WebP.
 * @param {string} folder
 * @param {string} id
 */
export function spritePaths(folder, id) {
  const safe = String(id || '').replace(/[^\w-]/g, '');
  if (!safe) {
    return { webp: null, svg: null };
  }
  const q = ART_VERSIONS[folder] ? `?v=${ART_VERSIONS[folder]}` : '';
  return {
    webp: `${SPRITE_BASE}/${folder}/${safe}.webp${q}`,
    svg: `${SPRITE_BASE}/${folder}/${safe}.svg${q}`,
  };
}

export function generatorSprite(id) {
  const def = GENERATOR_BY_ID[id];
  return {
    id,
    ...spritePaths('generators', id),
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
  return {
    id,
    ...spritePaths('upgrades', id),
    mark: markFrom(def?.name, id),
  };
}

/** Ícones do Rio do Lethe (talentos). */
export function talentSprite(id) {
  const def = typeof getTalent === 'function' ? getTalent(id) : null;
  const paths = spritePaths('talents', id);
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

/** Sprites da Catábase (Sanguessugas + estágios Grandmapocalypse). */
export function catabaseSprite(id) {
  const safe = String(id || '').replace(/[^\w-]/g, '');
  let mark = '?';
  if (safe.includes('shiny')) mark = '✦';
  else if (safe.includes('sanguessuga')) mark = 'ᚹ';
  else if (safe.includes('estagio')) mark = 'Ω';
  else if (safe.includes('tregua')) mark = '☮';
  else if (safe.includes('alianca')) mark = '⚔';
  return {
    id: safe,
    ...spritePaths('catabase', safe),
    mark,
  };
}

/** Modelo 3D da Foice (gerado por npm run despertar:foice3d), com versão de cache da pasta. */
export function foiceModelUrl() {
  const v = ART_VERSIONS.foice ? `?v=${ART_VERSIONS.foice}` : '';
  return `${SPRITE_BASE}/foice/foice-3d.glb${v}`;
}

/** Ícones de Néctar e minigames (sprites/minigames/<spriteId>: nectar_*, seed_*, spirit_*, spell_*, good_*). */
export function minigameSprite(spriteId, name = '') {
  return {
    id: spriteId,
    ...spritePaths('minigames', spriteId),
    mark: markFrom(name, spriteId),
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

/** Fundo pixel art da prateleira. */
export function habitatBackgroundSprite(id) {
  return spritePaths('habitats/backgrounds', id);
}

export async function loadHabitatBackgroundImage(id, env = {}) {
  const sprite = habitatBackgroundSprite(id);
  const webpImg = await loadSpriteImage(sprite.webp, env);
  if (webpImg) return webpImg;
  return loadSpriteImage(sprite.svg, env);
}
