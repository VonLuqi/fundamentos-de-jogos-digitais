/**
 * MinigamesView (Fase F5 — Néctar do Lethe + 4 Minigames Temáticos).
 * Renderiza sob demanda (on-dirty / quando visível) o HUD de Néctar, colmeia de níveis de gerador
 * e as secções dos 4 minigames (Panteão Ctoniano, Grimório de Hécate, Jardim de Perséfone e Mercado de Caronte).
 * Zero `requestAnimationFrame` próprio; respeita o orçamento de render da Fase Perf.
 */

import { GENERATORS } from '../../config/generators.js';
import {
  GARDEN_SEEDS,
  GARDEN_SOILS,
  GRIMOIRE_SPELLS,
  MARKET_GOODS,
  MINIGAME_UNLOCK_GENERATORS,
  NECTAR_CONFIG,
  NECTAR_VARIANT_BY_ID,
  PANTHEON_SLOTS,
  PANTHEON_SPIRITS,
} from '../../config/minigames.js';
import { nextGeneratorLevelCost } from '../../core/NectarSystem.js';
import { calculateSpellCost } from '../../core/minigames/GrimoireSystem.js';
import { calculateSeedPlantCost } from '../../core/minigames/GardenSystem.js';
import { calculateGoodMaxStock, calculateMarketTradeSouls } from '../../core/minigames/MarketSystem.js';
import { formatDuration } from '../../services/OfflineEngine.js';
import { formatSouls } from '../NumberFormatter.js';
import { createSpriteNode, generatorSprite, minigameSprite } from '../world/SpriteAtlas.js';

const HIVE_COLS = 5;

const SPIRIT_BY_ID = Object.freeze(Object.fromEntries(PANTHEON_SPIRITS.map((s) => [s.id, s])));
const SEED_BY_ID = Object.freeze(Object.fromEntries(GARDEN_SEEDS.map((s) => [s.id, s])));

/** Ícone de minigame (sprites/minigames) como nó DOM. */
function minigameIcon(doc, spriteId, name) {
  return createSpriteNode(doc, minigameSprite(spriteId, name), {
    className: 'despertar-sprite despertar-minigame-icon',
  });
}

/**
 * Ícone + texto: o render atualiza só `node._label` (setText no nó inteiro apagaria o ícone).
 * @returns {HTMLElement & { _label: HTMLElement, _iconId: string }}
 */
function iconLabel(doc, tag, spriteId, name, text = name) {
  const node = doc.createElement(tag);
  node.classList?.add('despertar-icon-label');
  const label = doc.createElement('span');
  label.textContent = text;
  node.append(minigameIcon(doc, spriteId, name), label);
  node._label = label;
  node._iconId = spriteId;
  return node;
}

/** Troca o ícone de um iconLabel/host quando o item mudou. */
function swapIcon(doc, host, spriteId, name) {
  if (!host || host._iconId === spriteId) return;
  host._iconId = spriteId;
  const icon = spriteId ? minigameIcon(doc, spriteId, name) : null;
  const old = host.querySelector?.('.despertar-minigame-icon');
  if (old && icon) old.replaceWith(icon);
  else if (old) old.remove();
  else if (icon) host.prepend?.(icon);
}

const MINIGAME_UNLOCK_LABEL = Object.freeze({
  pantheon: 'Panteão',
  grimoire: 'Grimório',
  garden: 'Jardim',
  market: 'Mercado',
});

const MINIGAME_BY_GENERATOR = Object.freeze(
  Object.fromEntries(
    Object.entries(MINIGAME_UNLOCK_GENERATORS).map(([minigameId, genId]) => [genId, minigameId]),
  ),
);

function setText(node, value) {
  if (!node) return;
  const next = String(value);
  if (node.textContent !== next) node.textContent = next;
}

function setHidden(node, hidden) {
  if (!node) return;
  if (node.hidden !== Boolean(hidden)) node.hidden = Boolean(hidden);
}

