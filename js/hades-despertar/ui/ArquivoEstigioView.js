/**
 * Aba Arquivo Estígio — hub da Catábase (árvore horizontal estilo ONI).
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
import { createSpriteNode, upgradeSprite } from './world/SpriteAtlas.js';

const SATELLITE_IDS = Object.freeze(['ninho_do_acheron', 'visceras_sacras']);
const HUB_ID = 'concilio_das_moiras';

const NODE_W = 168;
const NODE_H = 78;
const NODE_GAP_X = 56;
const CHAIN_PAD_X = 16;
const CHAIN_PAD_Y = 18;
const SAT_GAP_Y = 36;
const SVG_NS = 'http://www.w3.org/2000/svg';

export function isArquivoTabUnlocked(state = {}) {
  const qty = typeof state.quantities === 'function'
    ? state.quantities()
    : (state.generators || {});
  const servants = Math.max(0, Math.floor(Number(qty.charon_servants) || 0));
  const upgrades = Array.isArray(state.upgrades) ? state.upgrades : [];
  return servants >= 7 || upgrades.includes(HUB_ID);
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

export function arquivoBuyFailureMessage(result = {}, id = '') {
  const reason = result?.reason || '';
  const name = getUpgrade(id)?.name || id || 'tese';
  if (reason === 'insufficient_souls') {
    const cost = result.cost != null ? ` (custo ${formatSouls(result.cost)})` : '';
    return `Almas insuficientes para ${name}${cost}.`;
  }
  if (reason === 'requires') {
    return `Requisitos não cumpridos para ${name}.`;
  }
  if (reason === 'already_owned') {
    return `${name} já está selada.`;
  }
  if (reason === 'missing') {
    return 'Tese desconhecida.';
  }
  return `Não foi possível comprar ${name}.`;
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

function isFreeShopping(state) {
  if (typeof state.isFreeShopping === 'function') return Boolean(state.isFreeShopping());
  return Boolean(state.debugFlags?.freeShopping);
}

function enrichNode(item, state, { researchProgress = 0 } = {}) {
  const free = isFreeShopping(state);
  const cost = item.cost || '0';
  const affordable = free || cmp(state.souls || '0', cost) >= 0;
  const canClick = item.status === 'ready' && affordable;
  const bits = [];
  if (item.blurb) bits.push(item.blurb);
  if (item.status === 'ready' && !affordable) {
    bits.unshift(`Faltam almas (custo ${formatSouls(cost)}).`);
  } else if (item.status === 'locked') {
    bits.unshift(item.id === HUB_ID
      ? 'Precisa de 7 Servos de Caronte.'
      : 'Bloqueada — avance a cadeia.');
  } else if (item.status === 'queued') {
    bits.unshift('Na fila — aguarde a pesquisa atual.');
  } else if (item.status === 'researching') {
    bits.unshift('Pesquisando…');
  } else if (item.status === 'owned') {
    bits.unshift('Comprada.');
  } else if (canClick) {
    bits.unshift(`Clique para comprar (${formatSouls(cost)} almas).`);
  }
  return {
    ...item,
    affordable,
    canClick,
    tip: bits.filter(Boolean).join(' '),
    researchProgress: item.status === 'researching' ? researchProgress : 0,
  };
}

function idleResearchTitle({ hasHub, readyId, chain }) {
  if (!hasHub) return 'Fundar o Concílio para iniciar as teses.';
  if (readyId) return 'Tese pronta — clique no nó para avançar.';
  const pending = (chain || []).some((c) => c.id !== HUB_ID && c.status !== 'owned');
  return pending
    ? 'Pesquisa em andamento na cadeia.'
    : 'Cadeia de teses concluída.';
}

function statusLabel(status) {
  if (status === 'owned') return 'Comprada';
  if (status === 'researching') return 'Pesquisando…';
  if (status === 'ready') return 'Pronta';
  if (status === 'queued') return 'Na fila';
  if (status === 'locked') return 'Bloqueada';
  return status;
}

/**
 * Snapshot puro da cadeia + pesquisa (testável sem DOM).
 */
