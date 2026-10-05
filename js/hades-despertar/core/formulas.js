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
  OFFLINE_EXTRA_HOURS_SILENCIO,
  OFFLINE_MAX_HOURS_BASE,
  OFFLINE_MAX_HOURS_TALENT,
  OFFLINE_MIN_SECONDS,
  PRESTIGE_RUN_DIVISOR,
  GOLD_MULT,
  NEGATIVO_MULT,
  STARTING_SHADE_FOLEGO,
  STARTING_SHADE_REBANHO,
  STARTING_SOULS_MARGIN,
  STARTING_SOULS_MEMORY,
  SYNC_GAIN_TOLERANCE,
  TALENT_JURAMENTO_ETERNO_MULT,
  TALENT_MNEMOSYNE_PROFUNDA_MULT,
} from '../config/constants.js';
import { GENERATOR_BY_ID, GENERATORS, getGenerator } from '../config/generators.js';
import { UPGRADE_BY_ID, UPGRADES, getUpgrade } from '../config/upgrades.js';
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

  let startingSouls = '0';
  if (owned.has('memoria_das_sombras')) startingSouls = add(startingSouls, STARTING_SOULS_MEMORY);
  if (owned.has('margem_generosa')) startingSouls = add(startingSouls, STARTING_SOULS_MARGIN);

  // Max-rule: Rebanho ⊇ Segundo Fôlego — nunca soma.
  let shadeQty = 0;
  if (owned.has('segundo_folego')) shadeQty = Math.max(shadeQty, STARTING_SHADE_FOLEGO);
  if (owned.has('rebanho_despertado')) shadeQty = Math.max(shadeQty, STARTING_SHADE_REBANHO);
  const startingGenerators = {};
  if (shadeQty > 0) startingGenerators.wandering_shade = shadeQty;

  let offlineHours = owned.has('noite_prolongada')
    ? OFFLINE_MAX_HOURS_TALENT
    : OFFLINE_MAX_HOURS_BASE;
  if (owned.has('pacto_do_silencio')) offlineHours += OFFLINE_EXTRA_HOURS_SILENCIO;

  return {
    startingSouls,
    mnemosyneMult,
    offlineHours,
    offlineEfficiency: owned.has('veu_eficiente') ? OFFLINE_EFFICIENCY_TALENT : OFFLINE_EFFICIENCY_BASE,
    kSps: owned.has('foice_ancestral') ? CLICK_K_SPS_ANCESTRAL : CLICK_K_SPS_BASE,
    generatorCostMult: owned.has('favor_de_caronte') ? GENERATOR_COST_MULT_CHARON : GENERATOR_COST_MULT_BASE,
    startingGenerators,
    richAmort: owned.has('olho_da_curva'),
    softPrestigeStyx: owned.has('eco_do_styx'),
  };
}

/**
 * Soft prestige Eco do Styx (F-D3): 1 juramento revelado elegível de menor custo.
 * Critério de revelação = loja Styx: owned || meets → para candidatos não owned, = meets.
 */
export function pickEcoDoStyxUpgrade({
  souls = '0',
  generators = {},
  upgrades = [],
} = {}) {
  const owned = new Set(
    (Array.isArray(upgrades) ? upgrades : []).map((id) => String(id)),
  );
  let best = null;
  for (const upgrade of UPGRADES) {
    if (owned.has(upgrade.id)) continue;
    if (!meetsUpgradeRequirement(upgrade, { souls, generators, upgrades })) continue;
    if (!best) {
      best = upgrade;
      continue;
    }
    const costCmp = cmp(upgrade.cost, best.cost);
    if (costCmp < 0 || (costCmp === 0 && upgrade.id < best.id)) best = upgrade;
  }
  return best?.id ?? null;
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

/** Soma fatores Styx `clickKSps` (Eco da Foice etc.) — reseta no Lethe. */
export function styxClickKSps(upgradeIds = []) {
  let k = '0';
  for (const id of upgradeIds || []) {
    const upgrade = UPGRADE_BY_ID[id];
    if (upgrade?.kind === 'clickKSps') k = add(k, upgrade.factor);
  }
  return k;
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
  shinyCounts = {},
  goldCounts = {},
} = {}) {
  let sum = '0';
  for (const def of GENERATORS) {
    const qty = Number(generators[def.id] || 0);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const upgradeMult = generatorUpgradeMult(def.id, upgrades);
    const shiny = Number(shinyCounts?.[def.id] || 0);
    const gold = Number(goldCounts?.[def.id] || 0);
    const line = lineSPS({
      qty,
      shiny,
      gold,
      baseRate: def.baseRate,
      upgradeMult,
    });
    sum = add(sum, line);
  }
  const withPrestige = mul(sum, prestigeBonus(obols, talents));
  const { spsVerdictMult } = economyEffects(talents, verdictPurchases);
  return mul(withPrestige, spsVerdictMult);
}

