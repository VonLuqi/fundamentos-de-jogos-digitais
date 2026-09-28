/**
 * Subabas de loja (Fase C) — tablist interno + partição Disponíveis/Comprados.
 * docs/plano-despertar-producao-profundo.md · contratos C-D1…C-D6
 */

export const PANTHEON_EMPTY_AVAILABLE = 'O Panteão está completo.';
export const PANTHEON_EMPTY_OWNED = 'Ainda não selaste nenhum talento.';
export const BANCADA_EMPTY_AVAILABLE = 'A Bancada não tem mais sentenças.';
export const BANCADA_EMPTY_OWNED = 'Nenhuma sentença comprada.';
export const SHOP_OWNED_BADGE = 'Ativo';

/**
 * Particiona catálogo: owned vs available; available ordenado affordable → pobre → locked.
 * Empate: ordem de entrada (catálogo).
 *
 * @template T
 * @param {T[]} catalog
 * @param {{
 *   isOwned: (item: T) => boolean,
 *   canBuy: (item: T) => boolean,
 *   isLocked?: (item: T) => boolean,
 * }} opts
 */
export function partitionShopCatalog(catalog, {
  isOwned,
  canBuy,
  isLocked = () => false,
} = {}) {
  const list = Array.isArray(catalog) ? catalog : [];
  const owned = [];
  const affordable = [];
  const poor = [];
  const locked = [];
  for (const item of list) {
    if (isOwned(item)) {
      owned.push(item);
      continue;
    }
    if (isLocked(item)) {
      locked.push(item);
      continue;
    }
    if (canBuy(item)) affordable.push(item);
    else poor.push(item);
  }
  return {
    available: [...affordable, ...poor, ...locked],
    owned,
    counts: {
      available: affordable.length + poor.length + locked.length,
      owned: owned.length,
      affordable: affordable.length,
    },
  };
}

/**
 * Label com contador — `Disponíveis (3)`.
 * @param {string} base
 * @param {number} count
 */
export function shopTabLabel(base, count) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  return `${base} (${n})`;
}

/**
 * Tablist escopado (não vaza para abas do Domínio).
 * @param {Element|null|undefined} tablist
 * @param {{
 *   onActivate?: (tab: Element, key: string) => void,
 *   keyFromTab?: (tab: Element) => string,
 *   doc?: Document,
 * }} [options]
 * @returns {{ activate: Function, getSelectedKey: Function, tabs: Element[] }|null}
 */
export function bindSubTabs(tablist, options = {}) {
  if (!tablist) return null;
  const doc = options.doc
    || tablist.ownerDocument
    || (typeof document !== 'undefined' ? document : null);
  const tabs = [...tablist.querySelectorAll(':scope > [role="tab"]')];
  if (!tabs.length) return null;

  const keyFromTab = typeof options.keyFromTab === 'function'
    ? options.keyFromTab
    : (tab) => {
      const id = String(tab.id || '');
      if (id.endsWith('-available')) return 'available';
      if (id.endsWith('-owned')) return 'owned';
      return id;
    };

  function panelFor(tab) {
    const panelId = tab.getAttribute('aria-controls');
    if (!panelId || !doc) return null;
    return doc.getElementById(panelId);
  }

  function activate(tab, { focus = false, silent = false } = {}) {
    if (!tab || !tabs.includes(tab)) return;
    tabs.forEach((item) => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      const panel = panelFor(item);
      if (panel) panel.hidden = !selected;
    });
    if (focus && typeof tab.focus === 'function') tab.focus();
    if (!silent) options.onActivate?.(tab, keyFromTab(tab));
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => activate(tab));
  });

  tablist.addEventListener('keydown', (event) => {
    const target = event.target;
    if (!target || typeof target.closest !== 'function' || !target.closest('[role="tab"]')) {
      return;
    }
    const current = tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true');
    if (current < 0) return;

    let nextIndex = -1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (current + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (current - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    activate(tabs[nextIndex], { focus: true });
  });

  const initially = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0];
  activate(initially, { silent: true });

  return {
    activate,
    getSelectedKey: () => {
      const selected = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true');
      return selected ? keyFromTab(selected) : null;
    },
    tabs,
  };
}

/**
 * Escolhe subaba default (C-D5): Disponíveis se n>0, senão Comprados.
 * @param {number} availableCount
 * @returns {'available'|'owned'}
 */
export function defaultShopSubTab(availableCount) {
  return Number(availableCount) > 0 ? 'available' : 'owned';
}
