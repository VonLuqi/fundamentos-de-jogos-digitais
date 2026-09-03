export const RARITY_DEFINITIONS = {
  common: { id: 'common', label: 'Comum', color: 0x9ca3af, weight: 60 },
  uncommon: { id: 'uncommon', label: 'Incomum', color: 0x34d399, weight: 25 },
  rare: { id: 'rare', label: 'Raro', color: 0x60a5fa, weight: 10 },
  epic: { id: 'epic', label: 'Épico', color: 0xc084fc, weight: 4 },
  legendary: { id: 'legendary', label: 'Lendário', color: 0xfbbf24, weight: 1 },
};

export function getRarityWeight(rarity) {
  const normalized = String(rarity || 'common').trim().toLowerCase();
  return Number(RARITY_DEFINITIONS[normalized]?.weight ?? RARITY_DEFINITIONS.common.weight ?? 60);
}

export function isItemFinalTier(item) {
  return Boolean(item?.isFinal) || Number(item?.level ?? item?.currentLevel ?? 1) >= 10;
}

export function scaleItemValueByRarity(value, rarity = 'common') {
  const normalized = String(rarity || 'common').trim().toLowerCase();
  const multiplierByRarity = {
    common: 1,
    uncommon: 1.18,
    rare: 1.42,
    epic: 1.8,
    legendary: 2.4,
  };

  const multiplier = multiplierByRarity[normalized] ?? 1;
  return Number(value ?? 0) * multiplier;
}

export const ITEM_PROGRESSION_LIBRARY = {
  'lâmina arcana': {
    id: 'lâmina arcana',
    name: 'Lâmina Arcana',
    category: 'weapon',
    kind: 'slash',
    maxProgression: 10,
    state: 'new',
    rarity: 'common',
    baseStats: {
      damage: 1,
      speed: 28,
      fireRate: 0.42,
      radius: 0.52,
      range: 18,
      projectileCount: 1,
    },
  },
  'lança de ossos': {
    id: 'lança de ossos',
    name: 'Shotgun de Ossos',
    category: 'weapon',
    kind: 'spread',
    maxProgression: 10,
    state: 'new',
    rarity: 'common',
    baseStats: {
      damage: 2,
      speed: 24,
      fireRate: 0.72,
      radius: 0.48,
      range: 16,
      projectileCount: 5,
    },
  },
  'orbe de fogo': {
    id: 'orbe de fogo',
    name: 'Orbe de Fogo',
    category: 'weapon',
    kind: 'orbital',
    maxProgression: 10,
    state: 'new',
    rarity: 'common',
    baseStats: {
      damage: 1.5,
      speed: 34,
      fireRate: 0.9,
      radius: 0.58,
      range: 18,
      explosionRadius: 1.2,
    },
  },
  'vento cortante': {
    id: 'vento cortante',
    name: 'Vento Cortante',
    category: 'weapon',
    kind: 'cleave',
    maxProgression: 10,
    state: 'new',
    rarity: 'common',
    baseStats: {
      damage: 1.2,
      speed: 28,
      fireRate: 0.3,
      radius: 0.24,
      range: 20,
      projectileCount: 3,
    },
  },
  'relâmpago sagrado': {
    id: 'relâmpago sagrado',
    name: 'Relâmpago Sagrado',
    category: 'weapon',
    kind: 'lightning',
    maxProgression: 10,
    state: 'new',
    rarity: 'common',
    baseStats: {
      damage: 2.2,
      speed: 26,
      fireRate: 0.55,
      radius: 0.18,
      range: 20,
      damageRadius: 4.8,
    },
  },
  speed: {
    id: 'speed',
    name: 'Velocidade',
    category: 'status',
    kind: 'movement',
    maxProgression: 10,
    state: 'new',
    rarity: 'common',
    baseStats: {
      speedMultiplier: 1.12,
      value: 0.05,
    },
  },
  damage: {
    id: 'damage',
    name: 'Dano',
    category: 'status',
    kind: 'damage',
    maxProgression: 10,
    state: 'new',
    rarity: 'common',
    baseStats: {
      damageMultiplier: 1.12,
      value: 0.08,
    },
  },
  attackSpeed: {
    id: 'attackSpeed',
    name: 'Taxa de Ataque',
    category: 'status',
    kind: 'attack',
    maxProgression: 10,
    state: 'new',
    rarity: 'common',
    baseStats: {
      attackSpeedMultiplier: 1.1,
      value: 0.1,
    },
  },
  maxHp: {
    id: 'maxHp',
    name: 'Vida Máxima',
    category: 'status',
    kind: 'survival',
    maxProgression: 10,
    state: 'new',
    rarity: 'common',
    baseStats: {
      maxHpMultiplier: 1.1,
      value: 0.1,
    },
  },
  pickupRange: {
    id: 'pickupRange',
    name: 'Raio de Coleta',
    category: 'status',
    kind: 'collection',
    maxProgression: 10,
    state: 'new',
    rarity: 'common',
    baseStats: {
      pickupRangeBonus: 0.6,
      value: 0.15,
    },
  },
};

