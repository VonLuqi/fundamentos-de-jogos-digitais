/**
 * Renderer cirúrgico de O Despertar.
 * Monta o mercado uma vez; o loop só atualiza textContent / disabled / classes.
 * Proibido recriar a lista a 60 Hz.
 */

import {
  BUY_MODES,
  COCYTUS_T2_SOULS,
  LETHE_PREVIEW_RUN_SOULS,
  PHLEGETHON_SOULS,
  STYX_UNLOCK_SOULS,
  TICK_FPS,
} from '../config/constants.js';
import { EDU_LOGS, EDU_LOG_BY_ID } from '../config/edu-logs.js';
import { GENERATORS, getGenerator } from '../config/generators.js';
import { TALENTS } from '../config/talents.js';
import { UPGRADES } from '../config/upgrades.js';
import { VERDICT_SHOP } from '../config/verdict-shop.js';
import { add, cmp, div, mul } from '../core/decimal.js';
import {
  amortizationSeconds,
  meetsUpgradeRequirement,
  prestigeBonus,
} from '../core/formulas.js';
import { formatAmortSeconds, formatOwned, formatRate, formatSouls } from './NumberFormatter.js';
import { AltarOrbit, veilPercent } from './world/AltarOrbit.js';
import { createSpriteNode, generatorSprite, upgradeSprite } from './world/SpriteAtlas.js';
import { WorldView } from './world/WorldView.js';

const RIVER_VEIL = 'Este rio ainda não aceita teu nome.';
const STYX_EMPTY = 'Os juramentos do Styx exigem servos — ou um punhado de almas.';
const LETHE_EMPTY = 'O Lethe só se abre quando a corrida encontra a parede.';
const PANTHEON_EMPTY = 'Mnemosyne ainda não bebeu tua memória.';
const CODEX_EMPTY = 'O Códice espera o primeiro clique.';
const CODEX_LOCKED_TITLE = 'Página selada';
const CODEX_LOCKED_BODY = 'O Submundo só revela o que a corrida já encontrou.';

const TALENT_BLURB = Object.freeze({
  memoria_das_sombras: 'A próxima corrida começa com 100 almas.',
  juramento_eterno: 'A memória de Mnemosyne rende 10% a mais no bônus.',
  noite_prolongada: 'A colheita na ausência vai até 12 h.',
  veu_eficiente: 'A ausência colhe 100% das Almas / s.',
  foice_ancestral: 'O clique ganha 1% das Almas / s — vale já nesta corrida.',
  favor_de_caronte: 'Geradores custam 5% menos — vale já nesta corrida.',
  mnemosyne_profunda: 'A essência rende 25% a mais no bônus.',
  segundo_folego: 'A próxima corrida começa com 1 Sombra Vagante.',
});

function setText(node, value) {
  if (!node) return;
  const next = String(value);
  if (node.textContent !== next) node.textContent = next;
}

function setHidden(node, hidden) {
  if (!node) return;
  if (node.hidden !== hidden) node.hidden = hidden;
}

function setDisabled(node, disabled) {
  if (!node) return;
  if (node.disabled !== disabled) node.disabled = disabled;
}

function toggleClass(node, name, on) {
  if (!node) return;
  node.classList.toggle(name, Boolean(on));
}

