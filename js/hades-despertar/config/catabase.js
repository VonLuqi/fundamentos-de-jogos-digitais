/**
 * Fase F6 — Catálogo da Catábase das Avós (Grandmapocalypse), Cadeia do Centro de Pesquisa
 * Estígio (Bingo Center), Sanguessugas do Acheron (Wrinklers), Trégua (Elder Pledge) e
 * Aliança Eterna (Elder Covenant).
 */

import {
  CATABASE_COVENANT_SPS_MULT,
  CATABASE_PLEDGE_DURATION_SEC,
  CATABASE_PLEDGE_MAX_STEP,
  CATABASE_RESEARCH_DURATION_SEC,
  CATABASE_STAGE3_ELDER_PACT_PER_NON_SERVANT,
  CATABASE_UNLOCK_SERVANTS,
  LEECH_BASE_CAP,
  LEECH_DRAIN_PER_UNIT,
  LEECH_MAX_CAP,
  LEECH_PAYOUT_MULT_BASE,
  LEECH_PAYOUT_MULT_SACRA,
  LEECH_SHINY_CHANCE,
  LEECH_SHINY_PAYOUT_MULT,
  LEECH_SPAWN_CHANCE_PER_SEC_PER_STAGE,
  WRATH_SHIMMER_PROB_BY_STAGE,
} from './constants.js';

export const CATABASE_CONFIG = Object.freeze({
  unlockServants: CATABASE_UNLOCK_SERVANTS,
  researchDurationSec: CATABASE_RESEARCH_DURATION_SEC,
  pledgeDurationSec: CATABASE_PLEDGE_DURATION_SEC,
  pledgeMaxStep: CATABASE_PLEDGE_MAX_STEP,
  covenantSpsMult: CATABASE_COVENANT_SPS_MULT,
  elderPactPerNonServant: CATABASE_STAGE3_ELDER_PACT_PER_NON_SERVANT,
  leechBaseCap: LEECH_BASE_CAP,
  leechMaxCap: LEECH_MAX_CAP,
  leechDrainPerUnit: LEECH_DRAIN_PER_UNIT,
  leechPayoutMultBase: LEECH_PAYOUT_MULT_BASE,
  leechPayoutMultSacra: LEECH_PAYOUT_MULT_SACRA,
  leechShinyPayoutMult: LEECH_SHINY_PAYOUT_MULT,
  leechShinyChance: LEECH_SHINY_CHANCE,
  leechSpawnChancePerSecPerStage: LEECH_SPAWN_CHANCE_PER_SEC_PER_STAGE,
  wrathProbByStage: WRATH_SHIMMER_PROB_BY_STAGE,
});

export const CATABASE_STAGES = Object.freeze([
  Object.freeze({
    stage: 0,
    id: 'apaziguado',
    name: 'Apaziguado',
    wrathProbability: 0,
    spriteId: 'catabase_estagio_1',
    blurb: 'As águas do Acheron correm calmas; nenhum parasita espreita a Foice.',
  }),
  Object.freeze({
    stage: 1,
    id: 'despertar_ctoniano',
    name: 'Despertar Ctoniano (Estágio 1)',
    wrathProbability: 1 / 3,
    spriteId: 'catabase_estagio_1',
    blurb: 'As mentes dos Servos convergem: 33% dos Ecos nascem Coléricos e Sanguessugas buscam a Foice.',
  }),
  Object.freeze({
    stage: 2,
    id: 'comunhao_abissal',
    name: 'Comunhão Abissal (Estágio 2)',
    wrathProbability: 2 / 3,
    spriteId: 'catabase_estagio_2',
    blurb: 'O coro abissal engrossa: 66% de Ecos Coléricos e o dobro de Sanguessugas emergindo.',
  }),
  Object.freeze({
    stage: 3,
    id: 'pacto_primordial',
    name: 'Pacto Primordial (Estágio 3)',
    wrathProbability: 1,
    spriteId: 'catabase_estagio_3',
    blurb: 'A Catábase é total: 100% dos Ecos são Coléricos e os Servos absorvem vigor de todo o Submundo.',
  }),
]);

