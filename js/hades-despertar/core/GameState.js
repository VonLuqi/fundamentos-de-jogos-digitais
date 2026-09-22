/**
 * Estado da corrida de O Despertar.
 * Simulação local; o servidor só julga na Task 9.
 */

import { BUY_MAX_CAP, LETHE_PREVIEW_RUN_SOULS, SHINY_CHANCE } from '../config/constants.js';
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
 * Normaliza shinyCounts: só ids conhecidos; 0 ≤ shiny ≤ qty.
 * @param {unknown} raw
 * @param {Record<string, number>} quantities
 */
function asShinyCounts(raw, quantities = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  for (const [id, val] of Object.entries(raw)) {
    if (!GENERATOR_BY_ID[id]) continue;
    const qty = Math.max(0, Math.floor(Number(quantities[id]) || 0));
    let n = Math.floor(Number(val) || 0);
    if (!Number.isFinite(n) || n <= 0 || qty <= 0) continue;
    if (n > qty) n = qty;
    out[id] = n;
  }
  return out;
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
    this._shinyCounts = asShinyCounts(
      snapshot.shinyCounts ?? snapshot.shiny_counts,
      this.generators.quantities(),
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

  /** Contagem shiny por gerador (0 ≤ shiny ≤ qty). */
  shinyCounts() {
    return { ...this._shinyCounts };
  }

  sps() {
    return calculateTotalSPS({
      generators: this.quantities(),
      upgrades: this.upgrades,
      talents: this.talents,
      obols: this.obols,
      verdictPurchases: this.verdictPurchases,
      shinyCounts: this._shinyCounts,
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
    this.#bump();
    return { ok: true, gained: money(amount), souls: this.souls, runSouls: this.runSouls };
  }

  buyGenerator(id, mode = '1', opts = {}) {
    const entity = this.generators.get(id);
    if (!entity) return { ok: false, bought: 0, cost: money('0'), shinyGained: 0 };
    const costMult = this.costMult();
    const count = resolveBuyCount(mode, entity, this.souls, costMult);
    if (count <= 0) return { ok: false, bought: 0, cost: money('0'), shinyGained: 0 };
    const result = entity.buy(count, this.souls, costMult);
    if (!result.ok) return { ok: false, bought: 0, cost: result.cost, shinyGained: 0 };
    this.souls = clampNonNegative(result.wallet);

    const random = typeof opts.random === 'function' ? opts.random : this._random;
    const chance = Number.isFinite(Number(opts.chance)) ? Number(opts.chance) : SHINY_CHANCE;
    let shinyGained = 0;
    for (let i = 0; i < result.bought; i += 1) {
      if (random() < chance) shinyGained += 1;
    }
    if (shinyGained > 0) {
      const prev = Number(this._shinyCounts[id] || 0);
      const qty = Math.max(0, Math.floor(Number(entity.quantity) || 0));
      this._shinyCounts[id] = Math.min(qty, prev + shinyGained);
    }
    this.#clampShinyCounts();

    this.#refreshMilestones();
    this.unlockLogs();
    this.#bump();
    return { ok: true, bought: result.bought, cost: result.cost, shinyGained };
  }

  buyUpgrade(id) {
    const upgrade = getUpgrade(id);
    if (!upgrade) return { ok: false };
    if (this.upgrades.includes(id)) return { ok: false };
    if (!meetsUpgradeRequirement(upgrade, { souls: this.souls, generators: this.quantities() })) {
      return { ok: false };
    }
    if (!this.#spendSouls(upgrade.cost)) return { ok: false };
    this.upgrades = [...this.upgrades, id];
    this.unlockLogs();
    this.#bump();
    return { ok: true, cost: money(upgrade.cost) };
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

    this.unlockLogs();
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

  /** Rehydrate a partir do DTO autoritativo do servidor (Task 9). */
  applyAuthoritativeState(snapshot = {}) {
    if (!snapshot || typeof snapshot !== 'object') return this;
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
    if (snapshot.shinyCounts != null || snapshot.shiny_counts != null) {
      this._shinyCounts = asShinyCounts(
        snapshot.shinyCounts ?? snapshot.shiny_counts,
        this.generators.quantities(),
      );
    } else {
      this.#clampShinyCounts();
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
    this.syncOk = true;
    this.#refreshMilestones();
    this.unlockLogs();
    this.#bump();
    return this;
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
      upgrades: [...this.upgrades],
      talents: [...this.talents],
      verdictPurchases: [...this.verdictPurchases],
      verdicts: this.verdicts,
      juizoBestStreak: this.juizoBestStreak,
      juizoCurrentStreak: this.juizoCurrentStreak,
      eduLogsSeen: [...this.eduLogsSeen],
      milestones: { ...this.milestones },
      lastSyncAt: this.lastSyncAt,
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

  /** Garante 0 ≤ shiny ≤ qty após mudanças de quantidade. */
  #clampShinyCounts() {
    const qty = this.quantities();
    const next = {};
    for (const [id, raw] of Object.entries(this._shinyCounts || {})) {
      if (!GENERATOR_BY_ID[id]) continue;
      const cap = Math.max(0, Math.floor(Number(qty[id]) || 0));
      const n = Math.min(cap, Math.max(0, Math.floor(Number(raw) || 0)));
      if (n > 0) next[id] = n;
    }
    this._shinyCounts = next;
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
