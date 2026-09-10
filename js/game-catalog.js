/**
 * Catálogo de conquistas e níveis — fonte: ../data/game-catalog.json
 * Front e API importam este módulo para manter a mesma regra.
 */
import catalog from '../data/game-catalog.json' with { type: 'json' };

export const ACHIEVEMENT_RARITY = Object.freeze({
  STONE: 'stone',
  COPPER: 'copper',
  SILVER: 'silver',
  GOLD: 'gold',
  RAINBOW: 'rainbow',
  UNIQUE: 'unique',
});

export const ACHIEVEMENT_RARITY_LABELS = Object.freeze({
  [ACHIEVEMENT_RARITY.STONE]: 'Pedra',
  [ACHIEVEMENT_RARITY.COPPER]: 'Cobre',
  [ACHIEVEMENT_RARITY.SILVER]: 'Prata',
  [ACHIEVEMENT_RARITY.GOLD]: 'Ouro',
  [ACHIEVEMENT_RARITY.RAINBOW]: 'Arco-íris',
  [ACHIEVEMENT_RARITY.UNIQUE]: 'Única',
});

export const ACHIEVEMENT_DIFFICULTY = Object.freeze({
  TRIVIAL: 'trivial',
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  MYTHIC: 'mythic',
  LEGENDARY: 'legendary',
});

export const DIFFICULTY_TO_RARITY = Object.freeze({
  [ACHIEVEMENT_DIFFICULTY.TRIVIAL]: ACHIEVEMENT_RARITY.STONE,
  [ACHIEVEMENT_DIFFICULTY.EASY]: ACHIEVEMENT_RARITY.COPPER,
  [ACHIEVEMENT_DIFFICULTY.MEDIUM]: ACHIEVEMENT_RARITY.SILVER,
  [ACHIEVEMENT_DIFFICULTY.HARD]: ACHIEVEMENT_RARITY.GOLD,
  [ACHIEVEMENT_DIFFICULTY.MYTHIC]: ACHIEVEMENT_RARITY.RAINBOW,
  [ACHIEVEMENT_DIFFICULTY.LEGENDARY]: ACHIEVEMENT_RARITY.UNIQUE,
});

export const DEFAULT_ACHIEVEMENT_RARITY = ACHIEVEMENT_RARITY.STONE;

export const GAME_CATALOG = catalog;

const levelsConfig = catalog.levels || {};
export const MAX_LEVEL = Math.max(1, Number(levelsConfig.maxLevel) || 99);
export const LEVEL_BANDS = Object.freeze(
  Array.isArray(levelsConfig.bands) ? levelsConfig.bands.map((band) => ({ ...band })) : [],
);
export const RANKS = Object.freeze(
  Array.isArray(levelsConfig.ranks) ? levelsConfig.ranks.map((rank) => ({ ...rank })) : [],
);

/** @deprecated Prefer xpRequiredForLevel(level). Mantido p/ barras que assumiam cota fixa na faixa 1–10. */
export const LEVEL_XP_BASE = Number(LEVEL_BANDS[0]?.xpPerLevel) || 100;

export function rarityFromDifficulty(difficulty) {
  return DIFFICULTY_TO_RARITY[difficulty] || DEFAULT_ACHIEVEMENT_RARITY;
}

export function normalizeAchievementRarity(rarity, difficulty = null) {
  if (typeof rarity === 'string' && ACHIEVEMENT_RARITY_LABELS[rarity]) {
    return rarity;
  }
  return rarityFromDifficulty(difficulty);
}

function normalizeVeiledScramble(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const scrambleMs = Math.max(60_000, Number(raw.scrambleMs) || 180_000);
  const readableMs = Math.max(15_000, Number(raw.readableMs) || 45_000);
  const tickMs = Math.max(80, Math.min(400, Number(raw.tickMs) || 150));
  const startWith = raw.startWith === 'scramble' ? 'scramble' : 'readable';
  return { scrambleMs, readableMs, tickMs, startWith };
}

function normalizeAchievement(raw) {
  const difficulty = raw.difficulty || ACHIEVEMENT_DIFFICULTY.TRIVIAL;
  const veiledDesc = typeof raw.veiledDesc === 'string' ? raw.veiledDesc.trim() : '';
  return {
    ...raw,
    xp: Number(raw.xp) || 0,
    hidden: Boolean(raw.hidden),
    difficulty,
    rarity: normalizeAchievementRarity(raw.rarity, difficulty),
    trailhead: raw.trailhead && typeof raw.trailhead === 'object' ? raw.trailhead : null,
    veiledDesc: veiledDesc || null,
    veiledScramble: normalizeVeiledScramble(raw.veiledScramble),
  };
}

export const ACHIEVEMENTS = Object.freeze(
  (Array.isArray(catalog.achievements) ? catalog.achievements : []).map(normalizeAchievement),
);

const achievementById = new Map(ACHIEVEMENTS.map((entry) => [entry.id, entry]));

export function getAchievementById(id) {
  return achievementById.get(String(id || '')) || null;
}

/** Copy velada no modal enquanto a conquista ainda não foi desbloqueada. */
export function getAchievementVeiledDescription(achievementOrId) {
  const entry = typeof achievementOrId === 'string' || typeof achievementOrId === 'number'
    ? getAchievementById(achievementOrId)
    : achievementOrId;
  const veiled = String(entry?.veiledDesc || '').trim();
  return veiled || null;
}

export function getAchievementXp(id) {
  const entry = getAchievementById(id);
  return entry ? Number(entry.xp) || 0 : 0;
}

export function getAchievementDifficulty(id) {
  const entry = getAchievementById(id);
  return entry?.difficulty || ACHIEVEMENT_DIFFICULTY.TRIVIAL;
}