export function describeArquivoPanel(state = {}) {
  const owned = ownedSet(state);
  const unlocked = unlockedSet(state);
  const hasHub = owned.has(HUB_ID);
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
  const progress = !targetId || duration <= 0 || remaining <= 0
    ? 0
    : Math.max(0, Math.min(1, 1 - (remaining / duration)));
  const researching = Boolean(targetId && remaining > 0);

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
  const hubUp = getUpgrade(HUB_ID);
  const hubAffordable = hubUp
    ? (isFreeShopping(state) || cmp(state.souls || '0', hubUp.cost) >= 0)
    : false;
  const canBuyHub = !hasHub && servants >= 7 && meetsUpgradeRequirement(hubUp, requirementContext(state));

  const shortName = (full, fallback) => {
    const raw = String(full || fallback || '').trim();
    const cut = raw.replace(/\s*\([^)]*\)\s*$/, '').trim();
    return cut || raw;
  };

  const rawChain = [
    {
      id: HUB_ID,
      name: shortName(hubUp?.name, 'Concílio das Moiras'),
      blurb: hubUp?.blurb || '',
      cost: hubUp?.cost || '0',
      spsBonusFactor: null,
      setsStage: 0,
      status: owned.has(HUB_ID)
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
        name: shortName(up?.name, step.name),
        blurb: up?.blurb || '',
        cost: up?.cost || '0',
        spsBonusFactor: step.spsBonusFactor,
        setsStage: step.setsStage,
        status,
      };
    }),
  ];

  const chain = rawChain.map((item) => enrichNode(item, state, { researchProgress: progress }));

  const ctx = requirementContext(state);
  const satellites = SATELLITE_IDS.map((id) => {
    const up = getUpgrade(id);
    if (!up) return null;
    const isOwned = owned.has(id);
    const meets = meetsUpgradeRequirement(up, ctx);
    if (!isOwned && !meets && !owned.has(up.requires?.upgradeId)) return null;
    return enrichNode({
      id,
      name: up.name,
      blurb: up.blurb || '',
      cost: up.cost || '0',
      status: isOwned ? 'owned' : (meets ? 'ready' : 'locked'),
      spsBonusFactor: null,
      setsStage: null,
    }, state);
  }).filter(Boolean);

  const researchTitle = researching
    ? (getUpgrade(targetId)?.name || targetId)
    : idleResearchTitle({ hasHub, readyId, chain });

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
      title: researchTitle,
      remainingSec: remaining,
      durationSec: duration,
      progress,
      researching,
      timeLabel: researching
        ? formatResearchCountdown(remaining)
        : (readyId ? 'Tese pronta para compra' : ''),
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

function chainNodePosition(index) {
  return {
    x: CHAIN_PAD_X + index * (NODE_W + NODE_GAP_X),
    y: CHAIN_PAD_Y,
  };
}

