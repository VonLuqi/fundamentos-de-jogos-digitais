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
import { GENERATORS, getGenerator } from '../config/generators.js';
import { TALENTS } from '../config/talents.js';
import { UPGRADES } from '../config/upgrades.js';
import { add, cmp, div, mul } from '../core/decimal.js';
import {
  amortizationSeconds,
  meetsUpgradeRequirement,
  prestigeBonus,
} from '../core/formulas.js';
import { formatAmortSeconds, formatOwned, formatRate, formatSouls } from './NumberFormatter.js';

const RIVER_VEIL = 'Este rio ainda não aceita teu nome.';
const STYX_EMPTY = 'Os juramentos do Styx exigem servos — ou um punhado de almas.';
const LETHE_EMPTY = 'O Lethe só se abre quando a corrida encontra a parede.';
const PANTHEON_EMPTY = 'Mnemosyne ainda não bebeu tua memória.';

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
  if (reducedMotion) return souls;
  const fraction = Number(alpha);
  if (!Number.isFinite(fraction) || fraction <= 0) return souls;
  return add(souls, mul(sps, String(fraction / TICK_FPS)));
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

export function describeUpgradeCard(state, id) {
  const upgrade = UPGRADES.find((item) => item.id === id) ?? null;
  if (!upgrade) return null;
  const quantities = state.quantities();
  const styx = isStyxUnlocked({ souls: state.souls, generators: quantities });
  const owned = state.upgrades.includes(id);
  const meets = meetsUpgradeRequirement(upgrade, { souls: state.souls, generators: quantities });
  const revealed = styx && (owned || meets);
  const canBuy = revealed && !owned && cmp(state.souls, upgrade.cost) >= 0;
  return {
    id,
    name: upgrade.name,
    blurb: upgradeBlurb(upgrade),
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
    this.onOpenLethe = typeof options.onOpenLethe === 'function' ? options.onOpenLethe : null;
    this._hud = null;
    this._cards = new Map();
    this._upgrades = new Map();
    this._talents = new Map();
    this._styx = null;
    this._lethe = null;
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
    this.#mountLethe();
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
    const souls = interpolatedSouls(state.souls, state.sps(), alpha, reducedMotion);
    setText(this._hud?.souls, formatSouls(souls));
    setText(this._hud?.sps, formatRate(state.sps()));
    setText(this._hud?.click, formatSouls(state.clickPower()));
    setText(this._hud?.bonus, formatMultiplier(prestigeBonus(state.obols, state.talents)));
    this.#renderHint(state);
    this.#renderMarket(state);
    this.#renderStyx(state);
    this.#renderLethe(state);
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
      item.className = 'despertar-card';
      item.dataset.generatorId = def.id;
      item.dataset.river = def.tier >= 5 ? 'phlegethon' : 'cocytus';

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
      meta.append('Possuídas ');
      const qty = this.root.createElement('span');
      qty.className = 'despertar-num';
      qty.dataset.qty = '';
      qty.textContent = '0';
      meta.append(qty, ' · ');
      const rate = this.root.createElement('span');
      rate.className = 'despertar-num';
      rate.dataset.rate = '';
      rate.textContent = '0';
      meta.append(rate, '/s · ');
      const price = this.root.createElement('span');
      price.className = 'despertar-num';
      price.dataset.price = '';
      price.textContent = formatSouls(def.baseCost);
      meta.append(price, ' almas');

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

      item.append(name, blurb, veil, meta, buy);
      list.append(item);
      this._cards.set(def.id, { item, blurb, veil, meta, qty, rate, price, buy });
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
      nodes.item.setAttribute('aria-disabled', String(!view.revealed));
      if (view.revealed) {
        nodes.item.removeAttribute('title');
      } else {
        nodes.item.setAttribute('title', RIVER_VEIL);
      }
      if (view.revealed && view.amort != null) {
        nodes.item.title = `Amortização ~ ${formatAmortSeconds(view.amort)}`;
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
    const panel = this.root.getElementById('panel-styx');
    if (!panel) return;
    let empty = this.root.getElementById('styx-empty');
    if (!empty) {
      empty = panel.querySelector('.despertar-empty');
      if (empty) empty.id = 'styx-empty';
    }
    let list = this.root.getElementById('styx-list');
    if (!list) {
      list = this.root.createElement('ul');
      list.id = 'styx-list';
      list.className = 'despertar-market-list';
      panel.append(list);
    }
    list.replaceChildren();
    this._styx = { empty, list };
    for (const def of UPGRADES) {
      const item = this.root.createElement('li');
      item.className = 'despertar-card';
      item.dataset.upgradeId = def.id;
      item.hidden = true;

      const name = this.root.createElement('p');
      name.className = 'despertar-card__name';
      name.textContent = def.name;

      const blurb = this.root.createElement('p');
      blurb.className = 'despertar-card__blurb';
      blurb.textContent = upgradeBlurb(def);

      const meta = this.root.createElement('p');
      meta.className = 'despertar-card__meta';
      const price = this.root.createElement('span');
      price.className = 'despertar-num';
      price.dataset.price = '';
      price.textContent = formatSouls(def.cost);
      meta.append(price, ' almas');

      const buy = this.root.createElement('button');
      buy.className = 'btn-gold';
      buy.type = 'button';
      buy.dataset.buyUpgrade = def.id;
      buy.textContent = 'Jurar';
      buy.disabled = true;
      buy.addEventListener('click', () => {
        if (buy.disabled) return;
        this.onBuyUpgrade?.(def.id);
      });

      item.append(name, blurb, meta, buy);
      list.append(item);
      this._upgrades.set(def.id, { item, blurb, meta, price, buy });
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
      setHidden(nodes.item, !view.revealed);
      if (view.revealed) visible += 1;
      toggleClass(nodes.item, 'is-owned', view.owned);
      setText(nodes.price, formatSouls(view.cost));
      setText(nodes.buy, view.owned ? 'Jurado' : 'Jurar');
      setDisabled(nodes.buy, !view.canBuy);
    }
    const showList = unlocked && visible > 0;
    setHidden(this._styx.empty, showList);
    setHidden(this._styx.list, !showList);
    if (this._styx.empty && !showList) setText(this._styx.empty, STYX_EMPTY);
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
}
