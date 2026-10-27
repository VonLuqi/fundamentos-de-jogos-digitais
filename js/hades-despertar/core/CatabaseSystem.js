/**
 * Fase F6 — Sistema de Domínio da Catábase das Avós (Grandmapocalypse)
 * e das Sanguessugas do Acheron (Wrinklers).
 *
 * Responsabilidades isoladas (SRP):
 * 1. Normalização do estado de Catábase, fila de pesquisa e slots de Sanguessugas.
 * 2. Cálculo de `effectiveStage` (0 se Trégua ou Aliança ativa), dreno aparente (−5% por unidade)
 *    e taxa paralela de digestão (`rawSPS × leechesCount × 0.05` em cada Sanguessuga).
 * 3. Spawn periódico de Sanguessugas (com 0.01% de chance de variante Shiny) e estouro (*pop*)
 *    com retorno `digested × 1.1` (`×1.155` com Vísceras Sacras; `×3.3` se Shiny).
 * 4. Contenção: Juramento de Trégua (*Elder Pledge*, 30 min, estoura todas as Sanguessugas)
 *    e Aliança Eterna (*Elder Covenant*, −5% SPS global, revogável a qualquer momento).
 */

import {
  CATABASE_CONFIG,
  CATABASE_RESEARCH_CHAIN,
  CATABASE_STAGES,
  calculatePledgeCost,
  structuralCatabaseStageFromUpgrades,
  wrathProbabilityForStage,
} from '../config/catabase.js';
import {
  LEECH_CLICKS_REQUIRED,
  LEECH_SHINY_CLICKS_REQUIRED,
} from '../config/constants.js';
import {
  add,
  clampNonNegative,
  cmp,
  money,
  mul,
  sub,
} from './decimal.js';

/**
 * Cap de Sanguessugas: 10 base +2 (*Ninho do Acheron*) + leechCapBonus (Elder Spice) ≤ 14.
 */
export function maxLeechCapacity(upgradeIds = [], { leechCapBonus = 0 } = {}) {
  const owned = new Set((Array.isArray(upgradeIds) ? upgradeIds : []).map((id) => String(id)));
  let cap = CATABASE_CONFIG.leechBaseCap;
  if (owned.has('ninho_do_acheron')) cap += 2;
  cap += Math.max(0, Math.floor(Number(leechCapBonus) || 0));
  return Math.max(0, Math.min(CATABASE_CONFIG.leechMaxCap, cap));
}

export function leechPayoutMultiplier({
  shiny = false,
  upgrades = [],
  leechPayoutMult = '1',
} = {}) {
  const owned = new Set((Array.isArray(upgrades) ? upgrades : []).map((id) => String(id)));
  let mult = owned.has('visceras_sacras')
    ? CATABASE_CONFIG.leechPayoutMultSacra
    : CATABASE_CONFIG.leechPayoutMultBase;
  const talentMult = leechPayoutMult != null ? String(leechPayoutMult) : '1';
  if (talentMult !== '1') {
    mult = mul(mult, talentMult);
  }
  if (shiny) {
    // Shiny = 3× o payout normal (1.1 → 3.3; com stacks aplica o produto).
    mult = mul(mult, '3');
  }
  return mult;
}

export function researchDurationSeconds({ researchDurationMult = '1' } = {}) {
  const base = CATABASE_CONFIG.researchDurationSec;
  const factor = Number(researchDurationMult);
  if (!Number.isFinite(factor) || factor <= 0 || factor === 1) return base;
  return Math.max(1, Math.round(base * factor));
}

export function normalizeLeechEntry(raw, index = 0, maxCap = CATABASE_CONFIG.leechMaxCap) {
  if (!raw || typeof raw !== 'object') return null;
  const slot = Number.isFinite(Number(raw.slot))
    ? Math.max(0, Math.min(maxCap - 1, Math.floor(Number(raw.slot))))
    : Math.max(0, Math.min(maxCap - 1, index));
  const digested = clampNonNegative(raw.digested ?? '0');
  const shiny = Boolean(raw.shiny);
  const clicks = Math.max(0, Math.floor(Number(raw.clicks) || 0));
  const spawnedAt = Number.isFinite(Number(raw.spawnedAt)) && Number(raw.spawnedAt) > 0
    ? Math.floor(Number(raw.spawnedAt))
    : 0;
  return {
    id: String(raw.id || `leech_${slot}_${spawnedAt}`),
    slot,
    shiny,
    digested,
    clicks,
    spawnedAt,
  };
}

