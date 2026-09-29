/**
 * Renderer cirúrgico de O Despertar.
 * Monta o mercado uma vez; o loop só atualiza textContent / disabled / classes.
 * Proibido recriar a lista a 60 Hz.
 */

import {
  BUY_MAX_CAP,
  BUY_MODES,
  COCYTUS_T2_SOULS,
  LETHE_PREVIEW_RUN_SOULS,
  PHLEGETHON_SOULS,
  GOLD_MULT,
  NEGATIVO_MULT,
  STYX_UNLOCK_SOULS,
  TICK_FPS,
} from '../config/constants.js';
import { EDU_LOG_BY_ID, EDU_LOG_TICKER_IDS, eduLogTickerPhrase } from '../config/edu-logs.js';
import { GENERATORS, getGenerator } from '../config/generators.js';
import {
  RUMOR_INTERRUPT_MS,
  RUMOR_ROTATE_MS,
  SHINY_FIRST_TICKER,
  GOLD_FIRST_TICKER,
  buildRumorPool,
  pickRumor,
  rumorPoolSignature,
} from '../config/rumors.js';
import { TALENTS } from '../config/talents.js';
import { UPGRADES, getUpgrade } from '../config/upgrades.js';
import { VERDICT_SHOP } from '../config/verdict-shop.js';
import { JUIZO_BANCADA_HINT } from '../config/juizo-pool.js';
import { add, cmp, div, mul } from '../core/decimal.js';
import {
  amortizationSeconds,
  economyEffects,
  effectiveUnitSPS,
  lineSPS,
  meetsUpgradeRequirement,
  prestigeBonus,
  talentEffects,
} from '../core/formulas.js';
import { formatAmortSeconds, formatOwned, formatRate, formatSouls } from './NumberFormatter.js';
import { AltarOrbit, veilPercent } from './world/AltarOrbit.js';
import { createSpriteNode, generatorSprite, upgradeSprite } from './world/SpriteAtlas.js';
import { WorldView } from './world/WorldView.js';
import { bindMarquee, setMarqueeText } from './Marquee.js';
import { juiceBumpClass, juicePrefersReducedMotion, flashLetheUnlock, showTutorialToast } from './juice.js';
import { CodexBook, describeCodex, describeCodexEntry } from './CodexBook.js';
import {
  BANCADA_EMPTY_AVAILABLE,
  BANCADA_EMPTY_OWNED,
  PANTHEON_EMPTY_AVAILABLE,
  PANTHEON_EMPTY_OWNED,
  SHOP_OWNED_BADGE,
  bindSubTabs,
  defaultShopSubTab,
  partitionShopCatalog,
  shopTabLabel,
} from './subTabs.js';

export { describeCodex, describeCodexEntry };
export {
  BANCADA_EMPTY_AVAILABLE,
  BANCADA_EMPTY_OWNED,
  PANTHEON_EMPTY_AVAILABLE,
  PANTHEON_EMPTY_OWNED,
  SHOP_OWNED_BADGE,
  partitionShopCatalog,
  shopTabLabel,
  defaultShopSubTab,
};

const RIVER_VEIL = 'Este rio ainda não aceita teu nome.';
const STYX_EMPTY = 'Os juramentos do Styx exigem servos — ou um punhado de almas.';
const LETHE_EMPTY = 'O Lethe só se abre quando a corrida encontra a parede.';
/** Ticker one-shot na primeira abertura do Lethe (Fase C / C1) — alinhado ao edu-log. */
export const LETHE_UNLOCK_TICKER =
  eduLogTickerPhrase(EDU_LOG_BY_ID.log_lethe_unlock)
  || 'O Lethe se abre — a memória do Submundo te espera.';
const LETHE_UNLOCK_HOLD_MS = 5_000;
const EDU_LOG_TICKER_HOLD_MS = 5_000;
/** Copy curta do toast first-unlock (C3). */
const LETHE_TUTORIAL_TOAST =
  'O Lethe se abre. Confira a aba Lethe — o livro do Códice também ganhou uma página.';
const PANTHEON_EMPTY = 'Mnemosyne ainda não bebeu tua memória.';

/** Copy do tip de NPC (G3.2) — shelf/órbita = uma unidade. */
export const NPC_UNIT_PRODUCTION_BLURB = 'produção desta unidade';

const TALENT_BLURB = Object.freeze({
  memoria_das_sombras: 'A próxima corrida começa com 100 almas.',
  juramento_eterno: 'A memória de Mnemosyne rende 10% a mais no bônus.',
  noite_prolongada: 'A colheita na ausência vai até 12 h.',
  veu_eficiente: 'A ausência colhe 100% das Almas / s.',
  foice_ancestral: 'O clique ganha 1% das Almas / s — vale já nesta corrida.',
  favor_de_caronte: 'Geradores custam 5% menos — vale já nesta corrida.',
  mnemosyne_profunda: 'A essência rende 25% a mais no bônus.',
  segundo_folego: 'A próxima corrida começa com 1 Sombra Vagante.',
  margem_generosa: 'A próxima corrida começa com +250 almas.',
  pacto_do_silencio: 'A colheita na ausência ganha +2 h de teto.',
  olho_da_curva: 'Amortização sempre visível no Mercado — sem números de SPS.',
  eco_do_styx: 'Após o Lethe, 1 Juramento Styx revelado começa selado.',
  rebanho_despertado: 'A próxima corrida começa com 3 Sombras Vagantes.',
});

const TALENT_NEXT_RUN = Object.freeze(new Set([
  'memoria_das_sombras',
  'segundo_folego',
  'margem_generosa',
  'rebanho_despertado',
  'eco_do_styx',
]));

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
  return Math.min(n, BUY_MAX_CAP);
}

