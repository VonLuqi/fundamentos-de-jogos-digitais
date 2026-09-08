/**
 * Helpers compartilhados de renderização de conquistas.
 * Modo `cards` = Quadro atual do dashboard.
 * Modo `album` = slots fixos do Álbum de Relíquias (Fase 3 completa o modal/CSS).
 */

'use strict';

import {
  ACHIEVEMENTS,
  ACHIEVEMENT_RARITY_LABELS,
  normalizeAchievementRarity,
  rootPath,
} from './api.js';

/** Fonte de verdade das artes: `assets/achievements/catalog.json` (igual aos avatares). */
const ACHIEVEMENT_ART_CATALOG_FILE = 'assets/achievements/catalog.json';

/** @type {Map<string, string>} id → nome do arquivo webp */
let achievementArtById = new Map();
let achievementArtCatalogPromise = null;

/**
 * Set vivo dos ids com arte. Preferir o catalog.json; este Set é preenchido no load.
 * Mantido exportado para smoke/compat.
 */
export const ACHIEVEMENT_ART_IDS = new Set();

function achievementArtCatalogUrl() {
  return `${rootPath()}/${ACHIEVEMENT_ART_CATALOG_FILE}`;
}

function normalizeAchievementArtCatalog(rawCatalog) {
  const safeRaw = Array.isArray(rawCatalog) ? rawCatalog : [];
  const map = new Map();

  safeRaw.forEach((entry) => {
    const file = String(entry?.file || '').trim();
    if (!file || !/\.webp$/i.test(file)) return;

    const idFromFile = file.replace(/\.webp$/i, '');
    const id = String(entry?.id || idFromFile).trim();
    if (!id) return;

    map.set(id, file);
  });

  return map;
}

function applyAchievementArtCatalog(map) {
  achievementArtById = map;
  ACHIEVEMENT_ART_IDS.clear();
  map.forEach((_file, id) => ACHIEVEMENT_ART_IDS.add(id));
  return map;
}

/**
 * Carrega e cacheia `assets/achievements/catalog.json`.
 * Sem arte listada → UI usa emoji (sem 404).
 */