export function normalizeLeechesList(rawList = [], upgrades = [], { leechCapBonus = 0 } = {}) {
  const cap = maxLeechCapacity(upgrades, { leechCapBonus });
  if (!Array.isArray(rawList)) return [];
  const out = [];
  const usedSlots = new Set();
  for (let i = 0; i < rawList.length && out.length < cap; i += 1) {
    const entry = normalizeLeechEntry(rawList[i], i, cap);
    if (!entry) continue;
    let slot = entry.slot;
    if (usedSlots.has(slot)) {
      slot = -1;
      for (let s = 0; s < cap; s += 1) {
        if (!usedSlots.has(s)) {
          slot = s;
          break;
        }
      }
    }
    if (slot < 0) continue;
    usedSlots.add(slot);
    out.push({ ...entry, slot });
  }
  out.sort((a, b) => a.slot - b.slot);
  return out;
}

/**
 * Sincroniza quais pesquisas da cadeia do Arquivo Estígio já cumpriram o timer.
 */
export function resolveNextResearchTarget(upgradeIds = [], unlockedIds = []) {
  const owned = new Set((Array.isArray(upgradeIds) ? upgradeIds : []).map((id) => String(id)));
  const unlocked = new Set((Array.isArray(unlockedIds) ? unlockedIds : []).map((id) => String(id)));
  if (!owned.has('concilio_das_moiras')) return null;

  for (const step of CATABASE_RESEARCH_CHAIN) {
    if (owned.has(step.upgradeId) || unlocked.has(step.upgradeId)) {
      continue;
    }
    if (owned.has(step.prevUpgradeId)) {
      return step;
    }
    return null;
  }
  return null;
}

export function normalizeCatabaseState(raw = {}, {
  upgrades = [],
  nowMs = null,
  leechCapBonus = 0,
  researchDurationMult = '1',
} = {}) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const owned = new Set((Array.isArray(upgrades) ? upgrades : []).map((id) => String(id)));
  const structuralStage = structuralCatabaseStageFromUpgrades(upgrades);
  const manualStage = Number.isFinite(Number(src.stage))
    ? Math.max(0, Math.min(3, Math.floor(Number(src.stage))))
    : 0;
  const stage = Math.max(structuralStage, manualStage);

  const covenantActive = Boolean(src.covenantActive);
  let pledgeExpiresAt = Number.isFinite(Number(src.pledgeExpiresAt)) && Number(src.pledgeExpiresAt) > 0
    ? Math.floor(Number(src.pledgeExpiresAt))
    : null;
  if (pledgeExpiresAt != null && nowMs != null && Number.isFinite(Number(nowMs)) && pledgeExpiresAt <= Number(nowMs)) {
    pledgeExpiresAt = null;
  }

  const pledgesCount = Math.max(0, Math.floor(Number(src.pledgesCount) || 0));
  const covenantActivations = Math.max(0, Math.floor(Number(src.covenantActivations) || 0));
  const leechesPopped = Math.max(0, Math.floor(Number(src.leechesPopped) || 0));
  const shinyLeechesPopped = Math.max(0, Math.floor(Number(src.shinyLeechesPopped) || 0));

  // Pesquisas desbloqueadas (inclui qualquer pesquisa já comprada ou já marcada como pronta)
  const rawUnlocked = Array.isArray(src.unlockedResearchIds) ? src.unlockedResearchIds : [];
  const unlockedSet = new Set(rawUnlocked.map((id) => String(id)));
  for (const step of CATABASE_RESEARCH_CHAIN) {
    if (owned.has(step.upgradeId)) {
      unlockedSet.add(step.upgradeId);
    }
  }
  const unlockedResearchIds = CATABASE_RESEARCH_CHAIN
    .map((s) => s.upgradeId)
    .filter((id) => unlockedSet.has(id));

  const researchDur = researchDurationSeconds({ researchDurationMult });
  const nextTarget = resolveNextResearchTarget(upgrades, unlockedResearchIds);
  let researchRemainingSec = Number.isFinite(Number(src.researchRemainingSec))
    ? Math.max(0, Number(src.researchRemainingSec))
    : 0;
  let researchTargetId = nextTarget ? nextTarget.upgradeId : null;
  if (researchTargetId && src.researchTargetId !== researchTargetId && researchRemainingSec <= 0) {
    researchRemainingSec = researchDur;
  }
  if (!researchTargetId) {
    researchRemainingSec = 0;
  }

  const suppressed = covenantActive || (pledgeExpiresAt != null && (nowMs == null || pledgeExpiresAt > Number(nowMs)));
  const leeches = suppressed ? [] : normalizeLeechesList(src.leeches, upgrades, { leechCapBonus });

  return {
    stage,
    covenantActive,
    pledgeExpiresAt,
    pledgesCount,
    covenantActivations,
    leeches,
    leechesPopped,
    shinyLeechesPopped,
    unlockedResearchIds,
    researchTargetId,
    researchRemainingSec,
  };
}

