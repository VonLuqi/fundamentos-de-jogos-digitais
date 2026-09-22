/**
 * Validação autoritativa de O Despertar (Task 9).
 * Funções puras — testáveis sem Supabase.
 */

import {
  OFFLINE_MAX_HOURS_BASE,
  SYNC_ABSURD_GAIN_FLOOR,
  SYNC_OFFLINE_JITTER_SECONDS,
  JUDGES_REFUSED_MESSAGE,
} from '../../js/hades-despertar/config/constants.js';
import { EDU_LOG_IDS } from '../../js/hades-despertar/config/edu-logs.js';
import { GENERATORS, GENERATOR_BY_ID } from '../../js/hades-despertar/config/generators.js';
import { getTalent, TALENT_BY_ID } from '../../js/hades-despertar/config/talents.js';
import { getUpgrade, UPGRADE_BY_ID } from '../../js/hades-despertar/config/upgrades.js';
import {
  getVerdictShopItem,
  isKnownVerdictPurchase,
} from '../../js/hades-despertar/config/verdict-shop.js';
import { add, cmp, money, mul, sub } from '../../js/hades-despertar/core/decimal.js';
import {
  calculateTotalSPS,
  canPrestige,
  clickPower,
  economyEffects,
  generatorBatchCost,
  meetsUpgradeRequirement,
  prestigePreview,
  talentEffects,
  theoreticalMaxGain,
  unknownCatalogIds,
} from '../../js/hades-despertar/core/formulas.js';

const EDU_LOG_SET = new Set(EDU_LOG_IDS);

export function decimalString(value, fallback = '0.00') {
  if (value == null || value === '') return fallback;
  const raw = String(value).trim();
  const match = raw.match(/^(-?\d+)(?:\.(\d+))?$/);
  if (!match) return fallback;
  const frac = (match[2] || '').padEnd(2, '0').slice(0, 2);
  return `${match[1]}.${frac}`;
}

export function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item));
}

export function asNonNegInt(value, fallback = 0) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function normalizeGenerators(raw) {
  const src = asObject(raw);
  const out = {};
  for (const def of GENERATORS) {
    const n = Number.parseInt(src[def.id], 10);
    out[def.id] = Number.isFinite(n) && n > 0 ? n : 0;
  }
  return out;
}

export function rowToCanonical(row) {
  return {
    souls: money(decimalString(row?.souls)),
    obols: money(decimalString(row?.obols)),
    mnemosyne: money(decimalString(row?.mnemosyne)),
    lifetimeSouls: money(decimalString(row?.lifetime_souls ?? row?.lifetimeSouls)),
    runSouls: money(decimalString(row?.run_souls ?? row?.runSouls)),
    prestigeCount: Number.parseInt(row?.prestige_count ?? row?.prestigeCount, 10) || 0,
    generators: normalizeGenerators(row?.generators_state ?? row?.generators),
    upgrades: asStringArray(row?.upgrades_state ?? row?.upgrades).filter((id) => UPGRADE_BY_ID[id]),
    talents: asStringArray(row?.talents_state ?? row?.talents).filter((id) => TALENT_BY_ID[id]),
    eduLogsSeen: asStringArray(row?.edu_logs_seen ?? row?.eduLogsSeen).filter((id) => EDU_LOG_SET.has(id)),
    milestones: asObject(row?.milestones),
    verdicts: asNonNegInt(row?.verdicts),
    juizoBestStreak: asNonNegInt(row?.juizo_best_streak ?? row?.juizoBestStreak),
    juizoCurrentStreak: asNonNegInt(row?.juizo_current_streak ?? row?.juizoCurrentStreak),
    juizoMilestonesClaimed: asStringArray(
      row?.juizo_milestones_claimed ?? row?.juizoMilestonesClaimed,
    ),
    verdictPurchases: asStringArray(row?.verdict_purchases ?? row?.verdictPurchases)
      .filter((id) => isKnownVerdictPurchase(id)),
    juizoRun: row?.juizo_run ?? row?.juizoRun ?? null,
    lastSyncAt: row?.last_sync_at
      ? new Date(row.last_sync_at).toISOString()
      : (row?.lastSyncAt ? new Date(row.lastSyncAt).toISOString() : null),
  };
}