export function buildProgressionEntry(category, key) {
  const baseEntry = ITEM_PROGRESSION_LIBRARY[key] ?? {
    id: key,
    name: key,
    category,
    maxProgression: 10,
    state: 'new',
    rarity: 'common',
    baseStats: {},
  };

  return {
    ...baseEntry,
    category,
    id: baseEntry.id ?? key,
    maxProgression: baseEntry.maxProgression ?? 10,
    currentLevel: 0,
    state: 'new',
    isFinal: false,
    rarity: baseEntry.rarity ?? 'common',
    baseStats: { ...baseEntry.baseStats },
  };
}

export function createFreshItemState(category, key) {
  const baseEntry = buildProgressionEntry(category, key);

  if (baseEntry.category === 'weapon') {
    const baseStats = baseEntry.baseStats || {};
    return {
      ...baseEntry,
      level: 1,
      currentLevel: 1,
      state: 'new',
      isFinal: false,
      damage: Number(baseStats.damage ?? 1),
      speed: Number(baseStats.speed ?? 28),
      fireRate: Number(baseStats.fireRate ?? 0.42),
      radius: Number(baseStats.radius ?? 0.5),
      range: Number(baseStats.range ?? 18),
      projectileCount: Number(baseStats.projectileCount ?? 1),
      explosionRadius: Number(baseStats.explosionRadius ?? 0),
      damageRadius: Number(baseStats.damageRadius ?? 0),
      rarity: baseEntry.rarity ?? 'common',
      isBuffed: false,
      label: 'Novo',
    };
  }

  const baseStats = baseEntry.baseStats || {};
  return {
    ...baseEntry,
    level: 1,
    currentLevel: 1,
    state: 'new',
    isFinal: false,
    value: Number(baseStats.value ?? 0.05),
    multiplier: baseStats.speedMultiplier ?? baseStats.damageMultiplier ?? baseStats.attackSpeedMultiplier ?? baseStats.maxHpMultiplier ?? baseStats.pickupRangeBonus ?? 1,
    rarity: baseEntry.rarity ?? 'common',
    isBuffed: false,
    label: 'Novo',
  };
}

