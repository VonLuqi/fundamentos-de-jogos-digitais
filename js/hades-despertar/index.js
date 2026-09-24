/**
 * Bootstrap de O Despertar (Tasks 5b–9).
 * Sessão obrigatória; boot autoritativo + loop local + sync (/api/despertar).
 */

'use strict';

import { initAppShell } from '../app-shell.js';
import {
  ApiError,
  fetchDespertarPublished,
  getSession,
  logout,
  requireSession,
  ROUTES,
} from '../api.js';
import { GameLoop } from './core/GameLoop.js';
import { ApiService } from './services/ApiService.js';
import { bootAuthoritativeSession, resumeFromHidden } from './services/OfflineEngine.js';
import { StorageService } from './services/StorageService.js';
import { UIRenderer } from './ui/UIRenderer.js';
import { applyHarnessGrant, harnessEnabled, logSyncDiag, syncDiagEnabled } from './ui/harness.js';
import { bindReapFeel, bindFoiceAsset, pulseReapButton, spawnReapParticles } from './ui/particles.js';
import { JuizoModal } from './ui/JuizoModal.js';
import { flashStyx, playLetheRitualFeel, playReapJuice, playFoiceSlash, flashBuyRow, tweenShelfSpawn, sealUpgradeIcon, juicePrefersReducedMotion, juiceBumpClass } from './ui/juice.js';
import { setMarqueeText } from './ui/Marquee.js';
import { getJuizoCtaState } from './config/juizo-pool.js';
import {
  API_WARNING_DISMISS_MS,
  JUDGES_REFUSED_MESSAGE,
  JUDGES_REFUSED_TICKER,
} from './config/constants.js';
import { presentGrimoireAwards } from '../grimorio-awards.js';

let apiWarningTimer = null;
/** Preenchido após montar o UIRenderer — interrupts do ticker. */
const uiRef = { renderer: null };

function showApiWarning(message, { dismissMs = API_WARNING_DISMISS_MS } = {}) {
  const box = document.getElementById('api-warning');
  const text = document.getElementById('api-warning-text');
  if (!box || !text) return;
  text.textContent = message;
  box.hidden = false;
  if (apiWarningTimer != null && typeof globalThis.clearTimeout === 'function') {
    globalThis.clearTimeout(apiWarningTimer);
    apiWarningTimer = null;
  }
  if (dismissMs > 0 && typeof globalThis.setTimeout === 'function') {
    apiWarningTimer = globalThis.setTimeout(() => {
      box.hidden = true;
      apiWarningTimer = null;
    }, dismissMs);
  }
}

function pushJudgesTickerHint() {
  if (uiRef.renderer?.interruptTicker?.(JUDGES_REFUSED_TICKER)) return;
  const ticker = document.getElementById('despertar-ticker');
  if (ticker) setMarqueeText(ticker, JUDGES_REFUSED_TICKER);
}

function showSealedState() {
  const main = document.querySelector('.despertar-page') || document.querySelector('.app-shell__content');
  if (!main) return;
  main.innerHTML = `
    <article class="hades-frame" style="max-width: 36rem; margin: 2rem auto; padding: 1.5rem;">
      <h2 class="app-shell__title" style="font-size: 1.35rem;">O Acheron ainda está selado</h2>
      <p style="font-family: 'Crimson Text', serif; opacity: 0.85;">
        O Mestre ainda não abriu O Despertar para a turma. Volte à Trilha e aguarde a liberação.
      </p>
      <p style="margin-top: 1.25rem;">
        <a class="btn-gold" href="${ROUTES.aulas()}">Voltar à Trilha</a>
      </p>
    </article>
  `;
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
    if (!(event.target instanceof Element) || !event.target.closest('[role="tab"]')) return;

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
}