/**
 * SPS bruta da linha (antes de prestige / veredito).
 * `(qty - neg - gold) * u + neg * u * NEGATIVO_MULT + gold * u * GOLD_MULT`
 *
 * @param {{ qty?: number|string, shiny?: number|string, gold?: number|string, baseRate?: string|number, upgradeMult?: string|number }} opts
 */
export function lineSPS({
  qty = 0,
  shiny = 0,
  gold = 0,
  baseRate = '0',
  upgradeMult = '1',
} = {}) {
  const n = Math.max(0, Math.floor(Number(qty) || 0));
  if (n <= 0) return '0';
  let goldN = Math.max(0, Math.floor(Number(gold) || 0));
  let shinyN = Math.max(0, Math.floor(Number(shiny) || 0));
  if (goldN > n) goldN = n;
  if (shinyN > n - goldN) shinyN = n - goldN;
  const unit = mul(baseRate, upgradeMult);
  const normal = n - shinyN - goldN;
  return add(
    add(
      mul(String(normal), unit),
      mul(mul(String(shinyN), unit), NEGATIVO_MULT),
    ),
    mul(mul(String(goldN), unit), GOLD_MULT),
  );
}

/**
 * SPS efetiva de **uma** unidade (Q7 / G3.1).
 *
 * @param {{
 *   generatorId: string,
 *   upgrades?: string[],
 *   talents?: string[],
 *   obols?: string|number,
 *   verdictPurchases?: string[],
 *   shiny?: boolean,
 *   gold?: boolean,
 *   rarity?: 'normal'|'negativo'|'gold',
 * }} opts
 */
export function effectiveUnitSPS({
  generatorId,
  upgrades = [],
  talents = [],
  obols = '0',
  verdictPurchases = [],
  shiny = false,
  gold = false,
  rarity = null,
} = {}) {
  const def = getGenerator(generatorId);
  if (!def) return '0';
  const upgradeMult = generatorUpgradeMult(generatorId, upgrades);
  const unit = mul(def.baseRate, upgradeMult);
  const withPrestige = mul(unit, prestigeBonus(obols, talents));
  const { spsVerdictMult } = economyEffects(talents, verdictPurchases);
  const effective = mul(withPrestige, spsVerdictMult);
  const kind = rarity
    || (gold ? 'gold' : (shiny ? 'negativo' : 'normal'));
  if (kind === 'gold') return mul(effective, GOLD_MULT);
  if (kind === 'negativo' || kind === 'shiny') return mul(effective, NEGATIVO_MULT);
  return effective;
}

export function clickPower({
  generators = {},
  upgrades = [],
  talents = [],
  obols = '0',
  sps = null,
  verdictPurchases = [],
  shinyCounts = {},
  goldCounts = {},
} = {}) {
  const totalSps = sps == null
    ? calculateTotalSPS({
      generators,
      upgrades,
      talents,
      obols,
      verdictPurchases,
      shinyCounts,
      goldCounts,
    })
    : sps;
  const effects = economyEffects(talents, verdictPurchases);
  const clickMult = mul(clickMultiplier(upgrades), effects.clickVerdictMult);
  const kSps = add(effects.kSps, styxClickKSps(upgrades));
  // Aditivo: base×mult + kSps×SPS (evita clickMult × %SPS explodir).
  const flatPart = mul(add(CLICK_BASE, CLICK_FLAT_BASE), clickMult);
  const spsPart = mul(kSps, totalSps);
  return add(flatPart, spsPart);
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
  // 2 óbolos desta corrida → 1 essência.
  return (gain / 2n).toString();
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

export function meetsUpgradeRequirement(upgradeOrId, {
  souls = '0',
  generators = {},
  upgrades = [],
} = {}) {
  const upgrade = typeof upgradeOrId === 'string' ? getUpgrade(upgradeOrId) : upgradeOrId;
  if (!upgrade) return false;
  const req = upgrade.requires || {};
  const owned = new Set(
    (Array.isArray(upgrades) ? upgrades : []).map((id) => String(id)),
  );

  // Fase D / D1 — pré-requisitos de juramento (AND).
  if (req.upgradeId != null && req.upgradeId !== '') {
    if (!owned.has(String(req.upgradeId))) return false;
  }
  if (Array.isArray(req.allUpgradeIds) && req.allUpgradeIds.length > 0) {
    for (const id of req.allUpgradeIds) {
      if (!owned.has(String(id))) return false;
    }
  }

  if (req.generatorId) {
    if (Number(generators[req.generatorId] || 0) < Number(req.quantity || 0)) {
      return false;
    }
  }
  if (req.minSouls != null) {
    if (cmp(souls, req.minSouls) < 0) return false;
  }
  return true;
}

export {
  getGenerator,
  getUpgrade,
  getTalent,
  normalize,
  money,
};
