/**
 * Fase F8 — SeasonSystem (Domínio puro das 4 Estações do Submundo e Rei Saturno).
 * Responsabilidades:
 * 1. Normalização do estado `seasons` (`activeSeason`, `expiresAt`, `switchesCount`, `saturnKingLevel`, `unlockedDrops`, `deerCaught`).
 * 2. Troca de estação via *Season Switcher* (`rodizio_das_estacoes`), com duração de 24h e custo escalonado `baseSwitchCost × 2^switchesCount`.
 * 3. Evolução do *Rei Saturno / Cronos Festivo* (níveis 0..5 na Saturnália).
 * 4. Captura de *Corças de Ártemis* (*Reindeer*) e desbloqueio de drops sazonais (Antestéria, Lemúria, Saturnália, Feira de Hermes).
 * 5. Cálculo dos modificadores sazonais de SPS, custo e spawn de Ecos.
 */

import {
  ALL_SEASONAL_DROP_UPGRADE_IDS,
  SATURN_KING_STAGES,
  SEASON_BY_ID,
  SEASON_CONFIG,
  SEASON_SWITCHER_TALENT_ID,
  SEASONS,
  getSeason,
  isKnownSeasonId,
} from '../config/seasons.js';
import { add, cmp, money, mul, sub } from './decimal.js';

const KNOWN_DROPS_SET = new Set(ALL_SEASONAL_DROP_UPGRADE_IDS);

export function isSeasonSwitcherUnlocked(talents = []) {
  const set = new Set((Array.isArray(talents) ? talents : []).map((t) => String(t)));
  return set.has(SEASON_SWITCHER_TALENT_ID);
}

export function normalizeSeasonState(raw = {}, opts = {}) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const nowMs = opts.nowMs != null && Number.isFinite(Number(opts.nowMs))
    ? Math.floor(Number(opts.nowMs))
    : null;

  let activeSeason = src.activeSeason && isKnownSeasonId(src.activeSeason)
    ? String(src.activeSeason)
    : null;
  let expiresAt = Number.isFinite(Number(src.expiresAt)) && Number(src.expiresAt) > 0
    ? Math.floor(Number(src.expiresAt))
    : null;

  if (activeSeason && nowMs != null && expiresAt != null && expiresAt <= nowMs) {
    activeSeason = null;
    expiresAt = null;
  }

  const switchesCount = Math.max(0, Math.floor(Number(src.switchesCount) || 0));
  const saturnKingLevel = Math.max(
    0,
    Math.min(SEASON_CONFIG.saturnKingMaxLevel, Math.floor(Number(src.saturnKingLevel) || 0)),
  );
  const deerCaught = Math.max(0, Math.floor(Number(src.deerCaught) || 0));

  const unlockedDrops = [];
  const seen = new Set();
  const rawDrops = Array.isArray(src.unlockedDrops) ? src.unlockedDrops : [];
  const upgrades = Array.isArray(opts.upgrades) ? opts.upgrades : [];
  for (const id of [...rawDrops, ...upgrades]) {
    const key = String(id || '');
    if (KNOWN_DROPS_SET.has(key) && !seen.has(key)) {
      seen.add(key);
      unlockedDrops.push(key);
    }
  }

  return {
    activeSeason,
    expiresAt,
    switchesCount,
    saturnKingLevel,
    deerCaught,
    unlockedDrops,
  };
}

/**
 * Custo para ativar/trocar de estação: `SEASON_BASE_SWITCH_COST × 2^min(switchesCount, 20)`.
 */
export function calculateSeasonSwitchCost(switchesCount = 0) {
  const step = Math.max(0, Math.min(20, Math.floor(Number(switchesCount) || 0)));
  const factor = (1n << BigInt(step)).toString();
  return money(mul(SEASON_CONFIG.baseSwitchCost, factor));
}

/**
 * Alterna para uma das 4 Estações Ctonianas por 24 horas.
 */
export function activateSeason(seasonState = {}, {
  seasonId,
  talents = [],
  souls = '0',
  nowMs = Date.now(),
  free = false,
} = {}) {
  const state = normalizeSeasonState(seasonState, { nowMs });
  if (!isKnownSeasonId(seasonId)) {
    return { ok: false, reason: 'unknown_season', state };
  }
  if (!free && !isSeasonSwitcherUnlocked(talents)) {
    return { ok: false, reason: 'locked', state };
  }

  const cost = free ? money('0') : calculateSeasonSwitchCost(state.switchesCount);
  if (!free && cmp(souls, cost) < 0) {
    return { ok: false, reason: 'insufficient_souls', cost, state };
  }

  const seasonDef = getSeason(seasonId);
  const nextDrops = new Set(state.unlockedDrops);
  if (seasonId === 'feira_de_hermes') {
    nextDrops.add('contrato_de_hermes');
  } else if (seasonId === 'saturnalia') {
    nextDrops.add('bencao_do_rei_saturno');
  }

  const nextState = normalizeSeasonState({
    ...state,
    activeSeason: seasonDef.id,
    expiresAt: Math.floor(Number(nowMs)) + seasonDef.durationMs,
    switchesCount: state.switchesCount + 1,
    unlockedDrops: [...nextDrops],
  }, { nowMs });

  return {
    ok: true,
    seasonId: seasonDef.id,
    seasonName: seasonDef.name,
    cost,
    expiresAt: nextState.expiresAt,
    state: nextState,
  };
}

/**
 * Evolui o Rei Saturno / Cronos Festivo (níveis 0 → 5 durante a Saturnália ou se já iniciado).
 */