export const POWERUP_LIBRARY = {
  WA1: { id: 'WA1', name: 'Lâmina Arcana +1', category: 'weapon', weapon: 'lâmina arcana', type: 'damage', value: 0.1, description: '+10% de dano da arma base.' },
  WA2: { id: 'WA2', name: 'Lâmina Arcana +2', category: 'weapon', weapon: 'lâmina arcana', type: 'attackSpeed', value: 0.15, description: '+15% de velocidade de ataque.' },
  WA4: { id: 'WA4', name: 'Lâmina Arcana Final', category: 'weapon', weapon: 'lâmina arcana', type: 'evolution', value: 1, description: 'Converte em corte em espiral.' },
  WB1: { id: 'WB1', name: 'Shotgun de Ossos +1', category: 'weapon', weapon: 'lança de ossos', type: 'damage', value: 0.12, description: '+12% de dano por projétil.' },
  WB2: { id: 'WB2', name: 'Shotgun de Ossos +2', category: 'weapon', weapon: 'lança de ossos', type: 'projectileSpeed', value: 0.2, description: '+20% de velocidade do projétil.' },
  WB4: { id: 'WB4', name: 'Shotgun de Ossos Final', category: 'weapon', weapon: 'lança de ossos', type: 'evolution', value: 1, description: 'Projéteis perfuram e causam dano em cadeia.' },
  WC1: { id: 'WC1', name: 'Orbe de Fogo +1', category: 'weapon', weapon: 'orbe de fogo', type: 'damage', value: 0.15, description: '+15% de dano por explosão.' },
  WC2: { id: 'WC2', name: 'Orbe de Fogo +2', category: 'weapon', weapon: 'orbe de fogo', type: 'area', value: 0.1, description: '+10% de área de explosão.' },
  WC4: { id: 'WC4', name: 'Orbe de Fogo Final', category: 'weapon', weapon: 'orbe de fogo', type: 'evolution', value: 1, description: 'Gera efeito de fogo em área contínua.' },
  WD1: { id: 'WD1', name: 'Vento Cortante +1', category: 'weapon', weapon: 'vento cortante', type: 'moveOnAttack', value: 0.12, description: '+12% de velocidade quando atacar.' },
  WD2: { id: 'WD2', name: 'Vento Cortante +2', category: 'weapon', weapon: 'vento cortante', type: 'crit', value: 0.2, description: '+20% de dano crítico.' },
  WD4: { id: 'WD4', name: 'Vento Cortante Final', category: 'weapon', weapon: 'vento cortante', type: 'evolution', value: 1, description: 'Cria faixas de corte laterais em alta velocidade.' },
  WE1: { id: 'WE1', name: 'Relâmpago Sagrado +1', category: 'weapon', weapon: 'relâmpago sagrado', type: 'damage', value: 0.1, description: '+10% de dano elétrico.' },
  WE2: { id: 'WE2', name: 'Relâmpago Sagrado +2', category: 'weapon', weapon: 'relâmpago sagrado', type: 'range', value: 0.15, description: '+15% de alcance.' },
  WE4: { id: 'WE4', name: 'Relâmpago Sagrado Final', category: 'weapon', weapon: 'relâmpago sagrado', type: 'evolution', value: 1, description: 'Cria um raio de descarga concentrado no alvo.' },

  SA1: { id: 'SA1', name: 'Passos de Véu', category: 'status', type: 'speed', value: 0.05, description: '+5% de velocidade de movimento.' },
  SA2: { id: 'SA2', name: 'Passos Mágicos', category: 'status', type: 'speed', value: 0.1, description: '+10% de velocidade de movimento.' },
  SA3: { id: 'SA3', name: 'Veloz do Submundo', category: 'status', type: 'speed', value: 0.15, description: '+15% de velocidade de movimento.' },
  SB1: { id: 'SB1', name: 'Força da Alma', category: 'status', type: 'damage', value: 0.08, description: '+8% de dano.' },
  SB2: { id: 'SB2', name: 'Coragem do Tártaro', category: 'status', type: 'damage', value: 0.12, description: '+12% de dano.' },
  SB3: { id: 'SB3', name: 'Ignis Interno', category: 'status', type: 'damage', value: 0.18, description: '+18% de dano.' },
  SC1: { id: 'SC1', name: 'Mão do Arcanista', category: 'status', type: 'attackSpeed', value: 0.1, description: '+10% de taxa de ataque.' },
  SC2: { id: 'SC2', name: 'Ritmo da Batalha', category: 'status', type: 'attackSpeed', value: 0.15, description: '+15% de taxa de ataque.' },
  SC3: { id: 'SC3', name: 'Cadência Infernal', category: 'status', type: 'attackSpeed', value: 0.2, description: '+20% de taxa de ataque.' },
  SD1: { id: 'SD1', name: 'Carapaça de Cobre', category: 'status', type: 'maxHp', value: 0.1, description: '+10% de vida máxima.' },
  SD2: { id: 'SD2', name: 'Pele de Pedra', category: 'status', type: 'maxHp', value: 0.15, description: '+15% de vida máxima.' },
  SD3: { id: 'SD3', name: 'Manto de Ferro', category: 'status', type: 'maxHp', value: 0.2, description: '+20% de vida máxima.' },
  SE1: { id: 'SE1', name: 'Sucção de Vidas', category: 'status', type: 'regen', value: 0.05, description: '+5% de regeneração de vida.' },
  SE2: { id: 'SE2', name: 'Sangue de Estige', category: 'status', type: 'regen', value: 0.1, description: '+10% de regeneração de vida.' },
  SE3: { id: 'SE3', name: 'Vínculo de Sombra', category: 'status', type: 'regen', value: 0.15, description: '+15% de regeneração de vida.' },
  SF1: { id: 'SF1', name: 'Magnetismo Arcano', category: 'status', type: 'pickupRange', value: 0.15, description: '+15% de raio de coleta.' },
  SF2: { id: 'SF2', name: 'Campo de Prata', category: 'status', type: 'pickupRange', value: 0.25, description: '+25% de raio de coleta.' },
  SF3: { id: 'SF3', name: 'Atrator de Essência', category: 'status', type: 'pickupRange', value: 0.35, description: '+35% de raio de coleta.' },
  SG1: { id: 'SG1', name: 'Resiliência do Guardião', category: 'status', type: 'resistance', value: 0.1, description: '-10% de dano recebido.' },
  SG2: { id: 'SG2', name: 'Escudo Etéreo', category: 'status', type: 'resistance', value: 0.15, description: '-15% de dano recebido.' },
};

