/**
 * Fórmulas compartilhadas (cliente e servidor) de O Despertar.
 * Números entram e saem como string decimal.
 */

import {
  BUY_MAX_CAP,
  CLICK_BASE,
  CLICK_CAP_PER_SECOND,
  CLICK_FLAT_BASE,
  CLICK_K_SPS_ANCESTRAL,
  CLICK_K_SPS_BASE,
  CLICK_MULT_BASE,
  GENERATOR_COST_MULT_BASE,
  GENERATOR_COST_MULT_CHARON,
  MNEMOSYNE_MULT_BASE,
  OBOL_BONUS_PER,
  OFFLINE_EFFICIENCY_BASE,
  OFFLINE_EFFICIENCY_TALENT,
  OFFLINE_MAX_HOURS_BASE,
  OFFLINE_MAX_HOURS_TALENT,
  OFFLINE_MIN_SECONDS,
  PRESTIGE_RUN_DIVISOR,
  STARTING_SOULS_MEMORY,
  SYNC_GAIN_TOLERANCE,
  TALENT_JURAMENTO_ETERNO_MULT,
  TALENT_MNEMOSYNE_PROFUNDA_MULT,
} from '../config/constants.js';
import { GENERATOR_BY_ID, GENERATORS, getGenerator } from '../config/generators.js';
import { UPGRADE_BY_ID, getUpgrade } from '../config/upgrades.js';
import { TALENT_BY_ID, getTalent } from '../config/talents.js';
import { VERDICT_SHOP_BY_ID, isKnownVerdictPurchase } from '../config/verdict-shop.js';
import {
  add,
  cmp,
  div,
  floorSqrtRatio,
  geometricSum115,
  isZero,
  money,
  mul,
  mulPow115,
  normalize,
  toBigIntFloor,
  toScaled,
} from './decimal.js';

export function generatorPriceAt(baseCost, owned, costMult = GENERATOR_COST_MULT_BASE) {
  return money(mulPow115(baseCost, owned, costMult));
}

export function generatorBatchCost(baseCost, owned, count, costMult = GENERATOR_COST_MULT_BASE) {
  const safeCount = Math.max(0, Math.floor(Number(count) || 0));
  if (safeCount <= 0) return money('0');
  return money(geometricSum115(baseCost, owned, safeCount, costMult));
}

/**
 * Máximo de unidades (≤ BUY_MAX_CAP) cuja soma geométrica cabe na carteira.
 * Busca binária — não itera 10k compras.
 */