export function buildStateDto(rowOrCanonical) {
  const state = rowOrCanonical?.souls != null && rowOrCanonical?.generators
    && !rowOrCanonical?.generators_state
    ? {
      ...rowOrCanonical,
      generators: normalizeGenerators(rowOrCanonical.generators),
      upgrades: asStringArray(rowOrCanonical.upgrades),
      talents: asStringArray(rowOrCanonical.talents),
      eduLogsSeen: asStringArray(rowOrCanonical.eduLogsSeen),
      milestones: asObject(rowOrCanonical.milestones),
      souls: money(rowOrCanonical.souls),
      obols: money(rowOrCanonical.obols),
      mnemosyne: money(rowOrCanonical.mnemosyne),
      lifetimeSouls: money(rowOrCanonical.lifetimeSouls),
      runSouls: money(rowOrCanonical.runSouls),
      prestigeCount: Number(rowOrCanonical.prestigeCount) || 0,
      verdicts: asNonNegInt(rowOrCanonical.verdicts),
      juizoBestStreak: asNonNegInt(rowOrCanonical.juizoBestStreak),
      juizoCurrentStreak: asNonNegInt(rowOrCanonical.juizoCurrentStreak),
      juizoMilestonesClaimed: asStringArray(rowOrCanonical.juizoMilestonesClaimed),
      verdictPurchases: asStringArray(rowOrCanonical.verdictPurchases),
      lastSyncAt: rowOrCanonical.lastSyncAt
        || (rowOrCanonical.last_sync_at ? new Date(rowOrCanonical.last_sync_at).toISOString() : new Date().toISOString()),
    }
    : rowToCanonical(rowOrCanonical);

  const sps = money(calculateTotalSPS({
    generators: state.generators,
    upgrades: state.upgrades,
    talents: state.talents,
    obols: state.obols,
    verdictPurchases: state.verdictPurchases,
  }));
  const preview = prestigePreview(state.runSouls);

  return {
    souls: decimalString(state.souls),
    obols: decimalString(state.obols),
    mnemosyne: decimalString(state.mnemosyne),
    lifetimeSouls: decimalString(state.lifetimeSouls),
    runSouls: decimalString(state.runSouls),
    prestigeCount: state.prestigeCount,
    generators: state.generators,
    upgrades: state.upgrades,
    talents: state.talents,
    eduLogsSeen: state.eduLogsSeen,
    milestones: state.milestones,
    lastSyncAt: state.lastSyncAt || new Date().toISOString(),
    sps: decimalString(sps),
    prestigePreview: {
      obolsGain: String(preview.obolsGain),
      mnemosyneGain: String(preview.mnemosyneGain),
      unlocked: Boolean(preview.unlocked),
    },
    // Fase 7 — Juízo (server-owned; stateSync não sobrescreve)
    verdicts: asNonNegInt(state.verdicts),
    juizoBestStreak: asNonNegInt(state.juizoBestStreak),
    juizoCurrentStreak: asNonNegInt(state.juizoCurrentStreak),
    juizoMilestonesClaimed: asStringArray(state.juizoMilestonesClaimed),
    verdictPurchases: asStringArray(state.verdictPurchases),
  };
}

export function canonicalToRowPatch(state, nowIso) {
  return {
    souls: decimalString(state.souls),
    obols: decimalString(state.obols),
    mnemosyne: decimalString(state.mnemosyne),
    lifetime_souls: decimalString(state.lifetimeSouls),
    run_souls: decimalString(state.runSouls),
    prestige_count: state.prestigeCount,
    generators_state: state.generators,
    upgrades_state: state.upgrades,
    talents_state: state.talents,
    edu_logs_seen: state.eduLogsSeen,
    milestones: state.milestones,
    last_sync_at: nowIso,
    updated_at: nowIso,
  };
}

function mergeMilestones(dbMarks, clientMarks) {
  const out = { ...asObject(dbMarks) };
  const incoming = asObject(clientMarks);
  for (const [key, value] of Object.entries(incoming)) {
    if (value) out[key] = true;
  }
  return out;
}

