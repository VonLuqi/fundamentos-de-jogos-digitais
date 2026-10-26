/**
 * NectarSystem (Fase F5 — Néctar do Lethe / Sugar Lumps + Levels de Gerador).
 * Responsabilidades isoladas (SRP):
 * 1. Verificação de desbloqueio (`lifetimeSouls >= 1e9` ou já desbloqueado).
 * 2. Ciclo de vida real-time (~24h: Brotamento → Maturação 20h → Maduro 23h → Queda Automática 24h).
 * 3. Catch-up offline de múltiplos ciclos de 24h com anti-clock-skew.
 * 4. Sorteio de variantes de Néctar (Normal, Bifurcado, Dourado, Colérico, Caramelizado).
 * 5. Custo aritmético de nível de gerador (`1, 2, 3...`) e Frenesi de Néctar (`×3` SPS / 1h).
 */

import { GENERATOR_BY_ID } from '../config/generators.js';
import {
  MINIGAME_UNLOCK_GENERATORS,
  NECTAR_CONFIG,
  NECTAR_VARIANTS,
  NECTAR_VARIANT_BY_ID,
} from '../config/minigames.js';
import { cmp } from './decimal.js';

/**
 * Verifica se o sistema de Néctar está desbloqueado.
 */
export function isNectarUnlocked({
  lifetimeSouls = '0',
  nectar = 0,
  totalNectarHarvested = 0,
  generatorLevels = {},
  milestones = {},
} = {}) {
  if (milestones?.nectarUnlocked) return true;
  if (Number(nectar) > 0 || Number(totalNectarHarvested) > 0) return true;
  if (Object.values(generatorLevels || {}).some((lv) => Number(lv) > 0)) return true;
  return cmp(lifetimeSouls || '0', NECTAR_CONFIG.unlockLifetimeSouls) >= 0;
}

/**
 * Normaliza o mapa de níveis dos geradores (`generatorLevels`).
 */
export function normalizeGeneratorLevels(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  for (const [id, val] of Object.entries(raw)) {
    if (!GENERATOR_BY_ID[id]) continue;
    const lv = Math.min(
      NECTAR_CONFIG.maxGeneratorLevel,
      Math.max(0, Math.floor(Number(val) || 0)),
    );
    if (lv > 0) out[id] = lv;
  }
  return out;
}

/**
 * Custo em Néctares para elevar um gerador do nível `currentLevel` para `currentLevel + 1`.
 * Regra canônica Cookie Clicker: nível N custa N Néctares (0→1 custa 1, 1→2 custa 2, etc.).
 */
export function nextGeneratorLevelCost(currentLevel = 0) {
  const lv = Math.max(0, Math.floor(Number(currentLevel) || 0));
  return lv + 1;
}

/**
 * Soma total de Néctares gastos para atingir `level`: `level * (level + 1) / 2`.
 */
export function totalNectarSpentForLevel(level = 0) {
  const lv = Math.max(0, Math.floor(Number(level) || 0));
  return (lv * (lv + 1)) / 2;
}

/**
 * Soma total de Néctares gastos em todos os geradores.
 */
export function totalNectarSpentOnGenerators(generatorLevels = {}) {
  let sum = 0;
  for (const [id, lv] of Object.entries(generatorLevels || {})) {
    if (!GENERATOR_BY_ID[id]) continue;
    sum += totalNectarSpentForLevel(lv);
  }
  return sum;
}

/**
 * Sorteia a variante do próximo ciclo de Néctar.
 */
export function rollNectarVariant({
  catabaseActive = false,
  random = Math.random,
  forceVariantId = null,
} = {}) {
  if (forceVariantId && NECTAR_VARIANT_BY_ID[forceVariantId]) {
    const forced = NECTAR_VARIANT_BY_ID[forceVariantId];
    if (!forced.requiresCatabase || catabaseActive) return forced;
  }
  const pool = NECTAR_VARIANTS.filter((v) => !v.requiresCatabase || catabaseActive);
  const totalWeight = pool.reduce((acc, v) => acc + Math.max(1, Number(v.weight) || 1), 0);
  let target = Math.min(0.999999, Math.max(0, Number(random()) || 0)) * totalWeight;
  for (const v of pool) {
    const w = Math.max(1, Number(v.weight) || 1);
    if (target < w) return v;
    target -= w;
  }
  return pool[0];
}

/**
 * Sorteia a quantidade de Néctares colhidos para uma variante.
 */