function bindDebugSandbox({ api, storage, userId, isAdmin, getState }) {
  const panel = document.getElementById('despertar-debug');
  const resetBtn = document.getElementById('despertar-debug-reset');
  const sandboxBtn = document.getElementById('despertar-debug-sandbox');
  const status = document.getElementById('despertar-debug-status');
  const exitTestBtn = document.getElementById('despertar-debug-exit-test');
  const shinyHalfBtn = document.getElementById('despertar-debug-shiny-half');
  const goldHalfBtn = document.getElementById('despertar-debug-gold-half');
  const grantButtons = panel
    ? [...panel.querySelectorAll('[data-debug-grant]')]
    : [];
  const applyButtons = panel
    ? [...panel.querySelectorAll('[data-debug-apply]')]
    : [];
  const flagInputs = panel
    ? [...panel.querySelectorAll('[data-debug-flag]')]
    : [];
  if (!panel) return;
  if (!isAdmin) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;

  const setBusy = (busy) => {
    if (resetBtn) resetBtn.disabled = busy;
    if (sandboxBtn) sandboxBtn.disabled = busy;
    if (exitTestBtn) exitTestBtn.disabled = busy;
    if (shinyHalfBtn) shinyHalfBtn.disabled = busy;
    if (goldHalfBtn) goldHalfBtn.disabled = busy;
    grantButtons.forEach((button) => {
      button.disabled = busy;
    });
    applyButtons.forEach((button) => {
      button.disabled = busy;
    });
    flagInputs.forEach((input) => {
      input.disabled = busy;
    });
  };

  const applyResult = async (result) => {
    if (result?.state && storage && userId != null) {
      await storage.save(userId, result.state);
    }
  };

  const failMessage = (error, fallback) => (
    error instanceof ApiError ? error.message : fallback
  );

  resetBtn?.addEventListener('click', async () => {
    const confirmed = window.confirm(
      'Zerar a Estela do Despertar?\n\n'
      + '• Remove conquistas da família Despertar (e o XP delas)\n'
      + '• Zera almas, óbolos, essência, Vereditos, geradores, Juízo e Bancada\n'
      + '• Não toca nas outras conquistas do Domínio',
    );
    if (!confirmed) return;

    setBusy(true);
    if (status) status.textContent = 'Zerando…';
    try {
      await api.flush();
      const result = await api.debugReset();
      await applyResult(result);
      const stripped = Array.isArray(result?.strippedAchievements)
        ? result.strippedAchievements.length
        : 0;
      if (status) {
        status.textContent = stripped
          ? `Estela zerada. ${stripped} conquista(s) do Despertar removida(s).`
          : 'Estela zerada.';
      }
    } catch (error) {
      const message = failMessage(error, 'Não foi possível zerar a Estela.');
      showApiWarning(message);
      if (status) status.textContent = message;
    } finally {
      setBusy(false);
    }
  });

  sandboxBtn?.addEventListener('click', async () => {
    const confirmed = window.confirm(
      'Sandbox Lethe do Despertar?\n\n'
      + '• Remove conquistas da família Despertar (e o XP delas)\n'
      + '• Planta almas, óbolos, essência, Vereditos e corrida pronta para o Lethe\n'
      + '• Zera geradores/juramentos/talentos/Bancada/Juízo para retestar\n'
      + '• Não toca nas outras conquistas do Domínio',
    );
    if (!confirmed) return;

    setBusy(true);
    if (status) status.textContent = 'Aplicando sandbox…';
    try {
      await api.flush();
      const result = await api.debugSandbox();
      await applyResult(result);
      const stripped = Array.isArray(result?.strippedAchievements)
        ? result.strippedAchievements.length
        : 0;
      if (status) {
        status.textContent = stripped
          ? `Sandbox ativo. ${stripped} conquista(s) do Despertar removida(s).`
          : 'Sandbox ativo. Nenhuma conquista do Despertar para remover.';
      }
    } catch (error) {
      const message = failMessage(error, 'Não foi possível aplicar o sandbox.');
      showApiWarning(message);
      if (status) status.textContent = message;
    } finally {
      setBusy(false);
    }
  });

  grantButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const grantId = button.getAttribute('data-debug-grant');
      if (!grantId) return;
      setBusy(true);
      if (status) status.textContent = 'Concedendo…';
      try {
        await api.flush();
        const result = await api.debugGrant(grantId);
        await applyResult(result);
        if (status) {
          status.textContent = result?.label
            ? `Concedido: ${result.label}.`
            : 'Recursos concedidos.';
        }
      } catch (error) {
        const message = failMessage(error, 'Não foi possível conceder recursos.');
        showApiWarning(message);
        if (status) status.textContent = message;
      } finally {
        setBusy(false);
      }
    });
  });

  applyButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const field = button.getAttribute('data-debug-apply');
      if (!field) return;
      const input = panel.querySelector(`[data-debug-set="${field}"]`);
      const raw = input?.value?.trim?.() ?? '';
      if (!raw) {
        if (status) status.textContent = 'Informe um valor para aplicar.';
        return;
      }
      setBusy(true);
      if (status) status.textContent = 'Definindo…';
      try {
        await api.flush();
        const result = await api.debugSet({ [field]: raw });
        await applyResult(result);
        if (status) {
          status.textContent = result?.label
            ? `${result.label}.`
            : 'Valor definido.';
        }
      } catch (error) {
        const message = failMessage(error, 'Não foi possível definir o valor.');
        showApiWarning(message);
        if (status) status.textContent = message;
      } finally {
        setBusy(false);
      }
    });
  });

  flagInputs.forEach((input) => {
    const flag = input.getAttribute('data-debug-flag');
    if (!flag) return;
    input.addEventListener('change', () => {
      const state = typeof getState === 'function' ? getState() : null;
      if (!state?.setDebugFlag) return;
      state.setDebugFlag(flag, input.checked);
      if (status) {
        if (flag === 'freeShopping') {
          status.textContent = input.checked
            ? 'Compras gratuitas ON — sync com o Submundo pausado.'
            : 'Compras gratuitas OFF.';
        } else if (flag === 'forceShiny') {
          status.textContent = input.checked
            ? 'Forçar negativos ON — chance 100% na compra (sem gold).'
            : 'Forçar negativos OFF — volta ao 0,5%.';
        } else if (flag === 'forceGold') {
          status.textContent = input.checked
            ? 'Forçar gold ON — chance 100% na compra.'
            : 'Forçar gold OFF — volta ao 2%.';
        }
      }
    });
  });

  exitTestBtn?.addEventListener('click', () => {
    const state = typeof getState === 'function' ? getState() : null;
    state?.clearDebugFlags?.();
    flagInputs.forEach((input) => {
      input.checked = false;
    });
    if (status) status.textContent = 'Modo teste encerrado (flags locais limpas).';
  });

  shinyHalfBtn?.addEventListener('click', () => {
    const state = typeof getState === 'function' ? getState() : null;
    if (!state?.setShinyCount) return;
    const select = panel.querySelector('[data-debug-shiny-line]');
    const id = select?.value;
    if (!id) return;
    const qty = Math.max(0, Math.floor(Number(state.quantities?.()?.[id]) || 0));
    const half = Math.floor(qty / 2);
    const result = state.setShinyCount(id, half);
    if (!result?.ok) {
      if (status) status.textContent = 'Não foi possível marcar negativo nessa linha.';
      return;
    }
    if (status) {
      status.textContent = qty
        ? `Negativo na linha: ${result.shiny}/${qty}.`
        : 'Linha vazia — compre unidades antes.';
    }
    if (!state.isFreeShopping?.()) {
      api.requestSync();
    }
  });

  goldHalfBtn?.addEventListener('click', () => {
    const state = typeof getState === 'function' ? getState() : null;
    if (!state?.setGoldCount) return;
    const select = panel.querySelector('[data-debug-shiny-line]');
    const id = select?.value;
    if (!id) return;
    const qty = Math.max(0, Math.floor(Number(state.quantities?.()?.[id]) || 0));
    const half = Math.floor(qty / 2);
    const result = state.setGoldCount(id, half);
    if (!result?.ok) {
      if (status) status.textContent = 'Não foi possível marcar gold nessa linha.';
      return;
    }
    if (status) {
      status.textContent = qty
        ? `Gold na linha: ${result.gold}/${qty}.`
        : 'Linha vazia — compre unidades antes.';
    }
    if (!state.isFreeShopping?.()) {
      api.requestSync();
    }
  });
}

