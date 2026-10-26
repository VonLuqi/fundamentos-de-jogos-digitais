/**
 * Fase F8 — DragonSystem (Domínio puro do Dragão Ctoniano: Pitão / Ladão).
 * Responsabilidades:
 * 1. Normalização do estado `dragon` (`stage`, `auraSlot1`, `auraSlot2`, `scaleDropped`).
 * 2. Evolução de estágio (0 → 1 por 1M almas; 1 → 2 por 50 unidades; 2 → 3 por 100; 3 → 4 por 200).
 * 3. Alocação de Auras nos slots 1 e 2 (sacrificando 1 unidade do gerador de maior tier possuído).
 * 4. Cálculo dos modificadores ativos das Auras (`spsMult`, `clickMult`, `veilPupBoost`, `sellRefundRate`, `dragonflightActive`).
 */

import { GENERATORS } from '../config/generators.js';
import {
  DRAGON_AURA_BY_ID,
  DRAGON_MAX_STAGE,
  DRAGON_SCALE_UPGRADE_ID,
  DRAGON_STAGES,
  DRAGON_UNLOCK_TALENT_ID,
  getDragonAura,
  getDragonStage,
  isKnownDragonAuraId,
} from '../config/dragon.js';
import {
  DRAGON_BREATH_OF_MILK_BOOST,
  DRAGON_CURSOR_CLICK_MULT,
  DRAGON_RADIANT_APPETITE_MULT,
  GENERATOR_SELL_REFUND_BASE,
  GENERATOR_SELL_REFUND_EARTH_SHATTERER,
} from '../config/constants.js';
import { cmp, mul } from './decimal.js';

export function isDragonUnlocked(talents = [], dragonState = null) {
  if (dragonState && Number(dragonState.stage) > 0) return true;
  const set = new Set((Array.isArray(talents) ? talents : []).map((t) => String(t)));
  return set.has(DRAGON_UNLOCK_TALENT_ID);
}

export function normalizeDragonState(raw = {}, opts = {}) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const stage = Math.max(0, Math.min(DRAGON_MAX_STAGE, Math.floor(Number(src.stage) || 0)));
  const stageDef = getDragonStage(stage);
  const maxSlots = stageDef.auraSlots;

  let auraSlot1 = src.auraSlot1 && isKnownDragonAuraId(src.auraSlot1) ? String(src.auraSlot1) : null;
  let auraSlot2 = src.auraSlot2 && isKnownDragonAuraId(src.auraSlot2) ? String(src.auraSlot2) : null;

  if (maxSlots < 1) {
    auraSlot1 = null;
    auraSlot2 = null;
  } else if (maxSlots < 2) {
    auraSlot2 = null;
  }

  if (auraSlot1 && DRAGON_AURA_BY_ID[auraSlot1].minStage > stage) {
    auraSlot1 = null;
  }
  if (auraSlot2 && (DRAGON_AURA_BY_ID[auraSlot2].minStage > stage || auraSlot2 === auraSlot1)) {
    auraSlot2 = null;
  }

  const upgrades = Array.isArray(opts.upgrades) ? opts.upgrades : [];
  const scaleDropped = Boolean(
    src.scaleDropped || stage >= 1 || upgrades.includes(DRAGON_SCALE_UPGRADE_ID),
  );

  return {
    stage,
    auraSlot1,
    auraSlot2,
    scaleDropped,
  };
}

/**
 * Encontra o gerador de maior tier atualmente possuído (`qty >= minQty`).
 */
export function findHighestOwnedGenerator(generators = {}, minQty = 1) {
  let chosen = null;
  for (const def of GENERATORS) {
    const qty = Math.max(0, Math.floor(Number(generators?.[def.id]) || 0));
    if (qty >= minQty) {
      if (!chosen || def.tier > chosen.tier) {
        chosen = { id: def.id, tier: def.tier, qty };
      }
    }
  }
  return chosen;
}

/**
 * Evolui o Dragão Ctoniano para o próximo estágio (0 → 1 → 2 → 3 → 4).
 */
export function evolveDragonStage(dragonState = {}, {
  talents = [],
  souls = '0',
  generators = {},
  targetGeneratorId = null,
  free = false,
} = {}) {
  const state = normalizeDragonState(dragonState);
  if (!free && !isDragonUnlocked(talents, state)) {
    return { ok: false, reason: 'locked', state };
  }
  if (state.stage >= DRAGON_MAX_STAGE) {
    return { ok: false, reason: 'max_stage', state };
  }

  const currentStageDef = getDragonStage(state.stage);
  const nextStage = state.stage + 1;
  const nextGenerators = { ...generators };
  let soulsCost = '0';
  let sacrificedGeneratorId = null;
  let sacrificedQty = 0;

  if (state.stage === 0) {
    soulsCost = currentStageDef.nextStageSoulsCost || '1000000';
    if (!free && cmp(souls, soulsCost) < 0) {
      return { ok: false, reason: 'insufficient_souls', cost: soulsCost, state };
    }
  } else {
    const reqQty = Number(currentStageDef.nextStageSacrificeQty) || 50;
    if (!free) {
      let chosenId = null;
      if (targetGeneratorId && Number(nextGenerators[targetGeneratorId] || 0) >= reqQty) {
        chosenId = String(targetGeneratorId);
      } else {
        // Procura o primeiro gerador elegível com >= reqQty unidades
        for (const def of GENERATORS) {
          if (Number(nextGenerators[def.id] || 0) >= reqQty) {
            chosenId = def.id;
            break;
          }
        }
      }
      if (!chosenId) {
        return {
          ok: false,
          reason: 'insufficient_generators',
          requiredQty: reqQty,
          state,
        };
      }
      nextGenerators[chosenId] = Math.max(0, Math.floor(Number(nextGenerators[chosenId]) || 0) - reqQty);
      if (nextGenerators[chosenId] <= 0) delete nextGenerators[chosenId];
      sacrificedGeneratorId = chosenId;
      sacrificedQty = reqQty;
    }
  }

  const nextState = normalizeDragonState({
    ...state,
    stage: nextStage,
    scaleDropped: true,
  });

  return {
    ok: true,
    stage: nextStage,
    stageDef: getDragonStage(nextStage),
    soulsCost: free ? '0' : soulsCost,
    sacrificedGeneratorId,
    sacrificedQty,
    nextGenerators,
    unlockedDropId: DRAGON_SCALE_UPGRADE_ID,
    state: nextState,
  };
}

