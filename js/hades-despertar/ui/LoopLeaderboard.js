/**
 * Placar do Loop — 3 leaderboards in-game (Juízo / Catábases / Almas).
 */

import { leaderboardGet } from '../../api.js';
import { applyPodiumClasses, podiumTierForRank } from '../../podium-vfx.js';
import { formatSouls } from './NumberFormatter.js';

export const LOOP_BOARD_LIMIT = 15;

export const LOOP_BOARD_SORTS = Object.freeze([
  { id: 'juizoBest', label: 'Juízo', blurb: 'Turma · recorde no Juízo — quem sustenta a série mais alta.' },
  { id: 'prestigeCount', label: 'Catábases', blurb: 'Turma · Catábases — quem avançou mais no Loop.' },
  { id: 'lifetimeSouls', label: 'Almas', blurb: 'Turma · almas totais — progresso acumulado no Acheron.' },
]);

const FOCUSABLE =
  'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * @param {unknown} value
 */
export function formatLoopBoardScore(value, sort = 'prestigeCount') {
  if (sort === 'lifetimeSouls') return formatSouls(value ?? 0);
  const n = Number(value) || 0;
  return n.toLocaleString('pt-BR');
}

/**
 * @param {object|null|undefined} self
 * @param {number|null|undefined} total
 * @param {string} [sort]
 */
export function describeLoopBoardSelf(self, total, sort = 'prestigeCount') {
  if (!self || self.rank == null) return '';
  const podium = podiumTierForRank(self.rank);
  const note = podium ? ` · Pódio ${podium.label}` : '';
  const totalLabel = total != null ? ` de ${Number(total).toLocaleString('pt-BR')}` : '';
  if (sort === 'juizoBest') {
    return `#${self.rank}${totalLabel} · recorde ${formatLoopBoardScore(self.juizoBest, sort)}${note}`;
  }
  if (sort === 'lifetimeSouls') {
    return `#${self.rank}${totalLabel} · ${formatLoopBoardScore(self.lifetimeSouls, sort)} almas${note}`;
  }
  const catabases = formatLoopBoardScore(self.prestigeCount, 'prestigeCount');
  const label = Number(self.prestigeCount) === 1 ? 'catábase' : 'catábases';
  return `#${self.rank}${totalLabel} · ${catabases} ${label}${note}`;
}

function scoreForRow(row, sort) {
  if (sort === 'juizoBest') return row.juizoBest;
  if (sort === 'lifetimeSouls') return row.lifetimeSouls;
  return row.prestigeCount;
}

function statusLabel(sort, turma, count) {
  const metric = sort === 'juizoBest'
    ? 'Juízo'
    : sort === 'lifetimeSouls'
      ? 'Almas'
      : 'Catábases';
  return turma
    ? `Turma ${turma} · top ${count} por ${metric}`
    : `Top ${count} por ${metric}`;
}

/**
 * Widget FAB + drawer do Placar do Loop (3 abas).
 */
export class LoopLeaderboard {
  /**
   * @param {Document|null|undefined} root
   * @param {{
   *   getToken?: () => string|null|undefined,
   *   onOpen?: () => void,
   *   fetchLeaderboard?: typeof leaderboardGet,
   * }} [options]
   */
  constructor(root, options = {}) {
    this.root = root || (typeof document !== 'undefined' ? document : null);
    this.getToken = typeof options.getToken === 'function' ? options.getToken : () => null;
    this.onOpen = typeof options.onOpen === 'function' ? options.onOpen : null;
    this.fetchLeaderboard = typeof options.fetchLeaderboard === 'function'
      ? options.fetchLeaderboard
      : leaderboardGet;

    this.button = null;
    this.drawer = null;
    this.panel = null;
    this.list = null;
    this.status = null;
    this.selfEl = null;
    this.blurbEl = null;
    this.tabButtons = [];
    this.sort = 'prestigeCount';
    this._focusBefore = null;
    this._bound = false;
    this._loading = false;
    this._requestId = 0;
    this._onKey = (event) => this.#onKeyDown(event);
  }

  get isOpen() {
    return Boolean(this.drawer && !this.drawer.hidden);
  }