export function maxAffordableCount(baseCost, owned, wallet, costMult = GENERATOR_COST_MULT_BASE) {
  if (cmp(wallet, '0') <= 0) return 0;
  const first = generatorPriceAt(baseCost, owned, costMult);
  if (cmp(wallet, first) < 0) return 0;

  let lo = 1;
  let hi = BUY_MAX_CAP;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    const cost = generatorBatchCost(baseCost, owned, mid, costMult);
    if (cmp(wallet, cost) >= 0) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export function talentEffects(talentIds = []) {
  const owned = new Set((talentIds || []).filter((id) => TALENT_BY_ID[id]));
  let mnemosyneMult = MNEMOSYNE_MULT_BASE;
  if (owned.has('juramento_eterno')) mnemosyneMult = mul(mnemosyneMult, TALENT_JURAMENTO_ETERNO_MULT);
  if (owned.has('mnemosyne_profunda')) mnemosyneMult = mul(mnemosyneMult, TALENT_MNEMOSYNE_PROFUNDA_MULT);

  const startingGenerators = {};
  if (owned.has('segundo_folego')) startingGenerators.wandering_shade = 1;

  return {
    startingSouls: owned.has('memoria_das_sombras') ? STARTING_SOULS_MEMORY : '0',
    mnemosyneMult,
    offlineHours: owned.has('noite_prolongada') ? OFFLINE_MAX_HOURS_TALENT : OFFLINE_MAX_HOURS_BASE,
    offlineEfficiency: owned.has('veu_eficiente') ? OFFLINE_EFFICIENCY_TALENT : OFFLINE_EFFICIENCY_BASE,
    kSps: owned.has('foice_ancestral') ? CLICK_K_SPS_ANCESTRAL : CLICK_K_SPS_BASE,
    generatorCostMult: owned.has('favor_de_caronte') ? GENERATOR_COST_MULT_CHARON : GENERATOR_COST_MULT_BASE,
    startingGenerators,
  };
}

/** Efeitos da Bancada (Vereditos) — permanentes, fora do Panteão. */
export function verdictEffects(verdictPurchases = []) {
  const owned = new Set(
    (verdictPurchases || []).filter((id) => isKnownVerdictPurchase(id)),
  );
  let clickMult = '1';
  let spsMult = '1';
  let offlineExtraHours = 0;
  let firstGeneratorCostMult = '1';
  for (const id of owned) {
    const item = VERDICT_SHOP_BY_ID[id];
    if (!item?.effects) continue;
    if (item.effects.clickMult) clickMult = mul(clickMult, item.effects.clickMult);
    if (item.effects.spsMult) spsMult = mul(spsMult, item.effects.spsMult);
    if (item.effects.offlineExtraHours) {
      offlineExtraHours += Number(item.effects.offlineExtraHours) || 0;
    }
    if (item.effects.firstGeneratorCostMult) {
      firstGeneratorCostMult = mul(firstGeneratorCostMult, item.effects.firstGeneratorCostMult);
    }
  }
  return {
    clickMult,
    spsMult,
    offlineExtraHours,
    firstGeneratorCostMult,
  };
}

export function economyEffects(talents = [], verdictPurchases = []) {
  const t = talentEffects(talents);
  const v = verdictEffects(verdictPurchases);
  return {
    ...t,
    offlineHours: Number(t.offlineHours) + Number(v.offlineExtraHours || 0),
    clickVerdictMult: v.clickMult,
    spsVerdictMult: v.spsMult,
    firstGeneratorCostMult: v.firstGeneratorCostMult,
  };
}

export function generatorUpgradeMult(generatorId, upgradeIds = []) {
  let mult = '1';
  for (const id of upgradeIds || []) {
    const upgrade = UPGRADE_BY_ID[id];
    if (!upgrade) continue;
    if (upgrade.kind === 'generatorMult' && upgrade.generatorId === generatorId) {
      mult = mul(mult, upgrade.factor);
    } else if (upgrade.kind === 'allGeneratorsMult') {
      mult = mul(mult, upgrade.factor);
    }
  }
  return mult;
}

export function clickMultiplier(upgradeIds = []) {
  let mult = CLICK_MULT_BASE;
  for (const id of upgradeIds || []) {
    const upgrade = UPGRADE_BY_ID[id];
    if (upgrade?.kind === 'clickMult') mult = mul(mult, upgrade.factor);
  }
  return mult;
}

export function prestigeBonus(obols, talentIds = []) {
  const { mnemosyneMult } = talentEffects(talentIds);
  return add('1', mul(mul(obols || '0', OBOL_BONUS_PER), mnemosyneMult));
}

export function calculateTotalSPS({
  generators = {},
  upgrades = [],
  talents = [],
  obols = '0',
  verdictPurchases = [],
} = {}) {
  let sum = '0';
  for (const def of GENERATORS) {
    const qty = Number(generators[def.id] || 0);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const upgradeMult = generatorUpgradeMult(def.id, upgrades);
    const line = mul(mul(String(qty), def.baseRate), upgradeMult);
    sum = add(sum, line);
  }
  const withPrestige = mul(sum, prestigeBonus(obols, talents));
  const { spsVerdictMult } = economyEffects(talents, verdictPurchases);
  return mul(withPrestige, spsVerdictMult);
}

export function clickPower({
  generators = {},
  upgrades = [],
  talents = [],
  obols = '0',
  sps = null,
  verdictPurchases = [],
} = {}) {
  const totalSps = sps == null
    ? calculateTotalSPS({ generators, upgrades, talents, obols, verdictPurchases })
    : sps;
  const effects = economyEffects(talents, verdictPurchases);
  const clickMult = mul(clickMultiplier(upgrades), effects.clickVerdictMult);
  const spsTerm = add('1', mul(effects.kSps, totalSps));
  return mul(mul(add(CLICK_BASE, CLICK_FLAT_BASE), clickMult), spsTerm);
}

export function obolsFromRunSouls(runSouls) {
  const p = toScaled(runSouls || '0');
  const q = toScaled(PRESTIGE_RUN_DIVISOR);
  if (p <= 0n || q <= 0n) return '0';
  return floorSqrtRatio(p, q).toString();
}

export function mnemosyneFromObolsGain(obolsGain) {
  const gain = toBigIntFloor(obolsGain || '0');
  if (gain <= 0n) return '0';
  return (1n + gain / 10n).toString();
}

export function canPrestige(runSouls) {
  return cmp(obolsFromRunSouls(runSouls), '0') > 0;
}

export function prestigePreview(runSouls) {
  const obolsGain = obolsFromRunSouls(runSouls);
  const unlocked = cmp(obolsGain, '0') > 0;
  return {
    obolsGain,
    mnemosyneGain: unlocked ? mnemosyneFromObolsGain(obolsGain) : '0',
    unlocked,
  };
}

export function calculateOfflineProgress({
  elapsedSeconds = 0,
  sps = '0',
  talents = [],
  verdictPurchases = [],
} = {}) {
  const elapsed = Number(elapsedSeconds);
  if (!Number.isFinite(elapsed) || elapsed < OFFLINE_MIN_SECONDS) {
    return {
      offlineSouls: money('0'),
      effectiveSeconds: 0,
      cappedOut: false,
      ignored: true,
    };
  }

  const { offlineHours, offlineEfficiency } = economyEffects(talents, verdictPurchases);
  const maxAllowedSeconds = offlineHours * 3600;
  const effectiveSeconds = Math.min(elapsed, maxAllowedSeconds);
  const offlineSouls = mul(mul(String(effectiveSeconds), sps), offlineEfficiency);

  return {
    offlineSouls: money(offlineSouls),
    effectiveSeconds,
    cappedOut: elapsed > maxAllowedSeconds,
    ignored: false,
  };
}

export function amortizationSeconds(price, marginalSps) {
  if (isZero(marginalSps) || cmp(marginalSps, '0') <= 0) return null;
  return div(price, marginalSps);
}

export function theoreticalMaxGain({ sps = '0', clickPower: power = '1', deltaSeconds = 0 } = {}) {
  const dt = Number(deltaSeconds);
  const safeDt = Number.isFinite(dt) && dt > 0 ? String(dt) : '0';
  const maxClicks = mul(String(CLICK_CAP_PER_SECOND), safeDt);
  const fromSps = mul(sps, safeDt);
  const fromClicks = mul(power, maxClicks);
  return mul(add(fromSps, fromClicks), SYNC_GAIN_TOLERANCE);
}

export function unknownCatalogIds({ generators = {}, upgrades = [], talents = [] } = {}) {
  const unknown = [];
  for (const id of Object.keys(generators || {})) {
    if (!GENERATOR_BY_ID[id]) unknown.push(id);
  }
  for (const id of upgrades || []) {
    if (!UPGRADE_BY_ID[id]) unknown.push(id);
  }
  for (const id of talents || []) {
    if (!TALENT_BY_ID[id]) unknown.push(id);
  }
  return unknown;
}

export function meetsUpgradeRequirement(upgradeOrId, { souls = '0', generators = {} } = {}) {
  const upgrade = typeof upgradeOrId === 'string' ? getUpgrade(upgradeOrId) : upgradeOrId;
  if (!upgrade) return false;
  const req = upgrade.requires || {};
  if (req.generatorId) {
    return Number(generators[req.generatorId] || 0) >= Number(req.quantity || 0);
  }
  if (req.minSouls != null) return cmp(souls, req.minSouls) >= 0;
  return true;
}

export {
  getGenerator,
  getUpgrade,
  getTalent,
  normalize,
  money,
};