function setDisabled(node, disabled) {
  if (!node) return;
  if (node.disabled !== Boolean(disabled)) node.disabled = Boolean(disabled);
}

function setClass(node, className, on) {
  if (!node?.classList) return;
  node.classList.toggle(className, Boolean(on));
}

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function formatNectarEta(ms) {
  return formatDuration(Math.max(0, Math.ceil(Number(ms) || 0) / 1000));
}

export class MinigamesView {
  constructor(options = {}) {
    this._doc = options.document || (typeof document !== 'undefined' ? document : null);
    this._onHarvestNectar = typeof options.onHarvestNectar === 'function' ? options.onHarvestNectar : null;
    this._onLevelUpGenerator = typeof options.onLevelUpGenerator === 'function' ? options.onLevelUpGenerator : null;
    this._onActivateFrenzy = typeof options.onActivateFrenzy === 'function' ? options.onActivateFrenzy : null;
    this._onAssignPantheon = typeof options.onAssignPantheon === 'function' ? options.onAssignPantheon : null;
    this._onCastSpell = typeof options.onCastSpell === 'function' ? options.onCastSpell : null;
    this._onPlantSeed = typeof options.onPlantSeed === 'function' ? options.onPlantSeed : null;
    this._onHarvestPlot = typeof options.onHarvestPlot === 'function' ? options.onHarvestPlot : null;
    this._onSelectSoil = typeof options.onSelectSoil === 'function' ? options.onSelectSoil : null;
    this._onSelectSeed = typeof options.onSelectSeed === 'function' ? options.onSelectSeed : null;
    this._onBuyGood = typeof options.onBuyGood === 'function' ? options.onBuyGood : null;
    this._onSellGood = typeof options.onSellGood === 'function' ? options.onSellGood : null;

    this._host = null;
    this._nectarPanel = null;
    this._nectarValEl = null;
    this._nectarStageEl = null;
    this._nectarEtaEl = null;
    this._nectarProgressEl = null;
    this._nectarHintEl = null;
    this._harvestBtn = null;
    this._frenzyBtn = null;
    this._selectedSeedId = GARDEN_SEEDS[0]?.id || 'asfodelo_cinzento';
    this._levelBtns = new Map();
    this._pantheonSelects = new Map();
    this._grimoireBtns = new Map();
    this._grimoireManaEl = null;
    this._gardenPlotsHost = null;
    this._gardenSoilSelect = null;
    this._marketRows = new Map();
    this._sections = {};
  }

