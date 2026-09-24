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
import { GENERATOR_BY_ID } from '../config/generators.js';
import { isKnownTalentId, getTalent } from '../config/talents.js';
import { isKnownUpgradeId, getUpgrade } from '../config/upgrades.js';
import { getVerdictShopItem, isKnownVerdictPurchase } from '../config/verdict-shop.js';
import {
  add,
  clampNonNegative,
  cmp,
  isZero,
  max,
  money,
  mul,
  normalize,
  sub,
} from './decimal.js';
import { EntitySet } from './EntitySet.js';
import {
  calculateOfflineProgress,
  calculateTotalSPS,
  canPrestige as canPrestigeRun,
  clickPower as formulaClickPower,
  economyEffects,
  generatorUpgradeMult,
  meetsUpgradeRequirement,
  prestigePreview as formulaPrestigePreview,
  talentEffects,
} from './formulas.js';

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
    this.upgrades = uniqueKnown(snapshot.upgrades ?? snapshot.upgrades_state, isKnownUpgradeId);
    this.talents = uniqueKnown(snapshot.talents ?? snapshot.talents_state, isKnownTalentId);
    this.verdictPurchases = uniqueKnown(
      snapshot.verdictPurchases ?? snapshot.verdict_purchases,
      isKnownVerdictPurchase,
    );
    this.verdicts = Math.max(0, Number.parseInt(snapshot.verdicts, 10) || 0);
    this.juizoBestStreak = Math.max(0, Number.parseInt(snapshot.juizoBestStreak ?? snapshot.juizo_best_streak, 10) || 0);
    this.juizoCurrentStreak = Math.max(0, Number.parseInt(snapshot.juizoCurrentStreak ?? snapshot.juizo_current_streak, 10) || 0);
    this.eduLogsSeen = uniqueKnown(snapshot.eduLogsSeen ?? snapshot.edu_logs_seen, (id) => EDU_LOG_IDS.includes(id));
    this.milestones = { ...(snapshot.milestones && typeof snapshot.milestones === 'object' ? snapshot.milestones : {}) };
    this.lastSyncAt = snapshot.lastSyncAt ?? snapshot.last_sync_at ?? null;
    this.sessionSeconds = Number(snapshot.sessionSeconds) || 0;
    this.clickCount = Math.max(0, Number.parseInt(snapshot.clickCount, 10) || 0);
    this.amortSeen = Boolean(snapshot.amortSeen);
    this.syncOk = Boolean(snapshot.syncOk);
    this.maxHiddenSeconds = Number(snapshot.maxHiddenSeconds) || 0;
    this.lastOfflineSeconds = Number(snapshot.lastOfflineSeconds) || 0;
    this.revision = 0;
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
    this.#refreshMilestones();
    this.unlockLogs();
  }

  subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  costMult() {
    const effects = economyEffects(this.talents, this.verdictPurchases);
    let mult = effects.generatorCostMult;
    const totalOwned = Object.values(this.quantities()).reduce((sum, n) => sum + (Number(n) || 0), 0);
    if (totalOwned === 0 && cmp(effects.firstGeneratorCostMult, '1') !== 0) {
      mult = mul(mult, effects.firstGeneratorCostMult);
    }
    return mult;
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
      this._goldCounts[id] = n;
    }
    // Gold tem prioridade: se estourou, corta negativo.
    this.#clampRarityCounts();
    this.#bumpSyncEpoch();
    this.#bump();
    const gold = Number(this._goldCounts[id] || 0);
    return { ok: true, gold, qty };
  }

  sps() {
    return calculateTotalSPS({
      generators: this.quantities(),
      upgrades: this.upgrades,
      talents: this.talents,
      obols: this.obols,
      verdictPurchases: this.verdictPurchases,
      shinyCounts: this._shinyCounts,
      goldCounts: this._goldCounts,
    });
  }

  clickPower() {
    return formulaClickPower({
      generators: this.quantities(),
      upgrades: this.upgrades,
      talents: this.talents,
      obols: this.obols,
      sps: this.sps(),
      verdictPurchases: this.verdictPurchases,
    });
  }

  prestigePreview() {
    return formulaPrestigePreview(this.runSouls);
  }

  canPrestige() {
    return canPrestigeRun(this.runSouls);
  }

  generatorUpgradeMult(id) {
    return generatorUpgradeMult(id, this.upgrades);
  }

  tick(dtSeconds) {
    const dt = Number(dtSeconds);
    if (!Number.isFinite(dt) || dt <= 0) {
      return { gained: '0' };
    }
    this.sessionSeconds += dt;
    const gained = mul(this.sps(), String(dt));
    this.#credit(gained);
    this.unlockLogs();
    this.#bump();
    return { gained };
  }

  click() {
    const gained = this.clickPower();
    this.clickCount += 1;
    this.#credit(gained);
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
    const costMult = this.costMult();
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

    this.#refreshMilestones();
    this.unlockLogs();
    this.#bumpSyncEpoch();
    this.#bump();
    return { ok: true, bought, cost, shinyGained, goldGained };
  }

  buyUpgrade(id) {
    const upgrade = getUpgrade(id);
    if (!upgrade) return { ok: false };
    if (this.upgrades.includes(id)) return { ok: false };
    if (!meetsUpgradeRequirement(upgrade, {
      souls: this.souls,
      generators: this.quantities(),
      upgrades: this.upgrades,
    })) {
      return { ok: false };
    }
    const free = this.isFreeShopping();
    if (!free && !this.#spendSouls(upgrade.cost)) return { ok: false };
    this.upgrades = [...this.upgrades, id];
    this.unlockLogs();
    this.#bumpSyncEpoch();
    this.#bump();
    return { ok: true, cost: free ? money('0') : money(upgrade.cost) };
  }

  buyTalent(id) {
    const talent = getTalent(id);
    if (!talent) return { ok: false };
    if (this.talents.includes(id)) return { ok: false };
    if (cmp(this.mnemosyne, talent.cost) < 0) return { ok: false };
    this.mnemosyne = clampNonNegative(sub(this.mnemosyne, talent.cost));
    this.talents = [...this.talents, id];
    this.unlockLogs();
    this.#bump();
    return { ok: true, cost: talent.cost };
  }

  buyVerdict(id) {
    const item = getVerdictShopItem(id);
    if (!item) return { ok: false };
    if (this.verdictPurchases.includes(id)) return { ok: false };
    const cost = Math.max(0, Number.parseInt(item.cost, 10) || 0);
    if (this.verdicts < cost) return { ok: false };
    this.verdicts = Math.max(0, this.verdicts - cost);
    this.verdictPurchases = [...this.verdictPurchases, id];
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
    this.upgrades = [];
    this.generators.applyQuantities({});
    this._shinyCounts = {};
    this._goldCounts = {};
    this.souls = '0';
    this.runSouls = '0';
    this.clickCount = 0;

    const effects = talentEffects(this.talents);
    this.souls = clampNonNegative(effects.startingSouls || '0');
    this.runSouls = normalize(this.souls);
    if (effects.startingGenerators && Object.keys(effects.startingGenerators).length) {
      this.generators.applyQuantities(effects.startingGenerators);
    }
    // Starting gens do Lethe começam sem shiny (Q12 / Q8).
    this._shinyCounts = {};
    this._goldCounts = {};

    this.unlockLogs();
    this.#bumpSyncEpoch();
    this.#bump();
    return { ok: true, ...preview };
  }

  applyOffline(elapsedSeconds) {
    const result = calculateOfflineProgress({
      elapsedSeconds,
      sps: this.sps(),
      talents: this.talents,
      verdictPurchases: this.verdictPurchases,
    });
    this.lastOfflineSeconds = Math.max(this.lastOfflineSeconds, result.effectiveSeconds);
    if (result.ignored || isZero(result.offlineSouls)) {
      this.unlockLogs();
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
    this.prestigeCount = Math.max(
      0,
      Number.parseInt(snapshot.prestigeCount ?? snapshot.prestige_count, 10) || this.prestigeCount,
    );
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
    this.upgrades = uniqueKnown(
      snapshot.upgrades ?? snapshot.upgrades_state ?? this.upgrades,
      isKnownUpgradeId,
    );
    this.talents = uniqueKnown(
      snapshot.talents ?? snapshot.talents_state ?? this.talents,
      isKnownTalentId,
    );
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
    };
    if (snapshot.lastSyncAt || snapshot.last_sync_at) {
      this.lastSyncAt = snapshot.lastSyncAt ?? snapshot.last_sync_at;
    }
  }

  /**
   * Merge pós-stateSync ok (anti-rubberband).
   * Always-server: Juízo, talents, óbolos, essência, prestige, lastSyncAt.
   * Economia: max/união + souls com tolerância de ticks.
   */
  #reconcileFromSnapshot(snapshot, options = {}) {
    // Always-server (A-D1)
    if (snapshot.obols != null) this.obols = clampNonNegative(snapshot.obols);
    if (snapshot.mnemosyne != null) this.mnemosyne = clampNonNegative(snapshot.mnemosyne);
    if (snapshot.prestigeCount != null || snapshot.prestige_count != null) {
      this.prestigeCount = Math.max(
        0,
        Number.parseInt(snapshot.prestigeCount ?? snapshot.prestige_count, 10) || 0,
      );
    }
    if (snapshot.talents != null || snapshot.talents_state != null) {
      this.talents = uniqueKnown(
        snapshot.talents ?? snapshot.talents_state,
        isKnownTalentId,
      );
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
    for (const id of new Set([...Object.keys(localGens), ...Object.keys(serverGens)])) {
      const n = Math.max(
        Math.floor(Number(localGens[id]) || 0),
        Math.floor(Number(serverGens[id]) || 0),
      );
      if (n > 0) mergedGens[id] = n;
    }
    this.generators.applyQuantities(mergedGens);

    const serverUp = uniqueKnown(
      snapshot.upgrades ?? snapshot.upgrades_state ?? [],
      isKnownUpgradeId,
    );
    this.upgrades = uniqueKnown([...this.upgrades, ...serverUp], isKnownUpgradeId);

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
    }

    const serverSouls = snapshot.souls != null ? clampNonNegative(snapshot.souls) : null;
    if (serverSouls != null) {
      this.souls = this.#reconcileSouls(this.souls, serverSouls, options);
    }
    if (snapshot.runSouls != null || snapshot.run_souls != null) {
      this.runSouls = max(
        this.runSouls,
        clampNonNegative(snapshot.runSouls ?? snapshot.run_souls),
      );
    }
    if (snapshot.lifetimeSouls != null || snapshot.lifetime_souls != null) {
      this.lifetimeSouls = max(
        this.lifetimeSouls,
        clampNonNegative(snapshot.lifetimeSouls ?? snapshot.lifetime_souls),
      );
    }
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
    return {
      souls: money(this.souls),
      obols: money(this.obols),
      mnemosyne: money(this.mnemosyne),
      lifetimeSouls: money(this.lifetimeSouls),
      runSouls: money(this.runSouls),
      prestigeCount: this.prestigeCount,
      generators: this.quantities(),
      shinyCounts: this.shinyCounts(),
      goldCounts: this.goldCounts(),
      upgrades: [...this.upgrades],
      talents: [...this.talents],
      verdictPurchases: [...this.verdictPurchases],
      verdicts: this.verdicts,
      juizoBestStreak: this.juizoBestStreak,
      juizoCurrentStreak: this.juizoCurrentStreak,
      eduLogsSeen: [...this.eduLogsSeen],
      milestones: { ...this.milestones },
      lastSyncAt: this.lastSyncAt,
      /** Hint de rebase no client (Fase A); server ignora até A3 ecoar. */
      clientEpoch: this.syncEpoch,
      syncEpoch: this.syncEpoch,
      sps: money(this.sps()),
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
