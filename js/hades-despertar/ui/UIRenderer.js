/**
 * Renderer cirúrgico de O Despertar.
 * Monta o mercado uma vez; o loop só atualiza textContent / disabled / classes.
 * Proibido recriar a lista a 60 Hz.
 */

import {
  BUY_MAX_CAP,
  BUY_MODES,
  COCYTUS_T2_SOULS,
  DEFAULT_PERF_PREFS,
  LETHE_PREVIEW_RUN_SOULS,
  PERF_PREFS_STORAGE_KEY,
  PERF_UI_SLOW_INTERVAL_MS,
  PHLEGETHON_SOULS,
  GOLD_MULT,
  NEGATIVO_MULT,
  STYX_UNLOCK_SOULS,
  TICK_FPS,
} from '../config/constants.js';
import { EDU_LOG_BY_ID, EDU_LOG_TICKER_IDS, eduLogTickerPhrase } from '../config/edu-logs.js';
import { GENERATORS, getGenerator } from '../config/generators.js';
import {
  RUMOR_INTERRUPT_MS,
  RUMOR_ROTATE_MS,
  SHINY_FIRST_TICKER,
  GOLD_FIRST_TICKER,
  buildRumorPool,
  pickRumor,
  rumorPoolSignature,
} from '../config/rumors.js';
import { CERBERUS_PUP_UPGRADE_IDS } from '../config/achievements.js';
import { TALENTS, getTalent, meetsTalentRequirement } from '../config/talents.js';
import { UPGRADES, getUpgrade } from '../config/upgrades.js';
import {
  cosmeticForUpgrade,
  cosmeticLabel,
} from '../config/upgrade-cosmetics.js';
import { VERDICT_SHOP } from '../config/verdict-shop.js';
import { JUIZO_BANCADA_HINT } from '../config/juizo-pool.js';
import { cosmeticPaths } from './world/CosmeticsAtlas.js';
import { add, cmp, div, mul } from '../core/decimal.js';
import {
  amortizationSeconds,
  calculateSpsBreakdown,
  catabaseResearchSpsMult,
  cerberusPupMult,
  dragonAuraSpsMult,
  dragonScaleSpsMult,
  economyEffects,
  effectiveUnitSPS,
  elderCovenantMult,
  elderPactServantFlatBonusPerUnit,
  fortuneGlobalSpsMult,
  generatorCostMultForId,
  lineSPS,
  meetsUpgradeRequirement,
  minigameEffects,
  nectarReserveMult,
  prestigeBonus,
  saturnaliaSpsMult,
  seasonalCompoundMult,
  talentEffects,
  thousandBladesBonusPerUnit,
  upgradeEffectiveCost,
  veilFraction as economicVeilFraction,
  veilPercent as economicVeilPercent,
  veilTier as economicVeilTier,
} from '../core/formulas.js';
import { getDragonAura, getDragonStage } from '../config/dragon.js';
import { getSeason } from '../config/seasons.js';
import { FORTUNES, getFortune } from '../config/fortunes.js';
import { formatAmortSeconds, formatOwned, formatRate, formatSouls } from './NumberFormatter.js';
import { AltarOrbit, applyVeilElementStyle, veilPercent } from './world/AltarOrbit.js';
import { LeechRingView } from './world/LeechRingView.js';
import {
  createSpriteNode,
  generatorSprite,
  habitatSprite,
  habitatVariantSprite,
  upgradeSprite,
} from './world/SpriteAtlas.js';
import { describeUnitPersona } from './unitPersona.js';
import { WorldView } from './world/WorldView.js';
import { ShimmerView } from './ShimmerView.js';
import { MinigamesView } from './minigames/MinigamesView.js';
import { bindMarquee, setMarqueeText } from './Marquee.js';
import { juiceBumpClass, juicePrefersReducedMotion, flashLetheUnlock, showTutorialToast } from './juice.js';
import { withPerfMeasure } from './perfTelemetry.js';
import { CodexBook, describeCodex, describeCodexEntry } from './CodexBook.js';
import { LoopLeaderboard } from './LoopLeaderboard.js';
import { bindLetheRiverTree } from './LetheRiverTree.js';
import {
  BANCADA_EMPTY_AVAILABLE,
  BANCADA_EMPTY_OWNED,
  PANTHEON_EMPTY_AVAILABLE,
  PANTHEON_EMPTY_OWNED,
  SHOP_OWNED_BADGE,
  bindSubTabs,
  defaultShopSubTab,
  partitionShopCatalog,
  shopTabLabel,
} from './subTabs.js';

export { describeCodex, describeCodexEntry };
export {
  BANCADA_EMPTY_AVAILABLE,
  BANCADA_EMPTY_OWNED,
  PANTHEON_EMPTY_AVAILABLE,
  PANTHEON_EMPTY_OWNED,
  SHOP_OWNED_BADGE,
  partitionShopCatalog,
  shopTabLabel,
  defaultShopSubTab,
};

const RIVER_VEIL = 'Este rio ainda não aceita teu nome.';
const STYX_EMPTY = 'Os juramentos do Styx exigem servos — ou um punhado de almas.';
const LETHE_EMPTY = 'O Lethe só se abre quando a corrida encontra a parede.';
/** Ticker one-shot na primeira abertura do Lethe (Fase C / C1) — alinhado ao edu-log. */
export const LETHE_UNLOCK_TICKER =
  eduLogTickerPhrase(EDU_LOG_BY_ID.log_lethe_unlock)
  || 'O Lethe se abre — a memória do Submundo te espera.';
const LETHE_UNLOCK_HOLD_MS = 5_000;
const EDU_LOG_TICKER_HOLD_MS = 5_000;
/** Copy curta do toast first-unlock (C3). */
const LETHE_TUTORIAL_TOAST =
  'O Lethe se abre. Confira a aba Lethe — o livro do Códice também ganhou uma página.';
const PANTHEON_EMPTY = 'Mnemosyne ainda não bebeu tua memória.';

/** Copy do tip de NPC (G3.2) — shelf/órbita = uma unidade (rodapé de produção). */
export const NPC_UNIT_PRODUCTION_BLURB = 'produção desta unidade';

const TALENT_BLURB = Object.freeze({
  memoria_das_sombras: 'A próxima corrida começa com 5 000 almas.',
  juramento_eterno: 'A memória de Mnemosyne rende 25% a mais no bônus.',
  noite_prolongada: 'A colheita na ausência vai até 12 h.',
  veu_eficiente: 'A ausência colhe 100% das Almas / s.',
  foice_ancestral: 'O clique ganha 1% das Almas / s — vale já nesta corrida.',
  favor_de_caronte: 'Geradores custam 15% menos — vale já nesta corrida.',
  mnemosyne_profunda: 'A essência rende 50% a mais no bônus.',
  segundo_folego: 'A próxima corrida começa com 5 Sombras Vagantes.',
  margem_generosa: 'A próxima corrida começa com +25 000 almas.',
  pacto_do_silencio: 'A colheita na ausência ganha +6 h de teto.',
  olho_da_curva: 'Amortização sempre visível no Mercado — sem números de SPS.',
  eco_do_styx: 'Após o Lethe, 1 Juramento Styx revelado começa selado.',
  rebanho_despertado: 'A próxima corrida começa com 25 Sombras Vagantes.',
  matilha_cerberiana: 'A próxima corrida começa com 3 Cães Cerberianos.',
  eco_ressonante: 'Após o Lethe, 2 Juramentos Styx revelados começam selados.',
  calice_da_memoria: 'O Ritual do Lethe rende 50% a mais de Essência.',
  mnemosyne_tripla: 'A memória de Mnemosyne rende o dobro no bônus de Óbolos.',
  forja_despertada: 'A próxima corrida começa com 1 Forja de Phlegethon.',
  nectar_em_reserva: 'Cada Néctar não gasto concede +1% SPS global (até 100 Néctares = ×2 SPS).',
  frenesi_de_nectar_talento: 'Permite consagrar 1 Néctar por corrida para ×3 SPS durante 1 hora.',
  ovo_primordial: 'Desperta o Ovo Primordial do Dragão Ctoniano Pitão / Ladão e suas Auras.',
  rodizio_das_estacoes: 'Desbloqueia a Roda das Estações para invocar Antestéria, Lemúria, Saturnália ou Feira de Hermes por 24 h.',
  eco_ancestral_iii: 'Após o Lethe, 3 Juramentos Styx revelados começam selados.',
  eco_ancestral_iv: 'Após o Lethe, 4 Juramentos Styx revelados começam selados.',
  eco_ancestral_v: 'Após o Lethe, 5 Juramentos Styx revelados começam selados.',
});

const TALENT_NEXT_RUN = Object.freeze(new Set([
  'memoria_das_sombras',
  'segundo_folego',
  'margem_generosa',
  'rebanho_despertado',
  'eco_do_styx',
  'matilha_cerberiana',
  'eco_ressonante',
  'eco_ancestral_iii',
  'eco_ancestral_iv',
  'eco_ancestral_v',
  'forja_despertada',
]));

function setText(node, value) {
  if (!node) return;
  const next = String(value);
  if (node.textContent !== next) node.textContent = next;
}

function setHidden(node, hidden) {
  if (!node) return;
  if (node.hidden !== hidden) node.hidden = hidden;
}

function setDisabled(node, disabled) {
  if (!node) return;
  if (node.disabled !== disabled) node.disabled = disabled;
}

function toggleClass(node, name, on) {
  if (!node) return;
  node.classList.toggle(name, Boolean(on));
}

function resolveLotCount(mode, entity, wallet, costMult) {
  const raw = String(mode ?? '1').trim().toLowerCase();
  if (raw === 'max' || raw === 'máx' || raw === 'maximo' || raw === 'máximo') {
    return entity.maxAffordable(wallet, costMult);
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, BUY_MAX_CAP);
}

function resolveLotCountFree(mode) {
  const raw = String(mode ?? '1').trim().toLowerCase();
  if (raw === 'max' || raw === 'máx' || raw === 'maximo' || raw === 'máximo') {
    return BUY_MAX_CAP;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, BUY_MAX_CAP);
}

export function interpolatedSouls(souls, sps, alpha, reducedMotion = false) {
  // Interpola no máximo 1 tick (1/TICK_FPS s) — nunca um segundo inteiro de SPS.
  // A HUD principal usa o saldo real; esta função serve a testes / efeitos opcionais.
  if (reducedMotion) return souls;
  const fraction = Number(alpha);
  if (!Number.isFinite(fraction) || fraction <= 0) return souls;
  const clamped = Math.min(1, Math.max(0, fraction));
  return add(souls, mul(sps, String(clamped / TICK_FPS)));
}

/**
 * Máscaras de rio (catálogo congelado).
 * T1 sempre; T2 ≥ 50 almas ou 1× T1; T3 1× T2 ou almas ≥ BaseCost/4;
 * T4 1× T3 ou almas ≥ BaseCost/4; T5–T6 Phlegethon (1× T4 ou ≥ PHLEGETHON_SOULS).
 */
/**
 * Próximos N geradores ainda fechados (prévia Cookie `???`).
 * @param {{ souls?: string, generators?: Record<string, number> }} ctx
 * @param {number} [limit]
 */
export function listMarketPreviewIds(ctx = {}, limit = 2) {
  const souls = ctx.souls ?? '0';
  const generators = ctx.generators && typeof ctx.generators === 'object' ? ctx.generators : {};
  const cap = Math.max(0, Math.floor(Number(limit) || 0));
  if (cap <= 0) return [];
  const out = [];
  for (const def of GENERATORS) {
    if (isGeneratorRevealed(def.id, { souls, generators })) continue;
    out.push(def.id);
    if (out.length >= cap) break;
  }
  return out;
}

/**
 * @returns {'open'|'preview'|'hidden'}
 */
export function marketRowVisibility(id, ctx = {}) {
  if (isGeneratorRevealed(id, ctx)) return 'open';
  const preview = listMarketPreviewIds(ctx, 2);
  if (preview.includes(id)) return 'preview';
  return 'hidden';
}

export function isGeneratorRevealed(id, { souls = '0', generators = {} } = {}) {
  const qty = generators && typeof generators === 'object' ? generators : {};
  const t1 = Number(qty.wandering_shade || 0);
  const t2 = Number(qty.charon_servants || 0);
  const t3 = Number(qty.cerberian_hound || 0);
  const t4 = Number(qty.tartarus_judge || 0);
  const t6 = Number(qty.obsidian_throne || 0);
  const t7 = Number(qty.mnemosyne_temple || 0);
  const t8 = Number(qty.styx_tower || 0);
  const t9 = Number(qty.star_barge || 0);
  const t10 = Number(qty.tartarus_lab || 0);
  const t11 = Number(qty.erebus_portal || 0);

  switch (id) {
    case 'wandering_shade':
      return true;
    case 'charon_servants':
      return t1 >= 1 || cmp(souls, COCYTUS_T2_SOULS) >= 0;
    case 'cerberian_hound': {
      const def = getGenerator(id);
      const threshold = def ? div(def.baseCost, '4') : '275';
      return t2 >= 1 || cmp(souls, threshold) >= 0;
    }
    case 'tartarus_judge': {
      const def = getGenerator(id);
      const threshold = def ? div(def.baseCost, '4') : '3000';
      return t3 >= 1 || cmp(souls, threshold) >= 0;
    }
    case 'phlegethon_forge':
    case 'obsidian_throne':
      return t4 >= 1 || cmp(souls, PHLEGETHON_SOULS) >= 0;
    case 'mnemosyne_temple': {
      const def = getGenerator(id);
      const threshold = def ? div(def.baseCost, '4') : '5000000';
      return t6 >= 1 || Number(qty[id] || 0) >= 1 || cmp(souls, threshold) >= 0;
    }
    case 'styx_tower': {
      const def = getGenerator(id);
      const threshold = def ? div(def.baseCost, '4') : '82500000';
      return t7 >= 1 || Number(qty[id] || 0) >= 1 || cmp(souls, threshold) >= 0;
    }
    case 'star_barge': {
      const def = getGenerator(id);
      const threshold = def ? div(def.baseCost, '4') : '1275000000';
      return t8 >= 1 || Number(qty[id] || 0) >= 1 || cmp(souls, threshold) >= 0;
    }
    case 'tartarus_lab': {
      const def = getGenerator(id);
      const threshold = def ? div(def.baseCost, '4') : '18750000000';
      return t9 >= 1 || Number(qty[id] || 0) >= 1 || cmp(souls, threshold) >= 0;
    }
    case 'erebus_portal': {
      const def = getGenerator(id);
      const threshold = def ? div(def.baseCost, '4') : '250000000000';
      return t10 >= 1 || Number(qty[id] || 0) >= 1 || cmp(souls, threshold) >= 0;
    }
    case 'chronos_loom': {
      const def = getGenerator(id);
      const threshold = def ? div(def.baseCost, '4') : '3500000000000';
      return t11 >= 1 || Number(qty[id] || 0) >= 1 || cmp(souls, threshold) >= 0;
    }
    case 'void_condenser':
    case 'moirai_prism':
    case 'fate_forge':
    case 'fractal_engine':
    case 'oracle_console':
    case 'chthonic_idleverse':
    case 'cortex_baker':
    case 'the_emperor': {
      const def = getGenerator(id);
      if (!def) return false;
      const prevDef = GENERATORS.find((g) => g.tier === def.tier - 1);
      const prevQty = prevDef ? Number(qty[prevDef.id] || 0) : 0;
      const threshold = div(def.baseCost, '4');
      return prevQty >= 1 || Number(qty[id] || 0) >= 1 || cmp(souls, threshold) >= 0;
    }
    default:
      return false;
  }
}