export const POWERUP_WEAPON_POOL = Object.keys(POWERUP_LIBRARY).filter((id) => POWERUP_LIBRARY[id].category === 'weapon');
export const POWERUP_STATUS_POOL = Object.keys(POWERUP_LIBRARY).filter((id) => POWERUP_LIBRARY[id].category === 'status');

const BASE_WEAPON_STATS = {
  'lâmina arcana': { id: 'lâmina arcana', name: 'Lâmina Arcana', pattern: 'nearest', damage: 1, speed: 28, color: 0xffd166, radius: 0.52, fireRate: 0.42, life: 1.2, maxDistance: 18 },
  'lança de ossos': { id: 'lança de ossos', name: 'Shotgun de Ossos', pattern: 'spread', damage: 2, speed: 24, color: 0xc4b5fd, radius: 0.48, fireRate: 0.72, life: 0.95, maxDistance: 16 },
  'orbe de fogo': { id: 'orbe de fogo', name: 'Orbe de Fogo', pattern: 'orbital', damage: 1.5, speed: 34, color: 0xf97316, radius: 0.58, fireRate: 0.9, life: 1.8, maxDistance: 18, explosionRadius: 1.2 },
  'vento cortante': { id: 'vento cortante', name: 'Vento Cortante', pattern: 'cleave', damage: 1.2, speed: 28, color: 0x93c5fd, radius: 0.24, fireRate: 0.3, life: 0.9, maxDistance: 20 },
  'relâmpago sagrado': { id: 'relâmpago sagrado', name: 'Relâmpago Sagrado', pattern: 'lightning', damage: 2.2, speed: 26, color: 0xfde68a, radius: 0.18, fireRate: 0.55, life: 0.45, maxDistance: 20 },
};

export function isWeaponFinalTier(weapon) {
  const level = Number(weapon?.level ?? 1);
  return Boolean(weapon?.isFinal) || level >= 10;
}