function mergeEduLogs(dbLogs, clientLogs) {
  const seen = new Set(asStringArray(dbLogs).filter((id) => EDU_LOG_SET.has(id)));
  for (const id of asStringArray(clientLogs)) {
    if (EDU_LOG_SET.has(id)) seen.add(id);
  }
  return EDU_LOG_IDS.filter((id) => seen.has(id));
}

function computeSpend(db, client) {
  const effects = economyEffects(db.talents, db.verdictPurchases);
  let costMult = effects.generatorCostMult;
  const totalOwned = Object.values(db.generators).reduce((sum, n) => sum + (Number(n) || 0), 0);
  if (totalOwned === 0 && cmp(effects.firstGeneratorCostMult, '1') !== 0) {
    costMult = mul(costMult, effects.firstGeneratorCostMult);
  }
  let spent = '0';

  for (const def of GENERATORS) {
    const from = Number(db.generators[def.id] || 0);
    const to = Number(client.generators[def.id] || 0);
    if (to < from) {
      return { ok: false, error: 'Quantidade de gerador não pode cair no sync.' };
    }
    const delta = to - from;
    if (delta > 0) {
      spent = add(spent, generatorBatchCost(def.baseCost, from, delta, costMult));
    }
  }

  const dbUpgrades = new Set(db.upgrades);
  for (const id of client.upgrades) {
    if (dbUpgrades.has(id)) continue;
    const upgrade = getUpgrade(id);
    if (!upgrade) {
      return { ok: false, error: `Juramento desconhecido: ${id}` };
    }
    if (!meetsUpgradeRequirement(upgrade, {
      souls: client.souls,
      generators: client.generators,
    })) {
      return { ok: false, error: `Juramento sem requisito: ${id}` };
    }
    spent = add(spent, upgrade.cost);
  }

  for (const id of db.upgrades) {
    if (!client.upgrades.includes(id)) {
      return { ok: false, error: 'Juramento não pode ser removido no sync.' };
    }
  }

  return { ok: true, spent: money(spent) };
}

function deltaSecondsBetween(lastSyncAt, now, talents, verdictPurchases = []) {
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const lastMs = lastSyncAt ? new Date(lastSyncAt).getTime() : nowMs;
  if (!Number.isFinite(nowMs) || !Number.isFinite(lastMs)) return 0;
  const raw = Math.max(0, (nowMs - lastMs) / 1000);
  const { offlineHours } = economyEffects(talents, verdictPurchases);
  const ceiling = (Number(offlineHours) || OFFLINE_MAX_HOURS_BASE) * 3600 + SYNC_OFFLINE_JITTER_SECONDS;
  return Math.min(raw, ceiling);
}

/**
 * @param {object} dbRow row SQL ou canônico
 * @param {object} clientState payload do cliente
 * @param {Date|string|number} [now]
 */
