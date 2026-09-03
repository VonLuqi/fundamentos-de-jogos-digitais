export const STATUS_LIBRARY = {
  speed: {
    id: 'speed',
    name: 'Velocidade',
    description: 'Aumenta a velocidade de movimento.',
    baseValue: 0.12,
    multiplier: 1.12,
    type: 'multiplier',
  },
  damage: {
    id: 'damage',
    name: 'Dano',
    description: 'Aumenta o dano dos projéteis.',
    baseValue: 0.15,
    multiplier: 1.2,
    type: 'multiplier',
  },
  attackSpeed: {
    id: 'attackSpeed',
    name: 'Taxa de ataque',
    description: 'Reduz o intervalo entre ataques.',
    baseValue: 0.08,
    multiplier: 1.1,
    type: 'multiplier',
  },
  maxHp: {
    id: 'maxHp',
    name: 'Vida máxima',
    description: 'Aumenta vida máxima do personagem.',
    baseValue: 18,
    multiplier: 1.18,
    type: 'flat',
  },
  pickupRange: {
    id: 'pickupRange',
    name: 'Raio de coleta',
    description: 'Aumenta a distância para coletar orbes.',
    baseValue: 0.6,
    multiplier: 1.16,
    type: 'flat',
  },
  resistance: {
    id: 'resistance',
    name: 'Resistência',
    description: 'Reduz o dano recebido.',
    baseValue: 0.08,
    multiplier: 1.12,
    type: 'multiplier',
  },
  regen: {
    id: 'regen',
    name: 'Regeneração',
    description: 'Recupera vida ao longo do tempo.',
    baseValue: 0.4,
    multiplier: 1.1,
    type: 'flat',
  },
  projectileSpeed: {
    id: 'projectileSpeed',
    name: 'Velocidade do projétil',
    description: 'Aumenta a velocidade dos projéteis.',
    baseValue: 0.1,
    multiplier: 1.15,
    type: 'multiplier',
  },
};

export function normalizeStatusId(value) {
  const key = String(value ?? '').trim().toLowerCase();
  const aliases = {
    velocidade: 'speed',
    speed: 'speed',
    dano: 'damage',
    damage: 'damage',
    'taxa de ataque': 'attackSpeed',
    attackspeed: 'attackSpeed',
    'vida máxima': 'maxHp',
    maxhp: 'maxHp',
    'raio de coleta': 'pickupRange',
    pickuprange: 'pickupRange',
    resistencia: 'resistance',
    resistance: 'resistance',
    regeneracao: 'regen',
    regen: 'regen',
    'velocidade do projétil': 'projectileSpeed',
    projectilespeed: 'projectileSpeed',
  };

  return aliases[key] || key;
}

export const STATUS_SLOT_ORDER = [
  'speed',
  'damage',
  'attackSpeed',
  'maxHp',
  'pickupRange',
];

export function createStatusSlots() {
  return Array.from({ length: STATUS_SLOT_ORDER.length }, () => null);
}

export function resolveStatusSlotIndex(statusId, existingSlots = []) {
  const normalized = normalizeStatusId(statusId);
  const slotAliasMap = {
    speed: 0,
    damage: 1,
    attackSpeed: 2,
    projectileSpeed: 2,
    resistance: 2,
    maxHp: 3,
    regen: 3,
    pickupRange: 4,
  };

  const preferredIndex = slotAliasMap[normalized] ?? STATUS_SLOT_ORDER.indexOf(normalized);

  if (preferredIndex >= 0) {
    const currentIndex = existingSlots.findIndex((entry) => entry && normalizeStatusId(entry.id) === normalized);
    if (currentIndex >= 0) return currentIndex;
    if (preferredIndex < existingSlots.length) return preferredIndex;
  }

  const emptyIndex = existingSlots.findIndex((entry) => !entry);
  return emptyIndex >= 0 ? emptyIndex : 0;
}

export function buildStatusEffects(statusSlots = []) {
  const result = {
    speedMultiplier: 1,
    damageMultiplier: 1,
    attackSpeedMultiplier: 1,
    maxHpMultiplier: 1,
    pickupRangeBonus: 0,
    resistanceMultiplier: 1,
    regenBonus: 0,
    projectileSpeedMultiplier: 1,
  };

  for (const entry of statusSlots.filter(Boolean)) {
    const status = STATUS_LIBRARY[normalizeStatusId(entry.id)];
    if (!status) continue;

    const level = Number(entry.level || 1);

    if (status.type === 'multiplier') {
      if (status.id === 'speed') result.speedMultiplier *= Math.pow(status.multiplier, level);
      if (status.id === 'damage') result.damageMultiplier *= Math.pow(status.multiplier, level);
      if (status.id === 'attackSpeed') result.attackSpeedMultiplier *= Math.pow(status.multiplier, level);
      if (status.id === 'maxHp') result.maxHpMultiplier *= Math.pow(status.multiplier, level);
      if (status.id === 'resistance') result.resistanceMultiplier *= Math.pow(status.multiplier, level);
      if (status.id === 'projectileSpeed') result.projectileSpeedMultiplier *= Math.pow(status.multiplier, level);
    } else {
      if (status.id === 'pickupRange') result.pickupRangeBonus += (status.baseValue || 0) * level;
      if (status.id === 'regen') result.regenBonus += (status.baseValue || 0) * level;
    }
  }

  return result;
}

export function applyStatusToPlayer(player, statusSlots = []) {
  const effects = buildStatusEffects(statusSlots);

  if (player) {
    player.speed = (player.baseSpeed ?? player.speed ?? 15) * effects.speedMultiplier;
    player.projectileDamage = (player.baseProjectileDamage ?? player.projectileDamage ?? 1) * effects.damageMultiplier;
    player.projectileSpeed = (player.baseProjectileSpeed ?? player.projectileSpeed ?? 28) * effects.projectileSpeedMultiplier;
    player.maxHp = Math.round((player.baseMaxHp ?? player.maxHp ?? 100) * effects.maxHpMultiplier);
    player.hp = Math.min(player.hp || player.maxHp, player.maxHp);
    player.pickupRange = (player.basePickupRange ?? player.pickupRange ?? 2.2) + effects.pickupRangeBonus;
    player.resistanceMultiplier = effects.resistanceMultiplier;
    player.regenPerSecond = (player.baseRegenPerSecond ?? player.regenPerSecond ?? 0) + effects.regenBonus;
    player.attackCooldownMultiplier = effects.attackSpeedMultiplier;
  }

  return effects;
}