export function getRandomPowerupChoices(count = 3, player = null) {
  if (!count || count <= 0) return [];

  const weaponSlots = player?.weaponSlots ?? [];
  const statusSlots = player?.statusSlots ?? [];
  const buildWeaponIds = weaponSlots.filter(Boolean).map((entry) => entry.id).filter(Boolean);
  const buildStatusIds = statusSlots.filter(Boolean).map((entry) => normalizeStatusId(entry.id)).filter(Boolean);

  const eligibleEvolutionIds = Object.keys(POWERUP_LIBRARY).filter((id) => {
    const powerup = POWERUP_LIBRARY[id];
    if (!powerup || powerup.category !== 'weapon' || powerup.type !== 'evolution') {
      return false;
    }

    const matchingWeapon = weaponSlots.find((entry) => entry && entry.id === powerup.weapon);
    return (matchingWeapon?.level ?? 0) >= 10;
  });

  const matchingWeaponIds = Object.keys(POWERUP_LIBRARY).filter((id) => {
    const powerup = POWERUP_LIBRARY[id];
    if (!powerup || powerup.category !== 'weapon') return false;
    return false;
  });

  const matchingStatusIds = Object.keys(POWERUP_LIBRARY).filter((id) => {
    const powerup = POWERUP_LIBRARY[id];
    if (!powerup || powerup.category !== 'status') return false;
    return buildStatusIds.includes(powerup.type) || (buildStatusIds.length === 0 && (powerup.type === 'speed' || powerup.type === 'damage'));
  });

  let candidateIds = [...matchingStatusIds];

  if (candidateIds.length === 0) {
    candidateIds = Object.keys(POWERUP_LIBRARY);
  }

  candidateIds = candidateIds.filter((id) => {
    const powerup = POWERUP_LIBRARY[id];
    if (!powerup) return false;

    if (powerup.category === 'weapon' && powerup.type === 'evolution') {
      return eligibleEvolutionIds.includes(id);
    }

    return true;
  });

  const selected = new Set();
  const result = [];

  if (eligibleEvolutionIds.length > 0) {
    const forcedIndex = Math.floor(Math.random() * eligibleEvolutionIds.length);
    const forcedId = eligibleEvolutionIds[forcedIndex];
    selected.add(forcedId);
    result.push(forcedId);
  }

  const availablePool = candidateIds.filter((id) => !selected.has(id));

  while (result.length < count && availablePool.length > 0) {
    const index = Math.floor(Math.random() * availablePool.length);
    const id = availablePool[index];
    if (!selected.has(id)) {
      selected.add(id);
      result.push(id);
    }
    availablePool.splice(index, 1);
  }

  if (result.length < count) {
    const fallbackIds = Object.keys(POWERUP_LIBRARY).filter((id) => !selected.has(id));
    for (const id of fallbackIds) {
      if (result.length >= count) break;
      selected.add(id);
      result.push(id);
    }
  }

  return result.slice(0, count);
}

import { resolveStatusSlotIndex, normalizeStatusId, applyStatusToPlayer } from './StatusSystem.js';

