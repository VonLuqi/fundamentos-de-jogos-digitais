/**
 * Abas Dragão e Estações (Fase F8) — a mecânica já existia em GameState/DragonSystem/SeasonSystem;
 * aqui fica só a tela. Redesenha quando muda algo que o jogador vê (estágio, auras, o que dá
 * para pagar); a contagem regressiva da estação atualiza sem redesenhar.
 */

import {
  DRAGON_AURAS,
  DRAGON_MAX_STAGE,
  getDragonAura,
  getDragonStage,
} from '../config/dragon.js';
import { GENERATORS } from '../config/generators.js';
import { SATURN_KING_STAGES, SEASONS, getSeason } from '../config/seasons.js';
import { cmp } from '../core/decimal.js';
import { findHighestOwnedGenerator, isDragonUnlocked, normalizeDragonState } from '../core/DragonSystem.js';
import {
  calculateSeasonSwitchCost,
  isSeasonSwitcherUnlocked,
  normalizeSeasonState,
} from '../core/SeasonSystem.js';
import { formatSouls } from './NumberFormatter.js';
import { createSpriteNode, seasonSprite } from './world/SpriteAtlas.js';

const GENERATOR_BY_ID = Object.freeze(Object.fromEntries(GENERATORS.map((g) => [g.id, g])));

/** "Antestéria (Festival das Flores…)" → título + subtítulo; nomes de aura perdem o original em inglês. */
export function splitDisplayName(name = '', { keepSubtitle = true } = {}) {
  const m = String(name).match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (!m) return { title: String(name), sub: '' };
  return { title: m[1], sub: keepSubtitle ? m[2] : '' };
}

const stateNow = (state) => (typeof state?.nowMs === 'function' ? state.nowMs() : Date.now());

export function isDragonTabUnlocked(state = {}) {
  return isDragonUnlocked(state.talents || [], state.dragon || null);
}

export function isSeasonsTabUnlocked(state = {}) {
  const seasons = state.seasons || {};
  return isSeasonSwitcherUnlocked(state.talents || [])
    || Boolean(seasons.activeSeason) || Number(seasons.saturnKingLevel) > 0;
}

export function isSaturnaliaActive(state = {}) {
  const s = normalizeSeasonState(state.seasons || {}, { nowMs: stateNow(state) });
  return s.activeSeason === 'saturnalia';
}

export function formatSeasonRemaining(ms = 0) {
  const total = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  return `${m}min ${String(total % 60).padStart(2, '0')}s`;
}

const genName = (id) => GENERATOR_BY_ID[id]?.name || id;

export function dragonFailureMessage(result = {}) {
  switch (result?.reason) {
    case 'insufficient_souls': return `Faltam almas: o Ovo pede ${formatSouls(result.cost || '0')}.`;
    case 'insufficient_generators': return `Precisas de ${result.requiredQty} unidades de um mesmo gerador para o sacrifício.`;
    case 'max_stage': return 'O Ladão já está na forma soberana.';
    case 'locked': return 'Sela o Ovo Primordial no Rio do Lethe para despertar o Dragão.';
    case 'slot_locked': return 'Este slot de aura abre no último estágio do Dragão.';
    case 'stage_too_low': return `Esta aura pede o Dragão no estágio ${result.requiredStage}.`;
    case 'aura_already_equipped': return 'Esta aura já está no outro slot.';
    case 'no_generator_to_sacrifice': return 'Trocar de aura sacrifica 1 gerador — compra algum primeiro.';
    default: return 'O Dragão não respondeu.';
  }
}

export function seasonFailureMessage(result = {}) {
  switch (result?.reason) {
    case 'insufficient_souls': return `Faltam almas: custa ${formatSouls(result.cost || '0')}.`;
    case 'locked': return 'Sela o Rodízio das Estações no Rio do Lethe para trocar de estação.';
    case 'requires_saturnalia': return 'O Rei Saturno só desperta durante a Saturnália.';
    case 'max_level': return 'O Rei Saturno já é soberano.';
    default: return 'A estação não mudou.';
  }
}

export class DragonSeasonsView {
  /**
   * @param {{
   *   document: Document,
   *   onEvolve?: (targetGeneratorId: string|null) => any,
   *   onSetAura?: (slot: number, auraId: string|null) => any,
   *   onActivateSeason?: (seasonId: string) => any,
   *   onUpgradeSaturn?: () => any,
   * }} options
   */
  constructor(options = {}) {
    this.doc = options.document;
    this.onEvolve = options.onEvolve || (() => null);
    this.onSetAura = options.onSetAura || (() => null);
    this.onActivateSeason = options.onActivateSeason || (() => null);
    this.onUpgradeSaturn = options.onUpgradeSaturn || (() => null);
    this._sacrificeId = null;
    this._dragonSig = '';
    this._seasonSig = '';
    this._countdown = null;
  }

