/**
 * Estado da corrida de O Despertar.
 * Simulação local; o servidor só julga na Task 9.
 */

import { BUY_MAX_CAP, LETHE_PREVIEW_RUN_SOULS } from '../config/constants.js';
import { EDU_LOG_IDS } from '../config/edu-logs.js';
import { GENERATOR_BY_ID } from '../config/generators.js';
import { isKnownTalentId, getTalent } from '../config/talents.js';
import { isKnownUpgradeId, getUpgrade } from '../config/upgrades.js';
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
  constructor(snapshot = {}) {
    this.souls = clampNonNegative(snapshot.souls ?? '0');
    this.obols = clampNonNegative(snapshot.obols ?? '0');
    this.mnemosyne = clampNonNegative(snapshot.mnemosyne ?? '0');
    this.lifetimeSouls = clampNonNegative(snapshot.lifetimeSouls ?? snapshot.lifetime_souls ?? '0');
    this.runSouls = clampNonNegative(snapshot.runSouls ?? snapshot.run_souls ?? '0');
    this.prestigeCount = Math.max(0, Number.parseInt(snapshot.prestigeCount ?? snapshot.prestige_count, 10) || 0);
    this.generators = EntitySet.fromCatalog(
      asQuantities(snapshot.generators ?? snapshot.generators_state),
    );
    this.upgrades = uniqueKnown(snapshot.upgrades ?? snapshot.upgrades_state, isKnownUpgradeId);
    this.talents = uniqueKnown(snapshot.talents ?? snapshot.talents_state, isKnownTalentId);
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
    this.#refreshMilestones();
    this.unlockLogs();
  }

  subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  costMult() {
    return talentEffects(this.talents).generatorCostMult;
  }

  quantities() {
    return this.generators.quantities();
  }

  sps() {
    return calculateTotalSPS({
      generators: this.quantities(),
      upgrades: this.upgrades,
      talents: this.talents,
      obols: this.obols,
    });
  }

  clickPower() {
    return formulaClickPower({
      generators: this.quantities(),
      upgrades: this.upgrades,
      talents: this.talents,
      obols: this.obols,
      sps: this.sps(),
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

  buyGenerator(id, mode = '1') {
    const entity = this.generators.get(id);
    if (!entity) return { ok: false, bought: 0, cost: money('0') };
    const costMult = this.costMult();
    const count = resolveBuyCount(mode, entity, this.souls, costMult);
    if (count <= 0) return { ok: false, bought: 0, cost: money('0') };
    const result = entity.buy(count, this.souls, costMult);
    if (!result.ok) return { ok: false, bought: 0, cost: result.cost };
    this.souls = clampNonNegative(result.wallet);
    this.#refreshMilestones();
    this.unlockLogs();
    this.#bump();
    return { ok: true, bought: result.bought, cost: result.cost };
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

  applyPrestige() {
    if (!this.canPrestige()) return { ok: false };
    this.unlockLogs();
    const preview = this.prestigePreview();
    this.obols = add(this.obols, preview.obolsGain);
    this.mnemosyne = add(this.mnemosyne, preview.mnemosyneGain);
    this.prestigeCount += 1;
    this.upgrades = [];
    this.generators.applyQuantities({});
    this.souls = '0';
    this.runSouls = '0';
    this.clickCount = 0;

    const effects = talentEffects(this.talents);
    this.souls = clampNonNegative(effects.startingSouls || '0');
    this.runSouls = normalize(this.souls);
    if (effects.startingGenerators && Object.keys(effects.startingGenerators).length) {
      this.generators.applyQuantities(effects.startingGenerators);
    }

    this.unlockLogs();
    this.#bump();
    return { ok: true, ...preview };
  }

  applyOffline(elapsedSeconds) {
    const result = calculateOfflineProgress({
      elapsedSeconds,
      sps: this.sps(),
      talents: this.talents,
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

  toSnapshot() {
    return {
      souls: money(this.souls),
      obols: money(this.obols),
      mnemosyne: money(this.mnemosyne),
      lifetimeSouls: money(this.lifetimeSouls),
      runSouls: money(this.runSouls),
      prestigeCount: this.prestigeCount,
      generators: this.quantities(),
      upgrades: [...this.upgrades],
      talents: [...this.talents],
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
