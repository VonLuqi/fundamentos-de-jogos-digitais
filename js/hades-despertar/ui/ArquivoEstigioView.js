/**
 * Aba Arquivo Estígio — hub da Catábase (pesquisas, timer, Sanguessugas, pactos).
 */

import {
  CATABASE_RESEARCH_CHAIN,
  CATABASE_STAGES,
  wrathProbabilityForStage,
} from '../config/catabase.js';
import { getUpgrade } from '../config/upgrades.js';
import { cmp } from '../core/decimal.js';
import {
  researchDurationSeconds,
} from '../core/CatabaseSystem.js';
import { meetsUpgradeRequirement, talentEffects } from '../core/formulas.js';
import { formatRate, formatSouls } from './NumberFormatter.js';

const SATELLITE_IDS = Object.freeze(['ninho_do_acheron', 'visceras_sacras']);

export function isArquivoTabUnlocked(state = {}) {
  const qty = typeof state.quantities === 'function'
    ? state.quantities()
    : (state.generators || {});
  const servants = Math.max(0, Math.floor(Number(qty.charon_servants) || 0));
  const upgrades = Array.isArray(state.upgrades) ? state.upgrades : [];
  return servants >= 7 || upgrades.includes('concilio_das_moiras');
}

export function formatResearchCountdown(sec = 0) {
  const s = Math.max(0, Math.ceil(Number(sec) || 0));
  if (s <= 0) return 'pronta';
  if (s >= 3600) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m`;
  }
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function ownedSet(state) {
  return new Set((Array.isArray(state.upgrades) ? state.upgrades : []).map(String));
}

function unlockedSet(state) {
  const list = state.catabase?.unlockedResearchIds;
  return new Set((Array.isArray(list) ? list : []).map(String));
}

function requirementContext(state) {
  const quantities = typeof state.quantities === 'function'
    ? state.quantities()
    : (state.generators || {});
  return {
    souls: state.souls,
    generators: quantities,
    upgrades: state.upgrades || [],
    talents: state.talents || [],
    achievements: state.achievements || [],
    veilPercent: typeof state.veilPercent === 'function' ? state.veilPercent() : undefined,
    catabase: state.catabase || null,
    dragon: state.dragon || null,
    seasons: state.seasons || null,
    fortunes: state.fortunes || null,
  };
}

/**
 * Snapshot puro da cadeia + pesquisa (testável sem DOM).
 */
export function describeArquivoPanel(state = {}) {
  const owned = ownedSet(state);
  const unlocked = unlockedSet(state);
  const hasHub = owned.has('concilio_das_moiras');
  const qty = typeof state.quantities === 'function'
    ? state.quantities()
    : (state.generators || {});
  const servants = Math.max(0, Math.floor(Number(qty.charon_servants) || 0));
  const fx = talentEffects(state.talents || []);
  const duration = researchDurationSeconds({
    researchDurationMult: fx.researchDurationMult ?? '1',
  });
  const targetId = state.catabase?.researchTargetId || null;
  const remaining = Math.max(0, Number(state.catabase?.researchRemainingSec) || 0);
  const progress = !targetId || duration <= 0
    ? 0
    : Math.max(0, Math.min(1, 1 - (remaining / duration)));

  const effStage = typeof state.catabaseStage === 'function'
    ? state.catabaseStage()
    : Number(state.catabase?.stage || 0);
  const structStage = typeof state.structuralCatabaseStage === 'function'
    ? state.structuralCatabaseStage()
    : effStage;
  const stageInfo = CATABASE_STAGES[effStage] || CATABASE_STAGES[0];
  const wrathPct = Math.round(wrathProbabilityForStage(effStage) * 100);
  const rawSps = typeof state.rawSps === 'function'
    ? state.rawSps()
    : (typeof state.sps === 'function' ? state.sps() : (state.sps || '0'));
  const effectiveSps = typeof state.effectiveSps === 'function'
    ? state.effectiveSps()
    : rawSps;
  const drainInfo = typeof state.leechDrainInfo === 'function'
    ? state.leechDrainInfo()
    : { count: state.catabase?.leeches?.length || 0, drainPercent: (state.catabase?.leeches?.length || 0) * 5 };
  const leechSummary = typeof state.leechSummary === 'function'
    ? state.leechSummary()
    : { totalDigested: '0', totalPayout: '0' };
  const spsLine = drainInfo.count > 0
    ? `${formatRate(effectiveSps)} (bruto ${formatRate(rawSps)} · ${drainInfo.count} vermes −${drainInfo.drainPercent}%)`
    : `${formatRate(rawSps)} · sem Sanguessugas`;
  const digestedLine = drainInfo.count > 0
    ? `${formatSouls(leechSummary.totalDigested)} retidas · pop ≈ ${formatSouls(leechSummary.totalPayout)}`
    : 'Nenhuma Sanguessuga ancorada na Foice';
  const canPacts = structStage >= 3 || owned.has('pacto_primordial');
  const pledgeOn = typeof state.isElderPledgeActive === 'function'
    ? state.isElderPledgeActive()
    : false;
  const covOn = typeof state.isElderCovenantActive === 'function'
    ? state.isElderCovenantActive()
    : Boolean(state.catabase?.covenantActive);
  const pledgeCost = typeof state.pledgeCost === 'function' ? state.pledgeCost() : '64';

  const readyId = [...unlocked].find((id) => !owned.has(id)) || null;
  const hubUp = getUpgrade('concilio_das_moiras');
  const hubAffordable = hubUp
    ? (Boolean(state.debugFlags?.freeShopping) || cmp(state.souls || '0', hubUp.cost) >= 0)
    : false;
  const canBuyHub = !hasHub && servants >= 7 && meetsUpgradeRequirement(hubUp, requirementContext(state));

  const chain = [
    {
      id: 'concilio_das_moiras',
      name: hubUp?.name || 'Concílio das Moiras (Arquivo Estígio)',
      blurb: hubUp?.blurb || '',
      cost: hubUp?.cost || '0',
      spsBonusFactor: null,
      setsStage: 0,
      status: owned.has('concilio_das_moiras')
        ? 'owned'
        : (servants >= 7 ? 'ready' : 'locked'),
    },
    ...CATABASE_RESEARCH_CHAIN.map((step) => {
      const up = getUpgrade(step.upgradeId);
      let status = 'locked';
      if (owned.has(step.upgradeId)) status = 'owned';
      else if (unlocked.has(step.upgradeId)) status = 'ready';
      else if (targetId === step.upgradeId && remaining > 0) status = 'researching';
      else if (hasHub && owned.has(step.prevUpgradeId)) status = 'queued';
      return {
        id: step.upgradeId,
        name: up?.name || step.name,
        blurb: up?.blurb || '',
        cost: up?.cost || '0',
        spsBonusFactor: step.spsBonusFactor,
        setsStage: step.setsStage,
        status,
      };
    }),
  ];

  const ctx = requirementContext(state);
  const satellites = SATELLITE_IDS.map((id) => {
    const up = getUpgrade(id);
    if (!up) return null;
    const isOwned = owned.has(id);
    const meets = meetsUpgradeRequirement(up, ctx);
    if (!isOwned && !meets && !owned.has(up.requires?.upgradeId)) return null;
    return {
      id,
      name: up.name,
      blurb: up.blurb || '',
      cost: up.cost || '0',
      status: isOwned ? 'owned' : (meets ? 'ready' : 'locked'),
    };
  }).filter(Boolean);

  return {
    unlockedTab: isArquivoTabUnlocked(state),
    hasHub,
    canBuyHub: canBuyHub && hubAffordable,
    hubCost: hubUp?.cost || '0',
    stageName: stageInfo.name,
    stage: effStage,
    wrathPct,
    spsLine,
    digestedLine,
    canPacts,
    pledgeOn,
    covOn,
    pledgeCost,
    research: {
      targetId,
      title: targetId
        ? (getUpgrade(targetId)?.name || targetId)
        : (hasHub ? 'Cadeia concluída ou aguardando compra.' : 'Fundar o Concílio para iniciar as teses.'),
      remainingSec: remaining,
      durationSec: duration,
      progress,
      timeLabel: targetId && remaining > 0
        ? formatResearchCountdown(remaining)
        : (readyId ? 'Tese pronta para compra' : (hasHub ? '—' : '—')),
      readyId,
    },
    chain,
    satellites,
  };
}

function setText(el, text) {
  if (el && el.textContent !== text) el.textContent = text;
}

function setHidden(el, hidden) {
  if (!el) return;
  if (el.hidden !== hidden) el.hidden = hidden;
}

export class ArquivoEstigioView {
  constructor(options = {}) {
    this._doc = options.document || (typeof document !== 'undefined' ? document : null);
    this._onBuyUpgrade = typeof options.onBuyUpgrade === 'function' ? options.onBuyUpgrade : null;
    this._onActivatePledge = typeof options.onActivatePledge === 'function' ? options.onActivatePledge : null;
    this._onToggleCovenant = typeof options.onToggleCovenant === 'function' ? options.onToggleCovenant : null;
    this._root = null;
    this._els = null;
    this._lastSig = '';
  }

  mount(panel = null) {
    const root = panel
      || this._doc?.getElementById?.('despertar-arquivo')
      || this._doc?.getElementById?.('panel-arquivo');
    if (!root) return this;
    this._root = root.querySelector?.('#despertar-arquivo') || root;
    this._els = {
      stage: this._root.querySelector('[data-arquivo="stage"]'),
      wrath: this._root.querySelector('[data-arquivo="wrath"]'),
      sps: this._root.querySelector('[data-arquivo="sps"]'),
      leeches: this._root.querySelector('[data-arquivo="leeches"]'),
      researchTitle: this._root.querySelector('[data-arquivo="research-title"]'),
      researchTime: this._root.querySelector('[data-arquivo="research-time"]'),
      researchBar: this._root.querySelector('[data-arquivo="research-bar"]'),
      researchFill: this._root.querySelector('[data-arquivo="research-fill"]'),
      buyHub: this._root.querySelector('[data-arquivo-action="buy-hub"]'),
      buyReady: this._root.querySelector('[data-arquivo-action="buy-ready"]'),
      pledge: this._root.querySelector('[data-arquivo-action="pledge"]'),
      covenant: this._root.querySelector('[data-arquivo-action="covenant"]'),
      chain: this._root.querySelector('[data-arquivo="chain"]'),
      satellites: this._root.querySelector('[data-arquivo="satellites"]'),
    };

    this._root.addEventListener?.('click', (event) => {
      const btn = event.target?.closest?.('[data-arquivo-action], [data-arquivo-buy]');
      if (!btn) return;
      const action = btn.getAttribute('data-arquivo-action');
      const buyId = btn.getAttribute('data-arquivo-buy');
      if (action === 'buy-hub') this._onBuyUpgrade?.('concilio_das_moiras');
      else if (action === 'buy-ready') {
        const ready = btn.getAttribute('data-ready-id');
        if (ready) this._onBuyUpgrade?.(ready);
      } else if (action === 'pledge') this._onActivatePledge?.();
      else if (action === 'covenant') this._onToggleCovenant?.();
      else if (buyId) this._onBuyUpgrade?.(buyId);
    });

    return this;
  }

  #renderList(host, items, { buyAttr = 'data-arquivo-buy' } = {}) {
    if (!host || !this._doc?.createElement) return;
    host.replaceChildren?.();
    for (const item of items) {
      const li = this._doc.createElement('li');
      li.className = `despertar-arquivo__item is-${item.status}`;
      li.dataset.status = item.status;

      const title = this._doc.createElement('p');
      title.className = 'despertar-arquivo__item-title';
      title.textContent = item.name;

      const meta = this._doc.createElement('p');
      meta.className = 'despertar-arquivo__item-meta';
      const bits = [];
      if (item.spsBonusFactor) bits.push(`×${item.spsBonusFactor} SPS`);
      if (item.setsStage != null && item.setsStage > 0) bits.push(`Estágio ${item.setsStage}`);
      bits.push(item.status === 'owned' ? 'Comprada' : `Custo ${formatSouls(item.cost)}`);
      if (item.status === 'researching') bits.push('Pesquisando…');
      if (item.status === 'ready') bits.push('Pronta');
      if (item.status === 'queued') bits.push('Na fila');
      if (item.status === 'locked') bits.push('Bloqueada');
      meta.textContent = bits.join(' · ');

      const blurb = this._doc.createElement('p');
      blurb.className = 'despertar-arquivo__item-blurb';
      blurb.textContent = item.blurb || '';

      li.append?.(title, meta, blurb);

      if (item.status === 'ready') {
        const buy = this._doc.createElement('button');
        buy.type = 'button';
        buy.className = 'despertar-debug__grant despertar-arquivo__buy';
        buy.setAttribute(buyAttr, item.id);
        buy.textContent = 'Comprar';
        li.append?.(buy);
      }

      host.append?.(li);
    }
  }

  sync(state) {
    if (!this._els || !state) return;
    const view = describeArquivoPanel(state);
    const sig = [
      view.stage,
      view.wrathPct,
      view.hasHub,
      view.research.targetId,
      Math.floor(view.research.remainingSec),
      view.research.readyId,
      view.pledgeOn,
      view.covOn,
      view.chain.map((c) => `${c.id}:${c.status}`).join(','),
      view.satellites.map((c) => `${c.id}:${c.status}`).join(','),
      view.spsLine,
      view.digestedLine,
    ].join('|');
    // Timer precisa atualizar o texto mesmo com sig estável em segundos.
    setText(this._els.stage, view.stageName);
    setText(this._els.wrath, `${view.wrathPct}%`);
    setText(this._els.sps, view.spsLine);
    setText(this._els.leeches, view.digestedLine);
    setText(this._els.researchTitle, view.research.title);
    setText(
      this._els.researchTime,
      view.research.targetId && view.research.remainingSec > 0
        ? `Restam ${view.research.timeLabel} (ciclo ${formatResearchCountdown(view.research.durationSec)})`
        : view.research.timeLabel,
    );
    const pct = Math.round(view.research.progress * 100);
    if (this._els.researchFill?.style) {
      this._els.researchFill.style.width = `${pct}%`;
    }
    if (this._els.researchBar) {
      this._els.researchBar.setAttribute?.('aria-valuenow', String(pct));
    }

    setHidden(this._els.buyHub, !view.canBuyHub);
    if (this._els.buyHub && view.canBuyHub) {
      this._els.buyHub.textContent = `Fundar Concílio (${formatSouls(view.hubCost)} almas)`;
    }
    setHidden(this._els.buyReady, !view.research.readyId);
    if (this._els.buyReady) {
      this._els.buyReady.setAttribute('data-ready-id', view.research.readyId || '');
      if (view.research.readyId) {
        const name = getUpgrade(view.research.readyId)?.name || view.research.readyId;
        this._els.buyReady.textContent = `Comprar ${name}`;
      }
    }

    setHidden(this._els.pledge, !view.canPacts || view.covOn);
    setHidden(this._els.covenant, !view.canPacts);
    if (this._els.pledge && !this._els.pledge.hidden) {
      this._els.pledge.textContent = view.pledgeOn
        ? 'Trégua ativa'
        : `Juramento de Trégua (${formatSouls(view.pledgeCost)})`;
      this._els.pledge.disabled = Boolean(view.pledgeOn);
    }
    if (this._els.covenant && !this._els.covenant.hidden) {
      this._els.covenant.textContent = view.covOn
        ? 'Revogar Aliança Eterna'
        : 'Aliança Eterna (−5% SPS)';
    }

    if (sig !== this._lastSig) {
      this._lastSig = sig;
      this.#renderList(this._els.chain, view.chain);
      this.#renderList(this._els.satellites, view.satellites);
    }
  }
}
