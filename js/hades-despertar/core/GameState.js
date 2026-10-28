/**
 * Estado da corrida de O Despertar.
 * Simulação local; o servidor só julga na Task 9.
 */

import {
  BUY_MAX_CAP,
  GOLD_CHANCE,
  LETHE_PREVIEW_RUN_SOULS,
  NEGATIVO_CHANCE,
  SHINY_CHANCE,
  STYX_UNLOCK_SOULS,
} from '../config/constants.js';
import { EDU_LOG_IDS } from '../config/edu-logs.js';
import {
  DESPERTAR_ACHIEVEMENT_IDS,
  isKnownAchievementId,
  isNormalAchievementId,
} from '../config/achievements.js';
import { GENERATORS, GENERATOR_BY_ID } from '../config/generators.js';
import { isKnownTalentId, getTalent, meetsTalentRequirement } from '../config/talents.js';
import { isKnownUpgradeId, getUpgrade } from '../config/upgrades.js';
import { getVerdictShopItem, isKnownVerdictPurchase } from '../config/verdict-shop.js';
import {
  add,
  clampNonNegative,
  cmp,
  div,
  isZero,
  max,
  min,
  money,
  mul,
  normalize,
  sub,
} from './decimal.js';
import { EntitySet } from './EntitySet.js';
import {
  calculateEffectiveSPS,
  calculateOfflineProgress,
  calculateRawSPS,
  calculateSpsBreakdown,
  calculateTotalSPS,
  canPrestige as canPrestigeRun,
  cerberusPupMult as formulaCerberusPupMult,
  clickPower as formulaClickPower,
  countNormalAchievements,
  economyEffects,
  evaluateDespertarAchievementIds,
  elderPactServantFlatBonusPerUnit,
  generatorCostMultForId,
  generatorUpgradeMult,
  healLegacySave,
  lineSPS,
  meetsUpgradeRequirement,
  migrateUpgradeSave,
  migrateTalentSave,
  prestigePreview as formulaPrestigePreview,
  pickEcoDoStyxUpgrades,
  talentEffects,
  thousandBladesBonusPerUnit,
  upgradeEffectiveCost,
  veilFraction as formulaVeilFraction,
  veilPercent as formulaVeilPercent,
  veilTier as formulaVeilTier,
} from './formulas.js';
import {
  dragonModifiers,
  equipDragonAura as domainEquipDragonAura,
  evolveDragonStage as domainEvolveDragonStage,
  isDragonUnlocked as domainIsDragonUnlocked,
  normalizeDragonState,
} from './DragonSystem.js';
import {
  activateSeason as domainActivateSeason,
  calculateSeasonSwitchCost,
  catchArtemisDeer as domainCatchArtemisDeer,
  isSeasonSwitcherUnlocked as domainIsSeasonSwitcherUnlocked,
  normalizeSeasonState,
  rollSeasonalDropUnlock,
  seasonModifiers,
  upgradeSaturnKing as domainUpgradeSaturnKing,
} from './SeasonSystem.js';
import {
  claimTickerFortune as domainClaimTickerFortune,
  fortuneSpawnChance,
  normalizeFortuneState,
  rollTickerFortune as domainRollTickerFortune,
} from './FortuneSystem.js';
import { CATABASE_RESEARCH_CHAIN } from '../config/catabase.js';
import {
  activateElderPledge as domainActivateElderPledge,
  calculateLeechDrain,
  calculatePledgeCost,
  effectiveCatabaseStage,
  isCatabasePledgeActive,
  maxLeechCapacity,
  normalizeCatabaseState,
  popAllLeeches as domainPopAllLeeches,
  popLeech as domainPopLeech,
  setElderCovenant as domainSetElderCovenant,
  spawnLeech as domainSpawnLeech,
  stepCatabaseTick,
  summarizeLeeches,
} from './CatabaseSystem.js';
import { getShimmerEffect } from '../config/shimmers.js';
import {
  createShimmerInstance,
  normalizeActiveBuffs,
  normalizeShimmerInstance,
  pruneExpiredBuffs,
  resolveShimmerClickEffect,
  rollNextShimmerDelaySec,
  activateOrRenewBuff,
} from './ShimmerSystem.js';
import {
  MINIGAME_UNLOCK_GENERATORS,
  NECTAR_CONFIG,
} from '../config/minigames.js';
import {
  advanceNectarCycles,
  attemptManualNectarHarvest,
  describeNectarCycle,
  isNectarUnlocked,
  nextGeneratorLevelCost,
  normalizeGeneratorLevels,
  rollNectarVariant,
  unlockedMinigames,
} from './NectarSystem.js';
import {
  assignPantheonSpirit,
  normalizePantheonState,
} from './minigames/PantheonSystem.js';
import {
  castGrimoireSpell,
  normalizeGrimoireState,
  tickGrimoireMana,
} from './minigames/GrimoireSystem.js';
import {
  harvestGardenPlot,
  normalizeGardenState,
  plantGardenSeed,
  selectGardenSoil,
  stepGardenTicks,
} from './minigames/GardenSystem.js';
import {
  buyMarketGood,
  normalizeMarketState,
  sellMarketGood,
  stepMarketTick,
} from './minigames/MarketSystem.js';

function normalizePermanentUpgradeIds(raw) {
  const src = Array.isArray(raw) ? raw : [];
  const out = src.slice(0, 5).map((id) => (id ? String(id) : null));
  while (out.length < 5) out.push(null);
  return out;
}