/**
 * Estágio efetivo da Catábase (0 se Trégua ou Aliança estiver ativa; senão 0..3).
 */
export function effectiveCatabaseStage(catabaseState = {}, nowMs = null) {
  if (!catabaseState || typeof catabaseState !== 'object') return 0;
  if (catabaseState.covenantActive) return 0;
  const exp = Number(catabaseState.pledgeExpiresAt || 0);
  if (Number.isFinite(exp) && exp > 0) {
    if (nowMs == null || exp > Number(nowMs)) return 0;
  }
  return Math.max(0, Math.min(3, Math.floor(Number(catabaseState.stage) || 0)));
}

export function isCatabasePledgeActive(catabaseState = {}, nowMs = null) {
  const exp = Number(catabaseState?.pledgeExpiresAt || 0);
  if (!Number.isFinite(exp) || exp <= 0) return false;
  if (nowMs == null) return true;
  return exp > Number(nowMs);
}

/**
 * Calcula a fração drenada (`count * 0.05`) e o multiplicador aparente (`1 - count * 0.05`).
 */
export function calculateLeechDrain(leechesOrCount = 0) {
  const count = Array.isArray(leechesOrCount)
    ? leechesOrCount.length
    : Math.max(0, Math.floor(Number(leechesOrCount) || 0));
  const clamped = Math.min(CATABASE_CONFIG.leechMaxCap, count);
  if (clamped <= 0) {
    return {
      count: 0,
      drainFraction: '0',
      drainPercent: 0,
      apparentMult: '1',
    };
  }
  const drainFraction = mul(String(clamped), CATABASE_CONFIG.leechDrainPerUnit);
  const apparentMult = cmp(drainFraction, '1') >= 0 ? '0' : sub('1', drainFraction);
  return {
    count: clamped,
    drainFraction,
    drainPercent: clamped * 5,
    apparentMult,
  };
}

/**
 * Soma total de almas atualmente digeridas em todas as Sanguessugas ativas,
 * bem como o payout líquido estimado se todas fossem estouradas agora.
 */
export function summarizeLeeches(leeches = [], upgrades = [], { leechPayoutMult = '1' } = {}) {
  const list = Array.isArray(leeches) ? leeches : [];
  let totalDigested = '0';
  let totalPayout = '0';
  let shinyCount = 0;
  for (const leech of list) {
    if (!leech) continue;
    const dig = clampNonNegative(leech.digested ?? '0');
    totalDigested = add(totalDigested, dig);
    const mult = leechPayoutMultiplier({
      shiny: Boolean(leech.shiny),
      upgrades,
      leechPayoutMult,
    });
    totalPayout = add(totalPayout, mul(dig, mult));
    if (leech.shiny) shinyCount += 1;
  }
  return {
    count: list.length,
    shinyCount,
    totalDigested: money(totalDigested),
    totalPayout: money(totalPayout),
  };
}

/**
 * Spawna uma Sanguessuga no primeiro slot livre ao redor da Foice.
 */