  mount(host) {
    this._host = host;
    if (!host || !this._doc?.createElement) return this;
    host.replaceChildren?.();

    // 1. Bloco Néctar do Lethe (colmeia de Artes Ctonianas)
    const nectarBox = this._doc.createElement('section');
    nectarBox.className = 'despertar-nectar-panel';
    nectarBox.id = 'despertar-nectar-panel';
    nectarBox.setAttribute('aria-labelledby', 'despertar-nectar-heading');
    this._nectarPanel = nectarBox;

    const header = this._doc.createElement('header');
    header.className = 'despertar-nectar-panel__header';

    const title = this._doc.createElement('h3');
    title.className = 'despertar-nectar-panel__title';
    title.id = 'despertar-nectar-heading';
    title.textContent = 'Néctar do Lethe & Artes Ctonianas';

    const stock = this._doc.createElement('div');
    stock.className = 'despertar-nectar-stock';
    stock.setAttribute('aria-live', 'polite');

    const drop = this._doc.createElement('span');
    drop.className = 'despertar-nectar-stock__drop';
    drop.setAttribute('aria-hidden', 'true');
    swapIcon(this._doc, drop, 'nectar_normal', 'Néctar do Lethe');
    this._nectarDropEl = drop;

    const stockBody = this._doc.createElement('div');
    stockBody.className = 'despertar-nectar-stock__body';

    const stockLabel = this._doc.createElement('span');
    stockLabel.className = 'despertar-nectar-stock__label';
    stockLabel.textContent = 'Néctares';

    this._nectarValEl = this._doc.createElement('strong');
    this._nectarValEl.className = 'despertar-nectar-stock__value despertar-num';
    this._nectarValEl.dataset.nectarCount = '';
    this._nectarValEl.textContent = '0';

    stockBody.append(stockLabel, this._nectarValEl);
    stock.append(drop, stockBody);

    const stageWrap = this._doc.createElement('div');
    stageWrap.className = 'despertar-nectar-stage';

    this._nectarStageEl = this._doc.createElement('span');
    this._nectarStageEl.className = 'despertar-nectar-stage__chip';
    this._nectarStageEl.dataset.nectarStage = 'locked';
    this._nectarStageEl.textContent = 'Selado';

    this._nectarEtaEl = this._doc.createElement('span');
    this._nectarEtaEl.className = 'despertar-nectar-stage__eta';
    this._nectarEtaEl.textContent = 'Requer 1B almas de vida';

    const progressTrack = this._doc.createElement('div');
    progressTrack.className = 'despertar-nectar-progress';
    progressTrack.setAttribute('role', 'progressbar');
    progressTrack.setAttribute('aria-valuemin', '0');
    progressTrack.setAttribute('aria-valuemax', '100');
    progressTrack.setAttribute('aria-valuenow', '0');
    progressTrack.setAttribute('aria-label', 'Progresso do ciclo de Néctar');
    this._nectarProgressTrack = progressTrack;

    this._nectarProgressEl = this._doc.createElement('span');
    this._nectarProgressEl.className = 'despertar-nectar-progress__fill';
    progressTrack.append(this._nectarProgressEl);

    stageWrap.append(this._nectarStageEl, this._nectarEtaEl, progressTrack);
    header.append(title, stock, stageWrap);

    const actions = this._doc.createElement('div');
    actions.className = 'despertar-nectar-actions';

    const harvestBtn = this._doc.createElement('button');
    harvestBtn.type = 'button';
    harvestBtn.className = 'btn-gold despertar-nectar-harvest';
    harvestBtn.dataset.action = 'harvest-nectar';
    harvestBtn.textContent = 'Colher Néctar';
    harvestBtn.disabled = true;
    harvestBtn.addEventListener?.('click', () => this._onHarvestNectar?.());
    this._harvestBtn = harvestBtn;

    const frenzyBtn = this._doc.createElement('button');
    frenzyBtn.type = 'button';
    frenzyBtn.className = 'despertar-ghost despertar-nectar-frenzy';
    frenzyBtn.dataset.action = 'nectar-frenzy';
    frenzyBtn.title = 'Consagra 1 Néctar para ×3 SPS durante 1 hora (1× por corrida).';
    frenzyBtn.textContent = 'Frenesi · ×3 SPS / 1h';
    frenzyBtn.disabled = true;
    frenzyBtn.addEventListener?.('click', () => this._onActivateFrenzy?.());
    this._frenzyBtn = frenzyBtn;

    actions.append(harvestBtn, frenzyBtn);

    this._nectarHintEl = this._doc.createElement('p');
    this._nectarHintEl.className = 'despertar-nectar-hint';
    this._nectarHintEl.textContent = 'Cada nível na colmeia concede +1% SPS daquela linha. Células com selo abrem minijogos no Lv.1.';

    const hive = this._doc.createElement('div');
    hive.className = 'despertar-nectar-hive';
    hive.setAttribute('role', 'list');
    hive.setAttribute('aria-label', 'Artes Ctonianas — níveis de gerador');

    for (const [rowIndex, rowGens] of chunk(GENERATORS, HIVE_COLS).entries()) {
      const row = this._doc.createElement('div');
      row.className = 'despertar-nectar-hive__row';
      if (rowIndex % 2 === 1) row.classList.add('despertar-nectar-hive__row--offset');

      for (const gen of rowGens) {
        const btn = this.#createHiveCell(gen);
        row.append(btn);
        this._levelBtns.set(gen.id, btn);
      }
      hive.append(row);
    }

    nectarBox.append(header, actions, this._nectarHintEl, hive);
    host.append(nectarBox);

    // 2. Secções dos 4 Minigames (ocultas até que o gerador correspondente atinja Lv.1)
    this.#mountPantheonSection(host);
    this.#mountGrimoireSection(host);
    this.#mountGardenSection(host);
    this.#mountMarketSection(host);

    return this;
  }

