/**
 * Catálogo congelado da Fase F5 (Néctar do Lethe + 4 Minigames Temáticos).
 * Dados puros: sem lógica de DOM nem mutação de estado.
 */

import {
  NECTAR_AUTOHARVEST_MS,
  NECTAR_FRENZY_COST,
  NECTAR_FRENZY_DURATION_SEC,
  NECTAR_FRENZY_MULT,
  NECTAR_LEVEL_BONUS_PER,
  NECTAR_MATURE_HARVEST_CHANCE,
  NECTAR_MATURE_MS,
  NECTAR_MAX_GENERATOR_LEVEL,
  NECTAR_RESERVE_BONUS_PER,
  NECTAR_RESERVE_CAP,
  NECTAR_RIPE_MS,
  NECTAR_SYNC_SKEW_TOLERANCE_MS,
  NECTAR_UNLOCK_LIFETIME_SOULS,
} from './constants.js';

function freezeDeep(list) {
  return Object.freeze(list.map((item) => Object.freeze({ ...item })));
}

export const NECTAR_CONFIG = Object.freeze({
  unlockLifetimeSouls: NECTAR_UNLOCK_LIFETIME_SOULS,
  matureMs: NECTAR_MATURE_MS,
  ripeMs: NECTAR_RIPE_MS,
  autoHarvestMs: NECTAR_AUTOHARVEST_MS,
  matureHarvestChance: NECTAR_MATURE_HARVEST_CHANCE,
  levelBonusPer: NECTAR_LEVEL_BONUS_PER,
  reserveBonusPer: NECTAR_RESERVE_BONUS_PER,
  reserveCap: NECTAR_RESERVE_CAP,
  frenzyMult: NECTAR_FRENZY_MULT,
  frenzyDurationSec: NECTAR_FRENZY_DURATION_SEC,
  frenzyCost: NECTAR_FRENZY_COST,
  maxGeneratorLevel: NECTAR_MAX_GENERATOR_LEVEL,
  syncSkewToleranceMs: NECTAR_SYNC_SKEW_TOLERANCE_MS,
});

/**
 * 5 Variantes de Néctar do Lethe (paridade Sugar Lumps: Normal, Bifurcated, Golden, Meaty, Caramelized).
 */
export const NECTAR_VARIANTS = freezeDeep([
  {
    id: 'nectar_normal',
    name: 'Néctar do Lethe',
    spriteId: 'nectar_normal',
    weight: 85,
    minYield: 1,
    maxYield: 1,
    blurb: 'Gota cristalina condensada após 24 h nas margens da memória (+1 Néctar).',
  },
  {
    id: 'nectar_bifurcado',
    name: 'Néctar Bifurcado',
    spriteId: 'nectar_bifurcado',
    weight: 10,
    minYield: 1,
    maxYield: 2,
    blurb: 'Cálice duplo de âmbar ctônico: rende +1 ou +2 Néctares na colheita.',
  },
  {
    id: 'nectar_dourado',
    name: 'Néctar Dourado',
    spriteId: 'nectar_dourado',
    weight: 1,
    minYield: 2,
    maxYield: 7,
    triggersBuffId: 'mare_acheron',
    blurb: 'Raridade imperial: concede de +2 a +7 Néctares e desperta a Maré do Acheron.',
  },
  {
    id: 'nectar_colerico',
    name: 'Néctar Colérico',
    spriteId: 'nectar_colerico',
    weight: 2,
    minYield: 0,
    maxYield: 2,
    requiresCatabase: true,
    blurb: 'Pulsante com sangue antigo da Catábase: rende de 0 a +2 Néctares.',
  },
  {
    id: 'nectar_caramelizado',
    name: 'Néctar Caramelizado',
    spriteId: 'nectar_caramelizado',
    weight: 2,
    minYield: 1,
    maxYield: 3,
    refillsCooldowns: true,
    blurb: 'Destilado no calor do Phlegethon: rende de +1 a +3 Néctares e restaura recargas místicas.',
  },
]);

export const NECTAR_VARIANT_BY_ID = Object.freeze(
  Object.fromEntries(NECTAR_VARIANTS.map((v) => [v.id, v])),
);

/**
 * Mapeamento canônico Gerador Lv.1 → Minigame (sem substituir o Juízo ClassInd).
 */
export const MINIGAME_UNLOCK_GENERATORS = Object.freeze({
  pantheon: 'mnemosyne_temple', // Templo de Mnemosyne Lv.1 → Panteão Ctoniano
  grimoire: 'styx_tower',       // Torre do Estige Lv.1 → Grimório de Hécate
  garden: 'cerberian_hound',    // Cão Cerberiano Lv.1 → Jardim de Perséfone
  market: 'obsidian_throne',    // Trono de Obsidiana Lv.1 → Mercado de Caronte
});

/**
 * 1. Panteão Ctoniano (Templo de Mnemosyne Lv.1) — 3 slots de pedras + espíritos com trade-offs.
 */