function uniqueKnown(ids, isKnown) {
  const out = [];
  const seen = new Set();
  for (const id of Array.isArray(ids) ? ids : []) {
    const key = String(id);
    if (!isKnown(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function asQuantities(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  for (const [id, qty] of Object.entries(raw)) {
    if (!GENERATOR_BY_ID[id]) continue;
    const n = Math.floor(Number(qty) || 0);
    if (n > 0) out[id] = n;
  }
  return out;
}

/** Mapa id → almas lifetime creditadas àquele gerador (tooltip Cookie). */
function asLifetimeMoneyMap(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  for (const [id, val] of Object.entries(raw)) {
    if (!GENERATOR_BY_ID[id]) continue;
    const n = money(clampNonNegative(val ?? '0'));
    if (cmp(n, '0') > 0) out[id] = n;
  }
  return out;
}

/**
 * Normaliza contagens de raridade (negativo/gold): só ids conhecidos; 0 ≤ n ≤ room.
 * `peerCounts` reserva slots da outra raridade (gold + negativo ≤ qty).
 * @param {unknown} raw
 * @param {Record<string, number>} quantities
 * @param {Record<string, number>} [peerCounts]
 */
function asRarityCounts(raw, quantities = {}, peerCounts = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  for (const [id, val] of Object.entries(raw)) {
    if (!GENERATOR_BY_ID[id]) continue;
    const qty = Math.max(0, Math.floor(Number(quantities[id]) || 0));
    const peer = Math.max(0, Math.floor(Number(peerCounts[id]) || 0));
    const room = Math.max(0, qty - peer);
    let n = Math.floor(Number(val) || 0);
    if (!Number.isFinite(n) || n <= 0 || room <= 0) continue;
    if (n > room) n = room;
    out[id] = n;
  }
  return out;
}

/** @deprecated alias — shiny_counts = negativo */
function asShinyCounts(raw, quantities = {}, peerCounts = {}) {
  return asRarityCounts(raw, quantities, peerCounts);
}

function resolveBuyCount(mode, entity, wallet, costMult) {
  const raw = String(mode ?? '1').trim().toLowerCase();
  if (raw === 'max' || raw === 'máx' || raw === 'maximo' || raw === 'máximo') {
    return entity.maxAffordable(wallet, costMult);
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, BUY_MAX_CAP);
}

/** Contagem de lote sem carteira (free shopping). */
function resolveBuyCountFree(mode) {
  const raw = String(mode ?? '1').trim().toLowerCase();
  if (raw === 'max' || raw === 'máx' || raw === 'maximo' || raw === 'máximo') {
    return BUY_MAX_CAP;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, BUY_MAX_CAP);
}

export class GameState {
  constructor(snapshot = {}, options = {}) {
    this.souls = clampNonNegative(snapshot.souls ?? '0');
    this.obols = clampNonNegative(snapshot.obols ?? '0');
    this.mnemosyne = clampNonNegative(snapshot.mnemosyne ?? '0');
    this.lifetimeSouls = clampNonNegative(snapshot.lifetimeSouls ?? snapshot.lifetime_souls ?? '0');
    this.runSouls = clampNonNegative(snapshot.runSouls ?? snapshot.run_souls ?? '0');
    this.generatorLifetimeSouls = asLifetimeMoneyMap(
      snapshot.generatorLifetimeSouls ?? snapshot.generator_lifetime_souls,
    );
    this.prestigeCount = Math.max(0, Number.parseInt(snapshot.prestigeCount ?? snapshot.prestige_count, 10) || 0);
    this.generators = EntitySet.fromCatalog(
      asQuantities(snapshot.generators ?? snapshot.generators_state),
    );
    const qtyMap = this.generators.quantities();
    // Gold ocupa slots primeiro; negativo (shiny_counts) preenche o restante.
    this._goldCounts = asRarityCounts(
      snapshot.goldCounts ?? snapshot.gold_counts,
      qtyMap,
      {},
    );
    this._shinyCounts = asRarityCounts(
      snapshot.shinyCounts ?? snapshot.shiny_counts,
      qtyMap,
      this._goldCounts,
    );
    {
      const migratedUp = migrateUpgradeSave(
        snapshot.upgrades ?? snapshot.upgrades_state ?? [],
        this.souls,
      );
      this.upgrades = migratedUp.upgrades;
      this.souls = clampNonNegative(migratedUp.souls);
    }
    {
      const rawTalents = (Array.isArray(snapshot.talents ?? snapshot.talents_state)
        ? (snapshot.talents ?? snapshot.talents_state)
        : []
      ).map((id) => String(id));
      const talentMig = migrateTalentSave(rawTalents, this.mnemosyne);
      this.talents = talentMig.talents.filter((id) => isKnownTalentId(id));
      this.mnemosyne = clampNonNegative(talentMig.mnemosyne);
    }
    this.permanentUpgradeIds = normalizePermanentUpgradeIds(
      snapshot.permanentUpgradeIds ?? snapshot.permanent_upgrade_ids,
    );
    const msEarly = snapshot.milestones && typeof snapshot.milestones === 'object' ? snapshot.milestones : {};
    this.ascensionOpen = Boolean(
      snapshot.ascensionOpen ?? msEarly.ascensionOpen ?? false,
    );
    this.verdictPurchases = uniqueKnown(
      snapshot.verdictPurchases ?? snapshot.verdict_purchases,
      isKnownVerdictPurchase,
    );
    this.verdicts = Math.max(0, Number.parseInt(snapshot.verdicts, 10) || 0);
    this.juizoBestStreak = Math.max(0, Number.parseInt(snapshot.juizoBestStreak ?? snapshot.juizo_best_streak, 10) || 0);
    this.juizoCurrentStreak = Math.max(0, Number.parseInt(snapshot.juizoCurrentStreak ?? snapshot.juizo_current_streak, 10) || 0);
    this.eduLogsSeen = uniqueKnown(snapshot.eduLogsSeen ?? snapshot.edu_logs_seen, (id) => EDU_LOG_IDS.includes(id));
    this.milestones = {
      ...(snapshot.milestones && typeof snapshot.milestones === 'object' ? snapshot.milestones : {}),
      ascensionOpen: this.ascensionOpen,
    };
    this.lastSyncAt = snapshot.lastSyncAt ?? snapshot.last_sync_at ?? null;
    this.sessionSeconds = Number(snapshot.sessionSeconds) || 0;
    this.clickCount = Math.max(0, Number.parseInt(snapshot.clickCount, 10) || 0);
    this.amortSeen = Boolean(snapshot.amortSeen);
    this.syncOk = Boolean(snapshot.syncOk);
    this.maxHiddenSeconds = Number(snapshot.maxHiddenSeconds) || 0;
    this.lastOfflineSeconds = Number(snapshot.lastOfflineSeconds) || 0;
    this.revision = 0;
    /** Versão estrutural (compras/prestígio/raridade) — separada de revision (Perf-2/Perf-3). */
    this.structureVersion = 0;
    /** Cache de SPS e clickPower por versão estrutural (Perf-3). */
    this._cachedSps = null;
    this._cachedSpsVersion = -1;
    this._cachedEffectiveSps = null;
    this._cachedEffectiveSpsVersion = -1;
    this._cachedClickPower = null;
    this._cachedClickVersion = -1;
    /** Contador client-only de mutações sujas (Fase A / A2) — server ecoa, não autoridade. */
    this.syncEpoch = Math.max(
      0,
      Math.floor(Number(snapshot.syncEpoch ?? snapshot.clientEpoch)) || 0,
    );
    /** Flags só locais (Fase B) — NUNCA vão no toSnapshot / Postgres. */
    this.debugFlags = {
      freeShopping: false,
      forceShiny: false,
      forceGold: false,
    };
    this._listeners = new Set();
    this._random = typeof options.random === 'function' ? options.random : Math.random.bind(Math);
    this._now = typeof options.now === 'function' ? options.now : () => Date.now();
    this._clockMs = Number.isFinite(Number(options.initialNowMs))
      ? Math.floor(Number(options.initialNowMs))
      : this._now();

    // --- Fase F6: Catábase das Avós & Sanguessugas do Acheron (Wrinklers) ---
    const rawCatabase = snapshot.catabase ?? snapshot.milestones?.f6Catabase ?? {};
    this.catabase = normalizeCatabaseState(rawCatabase, this.#catabaseNormalizeOpts());
    const explicitCatabaseActive = Boolean(
      snapshot.catabaseActive ?? snapshot.milestones?.catabaseActive ?? false,
    );
    if (explicitCatabaseActive && this.catabase.stage < 1) {
      this.catabase.stage = 1;
    }
    this.catabaseActive = effectiveCatabaseStage(this.catabase, this._clockMs) >= 1;
    this.leechesPopped = Math.max(
      this.catabase.leechesPopped || 0,
      Number.parseInt(snapshot.leechesPopped ?? snapshot.stats?.leechesPopped, 10) || 0,
    );
    this.shinyLeechesPopped = Math.max(
      this.catabase.shinyLeechesPopped || 0,
      Number.parseInt(snapshot.shinyLeechesPopped ?? snapshot.stats?.shinyLeechesPopped, 10) || 0,
    );
    this.catabase.leechesPopped = this.leechesPopped;
    this.catabase.shinyLeechesPopped = this.shinyLeechesPopped;

    // --- Fase F2: Eco do Acheron (Shimmers & Buffs Ativos) ---
    this.shimmersClicked = Math.max(
      0,
      Number.parseInt(snapshot.shimmersClicked ?? snapshot.stats?.shimmersClicked, 10) || 0,
    );
    this.shimmersMissed = Math.max(
      0,
      Number.parseInt(snapshot.shimmersMissed ?? snapshot.stats?.shimmersMissed, 10) || 0,
    );
    this.wrathClicked = Math.max(
      0,
      Number.parseInt(snapshot.wrathClicked ?? snapshot.stats?.wrathClicked, 10) || 0,
    );
    this.shimmer = normalizeShimmerInstance(snapshot.shimmer, {
      catabaseActive: this.catabaseActive,
      nowMs: this._clockMs,
    });
    this.activeBuffs = normalizeActiveBuffs(
      snapshot.activeBuffs ?? snapshot.active_buffs,
      {
        catabaseActive: this.catabaseActive,
        nowMs: this._clockMs,
      },
    );
    this._shimmerSpawnRange = options.shimmerSpawnRange || null;
    this._nextShimmerInSec = Number.isFinite(Number(snapshot.nextShimmerInSec)) && Number(snapshot.nextShimmerInSec) > 0
      ? Number(snapshot.nextShimmerInSec)
      : rollNextShimmerDelaySec(this._random, this._shimmerSpawnRange || {});

    // --- Fase F5: Néctar do Lethe, Níveis de Gerador e 4 Minigames ---
    const rawNectarMeta = snapshot.nectarMeta ?? snapshot.milestones?.f5Nectar ?? {};
    this.nectar = Math.max(
      0,
      Math.floor(Number(snapshot.nectar ?? rawNectarMeta.nectar) || 0),
    );
    this.totalNectarHarvested = Math.max(
      this.nectar,
      Math.floor(Number(snapshot.totalNectarHarvested ?? rawNectarMeta.totalNectarHarvested) || 0),
    );
    this.generatorLevels = normalizeGeneratorLevels(
      snapshot.generatorLevels ?? snapshot.generator_levels ?? rawNectarMeta.generatorLevels,
    );
    this.nectarCycleStartedAt = Number.isFinite(Number(snapshot.nectarCycleStartedAt ?? rawNectarMeta.nectarCycleStartedAt))
      && Number(snapshot.nectarCycleStartedAt ?? rawNectarMeta.nectarCycleStartedAt) > 0
      ? Math.floor(Number(snapshot.nectarCycleStartedAt ?? rawNectarMeta.nectarCycleStartedAt))
      : null;
    this.nectarCurrentVariant = String(
      snapshot.nectarCurrentVariant ?? rawNectarMeta.nectarCurrentVariant ?? 'nectar_normal',
    );
    this.nectarFrenzyUsedThisRun = Boolean(
      snapshot.nectarFrenzyUsedThisRun ?? rawNectarMeta.nectarFrenzyUsedThisRun ?? false,
    );

    const rawMinigames = snapshot.minigames ?? snapshot.milestones?.f5Minigames ?? {};
    this.minigames = {
      pantheon: normalizePantheonState(rawMinigames.pantheon, this._clockMs),
      grimoire: normalizeGrimoireState(rawMinigames.grimoire, {
        towerQty: qtyMap.styx_tower || 0,
        towerLevel: this.generatorLevels.styx_tower || 0,
      }),
      garden: normalizeGardenState(rawMinigames.garden, {
        houndLevel: this.generatorLevels.cerberian_hound || 0,
      }),
      market: normalizeMarketState(rawMinigames.market, {
        generators: qtyMap,
        throneLevel: this.generatorLevels.obsidian_throne || 0,
      }),
    };

    // --- Fase F4: Conquistas e Véu do Acheron (Milk + Filhotes do Cérbero) ---
    this.achievements = uniqueKnown(
      snapshot.achievements ?? snapshot.unlockedAchievements ?? snapshot.conquistas ?? [],
      isKnownAchievementId,
    );

    // --- Fase F8: Dragão Ctoniano, 4 Estações do Submundo, Fortunas de Hermes e Venda ---
    const rawDragon = snapshot.dragon ?? snapshot.milestones?.f8Dragon ?? {};
    this.dragon = normalizeDragonState(rawDragon, { upgrades: this.upgrades });
    const rawSeasons = snapshot.seasons ?? snapshot.milestones?.f8Seasons ?? {};
    this.seasons = normalizeSeasonState(rawSeasons, {
      upgrades: this.upgrades,
      nowMs: this._clockMs,
    });
    const rawFortunes = snapshot.fortunes ?? snapshot.milestones?.f8Fortunes ?? {};
    this.fortunes = normalizeFortuneState(rawFortunes, { upgrades: this.upgrades });
    this.generatorsSold = Math.max(
      0,
      Number.parseInt(snapshot.generatorsSold ?? snapshot.stats?.generatorsSold, 10) || 0,
    );

    this.#syncNectarUnlockAndCycles();
    this.#refreshMilestones();
    this.#syncAchievements({ invalidate: false });
    this.unlockLogs();
  }

  subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  costMult(generatorId = null) {
    const effects = economyEffects(this.talents, this.verdictPurchases);
    let mult = effects.generatorCostMult;
    const totalOwned = Object.values(this.quantities()).reduce((sum, n) => sum + (Number(n) || 0), 0);
    if (totalOwned === 0 && cmp(effects.firstGeneratorCostMult, '1') !== 0) {
      mult = mul(mult, effects.firstGeneratorCostMult);
    }
    return generatorCostMultForId(generatorId, {
      baseCostMult: mult,
      upgrades: this.upgrades,
      seasons: this.seasons,
    });
  }

  upgradeCost(upgradeOrId) {
    const up = typeof upgradeOrId === 'string' ? getUpgrade(upgradeOrId) : upgradeOrId;
    if (!up) return money('0');
    return upgradeEffectiveCost(up, {
      upgrades: this.upgrades,
      seasons: this.seasons,
      talents: this.talents,
    });
  }

  sellRefundRate() {
    return dragonModifiers(this.dragon).sellRefundRate;
  }

  quantities() {
    return this.generators.quantities();
  }

  /** Contagem negativo por gerador (persistido como shinyCounts / shiny_counts). */
  shinyCounts() {
    return { ...this._shinyCounts };
  }

  /** Alias semântico de shinyCounts (negativo). */
  negativoCounts() {
    return this.shinyCounts();
  }

  /** Contagem gold por gerador (0 ≤ gold ≤ qty − negativo). */
  goldCounts() {
    return { ...this._goldCounts };
  }

  isFreeShopping() {
    return Boolean(this.debugFlags?.freeShopping);
  }

  isForceShiny() {
    return Boolean(this.debugFlags?.forceShiny);
  }

  isForceGold() {
    return Boolean(this.debugFlags?.forceGold);
  }

  setDebugFlag(flag, value) {
    if (flag !== 'freeShopping' && flag !== 'forceShiny' && flag !== 'forceGold') {
      return this.debugFlags;
    }
    this.debugFlags = {
      ...this.debugFlags,
      [flag]: Boolean(value),
    };
    this.#bump();
    return this.debugFlags;
  }

  /**
   * Patch local só para Estela do Mestre (não vai sozinho ao Submundo).
   * @param {{ mnemosyne?: string, clearLeeches?: boolean }} patch
   */
  debugLocalPatch(patch = {}) {
    if (patch.mnemosyne != null) {
      this.mnemosyne = clampNonNegative(patch.mnemosyne);
    }
    if (patch.clearLeeches) {
      this.catabase = normalizeCatabaseState(
        { ...this.catabase, leeches: [] },
        this.#catabaseNormalizeOpts(),
      );
      this.#syncCatabaseFlags();
    }
    this.invalidateEconomyCache();
    this.unlockLogs();
    this.#bump();
    return { ok: true, mnemosyne: this.mnemosyne, leeches: this.catabase?.leeches?.length || 0 };
  }

  clearDebugFlags() {
    this.debugFlags = { freeShopping: false, forceShiny: false, forceGold: false };
    this.#bump();
    return this.debugFlags;
  }

  /**
   * First unlock do Lethe (Fase C / C1). Persistido em milestones (sync/Estela).
   * @returns {boolean} true se acabou de marcar (primeira vez)
   */
  markLetheSeen() {
    if (this.milestones?.letheSeen) return false;
    this.milestones = { ...this.milestones, letheSeen: true };
    this.unlockLogs();
    this.#bumpSyncEpoch();
    this.#bump();
    return true;
  }

  /**
   * Define negativo absoluto na linha (0 ≤ n ≤ qty − gold). Debug / admin.
   * @param {string} id
   * @param {number} count
   */
  setShinyCount(id, count) {
    if (!GENERATOR_BY_ID[id]) return { ok: false, shiny: 0 };
    const qty = Math.max(0, Math.floor(Number(this.quantities()[id]) || 0));
    const gold = Math.max(0, Math.floor(Number(this._goldCounts[id]) || 0));
    const room = Math.max(0, qty - gold);
    let n = Math.floor(Number(count) || 0);
    if (!Number.isFinite(n) || n < 0) n = 0;
    if (n > room) n = room;
    if (n <= 0) {
      delete this._shinyCounts[id];
    } else {
      this._shinyCounts[id] = n;
    }
    this.#clampRarityCounts();
    this.invalidateEconomyCache();
    this.#bumpSyncEpoch();
    this.#bump();
    return { ok: true, shiny: n, qty };
  }

  /**
   * Define gold absoluto na linha (0 ≤ n ≤ qty − negativo). Debug / admin.
   * @param {string} id
   * @param {number} count
   */
  setGoldCount(id, count) {
    if (!GENERATOR_BY_ID[id]) return { ok: false, gold: 0 };
    const qty = Math.max(0, Math.floor(Number(this.quantities()[id]) || 0));
    let n = Math.floor(Number(count) || 0);
    if (!Number.isFinite(n) || n < 0) n = 0;
    if (n > qty) n = qty;
    if (n <= 0) {
      delete this._goldCounts[id];
    } else {
      this._goldCounts[id];
      this._goldCounts[id] = n;
    }
    // Gold tem prioridade: se estourou, corta negativo.
    this.#clampRarityCounts();
    this.invalidateEconomyCache();
    this.#bumpSyncEpoch();
    this.#bump();
    const gold = Number(this._goldCounts[id] || 0);
    return { ok: true, gold, qty };
  }

  /** Invalida o cache de SPS/clickPower quando geradores, upgrades, talentos ou raridades mudam (Perf-3). */
  invalidateEconomyCache() {
    this.structureVersion += 1;
    this._cachedSps = null;
    this._cachedSpsVersion = -1;
    this._cachedEffectiveSps = null;
    this._cachedEffectiveSpsVersion = -1;
    this._cachedClickPower = null;
    this._cachedClickVersion = -1;
  }

  /**
   * Retorna o SPS bruto (`rawSPS`) antes do dreno das Sanguessugas,
   * mas incluindo as pesquisas do Arquivo Estígio e a penalidade ×0.95 da Aliança Eterna.
   */
  rawSps() {
    if (this._cachedSps !== null && this._cachedSpsVersion === this.structureVersion) {
      return this._cachedSps;
    }
    const val = calculateRawSPS({
      generators: this.quantities(),
      upgrades: this.upgrades,
      talents: this.talents,
      obols: this.obols,
      verdictPurchases: this.verdictPurchases,
      shinyCounts: this._shinyCounts,
      goldCounts: this._goldCounts,
      activeBuffs: this.activeBuffs,
      nowMs: this._clockMs,
      generatorLevels: this.generatorLevels,
      nectar: this.nectar,
      minigames: this.minigames,
      achievements: this.achievements,
      catabase: this.catabase,
      dragon: this.dragon,
      seasons: this.seasons,
      milestones: this.milestones,
    });
    this._cachedSps = val;
    this._cachedSpsVersion = this.structureVersion;
    return val;
  }

  sps() {
    return this.rawSps();
  }

  spsBreakdown() {
    return calculateSpsBreakdown({
      generators: this.quantities(),
      upgrades: this.upgrades,
      talents: this.talents,
      obols: this.obols,
      verdictPurchases: this.verdictPurchases,
      shinyCounts: this._shinyCounts,
      goldCounts: this._goldCounts,
      activeBuffs: this.activeBuffs,
      nowMs: this._clockMs,
      generatorLevels: this.generatorLevels,
      nectar: this.nectar,
      minigames: this.minigames,
      achievements: this.achievements,
      catabase: this.catabase,
      dragon: this.dragon,
      seasons: this.seasons,
      milestones: this.milestones,
    });
  }

  /**
   * Retorna o SPS aparente (`effectiveSPS`) creditado diretamente na carteira após o dreno
   * de −5% por Sanguessuga ativa (`rawSPS × (1 - leechesCount × 0.05)`).
   */
  effectiveSps() {
    if (this._cachedEffectiveSps !== null && this._cachedEffectiveSpsVersion === this.structureVersion) {
      return this._cachedEffectiveSps;
    }
    const val = calculateEffectiveSPS({
      rawSps: this.rawSps(),
      leeches: this.catabase?.leeches || [],
    });
    this._cachedEffectiveSps = val;
    this._cachedEffectiveSpsVersion = this.structureVersion;
    return val;
  }

  clickPower() {
    if (this._cachedClickPower !== null && this._cachedClickVersion === this.structureVersion) {
      return this._cachedClickPower;
    }
    const val = formulaClickPower({
      generators: this.quantities(),
      upgrades: this.upgrades,
      talents: this.talents,
      obols: this.obols,
      sps: this.sps(),
      verdictPurchases: this.verdictPurchases,
      activeBuffs: this.activeBuffs,
      nowMs: this._clockMs,
      generatorLevels: this.generatorLevels,
      nectar: this.nectar,
      minigames: this.minigames,
      achievements: this.achievements,
      catabase: this.catabase,
      dragon: this.dragon,
      seasons: this.seasons,
    });
    this._cachedClickPower = val;
    this._cachedClickVersion = this.structureVersion;
    return val;
  }

  // ---------------------------------------------------------------------------
  // Fase F4: Véu do Acheron (Milk) & Filhotes do Cérbero (Kitten Upgrades)
  // ---------------------------------------------------------------------------

  normalAchievementsCount() {
    return countNormalAchievements(this.achievements);
  }

  veilFraction() {
    return formulaVeilFraction(this.achievements);
  }

  veilPercent() {
    return formulaVeilPercent(this.achievements);
  }

  veilTier() {
    return formulaVeilTier(this.achievements);
  }

  cerberusPupMult() {
    return formulaCerberusPupMult(this.upgrades, this.achievements, null, this.dragon, this.talents);
  }

  /**
   * Desbloqueia uma conquista localmente e invalida o cache de SPS imediatamente
   * caso a conquista seja nova (Fase F4 / Fase Perf).
   */
  unlockAchievement(id) {
    const key = String(id || '');
    if (!isKnownAchievementId(key)) {
      return { ok: false, reason: 'unknown_achievement' };
    }
    if (this.achievements.includes(key)) {
      return {
        ok: true,
        added: false,
        veilPercent: this.veilPercent(),
        veilFraction: this.veilFraction(),
      };
    }
    this.achievements = [...this.achievements, key];
    this.invalidateEconomyCache();
    this.unlockLogs();
    this.#bumpSyncEpoch();
    this.#bump();
    return {
      ok: true,
      added: true,
      isNormal: isNormalAchievementId(key),
      veilPercent: this.veilPercent(),
      veilFraction: this.veilFraction(),
    };
  }

  /**
   * Desbloqueia um lote de conquistas e invalida o cache de SPS imediatamente se houver novas.
   */
  unlockAchievements(ids = []) {
    const known = uniqueKnown(ids, isKnownAchievementId);
    const cur = new Set(this.achievements);
    const added = [];
    for (const id of known) {
      if (!cur.has(id)) {
        cur.add(id);
        added.push(id);
      }
    }
    if (added.length > 0) {
      this.achievements = [...cur];
      this.invalidateEconomyCache();
      this.unlockLogs();
      this.#bumpSyncEpoch();
      this.#bump();
    }
    return {
      ok: true,
      added,
      veilPercent: this.veilPercent(),
      veilFraction: this.veilFraction(),
    };
  }

  /**
   * Substitui o conjunto de conquistas desbloqueadas e invalida o cache se mudou.
   */
  setAchievements(ids = []) {
    const next = uniqueKnown(ids, isKnownAchievementId);
    const prevSig = this.achievements.join('\0');
    const nextSig = next.join('\0');
    if (prevSig !== nextSig) {
      this.achievements = next;
      this.invalidateEconomyCache();
      this.unlockLogs();
      this.#bumpSyncEpoch();
      this.#bump();
    }
    return {
      ok: true,
      veilPercent: this.veilPercent(),
      veilFraction: this.veilFraction(),
    };
  }

  #hasVeilMultUpgrade() {
    return this.upgrades.some((uid) => {
      const u = getUpgrade(uid);
      return u?.kind === 'veilMult' || u?.kind === 'kittenMult';
    });
  }

  #syncAchievements({ invalidate = true } = {}) {
    const despertarSet = new Set(DESPERTAR_ACHIEVEMENT_IDS);
    const platform = this.achievements.filter((id) => !despertarSet.has(id));
    // Reavalia do zero: remove órfãs (ex. despertar_catabase com prestigeCount 0 pós-ZERAR)
    // e adiciona as elegíveis ao estado atual.
    const eligible = evaluateDespertarAchievementIds(this, []);
    const next = uniqueKnown([...platform, ...eligible], isKnownAchievementId);
    const prevSig = this.achievements.join('\0');
    const nextSig = next.join('\0');
    if (prevSig === nextSig) return false;
    this.achievements = next;
    if (invalidate) {
      this.invalidateEconomyCache();
    }
    return true;
  }

  /** Retorna o relógio interno atual (ms) usado para buffs e shimmers. */
  nowMs() {
    return this._clockMs;
  }

  // ---------------------------------------------------------------------------
  // Fase F6: Catábase das Avós (Grandmapocalypse) & Sanguessugas do Acheron (Wrinklers)
  // ---------------------------------------------------------------------------

  #catabaseTalentFx() {
    const fx = talentEffects(this.talents);
    return {
      leechCapBonus: Math.max(0, Math.floor(Number(fx.leechCapBonus) || 0)),
      leechSpawnMult: String(fx.leechSpawnMult ?? '1'),
      leechPayoutMult: String(fx.leechPayoutMult ?? '1'),
      researchDurationMult: String(fx.researchDurationMult ?? '1'),
      leechDigestVisible: Boolean(fx.leechDigestVisible),
    };
  }

  #catabaseNormalizeOpts() {
    const fx = this.#catabaseTalentFx();
    return {
      upgrades: this.upgrades,
      nowMs: this._clockMs,
      leechCapBonus: fx.leechCapBonus,
      researchDurationMult: fx.researchDurationMult,
    };
  }

  catabaseStage() {
    return effectiveCatabaseStage(this.catabase, this._clockMs);
  }

  structuralCatabaseStage() {
    return Math.max(0, Math.min(3, Math.floor(Number(this.catabase?.stage) || 0)));
  }

  isElderPledgeActive() {
    return isCatabasePledgeActive(this.catabase, this._clockMs);
  }

  isElderCovenantActive() {
    return Boolean(this.catabase?.covenantActive);
  }

  pledgeCost() {
    return calculatePledgeCost(this.catabase?.pledgesCount || 0);
  }

  maxLeeches() {
    const { leechCapBonus } = this.#catabaseTalentFx();
    return maxLeechCapacity(this.upgrades, { leechCapBonus });
  }

  leeches() {
    return [...(this.catabase?.leeches || [])];
  }

  leechSummary() {
    const { leechPayoutMult } = this.#catabaseTalentFx();
    return summarizeLeeches(this.catabase?.leeches || [], this.upgrades, { leechPayoutMult });
  }

  leechDigestVisible() {
    return this.#catabaseTalentFx().leechDigestVisible;
  }

  leechDrainInfo() {
    return calculateLeechDrain(this.catabase?.leeches?.length || 0);
  }

  /**
   * Define manualmente o estágio da Catábase (0..3) e sincroniza `catabaseActive`.
   */
  setCatabaseStage(stage = 0) {
    const nextStage = Math.max(0, Math.min(3, Math.floor(Number(stage) || 0)));
    this.catabase = normalizeCatabaseState(
      { ...this.catabase, stage: nextStage },
      this.#catabaseNormalizeOpts(),
    );
    this.#syncCatabaseFlags();
    this.invalidateEconomyCache();
    this.#syncAchievements({ invalidate: false });
    this.unlockLogs();
    this.#bumpSyncEpoch();
    this.#bump();
    return this.catabaseStage();
  }

  /** Ativa/desativa a flag de Catábase (F6) — controla elegibilidade de Ecos Coléricos (Wrath). */
  setCatabaseActive(active = true) {
    const next = Boolean(active);
    if (next && this.catabase.stage < 1) {
      this.catabase = normalizeCatabaseState(
        { ...this.catabase, stage: 1, covenantActive: false, pledgeExpiresAt: null },
        this.#catabaseNormalizeOpts(),
      );
    } else if (!next) {
      this.catabase = normalizeCatabaseState(
        { ...this.catabase, stage: 0, leeches: [] },
        this.#catabaseNormalizeOpts(),
      );
    }
    this.catabaseActive = next;
    if (next) {
      this.milestones = { ...this.milestones, catabaseActive: true };
    } else if (this.milestones?.catabaseActive) {
      const copy = { ...this.milestones };
      delete copy.catabaseActive;
      this.milestones = copy;
      this.activeBuffs = normalizeActiveBuffs(this.activeBuffs, {
        catabaseActive: false,
        nowMs: this._clockMs,
      });
      if (this.shimmer?.variant === 'wrath') {
        this.shimmer = null;
      }
    }
    this.invalidateEconomyCache();
    this.#bump();
    return this.catabaseActive;
  }

  #syncCatabaseFlags() {
    const effStage = effectiveCatabaseStage(this.catabase, this._clockMs);
    const active = effStage >= 1;
    this.catabaseActive = active;
    if (active) {
      this.milestones = { ...this.milestones, catabaseActive: true };
    } else if (this.milestones?.catabaseActive) {
      const copy = { ...this.milestones };
      delete copy.catabaseActive;
      this.milestones = copy;
      this.activeBuffs = normalizeActiveBuffs(this.activeBuffs, {
        catabaseActive: false,
        nowMs: this._clockMs,
      });
      if (this.shimmer?.variant === 'wrath') {
        this.shimmer = null;
      }
    }
    this.leechesPopped = Math.max(this.leechesPopped || 0, this.catabase?.leechesPopped || 0);
    this.shinyLeechesPopped = Math.max(this.shinyLeechesPopped || 0, this.catabase?.shinyLeechesPopped || 0);
    this.catabase.leechesPopped = this.leechesPopped;
    this.catabase.shinyLeechesPopped = this.shinyLeechesPopped;
  }

  /**
   * Spawna uma Sanguessuga do Acheron ao redor da Foice.
   */
  spawnLeech(opts = {}) {
    if (opts.nowMs != null && Number.isFinite(Number(opts.nowMs))) {
      this._clockMs = Math.floor(Number(opts.nowMs));
    }
    const fx = this.#catabaseTalentFx();
    const res = domainSpawnLeech(this.catabase, {
      upgrades: this.upgrades,
      nowMs: this._clockMs,
      shiny: opts.shiny ?? null,
      slot: opts.slot ?? null,
      random: typeof opts.random === 'function' ? opts.random : this._random,
      leechCapBonus: fx.leechCapBonus,
      researchDurationMult: fx.researchDurationMult,
    });
    if (!res.ok) return res;
    this.catabase = res.state;
    this.#syncCatabaseFlags();
    this.invalidateEconomyCache();
    this.unlockLogs();
    this.#bumpSyncEpoch();
    this.#bump();
    return res;
  }

  /**
   * Estoura (*pop*) uma Sanguessuga do Acheron ao redor da Foice e credita `digested × 1.1` (`×3.3` se Shiny).
   */
  popLeech(targetIndexOrId = 0, opts = {}) {
    if (opts.nowMs != null && Number.isFinite(Number(opts.nowMs))) {
      this._clockMs = Math.floor(Number(opts.nowMs));
    }
    const fx = this.#catabaseTalentFx();
    const res = domainPopLeech(this.catabase, targetIndexOrId, {
      upgrades: this.upgrades,
      nowMs: this._clockMs,
      clicksRequired: opts.clicksRequired ?? null,
      leechCapBonus: fx.leechCapBonus,
      leechPayoutMult: fx.leechPayoutMult,
      researchDurationMult: fx.researchDurationMult,
    });
    if (!res.ok) return res;
    this.catabase = res.state;
    this.#syncCatabaseFlags();
    if (res.popped && cmp(res.payout || '0', '0') > 0) {
      this.#credit(res.payout);
    }
    if (res.popped) {
      const dropRes = rollSeasonalDropUnlock(this.seasons, {
        trigger: 'leech',
        nowMs: this._clockMs,
      });
      this.seasons = dropRes.state;
      res.unlockedSeasonalDropId = dropRes.unlockedDropId;
    }
    this.#syncAchievements({ invalidate: false });
    this.invalidateEconomyCache();
    this.unlockLogs();
    this.#bumpSyncEpoch();
    this.#bump();
    return res;
  }

  /**
   * Estoura todas as Sanguessugas ativas de uma vez.
   */
  popAllLeeches(opts = {}) {
    if (opts.nowMs != null && Number.isFinite(Number(opts.nowMs))) {
      this._clockMs = Math.floor(Number(opts.nowMs));
    }
    const fx = this.#catabaseTalentFx();
    const res = domainPopAllLeeches(this.catabase, {
      upgrades: this.upgrades,
      nowMs: this._clockMs,
      leechCapBonus: fx.leechCapBonus,
      leechPayoutMult: fx.leechPayoutMult,
      researchDurationMult: fx.researchDurationMult,
    });
    this.catabase = res.state;
    this.#syncCatabaseFlags();
    if (cmp(res.totalPayout || '0', '0') > 0) {
      this.#credit(res.totalPayout);
    }
    this.#syncAchievements({ invalidate: false });
    this.invalidateEconomyCache();
    this.unlockLogs();
    this.#bumpSyncEpoch();
    this.#bump();
    return res;
  }

  /**
   * Ativa o Juramento de Trégua (*Elder Pledge*): suspende a Catábase por 30 min e estoura todas as Sanguessugas.
   */
  activateElderPledge(opts = {}) {
    if (opts.nowMs != null && Number.isFinite(Number(opts.nowMs))) {
      this._clockMs = Math.floor(Number(opts.nowMs));
    }
    const free = this.isFreeShopping() || Boolean(opts.free);
    const fx = this.#catabaseTalentFx();
    const res = domainActivateElderPledge(this.catabase, {
      souls: this.souls,
      upgrades: this.upgrades,
      nowMs: this._clockMs,
      free,
      leechCapBonus: fx.leechCapBonus,
      leechPayoutMult: fx.leechPayoutMult,
      researchDurationMult: fx.researchDurationMult,
    });
    if (!res.ok) return res;
    if (!free && cmp(res.cost || '0', '0') > 0) {
      this.#spendSouls(res.cost);
    }
    if (cmp(res.totalPayout || '0', '0') > 0) {
      this.#credit(res.totalPayout);
    }
    this.catabase = res.state;
    this.#syncCatabaseFlags();
    this.#syncAchievements({ invalidate: false });
    this.invalidateEconomyCache();
    this.unlockLogs();
    this.#bumpSyncEpoch();
    this.#bump();
    return res;
  }

  /**
   * Ativa ou revoga a Aliança Eterna (*Elder Covenant*, −5% SPS global).
   */
  setElderCovenant(active = true, opts = {}) {
    if (opts.nowMs != null && Number.isFinite(Number(opts.nowMs))) {
      this._clockMs = Math.floor(Number(opts.nowMs));
    }
    const fx = this.#catabaseTalentFx();
    const res = domainSetElderCovenant(this.catabase, active, {
      upgrades: this.upgrades,
      nowMs: this._clockMs,
      leechCapBonus: fx.leechCapBonus,
      leechPayoutMult: fx.leechPayoutMult,
      researchDurationMult: fx.researchDurationMult,
    });
    if (!res.ok) return res;
    if (cmp(res.totalPayout || '0', '0') > 0) {
      this.#credit(res.totalPayout);
    }
    this.catabase = res.state;
    this.#syncCatabaseFlags();
    this.#syncAchievements({ invalidate: false });
    this.invalidateEconomyCache();
    this.unlockLogs();
    this.#bumpSyncEpoch();
    this.#bump();
    return res;
  }

  /**
   * Avança ou conclui imediatamente o timer de pesquisa do Arquivo Estígio.
   */
  advanceCatabaseResearch(seconds = 1800) {
    const dt = Math.max(0, Number(seconds) || 0);
    const fx = this.#catabaseTalentFx();
    const stepped = stepCatabaseTick(this.catabase, {
      dtSeconds: dt,
      rawSps: '0',
      upgrades: this.upgrades,
      nowMs: this._clockMs,
      random: () => 1, // sem spawn de Sanguessuga durante avanço puro de pesquisa
      leechCapBonus: fx.leechCapBonus,
      leechSpawnMult: fx.leechSpawnMult,
      researchDurationMult: fx.researchDurationMult,
    });
    this.catabase = stepped.state;
    this.#syncCatabaseFlags();
    this.#bumpSyncEpoch();
    this.#bump();
    return {
      ok: true,
      completedId: stepped.researchCompletedId,
      unlockedResearchIds: [...this.catabase.unlockedResearchIds],
      researchTargetId: this.catabase.researchTargetId,
      researchRemainingSec: this.catabase.researchRemainingSec,
    };
  }

  /**
   * Debug Estela — Arquivo Estígio / Catábase canônica (sem passar 30 min reais).
   * @param {'fund'|'finishResearch'|'buyNext'|'completeChain'|'pledge'|'covenant'} action
   */
  debugArquivoEstigio(action = 'fund') {
    const act = String(action || 'fund');

    if (act === 'pledge') {
      return this.activateElderPledge({ free: true });
    }
    if (act === 'covenant') {
      const on = !this.isElderCovenantActive?.();
      return this.setElderCovenant(on);
    }

    if (act === 'fund' || act === 'completeChain') {
      const qty = { ...this.quantities() };
      qty.charon_servants = Math.max(7, Math.floor(Number(qty.charon_servants) || 0));
      this.generators.applyQuantities(qty);

      const chainIds = [
        'concilio_das_moiras',
        ...CATABASE_RESEARCH_CHAIN.map((step) => step.upgradeId),
      ];
      const grantIds = act === 'completeChain'
        ? chainIds
        : ['concilio_das_moiras'];
      let nextUp = [...this.upgrades];
      for (const id of grantIds) {
        if (!nextUp.includes(id)) nextUp.push(id);
      }
      this.upgrades = nextUp;
      this.catabase = normalizeCatabaseState(
        {
          ...this.catabase,
          stage: act === 'completeChain' ? 3 : this.catabase.stage,
          covenantActive: false,
          pledgeExpiresAt: null,
        },
        this.#catabaseNormalizeOpts(),
      );
      this.#syncCatabaseFlags();
      this.invalidateEconomyCache();
      this.unlockLogs();
      this.#bumpSyncEpoch();
      this.#bump();
      return {
        ok: true,
        action: act,
        stage: this.catabaseStage?.() ?? this.catabase.stage,
        researchTargetId: this.catabase.researchTargetId,
        researchRemainingSec: this.catabase.researchRemainingSec,
        upgradesGranted: grantIds,
      };
    }

    if (act === 'finishResearch') {
      if (!this.upgrades.includes('concilio_das_moiras')) {
        this.debugArquivoEstigio('fund');
      }
      const res = this.advanceCatabaseResearch(1e7);
      return { ...res, action: 'finishResearch' };
    }

    if (act === 'buyNext') {
      if (!this.upgrades.includes('concilio_das_moiras')) {
        this.debugArquivoEstigio('fund');
      }
      // Zera o timer da tese atual (libera compra) e compra a primeira desbloqueada faltante.
      this.advanceCatabaseResearch(1e7);
      const unlocked = Array.isArray(this.catabase.unlockedResearchIds)
        ? this.catabase.unlockedResearchIds
        : [];
      const toBuy = unlocked.find((id) => !this.upgrades.includes(id))
        || CATABASE_RESEARCH_CHAIN.map((s) => s.upgradeId).find((id) => !this.upgrades.includes(id));
      if (!toBuy) {
        return {
          ok: false,
          reason: 'chain_complete',
          action: 'buyNext',
          stage: this.catabaseStage?.() ?? this.catabase.stage,
        };
      }
      const prevFree = Boolean(this.debugFlags?.freeShopping);
      if (!this.debugFlags) this.debugFlags = {};
      this.debugFlags.freeShopping = true;
      const bought = this.buyUpgrade(toBuy);
      this.debugFlags.freeShopping = prevFree;
      return {
        ok: Boolean(bought?.ok),
        action: 'buyNext',
        upgradeId: toBuy,
        stage: this.catabaseStage?.() ?? this.catabase.stage,
        researchTargetId: this.catabase.researchTargetId,
        researchRemainingSec: this.catabase.researchRemainingSec,
      };
    }

    return { ok: false, reason: 'unknown_action', action: act };
  }

  /**
   * Spawna um Eco do Acheron no Santuário (máximo 1 ativo por vez).
   * @param {{ nowMs?: number, effectId?: string, variant?: 'golden'|'wrath'|null, lifetimeSec?: number, force?: boolean, x?: number, y?: number, random?: () => number }} [opts]
   */
  spawnShimmer(opts = {}) {
    if (opts.nowMs != null && Number.isFinite(Number(opts.nowMs))) {
      this._clockMs = Math.floor(Number(opts.nowMs));
    }
    if (this.shimmer && !opts.force) {
      return { ok: false, reason: 'already_active', shimmer: this.shimmer };
    }
    if (opts.effectId) {
      const def = getShimmerEffect(opts.effectId);
      if (!def) {
        return { ok: false, reason: 'unknown_effect', shimmer: null };
      }
      if (def.requiresCatabase && !this.catabaseActive) {
        return { ok: false, reason: 'requires_catabase', shimmer: null };
      }
    }
    if (opts.variant === 'wrath' && !this.catabaseActive) {
      return { ok: false, reason: 'requires_catabase', shimmer: null };
    }

    this.shimmer = createShimmerInstance({
      nowMs: this._clockMs,
      catabaseActive: this.catabaseActive,
      catabaseStage: this.catabaseStage(),
      dragonflightActive: dragonModifiers(this.dragon).dragonflightActive,
      effectId: opts.effectId,
      variant: opts.variant || null,
      lifetimeSec: opts.lifetimeSec,
      random: typeof opts.random === 'function' ? opts.random : this._random,
      x: opts.x,
      y: opts.y,
    });
    this.invalidateEconomyCache();
    this.#bump();
    return { ok: true, shimmer: this.shimmer };
  }

  /**
   * Clica no Eco do Acheron ativo e aplica a recompensa/buff correspondente.
   * @param {{ nowMs?: number, random?: () => number }} [opts]
   */
  clickShimmer(opts = {}) {
    if (opts.nowMs != null && Number.isFinite(Number(opts.nowMs))) {
      this._clockMs = Math.floor(Number(opts.nowMs));
    }
    if (!this.shimmer) {
      return { ok: false, reason: 'no_shimmer' };
    }
    const luckMult = seasonModifiers(this.seasons, this.upgrades).shimmerRateMult;
    if (this._clockMs >= Number(this.shimmer.expiresAt)) {
      this.shimmer = null;
      this.shimmersMissed += 1;
      this._nextShimmerInSec = rollNextShimmerDelaySec(this._random, {
        ...(this._shimmerSpawnRange || {}),
        luckMult,
      });
      this.invalidateEconomyCache();
      this.#bump();
      return { ok: false, reason: 'expired' };
    }

    const activeShimmer = this.shimmer;
    const currentSps = this.sps();
    const resolved = resolveShimmerClickEffect({
      shimmer: activeShimmer,
      souls: this.souls,
      sps: currentSps,
      generators: this.quantities(),
      activeBuffs: this.activeBuffs,
      nowMs: this._clockMs,
      random: typeof opts.random === 'function' ? opts.random : this._random,
    });
    if (!resolved.ok) {
      return resolved;
    }

    this.shimmer = null;
    this._nextShimmerInSec = rollNextShimmerDelaySec(this._random, {
      ...(this._shimmerSpawnRange || {}),
      luckMult,
    });
    this.shimmersClicked += 1;
    if (resolved.variant === 'wrath') {
      this.wrathClicked += 1;
    }
    this.milestones = { ...this.milestones, shimmerClicked: true };
    const dropRes = rollSeasonalDropUnlock(this.seasons, {
      trigger: 'shimmer',
      nowMs: this._clockMs,
    });
    this.seasons = dropRes.state;

    if (cmp(resolved.gained || '0', '0') > 0) {
      this.#credit(resolved.gained);
    }
    if (Number(resolved.verdictsGained) > 0) {
      this.verdicts += Math.floor(Number(resolved.verdictsGained));
    }
    if (resolved.buffChanged) {
      this.activeBuffs = resolved.nextBuffs;
    }

    this.invalidateEconomyCache();
    this.unlockLogs();
    this.#bumpSyncEpoch();
    this.#bump();

    return {
      ok: true,
      shimmer: activeShimmer,
      effectId: resolved.effectId,
      effectName: resolved.effectName,
      kind: resolved.kind,
      variant: resolved.variant,
      gained: resolved.gained,
      verdictsGained: resolved.verdictsGained,
      buff: resolved.buff,
      unlockedSeasonalDropId: dropRes.unlockedDropId,
    };
  }

  prestigePreview() {
    return formulaPrestigePreview(this.runSouls, this.prestigeCount, this.talents, this.upgrades);
  }

  canPrestige() {
    return canPrestigeRun(this.runSouls, this.prestigeCount, this.upgrades);
  }

  generatorUpgradeMult(id) {
    return generatorUpgradeMult(id, this.upgrades, this.quantities());
  }

  tick(dtSeconds, opts = {}) {
    const dt = Number(dtSeconds);
    if (!Number.isFinite(dt) || dt <= 0) {
      return { gained: '0' };
    }
    this.sessionSeconds += dt;
    if (opts.nowMs != null && Number.isFinite(Number(opts.nowMs))) {
      this._clockMs = Math.floor(Number(opts.nowMs));
    } else {
      this._clockMs += Math.round(dt * 1000);
    }

    // 1. Poda buffs expirados ANTES de calcular SPS do tick (invalida cache se algum expirou)
    const pruned = pruneExpiredBuffs(this.activeBuffs, this._clockMs);
    if (pruned.changed) {
      this.activeBuffs = pruned.nextBuffs;
      this.invalidateEconomyCache();
    }

    // 2. Expiração ou spawn do Eco do Acheron
    if (this.shimmer) {
      if (this._clockMs >= Number(this.shimmer.expiresAt)) {
        this.shimmer = null;
        this.shimmersMissed += 1;
        this._nextShimmerInSec = rollNextShimmerDelaySec(this._random, this._shimmerSpawnRange || {});
        this.invalidateEconomyCache();
      }
    } else {
      this._nextShimmerInSec -= dt;
      if (this._nextShimmerInSec <= 0) {
        this.shimmer = createShimmerInstance({
          nowMs: this._clockMs,
          catabaseActive: this.catabaseActive,
          catabaseStage: this.catabaseStage(),
          random: this._random,
        });
        this.invalidateEconomyCache();
      }
    }

    // 3. Fase F5: Ciclo de 24h do Néctar + regeneração passiva do Grimório
    this.#syncNectarUnlockAndCycles();
    const towerLv = Number(this.generatorLevels?.styx_tower || 0);
    if (towerLv >= 1) {
      this.minigames.grimoire = tickGrimoireMana(this.minigames.grimoire, dt, {
        towerQty: this.quantities().styx_tower || 0,
        towerLevel: towerLv,
      });
    }

    // 4. Fase F6: Pesquisa do Arquivo Estígio, dreno e digestão paralela das Sanguessugas
    const rawSpsVal = this.rawSps();
    const prevLeechCount = this.catabase?.leeches?.length || 0;
    const catFx = this.#catabaseTalentFx();
    const catStepped = stepCatabaseTick(this.catabase, {
      dtSeconds: dt,
      rawSps: rawSpsVal,
      upgrades: this.upgrades,
      nowMs: this._clockMs,
      random: this._random,
      leechCapBonus: catFx.leechCapBonus,
      leechSpawnMult: catFx.leechSpawnMult,
      researchDurationMult: catFx.researchDurationMult,
    });
    this.catabase = catStepped.state;
    if (
      catStepped.pledgeExpired
      || Boolean(catStepped.spawnedLeech)
      || (this.catabase.leeches?.length || 0) !== prevLeechCount
    ) {
      this.#syncCatabaseFlags();
      this.invalidateEconomyCache();
    }

    const gained = mul(this.effectiveSps(), String(dt));
    this.#credit(gained);
    this.#attributeGeneratorLifetime(gained);
    this.#syncNectarUnlockAndCycles();
    this.#syncAchievements({ invalidate: this.#hasVeilMultUpgrade() });
    this.unlockLogs();
    this.#bump();
    return { gained, expiredBuffs: pruned.expiredIds };
  }

  /** Almas lifetime creditadas a um gerador (tooltip do Mercado). */
  generatorLifetime(id) {
    return money(this.generatorLifetimeSouls?.[id] || '0');
  }

  /**
   * Reparte o ganho do tick pelas linhas ativas (proporção das linhas-base).
   * Mults globais cancelam na razão — só o peso relativo importa.
   */
  #attributeGeneratorLifetime(gained) {
    if (cmp(gained, '0') <= 0) return;
    const qty = this.quantities();
    const shadeFlat = thousandBladesBonusPerUnit(this.upgrades, qty, this.talents);
    const servantFlat = elderPactServantFlatBonusPerUnit(this.upgrades, qty);
    const lines = {};
    let total = '0';
    for (const def of GENERATORS) {
      const n = Number(qty[def.id] || 0);
      if (!Number.isFinite(n) || n <= 0) continue;
      let flatUnitBonus = '0';
      if (def.id === 'wandering_shade') flatUnitBonus = shadeFlat;
      else if (def.id === 'charon_servants') flatUnitBonus = servantFlat;
      const line = lineSPS({
        qty: n,
        shiny: Number(this._shinyCounts?.[def.id] || 0),
        gold: Number(this._goldCounts?.[def.id] || 0),
        baseRate: def.baseRate,
        upgradeMult: this.generatorUpgradeMult(def.id),
        flatUnitBonus,
        level: Number(this.generatorLevels?.[def.id] || 0),
      });
      if (cmp(line, '0') <= 0) continue;
      lines[def.id] = line;
      total = add(total, line);
    }
    if (cmp(total, '0') <= 0) return;
    if (!this.generatorLifetimeSouls || typeof this.generatorLifetimeSouls !== 'object') {
      this.generatorLifetimeSouls = {};
    }
    for (const [id, line] of Object.entries(lines)) {
      const share = mul(gained, div(line, total));
      if (cmp(share, '0') <= 0) continue;
      this.generatorLifetimeSouls[id] = money(add(this.generatorLifetimeSouls[id] || '0', share));
    }
  }

  // ---------------------------------------------------------------------------
  // Fase F5: Néctar do Lethe, Níveis de Gerador e 4 Minigames Temáticos
  // ---------------------------------------------------------------------------

  isNectarUnlocked() {
    return isNectarUnlocked({
      lifetimeSouls: this.lifetimeSouls,
      nectar: this.nectar,
      totalNectarHarvested: this.totalNectarHarvested,
      generatorLevels: this.generatorLevels,
      milestones: this.milestones,
    });
  }

  nectarStatus(nowMs = this._clockMs) {
    return describeNectarCycle({
      cycleStartedAt: this.nectarCycleStartedAt,
      nowMs,
      variantId: this.nectarCurrentVariant,
      unlocked: this.isNectarUnlocked(),
    });
  }

  generatorLevel(id) {
    return Math.max(0, Math.floor(Number(this.generatorLevels?.[id]) || 0));
  }

  unlockedMinigames() {
    return unlockedMinigames(this.generatorLevels);
  }

  #syncNectarUnlockAndCycles() {
    const unlocked = this.isNectarUnlocked();
    if (!unlocked) return false;
    if (!this.milestones?.nectarUnlocked) {
      this.milestones = { ...this.milestones, nectarUnlocked: true };
    }
    const adv = advanceNectarCycles({
      unlocked: true,
      cycleStartedAt: this.nectarCycleStartedAt,
      currentVariant: this.nectarCurrentVariant,
      nowMs: this._clockMs,
      catabaseActive: this.catabaseActive,
      random: this._random,
    });
    this.nectarCycleStartedAt = adv.nextCycleStartedAt;
    this.nectarCurrentVariant = adv.nextVariant;
    if (adv.harvestedCount > 0) {
      this.nectar += adv.harvestedCount;
      this.totalNectarHarvested += adv.harvestedCount;
      this.milestones = { ...this.milestones, nectarHarvested: true };
      if (adv.triggeredBuffId) {
        const res = activateOrRenewBuff(this.activeBuffs, { id: adv.triggeredBuffId }, this._clockMs);
        this.activeBuffs = res.nextBuffs;
      }
      if (adv.refilledCooldowns) {
        this.minigames.pantheon = {
          ...this.minigames.pantheon,
          swaps: 3,
          lastSwapAt: null,
        };
      }
      this.invalidateEconomyCache();
      return true;
    }
    return false;
  }

  /**
   * Colheita manual de Néctar (maduro 20h com 50% de chance; maduro completo 23h com 100%).
   */
  harvestNectar(opts = {}) {
    if (opts.nowMs != null && Number.isFinite(Number(opts.nowMs))) {
      this._clockMs = Math.floor(Number(opts.nowMs));
    }
    this.#syncNectarUnlockAndCycles();
    const res = attemptManualNectarHarvest({
      unlocked: this.isNectarUnlocked(),
      cycleStartedAt: this.nectarCycleStartedAt,
      currentVariant: this.nectarCurrentVariant,
      nowMs: this._clockMs,
      catabaseActive: this.catabaseActive,
      random: typeof opts.random === 'function' ? opts.random : this._random,
    });
    if (!res.ok) return res;

    this.nectarCycleStartedAt = res.nextCycleStartedAt;
    this.nectarCurrentVariant = res.nextVariant;
    if (res.gained > 0) {
      this.nectar += res.gained;
      this.totalNectarHarvested += res.gained;
      this.milestones = { ...this.milestones, nectarHarvested: true };
    }
    if (res.triggeredBuffId) {
      const bRes = activateOrRenewBuff(this.activeBuffs, { id: res.triggeredBuffId }, this._clockMs);
      this.activeBuffs = bRes.nextBuffs;
    }
    if (res.refilledCooldowns) {
      this.minigames.pantheon = {
        ...this.minigames.pantheon,
        swaps: 3,
        lastSwapAt: null,
      };
    }

    this.invalidateEconomyCache();
    this.unlockLogs();
    this.#bumpSyncEpoch();
    this.#bump();
    return {
      ...res,
      nectar: this.nectar,
      totalNectarHarvested: this.totalNectarHarvested,
    };
  }

  /**
   * Eleva o nível de um gerador gastando `level + 1` Néctares (+1% SPS da linha por nível).
   */
  levelUpGenerator(id) {
    if (!GENERATOR_BY_ID[id]) return { ok: false, reason: 'unknown_generator' };
    const currentLv = this.generatorLevel(id);
    if (currentLv >= NECTAR_CONFIG.maxGeneratorLevel) {
      return { ok: false, reason: 'max_level', level: currentLv };
    }
    const cost = nextGeneratorLevelCost(currentLv);
    const free = this.isFreeShopping();
    if (!free && this.nectar < cost) {
      return { ok: false, reason: 'insufficient_nectar', cost, level: currentLv };
    }
    if (!free) {
      this.nectar = Math.max(0, this.nectar - cost);
    }
    const nextLv = currentLv + 1;
    this.generatorLevels = {
      ...this.generatorLevels,
      [id]: nextLv,
    };

    // Re-normaliza os minigames caso o gerador elevado seja um dos 4 geradores-chave
    const qtyMap = this.quantities();
    if (id === MINIGAME_UNLOCK_GENERATORS.grimoire) {
      this.minigames.grimoire = normalizeGrimoireState(this.minigames.grimoire, {
        towerQty: qtyMap.styx_tower || 0,
        towerLevel: nextLv,
      });
    } else if (id === MINIGAME_UNLOCK_GENERATORS.garden) {
      this.minigames.garden = normalizeGardenState(this.minigames.garden, {
        houndLevel: nextLv,
      });
    } else if (id === MINIGAME_UNLOCK_GENERATORS.market) {
      this.minigames.market = normalizeMarketState(this.minigames.market, {
        generators: qtyMap,
        throneLevel: nextLv,
      });
    }

    this.#refreshMilestones();
    this.invalidateEconomyCache();
    this.unlockLogs();
    this.#bumpSyncEpoch();
    this.#bump();
    return {
      ok: true,
      generatorId: id,
      level: nextLv,
      cost: free ? 0 : cost,
      nectar: this.nectar,
    };
  }

  /**
   * Ativa o Frenesi de Néctar (Sugar Frenzy): gasta 1 Néctar (1× por ascensão) para ×3 SPS por 1h.
   */
  activateNectarFrenzy(opts = {}) {
    if (opts.nowMs != null && Number.isFinite(Number(opts.nowMs))) {
      this._clockMs = Math.floor(Number(opts.nowMs));
    }
    if (this.nectarFrenzyUsedThisRun) {
      return { ok: false, reason: 'already_used_this_run' };
    }
    const free = this.isFreeShopping();
    const cost = NECTAR_CONFIG.frenzyCost;
    if (!free && this.nectar < cost) {
      return { ok: false, reason: 'insufficient_nectar', cost };
    }
    if (!free) {
      this.nectar = Math.max(0, this.nectar - cost);
    }
    this.nectarFrenzyUsedThisRun = true;
    const { nextBuffs, activated } = activateOrRenewBuff(
      this.activeBuffs,
      {
        id: 'frenesi_nectar',
        mult: NECTAR_CONFIG.frenzyMult,
        durationSec: NECTAR_CONFIG.frenzyDurationSec,
      },
      this._clockMs,
    );
    this.activeBuffs = nextBuffs;
    this.invalidateEconomyCache();
    this.unlockLogs();
    this.#bumpSyncEpoch();
    this.#bump();
    return { ok: true, buff: activated, nectar: this.nectar };
  }

  /**
   * Panteão Ctoniano (`mnemosyne_temple` Lv.1): aloca ou remove um espírito de um slot.
   */
  assignPantheonSlot(slotId, spiritId = null, opts = {}) {
    if (opts.nowMs != null && Number.isFinite(Number(opts.nowMs))) {
      this._clockMs = Math.floor(Number(opts.nowMs));
    }
    const unlocked = this.generatorLevel(MINIGAME_UNLOCK_GENERATORS.pantheon) >= 1;
    const res = assignPantheonSpirit(this.minigames.pantheon, {
      slotId,
      spiritId,
      nowMs: this._clockMs,
      unlocked,
    });
    if (!res.ok) return res;
    this.minigames = {
      ...this.minigames,
      pantheon: res.state,
    };
    this.invalidateEconomyCache();
    this.#bumpSyncEpoch();
    this.#bump();
    return res;
  }

  /**
   * Grimório de Hécate (`styx_tower` Lv.1): conjura um feitiço gastando Éter.
   */
  castSpell(spellId, opts = {}) {
    if (opts.nowMs != null && Number.isFinite(Number(opts.nowMs))) {
      this._clockMs = Math.floor(Number(opts.nowMs));
    }
    const towerLv = this.generatorLevel(MINIGAME_UNLOCK_GENERATORS.grimoire);
    const towerQty = this.quantities().styx_tower || 0;
    const res = castGrimoireSpell(this.minigames.grimoire, {
      spellId,
      unlocked: towerLv >= 1,
      towerQty,
      towerLevel: towerLv,
      souls: this.souls,
      sps: this.sps(),
      random: typeof opts.random === 'function' ? opts.random : this._random,
      forceBackfire: opts.forceBackfire,
    });
    if (!res.ok) return res;

    this.minigames = {
      ...this.minigames,
      grimoire: res.state,
    };

    if (res.spawnShimmerVariant) {
      if (res.spawnShimmerVariant === 'wrath') {
        this.shimmer = createShimmerInstance({
          nowMs: this._clockMs,
          catabaseActive: true,
          variant: 'wrath',
          effectId: res.spawnShimmerEffectId || 'clot_acheron',
          random: this._random,
        });
      } else {
        this.shimmer = createShimmerInstance({
          nowMs: this._clockMs,
          catabaseActive: this.catabaseActive,
          variant: 'golden',
          effectId: res.spawnShimmerEffectId || 'mare_acheron',
          random: this._random,
        });
      }
    }
    if (res.soulsGain && cmp(res.soulsGain, '0') > 0) {
      this.#credit(res.soulsGain);
    }
    if (res.soulsLoss && cmp(res.soulsLoss, '0') > 0) {
      this.souls = clampNonNegative(sub(this.souls, res.soulsLoss));
    }

    this.invalidateEconomyCache();
    this.unlockLogs();
    this.#bumpSyncEpoch();
    this.#bump();
    return res;
  }

  /**
   * Jardim de Perséfone (`cerberian_hound` Lv.1): planta uma semente num plot.
   */
  plantSeed(plotIndex, seedId) {
    const houndLv = this.generatorLevel(MINIGAME_UNLOCK_GENERATORS.garden);
    const res = plantGardenSeed(this.minigames.garden, {
      plotIndex,
      seedId,
      houndLevel: houndLv,
      unlocked: houndLv >= 1,
      sps: this.sps(),
    });
    if (!res.ok) return res;
    const free = this.isFreeShopping();
    if (!free && !this.#spendSouls(res.cost)) {
      return { ok: false, reason: 'insufficient_souls', cost: res.cost };
    }
    this.minigames = {
      ...this.minigames,
      garden: res.state,
    };
    this.invalidateEconomyCache();
    this.#bumpSyncEpoch();
    this.#bump();
    return res;
  }

  /**
   * Jardim de Perséfone: colhe/limpa um plot.
   */
  harvestPlot(plotIndex) {
    const houndLv = this.generatorLevel(MINIGAME_UNLOCK_GENERATORS.garden);
    const res = harvestGardenPlot(this.minigames.garden, {
      plotIndex,
      houndLevel: houndLv,
      unlocked: houndLv >= 1,
    });
    if (!res.ok) return res;
    this.minigames = {
      ...this.minigames,
      garden: res.state,
    };
    this.invalidateEconomyCache();
    this.#bumpSyncEpoch();
    this.#bump();
    return res;
  }

  /**
   * Jardim de Perséfone: seleciona o tipo de Solo.
   */
  setGardenSoil(soilId) {
    const houndLv = this.generatorLevel(MINIGAME_UNLOCK_GENERATORS.garden);
    const houndQty = this.quantities().cerberian_hound || 0;
    const res = selectGardenSoil(this.minigames.garden, {
      soilId,
      houndQty,
      houndLevel: houndLv,
      unlocked: houndLv >= 1,
    });
    if (!res.ok) return res;
    this.minigames = {
      ...this.minigames,
      garden: res.state,
    };
    this.invalidateEconomyCache();
    this.#bumpSyncEpoch();
    this.#bump();
    return res;
  }

  /**
   * Jardim de Perséfone: avança `ticks` ciclos de maturação.
   */
  tickGarden(ticks = 1) {
    const houndLv = this.generatorLevel(MINIGAME_UNLOCK_GENERATORS.garden);
    if (houndLv < 1) return { ok: false, reason: 'locked' };
    this.minigames = {
      ...this.minigames,
      garden: stepGardenTicks(this.minigames.garden, {
        ticks,
        houndLevel: houndLv,
        unlocked: true,
      }),
    };
    this.invalidateEconomyCache();
    this.#bumpSyncEpoch();
    this.#bump();
    return { ok: true, garden: this.minigames.garden };
  }

  /**
   * Mercado de Caronte (`obsidian_throne` Lv.1): compra ações de um bem.
   */
  buyMarketStock(goodId, quantity = 1) {
    const throneLv = this.generatorLevel(MINIGAME_UNLOCK_GENERATORS.market);
    const res = buyMarketGood(this.minigames.market, {
      goodId,
      quantity,
      generators: this.quantities(),
      throneLevel: throneLv,
      unlocked: throneLv >= 1,
      souls: this.isFreeShopping() ? '999999999999999999999999' : this.souls,
      sps: this.sps(),
    });
    if (!res.ok) return res;
    if (!this.isFreeShopping()) {
      this.#spendSouls(res.cost);
    }
    this.minigames = {
      ...this.minigames,
      market: res.state,
    };
    this.#bumpSyncEpoch();
    this.#bump();
    return res;
  }

  /**
   * Mercado de Caronte: vende ações de um bem e credita a receita em Almas.
   */
  sellMarketStock(goodId, quantity = 1) {
    const throneLv = this.generatorLevel(MINIGAME_UNLOCK_GENERATORS.market);
    const res = sellMarketGood(this.minigames.market, {
      goodId,
      quantity,
      generators: this.quantities(),
      throneLevel: throneLv,
      unlocked: throneLv >= 1,
      sps: this.sps(),
    });
    if (!res.ok) return res;
    if (cmp(res.revenue || '0', '0') > 0) {
      this.#credit(res.revenue);
    }
    this.minigames = {
      ...this.minigames,
      market: res.state,
    };
    this.#bumpSyncEpoch();
    this.#bump();
    return res;
  }

  /**
   * Mercado de Caronte: avança um tick de flutuação de preços.
   */
  tickMarket(opts = {}) {
    const throneLv = this.generatorLevel(MINIGAME_UNLOCK_GENERATORS.market);
    if (throneLv < 1) return { ok: false, reason: 'locked' };
    this.minigames = {
      ...this.minigames,
      market: stepMarketTick(this.minigames.market, {
        generators: this.quantities(),
        throneLevel: throneLv,
        unlocked: true,
        random: typeof opts.random === 'function' ? opts.random : this._random,
      }),
    };
    this.#bump();
    return { ok: true, market: this.minigames.market };
  }

  click() {
    const gained = this.clickPower();
    this.clickCount += 1;
    this.#credit(gained);
    this.#refreshMilestones();
    this.unlockLogs();
    this.#bump();
    return { ok: true, gained };
  }

  /** Crédito bruto — só o harness local de QA (Task 8) deve chamar. */
  grantSouls(amount) {
    this.#credit(amount);
    this.unlockLogs();
    this.#bumpSyncEpoch();
    this.#bump();
    return { ok: true, gained: money(amount), souls: this.souls, runSouls: this.runSouls };
  }

  buyGenerator(id, mode = '1', opts = {}) {
    const entity = this.generators.get(id);
    if (!entity) {
      return { ok: false, bought: 0, cost: money('0'), shinyGained: 0, goldGained: 0 };
    }
    const free = this.isFreeShopping();
    const costMult = this.costMult(id);
    const count = free
      ? resolveBuyCountFree(mode)
      : resolveBuyCount(mode, entity, this.souls, costMult);
    if (count <= 0) {
      return { ok: false, bought: 0, cost: money('0'), shinyGained: 0, goldGained: 0 };
    }

    let bought = 0;
    let cost = money('0');
    if (free) {
      entity.quantity += count;
      bought = count;
      cost = money('0');
    } else {
      const result = entity.buy(count, this.souls, costMult);
      if (!result.ok) {
        return { ok: false, bought: 0, cost: result.cost, shinyGained: 0, goldGained: 0 };
      }
      this.souls = clampNonNegative(result.wallet);
      bought = result.bought;
      cost = result.cost;
    }

    const random = typeof opts.random === 'function' ? opts.random : this._random;
    const forceGold = this.isForceGold() || opts.forceGold === true;
    const forceNeg = this.isForceShiny() || opts.chance === 1;
    const goldChance = Number.isFinite(Number(opts.goldChance))
      ? Number(opts.goldChance)
      : GOLD_CHANCE;
    const negChance = forceNeg
      ? 1
      : (Number.isFinite(Number(opts.chance)) ? Number(opts.chance) : NEGATIVO_CHANCE);

    let shinyGained = 0;
    let goldGained = 0;
    for (let i = 0; i < bought; i += 1) {
      if (forceNeg) {
        shinyGained += 1;
      } else if (forceGold) {
        goldGained += 1;
      } else if (random() < negChance) {
        shinyGained += 1;
      } else if (random() < goldChance) {
        goldGained += 1;
      }
    }

    const qty = Math.max(0, Math.floor(Number(entity.quantity) || 0));
    if (goldGained > 0) {
      const prev = Number(this._goldCounts[id] || 0);
      this._goldCounts[id] = Math.min(qty, prev + goldGained);
    }
    if (shinyGained > 0) {
      const prev = Number(this._shinyCounts[id] || 0);
      const gold = Number(this._goldCounts[id] || 0);
      this._shinyCounts[id] = Math.min(Math.max(0, qty - gold), prev + shinyGained);
    }
    this.#clampRarityCounts();

    const modeKey = String(mode ?? '1').trim().toLowerCase();
    if (modeKey && modeKey !== '1') {
      this.milestones = { ...this.milestones, buyModes: true };
    }

    this.#refreshMilestones();
    this.#syncAchievements({ invalidate: false });
    this.invalidateEconomyCache();
    this.unlockLogs();
    this.#bumpSyncEpoch();
    this.#bump();
    return { ok: true, bought, cost, shinyGained, goldGained };
  }

  /**
   * Fase F8 — Vende `1 | 10 | 100 | max` unidades de um gerador no Mercado,
   * devolvendo 25% do preço de referência (ou 50% com a aura `abalo_do_tartaro`).
   */
  sellGenerator(id, mode = '1') {
    const entity = this.generators.get(id);
    if (!entity || entity.quantity <= 0) {
      return { ok: false, sold: 0, refund: money('0') };
    }
    const raw = String(mode ?? '1').trim().toLowerCase();
    let count = 0;
    if (raw === 'max' || raw === 'máx' || raw === 'maximo' || raw === 'máximo') {
      count = entity.quantity;
    } else {
      const n = Number.parseInt(raw, 10);
      count = Number.isFinite(n) && n > 0 ? Math.min(entity.quantity, n) : 0;
    }
    if (count <= 0) {
      return { ok: false, sold: 0, refund: money('0') };
    }

    const costMult = this.costMult(id);
    const refundRate = this.sellRefundRate();
    const res = entity.sell(count, this.souls, costMult, refundRate);
    if (!res.ok) {
      return { ok: false, sold: 0, refund: money('0') };
    }

    this.souls = clampNonNegative(res.wallet);
    this.generatorsSold += res.sold;
    this.milestones = { ...this.milestones, generatorSold: true };
    this.#clampRarityCounts();
    this.#refreshMilestones();
    this.#syncAchievements({ invalidate: false });
    this.invalidateEconomyCache();
    this.unlockLogs();
    this.#bumpSyncEpoch();
    this.#bump();
    return { ok: true, sold: res.sold, refund: res.refund, refundRate };
  }

  // ---------------------------------------------------------------------------
  // Fase F8: Dragão Ctoniano (Pitão / Ladão), 4 Estações e Fortunas de Hermes
  // ---------------------------------------------------------------------------

  isDragonUnlocked() {
    return domainIsDragonUnlocked(this.talents, this.dragon);
  }

  evolveDragon(opts = {}) {
    const free = this.isFreeShopping() || Boolean(opts.free);
    const res = domainEvolveDragonStage(this.dragon, {
      talents: this.talents,
      souls: this.souls,
      generators: this.quantities(),
      targetGeneratorId: opts.targetGeneratorId || null,
      free,
    });
    if (!res.ok) return res;
    if (!free && cmp(res.soulsCost || '0', '0') > 0) {
      this.#spendSouls(res.soulsCost);
    }
    if (res.sacrificedGeneratorId && res.sacrificedQty > 0) {
      this.generators.applyQuantities(res.nextGenerators);
      this.#clampRarityCounts();
    }
    this.dragon = res.state;
    this.#syncAchievements({ invalidate: false });
    this.invalidateEconomyCache();
    this.unlockLogs();
    this.#bumpSyncEpoch();
    this.#bump();
    return res;
  }

  setDragonAura(slotIndex = 1, auraId = null, opts = {}) {
    const free = this.isFreeShopping() || Boolean(opts.free);
    const res = domainEquipDragonAura(this.dragon, {
      slotIndex,
      auraId,
      generators: this.quantities(),
      free,
    });
    if (!res.ok) return res;
    if (res.sacrificedGeneratorId) {
      this.generators.applyQuantities(res.nextGenerators);
      this.#clampRarityCounts();
    }
    this.dragon = res.state;
    this.invalidateEconomyCache();
    this.unlockLogs();
    this.#bumpSyncEpoch();
    this.#bump();
    return res;
  }

  isSeasonSwitcherUnlocked() {
    return domainIsSeasonSwitcherUnlocked(this.talents);
  }

  seasonSwitchCost() {
    return calculateSeasonSwitchCost(this.seasons?.switchesCount || 0);
  }

  activateSeason(seasonId, opts = {}) {
    if (opts.nowMs != null && Number.isFinite(Number(opts.nowMs))) {
      this._clockMs = Math.floor(Number(opts.nowMs));
    }
    const free = this.isFreeShopping() || Boolean(opts.free);
    const res = domainActivateSeason(this.seasons, {
      seasonId,
      talents: this.talents,
      souls: this.souls,
      nowMs: this._clockMs,
      free,
    });
    if (!res.ok) return res;
    if (!free && cmp(res.cost || '0', '0') > 0) {
      this.#spendSouls(res.cost);
    }
    this.seasons = res.state;
    this.#syncAchievements({ invalidate: false });
    this.invalidateEconomyCache();
    this.unlockLogs();
    this.#bumpSyncEpoch();
    this.#bump();
    return res;
  }

  upgradeSaturnKing(opts = {}) {
    if (opts.nowMs != null && Number.isFinite(Number(opts.nowMs))) {
      this._clockMs = Math.floor(Number(opts.nowMs));
    }
    const free = this.isFreeShopping() || Boolean(opts.free);
    const res = domainUpgradeSaturnKing(this.seasons, {
      souls: this.souls,
      nowMs: this._clockMs,
      free,
    });
    if (!res.ok) return res;
    if (!free && cmp(res.cost || '0', '0') > 0) {
      this.#spendSouls(res.cost);
    }
    this.seasons = res.state;
    this.#syncAchievements({ invalidate: false });
    this.invalidateEconomyCache();
    this.unlockLogs();
    this.#bumpSyncEpoch();
    this.#bump();
    return res;
  }

  catchArtemisDeer(opts = {}) {
    if (opts.nowMs != null && Number.isFinite(Number(opts.nowMs))) {
      this._clockMs = Math.floor(Number(opts.nowMs));
    }
    const res = domainCatchArtemisDeer(this.seasons, {
      sps: this.sps(),
      nowMs: this._clockMs,
    });
    if (!res.ok) return res;
    this.seasons = res.state;
    if (cmp(res.reward || '0', '0') > 0) {
      this.#credit(res.reward);
    }
    this.#syncAchievements({ invalidate: false });
    this.invalidateEconomyCache();
    this.unlockLogs();
    this.#bumpSyncEpoch();
    this.#bump();
    return res;
  }

  unlockSeasonalDrop(dropId = null) {
    if (dropId) {
      const nextDrops = new Set([...(this.seasons.unlockedDrops || []), String(dropId)]);
      this.seasons = normalizeSeasonState({
        ...this.seasons,
        unlockedDrops: [...nextDrops],
      }, { upgrades: this.upgrades, nowMs: this._clockMs });
      this.invalidateEconomyCache();
      this.#bumpSyncEpoch();
      this.#bump();
      return { ok: true, unlockedDropId: String(dropId), state: this.seasons };
    }
    const res = rollSeasonalDropUnlock(this.seasons, { trigger: 'any', nowMs: this._clockMs });
    this.seasons = res.state;
    this.invalidateEconomyCache();
    this.#bumpSyncEpoch();
    this.#bump();
    return { ok: Boolean(res.unlockedDropId), ...res };
  }

  fortuneChance() {
    return fortuneSpawnChance(this.achievements, this.fortunes?.lifetimeClaimedIds || []);
  }

  rollTickerFortune(opts = {}) {
    const res = domainRollTickerFortune(this.fortunes, {
      naturalCycle: opts.naturalCycle !== false,
      achievements: this.achievements,
      random: typeof opts.random === 'function' ? opts.random : this._random,
      forceFortuneId: opts.forceFortuneId || null,
    });
    this.fortunes = res.state;
    if (res.spawned) {
      this.#bump();
    }
    return res;
  }

  claimTickerFortune(fortuneId = null) {
    const res = domainClaimTickerFortune(this.fortunes, {
      fortuneId,
      sps: this.sps(),
    });
    if (!res.ok) return res;
    this.fortunes = res.state;
    if (!res.alreadyClaimed && cmp(res.soulsReward || '0', '0') > 0) {
      this.#credit(res.soulsReward);
    }
    this.#syncAchievements({ invalidate: false });
    this.invalidateEconomyCache();
    this.unlockLogs();
    this.#bumpSyncEpoch();
    this.#bump();
    return res;
  }

  healSave() {
    const healed = healLegacySave(this.toSnapshot());
    this.obols = clampNonNegative(healed.obols);
    this.mnemosyne = clampNonNegative(healed.mnemosyne);
    if (Array.isArray(healed.talents)) {
      this.talents = healed.talents.filter((id) => isKnownTalentId(id));
    }
    this.ascensionOpen = Boolean(healed.ascensionOpen);
    this.milestones = { ...this.milestones, ...healed.milestones, ascensionOpen: this.ascensionOpen };
    this.invalidateEconomyCache();
    this.#bump();
    return healed;
  }

  /**
   * Heal Lethe V2 no cliente: no-op — o servidor aplica via DespertarFormulas.
   * (O export JS applyLetheRebalanceV2ToState nunca existiu em formulas.js e quebrava o grafo ES.)
   * @returns {{ applied: boolean, plan: object }}
   */
  ensureLetheRebalanceV2() {
    return { applied: false, plan: { skipped: true, reason: 'server_owned' } };
  }

  buyUpgrade(id) {
    const upgrade = getUpgrade(id);
    if (!upgrade) return { ok: false, reason: 'missing' };
    if (this.upgrades.includes(id)) return { ok: false, reason: 'already_owned' };
    if (!meetsUpgradeRequirement(upgrade, {
      souls: this.souls,
      generators: this.quantities(),
      upgrades: this.upgrades,
      talents: this.talents,
      achievements: this.achievements,
      veilPercent: this.veilPercent(),
      catabase: this.catabase,
      dragon: this.dragon,
      seasons: this.seasons,
      fortunes: this.fortunes,
    })) {
      return { ok: false, reason: 'requires' };
    }
    const free = this.isFreeShopping();
    const effCost = this.upgradeCost(upgrade);
    if (!free && !this.#spendSouls(effCost)) {
      return { ok: false, reason: 'insufficient_souls', cost: money(effCost) };
    }
    this.upgrades = [...this.upgrades, id];
    this.catabase = normalizeCatabaseState(this.catabase, this.#catabaseNormalizeOpts());
    this.dragon = normalizeDragonState(this.dragon, { upgrades: this.upgrades });
    this.seasons = normalizeSeasonState(this.seasons, {
      upgrades: this.upgrades,
      nowMs: this._clockMs,
    });
    this.fortunes = normalizeFortuneState(this.fortunes, { upgrades: this.upgrades });
    this.#syncCatabaseFlags();
    this.#syncAchievements({ invalidate: false });
    this.invalidateEconomyCache();
    this.unlockLogs();
    this.#bumpSyncEpoch();
    this.#bump();
    return { ok: true, cost: free ? money('0') : money(effCost) };
  }

  buyTalent(id) {
    const talent = getTalent(id);
    if (!talent) return { ok: false };
    if (!this.ascensionOpen) return { ok: false, error: 'ascension_closed' };
    if (this.talents.includes(id)) return { ok: false };
    if (!meetsTalentRequirement(talent, { talents: this.talents })) {
      return { ok: false, error: 'requires' };
    }
    if (cmp(this.mnemosyne, talent.cost) < 0) return { ok: false };
    this.mnemosyne = clampNonNegative(sub(this.mnemosyne, talent.cost));
    this.talents = [...this.talents, id];
    this.invalidateEconomyCache();
    this.unlockLogs();
    this.#bumpSyncEpoch();
    this.#bump();
    return { ok: true, cost: talent.cost };
  }

  /** Atribui juramento permanente (slot Heavenly I–V). */
  setPermanentUpgradeSlot(slotIndex, upgradeId = null) {
    const slots = Number(talentEffects(this.talents).permanentSlot) || 0;
    const idx = Number(slotIndex);
    if (!Number.isFinite(idx) || idx < 0 || idx >= slots) return { ok: false, error: 'slot' };
    const next = normalizePermanentUpgradeIds(this.permanentUpgradeIds);
    if (upgradeId == null || upgradeId === '') {
      next[idx] = null;
    } else {
      const id = String(upgradeId);
      if (!isKnownUpgradeId(id)) return { ok: false, error: 'unknown' };
      const owned = this.upgrades.includes(id);
      const alreadySlotted = next.includes(id);
      if (!owned && !alreadySlotted) return { ok: false, error: 'not_owned' };
      next[idx] = id;
    }
    this.permanentUpgradeIds = next;
    this.#bumpSyncEpoch();
    this.#bump();
    return { ok: true };
  }

  closeAscension() {
    this.ascensionOpen = false;
    this.milestones = { ...this.milestones, ascensionOpen: false };
    this.#bump();
    return { ok: true };
  }

  buyVerdict(id) {
    const item = getVerdictShopItem(id);
    if (!item) return { ok: false };
    if (this.verdictPurchases.includes(id)) return { ok: false };
    const cost = Math.max(0, Number.parseInt(item.cost, 10) || 0);
    if (this.verdicts < cost) return { ok: false };
    this.verdicts = Math.max(0, this.verdicts - cost);
    this.verdictPurchases = [...this.verdictPurchases, id];
    this.invalidateEconomyCache();
    this.unlockLogs();
    this.#bump();
    return { ok: true, cost };
  }

  applyPrestige() {
    if (!this.canPrestige()) return { ok: false };
    this.unlockLogs();
    const preview = this.prestigePreview();
    this.obols = add(this.obols, preview.obolsGain);
    this.mnemosyne = add(this.mnemosyne, preview.mnemosyneGain);
    this.prestigeCount += 1;
    this.ascensionOpen = true;
    this.milestones = { ...this.milestones, ascensionOpen: true };
    this.upgrades = [];
    this.generators.applyQuantities({});
    this._shinyCounts = {};
    this._goldCounts = {};
    this.souls = '0';
    this.runSouls = '0';
    this.clickCount = 0;
    this.shimmer = null;
    this.activeBuffs = {};
    // Fase F5: Néctar, generatorLevels e minigames PERSISTEM entre Catábases; só reseta o Frenesi da corrida.
    this.nectarFrenzyUsedThisRun = false;
    // Fase F6: Lethe limpa a Catábase das Avós e as Sanguessugas ativas da corrida, preservando estatísticas vitalícias.
    this.catabase = normalizeCatabaseState({
      stage: 0,
      covenantActive: false,
      pledgeExpiresAt: null,
      pledgesCount: 0,
      covenantActivations: this.catabase?.covenantActivations || 0,
      leeches: [],
      leechesPopped: this.leechesPopped,
      shinyLeechesPopped: this.shinyLeechesPopped,
      unlockedResearchIds: [],
      researchTargetId: null,
      researchRemainingSec: 0,
    }, { ...this.#catabaseNormalizeOpts(), upgrades: [] });
    this.#syncCatabaseFlags();
    // Fase F8: Lethe reseta estágio do Dragão, Estação ativa e Fortunas da corrida, preservando Fortunas vitalícias.
    this.dragon = normalizeDragonState({ stage: 0, auraSlot1: null, auraSlot2: null, scaleDropped: false });
    this.seasons = normalizeSeasonState({
      activeSeason: null,
      expiresAt: null,
      switchesCount: 0,
      saturnKingLevel: 0,
      deerCaught: this.seasons?.deerCaught || 0,
      unlockedDrops: [],
    }, { upgrades: [], nowMs: this._clockMs });
    this.fortunes = normalizeFortuneState({
      activeFortuneId: null,
      claimedIds: [],
      lifetimeClaimedIds: this.fortunes?.lifetimeClaimedIds || [],
    }, { upgrades: [] });

    const effects = talentEffects(this.talents);
    this.souls = clampNonNegative(effects.startingSouls || '0');
    this.runSouls = normalize(this.souls);
    if (effects.startingGenerators && Object.keys(effects.startingGenerators).length) {
      this.generators.applyQuantities(effects.startingGenerators);
    }
    // Starting gens do Lethe começam sem shiny (Q12 / Q8).
    this._shinyCounts = {};
    this._goldCounts = {};

    const permCount = Number(effects.permanentSlot) || 0;
    const permanent = this.permanentUpgradeIds
      .slice(0, permCount)
      .filter((id) => id && isKnownUpgradeId(id));
    const upgradeSet = new Set(permanent);
    this.upgrades = [...permanent];

    let ecoStyxId = null;
    let ecoStyxIds = [];
    const ecoCount = Number(effects.softPrestigeStyxCount) || 0;
    if (ecoCount > 0) {
      ecoStyxIds = pickEcoDoStyxUpgrades(ecoCount, {
        souls: this.souls,
        generators: this.quantities(),
        upgrades: this.upgrades,
      }).filter((id) => isKnownUpgradeId(id) && !upgradeSet.has(id));
      ecoStyxId = ecoStyxIds[0] || null;
      if (ecoStyxIds.length) {
        this.upgrades = [...this.upgrades, ...ecoStyxIds];
      }
    }

    this.invalidateEconomyCache();
    this.unlockLogs();
    this.#bumpSyncEpoch();
    this.#bump();
    return { ok: true, ...preview, ecoStyxId, ecoStyxIds };
  }

  applyOffline(elapsedSeconds) {
    const result = calculateOfflineProgress({
      elapsedSeconds,
      sps: this.sps(),
      talents: this.talents,
      verdictPurchases: this.verdictPurchases,
    });
    this.lastOfflineSeconds = Math.max(this.lastOfflineSeconds, result.effectiveSeconds);
    // D2: ≥ 1 h creditável → milestones.offline (paciencia / log_offline)
    if (result.effectiveSeconds >= 3600) {
      this.milestones.offline = true;
    }
    if (result.ignored || isZero(result.offlineSouls)) {
      this.unlockLogs();
      if (result.effectiveSeconds >= 3600) this.#bump();
      return { ok: false, ...result };
    }
    this.#credit(result.offlineSouls);
    this.unlockLogs();
    this.#bump();
    return { ok: true, ...result };
  }

  markAmortSeen() {
    if (this.amortSeen) return;
    this.amortSeen = true;
    this.unlockLogs();
    this.#bump();
  }

  markSyncOk() {
    if (this.syncOk) return;
    this.syncOk = true;
    this.unlockLogs();
    this.#bump();
  }

  noteHiddenDuration(seconds) {
    const value = Number(seconds);
    if (!Number.isFinite(value) || value <= 0) return;
    this.maxHiddenSeconds = Math.max(this.maxHiddenSeconds, value);
    this.unlockLogs();
    this.#bump();
  }

  unlockLogs(context = {}) {
    if (context.amortSeen) this.amortSeen = true;
    if (context.syncOk) this.syncOk = true;
    if (Number(context.hiddenSeconds) > 0) {
      this.maxHiddenSeconds = Math.max(this.maxHiddenSeconds, Number(context.hiddenSeconds));
    }
    if (Number(context.offlineSeconds) > 0) {
      this.lastOfflineSeconds = Math.max(this.lastOfflineSeconds, Number(context.offlineSeconds));
    }

    const seen = new Set(this.eduLogsSeen);
    let added = false;
    for (const id of EDU_LOG_IDS) {
      if (seen.has(id) || !this.#logTriggered(id)) continue;
      seen.add(id);
      added = true;
    }
    if (!added) return this.eduLogsSeen;
    this.eduLogsSeen = EDU_LOG_IDS.filter((id) => seen.has(id));
    return this.eduLogsSeen;
  }

  /**
   * Rehydrate a partir do DTO autoritativo do servidor (Task 9 + Fase A / A4).
   * @param {object} snapshot
   * @param {{ mode?: 'replace'|'reconcile', sps?: string|number, elapsedMs?: number, tickToleranceSec?: number }} [options]
   * - `replace` (default): reject / pull / RPCs dedicadas — snapshot vence.
   * - `reconcile`: stateSync ok — merge economia; campos Juízo/talents/óbolos do server.
   */
  applyAuthoritativeState(snapshot = {}, options = {}) {
    if (!snapshot || typeof snapshot !== 'object') return this;
    const mode = options.mode === 'reconcile' ? 'reconcile' : 'replace';

    if (mode === 'replace') {
      this.#replaceFromSnapshot(snapshot);
    } else {
      this.#reconcileFromSnapshot(snapshot, options);
    }

    this.syncOk = true;
    // syncEpoch é client-owned — apply NÃO zera.
    this.ensureLetheRebalanceV2();
    this.invalidateEconomyCache();
    this.#refreshMilestones();
    this.unlockLogs();
    this.#bump();
    return this;
  }

  /** Replace total (reject / boot pull / prestige·talent·verdict server). */
  #replaceFromSnapshot(snapshot) {
    this.souls = clampNonNegative(snapshot.souls ?? this.souls);
    this.obols = clampNonNegative(snapshot.obols ?? this.obols);
    this.mnemosyne = clampNonNegative(snapshot.mnemosyne ?? this.mnemosyne);
    this.lifetimeSouls = clampNonNegative(
      snapshot.lifetimeSouls ?? snapshot.lifetime_souls ?? this.lifetimeSouls,
    );
    this.runSouls = clampNonNegative(snapshot.runSouls ?? snapshot.run_souls ?? this.runSouls);
    if (snapshot.generatorLifetimeSouls != null || snapshot.generator_lifetime_souls != null) {
      this.generatorLifetimeSouls = asLifetimeMoneyMap(
        snapshot.generatorLifetimeSouls ?? snapshot.generator_lifetime_souls,
      );
    }
    // Replace autoritativo: 0 é valor válido (ZERAR/sandbox). Não usar `|| this.prestigeCount`
    // — 0 é falsy e mantinha Catábases antigas, reatribuindo despertar_catabase → anti-cheat no sync.
    if (snapshot.prestigeCount != null || snapshot.prestige_count != null) {
      const parsed = Number.parseInt(snapshot.prestigeCount ?? snapshot.prestige_count, 10);
      this.prestigeCount = Math.max(0, Number.isFinite(parsed) ? parsed : 0);
    }
    this.generators.applyQuantities(
      asQuantities(snapshot.generators ?? snapshot.generators_state),
    );
    if (
      snapshot.shinyCounts != null
      || snapshot.shiny_counts != null
      || snapshot.goldCounts != null
      || snapshot.gold_counts != null
    ) {
      const qtyMap = this.generators.quantities();
      this._goldCounts = asRarityCounts(
        snapshot.goldCounts ?? snapshot.gold_counts ?? this._goldCounts,
        qtyMap,
        {},
      );
      this._shinyCounts = asRarityCounts(
        snapshot.shinyCounts ?? snapshot.shiny_counts ?? this._shinyCounts,
        qtyMap,
        this._goldCounts,
      );
    } else {
      this.#clampRarityCounts();
    }
    {
      const migratedUp = migrateUpgradeSave(
        snapshot.upgrades ?? snapshot.upgrades_state ?? this.upgrades,
        snapshot.souls ?? this.souls,
      );
      this.upgrades = migratedUp.upgrades;
      this.souls = clampNonNegative(migratedUp.souls);
    }
    this.talents = uniqueKnown(
      snapshot.talents ?? snapshot.talents_state ?? this.talents,
      isKnownTalentId,
    );
    if (snapshot.mnemosyne != null) this.mnemosyne = clampNonNegative(snapshot.mnemosyne);
    if (snapshot.milestones != null && typeof snapshot.milestones === 'object') {
      this.milestones = { ...this.milestones, ...snapshot.milestones };
    }
    this.ascensionOpen = Boolean(
      snapshot.ascensionOpen ?? this.milestones?.ascensionOpen ?? this.ascensionOpen,
    );
    this.milestones = { ...this.milestones, ascensionOpen: this.ascensionOpen };
    this.verdictPurchases = uniqueKnown(
      snapshot.verdictPurchases ?? snapshot.verdict_purchases ?? this.verdictPurchases,
      isKnownVerdictPurchase,
    );
    if (snapshot.verdicts != null) {
      this.verdicts = Math.max(0, Number.parseInt(snapshot.verdicts, 10) || 0);
    }
    if (snapshot.juizoBestStreak != null || snapshot.juizo_best_streak != null) {
      this.juizoBestStreak = Math.max(
        0,
        Number.parseInt(snapshot.juizoBestStreak ?? snapshot.juizo_best_streak, 10) || 0,
      );
    }
    if (snapshot.juizoCurrentStreak != null || snapshot.juizo_current_streak != null) {
      this.juizoCurrentStreak = Math.max(
        0,
        Number.parseInt(snapshot.juizoCurrentStreak ?? snapshot.juizo_current_streak, 10) || 0,
      );
    }
    this.eduLogsSeen = uniqueKnown(
      snapshot.eduLogsSeen ?? snapshot.edu_logs_seen ?? this.eduLogsSeen,
      (id) => EDU_LOG_IDS.includes(id),
    );
    this.milestones = {
      ...(snapshot.milestones && typeof snapshot.milestones === 'object'
        ? snapshot.milestones
        : this.milestones),
      ascensionOpen: this.ascensionOpen,
    };
    this.catabaseActive = Boolean(
      snapshot.catabaseActive ?? this.milestones?.catabaseActive ?? this.catabaseActive,
    );
    if (snapshot.shimmersClicked != null || snapshot.stats?.shimmersClicked != null) {
      this.shimmersClicked = Math.max(
        0,
        Number.parseInt(snapshot.shimmersClicked ?? snapshot.stats?.shimmersClicked, 10) || 0,
      );
    }
    if (snapshot.shimmersMissed != null || snapshot.stats?.shimmersMissed != null) {
      this.shimmersMissed = Math.max(
        0,
        Number.parseInt(snapshot.shimmersMissed ?? snapshot.stats?.shimmersMissed, 10) || 0,
      );
    }
    if (snapshot.wrathClicked != null || snapshot.stats?.wrathClicked != null) {
      this.wrathClicked = Math.max(
        0,
        Number.parseInt(snapshot.wrathClicked ?? snapshot.stats?.wrathClicked, 10) || 0,
      );
    }
    if (snapshot.activeBuffs != null || snapshot.active_buffs != null) {
      this.activeBuffs = normalizeActiveBuffs(
        snapshot.activeBuffs ?? snapshot.active_buffs,
        { catabaseActive: this.catabaseActive, nowMs: this._clockMs },
      );
    }
    const f5Meta = snapshot.nectarMeta ?? this.milestones?.f5Nectar ?? {};
    if (snapshot.nectar != null || f5Meta.nectar != null) {
      this.nectar = Math.max(0, Math.floor(Number(snapshot.nectar ?? f5Meta.nectar) || 0));
    }
    if (snapshot.totalNectarHarvested != null || f5Meta.totalNectarHarvested != null) {
      this.totalNectarHarvested = Math.max(
        this.nectar,
        Math.floor(Number(snapshot.totalNectarHarvested ?? f5Meta.totalNectarHarvested) || 0),
      );
    }
    if (snapshot.generatorLevels != null || snapshot.generator_levels != null || f5Meta.generatorLevels != null) {
      this.generatorLevels = normalizeGeneratorLevels(
        snapshot.generatorLevels ?? snapshot.generator_levels ?? f5Meta.generatorLevels,
      );
    }
    if (snapshot.nectarCycleStartedAt != null || f5Meta.nectarCycleStartedAt != null) {
      const cs = Number(snapshot.nectarCycleStartedAt ?? f5Meta.nectarCycleStartedAt);
      this.nectarCycleStartedAt = Number.isFinite(cs) && cs > 0 ? Math.floor(cs) : this.nectarCycleStartedAt;
    }
    if (snapshot.nectarCurrentVariant != null || f5Meta.nectarCurrentVariant != null) {
      this.nectarCurrentVariant = String(snapshot.nectarCurrentVariant ?? f5Meta.nectarCurrentVariant);
    }
    if (snapshot.minigames != null || this.milestones?.f5Minigames != null) {
      const rawMg = snapshot.minigames ?? this.milestones?.f5Minigames ?? {};
      const qtyMap = this.quantities();
      this.minigames = {
        pantheon: normalizePantheonState(rawMg.pantheon ?? this.minigames.pantheon, this._clockMs),
        grimoire: normalizeGrimoireState(rawMg.grimoire ?? this.minigames.grimoire, {
          towerQty: qtyMap.styx_tower || 0,
          towerLevel: this.generatorLevels.styx_tower || 0,
        }),
        garden: normalizeGardenState(rawMg.garden ?? this.minigames.garden, {
          houndLevel: this.generatorLevels.cerberian_hound || 0,
        }),
        market: normalizeMarketState(rawMg.market ?? this.minigames.market, {
          generators: qtyMap,
          throneLevel: this.generatorLevels.obsidian_throne || 0,
        }),
      };
    }
    if (snapshot.catabase != null || this.milestones?.f6Catabase != null) {
      const rawCat = snapshot.catabase ?? this.milestones?.f6Catabase ?? {};
      this.catabase = normalizeCatabaseState(rawCat, this.#catabaseNormalizeOpts());
    }
    if (snapshot.leechesPopped != null || snapshot.stats?.leechesPopped != null) {
      this.leechesPopped = Math.max(
        this.catabase?.leechesPopped || 0,
        Number.parseInt(snapshot.leechesPopped ?? snapshot.stats?.leechesPopped, 10) || 0,
      );
      this.catabase.leechesPopped = this.leechesPopped;
    }
    if (snapshot.shinyLeechesPopped != null || snapshot.stats?.shinyLeechesPopped != null) {
      this.shinyLeechesPopped = Math.max(
        this.catabase?.shinyLeechesPopped || 0,
        Number.parseInt(snapshot.shinyLeechesPopped ?? snapshot.stats?.shinyLeechesPopped, 10) || 0,
      );
      this.catabase.shinyLeechesPopped = this.shinyLeechesPopped;
    }
    this.#syncCatabaseFlags();
    if (snapshot.dragon != null || this.milestones?.f8Dragon != null) {
      this.dragon = normalizeDragonState(
        snapshot.dragon ?? this.milestones?.f8Dragon ?? {},
        { upgrades: this.upgrades },
      );
    }
    if (snapshot.seasons != null || this.milestones?.f8Seasons != null) {
      this.seasons = normalizeSeasonState(
        snapshot.seasons ?? this.milestones?.f8Seasons ?? {},
        { upgrades: this.upgrades, nowMs: this._clockMs },
      );
    }
    if (snapshot.fortunes != null || this.milestones?.f8Fortunes != null) {
      this.fortunes = normalizeFortuneState(
        snapshot.fortunes ?? this.milestones?.f8Fortunes ?? {},
        { upgrades: this.upgrades },
      );
    }
    if (snapshot.generatorsSold != null || snapshot.stats?.generatorsSold != null) {
      this.generatorsSold = Math.max(
        0,
        Number.parseInt(snapshot.generatorsSold ?? snapshot.stats?.generatorsSold, 10) || 0,
      );
    }
    if (snapshot.achievements != null || snapshot.unlockedAchievements != null || snapshot.conquistas != null) {
      this.achievements = uniqueKnown(
        snapshot.achievements ?? snapshot.unlockedAchievements ?? snapshot.conquistas ?? [],
        isKnownAchievementId,
      );
    }
    if (snapshot.lastSyncAt || snapshot.last_sync_at) {
      this.lastSyncAt = snapshot.lastSyncAt ?? snapshot.last_sync_at;
    }
    this.#syncAchievements({ invalidate: false });
  }

  /**
   * Merge pós-stateSync ok (anti-rubberband).
   * Always-server: Juízo, talents, óbolos, essência, prestige, lastSyncAt.
   * Economia: max/união + souls com tolerância de ticks.
   */
  #reconcileFromSnapshot(snapshot, options = {}) {
    // Always-server (A-D1) — óbolos always-server; talentos unem (selo otimista).
    const localMnemosyne = this.mnemosyne;
    const serverPrestigeCount = Math.max(
      0,
      Number.parseInt(snapshot.prestigeCount ?? snapshot.prestige_count, 10) || 0,
    );
    // Catábase local (ex.: flush 429 no Ritual) não pode ser desfeita por max(souls/gens)
    // com a Estela antiga do servidor — senão a corrida "volta" e o toast "pede calma" fica
    // como se o Lethe não tivesse rodado.
    const pendingLocalPrestige = this.prestigeCount > serverPrestigeCount;
    if (snapshot.obols != null && !pendingLocalPrestige) {
      this.obols = clampNonNegative(snapshot.obols);
    }
    if (snapshot.mnemosyne != null && !pendingLocalPrestige) {
      this.mnemosyne = clampNonNegative(snapshot.mnemosyne);
    }
    if (snapshot.prestigeCount != null || snapshot.prestige_count != null) {
      this.prestigeCount = pendingLocalPrestige
        ? Math.max(this.prestigeCount, serverPrestigeCount)
        : serverPrestigeCount;
    }
    if (snapshot.talents != null || snapshot.talents_state != null) {
      const serverTalents = uniqueKnown(
        snapshot.talents ?? snapshot.talents_state,
        isKnownTalentId,
      );
      const localTalents = [...(this.talents || [])];
      const union = uniqueKnown([...serverTalents, ...localTalents], isKnownTalentId);
      const localSet = new Set(localTalents);
      const serverSet = new Set(serverTalents);
      const localOnly = localTalents.filter((id) => !serverSet.has(id));
      const serverOnly = serverTalents.filter((id) => !localSet.has(id));
      const equalSets = localOnly.length === 0 && serverOnly.length === 0;
      this.talents = union;
      if (!pendingLocalPrestige) {
        const serverMne = snapshot.mnemosyne != null
          ? clampNonNegative(snapshot.mnemosyne)
          : localMnemosyne;
        if (equalSets) {
          this.mnemosyne = clampNonNegative(min(localMnemosyne, serverMne));
        } else if (localOnly.length > 0) {
          // Selos só-locais (otimista / offline): preserva essência já gasta.
          this.mnemosyne = clampNonNegative(localMnemosyne);
        } else {
          this.mnemosyne = serverMne;
        }
      }
    }
    if (snapshot.ascensionOpen != null || snapshot.milestones?.ascensionOpen != null) {
      this.ascensionOpen = Boolean(
        snapshot.ascensionOpen ?? snapshot.milestones?.ascensionOpen,
      );
      this.milestones = { ...this.milestones, ascensionOpen: this.ascensionOpen };
    }
    if (snapshot.verdictPurchases != null || snapshot.verdict_purchases != null) {
      this.verdictPurchases = uniqueKnown(
        snapshot.verdictPurchases ?? snapshot.verdict_purchases,
        isKnownVerdictPurchase,
      );
    }
    if (snapshot.verdicts != null) {
      this.verdicts = Math.max(0, Number.parseInt(snapshot.verdicts, 10) || 0);
    }
    if (snapshot.juizoBestStreak != null || snapshot.juizo_best_streak != null) {
      this.juizoBestStreak = Math.max(
        0,
        Number.parseInt(snapshot.juizoBestStreak ?? snapshot.juizo_best_streak, 10) || 0,
      );
    }
    if (snapshot.juizoCurrentStreak != null || snapshot.juizo_current_streak != null) {
      this.juizoCurrentStreak = Math.max(
        0,
        Number.parseInt(snapshot.juizoCurrentStreak ?? snapshot.juizo_current_streak, 10) || 0,
      );
    }
    if (snapshot.lastSyncAt || snapshot.last_sync_at) {
      this.lastSyncAt = snapshot.lastSyncAt ?? snapshot.last_sync_at;
    }

    const serverGens = asQuantities(snapshot.generators ?? snapshot.generators_state);
    const localGens = this.quantities();
    const mergedGens = {};
    if (pendingLocalPrestige) {
      for (const [id, qty] of Object.entries(localGens)) {
        const n = Math.floor(Number(qty) || 0);
        if (n > 0) mergedGens[id] = n;
      }
    } else {
      for (const id of new Set([...Object.keys(localGens), ...Object.keys(serverGens)])) {
        const n = Math.max(
          Math.floor(Number(localGens[id]) || 0),
          Math.floor(Number(serverGens[id]) || 0),
        );
        if (n > 0) mergedGens[id] = n;
      }
    }
    this.generators.applyQuantities(mergedGens);

    const serverUp = uniqueKnown(
      snapshot.upgrades ?? snapshot.upgrades_state ?? [],
      isKnownUpgradeId,
    );
    this.upgrades = pendingLocalPrestige
      ? uniqueKnown([...this.upgrades], isKnownUpgradeId)
      : uniqueKnown([...this.upgrades, ...serverUp], isKnownUpgradeId);

    const serverGold = asRarityCounts(
      snapshot.goldCounts ?? snapshot.gold_counts ?? {},
      mergedGens,
      {},
    );
    const goldMerged = { ...this._goldCounts };
    for (const [id, n] of Object.entries(serverGold)) {
      goldMerged[id] = Math.max(Number(goldMerged[id] || 0), Number(n) || 0);
    }
    this._goldCounts = asRarityCounts(goldMerged, mergedGens, {});

    const serverShiny = asRarityCounts(
      snapshot.shinyCounts ?? snapshot.shiny_counts ?? {},
      mergedGens,
      this._goldCounts,
    );
    const shinyMerged = { ...this._shinyCounts };
    for (const [id, n] of Object.entries(serverShiny)) {
      shinyMerged[id] = Math.max(Number(shinyMerged[id] || 0), Number(n) || 0);
    }
    this._shinyCounts = asRarityCounts(shinyMerged, mergedGens, this._goldCounts);

    if (snapshot.eduLogsSeen != null || snapshot.edu_logs_seen != null) {
      this.eduLogsSeen = uniqueKnown(
        [...this.eduLogsSeen, ...(snapshot.eduLogsSeen ?? snapshot.edu_logs_seen ?? [])],
        (id) => EDU_LOG_IDS.includes(id),
      );
    }
    if (snapshot.milestones && typeof snapshot.milestones === 'object') {
      this.milestones = { ...this.milestones, ...snapshot.milestones };
      if (snapshot.milestones.ascensionOpen != null) {
        this.ascensionOpen = Boolean(snapshot.milestones.ascensionOpen);
      }
    }
    this.milestones = { ...this.milestones, ascensionOpen: Boolean(this.ascensionOpen) };
    this.catabaseActive = Boolean(
      snapshot.catabaseActive ?? this.milestones?.catabaseActive ?? this.catabaseActive,
    );
    if (snapshot.shimmersClicked != null || snapshot.stats?.shimmersClicked != null) {
      this.shimmersClicked = Math.max(
        this.shimmersClicked,
        Number.parseInt(snapshot.shimmersClicked ?? snapshot.stats?.shimmersClicked, 10) || 0,
      );
    }
    if (snapshot.shimmersMissed != null || snapshot.stats?.shimmersMissed != null) {
      this.shimmersMissed = Math.max(
        this.shimmersMissed,
        Number.parseInt(snapshot.shimmersMissed ?? snapshot.stats?.shimmersMissed, 10) || 0,
      );
    }
    if (snapshot.wrathClicked != null || snapshot.stats?.wrathClicked != null) {
      this.wrathClicked = Math.max(
        this.wrathClicked,
        Number.parseInt(snapshot.wrathClicked ?? snapshot.stats?.wrathClicked, 10) || 0,
      );
    }
    if (snapshot.activeBuffs != null || snapshot.active_buffs != null) {
      const mergedBuffs = {
        ...this.activeBuffs,
        ...(snapshot.activeBuffs ?? snapshot.active_buffs ?? {}),
      };
      this.activeBuffs = normalizeActiveBuffs(mergedBuffs, {
        catabaseActive: this.catabaseActive,
        nowMs: this._clockMs,
      });
    }
    const f5Meta = snapshot.nectarMeta ?? this.milestones?.f5Nectar ?? {};
    if (snapshot.nectar != null || f5Meta.nectar != null) {
      this.nectar = Math.max(0, Math.floor(Number(snapshot.nectar ?? f5Meta.nectar) || 0));
    }
    if (snapshot.totalNectarHarvested != null || f5Meta.totalNectarHarvested != null) {
      this.totalNectarHarvested = Math.max(
        this.totalNectarHarvested,
        Math.floor(Number(snapshot.totalNectarHarvested ?? f5Meta.totalNectarHarvested) || 0),
      );
    }
    if (snapshot.generatorLevels != null || snapshot.generator_levels != null || f5Meta.generatorLevels != null) {
      const srvLevels = normalizeGeneratorLevels(
        snapshot.generatorLevels ?? snapshot.generator_levels ?? f5Meta.generatorLevels,
      );
      const mergedLevels = { ...this.generatorLevels };
      for (const [gid, lv] of Object.entries(srvLevels)) {
        mergedLevels[gid] = Math.max(Number(mergedLevels[gid] || 0), Number(lv || 0));
      }
      this.generatorLevels = normalizeGeneratorLevels(mergedLevels);
    }

    if (snapshot.catabase != null || this.milestones?.f6Catabase != null) {
      const rawCat = snapshot.catabase ?? this.milestones?.f6Catabase ?? {};
      this.catabase = normalizeCatabaseState({
        ...this.catabase,
        ...rawCat,
      }, this.#catabaseNormalizeOpts());
    }
    if (snapshot.leechesPopped != null || snapshot.stats?.leechesPopped != null) {
      this.leechesPopped = Math.max(
        this.leechesPopped,
        Number.parseInt(snapshot.leechesPopped ?? snapshot.stats?.leechesPopped, 10) || 0,
      );
      this.catabase.leechesPopped = this.leechesPopped;
    }
    if (snapshot.shinyLeechesPopped != null || snapshot.stats?.shinyLeechesPopped != null) {
      this.shinyLeechesPopped = Math.max(
        this.shinyLeechesPopped,
        Number.parseInt(snapshot.shinyLeechesPopped ?? snapshot.stats?.shinyLeechesPopped, 10) || 0,
      );
      this.catabase.shinyLeechesPopped = this.shinyLeechesPopped;
    }
    this.#syncCatabaseFlags();

    if (snapshot.dragon != null || this.milestones?.f8Dragon != null) {
      const rawDrg = snapshot.dragon ?? this.milestones?.f8Dragon ?? {};
      this.dragon = normalizeDragonState({
        ...this.dragon,
        ...rawDrg,
        stage: Math.max(Number(this.dragon?.stage || 0), Number(rawDrg.stage || 0)),
      }, { upgrades: this.upgrades });
    }
    if (snapshot.seasons != null || this.milestones?.f8Seasons != null) {
      const rawSea = snapshot.seasons ?? this.milestones?.f8Seasons ?? {};
      this.seasons = normalizeSeasonState({
        ...this.seasons,
        ...rawSea,
        saturnKingLevel: Math.max(
          Number(this.seasons?.saturnKingLevel || 0),
          Number(rawSea.saturnKingLevel || 0),
        ),
        unlockedDrops: [
          ...(this.seasons?.unlockedDrops || []),
          ...(Array.isArray(rawSea.unlockedDrops) ? rawSea.unlockedDrops : []),
        ],
      }, { upgrades: this.upgrades, nowMs: this._clockMs });
    }
    if (snapshot.fortunes != null || this.milestones?.f8Fortunes != null) {
      const rawFor = snapshot.fortunes ?? this.milestones?.f8Fortunes ?? {};
      this.fortunes = normalizeFortuneState({
        ...this.fortunes,
        ...rawFor,
        claimedIds: [
          ...(this.fortunes?.claimedIds || []),
          ...(Array.isArray(rawFor.claimedIds) ? rawFor.claimedIds : []),
        ],
        lifetimeClaimedIds: [
          ...(this.fortunes?.lifetimeClaimedIds || []),
          ...(Array.isArray(rawFor.lifetimeClaimedIds) ? rawFor.lifetimeClaimedIds : []),
        ],
      }, { upgrades: this.upgrades });
    }
    if (snapshot.generatorsSold != null || snapshot.stats?.generatorsSold != null) {
      this.generatorsSold = Math.max(
        this.generatorsSold || 0,
        Number.parseInt(snapshot.generatorsSold ?? snapshot.stats?.generatorsSold, 10) || 0,
      );
    }

    if (snapshot.achievements != null || snapshot.unlockedAchievements != null || snapshot.conquistas != null) {
      const srvAch = snapshot.achievements ?? snapshot.unlockedAchievements ?? snapshot.conquistas ?? [];
      this.achievements = uniqueKnown([...this.achievements, ...srvAch], isKnownAchievementId);
    }

    const serverSouls = snapshot.souls != null ? clampNonNegative(snapshot.souls) : null;
    if (serverSouls != null) {
      this.souls = pendingLocalPrestige
        ? this.souls
        : this.#reconcileSouls(this.souls, serverSouls, options);
    }
    if (snapshot.runSouls != null || snapshot.run_souls != null) {
      const serverRun = clampNonNegative(snapshot.runSouls ?? snapshot.run_souls);
      this.runSouls = pendingLocalPrestige ? this.runSouls : max(this.runSouls, serverRun);
    }
    if (snapshot.lifetimeSouls != null || snapshot.lifetime_souls != null) {
      this.lifetimeSouls = max(
        this.lifetimeSouls,
        clampNonNegative(snapshot.lifetimeSouls ?? snapshot.lifetime_souls),
      );
    }
    this.#syncAchievements({ invalidate: false });
  }

  /**
   * A-D2: max(local, server) se o delta local é explicável por ticks; senão server wins.
   */
  #reconcileSouls(localSouls, serverSouls, options = {}) {
    const local = clampNonNegative(localSouls);
    const server = clampNonNegative(serverSouls);
    if (cmp(local, server) <= 0) return server;
    const sps = money(options.sps != null ? options.sps : this.sps());
    const elapsedMs = Number(options.elapsedMs);
    const dtSec = Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs / 1000 : 0;
    const tol = Number.isFinite(Number(options.tickToleranceSec))
      ? Number(options.tickToleranceSec)
      : 2;
    const allowedGain = mul(sps, String(Math.max(0, dtSec + tol)));
    const delta = sub(local, server);
    if (cmp(delta, allowedGain) <= 0) return local;
    return server;
  }

  toSnapshot() {
    const pruned = pruneExpiredBuffs(this.activeBuffs, this._clockMs);
    if (pruned.changed) {
      this.activeBuffs = pruned.nextBuffs;
      this.invalidateEconomyCache();
    }
    return {
      souls: money(this.souls),
      obols: money(this.obols),
      mnemosyne: money(this.mnemosyne),
      lifetimeSouls: money(this.lifetimeSouls),
      runSouls: money(this.runSouls),
      generatorLifetimeSouls: { ...this.generatorLifetimeSouls },
      prestigeCount: this.prestigeCount,
      generators: this.quantities(),
      shinyCounts: this.shinyCounts(),
      goldCounts: this.goldCounts(),
      upgrades: [...this.upgrades],
      talents: [...this.talents],
      permanentUpgradeIds: [...this.permanentUpgradeIds],
      ascensionOpen: Boolean(this.ascensionOpen),
      verdictPurchases: [...this.verdictPurchases],
      verdicts: this.verdicts,
      juizoBestStreak: this.juizoBestStreak,
      juizoCurrentStreak: this.juizoCurrentStreak,
      eduLogsSeen: [...this.eduLogsSeen],
      milestones: { ...this.milestones, ascensionOpen: Boolean(this.ascensionOpen) },
      shimmer: this.shimmer ? { ...this.shimmer } : null,
      activeBuffs: { ...this.activeBuffs },
      shimmersClicked: this.shimmersClicked,
      shimmersMissed: this.shimmersMissed,
      wrathClicked: this.wrathClicked,
      catabaseActive: this.catabaseActive,
      catabase: {
        ...this.catabase,
        leeches: this.catabase.leeches.map((l) => ({ ...l })),
        unlockedResearchIds: [...this.catabase.unlockedResearchIds],
      },
      leechesPopped: this.leechesPopped,
      shinyLeechesPopped: this.shinyLeechesPopped,
      nectar: this.nectar,
      totalNectarHarvested: this.totalNectarHarvested,
      nectarCycleStartedAt: this.nectarCycleStartedAt,
      nectarCurrentVariant: this.nectarCurrentVariant,
      nectarFrenzyUsedThisRun: this.nectarFrenzyUsedThisRun,
      generatorLevels: { ...this.generatorLevels },
      dragon: { ...this.dragon },
      seasons: {
        ...this.seasons,
        unlockedDrops: [...(this.seasons?.unlockedDrops || [])],
      },
      fortunes: {
        ...this.fortunes,
        claimedIds: [...(this.fortunes?.claimedIds || [])],
        lifetimeClaimedIds: [...(this.fortunes?.lifetimeClaimedIds || [])],
      },
      generatorsSold: this.generatorsSold,
      achievements: [...this.achievements],
      veilPercent: this.veilPercent(),
      veilFraction: this.veilFraction(),
      minigames: {
        pantheon: { ...this.minigames.pantheon, slots: { ...this.minigames.pantheon.slots } },
        grimoire: { ...this.minigames.grimoire },
        garden: { ...this.minigames.garden, plots: [...this.minigames.garden.plots] },
        market: { ...this.minigames.market, goods: { ...this.minigames.market.goods } },
      },
      stats: {
        clicks: this.clickCount,
        shimmersClicked: this.shimmersClicked,
        shimmersMissed: this.shimmersMissed,
        wrathClicked: this.wrathClicked,
        leechesPopped: this.leechesPopped,
        shinyLeechesPopped: this.shinyLeechesPopped,
        generatorsSold: this.generatorsSold,
        nectar: this.nectar,
        totalNectarHarvested: this.totalNectarHarvested,
      },
      lastSyncAt: this.lastSyncAt,
      /** Hint de rebase no client (Fase A); server ignora até A3 ecoar. */
      clientEpoch: this.syncEpoch,
      syncEpoch: this.syncEpoch,
      sps: money(this.rawSps()),
      rawSps: money(this.rawSps()),
      effectiveSps: money(this.effectiveSps()),
      prestigePreview: this.prestigePreview(),
    };
  }

  static fromSnapshot(snapshot) {
    return new GameState(snapshot);
  }

  #credit(amount) {
    if (cmp(amount, '0') <= 0) return;
    this.souls = add(this.souls, amount);
    this.runSouls = add(this.runSouls, amount);
    this.lifetimeSouls = add(this.lifetimeSouls, amount);
  }

  #spendSouls(amount) {
    if (cmp(this.souls, amount) < 0) return false;
    this.souls = clampNonNegative(sub(this.souls, amount));
    return true;
  }

  #refreshMilestones() {
    const qty = this.quantities();
    if (qty.phlegethon_forge >= 1) this.milestones.forge = true;
    if (qty.obsidian_throne >= 1) this.milestones.throne = true;
    if (qty.mnemosyne_temple >= 1) this.milestones.temple = true;
    if (qty.styx_tower >= 1) this.milestones.tower = true;
    if (qty.star_barge >= 1) this.milestones.barge = true;
    if (qty.tartarus_lab >= 1) this.milestones.lab = true;
    if (qty.erebus_portal >= 1) this.milestones.portal = true;
    if (qty.chronos_loom >= 1) this.milestones.loom = true;
    if (this.clickCount >= 25) this.milestones.reap = true;
    if (Object.values(qty).some((n) => n >= 1)) this.milestones.buyModes = true;
  }

  /** Garante gold + negativo ≤ qty (gold tem prioridade de slot). */
  #clampRarityCounts() {
    const qty = this.quantities();
    const goldNext = {};
    const shinyNext = {};
    const ids = new Set([
      ...Object.keys(this._goldCounts || {}),
      ...Object.keys(this._shinyCounts || {}),
      ...Object.keys(qty),
    ]);
    for (const id of ids) {
      if (!GENERATOR_BY_ID[id]) continue;
      const cap = Math.max(0, Math.floor(Number(qty[id]) || 0));
      let g = Math.min(cap, Math.max(0, Math.floor(Number(this._goldCounts?.[id]) || 0)));
      let s = Math.min(
        Math.max(0, cap - g),
        Math.max(0, Math.floor(Number(this._shinyCounts?.[id]) || 0)),
      );
      if (g > 0) goldNext[id] = g;
      if (s > 0) shinyNext[id] = s;
    }
    this._goldCounts = goldNext;
    this._shinyCounts = shinyNext;
  }

  /** @deprecated */
  #clampShinyCounts() {
    this.#clampRarityCounts();
  }

  #logTriggered(id) {
    const qty = this.quantities();
    const ownedAny = Object.values(qty).some((n) => n >= 1);
    const ownedFive = Object.values(qty).some((n) => n >= 5);
    switch (id) {
      case 'log_input':
        return this.clickCount >= 1;
      case 'log_state':
        return cmp(this.souls, '10') >= 0 || cmp(this.lifetimeSouls, '10') >= 0;
      case 'log_loop':
        return this.sessionSeconds >= 5;
      case 'log_delta':
        return this.maxHiddenSeconds >= 15;
      case 'log_generator':
        return ownedAny;
      case 'log_curve':
        return ownedFive;
      case 'log_amort':
        return this.amortSeen || (qty.cerberian_hound || 0) >= 1;
      case 'log_upgrade':
        return this.upgrades.length >= 1;
      case 'log_wall':
        return cmp(this.runSouls, LETHE_PREVIEW_RUN_SOULS) >= 0;
      case 'log_lethe_unlock':
        // Espelha isLetheOpen (UI) — sem import circular do renderer.
        return (
          this.prestigeCount >= 1
          || cmp(this.obols, '0') > 0
          || cmp(this.mnemosyne, '0') > 0
          || this.canPrestige()
          || cmp(this.runSouls, LETHE_PREVIEW_RUN_SOULS) >= 0
        );
      case 'log_lethe_ritual':
        return this.canPrestige();
      case 'log_styx_open':
        return ownedAny || cmp(this.souls, STYX_UNLOCK_SOULS) >= 0;
      case 'log_prestige':
        return this.prestigeCount >= 1;
      case 'log_authority':
        return this.syncOk;
      case 'log_offline':
        return this.lastOfflineSeconds > 60;
      case 'log_juizo':
        return this.verdictPurchases.length >= 1;
      case 'log_reap_power':
        return this.clickCount >= 25 || Boolean(this.milestones?.reap);
      case 'log_buy_modes':
        return ownedAny || Boolean(this.milestones?.buyModes);
      case 'log_sealed_juramentos':
        return this.upgrades.length >= 1
          || ownedAny
          || cmp(this.souls, STYX_UNLOCK_SOULS) >= 0;
      case 'log_verdicts_milestone':
        return this.verdicts >= 1 || this.verdictPurchases.length >= 1;
      case 'log_obols_bonus':
        return this.prestigeCount >= 1 || cmp(this.obols, '0') > 0;
      case 'log_synergy_blades': {
        const hasF1Upgrade = this.upgrades.some((uid) => {
          const u = getUpgrade(uid);
          return u?.kind === 'synergyMult'
            || u?.kind === 'thousandBlades'
            || u?.kind === 'thousandBladesMult';
        });
        const pairs15 = Object.values(qty).filter((n) => Number(n) >= 15).length >= 2;
        return hasF1Upgrade || pairs15 || (ownedFive && this.upgrades.length >= 1);
      }
      case 'log_shimmer_echo':
        return (
          this.shimmersClicked >= 1
          || Boolean(this.milestones?.shimmerClicked)
          || Object.keys(this.activeBuffs || {}).length > 0
          || (ownedFive && this.upgrades.length >= 1 && this.prestigeCount >= 1)
        );
      case 'log_midgame_payoff': {
        const hasT7Plus = [
          'mnemosyne_temple',
          'styx_tower',
          'star_barge',
          'tartarus_lab',
          'erebus_portal',
          'chronos_loom',
        ].some((gid) => Number(qty[gid] || 0) >= 1);
        return (
          hasT7Plus
          || Boolean(this.milestones?.temple)
          || cmp(this.lifetimeSouls, '5000000') >= 0
          || (ownedFive && this.upgrades.length >= 1 && this.prestigeCount >= 1)
        );
      }
      case 'log_nectar_minigames': {
        const hasAnyLevel = Object.values(this.generatorLevels || {}).some((lv) => Number(lv) >= 1);
        return (
          this.isNectarUnlocked()
          || hasAnyLevel
          || this.totalNectarHarvested >= 1
          || (ownedFive && this.upgrades.length >= 1 && this.prestigeCount >= 1)
        );
      }
      case 'log_veil_kittens': {
        return (
          this.#hasVeilMultUpgrade()
          || this.veilPercent() >= 12
          || cmp(this.lifetimeSouls, '100') >= 0
          || (ownedFive && this.upgrades.length >= 1)
        );
      }
      case 'log_catabase_wrinklers': {
        return (
          this.structuralCatabaseStage() >= 1
          || (this.catabase?.leeches?.length || 0) >= 1
          || (this.leechesPopped || 0) >= 1
          || this.upgrades.includes('concilio_das_moiras')
          || (Number(qty.charon_servants || 0) >= 7 && this.upgrades.length >= 1)
        );
      }
      case 'log_late_bignum_payoff': {
        const hasT13Plus = [
          'void_condenser',
          'moirai_prism',
          'fate_forge',
          'fractal_engine',
          'oracle_console',
          'chthonic_idleverse',
          'cortex_baker',
          'the_emperor',
        ].some((gid) => Number(qty[gid] || 0) >= 1);
        return (
          hasT13Plus
          || cmp(this.lifetimeSouls, '100000000000000') >= 0
          || (ownedFive && this.upgrades.length >= 1 && this.prestigeCount >= 1)
        );
      }
      case 'log_incremental_architecture_f8': {
        return (
          Number(this.dragon?.stage || 0) >= 1
          || Boolean(this.seasons?.activeSeason)
          || (this.fortunes?.claimedIds?.length || 0) >= 1
          || Boolean(this.milestones?.generatorSold)
          || this.generatorsSold >= 1
          || this.talents.includes('ovo_primordial')
          || this.talents.includes('rodizio_das_estacoes')
          || (ownedFive && this.upgrades.length >= 1 && this.prestigeCount >= 1)
        );
      }
      default:
        return false;
    }
  }

  #bumpSyncEpoch() {
    this.syncEpoch = (Number(this.syncEpoch) || 0) + 1;
  }

  #bump() {
    this.revision += 1;
    for (const listener of this._listeners) {
      try {
        listener(this);
      } catch {
        // listener de UI não pode derrubar a simulação
      }
    }
  }
}