function resolveSellCount(mode, entity) {
  const owned = Math.max(0, Math.floor(Number(entity?.quantity) || 0));
  if (owned <= 0) return 0;
  const raw = String(mode ?? '1').trim().toLowerCase();
  if (raw === 'max' || raw === 'máx' || raw === 'maximo' || raw === 'máximo') {
    return owned;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(owned, n);
}

export function describeGeneratorCard(state, id, buyMode = '1', tradeAction = 'buy') {
  const entity = state.generators.get(id);
  const def = getGenerator(id);
  if (!entity || !def) return null;

  const quantities = state.quantities();
  const revealed = isGeneratorRevealed(id, { souls: state.souls, generators: quantities });
  const costMult = typeof state.costMult === 'function'
    ? state.costMult(id)
    : generatorCostMultForId(id, {
      upgrades: state.upgrades || [],
      seasons: state.seasons || null,
    });
  const upgradeMult = state.generatorUpgradeMult(id);
  const bonus = prestigeBonus(state.obols, state.talents, {
    upgrades: state.upgrades,
    milestones: state.milestones,
  });
  const { spsVerdictMult } = economyEffects(state.talents, state.verdictPurchases);
  const shinyMap = typeof state.shinyCounts === 'function'
    ? state.shinyCounts()
    : (state.shinyCounts || {});
  const goldMap = typeof state.goldCounts === 'function'
    ? state.goldCounts()
    : (state.goldCounts || {});
  const shiny = Number(shinyMap?.[id] || 0);
  const gold = Number(goldMap?.[id] || 0);
  let flatUnitBonus = '0';
  if (id === 'wandering_shade') {
    flatUnitBonus = thousandBladesBonusPerUnit(state.upgrades || [], quantities);
  } else if (id === 'charon_servants') {
    flatUnitBonus = elderPactServantFlatBonusPerUnit(state.upgrades || [], quantities);
  }
  const genLevels = state.generatorLevels || {};
  const level = Number(genLevels[id] || 0);
  const baseLine = lineSPS({
    qty: entity.quantity,
    shiny,
    gold,
    baseRate: def.baseRate,
    upgradeMult,
    flatUnitBonus,
    level,
  });
  const { spsMult: mgSpsMult } = minigameEffects({
    generatorLevels: genLevels,
    minigames: state.minigames || {},
  });
  const seasonalMult = seasonalCompoundMult(state.upgrades || []);
  const researchMult = catabaseResearchSpsMult(state.upgrades || []);
  const saturnMult = saturnaliaSpsMult(state.seasons || null, state.upgrades || []);
  const fortuneMult = fortuneGlobalSpsMult(state.upgrades || []);
  const scaleMult = dragonScaleSpsMult(state.upgrades || []);
  const pupMult = cerberusPupMult(
    state.upgrades || [],
    state.achievements || [],
    null,
    state.dragon || null,
    state.talents || [],
  );
  const reserveMult = nectarReserveMult(state.nectar || 0, state.talents || []);
  const auraMult = dragonAuraSpsMult(state.dragon || null);
  const covMult = elderCovenantMult(Boolean(state.catabase?.covenantActive));
  let lineRate = baseLine;
  for (const m of [
    bonus,
    spsVerdictMult,
    mgSpsMult,
    seasonalMult,
    researchMult,
    saturnMult,
    fortuneMult,
    scaleMult,
    pupMult,
    reserveMult,
    auraMult,
    covMult,
  ]) {
    lineRate = mul(lineRate, m);
  }

  const unitRate = effectiveUnitSPS({
    generatorId: id,
    generators: quantities,
    upgrades: state.upgrades || [],
    talents: state.talents || [],
    obols: state.obols ?? '0',
    verdictPurchases: state.verdictPurchases || [],
    rarity: 'normal',
    generatorLevels: genLevels,
    nectar: state.nectar || 0,
    minigames: state.minigames || {},
    achievements: state.achievements || [],
    catabase: state.catabase || null,
    dragon: state.dragon || null,
    seasons: state.seasons || null,
  });

  const action = String(tradeAction || 'buy').toLowerCase() === 'sell' ? 'sell' : 'buy';
  if (action === 'sell') {
    const sellLot = revealed ? resolveSellCount(buyMode, entity) : 0;
    const refundRate = typeof state.sellRefundRate === 'function' ? state.sellRefundRate() : '0.25';
    const refund = sellLot > 0 ? entity.sellRefund(sellLot, costMult, refundRate) : '0';
    const canSell = revealed && sellLot > 0;
    return {
      id,
      name: def.name,
      blurb: def.blurb,
      tier: def.tier,
      river: def.tier >= 5 ? 'phlegethon' : 'cocytus',
      revealed,
      quantity: entity.quantity,
      rate: lineRate,
      unitRate,
      tradeAction: 'sell',
      cost: refund,
      refund,
      refundRate,
      lot: sellLot,
      canBuy: canSell,
      canSell,
      amort: null,
    };
  }

  const free = Boolean(state.debugFlags?.freeShopping);
  const count = revealed
    ? (free ? resolveLotCountFree(buyMode) : resolveLotCount(buyMode, entity, state.souls, costMult))
    : 0;
  const cost = free
    ? '0'
    : (count > 0 ? entity.batchCost(count, costMult) : entity.nextPrice(costMult));
  const canBuy = revealed && count > 0 && (free || cmp(state.souls, cost) >= 0);
  const amort = amortizationSeconds(entity.nextPrice(costMult), unitRate);

  return {
    id,
    name: def.name,
    blurb: def.blurb,
    tier: def.tier,
    river: def.tier >= 5 ? 'phlegethon' : 'cocytus',
    revealed,
    quantity: entity.quantity,
    /** SPS da linha (todas as unidades, incl. negativo/gold) — mercado. */
    rate: lineRate,
    /** SPS de uma unidade normal (amortização / tip base). */
    unitRate,
    tradeAction: 'buy',
    cost,
    lot: count,
    canBuy,
    amort,
  };
}

/**
 * Tooltip do Mercado (3 casos Cookie):
 * 1. `owned` — já comprou: frase + SPS unitário + linha + lifetime
 * 2. `unbought` — revelado, qty 0: só frase
 * 3. `mystery` — prévia `???`: mistério
 *
 * @param {object} state
 * @param {string} id
 */
export function describeProductTip(state, id) {
  const def = getGenerator(id);
  if (!def || !state) return null;
  const quantities = typeof state.quantities === 'function'
    ? state.quantities()
    : (state.generators || {});
  const visibility = marketRowVisibility(id, { souls: state.souls, generators: quantities });
  if (visibility === 'hidden') return null;

  const view = describeGeneratorCard(state, id, '1', 'buy');
  if (!view) return null;

  if (visibility === 'preview') {
    return {
      kind: 'mystery',
      id,
      name: '???',
      blurb: '“???”',
      quantity: 0,
      cost: view.cost,
      spriteId: id,
    };
  }

  const qty = Math.max(0, Math.floor(Number(view.quantity) || 0));
  const lifetime = typeof state.generatorLifetime === 'function'
    ? state.generatorLifetime(id)
    : (state.generatorLifetimeSouls?.[id] || '0');

  if (qty <= 0) {
    return {
      kind: 'unbought',
      id,
      name: def.name,
      blurb: def.blurb,
      quantity: 0,
      cost: view.cost,
      spriteId: id,
    };
  }

  const totalSps = typeof state.effectiveSps === 'function'
    ? state.effectiveSps()
    : (typeof state.sps === 'function' ? state.sps() : '0');
  let sharePct = '0';
  if (cmp(totalSps, '0') > 0 && cmp(view.rate, '0') > 0) {
    sharePct = mul(div(view.rate, totalSps), '100');
  }

  return {
    kind: 'owned',
    id,
    name: def.name,
    blurb: def.blurb,
    quantity: qty,
    cost: view.cost,
    unitRate: view.unitRate,
    lineRate: view.rate,
    sharePct,
    lifetime,
    spriteId: id,
  };
}

/**
 * Tooltip de NPC (órbita / prateleira) — SPS efetiva da **unidade** (G3.1–G3.2 / Q7).
 * Distinto do card do mercado, que mostra a linha total.
 * Nome = persona misturada da turma; tempo de existência estável por índice (Cookie: “Memaw, idade 89”).
 *
 * @param {object} state
 * @param {string} generatorId
 * @param {{ shiny?: boolean, gold?: boolean, rarity?: 'normal'|'negativo'|'gold', index?: number }} [opts]
 */
export function describeNpcUnit(state, generatorId, opts = {}) {
  const def = getGenerator(generatorId);
  if (!def || !state) return null;
  const rarity = opts.rarity
    || (opts.gold ? 'gold' : (opts.shiny ? 'negativo' : 'normal'));
  const index = Number.isFinite(Number(opts.index)) ? Math.max(0, Math.floor(Number(opts.index))) : 0;
  const persona = describeUnitPersona(generatorId, index, { rarity });
  const quantities = typeof state.quantities === 'function'
    ? state.quantities()
    : (state.generators || {});
  const rate = effectiveUnitSPS({
    generatorId,
    generators: quantities,
    upgrades: state.upgrades || [],
    talents: state.talents || [],
    obols: state.obols ?? '0',
    verdictPurchases: state.verdictPurchases || [],
    rarity,
    generatorLevels: state.generatorLevels || {},
    nectar: state.nectar || 0,
    minigames: state.minigames || {},
    achievements: state.achievements || [],
  });
  return {
    id: generatorId,
    name: persona.name,
    typeName: def.name,
    age: persona.age,
    index,
    rate,
    rarity,
    shiny: rarity === 'negativo',
    gold: rarity === 'gold',
    blurb: `tempo de existência: ${persona.age}`,
    productionBlurb: NPC_UNIT_PRODUCTION_BLURB,
  };
}

export function formatMultiplier(value) {
  return `×${formatSouls(value)}`;
}

export function isStyxUnlocked({ souls = '0', generators = {} } = {}) {
  const ownedAny = Object.values(generators || {}).some((qty) => Number(qty) >= 1);
  return ownedAny || cmp(souls, STYX_UNLOCK_SOULS) >= 0;
}

export function isLetheOpen(state) {
  if (!state) return false;
  if (state.prestigeCount >= 1) return true;
  if (cmp(state.obols, '0') > 0 || cmp(state.mnemosyne, '0') > 0) return true;
  if (state.canPrestige()) return true;
  return cmp(state.runSouls, LETHE_PREVIEW_RUN_SOULS) >= 0;
}

/** Só o efeito mecânico (sem flavor do catálogo). */
export function upgradeEffectText(upgrade) {
  if (!upgrade) return '';
  // Q16 / J.1 — Juramentos T4 ≠ Vereditos do minigame Juízo.
  if (upgrade.id === 'veredito_tartaro' || upgrade.id === 'lei_inquebravel') {
    return `Juramento do Styx: ×${upgrade.factor} no Juiz do Tártaro (gerador). Não é Veredito do Juízo.`;
  }
  if (upgrade.kind === 'clickMult') return `A Foice rende ×${upgrade.factor}.`;
  if (upgrade.kind === 'clickKSps') {
    const pct = mul(upgrade.factor, '100');
    return `O clique ganha ${pct}% das Almas / s.`;
  }
  if (upgrade.kind === 'thousandBlades') {
    return `A Foice e cada Sombra Vagante ganham +${upgrade.factor} por gerador não-Sombra.`;
  }
  if (upgrade.kind === 'thousandBladesMult') {
    return `Multiplica o bônus de Mil Foices por ×${upgrade.factor}.`;
  }
  if (upgrade.kind === 'synergyMult') {
    const baseGen = getGenerator(upgrade.baseGeneratorId);
    const boostedGen = getGenerator(upgrade.boostedGeneratorId);
    const baseName = baseGen?.name ?? upgrade.baseGeneratorId;
    const boostedName = boostedGen?.name ?? upgrade.boostedGeneratorId;
    const boostedPct = mul(upgrade.boostedBonusPerBase || '0.05', '100');
    const basePct = mul(upgrade.baseBonusPerBoosted || '0.001', '100');
    return `${boostedName} ganha +${boostedPct}% SPS por ${baseName}; ${baseName} ganha +${basePct}% SPS por ${boostedName}.`;
  }
  if (upgrade.kind === 'generatorMult') {
    const gen = getGenerator(upgrade.generatorId);
    return `${gen?.name ?? 'O gerador'} rende ×${upgrade.factor}.`;
  }
  if (upgrade.kind === 'allGeneratorsMult') return `Todos os geradores rendem ×${upgrade.factor}.`;
  if (upgrade.kind === 'veilMult' || upgrade.kind === 'kittenMult') {
    return `Multiplica o SPS global em 1 + (Véu × ${upgrade.factor}).`;
  }
  if (upgrade.kind === 'catabaseResearch') {
    return `Pesquisa do Arquivo Estígio (×${upgrade.factor} SPS global).`;
  }
  if (upgrade.kind === 'leechCap') {
    return `Aumenta a capacidade de Sanguessugas em +${upgrade.factor} slots.`;
  }
  if (upgrade.kind === 'leechPayout') {
    return `Aumenta o retorno ao estourar Sanguessugas em ×${upgrade.factor}.`;
  }
  if (upgrade.kind === 'dragonScale') {
    return `Escama Dracónica (×${upgrade.factor} SPS global).`;
  }
  if (upgrade.kind === 'seasonalCompound') {
    const pct = mul(upgrade.factor || '0.01', '100');
    return `Relíquia Sazonal (+${pct}% SPS composto).`;
  }
  if (upgrade.kind === 'saturnaliaMult') {
    return `Bênção da Saturnália (×${upgrade.factor} SPS global).`;
  }
  if (upgrade.kind === 'hermesContract') {
    return `Contrato de Hermes (−2% custo de todos os geradores).`;
  }
  if (upgrade.kind === 'fortuneGlobal') {
    return `Fortuna de Hermes (×${upgrade.factor} SPS global).`;
  }
  if (upgrade.kind === 'fortuneObol') {
    return `Fortuna de Hermes (+1% ganho de Óbolos no Lethe).`;
  }
  if (upgrade.kind === 'fortuneLine') {
    const gen = getGenerator(upgrade.generatorId);
    return `Fortuna de ${gen?.name ?? upgrade.generatorId}: +7% SPS e −7% custo.`;
  }
  return '';
}

/** Efeito + flavor concatenados (compat / selados / callers legados). */
export function upgradeBlurb(upgrade) {
  if (!upgrade) return '';
  const effect = upgradeEffectText(upgrade);
  const flavor = upgrade.blurb ? String(upgrade.blurb) : '';
  if (effect && flavor) return `${effect} ${flavor}`;
  return effect || flavor;
}

/**
 * Status curto para o tip Styx.
 * @param {{ owned?: boolean, canBuy?: boolean, revealed?: boolean, meets?: boolean }} view
 */
export function upgradeAffordHint(view) {
  if (!view) return '';
  if (view.owned) return 'Já selado';
  if (view.canBuy) return 'Pode comprar';
  if (view.revealed && view.meets === false) return 'Requisito em falta';
  if (view.revealed) return 'Almas insuficientes';
  return '';
}

export function upgradeRequirementText(upgrade) {
  if (!upgrade) return '';
  const req = upgrade.requires || {};
  const parts = [];
  if (req.upgradeId) {
    const prev = getUpgrade(req.upgradeId);
    parts.push(prev?.name ?? 'juramento anterior');
  }
  if (Array.isArray(req.allUpgradeIds) && req.allUpgradeIds.length > 0) {
    const names = req.allUpgradeIds
      .map((id) => getUpgrade(id)?.name ?? String(id))
      .join(', ');
    parts.push(names);
  }
  if (req.talentId) {
    const talent = getTalent(req.talentId);
    parts.push(talent?.name ?? String(req.talentId));
  }
  if (req.generatorId) {
    const gen = getGenerator(req.generatorId);
    const qty = Number(req.quantity || 0);
    const label = gen?.name ?? 'servo';
    parts.push(qty <= 1 ? label : `${qty}× ${label}`);
  }
  if (req.minGenerators && typeof req.minGenerators === 'object') {
    for (const [genId, minQty] of Object.entries(req.minGenerators)) {
      const gen = getGenerator(genId);
      const qty = Number(minQty || 0);
      const label = gen?.name ?? genId;
      parts.push(qty <= 1 ? label : `${qty}× ${label}`);
    }
  }
  if (req.minVeilPercent != null && Number(req.minVeilPercent) > 0) {
    parts.push(`Véu ${Number(req.minVeilPercent)}%`);
  }
  if (req.researchId) {
    parts.push('Pesquisa concluída no Arquivo Estígio');
  }
  if (req.dragonStage) {
    parts.push(`Dragão estágio ${Number(req.dragonStage)}`);
  }
  if (req.seasonalDropId) {
    parts.push('Relíquia revelada na Estação');
  }
  if (req.fortuneId) {
    parts.push('Fortuna reivindicada no Ticker');
  }
  if (parts.length > 0) {
    return `Exige ${parts.join(' · ')}`;
  }
  if (req.minSouls != null && cmp(req.minSouls, '0') > 0) {
    return `Exige ${formatSouls(req.minSouls)} almas`;
  }
  return 'Sem requisito especial';
}

export function describeSpsBreakdownSummary(state = {}) {
  const bd = typeof state?.spsBreakdown === 'function'
    ? state.spsBreakdown()
    : calculateSpsBreakdown({
      generators: typeof state?.quantities === 'function' ? state.quantities() : (state?.generators || {}),
      upgrades: state?.upgrades || [],
      talents: state?.talents || [],
      obols: state?.obols ?? '0',
      verdictPurchases: state?.verdictPurchases || [],
      shinyCounts: typeof state?.shinyCounts === 'function' ? state.shinyCounts() : (state?.shinyCounts || {}),
      goldCounts: typeof state?.goldCounts === 'function' ? state.goldCounts() : (state?.goldCounts || {}),
      activeBuffs: state?.activeBuffs || {},
      generatorLevels: state?.generatorLevels || {},
      nectar: state?.nectar || 0,
      minigames: state?.minigames || {},
      achievements: state?.achievements || [],
      catabase: state?.catabase || null,
      dragon: state?.dragon || null,
      seasons: state?.seasons || null,
    });

  const parts = [
    `Linhas ${formatRate(bd.baseLinesSps)}`,
    `Prestígio ${formatMultiplier(bd.prestigeMult)}`,
  ];
  if (cmp(bd.verdictMult, '1') !== 0) parts.push(`Vereditos ${formatMultiplier(bd.verdictMult)}`);
  if (cmp(bd.minigamesMult, '1') !== 0) parts.push(`Minigames ${formatMultiplier(bd.minigamesMult)}`);
  if (cmp(bd.seasonalCompoundMult, '1') !== 0) parts.push(`Relíquias ${formatMultiplier(bd.seasonalCompoundMult)}`);
  if (cmp(bd.catabaseResearchMult, '1') !== 0) parts.push(`Catábase ${formatMultiplier(bd.catabaseResearchMult)}`);
  if (cmp(bd.saturnaliaMult, '1') !== 0) parts.push(`Saturnália ${formatMultiplier(bd.saturnaliaMult)}`);
  if (cmp(bd.fortuneGlobalMult, '1') !== 0) parts.push(`Fortunas ${formatMultiplier(bd.fortuneGlobalMult)}`);
  if (cmp(bd.dragonScaleMult, '1') !== 0) parts.push(`Escama ${formatMultiplier(bd.dragonScaleMult)}`);
  if (cmp(bd.cerberusPupMult, '1') !== 0) parts.push(`Filhotes ${formatMultiplier(bd.cerberusPupMult)}`);
  if (cmp(bd.nectarReserveMult, '1') !== 0) parts.push(`Néctar ${formatMultiplier(bd.nectarReserveMult)}`);
  if (cmp(bd.dragonAuraMult, '1') !== 0) parts.push(`Auras ${formatMultiplier(bd.dragonAuraMult)}`);
  if (cmp(bd.elderCovenantMult, '1') !== 0) parts.push(`Aliança ${formatMultiplier(bd.elderCovenantMult)}`);
  if (cmp(bd.activeBuffsMult, '1') !== 0) parts.push(`Buffs ${formatMultiplier(bd.activeBuffsMult)}`);

  const dragonStageDef = getDragonStage(state?.dragon?.stage || 0);
  const auraNames = [];
  if (state?.dragon?.auraSlot1) auraNames.push(getDragonAura(state.dragon.auraSlot1)?.name || state.dragon.auraSlot1);
  if (state?.dragon?.auraSlot2) auraNames.push(getDragonAura(state.dragon.auraSlot2)?.name || state.dragon.auraSlot2);
  const dragonLabel = `${dragonStageDef.name} (Estágio ${dragonStageDef.stage}/4) · Auras: ${auraNames.length ? auraNames.join(' + ') : 'nenhuma'}`;

  const activeSeasonDef = state?.seasons?.activeSeason ? getSeason(state.seasons.activeSeason) : null;
  const saturnLv = Number(state?.seasons?.saturnKingLevel || 0);
  const claimedCount = Math.max(
    state?.fortunes?.claimedIds?.length || 0,
    state?.fortunes?.lifetimeClaimedIds?.length || 0,
  );
  const seasonLabel = `${activeSeasonDef ? activeSeasonDef.name : 'Neutra'}${saturnLv > 0 ? ` · Rei Saturno Nv.${saturnLv}` : ''} · Fortunas: ${claimedCount}/${FORTUNES.length}`;

  return {
    ...bd,
    rawMultiplierLabel: formatMultiplier(bd.rawMultiplier),
    stackBreakdownLabel: parts.join(' · '),
    dragonLabel,
    seasonLabel,
  };
}

export function describeVeilSummary(state = {}) {
  const econPct = typeof state?.veilPercent === 'function'
    ? state.veilPercent()
    : economicVeilPercent(state?.achievements || [], state?.normalAchievementsCount);
  const econFrac = typeof state?.veilFraction === 'function'
    ? state.veilFraction()
    : economicVeilFraction(state?.achievements || [], state?.normalAchievementsCount);
  const tier = typeof state?.veilTier === 'function'
    ? state.veilTier()
    : economicVeilTier(state?.achievements || [], state?.normalAchievementsCount);
  const pupMult = typeof state?.cerberusPupMult === 'function'
    ? state.cerberusPupMult()
    : cerberusPupMult(
      state?.upgrades || [],
      state?.achievements || [],
      state?.normalAchievementsCount,
      state?.dragon || null,
      state?.talents || [],
    );
  const pupOwned = (state?.upgrades || []).filter((id) => CERBERUS_PUP_UPGRADE_IDS.includes(String(id))).length;
  const pupTotal = CERBERUS_PUP_UPGRADE_IDS.length;
  const wagesHint = talentEffects(state?.talents || []).kittenUpgradeDiscount
    ? ' · Wages −10% Filhotes'
    : '';
  return {
    veilPercent: econPct,
    veilFraction: econFrac,
    tier,
    pupMult,
    pupOwned,
    pupTotal,
    label: `Véu: ${econPct}% (${tier.name}) · Filhotes ${pupOwned}/${pupTotal} · Mult Cerberiano: ${formatMultiplier(pupMult)}${wagesHint}`,
  };
}

export function describeCatabaseSummary(state = {}) {
  const rawSps = typeof state?.rawSps === 'function'
    ? state.rawSps()
    : (typeof state?.sps === 'function' ? state.sps() : (state?.sps || '0'));
  const effectiveSps = typeof state?.effectiveSps === 'function'
    ? state.effectiveSps()
    : rawSps;
  const drainInfo = typeof state?.leechDrainInfo === 'function'
    ? state.leechDrainInfo()
    : { count: state?.catabase?.leeches?.length || 0, drainPercent: (state?.catabase?.leeches?.length || 0) * 5 };
  const leechSummary = typeof state?.leechSummary === 'function'
    ? state.leechSummary()
    : { totalDigested: '0', totalPayout: '0', count: drainInfo.count };
  const spsLine = drainInfo.count > 0
    ? `${formatRate(effectiveSps)} (Bruto: ${formatRate(rawSps)} · ${drainInfo.count} Sanguessugas: −${drainInfo.drainPercent}%)`
    : `${formatRate(rawSps)} (Bruto: ${formatRate(rawSps)} · 0 Sanguessugas: −0%)`;
  const digestedLine = `${formatSouls(leechSummary.totalDigested)} almas retidas (retorno no pop: +${formatSouls(leechSummary.totalPayout)})`;
  return {
    rawSps,
    effectiveSps,
    leechesCount: drainInfo.count,
    drainPercent: drainInfo.drainPercent,
    totalDigested: leechSummary.totalDigested,
    totalPayout: leechSummary.totalPayout,
    spsLine,
    digestedLine,
  };
}

export function describeUpgradeCard(state, id) {
  const upgrade = UPGRADES.find((item) => item.id === id) ?? null;
  if (!upgrade) return null;
  const quantities = state.quantities();
  const styx = isStyxUnlocked({ souls: state.souls, generators: quantities });
  const owned = state.upgrades.includes(id);
  const meets = meetsUpgradeRequirement(upgrade, {
    souls: state.souls,
    generators: quantities,
    upgrades: state.upgrades,
    talents: state.talents || [],
    achievements: state.achievements || [],
    veilPercent: typeof state.veilPercent === 'function' ? state.veilPercent() : undefined,
    catabase: state.catabase || null,
    dragon: state.dragon || null,
    seasons: state.seasons || null,
    fortunes: state.fortunes || null,
  });
  // D-D1: owned N+1 sem N continua visível como owned (selados/efeitos);
  // só o reveal da strip exige meets (N+1 hidden até comprar N).
  const revealed = styx && (owned || meets);
  const free = Boolean(state.debugFlags?.freeShopping);
  const effCost = typeof state.upgradeCost === 'function'
    ? state.upgradeCost(upgrade)
    : upgradeEffectiveCost(upgrade, {
      upgrades: state.upgrades || [],
      seasons: state.seasons || null,
    });
  const canBuy = revealed && !owned && meets && (free || cmp(state.souls, effCost) >= 0);
  const cosDef = cosmeticForUpgrade(id);
  const effect = upgradeEffectText(upgrade);
  const flavor = upgrade.blurb ? String(upgrade.blurb) : '';
  return {
    id,
    name: upgrade.name,
    blurb: upgradeBlurb(upgrade),
    effect,
    flavor,
    requirement: upgradeRequirementText(upgrade),
    cost: free ? '0' : effCost,
    owned,
    revealed,
    meets,
    canBuy,
    affordHint: upgradeAffordHint({ owned, canBuy, revealed, meets }),
    cosmetic: cosDef
      ? {
        accessory: cosDef.accessory,
        label: cosmeticLabel(cosDef.accessory),
        layer: cosDef.layer,
        targetGeneratorId: cosDef.targetGeneratorId || null,
        target: cosDef.target || null,
      }
      : null,
  };
}

/**
 * Ordena a strip Styx (Fase D / D3).
 * Tier A: canBuy, custo crescente (empate = ordem do catálogo).
 * Tier B: revealed && !canBuy, ordem do catálogo.
 * @param {{ id: string, canBuy: boolean, cost: string|number, catalogIndex: number }[]} cards
 * @returns {string[]} ids na ordem de exibição
 */
export function sortStyxVisible(cards = []) {
  const list = Array.isArray(cards) ? cards.filter(Boolean) : [];
  const tierA = [];
  const tierB = [];
  for (const card of list) {
    if (card.canBuy) tierA.push(card);
    else tierB.push(card);
  }
  tierA.sort((a, b) => {
    const byCost = cmp(a.cost ?? '0', b.cost ?? '0');
    if (byCost !== 0) return byCost;
    return (Number(a.catalogIndex) || 0) - (Number(b.catalogIndex) || 0);
  });
  tierB.sort(
    (a, b) => (Number(a.catalogIndex) || 0) - (Number(b.catalogIndex) || 0),
  );
  return [...tierA, ...tierB].map((card) => card.id);
}

export function describeTalentCard(state, id) {
  const talent = TALENTS.find((item) => item.id === id) ?? null;
  if (!talent) return null;
  const owned = state.talents.includes(id);
  const ascensionOpen = Boolean(state.ascensionOpen);
  const canBuy = ascensionOpen
    && !owned
    && cmp(state.mnemosyne, talent.cost) >= 0
    && meetsTalentRequirement(talent, { talents: state.talents });
  return {
    id,
    name: talent.name,
    blurb: talent.blurb || TALENT_BLURB[id] || '',
    cost: talent.cost,
    owned,
    canBuy,
    nextRun: TALENT_NEXT_RUN.has(id),
  };
}

export function describeVerdictCard(state, id) {
  const item = VERDICT_SHOP.find((entry) => entry.id === id) ?? null;
  if (!item) return null;
  const owned = (state.verdictPurchases || []).includes(id);
  const verdicts = Number(state.verdicts) || 0;
  const cost = Number(item.cost) || 0;
  const cosDef = cosmeticForUpgrade(id);
  return {
    id,
    name: item.name,
    blurb: item.blurb,
    cost,
    owned,
    canBuy: !owned && verdicts >= cost,
    cosmetic: cosDef
      ? {
        accessory: cosDef.accessory,
        label: cosmeticLabel(cosDef.accessory),
        layer: cosDef.layer,
        target: cosDef.target || null,
      }
      : null,
  };
}

/** Ordem de grandeza do SPS (G5.1) — -1 se ≤ 0. */
export function spsOrderOfMagnitude(sps) {
  const n = Number(sps);
  if (!Number.isFinite(n) || n <= 0) return -1;
  return Math.floor(Math.log10(n));
}

export function describeLethe(state) {
  const preview = state.prestigePreview();
  const open = isLetheOpen(state);
  const canDrink = state.canPrestige();
  const bonus = prestigeBonus(state.obols, state.talents, {
    upgrades: state.upgrades,
    milestones: state.milestones,
  });
  const pantheonOpen = open && (
    state.prestigeCount >= 1
    || cmp(state.mnemosyne, '0') > 0
    || state.talents.length > 0
  );
  let previewText = 'A parede ainda não cedeu — o ritual não rende Óbolos.';
  if (canDrink) {
    previewText = `Esta corrida renderia ${formatSouls(preview.obolsGain)} Óbolos de Caronte e ${formatSouls(preview.mnemosyneGain)} Essência de Mnemosyne.`;
  } else if (open) {
    previewText = 'A parede já se vê, mas o ritual ainda não rende Óbolos.';
  }
  const permanents = countLethePermanents(state);
  return {
    open,
    canDrink,
    preview,
    previewText,
    bonus,
    pantheonOpen,
    obols: state.obols,
    mnemosyne: state.mnemosyne,
    ...permanents,
    memoryPreviewText: formatLetheMemoryPreview(permanents),
    memoryToastText: formatLetheMemoryToast(permanents),
  };
}

/** Contagens permanentes que sobrevivem ao Lethe (F3). */
export function countLethePermanents(state) {
  const talentCount = Array.isArray(state?.talents) ? state.talents.length : 0;
  const verdictCount = Array.isArray(state?.verdictPurchases)
    ? state.verdictPurchases.length
    : 0;
  return { talentCount, verdictCount };
}

/** Copy 0F — bloco preview do painel / modal. */
export function formatLetheMemoryPreview({ talentCount = 0, verdictCount = 0 } = {}) {
  return `Memória que permanece · Óbolos · ${talentCount} talentos · ${verdictCount} sentenças da Bancada`;
}

/** Copy 0F — toast pós-ritual. */
export function formatLetheMemoryToast({ talentCount = 0, verdictCount = 0 } = {}) {
  return `Memória preservada: ${talentCount} talentos · ${verdictCount} sentenças`;
}

export function loadPerfPrefs(storage = globalThis?.localStorage) {
  const out = { ...DEFAULT_PERF_PREFS };
  if (!storage || typeof storage.getItem !== 'function') return out;
  try {
    const raw = storage.getItem(PERF_PREFS_STORAGE_KEY);
    if (!raw) return out;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      if (typeof parsed.cursors === 'boolean') out.cursors = parsed.cursors;
      if (typeof parsed.particles === 'boolean') out.particles = parsed.particles;
      if (typeof parsed.fancy === 'boolean') out.fancy = parsed.fancy;
    }
  } catch {
    /* ignore */
  }
  return out;
}

