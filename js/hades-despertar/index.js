/**
 * Bootstrap de O Despertar (Tasks 6–8).
 * Sessão obrigatória; loop local com altar, mercado, Styx, Lethe e Panteão.
 */

'use strict';

import { initAppShell } from '../app-shell.js';
import { ApiError, logout, requireSession } from '../api.js';
import { GameLoop } from './core/GameLoop.js';
import { bootLocalSession, resumeFromHidden } from './services/OfflineEngine.js';
import { StorageService } from './services/StorageService.js';
import { UIRenderer } from './ui/UIRenderer.js';
import { applyHarnessGrant, harnessEnabled } from './ui/harness.js';
import { bindReapFeel, pulseReapButton, spawnReapParticles } from './ui/particles.js';

function showApiWarning(message) {
  const box = document.getElementById('api-warning');
  const text = document.getElementById('api-warning-text');
  if (!box || !text) return;
  text.textContent = message;
  box.hidden = false;
}

function bindTabs(root) {
  if (!root) return;
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const panels = [...root.querySelectorAll('[role="tabpanel"]')];
  if (!tabs.length) return;

  function activate(tab, { focus = false } = {}) {
    const panelId = tab.getAttribute('aria-controls');
    tabs.forEach((item) => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    panels.forEach((panel) => {
      panel.hidden = panel.id !== panelId;
    });
    if (focus) tab.focus();
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => activate(tab));
  });

  root.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const current = tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true');
    if (current < 0) return;
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const next = tabs[(current + delta + tabs.length) % tabs.length];
    event.preventDefault();
    activate(next, { focus: true });
  });
}

function bindHarvestModal() {
  const modal = document.getElementById('despertar-harvest-modal');
  const ok = document.getElementById('despertar-harvest-ok');
  if (!modal || !ok) return { show() {} };
  ok.addEventListener('click', () => {
    modal.hidden = true;
  });
  return {
    show(harvest) {
      if (!harvest?.show) return;
      const body = document.getElementById('despertar-harvest-body');
      const cap = document.getElementById('despertar-harvest-cap');
      if (body) body.textContent = harvest.body;
      if (cap) {
        cap.hidden = !harvest.capNote;
        if (harvest.capNote) cap.textContent = harvest.capNote;
      }
      modal.hidden = false;
      ok.focus();
    },
  };
}

function bindLetheModal(state) {
  const modal = document.getElementById('despertar-lethe-modal');
  const confirm = document.getElementById('despertar-lethe-confirm');
  const cancel = document.getElementById('despertar-lethe-cancel');
  const preview = document.getElementById('despertar-lethe-preview');
  if (!modal || !confirm || !cancel) {
    return { open() {}, close() {} };
  }

  function close() {
    modal.hidden = true;
  }

  function open() {
    const next = state.prestigePreview();
    if (!next.unlocked) return;
    if (preview) {
      preview.hidden = false;
      preview.textContent = `Esta corrida renderia ${next.obolsGain} Óbolos de Caronte e ${next.mnemosyneGain} Essência de Mnemosyne.`;
    }
    modal.hidden = false;
    confirm.focus();
  }

  cancel.addEventListener('click', close);
  confirm.addEventListener('click', () => {
    const result = state.applyPrestige();
    if (result.ok) close();
  });

  return { open, close };
}

async function init() {
  let result;
  try {
    result = await requireSession();
  } catch (error) {
    showApiWarning(
      error instanceof ApiError
        ? error.message
        : 'O Submundo não responde… a Estela local guarda a corrida.'
    );
    return;
  }
  if (!result) return;

  const user = result.user;
  initAppShell({
    route: 'despertar',
    role: user?.role === 'admin' ? 'admin' : 'student',
    onLogout: async () => {
      await logout();
    },
  });

  bindTabs(document.getElementById('despertar-tabs'));
  const harvestUi = bindHarvestModal();

  const storage = new StorageService();
  const { state, catchUp, detach } = await bootLocalSession(user.id, { storage });
  applyHarnessGrant(state);
  if (harnessEnabled()) {
    window.__despertar = { state };
  }

  const letheUi = bindLetheModal(state);
  const renderer = new UIRenderer(document, {
    state,
    onBuy: (id, mode) => {
      state.buyGenerator(id, mode);
    },
    onBuyUpgrade: (id) => {
      state.buyUpgrade(id);
    },
    onBuyTalent: (id) => {
      state.buyTalent(id);
    },
    onOpenLethe: () => {
      letheUi.open();
    },
  });
  renderer.mount(state);

  const reap = document.getElementById('despertar-reap');
  const particles = document.querySelector('[data-particle-layer]');
  const unbindFeel = bindReapFeel(reap);

  const loop = new GameLoop(
    (dt) => {
      state.tick(dt);
    },
    (alpha, meta) => {
      renderer.render(alpha, meta);
    },
    {
      onResume: (seconds) => {
        const resumed = resumeFromHidden(state, seconds);
        harvestUi.show(resumed.harvest);
      },
    },
  );

  reap?.addEventListener('click', () => {
    state.click();
    const reducedMotion = loop.prefersReducedMotion();
    pulseReapButton(reap, { reducedMotion });
    spawnReapParticles(particles, { reducedMotion });
  });

  document.getElementById('lethe-ritual')?.addEventListener('click', () => {
    letheUi.open();
  });

  harvestUi.show(catchUp.harvest);
  loop.start();

  const persistId = window.setInterval(() => {
    storage.flush();
  }, 1000);

  window.addEventListener('pagehide', () => {
    window.clearInterval(persistId);
    unbindFeel();
    loop.stop();
    detach();
  });
}

init();