/**
 * Cadeia sequencial do Arquivo Estígio (`concilio_das_moiras` abre o timer para o passo 0).
 */
export const CATABASE_RESEARCH_CHAIN = Object.freeze([
  Object.freeze({
    step: 0,
    upgradeId: 'soro_estigio',
    prevUpgradeId: 'concilio_das_moiras',
    name: 'Soro Estígio',
    spsBonusFactor: '1.01',
    setsStage: 0,
  }),
  Object.freeze({
    step: 1,
    upgradeId: 'despertar_ctoniano',
    prevUpgradeId: 'soro_estigio',
    name: 'Despertar Ctoniano',
    spsBonusFactor: '1.02',
    setsStage: 1,
  }),
  Object.freeze({
    step: 2,
    upgradeId: 'sinapse_espectral',
    prevUpgradeId: 'despertar_ctoniano',
    name: 'Sinapse Espectral',
    spsBonusFactor: '1.03',
    setsStage: 1,
  }),
  Object.freeze({
    step: 3,
    upgradeId: 'comunhao_abissal',
    prevUpgradeId: 'sinapse_espectral',
    name: 'Comunhão Abissal',
    spsBonusFactor: '1.04',
    setsStage: 2,
  }),
  Object.freeze({
    step: 4,
    upgradeId: 'pacto_primordial',
    prevUpgradeId: 'comunhao_abissal',
    name: 'Pacto Primordial',
    spsBonusFactor: '1.05',
    setsStage: 3,
  }),
]);

export const CATABASE_UPGRADE_IDS = Object.freeze([
  'concilio_das_moiras',
  ...CATABASE_RESEARCH_CHAIN.map((item) => item.upgradeId),
  'ninho_do_acheron',
  'visceras_sacras',
]);

export const CATABASE_SPRITE_ITEMS = Object.freeze([
  Object.freeze({ id: 'sanguessuga_normal', name: 'Sanguessuga do Acheron', category: 'leech' }),
  Object.freeze({ id: 'sanguessuga_shiny', name: 'Sanguessuga Abissal Dourada', category: 'leech_shiny' }),
  Object.freeze({ id: 'catabase_estagio_1', name: 'Estágio 1 — Despertar Ctoniano', category: 'stage' }),
  Object.freeze({ id: 'catabase_estagio_2', name: 'Estágio 2 — Comunhão Abissal', category: 'stage' }),
  Object.freeze({ id: 'catabase_estagio_3', name: 'Estágio 3 — Pacto Primordial', category: 'stage' }),
  Object.freeze({ id: 'tregua_estigia', name: 'Juramento de Trégua (Elder Pledge)', category: 'pact' }),
  Object.freeze({ id: 'alianca_eterna', name: 'Aliança Eterna (Elder Covenant)', category: 'pact' }),
]);

/**
 * Calcula o estágio estrutural da Catábase (0..3) com base nos upgrades comprados.
 */
export function structuralCatabaseStageFromUpgrades(upgradeIds = []) {
  const owned = new Set((Array.isArray(upgradeIds) ? upgradeIds : []).map((id) => String(id)));
  if (owned.has('pacto_primordial')) return 3;
  if (owned.has('comunhao_abissal')) return 2;
  if (owned.has('despertar_ctoniano')) return 1;
  return 0;
}

/**
 * Probabilidade de um Eco do Acheron nascer como Eco Colérico (Wrath) conforme o estágio efetivo.
 */
export function wrathProbabilityForStage(stage = 0) {
  const idx = Math.max(0, Math.min(3, Math.floor(Number(stage) || 0)));
  return WRATH_SHIMMER_PROB_BY_STAGE[idx] ?? 0;
}

/**
 * Custo do Juramento de Trégua (*Elder Pledge*): `8^min(pledgesCount+2, 14)`
 * (1ª = 64, 2ª = 512, … até ≈ 4.4e12).
 */
export function calculatePledgeCost(pledgesCount = 0) {
  const n = Math.max(0, Math.floor(Number(pledgesCount) || 0));
  const step = Math.max(0, Math.min(CATABASE_PLEDGE_MAX_STEP, n + 2));
  return (8n ** BigInt(step)).toString();
}