export function savePerfPrefs(prefs, storage = globalThis?.localStorage) {
  if (!storage || typeof storage.setItem !== 'function') return;
  try {
    storage.setItem(PERF_PREFS_STORAGE_KEY, JSON.stringify({
      cursors: Boolean(prefs?.cursors ?? true),
      particles: Boolean(prefs?.particles ?? true),
      fancy: Boolean(prefs?.fancy ?? true),
    }));
  } catch {
    /* ignore */
  }
}

export class UIRenderer {
  constructor(root, options = {}) {
    this.root = root;
    this.state = options.state ?? null;
    this.buyMode = BUY_MODES.includes(options.buyMode) ? options.buyMode : '1';
    this.tradeAction = String(options.tradeAction || 'buy').toLowerCase() === 'sell' ? 'sell' : 'buy';
    this.onBuy = typeof options.onBuy === 'function' ? options.onBuy : null;
    this.onSell = typeof options.onSell === 'function' ? options.onSell : null;
    this.onBuyMode = typeof options.onBuyMode === 'function' ? options.onBuyMode : null;
    this.onTradeAction = typeof options.onTradeAction === 'function' ? options.onTradeAction : null;
    this.onBuyUpgrade = typeof options.onBuyUpgrade === 'function' ? options.onBuyUpgrade : null;
    this.onBuyTalent = typeof options.onBuyTalent === 'function' ? options.onBuyTalent : null;
    this.onBuyVerdict = typeof options.onBuyVerdict === 'function' ? options.onBuyVerdict : null;
    this.onOpenLethe = typeof options.onOpenLethe === 'function' ? options.onOpenLethe : null;
    this.onClickShimmer = typeof options.onClickShimmer === 'function' ? options.onClickShimmer : null;
    this.onAmortSeen = typeof options.onAmortSeen === 'function' ? options.onAmortSeen : null;
    this.onLetheFirstUnlock =
      typeof options.onLetheFirstUnlock === 'function' ? options.onLetheFirstUnlock : null;
    this.getUserId = typeof options.getUserId === 'function' ? options.getUserId : () => null;
    this.getToken = typeof options.getToken === 'function' ? options.getToken : () => null;
    this._perfStorage = 'perfStorage' in options ? options.perfStorage : (globalThis?.localStorage ?? null);
    this._prefs = {
      ...loadPerfPrefs(this._perfStorage),
      ...(options.prefs && typeof options.prefs === 'object' ? options.prefs : {}),
    };
    this._autoLodActive = false;
    this._hud = null;
    this._cards = new Map();
    this._upgrades = new Map();
    this._talents = new Map();
    this._verdicts = new Map();
    this._styx = null;
    this._styxTip = null;
    this._npcTip = null;
    this._sealed = null;
    this._sealedTip = null;
    this._lethe = null;
    /** @type {{ open: Function, close: Function, refresh: Function, isOpen: Function }|null} */
    this._memoryRiver = null;
    this._bancada = null;
    this._bancadaTip = null;
    this._bancadaOrderSig = '';
    this._pantheonOrderSig = '';
    /** @type {CodexBook|null} */
    this._codexBook = null;
    /** @type {LoopLeaderboard|null} */
    this._loopBoard = null;
    /** @type {{ activate: Function, getSelectedKey: Function, tabs: Element[] }|null} */
    this._pantheonSubTabs = null;
    this._pantheonSubKey = 'available';
    this._pantheonSubUserPicked = false;
    /** @type {{ activate: Function, getSelectedKey: Function, tabs: Element[] }|null} */
    this._bancadaSubTabs = null;
    this._bancadaSubKey = 'available';
    this._bancadaSubUserPicked = false;
    this._world = null;
    this._altar = null;
    this._shimmerView = null;
    this._minigamesView = null;
    this._modeButtons = [];
    this._actionButtons = [];
    this._prefInputs = new Map();
    this._lodStatusEl = null;
    this._mounted = false;
    /**
     * Perf-2: controle de cadência e dirty flags explícitos.
     */
    this._uiDirty = {
      market: true,
      styx: true,
      world: true,
      stats: true,
      lethe: true,
      bancada: true,
    };
    this._lastStructureVersion = -1;
    this._lastSlowSyncAt = -Infinity;
    this.slowSyncIntervalMs = Number(options.slowSyncIntervalMs) > 0
      ? Number(options.slowSyncIntervalMs)
      : PERF_UI_SLOW_INTERVAL_MS;
    /** @type {number|null} última OoM do SPS (G5.1 bump) */
    this._lastSpsMag = null;
    /** @type {{ id: string, text: string }[]} */
    this._rumorPool = [];
    this._rumorIndex = 0;
    this._rumorSig = '';
    this._rumorNextAt = 0;
    this._rumorHoldUntil = 0;
    this._rumorCurrent = '';
    this._shinyRumorUsed = false;
    this._goldRumorUsed = false;
    /** @type {Set<string>} ids de edu-log já anunciados no letreiro (C2) */
    this._eduAnnounced = new Set();
  }