export const PANTHEON_SLOTS = freezeDeep([
  { id: 'diamond', name: 'Diamante Estígio', tier: 1, multIndex: 0 },
  { id: 'ruby', name: 'Rubi de Flegêton', tier: 2, multIndex: 1 },
  { id: 'jade', name: 'Jade de Érebo', tier: 3, multIndex: 2 },
]);

export const PANTHEON_SPIRITS = freezeDeep([
  {
    id: 'spirit_nyx',
    name: 'Nyx, Senhora do Véu',
    spriteId: 'spirit_nyx',
    spsMultBySlot: Object.freeze(['1.15', '1.10', '1.05']),
    clickMultBySlot: Object.freeze(['0.90', '0.93', '0.96']),
    shimmerLuckBySlot: Object.freeze([1, 1, 1]),
    blurb: 'Eleva o SPS passivo (+15% / +10% / +5%), mas amortece a Foice (−10% / −7% / −4% no clique).',
  },
  {
    id: 'spirit_thanatos',
    name: 'Tânatos, Lâmina Silente',
    spriteId: 'spirit_thanatos',
    spsMultBySlot: Object.freeze(['0.95', '0.97', '0.98']),
    clickMultBySlot: Object.freeze(['1.30', '1.20', '1.10']),
    shimmerLuckBySlot: Object.freeze([1, 1, 1]),
    blurb: 'Afila o corte ativo (+30% / +20% / +10% no clique) em troca de leve tributo passivo (−5% / −3% / −2% SPS).',
  },
  {
    id: 'spirit_hypnos',
    name: 'Hipnos, Vigia do Repouso',
    spriteId: 'spirit_hypnos',
    spsMultBySlot: Object.freeze(['1.10', '1.07', '1.03']),
    clickMultBySlot: Object.freeze(['1', '1', '1']),
    shimmerLuckBySlot: Object.freeze([0.85, 0.9, 0.95]),
    blurb: 'Aumenta a produção contínua (+10% / +7% / +3% SPS), mas desacelera o surgimento de Ecos Dourados.',
  },
  {
    id: 'spirit_persephone',
    name: 'Perséfone, Rainha das Estações',
    spriteId: 'spirit_persephone',
    spsMultBySlot: Object.freeze(['1.08', '1.05', '1.02']),
    clickMultBySlot: Object.freeze(['1.08', '1.05', '1.02']),
    shimmerLuckBySlot: Object.freeze([1.15, 1.10, 1.05]),
    blurb: 'Equilíbrio régio: concede +8% / +5% / +2% em SPS e clique e acelera Ecos do Acheron.',
  },
]);

export const PANTHEON_SPIRIT_BY_ID = Object.freeze(
  Object.fromEntries(PANTHEON_SPIRITS.map((s) => [s.id, s])),
);

/**
 * 2. Grimório de Hécate (Torre do Estige Lv.1) — Éter e feitiços com chance de Backfire (15%).
 */
export const GRIMOIRE_SPELLS = freezeDeep([
  {
    id: 'mao_do_destino',
    name: 'Mão do Destino',
    spriteId: 'spell_mao_do_destino',
    baseCost: 10,
    maxManaFraction: 0.6,
    backfireChance: 0.15,
    blurb: 'Invoca um Eco Dourado imediato no Santuário (Falha Crítica: invoca um Eco Colérico).',
  },
  {
    id: 'conjurar_almas',
    name: 'Conjurar Almas',
    spriteId: 'spell_conjurar_almas',
    baseCost: 5,
    maxManaFraction: 0.4,
    backfireChance: 0.15,
    blurb: 'Materializa até 15 min de SPS (máx. 15% da carteira). Falha Crítica: drena 5 min de SPS.',
  },
]);

export const GRIMOIRE_SPELL_BY_ID = Object.freeze(
  Object.fromEntries(GRIMOIRE_SPELLS.map((s) => [s.id, s])),
);

/**
 * 3. Jardim de Perséfone (Cão Cerberiano Lv.1) — Grelha 2x2 → 6x6, Sementes e Solos.
 */
export const GARDEN_SOILS = freezeDeep([
  {
    id: 'barro_acheron',
    name: 'Barro do Acheron',
    minHounds: 1,
    tickSec: 300,
    passiveEffMult: '1',
    blurb: 'Solo padrão das margens: maturação equilibrada e 100% dos efeitos passivos das plantas.',
  },
  {
    id: 'cinzas_phlegethon',
    name: 'Cinzas do Phlegethon',
    minHounds: 25,
    tickSec: 180,
    passiveEffMult: '0.75',
    blurb: 'Acelera o crescimento das plantas, mas reduz seus efeitos passivos para 75%.',
  },
  {
    id: 'adubo_estigio',
    name: 'Adubo Estígio',
    minHounds: 50,
    tickSec: 450,
    passiveEffMult: '1.25',
    blurb: 'Solo rico em memória antiga: amplifica os efeitos passivos das plantas maduras em +25%.',
  },
]);

export const GARDEN_SOIL_BY_ID = Object.freeze(
  Object.fromEntries(GARDEN_SOILS.map((s) => [s.id, s])),
);