function resolveLotCountFree(mode) {
  const raw = String(mode ?? '1').trim().toLowerCase();
  if (raw === 'max' || raw === 'máx' || raw === 'maximo' || raw === 'máximo') {
    return BUY_MAX_CAP;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, BUY_MAX_CAP);
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
 * T4 1× T3 ou almas ≥ BaseCost/4; T5–T6 Phlegethon (1× T4 ou ≥ PHLEGETHON_SOULS).
 */
export function isGeneratorRevealed(id, { souls = '0', generators = {} } = {}) {
  const qty = generators && typeof generators === 'object' ? generators : {};
  const t1 = Number(qty.wandering_shade || 0);
  const t2 = Number(qty.charon_servants || 0);
  const t3 = Number(qty.cerberian_hound || 0);
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
    case 'tartarus_judge': {
      const def = getGenerator(id);
      const threshold = def ? div(def.baseCost, '4') : '3000';
      return t3 >= 1 || cmp(souls, threshold) >= 0;
    }
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
  const { spsVerdictMult } = economyEffects(state.talents, state.verdictPurchases);
  const shinyMap = typeof state.shinyCounts === 'function'
    ? state.shinyCounts()
    : (state.shinyCounts || {});
  const goldMap = typeof state.goldCounts === 'function'
    ? state.goldCounts()
    : (state.goldCounts || {});
  const shiny = Number(shinyMap?.[id] || 0);
  const gold = Number(goldMap?.[id] || 0);
  const baseLine = lineSPS({
    qty: entity.quantity,
    shiny,
    gold,
    baseRate: def.baseRate,
    upgradeMult,
  });
  const lineRate = mul(mul(baseLine, bonus), spsVerdictMult);
  const unitRate = effectiveUnitSPS({
    generatorId: id,
    upgrades: state.upgrades || [],
    talents: state.talents || [],
    obols: state.obols ?? '0',
    verdictPurchases: state.verdictPurchases || [],
    rarity: 'normal',
  });
  const free = Boolean(state.debugFlags?.freeShopping);
  const count = revealed
    ? (free ? resolveLotCountFree(buyMode) : resolveLotCount(buyMode, entity, state.souls, costMult))
    : 0;
  const cost = free
    ? '0'
    : (count > 0 ? entity.batchCost(count, costMult) : entity.nextPrice(costMult));
  const canBuy = revealed && count > 0 && (free || cmp(state.souls, cost) >= 0);
  const amort = amortizationSeconds(entity.nextPrice(costMult), unitRate);

  return {
    id,
    name: def.name,
    blurb: def.blurb,
    tier: def.tier,
    river: def.tier >= 5 ? 'phlegethon' : 'cocytus',
    revealed,
    quantity: entity.quantity,
    /** SPS da linha (todas as unidades, incl. negativo/gold) — mercado. */
    rate: lineRate,
    /** SPS de uma unidade normal (amortização / tip base). */
    unitRate,
    cost,
    lot: count,
    canBuy,
    amort,
  };
}

/**
 * Tooltip de NPC (órbita / prateleira) — SPS efetiva da **unidade** (G3.1–G3.2 / Q7).
 * Distinto do card do mercado, que mostra a linha total.
 *
 * @param {object} state
 * @param {string} generatorId
 * @param {{ shiny?: boolean, gold?: boolean, rarity?: 'normal'|'negativo'|'gold' }} [opts]
 */
export function describeNpcUnit(state, generatorId, opts = {}) {
  const def = getGenerator(generatorId);
  if (!def || !state) return null;
  const rarity = opts.rarity
    || (opts.gold ? 'gold' : (opts.shiny ? 'negativo' : 'normal'));
  const rate = effectiveUnitSPS({
    generatorId,
    upgrades: state.upgrades || [],
    talents: state.talents || [],
    obols: state.obols ?? '0',
    verdictPurchases: state.verdictPurchases || [],
    rarity,
  });
  return {
    id: generatorId,
    name: def.name,
    rate,
    rarity,
    shiny: rarity === 'negativo',
    gold: rarity === 'gold',
    blurb: NPC_UNIT_PRODUCTION_BLURB,
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
  // Q16 / J.1 — Juramentos T4 ≠ Vereditos do minigame Juízo.
  if (upgrade.id === 'veredito_tartaro' || upgrade.id === 'lei_inquebravel') {
    return `Juramento do Styx: ×${upgrade.factor} no Juiz do Tártaro (gerador). Não é Veredito do Juízo.`;
  }
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
  if (req.upgradeId) {
    const prev = getUpgrade(req.upgradeId);
    return `Exige ${prev?.name ?? 'juramento anterior'}`;
  }
  if (Array.isArray(req.allUpgradeIds) && req.allUpgradeIds.length > 0) {
    const names = req.allUpgradeIds
      .map((id) => getUpgrade(id)?.name ?? String(id))
      .join(', ');
    return `Exige ${names}`;
  }
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
  const meets = meetsUpgradeRequirement(upgrade, {
    souls: state.souls,
    generators: quantities,
    upgrades: state.upgrades,
  });
  // D-D1: owned N+1 sem N continua visível como owned (selados/efeitos);
  // só o reveal da strip exige meets (N+1 hidden até comprar N).
  const revealed = styx && (owned || meets);
  const free = Boolean(state.debugFlags?.freeShopping);
  const canBuy = revealed && !owned && meets && (free || cmp(state.souls, upgrade.cost) >= 0);
  return {
    id,
    name: upgrade.name,
    blurb: upgradeBlurb(upgrade),
    requirement: upgradeRequirementText(upgrade),
    cost: free ? '0' : upgrade.cost,
    owned,
    revealed,
    canBuy,
  };
}

/**
 * Ordena a strip Styx (Fase D / D3).
 * Tier A: canBuy, custo crescente (empate = ordem do catálogo).
 * Tier B: revealed && !canBuy, ordem do catálogo.
 * @param {{ id: string, canBuy: boolean, cost: string|number, catalogIndex: number }[]} cards
 * @returns {string[]} ids na ordem de exibição
 */
export function sortStyxVisible(cards = []) {
  const list = Array.isArray(cards) ? cards.filter(Boolean) : [];
  const tierA = [];
  const tierB = [];
  for (const card of list) {
    if (card.canBuy) tierA.push(card);
    else tierB.push(card);
  }
  tierA.sort((a, b) => {
    const byCost = cmp(a.cost ?? '0', b.cost ?? '0');
    if (byCost !== 0) return byCost;
    return (Number(a.catalogIndex) || 0) - (Number(b.catalogIndex) || 0);
  });
  tierB.sort(
    (a, b) => (Number(a.catalogIndex) || 0) - (Number(b.catalogIndex) || 0),
  );
  return [...tierA, ...tierB].map((card) => card.id);
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
    nextRun: TALENT_NEXT_RUN.has(id),
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

/** Ordem de grandeza do SPS (G5.1) — -1 se ≤ 0. */
export function spsOrderOfMagnitude(sps) {
  const n = Number(sps);
  if (!Number.isFinite(n) || n <= 0) return -1;
  return Math.floor(Math.log10(n));
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
  const permanents = countLethePermanents(state);
  return {
    open,
    canDrink,
    preview,
    previewText,
    bonus,
    pantheonOpen,
    obols: state.obols,
    mnemosyne: state.mnemosyne,
    ...permanents,
    memoryPreviewText: formatLetheMemoryPreview(permanents),
    memoryToastText: formatLetheMemoryToast(permanents),
  };
}

/** Contagens permanentes que sobrevivem ao Lethe (F3). */
export function countLethePermanents(state) {
  const talentCount = Array.isArray(state?.talents) ? state.talents.length : 0;
  const verdictCount = Array.isArray(state?.verdictPurchases)
    ? state.verdictPurchases.length
    : 0;
  return { talentCount, verdictCount };
}

/** Copy 0F — bloco preview do painel / modal. */
export function formatLetheMemoryPreview({ talentCount = 0, verdictCount = 0 } = {}) {
  return `Memória que permanece · Óbolos · ${talentCount} talentos · ${verdictCount} sentenças da Bancada`;
}

/** Copy 0F — toast pós-ritual. */
export function formatLetheMemoryToast({ talentCount = 0, verdictCount = 0 } = {}) {
  return `Memória preservada: ${talentCount} talentos · ${verdictCount} sentenças`;
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
    this.onLetheFirstUnlock =
      typeof options.onLetheFirstUnlock === 'function' ? options.onLetheFirstUnlock : null;
    this.getUserId = typeof options.getUserId === 'function' ? options.getUserId : () => null;
    this._hud = null;
    this._cards = new Map();
    this._upgrades = new Map();
    this._talents = new Map();
    this._verdicts = new Map();
    this._styx = null;
    this._styxTip = null;
    this._npcTip = null;
    this._sealed = null;
    this._sealedTip = null;
    this._lethe = null;
    this._bancada = null;
    this._bancadaTip = null;
    this._bancadaOrderSig = '';
    this._pantheonOrderSig = '';
    /** @type {CodexBook|null} */
    this._codexBook = null;
    /** @type {{ activate: Function, getSelectedKey: Function, tabs: Element[] }|null} */
    this._pantheonSubTabs = null;
    this._pantheonSubKey = 'available';
    this._pantheonSubUserPicked = false;
    /** @type {{ activate: Function, getSelectedKey: Function, tabs: Element[] }|null} */
    this._bancadaSubTabs = null;
    this._bancadaSubKey = 'available';
    this._bancadaSubUserPicked = false;
    this._world = null;
    this._altar = null;
    this._modeButtons = [];
    this._mounted = false;
    /** @type {number|null} última OoM do SPS (G5.1 bump) */
    this._lastSpsMag = null;
    /** @type {{ id: string, text: string }[]} */
    this._rumorPool = [];
    this._rumorIndex = 0;
    this._rumorSig = '';
    this._rumorNextAt = 0;
    this._rumorHoldUntil = 0;
    this._rumorCurrent = '';
    this._shinyRumorUsed = false;
    this._goldRumorUsed = false;
    /** @type {Set<string>} ids de edu-log já anunciados no letreiro (C2) */
    this._eduAnnounced = new Set();
  }

  mount(state = this.state) {
    if (!this.root || this._mounted) return this;
    this.state = state ?? this.state;
    this._eduAnnounced = new Set(this.state?.eduLogsSeen || []);
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
    this.#mountNpcTip();
    this.#mountShelves();
    this.#mountAltar();
    this.#mountLethe();
    this.#mountBancada();
    this.#mountCodexBook();
    this._ticker = this.root.getElementById('despertar-ticker');
    if (this._ticker) bindMarquee(this._ticker);
    this._stats = this.root.getElementById('despertar-stats');
    this._sealed = {
      empty: this.root.getElementById('sealed-empty'),
      list: this.root.getElementById('sealed-list'),
      section: this.root.getElementById('despertar-sealed-juramentos'),
    };
    this.#mountSealedTip();
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
    const sps = state.sps();
    setText(this._hud?.sps, formatRate(sps));
    if (!reducedMotion && this._hud?.sps) {
      const mag = spsOrderOfMagnitude(sps);
      if (this._lastSpsMag != null && mag > this._lastSpsMag) {
        juiceBumpClass(this._hud.sps, 'is-bump', 380);
      }
      this._lastSpsMag = mag;
    } else if (this._hud?.sps) {
      this._lastSpsMag = spsOrderOfMagnitude(sps);
    }
    setText(this._hud?.click, formatSouls(state.clickPower()));
    setText(this._hud?.bonus, formatMultiplier(prestigeBonus(state.obols, state.talents)));
    this.#renderHint(state);
    this.#renderTicker(state, { reducedMotion });
    this.#renderVeil(state);
    this.#renderMarket(state);
    this.#renderStyx(state);
    this.#renderShelves(state, { reducedMotion });
    this.#renderAltar(state, { reducedMotion });
    this.#renderStats(state);
    this.#renderLethe(state, { reducedMotion });
    this.#renderBancada(state);
    this._codexBook?.sync(state);
    this.#announceEduLogTickers(state, { reducedMotion });
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
      const amort = this.root.createElement('span');
      amort.className = 'despertar-card__amort';
      amort.dataset.amort = '';
      amort.hidden = true;
      meta.append(amort);

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
      this._cards.set(def.id, { item, blurb, veil, meta, qty: owned, rate, price, amort, buy });
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
    const richAmort = Boolean(talentEffects(state.talents || []).richAmort);
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
        const amortLabel = formatAmortSeconds(view.amort);
        if (richAmort) {
          // Olho da Curva: amortização visível + tip sem SPS.
          nodes.item.title = `Próxima unidade se paga em ~ ${amortLabel} (amortização)`;
          if (nodes.amort) {
            setHidden(nodes.amort, false);
            setText(nodes.amort, ` · paga em ~ ${amortLabel}`);
          }
        } else {
          nodes.item.title = `Linha total · Amortização ~ ${amortLabel}`;
          if (nodes.amort) setHidden(nodes.amort, true);
        }
        this.onAmortSeen?.();
      } else if (nodes.amort) {
        setHidden(nodes.amort, true);
      }

      setHidden(nodes.blurb, !view.revealed);
      setHidden(nodes.veil, view.revealed);
      setHidden(nodes.meta, !view.revealed);
      setText(nodes.qty, formatOwned(view.quantity));
      setText(nodes.rate, formatRate(view.rate));
      if (nodes.rate) {
        nodes.rate.setAttribute?.(
          'aria-label',
          `Almas por segundo da linha: ${formatRate(view.rate)}`,
        );
      }
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
    this._styxOrderSig = '';
    this._styxKeyHandler = (event) => {
      if (event.key === 'Escape') {
        this.#hideStyxTip();
        this.#hideSealedTip();
      }
    };
    this.root.addEventListener?.('keydown', this._styxKeyHandler);
    // Sair da strip inteira fecha o tip (DOM reorder / disabled não engolem o leave).
    strip?.addEventListener?.('pointerleave', (event) => {
      if (event.currentTarget?.contains?.(event.relatedTarget)) return;
      this.#hideStyxTip();
    });

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
    this.#hideSealedTip();
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
    anchor.setAttribute('aria-describedby', 'styx-tooltip');
    this.#positionFixedTip(tip.root, anchor);
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

  /** Posiciona tip fixed acima/abaixo do âncora (Styx + Selados). */
  #positionFixedTip(tipRoot, anchor) {
    if (!tipRoot || !anchor) return;
    tipRoot.classList.remove('is-below');
    tipRoot.classList.add('is-fixed');

    const btnBox = anchor.getBoundingClientRect?.();
    if (!btnBox) return;

    const tipWidth = tipRoot.offsetWidth || 220;
    const tipHeight = tipRoot.offsetHeight || 110;
    const gap = 8;
    const vw = typeof globalThis.innerWidth === 'number' ? globalThis.innerWidth : btnBox.right + tipWidth;
    const vh = typeof globalThis.innerHeight === 'number' ? globalThis.innerHeight : btnBox.bottom + tipHeight;

    let left = btnBox.left + (btnBox.width / 2) - (tipWidth / 2);
    left = Math.max(8, Math.min(left, vw - tipWidth - 8));

    const spaceAbove = btnBox.top - gap;
    const placeBelow = spaceAbove < tipHeight && (vh - btnBox.bottom) > spaceAbove;
    tipRoot.classList.toggle('is-below', placeBelow);
    const top = placeBelow
      ? btnBox.bottom + gap
      : btnBox.top - tipHeight - gap;

    tipRoot.style.left = `${Math.round(left)}px`;
    tipRoot.style.top = `${Math.round(Math.max(8, top))}px`;
  }

  #renderStyx(state) {
    if (!this._styx) return;
    const unlocked = isStyxUnlocked({ souls: state.souls, generators: state.quantities() });
    const visibleCards = [];
    for (let index = 0; index < UPGRADES.length; index += 1) {
      const def = UPGRADES[index];
      const nodes = this._upgrades.get(def.id);
      const view = describeUpgradeCard(state, def.id);
      if (!nodes || !view) continue;
      const sealing = nodes.buy.classList.contains('is-sealing');
      // F4: owned some da strip (Cookie); is-sealing mantém o ícone até o juice acabar.
      const show = unlocked && view.revealed && (!view.owned || sealing);
      setHidden(nodes.item, !show);
      if (show) {
        visibleCards.push({
          id: def.id,
          canBuy: Boolean(view.canBuy),
          cost: view.cost,
          catalogIndex: index,
        });
      }
      toggleClass(nodes.buy, 'is-affordable', show && view.canBuy);
      toggleClass(nodes.buy, 'is-locked', show && !view.canBuy && !view.owned);
      toggleClass(nodes.buy, 'is-owned', false);
      setDisabled(nodes.buy, !view.canBuy);
    }
    const list = this._styx.list;
    if (list && visibleCards.length > 0) {
      const order = sortStyxVisible(visibleCards);
      const orderSig = order.join('\0');
      // Só remonta a ordem quando muda — append a cada frame rouba pointerleave/click
      // e deixa o tip “preso” no ar (posição fixed do frame anterior).
      if (orderSig !== this._styxOrderSig) {
        this._styxOrderSig = orderSig;
        for (const id of order) {
          const nodes = this._upgrades.get(id);
          if (nodes?.item) list.append(nodes.item);
        }
        if (this._styxTip?.activeId) {
          const active = this._upgrades.get(this._styxTip.activeId);
          if (active?.buy && !active.item.hidden && !this._styxTip.root.hidden) {
            this.#positionFixedTip(this._styxTip.root, active.buy);
          }
        }
      }
    } else {
      this._styxOrderSig = '';
    }
    const showList = unlocked && visibleCards.length > 0;
    setHidden(this._styx.empty, showList);
    setHidden(this._styx.list, !showList);
    if (this._styx.empty && !showList) setText(this._styx.empty, STYX_EMPTY);
    if (this._styxTip?.activeId) {
      const active = this._upgrades.get(this._styxTip.activeId);
      if (!active || active.item.hidden) this.#hideStyxTip();
    }
  }

  #mountNpcTip() {
    let tip = this.root.getElementById('despertar-npc-tooltip');
    if (!tip) {
      tip = this.root.createElement('div');
      tip.id = 'despertar-npc-tooltip';
      tip.className = 'despertar-upgrade-tooltip despertar-npc-tooltip';
      tip.setAttribute('role', 'tooltip');
      tip.hidden = true;
      const nameEl = this.root.createElement('p');
      nameEl.className = 'despertar-upgrade-tooltip__name';
      nameEl.dataset.tip = 'name';
      const blurbEl = this.root.createElement('p');
      blurbEl.className = 'despertar-upgrade-tooltip__blurb';
      blurbEl.dataset.tip = 'blurb';
      const rateEl = this.root.createElement('p');
      rateEl.className = 'despertar-upgrade-tooltip__cost';
      rateEl.dataset.tip = 'rate';
      const shinyEl = this.root.createElement('p');
      shinyEl.className = 'despertar-upgrade-tooltip__shiny';
      shinyEl.dataset.tip = 'shiny';
      tip.append(nameEl, blurbEl, rateEl, shinyEl);
      const mountParent = this.root.body || this.root.documentElement || this.root;
      mountParent?.append?.(tip);
    } else if (!tip.querySelector('[data-tip="blurb"]')) {
      const blurbEl = this.root.createElement('p');
      blurbEl.className = 'despertar-upgrade-tooltip__blurb';
      blurbEl.dataset.tip = 'blurb';
      const nameNode = tip.querySelector('[data-tip="name"]');
      if (nameNode?.nextSibling) tip.insertBefore(blurbEl, nameNode.nextSibling);
      else tip.append(blurbEl);
    }
    this._npcTip = tip
      ? {
        root: tip,
        name: tip.querySelector('[data-tip="name"]'),
        blurb: tip.querySelector('[data-tip="blurb"]'),
        rate: tip.querySelector('[data-tip="rate"]'),
        shiny: tip.querySelector('[data-tip="shiny"]'),
        activeKey: null,
      }
      : null;
  }

  #showNpcTip(hit, event = null) {
    const tip = this._npcTip;
    if (!tip?.root || !hit || !this.state) return;
    const view = describeNpcUnit(this.state, hit.generatorId, {
      rarity: hit.rarity,
      shiny: hit.shiny,
      gold: hit.gold,
    });
    if (!view) {
      this.#hideNpcTip();
      return;
    }
    setText(tip.name, view.name);
    setText(tip.blurb, view.blurb || NPC_UNIT_PRODUCTION_BLURB);
    setHidden(tip.blurb, false);
    setText(tip.rate, `Almas / s: ${formatRate(view.rate)}`);
    let rarityLabel = '';
    if (view.rarity === 'gold') rarityLabel = `gold ×${GOLD_MULT}`;
    else if (view.rarity === 'negativo' || view.shiny) rarityLabel = `negativo ×${NEGATIVO_MULT}`;
    setText(tip.shiny, rarityLabel);
    setHidden(tip.shiny, !rarityLabel);
    tip.activeKey = `${hit.source}:${hit.generatorId}:${hit.index}`;
    tip.root.hidden = false;
    tip.root.classList.remove('is-below');
    tip.root.classList.add('is-fixed');

    const tipWidth = tip.root.offsetWidth || 180;
    const tipHeight = tip.root.offsetHeight || 72;
    const gap = 12;
    const clientX = Number(event?.clientX);
    const clientY = Number(event?.clientY);
    const vw = typeof globalThis.innerWidth === 'number' ? globalThis.innerWidth : tipWidth + 16;
    const vh = typeof globalThis.innerHeight === 'number' ? globalThis.innerHeight : tipHeight + 16;

    let left;
    let top;
    if (Number.isFinite(clientX) && Number.isFinite(clientY)) {
      left = clientX + gap;
      top = clientY + gap;
      if (left + tipWidth > vw - 8) left = clientX - tipWidth - gap;
      if (top + tipHeight > vh - 8) top = clientY - tipHeight - gap;
    } else {
      left = 8;
      top = 8;
    }
    left = Math.max(8, Math.min(left, vw - tipWidth - 8));
    top = Math.max(8, Math.min(top, vh - tipHeight - 8));
    tip.root.style.left = `${Math.round(left)}px`;
    tip.root.style.top = `${Math.round(top)}px`;
  }

  #hideNpcTip() {
    const tip = this._npcTip;
    if (!tip?.root) return;
    tip.root.hidden = true;
    tip.activeKey = null;
  }

  #onNpcHover(hit, event = null) {
    if (!hit) {
      this.#hideNpcTip();
      return;
    }
    this.#showNpcTip(hit, event);
  }

  #mountShelves() {
    const host = this.root.getElementById('despertar-shelves');
    if (!host) return;
    this._mundoHint = this.root.getElementById('mundo-hint');
    this._world = new WorldView({
      document: this.root,
      isGeneratorRevealed,
      onNpcHover: (hit, event) => this.#onNpcHover(hit, event),
    }).mount(host, this._mundoHint);
  }

  #mountAltar() {
    this._altar = new AltarOrbit({
      document: this.root,
      onNpcHover: (hit, event) => this.#onNpcHover(hit, event),
    }).mount({
      orbitHost: this.root.getElementById('despertar-reap-orbit'),
      particleLayer: this.root.querySelector('[data-particle-layer]'),
      veil: this.root.getElementById('despertar-veil'),
      reapButton: this.root.getElementById('despertar-reap'),
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

  /**
   * Juice G5.2 — scale nas células/cursors recém-comprados (shelf + órbita T1).
   * @param {string} generatorId
   * @param {{ bought?: number, reducedMotion?: boolean }} [opts]
   */
  pulseGeneratorBuy(generatorId, opts = {}) {
    if (!generatorId || opts.reducedMotion) return false;
    const bought = Math.max(0, Math.floor(Number(opts.bought) || 0));
    if (bought <= 0) return false;
    const qty = Number(this.state?.quantities?.()?.[generatorId] || 0);
    const fromIndex = Math.max(0, qty - bought);
    let ok = false;
    if (this._world?.pulseBuy?.(generatorId, { fromIndex, count: bought })) ok = true;
    if (generatorId === 'wandering_shade') {
      if (this._altar?.pulseBuy?.({ fromIndex, count: bought })) ok = true;
    }
    return ok;
  }

  /**
   * Interrupt de prioridade máxima (sync/Juízes) — segura a faixa por RUMOR_INTERRUPT_MS.
   * @param {string} text
   * @param {{ holdMs?: number, reducedMotion?: boolean }} [options]
   */
  interruptTicker(text, options = {}) {
    if (!this._ticker) return false;
    const next = String(text ?? '').trim();
    if (!next) return false;
    const holdMs = Number(options.holdMs) > 0 ? Number(options.holdMs) : RUMOR_INTERRUPT_MS;
    const now = typeof performance !== 'undefined' && performance.now
      ? performance.now()
      : Date.now();
    this._rumorHoldUntil = now + holdMs;
    this._rumorCurrent = next;
    setMarqueeText(this._ticker, next, {
      reducedMotion: Boolean(options.reducedMotion),
    });
    return true;
  }

  /**
   * Primeiro negativo da corrida — fura a fila uma vez.
   * @param {{ reducedMotion?: boolean }} [options]
   */
  announceShinyFirst(options = {}) {
    if (this._shinyRumorUsed) return false;
    this._shinyRumorUsed = true;
    return this.interruptTicker(SHINY_FIRST_TICKER, options);
  }

  /**
   * Primeiro gold da corrida — fura a fila uma vez.
   * @param {{ reducedMotion?: boolean }} [options]
   */
  announceGoldFirst(options = {}) {
    if (this._goldRumorUsed) return false;
    this._goldRumorUsed = true;
    return this.interruptTicker(GOLD_FIRST_TICKER, options);
  }

  /** Reset dos ganchos de raridade (ex.: após Lethe / nova corrida). */
  resetShinyRumor() {
    this._shinyRumorUsed = false;
    this._goldRumorUsed = false;
  }

  #renderTicker(state, meta = {}) {
    if (!this._ticker) return;
    const reducedMotion = Boolean(meta.reducedMotion);
    const now = typeof performance !== 'undefined' && performance.now
      ? performance.now()
      : Date.now();

    if (this._rumorHoldUntil > now && this._rumorCurrent) {
      setMarqueeText(this._ticker, this._rumorCurrent, { reducedMotion });
      return;
    }

    const sig = rumorPoolSignature(state);
    if (sig !== this._rumorSig || !this._rumorPool.length) {
      const prevId = this._rumorPool[this._rumorIndex]?.id;
      this._rumorPool = buildRumorPool(state);
      this._rumorSig = sig;
      const kept = prevId
        ? this._rumorPool.findIndex((item) => item.id === prevId)
        : -1;
      this._rumorIndex = kept >= 0 ? kept : 0;
      const refreshed = pickRumor(this._rumorPool, this._rumorIndex);
      this._rumorIndex = refreshed.index;
      this._rumorCurrent = refreshed.text;
      if (!this._rumorNextAt || this._rumorNextAt <= now) {
        this._rumorNextAt = now + RUMOR_ROTATE_MS;
      }
    } else if (now >= this._rumorNextAt) {
      this._rumorIndex = (this._rumorIndex + 1) % this._rumorPool.length;
      const picked = pickRumor(this._rumorPool, this._rumorIndex);
      this._rumorIndex = picked.index;
      this._rumorCurrent = picked.text;
      this._rumorNextAt = now + RUMOR_ROTATE_MS;
    }

    setMarqueeText(this._ticker, this._rumorCurrent, { reducedMotion });
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
    const owned = new Set(
      Array.isArray(state.upgrades) ? state.upgrades.filter(Boolean) : [],
    );
    // Ordem estável = catálogo UPGRADES ∩ owned (não a ordem de compra).
    const sealedDefs = UPGRADES.filter((def) => owned.has(def.id));
    const signature = sealedDefs.map((def) => def.id).join('\0');
    if (sealed._signature === signature) return;
    this.#hideSealedTip();
    sealed._signature = signature;

    sealed.list.replaceChildren();
    for (const def of sealedDefs) {
      const li = this.root.createElement('li');
      li.className = 'despertar-sealed-icon';
      li.dataset.sealedUpgrade = def.id;

      const btn = this.root.createElement('button');
      btn.type = 'button';
      btn.className = 'despertar-upgrade-icon';
      btn.dataset.sealedUpgrade = def.id;
      btn.setAttribute('aria-label', def.name);

      const sprite = createSpriteNode(this.root, upgradeSprite(def.id), {
        className: 'despertar-upgrade-icon__sprite despertar-sprite',
      });
      btn.append(sprite);

      btn.addEventListener('pointerenter', () => this.#showSealedTip(def.id, btn));
      btn.addEventListener('pointerleave', () => this.#hideSealedTip(def.id));
      btn.addEventListener('focus', () => this.#showSealedTip(def.id, btn));
      btn.addEventListener('blur', () => this.#hideSealedTip(def.id));

      li.append(btn);
      sealed.list.append(li);
    }
    const has = sealedDefs.length > 0;
    setHidden(sealed.empty, has);
    setHidden(sealed.list, !has);
  }

  #mountSealedTip() {
    let tip = this.root.getElementById('sealed-tooltip');
    if (!tip) {
      tip = this.root.createElement('div');
      tip.id = 'sealed-tooltip';
      tip.className = 'despertar-upgrade-tooltip';
      tip.setAttribute('role', 'tooltip');
      tip.hidden = true;
      const nameEl = this.root.createElement('p');
      nameEl.className = 'despertar-upgrade-tooltip__name';
      nameEl.dataset.tip = 'name';
      const blurbEl = this.root.createElement('p');
      blurbEl.className = 'despertar-upgrade-tooltip__blurb';
      blurbEl.dataset.tip = 'blurb';
      const markEl = this.root.createElement('p');
      markEl.className = 'despertar-upgrade-tooltip__mark';
      markEl.dataset.tip = 'mark';
      markEl.textContent = 'Selado';
      tip.append(nameEl, blurbEl, markEl);
      const mountParent = this.root.body
        || this.root.documentElement
        || this._sealed?.section;
      mountParent?.append?.(tip);
    }
    this._sealedTip = tip
      ? {
        root: tip,
        name: tip.querySelector('[data-tip="name"]'),
        blurb: tip.querySelector('[data-tip="blurb"]'),
        mark: tip.querySelector('[data-tip="mark"]'),
        activeId: null,
        activeAnchor: null,
      }
      : null;
  }

  #showSealedTip(id, anchor) {
    this.#hideStyxTip();
    const tip = this._sealedTip;
    if (!tip?.root || !anchor) return;
    const upgrade = getUpgrade(id);
    if (!upgrade) return;
    setText(tip.name, upgrade.name);
    setText(tip.blurb, upgradeBlurb(upgrade));
    setText(tip.mark, 'Selado');
    tip.activeId = id;
    tip.activeAnchor = anchor;
    tip.root.hidden = false;
    anchor.setAttribute('aria-describedby', 'sealed-tooltip');
    this.#positionFixedTip(tip.root, anchor);
  }

  #hideSealedTip(id = null) {
    const tip = this._sealedTip;
    if (!tip?.root) return;
    if (id != null && tip.activeId && tip.activeId !== id) return;
    tip.root.hidden = true;
    tip.activeId = null;
    tip.activeAnchor?.removeAttribute?.('aria-describedby');
    tip.activeAnchor = null;
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
      memory: this.root.getElementById('lethe-memory'),
      ritual: this.root.getElementById('lethe-ritual'),
      pantheonEmpty: this.root.getElementById('pantheon-empty'),
      pantheonShop: this.root.getElementById('pantheon-shop'),
      pantheonTabAvailable: this.root.getElementById('pantheon-tab-available'),
      pantheonTabOwned: this.root.getElementById('pantheon-tab-owned'),
      pantheonEmptyAvailable: this.root.getElementById('pantheon-empty-available'),
      pantheonEmptyOwned: this.root.getElementById('pantheon-empty-owned'),
      pantheonListAvailable: this.root.getElementById('pantheon-list-available'),
      pantheonListOwned: this.root.getElementById('pantheon-list-owned'),
    };
    if (this._lethe.locked && !this._lethe.locked.textContent.trim()) {
      this._lethe.locked.textContent = LETHE_EMPTY;
    }
    this._lethe.ritual?.addEventListener('click', () => {
      if (this._lethe.ritual.disabled) return;
      this.onOpenLethe?.();
    });

    const tablist = this.root.getElementById('pantheon-subtabs');
    this._pantheonSubTabs = bindSubTabs(tablist, {
      doc: this.root,
      onActivate: (_tab, key) => {
        this._pantheonSubKey = key;
        this._pantheonSubUserPicked = true;
      },
    });

    const listA = this._lethe.pantheonListAvailable;
    const listB = this._lethe.pantheonListOwned;
    if (!listA || !listB) return;
    listA.replaceChildren();
    listB.replaceChildren();
    this._talents.clear();
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

      const badge = this.root.createElement('p');
      badge.className = 'despertar-card__badge';
      badge.textContent = SHOP_OWNED_BADGE;
      badge.hidden = true;

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

      item.append(name, blurb, meta, badge, buy);
      listA.append(item);
      this._talents.set(def.id, { item, blurb, price, buy, badge });
    }
  }

  #renderLethe(state, meta = {}) {
    if (!this._lethe) return;
    const view = describeLethe(state);
    const tab = this.root.getElementById('tab-lethe');
    setHidden(tab, !view.open);
    if (tab?.hidden) this.#fallbackHiddenDomainTab(tab);

    setHidden(this._lethe.locked, view.open);
    setHidden(this._lethe.open, !view.open);
    if (!view.open && this._lethe.locked) setText(this._lethe.locked, LETHE_EMPTY);
    if (!view.open) return;

    if (!state.milestones?.letheSeen && typeof state.markLetheSeen === 'function') {
      if (state.markLetheSeen()) {
        this.#announceLetheUnlock(meta);
      }
    }

    setText(this._lethe.obols, formatSouls(view.obols));
    setText(this._lethe.mnemosyne, formatSouls(view.mnemosyne));
    setText(this._lethe.preview, view.previewText);
    if (this._lethe.memory) {
      setHidden(this._lethe.memory, false);
      setText(this._lethe.memory, view.memoryPreviewText);
    }
    setDisabled(this._lethe.ritual, !view.canDrink);

    setHidden(this._lethe.pantheonEmpty, view.pantheonOpen);
    setHidden(this._lethe.pantheonShop, !view.pantheonOpen);
    if (!view.pantheonOpen && this._lethe.pantheonEmpty) {
      setText(this._lethe.pantheonEmpty, PANTHEON_EMPTY);
    }
    if (!view.pantheonOpen) return;

    const cards = TALENTS.map((def) => describeTalentCard(state, def.id)).filter(Boolean);
    const partitioned = partitionShopCatalog(cards, {
      isOwned: (card) => Boolean(card.owned),
      canBuy: (card) => Boolean(card.canBuy),
    });

    setText(
      this._lethe.pantheonTabAvailable,
      shopTabLabel('Disponíveis', partitioned.counts.available),
    );
    setText(
      this._lethe.pantheonTabOwned,
      shopTabLabel('Comprados', partitioned.counts.owned),
    );

    const listA = this._lethe.pantheonListAvailable;
    const listB = this._lethe.pantheonListOwned;
    const orderSig = [
      partitioned.available.map((card) => card.id).join('\0'),
      partitioned.owned.map((card) => card.id).join('\0'),
    ].join('|');
    const remount = orderSig !== this._pantheonOrderSig;
    if (remount) {
      this._pantheonOrderSig = orderSig;
      if (listA) listA.replaceChildren();
      if (listB) listB.replaceChildren();
    }

    for (const card of partitioned.available) {
      const nodes = this._talents.get(card.id);
      if (!nodes) continue;
      toggleClass(nodes.item, 'is-owned', false);
      setText(nodes.price, formatSouls(card.cost));
      setText(nodes.buy, 'Selar');
      setDisabled(nodes.buy, !card.canBuy);
      setHidden(nodes.buy, false);
      setHidden(nodes.badge, true);
      if (remount) listA?.append(nodes.item);
    }

    for (const card of partitioned.owned) {
      const nodes = this._talents.get(card.id);
      if (!nodes) continue;
      toggleClass(nodes.item, 'is-owned', true);
      setText(nodes.price, formatSouls(card.cost));
      setText(nodes.buy, 'Na memória');
      setDisabled(nodes.buy, true);
      setHidden(nodes.buy, true);
      setHidden(nodes.badge, false);
      setText(nodes.badge, SHOP_OWNED_BADGE);
      if (remount) listB?.append(nodes.item);
    }

    const emptyA = partitioned.counts.available === 0;
    const emptyB = partitioned.counts.owned === 0;
    setHidden(this._lethe.pantheonEmptyAvailable, !emptyA);
    setHidden(this._lethe.pantheonListAvailable, emptyA);
    setHidden(this._lethe.pantheonEmptyOwned, !emptyB);
    setHidden(this._lethe.pantheonListOwned, emptyB);
    if (emptyA && this._lethe.pantheonEmptyAvailable) {
      setText(this._lethe.pantheonEmptyAvailable, PANTHEON_EMPTY_AVAILABLE);
    }
    if (emptyB && this._lethe.pantheonEmptyOwned) {
      setText(this._lethe.pantheonEmptyOwned, PANTHEON_EMPTY_OWNED);
    }

    this.#syncPantheonSubTab(partitioned.counts.available);
  }

  #syncPantheonSubTab(availableCount) {
    if (!this._pantheonSubTabs) return;
    let key = this._pantheonSubKey;
    if (!this._pantheonSubUserPicked) {
      key = defaultShopSubTab(availableCount);
    } else if (availableCount <= 0 && key === 'available') {
      key = 'owned';
    }
    this._pantheonSubKey = key;
    const tab = key === 'owned'
      ? this._lethe?.pantheonTabOwned
      : this._lethe?.pantheonTabAvailable;
    if (tab) this._pantheonSubTabs.activate(tab, { silent: true });
  }

  /**
   * Se a aba selecionada sumiu (Lethe/Estela), volta para Mundo.
   * @param {Element|null|undefined} [maybeHidden]
   */
  #fallbackHiddenDomainTab(maybeHidden = null) {
    if (maybeHidden && maybeHidden.getAttribute('aria-selected') !== 'true') return;
    const selected = this.root.querySelector?.('.despertar-tablist > [role="tab"][aria-selected="true"]');
    if (selected && !selected.hidden) return;
    const mundo = this.root.getElementById('tab-mundo');
    if (mundo && !mundo.hidden && typeof mundo.click === 'function') mundo.click();
  }

  /**
   * First unlock Lethe — flash + aba + ticker (uma vez; C1).
   * @param {{ reducedMotion?: boolean }} [meta]
   */
  #announceLetheUnlock(meta = {}) {
    const reduced =
      Boolean(meta.reducedMotion) || juicePrefersReducedMotion();
    const tab = this.root.getElementById('tab-lethe');
    if (tab) {
      // Reduced-motion: CSS zera a animação; a classe ainda dá destaque estático ~1,4 s.
      juiceBumpClass(tab, 'is-just-unlocked', 1400);
    }
    flashLetheUnlock({ reducedMotion: reduced, root: this.root });
    this._eduAnnounced.add('log_lethe_unlock');
    this.interruptTicker(LETHE_UNLOCK_TICKER, {
      holdMs: LETHE_UNLOCK_HOLD_MS,
      reducedMotion: reduced,
    });
    showTutorialToast({
      text: LETHE_TUTORIAL_TOAST,
      root: this.root,
      reducedMotion: reduced,
    });
    this.onLetheFirstUnlock?.();
  }

  /**
   * Ticker one-shot para edu-logs de tutorial (Fase C / C2).
   * Não re-dispara após mount com logs já vistos.
   * @param {object} state
   * @param {{ reducedMotion?: boolean }} [meta]
   */
  #announceEduLogTickers(state, meta = {}) {
    if (!state || !this._ticker) return;
    const seen = Array.isArray(state.eduLogsSeen) ? state.eduLogsSeen : [];
    const reduced =
      Boolean(meta.reducedMotion) || juicePrefersReducedMotion();
    for (const id of EDU_LOG_TICKER_IDS) {
      if (!seen.includes(id) || this._eduAnnounced.has(id)) continue;
      this._eduAnnounced.add(id);
      const phrase = eduLogTickerPhrase(EDU_LOG_BY_ID[id]);
      if (!phrase) continue;
      // reduced-motion: só texto no letreiro (sem flash agressivo — C1 já respeita).
      this.interruptTicker(phrase, {
        holdMs: EDU_LOG_TICKER_HOLD_MS,
        reducedMotion: reduced,
      });
      break;
    }
  }

  #mountBancada() {
    const panel = this.root.getElementById('panel-bancada');
    if (!panel) return;
    this._bancada = {
      verdicts: this.root.getElementById('bancada-verdicts'),
      hint: this.root.getElementById('bancada-hint'),
      shop: this.root.getElementById('bancada-shop'),
      tabAvailable: this.root.getElementById('bancada-tab-available'),
      tabOwned: this.root.getElementById('bancada-tab-owned'),
      emptyAvailable: this.root.getElementById('bancada-empty-available'),
      emptyOwned: this.root.getElementById('bancada-empty-owned'),
      listAvailable: this.root.getElementById('bancada-list-available'),
      listOwned: this.root.getElementById('bancada-list-owned'),
    };
    setText(this._bancada.hint, JUIZO_BANCADA_HINT);

    let tip = this.root.getElementById('bancada-tooltip');
    if (!tip) {
      tip = this.root.createElement('div');
      tip.id = 'bancada-tooltip';
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
      tip.append(nameEl, blurbEl, costEl);
      const mountParent = this.root.body || this.root.documentElement || panel;
      mountParent?.append?.(tip);
    }
    this._bancadaTip = tip
      ? {
        root: tip,
        name: tip.querySelector('[data-tip="name"]'),
        blurb: tip.querySelector('[data-tip="blurb"]'),
        cost: tip.querySelector('[data-tip="cost"]'),
        activeId: null,
        activeAnchor: null,
      }
      : null;
    this._bancadaOrderSig = '';
    this._bancadaKeyHandler = (event) => {
      if (event.key === 'Escape') this.#hideBancadaTip();
    };
    this.root.addEventListener?.('keydown', this._bancadaKeyHandler);
    // Sair da loja fecha o tip (DOM reorder / disabled não engolem o leave).
    this._bancada.shop?.addEventListener?.('pointerleave', (event) => {
      if (event.currentTarget?.contains?.(event.relatedTarget)) return;
      this.#hideBancadaTip();
    });

    const tablist = this.root.getElementById('bancada-subtabs');
    this._bancadaSubTabs = bindSubTabs(tablist, {
      doc: this.root,
      onActivate: (_tab, key) => {
        this._bancadaSubKey = key;
        this._bancadaSubUserPicked = true;
        this.#hideBancadaTip();
      },
    });

    const listA = this._bancada.listAvailable;
    const listB = this._bancada.listOwned;
    if (!listA || !listB) return;
    listA.replaceChildren();
    listB.replaceChildren();
    this._verdicts.clear();
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

      const badge = this.root.createElement('p');
      badge.className = 'despertar-card__badge';
      badge.textContent = SHOP_OWNED_BADGE;
      badge.hidden = true;

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
      buy.addEventListener('pointerenter', () => this.#showBancadaTip(def.id, buy));
      buy.addEventListener('pointerleave', () => this.#hideBancadaTip(def.id));
      buy.addEventListener('focus', () => this.#showBancadaTip(def.id, buy));
      buy.addEventListener('blur', () => this.#hideBancadaTip(def.id));

      item.append(name, blurb, meta, badge, buy);
      listA.append(item);
      this._verdicts.set(def.id, { item, price, buy, badge, blurb });
    }
  }

  #showBancadaTip(id, anchor) {
    const tip = this._bancadaTip;
    if (!tip?.root || !anchor || !this.state) return;
    const view = describeVerdictCard(this.state, id);
    if (!view) return;
    setText(tip.name, view.name);
    setText(tip.blurb, view.blurb);
    setText(
      tip.cost,
      view.owned ? 'Na Bancada' : `Custo: ${view.cost} Vereditos`,
    );
    tip.activeId = id;
    tip.activeAnchor = anchor;
    tip.root.hidden = false;
    tip.root.classList.remove('is-below');
    tip.root.classList.add('is-fixed');
    anchor.setAttribute('aria-describedby', 'bancada-tooltip');

    const btnBox = anchor.getBoundingClientRect?.();
    if (!btnBox) return;

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

  #hideBancadaTip(id = null) {
    const tip = this._bancadaTip;
    if (!tip?.root) return;
    if (id != null && tip.activeId && tip.activeId !== id) return;
    tip.root.hidden = true;
    tip.activeId = null;
    tip.activeAnchor?.removeAttribute?.('aria-describedby');
    tip.activeAnchor = null;
    for (const nodes of this._verdicts.values()) {
      nodes.buy?.removeAttribute('aria-describedby');
    }
  }

  #renderBancada(state) {
    if (!this._bancada) return;
    setText(this._bancada.verdicts, String(Number(state.verdicts) || 0));

    const cards = VERDICT_SHOP.map((def) => describeVerdictCard(state, def.id)).filter(Boolean);
    const partitioned = partitionShopCatalog(cards, {
      isOwned: (card) => Boolean(card.owned),
      canBuy: (card) => Boolean(card.canBuy),
    });

    setText(
      this._bancada.tabAvailable,
      shopTabLabel('Disponíveis', partitioned.counts.available),
    );
    setText(
      this._bancada.tabOwned,
      shopTabLabel('Comprados', partitioned.counts.owned),
    );

    const listA = this._bancada.listAvailable;
    const listB = this._bancada.listOwned;
    const orderSig = [
      partitioned.available.map((card) => card.id).join('\0'),
      partitioned.owned.map((card) => card.id).join('\0'),
    ].join('|');
    const remount = orderSig !== this._bancadaOrderSig;
    if (remount) {
      this._bancadaOrderSig = orderSig;
      if (listA) listA.replaceChildren();
      if (listB) listB.replaceChildren();
    }

    for (const card of partitioned.available) {
      const nodes = this._verdicts.get(card.id);
      if (!nodes) continue;
      toggleClass(nodes.item, 'is-owned', false);
      setText(nodes.price, String(card.cost));
      setText(nodes.buy, 'Comprar');
      setDisabled(nodes.buy, !card.canBuy);
      setHidden(nodes.buy, false);
      setHidden(nodes.badge, true);
      if (nodes.blurb) setText(nodes.blurb, card.blurb);
      if (remount) listA?.append(nodes.item);
    }

    for (const card of partitioned.owned) {
      const nodes = this._verdicts.get(card.id);
      if (!nodes) continue;
      toggleClass(nodes.item, 'is-owned', true);
      setText(nodes.price, String(card.cost));
      setText(nodes.buy, 'Na Bancada');
      setDisabled(nodes.buy, true);
      setHidden(nodes.buy, true);
      setHidden(nodes.badge, false);
      setText(nodes.badge, SHOP_OWNED_BADGE);
      if (nodes.blurb) setText(nodes.blurb, card.blurb);
      if (remount) listB?.append(nodes.item);
    }

    const emptyA = partitioned.counts.available === 0;
    const emptyB = partitioned.counts.owned === 0;
    setHidden(this._bancada.emptyAvailable, !emptyA);
    setHidden(this._bancada.listAvailable, emptyA);
    setHidden(this._bancada.emptyOwned, !emptyB);
    setHidden(this._bancada.listOwned, emptyB);
    if (emptyA && this._bancada.emptyAvailable) {
      setText(this._bancada.emptyAvailable, BANCADA_EMPTY_AVAILABLE);
    }
    if (emptyB && this._bancada.emptyOwned) {
      setText(this._bancada.emptyOwned, BANCADA_EMPTY_OWNED);
    }

    this.#syncBancadaSubTab(partitioned.counts.available);

    if (this._bancadaTip?.activeId) {
      const active = this._verdicts.get(this._bancadaTip.activeId);
      if (!active || active.buy?.hidden) {
        this.#hideBancadaTip();
      } else if (active.buy && !this._bancadaTip.root.hidden) {
        this.#showBancadaTip(this._bancadaTip.activeId, active.buy);
      }
    }
  }

  #syncBancadaSubTab(availableCount) {
    if (!this._bancadaSubTabs) return;
    let key = this._bancadaSubKey;
    if (!this._bancadaSubUserPicked) {
      key = defaultShopSubTab(availableCount);
    } else if (availableCount <= 0 && key === 'available') {
      key = 'owned';
    }
    this._bancadaSubKey = key;
    const tab = key === 'owned'
      ? this._bancada?.tabOwned
      : this._bancada?.tabAvailable;
    if (tab) this._bancadaSubTabs.activate(tab, { silent: true });
  }

  #mountCodexBook() {
    if (this._codexBook) return;
    this._codexBook = new CodexBook(this.root, {
      getUserId: () => this.getUserId(),
      getState: () => this.state,
    });
    this._codexBook.mount();
  }
}