  mount(state = this.state) {
    if (!this.root || this._mounted) return this;
    this.state = state ?? this.state;
    this._eduAnnounced = new Set(this.state?.eduLogsSeen || []);
    this._hud = {
      souls: this.root.getElementById('despertar-souls'),
      sps: this.root.getElementById('despertar-sps'),
      click: this.root.getElementById('despertar-click'),
      bonus: this.root.getElementById('despertar-bonus'),
      hint: this.root.querySelector('#acheron-altar .despertar-col__hint'),
    };
    this.#mountMarket();
    this.#bindBuyModes();
    this.#mountStyx();
    this.#mountNpcTip();
    this.#mountShelves();
    this.#mountAltar();
    this.#mountLethe();
    this.#mountBancada();
    this.#mountMinigames();
    this.#mountCodexBook();
    this.#mountLoopBoard();
    this.#mountPerfPrefs();
    this._ticker = this.root.getElementById('despertar-ticker');
    if (this._ticker) {
      bindMarquee(this._ticker);
      this._ticker.addEventListener?.('click', () => this.#handleTickerClick());
    }
    this._stats = this.root.getElementById('despertar-stats');
    this._sealed = {
      empty: this.root.getElementById('sealed-empty'),
      list: this.root.getElementById('sealed-list'),
      section: this.root.getElementById('despertar-sealed-juramentos'),
    };
    this.#mountSealedTip();
    this._veil = this.root.getElementById('despertar-veil');
    if (!this._mundoHint) {
      this._mundoHint = this.root.getElementById('mundo-hint');
    }
    this._mounted = true;
    this.markDirty('all');
    if (this.state) this.render(0, { reducedMotion: true, forceFull: true, nowMs: 0 });
    return this;
  }

  /**
   * Marca seções da UI como sujas (Perf-2: event-driven).
   * @param {'all'|'market'|'styx'|'world'|'stats'|'lethe'|'bancada'} [section]
   */
  markDirty(section = 'all') {
    if (section === 'all') {
      this._uiDirty.market = true;
      this._uiDirty.styx = true;
      this._uiDirty.world = true;
      this._uiDirty.stats = true;
      this._uiDirty.lethe = true;
      this._uiDirty.bancada = true;
      return;
    }
    if (section in this._uiDirty) {
      this._uiDirty[section] = true;
    }
  }

  /**
   * Retorna preferências efetivas de performance (respeitando auto-LOD).
   */
  getPerfPrefs() {
    return {
      cursors: Boolean(this._prefs.cursors),
      particles: Boolean(this._prefs.particles && !this._autoLodActive),
      fancy: Boolean(this._prefs.fancy && !this._autoLodActive),
    };
  }

  /**
   * Define uma ou mais preferências na Estela (Perf-4).
   * @param {{ cursors?: boolean, particles?: boolean, fancy?: boolean }} patch
   * @param {{ persist?: boolean }} [opts]
   */
  setPerfPrefs(patch = {}, opts = {}) {
    if (!patch || typeof patch !== 'object') return this.getPerfPrefs();
    if (typeof patch.cursors === 'boolean') this._prefs.cursors = patch.cursors;
    if (typeof patch.particles === 'boolean') this._prefs.particles = patch.particles;
    if (typeof patch.fancy === 'boolean') this._prefs.fancy = patch.fancy;
    if (opts.persist !== false) {
      savePerfPrefs(this._prefs, this._perfStorage);
    }
    for (const [key, input] of this._prefInputs.entries()) {
      if (input && key in this._prefs) {
        input.checked = Boolean(this._prefs[key]);
      }
    }
    const effective = this.getPerfPrefs();
    this._world?.setPrefs?.(effective);
    this._altar?.setPrefs?.(effective);
    this.markDirty('world');
    if (this.state && this._mounted) {
      this.#renderShelves(this.state, { reducedMotion: false });
      this.#syncAltarState(this.state, { reducedMotion: false });
    }
    return effective;
  }

  /**
   * Ativa/desativa degradação automática quando FPS < 28 (Perf-4).
   */
  applyAutoLod(active = true) {
    const next = Boolean(active);
    if (this._autoLodActive === next) return this.getPerfPrefs();
    this._autoLodActive = next;
    if (this._lodStatusEl) {
      setHidden(this._lodStatusEl, !next);
    }
    const effective = this.getPerfPrefs();
    this._world?.setPrefs?.(effective);
    this._altar?.setPrefs?.(effective);
    this.markDirty('world');
    return effective;
  }

  #mountPerfPrefs() {
    this._prefInputs.clear();
    const host = this.root.getElementById?.('despertar-prefs') || this.root;
    this._lodStatusEl = this.root.getElementById?.('despertar-prefs-lod-status') || null;
    const inputs = host?.querySelectorAll
      ? [...host.querySelectorAll('[data-perf-pref]')]
      : [];
    for (const input of inputs) {
      const key = input.getAttribute?.('data-perf-pref');
      if (!key) continue;
      input.checked = Boolean(this._prefs[key]);
      this._prefInputs.set(key, input);
      input.addEventListener?.('change', () => {
        if (this._autoLodActive && input.checked) {
          this.applyAutoLod(false);
        }
        this.setPerfPrefs({ [key]: Boolean(input.checked) });
      });
    }
  }

  setBuyMode(mode) {
    const raw = String(mode ?? '1').trim().toLowerCase();
    const next = raw === 'máx' ? 'max' : raw;
    if (!BUY_MODES.includes(next)) return this.buyMode;
    this.buyMode = next;
    this._modeButtons.forEach((button) => {
      toggleClass(button, 'is-active', button.getAttribute('data-buy-mode') === next);
    });
    this.onBuyMode?.(next);
    this.markDirty('market');
    if (this.state) this.#renderMarket(this.state);
    return next;
  }

  setTradeAction(action = 'buy') {
    const next = String(action ?? 'buy').trim().toLowerCase() === 'sell' ? 'sell' : 'buy';
    this.tradeAction = next;
    this._actionButtons.forEach((button) => {
      toggleClass(button, 'is-active', button.getAttribute('data-trade-action') === next);
    });
    this.onTradeAction?.(next);
    this.markDirty('market');
    if (this.state) this.#renderMarket(this.state);
    return next;
  }

  render(alpha = 0, meta = {}) {
    return withPerfMeasure('UIRenderer.render', () => {
      const state = this.state;
      if (!state || !this._mounted) return;
      const reducedMotion = Boolean(meta.reducedMotion);
      if (meta.autoLod && !this._autoLodActive) {
        this.applyAutoLod(true);
      }
      const effectivePrefs = this.getPerfPrefs();
      const nowMs = Number.isFinite(meta.nowMs)
        ? meta.nowMs
        : (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
      const dtSeconds = Number.isFinite(meta.dt) ? meta.dt : 1 / TICK_FPS;

      // Detecta mutação estrutural (compra de gerador/upgrade/talento/veredito/prestígio).
      const structVer = Number(state.structureVersion) || 0;
      if (structVer !== this._lastStructureVersion) {
        this._lastStructureVersion = structVer;
        this.markDirty('all');
      }

      // --- Caminho Rápido (60 Hz): HUD de Almas, SPS, Clique e frame de animação ---
      void alpha;
      setText(this._hud?.souls, formatSouls(state.souls));
      const sps = state.sps();
      setText(this._hud?.sps, formatRate(sps));
      if (!reducedMotion && effectivePrefs.fancy && this._hud?.sps) {
        const mag = spsOrderOfMagnitude(sps);
        if (this._lastSpsMag != null && mag > this._lastSpsMag) {
          juiceBumpClass(this._hud.sps, 'is-bump', 380);
        }
        this._lastSpsMag = mag;
      } else if (this._hud?.sps) {
        this._lastSpsMag = spsOrderOfMagnitude(sps);
      }
      setText(this._hud?.click, formatSouls(state.clickPower()));

      // --- Caminho Lento (~4–10 Hz) ou Event-Driven (Dirty Flags) ---
      const slowDue = Boolean(meta.forceFull)
        || (nowMs - this._lastSlowSyncAt >= this.slowSyncIntervalMs);
      const anyDirty = this._uiDirty.market
        || this._uiDirty.styx
        || this._uiDirty.world
        || this._uiDirty.stats
        || this._uiDirty.lethe
        || this._uiDirty.bancada;

      if (slowDue || anyDirty) {
        if (slowDue) this._lastSlowSyncAt = nowMs;
        setText(this._hud?.bonus, formatMultiplier(prestigeBonus(state.obols, state.talents, {
          upgrades: state.upgrades,
          milestones: state.milestones,
        })));
        this.#renderHint(state);
        this.#renderTicker(state, { reducedMotion });
        this.#renderVeil(state, { reducedMotion, prefs: effectivePrefs });

        if (slowDue || this._uiDirty.market) {
          this.#renderMarket(state);
          this._uiDirty.market = false;
        }
        if (slowDue || this._uiDirty.styx) {
          this.#renderStyx(state);
          this._uiDirty.styx = false;
        }
        if (this._uiDirty.world) {
          this.#renderShelves(state, { reducedMotion });
          this.#syncAltarState(state, { reducedMotion });
          this._uiDirty.world = false;
        }
        if (slowDue || this._uiDirty.stats) {
          this.#renderStats(state);
          this._uiDirty.stats = false;
        }
        if (slowDue || this._uiDirty.lethe) {
          this.#renderLethe(state, { reducedMotion });
          this._uiDirty.lethe = false;
        }
        if (slowDue || this._uiDirty.bancada) {
          this.#renderBancada(state);
          this._minigamesView?.sync(state);
          this._uiDirty.bancada = false;
        }
        this._shimmerView?.sync(state, {
          reducedMotion,
          fancy: effectivePrefs.fancy,
          nowMs: typeof state.nowMs === 'function' ? state.nowMs() : nowMs,
        });
        this._leechRingView?.sync(state, {
          reducedMotion,
          fancy: effectivePrefs.fancy,
        });
        this._codexBook?.sync(state);
        this.#announceEduLogTickers(state, { reducedMotion });
      }

      // --- Teatro Visual (1 único RAF conduz WorldView.frame + AltarOrbit.frame) ---
      this._world?.frame(dtSeconds, {
        reducedMotion,
        fancy: effectivePrefs.fancy,
        particles: effectivePrefs.particles,
      });
      this._altar?.frame(nowMs, {
        reducedMotion,
        cursors: effectivePrefs.cursors,
        particles: effectivePrefs.particles,
        fancy: effectivePrefs.fancy,
      });
    });
  }

  #renderHint(state) {
    if (!this._hud?.hint) return;
    if (state.clickCount < 1) {
      setText(this._hud.hint, 'A Foice de Hades espera o primeiro corte no Acheron.');
      return;
    }
    if (cmp(state.sps(), '0') > 0) {
      setText(this._hud.hint, 'O lamento do Cocytus já trabalha enquanto a Foice corta.');
      return;
    }
    setText(this._hud.hint, 'Cada corte rende almas. Contrata as sombras quando o saldo cobrir.');
  }

  #mountMarket() {
    const list = this.root.getElementById('despertar-market-list')
      || this.root.querySelector('.despertar-market-list');
    if (!list) return;
    list.replaceChildren();
    this.#mountProductTip(list);

