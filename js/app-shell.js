'use strict';

import { setRainbowVfxSuspended } from './achievements-ui.js';
import {
  DESPERTAR_GATE_ID,
  DESPERTAR_NAV_LABEL,
  DESPERTAR_NAV_LOCKED_LABEL,
  fetchLessonGates,
  getBootstrapGates,
} from './api.js';

const mobileQuery = window.matchMedia('(max-width: 980px)');
/** Preferência de aside recolhido no desktop (Q18 / Task S.1). */
export const NAV_COLLAPSED_STORAGE_KEY = 'hades-shell-nav-collapsed';
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

let lastFocusedBeforeOpen = null;

/**
 * Destinos primários do aside (aluno):
 * Inicio · Painel · Aulas · Conquistas · Salão Espiritual · Grimório Pessoal · O Despertar
 * Condicional admin: Almas Registradas (não conta no teto do aluno).
 */
function mapRouteToNavItem(route) {
  if (route === 'dashboard') return 'dashboard';
  if (route === 'companheiro') return 'salao';
  if (route === 'aulas') return 'aulas';
  if (route === 'conquistas') return 'conquistas';
  if (route === 'salao') return 'salao';
  if (route === 'grimorio' || route === 'grimorio-nota' || route === 'grimorio-editar') return 'grimorio';
  if (route === 'despertar') return 'despertar';
  if (route === 'classind-dle') return 'aulas';
  if (route === 'souls') return 'souls';
  if (/^aula\d+$/i.test(route)) return 'aulas';
  return route;
}

/**
 * Admin sempre vê o link vivo (pode pré-visualizar). Aluno só quando o Acheron está aberto.
 */
export function applyDespertarNavState(shell, { published = false, isAdmin = false } = {}) {
  const root = shell || document.querySelector('[data-shell]');
  if (!root) return;
  const link = root.querySelector('[data-nav-item="despertar"]');
  if (!link) return;

  const open = Boolean(isAdmin || published);
  link.classList.toggle('is-locked', !open);
  link.textContent = open ? DESPERTAR_NAV_LABEL : DESPERTAR_NAV_LOCKED_LABEL;

  if (open) {
    link.removeAttribute('aria-disabled');
    link.removeAttribute('tabindex');
    link.removeAttribute('title');
    if (!link.getAttribute('href') || link.getAttribute('href') === '#') {
      link.setAttribute('href', './despertar.html');
    }
  } else {
    link.setAttribute('aria-disabled', 'true');
    link.setAttribute('tabindex', '-1');
    link.setAttribute('title', 'Em breve');
  }

  bindLockedNavClicks(root);
}

async function syncDespertarNavFromToken(shell, token, role, despertarPublished) {
  const isAdmin = role === 'admin';
  if (!token) {
    applyDespertarNavState(shell, { published: false, isAdmin });
    return false;
  }

  if (typeof despertarPublished === 'boolean') {
    applyDespertarNavState(shell, { published: despertarPublished, isAdmin });
    return despertarPublished;
  }

  const cached = getBootstrapGates();
  if (
    cached?.token === token
    && typeof cached.gates?.despertar?.published === 'boolean'
  ) {
    const published = cached.gates.despertar.published;
    applyDespertarNavState(shell, { published, isAdmin });
    return published;
  }

  try {
    const result = await fetchLessonGates(token, DESPERTAR_GATE_ID);
    const published = Boolean(result?.gates?.published);
    applyDespertarNavState(shell, { published, isAdmin });
    return published;
  } catch {
    applyDespertarNavState(shell, { published: false, isAdmin });
    return false;
  }
}