export function spawnLeech(catabaseState = {}, {
  upgrades = [],
  nowMs = Date.now(),
  shiny = null,
  slot = null,
  random = Math.random,
  leechCapBonus = 0,
  researchDurationMult = '1',
} = {}) {
  const state = normalizeCatabaseState(catabaseState, {
    upgrades,
    nowMs,
    leechCapBonus,
    researchDurationMult,
  });
  const effStage = effectiveCatabaseStage(state, nowMs);
  if (effStage < 1) {
    return { ok: false, reason: 'catabase_inactive', state };
  }
  const cap = maxLeechCapacity(upgrades, { leechCapBonus });
  if (state.leeches.length >= cap) {
    return { ok: false, reason: 'capacity_full', state };
  }
  const used = new Set(state.leeches.map((l) => l.slot));
  let chosenSlot = slot != null && Number.isFinite(Number(slot)) && !used.has(Math.floor(Number(slot)))
    ? Math.max(0, Math.min(cap - 1, Math.floor(Number(slot))))
    : -1;
  if (chosenSlot < 0) {
    for (let s = 0; s < cap; s += 1) {
      if (!used.has(s)) {
        chosenSlot = s;
        break;
      }
    }
  }
  if (chosenSlot < 0) {
    return { ok: false, reason: 'capacity_full', state };
  }

  const isShiny = typeof shiny === 'boolean'
    ? shiny
    : (Number(random()) < CATABASE_CONFIG.leechShinyChance);

  const leech = {
    id: `leech_${chosenSlot}_${Math.floor(Number(nowMs) || 0)}`,
    slot: chosenSlot,
    shiny: isShiny,
    digested: '0',
    clicks: 0,
    spawnedAt: Math.floor(Number(nowMs) || 0),
  };
  const nextLeeches = [...state.leeches, leech].sort((a, b) => a.slot - b.slot);
  return {
    ok: true,
    leech,
    state: {
      ...state,
      leeches: nextLeeches,
    },
  };
}

/**
 * Estoura (*pop*) uma Sanguessuga específica (por índice na lista, `slot` ou `id`)
 * e calcula a recompensa (`digested × 1.1` / `×1.155` / `×3.3`).
 */
export function popLeech(catabaseState = {}, targetIndexOrId = 0, {
  upgrades = [],
  nowMs = null,
  clicksRequired = null,
  leechCapBonus = 0,
  leechPayoutMult = '1',
  researchDurationMult = '1',
} = {}) {
  const state = normalizeCatabaseState(catabaseState, {
    upgrades,
    nowMs,
    leechCapBonus,
    researchDurationMult,
  });
  if (!state.leeches.length) {
    return { ok: false, reason: 'no_leeches', payout: '0', state };
  }

  let idx = -1;
  if (typeof targetIndexOrId === 'string') {
    idx = state.leeches.findIndex((l) => l.id === targetIndexOrId || String(l.slot) === targetIndexOrId);
  } else if (Number.isFinite(Number(targetIndexOrId))) {
    const n = Math.floor(Number(targetIndexOrId));
    idx = state.leeches.findIndex((l) => l.slot === n);
    if (idx < 0 && n >= 0 && n < state.leeches.length) {
      idx = n;
    }
  }
  if (idx < 0 || !state.leeches[idx]) {
    return { ok: false, reason: 'not_found', payout: '0', state };
  }

  const target = state.leeches[idx];
  const nextClicks = (target.clicks || 0) + 1;
  const defaultReq = target.shiny
    ? LEECH_SHINY_CLICKS_REQUIRED
    : LEECH_CLICKS_REQUIRED;
  const reqClicks = Math.max(1, Math.floor(
    clicksRequired != null ? Number(clicksRequired) || 1 : defaultReq,
  ));

  if (nextClicks < reqClicks) {
    const nextLeeches = state.leeches.map((item, i) => (i === idx ? { ...item, clicks: nextClicks } : item));
    return {
      ok: true,
      popped: false,
      clicks: nextClicks,
      clicksRequired: reqClicks,
      payout: '0',
      leech: nextLeeches[idx],
      state: { ...state, leeches: nextLeeches },
    };
  }

  const mult = leechPayoutMultiplier({
    shiny: target.shiny,
    upgrades,
    leechPayoutMult,
  });
  const payout = money(mul(target.digested || '0', mult));
  const nextLeeches = state.leeches.filter((_, i) => i !== idx);

  return {
    ok: true,
    popped: true,
    payout,
    mult,
    leech: target,
    state: {
      ...state,
      leeches: nextLeeches,
      leechesPopped: state.leechesPopped + 1,
      shinyLeechesPopped: state.shinyLeechesPopped + (target.shiny ? 1 : 0),
    },
  };
}

/**
 * Estoura todas as Sanguessugas ativas de uma vez (ex.: ao ativar Juramento de Trégua ou Aliança).
 */