  #createHiveCell(gen) {
    const btn = this._doc.createElement('button');
    btn.type = 'button';
    btn.className = 'despertar-nectar-hex';
    btn.dataset.levelUpGen = gen.id;
    btn.setAttribute('role', 'listitem');
    btn.disabled = true;
    btn.addEventListener?.('click', () => this._onLevelUpGenerator?.(gen.id));

    const face = this._doc.createElement('span');
    face.className = 'despertar-nectar-hex__face';

    const iconHost = this._doc.createElement('span');
    iconHost.className = 'despertar-nectar-hex__icon';
    iconHost.append(createSpriteNode(this._doc, generatorSprite(gen.id), {
      className: 'despertar-sprite despertar-nectar-hex__sprite',
    }));

    const name = this._doc.createElement('span');
    name.className = 'despertar-nectar-hex__name';
    name.textContent = gen.name;

    const lv = this._doc.createElement('span');
    lv.className = 'despertar-nectar-hex__lv despertar-num';
    lv.dataset.hexLv = '';
    lv.textContent = '0';

    const cost = this._doc.createElement('span');
    cost.className = 'despertar-nectar-hex__cost';
    cost.dataset.hexCost = '';
    cost.textContent = '1 néctar';

    face.append(iconHost, name, lv, cost);

    const minigameId = MINIGAME_BY_GENERATOR[gen.id];
    if (minigameId) {
      btn.classList.add('despertar-nectar-hex--portal');
      btn.dataset.minigameUnlock = minigameId;
      const seal = this._doc.createElement('span');
      seal.className = 'despertar-nectar-hex__seal';
      seal.textContent = MINIGAME_UNLOCK_LABEL[minigameId] || 'Minijogo';
      face.append(seal);
    }

