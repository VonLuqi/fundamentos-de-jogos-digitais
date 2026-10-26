/**
 * Fase F8 — Catálogo congelado das 4 Estações do Submundo (Paridade Seasons).
 * Duração base: 24h por estação; Season Switcher desbloqueável no Panteão (`rodizio_das_estacoes`).
 */

import {
  HERMES_CONTRACT_COST_MULT,
  HERMES_FAIR_SHIMMER_RATE_MULT,
  SATURN_KING_DISCOUNT_PER_LEVEL,
  SATURN_KING_MAX_LEVEL,
  SATURN_KING_SPS_PER_LEVEL,
  SEASON_BASE_SWITCH_COST,
  SEASON_DURATION_MS,
} from './constants.js';

function freezeDeep(list) {
  return Object.freeze(list.map((item) => Object.freeze({ ...item })));
}

export const SEASON_SWITCHER_TALENT_ID = 'rodizio_das_estacoes';

export const SEASONS = freezeDeep([
  {
    id: 'antesteria',
    name: 'Antestéria (Festival das Flores e Espíritos)',
    ccParity: 'Easter / Valentine',
    spriteId: 'season_antesteria',
    durationMs: SEASON_DURATION_MS,
    dropUpgradeIds: Object.freeze([
      'ovo_orfico_bronze',
      'ovo_orfico_prata',
      'ovo_orfico_ouro',
      'coroa_de_antesteria',
    ]),
    blurb: 'As margens florescem em asfódelos dourados: Ecos e Sanguessugas podem revelar Ovos Órficos e Coroas Florais (+1% a +2% SPS compostos).',
  },
  {
    id: 'lemuria',
    name: 'Lemúria (Noite dos Espectros Famintos)',
    ccParity: 'Halloween',
    spriteId: 'season_lemuria',
    durationMs: SEASON_DURATION_MS,
    dropUpgradeIds: Object.freeze([
      'bolacha_espectral_estige',
      'obolo_fantasma_lemuria',
      'cranio_de_acucar_ctoniano',
    ]),
    blurb: 'Os espíritos famintos rondam a Foice: estourar Sanguessugas do Acheron pode revelar oferendas espectrais (+2% SPS cada).',
  },
  {
    id: 'saturnalia',
    name: 'Saturnália Ctoniana (Solstício no Hades)',
    ccParity: 'Christmas',
    spriteId: 'season_saturnalia',
    durationMs: SEASON_DURATION_MS,
    dropUpgradeIds: Object.freeze([
      'presente_de_saturnalia',
      'bencao_do_rei_saturno',
    ]),
    blurb: 'Desperta o Rei Saturno (até 5 níveis: +5% SPS e −1% custos por nível) e atrai Corças de Ártemis ao Santuário.',
  },
  {
    id: 'feira_de_hermes',
    name: 'Feira de Hermes (Mercadores de Almas)',
    ccParity: 'Business Day',
    spriteId: 'season_feira_de_hermes',
    durationMs: SEASON_DURATION_MS,
    dropUpgradeIds: Object.freeze([
      'contrato_de_hermes',
    ]),
    blurb: 'Ecos do Acheron surgem +5% mais rápido e libera o Contrato de Hermes (−2% custo de todos os geradores).',
  },
]);

export const SEASON_IDS = Object.freeze(SEASONS.map((s) => s.id));

export const SEASON_BY_ID = Object.freeze(
  Object.fromEntries(SEASONS.map((s) => [s.id, s])),
);

export const ALL_SEASONAL_DROP_UPGRADE_IDS = Object.freeze(
  SEASONS.flatMap((s) => s.dropUpgradeIds),
);

export const SATURN_KING_STAGES = freezeDeep([
  { level: 0, name: 'Efígie Adormecida', upgradeCost: '0', spsBonus: '0', discount: '0' },
  { level: 1, name: 'Saturno Desperto', upgradeCost: '2500', spsBonus: '0.05', discount: '0.01' },
  { level: 2, name: 'Cronos Festivo', upgradeCost: '25000', spsBonus: '0.10', discount: '0.02' },
  { level: 3, name: 'Senhor das Coroas de Azevinho', upgradeCost: '250000', spsBonus: '0.15', discount: '0.03' },
  { level: 4, name: 'Patriarca do Solstício Negro', upgradeCost: '2500000', spsBonus: '0.20', discount: '0.04' },
  { level: SATURN_KING_MAX_LEVEL, name: 'Rei Saturno Soberano', upgradeCost: '25000000', spsBonus: '0.25', discount: '0.05' },
]);

export const SEASON_CONFIG = Object.freeze({
  durationMs: SEASON_DURATION_MS,
  baseSwitchCost: SEASON_BASE_SWITCH_COST,
  saturnKingMaxLevel: SATURN_KING_MAX_LEVEL,
  saturnKingSpsPerLevel: SATURN_KING_SPS_PER_LEVEL,
  saturnKingDiscountPerLevel: SATURN_KING_DISCOUNT_PER_LEVEL,
  hermesShimmerRateMult: HERMES_FAIR_SHIMMER_RATE_MULT,
  hermesContractCostMult: HERMES_CONTRACT_COST_MULT,
});

export function getSeason(id) {
  return SEASON_BY_ID[String(id ?? '')] ?? null;
}

export function isKnownSeasonId(id) {
  return Boolean(SEASON_BY_ID[String(id ?? '')]);
}