export function readNavCollapsedPref(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  try {
    return storage?.getItem(NAV_COLLAPSED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeNavCollapsedPref(
  collapsed,
  storage = typeof localStorage !== 'undefined' ? localStorage : null,
) {
  try {
    storage?.setItem(NAV_COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0');
  } catch {
    /* private mode / quota — preferência cosmética */
  }
}

/**
 * Desktop: aplica (ou limpa) o colapso do aside. Mobile ignora a classe visual.
 * @returns {boolean} collapsed efetivo no desktop
 */
export function applyNavCollapsed(shell, sidebar, toggle, collapsed) {
  const wantCollapsed = Boolean(collapsed);
  const isMobile = mobileQuery.matches;

  if (isMobile) {
    shell.classList.remove('is-nav-collapsed');
    document.body.classList.remove('is-shell-nav-collapsed');
    sidebar?.removeAttribute('inert');
    return false;
  }

  shell.classList.toggle('is-nav-collapsed', wantCollapsed);
  document.body.classList.toggle('is-shell-nav-collapsed', wantCollapsed);

  if (wantCollapsed) {
    sidebar?.setAttribute('aria-hidden', 'true');
    sidebar?.setAttribute('tabindex', '-1');
    sidebar?.setAttribute('inert', '');
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.setAttribute('aria-label', 'Abrir navegação');
  } else {
    sidebar?.removeAttribute('aria-hidden');
    sidebar?.removeAttribute('tabindex');
    sidebar?.removeAttribute('inert');
    toggle?.setAttribute('aria-expanded', 'true');
    toggle?.setAttribute('aria-label', 'Recolher navegação');
  }

  return wantCollapsed;
}

function syncShellState(shell, sidebar, toggle, overlay) {
  const isMobile = mobileQuery.matches;
  const isOpen = shell.classList.contains('is-open');

  shell.classList.toggle('is-mobile', isMobile);
  document.body.classList.toggle('is-shell-mobile', isMobile);

  if (!isMobile) {
    document.body.classList.remove('is-shell-locked');
    shell.classList.remove('is-open');
    if (overlay) overlay.hidden = true;
    setRainbowVfxSuspended(false, 'shell-drawer');
    applyNavCollapsed(shell, sidebar, toggle, readNavCollapsedPref());
    return;
  }

  // Mobile: drawer; limpa colapso desktop (pref fica no localStorage).
  applyNavCollapsed(shell, sidebar, toggle, false);
  document.body.classList.toggle('is-shell-locked', isOpen);
  toggle?.setAttribute('aria-label', isOpen ? 'Fechar navegação' : 'Abrir navegação');
  sidebar?.setAttribute('aria-hidden', String(!isOpen));
  sidebar?.setAttribute('tabindex', '-1');
  if (isOpen) sidebar?.removeAttribute('inert');
  else sidebar?.setAttribute('inert', '');
  if (overlay) overlay.hidden = !isOpen;
  toggle?.setAttribute('aria-expanded', String(isOpen));
  setRainbowVfxSuspended(isOpen, 'shell-drawer');
}

function closeDrawer(shell, toggle, overlay, { restoreFocus = true } = {}) {
  shell.classList.remove('is-open');
  document.body.classList.remove('is-shell-locked');
  toggle?.setAttribute('aria-expanded', 'false');
  toggle?.setAttribute('aria-label', 'Abrir navegação');
  if (overlay) overlay.hidden = true;
  const sidebar = shell.querySelector('[data-shell-sidebar]');
  sidebar?.setAttribute('aria-hidden', 'true');
  sidebar?.setAttribute('inert', '');
  if (restoreFocus) {
    if (lastFocusedBeforeOpen && lastFocusedBeforeOpen.isConnected) {
      lastFocusedBeforeOpen.focus({ preventScroll: true });
    } else {
      toggle?.focus();
    }
  }
  lastFocusedBeforeOpen = null;
}

function openDrawer(shell, sidebar, toggle, overlay) {
  lastFocusedBeforeOpen = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  shell.classList.add('is-open');
  document.body.classList.add('is-shell-locked');
  toggle?.setAttribute('aria-expanded', 'true');
  toggle?.setAttribute('aria-label', 'Fechar navegação');
  if (overlay) overlay.hidden = false;
  sidebar?.setAttribute('aria-hidden', 'false');
  sidebar?.removeAttribute('inert');

  const firstLink = shell.querySelector('.app-shell__link:not([hidden]):not(.is-locked)');
  firstLink?.focus();
}

/** Bloqueia clique em links de nav com aria-disabled (ex.: O Despertar · em breve). */
function bindLockedNavClicks(shell) {
  shell.querySelectorAll('.app-shell__link[aria-disabled="true"]').forEach((item) => {
    if (item.dataset.lockedNavBound === '1') return;
    item.dataset.lockedNavBound = '1';
    item.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
  });
}

export function initAppShell({
  route,
  role = 'student',
  onLogout,
  token = null,
  despertarPublished,
} = {}) {
  const shell = document.querySelector('[data-shell]');
  if (!shell) return null;

  const sidebar = shell.querySelector('[data-shell-sidebar]');
  const toggle = shell.querySelector('[data-shell-toggle]');
  const overlay = shell.querySelector('[data-shell-overlay]');
  const logoutButton = shell.querySelector('[data-shell-logout]');
  const mainRegion = shell.querySelector('.app-shell__main');
  const activeNav = mapRouteToNavItem(route || document.body.dataset.route || '');

  document.body.dataset.route = route || document.body.dataset.route || '';
  document.body.dataset.role = role;
  document.body.classList.toggle('is-admin-context', role === 'admin');

  shell.querySelectorAll('[data-admin-only]').forEach((item) => {
    const allow = role === 'admin';
    item.hidden = !allow;
    item.setAttribute('aria-hidden', String(!allow));
    if (!allow) {
      item.setAttribute('tabindex', '-1');
    } else {
      item.removeAttribute('tabindex');
    }
  });

  shell.querySelectorAll('[data-nav-item]').forEach((item) => {
    const isActive = item.dataset.navItem === activeNav;
    item.classList.toggle('is-active', isActive);
    if (isActive) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });

  // Default selado até a API responder; admin já destrava na hora.
  applyDespertarNavState(shell, { published: false, isAdmin: role === 'admin' });
  const despertarGatePromise = syncDespertarNavFromToken(
    shell,
    token,
    role,
    despertarPublished,
  );

  bindLockedNavClicks(shell);

  if (mainRegion && !mainRegion.hasAttribute('tabindex')) {
    mainRegion.setAttribute('tabindex', '-1');
  }

  syncShellState(shell, sidebar, toggle, overlay);

  shell.querySelectorAll('[data-nav-item]').forEach((item) => {
    item.addEventListener('click', () => {
      if (!mobileQuery.matches) return;
      if (item.getAttribute('aria-disabled') === 'true') return;
      closeDrawer(shell, toggle, overlay, { restoreFocus: false });
      syncShellState(shell, sidebar, toggle, overlay);
    });
  });

  toggle?.addEventListener('click', () => {
    if (mobileQuery.matches) {
      if (shell.classList.contains('is-open')) {
        closeDrawer(shell, toggle, overlay);
        syncShellState(shell, sidebar, toggle, overlay);
        return;
      }
      openDrawer(shell, sidebar, toggle, overlay);
      syncShellState(shell, sidebar, toggle, overlay);
      return;
    }

    // Desktop: alterna colapso do aside (Task S.1).
    const willCollapse = !shell.classList.contains('is-nav-collapsed');
    applyNavCollapsed(shell, sidebar, toggle, willCollapse);
    writeNavCollapsedPref(willCollapse);
  });

  overlay?.addEventListener('click', () => {
    closeDrawer(shell, toggle, overlay);
    syncShellState(shell, sidebar, toggle, overlay);
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Tab' && shell.classList.contains('is-open') && mobileQuery.matches && sidebar) {
      const focusable = Array.from(sidebar.querySelectorAll(FOCUSABLE_SELECTOR)).filter((item) => !item.hasAttribute('hidden'));
      if (focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
          return;
        }

        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
          return;
        }
      }
    }

    if (event.key !== 'Escape') return;

    if (mobileQuery.matches && shell.classList.contains('is-open')) {
      closeDrawer(shell, toggle, overlay);
      syncShellState(shell, sidebar, toggle, overlay);
      return;
    }

    // Desktop: Esc recolhe a nav se estiver aberta.
    if (!mobileQuery.matches && !shell.classList.contains('is-nav-collapsed')) {
      applyNavCollapsed(shell, sidebar, toggle, true);
      writeNavCollapsedPref(true);
      toggle?.focus({ preventScroll: true });
    }
  });

  const handleMediaChange = (event) => {
    if (!event.matches) closeDrawer(shell, toggle, overlay, { restoreFocus: false });
    syncShellState(shell, sidebar, toggle, overlay);
  };

  if (typeof mobileQuery.addEventListener === 'function') {
    mobileQuery.addEventListener('change', handleMediaChange);
  } else {
    mobileQuery.addListener(handleMediaChange);
  }

  if (typeof onLogout === 'function' && logoutButton) {
    logoutButton.addEventListener('click', async () => {
      await onLogout();
    });
  }

  return {
    open: () => {
      openDrawer(shell, sidebar, toggle, overlay);
      syncShellState(shell, sidebar, toggle, overlay);
    },
    close: () => {
      closeDrawer(shell, toggle, overlay);
      syncShellState(shell, sidebar, toggle, overlay);
    },
    collapseNav: () => {
      if (mobileQuery.matches) return;
      applyNavCollapsed(shell, sidebar, toggle, true);
      writeNavCollapsedPref(true);
    },
    expandNav: () => {
      if (mobileQuery.matches) return;
      applyNavCollapsed(shell, sidebar, toggle, false);
      writeNavCollapsedPref(false);
    },
    sidebar,
    refreshDespertarNav: () => syncDespertarNavFromToken(shell, token, role),
    despertarGatePromise,
  };
}