    btn.append(face);
    btn._hexLv = lv;
    btn._hexCost = cost;
    btn._hexName = gen.name;
    return btn;
  }

  #setNectarProgress(ratio) {
    const pct = Math.round(Math.min(1, Math.max(0, Number(ratio) || 0)) * 100);
    if (this._nectarProgressEl) {
      this._nectarProgressEl.style.width = `${pct}%`;
    }
    if (this._nectarProgressTrack) {
      this._nectarProgressTrack.setAttribute('aria-valuenow', String(pct));
    }
  }

  #mountPantheonSection(host) {
    const sec = this._doc.createElement('section');
    sec.className = 'despertar-minigame-section';
    sec.dataset.minigame = 'pantheon';
    sec.hidden = true;

    const h4 = this._doc.createElement('h4');
    h4.className = 'despertar-debug__label';
    h4.textContent = 'Panteão Ctoniano (Templo Lv.1)';
    sec.append(h4);

    for (const slot of PANTHEON_SLOTS) {
      const row = this._doc.createElement('div');
      row.className = 'despertar-minigame-row';
      const label = this._doc.createElement('label');
      label.textContent = `${slot.name}: `;
      const select = this._doc.createElement('select');
      select.dataset.pantheonSlot = slot.id;
      const emptyOpt = this._doc.createElement('option');
      emptyOpt.value = '';
      emptyOpt.textContent = '— Vazio —';
      select.append(emptyOpt);
      for (const sp of PANTHEON_SPIRITS) {
        const opt = this._doc.createElement('option');
        opt.value = sp.id;
        opt.textContent = sp.name;
        select.append(opt);
      }
      select.addEventListener?.('change', () => {
        this._onAssignPantheon?.(slot.id, select.value || null);
      });
      const iconHost = this._doc.createElement('span');
      iconHost.className = 'despertar-minigame-slot-icon';
      select._iconHost = iconHost;
      row.append(iconHost, label, select);
      sec.append(row);
      this._pantheonSelects.set(slot.id, select);
    }
    this._sections.pantheon = sec;
    host.append(sec);
  }

  #mountGrimoireSection(host) {
    const sec = this._doc.createElement('section');
    sec.className = 'despertar-minigame-section';
    sec.dataset.minigame = 'grimoire';
    sec.hidden = true;

    const h4 = this._doc.createElement('h4');
    h4.className = 'despertar-debug__label';
    h4.textContent = 'Grimório de Hécate (Torre Lv.1)';

    const manaP = this._doc.createElement('p');
    manaP.className = 'despertar-card__meta';
    this._grimoireManaEl = this._doc.createElement('span');
    this._grimoireManaEl.dataset.grimoireMana = '';
    this._grimoireManaEl.textContent = '0 / 0 Éter';
    manaP.append(this._grimoireManaEl);

    const spellsWrap = this._doc.createElement('div');
    spellsWrap.className = 'despertar-minigame-actions';
    for (const sp of GRIMOIRE_SPELLS) {
      const btn = iconLabel(this._doc, 'button', sp.spriteId, sp.name);
      btn.type = 'button';
      btn.className = 'btn-gold despertar-icon-label';
      btn.dataset.castSpell = sp.id;
      btn.addEventListener?.('click', () => this._onCastSpell?.(sp.id));
      spellsWrap.append(btn);
      this._grimoireBtns.set(sp.id, btn);
    }

    sec.append(h4, manaP, spellsWrap);
    this._sections.grimoire = sec;
    host.append(sec);
  }

  #mountGardenSection(host) {
    const sec = this._doc.createElement('section');
    sec.className = 'despertar-minigame-section';
    sec.dataset.minigame = 'garden';
    sec.hidden = true;

    const h4 = this._doc.createElement('h4');
    h4.className = 'despertar-debug__label';
    h4.textContent = 'Jardim de Perséfone (Cão Lv.1)';

    const soilSelect = this._doc.createElement('select');
    soilSelect.dataset.gardenSoil = '';
    for (const s of GARDEN_SOILS) {
      const opt = this._doc.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      soilSelect.append(opt);
    }
    soilSelect.addEventListener?.('change', () => {
      this._onSelectSoil?.(soilSelect.value);
    });
    this._gardenSoilSelect = soilSelect;

    // Semente a plantar: antes não havia escolha (só a primeira semente era plantável).
    const seedPicker = this._doc.createElement('div');
    seedPicker.className = 'despertar-minigame-actions despertar-seed-picker';
    seedPicker.setAttribute('role', 'radiogroup');
    seedPicker.setAttribute('aria-label', 'Semente a plantar');
    this._seedBtns = new Map();
    for (const seed of GARDEN_SEEDS) {
      const btn = iconLabel(this._doc, 'button', seed.spriteId, seed.name);
      btn.type = 'button';
      btn.className = 'despertar-ghost despertar-icon-label';
      btn.dataset.gardenSeed = seed.id;
      btn.setAttribute('role', 'radio');
      btn.title = seed.blurb || seed.name;
      btn.addEventListener?.('click', () => {
        this._selectedSeedId = seed.id;
        this.#syncSeedPicker();
        this._onSelectSeed?.(seed.id);
      });
      seedPicker.append(btn);
      this._seedBtns.set(seed.id, btn);
    }
    this.#syncSeedPicker();

    const plotsHost = this._doc.createElement('div');
    plotsHost.className = 'despertar-garden-grid';
    this._gardenPlotsHost = plotsHost;

    sec.append(h4, soilSelect, seedPicker, plotsHost);
    this._sections.garden = sec;
    host.append(sec);
  }

  #syncSeedPicker() {
    for (const [seedId, btn] of this._seedBtns || []) {
      const on = seedId === this._selectedSeedId;
      btn.setAttribute?.('aria-checked', String(on));
      btn.classList?.toggle?.('is-selected', on);
    }
  }

  #mountMarketSection(host) {
    const sec = this._doc.createElement('section');
    sec.className = 'despertar-minigame-section';
    sec.dataset.minigame = 'market';
    sec.hidden = true;

    const h4 = this._doc.createElement('h4');
    h4.className = 'despertar-debug__label';
    h4.textContent = 'Mercado de Caronte (Trono Lv.1)';
    sec.append(h4);

    for (const g of MARKET_GOODS) {
      const row = this._doc.createElement('div');
      row.className = 'despertar-minigame-row';
      row.dataset.marketGood = g.id;

      const info = iconLabel(this._doc, 'span', g.spriteId, g.name, `${g.symbol} · ${g.name}`);

      const buyBtn = this._doc.createElement('button');
      buyBtn.type = 'button';
      buyBtn.className = 'despertar-debug__grant';
      buyBtn.dataset.buyGood = g.id;
      buyBtn.textContent = 'Comprar 1';
      buyBtn.addEventListener?.('click', () => this._onBuyGood?.(g.id, 1));

      const sellBtn = this._doc.createElement('button');
      sellBtn.type = 'button';
      sellBtn.className = 'despertar-ghost';
      sellBtn.dataset.sellGood = g.id;
      sellBtn.textContent = 'Vender 1';
      sellBtn.addEventListener?.('click', () => this._onSellGood?.(g.id, 1));

      row.append(info, buyBtn, sellBtn);
      sec.append(row);
      this._marketRows.set(g.id, { row, info, buyBtn, sellBtn });
    }

    this._sections.market = sec;
    host.append(sec);
  }

  /**
   * Atualiza o DOM apenas em cadência lenta / on-dirty.
   */
  sync(state) {
    if (!state || !this._host) return;
    const nectar = Number(state.nectar || 0);
    setText(this._nectarValEl, String(nectar));

    const cycle = typeof state.nectarStatus === 'function'
      ? state.nectarStatus()
      : {
        unlocked: false,
        stage: 'locked',
        canManualHarvest: false,
        variantId: 'nectar_normal',
        elapsedMs: 0,
        remainingToRipeMs: NECTAR_CONFIG.ripeMs,
        remainingToMatureMs: NECTAR_CONFIG.matureMs,
        remainingToAutoMs: NECTAR_CONFIG.autoHarvestMs,
        harvestChance: 0,
      };
    const vDef = NECTAR_VARIANT_BY_ID[cycle.variantId] || NECTAR_VARIANT_BY_ID.nectar_normal;
    swapIcon(this._doc, this._nectarDropEl, vDef.spriteId || 'nectar_normal', vDef.name);
    const stage = cycle.unlocked ? (cycle.stage || 'budding') : 'locked';

    if (this._nectarStageEl) this._nectarStageEl.dataset.nectarStage = stage;
    if (this._nectarPanel) this._nectarPanel.dataset.nectarStage = stage;

    if (!cycle.unlocked) {
      setText(this._nectarStageEl, 'Selado');
      setText(this._nectarEtaEl, 'Requer 1B almas de vida');
      setDisabled(this._harvestBtn, true);
      setClass(this._harvestBtn, 'is-ready', false);
      this.#setNectarProgress(0);
    } else {
      const stageLabels = {
        budding: 'Brotando',
        mature: 'Maduro · 50%',
        ripe: 'Pronto · 100%',
        autoharvest: 'Queda iminente',
      };
      setText(this._nectarStageEl, stageLabels[stage] || stage);

      let eta = `${vDef.name}`;
      if (stage === 'budding') {
        eta = `${vDef.name} · maduro em ${formatNectarEta(cycle.remainingToMatureMs)}`;
      } else if (stage === 'mature') {
        eta = `${vDef.name} · pronto em ${formatNectarEta(cycle.remainingToRipeMs)}`;
      } else if (stage === 'ripe') {
        eta = `${vDef.name} · colha agora`;
      } else if (stage === 'autoharvest') {
        eta = `${vDef.name} · auto-colheita`;
      }
      setText(this._nectarEtaEl, eta);

      const progress = Math.min(1, Math.max(0, Number(cycle.elapsedMs) || 0) / NECTAR_CONFIG.ripeMs);
      this.#setNectarProgress(stage === 'ripe' || stage === 'autoharvest' ? 1 : progress);
      setDisabled(this._harvestBtn, !cycle.canManualHarvest);
      setClass(this._harvestBtn, 'is-ready', Boolean(cycle.canManualHarvest));
      setText(
        this._harvestBtn,
        cycle.stage === 'mature' ? 'Colher (50%)' : 'Colher Néctar',
      );
    }

    const frenzyUsed = Boolean(state.nectarFrenzyUsedThisRun);
    const frenzyLocked = !state.isFreeShopping?.() && state.isNectarFrenzyUnlocked?.() === false;
    const canFrenzy = !frenzyUsed && !frenzyLocked && (nectar >= 1 || state.isFreeShopping?.());
    setDisabled(this._frenzyBtn, !canFrenzy);
    setClass(this._frenzyBtn, 'is-spent', frenzyUsed);
    let frenzyLabel = 'Frenesi · ×3 SPS / 1h';
    if (frenzyUsed) frenzyLabel = 'Frenesi já usado nesta corrida';
    else if (frenzyLocked) frenzyLabel = 'Frenesi · exige o talento Desejo de Néctar';
    setText(this._frenzyBtn, frenzyLabel);

    const free = Boolean(state.isFreeShopping?.());
    const maxLv = NECTAR_CONFIG.maxGeneratorLevel;
    for (const gen of GENERATORS) {
      const btn = this._levelBtns.get(gen.id);
      if (!btn) continue;
      const lv = typeof state.generatorLevel === 'function'
        ? state.generatorLevel(gen.id)
        : Number(state.generatorLevels?.[gen.id] || 0);
      const atMax = lv >= maxLv;
      const cost = atMax ? 0 : nextGeneratorLevelCost(lv);
      const affordable = free || (!atMax && nectar >= cost);

      setText(btn._hexLv, String(lv));
      setText(btn._hexCost, atMax ? 'Máx.' : `${cost} néctar${cost === 1 ? '' : 'es'}`);
      setDisabled(btn, atMax || !affordable);
      setClass(btn, 'is-affordable', affordable && !atMax);
      setClass(btn, 'is-leveled', lv > 0);
      setClass(btn, 'is-maxed', atMax);

      const bonusPct = lv;
      const unlockLabel = MINIGAME_UNLOCK_LABEL[MINIGAME_BY_GENERATOR[gen.id]];
      const tipParts = [
        `${gen.name} · Lv.${lv}`,
        atMax ? 'Nível máximo' : `Próximo: ${cost} Néctar`,
        `Bônus de linha: +${bonusPct}% SPS`,
      ];
      if (unlockLabel && lv < 1) tipParts.push(`Lv.1 abre ${unlockLabel}`);
      else if (unlockLabel && lv >= 1) tipParts.push(`${unlockLabel} desbloqueado`);
      btn.title = tipParts.join(' · ');
      btn.setAttribute(
        'aria-label',
        atMax
          ? `${gen.name}, nível ${lv}, máximo`
          : `Subir ${gen.name} para nível ${lv + 1}, custa ${cost} néctar`,
      );
    }

    const unlocked = typeof state.unlockedMinigames === 'function'
      ? state.unlockedMinigames()
      : { pantheon: false, grimoire: false, garden: false, market: false };

    // Panteão
    setHidden(this._sections.pantheon, !unlocked.pantheon);
    if (unlocked.pantheon && state.minigames?.pantheon) {
      for (const [slotId, select] of this._pantheonSelects.entries()) {
        const val = state.minigames.pantheon.slots?.[slotId] || '';
        if (select.value !== val) select.value = val;
        const spirit = SPIRIT_BY_ID[val];
        swapIcon(this._doc, select._iconHost, spirit?.spriteId || '', spirit?.name);
      }
    }

    // Grimório
    setHidden(this._sections.grimoire, !unlocked.grimoire);
    if (unlocked.grimoire && state.minigames?.grimoire) {
      const gState = state.minigames.grimoire;
      setText(this._grimoireManaEl, `${Math.floor(gState.mana)} / ${gState.maxMana} Éter`);
      for (const sp of GRIMOIRE_SPELLS) {
        const btn = this._grimoireBtns.get(sp.id);
        if (!btn) continue;
        const cost = calculateSpellCost(sp, gState.maxMana);
        setText(btn._label || btn, `${sp.name} (${cost} Éter)`);
        setDisabled(btn, gState.mana < cost);
      }
    }

    // Jardim
    setHidden(this._sections.garden, !unlocked.garden);
    if (unlocked.garden && state.minigames?.garden) {
      const gar = state.minigames.garden;
      if (this._gardenSoilSelect && this._gardenSoilSelect.value !== gar.soilId) {
        this._gardenSoilSelect.value = gar.soilId;
      }
      if (this._gardenPlotsHost && this._doc?.createElement) {
        const total = gar.plots?.length || 0;
        while (this._gardenPlotsHost.children.length < total) {
          const idx = this._gardenPlotsHost.children.length;
          const cellBtn = this._doc.createElement('button');
          cellBtn.type = 'button';
          cellBtn.className = 'despertar-debug__grant despertar-icon-label';
          cellBtn.dataset.gardenPlot = String(idx);
          cellBtn._label = this._doc.createElement('span');
          cellBtn.append(cellBtn._label);
          cellBtn.addEventListener?.('click', () => {
            const cell = this._currentGardenPlots?.[idx];
            if (cell) this._onHarvestPlot?.(idx);
            else this._onPlantSeed?.(idx, this._selectedSeedId);
          });
          this._gardenPlotsHost.append(cellBtn);
        }
        this._currentGardenPlots = gar.plots;
        const sps = state.sps();
        const seedCost = calculateSeedPlantCost(this._selectedSeedId, sps);
        for (let i = 0; i < total; i += 1) {
          const btn = this._gardenPlotsHost.children[i];
          const cell = gar.plots[i];
          if (!btn) continue;
          const seed = cell ? SEED_BY_ID[cell.seedId] : null;
          swapIcon(this._doc, btn, seed?.spriteId || '', seed?.name);
          if (!cell) {
            setText(btn._label || btn, `Vazio · Plantar ${formatSouls(seedCost)}`);
          } else {
            setText(btn._label || btn, `${seed?.name || cell.seedId} · ${cell.mature ? 'Madura — colher' : `crescendo (${cell.ageTicks})`}`);
          }
        }
      }
    }

    // Mercado
    setHidden(this._sections.market, !unlocked.market);
    if (unlocked.market && state.minigames?.market) {
      const mkt = state.minigames.market;
      const qtyMap = state.quantities();
      const throneLv = state.generatorLevel('obsidian_throne');
      const sps = state.sps();
      for (const g of MARKET_GOODS) {
        const nodes = this._marketRows.get(g.id);
        const entry = mkt.goods?.[g.id];
        if (!nodes || !entry) continue;
        const maxStock = calculateGoodMaxStock(g, qtyMap, throneLv);
        const tradeSouls = calculateMarketTradeSouls(entry.price, 1, sps);
        setText(
          nodes.info._label || nodes.info,
          `${g.name} (${entry.stock}/${maxStock}) · Índice ${entry.price} (${formatSouls(tradeSouls)} almas)`,
        );
        setDisabled(nodes.buyBtn, entry.stock >= maxStock);
        setDisabled(nodes.sellBtn, entry.stock <= 0);
      }
    }
  }
}
