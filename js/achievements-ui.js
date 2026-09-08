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
} from './api.js';

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
  const rainbowTargets = Array.from(scope.querySelectorAll([
    '.achievement-card[data-rarity="rainbow"]',
    '.achievement-slot.is-unlocked[data-rarity="rainbow"] .achievement-slot__face',
  ].join(', ')));
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

    const icon = document.createElement('span');
    icon.className = 'achievement-card__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = ach.icon;

    const name = document.createElement('p');
    name.className = 'achievement-card__name';
    name.textContent = ach.name;

    const rarityBadge = document.createElement('p');
    rarityBadge.className = 'achievement-card__rarity';
    rarityBadge.textContent = rarityLabelForAchievement(ach);

    const desc = document.createElement('p');
    desc.className = 'achievement-card__desc';
    desc.textContent = ach.desc;

    li.append(icon, name, rarityBadge, desc);

    if (rarity === 'rainbow' && justUnlocked) {
      li.classList.add('is-rainbow-burst');
    }

    container.appendChild(li);
  });
}

/**
 * Álbum: um slot por entrada do catálogo.
 * Álbum próprio: hidden não descoberta → “?” (raridade unknown).
 * Espelho (`visitorView`): texto ← observador; estilo ← espelhado (eixos independentes).
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
      const mark = document.createElement('span');
      mark.className = 'achievement-slot__mystery';
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = '?';
      const label = document.createElement('p');
      label.className = 'achievement-slot__name';
      label.textContent = '???';
      button.append(mark, label);
      if (model.showRarityBadge) {
        const rarityBadge = document.createElement('p');
        rarityBadge.className = 'achievement-slot__rarity';
        rarityBadge.textContent = rarityName;
        button.append(rarityBadge);
      }
    } else if (model.kind === 'locked') {
      button.setAttribute(
        'aria-label',
        isSecretKnownLocked
          ? `Segredo que você conhece, ainda não conquistado neste Espelho: ${ach.name}.`
          : `Relíquia bloqueada: ${ach.name}. Raridade ${rarityName}.`
      );
      const icon = document.createElement('span');
      icon.className = isSecretKnownLocked
        ? 'achievement-slot__icon'
        : 'achievement-slot__icon is-silhouette';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = ach.icon;
      const name = document.createElement('p');
      name.className = 'achievement-slot__name';
      name.textContent = ach.name;
      button.append(icon, name);
      if (model.showRarityBadge) {
        const rarityBadge = document.createElement('p');
        rarityBadge.className = 'achievement-slot__rarity';
        rarityBadge.textContent = rarityName;
        button.append(rarityBadge);
      }
    } else {
      button.setAttribute(
        'aria-label',
        visitorView && model.isSecret
          ? `Segredo revelado neste Espelho: ${ach.name}. Raridade ${rarityName}.`
          : `Relíquia descoberta: ${ach.name}. Raridade ${rarityName}.`
      );
      const icon = document.createElement('span');
      icon.className = 'achievement-slot__icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = ach.icon;
      const name = document.createElement('p');
      name.className = 'achievement-slot__name';
      name.textContent = ach.name;
      button.append(icon, name);
      if (model.showRarityBadge) {
        const rarityBadge = document.createElement('p');
        rarityBadge.className = 'achievement-slot__rarity';
        rarityBadge.textContent = rarityName;
        button.append(rarityBadge);
      }
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
export function renderAchievementsList(container, user, options = {}) {
  if (!container) return;

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