  mount() {
    if (!this.root || this._bound) return this;
    this.button = this.root.getElementById('despertar-loop-board');
    this.drawer = this.root.getElementById('despertar-loop-board-drawer');
    if (!this.button || !this.drawer) return this;

    this.panel = this.drawer.querySelector('.despertar-codex-drawer__panel');
    this.list = this.root.getElementById('loop-board-list');
    this.status = this.root.getElementById('loop-board-status');
    this.selfEl = this.root.getElementById('loop-board-self');
    this.blurbEl = this.root.getElementById('loop-board-blurb');
    this.tabButtons = [...this.drawer.querySelectorAll('[data-loop-board-sort]')];

    this.button.addEventListener('click', () => {
      if (this.isOpen) this.close();
      else this.open();
    });

    this.drawer.querySelectorAll('[data-loop-board-close]').forEach((node) => {
      node.addEventListener('click', () => this.close());
    });

    this.tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = btn.getAttribute('data-loop-board-sort');
        if (!next || next === this.sort) return;
        this.setSort(next);
      });
    });

    this.#syncTabs();
    this.#syncBlurb();
    this._bound = true;
    return this;
  }

  setSort(sort) {
    const allowed = LOOP_BOARD_SORTS.some((item) => item.id === sort);
    this.sort = allowed ? sort : 'prestigeCount';
    this.#syncTabs();
    this.#syncBlurb();
    if (this.isOpen) void this.refresh();
  }

  open() {
    if (!this.drawer || this.isOpen) return;
    this.onOpen?.();
    this._focusBefore = this.root.activeElement;
    this.drawer.hidden = false;
    this.drawer.setAttribute('aria-hidden', 'false');
    this.button?.setAttribute('aria-expanded', 'true');
    this.root.addEventListener('keydown', this._onKey);
    const closeBtn = this.drawer.querySelector('[data-loop-board-close].despertar-codex-drawer__close');
    (closeBtn || this.panel)?.focus?.();
    void this.refresh();
  }

  close() {
    if (!this.drawer || !this.isOpen) return;
    this.drawer.hidden = true;
    this.drawer.setAttribute('aria-hidden', 'true');
    this.button?.setAttribute('aria-expanded', 'false');
    this.root.removeEventListener('keydown', this._onKey);
    const prev = this._focusBefore;
    this._focusBefore = null;
    if (prev && typeof prev.focus === 'function') {
      try {
        prev.focus();
      } catch {
        this.button?.focus();
      }
    } else {
      this.button?.focus();
    }
  }

  async refresh() {
    if (!this.list || !this.status) return;
    const token = this.getToken();
    const requestId = ++this._requestId;
    const sort = this.sort;
    this._loading = true;
    this.status.hidden = false;
    this.status.textContent = 'Consultando o Domínio…';
    this.list.hidden = true;
    this.list.replaceChildren();
    if (this.selfEl) {
      this.selfEl.hidden = true;
      this.selfEl.textContent = '';
    }

    if (!token) {
      this.status.textContent = 'Sessão inválida — o Placar do Loop ficou inacessível.';
      this._loading = false;
      return;
    }

    try {
      const payload = await this.fetchLeaderboard(token, {
        scope: 'turma',
        sort,
        limit: LOOP_BOARD_LIMIT,
      });
      if (requestId !== this._requestId) return;
      this.#renderPayload(payload, sort);
    } catch {
      if (requestId !== this._requestId) return;
      this.status.textContent = 'O Placar do Loop está inacessível no momento.';
      this.list.hidden = true;
    } finally {
      if (requestId === this._requestId) this._loading = false;
    }
  }

  #syncTabs() {
    this.tabButtons.forEach((btn) => {
      const on = btn.getAttribute('data-loop-board-sort') === this.sort;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
      btn.tabIndex = on ? 0 : -1;
    });
  }

  #syncBlurb() {
    const def = LOOP_BOARD_SORTS.find((item) => item.id === this.sort) || LOOP_BOARD_SORTS[1];
    if (this.blurbEl) this.blurbEl.textContent = def.blurb;
  }

  /**
   * @param {object|null|undefined} payload
   * @param {string} sort
   */
  #renderPayload(payload, sort) {
    const entries = Array.isArray(payload?.entries) ? payload.entries : [];
    const self = payload?.self || null;
    const total = payload?.total ?? entries.length;
    const turma = payload?.turma ? String(payload.turma) : null;

    if (this.status) {
      if (!entries.length) {
        this.status.hidden = false;
        this.status.textContent = 'Nenhuma alma neste escopo ainda.';
      } else {
        this.status.hidden = false;
        this.status.textContent = statusLabel(sort, turma, entries.length);
      }
    }

    if (!this.list) return;
    this.list.replaceChildren();
    if (!entries.length) {
      this.list.hidden = true;
    } else {
      this.list.hidden = false;
      for (const row of entries) {
        this.list.append(this.#buildRow(row, sort));
      }
    }

    if (this.selfEl) {
      const line = describeLoopBoardSelf(self, total, sort);
      if (line) {
        this.selfEl.hidden = false;
        this.selfEl.textContent = `Tu: ${line}`;
        applyPodiumClasses(this.selfEl, self?.rank);
      } else {
        this.selfEl.hidden = true;
        applyPodiumClasses(this.selfEl, null);
      }
    }
  }

  /**
   * @param {object} row
   * @param {string} sort
   */
  #buildRow(row, sort) {
    const li = this.root.createElement('li');
    li.className = 'despertar-loop-board-row';
    applyPodiumClasses(li, row.rank);

    const rank = this.root.createElement('span');
    rank.className = 'despertar-loop-board-row__rank';
    rank.textContent = `#${row.rank}`;
    const podium = podiumTierForRank(row.rank);
    if (podium) rank.title = podium.label;

    const name = this.root.createElement('span');
    name.className = 'despertar-loop-board-row__name';
    name.textContent = row.fullName || row.username || '—';
    if (row.username) name.title = `@${row.username}`;

    const score = this.root.createElement('span');
    score.className = 'despertar-loop-board-row__score';
    score.textContent = formatLoopBoardScore(scoreForRow(row, sort), sort);
    score.title = sort === 'juizoBest'
      ? 'Recorde no Juízo'
      : sort === 'lifetimeSouls'
        ? 'Almas totais'
        : 'Catábases';

    li.append(rank, name, score);
    return li;
  }

  #onKeyDown(event) {
    if (!this.isOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key !== 'Tab' || !this.panel) return;
    const nodes = [...this.panel.querySelectorAll(FOCUSABLE)].filter(
      (el) => el.offsetParent !== null || el === this.panel,
    );
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = this.root.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