export const GARDEN_SEEDS = freezeDeep([
  {
    id: 'asfodelo_cinzento',
    name: 'Asfódelo Cinzento',
    spriteId: 'seed_asfodelo_cinzento',
    costSpsSeconds: '60',
    minCostSouls: '100',
    matureTicks: 3,
    lifespanTicks: 12,
    spsBonusPerPlot: '0.01', // +1% SPS por planta madura
    clickBonusPerPlot: '0',
    shimmerLuckPerPlot: 0,
    blurb: 'Flor pálida dos Campos de Asfódelos: cada planta madura concede +1% de SPS.',
  },
  {
    id: 'roma_de_persefone',
    name: 'Romã de Perséfone',
    spriteId: 'seed_roma_de_persefone',
    costSpsSeconds: '180',
    minCostSouls: '500',
    matureTicks: 4,
    lifespanTicks: 15,
    spsBonusPerPlot: '0.02', // +2% SPS por planta madura
    clickBonusPerPlot: '0',
    shimmerLuckPerPlot: 0,
    blurb: 'Fruto carmesim do pacto invernal: cada planta madura concede +2% de SPS.',
  },
  {
    id: 'lirio_do_lethe',
    name: 'Lírio do Lethe',
    spriteId: 'seed_lirio_do_lethe',
    costSpsSeconds: '120',
    minCostSouls: '300',
    matureTicks: 3,
    lifespanTicks: 10,
    spsBonusPerPlot: '0',
    clickBonusPerPlot: '0.03', // +3% clique por planta madura
    shimmerLuckPerPlot: 0,
    blurb: 'Pétalas que vibram ao corte da Foice: cada planta madura concede +3% no poder de clique.',
  },
  {
    id: 'papoula_de_hipnos',
    name: 'Papoula de Hipnos',
    spriteId: 'seed_papoula_de_hipnos',
    costSpsSeconds: '240',
    minCostSouls: '1000',
    matureTicks: 5,
    lifespanTicks: 16,
    spsBonusPerPlot: '0.01',
    clickBonusPerPlot: '0.01',
    shimmerLuckPerPlot: 0.02,
    blurb: 'Atrai sonhos dourados para a margem: +1% SPS, +1% clique e +2% frequência de Ecos por planta.',
  },
]);

export const GARDEN_SEED_BY_ID = Object.freeze(
  Object.fromEntries(GARDEN_SEEDS.map((s) => [s.id, s])),
);

/**
 * Dimensões da grelha do Jardim por nível de `cerberian_hound` (2x2 no Lv.1 até 6x6 no Lv.9+).
 */
export function gardenDimensionsForLevel(level = 1) {
  const lv = Math.max(1, Math.floor(Number(level) || 1));
  if (lv <= 1) return { rows: 2, cols: 2 };
  if (lv === 2) return { rows: 2, cols: 3 };
  if (lv === 3) return { rows: 3, cols: 3 };
  if (lv === 4) return { rows: 3, cols: 4 };
  if (lv === 5) return { rows: 4, cols: 4 };
  if (lv === 6) return { rows: 4, cols: 5 };
  if (lv === 7) return { rows: 5, cols: 5 };
  if (lv === 8) return { rows: 5, cols: 6 };
  return { rows: 6, cols: 6 };
}

/**
 * 4. Mercado de Caronte (Trono de Obsidiana Lv.1) — Bens atrelados aos geradores.
 */
export const MARKET_GOODS = freezeDeep([
  {
    id: 'obolo_cobre',
    symbol: 'OBL',
    name: 'Óbolos de Cobre',
    spriteId: 'good_obolo_cobre',
    generatorId: 'charon_servants',
    tier: 1,
    baseRestingValue: 10,
  },
  {
    id: 'ferro_estigio',
    symbol: 'FER',
    name: 'Ferro Estígio',
    spriteId: 'good_ferro_estigio',
    generatorId: 'phlegethon_forge',
    tier: 2,
    baseRestingValue: 20,
  },
  {
    id: 'incenso_sombrio',
    symbol: 'INC',
    name: 'Incenso Sombrio',
    spriteId: 'good_incenso_sombrio',
    generatorId: 'mnemosyne_temple',
    tier: 3,
    baseRestingValue: 30,
  },
  {
    id: 'eter_condensado',
    symbol: 'ETR',
    name: 'Éter Condensado',
    spriteId: 'good_eter_condensado',
    generatorId: 'styx_tower',
    tier: 4,
    baseRestingValue: 40,
  },
  {
    id: 'amalgama_aurica',
    symbol: 'AMG',
    name: 'Amálgama Áurica',
    spriteId: 'good_amalgama_aurica',
    generatorId: 'tartarus_lab',
    tier: 5,
    baseRestingValue: 50,
  },
  {
    id: 'areia_de_cronos',
    symbol: 'CRO',
    name: 'Areia de Cronos',
    spriteId: 'good_areia_de_cronos',
    generatorId: 'chronos_loom',
    tier: 6,
    baseRestingValue: 60,
  },
]);

export const MARKET_GOOD_BY_ID = Object.freeze(
  Object.fromEntries(MARKET_GOODS.map((g) => [g.id, g])),
);
