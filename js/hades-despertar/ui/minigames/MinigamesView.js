/**
 * MinigamesView (Fase F5 — Néctar do Lethe + 4 Minigames Temáticos).
 * Renderiza sob demanda (on-dirty / quando visível) o HUD de Néctar, botões de nível de gerador
 * e as secções dos 4 minigames (Panteão Ctoniano, Grimório de Hécate, Jardim de Perséfone e Mercado de Caronte).
 * Zero `requestAnimationFrame` próprio; respeita o orçamento de render da Fase Perf.
 */

import { GENERATORS } from '../../config/generators.js';
import {
  GARDEN_SEEDS,
  GARDEN_SOILS,
  GRIMOIRE_SPELLS,
  MARKET_GOODS,
  NECTAR_VARIANT_BY_ID,
  PANTHEON_SLOTS,
  PANTHEON_SPIRITS,
} from '../../config/minigames.js';
import { nextGeneratorLevelCost } from '../../core/NectarSystem.js';
import { calculateSpellCost } from '../../core/minigames/GrimoireSystem.js';
import { calculateSeedPlantCost } from '../../core/minigames/GardenSystem.js';
import { calculateGoodMaxStock, calculateMarketTradeSouls } from '../../core/minigames/MarketSystem.js';
import { formatSouls } from '../NumberFormatter.js';

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
    this._onBuyGood = typeof options.onBuyGood === 'function' ? options.onBuyGood : null;
    this._onSellGood = typeof options.onSellGood === 'function' ? options.onSellGood : null;

    this._host = null;
    this._nectarValEl = null;
    this._nectarStageEl = null;
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

    // 1. Bloco Néctar do Lethe
    const nectarBox = this._doc.createElement('section');
    nectarBox.className = 'despertar-nectar-panel';
    nectarBox.id = 'despertar-nectar-panel';

    const title = this._doc.createElement('h3');
    title.className = 'despertar-subsection';
    title.textContent = 'Néctar do Lethe & Artes Ctonianas';

    const statusLine = this._doc.createElement('p');
    statusLine.className = 'despertar-card__meta';
    this._nectarValEl = this._doc.createElement('span');
    this._nectarValEl.className = 'despertar-num';
    this._nectarValEl.dataset.nectarCount = '';
    this._nectarValEl.textContent = '0';
    this._nectarStageEl = this._doc.createElement('span');
    this._nectarStageEl.dataset.nectarStage = '';
    this._nectarStageEl.textContent = ' · Selado (requer 1B almas de vida)';
    statusLine.append('Néctares: ', this._nectarValEl, this._nectarStageEl);

    const actions = this._doc.createElement('div');
    actions.className = 'despertar-nectar-actions';

    const harvestBtn = this._doc.createElement('button');
    harvestBtn.type = 'button';
    harvestBtn.className = 'btn-gold';
    harvestBtn.dataset.action = 'harvest-nectar';
    harvestBtn.textContent = 'Colher Néctar';
    harvestBtn.disabled = true;
    harvestBtn.addEventListener?.('click', () => this._onHarvestNectar?.());
    this._harvestBtn = harvestBtn;

    const frenzyBtn = this._doc.createElement('button');
    frenzyBtn.type = 'button';
    frenzyBtn.className = 'despertar-ghost';
    frenzyBtn.dataset.action = 'nectar-frenzy';
    frenzyBtn.textContent = 'Frenesi de Néctar (×3 SPS / 1h · 1 Néctar)';
    frenzyBtn.disabled = true;
    frenzyBtn.addEventListener?.('click', () => this._onActivateFrenzy?.());
    this._frenzyBtn = frenzyBtn;

    actions.append(harvestBtn, frenzyBtn);

    // Lista compacta de Níveis de Gerador
    const levelsList = this._doc.createElement('div');
    levelsList.className = 'despertar-nectar-levels';
    for (const gen of GENERATORS) {
      const btn = this._doc.createElement('button');
      btn.type = 'button';
      btn.className = 'despertar-debug__grant';
      btn.dataset.levelUpGen = gen.id;
      btn.textContent = `${gen.name} Lv.0 (1 Néctar)`;
      btn.disabled = true;
      btn.addEventListener?.('click', () => this._onLevelUpGenerator?.(gen.id));
      levelsList.append(btn);
      this._levelBtns.set(gen.id, btn);
    }

    nectarBox.append(title, statusLine, actions, levelsList);
    host.append(nectarBox);

    // 2. Secções dos 4 Minigames (ocultas até que o gerador correspondente atinja Lv.1)
    this.#mountPantheonSection(host);
    this.#mountGrimoireSection(host);
    this.#mountGardenSection(host);
    this.#mountMarketSection(host);

    return this;
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
      row.append(label, select);
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
      const btn = this._doc.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-gold';
      btn.dataset.castSpell = sp.id;
      btn.textContent = sp.name;
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

    const plotsHost = this._doc.createElement('div');
    plotsHost.className = 'despertar-garden-grid';
    this._gardenPlotsHost = plotsHost;

    sec.append(h4, soilSelect, plotsHost);
    this._sections.garden = sec;
    host.append(sec);
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

      const info = this._doc.createElement('span');
      info.textContent = `${g.symbol} · ${g.name}`;

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
      : { unlocked: false, stage: 'locked', canManualHarvest: false, variantId: 'nectar_normal' };
    const vDef = NECTAR_VARIANT_BY_ID[cycle.variantId] || NECTAR_VARIANT_BY_ID.nectar_normal;

    if (!cycle.unlocked) {
      setText(this._nectarStageEl, ' · Selado (requer 1B almas de vida)');
      setDisabled(this._harvestBtn, true);
    } else {
      const stageLabels = {
        budding: 'Brotando',
        mature: 'Maduro (50% chance)',
        ripe: 'Pronto (100%)',
        autoharvest: 'Queda iminente',
      };
      setText(this._nectarStageEl, ` · ${vDef.name}: ${stageLabels[cycle.stage] || cycle.stage}`);
      setDisabled(this._harvestBtn, !cycle.canManualHarvest);
    }

    const canFrenzy = !state.nectarFrenzyUsedThisRun && (nectar >= 1 || state.isFreeShopping?.());
    setDisabled(this._frenzyBtn, !canFrenzy);

    for (const gen of GENERATORS) {
      const btn = this._levelBtns.get(gen.id);
      if (!btn) continue;
      const lv = typeof state.generatorLevel === 'function'
        ? state.generatorLevel(gen.id)
        : Number(state.generatorLevels?.[gen.id] || 0);
      const cost = nextGeneratorLevelCost(lv);
      setText(btn, `${gen.name} Lv.${lv} (${cost} Néctar)`);
      setDisabled(btn, !state.isFreeShopping?.() && nectar < cost);
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
        setText(btn, `${sp.name} (${cost} Éter)`);
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
          cellBtn.className = 'despertar-debug__grant';
          cellBtn.dataset.gardenPlot = String(idx);
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
          if (!cell) {
            setText(btn, `[Vazio · Plantar ${formatSouls(seedCost)}]`);
          } else {
            setText(btn, `[${cell.seedId} · ${cell.mature ? 'Madura' : `Tick ${cell.ageTicks}`}]`);
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
          nodes.info,
          `${g.symbol} (${entry.stock}/${maxStock}) · Índice ${entry.price} (${formatSouls(tradeSouls)} almas)`,
        );
        setDisabled(nodes.buyBtn, entry.stock >= maxStock);
        setDisabled(nodes.sellBtn, entry.stock <= 0);
      }
    }
  }
}