export function popAllLeeches(catabaseState = {}, {
  upgrades = [],
  nowMs = null,
  leechCapBonus = 0,
  leechPayoutMult = '1',
  researchDurationMult = '1',
} = {}) {
  const state = normalizeCatabaseState(catabaseState, {
    upgrades,
    nowMs,
    leechCapBonus,
    researchDurationMult,
  });
  if (!state.leeches.length) {
    return {
      ok: true,
      poppedCount: 0,
      shinyPoppedCount: 0,
      totalPayout: money('0'),
      state,
    };
  }
  let totalPayout = '0';
  let shinyPopped = 0;
  for (const leech of state.leeches) {
    const mult = leechPayoutMultiplier({
      shiny: leech.shiny,
      upgrades,
      leechPayoutMult,
    });
    totalPayout = add(totalPayout, mul(leech.digested || '0', mult));
    if (leech.shiny) shinyPopped += 1;
  }
  const poppedCount = state.leeches.length;
  return {
    ok: true,
    poppedCount,
    shinyPoppedCount: shinyPopped,
    totalPayout: money(totalPayout),
    state: {
      ...state,
      leeches: [],
      leechesPopped: state.leechesPopped + poppedCount,
      shinyLeechesPopped: state.shinyLeechesPopped + shinyPopped,
    },
  };
}

/**
 * Avança um tick de tempo na Catábase:
 * 1. Atualiza o timer de pesquisa do Arquivo Estígio (revelando o próximo juramento ao zerar).
 * 2. Verifica expiração do Juramento de Trégua (*Elder Pledge*).
 * 3. Acumula a digestão paralela em cada Sanguessuga ativa (`rawSPS × leechesCount × 0.05 × dt`).
 * 4. Tenta spawnar nova Sanguessuga se houver vaga e `effectiveStage >= 1`.
 */
export function stepCatabaseTick(catabaseState = {}, {
  dtSeconds = 0,
  rawSps = '0',
  upgrades = [],
  nowMs = Date.now(),
  random = Math.random,
  leechCapBonus = 0,
  leechSpawnMult = '1',
  researchDurationMult = '1',
} = {}) {
  const dt = Math.max(0, Number(dtSeconds) || 0);
  const state = normalizeCatabaseState(catabaseState, {
    upgrades,
    nowMs,
    leechCapBonus,
    researchDurationMult,
  });
  let pledgeExpired = false;
  if (catabaseState?.pledgeExpiresAt && !state.pledgeExpiresAt) {
    pledgeExpired = true;
  }

  const researchDur = researchDurationSeconds({ researchDurationMult });

  // 1. Timer de pesquisa
  let unlockedResearchIds = [...state.unlockedResearchIds];
  let researchTargetId = state.researchTargetId;
  let researchRemainingSec = state.researchRemainingSec;
  let researchCompletedId = null;

  if (researchTargetId && dt > 0) {
    researchRemainingSec = Math.max(0, researchRemainingSec - dt);
    if (researchRemainingSec <= 0) {
      if (!unlockedResearchIds.includes(researchTargetId)) {
        unlockedResearchIds.push(researchTargetId);
        researchCompletedId = researchTargetId;
      }
      const nextTarget = resolveNextResearchTarget(upgrades, unlockedResearchIds);
      researchTargetId = nextTarget ? nextTarget.upgradeId : null;
      researchRemainingSec = researchTargetId ? researchDur : 0;
    }
  }

  const effStage = effectiveCatabaseStage(state, nowMs);
  let leeches = state.leeches;
  let spawnedLeech = null;

  if (effStage >= 1 && dt > 0) {
    // 2. Digestão paralela: cada Sanguessuga acumula o dreno total de todas as Sanguessugas juntas!
    if (leeches.length > 0 && cmp(rawSps, '0') > 0) {
      const { drainFraction } = calculateLeechDrain(leeches.length);
      const digestedPerLeech = mul(mul(rawSps, drainFraction), String(dt));
      if (cmp(digestedPerLeech, '0') > 0) {
        leeches = leeches.map((l) => ({
          ...l,
          digested: add(l.digested || '0', digestedPerLeech),
        }));
      }
    }

    // 3. Tentativa de spawn proporcional ao estágio × talentos (Unholy Bait)
    const cap = maxLeechCapacity(upgrades, { leechCapBonus });
    if (leeches.length < cap) {
      const spawnFactor = Math.max(0, Number(leechSpawnMult) || 1);
      const spawnProb = Math.min(
        1,
        dt * effStage * CATABASE_CONFIG.leechSpawnChancePerSecPerStage * spawnFactor,
      );
      if (Number(random()) < spawnProb) {
        const res = spawnLeech(
          { ...state, leeches, unlockedResearchIds, researchTargetId, researchRemainingSec },
          {
            upgrades,
            nowMs,
            random,
            leechCapBonus,
            researchDurationMult,
          },
        );
        if (res.ok) {
          leeches = res.state.leeches;
          spawnedLeech = res.leech;
        }
      }
    }
  }

  return {
    state: {
      ...state,
      leeches,
      unlockedResearchIds,
      researchTargetId,
      researchRemainingSec,
    },
    effectiveStage: effStage,
    pledgeExpired,
    researchCompletedId,
    spawnedLeech,
  };
}