    for (const def of GENERATORS) {
      const item = this.root.createElement('li');
      item.className = 'despertar-card despertar-card--store';
      item.dataset.generatorId = def.id;
      item.dataset.river = def.tier >= 5 ? 'phlegethon' : 'cocytus';

      const icon = createSpriteNode(this.root, generatorSprite(def.id), {
        className: 'despertar-card__icon despertar-sprite',
      });

      const name = this.root.createElement('p');
      name.className = 'despertar-card__name';
      name.textContent = def.name;

      const blurb = this.root.createElement('p');
      blurb.className = 'despertar-card__blurb';
      blurb.textContent = def.blurb;

      const veil = this.root.createElement('p');
      veil.className = 'despertar-card__veil';
      veil.textContent = RIVER_VEIL;
      veil.hidden = true;

      const meta = this.root.createElement('p');
      meta.className = 'despertar-card__meta';
      const price = this.root.createElement('span');
      price.className = 'despertar-num';
      price.dataset.price = '';
      price.textContent = formatSouls(def.baseCost);
      const amort = this.root.createElement('span');
      amort.className = 'despertar-card__amort';
      amort.dataset.amort = '';
      amort.hidden = true;
      meta.append(price, amort);

      const rate = this.root.createElement('span');
      rate.className = 'despertar-card__rate despertar-num';
      rate.dataset.rate = '';
      rate.hidden = true;
      rate.textContent = '0';

      const owned = this.root.createElement('span');
      owned.className = 'despertar-card__owned despertar-num';
      owned.dataset.qty = '';
      owned.textContent = '0';

      const buy = this.root.createElement('button');
      buy.className = 'despertar-product';
      buy.type = 'button';
      buy.dataset.buy = def.id;
      buy.disabled = true;
      buy.addEventListener('click', () => {
        if (buy.disabled) return;
        if (this.tradeAction === 'sell') {
          if (this.onSell) {
            this.onSell(def.id, this.buyMode);
          } else if (this.state?.sellGenerator) {
            this.state.sellGenerator(def.id, this.buyMode);
            this.markDirty('all');
          }
          return;
        }
        this.onBuy?.(def.id, this.buyMode);
      });

      buy.append(icon, name, meta, owned, blurb, veil, rate);
      item.append(buy);
      // Hover no <li>: botão :disabled não recebe pointer events (Cookie ainda tipa).
      item.addEventListener('pointerenter', () => this.#showProductTip(def.id, item));
      item.addEventListener('pointerleave', (event) => {
        if (item.contains(event.relatedTarget)) return;
        this.#hideProductTip(def.id);
      });
      buy.addEventListener('focus', () => this.#showProductTip(def.id, item));
      buy.addEventListener('blur', () => this.#hideProductTip(def.id));
      list.append(item);
      this._cards.set(def.id, { item, blurb, veil, meta, qty: owned, rate, price, amort, buy, icon });
    }

    list.addEventListener('pointerleave', (event) => {
      if (event.currentTarget?.contains?.(event.relatedTarget)) return;
      this.#hideProductTip();
    });
  }

  #mountProductTip(list) {
    let tip = this.root.getElementById('despertar-product-tooltip');
    if (!tip) {
      tip = this.root.createElement('div');
      tip.id = 'despertar-product-tooltip';
      tip.className = 'despertar-product-tooltip';
      tip.setAttribute('role', 'tooltip');
      tip.hidden = true;
      const head = this.root.createElement('div');
      head.className = 'despertar-product-tooltip__head';
      const tipIcon = this.root.createElement('div');
      tipIcon.className = 'despertar-product-tooltip__icon despertar-sprite';
      tipIcon.setAttribute('data-tip', 'icon');
      const titles = this.root.createElement('div');
      titles.className = 'despertar-product-tooltip__titles';
      const tipName = this.root.createElement('p');
      tipName.className = 'despertar-product-tooltip__name';
      tipName.setAttribute('data-tip', 'name');
      const tipOwned = this.root.createElement('p');
      tipOwned.className = 'despertar-product-tooltip__owned';
      tipOwned.setAttribute('data-tip', 'owned');
      titles.append(tipName, tipOwned);
      const tipCost = this.root.createElement('p');
      tipCost.className = 'despertar-product-tooltip__cost despertar-num';
      tipCost.setAttribute('data-tip', 'cost');
      head.append(tipIcon, titles, tipCost);
      const tipBlurb = this.root.createElement('p');
      tipBlurb.className = 'despertar-product-tooltip__blurb';
      tipBlurb.setAttribute('data-tip', 'blurb');
      const tipStats = this.root.createElement('div');
      tipStats.className = 'despertar-product-tooltip__stats';
      tipStats.setAttribute('data-tip', 'stats');
      tipStats.hidden = true;
      for (const key of ['unit', 'line', 'life']) {
        const row = this.root.createElement('p');
        row.setAttribute('data-tip', key);
        tipStats.append(row);
      }
      tip.append(head, tipBlurb, tipStats);
      const mountParent = this.root.body || this.root.documentElement || list;
      mountParent?.append?.(tip);
    }
    this._productTip = {
      root: tip,
      icon: tip.querySelector('[data-tip="icon"]'),
      name: tip.querySelector('[data-tip="name"]'),
      owned: tip.querySelector('[data-tip="owned"]'),
      cost: tip.querySelector('[data-tip="cost"]'),
      blurb: tip.querySelector('[data-tip="blurb"]'),
      stats: tip.querySelector('[data-tip="stats"]'),
      unit: tip.querySelector('[data-tip="unit"]'),
      line: tip.querySelector('[data-tip="line"]'),
      life: tip.querySelector('[data-tip="life"]'),
      activeId: null,
    };
  }

  #showProductTip(id, anchor) {
    const tip = this._productTip;
    if (!tip?.root || !anchor || !this.state) return;
    const view = describeProductTip(this.state, id);
    if (!view) return;

    const mystery = view.kind === 'mystery';
    toggleClass(tip.root, 'is-mystery', mystery);
    setText(tip.name, view.name);
    setText(tip.owned, `obtidos: ${formatOwned(view.quantity)}`);
    setText(tip.cost, formatSouls(view.cost));
    setText(tip.blurb, view.kind === 'mystery' ? view.blurb : `“${view.blurb}”`);

    if (tip.icon) {
      tip.icon.replaceChildren();
      const sprite = createSpriteNode(this.root, generatorSprite(view.spriteId || id), {
        className: 'despertar-sprite',
      });
      tip.icon.append(sprite);
      toggleClass(tip.icon, 'is-mystery', mystery);
    }

    if (view.kind === 'owned') {
      setHidden(tip.stats, false);
      setText(tip.unit, `cada ${view.name} produz ${formatRate(view.unitRate)} almas por segundo`);
      const pct = formatRate(view.sharePct);
      setText(
        tip.line,
        `${formatOwned(view.quantity)}× ${view.name} produzindo ${formatRate(view.lineRate)} almas por segundo (${pct}% do total)`,
      );
      setText(tip.life, `${formatSouls(view.lifetime)} almas produzidas até agora`);
    } else {
      setHidden(tip.stats, true);
      setText(tip.unit, '');
      setText(tip.line, '');
      setText(tip.life, '');
    }

    tip.activeId = id;
    tip.root.hidden = false;
    anchor.setAttribute('aria-describedby', 'despertar-product-tooltip');
    this.#positionProductTip(tip.root, anchor);
  }