function resolveLotCount(mode, entity, wallet, costMult) {
  const raw = String(mode ?? '1').trim().toLowerCase();
  if (raw === 'max' || raw === 'máx' || raw === 'maximo' || raw === 'máximo') {
    return entity.maxAffordable(wallet, costMult);
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n;
}

export function interpolatedSouls(souls, sps, alpha, reducedMotion = false) {
  // Interpola no máximo 1 tick (1/TICK_FPS s) — nunca um segundo inteiro de SPS.
  // A HUD principal usa o saldo real; esta função serve a testes / efeitos opcionais.
  if (reducedMotion) return souls;
  const fraction = Number(alpha);
  if (!Number.isFinite(fraction) || fraction <= 0) return souls;
  const clamped = Math.min(1, Math.max(0, fraction));
  return add(souls, mul(sps, String(clamped / TICK_FPS)));
}

/**
 * Máscaras de rio (catálogo congelado).
 * T1 sempre; T2 ≥ 50 almas ou 1× T1; T3 1× T2 ou almas ≥ BaseCost/4;
 * T4 sempre visível (salão do Tártaro); T5–T6 Phlegethon.
 */
export function isGeneratorRevealed(id, { souls = '0', generators = {} } = {}) {
  const qty = generators && typeof generators === 'object' ? generators : {};
  const t1 = Number(qty.wandering_shade || 0);
  const t2 = Number(qty.charon_servants || 0);
  const t4 = Number(qty.tartarus_judge || 0);

  switch (id) {
    case 'wandering_shade':
      return true;
    case 'charon_servants':
      return t1 >= 1 || cmp(souls, COCYTUS_T2_SOULS) >= 0;
    case 'cerberian_hound': {
      const def = getGenerator(id);
      const threshold = def ? div(def.baseCost, '4') : '275';
      return t2 >= 1 || cmp(souls, threshold) >= 0;
    }
    case 'tartarus_judge':
      return true;
    case 'phlegethon_forge':
    case 'obsidian_throne':
      return t4 >= 1 || cmp(souls, PHLEGETHON_SOULS) >= 0;
    default:
      return false;
  }
}

export function describeGeneratorCard(state, id, buyMode = '1') {
  const entity = state.generators.get(id);
  const def = getGenerator(id);
  if (!entity || !def) return null;

  const quantities = state.quantities();
  const revealed = isGeneratorRevealed(id, { souls: state.souls, generators: quantities });
  const costMult = state.costMult();
  const upgradeMult = state.generatorUpgradeMult(id);
  const bonus = prestigeBonus(state.obols, state.talents);
  const lineRate = mul(entity.rate(upgradeMult), bonus);
  const unitRate = mul(entity.unitRate(upgradeMult), bonus);
  const count = revealed ? resolveLotCount(buyMode, entity, state.souls, costMult) : 0;
  const cost = count > 0
    ? entity.batchCost(count, costMult)
    : entity.nextPrice(costMult);
  const canBuy = revealed && count > 0 && cmp(state.souls, cost) >= 0;
  const amort = amortizationSeconds(entity.nextPrice(costMult), unitRate);

  return {
    id,
    name: def.name,
    blurb: def.blurb,
    tier: def.tier,
    river: def.tier >= 5 ? 'phlegethon' : 'cocytus',
    revealed,
    quantity: entity.quantity,
    rate: lineRate,
    cost,
    lot: count,
    canBuy,
    amort,
  };
}

export function formatMultiplier(value) {
  return `×${formatSouls(value)}`;
}

/**
 * Entrada do Códice do Loop (Task 10a).
 * @param {{ eduLogsSeen?: string[] }|null|undefined} state
 * @param {string} id
 */
export function describeCodexEntry(state, id) {
  const def = EDU_LOGS.find((item) => item.id === id);
  if (!def) return null;
  const seen = new Set(state?.eduLogsSeen || []);
  const unlocked = seen.has(id);
  return {
    id: def.id,
    unlocked,
    title: unlocked ? def.title : CODEX_LOCKED_TITLE,
    body: unlocked ? def.body : CODEX_LOCKED_BODY,
  };
}

export function describeCodex(state) {
  const entries = EDU_LOGS.map((item) => describeCodexEntry(state, item.id)).filter(Boolean);
  const unlockedCount = entries.filter((item) => item.unlocked).length;
  return {
    entries,
    unlockedCount,
    total: entries.length,
    showList: unlockedCount > 0,
    emptyText: CODEX_EMPTY,
  };
}

export function isStyxUnlocked({ souls = '0', generators = {} } = {}) {
  const ownedAny = Object.values(generators || {}).some((qty) => Number(qty) >= 1);
  return ownedAny || cmp(souls, STYX_UNLOCK_SOULS) >= 0;
}

export function isLetheOpen(state) {
  if (!state) return false;
  if (state.prestigeCount >= 1) return true;
  if (cmp(state.obols, '0') > 0 || cmp(state.mnemosyne, '0') > 0) return true;
  if (state.canPrestige()) return true;
  return cmp(state.runSouls, LETHE_PREVIEW_RUN_SOULS) >= 0;
}

function upgradeBlurb(upgrade) {
  if (upgrade.kind === 'clickMult') return `A Foice rende ×${upgrade.factor}.`;
  if (upgrade.kind === 'generatorMult') {
    const gen = getGenerator(upgrade.generatorId);
    return `${gen?.name ?? 'O gerador'} rende ×${upgrade.factor}.`;
  }
  if (upgrade.kind === 'allGeneratorsMult') return `Todos os geradores rendem ×${upgrade.factor}.`;
  return '';
}

export function upgradeRequirementText(upgrade) {
  if (!upgrade) return '';
  const req = upgrade.requires || {};
  if (req.generatorId) {
    const gen = getGenerator(req.generatorId);
    const qty = Number(req.quantity || 0);
    const label = gen?.name ?? 'servo';
    return qty <= 1 ? `Exige ${label}` : `Exige ${qty}× ${label}`;
  }
  if (req.minSouls != null && cmp(req.minSouls, '0') > 0) {
    return `Exige ${formatSouls(req.minSouls)} almas`;
  }
  return 'Sem requisito especial';
}

export function describeUpgradeCard(state, id) {
  const upgrade = UPGRADES.find((item) => item.id === id) ?? null;
  if (!upgrade) return null;
  const quantities = state.quantities();
  const styx = isStyxUnlocked({ souls: state.souls, generators: quantities });
  const owned = state.upgrades.includes(id);
  const meets = meetsUpgradeRequirement(upgrade, { souls: state.souls, generators: quantities });
  const revealed = styx && meets;
  const canBuy = revealed && !owned && cmp(state.souls, upgrade.cost) >= 0;
  return {
    id,
    name: upgrade.name,
    blurb: upgradeBlurb(upgrade),
    requirement: upgradeRequirementText(upgrade),
    cost: upgrade.cost,
    owned,
    revealed,
    canBuy,
  };
}

export function describeTalentCard(state, id) {
  const talent = TALENTS.find((item) => item.id === id) ?? null;
  if (!talent) return null;
  const owned = state.talents.includes(id);
  const canBuy = !owned && cmp(state.mnemosyne, talent.cost) >= 0;
  return {
    id,
    name: talent.name,
    blurb: TALENT_BLURB[id] ?? '',
    cost: talent.cost,
    owned,
    canBuy,
    nextRun: id === 'memoria_das_sombras' || id === 'segundo_folego',
  };
}

export function describeVerdictCard(state, id) {
  const item = VERDICT_SHOP.find((entry) => entry.id === id) ?? null;
  if (!item) return null;
  const owned = (state.verdictPurchases || []).includes(id);
  const verdicts = Number(state.verdicts) || 0;
  const cost = Number(item.cost) || 0;
  return {
    id,
    name: item.name,
    blurb: item.blurb,
    cost,
    owned,
    canBuy: !owned && verdicts >= cost,
  };
}

export function describeLethe(state) {
  const preview = state.prestigePreview();
  const open = isLetheOpen(state);
  const canDrink = state.canPrestige();
  const bonus = prestigeBonus(state.obols, state.talents);
  const pantheonOpen = open && (
    state.prestigeCount >= 1
    || cmp(state.mnemosyne, '0') > 0
    || state.talents.length > 0
  );
  let previewText = 'A parede ainda não cedeu — o ritual não rende Óbolos.';
  if (canDrink) {
    previewText = `Esta corrida renderia ${formatSouls(preview.obolsGain)} Óbolos de Caronte e ${formatSouls(preview.mnemosyneGain)} Essência de Mnemosyne.`;
  } else if (open) {
    previewText = 'A parede já se vê, mas o ritual ainda não rende Óbolos.';
  }
  return {
    open,
    canDrink,
    preview,
    previewText,
    bonus,
    pantheonOpen,
    obols: state.obols,
    mnemosyne: state.mnemosyne,
  };
}

export class UIRenderer {
  constructor(root, options = {}) {
    this.root = root;
    this.state = options.state ?? null;
    this.buyMode = BUY_MODES.includes(options.buyMode) ? options.buyMode : '1';
    this.onBuy = typeof options.onBuy === 'function' ? options.onBuy : null;
    this.onBuyMode = typeof options.onBuyMode === 'function' ? options.onBuyMode : null;
    this.onBuyUpgrade = typeof options.onBuyUpgrade === 'function' ? options.onBuyUpgrade : null;
    this.onBuyTalent = typeof options.onBuyTalent === 'function' ? options.onBuyTalent : null;
    this.onBuyVerdict = typeof options.onBuyVerdict === 'function' ? options.onBuyVerdict : null;
    this.onOpenLethe = typeof options.onOpenLethe === 'function' ? options.onOpenLethe : null;
    this.onAmortSeen = typeof options.onAmortSeen === 'function' ? options.onAmortSeen : null;
    this._hud = null;
    this._cards = new Map();
    this._upgrades = new Map();
    this._talents = new Map();
    this._verdicts = new Map();
    this._codex = new Map();
    this._styx = null;
    this._styxTip = null;
    this._sealed = null;
    this._lethe = null;
    this._bancada = null;
    this._codexPanel = null;
    this._world = null;
    this._altar = null;
    this._modeButtons = [];
    this._mounted = false;
  }

  mount(state = this.state) {
    if (!this.root || this._mounted) return this;
    this.state = state ?? this.state;
    this._hud = {
      souls: this.root.getElementById('despertar-souls'),
      sps: this.root.getElementById('despertar-sps'),
      click: this.root.getElementById('despertar-click'),
      bonus: this.root.getElementById('despertar-bonus'),
      hint: this.root.querySelector('#acheron-altar .despertar-col__hint'),
    };
    this.#mountMarket();
    this.#bindBuyModes();
    this.#mountStyx();
    this.#mountShelves();
    this.#mountAltar();
    this.#mountLethe();
    this.#mountBancada();
    this.#mountCodex();
    this._ticker = this.root.getElementById('despertar-ticker');
    this._stats = this.root.getElementById('despertar-stats');
    this._sealed = {
      empty: this.root.getElementById('sealed-empty'),
      list: this.root.getElementById('sealed-list'),
      section: this.root.getElementById('despertar-sealed-juramentos'),
    };
    this._veil = this.root.getElementById('despertar-veil');
    if (!this._mundoHint) {
      this._mundoHint = this.root.getElementById('mundo-hint');
    }
    this._mounted = true;
    if (this.state) this.render(0, { reducedMotion: true });
    return this;
  }

  setBuyMode(mode) {
    const raw = String(mode ?? '1').trim().toLowerCase();
    const next = raw === 'máx' ? 'max' : raw;
    if (!BUY_MODES.includes(next)) return this.buyMode;
    this.buyMode = next;
    this._modeButtons.forEach((button) => {
      toggleClass(button, 'is-active', button.getAttribute('data-buy-mode') === next);
    });
    this.onBuyMode?.(next);
    if (this.state) this.#renderMarket(this.state);
    return next;
  }

  render(alpha = 0, meta = {}) {
    const state = this.state;
    if (!state || !this._mounted) return;
    const reducedMotion = Boolean(meta.reducedMotion);
    // Cookie Clicker: o número grande é o saldo real (ticks a 60 Hz já suavizam).
    // Interpolação agressiva dava a sensação de tempo acelerado.
    void alpha;
    setText(this._hud?.souls, formatSouls(state.souls));
    setText(this._hud?.sps, formatRate(state.sps()));
    setText(this._hud?.click, formatSouls(state.clickPower()));
    setText(this._hud?.bonus, formatMultiplier(prestigeBonus(state.obols, state.talents)));
    this.#renderHint(state);
    this.#renderTicker(state);
    this.#renderVeil(state);
    this.#renderMarket(state);
    this.#renderStyx(state);
    this.#renderShelves(state, { reducedMotion });
    this.#renderAltar(state, { reducedMotion });
    this.#renderStats(state);
    this.#renderLethe(state);
    this.#renderBancada(state);
    this.#renderCodex(state);
  }

  #renderHint(state) {
    if (!this._hud?.hint) return;
    if (state.clickCount < 1) {
      setText(this._hud.hint, 'A Foice de Hades espera o primeiro corte no Acheron.');
      return;
    }
    if (cmp(state.sps(), '0') > 0) {
      setText(this._hud.hint, 'O lamento do Cocytus já trabalha enquanto a Foice corta.');
      return;
    }
    setText(this._hud.hint, 'Cada corte rende almas. Contrata as sombras quando o saldo cobrir.');
  }

  #mountMarket() {
    const list = this.root.getElementById('despertar-market-list')
      || this.root.querySelector('.despertar-market-list');
    if (!list) return;
    list.replaceChildren();
    for (const def of GENERATORS) {
      const item = this.root.createElement('li');
      item.className = 'despertar-card despertar-card--store';
      item.dataset.generatorId = def.id;
      item.dataset.river = def.tier >= 5 ? 'phlegethon' : 'cocytus';

      const icon = createSpriteNode(this.root, generatorSprite(def.id), {
        className: 'despertar-card__icon despertar-sprite',
      });

      const name = this.root.createElement('p');
      name.className = 'despertar-card__name';
      name.textContent = def.name;

      const blurb = this.root.createElement('p');
      blurb.className = 'despertar-card__blurb';
      blurb.textContent = def.blurb;

      const veil = this.root.createElement('p');
      veil.className = 'despertar-card__veil';
      veil.textContent = RIVER_VEIL;
      veil.hidden = true;

      const meta = this.root.createElement('p');
      meta.className = 'despertar-card__meta';
      const rate = this.root.createElement('span');
      rate.className = 'despertar-num';
      rate.dataset.rate = '';
      rate.textContent = '0';
      meta.append(rate, '/s · ');
      const price = this.root.createElement('span');
      price.className = 'despertar-num';
      price.dataset.price = '';
      price.textContent = formatSouls(def.baseCost);
      meta.append(price);

      const owned = this.root.createElement('span');
      owned.className = 'despertar-card__owned despertar-num';
      owned.dataset.qty = '';
      owned.textContent = '0';

      const buy = this.root.createElement('button');
      buy.className = 'btn-gold';
      buy.type = 'button';
      buy.dataset.buy = def.id;
      buy.textContent = 'Contratar';
      buy.disabled = true;
      buy.addEventListener('click', () => {
        if (buy.disabled) return;
        this.onBuy?.(def.id, this.buyMode);
      });

      item.append(icon, name, meta, owned, blurb, veil, buy);
      list.append(item);
      this._cards.set(def.id, { item, blurb, veil, meta, qty: owned, rate, price, buy });
    }
  }

  #bindBuyModes() {
    const root = this.root.getElementById('river-market');
    if (!root) return;
    this._modeButtons = [...root.querySelectorAll('[data-buy-mode]')];
    this._modeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.setBuyMode(button.getAttribute('data-buy-mode'));
      });
    });
    this.setBuyMode(this.buyMode);
  }

  #renderMarket(state) {
    for (const def of GENERATORS) {
      const nodes = this._cards.get(def.id);
      if (!nodes) continue;
      const view = describeGeneratorCard(state, def.id, this.buyMode);
      if (!view) continue;

      toggleClass(nodes.item, 'is-masked', !view.revealed);
      toggleClass(nodes.item, 'is-affordable', view.revealed && view.canBuy);
      nodes.item.setAttribute('aria-disabled', String(!view.revealed));
      if (view.revealed) {
        nodes.item.removeAttribute('title');
        const nameNode = nodes.item.querySelector('.despertar-card__name');
        if (nameNode) nameNode.textContent = def.name;
      } else {
        nodes.item.setAttribute('title', RIVER_VEIL);
        const nameNode = nodes.item.querySelector('.despertar-card__name');
        if (nameNode) nameNode.textContent = '???';
      }
      if (view.revealed && view.amort != null) {
        nodes.item.title = `Amortização ~ ${formatAmortSeconds(view.amort)}`;
        this.onAmortSeen?.();
      }

      setHidden(nodes.blurb, !view.revealed);
      setHidden(nodes.veil, view.revealed);
      setHidden(nodes.meta, !view.revealed);
      setText(nodes.qty, formatOwned(view.quantity));
      setText(nodes.rate, formatRate(view.rate));
      setText(nodes.price, formatSouls(view.cost));
      setDisabled(nodes.buy, !view.canBuy);
    }
  }

  #mountStyx() {
    const strip = this.root.getElementById('styx-upgrade-strip');
    const empty = this.root.getElementById('styx-empty');
    let list = this.root.getElementById('styx-list');
    if (!list && strip) {
      list = this.root.createElement('ul');
      list.id = 'styx-list';
      list.className = 'despertar-upgrade-icons';
      strip.append(list);
    }
    if (!list) return;
    list.className = 'despertar-upgrade-icons';
    list.replaceChildren();

    let tip = this.root.getElementById('styx-tooltip');
    if (!tip) {
      tip = this.root.createElement('div');
      tip.id = 'styx-tooltip';
      tip.className = 'despertar-upgrade-tooltip';
      tip.setAttribute('role', 'tooltip');
      tip.hidden = true;
      const nameEl = this.root.createElement('p');
      nameEl.className = 'despertar-upgrade-tooltip__name';
      nameEl.dataset.tip = 'name';
      const blurbEl = this.root.createElement('p');
      blurbEl.className = 'despertar-upgrade-tooltip__blurb';
      blurbEl.dataset.tip = 'blurb';
      const costEl = this.root.createElement('p');
      costEl.className = 'despertar-upgrade-tooltip__cost';
      costEl.dataset.tip = 'cost';
      const reqEl = this.root.createElement('p');
      reqEl.className = 'despertar-upgrade-tooltip__req';
      reqEl.dataset.tip = 'req';
      tip.append(nameEl, blurbEl, costEl, reqEl);
      // Fora da strip (overflow) — senão o custo some cortado.
      const mountParent = this.root.body || this.root.documentElement || strip;
      mountParent?.append?.(tip);
    }
    this._styxTip = tip
      ? {
        root: tip,
        name: tip.querySelector('[data-tip="name"]'),
        blurb: tip.querySelector('[data-tip="blurb"]'),
        cost: tip.querySelector('[data-tip="cost"]'),
        req: tip.querySelector('[data-tip="req"]'),
        activeId: null,
      }
      : null;

    this._styx = { empty, list, strip };
    this._styxKeyHandler = (event) => {
      if (event.key === 'Escape') this.#hideStyxTip();
    };
    this.root.addEventListener?.('keydown', this._styxKeyHandler);

    for (const def of UPGRADES) {
      const item = this.root.createElement('li');
      item.hidden = true;

      const buy = this.root.createElement('button');
      buy.className = 'despertar-upgrade-icon';
      buy.type = 'button';
      buy.dataset.buyUpgrade = def.id;
      buy.setAttribute('aria-label', def.name);
      buy.disabled = true;

      const sprite = createSpriteNode(this.root, upgradeSprite(def.id), {
        className: 'despertar-upgrade-icon__sprite despertar-sprite',
      });
      buy.append(sprite);

      buy.addEventListener('click', () => {
        if (buy.disabled) return;
        this.onBuyUpgrade?.(def.id);
      });
      buy.addEventListener('pointerenter', () => this.#showStyxTip(def.id, buy));
      buy.addEventListener('pointerleave', () => this.#hideStyxTip(def.id));
      buy.addEventListener('focus', () => this.#showStyxTip(def.id, buy));
      buy.addEventListener('blur', () => this.#hideStyxTip(def.id));

      item.append(buy);
      list.append(item);
      this._upgrades.set(def.id, {
        item,
        blurb: null,
        meta: null,
        price: null,
        buy,
      });
    }
  }

  #showStyxTip(id, anchor) {
    const tip = this._styxTip;
    if (!tip?.root || !anchor || !this.state) return;
    const view = describeUpgradeCard(this.state, id);
    if (!view || view.owned) return;
    setText(tip.name, view.name);
    setText(tip.blurb, view.blurb);
    setText(tip.cost, `Custo: ${formatSouls(view.cost)} almas`);
    const req = view.requirement && view.requirement !== 'Sem requisito especial'
      ? view.requirement
      : '';
    setText(tip.req, req);
    setHidden(tip.req, !req);
    tip.activeId = id;
    tip.root.hidden = false;
    tip.root.classList.remove('is-below');
    tip.root.classList.add('is-fixed');
    anchor.setAttribute('aria-describedby', 'styx-tooltip');

    const btnBox = anchor.getBoundingClientRect?.();
    if (!btnBox) return;

    // Medir depois de preencher o texto (custo inclusivo).
    const tipWidth = tip.root.offsetWidth || 220;
    const tipHeight = tip.root.offsetHeight || 110;
    const gap = 8;
    const vw = typeof globalThis.innerWidth === 'number' ? globalThis.innerWidth : btnBox.right + tipWidth;
    const vh = typeof globalThis.innerHeight === 'number' ? globalThis.innerHeight : btnBox.bottom + tipHeight;

    let left = btnBox.left + (btnBox.width / 2) - (tipWidth / 2);
    left = Math.max(8, Math.min(left, vw - tipWidth - 8));

    const spaceAbove = btnBox.top - gap;
    const placeBelow = spaceAbove < tipHeight && (vh - btnBox.bottom) > spaceAbove;
    tip.root.classList.toggle('is-below', placeBelow);
    const top = placeBelow
      ? btnBox.bottom + gap
      : btnBox.top - tipHeight - gap;

    tip.root.style.left = `${Math.round(left)}px`;
    tip.root.style.top = `${Math.round(Math.max(8, top))}px`;
  }

  #hideStyxTip(id = null) {
    const tip = this._styxTip;
    if (!tip?.root) return;
    if (id != null && tip.activeId && tip.activeId !== id) return;
    tip.root.hidden = true;
    tip.activeId = null;
    for (const nodes of this._upgrades.values()) {
      nodes.buy?.removeAttribute('aria-describedby');
    }
  }

  #renderStyx(state) {
    if (!this._styx) return;
    const unlocked = isStyxUnlocked({ souls: state.souls, generators: state.quantities() });
    let visible = 0;
    for (const def of UPGRADES) {
      const nodes = this._upgrades.get(def.id);
      const view = describeUpgradeCard(state, def.id);
      if (!nodes || !view) continue;
      const sealing = nodes.buy.classList.contains('is-sealing');
      // F4: owned some da strip (Cookie); is-sealing mantém o ícone até o juice acabar.
      const show = unlocked && view.revealed && (!view.owned || sealing);
      setHidden(nodes.item, !show);
      if (show) visible += 1;
      toggleClass(nodes.buy, 'is-affordable', show && view.canBuy);
      toggleClass(nodes.buy, 'is-locked', show && !view.canBuy && !view.owned);
      toggleClass(nodes.buy, 'is-owned', false);
      setDisabled(nodes.buy, !view.canBuy);
    }
    const showList = unlocked && visible > 0;
    setHidden(this._styx.empty, showList);
    setHidden(this._styx.list, !showList);
    if (this._styx.empty && !showList) setText(this._styx.empty, STYX_EMPTY);
    if (this._styxTip?.activeId) {
      const active = this._upgrades.get(this._styxTip.activeId);
      if (!active || active.item.hidden) this.#hideStyxTip();
    }
  }

  #mountShelves() {
    const host = this.root.getElementById('despertar-shelves');
    if (!host) return;
    this._mundoHint = this.root.getElementById('mundo-hint');
    this._world = new WorldView({
      document: this.root,
      isGeneratorRevealed,
    }).mount(host, this._mundoHint);
  }

  #mountAltar() {
    this._altar = new AltarOrbit({ document: this.root }).mount({
      orbitHost: this.root.getElementById('despertar-reap-orbit'),
      particleLayer: this.root.querySelector('[data-particle-layer]'),
      veil: this.root.getElementById('despertar-veil'),
    });
  }

  #renderShelves(state, meta = {}) {
    if (!this._world) return;
    this._world.sync(state, {
      reducedMotion: Boolean(meta.reducedMotion),
    });
  }

  #renderAltar(state, meta = {}) {
    if (!this._altar) return;
    this._altar.sync(state, {
      reducedMotion: Boolean(meta.reducedMotion),
    });
    this._altar.frame();
  }

  #renderTicker(state) {
    if (!this._ticker) return;
    const seen = state.eduLogsSeen || [];
    if (seen.length) {
      const lastId = seen[seen.length - 1];
      const last = EDU_LOG_BY_ID[lastId] || EDU_LOGS.find((entry) => entry.id === lastId);
      if (last) {
        setText(this._ticker, `Rumor: ${last.title} — ${last.body}`);
        return;
      }
    }
    if (state.clickCount < 1) {
      setText(this._ticker, 'Rumor do Submundo: a Foice ainda não cortou.');
      return;
    }
    if (cmp(state.sps(), '0') > 0) {
      setText(this._ticker, 'Rumor: o Cocytus lamuria — as Almas / s já fluem sozinhas.');
      return;
    }
    setText(this._ticker, 'Rumor: as Sombras orbitam a Foice; os demais servos povoam as prateleiras do Mundo.');
  }

  #renderVeil(state) {
    if (!this._veil) return;
    const pct = veilPercent(state);
    this._veil.style.setProperty('--despertar-veil', `${pct}%`);
    toggleClass(this._veil, 'is-milk', pct > 10);
    this._veil.hidden = false;
  }

  #renderStats(state) {
    if (!this._stats) return;
    const set = (key, value) => {
      const node = this._stats.querySelector(`[data-stat="${key}"]`);
      setText(node, value);
    };
    set('souls', formatSouls(state.souls));
    set('lifetime', formatSouls(state.lifetimeSouls));
    set('run', formatSouls(state.runSouls));
    set('sps', formatRate(state.sps()));
    set('clicks', formatOwned(state.clickCount));
    set('session', `${Math.floor(Number(state.sessionSeconds) || 0)} s`);
    set('prestige', formatOwned(state.prestigeCount));
    set('obols', formatSouls(state.obols));
    set('mnemosyne', formatSouls(state.mnemosyne));
    set('verdicts', formatOwned(state.verdicts));
    set('juizoBest', formatOwned(state.juizoBestStreak));
    this.#renderSealed(state);
  }

  #renderSealed(state) {
    const sealed = this._sealed;
    if (!sealed?.list) return;
    const ownedIds = Array.isArray(state.upgrades) ? state.upgrades.filter(Boolean) : [];
    const signature = ownedIds.join('\0');
    if (sealed._signature === signature) return;
    sealed._signature = signature;

    sealed.list.replaceChildren();
    for (const id of ownedIds) {
      const def = UPGRADES.find((item) => item.id === id);
      if (!def) continue;
      const li = this.root.createElement('li');
      li.className = 'despertar-sealed-chip';
      li.dataset.sealedUpgrade = def.id;
      const sprite = createSpriteNode(this.root, upgradeSprite(def.id), {
        className: 'despertar-sealed-chip__sprite despertar-sprite',
      });
      const label = this.root.createElement('span');
      label.className = 'despertar-sealed-chip__name';
      label.textContent = def.name;
      li.append(sprite, label);
      sealed.list.append(li);
    }
    const has = ownedIds.some((id) => UPGRADES.some((item) => item.id === id));
    setHidden(sealed.empty, has);
    setHidden(sealed.list, !has);
  }

  #mountLethe() {
    const panel = this.root.getElementById('panel-lethe');
    if (!panel) return;
    this._lethe = {
      locked: this.root.getElementById('lethe-locked'),
      open: this.root.getElementById('lethe-open'),
      obols: this.root.getElementById('lethe-obols'),
      mnemosyne: this.root.getElementById('lethe-mnemosyne'),
      preview: this.root.getElementById('lethe-preview'),
      ritual: this.root.getElementById('lethe-ritual'),
      pantheonEmpty: this.root.getElementById('pantheon-empty'),
      pantheonList: this.root.getElementById('pantheon-list'),
    };
    if (this._lethe.locked && !this._lethe.locked.textContent.trim()) {
      this._lethe.locked.textContent = LETHE_EMPTY;
    }
    this._lethe.ritual?.addEventListener('click', () => {
      if (this._lethe.ritual.disabled) return;
      this.onOpenLethe?.();
    });
    const list = this._lethe.pantheonList;
    if (!list) return;
    list.replaceChildren();
    for (const def of TALENTS) {
      const item = this.root.createElement('li');
      item.className = 'despertar-card';
      item.dataset.talentId = def.id;

      const name = this.root.createElement('p');
      name.className = 'despertar-card__name';
      name.textContent = def.name;

      const blurb = this.root.createElement('p');
      blurb.className = 'despertar-card__blurb';
      blurb.textContent = TALENT_BLURB[def.id] ?? '';

      const meta = this.root.createElement('p');
      meta.className = 'despertar-card__meta';
      const price = this.root.createElement('span');
      price.className = 'despertar-num';
      price.dataset.price = '';
      price.textContent = formatSouls(def.cost);
      meta.append(price, ' essência');

      const buy = this.root.createElement('button');
      buy.className = 'btn-gold';
      buy.type = 'button';
      buy.dataset.buyTalent = def.id;
      buy.textContent = 'Selar';
      buy.disabled = true;
      buy.addEventListener('click', () => {
        if (buy.disabled) return;
        this.onBuyTalent?.(def.id);
      });

      item.append(name, blurb, meta, buy);
      list.append(item);
      this._talents.set(def.id, { item, blurb, price, buy });
    }
  }

  #renderLethe(state) {
    if (!this._lethe) return;
    const view = describeLethe(state);
    setHidden(this._lethe.locked, view.open);
    setHidden(this._lethe.open, !view.open);
    if (!view.open && this._lethe.locked) setText(this._lethe.locked, LETHE_EMPTY);
    if (!view.open) return;

    setText(this._lethe.obols, formatSouls(view.obols));
    setText(this._lethe.mnemosyne, formatSouls(view.mnemosyne));
    setText(this._lethe.preview, view.previewText);
    setDisabled(this._lethe.ritual, !view.canDrink);

    setHidden(this._lethe.pantheonEmpty, view.pantheonOpen);
    setHidden(this._lethe.pantheonList, !view.pantheonOpen);
    if (!view.pantheonOpen && this._lethe.pantheonEmpty) {
      setText(this._lethe.pantheonEmpty, PANTHEON_EMPTY);
    }
    if (!view.pantheonOpen) return;

    for (const def of TALENTS) {
      const nodes = this._talents.get(def.id);
      const card = describeTalentCard(state, def.id);
      if (!nodes || !card) continue;
      toggleClass(nodes.item, 'is-owned', card.owned);
      setText(nodes.price, formatSouls(card.cost));
      setText(nodes.buy, card.owned ? 'Na memória' : 'Selar');
      setDisabled(nodes.buy, !card.canBuy);
    }
  }

  #mountBancada() {
    const panel = this.root.getElementById('panel-bancada');
    if (!panel) return;
    this._bancada = {
      verdicts: this.root.getElementById('bancada-verdicts'),
      hint: this.root.getElementById('bancada-hint'),
      list: this.root.getElementById('bancada-list'),
    };
    const list = this._bancada.list;
    if (!list) return;
    list.replaceChildren();
    for (const def of VERDICT_SHOP) {
      const item = this.root.createElement('li');
      item.className = 'despertar-card';
      item.dataset.verdictId = def.id;

      const name = this.root.createElement('p');
      name.className = 'despertar-card__name';
      name.textContent = def.name;

      const blurb = this.root.createElement('p');
      blurb.className = 'despertar-card__blurb';
      blurb.textContent = def.blurb;

      const meta = this.root.createElement('p');
      meta.className = 'despertar-card__meta';
      const price = this.root.createElement('span');
      price.className = 'despertar-num';
      price.dataset.price = '';
      price.textContent = String(def.cost);
      meta.append(price, ' Vereditos');

      const buy = this.root.createElement('button');
      buy.className = 'btn-gold';
      buy.type = 'button';
      buy.dataset.buyVerdict = def.id;
      buy.textContent = 'Comprar';
      buy.disabled = true;
      buy.addEventListener('click', () => {
        if (buy.disabled) return;
        this.onBuyVerdict?.(def.id);
      });

      item.append(name, blurb, meta, buy);
      list.append(item);
      this._verdicts.set(def.id, { item, price, buy });
    }
  }

  #renderBancada(state) {
    if (!this._bancada) return;
    setText(this._bancada.verdicts, String(Number(state.verdicts) || 0));
    for (const def of VERDICT_SHOP) {
      const nodes = this._verdicts.get(def.id);
      const card = describeVerdictCard(state, def.id);
      if (!nodes || !card) continue;
      toggleClass(nodes.item, 'is-owned', card.owned);
      setText(nodes.price, String(card.cost));
      setText(nodes.buy, card.owned ? 'Na Bancada' : 'Comprar');
      setDisabled(nodes.buy, !card.canBuy);
    }
  }

  #mountCodex() {
    const panel = this.root.getElementById('panel-codex');
    if (!panel) return;
    let empty = this.root.getElementById('codex-empty');
    if (!empty) {
      empty = panel.querySelector('.despertar-empty');
      if (empty) empty.id = 'codex-empty';
    }
    let list = this.root.getElementById('codex-list');
    if (!list) {
      list = this.root.createElement('ol');
      list.id = 'codex-list';
      list.className = 'despertar-codex-list';
      list.hidden = true;
      panel.append(list);
    }
    list.replaceChildren();
    this._codex.clear();
    this._codexPanel = { empty, list };
    for (const def of EDU_LOGS) {
      const item = this.root.createElement('li');
      item.className = 'despertar-codex-entry is-locked';
      item.dataset.logId = def.id;

      const title = this.root.createElement('p');
      title.className = 'despertar-codex-entry__title';
      title.textContent = CODEX_LOCKED_TITLE;

      const body = this.root.createElement('p');
      body.className = 'despertar-codex-entry__body';
      body.textContent = CODEX_LOCKED_BODY;

      item.append(title, body);
      list.append(item);
      this._codex.set(def.id, { item, title, body });
    }
  }

  #renderCodex(state) {
    if (!this._codexPanel) return;
    const view = describeCodex(state);
    setHidden(this._codexPanel.empty, view.showList);
    setHidden(this._codexPanel.list, !view.showList);
    if (this._codexPanel.empty && !view.showList) {
      setText(this._codexPanel.empty, view.emptyText);
    }
    if (!view.showList) return;

    for (const entry of view.entries) {
      const nodes = this._codex.get(entry.id);
      if (!nodes) continue;
      toggleClass(nodes.item, 'is-locked', !entry.unlocked);
      toggleClass(nodes.item, 'is-unlocked', entry.unlocked);
      setText(nodes.title, entry.title);
      setText(nodes.body, entry.body);
    }
  }
}