export function rollNectarYield(variantId = 'nectar_normal', random = Math.random) {
  const def = NECTAR_VARIANT_BY_ID[variantId] || NECTAR_VARIANTS[0];
  const min = Math.max(0, Math.floor(Number(def.minYield) ?? 1));
  const max = Math.max(min, Math.floor(Number(def.maxYield) ?? 1));
  if (min === max) return min;
  const r = Math.min(0.999999, Math.max(0, Number(random()) || 0));
  return min + Math.floor(r * (max - min + 1));
}

/**
 * Retorna o estágio atual do ciclo de Néctar (`budding` | `mature` | `ripe` | `autoharvest`).
 */
export function describeNectarCycle({
  cycleStartedAt = null,
  nowMs = Date.now(),
  variantId = 'nectar_normal',
  unlocked = false,
} = {}) {
  if (!unlocked || cycleStartedAt == null || !Number.isFinite(Number(cycleStartedAt))) {
    return {
      unlocked: false,
      stage: 'locked',
      elapsedMs: 0,
      remainingToMatureMs: NECTAR_CONFIG.matureMs,
      remainingToRipeMs: NECTAR_CONFIG.ripeMs,
      remainingToAutoMs: NECTAR_CONFIG.autoHarvestMs,
      canManualHarvest: false,
      harvestChance: 0,
      variantId: 'nectar_normal',
    };
  }
  const start = Math.floor(Number(cycleStartedAt));
  const now = Math.max(start, Math.floor(Number(nowMs) || start));
  const elapsedMs = Math.max(0, now - start);
  const vId = NECTAR_VARIANT_BY_ID[variantId] ? variantId : 'nectar_normal';

  let stage = 'budding';
  let canManualHarvest = false;
  let harvestChance = 0;

  if (elapsedMs >= NECTAR_CONFIG.autoHarvestMs) {
    stage = 'autoharvest';
    canManualHarvest = true;
    harvestChance = 1;
  } else if (elapsedMs >= NECTAR_CONFIG.ripeMs) {
    stage = 'ripe';
    canManualHarvest = true;
    harvestChance = 1;
  } else if (elapsedMs >= NECTAR_CONFIG.matureMs) {
    stage = 'mature';
    canManualHarvest = true;
    harvestChance = NECTAR_CONFIG.matureHarvestChance;
  }

  return {
    unlocked: true,
    stage,
    elapsedMs,
    remainingToMatureMs: Math.max(0, NECTAR_CONFIG.matureMs - elapsedMs),
    remainingToRipeMs: Math.max(0, NECTAR_CONFIG.ripeMs - elapsedMs),
    remainingToAutoMs: Math.max(0, NECTAR_CONFIG.autoHarvestMs - elapsedMs),
    canManualHarvest,
    harvestChance,
    variantId: vId,
  };
}

/**
 * Processa o avanço de tempo e catch-up de ciclos completos de 24h (auto-harvest).
 * Se vários dias se passaram offline, colhe todos os ciclos fechados e posiciona `cycleStartedAt`
 * no resto do ciclo atual.
 */
