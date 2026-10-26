/**
 * Catálogo congelado dos Ecos do Acheron (Fase F2 — paridade Golden / Wrath Cookies).
 * Dados puros: sem lógica de DOM nem mutação de estado.
 */

import {
  SHIMMER_BUILDING_SPECIAL_DURATION_SEC,
  SHIMMER_BUILDING_SPECIAL_MAX_MULT,
  SHIMMER_CLICK_FRENZY_DURATION_SEC,
  SHIMMER_CLICK_FRENZY_MULT,
  SHIMMER_CLOT_DURATION_SEC,
  SHIMMER_CLOT_MULT,
  SHIMMER_ELDER_FRENZY_DURATION_SEC,
  SHIMMER_ELDER_FRENZY_MULT,
  SHIMMER_FRENZY_DURATION_SEC,
  SHIMMER_FRENZY_MULT,
  SHIMMER_LIFETIME_SEC,
  SHIMMER_LUCKY_FLAT_BONUS,
  SHIMMER_LUCKY_SPS_SECONDS,
  SHIMMER_LUCKY_WALLET_FRACTION,
  SHIMMER_MAX_ACTIVE,
  SHIMMER_MAX_ACTIVE_BUFFS,
  SHIMMER_SPAWN_MAX_SEC,
  SHIMMER_SPAWN_MIN_SEC,
  SHIMMER_SYNC_TOLERANCE_MS,
  DRAGONFLIGHT_CLICK_MULT,
  DRAGONFLIGHT_DURATION_SEC,
} from './constants.js';

function freezeDeep(list) {
  return Object.freeze(
    list.map((item) => Object.freeze({ ...item })),
  );
}

/**
 * Presets de tuning (canônico Cookie Clicker §9.4 vs compacto de aula).
 */
export const SHIMMER_PRESETS = Object.freeze({
  canonical: Object.freeze({
    mareMult: SHIMMER_FRENZY_MULT,
    mareDurationSec: SHIMMER_FRENZY_DURATION_SEC,
    furiaMult: SHIMMER_CLICK_FRENZY_MULT,
    furiaDurationSec: SHIMMER_CLICK_FRENZY_DURATION_SEC,
  }),
  classroom: Object.freeze({
    mareMult: '3',
    mareDurationSec: 60,
    furiaMult: '50',
    furiaDurationSec: 10,
  }),
});

export const SHIMMER_CONFIG = Object.freeze({
  spawnMinSec: SHIMMER_SPAWN_MIN_SEC,
  spawnMaxSec: SHIMMER_SPAWN_MAX_SEC,
  lifetimeSec: SHIMMER_LIFETIME_SEC,
  maxActiveShimmers: SHIMMER_MAX_ACTIVE,
  maxActiveBuffs: SHIMMER_MAX_ACTIVE_BUFFS,
  syncToleranceMs: SHIMMER_SYNC_TOLERANCE_MS,
  buildingSpecialMaxMult: SHIMMER_BUILDING_SPECIAL_MAX_MULT,
});

/**
 * Tabela de rolls dos Ecos do Acheron:
 * - v1 (`requiresCatabase: false`): Eco Dourado (`eco_dourado`)
 * - v2 (`requiresCatabase: true`): Eco Colérico / Wrath (`eco_colerico`, ativado na F6 Catábase)
 */