  #hideProductTip(id = null) {
    const tip = this._productTip;
    if (!tip?.root) return;
    if (id != null && tip.activeId && tip.activeId !== id) return;
    tip.root.hidden = true;
    tip.activeId = null;
    for (const nodes of this._cards.values()) {
      nodes.item?.removeAttribute('aria-describedby');
    }
  }

  /** Tip à esquerda da loja (Cookie); cai abaixo se faltar espaço. */
  #positionProductTip(tipRoot, anchor) {
    if (!tipRoot || !anchor) return;
    tipRoot.classList.add('is-fixed');
    tipRoot.classList.remove('is-below');

    const box = anchor.getBoundingClientRect?.();
    if (!box) return;

    const tipWidth = tipRoot.offsetWidth || 280;
    const tipHeight = tipRoot.offsetHeight || 140;
    const gap = 10;
    const vw = typeof globalThis.innerWidth === 'number' ? globalThis.innerWidth : box.right + tipWidth;
    const vh = typeof globalThis.innerHeight === 'number' ? globalThis.innerHeight : box.bottom + tipHeight;

    let left = box.left - tipWidth - gap;
    if (left < 8) left = Math.min(box.right + gap, vw - tipWidth - 8);
    left = Math.max(8, Math.min(left, vw - tipWidth - 8));

    let top = box.top;
    if (top + tipHeight > vh - 8) top = Math.max(8, vh - tipHeight - 8);
    if (top < 8) top = 8;

    tipRoot.style.left = `${Math.round(left)}px`;
    tipRoot.style.top = `${Math.round(top)}px`;
  }

  #bindBuyModes() {
    const root = this.root.getElementById('river-market');
    if (!root) return;
    this._modeButtons = [...root.querySelectorAll('[data-buy-mode]')];
    this._modeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.setBuyMode(button.getAttribute('data-buy-mode'));
      });
    });
    this._actionButtons = [...root.querySelectorAll('[data-trade-action]')];
    this._actionButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.setTradeAction(button.getAttribute('data-trade-action'));
      });
    });
    this.setBuyMode(this.buyMode);
    this.setTradeAction(this.tradeAction);
  }

  #renderMarket(state) {
    const richAmort = Boolean(talentEffects(state.talents || []).richAmort);
    const isSell = this.tradeAction === 'sell';
    const quantities = state.quantities();
    const revealCtx = { souls: state.souls, generators: quantities };
    for (const def of GENERATORS) {
      const nodes = this._cards.get(def.id);
      if (!nodes) continue;
      const view = describeGeneratorCard(state, def.id, this.buyMode, this.tradeAction);
      if (!view) continue;

      const row = marketRowVisibility(def.id, revealCtx);
      const isOpen = row === 'open';
      const isPreview = row === 'preview';
      const show = isOpen || isPreview;

      toggleClass(nodes.item, 'is-masked', isPreview);
      toggleClass(nodes.item, 'is-preview', isPreview);
      toggleClass(nodes.item, 'is-affordable', isOpen && view.canBuy);
      nodes.item.setAttribute('aria-disabled', String(!isOpen));
      setHidden(nodes.item, !show);

      const nameNode = nodes.item.querySelector('.despertar-card__name');
      if (isOpen) {
        nodes.item.removeAttribute('title');
        if (nameNode) {
          nameNode.textContent = def.name;
          nameNode.title = def.name;
        }
      } else if (isPreview) {
        nodes.item.removeAttribute('title');
        if (nameNode) {
          nameNode.textContent = '???';
          nameNode.removeAttribute('title');
        }
      }

      if (isOpen && view.amort != null && !isSell) {
        const amortLabel = formatAmortSeconds(view.amort);
        if (richAmort) {
          if (nodes.amort) {
            setHidden(nodes.amort, false);
            setText(nodes.amort, ` · paga em ~ ${amortLabel}`);
          }
        } else if (nodes.amort) {
          setHidden(nodes.amort, true);
        }
        this.onAmortSeen?.();
      } else if (nodes.amort) {
        setHidden(nodes.amort, true);
      }

      setHidden(nodes.blurb, true);
      setHidden(nodes.veil, true);
      setHidden(nodes.meta, !show);
      setText(nodes.qty, formatOwned(isOpen ? view.quantity : 0));
      setText(nodes.rate, formatRate(view.rate));
      if (nodes.rate) {
        nodes.rate.setAttribute?.(
          'aria-label',
          `Almas por segundo da linha: ${formatRate(view.rate)}`,
        );
      }
      setText(nodes.price, isSell && isOpen ? `+${formatSouls(view.cost)}` : formatSouls(view.cost));
      // Prévia ??? não compra; disabled ainda tipa via <li> + pointer-events:none no botão.
      setDisabled(nodes.buy, !view.canBuy || isPreview);
      if (nodes.buy) nodes.buy.removeAttribute('title');
    }

    if (this._productTip?.activeId) {
      const active = this._cards.get(this._productTip.activeId);
      if (active?.item && !active.item.hidden) {
        this.#showProductTip(this._productTip.activeId, active.item);
      } else {
        this.#hideProductTip();
      }
    }
  }

  #mountStyx() {
    const strip = this.root.getElementById('styx-upgrade-strip');
    const empty = this.root.getElementById('styx-empty');
    let list = this.root.getElementById('styx-list');
    if (!list && strip) {
      list = this.root.createElement('ul');
      list.id = 'styx-list';
      list.className = 'despertar-upgrade-icons';
      strip.append(list);
    }
    if (!list) return;
    list.className = 'despertar-upgrade-icons';
    list.replaceChildren();

    let tip = this.root.getElementById('styx-tooltip');
    if (!tip) {
      tip = this.root.createElement('div');
      tip.id = 'styx-tooltip';
      tip.className = 'despertar-upgrade-tooltip is-fixed';
      tip.setAttribute('role', 'tooltip');
      tip.hidden = true;
      // Fora da strip (overflow) — senão o custo some cortado.
      const mountParent = this.root.body || this.root.documentElement || strip;
      mountParent?.append?.(tip);
    }
    this.#ensureStyxTipStructure(tip);
    this._styxTip = tip
      ? {
        root: tip,
        name: tip.querySelector('[data-tip="name"]'),
        effect: tip.querySelector('[data-tip="effect"]'),
        flavor: tip.querySelector('[data-tip="flavor"]'),
        cosmetic: tip.querySelector('[data-tip="cosmetic"]'),
        cosmeticThumb: tip.querySelector('[data-tip="cosmetic-thumb"]'),
        cosmeticLabel: tip.querySelector('[data-tip="cosmetic-label"]'),
        cost: tip.querySelector('[data-tip="cost"]'),
        status: tip.querySelector('[data-tip="status"]'),
        req: tip.querySelector('[data-tip="req"]'),
        // legado
        blurb: tip.querySelector('[data-tip="blurb"]'),
        activeId: null,
      }
      : null;

    this._styx = { empty, list, strip };
    toggleClass(strip, 'is-empty', true);
    this._styxOrderSig = '';
    this._styxKeyHandler = (event) => {
      if (event.key === 'Escape') {
        this.#hideStyxTip();
        this.#hideSealedTip();
        this.#hideProductTip();
      }
    };
    this.root.addEventListener?.('keydown', this._styxKeyHandler);
    // Sair da strip inteira fecha o tip (DOM reorder / disabled não engolem o leave).
    strip?.addEventListener?.('pointerleave', (event) => {
      if (event.currentTarget?.contains?.(event.relatedTarget)) return;
      this.#hideStyxTip();
    });

    for (const def of UPGRADES) {
      const item = this.root.createElement('li');
      item.hidden = true;

      const buy = this.root.createElement('button');
      buy.className = 'despertar-upgrade-icon';
      buy.type = 'button';
      buy.dataset.buyUpgrade = def.id;
      buy.setAttribute('aria-label', def.name);
      buy.disabled = true;

      const sprite = createSpriteNode(this.root, upgradeSprite(def.id), {
        className: 'despertar-upgrade-icon__sprite despertar-sprite',
      });
      buy.append(sprite);
      if (cosmeticForUpgrade(def.id)) {
        buy.classList.add('despertar-upgrade-icon--has-cosmetic');
        buy.dataset.hasCosmetic = '1';
      }

      buy.addEventListener('click', () => {
        if (buy.disabled) return;
        this.onBuyUpgrade?.(def.id);
      });
      buy.addEventListener('pointerenter', () => this.#showStyxTip(def.id, buy));
      buy.addEventListener('pointerleave', () => this.#hideStyxTip(def.id));
      buy.addEventListener('focus', () => this.#showStyxTip(def.id, buy));
      buy.addEventListener('blur', () => this.#hideStyxTip(def.id));

      item.append(buy);
      list.append(item);
      this._upgrades.set(def.id, {
        item,
        blurb: null,
        meta: null,
        price: null,
        buy,
      });
    }
  }

  /** Garante blocos do tip Styx (efeito / sabor / cosmético / status). */
  #ensureStyxTipStructure(tip) {
    if (!tip || !this.root) return;
    const ensure = (tag, className, dataTip, parent = tip) => {
      let el = tip.querySelector(`[data-tip="${dataTip}"]`);
      if (el) return el;
      el = this.root.createElement(tag);
      el.className = className;
      el.dataset.tip = dataTip;
      parent.append(el);
      return el;
    };
    ensure('p', 'despertar-upgrade-tooltip__name', 'name');
    ensure('p', 'despertar-upgrade-tooltip__effect', 'effect');
    ensure('p', 'despertar-upgrade-tooltip__flavor', 'flavor');
    let cos = tip.querySelector('[data-tip="cosmetic"]');
    if (!cos) {
      cos = this.root.createElement('div');
      cos.className = 'despertar-upgrade-tooltip__cosmetic';
      cos.dataset.tip = 'cosmetic';
      cos.hidden = true;
      tip.append(cos);
    }
    if (!cos.querySelector('[data-tip="cosmetic-thumb"]')) {
      const thumb = this.root.createElement('div');
      thumb.className = 'despertar-upgrade-tooltip__cosmetic-thumb';
      thumb.dataset.tip = 'cosmetic-thumb';
      cos.append(thumb);
    }
    if (!cos.querySelector('[data-tip="cosmetic-label"]')) {
      const label = this.root.createElement('p');
      label.className = 'despertar-upgrade-tooltip__cosmetic-label';
      label.dataset.tip = 'cosmetic-label';
      cos.append(label);
    }
    ensure('p', 'despertar-upgrade-tooltip__cost', 'cost');
    ensure('p', 'despertar-upgrade-tooltip__status', 'status');
    ensure('p', 'despertar-upgrade-tooltip__req', 'req');
  }

  #fillCosmeticTipPreview(tip, cosmetic) {
    if (!tip?.cosmetic) return;
    if (!cosmetic?.accessory) {
      setHidden(tip.cosmetic, true);
      return;
    }
    setHidden(tip.cosmetic, false);
    setText(tip.cosmeticLabel, `Visual: ${cosmetic.label || cosmetic.accessory}`);
    const thumbHost = tip.cosmeticThumb;
    if (!thumbHost) return;
    thumbHost.replaceChildren();
    const variant = habitatVariantSprite(cosmetic.accessory);
    const cosPaths = cosmeticPaths(cosmetic.accessory);
    const webp = variant.webp || cosPaths.webp;
    const svg = variant.svg || cosPaths.svg;
    if (webp || svg) {
      const sprite = createSpriteNode(this.root, {
        webp,
        svg,
        mark: (cosmetic.label || cosmetic.accessory).slice(0, 1).toUpperCase(),
        pixel: true,
      }, {
        className: 'despertar-upgrade-tooltip__cosmetic-sprite despertar-sprite',
      });
      thumbHost.append(sprite);
      return;
    }
    const swatch = this.root.createElement('span');
    swatch.className = 'despertar-upgrade-tooltip__cosmetic-swatch';
    let h = 2166136261;
    const acc = String(cosmetic.accessory);
    for (let i = 0; i < acc.length; i += 1) {
      h ^= acc.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    swatch.style.setProperty('--cos-hue', String(h % 360));
    swatch.textContent = (cosmetic.label || acc).slice(0, 1).toUpperCase();
    thumbHost.append(swatch);
  }

  #showStyxTip(id, anchor) {
    this.#hideSealedTip();
    const tip = this._styxTip;
    if (!tip?.root || !anchor || !this.state) return;
    const view = describeUpgradeCard(this.state, id);
    if (!view || view.owned) return;
    setText(tip.name, view.name);
    setText(tip.effect, view.effect || view.blurb);
    setHidden(tip.effect, !(view.effect || view.blurb));
    setText(tip.flavor, view.flavor || '');
    setHidden(tip.flavor, !view.flavor);
    this.#fillCosmeticTipPreview(tip, view.cosmetic);
    setText(tip.cost, `Custo: ${formatSouls(view.cost)} almas`);
    setText(tip.status, view.affordHint || '');
    setHidden(tip.status, !view.affordHint);
    const req = view.requirement && view.requirement !== 'Sem requisito especial'
      ? `Requer: ${view.requirement}`
      : '';
    setText(tip.req, req);
    setHidden(tip.req, !req);
    tip.activeId = id;
    tip.root.hidden = false;
    anchor.setAttribute('aria-describedby', 'styx-tooltip');
    this.#positionFixedTip(tip.root, anchor);
  }

  #hideStyxTip(id = null) {
    const tip = this._styxTip;
    if (!tip?.root) return;
    if (id != null && tip.activeId && tip.activeId !== id) return;
    tip.root.hidden = true;
    tip.activeId = null;
    for (const nodes of this._upgrades.values()) {
      nodes.buy?.removeAttribute('aria-describedby');
    }
  }

  /** Posiciona tip fixed acima/abaixo do âncora (Styx + Selados). */
  #positionFixedTip(tipRoot, anchor) {
    if (!tipRoot || !anchor) return;
    tipRoot.classList.remove('is-below');
    tipRoot.classList.add('is-fixed');

    const btnBox = anchor.getBoundingClientRect?.();
    if (!btnBox) return;

    const tipWidth = tipRoot.offsetWidth || 220;
    const tipHeight = tipRoot.offsetHeight || 110;
    const gap = 8;
    const vw = typeof globalThis.innerWidth === 'number' ? globalThis.innerWidth : btnBox.right + tipWidth;
    const vh = typeof globalThis.innerHeight === 'number' ? globalThis.innerHeight : btnBox.bottom + tipHeight;

    let left = btnBox.left + (btnBox.width / 2) - (tipWidth / 2);
    left = Math.max(8, Math.min(left, vw - tipWidth - 8));

    const spaceAbove = btnBox.top - gap;
    const placeBelow = spaceAbove < tipHeight && (vh - btnBox.bottom) > spaceAbove;
    tipRoot.classList.toggle('is-below', placeBelow);
    const top = placeBelow
      ? btnBox.bottom + gap
      : btnBox.top - tipHeight - gap;

    tipRoot.style.left = `${Math.round(left)}px`;
    tipRoot.style.top = `${Math.round(Math.max(8, top))}px`;
  }

  #renderStyx(state) {
    if (!this._styx) return;
    const unlocked = isStyxUnlocked({ souls: state.souls, generators: state.quantities() });
    const visibleCards = [];
    for (let index = 0; index < UPGRADES.length; index += 1) {
      const def = UPGRADES[index];
      const nodes = this._upgrades.get(def.id);
      const view = describeUpgradeCard(state, def.id);
      if (!nodes || !view) continue;
      const sealing = nodes.buy.classList.contains('is-sealing');
      // F4: owned some da strip (Cookie); is-sealing mantém o ícone até o juice acabar.
      const show = unlocked && view.revealed && (!view.owned || sealing);
      setHidden(nodes.item, !show);
      if (show) {
        visibleCards.push({
          id: def.id,
          canBuy: Boolean(view.canBuy),
          cost: view.cost,
          catalogIndex: index,
        });
      }
      toggleClass(nodes.buy, 'is-affordable', show && view.canBuy);
      // Revelado sem almas ≠ locked: locked lia como “ainda não pode comprar” na foice escura.
      toggleClass(nodes.buy, 'is-unaffordable', show && !view.canBuy && !view.owned);
      toggleClass(nodes.buy, 'is-locked', false);
      toggleClass(nodes.buy, 'is-owned', false);
      setDisabled(nodes.buy, !view.canBuy);
    }
    const list = this._styx.list;
    if (list && visibleCards.length > 0) {
      const order = sortStyxVisible(visibleCards);
      const orderSig = order.join('\0');
      // Só remonta a ordem quando muda — append a cada frame rouba pointerleave/click
      // e deixa o tip “preso” no ar (posição fixed do frame anterior).
      if (orderSig !== this._styxOrderSig) {
        this._styxOrderSig = orderSig;
        for (const id of order) {
          const nodes = this._upgrades.get(id);
          if (nodes?.item) list.append(nodes.item);
        }
        if (this._styxTip?.activeId) {
          const active = this._upgrades.get(this._styxTip.activeId);
          if (active?.buy && !active.item.hidden && !this._styxTip.root.hidden) {
            this.#positionFixedTip(this._styxTip.root, active.buy);
          }
        }
      }
    } else {
      this._styxOrderSig = '';
    }
    const showList = unlocked && visibleCards.length > 0;
    setHidden(this._styx.empty, showList);
    setHidden(this._styx.list, !showList);
    // Sem juramentos: hover não pode encolher a strip (aspect-ratio → auto)
    // senão a margem inferior entra em loop pointerenter/leave.
    toggleClass(this._styx.strip, 'is-empty', !showList);
    if (this._styx.empty && !showList) setText(this._styx.empty, STYX_EMPTY);
    if (this._styxTip?.activeId) {
      const active = this._upgrades.get(this._styxTip.activeId);
      if (!active || active.item.hidden) this.#hideStyxTip();
    }
  }

  #mountNpcTip() {
    let tip = this.root.getElementById('despertar-npc-tooltip');
    if (!tip) {
      tip = this.root.createElement('div');
      tip.id = 'despertar-npc-tooltip';
      tip.className = 'despertar-upgrade-tooltip despertar-npc-tooltip';
      tip.setAttribute('role', 'tooltip');
      tip.hidden = true;
      const head = this.root.createElement('div');
      head.className = 'despertar-npc-tooltip__head';
      const portrait = this.root.createElement('div');
      portrait.className = 'despertar-npc-tooltip__portrait';
      portrait.dataset.tip = 'portrait';
      const titles = this.root.createElement('div');
      titles.className = 'despertar-npc-tooltip__titles';
      const nameEl = this.root.createElement('p');
      nameEl.className = 'despertar-upgrade-tooltip__name despertar-npc-tooltip__name';
      nameEl.dataset.tip = 'name';
      const ageEl = this.root.createElement('p');
      ageEl.className = 'despertar-npc-tooltip__age';
      ageEl.dataset.tip = 'blurb';
      const typeEl = this.root.createElement('p');
      typeEl.className = 'despertar-npc-tooltip__type';
      typeEl.dataset.tip = 'type';
      titles.append(nameEl, ageEl, typeEl);
      head.append(portrait, titles);
      const rateEl = this.root.createElement('p');
      rateEl.className = 'despertar-upgrade-tooltip__cost';
      rateEl.dataset.tip = 'rate';
      const shinyEl = this.root.createElement('p');
      shinyEl.className = 'despertar-upgrade-tooltip__shiny';
      shinyEl.dataset.tip = 'shiny';
      tip.append(head, rateEl, shinyEl);
      const mountParent = this.root.body || this.root.documentElement || this.root;
      mountParent?.append?.(tip);
    } else {
      if (!tip.querySelector('[data-tip="portrait"]')) {
        const head = this.root.createElement('div');
        head.className = 'despertar-npc-tooltip__head';
        const portrait = this.root.createElement('div');
        portrait.className = 'despertar-npc-tooltip__portrait';
        portrait.dataset.tip = 'portrait';
        const titles = this.root.createElement('div');
        titles.className = 'despertar-npc-tooltip__titles';
        const nameNode = tip.querySelector('[data-tip="name"]');
        const blurbNode = tip.querySelector('[data-tip="blurb"]');
        if (nameNode) titles.append(nameNode);
        if (blurbNode) {
          blurbNode.classList.add('despertar-npc-tooltip__age');
          titles.append(blurbNode);
        }
        let typeEl = tip.querySelector('[data-tip="type"]');
        if (!typeEl) {
          typeEl = this.root.createElement('p');
          typeEl.className = 'despertar-npc-tooltip__type';
          typeEl.dataset.tip = 'type';
          titles.append(typeEl);
        }
        head.append(portrait, titles);
        tip.insertBefore(head, tip.firstChild);
      }
    }
    this._npcTip = tip
      ? {
        root: tip,
        portrait: tip.querySelector('[data-tip="portrait"]'),
        name: tip.querySelector('[data-tip="name"]'),
        blurb: tip.querySelector('[data-tip="blurb"]'),
        type: tip.querySelector('[data-tip="type"]'),
        rate: tip.querySelector('[data-tip="rate"]'),
        shiny: tip.querySelector('[data-tip="shiny"]'),
        activeKey: null,
        portraitKey: null,
      }
      : null;
  }

  /**
   * Preview = exatamente a unidade do habitat (chapéu / negativo / gold).
   * @param {{ generatorId: string, index: number, rarity?: string, shiny?: boolean, gold?: boolean, source?: string }} hit
   */
  #ensureNpcPortrait(hit) {
    const tip = this._npcTip;
    if (!tip?.portrait || !hit?.generatorId) return;
    const rarity = hit.rarity
      || (hit.gold ? 'gold' : (hit.shiny ? 'negativo' : 'normal'));
    const key = `${hit.source || 'shelf'}:${hit.generatorId}:${hit.index}:${rarity}`;
    if (tip.portraitKey === key && tip.portrait.querySelector?.('canvas')) return;

    let canvas = tip.portrait.querySelector?.('canvas');
    if (!canvas) {
      while (tip.portrait.firstChild) tip.portrait.removeChild(tip.portrait.firstChild);
      canvas = this.root.createElement('canvas');
      canvas.className = 'despertar-npc-tooltip__sprite';
      canvas.setAttribute('aria-hidden', 'true');
      tip.portrait.append(canvas);
    }

    const painted = hit.source === 'orbit'
      ? this._altar?.paintNpcPortrait?.(canvas, hit)
      : this._world?.paintNpcPortrait?.(canvas, hit);

    if (!painted) {
      // Fallback estático se o mundo ainda não montou sprites.
      while (tip.portrait.firstChild) tip.portrait.removeChild(tip.portrait.firstChild);
      const sprite = createSpriteNode(this.root, habitatSprite(hit.generatorId), {
        className: 'despertar-sprite despertar-npc-tooltip__sprite',
      });
      tip.portrait.append(sprite);
    }
    tip.portraitKey = key;
  }

  #showNpcTip(hit, event = null) {
    const tip = this._npcTip;
    if (!tip?.root || !hit || !this.state) return;
    const view = describeNpcUnit(this.state, hit.generatorId, {
      rarity: hit.rarity,
      shiny: hit.shiny,
      gold: hit.gold,
      index: hit.index,
    });
    if (!view) {
      this.#hideNpcTip();
      return;
    }
    this.#ensureNpcPortrait(hit);
    setText(tip.name, view.name);
    setText(tip.blurb, view.blurb || `tempo de existência: ${view.age}`);
    setHidden(tip.blurb, false);
    setText(tip.type, view.typeName || '');
    setHidden(tip.type, !view.typeName);
    setText(tip.rate, `Almas / s: ${formatRate(view.rate)}`);
    let rarityLabel = '';
    if (view.rarity === 'gold') rarityLabel = `gold ×${GOLD_MULT}`;
    else if (view.rarity === 'negativo' || view.shiny) rarityLabel = `negativo ×${NEGATIVO_MULT}`;
    setText(tip.shiny, rarityLabel);
    setHidden(tip.shiny, !rarityLabel);
    tip.activeKey = `${hit.source}:${hit.generatorId}:${hit.index}`;
    tip.root.hidden = false;
    tip.root.classList.remove('is-below');
    tip.root.classList.add('is-fixed');

    const tipWidth = tip.root.offsetWidth || 220;
    const tipHeight = tip.root.offsetHeight || 110;
    const gap = 12;
    const clientX = Number(event?.clientX);
    const clientY = Number(event?.clientY);
    const vw = typeof globalThis.innerWidth === 'number' ? globalThis.innerWidth : tipWidth + 16;
    const vh = typeof globalThis.innerHeight === 'number' ? globalThis.innerHeight : tipHeight + 16;

    let left;
    let top;
    if (Number.isFinite(clientX) && Number.isFinite(clientY)) {
      left = clientX + gap;
      top = clientY + gap;
      if (left + tipWidth > vw - 8) left = clientX - tipWidth - gap;
      if (top + tipHeight > vh - 8) top = clientY - tipHeight - gap;
    } else {
      left = 8;
      top = 8;
    }
    left = Math.max(8, Math.min(left, vw - tipWidth - 8));
    top = Math.max(8, Math.min(top, vh - tipHeight - 8));
    tip.root.style.left = `${Math.round(left)}px`;
    tip.root.style.top = `${Math.round(top)}px`;
  }

  #hideNpcTip() {
    const tip = this._npcTip;
    if (!tip?.root) return;
    tip.root.hidden = true;
    tip.activeKey = null;
  }

  #onNpcHover(hit, event = null) {
    if (!hit) {
      this.#hideNpcTip();
      return;
    }
    this.#showNpcTip(hit, event);
  }

  #mountShelves() {
    const host = this.root.getElementById('despertar-shelves');
    if (!host) return;
    this._mundoHint = this.root.getElementById('mundo-hint');
    this._world = new WorldView({
      document: this.root,
      isGeneratorRevealed,
      prefs: this.getPerfPrefs(),
      onNpcHover: (hit, event) => this.#onNpcHover(hit, event),
    }).mount(host, this._mundoHint);
  }

  #mountAltar() {
    const particleLayer = this.root.querySelector('[data-particle-layer]');
    const floatLayer = this.root.querySelector('[data-float-layer]');
    this._altar = new AltarOrbit({
      document: this.root,
      prefs: this.getPerfPrefs(),
      onNpcHover: (hit, event) => this.#onNpcHover(hit, event),
    }).mount({
      orbitHost: this.root.getElementById('despertar-reap-orbit'),
      particleLayer,
      veil: this.root.getElementById('despertar-veil'),
      reapButton: this.root.getElementById('despertar-reap'),
    });

    const shimmerHost = this.root.getElementById('despertar-shimmer-layer')
      || this.root.querySelector('.despertar-reap-stage');
    const buffsHost = this.root.getElementById('despertar-active-buffs');
    this._shimmerView = new ShimmerView({
      document: this.root,
      onClickShimmer: () => this.#handleShimmerClick(),
    }).mount({
      shimmerHost,
      buffsHost,
      particleLayer,
    });

    const reapStage = this.root.querySelector?.('.despertar-reap-stage') || shimmerHost;
    const altarCol = this.root.getElementById?.('acheron-altar') || null;
    this._leechRingView = new LeechRingView({
      document: this.root,
      onPopLeech: (slot) => this.#handlePopLeech(slot),
      onActivatePledge: () => this.#handleActivatePledge(),
      onToggleCovenant: () => this.#handleToggleCovenant(),
    }).mount({
      stageHost: reapStage,
      particleLayer,
      floatLayer,
      altarCol,
    });
  }

  #handlePopLeech(slot) {
    if (!this.state?.popLeech) return;
    const res = this.state.popLeech(slot);
    if (res?.ok && res.popped) {
      this._leechRingView?.spawnPopFeedback(res, {
        reducedMotion: juicePrefersReducedMotion(),
      });
      this.markDirty('all');
    }
  }

  #handleActivatePledge() {
    if (!this.state?.activateElderPledge) return;
    const res = this.state.activateElderPledge();
    if (res?.ok) {
      this.markDirty('all');
    }
  }

  #handleToggleCovenant() {
    if (!this.state?.setElderCovenant) return;
    const currentlyActive = typeof this.state.isElderCovenantActive === 'function'
      ? this.state.isElderCovenantActive()
      : Boolean(this.state.catabase?.covenantActive);
    const res = this.state.setElderCovenant(!currentlyActive);
    if (res?.ok) {
      this.markDirty('all');
    }
  }

  #handleShimmerClick() {
    if (this.onClickShimmer) {
      this.onClickShimmer();
      return;
    }
    if (!this.state?.clickShimmer) return;
    const res = this.state.clickShimmer();
    if (res?.ok) {
      const prefs = this.getPerfPrefs();
      this._shimmerView?.spawnClickFeedback(res, {
        reducedMotion: juicePrefersReducedMotion(),
        particles: prefs.particles,
      });
      this.markDirty('all');
    }
  }

  #renderShelves(state, meta = {}) {
    if (!this._world) return;
    this._world.sync(state, {
      reducedMotion: Boolean(meta.reducedMotion),
      prefs: this.getPerfPrefs(),
    });
  }

  #syncAltarState(state, meta = {}) {
    if (!this._altar) return;
    this._altar.sync(state, {
      reducedMotion: Boolean(meta.reducedMotion),
      prefs: this.getPerfPrefs(),
    });
  }

  /**
   * Juice G5.2 — scale nas células/cursors recém-comprados (shelf + órbita T1).
   * @param {string} generatorId
   * @param {{ bought?: number, reducedMotion?: boolean }} [opts]
   */
  pulseGeneratorBuy(generatorId, opts = {}) {
    if (!generatorId || opts.reducedMotion) return false;
    const bought = Math.max(0, Math.floor(Number(opts.bought) || 0));
    if (bought <= 0) return false;
    const qty = Number(this.state?.quantities?.()?.[generatorId] || 0);
    const fromIndex = Math.max(0, qty - bought);
    let ok = false;
    if (this._world?.pulseBuy?.(generatorId, { fromIndex, count: bought })) ok = true;
    if (generatorId === 'wandering_shade') {
      if (this._altar?.pulseBuy?.({ fromIndex, count: bought })) ok = true;
    }
    return ok;
  }

  /**
   * Interrupt de prioridade máxima (sync/Juízes) — segura a faixa por RUMOR_INTERRUPT_MS.
   * @param {string} text
   * @param {{ holdMs?: number, reducedMotion?: boolean }} [options]
   */
  interruptTicker(text, options = {}) {
    if (!this._ticker) return false;
    const next = String(text ?? '').trim();
    if (!next) return false;
    const holdMs = Number(options.holdMs) > 0 ? Number(options.holdMs) : RUMOR_INTERRUPT_MS;
    const now = typeof performance !== 'undefined' && performance.now
      ? performance.now()
      : Date.now();
    this._rumorHoldUntil = now + holdMs;
    this._rumorCurrent = next;
    setMarqueeText(this._ticker, next, {
      reducedMotion: Boolean(options.reducedMotion),
    });
    return true;
  }

  /**
   * Primeiro negativo da corrida — fura a fila uma vez.
   * @param {{ reducedMotion?: boolean }} [options]
   */
  announceShinyFirst(options = {}) {
    if (this._shinyRumorUsed) return false;
    this._shinyRumorUsed = true;
    return this.interruptTicker(SHINY_FIRST_TICKER, options);
  }

  /**
   * Primeiro gold da corrida — fura a fila uma vez.
   * @param {{ reducedMotion?: boolean }} [options]
   */
  announceGoldFirst(options = {}) {
    if (this._goldRumorUsed) return false;
    this._goldRumorUsed = true;
    return this.interruptTicker(GOLD_FIRST_TICKER, options);
  }

  /** Reset dos ganchos de raridade (ex.: após Lethe / nova corrida). */
  resetShinyRumor() {
    this._shinyRumorUsed = false;
    this._goldRumorUsed = false;
  }

  #handleTickerClick() {
    if (!this.state) return false;
    const activeFortuneId = this.state.fortunes?.activeFortuneId;
    if (activeFortuneId && typeof this.state.claimTickerFortune === 'function') {
      const res = this.state.claimTickerFortune(activeFortuneId);
      if (res?.ok) {
        toggleClass(this._ticker, 'is-fortune', false);
        this.markDirty('all');
        return true;
      }
    }
    // Avanço manual do ticker: NUNCA gera Fortuna (naturalCycle: false, paridade Wiki §11.1)
    if (typeof this.state.rollTickerFortune === 'function') {
      this.state.rollTickerFortune({ naturalCycle: false });
    }
    if (this._rumorPool.length > 0) {
      this._rumorIndex = (this._rumorIndex + 1) % this._rumorPool.length;
      const picked = pickRumor(this._rumorPool, this._rumorIndex);
      this._rumorIndex = picked.index;
      this._rumorCurrent = picked.text;
    }
    return false;
  }

  #renderTicker(state, meta = {}) {
    if (!this._ticker) return;
    const reducedMotion = Boolean(meta.reducedMotion);
    const now = typeof performance !== 'undefined' && performance.now
      ? performance.now()
      : Date.now();

    if (this._rumorHoldUntil > now && this._rumorCurrent) {
      toggleClass(this._ticker, 'is-fortune', false);
      setMarqueeText(this._ticker, this._rumorCurrent, { reducedMotion });
      return;
    }

    const activeFortuneId = state?.fortunes?.activeFortuneId;
    if (activeFortuneId) {
      const fortuneDef = getFortune(activeFortuneId);
      if (fortuneDef) {
        toggleClass(this._ticker, 'is-fortune', true);
        setMarqueeText(this._ticker, fortuneDef.tickerText, { reducedMotion });
        return;
      }
    }
    toggleClass(this._ticker, 'is-fortune', false);

    const sig = rumorPoolSignature(state);
    if (sig !== this._rumorSig || !this._rumorPool.length) {
      const prevId = this._rumorPool[this._rumorIndex]?.id;
      this._rumorPool = buildRumorPool(state);
      this._rumorSig = sig;
      const kept = prevId
        ? this._rumorPool.findIndex((item) => item.id === prevId)
        : -1;
      this._rumorIndex = kept >= 0 ? kept : 0;
      const refreshed = pickRumor(this._rumorPool, this._rumorIndex);
      this._rumorIndex = refreshed.index;
      this._rumorCurrent = refreshed.text;
      if (!this._rumorNextAt || this._rumorNextAt <= now) {
        this._rumorNextAt = now + RUMOR_ROTATE_MS;
      }
    } else if (now >= this._rumorNextAt) {
      // No ciclo natural automático do ticker, sorteia Fortuna (2% base / 4% com O Fortuna)
      if (typeof state?.rollTickerFortune === 'function') {
        const fRoll = state.rollTickerFortune({ naturalCycle: true });
        if (fRoll?.spawned && fRoll.fortune) {
          this._rumorNextAt = now + RUMOR_ROTATE_MS;
          toggleClass(this._ticker, 'is-fortune', true);
          setMarqueeText(this._ticker, fRoll.fortune.tickerText, { reducedMotion });
          return;
        }
      }
      this._rumorIndex = (this._rumorIndex + 1) % this._rumorPool.length;
      const picked = pickRumor(this._rumorPool, this._rumorIndex);
      this._rumorIndex = picked.index;
      this._rumorCurrent = picked.text;
      this._rumorNextAt = now + RUMOR_ROTATE_MS;
    }

    setMarqueeText(this._ticker, this._rumorCurrent, { reducedMotion });
  }

  #renderVeil(state, meta = {}) {
    if (!this._veil) return;
    const prefs = meta.prefs || this.getPerfPrefs();
    applyVeilElementStyle(this._veil, state, {
      reducedMotion: Boolean(meta.reducedMotion),
      fancy: prefs.fancy,
      particles: prefs.particles,
    });
  }

  #renderStats(state) {
    if (!this._stats) return;
    const set = (key, value) => {
      const node = this._stats.querySelector(`[data-stat="${key}"]`);
      setText(node, value);
    };
    set('souls', formatSouls(state.souls));
    set('lifetime', formatSouls(state.lifetimeSouls));
    set('run', formatSouls(state.runSouls));
    set('sps', formatRate(state.sps()));
    set('clicks', formatOwned(state.clickCount));
    set('session', `${Math.floor(Number(state.sessionSeconds) || 0)} s`);
    set('prestige', formatOwned(state.prestigeCount));
    set('obols', formatSouls(state.obols));
    set('mnemosyne', formatSouls(state.mnemosyne));
    set('verdicts', formatOwned(state.verdicts));
    set('juizoBest', formatOwned(state.juizoBestStreak));
    set('shimmersClicked', formatOwned(state.shimmersClicked || 0));
    set('shimmersMissed', formatOwned(state.shimmersMissed || 0));
    set('nectar', formatOwned(state.nectar || 0));
    set('totalNectar', formatOwned(state.totalNectarHarvested || 0));
    const veilSummary = describeVeilSummary(state);
    set('veil', veilSummary.label);
    const catSummary = describeCatabaseSummary(state);
    set('effectiveSps', catSummary.spsLine);
    const bdSummary = describeSpsBreakdownSummary(state);
    set('rawMultiplier', bdSummary.rawMultiplierLabel);
    set('stackBreakdown', bdSummary.stackBreakdownLabel);
    set('dragonSummary', bdSummary.dragonLabel);
    set('seasonSummary', bdSummary.seasonLabel);
    set('leechesDigested', catSummary.digestedLine);
    set('leechesPopped', formatOwned(state.leechesPopped || 0));
    this.#renderSealed(state);
  }

  #renderSealed(state) {
    const sealed = this._sealed;
    if (!sealed?.list) return;
    const owned = new Set(
      Array.isArray(state.upgrades) ? state.upgrades.filter(Boolean) : [],
    );
    // Ordem estável = catálogo UPGRADES ∩ owned (não a ordem de compra).
    const sealedDefs = UPGRADES.filter((def) => owned.has(def.id));
    const signature = sealedDefs.map((def) => def.id).join('\0');
    if (sealed._signature === signature) return;
    this.#hideSealedTip();
    sealed._signature = signature;

    sealed.list.replaceChildren();
    for (const def of sealedDefs) {
      const li = this.root.createElement('li');
      li.className = 'despertar-sealed-icon';
      li.dataset.sealedUpgrade = def.id;

      const btn = this.root.createElement('button');
      btn.type = 'button';
      btn.className = 'despertar-upgrade-icon';
      btn.dataset.sealedUpgrade = def.id;
      btn.setAttribute('aria-label', def.name);

      const sprite = createSpriteNode(this.root, upgradeSprite(def.id), {
        className: 'despertar-upgrade-icon__sprite despertar-sprite',
      });
      btn.append(sprite);

      btn.addEventListener('pointerenter', () => this.#showSealedTip(def.id, btn));
      btn.addEventListener('pointerleave', () => this.#hideSealedTip(def.id));
      btn.addEventListener('focus', () => this.#showSealedTip(def.id, btn));
      btn.addEventListener('blur', () => this.#hideSealedTip(def.id));

      li.append(btn);
      sealed.list.append(li);
    }
    const has = sealedDefs.length > 0;
    setHidden(sealed.empty, has);
    setHidden(sealed.list, !has);
  }

  #mountSealedTip() {
    let tip = this.root.getElementById('sealed-tooltip');
    if (!tip) {
      tip = this.root.createElement('div');
      tip.id = 'sealed-tooltip';
      tip.className = 'despertar-upgrade-tooltip is-fixed';
      tip.setAttribute('role', 'tooltip');
      tip.hidden = true;
      const mountParent = this.root.body
        || this.root.documentElement
        || this._sealed?.section;
      mountParent?.append?.(tip);
    }
    this.#ensureStyxTipStructure(tip);
    if (!tip.querySelector('[data-tip="mark"]')) {
      const markEl = this.root.createElement('p');
      markEl.className = 'despertar-upgrade-tooltip__mark';
      markEl.dataset.tip = 'mark';
      markEl.textContent = 'Selado';
      tip.append(markEl);
    }
    this._sealedTip = tip
      ? {
        root: tip,
        name: tip.querySelector('[data-tip="name"]'),
        effect: tip.querySelector('[data-tip="effect"]'),
        flavor: tip.querySelector('[data-tip="flavor"]'),
        cosmetic: tip.querySelector('[data-tip="cosmetic"]'),
        cosmeticThumb: tip.querySelector('[data-tip="cosmetic-thumb"]'),
        cosmeticLabel: tip.querySelector('[data-tip="cosmetic-label"]'),
        blurb: tip.querySelector('[data-tip="blurb"]'),
        mark: tip.querySelector('[data-tip="mark"]'),
        activeId: null,
        activeAnchor: null,
      }
      : null;
  }

  #showSealedTip(id, anchor) {
    this.#hideStyxTip();
    const tip = this._sealedTip;
    if (!tip?.root || !anchor) return;
    const upgrade = getUpgrade(id);
    if (!upgrade) return;
    const cos = cosmeticForUpgrade(id);
    const effect = upgradeEffectText(upgrade);
    const flavor = upgrade.blurb ? String(upgrade.blurb) : '';
    setText(tip.name, upgrade.name);
    setText(tip.effect, effect || upgradeBlurb(upgrade));
    setHidden(tip.effect, !(effect || upgrade.blurb));
    setText(tip.flavor, flavor);
    setHidden(tip.flavor, !flavor);
    this.#fillCosmeticTipPreview(tip, cos
      ? { accessory: cos.accessory, label: cosmeticLabel(cos.accessory) }
      : null);
    if (tip.cosmeticLabel && cos) {
      setText(tip.cosmeticLabel, `Visual ativo: ${cosmeticLabel(cos.accessory)}`);
    }
    setText(tip.mark, 'Selado');
    tip.activeId = id;
    tip.activeAnchor = anchor;
    tip.root.hidden = false;
    anchor.setAttribute('aria-describedby', 'sealed-tooltip');
    this.#positionFixedTip(tip.root, anchor);
  }

  #hideSealedTip(id = null) {
    const tip = this._sealedTip;
    if (!tip?.root) return;
    if (id != null && tip.activeId && tip.activeId !== id) return;
    tip.root.hidden = true;
    tip.activeId = null;
    tip.activeAnchor?.removeAttribute?.('aria-describedby');
    tip.activeAnchor = null;
  }

  #mountLethe() {
    const panel = this.root.getElementById('panel-lethe');
    if (!panel) return;
    this._lethe = {
      locked: this.root.getElementById('lethe-locked'),
      open: this.root.getElementById('lethe-open'),
      obols: this.root.getElementById('lethe-obols'),
      mnemosyne: this.root.getElementById('lethe-mnemosyne'),
      preview: this.root.getElementById('lethe-preview'),
      memory: this.root.getElementById('lethe-memory'),
      ritual: this.root.getElementById('lethe-ritual'),
      pantheonEmpty: this.root.getElementById('pantheon-empty'),
      pantheonShop: this.root.getElementById('pantheon-shop'),
      pantheonTabAvailable: this.root.getElementById('pantheon-tab-available'),
      pantheonTabOwned: this.root.getElementById('pantheon-tab-owned'),
      pantheonEmptyAvailable: this.root.getElementById('pantheon-empty-available'),
      pantheonEmptyOwned: this.root.getElementById('pantheon-empty-owned'),
      pantheonListAvailable: this.root.getElementById('pantheon-list-available'),
      pantheonListOwned: this.root.getElementById('pantheon-list-owned'),
      memoryRiver: this.root.getElementById('lethe-memory-river'),
    };
    if (this._lethe.locked && !this._lethe.locked.textContent.trim()) {
      this._lethe.locked.textContent = LETHE_EMPTY;
    }
    this._lethe.ritual?.addEventListener('click', () => {
      if (this._lethe.ritual.disabled) return;
      this.onOpenLethe?.();
    });

    this._pantheonSubTabs = null;
    this._talents.clear();

    // Legado: listas de cards ficam ocultas — Memória do Rio usa a árvore fechada.
    setHidden(this._lethe.pantheonListOwned, true);
    setHidden(this._lethe.pantheonListAvailable, true);
    setHidden(this._lethe.pantheonEmptyOwned, true);

    const memoryRoot = this._lethe.memoryRiver;
    if (memoryRoot && !this._memoryRiver) {
      this._memoryRiver = bindLetheRiverTree({
        root: memoryRoot,
        readonly: true,
        getState: () => this.state,
      });
      this._memoryRiver.open();
    }
  }

  #renderLethe(state, meta = {}) {
    if (!this._lethe) return;
    const view = describeLethe(state);
    const tab = this.root.getElementById('tab-lethe');
    setHidden(tab, !view.open);
    if (tab?.hidden) this.#fallbackHiddenDomainTab(tab);

    setHidden(this._lethe.locked, view.open);
    setHidden(this._lethe.open, !view.open);
    if (!view.open && this._lethe.locked) setText(this._lethe.locked, LETHE_EMPTY);
    if (!view.open) return;

    if (!state.milestones?.letheSeen && typeof state.markLetheSeen === 'function') {
      if (state.markLetheSeen()) {
        this.#announceLetheUnlock(meta);
      }
    }

    setText(this._lethe.obols, formatSouls(view.obols));
    setText(this._lethe.mnemosyne, formatSouls(view.mnemosyne));
    setText(this._lethe.preview, view.previewText);
    if (this._lethe.memory) {
      setHidden(this._lethe.memory, false);
      setText(this._lethe.memory, view.memoryPreviewText);
    }
    setDisabled(this._lethe.ritual, !view.canDrink);

    setHidden(this._lethe.pantheonEmpty, view.pantheonOpen);
    setHidden(this._lethe.pantheonShop, !view.pantheonOpen);
    if (!view.pantheonOpen && this._lethe.pantheonEmpty) {
      setText(this._lethe.pantheonEmpty, PANTHEON_EMPTY);
    }

    const letheTab = this.root.getElementById('tab-lethe');
    const letheTabActive = letheTab?.getAttribute('aria-selected') === 'true';
    // Pausa rAF da Memória quando a aba Lethe não está ativa.
    this._memoryRiver?.setMotionPaused?.(!view.open || !letheTabActive || !view.pantheonOpen);

    if (!view.pantheonOpen) return;

    // Árvore fechada (readonly) — sem cards; listas legado permanecem ocultas.
    setHidden(this._lethe.pantheonListOwned, true);
    setHidden(this._lethe.pantheonEmptyOwned, true);
    this.state = state;
    if (letheTabActive) this._memoryRiver?.refresh?.();
  }

  #syncPantheonSubTab(availableCount) {
    if (!this._pantheonSubTabs) return;
    let key = this._pantheonSubKey;
    if (!this._pantheonSubUserPicked) {
      key = defaultShopSubTab(availableCount);
    } else if (availableCount <= 0 && key === 'available') {
      key = 'owned';
    }
    this._pantheonSubKey = key;
    const tab = key === 'owned'
      ? this._lethe?.pantheonTabOwned
      : this._lethe?.pantheonTabAvailable;
    if (tab) this._pantheonSubTabs.activate(tab, { silent: true });
  }

  /**
   * Se a aba selecionada sumiu (Lethe/Estela), volta para Mundo.
   * @param {Element|null|undefined} [maybeHidden]
   */
  #fallbackHiddenDomainTab(maybeHidden = null) {
    if (maybeHidden && maybeHidden.getAttribute('aria-selected') !== 'true') return;
    const selected = this.root.querySelector?.('.despertar-tablist > [role="tab"][aria-selected="true"]');
    if (selected && !selected.hidden) return;
    const mundo = this.root.getElementById('tab-mundo');
    if (mundo && !mundo.hidden && typeof mundo.click === 'function') mundo.click();
  }

  /**
   * First unlock Lethe — flash + aba + ticker (uma vez; C1).
   * @param {{ reducedMotion?: boolean }} [meta]
   */
  #announceLetheUnlock(meta = {}) {
    const reduced =
      Boolean(meta.reducedMotion) || juicePrefersReducedMotion();
    const tab = this.root.getElementById('tab-lethe');
    if (tab) {
      // Reduced-motion: CSS zera a animação; a classe ainda dá destaque estático ~1,4 s.
      juiceBumpClass(tab, 'is-just-unlocked', 1400);
    }
    flashLetheUnlock({ reducedMotion: reduced, root: this.root });
    this._eduAnnounced.add('log_lethe_unlock');
    this.interruptTicker(LETHE_UNLOCK_TICKER, {
      holdMs: LETHE_UNLOCK_HOLD_MS,
      reducedMotion: reduced,
    });
    showTutorialToast({
      text: LETHE_TUTORIAL_TOAST,
      root: this.root,
      reducedMotion: reduced,
    });
    this.onLetheFirstUnlock?.();
  }

  /**
   * Ticker one-shot para edu-logs de tutorial (Fase C / C2).
   * Não re-dispara após mount com logs já vistos.
   * @param {object} state
   * @param {{ reducedMotion?: boolean }} [meta]
   */
  #announceEduLogTickers(state, meta = {}) {
    if (!state || !this._ticker) return;
    const seen = Array.isArray(state.eduLogsSeen) ? state.eduLogsSeen : [];
    const reduced =
      Boolean(meta.reducedMotion) || juicePrefersReducedMotion();
    for (const id of EDU_LOG_TICKER_IDS) {
      if (!seen.includes(id) || this._eduAnnounced.has(id)) continue;
      this._eduAnnounced.add(id);
      const phrase = eduLogTickerPhrase(EDU_LOG_BY_ID[id]);
      if (!phrase) continue;
      // reduced-motion: só texto no letreiro (sem flash agressivo — C1 já respeita).
      this.interruptTicker(phrase, {
        holdMs: EDU_LOG_TICKER_HOLD_MS,
        reducedMotion: reduced,
      });
      break;
    }
  }

  #mountBancada() {
    const panel = this.root.getElementById('panel-bancada');
    if (!panel) return;
    this._bancada = {
      verdicts: this.root.getElementById('bancada-verdicts'),
      hint: this.root.getElementById('bancada-hint'),
      shop: this.root.getElementById('bancada-shop'),
      tabAvailable: this.root.getElementById('bancada-tab-available'),
      tabOwned: this.root.getElementById('bancada-tab-owned'),
      emptyAvailable: this.root.getElementById('bancada-empty-available'),
      emptyOwned: this.root.getElementById('bancada-empty-owned'),
      listAvailable: this.root.getElementById('bancada-list-available'),
      listOwned: this.root.getElementById('bancada-list-owned'),
    };
    setText(this._bancada.hint, JUIZO_BANCADA_HINT);

    let tip = this.root.getElementById('bancada-tooltip');
    if (!tip) {
      tip = this.root.createElement('div');
      tip.id = 'bancada-tooltip';
      tip.className = 'despertar-upgrade-tooltip is-fixed';
      tip.setAttribute('role', 'tooltip');
      tip.hidden = true;
      const mountParent = this.root.body || this.root.documentElement || panel;
      mountParent?.append?.(tip);
    }
    this.#ensureStyxTipStructure(tip);
    this._bancadaTip = tip
      ? {
        root: tip,
        name: tip.querySelector('[data-tip="name"]'),
        effect: tip.querySelector('[data-tip="effect"]'),
        flavor: tip.querySelector('[data-tip="flavor"]'),
        blurb: tip.querySelector('[data-tip="blurb"]') || tip.querySelector('[data-tip="effect"]'),
        cosmetic: tip.querySelector('[data-tip="cosmetic"]'),
        cosmeticThumb: tip.querySelector('[data-tip="cosmetic-thumb"]'),
        cosmeticLabel: tip.querySelector('[data-tip="cosmetic-label"]'),
        cost: tip.querySelector('[data-tip="cost"]'),
        activeId: null,
        activeAnchor: null,
      }
      : null;
    this._bancadaOrderSig = '';
    this._bancadaKeyHandler = (event) => {
      if (event.key === 'Escape') this.#hideBancadaTip();
    };
    this.root.addEventListener?.('keydown', this._bancadaKeyHandler);
    // Sair da loja fecha o tip (DOM reorder / disabled não engolem o leave).
    this._bancada.shop?.addEventListener?.('pointerleave', (event) => {
      if (event.currentTarget?.contains?.(event.relatedTarget)) return;
      this.#hideBancadaTip();
    });

    const tablist = this.root.getElementById('bancada-subtabs');
    this._bancadaSubTabs = bindSubTabs(tablist, {
      doc: this.root,
      onActivate: (_tab, key) => {
        this._bancadaSubKey = key;
        this._bancadaSubUserPicked = true;
        this.#hideBancadaTip();
      },
    });

    const listA = this._bancada.listAvailable;
    const listB = this._bancada.listOwned;
    if (!listA || !listB) return;
    listA.replaceChildren();
    listB.replaceChildren();
    this._verdicts.clear();
    for (const def of VERDICT_SHOP) {
      const item = this.root.createElement('li');
      item.className = 'despertar-card';
      item.dataset.verdictId = def.id;

      const name = this.root.createElement('p');
      name.className = 'despertar-card__name';
      name.textContent = def.name;

      const blurb = this.root.createElement('p');
      blurb.className = 'despertar-card__blurb';
      blurb.textContent = def.blurb;

      const meta = this.root.createElement('p');
      meta.className = 'despertar-card__meta';
      const price = this.root.createElement('span');
      price.className = 'despertar-num';
      price.dataset.price = '';
      price.textContent = String(def.cost);
      meta.append(price, ' Vereditos');

      const badge = this.root.createElement('p');
      badge.className = 'despertar-card__badge';
      badge.textContent = SHOP_OWNED_BADGE;
      badge.hidden = true;

      const buy = this.root.createElement('button');
      buy.className = 'btn-gold';
      buy.type = 'button';
      buy.dataset.buyVerdict = def.id;
      buy.textContent = 'Comprar';
      buy.disabled = true;
      buy.addEventListener('click', () => {
        if (buy.disabled) return;
        this.onBuyVerdict?.(def.id);
      });
      buy.addEventListener('pointerenter', () => this.#showBancadaTip(def.id, buy));
      buy.addEventListener('pointerleave', () => this.#hideBancadaTip(def.id));
      buy.addEventListener('focus', () => this.#showBancadaTip(def.id, buy));
      buy.addEventListener('blur', () => this.#hideBancadaTip(def.id));

      item.append(name, blurb, meta, badge, buy);
      listA.append(item);
      this._verdicts.set(def.id, { item, price, buy, badge, blurb });
    }
  }

  #showBancadaTip(id, anchor) {
    const tip = this._bancadaTip;
    if (!tip?.root || !anchor || !this.state) return;
    const view = describeVerdictCard(this.state, id);
    if (!view) return;
    setText(tip.name, view.name);
    setText(tip.effect || tip.blurb, view.blurb);
    setHidden(tip.flavor, true);
    this.#fillCosmeticTipPreview(tip, view.cosmetic);
    setText(
      tip.cost,
      view.owned ? 'Na Bancada' : `Custo: ${view.cost} Vereditos`,
    );
    tip.activeId = id;
    tip.activeAnchor = anchor;
    tip.root.hidden = false;
    tip.root.classList.remove('is-below');
    tip.root.classList.add('is-fixed');
    anchor.setAttribute('aria-describedby', 'bancada-tooltip');

    const btnBox = anchor.getBoundingClientRect?.();
    if (!btnBox) return;

    const tipWidth = tip.root.offsetWidth || 220;
    const tipHeight = tip.root.offsetHeight || 110;
    const gap = 8;
    const vw = typeof globalThis.innerWidth === 'number' ? globalThis.innerWidth : btnBox.right + tipWidth;
    const vh = typeof globalThis.innerHeight === 'number' ? globalThis.innerHeight : btnBox.bottom + tipHeight;

    let left = btnBox.left + (btnBox.width / 2) - (tipWidth / 2);
    left = Math.max(8, Math.min(left, vw - tipWidth - 8));

    const spaceAbove = btnBox.top - gap;
    const placeBelow = spaceAbove < tipHeight && (vh - btnBox.bottom) > spaceAbove;
    tip.root.classList.toggle('is-below', placeBelow);
    const top = placeBelow
      ? btnBox.bottom + gap
      : btnBox.top - tipHeight - gap;

    tip.root.style.left = `${Math.round(left)}px`;
    tip.root.style.top = `${Math.round(Math.max(8, top))}px`;
  }

  #hideBancadaTip(id = null) {
    const tip = this._bancadaTip;
    if (!tip?.root) return;
    if (id != null && tip.activeId && tip.activeId !== id) return;
    tip.root.hidden = true;
    tip.activeId = null;
    tip.activeAnchor?.removeAttribute?.('aria-describedby');
    tip.activeAnchor = null;
    for (const nodes of this._verdicts.values()) {
      nodes.buy?.removeAttribute('aria-describedby');
    }
  }

  #renderBancada(state) {
    if (!this._bancada) return;
    setText(this._bancada.verdicts, String(Number(state.verdicts) || 0));

    const cards = VERDICT_SHOP.map((def) => describeVerdictCard(state, def.id)).filter(Boolean);
    const partitioned = partitionShopCatalog(cards, {
      isOwned: (card) => Boolean(card.owned),
      canBuy: (card) => Boolean(card.canBuy),
    });

    setText(
      this._bancada.tabAvailable,
      shopTabLabel('Disponíveis', partitioned.counts.available),
    );
    setText(
      this._bancada.tabOwned,
      shopTabLabel('Comprados', partitioned.counts.owned),
    );

    const listA = this._bancada.listAvailable;
    const listB = this._bancada.listOwned;
    const orderSig = [
      partitioned.available.map((card) => card.id).join('\0'),
      partitioned.owned.map((card) => card.id).join('\0'),
    ].join('|');
    const remount = orderSig !== this._bancadaOrderSig;
    if (remount) {
      this._bancadaOrderSig = orderSig;
      if (listA) listA.replaceChildren();
      if (listB) listB.replaceChildren();
    }

    for (const card of partitioned.available) {
      const nodes = this._verdicts.get(card.id);
      if (!nodes) continue;
      toggleClass(nodes.item, 'is-owned', false);
      setText(nodes.price, String(card.cost));
      setText(nodes.buy, 'Comprar');
      setDisabled(nodes.buy, !card.canBuy);
      setHidden(nodes.buy, false);
      setHidden(nodes.badge, true);
      if (nodes.blurb) setText(nodes.blurb, card.blurb);
      if (remount) listA?.append(nodes.item);
    }

    for (const card of partitioned.owned) {
      const nodes = this._verdicts.get(card.id);
      if (!nodes) continue;
      toggleClass(nodes.item, 'is-owned', true);
      setText(nodes.price, String(card.cost));
      setText(nodes.buy, 'Na Bancada');
      setDisabled(nodes.buy, true);
      setHidden(nodes.buy, true);
      setHidden(nodes.badge, false);
      setText(nodes.badge, SHOP_OWNED_BADGE);
      if (nodes.blurb) setText(nodes.blurb, card.blurb);
      if (remount) listB?.append(nodes.item);
    }

    const emptyA = partitioned.counts.available === 0;
    const emptyB = partitioned.counts.owned === 0;
    setHidden(this._bancada.emptyAvailable, !emptyA);
    setHidden(this._bancada.listAvailable, emptyA);
    setHidden(this._bancada.emptyOwned, !emptyB);
    setHidden(this._bancada.listOwned, emptyB);
    if (emptyA && this._bancada.emptyAvailable) {
      setText(this._bancada.emptyAvailable, BANCADA_EMPTY_AVAILABLE);
    }
    if (emptyB && this._bancada.emptyOwned) {
      setText(this._bancada.emptyOwned, BANCADA_EMPTY_OWNED);
    }

    this.#syncBancadaSubTab(partitioned.counts.available);

    if (this._bancadaTip?.activeId) {
      const active = this._verdicts.get(this._bancadaTip.activeId);
      if (!active || active.buy?.hidden) {
        this.#hideBancadaTip();
      } else if (active.buy && !this._bancadaTip.root.hidden) {
        this.#showBancadaTip(this._bancadaTip.activeId, active.buy);
      }
    }
  }

  #syncBancadaSubTab(availableCount) {
    if (!this._bancadaSubTabs) return;
    let key = this._bancadaSubKey;
    if (!this._bancadaSubUserPicked) {
      key = defaultShopSubTab(availableCount);
    } else if (availableCount <= 0 && key === 'available') {
      key = 'owned';
    }
    this._bancadaSubKey = key;
    const tab = key === 'owned'
      ? this._bancada?.tabOwned
      : this._bancada?.tabAvailable;
    if (tab) this._bancadaSubTabs.activate(tab, { silent: true });
  }

  #mountCodexBook() {
    if (this._codexBook) return;
    this._codexBook = new CodexBook(this.root, {
      getUserId: () => this.getUserId(),
      getState: () => this.state,
      onOpen: () => this._loopBoard?.close(),
    });
    this._codexBook.mount();
  }

  #mountMinigames() {
    const host = this.root.getElementById?.('despertar-minigames-root')
      || this.root.getElementById?.('panel-bancada');
    if (!host || !this.root.createElement) return;
    let container = this.root.getElementById?.('despertar-minigames-root');
    if (!container) {
      container = this.root.createElement('div');
      container.id = 'despertar-minigames-root';
      container.className = 'despertar-minigames-root';
      host.append?.(container);
    }
    this._minigamesView = new MinigamesView({
      document: this.root,
      onHarvestNectar: () => {
        if (this.state?.harvestNectar?.()?.ok) this.markDirty('all');
      },
      onLevelUpGenerator: (genId) => {
        if (this.state?.levelUpGenerator?.(genId)?.ok) this.markDirty('all');
      },
      onActivateFrenzy: () => {
        if (this.state?.activateNectarFrenzy?.()?.ok) this.markDirty('all');
      },
      onAssignPantheon: (slotId, spiritId) => {
        if (this.state?.assignPantheonSlot?.(slotId, spiritId)?.ok) this.markDirty('all');
      },
      onCastSpell: (spellId) => {
        if (this.state?.castSpell?.(spellId)?.ok) this.markDirty('all');
      },
      onPlantSeed: (plotIdx, seedId) => {
        if (this.state?.plantSeed?.(plotIdx, seedId)?.ok) this.markDirty('all');
      },
      onHarvestPlot: (plotIdx) => {
        if (this.state?.harvestPlot?.(plotIdx)?.ok) this.markDirty('all');
      },
      onSelectSoil: (soilId) => {
        if (this.state?.setGardenSoil?.(soilId)?.ok) this.markDirty('all');
      },
      onBuyGood: (goodId, qty) => {
        if (this.state?.buyMarketStock?.(goodId, qty)?.ok) this.markDirty('all');
      },
      onSellGood: (goodId, qty) => {
        if (this.state?.sellMarketStock?.(goodId, qty)?.ok) this.markDirty('all');
      },
    }).mount(container);
  }

  #mountLoopBoard() {
    if (this._loopBoard) return;
    this._loopBoard = new LoopLeaderboard(this.root, {
      getToken: () => this.getToken(),
      onOpen: () => this._codexBook?.close(),
    });
    this._loopBoard.mount();
  }
}