  mount(dragonPanel = null, seasonsPanel = null) {
    this.dragonPanel = dragonPanel;
    this.seasonsPanel = seasonsPanel;
    return this;
  }

  #el(tag, className = '', text = null) {
    const el = this.doc.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  #button(label, onClick, { disabled = false, variant = '' } = {}) {
    const b = this.#el('button', `despertar-rites__btn${variant ? ` despertar-rites__btn--${variant}` : ''}`, label);
    b.type = 'button';
    b.disabled = Boolean(disabled);
    b.addEventListener('click', () => { if (!b.disabled) onClick(); });
    return b;
  }

  #sprite(spriteId, name, extra = '') {
    return createSpriteNode(this.doc, seasonSprite(spriteId, name), {
      className: `despertar-sprite despertar-rites__art${extra ? ` ${extra}` : ''}`,
    });
  }

  #feedback(panel) {
    const live = panel?.querySelector?.('.despertar-rites__feedback');
    return live || null;
  }

  /** Mensagem de falha (aria-live) no painel correspondente. */
  showFeedback(which, message = '') {
    const live = this.#feedback(which === 'seasons' ? this.seasonsPanel : this.dragonPanel);
    if (live) live.textContent = message;
  }

  sync(state = {}) {
    this._lastState = state;
    if (this.dragonPanel) this.#syncDragon(state);
    if (this.seasonsPanel) this.#syncSeasons(state);
  }

  // ─── Dragão ───────────────────────────────────────────────────────────────

  #eligibleSacrifices(quantities, reqQty) {
    return GENERATORS.filter((g) => Math.floor(Number(quantities[g.id]) || 0) >= reqQty).map((g) => g.id);
  }

  #syncDragon(state) {
    const dragon = normalizeDragonState(state.dragon || {}, { upgrades: state.upgrades || [] });
    const stageDef = getDragonStage(dragon.stage);
    const quantities = typeof state.quantities === 'function' ? state.quantities() : (state.generators || {});
    const reqQty = Number(stageDef.nextStageSacrificeQty) || 0;
    const eligible = dragon.stage >= 1 && dragon.stage < DRAGON_MAX_STAGE ? this.#eligibleSacrifices(quantities, reqQty) : [];
    // Padrão do sacrifício: o gerador mais barato elegível (o jogador troca se quiser).
    if (!eligible.includes(this._sacrificeId)) this._sacrificeId = eligible[0] || null;
    const highest = findHighestOwnedGenerator(quantities, 1);
    const canHatch = dragon.stage === 0 && cmp(state.souls || '0', stageDef.nextStageSoulsCost || '0') >= 0;
    const sig = JSON.stringify([dragon, eligible, this._sacrificeId, highest?.id || null, canHatch]);
    if (sig === this._dragonSig) return;
    this._dragonSig = sig;

    const panel = this.dragonPanel;
    const root = this.#el('section', 'despertar-rites despertar-rites--dragon');
    root.append(this.#el('h3', 'despertar-subsection', 'Dragão Ctoniano'));

    const hero = this.#el('div', 'despertar-rites__hero');
    hero.append(this.#sprite(stageDef.spriteId, stageDef.name, 'despertar-rites__art--hero'));
    const heroText = this.#el('div', 'despertar-rites__hero-text');
    heroText.append(
      this.#el('p', 'despertar-rites__eyebrow', `Estágio ${dragon.stage} de ${DRAGON_MAX_STAGE}`),
      this.#el('p', 'despertar-rites__title', stageDef.name),
      this.#el('p', 'despertar-rites__blurb', stageDef.blurb),
    );
    hero.append(heroText);
    root.append(hero);

    const evolve = this.#el('div', 'despertar-rites__block');
    if (dragon.stage >= DRAGON_MAX_STAGE) {
      evolve.append(this.#el('p', 'despertar-rites__note', 'Forma soberana: os dois slots de aura estão abertos.'));
    } else {
      const next = getDragonStage(dragon.stage + 1);
      evolve.append(this.#el('p', 'despertar-rites__label', `Próximo: ${next.name}`));
      if (dragon.stage === 0) {
        evolve.append(this.#button(`Chocar o Ovo · ${formatSouls(stageDef.nextStageSoulsCost)} almas`,
          () => this.onEvolve(null), { disabled: !canHatch, variant: 'primary' }));
      } else {
        evolve.append(this.#el('p', 'despertar-rites__note', `Sacrifica ${reqQty} unidades de um mesmo gerador.`));
        if (eligible.length) {
          const select = this.#el('select', 'despertar-rites__select');
          select.setAttribute('aria-label', 'Gerador a sacrificar');
          for (const id of eligible) {
            const opt = this.#el('option', '', `${genName(id)} (${Math.floor(Number(quantities[id]) || 0)})`);
            opt.value = id;
            if (id === this._sacrificeId) opt.selected = true;
            select.append(opt);
          }
          select.addEventListener('change', () => {
            this._sacrificeId = select.value;
            this._dragonSig = '';
            this.#syncDragon(this._lastState || state);
          });
          evolve.append(select);
        }
        evolve.append(this.#button(eligible.length ? `Evoluir · −${reqQty} ${genName(this._sacrificeId)}` : `Evoluir · precisa de ${reqQty} de um gerador`,
          () => this.onEvolve(this._sacrificeId), { disabled: !eligible.length, variant: 'primary' }));
      }
    }
    root.append(evolve);

    const slotsWrap = this.#el('div', 'despertar-rites__block');
    slotsWrap.append(this.#el('p', 'despertar-rites__label', 'Auras'));
    if (stageDef.auraSlots < 1) {
      slotsWrap.append(this.#el('p', 'despertar-rites__note', 'O 1º slot de aura abre quando o Ovo choca.'));
    } else {
      const equipCost = highest ? `custa 1 ${genName(highest.id)}` : 'precisa de 1 gerador';
      for (const slot of [1, 2]) {
        const current = slot === 1 ? dragon.auraSlot1 : dragon.auraSlot2;
        const open = stageDef.auraSlots >= slot;
        const row = this.#el('div', `despertar-rites__slot${open ? '' : ' is-locked'}`);
        row.append(this.#el('span', 'despertar-rites__slot-label', `Slot ${slot}`));
        if (!open) {
          row.append(this.#el('span', 'despertar-rites__note', 'Abre no Ladão de Cem Cabeças.'));
        } else if (current) {
          const aura = getDragonAura(current);
          row.append(this.#el('span', 'despertar-rites__slot-aura', splitDisplayName(aura.name, { keepSubtitle: false }).title));
          row.append(this.#button('Remover', () => this.onSetAura(slot, null), { variant: 'ghost' }));
        } else {
          row.append(this.#el('span', 'despertar-rites__note', 'Vazio'));
        }
        slotsWrap.append(row);
      }
      const grid = this.#el('div', 'despertar-rites__grid');
      for (const aura of DRAGON_AURAS) {
        const unlocked = dragon.stage >= aura.minStage;
        const card = this.#el('article', `despertar-rites__card${unlocked ? '' : ' is-locked'}`);
        card.append(this.#sprite(aura.spriteId, aura.name));
        const body = this.#el('div', 'despertar-rites__card-body');
        body.append(
          this.#el('p', 'despertar-rites__card-title', splitDisplayName(aura.name, { keepSubtitle: false }).title),
          this.#el('p', 'despertar-rites__blurb', unlocked ? aura.blurb : `Abre no estágio ${aura.minStage}.`),
        );
        if (unlocked) {
          const actions = this.#el('div', 'despertar-rites__actions');
          for (const slot of [1, 2]) {
            if (stageDef.auraSlots < slot) continue;
            const here = (slot === 1 ? dragon.auraSlot1 : dragon.auraSlot2) === aura.id;
            const other = (slot === 1 ? dragon.auraSlot2 : dragon.auraSlot1) === aura.id;
            actions.append(this.#button(here ? `No slot ${slot}` : `Slot ${slot} · ${equipCost}`,
              () => this.onSetAura(slot, aura.id), { disabled: here || other || !highest }));
          }
          body.append(actions);
        }
        card.append(body);
        grid.append(card);
      }
      slotsWrap.append(grid);
    }
    root.append(slotsWrap);

    const live = this.#el('p', 'despertar-rites__feedback');
    live.setAttribute('aria-live', 'polite');
    root.append(live);
    panel.replaceChildren(root);
  }

  // ─── Estações ─────────────────────────────────────────────────────────────

  #syncSeasons(state) {
    const nowMs = stateNow(state);
    const seasons = normalizeSeasonState(state.seasons || {}, { nowMs, upgrades: state.upgrades || [] });
    const cost = calculateSeasonSwitchCost(seasons.switchesCount);
    const souls = state.souls || '0';
    const canSwitch = cmp(souls, cost) >= 0;
    const switcher = isSeasonSwitcherUnlocked(state.talents || []);
    const saturnNext = SATURN_KING_STAGES[seasons.saturnKingLevel + 1] || null;
    const canSaturn = Boolean(saturnNext) && cmp(souls, saturnNext.upgradeCost) >= 0;
    const sig = JSON.stringify([seasons.activeSeason, seasons.switchesCount, seasons.saturnKingLevel,
      seasons.deerCaught, seasons.unlockedDrops.length, canSwitch, canSaturn, switcher]);

    if (sig !== this._seasonSig) {
      this._seasonSig = sig;
      this.#renderSeasons(seasons, { cost, canSwitch, switcher, saturnNext, canSaturn });
    }
    if (this._countdown) {
      this._countdown.textContent = seasons.activeSeason && seasons.expiresAt
        ? `Termina em ${formatSeasonRemaining(seasons.expiresAt - nowMs)}`
        : '';
    }
  }

  #renderSeasons(seasons, { cost, canSwitch, switcher, saturnNext, canSaturn }) {
    const panel = this.seasonsPanel;
    const root = this.#el('section', 'despertar-rites despertar-rites--seasons');
    root.append(this.#el('h3', 'despertar-subsection', 'Estações do Submundo'));

    const active = seasons.activeSeason ? getSeason(seasons.activeSeason) : null;
    const now = this.#el('div', 'despertar-rites__hero');
    if (active) {
      const { title, sub } = splitDisplayName(active.name);
      now.append(this.#sprite(active.spriteId, title, 'despertar-rites__art--hero'));
      const t = this.#el('div', 'despertar-rites__hero-text');
      this._countdown = this.#el('p', 'despertar-rites__eyebrow');
      t.append(this._countdown, this.#el('p', 'despertar-rites__title', title));
      if (sub) t.append(this.#el('p', 'despertar-rites__sub', sub));
      t.append(this.#el('p', 'despertar-rites__blurb', active.blurb));
      now.append(t);
    } else {
      this._countdown = null;
      now.append(this.#el('p', 'despertar-rites__note', 'Nenhuma estação ativa. Cada festival dura 24 horas.'));
    }
    root.append(now);

    const list = this.#el('div', 'despertar-rites__block');
    list.append(this.#el('p', 'despertar-rites__label', switcher
      ? `Trocar de estação · ${formatSouls(cost)} almas (dobra a cada troca)`
      : 'Sela o Rodízio das Estações no Rio do Lethe para escolher o festival.'));
    const grid = this.#el('div', 'despertar-rites__grid');
    for (const season of SEASONS) {
      const { title, sub } = splitDisplayName(season.name);
      const isActive = seasons.activeSeason === season.id;
      const card = this.#el('article', `despertar-rites__card${isActive ? ' is-active' : ''}`);
      card.append(this.#sprite(season.spriteId, title));
      const body = this.#el('div', 'despertar-rites__card-body');
      body.append(this.#el('p', 'despertar-rites__card-title', title));
      if (sub) body.append(this.#el('p', 'despertar-rites__sub', sub));
      body.append(this.#el('p', 'despertar-rites__blurb', season.blurb));
      if (switcher) {
        body.append(this.#button(isActive ? 'Ativa' : `Ativar · ${formatSouls(cost)}`,
          () => this.onActivateSeason(season.id), { disabled: isActive || !canSwitch, variant: isActive ? 'ghost' : '' }));
      }
      card.append(body);
      grid.append(card);
    }
    list.append(grid);
    root.append(list);

    if (seasons.activeSeason === 'saturnalia' || seasons.saturnKingLevel > 0) {
      const king = this.#el('div', 'despertar-rites__block');
      const cur = SATURN_KING_STAGES[seasons.saturnKingLevel];
      king.append(this.#el('p', 'despertar-rites__label', `Rei Saturno · nível ${seasons.saturnKingLevel}: ${cur.name}`));
      if (saturnNext) {
        king.append(this.#el('p', 'despertar-rites__note', `Próximo: ${saturnNext.name} (+5% Almas/s e −1% nos custos por nível).`));
        king.append(this.#button(`Despertar · ${formatSouls(saturnNext.upgradeCost)} almas`,
          () => this.onUpgradeSaturn(), { disabled: !canSaturn || seasons.activeSeason !== 'saturnalia', variant: 'primary' }));
      } else {
        king.append(this.#el('p', 'despertar-rites__note', 'Soberano: +25% Almas/s e −5% nos custos.'));
      }
      root.append(king);
    }

    const deer = this.#el('div', 'despertar-rites__block despertar-rites__deer');
    deer.append(this.#sprite('corca_de_artemis', 'Corça de Ártemis'));
    deer.append(this.#el('p', 'despertar-rites__note', seasons.activeSeason === 'saturnalia'
      ? `Na Saturnália, Corças de Ártemis atravessam o Acheron — clica nelas. Capturadas: ${seasons.deerCaught}.`
      : `Corças de Ártemis aparecem durante a Saturnália. Capturadas: ${seasons.deerCaught}.`));
    root.append(deer);

    const live = this.#el('p', 'despertar-rites__feedback');
    live.setAttribute('aria-live', 'polite');
    root.append(live);
    panel.replaceChildren(root);
  }
}
