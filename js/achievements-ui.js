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
 * No Espelho (`visitorView`): segredos nunca contam como revelados (sempre “?”).
 */
export function getAchievementCollectionStats(user, { visitorView = false } = {}) {
  const catalog = achievementsCatalogForViewer(user, { visitorView });
  const unlockedIds = new Set((user?.achievements || []).map((id) => String(id)));
  const total = catalog.length;

  if (visitorView) {
    const unlocked = catalog.filter(
      (achievement) => !achievement.hidden && unlockedIds.has(String(achievement.id))
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
 * Estado de um slot do álbum.
 * No Espelho, segredos são sempre `mystery` (anti-spoiler).
 * @returns {'unlocked'|'locked'|'mystery'}
 */
export function getAlbumSlotState(user, achievement, { visitorView = false } = {}) {
  if (visitorView && achievement?.hidden) return 'mystery';
  const unlocked = isAchievementUnlocked(user, achievement.id, {
    ignoreAdminPrivilege: visitorView,
  });
  if (unlocked) return 'unlocked';
  if (achievement.hidden) return 'mystery';
  return 'locked';
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
 * Espelho (`visitorView`): todo hidden → “?” com estilos de raridade (anti-spoiler).
 */
function renderAlbumMode(container, user, { highlightIds, emptyMessage, onSlotClick, achievements, visitorView }) {
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
    const unlocked = isAchievementUnlocked(user, ach.id, {
      ignoreAdminPrivilege: visitorView,
    });
    const justUnlocked = highlightIds.includes(ach.id);
    // Espelho: todo segredo fica “?” (anti-spoiler). Álbum próprio: “?” só se não desbloqueado.
    const isMystery = Boolean(ach.hidden) && (visitorView || !unlocked);
    const rarity = normalizeAchievementRarity(ach.rarity, ach.difficulty);
    const slotState = isMystery ? 'mystery' : unlocked ? 'unlocked' : 'locked';

    const li = document.createElement('li');
    li.className = [
      'achievement-slot',
      unlocked && !isMystery ? 'is-unlocked' : 'is-locked',
      isMystery ? 'is-mystery' : '',
      visitorView && isMystery ? 'is-mystery--styled' : '',
      justUnlocked ? 'is-just-unlocked' : '',
    ]
      .filter(Boolean)
      .join(' ');
    li.id = `relic-${ach.id}`;
    li.style.setProperty('--ach-index', String(index));
    li.dataset.achievementId = ach.id;
    // No Espelho, o “?” mantém a raridade visual (borda/brilho), sem revelar o nome.
    li.dataset.rarity = isMystery && !visitorView ? 'unknown' : rarity;
    li.dataset.state = slotState;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'achievement-slot__face';
    button.dataset.achievementId = ach.id;

    if (isMystery) {
      const rarityName = rarityLabelForAchievement(ach);
      button.setAttribute(
        'aria-label',
        visitorView
          ? `Segredo velado no Espelho. Raridade ${rarityName}.`
          : 'Relíquia misteriosa ainda não descoberta. Raridade desconhecida.'
      );
      const mark = document.createElement('span');
      mark.className = 'achievement-slot__mystery';
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = '?';
      const label = document.createElement('p');
      label.className = 'achievement-slot__name';
      label.textContent = '???';
      if (visitorView) {
        const rarityBadge = document.createElement('p');
        rarityBadge.className = 'achievement-slot__rarity';
        rarityBadge.textContent = '???';
        button.append(mark, label, rarityBadge);
      } else {
        button.append(mark, label);
      }
    } else if (!unlocked) {
      const rarityName = rarityLabelForAchievement(ach);
      button.setAttribute(
        'aria-label',
        `Relíquia bloqueada: ${ach.name}. Raridade ${rarityName}.`
      );
      const icon = document.createElement('span');
      icon.className = 'achievement-slot__icon is-silhouette';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = ach.icon;
      const name = document.createElement('p');
      name.className = 'achievement-slot__name';
      name.textContent = ach.name;
      const rarityBadge = document.createElement('p');
      rarityBadge.className = 'achievement-slot__rarity';
      rarityBadge.textContent = rarityName;
      button.append(icon, name, rarityBadge);
    } else {
      const rarityName = rarityLabelForAchievement(ach);
      button.setAttribute(
        'aria-label',
        `Relíquia descoberta: ${ach.name}. Raridade ${rarityName}.`
      );
      const icon = document.createElement('span');
      icon.className = 'achievement-slot__icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = ach.icon;
      const name = document.createElement('p');
      name.className = 'achievement-slot__name';
      name.textContent = ach.name;
      const rarityBadge = document.createElement('p');
      rarityBadge.className = 'achievement-slot__rarity';
      rarityBadge.textContent = rarityName;
      button.append(icon, name, rarityBadge);
      if (rarity === 'rainbow' && justUnlocked) {
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
 * @param {object} user
 * @param {object} [options]
 * @param {string[]} [options.highlightIds]
 * @param {'cards'|'album'} [options.mode]
 * @param {string} [options.emptyMessage]
 * @param {boolean} [options.applyRainbowVfx]
 * @param {boolean} [options.visitorView] — Espelho: segredos sempre “?” com raridade visual
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
    onSlotClick,
  } = options;

  if (mode === 'album') {
    renderAlbumMode(container, user, {
      highlightIds,
      emptyMessage,
      onSlotClick,
      achievements,
      visitorView,
    });
  } else {
    renderCardsMode(container, user, { highlightIds, emptyMessage, achievements });
  }

  if (applyRainbowVfx) {
    void applyRainbowCardJuiceVfx(container);
  }
}