/**
 * Equipa ou limpa uma Aura Dracónica no slot 1 (`slotIndex = 1`) ou slot 2 (`slotIndex = 2`).
 * Trocar para uma nova aura sacrifica 1 unidade do gerador de maior tier possuído.
 */
export function equipDragonAura(dragonState = {}, {
  slotIndex = 1,
  auraId = null,
  generators = {},
  free = false,
} = {}) {
  const state = normalizeDragonState(dragonState);
  const slot = Number(slotIndex) === 2 ? 2 : 1;
  const stageDef = getDragonStage(state.stage);

  if (stageDef.auraSlots < slot) {
    return { ok: false, reason: 'slot_locked', state };
  }

  const normalizedAuraId = auraId ? String(auraId) : null;
  if (normalizedAuraId !== null) {
    const auraDef = getDragonAura(normalizedAuraId);
    if (!auraDef) {
      return { ok: false, reason: 'unknown_aura', state };
    }
    if (state.stage < auraDef.minStage) {
      return { ok: false, reason: 'stage_too_low', requiredStage: auraDef.minStage, state };
    }
    const otherSlotAura = slot === 1 ? state.auraSlot2 : state.auraSlot1;
    if (otherSlotAura && otherSlotAura === normalizedAuraId) {
      return { ok: false, reason: 'aura_already_equipped', state };
    }
  }

  const currentSlotAura = slot === 1 ? state.auraSlot1 : state.auraSlot2;
  if (currentSlotAura === normalizedAuraId) {
    return {
      ok: true,
      changed: false,
      sacrificedGeneratorId: null,
      nextGenerators: { ...generators },
      state,
    };
  }

  const nextGenerators = { ...generators };
  let sacrificedGeneratorId = null;

  // Trocar para uma aura não-nula exige sacrificar 1 unidade do gerador de maior tier possuído
  if (normalizedAuraId !== null && !free) {
    const highest = findHighestOwnedGenerator(nextGenerators, 1);
    if (!highest) {
      return { ok: false, reason: 'no_generator_to_sacrifice', state };
    }
    sacrificedGeneratorId = highest.id;
    nextGenerators[highest.id] = Math.max(0, highest.qty - 1);
    if (nextGenerators[highest.id] <= 0) delete nextGenerators[highest.id];
  }

  const nextState = normalizeDragonState({
    ...state,
    auraSlot1: slot === 1 ? normalizedAuraId : state.auraSlot1,
    auraSlot2: slot === 2 ? normalizedAuraId : state.auraSlot2,
  });

  return {
    ok: true,
    changed: true,
    slot,
    auraId: normalizedAuraId,
    sacrificedGeneratorId,
    nextGenerators,
    state: nextState,
  };
}

/**
 * Retorna a lista de IDs de auras ativas no estado atual do Dragão.
 */
export function activeDragonAuraIds(dragonState = {}) {
  const state = normalizeDragonState(dragonState);
  const out = [];
  if (state.auraSlot1) out.push(state.auraSlot1);
  if (state.auraSlot2 && state.auraSlot2 !== state.auraSlot1) out.push(state.auraSlot2);
  return out;
}

/**
 * Calcula os modificadores agregados das Auras ativas do Dragão Ctoniano.
 */
export function dragonModifiers(dragonState = {}) {
  const activeIds = new Set(activeDragonAuraIds(dragonState));
  let spsMult = '1';
  let clickMult = '1';
  let veilPupBoost = '1';
  let sellRefundRate = GENERATOR_SELL_REFUND_BASE;
  let dragonflightActive = false;

  if (activeIds.has('apetite_radiante')) {
    spsMult = mul(spsMult, DRAGON_RADIANT_APPETITE_MULT);
  }
  if (activeIds.has('cursor_ancestral')) {
    clickMult = mul(clickMult, DRAGON_CURSOR_CLICK_MULT);
  }
  if (activeIds.has('sopro_de_flegeton')) {
    veilPupBoost = mul(veilPupBoost, DRAGON_BREATH_OF_MILK_BOOST);
  }
  if (activeIds.has('abalo_do_tartaro')) {
    sellRefundRate = GENERATOR_SELL_REFUND_EARTH_SHATTERER;
  }
  if (activeIds.has('voo_draconico')) {
    dragonflightActive = true;
  }

  return {
    spsMult,
    clickMult,
    veilPupBoost,
    sellRefundRate,
    dragonflightActive,
    activeAuras: [...activeIds],
  };
}

export { DRAGON_STAGES, getDragonStage, getDragonAura };
