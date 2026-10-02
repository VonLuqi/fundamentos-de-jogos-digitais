/**
 * Códice Livro — widget flutuante + drawer (Fase B / Task B1).
 * docs/plano-despertar-producao-profundo.md · contratos B-D1…B-D5
 */

import { CODEX_TIP_MS, EDU_LOG_IDS, EDU_LOGS, EDU_LOG_TIP, eduLogTip } from '../config/edu-logs.js';

export const CODEX_DRAWER_SEEN_PREFIX = 'despertar:codex:seenDrawer:';

export { CODEX_TIP_MS, EDU_LOG_TIP, eduLogTip };

const CODEX_LOCKED_TITLE = 'Página selada';
const CODEX_LOCKED_BODY = 'O Submundo só revela o que a corrida já encontrou.';
const CODEX_EMPTY = 'O Códice espera o primeiro clique.';

/**
 * Entrada do Códice do Loop (Task 10a / B1).
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

const FOCUSABLE =
  'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * @param {string|null|undefined} userId
 */
export function drawerSeenStorageKey(userId) {
  const id = String(userId || 'anon').trim() || 'anon';
  return `${CODEX_DRAWER_SEEN_PREFIX}${id}`;
}

/**
 * @param {string|null|undefined} userId
 * @param {Storage|null|undefined} [storage]
 * @returns {string[]}
 */