export function validateSync(dbRow, clientState, now = new Date()) {
  const db = rowToCanonical(dbRow);
  const nowDate = now instanceof Date ? now : new Date(now);
  const nowIso = nowDate.toISOString();

  if (!clientState || typeof clientState !== 'object') {
    return {
      ok: false,
      status: 400,
      error: JUDGES_REFUSED_MESSAGE,
      state: buildStateDto(db),
    };
  }

  const clientLast = clientState.lastSyncAt || clientState.last_sync_at || null;
  if (clientLast && db.lastSyncAt) {
    const clientMs = new Date(clientLast).getTime();
    const dbMs = new Date(db.lastSyncAt).getTime();
    if (Number.isFinite(clientMs) && Number.isFinite(dbMs) && clientMs < dbMs - 1000) {
      return {
        ok: false,
        status: 409,
        error: 'A Estela do servidor é mais recente. Estado restaurado.',
        state: buildStateDto(db),
      };
    }
  }

  const unknown = unknownCatalogIds({
    generators: asObject(clientState.generators ?? clientState.generators_state),
    upgrades: asStringArray(clientState.upgrades ?? clientState.upgrades_state),
    talents: asStringArray(clientState.talents ?? clientState.talents_state),
  });
  if (unknown.length) {
    return {
      ok: false,
      status: 400,
      error: JUDGES_REFUSED_MESSAGE,
      state: buildStateDto(db),
      unknown,
    };
  }

  // Talentos / óbolos / essência / prestígio não mudam via stateSync.
  const client = {
    souls: money(decimalString(clientState.souls, db.souls)),
    generators: normalizeGenerators(clientState.generators ?? clientState.generators_state),
    upgrades: asStringArray(clientState.upgrades ?? clientState.upgrades_state)
      .filter((id) => UPGRADE_BY_ID[id]),
    runSouls: money(decimalString(clientState.runSouls ?? clientState.run_souls, db.runSouls)),
    lifetimeSouls: money(decimalString(
      clientState.lifetimeSouls ?? clientState.lifetime_souls,
      db.lifetimeSouls,
    )),
    eduLogsSeen: asStringArray(clientState.eduLogsSeen ?? clientState.edu_logs_seen),
    milestones: asObject(clientState.milestones),
  };

  if (cmp(client.souls, '0') < 0) {
    return {
      ok: false,
      status: 400,
      error: JUDGES_REFUSED_MESSAGE,
      state: buildStateDto(db),
    };
  }

  if (cmp(client.runSouls, db.runSouls) < 0 || cmp(client.lifetimeSouls, db.lifetimeSouls) < 0) {
    return {
      ok: false,
      status: 400,
      error: JUDGES_REFUSED_MESSAGE,
      state: buildStateDto(db),
    };
  }

  for (const id of Object.keys(asObject(clientState.generators ?? clientState.generators_state))) {
    if (!GENERATOR_BY_ID[id]) {
      return {
        ok: false,
        status: 400,
        error: JUDGES_REFUSED_MESSAGE,
        state: buildStateDto(db),
      };
    }
  }

  const spend = computeSpend(db, client);
  if (!spend.ok) {
    return {
      ok: false,
      status: 400,
      error: JUDGES_REFUSED_MESSAGE,
      state: buildStateDto(db),
      detail: spend.error,
    };
  }

  const dt = deltaSecondsBetween(db.lastSyncAt, nowDate, db.talents, db.verdictPurchases);
  const sps = calculateTotalSPS({
    generators: db.generators,
    upgrades: db.upgrades,
    talents: db.talents,
    obols: db.obols,
    verdictPurchases: db.verdictPurchases,
  });
  const power = clickPower({
    generators: db.generators,
    upgrades: db.upgrades,
    talents: db.talents,
    obols: db.obols,
    sps,
    verdictPurchases: db.verdictPurchases,
  });
  const maxGain = theoreticalMaxGain({ sps, clickPower: power, deltaSeconds: dt });

  const walletDelta = sub(client.souls, db.souls);
  const claimedGain = add(walletDelta, spend.spent);

  if (cmp(claimedGain, '0') < 0) {
    // Gastou mais do que o saldo + ganho plausível (wallet caiu além do gasto declarado).
    const available = add(db.souls, maxGain);
    if (cmp(spend.spent, available) > 0) {
      return {
        ok: false,
        status: 400,
        error: JUDGES_REFUSED_MESSAGE,
        state: buildStateDto(db),
      };
    }
  }

  const excess = sub(claimedGain, maxGain);
  if (cmp(claimedGain, maxGain) > 0 && cmp(excess, SYNC_ABSURD_GAIN_FLOOR) > 0) {
    return {
      ok: false,
      status: 400,
      error: JUDGES_REFUSED_MESSAGE,
      state: buildStateDto(db),
      maxGain: decimalString(maxGain),
      claimedGain: decimalString(claimedGain),
    };
  }

  const next = {
    ...db,
    souls: client.souls,
    generators: client.generators,
    upgrades: client.upgrades,
    runSouls: client.runSouls,
    lifetimeSouls: client.lifetimeSouls,
    eduLogsSeen: mergeEduLogs(db.eduLogsSeen, client.eduLogsSeen),
    milestones: mergeMilestones(db.milestones, client.milestones),
    lastSyncAt: nowIso,
  };

  return {
    ok: true,
    status: 200,
    state: buildStateDto(next),
    patch: canonicalToRowPatch(next, nowIso),
    next,
  };
}