function satelliteNodePosition(index, chainLen) {
  const hub = chainNodePosition(0);
  const underChain = CHAIN_PAD_Y + NODE_H + SAT_GAP_Y;
  return {
    x: hub.x + index * (NODE_W + NODE_GAP_X),
    y: underChain,
    // Keep satellites under the left of the chain even if chain is short.
    _chainLen: chainLen,
  };
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
    this._feedbackTimer = null;
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
      feedback: this._root.querySelector('[data-arquivo="feedback"]'),
      pledge: this._root.querySelector('[data-arquivo-action="pledge"]'),
      covenant: this._root.querySelector('[data-arquivo-action="covenant"]'),
      tree: this._root.querySelector('[data-arquivo="tree"]'),
    };

    this._root.addEventListener?.('click', (event) => {
      const btn = event.target?.closest?.('[data-arquivo-action], [data-arquivo-buy]');
      if (!btn) return;
      const action = btn.getAttribute('data-arquivo-action');
      const buyId = btn.getAttribute('data-arquivo-buy');
      if (action === 'pledge') this._onActivatePledge?.();
      else if (action === 'covenant') this._onToggleCovenant?.();
      else if (buyId) this._onBuyUpgrade?.(buyId);
    });

    return this;
  }

  showFeedback(message = '') {
    const text = String(message || '').trim();
    if (!this._els?.feedback) return;
    setText(this._els.feedback, text);
    setHidden(this._els.feedback, !text);
    if (this._feedbackTimer != null && typeof globalThis.clearTimeout === 'function') {
      globalThis.clearTimeout(this._feedbackTimer);
      this._feedbackTimer = null;
    }
    if (text && typeof globalThis.setTimeout === 'function') {
      this._feedbackTimer = globalThis.setTimeout(() => {
        setText(this._els.feedback, '');
        setHidden(this._els.feedback, true);
        this._feedbackTimer = null;
      }, 4200);
    }
  }

  #svgEl(tag, attrs = {}) {
    const el = this._doc.createElementNS
      ? this._doc.createElementNS(SVG_NS, tag)
      : this._doc.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null) continue;
      if (typeof el.setAttribute === 'function') el.setAttribute(k, String(v));
    }
    return el;
  }

  #buildNodeButton(item, pos) {
    const btn = this._doc.createElement('button');
    btn.type = 'button';
    const unaffordable = item.status === 'ready' && !item.affordable;
    btn.className = [
      'despertar-arquivo__node',
      `despertar-arquivo__node--${item.status}`,
      unaffordable ? 'despertar-arquivo__node--unaffordable' : '',
      item.canClick ? 'is-clickable' : '',
    ].filter(Boolean).join(' ');
    btn.style.left = `${pos.x}px`;
    btn.style.top = `${pos.y}px`;
    btn.style.width = `${NODE_W}px`;
    btn.style.height = `${NODE_H}px`;
    btn.title = item.tip || item.blurb || item.name;
    btn.disabled = !item.canClick;
    if (item.canClick) btn.setAttribute('data-arquivo-buy', item.id);
    else btn.removeAttribute?.('data-arquivo-buy');
    btn.setAttribute('aria-label', `${item.name} — ${statusLabel(item.status)}`);

    const icon = this._doc.createElement('span');
    icon.className = 'despertar-arquivo__node-icon';
    icon.setAttribute('aria-hidden', 'true');
    const sprite = createSpriteNode(this._doc, upgradeSprite(item.id), {
      className: 'despertar-arquivo__node-sprite',
    });
    if (sprite) icon.append?.(sprite);
    else {
      icon.textContent = (item.name || '?').slice(0, 1);
    }

    const body = this._doc.createElement('span');
    body.className = 'despertar-arquivo__node-body';

    const title = this._doc.createElement('span');
    title.className = 'despertar-arquivo__node-title';
    title.textContent = item.name;

    const meta = this._doc.createElement('span');
    meta.className = 'despertar-arquivo__node-meta';
    const bits = [];
    if (item.spsBonusFactor) bits.push(`×${item.spsBonusFactor}`);
    if (item.setsStage != null && item.setsStage > 0) bits.push(`Est. ${item.setsStage}`);
    if (item.status === 'owned') bits.push('Comprada');
    else if (item.status === 'researching') {
      bits.push(`${Math.round((item.researchProgress || 0) * 100)}%`);
    } else {
      bits.push(formatSouls(item.cost));
      bits.push(statusLabel(item.status));
    }
    meta.textContent = bits.join(' · ');

    body.append?.(title, meta);
    btn.append?.(icon, body);

    if (item.status === 'researching') {
      const bar = this._doc.createElement('span');
      bar.className = 'despertar-arquivo__node-progress';
      bar.setAttribute('aria-hidden', 'true');
      const fill = this._doc.createElement('span');
      fill.className = 'despertar-arquivo__node-progress-fill';
      fill.style.width = `${Math.round((item.researchProgress || 0) * 100)}%`;
      bar.append?.(fill);
      btn.append?.(bar);
    }

    return btn;
  }

  #renderTree(chain, satellites) {
    const host = this._els?.tree;
    if (!host || !this._doc?.createElement) return;

    const chainList = Array.isArray(chain) ? chain : [];
    const satList = Array.isArray(satellites) ? satellites : [];
    const positions = new Map();
    chainList.forEach((item, i) => positions.set(item.id, chainNodePosition(i)));
    satList.forEach((item, i) => positions.set(item.id, satelliteNodePosition(i, chainList.length)));

    const maxX = Math.max(
      ...[...positions.values()].map((p) => p.x + NODE_W),
      CHAIN_PAD_X + NODE_W,
    );
    const maxY = Math.max(
      ...[...positions.values()].map((p) => p.y + NODE_H),
      CHAIN_PAD_Y + NODE_H,
    );
    const width = maxX + CHAIN_PAD_X;
    const height = maxY + CHAIN_PAD_Y;

    host.replaceChildren?.();
    host.style.minWidth = `${width}px`;
    host.style.minHeight = `${height}px`;

    const svg = this.#svgEl('svg', {
      class: 'despertar-arquivo__edges',
      width: String(width),
      height: String(height),
      viewBox: `0 0 ${width} ${height}`,
      'aria-hidden': 'true',
    });

    const edgeFromTo = (fromId, toId, ownedish) => {
      const a = positions.get(fromId);
      const b = positions.get(toId);
      if (!a || !b) return;
      const x1 = a.x + NODE_W;
      const y1 = a.y + NODE_H / 2;
      const x2 = b.x;
      const y2 = b.y + NODE_H / 2;
      const mid = (x1 + x2) / 2;
      const path = this.#svgEl('path', {
        class: `despertar-arquivo__edge${ownedish ? ' despertar-arquivo__edge--lit' : ''}`,
        d: `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`,
        fill: 'none',
      });
      svg.append?.(path);
    };

    for (let i = 1; i < chainList.length; i += 1) {
      const prev = chainList[i - 1];
      const cur = chainList[i];
      const lit = prev.status === 'owned' || cur.status === 'owned'
        || cur.status === 'ready' || cur.status === 'researching' || cur.status === 'queued';
      edgeFromTo(prev.id, cur.id, lit);
    }
    if (satList.length && chainList[0]) {
      for (const sat of satList) {
        const lit = chainList[0].status === 'owned' || sat.status === 'owned' || sat.status === 'ready';
        // Draw from hub bottom-center to satellite top-center via a short path.
        const a = positions.get(chainList[0].id);
        const b = positions.get(sat.id);
        if (!a || !b) continue;
        const x1 = a.x + NODE_W / 2;
        const y1 = a.y + NODE_H;
        const x2 = b.x + NODE_W / 2;
        const y2 = b.y;
        const midY = (y1 + y2) / 2;
        const path = this.#svgEl('path', {
          class: `despertar-arquivo__edge${lit ? ' despertar-arquivo__edge--lit' : ''}`,
          d: `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`,
          fill: 'none',
        });
        svg.append?.(path);
      }
    }

    host.append?.(svg);

    for (const item of chainList) {
      host.append?.(this.#buildNodeButton(item, positions.get(item.id)));
    }
    for (const item of satList) {
      host.append?.(this.#buildNodeButton(item, positions.get(item.id)));
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
      Math.round(view.research.progress * 100),
      view.pledgeOn,
      view.covOn,
      view.chain.map((c) => `${c.id}:${c.status}:${c.canClick ? 1 : 0}:${c.affordable ? 1 : 0}`).join(','),
      view.satellites.map((c) => `${c.id}:${c.status}:${c.canClick ? 1 : 0}`).join(','),
      view.spsLine,
      view.digestedLine,
      state.souls || '0',
    ].join('|');

    setText(this._els.stage, view.stageName);
    setText(this._els.wrath, `${view.wrathPct}%`);
    setText(this._els.sps, view.spsLine);
    setText(this._els.leeches, view.digestedLine);
    setText(this._els.researchTitle, view.research.title);
    setText(
      this._els.researchTime,
      view.research.researching
        ? `Restam ${view.research.timeLabel} (ciclo ${formatResearchCountdown(view.research.durationSec)})`
        : view.research.timeLabel,
    );

    const showBar = view.research.researching;
    setHidden(this._els.researchBar, !showBar);
    const pct = showBar ? Math.round(view.research.progress * 100) : 0;
    if (this._els.researchFill?.style) {
      this._els.researchFill.style.width = `${pct}%`;
    }
    if (this._els.researchBar) {
      this._els.researchBar.setAttribute?.('aria-valuenow', String(pct));
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
      this.#renderTree(view.chain, view.satellites);
    } else if (view.research.researching) {
      // Atualiza só a barra do nó em pesquisa sem reconstruir a árvore.
      const fill = this._els.tree?.querySelector?.(
        `.despertar-arquivo__node--researching .despertar-arquivo__node-progress-fill`,
      );
      if (fill?.style) fill.style.width = `${pct}%`;
      const meta = this._els.tree?.querySelector?.(
        `.despertar-arquivo__node--researching .despertar-arquivo__node-meta`,
      );
      if (meta) {
        const node = view.chain.find((c) => c.status === 'researching');
        if (node) {
          const bits = [];
          if (node.spsBonusFactor) bits.push(`×${node.spsBonusFactor}`);
          bits.push(`${pct}%`);
          meta.textContent = bits.join(' · ');
        }
      }
    }
  }
}
