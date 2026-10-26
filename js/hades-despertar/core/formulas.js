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
  STARTING_FORGE_DESPERTADA,
  STARTING_HOUND_MATILHA,
  STARTING_SHADE_FOLEGO,
  STARTING_SHADE_REBANHO,
  STARTING_SOULS_MARGIN,
  STARTING_SOULS_MEMORY,
  SYNC_GAIN_TOLERANCE,
  TALENT_CALICE_MNEMOSYNE_DEN,
  TALENT_CALICE_MNEMOSYNE_NUM,
  TALENT_JURAMENTO_ETERNO_MULT,
  TALENT_MNEMOSYNE_PROFUNDA_MULT,
  TALENT_MNEMOSYNE_TRIPLA_MULT,
  ECO_STYX_RESSONANTE_COUNT,
  SHIMMER_BUILDING_SPECIAL_MAX_MULT,
  SHIMMER_LUCKY_FLAT_BONUS,
  SHIMMER_LUCKY_SPS_SECONDS,
  SHIMMER_LUCKY_WALLET_FRACTION,
  NECTAR_LEVEL_BONUS_PER,
  NECTAR_RESERVE_BONUS_PER,
  NECTAR_RESERVE_CAP,
  VEIL_PER_ACHIEVEMENT,
  VEIL_PERCENT_PER_ACHIEVEMENT,
  CATABASE_COVENANT_SPS_MULT,
  CATABASE_STAGE3_ELDER_PACT_PER_NON_SERVANT,
  LEECH_DRAIN_PER_UNIT,
  LEECH_MAX_CAP,
  GENERATOR_SELL_REFUND_BASE,
  GENERATOR_SELL_REFUND_EARTH_SHATTERER,
  DRAGON_SCALE_SPS_MULT,
  FORTUNE_100_COST_MULT,
  FORTUNE_100_SPS_MULT,
  FORTUNE_101_SPS_MULT,
  FORTUNE_101_UPGRADE_COST_MULT,
  FORTUNE_102_OBOL_MULT,
  FORTUNE_LINE_COST_MULT,
  PRESTIGE_CUBIC_DIVISOR,
} from '../config/constants.js';
import {
  isNormalAchievementId,
  veilTierForPercent,
} from '../config/achievements.js';
import { calculateLeechDrain } from './CatabaseSystem.js';
import { dragonModifiers } from './DragonSystem.js';
import { seasonModifiers } from './SeasonSystem.js';
import { FORTUNE_BY_GENERATOR_ID, FORTUNES } from '../config/fortunes.js';
import { ALL_SEASONAL_DROP_UPGRADE_IDS } from '../config/seasons.js';
import { GENERATOR_BY_ID, GENERATORS, getGenerator } from '../config/generators.js';
import { MINIGAME_UNLOCK_GENERATORS } from '../config/minigames.js';
import { SHIMMER_BY_ID } from '../config/shimmers.js';
import { UPGRADE_BY_ID, UPGRADES, getUpgrade } from '../config/upgrades.js';
import { TALENT_BY_ID, getTalent } from '../config/talents.js';
import { VERDICT_SHOP_BY_ID, isKnownVerdictPurchase } from '../config/verdict-shop.js';
import { pantheonModifiers } from './minigames/PantheonSystem.js';
import { gardenModifiers } from './minigames/GardenSystem.js';
import {
  add,
  cmp,
  div,
  floorCbrtRatio,
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
 * Fase F8 — Reembolso exato ao vender `count` unidades quando se possui `owned` unidades:
 * Referência = custo das unidades `owned - count` até `owned - 1`, multiplicado por `refundRate`
 * (`0.25` base, ou `0.50` com a aura `abalo_do_tartaro` / *Earth Shatterer*).
 */
export function generatorSellRefund(
  baseCost,
  owned,
  count,
  costMult = GENERATOR_COST_MULT_BASE,
  refundRate = GENERATOR_SELL_REFUND_BASE,
) {
  const currentOwned = Math.max(0, Math.floor(Number(owned) || 0));
  const safeCount = Math.min(currentOwned, Math.max(0, Math.floor(Number(count) || 0)));
  if (safeCount <= 0 || currentOwned <= 0) return money('0');
  const startOwned = currentOwned - safeCount;
  const referenceBatchCost = generatorBatchCost(baseCost, startOwned, safeCount, costMult);
  return money(mul(referenceBatchCost, refundRate || GENERATOR_SELL_REFUND_BASE));
}

/**
 * Fase F8 — Multiplicador de custo específico de um gerador considerando:
 * - `baseCostMult` (Favor de Caronte / 1ª unidade)
 * - `fortune_100` (−1% em todos os geradores)
 * - `fortune_gen_${generatorId}` (−7% na linha)
 * - Rei Saturno (−1% por nível até −5%) e `contrato_de_hermes` (−2%)
 */
export function generatorCostMultForId(generatorId, {
  baseCostMult = GENERATOR_COST_MULT_BASE,
  upgrades = [],
  seasons = null,
} = {}) {
  const owned = new Set((Array.isArray(upgrades) ? upgrades : []).map((u) => String(u)));
  let mult = String(baseCostMult || GENERATOR_COST_MULT_BASE);
  if (owned.has('fortune_100')) {
    mult = mul(mult, FORTUNE_100_COST_MULT);
  }
  const lineFortune = FORTUNE_BY_GENERATOR_ID[String(generatorId || '')];
  if (lineFortune && owned.has(lineFortune.id)) {
    mult = mul(mult, FORTUNE_LINE_COST_MULT);
  }
  const sMods = seasonModifiers(seasons || {}, upgrades);
  if (cmp(sMods.generatorCostMult, '1') !== 0) {
    mult = mul(mult, sMods.generatorCostMult);
  }
  return mult;
}

/**
 * Fase F8 — Custo efetivo de um juramento do Styx após descontos de `fortune_101` (−7%)
 * e Rei Saturno (−1% por nível).
 */
export function upgradeEffectiveCost(upgradeOrCost, {
  upgrades = [],
  seasons = null,
} = {}) {
  const baseCost = typeof upgradeOrCost === 'object' && upgradeOrCost !== null
    ? String(upgradeOrCost.cost ?? '0')
    : String(upgradeOrCost ?? '0');
  const owned = new Set((Array.isArray(upgrades) ? upgrades : []).map((u) => String(u)));
  let mult = '1';
  if (owned.has('fortune_101')) {
    mult = mul(mult, FORTUNE_101_UPGRADE_COST_MULT);
  }
  const sMods = seasonModifiers(seasons || {}, upgrades);
  if (cmp(sMods.upgradeCostMult, '1') !== 0) {
    mult = mul(mult, sMods.upgradeCostMult);
  }
  if (cmp(mult, '1') === 0) return money(baseCost);
  return money(mul(baseCost, mult));
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
  if (owned.has('mnemosyne_tripla')) mnemosyneMult = mul(mnemosyneMult, TALENT_MNEMOSYNE_TRIPLA_MULT);

  let startingSouls = '0';
  if (owned.has('memoria_das_sombras')) startingSouls = add(startingSouls, STARTING_SOULS_MEMORY);
  if (owned.has('margem_generosa')) startingSouls = add(startingSouls, STARTING_SOULS_MARGIN);

  // Max-rule: Rebanho ⊇ Segundo Fôlego — nunca soma.
  let shadeQty = 0;
  if (owned.has('segundo_folego')) shadeQty = Math.max(shadeQty, STARTING_SHADE_FOLEGO);
  if (owned.has('rebanho_despertado')) shadeQty = Math.max(shadeQty, STARTING_SHADE_REBANHO);
  const startingGenerators = {};
  if (shadeQty > 0) startingGenerators.wandering_shade = shadeQty;
  if (owned.has('matilha_cerberiana')) {
    startingGenerators.cerberian_hound = Math.max(
      Number(startingGenerators.cerberian_hound) || 0,
      STARTING_HOUND_MATILHA,
    );
  }
  if (owned.has('forja_despertada')) {
    startingGenerators.phlegethon_forge = Math.max(
      Number(startingGenerators.phlegethon_forge) || 0,
      STARTING_FORGE_DESPERTADA,
    );
  }

  let offlineHours = owned.has('noite_prolongada')
    ? OFFLINE_MAX_HOURS_TALENT
    : OFFLINE_MAX_HOURS_BASE;
  if (owned.has('pacto_do_silencio')) offlineHours += OFFLINE_EXTRA_HOURS_SILENCIO;

  // Eco do Styx I..V (max-rule no contador).
  let softPrestigeStyxCount = 0;
  if (owned.has('eco_do_styx')) softPrestigeStyxCount = Math.max(softPrestigeStyxCount, 1);
  if (owned.has('eco_ressonante')) {
    softPrestigeStyxCount = Math.max(softPrestigeStyxCount, ECO_STYX_RESSONANTE_COUNT);
  }
  if (owned.has('eco_ancestral_iii')) softPrestigeStyxCount = Math.max(softPrestigeStyxCount, 3);
  if (owned.has('eco_ancestral_iv')) softPrestigeStyxCount = Math.max(softPrestigeStyxCount, 4);
  if (owned.has('eco_ancestral_v')) softPrestigeStyxCount = Math.max(softPrestigeStyxCount, 5);

  return {
    startingSouls,
    mnemosyneMult,
    offlineHours,
    offlineEfficiency: owned.has('veu_eficiente') ? OFFLINE_EFFICIENCY_TALENT : OFFLINE_EFFICIENCY_BASE,
    kSps: owned.has('foice_ancestral') ? CLICK_K_SPS_ANCESTRAL : CLICK_K_SPS_BASE,
    generatorCostMult: owned.has('favor_de_caronte') ? GENERATOR_COST_MULT_CHARON : GENERATOR_COST_MULT_BASE,
    startingGenerators,
    richAmort: owned.has('olho_da_curva'),
    softPrestigeStyx: softPrestigeStyxCount > 0,
    softPrestigeStyxCount,
    mnemosyneGainBoost: owned.has('calice_da_memoria'),
    nectarReserveBonus: owned.has('nectar_em_reserva'),
    nectarFrenzyUnlock: owned.has('frenesi_de_nectar_talento'),
    dragonUnlock: owned.has('ovo_primordial'),
    seasonSwitcherUnlock: owned.has('rodizio_das_estacoes'),
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

/** Eco Ressonante: N juramentos revelados, cada um o mais barato ainda elegível. */
export function pickEcoDoStyxUpgrades(count, ctx = {}) {
  const n = Math.max(0, Number.parseInt(count, 10) || 0);
  const picked = [];
  const upgrades = [...(Array.isArray(ctx.upgrades) ? ctx.upgrades : [])];
  for (let i = 0; i < n; i += 1) {
    const id = pickEcoDoStyxUpgrade({
      souls: ctx.souls,
      generators: ctx.generators,
      upgrades,
    });
    if (!id) break;
    picked.push(id);
    upgrades.push(id);
  }
  return picked;
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

export function nonShadeGeneratorsCount(generators = {}) {
  let count = 0;
  for (const def of GENERATORS) {
    if (def.id === 'wandering_shade') continue;
    const qty = Math.max(0, Math.floor(Number(generators?.[def.id] || 0)));
    count += qty;
  }
  return count;
}

export function thousandBladesBonusPerUnit(upgradeIds = [], generators = {}) {
  let basePerBuilding = '0';
  let mult = '1';
  for (const id of upgradeIds || []) {
    const upgrade = UPGRADE_BY_ID[id];
    if (!upgrade) continue;
    if (upgrade.kind === 'thousandBlades') {
      basePerBuilding = add(basePerBuilding, upgrade.factor);
    } else if (upgrade.kind === 'thousandBladesMult') {
      mult = mul(mult, upgrade.factor);
    }
  }
  if (cmp(basePerBuilding, '0') <= 0) return '0';
  const nonShadeQty = nonShadeGeneratorsCount(generators);
  if (nonShadeQty <= 0) return '0';
  const perBuilding = mul(basePerBuilding, mult);
  return mul(perBuilding, String(nonShadeQty));
}

export const nonShadeBonus = thousandBladesBonusPerUnit;

export function synergyUpgradeMult(generatorId, upgradeIds = [], generators = {}) {
  let mult = '1';
  for (const id of upgradeIds || []) {
    const upgrade = UPGRADE_BY_ID[id];
    if (!upgrade || upgrade.kind !== 'synergyMult') continue;
    if (upgrade.boostedGeneratorId === generatorId) {
      const baseQty = Math.max(0, Math.floor(Number(generators?.[upgrade.baseGeneratorId] || 0)));
      const bonus = mul(upgrade.boostedBonusPerBase || '0.05', String(baseQty));
      mult = mul(mult, add('1', bonus));
    } else if (upgrade.baseGeneratorId === generatorId) {
      const boostedQty = Math.max(0, Math.floor(Number(generators?.[upgrade.boostedGeneratorId] || 0)));
      const bonus = mul(upgrade.baseBonusPerBoosted || '0.001', String(boostedQty));
      mult = mul(mult, add('1', bonus));
    }
  }
  return mult;
}

export function nonServantGeneratorsCount(generators = {}) {
  let count = 0;
  for (const def of GENERATORS) {
    if (def.id === 'charon_servants') continue;
    const qty = Math.max(0, Math.floor(Number(generators?.[def.id] || 0)));
    count += qty;
  }
  return count;
}

/**
 * Fase F6 — Bônus base aditivo por unidade em `charon_servants` quando `pacto_primordial` (Elder Pact) está ativo:
 * `+0.05` por cada unidade de gerador não-Servo.
 */
export function elderPactServantFlatBonusPerUnit(upgradeIds = [], generators = {}) {
  const owned = new Set((Array.isArray(upgradeIds) ? upgradeIds : []).map((id) => String(id)));
  if (!owned.has('pacto_primordial')) return '0';
  const nonServantQty = nonServantGeneratorsCount(generators);
  if (nonServantQty <= 0) return '0';
  return mul(CATABASE_STAGE3_ELDER_PACT_PER_NON_SERVANT, String(nonServantQty));
}

export function generatorUpgradeMult(generatorId, upgradeIds = [], generators = {}) {
  let mult = '1';
  for (const id of upgradeIds || []) {
    const upgrade = UPGRADE_BY_ID[id];
    if (!upgrade) continue;
    if (upgrade.kind === 'generatorMult' && upgrade.generatorId === generatorId) {
      mult = mul(mult, upgrade.factor);
    } else if (upgrade.kind === 'fortuneLine' && upgrade.generatorId === generatorId) {
      mult = mul(mult, upgrade.factor);
    } else if (upgrade.kind === 'catabaseResearch' && upgrade.generatorId === generatorId && upgrade.generatorFactor) {
      mult = mul(mult, upgrade.generatorFactor);
    } else if (upgrade.kind === 'allGeneratorsMult') {
      mult = mul(mult, upgrade.factor);
    }
  }
  return mul(mult, synergyUpgradeMult(generatorId, upgradeIds, generators));
}

/**
 * Fase F8 — Produtório composto das Relíquias Sazonais (Antestéria, Lemúria, Saturnália):
 * `∏ (1 + r_i)` sobre todos os upgrades `seasonalCompound` selados.
 */
export function seasonalCompoundMult(upgradeIds = []) {
  let mult = '1';
  const seen = new Set();
  for (const rawId of upgradeIds || []) {
    const id = String(rawId || '');
    if (!id || seen.has(id)) continue;
    const upgrade = UPGRADE_BY_ID[id];
    if (upgrade?.kind === 'seasonalCompound' && upgrade.factor) {
      seen.add(id);
      mult = mul(mult, add('1', upgrade.factor));
    }
  }
  return mult;
}

/**
 * Fase F8 — Multiplicador global de Saturnália (Rei Saturno níveis 1..5 + `bencao_do_rei_saturno`).
 */
export function saturnaliaSpsMult(seasons = null, upgradeIds = []) {
  return seasonModifiers(seasons || {}, upgradeIds).saturnaliaSpsMult;
}

/**
 * Fase F8 — Multiplicador global das Fortunas #100 (+1%) e #101 (+7%).
 */
export function fortuneGlobalSpsMult(upgradeIds = []) {
  let mult = '1';
  const owned = new Set((Array.isArray(upgradeIds) ? upgradeIds : []).map((u) => String(u)));
  if (owned.has('fortune_100')) mult = mul(mult, FORTUNE_100_SPS_MULT);
  if (owned.has('fortune_101')) mult = mul(mult, FORTUNE_101_SPS_MULT);
  return mult;
}

/**
 * Fase F8 — Multiplicador da Escama de Ladão (`escama_de_ladao`: +3% SPS global).
 */
export function dragonScaleSpsMult(upgradeIds = []) {
  const owned = new Set((Array.isArray(upgradeIds) ? upgradeIds : []).map((u) => String(u)));
  return owned.has('escama_de_ladao') ? DRAGON_SCALE_SPS_MULT : '1';
}

/**
 * Fase F8 — Multiplicador de SPS das Auras do Dragão (`apetite_radiante`: ×2.0).
 */
export function dragonAuraSpsMult(dragon = null) {
  return dragonModifiers(dragon || {}).spsMult;
}

/**
 * Fase F8 — Multiplicador de Clique das Auras do Dragão (`cursor_ancestral`: ×1.05).
 */
export function dragonAuraClickMult(dragon = null) {
  return dragonModifiers(dragon || {}).clickMult;
}

/**
 * Fase F6 — Produtório dos upgrades de pesquisa da Catábase (+1% a +5% SPS global independentes).
 */
export function catabaseResearchSpsMult(upgradeIds = []) {
  let mult = '1';
  const seen = new Set();
  for (const rawId of upgradeIds || []) {
    const id = String(rawId || '');
    if (!id || seen.has(id)) continue;
    const upgrade = UPGRADE_BY_ID[id];
    if (upgrade?.kind === 'catabaseResearch' && upgrade.factor) {
      seen.add(id);
      mult = mul(mult, upgrade.factor);
    }
  }
  return mult;
}

/**
 * Fase F6 — Penalidade de −5% SPS global (`×0.95`) quando a Aliança Eterna (*Elder Covenant*) está ativa.
 */
export function elderCovenantMult(covenantActive = false) {
  return covenantActive ? CATABASE_COVENANT_SPS_MULT : '1';
}

/**
 * Fase F6 — Multiplicador aparente de SPS após dreno das Sanguessugas (`1 - count * 0.05`).
 */
export function leechApparentMult(leechesOrCount = 0) {
  return calculateLeechDrain(leechesOrCount).apparentMult;
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

function iterActiveBuffEntries(activeBuffs) {
  if (!activeBuffs) return [];
  if (Array.isArray(activeBuffs)) return activeBuffs.filter((b) => b && typeof b === 'object');
  if (typeof activeBuffs === 'object') {
    return Object.entries(activeBuffs).map(([key, val]) => {
      if (!val || typeof val !== 'object') return null;
      return { id: val.id || key, ...val };
    }).filter(Boolean);
  }
  return [];
}

function isBuffActiveAt(buff, nowMs) {
  if (!buff || typeof buff !== 'object') return false;
  if (nowMs == null) return true;
  const now = Number(nowMs);
  if (!Number.isFinite(now)) return true;
  const exp = Number(buff.expiresAt);
  if (!Number.isFinite(exp)) return false;
  return exp > now;
}

/**
 * Calcula o multiplicador `(N/10 + 1)` para `selo_juizo` (Building Special),
 * limitado a `[1, SHIMMER_BUILDING_SPECIAL_MAX_MULT]`.
 */
export function buildingSpecialMultFromQty(qty = 0) {
  const n = Math.max(0, Math.floor(Number(qty) || 0));
  if (n <= 0) return '1';
  const raw = add(div(String(n), '10'), '1');
  if (cmp(raw, SHIMMER_BUILDING_SPECIAL_MAX_MULT) > 0) {
    return SHIMMER_BUILDING_SPECIAL_MAX_MULT;
  }
  return raw;
}

/**
 * Produto dos buffs de SPS ativos no topo do stack (`mare_acheron`, `clot_acheron`,
 * `elder_frenzy_acheron`, `selo_juizo`). Deduplica por `id`.
 */
export function activeSpsBuffMult(activeBuffs = {}, nowMs = null) {
  let mult = '1';
  const seen = new Set();
  for (const buff of iterActiveBuffEntries(activeBuffs)) {
    const id = String(buff.id ?? '');
    if (!id || seen.has(id)) continue;
    const def = SHIMMER_BY_ID[id];
    if (!def || !isBuffActiveAt(buff, nowMs)) continue;
    if (def.kind === 'spsBuff') {
      seen.add(id);
      mult = mul(mult, def.factor);
    } else if (def.kind === 'buildingSpecial') {
      seen.add(id);
      const rawMult = buff.mult != null ? String(buff.mult) : '1';
      let clamped = cmp(rawMult, '1') >= 0 ? rawMult : '1';
      if (cmp(clamped, SHIMMER_BUILDING_SPECIAL_MAX_MULT) > 0) {
        clamped = SHIMMER_BUILDING_SPECIAL_MAX_MULT;
      }
      mult = mul(mult, clamped);
    }
  }
  return mult;
}

/**
 * Produto dos buffs de clique ativos (`furia_foice`). Deduplica por `id`.
 */
export function activeClickBuffMult(activeBuffs = {}, nowMs = null) {
  let mult = '1';
  const seen = new Set();
  for (const buff of iterActiveBuffEntries(activeBuffs)) {
    const id = String(buff.id ?? '');
    if (!id || seen.has(id)) continue;
    const def = SHIMMER_BY_ID[id];
    if (!def || def.kind !== 'clickBuff' || !isBuffActiveAt(buff, nowMs)) continue;
    seen.add(id);
    mult = mul(mult, def.factor);
  }
  return mult;
}

/**
 * Recompensa instantânea da *Colheita do Acheron* (paridade *Lucky*):
 * `min(15% da carteira atual, 15 min de SPS atual) + 13`.
 */
export function calculateLuckyReward({ souls = '0', sps = '0' } = {}) {
  const walletCap = mul(souls || '0', SHIMMER_LUCKY_WALLET_FRACTION);
  const spsCap = mul(sps || '0', SHIMMER_LUCKY_SPS_SECONDS);
  const core = cmp(walletCap, spsCap) <= 0 ? walletCap : spsCap;
  const safeCore = cmp(core, '0') > 0 ? core : '0';
  return money(add(safeCore, SHIMMER_LUCKY_FLAT_BONUS));
}

/**
 * Multiplicador de nível de gerador (Fase F5 — Sugar Lumps): `1 + 0.01 * level`.
 */
export function generatorLevelMult(level = 0) {
  const lv = Math.max(0, Math.floor(Number(level) || 0));
  if (lv <= 0) return '1';
  return add('1', mul(NECTAR_LEVEL_BONUS_PER, String(lv)));
}

/**
 * Multiplicador global de Néctar em Reserva (Fase F5 — Sugar Baking):
 * `1 + 0.01 * min(nectar, 100)` quando o talento `nectar_em_reserva` (ou `nectarReserveActive`) está ativo.
 */
export function nectarReserveMult(nectar = 0, talents = [], nectarReserveActive = null) {
  const hasTalent = typeof nectarReserveActive === 'boolean'
    ? nectarReserveActive
    : Boolean(talentEffects(talents).nectarReserveBonus);
  if (!hasTalent) return '1';
  const capped = Math.min(NECTAR_RESERVE_CAP, Math.max(0, Math.floor(Number(nectar) || 0)));
  if (capped <= 0) return '1';
  return add('1', mul(NECTAR_RESERVE_BONUS_PER, String(capped)));
}

/**
 * Fase F4 — Conta quantas conquistas normais (`!shadow`) estão desbloqueadas.
 * Aceita array de IDs, número direto (override de contagem) ou objeto `{ achievements, normalAchievementsCount }`.
 */
export function countNormalAchievements(achievementsOrCount = [], normalAchievementsCount = null) {
  if (normalAchievementsCount != null && Number.isFinite(Number(normalAchievementsCount))) {
    return Math.max(0, Math.floor(Number(normalAchievementsCount)));
  }
  if (typeof achievementsOrCount === 'number' && Number.isFinite(achievementsOrCount)) {
    return Math.max(0, Math.floor(achievementsOrCount));
  }
  if (achievementsOrCount && typeof achievementsOrCount === 'object' && !Array.isArray(achievementsOrCount)) {
    if (
      achievementsOrCount.normalAchievementsCount != null
      && Number.isFinite(Number(achievementsOrCount.normalAchievementsCount))
    ) {
      return Math.max(0, Math.floor(Number(achievementsOrCount.normalAchievementsCount)));
    }
    const list = achievementsOrCount.achievements ?? achievementsOrCount.unlockedAchievements ?? [];
    return countNormalAchievements(list, null);
  }
  const seen = new Set();
  for (const rawId of Array.isArray(achievementsOrCount) ? achievementsOrCount : []) {
    const id = String(rawId || '');
    if (!id || seen.has(id)) continue;
    if (isNormalAchievementId(id)) {
      seen.add(id);
    }
  }
  return seen.size;
}

/**
 * Fase F4 — Fração canónica de Véu (+0.04 por conquista normal; Shadow = +0).
 * Ex.: 25 conquistas normais → `'1'`, 50 → `'2'`, 13 → `'0.52'`.
 */
export function veilFraction(achievementsOrCount = [], normalAchievementsCount = null) {
  const count = countNormalAchievements(achievementsOrCount, normalAchievementsCount);
  if (count <= 0) return '0';
  return mul(String(count), VEIL_PER_ACHIEVEMENT);
}

/**
 * Fase F4 — Percentagem económica de Véu (+4% por conquista normal; Shadow = +0%).
 * Ex.: 13 conquistas → `52`, 25 → `100`, 50 → `200`.
 */
export function veilPercent(achievementsOrCount = [], normalAchievementsCount = null) {
  const count = countNormalAchievements(achievementsOrCount, normalAchievementsCount);
  return count * VEIL_PERCENT_PER_ACHIEVEMENT;
}

/**
 * Fase F4 — Retorna o Tier Visual (Sabor do Acheron) para o conjunto de conquistas/percentagem.
 */
export function veilTier(achievementsOrCount = [], normalAchievementsCount = null) {
  return veilTierForPercent(veilPercent(achievementsOrCount, normalAchievementsCount));
}

/**
 * Fase F4 + F8 — Produtório composto da linhagem *Filhotes do Cérbero* (Paridade *Kitten Upgrades*):
 * `∏ (1 + veilFraction × factor_i × dragonMilkBoost)` sobre todos os upgrades `veilMult` / `kittenMult` comprados
 * (incluindo `fortune_103` e amplificado em +5% se a aura `sopro_de_flegeton` estiver equipada).
 */
export function cerberusPupMult(
  upgradeIds = [],
  achievementsOrCount = [],
  normalAchievementsCount = null,
  dragon = null,
) {
  const owned = new Set((Array.isArray(upgradeIds) ? upgradeIds : []).map((id) => String(id)));
  if (owned.size === 0) return '1';

  const vFrac = veilFraction(achievementsOrCount, normalAchievementsCount);
  if (cmp(vFrac, '0') <= 0) return '1';

  const { veilPupBoost } = dragonModifiers(dragon || {});

  let mult = '1';
  for (const def of UPGRADES) {
    if (!owned.has(def.id)) continue;
    if (def.kind !== 'veilMult' && def.kind !== 'kittenMult') continue;
    const effectiveFactor = cmp(veilPupBoost, '1') === 0
      ? def.factor
      : mul(def.factor, veilPupBoost);
    const term = add('1', mul(vFrac, effectiveFactor));
    mult = mul(mult, term);
  }
  return mult;
}

export const kittenMult = cerberusPupMult;

/**
 * Multiplicadores agregados dos minigames ativos (Panteão Ctoniano + Jardim de Perséfone).
 */
export function minigameEffects({
  generatorLevels = {},
  minigames = {},
} = {}) {
  const lvTemple = Math.max(0, Math.floor(Number(generatorLevels?.[MINIGAME_UNLOCK_GENERATORS.pantheon] || 0)));
  const lvHound = Math.max(0, Math.floor(Number(generatorLevels?.[MINIGAME_UNLOCK_GENERATORS.garden] || 0)));
  const pantheon = pantheonModifiers(minigames?.pantheon, { unlocked: lvTemple >= 1 });
  const garden = gardenModifiers(minigames?.garden, { unlocked: lvHound >= 1, houndLevel: lvHound });
  return {
    spsMult: mul(pantheon.spsMult, garden.spsMult),
    clickMult: mul(pantheon.clickMult, garden.clickMult),
    shimmerLuckMult: Number(pantheon.shimmerLuckMult || 1) * Number(garden.shimmerLuckMult || 1),
    pantheonSpsMult: pantheon.spsMult,
    gardenSpsMult: garden.spsMult,
  };
}

/**
 * Fase F8 — Auditoria completa do Stack SPS (Ordem Canónica da Wiki § 4.1).
 * Retorna todas as camadas individuais, o `rawMultiplier` (Multiplicador Bruto), `rawSps` e `effectiveSps`.
 */
export function calculateSpsBreakdown({
  generators = {},
  upgrades = [],
  talents = [],
  obols = '0',
  verdictPurchases = [],
  shinyCounts = {},
  goldCounts = {},
  activeBuffs = {},
  nowMs = null,
  generatorLevels = {},
  nectar = 0,
  nectarReserveActive = null,
  minigames = {},
  achievements = [],
  normalAchievementsCount = null,
  catabase = null,
  covenantActive = null,
  dragon = null,
  seasons = null,
  leeches = null,
} = {}) {
  let baseLinesSps = '0';
  const shadeFlatBonus = thousandBladesBonusPerUnit(upgrades, generators);
  const servantFlatBonus = elderPactServantFlatBonusPerUnit(upgrades, generators);
  for (const def of GENERATORS) {
    const qty = Number(generators[def.id] || 0);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const upgradeMult = generatorUpgradeMult(def.id, upgrades, generators);
    const shiny = Number(shinyCounts?.[def.id] || 0);
    const gold = Number(goldCounts?.[def.id] || 0);
    const level = Number(generatorLevels?.[def.id] || 0);
    let flatUnitBonus = '0';
    if (def.id === 'wandering_shade') flatUnitBonus = shadeFlatBonus;
    else if (def.id === 'charon_servants') flatUnitBonus = servantFlatBonus;
    const line = lineSPS({
      qty,
      shiny,
      gold,
      baseRate: def.baseRate,
      upgradeMult,
      flatUnitBonus,
      level,
    });
    baseLinesSps = add(baseLinesSps, line);
  }

  const prestigeMult = prestigeBonus(obols, talents);
  const { spsVerdictMult: verdictMult } = economyEffects(talents, verdictPurchases);
  const { spsMult: minigamesMult } = minigameEffects({ generatorLevels, minigames });
  const seasonalMult = seasonalCompoundMult(upgrades);
  const researchMult = catabaseResearchSpsMult(upgrades);
  const saturnMult = saturnaliaSpsMult(seasons, upgrades);
  const fortuneMult = fortuneGlobalSpsMult(upgrades);
  const scaleMult = dragonScaleSpsMult(upgrades);
  const pupMult = cerberusPupMult(upgrades, achievements, normalAchievementsCount, dragon);
  const reserveMult = nectarReserveMult(nectar, talents, nectarReserveActive);
  const auraMult = dragonAuraSpsMult(dragon);
  const isCovActive = typeof covenantActive === 'boolean'
    ? covenantActive
    : Boolean(catabase?.covenantActive);
  const covenantMult = elderCovenantMult(isCovActive);
  const buffsMult = activeSpsBuffMult(activeBuffs, nowMs);

  let rawMultiplier = '1';
  for (const m of [
    prestigeMult,
    verdictMult,
    minigamesMult,
    seasonalMult,
    researchMult,
    saturnMult,
    fortuneMult,
    scaleMult,
    pupMult,
    reserveMult,
    auraMult,
    covenantMult,
    buffsMult,
  ]) {
    rawMultiplier = mul(rawMultiplier, m);
  }

  // Multiplica sequencialmente na ordem canónica da Wiki (§ 4.1)
  let running = baseLinesSps;
  for (const m of [
    prestigeMult,
    verdictMult,
    minigamesMult,
    seasonalMult,
    researchMult,
    saturnMult,
    fortuneMult,
    scaleMult,
    pupMult,
    reserveMult,
    auraMult,
    covenantMult,
    buffsMult,
  ]) {
    running = mul(running, m);
  }
  const rawSps = running;
  const leechesSource = leeches ?? catabase?.leeches ?? 0;
  const leechMult = leechApparentMult(leechesSource);
  const effectiveSps = mul(rawSps, leechMult);

  return {
    baseLinesSps,
    prestigeMult,
    verdictMult,
    minigamesMult,
    seasonalCompoundMult: seasonalMult,
    catabaseResearchMult: researchMult,
    saturnaliaMult: saturnMult,
    fortuneGlobalMult: fortuneMult,
    dragonScaleMult: scaleMult,
    cerberusPupMult: pupMult,
    nectarReserveMult: reserveMult,
    dragonAuraMult: auraMult,
    elderCovenantMult: covenantMult,
    activeBuffsMult: buffsMult,
    rawMultiplier,
    rawSps,
    leechApparentMult: leechMult,
    effectiveSps,
  };
}

/**
 * Calcula o SPS bruto (`rawSPS` — antes do dreno das Sanguessugas, mas incluindo pesquisas da Catábase,
 * Relíquias Sazonais, Rei Saturno, Fortunes, Escama de Ladão, Filhotes, Néctar, Auras do Dragão e Covenant ×0.95).
 */
export function calculateRawSPS(opts = {}) {
  return calculateSpsBreakdown(opts).rawSps;
}

export function calculateTotalSPS(opts = {}) {
  return calculateRawSPS(opts);
}

/**
 * Fase F6 — Calcula o SPS aparente (`effectiveSPS`) creditado diretamente na carteira após o dreno
 * das Sanguessugas (`rawSPS × (1 - leechesCount × 0.05)`).
 */
export function calculateEffectiveSPS(opts = {}) {
  const raw = opts.rawSps != null ? String(opts.rawSps) : calculateRawSPS(opts);
  const leechesSource = opts.leeches ?? opts.catabase?.leeches ?? opts.leechesCount ?? 0;
  return mul(raw, leechApparentMult(leechesSource));
}

/**
 * SPS bruta da linha (antes de prestige / veredito).
 * `(qty - neg - gold) * u + neg * u * NEGATIVO_MULT + gold * u * GOLD_MULT` × `generatorLevelMult(level)`
 *
 * @param {{ qty?: number|string, shiny?: number|string, gold?: number|string, baseRate?: string|number, upgradeMult?: string|number, flatUnitBonus?: string|number, level?: number|string }} opts
 */
export function lineSPS({
  qty = 0,
  shiny = 0,
  gold = 0,
  baseRate = '0',
  upgradeMult = '1',
  flatUnitBonus = '0',
  level = 0,
} = {}) {
  const n = Math.max(0, Math.floor(Number(qty) || 0));
  if (n <= 0) return '0';
  let goldN = Math.max(0, Math.floor(Number(gold) || 0));
  let shinyN = Math.max(0, Math.floor(Number(shiny) || 0));
  if (goldN > n) goldN = n;
  if (shinyN > n - goldN) shinyN = n - goldN;
  const unit = add(mul(baseRate, upgradeMult), flatUnitBonus || '0');
  const normal = n - shinyN - goldN;
  const rawLine = add(
    add(
      mul(String(normal), unit),
      mul(mul(String(shinyN), unit), NEGATIVO_MULT),
    ),
    mul(mul(String(goldN), unit), GOLD_MULT),
  );
  return mul(rawLine, generatorLevelMult(level));
}

/**
 * SPS efetiva de **uma** unidade (Q7 / G3.1).
 */
export function effectiveUnitSPS({
  generatorId,
  generators = {},
  upgrades = [],
  talents = [],
  obols = '0',
  verdictPurchases = [],
  shiny = false,
  gold = false,
  rarity = null,
  activeBuffs = {},
  nowMs = null,
  generatorLevels = {},
  nectar = 0,
  nectarReserveActive = null,
  minigames = {},
  achievements = [],
  normalAchievementsCount = null,
  catabase = null,
  covenantActive = null,
  dragon = null,
  seasons = null,
} = {}) {
  const def = getGenerator(generatorId);
  if (!def) return '0';
  const upgradeMult = generatorUpgradeMult(generatorId, upgrades, generators);
  let flatUnitBonus = '0';
  if (generatorId === 'wandering_shade') {
    flatUnitBonus = thousandBladesBonusPerUnit(upgrades, generators);
  } else if (generatorId === 'charon_servants') {
    flatUnitBonus = elderPactServantFlatBonusPerUnit(upgrades, generators);
  }
  const level = Number(generatorLevels?.[generatorId] || 0);
  const unit = mul(add(mul(def.baseRate, upgradeMult), flatUnitBonus), generatorLevelMult(level));
  const withPrestige = mul(unit, prestigeBonus(obols, talents));
  const { spsVerdictMult } = economyEffects(talents, verdictPurchases);
  const { spsMult: mgSpsMult } = minigameEffects({ generatorLevels, minigames });
  const withSeasonal = mul(mul(mul(withPrestige, spsVerdictMult), mgSpsMult), seasonalCompoundMult(upgrades));
  const withResearch = mul(withSeasonal, catabaseResearchSpsMult(upgrades));
  const withSaturn = mul(withResearch, saturnaliaSpsMult(seasons, upgrades));
  const withFortune = mul(withSaturn, fortuneGlobalSpsMult(upgrades));
  const withScale = mul(withFortune, dragonScaleSpsMult(upgrades));
  const withVeilPups = mul(
    withScale,
    cerberusPupMult(upgrades, achievements, normalAchievementsCount, dragon),
  );
  const withReserve = mul(
    withVeilPups,
    nectarReserveMult(nectar, talents, nectarReserveActive),
  );
  const withDragonAura = mul(withReserve, dragonAuraSpsMult(dragon));
  const isCovActive = typeof covenantActive === 'boolean'
    ? covenantActive
    : Boolean(catabase?.covenantActive);
  const withCovenant = mul(withDragonAura, elderCovenantMult(isCovActive));
  const effective = mul(withCovenant, activeSpsBuffMult(activeBuffs, nowMs));
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
  activeBuffs = {},
  nowMs = null,
  generatorLevels = {},
  nectar = 0,
  nectarReserveActive = null,
  minigames = {},
  achievements = [],
  normalAchievementsCount = null,
  catabase = null,
  covenantActive = null,
  dragon = null,
  seasons = null,
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
      activeBuffs,
      nowMs,
      generatorLevels,
      nectar,
      nectarReserveActive,
      minigames,
      achievements,
      normalAchievementsCount,
      catabase,
      covenantActive,
      dragon,
      seasons,
    })
    : sps;
  const effects = economyEffects(talents, verdictPurchases);
  const { clickMult: mgClickMult } = minigameEffects({ generatorLevels, minigames });
  const dClickMult = dragonAuraClickMult(dragon);
  const clickMult = mul(
    mul(mul(clickMultiplier(upgrades), effects.clickVerdictMult), mgClickMult),
    dClickMult,
  );
  const kSps = add(effects.kSps, styxClickKSps(upgrades));
  // Aditivo: base×mult + milFoicesFlat + kSps×SPS (evita clickMult × %SPS explodir).
  const flatPart = mul(add(CLICK_BASE, CLICK_FLAT_BASE), clickMult);
  const bladesPart = thousandBladesBonusPerUnit(upgrades, generators);
  const spsPart = mul(kSps, totalSps);
  const basePower = add(add(flatPart, bladesPart), spsPart);
  return mul(basePower, activeClickBuffMult(activeBuffs, nowMs));
}

export function obolsFromRunSouls(runSouls, prestigeCount = 0, upgrades = []) {
  const p = toScaled(runSouls || '0');
  const q = toScaled(PRESTIGE_RUN_DIVISOR);
  if (p <= 0n || q <= 0n) return '0';
  const raw = floorSqrtRatio(p, q);
  if (raw <= 0n) return '0';
  // Dificuldade progressiva por Catábase: floor(raw / (1 + prestigeCount)).
  const n = Math.max(0, Number.parseInt(prestigeCount, 10) || 0);
  const denom = BigInt(1 + n);
  let gain = raw / denom;
  if (gain <= 0n) return '0';
  const owned = new Set((Array.isArray(upgrades) ? upgrades : []).map((u) => String(u)));
  if (owned.has('fortune_102')) {
    const boosted = (gain * 101n) / 100n;
    gain = boosted > gain ? boosted : gain + 1n;
  }
  return gain.toString();
}

/**
 * Fase F8 — Referência canónica de prestígio cúbico (Cookie Clicker § 8.1):
 * `floor(cbrt(lifetimeSouls / 1e12))`.
 */
export function obolsFromLifetimeCubic(lifetimeSouls = '0') {
  const p = toScaled(lifetimeSouls || '0');
  const q = toScaled(PRESTIGE_CUBIC_DIVISOR);
  if (p <= 0n || q <= 0n) return '0';
  return floorCbrtRatio(p, q).toString();
}

/**
 * Fase F8 — Migração segura (*Save Heal*) de saves legados (F0–F7) para F8:
 * - Preserva 100% dos Óbolos, Essência e conquistas existentes (nunca reduz Óbolos de saves válidos).
 * - Se um save legado tiver `lifetimeSouls` alto e `obols` abaixo da curva cúbica de segurança pós-Catábase,
 *   garante piso não-regressivo e inicializa `dragon`, `seasons` e `fortunes` limpos.
 */
export function healLegacySave(snapshot = {}) {
  const src = snapshot && typeof snapshot === 'object' ? { ...snapshot } : {};
  const milestones = src.milestones && typeof src.milestones === 'object' ? { ...src.milestones } : {};
  const currentObols = toBigIntFloor(src.obols ?? '0');
  const currentMnemosyne = toBigIntFloor(src.mnemosyne ?? '0');
  const prestigeCount = Math.max(0, Number.parseInt(src.prestigeCount ?? src.prestige_count, 10) || 0);
  const lifetimeSouls = String(src.lifetimeSouls ?? src.lifetime_souls ?? '0');

  let healedObols = currentObols > 0n ? currentObols.toString() : '0';
  let healedMnemosyne = currentMnemosyne > 0n ? currentMnemosyne.toString() : '0';

  if (prestigeCount > 0) {
    const cubicFloor = BigInt(obolsFromLifetimeCubic(lifetimeSouls));
    if (cubicFloor > currentObols) {
      healedObols = cubicFloor.toString();
    }
  }

  milestones.f8SaveHealed = true;
  return {
    ...src,
    obols: money(healedObols),
    mnemosyne: money(healedMnemosyne),
    milestones,
  };
}

export function mnemosyneFromObolsGain(obolsGain, talents = []) {
  const baseObols = toBigIntFloor(obolsGain || '0');
  if (baseObols <= 0n) return '0';
  // 2 óbolos desta corrida → 1 essência.
  let gain = baseObols / 2n;
  const owned = new Set((talents || []).filter((id) => TALENT_BY_ID[id]));
  if (owned.has('calice_da_memoria') && gain > 0n) {
    gain = (gain * BigInt(TALENT_CALICE_MNEMOSYNE_NUM)) / BigInt(TALENT_CALICE_MNEMOSYNE_DEN);
  }
  return gain.toString();
}

export function canPrestige(runSouls, prestigeCount = 0, upgrades = []) {
  return cmp(obolsFromRunSouls(runSouls, prestigeCount, upgrades), '0') > 0;
}

export function prestigePreview(runSouls, prestigeCount = 0, talents = [], upgrades = []) {
  const obolsGain = obolsFromRunSouls(runSouls, prestigeCount, upgrades);
  const unlocked = cmp(obolsGain, '0') > 0;
  return {
    obolsGain,
    mnemosyneGain: unlocked ? mnemosyneFromObolsGain(obolsGain, talents) : '0',
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
  achievements = [],
  normalAchievementsCount = null,
  veilPercent: explicitVeilPercent = null,
  catabase = null,
  unlockedResearchIds = null,
  dragon = null,
  seasons = null,
  fortunes = null,
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
  if (req.researchId != null && req.researchId !== '') {
    const resList = Array.isArray(unlockedResearchIds)
      ? unlockedResearchIds
      : (Array.isArray(catabase?.unlockedResearchIds) ? catabase.unlockedResearchIds : null);
    if (resList !== null) {
      const resSet = new Set(resList.map((id) => String(id)));
      if (!resSet.has(String(req.researchId)) && !owned.has(String(req.researchId))) {
        return false;
      }
    }
  }
  if (req.dragonStage != null && Number(req.dragonStage) > 0) {
    if (dragon != null) {
      const stg = Number(dragon.stage || 0);
      if (stg < Number(req.dragonStage) && !dragon.scaleDropped && !owned.has(upgrade.id)) {
        return false;
      }
    }
  }
  if (req.seasonalDropId != null && req.seasonalDropId !== '') {
    if (seasons != null && Array.isArray(seasons.unlockedDrops)) {
      const dropSet = new Set(seasons.unlockedDrops.map((d) => String(d)));
      if (!dropSet.has(String(req.seasonalDropId)) && !owned.has(String(req.seasonalDropId))) {
        return false;
      }
    }
  }
  if (req.fortuneId != null && req.fortuneId !== '') {
    if (fortunes != null && Array.isArray(fortunes.claimedIds)) {
      const claimSet = new Set(fortunes.claimedIds.map((f) => String(f)));
      if (!claimSet.has(String(req.fortuneId)) && !owned.has(String(req.fortuneId))) {
        return false;
      }
    }
  }

  if (req.generatorId) {
    if (Number(generators[req.generatorId] || 0) < Number(req.quantity || 0)) {
      return false;
    }
  }
  if (req.minGenerators && typeof req.minGenerators === 'object') {
    for (const [genId, minQty] of Object.entries(req.minGenerators)) {
      if (Number(generators[genId] || 0) < Number(minQty || 0)) {
        return false;
      }
    }
  }
  if (req.minVeilPercent != null && Number(req.minVeilPercent) > 0) {
    const currentVeilPct = explicitVeilPercent != null && Number.isFinite(Number(explicitVeilPercent))
      ? Number(explicitVeilPercent)
      : veilPercent(achievements, normalAchievementsCount);
    if (currentVeilPct < Number(req.minVeilPercent)) {
      return false;
    }
  }
  if (req.minSouls != null) {
    if (cmp(souls, req.minSouls) < 0) return false;
  }
  return true;
}

const GENERATOR_MILESTONE_ACHIEVEMENTS = Object.freeze({
  wandering_shade: { 50: 'despertar_sombra_50', 100: 'despertar_sombra_100' },
  charon_servants: { 50: 'despertar_servos_50' },
  cerberian_hound: { 50: 'despertar_cao_50' },
  tartarus_judge: { 50: 'despertar_juiz_50' },
  phlegethon_forge: { 50: 'despertar_forja_50' },
  obsidian_throne: { 50: 'despertar_trono_50' },
  mnemosyne_temple: { 1: 'despertar_templo_1', 50: 'despertar_templo_50', 100: 'despertar_templo_100', 200: 'despertar_templo_200' },
  styx_tower: { 1: 'despertar_torre_1', 50: 'despertar_torre_50', 100: 'despertar_torre_100', 200: 'despertar_torre_200' },
  star_barge: { 1: 'despertar_barca_1', 50: 'despertar_barca_50', 100: 'despertar_barca_100', 200: 'despertar_barca_200' },
  tartarus_lab: { 1: 'despertar_laboratorio_1', 50: 'despertar_laboratorio_50', 100: 'despertar_laboratorio_100', 200: 'despertar_laboratorio_200' },
  erebus_portal: { 1: 'despertar_portal_1', 50: 'despertar_portal_50', 100: 'despertar_portal_100', 200: 'despertar_portal_200' },
  chronos_loom: { 1: 'despertar_tear_1', 50: 'despertar_tear_50', 100: 'despertar_tear_100', 200: 'despertar_tear_200' },
  void_condenser: { 1: 'despertar_condensador_1', 50: 'despertar_condensador_50', 100: 'despertar_condensador_100', 200: 'despertar_condensador_200', 300: 'despertar_condensador_300' },
  moirai_prism: { 1: 'despertar_prisma_1', 50: 'despertar_prisma_50', 100: 'despertar_prisma_100', 200: 'despertar_prisma_200', 300: 'despertar_prisma_300' },
  fate_forge: { 1: 'despertar_forja_destino_1', 50: 'despertar_forja_destino_50', 100: 'despertar_forja_destino_100', 200: 'despertar_forja_destino_200', 300: 'despertar_forja_destino_300' },
  fractal_engine: { 1: 'despertar_motor_fractal_1', 50: 'despertar_motor_fractal_50', 100: 'despertar_motor_fractal_100', 200: 'despertar_motor_fractal_200', 300: 'despertar_motor_fractal_300' },
  oracle_console: { 1: 'despertar_console_1', 50: 'despertar_console_50', 100: 'despertar_console_100', 200: 'despertar_console_200', 300: 'despertar_console_300' },
  chthonic_idleverse: { 1: 'despertar_idleverso_1', 50: 'despertar_idleverso_50', 100: 'despertar_idleverso_100', 200: 'despertar_idleverso_200', 300: 'despertar_idleverso_300' },
  cortex_baker: { 1: 'despertar_cortex_1', 50: 'despertar_cortex_50', 100: 'despertar_cortex_100', 200: 'despertar_cortex_200', 300: 'despertar_cortex_300' },
  the_emperor: { 1: 'despertar_imperador_1', 50: 'despertar_imperador_50', 100: 'despertar_imperador_100', 200: 'despertar_imperador_200', 300: 'despertar_imperador_300' },
});

/**
 * Avalia conquistas `despertar_*` elegíveis a partir do estado atual (espelho de `DespertarFormulas::evaluateDespertarAchievementIds`).
 */
export function evaluateDespertarAchievementIds(state = {}, unlocked = []) {
  const unlockedSet = new Set((Array.isArray(unlocked) ? unlocked : []).map((id) => String(id)));
  const generators = typeof state.quantities === 'function'
    ? state.quantities()
    : (state.generators || {});
  const upgrades = Array.isArray(state.upgrades) ? state.upgrades : [];
  const talents = Array.isArray(state.talents) ? state.talents : [];
  const milestones = state.milestones && typeof state.milestones === 'object' ? state.milestones : {};
  const prestigeCount = Math.max(0, Number(state.prestigeCount || 0));
  const shinyCounts = typeof state.shinyCounts === 'function'
    ? state.shinyCounts()
    : (state.shinyCounts || {});
  const goldCounts = typeof state.goldCounts === 'function'
    ? state.goldCounts()
    : (state.goldCounts || {});
  const verdictPurchases = Array.isArray(state.verdictPurchases) ? state.verdictPurchases : [];
  const generatorLevels = state.generatorLevels || milestones.f5Nectar?.generatorLevels || {};
  const nectar = Number(state.nectar ?? milestones.f5Nectar?.nectar ?? 0);
  const minigames = state.minigames || milestones.f5Minigames || {};

  const sps = state.spsValue != null
    ? String(state.spsValue)
    : calculateTotalSPS({
      generators,
      upgrades,
      talents,
      obols: String(state.obols ?? '0'),
      verdictPurchases,
      shinyCounts,
      goldCounts,
      generatorLevels,
      nectar,
      minigames,
      achievements: unlocked,
      dragon: state.dragon || milestones.f8Dragon || null,
      seasons: state.seasons || milestones.f8Seasons || null,
    });

  const earned = [];
  const take = (id, cond) => {
    if (!unlockedSet.has(id) && cond) {
      earned.push(id);
    }
  };

  const lifetime = String(state.lifetimeSouls ?? '0');
  take('despertar_primeira_alma', cmp(lifetime, '1') >= 0);
  take('despertar_primeira_sombra', Number(generators.wandering_shade || 0) >= 1 || Boolean(milestones.shade));
  take('despertar_automacao', cmp(sps, '1') >= 0);
  take('despertar_forja', Number(generators.phlegethon_forge || 0) >= 1 || Boolean(milestones.forge));
  take('despertar_trono', Number(generators.obsidian_throne || 0) >= 1 || Boolean(milestones.throne));
  take('despertar_catabase', prestigeCount >= 1);
  take('despertar_mnemosyne', talents.length >= 1);

  let allGensT1T6 = true;
  let allGensT1T20 = true;
  for (const def of GENERATORS) {
    if (Number(generators[def.id] || 0) < 1) {
      allGensT1T20 = false;
      if (def.tier <= 6) allGensT1T6 = false;
    }
  }
  take('despertar_soberania', allGensT1T6);
  take('despertar_vinte_rios', allGensT1T20);

  for (const [genId, thresholds] of Object.entries(GENERATOR_MILESTONE_ACHIEVEMENTS)) {
    const haveQty = Number(generators[genId] || 0);
    for (const [minQty, achId] of Object.entries(thresholds)) {
      take(achId, haveQty >= Number(minQty));
    }
  }

  const totalNectarHarvested = Number(
    state.totalNectarHarvested ?? milestones.f5Nectar?.totalNectarHarvested ?? 0,
  );
  let maxGenLevel = 0;
  for (const lv of Object.values(generatorLevels)) {
    if (Number(lv) > maxGenLevel) maxGenLevel = Number(lv);
  }
  take('despertar_nectar_primeiro', totalNectarHarvested >= 1 || Boolean(milestones.nectarHarvested));
  take('despertar_nivel_1', maxGenLevel >= 1);
  take('despertar_nivel_10', maxGenLevel >= 10);
  take('despertar_minigame_panteao', Number(generatorLevels.mnemosyne_temple || 0) >= 1);
  take('despertar_minigame_grimorio', Number(generatorLevels.styx_tower || 0) >= 1);
  take('despertar_minigame_jardim', Number(generatorLevels.cerberian_hound || 0) >= 1);
  take('despertar_minigame_mercado', Number(generatorLevels.obsidian_throne || 0) >= 1);

  const juizoBest = Number(state.juizoBestStreak || 0);
  take('despertar_juizo_1', juizoBest >= 1);
  take('despertar_juizo_5', juizoBest >= 5);
  take('despertar_juizo_10', juizoBest >= 10);
  take('despertar_juizo_25', juizoBest >= 25);
  take('despertar_veredito', verdictPurchases.length >= 1);

  take('despertar_cem_almas', cmp(lifetime, '100') >= 0);
  take('despertar_mil_almas', cmp(lifetime, '1000') >= 0);
  take('despertar_milhao', cmp(lifetime, '1000000') >= 0);
  take('despertar_bilhao', cmp(lifetime, '1000000000') >= 0);
  take('despertar_trilhao', cmp(lifetime, '1000000000000') >= 0);
  take('despertar_almas_1e21', cmp(lifetime, '1000000000000000000000') >= 0);
  take('despertar_almas_1e30', cmp(lifetime, '1000000000000000000000000000000') >= 0);

  take('despertar_sps_100', cmp(sps, '100') >= 0);
  take('despertar_sps_10k', cmp(sps, '10000') >= 0);
  take('despertar_sps_1m', cmp(sps, '1000000') >= 0);
  take('despertar_sps_1b', cmp(sps, '1000000000') >= 0);
  take('despertar_sps_1e15', cmp(sps, '1000000000000000') >= 0);
  take('despertar_sps_1e21', cmp(sps, '1000000000000000000000') >= 0);

  const stats = state.stats && typeof state.stats === 'object' ? state.stats : {};
  const clicks = Number(state.clickCount ?? stats.clicks ?? 0);
  const shimmersClicked = Number(state.shimmersClicked ?? stats.shimmersClicked ?? stats.shimmers_clicked ?? 0);
  const wrathClicked = Number(state.wrathClicked ?? stats.wrathClicked ?? stats.wrath_clicked ?? 0);

  take('despertar_cliques_100', clicks >= 100);
  take('despertar_cliques_1000', clicks >= 1000);
  take('despertar_eco_1', shimmersClicked >= 1 || Boolean(milestones.shimmerClicked));
  take('despertar_eco_7', shimmersClicked >= 7);
  take('despertar_eco_27', shimmersClicked >= 27);
  take('despertar_eco_colerico', wrathClicked >= 1);

  take('despertar_styx_primeiro', upgrades.length >= 1);
  take('despertar_styx_cinco', upgrades.length >= 5);

  const shinySum = Object.values(shinyCounts).reduce((a, b) => a + (Number(b) || 0), 0);
  const goldSum = Object.values(goldCounts).reduce((a, b) => a + (Number(b) || 0), 0);
  take('despertar_shiny', shinySum >= 1);
  take('despertar_gold', goldSum >= 1);
  take('despertar_catabase_3', prestigeCount >= 3);
  take('despertar_catabase_5', prestigeCount >= 5);

  const hasPupUpgrade = upgrades.some((uid) => {
    const u = UPGRADE_BY_ID[uid];
    return u?.kind === 'veilMult' || u?.kind === 'kittenMult';
  });
  take('despertar_filhote_primeiro', hasPupUpgrade);

  // --- Fase F6: Catábase das Avós & Sanguessugas do Acheron ---
  const f6Cat = state.catabase || milestones.f6Catabase || {};
  const catStage = Math.max(
    Number(f6Cat.stage || 0),
    upgrades.includes('pacto_primordial') ? 3 : (upgrades.includes('comunhao_abissal') ? 2 : (upgrades.includes('despertar_ctoniano') ? 1 : 0)),
  );
  const leechesPopped = Math.max(
    Number(state.leechesPopped ?? f6Cat.leechesPopped ?? stats.leechesPopped ?? stats.leeches_popped ?? 0),
    0,
  );
  const shinyLeechesPopped = Math.max(
    Number(state.shinyLeechesPopped ?? f6Cat.shinyLeechesPopped ?? stats.shinyLeechesPopped ?? stats.shiny_leeches_popped ?? 0),
    0,
  );
  const pledgesCount = Number(f6Cat.pledgesCount || 0);
  const covenantActive = Boolean(f6Cat.covenantActive);

  take('despertar_catabase_avos_1', catStage >= 1);
  take('despertar_catabase_avos_3', catStage >= 3);
  take('despertar_sanguessuga_1', leechesPopped >= 1);
  take('despertar_sanguessuga_50', leechesPopped >= 50);
  take('despertar_sanguessuga_200', leechesPopped >= 200);
  take('despertar_sanguessuga_shiny', shinyLeechesPopped >= 1);
  take('despertar_tregua_estigia', pledgesCount >= 1 || covenantActive);

  const ownedVerdictSet = new Set(verdictPurchases.map((v) => String(v)));
  const fullBench = Object.keys(VERDICT_SHOP_BY_ID).every((vid) => ownedVerdictSet.has(vid));
  take('despertar_bancada_cheia', fullBench);
  take('despertar_paciencia', Boolean(milestones.offline));

  // --- Fase F8: Dragão Ctoniano, 4 Estações, Fortunas de Hermes e Venda no Mercado ---
  const f8Dragon = state.dragon || milestones.f8Dragon || {};
  const dragonStage = Math.max(0, Number(f8Dragon.stage || 0));
  take('despertar_dragao_filhote', dragonStage >= 1);
  take('despertar_dragao_ladao', dragonStage >= 4);

  const f8Seasons = state.seasons || milestones.f8Seasons || {};
  const seasonSwitches = Math.max(0, Number(f8Seasons.switchesCount || 0));
  const saturnLevel = Math.max(0, Number(f8Seasons.saturnKingLevel || 0));
  const ownedSet = new Set(upgrades.map((u) => String(u)));
  const allSeasonalDropsOwned = ALL_SEASONAL_DROP_UPGRADE_IDS.every((did) => ownedSet.has(did));

  take('despertar_estacoes_4', seasonSwitches >= 4);
  take('despertar_reliquias_sazonais', allSeasonalDropsOwned);
  take('despertar_rei_saturno_5', saturnLevel >= 5);

  const f8Fortunes = state.fortunes || milestones.f8Fortunes || {};
  const claimedFortunes = Array.isArray(f8Fortunes.claimedIds) ? f8Fortunes.claimedIds : [];
  const lifetimeFortunes = Array.isArray(f8Fortunes.lifetimeClaimedIds)
    ? f8Fortunes.lifetimeClaimedIds
    : claimedFortunes;
  const ownedFortuneCount = FORTUNES.filter((f) => ownedSet.has(f.id)).length;
  const totalFortunesClaimed = Math.max(claimedFortunes.length, lifetimeFortunes.length, ownedFortuneCount);

  take('despertar_fortuna_1', totalFortunesClaimed >= 1);
  take('despertar_o_fortuna', totalFortunesClaimed >= FORTUNES.length);
  take(
    'despertar_mercador_acheron',
    Boolean(milestones.generatorSold) || Number(state.generatorsSold ?? stats.generatorsSold ?? 0) >= 1,
  );

  return earned;
}

export {
  getGenerator,
  getUpgrade,
  getTalent,
  normalize,
  money,
};