export function advanceNectarCycles({
  unlocked = false,
  cycleStartedAt = null,
  currentVariant = 'nectar_normal',
  nowMs = Date.now(),
  catabaseActive = false,
  random = Math.random,
} = {}) {
  const now = Math.floor(Number(nowMs) || Date.now());
  if (!unlocked) {
    return {
      harvestedCount: 0,
      cyclesCompleted: 0,
      nextCycleStartedAt: null,
      nextVariant: 'nectar_normal',
      triggeredBuffId: null,
      refilledCooldowns: false,
    };
  }

  if (cycleStartedAt == null || !Number.isFinite(Number(cycleStartedAt)) || Number(cycleStartedAt) <= 0) {
    const initialVariant = NECTAR_VARIANT_BY_ID[currentVariant]
      ? currentVariant
      : rollNectarVariant({ catabaseActive, random }).id;
    return {
      harvestedCount: 0,
      cyclesCompleted: 0,
      nextCycleStartedAt: now,
      nextVariant: initialVariant,
      triggeredBuffId: null,
      refilledCooldowns: false,
    };
  }

  let start = Math.floor(Number(cycleStartedAt));
  // Proteção anti-clock-skew local: se o start estiver no futuro, ancora em `now`.
  if (start > now) {
    start = now;
  }

  const elapsed = now - start;
  const cycleMs = NECTAR_CONFIG.autoHarvestMs;
  if (elapsed < cycleMs) {
    return {
      harvestedCount: 0,
      cyclesCompleted: 0,
      nextCycleStartedAt: start,
      nextVariant: NECTAR_VARIANT_BY_ID[currentVariant] ? currentVariant : 'nectar_normal',
      triggeredBuffId: null,
      refilledCooldowns: false,
    };
  }

  const cyclesCompleted = Math.floor(elapsed / cycleMs);
  let harvestedCount = 0;
  let variant = NECTAR_VARIANT_BY_ID[currentVariant] ? currentVariant : 'nectar_normal';
  let triggeredBuffId = null;
  let refilledCooldowns = false;

  // Limita iteração de sorteio individual a 365 ciclos (acima disso, 1 por ciclo restante)
  const detailedCycles = Math.min(cyclesCompleted, 365);
  for (let i = 0; i < detailedCycles; i += 1) {
    const def = NECTAR_VARIANT_BY_ID[variant] || NECTAR_VARIANTS[0];
    harvestedCount += rollNectarYield(def.id, random);
    if (def.triggersBuffId) triggeredBuffId = def.triggersBuffId;
    if (def.refillsCooldowns) refilledCooldowns = true;
    variant = rollNectarVariant({ catabaseActive, random }).id;
  }
  if (cyclesCompleted > detailedCycles) {
    harvestedCount += cyclesCompleted - detailedCycles;
  }

  const nextCycleStartedAt = start + cyclesCompleted * cycleMs;
  return {
    harvestedCount,
    cyclesCompleted,
    nextCycleStartedAt,
    nextVariant: variant,
    triggeredBuffId,
    refilledCooldowns,
  };
}

/**
 * Tenta colher manualmente o Néctar atual:
 * - Se `stage === 'ripe'` ou `'autoharvest'`: 100% de sucesso, reinicia o ciclo em `nowMs`.
 * - Se `stage === 'mature'`: 50% de chance (`NECTAR_MATURE_HARVEST_CHANCE`). Em caso de falha,
 *   o Néctar é perdido (0 ganhos) e o ciclo reinicia em `nowMs` (paridade Cookie Clicker).
 */
export function attemptManualNectarHarvest({
  unlocked = false,
  cycleStartedAt = null,
  currentVariant = 'nectar_normal',
  nowMs = Date.now(),
  catabaseActive = false,
  random = Math.random,
} = {}) {
  const status = describeNectarCycle({
    cycleStartedAt,
    nowMs,
    variantId: currentVariant,
    unlocked,
  });
  if (!status.unlocked || !status.canManualHarvest) {
    return {
      ok: false,
      reason: status.unlocked ? 'not_mature' : 'locked',
      gained: 0,
      botched: false,
    };
  }

  const now = Math.floor(Number(nowMs) || Date.now());
  const nextVariant = rollNectarVariant({ catabaseActive, random }).id;

  if (status.stage === 'mature') {
    const roll = Number(random()) || 0;
    if (roll >= status.harvestChance) {
      return {
        ok: true,
        botched: true,
        stage: status.stage,
        variantId: status.variantId,
        gained: 0,
        nextCycleStartedAt: now,
        nextVariant,
        triggeredBuffId: null,
        refilledCooldowns: false,
      };
    }
  }

  const def = NECTAR_VARIANT_BY_ID[status.variantId] || NECTAR_VARIANTS[0];
  const gained = rollNectarYield(def.id, random);
  return {
    ok: true,
    botched: false,
    stage: status.stage,
    variantId: def.id,
    gained,
    nextCycleStartedAt: now,
    nextVariant,
    triggeredBuffId: def.triggersBuffId || null,
    refilledCooldowns: Boolean(def.refillsCooldowns),
  };
}

/**
 * Retorna quais minigames estão desbloqueados com base nos níveis dos geradores (Lv >= 1).
 */
export function unlockedMinigames(generatorLevels = {}) {
  const levels = generatorLevels || {};
  return {
    pantheon: Number(levels[MINIGAME_UNLOCK_GENERATORS.pantheon] || 0) >= 1,
    grimoire: Number(levels[MINIGAME_UNLOCK_GENERATORS.grimoire] || 0) >= 1,
    garden: Number(levels[MINIGAME_UNLOCK_GENERATORS.garden] || 0) >= 1,
    market: Number(levels[MINIGAME_UNLOCK_GENERATORS.market] || 0) >= 1,
  };
}