export function applyPrestige(dbRow, now = new Date()) {
  const db = rowToCanonical(dbRow);
  const nowIso = (now instanceof Date ? now : new Date(now)).toISOString();
  if (!canPrestige(db.runSouls)) {
    return {
      ok: false,
      status: 400,
      error: 'O Lethe ainda não rende Óbolos.',
      state: buildStateDto(db),
    };
  }

  const preview = prestigePreview(db.runSouls);
  const effects = talentEffects(db.talents);
  const nextGenerators = normalizeGenerators({});
  if (effects.startingGenerators) {
    for (const [id, qty] of Object.entries(effects.startingGenerators)) {
      if (GENERATOR_BY_ID[id]) nextGenerators[id] = Number(qty) || 0;
    }
  }

  const startingSouls = money(effects.startingSouls || '0');
  const next = {
    ...db,
    obols: money(add(db.obols, preview.obolsGain)),
    mnemosyne: money(add(db.mnemosyne, preview.mnemosyneGain)),
    prestigeCount: db.prestigeCount + 1,
    upgrades: [],
    generators: nextGenerators,
    souls: startingSouls,
    runSouls: startingSouls,
    lastSyncAt: nowIso,
  };

  return {
    ok: true,
    status: 200,
    state: buildStateDto(next),
    patch: canonicalToRowPatch(next, nowIso),
    next,
    preview,
  };
}

export function applyTalentBuy(dbRow, talentId, now = new Date()) {
  const db = rowToCanonical(dbRow);
  const nowIso = (now instanceof Date ? now : new Date(now)).toISOString();
  const talent = getTalent(talentId);
  if (!talent) {
    return {
      ok: false,
      status: 400,
      error: 'Talento desconhecido.',
      state: buildStateDto(db),
    };
  }
  if (db.talents.includes(talent.id)) {
    return {
      ok: false,
      status: 400,
      error: 'Talento já está na memória.',
      state: buildStateDto(db),
    };
  }
  if (cmp(db.mnemosyne, talent.cost) < 0) {
    return {
      ok: false,
      status: 400,
      error: 'Essência insuficiente.',
      state: buildStateDto(db),
    };
  }

  const next = {
    ...db,
    mnemosyne: money(sub(db.mnemosyne, talent.cost)),
    talents: [...db.talents, talent.id],
    lastSyncAt: nowIso,
  };

  return {
    ok: true,
    status: 200,
    state: buildStateDto(next),
    patch: canonicalToRowPatch(next, nowIso),
    next,
  };
}

export function applyVerdictBuy(dbRow, purchaseId, now = new Date()) {
  const db = rowToCanonical(dbRow);
  const nowIso = (now instanceof Date ? now : new Date(now)).toISOString();
  const item = getVerdictShopItem(purchaseId);
  if (!item) {
    return {
      ok: false,
      status: 400,
      error: 'Item da Bancada desconhecido.',
      state: buildStateDto(db),
    };
  }
  if (db.verdictPurchases.includes(item.id)) {
    return {
      ok: false,
      status: 400,
      error: 'Item já está na Bancada.',
      state: buildStateDto(db),
    };
  }
  const cost = Math.max(0, Number.parseInt(item.cost, 10) || 0);
  if (db.verdicts < cost) {
    return {
      ok: false,
      status: 400,
      error: 'Vereditos insuficientes.',
      state: buildStateDto(db),
    };
  }

  const next = {
    ...db,
    verdicts: db.verdicts - cost,
    verdictPurchases: [...db.verdictPurchases, item.id],
    lastSyncAt: nowIso,
  };

  return {
    ok: true,
    status: 200,
    state: buildStateDto(next),
    patch: {
      ...canonicalToRowPatch(next, nowIso),
      verdicts: next.verdicts,
      verdict_purchases: next.verdictPurchases,
    },
    next,
  };
}