export const SHIMMER_EFFECTS = freezeDeep([
  {
    id: 'frenesi_nectar',
    name: 'Frenesi de Néctar',
    kind: 'spsBuff',
    variant: 'golden',
    spriteId: 'nectar_dourado',
    factor: '3',
    durationSec: 3600,
    weight: 0,
    requiresCatabase: false,
    manualOnly: true,
    blurb: 'O Cálice do Lethe ferve: produção de Almas / s triplicada (×3) por 1 hora.',
  },
  {
    id: 'mare_acheron',
    name: 'Maré do Acheron',
    kind: 'spsBuff',
    variant: 'golden',
    spriteId: 'eco_dourado',
    factor: SHIMMER_FRENZY_MULT,
    durationSec: SHIMMER_FRENZY_DURATION_SEC,
    weight: 40,
    requiresCatabase: false,
    blurb: 'As correntes do Acheron transbordam: produção de Almas / s multiplicada por ×7 durante 77 s.',
  },
  {
    id: 'colheita_acheron',
    name: 'Colheita do Acheron',
    kind: 'instantLucky',
    variant: 'golden',
    spriteId: 'eco_dourado',
    walletFraction: SHIMMER_LUCKY_WALLET_FRACTION,
    spsSeconds: SHIMMER_LUCKY_SPS_SECONDS,
    flatBonus: SHIMMER_LUCKY_FLAT_BONUS,
    durationSec: 0,
    weight: 40,
    requiresCatabase: false,
    blurb: 'Bolsa de almas desgarradas: concede instantaneamente min(15% da carteira, 15 min de SPS) + 13.',
  },
  {
    id: 'furia_foice',
    name: 'Fúria da Foice',
    kind: 'clickBuff',
    variant: 'golden',
    spriteId: 'eco_dourado',
    factor: SHIMMER_CLICK_FRENZY_MULT,
    durationSec: SHIMMER_CLICK_FRENZY_DURATION_SEC,
    weight: 12,
    requiresCatabase: false,
    blurb: 'A lâmina incandesce em ouro ctônico: cada corte da Foice rende ×777 por 13 s.',
  },
  {
    id: 'selo_juizo',
    name: 'Selo do Juízo',
    kind: 'buildingSpecial',
    variant: 'golden',
    spriteId: 'eco_dourado',
    factor: '1',
    durationSec: SHIMMER_BUILDING_SPECIAL_DURATION_SEC,
    verdictsGain: 1,
    minGeneratorQty: 10,
    weight: 8,
    requiresCatabase: false,
    blurb: 'Outorga +1 Veredito e, se houver legião (≥10 unidades de um servo), eleva o SPS em (N/10 + 1)× por 30 s.',
  },
  {
    id: 'clot_acheron',
    name: 'Coágulo do Acheron',
    kind: 'spsBuff',
    variant: 'wrath',
    spriteId: 'eco_colerico',
    factor: SHIMMER_CLOT_MULT,
    durationSec: SHIMMER_CLOT_DURATION_SEC,
    weight: 15,
    requiresCatabase: true,
    blurb: 'As águas engrossam em sangue antigo: Almas / s reduzidas a ×0,5 por 66 s.',
  },
  {
    id: 'elder_frenzy_acheron',
    name: 'Fúria Anciã do Acheron',
    kind: 'spsBuff',
    variant: 'wrath',
    spriteId: 'eco_colerico',
    factor: SHIMMER_ELDER_FRENZY_MULT,
    durationSec: SHIMMER_ELDER_FRENZY_DURATION_SEC,
    weight: 5,
    requiresCatabase: true,
    blurb: 'Os titãs do Tártaro rugem em uníssono: Almas / s multiplicadas por ×666 durante 6 s.',
  },
  {
    id: 'voo_draconico_acheron',
    name: 'Voo Dracónico',
    kind: 'clickBuff',
    variant: 'golden',
    spriteId: 'eco_dourado',
    factor: DRAGONFLIGHT_CLICK_MULT,
    durationSec: DRAGONFLIGHT_DURATION_SEC,
    weight: 10,
    requiresCatabase: false,
    requiresDragonflight: true,
    blurb: 'Asas de Ladão rasgam o Acheron: cada corte da Foice rende ×1111 durante 10 s.',
  },
]);

export const SHIMMER_IDS = Object.freeze(SHIMMER_EFFECTS.map((item) => item.id));

export const SHIMMER_BY_ID = Object.freeze(
  Object.fromEntries(SHIMMER_EFFECTS.map((item) => [item.id, item])),
);

export function getShimmerEffect(id) {
  return SHIMMER_BY_ID[String(id ?? '')] ?? null;
}

export function isKnownShimmerId(id) {
  return Boolean(SHIMMER_BY_ID[String(id ?? '')]);
}

export function isBuffShimmerEffect(idOrEffect) {
  const def = typeof idOrEffect === 'string' ? getShimmerEffect(idOrEffect) : idOrEffect;
  if (!def) return false;
  return def.kind === 'spsBuff' || def.kind === 'clickBuff' || def.kind === 'buildingSpecial';
}