export function applyPowerupChoice(player, powerupId) {
  const powerup = POWERUP_LIBRARY[powerupId];
  if (!powerup || !player) {
    return { applied: false, reason: 'powerup-invalid' };
  }

  if (powerup.category === 'weapon') {
    const weaponSlots = player.weaponSlots || [];
    const slot = weaponSlots.findIndex((entry) => entry && entry.id === powerup.weapon);

    if (powerup.weapon === 'all') {
      const firstEmpty = weaponSlots.findIndex((entry) => !entry);
      if (firstEmpty >= 0) {
        weaponSlots[firstEmpty] = { id: 'orbe de fogo', name: 'Orbe de Fogo', level: 1 };
      }
      return { applied: true, powerup };
    }

    if (slot >= 0) {
      const currentWeapon = weaponSlots[slot];
      const currentLevel = Number(currentWeapon.level || 1);
      const alreadyFinal = Boolean(currentWeapon.isFinal) || currentLevel >= 10;

      if (alreadyFinal) {
        return { applied: false, powerup, slotIndex: slot, reason: 'weapon-final-tier' };
      }

      const activeWeapon = {
        ...currentWeapon,
        id: powerup.weapon,
        name: (currentWeapon.name || powerup.name).replace(/\s+Final$/, ''),
        level: Math.min(currentLevel + 1, 10),
        damage: (currentWeapon.damage || 1) * (1 + powerup.value),
        speed: (currentWeapon.speed || 1) * (1 + powerup.value),
      };

      if (powerup.type === 'area') {
        activeWeapon.explosionRadius = (activeWeapon.explosionRadius ?? 1.2) * (1 + powerup.value);
        activeWeapon.pattern = activeWeapon.pattern || 'orbital';
        activeWeapon.damage = (activeWeapon.damage || 1) * (1 + powerup.value * 0.7);
      }

      if (activeWeapon.level >= 10) {
        activeWeapon.level = 10;
        activeWeapon.isFinal = true;
        activeWeapon.name = `${(activeWeapon.name || powerup.name).replace(/\s+Final$/, '')} Final`;
        activeWeapon.tag = 'Final';
      }

      if (powerup.type === 'evolution') {
        activeWeapon.level = 10;
        activeWeapon.isFinal = true;
        activeWeapon.name = `${(activeWeapon.name || powerup.name).replace(/\s+Final$/, '')} Final`;
        activeWeapon.tag = 'Final';

        if (powerup.weapon === 'vento cortante') {
          activeWeapon.pattern = 'cleave';
          activeWeapon.color = 0xfbbf24;
          activeWeapon.damage = (activeWeapon.damage || 1) * 2.3;
          activeWeapon.speed = (activeWeapon.speed || 28) * 2;
          activeWeapon.range = (activeWeapon.range || 12) + 12;
        }

        if (powerup.weapon === 'relâmpago sagrado') {
          activeWeapon.pattern = 'lightning';
          activeWeapon.color = 0xfde68a;
          activeWeapon.damage = (activeWeapon.damage || 1) * 2.2;
          activeWeapon.speed = (activeWeapon.speed || 26) * 1.8;
          activeWeapon.radius = 0.18;
        }
      }

      weaponSlots[slot] = activeWeapon;
      return { applied: true, powerup, slotIndex: slot };
    }

    const emptyIndex = weaponSlots.findIndex((entry) => !entry);
    if (emptyIndex >= 0) {
      const baseWeapon = BASE_WEAPON_STATS[powerup.weapon] ?? {
        id: powerup.weapon,
        name: powerup.name,
        pattern: 'nearest',
        damage: 1,
        speed: 28,
        color: 0xffd166,
        radius: 0.5,
      };

      weaponSlots[emptyIndex] = {
        ...baseWeapon,
        slot: emptyIndex,
        level: 1,
        isFinal: false,
        tag: 'Novo',
      };
      return { applied: true, powerup, slotIndex: emptyIndex };
    }

    return { applied: false, powerup, reason: 'weapon-slots-full' };
  }

  if (powerup.category === 'status') {
    const statusSlots = player.statusSlots || [];
    const existingIndex = statusSlots.findIndex((entry) => entry && normalizeStatusId(entry.id) === normalizeStatusId(powerup.type));
    const slotIndex = existingIndex >= 0 ? existingIndex : resolveStatusSlotIndex(powerup.type, statusSlots);

    if (!statusSlots[slotIndex] && statusSlots.filter(Boolean).length >= statusSlots.length) {
      return { applied: false, powerup, reason: 'status-slots-full' };
    }

    const existing = statusSlots[slotIndex];
    statusSlots[slotIndex] = {
      id: powerup.type,
      level: (existing?.level || 0) + 1,
    };

    applyStatusToPlayer(player, statusSlots);
    return { applied: true, powerup, slotIndex };
  }

  return { applied: false, reason: 'powerup-not-supported' };
}

export function getPowerupSummary(powerupId) {
  const powerup = POWERUP_LIBRARY[powerupId];
  return powerup ? `${powerup.name} — ${powerup.description}` : 'Power-up inválido';
}

export function getPowerupDisplayData(powerupId) {
  const powerup = POWERUP_LIBRARY[powerupId];
  if (!powerup) {
    return {
      id: powerupId,
      name: 'Power-up inválido',
      description: 'Item desconhecido.',
      rarity: 'common',
      rarityLabel: 'Comum',
      tag: 'Item',
      categoryLabel: 'Geral',
      impactEstimate: '+0%',
      stateLabel: 'Novo',
    };
  }

  const isFinal = powerup.type === 'evolution' || /Final$/.test(powerup.name || '');
  const rarity = isFinal ? 'legendary' : getPowerupRarity(powerupId);
  const rarityMeta = RARITY_DEFINITIONS[rarity] || RARITY_DEFINITIONS.common;
  const impactValue = Number(powerup.value ?? 0.1) * 100;
  const impactLabel = `${impactValue >= 0 ? '+' : ''}${Math.round(impactValue)}%`;

  return {
    ...powerup,
    rarity,
    rarityLabel: rarityMeta.label,
    tag: isFinal ? 'Final' : powerup.category === 'weapon' ? 'Arma' : 'Status',
    categoryLabel: powerup.category === 'weapon' ? 'Arma' : 'Status',
    color: rarityMeta.color,
    impactEstimate: impactLabel,
    stateLabel: isFinal ? 'Final' : 'Novo',
  };
}

export const getPowerUpDisplayData = getPowerupDisplayData;