export function getAchievementRarity(id) {
  const entry = getAchievementById(id);
  if (entry?.rarity) return entry.rarity;
  return rarityFromDifficulty(getAchievementDifficulty(id));
}

export function xpRequiredForLevel(level) {
  const lvl = Math.max(1, Math.min(MAX_LEVEL, Math.floor(Number(level) || 1)));
  if (lvl >= MAX_LEVEL) {
    const last = LEVEL_BANDS[LEVEL_BANDS.length - 1];
    return Number(last?.xpPerLevel) || LEVEL_XP_BASE;
  }
  for (const band of LEVEL_BANDS) {
    const from = Number(band.fromLevel) || 1;
    const to = Number(band.toLevel) || from;
    if (lvl >= from && lvl <= to) {
      return Math.max(1, Number(band.xpPerLevel) || LEVEL_XP_BASE);
    }
  }
  return LEVEL_XP_BASE;
}

export function xpToReachLevel(level) {
  const target = Math.max(1, Math.min(MAX_LEVEL, Math.floor(Number(level) || 1)));
  let total = 0;
  for (let current = 1; current < target; current += 1) {
    total += xpRequiredForLevel(current);
  }
  return total;
}

export function levelForXp(xp) {
  const value = Math.max(0, Number(xp) || 0);
  let remaining = value;
  for (let level = 1; level < MAX_LEVEL; level += 1) {
    const need = xpRequiredForLevel(level);
    if (remaining < need) return level;
    remaining -= need;
  }
  return MAX_LEVEL;
}

export function xpWithinLevel(xp) {
  const value = Math.max(0, Number(xp) || 0);
  const level = levelForXp(value);
  if (level >= MAX_LEVEL) {
    return xpRequiredForLevel(MAX_LEVEL - 1);
  }
  return value - xpToReachLevel(level);
}

export function xpQuotaForXp(xp) {
  const level = levelForXp(xp);
  if (level >= MAX_LEVEL) {
    return xpRequiredForLevel(MAX_LEVEL - 1);
  }
  return xpRequiredForLevel(level);
}

export function isMaxLevel(levelOrXp, { asXp = false } = {}) {
  const level = asXp ? levelForXp(levelOrXp) : Math.floor(Number(levelOrXp) || 1);
  return level >= MAX_LEVEL;
}

export function rankForLevel(level) {
  const lvl = Math.max(1, Math.floor(Number(level) || 1));
  let title = RANKS[0]?.title || 'Alma Novata';
  for (const rank of RANKS) {
    const minLevel = Number(rank.minLevel);
    if (Number.isFinite(minLevel) && lvl >= minLevel) {
      title = rank.title;
    }
  }
  return title;
}

export function rankForXp(xp) {
  return rankForLevel(levelForXp(xp));
}

/**
 * Contrato único da barra / rótulos de nível (dashboard, Espelho, Salão).
 * @param {number} xp
 * @param {{ isAdmin?: boolean }} [opts]
 */
export function describeLevelProgress(xp, { isAdmin = false } = {}) {
  if (isAdmin) {
    return {
      level: null,
      levelLabel: '∞',
      rank: 'Mestre do Infinito',
      within: null,
      quota: null,
      atMax: true,
      barPercent: 100,
      barLabel: '∞ / ∞ XP',
      shortLevelLabel: '∞',
    };
  }

  const value = Math.max(0, Number(xp) || 0);
  const level = levelForXp(value);
  const atMax = isMaxLevel(level);
  const within = xpWithinLevel(value);
  const quota = xpQuotaForXp(value);
  const barPercent = atMax ? 100 : Math.min(100, (within / Math.max(quota, 1)) * 100);

  return {
    level,
    levelLabel: String(level),
    rank: rankForLevel(level),
    within,
    quota,
    atMax,
    barPercent,
    barLabel: atMax
      ? `Nível ${MAX_LEVEL} · máximo do Domínio`
      : `${within} / ${quota} XP`,
    shortLevelLabel: atMax ? `${MAX_LEVEL} · máx.` : String(level),
  };
}

export function mapAchievementDetails(ids = []) {
  return ids.map((id) => ({
    id,
    difficulty: getAchievementDifficulty(id),
    rarity: getAchievementRarity(id),
  }));
}

/**
 * Envolve índices de `trailhead` em spans cipher (letras do anagrama).
 * @returns {DocumentFragment|Text}
 */
export function buildTrailheadTextNode(text, indexes = []) {
  const value = String(text || '');
  if (typeof document === 'undefined') {
    return value;
  }
  const marks = new Set(
    (Array.isArray(indexes) ? indexes : [])
      .map((index) => Number(index))
      .filter((index) => Number.isInteger(index) && index >= 0 && index < value.length)
  );
  if (marks.size === 0) {
    return document.createTextNode(value);
  }
  const frag = document.createDocumentFragment();
  let buffer = '';
  const flush = () => {
    if (!buffer) return;
    frag.appendChild(document.createTextNode(buffer));
    buffer = '';
  };
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (marks.has(i)) {
      flush();
      const rune = document.createElement('span');
      rune.className = 'trailhead-rune';
      rune.dataset.rune = ch;
      // Pista ARG (Fase 0): pasta do abismo — não soletra o anagrama; caçável no Elements.
      rune.dataset.pathPrefix = '/submundo';
      rune.textContent = ch;
      frag.appendChild(rune);
    } else {
      buffer += ch;
    }
  }
  flush();
  return frag;
}

export function fillTrailheadField(el, text, indexes = []) {
  if (!el || typeof document === 'undefined') return;
  el.replaceChildren();
  el.appendChild(buildTrailheadTextNode(text, indexes));
}
