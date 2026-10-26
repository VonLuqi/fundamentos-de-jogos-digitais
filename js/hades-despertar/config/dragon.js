/**
 * Fase F8 — Catálogo congelado do Dragão Ctoniano: Pitão / Ladão (Paridade Krumblor).
 * Dados puros: estágios de evolução (0..4) e 5 Auras canónicas.
 */

import {
  DRAGON_BREATH_OF_MILK_BOOST,
  DRAGON_CURSOR_CLICK_MULT,
  DRAGON_MAX_STAGE,
  DRAGON_RADIANT_APPETITE_MULT,
  DRAGON_STAGE1_SOULS_COST,
  DRAGON_STAGE2_SACRIFICE_QTY,
  DRAGON_STAGE3_SACRIFICE_QTY,
  DRAGON_STAGE4_SACRIFICE_QTY,
  DRAGONFLIGHT_CLICK_MULT,
  DRAGONFLIGHT_DURATION_SEC,
  GENERATOR_SELL_REFUND_EARTH_SHATTERER,
} from './constants.js';

function freezeDeep(list) {
  return Object.freeze(list.map((item) => Object.freeze({ ...item })));
}

export { DRAGON_MAX_STAGE };
export const DRAGON_UNLOCK_TALENT_ID = 'ovo_primordial';
export const DRAGON_SCALE_UPGRADE_ID = 'escama_de_ladao';

/**
 * Estágios de evolução do Dragão Ctoniano (0..4):
 * - 0: Ovo Primordial (custo para evoluir ao 1: 1.000.000 almas)
 * - 1: Filhote de Pitão (libera 1º Slot de Aura; custo para evoluir ao 2: sacrificar 50 geradores)
 * - 2: Serpente do Tártaro (custo para evoluir ao 3: sacrificar 100 geradores)
 * - 3: Hidra de Flegêton (custo para evoluir ao 4: sacrificar 200 geradores)
 * - 4: Ladão de Cem Cabeças (estágio máximo; libera 2º Slot de Aura)
 */
export const DRAGON_STAGES = freezeDeep([
  {
    stage: 0,
    id: 'dragon_stage_0',
    name: 'Ovo Primordial',
    spriteId: 'dragon_stage_0',
    auraSlots: 0,
    nextStageSoulsCost: DRAGON_STAGE1_SOULS_COST,
    nextStageSacrificeQty: 0,
    blurb: 'Um ovo de escamas de bronze estígio aquecido pelas cinzas de Mnemosyne.',
  },
  {
    stage: 1,
    id: 'dragon_stage_1',
    name: 'Filhote de Pitão',
    spriteId: 'dragon_stage_1',
    auraSlots: 1,
    nextStageSoulsCost: '0',
    nextStageSacrificeQty: DRAGON_STAGE2_SACRIFICE_QTY,
    blurb: 'A serpente oracular rompe a casca e abre o 1º Slot de Aura Dracónica.',
  },
  {
    stage: 2,
    id: 'dragon_stage_2',
    name: 'Serpente do Tártaro',
    spriteId: 'dragon_stage_2',
    auraSlots: 1,
    nextStageSoulsCost: '0',
    nextStageSacrificeQty: DRAGON_STAGE3_SACRIFICE_QTY,
    blurb: 'Alimentada com 50 estruturas do Domínio; seu rugido abala as fundações do Tártaro.',
  },
  {
    stage: 3,
    id: 'dragon_stage_3',
    name: 'Hidra de Flegêton',
    spriteId: 'dragon_stage_3',
    auraSlots: 1,
    nextStageSoulsCost: '0',
    nextStageSacrificeQty: DRAGON_STAGE4_SACRIFICE_QTY,
    blurb: 'Alimentada com 100 estruturas; suas múltiplas cabeças exalam o Apetite Radiante.',
  },
  {
    stage: DRAGON_MAX_STAGE,
    id: 'dragon_stage_4',
    name: 'Ladão de Cem Cabeças',
    spriteId: 'dragon_stage_4',
    auraSlots: 2,
    nextStageSoulsCost: '0',
    nextStageSacrificeQty: 0,
    blurb: 'Forma soberana insone (200 estruturas sacrificadas): abre o 2º Slot de Aura simultânea.',
  },
]);

export const DRAGON_AURAS = freezeDeep([
  {
    id: 'sopro_de_flegeton',
    name: 'Sopro de Flegêton (Breath of Milk)',
    spriteId: 'aura_sopro_de_flegeton',
    minStage: 1,
    effectKind: 'veilPupBoost',
    factor: DRAGON_BREATH_OF_MILK_BOOST,
    blurb: 'Filhotes do Cérbero (Véu) tornam-se +5% mais eficazes.',
  },
  {
    id: 'cursor_ancestral',
    name: 'Cursor Ancestral (Dragon Cursor)',
    spriteId: 'aura_cursor_ancestral',
    minStage: 1,
    effectKind: 'clickMult',
    factor: DRAGON_CURSOR_CLICK_MULT,
    blurb: 'Cada corte da Foice ganha +5% de poder de clique.',
  },
  {
    id: 'abalo_do_tartaro',
    name: 'Abalo do Tártaro (Earth Shatterer)',
    spriteId: 'aura_abalo_do_tartaro',
    minStage: 2,
    effectKind: 'sellRefundRate',
    factor: GENERATOR_SELL_REFUND_EARTH_SHATTERER,
    blurb: 'Vender geradores no Mercado devolve 50% do valor em vez de 25%.',
  },
  {
    id: 'voo_draconico',
    name: 'Voo Dracónico (Dragonflight)',
    spriteId: 'aura_voo_draconico',
    minStage: 2,
    effectKind: 'dragonflightShimmer',
    factor: DRAGONFLIGHT_CLICK_MULT,
    durationSec: DRAGONFLIGHT_DURATION_SEC,
    blurb: 'Ecos do Acheron podem conceder Voo Dracónico (×1111 poder de clique por 10 s).',
  },
  {
    id: 'apetite_radiante',
    name: 'Apetite Radiante (Radiant Appetite)',
    spriteId: 'aura_apetite_radiante',
    minStage: 3,
    effectKind: 'spsMult',
    factor: DRAGON_RADIANT_APPETITE_MULT,
    blurb: 'Multiplica toda a produção de Almas / s por ×2,0.',
  },
]);

export const DRAGON_AURA_IDS = Object.freeze(DRAGON_AURAS.map((a) => a.id));

export const DRAGON_AURA_BY_ID = Object.freeze(
  Object.fromEntries(DRAGON_AURAS.map((a) => [a.id, a])),
);

export function getDragonStage(stage = 0) {
  const s = Math.max(0, Math.min(DRAGON_MAX_STAGE, Math.floor(Number(stage) || 0)));
  return DRAGON_STAGES[s] ?? DRAGON_STAGES[0];
}

export function getDragonAura(id) {
  return DRAGON_AURA_BY_ID[String(id ?? '')] ?? null;
}

export function isKnownDragonAuraId(id) {
  return Boolean(DRAGON_AURA_BY_ID[String(id ?? '')]);
}