export function resolvePickupReward(player, reward = {}) {
  if (!player) {
    return { applied: false, reason: 'player-missing' };
  }

  const kind = reward.kind || 'weapon';
  const itemId = reward.itemId || reward.weapon || reward.status || null;

  if (!itemId) {
    return { applied: false, reason: 'reward-empty' };
  }

  if (kind === 'weapon') {
    const weaponSlots = player.weaponSlots || [];
    const existingIndex = weaponSlots.findIndex((entry) => entry && normalizeWeaponId(entry.id) === normalizeWeaponId(itemId));

    if (existingIndex >= 0) {
      const currentWeapon = weaponSlots[existingIndex];
      const currentLevel = Number(currentWeapon.level || 1);
      const finalTierReached = Boolean(currentWeapon.isFinal) || currentLevel >= 10;

      if (finalTierReached) {
        return { applied: false, reason: 'weapon-final-tier', kind: 'weapon', itemId };
      }

      const nextLevel = Math.min(currentLevel + 1, 10);
      const nextWeapon = {
        ...currentWeapon,
        id: normalizeWeaponId(itemId),
        level: nextLevel,
        isFinal: nextLevel >= 10,
        tag: nextLevel >= 10 ? 'Final' : 'Novo',
      };

      if (nextWeapon.isFinal) {
        nextWeapon.name = `${(nextWeapon.name || itemId).replace(/\s+Final$/, '')} Final`;
      }

      weaponSlots[existingIndex] = nextWeapon;
      return { applied: true, reason: 'weapon-upgraded', kind: 'weapon', itemId, slotIndex: existingIndex };
    }

    const emptyIndex = weaponSlots.findIndex((entry) => !entry);
    if (emptyIndex >= 0) {
      const freshWeapon = createFreshItemState('weapon', itemId);
      weaponSlots[emptyIndex] = {
        ...freshWeapon,
        slot: emptyIndex,
        id: normalizeWeaponId(itemId),
        name: freshWeapon.name || ITEM_PROGRESSION_LIBRARY[normalizeWeaponId(itemId)]?.name || itemId,
      };
      return { applied: true, reason: 'weapon-new', kind: 'weapon', itemId, slotIndex: emptyIndex };
    }

    return { applied: false, reason: 'weapon-slots-full', kind: 'weapon', itemId };
  }

  if (kind === 'status') {
    const statusSlots = player.statusSlots || [];
    const normalizedItemId = normalizeStatusId(itemId);
    const existingIndex = statusSlots.findIndex((entry) => entry && normalizeStatusId(entry.id) === normalizedItemId);
    const slotIndex = existingIndex >= 0 ? existingIndex : resolveStatusSlotIndex(normalizedItemId, statusSlots);

    if (!statusSlots[slotIndex] && statusSlots.filter(Boolean).length >= statusSlots.length) {
      return { applied: false, reason: 'status-slots-full', kind: 'status', itemId };
    }

    const existingLevel = Number(statusSlots[slotIndex]?.level || 0);
    statusSlots[slotIndex] = {
      id: normalizedItemId,
      level: existingLevel + 1,
    };

    applyStatusToPlayer(player, statusSlots);
    return { applied: true, reason: 'status-upgraded', kind: 'status', itemId, slotIndex };
  }

  return { applied: false, reason: 'reward-unsupported', kind, itemId };
}

export function normalizeWeaponId(value) {
  const key = String(value ?? '').trim().toLowerCase();
  const aliases = {
    'lâmina arcana': 'lâmina arcana',
    'lança de ossos': 'lança de ossos',
    'orbe de fogo': 'orbe de fogo',
    'vento cortante': 'vento cortante',
    'relâmpago sagrado': 'relâmpago sagrado',
  };

  return aliases[key] || key;
}

export function getPowerupRarity(powerupId) {
  const powerup = POWERUP_LIBRARY[powerupId];
  if (!powerup) return 'common';

  if (powerup.type === 'evolution') return 'legendary';
  if (powerup.name?.includes('Final')) return 'legendary';
  if (powerup.weapon === 'relâmpago sagrado' || powerup.type === 'pickupRange') return 'rare';
  if (powerup.type === 'maxHp' || powerup.type === 'damage' || powerup.type === 'speed') return 'uncommon';
  return 'common';
}