export function loadDrawerSeen(userId, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return [];
  try {
    const raw = storage.getItem(drawerSeenStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((id) => String(id)).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * @param {string|null|undefined} userId
 * @param {Iterable<string>} ids
 * @param {Storage|null|undefined} [storage]
 */
export function saveDrawerSeen(
  userId,
  ids,
  storage = typeof localStorage !== 'undefined' ? localStorage : null,
) {
  if (!storage) return;
  try {
    const list = [...new Set([...ids].map((id) => String(id)).filter(Boolean))];
    storage.setItem(drawerSeenStorageKey(userId), JSON.stringify(list));
  } catch {
    /* quota / private mode */
  }
}

/**
 * @param {string[]|null|undefined} eduLogsSeen
 * @param {Iterable<string>} drawerSeen
 * @returns {string[]}
 */
export function computeUnseenIds(eduLogsSeen, drawerSeen) {
  const seenDrawer = new Set(
    [...(drawerSeen || [])].map((id) => String(id)),
  );
  const unlocked = Array.isArray(eduLogsSeen) ? eduLogsSeen : [];
  return unlocked.filter((id) => !seenDrawer.has(String(id)));
}

/**
 * @param {number} count
 * @returns {string}
 */
export function formatCodexBadge(count) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (n <= 0) return '';
  if (n > 9) return '9+';
  return String(n);
}

/**
 * @param {number} count
 */
export function codexBookAriaLabel(count) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (n <= 0) return 'Códice do Loop';
  const pages = n === 1 ? '1 página nova' : `${n} páginas novas`;
  return `Códice do Loop — ${pages}`;
}

function prefersReducedMotion(doc = typeof document !== 'undefined' ? document : null) {
  try {
    return Boolean(doc?.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  } catch {
    return false;
  }
}

/**
 * Widget livro + drawer do Códice.
 */
export class CodexBook {
  /**
   * @param {Document|null|undefined} root
   * @param {{
   *   getUserId?: () => string|null|undefined,
   *   getState?: () => object|null|undefined,
   *   storage?: Storage|null,
   *   onOpen?: () => void,
   * }} [options]
   */
  constructor(root, options = {}) {
    this.root = root || (typeof document !== 'undefined' ? document : null);
    this.getUserId = typeof options.getUserId === 'function' ? options.getUserId : () => null;
    this.getState = typeof options.getState === 'function' ? options.getState : () => null;
    this.onOpen = typeof options.onOpen === 'function' ? options.onOpen : null;
    this.storage = options.storage !== undefined
      ? options.storage
      : (typeof localStorage !== 'undefined' ? localStorage : null);

    this.button = null;
    this.badge = null;
    this.drawer = null;
    this.panel = null;
    this.list = null;
    this.empty = null;
    this._focusBefore = null;
    this._onKey = (event) => this.#onKeyDown(event);
    this._drawerSeen = new Set();
    this._unseenIds = [];
    this._tipAnnounced = new Set();
    this._tipTimer = null;
    this._tipEl = null;
    this._tipText = null;
    this._bound = false;
    this._now = typeof options.now === 'function' ? options.now : () => Date.now();
    this._setTimeout = typeof options.setTimeout === 'function'
      ? options.setTimeout
      : (typeof globalThis.setTimeout === 'function' ? globalThis.setTimeout.bind(globalThis) : null);
    this._clearTimeout = typeof options.clearTimeout === 'function'
      ? options.clearTimeout
      : (typeof globalThis.clearTimeout === 'function' ? globalThis.clearTimeout.bind(globalThis) : null);
  }

  get isOpen() {
    return Boolean(this.drawer && !this.drawer.hidden);
  }

  get unseenCount() {
    return this._unseenIds.length;
  }

  mount() {
    if (!this.root || this._bound) return this;
    this.button = this.root.getElementById('despertar-codex-book');
    this.drawer = this.root.getElementById('despertar-codex-drawer');
    if (!this.button || !this.drawer) return this;

    this.badge = this.button.querySelector('.despertar-codex-book__badge');
    this.panel = this.drawer.querySelector('.despertar-codex-drawer__panel');
    this.list = this.root.getElementById('codex-drawer-list');
    this.empty = this.root.getElementById('codex-drawer-empty');
    this.#ensureTipNode();

    this._drawerSeen = new Set(loadDrawerSeen(this.getUserId(), this.storage));
    const initial = this.getState() || {};
    const initialSeen = Array.isArray(initial.eduLogsSeen)
      ? initial.eduLogsSeen
      : (Array.isArray(initial.edu_logs_seen) ? initial.edu_logs_seen : []);
    // Não re-tipar logs já desbloqueados no boot.
    this._tipAnnounced = new Set(initialSeen.map((id) => String(id)));

    this.button.addEventListener('click', () => {
      if (this.isOpen) this.close();
      else this.open();
    });

    this.drawer.querySelectorAll('[data-codex-close]').forEach((node) => {
      node.addEventListener('click', () => this.close());
    });

    this._bound = true;
    this.sync(this.getState(), { announceTips: false });
    return this;
  }

  /**
   * @param {object|null|undefined} [state]
   * @param {{ announceTips?: boolean }} [opts]
   */
  sync(state = this.getState(), opts = {}) {
    if (!this.button) return;
    const announceTips = opts.announceTips !== false;
    const snap = state && typeof state === 'object' ? state : {};
    const eduLogsSeen = Array.isArray(snap.eduLogsSeen)
      ? snap.eduLogsSeen
      : (Array.isArray(snap.edu_logs_seen) ? snap.edu_logs_seen : []);

    this._unseenIds = computeUnseenIds(eduLogsSeen, this._drawerSeen);
    const count = this._unseenIds.length;
    const label = codexBookAriaLabel(count);
    this.button.setAttribute('aria-label', label);
    this.button.setAttribute('aria-expanded', String(this.isOpen));

    const pulse = count > 0 && !prefersReducedMotion(this.root);
    this.button.classList.toggle('is-pulse', pulse);
    this.button.classList.toggle('has-unseen', count > 0);

    if (this.badge) {
      const text = formatCodexBadge(count);
      this.badge.textContent = text;
      this.badge.hidden = !text;
    }

    if (this.isOpen) {
      this.#renderDrawerList(snap);
      this.hideTip();
    } else if (announceTips) {
      this.#announceNewTips(eduLogsSeen);
    }
  }

  open() {
    if (!this.drawer || this.isOpen) return;
    this.onOpen?.();
    this.hideTip();
    const state = this.getState();
    this.#renderDrawerList(state);
    this._focusBefore = this.root.activeElement;
    this.drawer.hidden = false;
    this.drawer.setAttribute('aria-hidden', 'false');
    this.button?.setAttribute('aria-expanded', 'true');
    this.root.addEventListener('keydown', this._onKey);
    this.markCurrentSeen();
    const closeBtn = this.drawer.querySelector('[data-codex-close].despertar-codex-drawer__close');
    (closeBtn || this.panel)?.focus?.();
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

  /** Marca logs unlocked atuais como lidos no widget (B-D5). */
  markCurrentSeen() {
    const state = this.getState() || {};
    const eduLogsSeen = Array.isArray(state.eduLogsSeen)
      ? state.eduLogsSeen
      : (Array.isArray(state.edu_logs_seen) ? state.edu_logs_seen : []);
    for (const id of eduLogsSeen) {
      this._drawerSeen.add(String(id));
      this._tipAnnounced.add(String(id));
    }
    saveDrawerSeen(this.getUserId(), this._drawerSeen, this.storage);
    this.hideTip();
    this.sync(state, { announceTips: false });
  }

  /**
   * @param {string} logId
   * @returns {boolean}
   */
  showTip(logId) {
    const text = eduLogTip(logId);
    if (!text || !this._tipEl || !this._tipText) return false;
    this.#ensureTipNode();
    this._tipText.textContent = text;
    this._tipEl.hidden = false;
    this._tipEl.classList?.add?.('is-visible');
    if (this._tipEl.dataset) this._tipEl.dataset.logId = String(logId);
    if (this._tipTimer != null) {
      this._clearTimeout?.(this._tipTimer);
      this._tipTimer = null;
    }
    if (this._setTimeout) {
      this._tipTimer = this._setTimeout(() => this.hideTip(), CODEX_TIP_MS);
    }
    return true;
  }

  hideTip() {
    if (this._tipTimer != null) {
      this._clearTimeout?.(this._tipTimer);
      this._tipTimer = null;
    }
    if (!this._tipEl) return;
    this._tipEl.classList?.remove?.('is-visible');
    this._tipEl.hidden = true;
    if (this._tipEl.dataset) delete this._tipEl.dataset.logId;
  }

  get tipVisible() {
    if (!this._tipEl || this._tipEl.hidden) return false;
    if (this._tipEl.classList?.contains?.('is-visible')) return true;
    return String(this._tipEl.className || '').split(/\s+/).includes('is-visible');
  }

  #ensureTipNode() {
    if (!this.root || !this.button) return;
    let tip = this.root.getElementById('despertar-codex-tip');
    if (!tip) {
      tip = this.root.createElement('div');
      tip.id = 'despertar-codex-tip';
      tip.className = 'despertar-codex-tip';
      tip.setAttribute('role', 'status');
      tip.setAttribute('aria-live', 'polite');
      tip.hidden = true;
      const text = this.root.createElement('p');
      text.className = 'despertar-codex-tip__text';
      tip.append(text);
      const host = this.button.parentElement || this.root.body || this.root.documentElement;
      host?.append?.(tip);
    }
    this._tipEl = tip;
    this._tipText = tip.querySelector('.despertar-codex-tip__text') || tip;
  }

  /**
   * Uma tip por vez — a mais recente (ordem do catálogo) entre unlocks novos com tip.
   * @param {string[]} eduLogsSeen
   */
  #announceNewTips(eduLogsSeen) {
    const unlocked = Array.isArray(eduLogsSeen) ? eduLogsSeen.map(String) : [];
    const fresh = [];
    for (const id of unlocked) {
      if (this._tipAnnounced.has(id)) continue;
      this._tipAnnounced.add(id);
      if (eduLogTip(id)) fresh.push(id);
    }
    if (!fresh.length || this.isOpen) return;
    // Mais recente no catálogo EDU_LOG_IDS; fallback = última da lista seen.
    let pick = fresh[fresh.length - 1];
    let bestIdx = -1;
    for (const id of fresh) {
      const idx = EDU_LOG_IDS.indexOf(id);
      if (idx > bestIdx) {
        bestIdx = idx;
        pick = id;
      }
    }
    this.showTip(pick);
  }

  #renderDrawerList(state) {
    if (!this.list || !this.empty) return;
    const view = describeCodex(state);
    this.empty.hidden = view.showList;
    this.list.hidden = !view.showList;
    if (!view.showList) {
      this.empty.textContent = view.emptyText;
      this.list.replaceChildren();
      return;
    }

    this.list.replaceChildren();
    for (const entry of view.entries) {
      if (!entry.unlocked) continue;
      const item = this.root.createElement('li');
      item.className = 'despertar-codex-entry is-unlocked';
      if (item.dataset) item.dataset.logId = entry.id;
      else item.setAttribute?.('data-log-id', entry.id);

      const title = this.root.createElement('p');
      title.className = 'despertar-codex-entry__title';
      title.textContent = entry.title;

      const body = this.root.createElement('p');
      body.className = 'despertar-codex-entry__body';
      body.textContent = entry.body;

      item.append(title, body);
      this.list.append(item);
    }
  }

  #onKeyDown(event) {
    if (!this.isOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key !== 'Tab' || !this.panel) return;
    const focusable = [...this.panel.querySelectorAll(FOCUSABLE)];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && this.root.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this.root.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