function bindJuizoCta(api, { onError } = {}) {
  const button = document.getElementById('despertar-juizo-open');
  const hint = document.getElementById('despertar-juizo-hint');
  if (!button) return null;
  const cta = getJuizoCtaState();
  button.disabled = !cta.ready;
  button.setAttribute('aria-disabled', String(!cta.ready));
  button.textContent = cta.label;
  button.title = cta.hint || cta.label;
  if (hint) {
    hint.textContent = cta.hint;
    hint.hidden = !cta.hint;
  }

  const modal = new JuizoModal(document, {
    start: () => api.juizoStart(),
    guess: (choice) => api.juizoGuess(choice),
    abandon: () => api.juizoAbandon(),
  }).mount();

  button.addEventListener('click', () => {
    if (button.disabled) return;
    modal.open().catch((error) => {
      onError?.(error?.message || 'O Juízo se fecha.');
    });
  });
  return modal;
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

function bindLetheModal(state, { onConfirm } = {}) {
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
  confirm.addEventListener('click', async () => {
    const preview = state.prestigePreview();
    confirm.disabled = true;
    try {
      if (typeof onConfirm === 'function') {
        const ok = await onConfirm();
        if (ok) {
          playLetheRitualFeel({
            title: 'Catábase',
            detail: `O Lethe bebeu a corrida. +${preview.obolsGain} Óbolos · +${preview.mnemosyneGain} Essência.`,
          });
          close();
        }
      } else {
        const result = state.applyPrestige();
        if (result.ok) {
          playLetheRitualFeel({
            title: 'Catábase',
            detail: `O Lethe bebeu a corrida. +${preview.obolsGain} Óbolos · +${preview.mnemosyneGain} Essência.`,
          });
          close();
        }
      }
    } finally {
      confirm.disabled = false;
    }
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
  const token = getSession()?.token ?? null;
  const isAdmin = user?.role === 'admin';
  const published = await fetchDespertarPublished(token);

  initAppShell({
    route: 'despertar',
    role: isAdmin ? 'admin' : 'student',
    token,
    onLogout: async () => {
      await logout();
    },
  });

  if (!isAdmin && !published) {
    showSealedState();
    return;
  }

  bindTabs(document.getElementById('despertar-tabs'));
  const harvestUi = bindHarvestModal();

  const storage = new StorageService();
  /** Preenchido após o boot; ApiService usa getters estáveis. */
  const stateRef = { current: null };
  const diagOn = syncDiagEnabled();
  const api = new ApiService({
    getToken: () => getSession()?.token ?? null,
    getSnapshot: () => stateRef.current?.toSnapshot?.() ?? {},
    applyServerState: (serverState, meta = {}) => {
      if (!stateRef.current) return;
      const mode = meta.mode === 'reconcile' ? 'reconcile' : 'replace';
      if (diagOn) {
        logSyncDiag('apply:before', {
          mode,
          syncEpoch: stateRef.current.syncEpoch ?? 0,
          souls: String(stateRef.current.souls ?? ''),
          dirty: api.isDirty,
          inFlight: api.isInFlight,
          serverSouls: serverState?.souls != null ? String(serverState.souls) : null,
          echoEpoch: meta.echoEpoch,
          elapsedMs: meta.elapsedMs,
        });
      }
      stateRef.current.applyAuthoritativeState(serverState, {
        mode,
        sps: stateRef.current.sps(),
        elapsedMs: meta.elapsedMs,
      });
      if (diagOn) {
        logSyncDiag('apply:after', {
          mode,
          syncEpoch: stateRef.current.syncEpoch ?? 0,
          souls: String(stateRef.current.souls ?? ''),
          dirty: api.isDirty,
          inFlight: api.isInFlight,
        });
      }
      storage.scheduleSave(user.id, stateRef.current);
    },
    onRejected: ({ error }) => {
      showApiWarning(error || JUDGES_REFUSED_MESSAGE);
      pushJudgesTickerHint();
    },
    onSynced: ({ awarded }) => {
      if (awarded?.achievements?.length) {
        presentGrimoireAwards(awarded);
      }
    },
    logDiag: diagOn ? logSyncDiag : null,
  });

  bindJuizoCta(api, { onError: showApiWarning });

  const boot = await bootAuthoritativeSession(user.id, {
    storage,
    fetchServerState: async () => {
      const remote = await api.pullState({ apply: false });
      return remote?.state ?? null;
    },
  });

  if (boot.fetchError instanceof ApiError && boot.fetchError.status === 403) {
    showSealedState();
    return;
  }

  const { state, catchUp, decision, detach } = boot;
  stateRef.current = state;
  applyHarnessGrant(state);
  if (harnessEnabled()) {
    window.__despertar = { state, decision, api };
  }

  if (decision.source === 'server') {
    state.markSyncOk();
  } else if (decision.shouldPush) {
    api.requestSync();
  }

  const letheUi = bindLetheModal(state, {
    onConfirm: async () => {
      try {
        await api.flush();
        await api.prestige();
        uiRef.renderer?.resetShinyRumor?.();
        return true;
      } catch (error) {
        const local = state.applyPrestige();
        if (local.ok) {
          uiRef.renderer?.resetShinyRumor?.();
          showApiWarning(
            error instanceof ApiError
              ? error.message
              : 'O Submundo não responde… o Ritual ficou só na Estela local.'
          );
          return true;
        }
        showApiWarning(error instanceof ApiError ? error.message : 'O Ritual falhou.');
        return false;
      }
    },
  });

  const renderer = new UIRenderer(document, {
    state,
    onBuy: (id, mode) => {
      const result = state.buyGenerator(id, mode);
      if (result?.ok) {
        const reducedMotion = juicePrefersReducedMotion();
        flashBuyRow(document, id, { reducedMotion });
        tweenShelfSpawn(document, id, { reducedMotion });
        uiRef.renderer?.pulseGeneratorBuy?.(id, {
          bought: result.bought,
          reducedMotion,
        });
        if (result.goldGained > 0) {
          uiRef.renderer?.announceGoldFirst?.({ reducedMotion });
        } else if (result.shinyGained > 0) {
          uiRef.renderer?.announceShinyFirst?.({ reducedMotion });
        }
      }
      if (!state.isFreeShopping?.()) {
        api.requestSync();
      }
    },
    onBuyUpgrade: (id) => {
      const result = state.buyUpgrade(id);
      if (result?.ok) {
        const reducedMotion = juicePrefersReducedMotion();
        flashStyx({ reducedMotion });
        sealUpgradeIcon(document, id, { reducedMotion });
      }
      if (!state.isFreeShopping?.()) {
        api.requestSync();
      }
    },
    onBuyTalent: async (id) => {
      try {
        await api.flush();
        await api.talentBuy(id);
      } catch (error) {
        const local = state.buyTalent(id);
        if (!local.ok) {
          showApiWarning(error instanceof ApiError ? error.message : 'Não foi possível selar o talento.');
        } else {
          showApiWarning(
            error instanceof ApiError
              ? error.message
              : 'O Submundo não responde… o talento ficou só na Estela local.'
          );
        }
      }
    },
    onBuyVerdict: async (id) => {
      try {
        await api.flush();
        await api.verdictBuy(id);
      } catch (error) {
        const local = state.buyVerdict(id);
        if (!local.ok) {
          showApiWarning(error instanceof ApiError ? error.message : 'Não foi possível comprar na Bancada.');
        } else {
          showApiWarning(
            error instanceof ApiError
              ? error.message
              : 'O Submundo não responde… a compra ficou só na Estela local.'
          );
        }
      }
    },
    onOpenLethe: () => {
      letheUi.open();
    },
    onAmortSeen: () => {
      state.markAmortSeen();
    },
    onLetheFirstUnlock: () => {
      api.requestSync();
    },
  });
  uiRef.renderer = renderer;
  renderer.mount(state);

  const reap = document.getElementById('despertar-reap');
  const particles = document.querySelector('[data-particle-layer]');
  const reapStage = document.querySelector('.despertar-reap-stage');
  const unbindFeel = bindReapFeel(reap);
  const unbindFoice = bindFoiceAsset(reap);

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
        api.requestSync();
      },
    },
  );

  reap?.addEventListener('click', () => {
    const { gained } = state.click();
    const reducedMotion = loop.prefersReducedMotion();
    pulseReapButton(reap, { reducedMotion });
    playFoiceSlash(reap, { reducedMotion });
    spawnReapParticles(particles, { reducedMotion, clickPower: gained, gained });
    playReapJuice({
      root: document,
      stage: reapStage,
      particleLayer: particles,
      amount: gained,
      reducedMotion,
    });
    if (!reducedMotion) {
      juiceBumpClass(document.getElementById('despertar-souls'), 'is-bump', 380);
    }
  });

  document.getElementById('lethe-ritual')?.addEventListener('click', () => {
    letheUi.open();
  });

  bindDebugSandbox({
    api,
    storage,
    userId: user.id,
    isAdmin: user.role === 'admin',
    getState: () => stateRef.current,
  });

  harvestUi.show(catchUp.harvest);
  api.start();
  loop.start();

  const persistId = window.setInterval(() => {
    storage.flush();
  }, 1000);

  window.addEventListener('pagehide', () => {
    window.clearInterval(persistId);
    unbindFeel();
    unbindFoice();
    api.stop();
    api.flush().catch(() => {});
    loop.stop();
    detach();
  });
}

init();
