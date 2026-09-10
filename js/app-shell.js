'use strict';

import { setRainbowVfxSuspended } from './achievements-ui.js';

const mobileQuery = window.matchMedia('(max-width: 980px)');
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
 * Inicio · Painel · Aulas · Conquistas · Salão Espiritual · Grimório Pessoal · Minigame (em breve)
 * Condicional admin: Almas Registradas (não conta no teto do aluno).
 */
function mapRouteToNavItem(route) {
  if (route === 'dashboard') return 'dashboard';
  if (route === 'companheiro') return 'salao';
  if (route === 'aulas') return 'aulas';
  if (route === 'conquistas') return 'conquistas';
  if (route === 'salao') return 'salao';
  if (route === 'grimorio' || route === 'grimorio-nota' || route === 'grimorio-editar') return 'grimorio';
  if (route === 'minigame') return 'minigame';
  if (route === 'souls') return 'souls';
  if (/^aula\d+$/i.test(route)) return 'aulas';
  return route;
}

function syncShellState(shell, sidebar, toggle, overlay) {
  const isMobile = mobileQuery.matches;
  const isOpen = shell.classList.contains('is-open');

  shell.classList.toggle('is-mobile', isMobile);
  document.body.classList.toggle('is-shell-mobile', isMobile);

  if (!isMobile) {
    document.body.classList.remove('is-shell-locked');
    shell.classList.remove('is-open');
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.setAttribute('aria-label', 'Abrir navegação');
    if (overlay) overlay.hidden = true;
    sidebar?.removeAttribute('aria-hidden');
    sidebar?.removeAttribute('tabindex');
    setRainbowVfxSuspended(false, 'shell-drawer');
    return;
  }

  // No mobile, só trava o scroll do body com o drawer aberto.
  document.body.classList.toggle('is-shell-locked', isOpen);
  toggle?.setAttribute('aria-label', isOpen ? 'Fechar navegação' : 'Abrir navegação');
  sidebar?.setAttribute('aria-hidden', String(!isOpen));
  sidebar?.setAttribute('tabindex', '-1');
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
  shell.querySelector('[data-shell-sidebar]')?.setAttribute('aria-hidden', 'true');
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

  const firstLink = shell.querySelector('.app-shell__link:not([hidden]):not(.is-locked)');
  firstLink?.focus();
}

/** Bloqueia clique em links de nav com aria-disabled (ex.: Minigame em breve). */
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

export function initAppShell({ route, role = 'student', onLogout } = {}) {
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
    if (shell.classList.contains('is-open')) {
      closeDrawer(shell, toggle, overlay);
      syncShellState(shell, sidebar, toggle, overlay);
      return;
    }
    openDrawer(shell, sidebar, toggle, overlay);
    syncShellState(shell, sidebar, toggle, overlay);
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

    if (event.key !== 'Escape' || !shell.classList.contains('is-open')) return;
    closeDrawer(shell, toggle, overlay);
    syncShellState(shell, sidebar, toggle, overlay);
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
    sidebar,
  };
}