export async function ensureAchievementArtCatalogLoaded() {
  if (!achievementArtCatalogPromise) {
    achievementArtCatalogPromise = fetch(achievementArtCatalogUrl(), { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Falha ao carregar catalogo de artes (${response.status})`);
        }
        const payload = await response.json();
        return applyAchievementArtCatalog(normalizeAchievementArtCatalog(payload));
      })
      .catch(() => applyAchievementArtCatalog(new Map()));
  }

  return achievementArtCatalogPromise;
}

/**
 * URL da arte WebP se o id estiver no catálogo; senão `null` (usar emoji).
 * Chame `ensureAchievementArtCatalogLoaded()` antes do render.
 */
export function achievementArtUrl(achievementId) {
  const id = String(achievementId || '');
  if (!id) return null;
  const file = achievementArtById.get(id);
  if (!file) return null;
  return `${rootPath()}/assets/achievements/${encodeURIComponent(file)}`;
}

/**
 * Nó de arte: `<img>` se houver WebP no catálogo, senão `<span>` com emoji.
 * @param {object} achievement
 * @param {{ className?: string, grayscale?: boolean }} [options]
 */
export function createAchievementArtNode(achievement, {
  className = 'achievement-slot__art',
  grayscale = false,
} = {}) {
  const url = achievementArtUrl(achievement?.id);
  const classes = [
    className,
    url ? 'has-art' : 'has-emoji',
    grayscale ? 'is-bw' : '',
    grayscale && !url ? 'is-silhouette' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (url) {
    const img = document.createElement('img');
    img.className = classes;
    img.src = url;
    img.alt = '';
    img.decoding = 'async';
    img.draggable = false;
    img.setAttribute('aria-hidden', 'true');
    img.onerror = () => {
      const span = document.createElement('span');
      span.className = [
        className,
        'has-emoji',
        grayscale ? 'is-bw is-silhouette' : '',
      ]
        .filter(Boolean)
        .join(' ');
      span.setAttribute('aria-hidden', 'true');
      span.textContent = achievement?.icon || '?';
      img.replaceWith(span);
    };
    return img;
  }

  const span = document.createElement('span');
  span.className = classes;
  span.setAttribute('aria-hidden', 'true');
  span.textContent = achievement?.icon || '?';
  return span;
}

/**
 * Preenche o host do modal (`#relic-modal-art`) com img ou emoji.
 * Mistério / locked: use `grayscale: true` (arte P&B — sem `?` tipográfico).
 */
export async function fillAchievementArtHost(hostEl, achievement, {
  grayscale = false,
} = {}) {
  if (!hostEl) return;
  await ensureAchievementArtCatalogLoaded();

  hostEl.replaceChildren();
  hostEl.classList.remove('is-silhouette', 'is-bw', 'has-art', 'has-emoji');
  hostEl.textContent = '';

  const node = createAchievementArtNode(achievement, {
    className: 'relic-modal__art-media',
    grayscale,
  });

  if (node?.tagName === 'IMG') {
    hostEl.classList.add('has-art');
    if (grayscale) hostEl.classList.add('is-bw');
    hostEl.appendChild(node);
    return;
  }

  hostEl.textContent = achievement?.icon || '?';
  hostEl.classList.add('has-emoji');
  if (grayscale) hostEl.classList.add('is-silhouette');
}

const rainbowVfxBoundElements = new WeakSet();
let rainbowVfxInstancePromise = null;
let rainbowVfxDisabled = false;
/** Canvas WebGL do @vfx-js — default da lib é z-index 9999; mantemos abaixo dos modais. */
const RAINBOW_VFX_CANVAS_Z_INDEX = 40;
let rainbowVfxCanvas = null;
let rainbowVfxSuspended = false;
const reducedMotionQuery = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : { matches: false };

function findRainbowVfxCanvas() {
  return Array.from(document.body?.querySelectorAll(':scope > canvas') || []).find((canvas) => {
    const style = window.getComputedStyle(canvas);
    return style.pointerEvents === 'none'
      && (style.position === 'fixed' || style.position === 'absolute');
  }) || null;
}

function syncRainbowVfxCanvasVisibility() {
  if (!rainbowVfxCanvas || !rainbowVfxCanvas.isConnected) {
    rainbowVfxCanvas = findRainbowVfxCanvas();
  }
  if (!rainbowVfxCanvas) return;
  rainbowVfxCanvas.style.visibility = rainbowVfxSuspended ? 'hidden' : '';
}

/**
 * Esconde o canvas WebGL arco-íris enquanto overlays de UI (ex.: scroll-modal) estão abertos.
 * Não destrói a instância — ao retomar, o juice volta sem rebind.
 */
export function setRainbowVfxSuspended(suspended) {
  rainbowVfxSuspended = Boolean(suspended);
  syncRainbowVfxCanvasVisibility();
}

/** Catálogo visível no modo cards (hidden só aparece se desbloqueada, exceto admin). */
export function visibleAchievementsForUser(user) {
  const unlockedIds = new Set(user?.achievements || []);
  if (user?.role === 'admin') return ACHIEVEMENTS;
  return ACHIEVEMENTS.filter((achievement) => !achievement.hidden || unlockedIds.has(achievement.id));
}

/**
 * Catálogo do álbum.
 * No Espelho (`visitorView`), o catálogo é completo: segredos aparecem,
 * mas a descrição fica velada no modal (sem spoiler de como obter).
 */
export function achievementsCatalogForViewer(_user, { visitorView = false } = {}) {
  void visitorView;
  return ACHIEVEMENTS;
}

export function rarityLabelForAchievement(achievement) {
  const rarity = normalizeAchievementRarity(achievement?.rarity, achievement?.difficulty);
  return ACHIEVEMENT_RARITY_LABELS[rarity] || ACHIEVEMENT_RARITY_LABELS.stone;
}

/**
 * Contador do álbum: X descobertas / Y slots (Y = catálogo completo).
 * No Espelho (`visitorView`): X = tudo que o espelhado desbloqueou, inclusive secretas (Q3-B).
 */
export function getAchievementCollectionStats(user, { visitorView = false } = {}) {
  const catalog = achievementsCatalogForViewer(user, { visitorView });
  const unlockedIds = new Set((user?.achievements || []).map((id) => String(id)));
  const total = catalog.length;

  if (visitorView) {
    const unlocked = catalog.filter((achievement) =>
      unlockedIds.has(String(achievement.id))
    ).length;
    return { unlocked, total };
  }

  const unlocked = user?.role === 'admin'
    ? total
    : catalog.filter((achievement) => unlockedIds.has(String(achievement.id))).length;
  return { unlocked, total };
}

function isAchievementUnlocked(user, achievementId, { ignoreAdminPrivilege = false } = {}) {
  if (!ignoreAdminPrivilege && user?.role === 'admin') return true;
  const ids = (user?.achievements || []).map((id) => String(id));
  return ids.includes(String(achievementId));
}

export { isAchievementUnlocked };

export function getAchievementById(achievementId) {
  return ACHIEVEMENTS.find((achievement) => achievement.id === achievementId) || null;
}

/**
 * Eixos independentes das conquistas secretas no Espelho.
 * Texto ← observador; estilo ← espelhado.
 */
export function resolveMirrorSecretAxes(achievement, { friendUser, viewerUser } = {}) {
  if (!achievement?.hidden) {
    return { isSecret: false, revealText: false, applySecretStyle: false };
  }

  const applySecretStyle = isAchievementUnlocked(friendUser, achievement.id, {
    ignoreAdminPrivilege: true,
  });
  const revealText = viewerUser
    ? isAchievementUnlocked(viewerUser, achievement.id)
    : false;

  return { isSecret: true, revealText, applySecretStyle };
}

/**
 * Modelo completo de um slot do álbum (próprio ou Espelho).
 * @returns {{
 *   kind: 'unlocked'|'locked'|'mystery',
 *   isSecret: boolean,
 *   revealText: boolean,
 *   applySecretStyle: boolean,
 *   rarity: string,
 *   showRarityBadge: boolean,
 * }}
 */
export function getAlbumSlotModel(user, achievement, { visitorView = false, viewerUser = null } = {}) {
  const rarity = normalizeAchievementRarity(achievement?.rarity, achievement?.difficulty);

  if (visitorView && achievement?.hidden) {
    const { revealText, applySecretStyle } = resolveMirrorSecretAxes(achievement, {
      friendUser: user,
      viewerUser,
    });

    let kind = 'mystery';
    if (revealText && applySecretStyle) kind = 'unlocked';
    else if (revealText) kind = 'locked';

    return {
      kind,
      isSecret: true,
      revealText,
      applySecretStyle,
      rarity: applySecretStyle ? rarity : 'unknown',
      showRarityBadge: applySecretStyle,
    };
  }

  const unlocked = isAchievementUnlocked(user, achievement.id, {
    ignoreAdminPrivilege: visitorView,
  });

  if (unlocked) {
    return {
      kind: 'unlocked',
      isSecret: Boolean(achievement?.hidden),
      revealText: true,
      applySecretStyle: false,
      rarity,
      showRarityBadge: true,
    };
  }

  if (achievement?.hidden) {
    return {
      kind: 'mystery',
      isSecret: true,
      revealText: false,
      applySecretStyle: false,
      rarity: 'unknown',
      showRarityBadge: false,
    };
  }

  return {
    kind: 'locked',
    isSecret: false,
    revealText: true,
    applySecretStyle: false,
    rarity,
    showRarityBadge: true,
  };
}

/**
 * Estado resumido de um slot (`kind`).
 * No Espelho, passe `viewerUser` para o eixo de texto das secretas.
 * @returns {'unlocked'|'locked'|'mystery'}
 */
export function getAlbumSlotState(user, achievement, options = {}) {
  return getAlbumSlotModel(user, achievement, options).kind;
}

async function loadVfxModuleWithFallback() {
  const candidates = [
    'https://esm.sh/@vfx-js/core@1.1.0',
    new URL('../node_modules/@vfx-js/core/lib/esm/index.js', import.meta.url).href,
  ];

  for (const specifier of candidates) {
    try {
      const mod = await import(specifier);
      if (mod?.VFX) return mod;
    } catch {
      // tenta o próximo candidato
    }
  }

  return null;
}

async function getRainbowVfxInstance() {
  if (rainbowVfxDisabled || reducedMotionQuery.matches) return null;
  if (!rainbowVfxInstancePromise) {
    rainbowVfxInstancePromise = loadVfxModuleWithFallback().then((mod) => {
      if (!mod?.VFX) return null;
      // zIndex explícito: default da lib (9999) estoura por cima de .scroll-modal / .relic-modal.
      const vfx = new mod.VFX({ zIndex: RAINBOW_VFX_CANVAS_Z_INDEX });
      rainbowVfxCanvas = findRainbowVfxCanvas();
      syncRainbowVfxCanvasVisibility();
      return vfx;
    });
  }

  try {
    return await rainbowVfxInstancePromise;
  } catch {
    rainbowVfxDisabled = true;
    return null;
  }
}

export async function applyRainbowCardJuiceVfx(root = document) {
  if (rainbowVfxDisabled || reducedMotionQuery.matches) return;

  const scope = root?.querySelectorAll ? root : document;

  // Hub cards: só CSS — o shader glitch do @vfx-js torce a arte WebP.
  scope.querySelectorAll('.achievement-card[data-rarity="rainbow"]').forEach((el) => {
    el.classList.add('is-rainbow-css-fallback');
  });

  const rainbowTargets = Array.from(scope.querySelectorAll(
    '.achievement-slot.is-unlocked[data-rarity="rainbow"] .achievement-slot__face'
  ));
  if (rainbowTargets.length === 0) return;

  const vfx = await getRainbowVfxInstance();
  if (!vfx) {
    rainbowTargets.forEach((el) => {
      el.classList.add('is-rainbow-css-fallback');
      el.closest('.achievement-slot')?.classList.add('is-rainbow-css-fallback');
    });
    return;
  }

  rainbowTargets.forEach((el) => {
    if (rainbowVfxBoundElements.has(el)) return;

    // Álbum com WebP: glitch também distorce a figurinha — preferir CSS.
    if (el.querySelector('img.has-art')) {
      el.classList.add('is-rainbow-css-fallback');
      el.closest('.achievement-slot')?.classList.add('is-rainbow-css-fallback');
      return;
    }

    try {
      vfx.add(el, {
        shader: 'glitch',
        overflow: 22,
      });
      rainbowVfxBoundElements.add(el);
      el.classList.add('is-rainbow-vfx');
      el.closest('.achievement-slot')?.classList.add('is-rainbow-vfx');
    } catch {
      el.classList.add('is-rainbow-css-fallback');
      el.closest('.achievement-slot')?.classList.add('is-rainbow-css-fallback');
    }
  });

  rainbowVfxCanvas = findRainbowVfxCanvas() || rainbowVfxCanvas;
  syncRainbowVfxCanvasVisibility();
}

function appendRelicFaceContent(parent, {
  title,
  achievement,
  rarityLabel = '',
  showRarityBadge = true,
  grayscale = false,
  nameClassName,
  artClassName,
  rarityClassName,
}) {
  const name = document.createElement('p');
  name.className = nameClassName;
  name.textContent = title;

  const art = createAchievementArtNode(achievement, {
    className: artClassName,
    grayscale,
  });

  parent.append(name, art);

  if (showRarityBadge && rarityLabel) {
    const badge = document.createElement('p');
    badge.className = rarityClassName;
    badge.textContent = rarityLabel;
    parent.append(badge);
  }
}

function renderCardsMode(container, user, { highlightIds, emptyMessage, achievements }) {
  const visibleAchievements = Array.isArray(achievements)
    ? achievements
    : visibleAchievementsForUser(user);

  container.innerHTML = '';
  if (visibleAchievements.length === 0) {
    const li = document.createElement('li');
    li.className = 'achievement-empty';
    li.textContent = emptyMessage;
    container.appendChild(li);
    return;
  }

  visibleAchievements.forEach((ach, index) => {
    const unlocked = isAchievementUnlocked(user, ach.id);
    const justUnlocked = highlightIds.includes(ach.id);
    const rarity = normalizeAchievementRarity(ach.rarity, ach.difficulty);

    const li = document.createElement('li');
    li.className = [
      'achievement-card',
      unlocked ? 'is-unlocked' : 'is-locked',
      justUnlocked ? 'is-just-unlocked' : '',
    ]
      .filter(Boolean)
      .join(' ');
    li.style.setProperty('--ach-index', String(index));
    li.dataset.rarity = rarity;
    li.dataset.achievementId = ach.id;

    // Layout: título → arte → badge (sem descrição no face).
    appendRelicFaceContent(li, {
      title: ach.name,
      achievement: ach,
      rarityLabel: rarityLabelForAchievement(ach),
      showRarityBadge: true,
      grayscale: !unlocked,
      nameClassName: 'achievement-card__name',
      artClassName: 'achievement-card__art',
      rarityClassName: 'achievement-card__rarity',
    });

    if (rarity === 'rainbow' && justUnlocked) {
      li.classList.add('is-rainbow-burst');
    }

    container.appendChild(li);
  });
}

/**
 * Álbum: um slot por entrada do catálogo.
 * Layout: título → arte → badge. Mistério / locked / secret-known → arte P&B.
 * Espelho (`visitorView`): texto ← observador; estilo ← espelhado.
 */
function renderAlbumMode(container, user, {
  highlightIds,
  emptyMessage,
  onSlotClick,
  achievements,
  visitorView,
  viewerUser,
}) {
  container.innerHTML = '';
  container.classList.add('achievement-album');

  const catalog = Array.isArray(achievements)
    ? achievements
    : achievementsCatalogForViewer(user, { visitorView });

  if (catalog.length === 0) {
    const li = document.createElement('li');
    li.className = 'achievement-empty';
    li.textContent = emptyMessage;
    container.appendChild(li);
    return;
  }

  catalog.forEach((ach, index) => {
    const model = getAlbumSlotModel(user, ach, { visitorView, viewerUser });
    const justUnlocked = highlightIds.includes(ach.id);
    const rarityName = rarityLabelForAchievement(ach);
    const slotState = model.kind;

    const li = document.createElement('li');
    const isMysteryFace = model.kind === 'mystery';
    const isStyledMystery = Boolean(
      visitorView && model.isSecret && model.applySecretStyle && !model.revealText
    );
    const isSecretKnownLocked = Boolean(
      visitorView && model.isSecret && model.revealText && !model.applySecretStyle
    );
    const useGrayscale = model.kind !== 'unlocked';

    li.className = [
      'achievement-slot',
      model.kind === 'unlocked' ? 'is-unlocked' : 'is-locked',
      isMysteryFace ? 'is-mystery' : '',
      isStyledMystery ? 'is-mystery--styled' : '',
      isSecretKnownLocked ? 'is-secret-known' : '',
      justUnlocked ? 'is-just-unlocked' : '',
    ]
      .filter(Boolean)
      .join(' ');

    li.id = `relic-${ach.id}`;
    li.style.setProperty('--ach-index', String(index));
    li.dataset.achievementId = ach.id;
    li.dataset.rarity = model.rarity;
    li.dataset.state = slotState;
    if (visitorView && model.isSecret) {
      li.dataset.revealText = String(model.revealText);
      li.dataset.secretStyle = String(model.applySecretStyle);
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'achievement-slot__face';
    button.dataset.achievementId = ach.id;

    if (isMysteryFace) {
      button.setAttribute(
        'aria-label',
        visitorView
          ? (isStyledMystery
            ? `Segredo desconhecido no Espelho, com raridade ${rarityName}.`
            : 'Segredo desconhecido e ainda não conquistado neste Espelho.')
          : 'Relíquia misteriosa ainda não descoberta. Raridade desconhecida.'
      );
      appendRelicFaceContent(button, {
        title: '???',
        achievement: ach,
        rarityLabel: rarityName,
        showRarityBadge: model.showRarityBadge,
        grayscale: true,
        nameClassName: 'achievement-slot__name',
        artClassName: 'achievement-slot__art',
        rarityClassName: 'achievement-slot__rarity',
      });
    } else if (model.kind === 'locked') {
      button.setAttribute(
        'aria-label',
        isSecretKnownLocked
          ? `Segredo que você conhece, ainda não conquistado neste Espelho: ${ach.name}.`
          : `Relíquia bloqueada: ${ach.name}. Raridade ${rarityName}.`
      );
      appendRelicFaceContent(button, {
        title: ach.name,
        achievement: ach,
        rarityLabel: rarityName,
        showRarityBadge: model.showRarityBadge,
        grayscale: true,
        nameClassName: 'achievement-slot__name',
        artClassName: 'achievement-slot__art',
        rarityClassName: 'achievement-slot__rarity',
      });
    } else {
      button.setAttribute(
        'aria-label',
        visitorView && model.isSecret
          ? `Segredo revelado neste Espelho: ${ach.name}. Raridade ${rarityName}.`
          : `Relíquia descoberta: ${ach.name}. Raridade ${rarityName}.`
      );
      appendRelicFaceContent(button, {
        title: ach.name,
        achievement: ach,
        rarityLabel: rarityName,
        showRarityBadge: model.showRarityBadge,
        grayscale: useGrayscale,
        nameClassName: 'achievement-slot__name',
        artClassName: 'achievement-slot__art',
        rarityClassName: 'achievement-slot__rarity',
      });
      const realRarity = normalizeAchievementRarity(ach.rarity, ach.difficulty);
      if (realRarity === 'rainbow' && justUnlocked) {
        li.classList.add('is-rainbow-burst');
      }
    }

    button.addEventListener('click', () => {
      if (typeof onSlotClick === 'function') {
        onSlotClick(ach, slotState, li);
      }
    });

    li.appendChild(button);
    container.appendChild(li);
  });
}

/**
 * @param {HTMLElement} container
 * @param {object} user — no Espelho: o espelhado
 * @param {object} [options]
 * @param {string[]} [options.highlightIds]
 * @param {'cards'|'album'} [options.mode]
 * @param {string} [options.emptyMessage]
 * @param {boolean} [options.applyRainbowVfx]
 * @param {boolean} [options.visitorView] — Espelho: eixos texto/estilo independentes
 * @param {object|null} [options.viewerUser] — observador (eixo de texto das secretas)
 * @param {object[]} [options.achievements] — subconjunto (ex.: preview do hub)
 * @param {(achievement: object, state: string, slotEl: HTMLElement) => void} [options.onSlotClick]
 */
export async function renderAchievementsList(container, user, options = {}) {
  if (!container) return;

  await ensureAchievementArtCatalogLoaded();

  const {
    highlightIds = [],
    mode = 'cards',
    emptyMessage = 'Nenhuma conquista cadastrada ainda.',
    applyRainbowVfx = true,
    achievements,
    visitorView = false,
    viewerUser = null,
    onSlotClick,
  } = options;

  if (mode === 'album') {
    renderAlbumMode(container, user, {
      highlightIds,
      emptyMessage,
      onSlotClick,
      achievements,
      visitorView,
      viewerUser,
    });
  } else {
    renderCardsMode(container, user, { highlightIds, emptyMessage, achievements });
  }

  if (applyRainbowVfx) {
    void applyRainbowCardJuiceVfx(container);
  }
}