/**
 * Ativa o Juramento de Trégua (*Elder Pledge*): exige Estágio 3 (ou `pacto_primordial`),
 * cobra `8^min(pledgesCount+2, 14)` almas, estoura todas as Sanguessugas e suspende a Catábase por 30 min.
 */
export function activateElderPledge(catabaseState = {}, {
  souls = '0',
  upgrades = [],
  nowMs = Date.now(),
  free = false,
  leechCapBonus = 0,
  leechPayoutMult = '1',
  researchDurationMult = '1',
} = {}) {
  const fxOpts = { leechCapBonus, researchDurationMult };
  const state = normalizeCatabaseState(catabaseState, { upgrades, nowMs, ...fxOpts });
  const owned = new Set((Array.isArray(upgrades) ? upgrades : []).map((id) => String(id)));
  if (state.stage < 3 && !owned.has('pacto_primordial')) {
    return { ok: false, reason: 'requires_stage_3', state };
  }
  const cost = free ? '0' : calculatePledgeCost(state.pledgesCount);
  if (!free && cmp(souls, cost) < 0) {
    return { ok: false, reason: 'insufficient_souls', cost, state };
  }

  const popped = popAllLeeches(state, {
    upgrades,
    nowMs,
    leechCapBonus,
    leechPayoutMult,
    researchDurationMult,
  });
  const pledgeExpiresAt = Math.floor(Number(nowMs) || Date.now()) + CATABASE_CONFIG.pledgeDurationSec * 1000;

  return {
    ok: true,
    cost: money(cost),
    poppedCount: popped.poppedCount,
    totalPayout: popped.totalPayout,
    pledgeExpiresAt,
    state: {
      ...popped.state,
      pledgeExpiresAt,
      pledgesCount: state.pledgesCount + 1,
    },
  };
}

/**
 * Alterna a Aliança Eterna (*Elder Covenant*): ativa ou revoga o pacto permanente (−5% SPS global).
 * Ao ativar, estoura todas as Sanguessugas ativas.
 */
export function setElderCovenant(catabaseState = {}, active = true, {
  upgrades = [],
  nowMs = Date.now(),
  leechCapBonus = 0,
  leechPayoutMult = '1',
  researchDurationMult = '1',
} = {}) {
  const fxOpts = { leechCapBonus, researchDurationMult };
  const state = normalizeCatabaseState(catabaseState, { upgrades, nowMs, ...fxOpts });
  const owned = new Set((Array.isArray(upgrades) ? upgrades : []).map((id) => String(id)));
  if (state.stage < 3 && !owned.has('pacto_primordial')) {
    return { ok: false, reason: 'requires_stage_3', state };
  }
  const nextActive = Boolean(active);
  if (nextActive) {
    const popped = popAllLeeches(state, {
      upgrades,
      nowMs,
      leechCapBonus,
      leechPayoutMult,
      researchDurationMult,
    });
    const wasActive = Boolean(state.covenantActive);
    return {
      ok: true,
      covenantActive: true,
      poppedCount: popped.poppedCount,
      totalPayout: popped.totalPayout,
      state: {
        ...popped.state,
        covenantActive: true,
        pledgeExpiresAt: null,
        covenantActivations: wasActive
          ? state.covenantActivations
          : state.covenantActivations + 1,
      },
    };
  }
  return {
    ok: true,
    covenantActive: false,
    poppedCount: 0,
    totalPayout: money('0'),
    state: {
      ...state,
      covenantActive: false,
    },
  };
}

export {
  CATABASE_STAGES,
  calculatePledgeCost,
  structuralCatabaseStageFromUpgrades,
  wrathProbabilityForStage,
};