export function upgradeSaturnKing(seasonState = {}, {
  souls = '0',
  nowMs = Date.now(),
  free = false,
} = {}) {
  const state = normalizeSeasonState(seasonState, { nowMs });
  if (!free && state.activeSeason !== 'saturnalia' && state.saturnKingLevel < 1) {
    return { ok: false, reason: 'requires_saturnalia', state };
  }
  if (state.saturnKingLevel >= SEASON_CONFIG.saturnKingMaxLevel) {
    return { ok: false, reason: 'max_level', state };
  }

  const nextLv = state.saturnKingLevel + 1;
  const stageDef = SATURN_KING_STAGES[nextLv];
  const cost = free ? money('0') : money(stageDef.upgradeCost);
  if (!free && cmp(souls, cost) < 0) {
    return { ok: false, reason: 'insufficient_souls', cost, state };
  }

  const nextDrops = new Set(state.unlockedDrops);
  nextDrops.add('bencao_do_rei_saturno');

  const nextState = normalizeSeasonState({
    ...state,
    saturnKingLevel: nextLv,
    unlockedDrops: [...nextDrops],
  }, { nowMs });

  return {
    ok: true,
    level: nextLv,
    stageName: stageDef.name,
    cost,
    state: nextState,
  };
}

/**
 * Captura uma Corça de Ártemis (Reindeer) durante a Saturnália e desbloqueia drops sazonais.
 */
export function catchArtemisDeer(seasonState = {}, {
  sps = '0',
  nowMs = Date.now(),
} = {}) {
  const state = normalizeSeasonState(seasonState, { nowMs });
  const fromSps = mul(sps || '0', '60');
  const reward = money(cmp(fromSps, '25') > 0 ? fromSps : '25');
  const nextDrops = new Set(state.unlockedDrops);
  nextDrops.add('presente_de_saturnalia');
  nextDrops.add('bencao_do_rei_saturno');

  const nextState = normalizeSeasonState({
    ...state,
    deerCaught: state.deerCaught + 1,
    unlockedDrops: [...nextDrops],
  }, { nowMs });

  return {
    ok: true,
    reward,
    deerCaught: nextState.deerCaught,
    unlockedDropId: 'presente_de_saturnalia',
    state: nextState,
  };
}

/**
 * Tenta desbloquear o próximo drop sazonal da estação ativa (ao colher Eco ou estourar Sanguessuga).
 */
export function rollSeasonalDropUnlock(seasonState = {}, {
  trigger = 'any',
  nowMs = Date.now(),
} = {}) {
  const state = normalizeSeasonState(seasonState, { nowMs });
  if (!state.activeSeason) {
    return { unlockedDropId: null, state };
  }
  const seasonDef = SEASON_BY_ID[state.activeSeason];
  if (!seasonDef) {
    return { unlockedDropId: null, state };
  }

  // Lemúria foca em Sanguessugas (ou 'any'); Antestéria em Ecos/Sanguessugas
  if (state.activeSeason === 'lemuria' && trigger !== 'leech' && trigger !== 'any') {
    return { unlockedDropId: null, state };
  }

  const ownedDrops = new Set(state.unlockedDrops);
  let newlyUnlocked = null;
  for (const dropId of seasonDef.dropUpgradeIds) {
    if (!ownedDrops.has(dropId)) {
      ownedDrops.add(dropId);
      newlyUnlocked = dropId;
      break;
    }
  }

  if (!newlyUnlocked) {
    return { unlockedDropId: null, state };
  }

  const nextState = normalizeSeasonState({
    ...state,
    unlockedDrops: [...ownedDrops],
  }, { nowMs });

  return {
    unlockedDropId: newlyUnlocked,
    state: nextState,
  };
}

/**
 * Calcula os modificadores ativos de Estação e Rei Saturno.
 */
export function seasonModifiers(seasonState = {}, upgradeIds = []) {
  const state = normalizeSeasonState(seasonState, { upgrades: upgradeIds });
  const ownedUpgrades = new Set((Array.isArray(upgradeIds) ? upgradeIds : []).map((u) => String(u)));

  // Rei Saturno: +5% SPS e -1% custo por nível (1..5)
  const lv = state.saturnKingLevel;
  const saturnSpsMult = lv > 0
    ? add('1', mul(SEASON_CONFIG.saturnKingSpsPerLevel, String(lv)))
    : '1';
  const saturnCostMult = lv > 0
    ? sub('1', mul(SEASON_CONFIG.saturnKingDiscountPerLevel, String(lv)))
    : '1';

  const saturnUpgradeMult = ownedUpgrades.has('bencao_do_rei_saturno') ? '1.15' : '1';
  const totalSaturnaliaSpsMult = mul(saturnSpsMult, saturnUpgradeMult);

  // Feira de Hermes: +5% frequência de Ecos + -2% custo de geradores com Contrato de Hermes
  const isHermesFair = state.activeSeason === 'feira_de_hermes';
  const shimmerRateMult = isHermesFair ? SEASON_CONFIG.hermesShimmerRateMult : 1;
  const hermesCostMult = ownedUpgrades.has('contrato_de_hermes')
    ? SEASON_CONFIG.hermesContractCostMult
    : '1';

  return {
    activeSeason: state.activeSeason,
    saturnKingLevel: lv,
    saturnaliaSpsMult: totalSaturnaliaSpsMult,
    saturnCostMult,
    hermesCostMult,
    generatorCostMult: mul(saturnCostMult, hermesCostMult),
    upgradeCostMult: saturnCostMult,
    shimmerRateMult,
  };
}

export { SEASONS, SATURN_KING_STAGES, getSeason };
