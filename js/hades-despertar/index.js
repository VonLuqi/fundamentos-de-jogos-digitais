/**
 * Bootstrap de O Despertar (Tasks 5b–9).
 * Sessão obrigatória; boot autoritativo + loop local + sync (/api/despertar).
 */

'use strict';

import { initAppShell, applyDespertarNavState } from '../app-shell.js';
import {
  ApiError,
  DESPERTAR_PAUSED_ERROR,
  DESPERTAR_SEALED_ERROR,
  despertarStateGet,
  fetchDespertarPublished,
  fetchDespertarSeasonHold,
  getSession,
  leaderboardGet,
  listClassmates,
  logout,
  requireSession,
  ROUTES,
  setLessonGate,
  seasonArchiveGet,
  seasonOpen,
} from '../api.js';
import { seedUnitNamePool } from './ui/unitPersona.js';
import { GameLoop } from './core/GameLoop.js';
import { ApiService } from './services/ApiService.js';
import { bootAuthoritativeSession, resumeFromHidden } from './services/OfflineEngine.js';
import { StorageService } from './services/StorageService.js';
import { UIRenderer, countLethePermanents, formatLetheMemoryPreview, formatLetheMemoryToast } from './ui/UIRenderer.js';
import { bindLetheRiverTree } from './ui/LetheRiverTree.js';
import { applyHarnessGrant, harnessEnabled, logSyncDiag, syncDiagEnabled } from './ui/harness.js';
import { bindReapFeel, bindFoiceAsset, pulseReapButton, spawnReapParticles } from './ui/particles.js';
import { JuizoModal } from './ui/JuizoModal.js';
import { flashStyx, playLetheRitualFeel, playReapJuice, playFoiceSlash, flashBuyRow, tweenShelfSpawn, sealUpgradeIcon, juicePrefersReducedMotion, juiceBumpClass, showTutorialToast } from './ui/juice.js';
import { setMarqueeText } from './ui/Marquee.js';
import { presentClassroomPauseVeil, presentSeasonClosedVeil, presentSealedVeil, presentSeasonHall } from './ui/pauseVeil.js';
import { DESPERTAR_SEASON_CLOSED, SEASON_CLOSED_COPY, SEASON_HALL_COPY } from './config/season-closed.js';
import {
  consumeAdminPreviewQuery,
  setAdminPreviewActive,
} from './config/admin-preview.js';
import { getJuizoCtaState } from './config/juizo-pool.js';
import {
  API_WARNING_DISMISS_MS,
  JUDGES_REFUSED_MESSAGE,
  JUDGES_REFUSED_TICKER,
} from './config/constants.js';
import { presentGrimoireAwards } from '../grimorio-awards.js';
import { add } from './core/decimal.js';
import { getTalent } from './config/talents.js';

let apiWarningTimer = null;
/** Preenchido após montar o UIRenderer — interrupts do ticker. */
const uiRef = { renderer: null };
/** Evita abrir o Véu duas vezes (boot + sync reject). */
let pauseVeilOpen = false;
/** Janela de pausa para catch-up (A4) — ativa ou recentemente expirada. */
const pauseWindowRef = { current: null };

function rememberPauseWindow(pauseOrWindow) {
  if (!pauseOrWindow || typeof pauseOrWindow !== 'object') return;
  const until = pauseOrWindow.pauseUntil || pauseOrWindow.pause_until;
  if (!until) return;
  pauseWindowRef.current = {
    active: pauseOrWindow.active === true,
    pauseUntil: String(until),
    pauseStartedAt: pauseOrWindow.pauseStartedAt || pauseOrWindow.pause_started_at || null,
  };
}

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

function showSealedState(token = null, { isAdmin = false } = {}) {
  const resolvedToken = token || getSession()?.token || null;
  if (DESPERTAR_SEASON_CLOSED) {
    void (async () => {
      try {
        const season = await fetchDespertarSeasonHold(resolvedToken);
        if (season.seasonHold) {
          await showSeasonClosedState(resolvedToken, { isAdmin });
          return;
        }
      } catch {
        /* cai no véu selado genérico */
      }
      const main = document.querySelector('.despertar-page') || document.querySelector('.app-shell__content');
      if (!main) return;
      presentSealedVeil(main, { aulasHref: ROUTES.aulas() });
    })();
    return;
  }
  const main = document.querySelector('.despertar-page') || document.querySelector('.app-shell__content');
  if (!main) return;
  presentSealedVeil(main, { aulasHref: ROUTES.aulas() });
}

function mountAdminPreviewBanner() {
  const host = document.querySelector('.despertar-page') || document.querySelector('.app-shell__content');
  if (!host || host.querySelector('[data-admin-preview-banner]')) return;
  const bar = document.createElement('div');
  bar.className = 'despertar-admin-preview-banner';
  bar.setAttribute('data-admin-preview-banner', '1');
  bar.setAttribute('role', 'status');
  const text = document.createElement('p');
  text.className = 'despertar-admin-preview-banner__text';
  text.textContent = SEASON_CLOSED_COPY.previewBanner;
  const exitBtn = document.createElement('button');
  exitBtn.type = 'button';
  exitBtn.className = 'despertar-ghost';
  exitBtn.textContent = SEASON_CLOSED_COPY.ctaExitPreview;
  exitBtn.addEventListener('click', () => {
    setAdminPreviewActive(false);
    globalThis.location.reload();
  });
  bar.append(text, exitBtn);
  host.prepend(bar);
}

async function showSeasonClosedState(token, { isAdmin = false } = {}) {
  const main = document.querySelector('.despertar-page') || document.querySelector('.app-shell__content');
  if (!main) return;
  const shell = document.querySelector('[data-shell]');
  // Link aberto para toda a turma ver o pódio (jogo não monta enquanto hold ativo).
  applyDespertarNavState(shell, {
    published: false,
    isAdmin,
    pauseActive: false,
  });
  await presentSeasonClosedVeil(main, {
    aulasHref: ROUTES.aulas(),
    rankingHref: ROUTES.ranking(),
    token,
    isAdmin,
    leaderboardGet,
    onPreview: isAdmin
      ? () => {
        setAdminPreviewActive(true);
        const base = `${globalThis.location.pathname}`;
        globalThis.location.assign(`${base}?preview=1`);
      }
      : undefined,
    onLiberate: isAdmin
      ? async () => {
        await seasonOpen(token, { confirm: SEASON_CLOSED_COPY.liberateConfirmToken, seasonId: 1 });
        setAdminPreviewActive(false);
        globalThis.location.reload();
      }
      : undefined,
  });
}

/** Admin na tela fechada: garante Acheron selado até Abrir Temporada 2. */
async function ensureAcheronSealedForSeason(token, isAdmin) {
  if (!DESPERTAR_SEASON_CLOSED || !isAdmin || !token) return;
  try {
    await setLessonGate(token, 'despertar', 'season_liberated', false);
    await setLessonGate(token, 'despertar', 'published', false);
  } catch (error) {
    console.warn('[Despertar] não foi possível selar o Acheron:', error);
  }
}

function mountSeasonHallFab({ token }) {
  const page = document.querySelector('.despertar-page') || document.querySelector('.app-shell__content');
  if (!page || page.querySelector('[data-season-hall-fab]')) return;

  const cluster = page.querySelector('[data-fab-cluster]');
  const fabHost = cluster || page;

  const fab = document.createElement('button');
  fab.type = 'button';
  fab.id = 'despertar-season-hall';
  fab.className = 'despertar-codex-book despertar-season-hall-fab';
  fab.setAttribute('data-season-hall-fab', '1');
  fab.setAttribute('title', SEASON_HALL_COPY.fabTitle);
  fab.setAttribute('aria-label', SEASON_HALL_COPY.fabTitle);
  fab.innerHTML = `
    <span class="despertar-codex-book__icon" aria-hidden="true">
      <svg viewBox="0 0 32 32" width="26" height="26" focusable="false">
        <path fill="currentColor" d="M4 26h24v2H4zm3-2h4V14H7zm7 0h4V10h-4zm7 0h4V6h-4zM6 8l10-5 10 5v2H6z"/>
      </svg>
    </span>
  `;

  const overlay = document.createElement('div');
  overlay.className = 'despertar-season-hall-overlay';
  overlay.setAttribute('data-season-hall-overlay', '1');
  overlay.hidden = true;

  const closeHall = () => {
    overlay.hidden = true;
    overlay.innerHTML = '';
  };

  fab.addEventListener('click', () => {
    overlay.hidden = false;
    void presentSeasonHall(overlay, {
      rankingHref: ROUTES.ranking(),
      token,
      seasonId: 1,
      seasonArchiveGet,
      onClose: closeHall,
    });
  });

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeHall();
  });

  fabHost.append(fab);
  page.append(overlay);
}

/**
 * Mostra o Véu da Aula e, ao liberar, recarrega a página (boot limpo sem F5 manual).
 * @returns {Promise<boolean>} true se retomou
 */
async function enterClassroomPauseVeil({ pause, serverNow, token }) {
  if (pauseVeilOpen) return false;
  const main = document.querySelector('.despertar-page') || document.querySelector('.app-shell__content');
  if (!main || !pause?.pauseUntil) return false;
  pauseVeilOpen = true;

  const result = await presentClassroomPauseVeil(main, {
    pause,
    serverNow,
    reducedMotion: juicePrefersReducedMotion(),
    fetchPause: async () => {
      const remote = await despertarStateGet(token);
      return {
        pause: remote?.pause ?? null,
        serverNow: remote?.serverNow,
      };
    },
  });

  if (result === 'resumed') {
    globalThis.location.reload();
    return true;
  }
  pauseVeilOpen = false;
  return false;
}

function bindTabs(root) {
  if (!root) return;
  // Só abas/painéis do Domínio — subabas (Bancada/Panteão) têm role="tab" aninhado
  // e não podem entrar neste activate (senão escondem #panel-bancada / #panel-lethe).
  const tabs = [...root.querySelectorAll('.despertar-tablist > [role="tab"]')];
  const panels = [...root.querySelectorAll(':scope > [role="tabpanel"]')];
  if (!tabs.length) return;

  function visibleTabs() {
    return tabs.filter((tab) => !tab.hidden);
  }

  function activate(tab, { focus = false } = {}) {
    if (!tab || tab.hidden) return;
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
    if (!(event.target instanceof Element) || !tabs.includes(event.target)) return;

    const visible = visibleTabs();
    if (!visible.length) return;
    const current = visible.findIndex((tab) => tab.getAttribute('aria-selected') === 'true');
    const from = current >= 0 ? current : 0;

    let nextIndex = -1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (from + 1) % visible.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (from - 1 + visible.length) % visible.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = visible.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    activate(visible[nextIndex], { focus: true });
  });
}

function bindDebugSandbox({
  api,
  storage,
  userId,
  isAdmin,
  getState,
  openRiver,
  openLetheModal,
  markDirty,
} = {}) {
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
  const mechanicButtons = panel
    ? [...panel.querySelectorAll('[data-debug-action]')]
    : [];
  if (!panel) return;
  const steleTab = document.getElementById('tab-stele');
  const stelePanel = document.getElementById('panel-stele');
  // Perf-4: a aba Estela fica disponível para Opções de Fluidez (admin vê também o painel Debug).
  if (steleTab) steleTab.hidden = false;
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
    mechanicButtons.forEach((button) => {
      if (button === exitTestBtn || button === shinyHalfBtn || button === goldHalfBtn) return;
      button.disabled = busy;
    });
  };

  const refreshUi = () => {
    if (typeof markDirty === 'function') markDirty('all');
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

  const runMechanic = (action) => {
    const state = typeof getState === 'function' ? getState() : null;
    if (!state) {
      if (status) status.textContent = 'Estela ainda não carregou.';
      return;
    }

    if (action === 'spawnShimmer') {
      const select = panel.querySelector('[data-debug-shimmer-effect]');
      const effectId = select?.value || 'mare_acheron';
      const needsCatabase = /^(clot_acheron|elder_frenzy_acheron)$/.test(effectId);
      if (needsCatabase && !state.catabaseActive) {
        state.setCatabaseStage?.(1);
      }
      const result = state.spawnShimmer?.({ effectId, force: true });
      if (!result?.ok) {
        if (status) {
          status.textContent = result?.reason === 'requires_catabase'
            ? 'Esse Eco exige Catábase — ative o estágio 1.'
            : `Falha ao spawnar Eco (${result?.reason || 'desconhecido'}).`;
        }
        return;
      }
      if (status) status.textContent = `Eco forçado: ${effectId}.`;
      refreshUi();
      return;
    }

    if (action === 'spawnLeech' || action === 'spawnShinyLeech') {
      if (!state.catabaseActive) state.setCatabaseStage?.(1);
      const result = state.spawnLeech?.({
        shiny: action === 'spawnShinyLeech',
      });
      if (!result?.ok) {
        if (status) {
          status.textContent = result?.reason === 'capacity_full'
            ? 'Cap de Sanguessugas atingido.'
            : `Falha ao spawnar verme (${result?.reason || 'desconhecido'}).`;
        }
        return;
      }
      if (status) {
        status.textContent = action === 'spawnShinyLeech'
          ? 'Sanguessuga shiny na Foice.'
          : 'Sanguessuga na Foice.';
      }
      refreshUi();
      return;
    }

    if (action === 'clearLeeches') {
      state.debugLocalPatch?.({ clearLeeches: true });
      if (status) status.textContent = 'Vermes limpos (sem payout).';
      refreshUi();
      return;
    }

    if (action === 'catabase0') {
      state.setCatabaseStage?.(0);
      if (status) status.textContent = 'Catábase desligada.';
      refreshUi();
      return;
    }
    if (action === 'catabase1') {
      state.setCatabaseStage?.(1);
      if (status) status.textContent = 'Catábase estágio 1.';
      refreshUi();
      return;
    }
    if (action === 'catabase3') {
      state.setCatabaseStage?.(3);
      if (status) status.textContent = 'Catábase estágio 3.';
      refreshUi();
      return;
    }

    if (action === 'openLetheUnlimited') {
      state.setDebugFlag?.('freeShopping', true);
      const freeFlag = panel.querySelector('[data-debug-flag="freeShopping"]');
      if (freeFlag) freeFlag.checked = true;
      state.debugLocalPatch?.({ mnemosyne: '999999' });
      state.ascensionOpen = true;
      state.milestones = { ...state.milestones, ascensionOpen: true };
      if (typeof openRiver === 'function') openRiver();
      if (status) {
        status.textContent = 'Lethe sem limites: free shop + essência alta + Rio aberto.';
      }
      refreshUi();
      return;
    }

    if (action === 'openLetheModal') {
      if (typeof openLetheModal === 'function') openLetheModal();
      if (status) status.textContent = 'Ritual do Lethe aberto.';
      return;
    }

    if (action === 'openRiver') {
      state.ascensionOpen = true;
      state.milestones = { ...state.milestones, ascensionOpen: true };
      if (typeof openRiver === 'function') openRiver();
      if (status) status.textContent = 'Rio do Lethe aberto.';
      refreshUi();
    }
  };

  mechanicButtons.forEach((button) => {
    const action = button.getAttribute('data-debug-action');
    if (!action || action === 'exitTestMode' || action === 'shinyHalf' || action === 'goldHalf') {
      return;
    }
    button.addEventListener('click', () => runMechanic(action));
  });
}

function bindJuizoCta(api, { onError, getState } = {}) {
  const button = document.getElementById('despertar-juizo-open');
  const hint = document.getElementById('despertar-juizo-hint');
  if (!button) return null;
  const cta = getJuizoCtaState();
  button.disabled = !cta.ready;
  button.setAttribute('aria-disabled', String(!cta.ready));
  button.title = cta.hint || cta.label;
  if (hint) {
    hint.textContent = cta.hint;
    hint.hidden = !cta.hint;
  }

  const labelEl = button.querySelector('.despertar-juizo-cta__label');
  if (labelEl) labelEl.textContent = cta.label;
  else button.textContent = cta.label;

  const modal = new JuizoModal(document, {
    start: () => api.juizoStart(),
    guess: (choice) => api.juizoGuess(choice),
    abandon: () => api.juizoAbandon(),
  }, {
    hasMercy: () => {
      const purchases = getState?.()?.verdictPurchases;
      return Array.isArray(purchases) && purchases.includes('catalogo_vivo');
    },
    openBancada: () => {
      const tab = document.getElementById('tab-bancada');
      if (tab && typeof tab.click === 'function') tab.click();
      else tab?.dispatchEvent(new Event('click', { bubbles: true }));
    },
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
      const souls = document.getElementById('despertar-harvest-souls');
      const duration = document.getElementById('despertar-harvest-duration');
      const rate = document.getElementById('despertar-harvest-rate');
      const rateRow = document.getElementById('despertar-harvest-rate-row');
      const cap = document.getElementById('despertar-harvest-cap');
      if (body) body.textContent = harvest.body || '';
      if (souls) souls.textContent = harvest.soulsLabel || '0';
      if (duration) duration.textContent = harvest.durationLabel || '0 s';
      const showRate = Boolean(harvest.rateLabel);
      if (rateRow) rateRow.hidden = !showRate;
      if (rate && showRate) rate.textContent = harvest.rateLabel;
      if (cap) {
        cap.hidden = !harvest.capNote;
        if (harvest.capNote) cap.textContent = harvest.capNote;
      }
      modal.hidden = false;
      ok.focus();
    },
  };
}

function bindLetheModal(state, { onConfirm, onAfterPrestige } = {}) {
  const modal = document.getElementById('despertar-lethe-modal');
  const confirm = document.getElementById('despertar-lethe-confirm');
  const cancel = document.getElementById('despertar-lethe-cancel');
  const preview = document.getElementById('despertar-lethe-preview');
  const memory = document.getElementById('despertar-lethe-memory');
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
    if (memory) {
      memory.hidden = false;
      memory.textContent = formatLetheMemoryPreview(countLethePermanents(state));
    }
    modal.hidden = false;
    confirm.focus();
  }

  function celebrateRitual(gainPreview, permanents) {
    playLetheRitualFeel({
      title: 'Catábase',
      detail: `O Lethe bebeu a corrida. +${gainPreview.obolsGain} Óbolos · +${gainPreview.mnemosyneGain} Essência.`,
    });
    showTutorialToast({
      text: formatLetheMemoryToast(permanents),
      holdMs: 8_000,
    });
  }

  cancel.addEventListener('click', close);
  confirm.addEventListener('click', async () => {
    const gainPreview = state.prestigePreview();
    const permanents = countLethePermanents(state);
    confirm.disabled = true;
    try {
      if (typeof onConfirm === 'function') {
        const ok = await onConfirm();
        if (ok) {
          celebrateRitual(gainPreview, permanents);
          close();
          onAfterPrestige?.();
        }
      } else {
        const result = state.applyPrestige();
        if (result.ok) {
          celebrateRitual(gainPreview, permanents);
          close();
          onAfterPrestige?.();
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
  const season = await fetchDespertarSeasonHold(token);
  const published = season.effectivePublished;
  // Liberado só com season_liberated === true explícito.
  const seasonHold = Boolean(DESPERTAR_SEASON_CLOSED && season.seasonLiberated !== true);

  initAppShell({
    route: 'despertar',
    role: isAdmin ? 'admin' : 'student',
    token,
    onLogout: async () => {
      await logout();
    },
  });

  // Hold: pódio para todos até Abrir Temporada 2.
  // Preview só com ?preview=1 nesta carga (não sticky sozinho).
  const adminPreview = isAdmin && consumeAdminPreviewQuery({ isAdmin, requireQuery: true });
  if (seasonHold && !adminPreview) {
    try {
      await ensureAcheronSealedForSeason(token, isAdmin);
      await showSeasonClosedState(token, { isAdmin });
    } catch (error) {
      console.error('[Despertar] falha ao montar véu de temporada:', error);
      showApiWarning(
        error instanceof ApiError
          ? error.message
          : 'O pódio da Temporada 1 não carregou por completo. Use o Placar ou force atualizar (Ctrl+F5).',
        { dismissMs: 0 }
      );
      // Mantém o véu estático do HTML (data-season-hold-static) se o rich veil falhar.
    }
    return;
  }

  // Liberado / preview: tira o fallback HTML para o jogo montar.
  document.querySelector('[data-season-hold-static]')?.remove();

  if (!isAdmin && !published) {
    showSealedState(token, { isAdmin });
    return;
  }

  if (adminPreview && seasonHold) {
    mountAdminPreviewBanner();
  }

  // Probe: Acheron publicado mas sob Véu da Aula → countdown (aluno).
  if (!isAdmin && token) {
    try {
      const probe = await despertarStateGet(token);
      rememberPauseWindow(probe?.pauseWindow || probe?.pause);
      applyDespertarNavState(document.querySelector('[data-shell]'), {
        published: true,
        isAdmin: false,
        pauseActive: Boolean(probe?.pause?.active),
      });
      if (probe?.pause?.active) {
        await enterClassroomPauseVeil({
          pause: probe.pause,
          serverNow: probe.serverNow,
          token,
        });
        return;
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        const code = error.payload?.error;
        if (code === DESPERTAR_SEALED_ERROR) {
          showSealedState();
          return;
        }
        if (code === DESPERTAR_PAUSED_ERROR && error.payload?.pause?.active) {
          rememberPauseWindow(error.payload.pauseWindow || error.payload.pause);
          await enterClassroomPauseVeil({
            pause: error.payload.pause,
            serverNow: error.payload.serverNow,
            token,
          });
          return;
        }
      }
      // Falha de rede: segue boot local; sync pode abrir o véu depois.
    }
  } else if (isAdmin && token) {
    try {
      const probe = await despertarStateGet(token);
      rememberPauseWindow(probe?.pauseWindow || probe?.pause);
      applyDespertarNavState(document.querySelector('[data-shell]'), {
        published,
        isAdmin: true,
        pauseActive: Boolean(probe?.pause?.active),
      });
    } catch {
      // admin segue
    }
  }

  bindTabs(document.getElementById('despertar-tabs'));
  const harvestUi = bindHarvestModal();

  const storage = new StorageService();
  /** Preenchido após o boot; ApiService usa getters estáveis. */
  const stateRef = { current: null };
  const riverOpenRef = { current: false };
  const riverUiRef = { current: null };
  const diagOn = syncDiagEnabled();
  const api = new ApiService({
    getToken: () => getSession()?.token ?? null,
    getSnapshot: () => stateRef.current?.toSnapshot?.() ?? {},
    applyServerState: (serverState, meta = {}) => {
      if (!stateRef.current) return;
      const keepAscension = Boolean(riverOpenRef.current);
      const incomingTalents = serverState?.talents ?? serverState?.talents_state;
      const localTalents = stateRef.current.talents || [];
      const wouldDropLocalSeal = Array.isArray(incomingTalents)
        && localTalents.some((tid) => !incomingTalents.map(String).includes(String(tid)));
      // Rio aberto, reconcile explícito, reject, ou selo só-local → nunca replace.
      const mode = (
        keepAscension
        || meta.mode === 'reconcile'
        || meta.ok === false
        || wouldDropLocalSeal
      ) ? 'reconcile' : 'replace';
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
      // Sync atrasado não pode fechar a janela do Rio enquanto a overlay está aberta.
      if (keepAscension && !stateRef.current.ascensionOpen) {
        stateRef.current.ascensionOpen = true;
        stateRef.current.milestones = {
          ...stateRef.current.milestones,
          ascensionOpen: true,
        };
      }
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
      // Não refresh a cada sync — evita nó “voltar” durante selo otimista.
      // Refresh explícito em onBuyTalent / open / close.
    },
    onRejected: ({ error, pause, serverNow, payload }) => {
      if (error === DESPERTAR_PAUSED_ERROR) {
        rememberPauseWindow(payload?.pauseWindow || pause);
        const tokenNow = getSession()?.token ?? null;
        const pauseDto = pause?.active
          ? pause
          : null;
        if (pauseDto && tokenNow) {
          void enterClassroomPauseVeil({
            pause: pauseDto,
            serverNow,
            token: tokenNow,
          });
          return;
        }
        if (tokenNow) {
          void despertarStateGet(tokenNow)
            .then((remote) => {
              rememberPauseWindow(remote?.pauseWindow || remote?.pause);
              if (remote?.pause?.active) {
                return enterClassroomPauseVeil({
                  pause: remote.pause,
                  serverNow: remote.serverNow,
                  token: tokenNow,
                });
              }
              return null;
            })
            .catch(() => {
              showApiWarning('Não foi possível verificar a pausa da aula.');
            });
          return;
        }
      }
      if (error === DESPERTAR_SEALED_ERROR) {
        showSealedState();
        return;
      }
      // Sync econômico confia no cliente — sem toast dos Juízes / Estela.
      const msg = String(error || '');
      if (
        msg === JUDGES_REFUSED_MESSAGE
        || /Estela do servidor/i.test(msg)
        || /restaurou o estado verdadeiro/i.test(msg)
      ) {
        return;
      }
      if (msg) showApiWarning(msg);
    },
    onSynced: ({ awarded }) => {
      if (awarded?.achievements?.length) {
        stateRef.current?.unlockAchievements?.(awarded.achievements);
        presentGrimoireAwards(awarded);
      }
    },
    logDiag: diagOn ? logSyncDiag : null,
  });

  bindJuizoCta(api, {
    onError: showApiWarning,
    getState: () => stateRef.current,
  });

  const boot = await bootAuthoritativeSession(user.id, {
    storage,
    pause: pauseWindowRef.current,
    fetchServerState: async () => {
      const remote = await api.pullState({ apply: false });
      rememberPauseWindow(remote?.pauseWindow || remote?.pause);
      return {
        state: remote?.state ?? null,
        pause: remote?.pauseWindow || remote?.pause || pauseWindowRef.current,
      };
    },
  });

  if (boot.pause) {
    rememberPauseWindow(boot.pause);
  }

  if (boot.fetchError instanceof ApiError && boot.fetchError.status === 403) {
    const code = boot.fetchError.payload?.error;
    if (code === DESPERTAR_PAUSED_ERROR && boot.fetchError.payload?.pause?.active) {
      rememberPauseWindow(boot.fetchError.payload.pauseWindow || boot.fetchError.payload.pause);
      await enterClassroomPauseVeil({
        pause: boot.fetchError.payload.pause,
        serverNow: boot.fetchError.payload.serverNow,
        token,
      });
      return;
    }
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

  /**
   * Selo otimista: UI na hora; flush grava pais/carteira; talentBuy confirma.
   * Nunca rollback por Essência/prereq de sync — só por talento desconhecido.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async function sealTalentOptimistic(id) {
    const s = stateRef.current || state;
    riverOpenRef.current = true;
    s.ascensionOpen = true;
    s.milestones = { ...s.milestones, ascensionOpen: true };

    const local = s.buyTalent(id);
    if (!local.ok) return false;
    riverUiRef.current?.refresh?.();
    uiRef.renderer?.markDirty?.('lethe');
    storage.scheduleSave(user.id, s);

    const cost = local.cost;

    const rollbackUnknown = (msg) => {
      if (!s.talents.includes(id)) return;
      s.talents = s.talents.filter((tid) => tid !== id);
      if (cost != null) s.mnemosyne = add(s.mnemosyne, cost);
      s.invalidateEconomyCache?.();
      s.unlockLogs?.();
      riverUiRef.current?.refresh?.();
      uiRef.renderer?.markDirty?.('lethe');
      showApiWarning(msg || 'Não foi possível selar o talento.');
    };

    const softFail = (msg) => {
      // Mantém selo local; tenta de novo no próximo ciclo.
      showApiWarning(msg || 'O Submundo ainda sincroniza o selo…');
      api.markDirty();
      riverUiRef.current?.refresh?.();
      api.requestSync?.();
    };

    const persist = async () => {
      s.ascensionOpen = true;
      s.milestones = { ...s.milestones, ascensionOpen: true };
      api.markDirty();
      // Flush primeiro: grava pais otimistas no DB (Catábase aceita newSpend ≤ mne).
      try {
        await api.flush();
      } catch {
        /* reject agora é reconcile — segue para talentBuy */
      }
      try {
        await api.talentBuy(id);
      } catch (buyErr) {
        const buyMsg = buyErr instanceof ApiError
          ? buyErr.message
          : String(buyErr?.message || '');
        if (/já está na memória/i.test(buyMsg)) return;
        // Pais/carteira atrasados: flush de novo + 1 retry.
        if (
          /faltam vertentes|essência insuficiente|catábase|lethe só aceita/i.test(buyMsg)
        ) {
          api.markDirty();
          try {
            await api.flush();
          } catch { /* ignore */ }
          await api.talentBuy(id);
          return;
        }
        throw buyErr;
      }
      riverUiRef.current?.refresh?.();
      uiRef.renderer?.markDirty?.('lethe');
    };

    void (async () => {
      try {
        await persist();
      } catch (error) {
        const msg = error instanceof ApiError ? error.message : String(error?.message || '');
        if (/já está na memória/i.test(msg)) {
          riverUiRef.current?.refresh?.();
          return;
        }
        if (/talento desconhecido|unknown talent/i.test(msg)) {
          // Se o client conhece o id, o catálogo do server está atrasado — não reverte o selo.
          if (getTalent(id)) {
            softFail(
              `Selo local ok, mas o Submundo ainda não conhece «${id}». Publique o catálogo PHP do Rio.`,
            );
            return;
          }
          rollbackUnknown(msg);
          return;
        }
        softFail(msg);
      }
    })();

    return true;
  }

  const riverUi = bindLetheRiverTree({
    getState: () => stateRef.current || state,
    onBuyTalent: sealTalentOptimistic,
    onClose: async () => {
      riverOpenRef.current = false;
      state.closeAscension();
      try {
        await api.flush();
        await api.closeAscension();
      } catch {
        /* local close already applied */
      }
      uiRef.renderer?.markDirty?.('lethe');
    },
  });
  riverUiRef.current = riverUi;
  const _riverOpen = riverUi.open.bind(riverUi);
  riverUi.open = (...args) => {
    riverOpenRef.current = true;
    return _riverOpen(...args);
  };
  const _riverClose = riverUi.close.bind(riverUi);
  riverUi.close = (...args) => {
    riverOpenRef.current = false;
    return _riverClose(...args);
  };

  const letheUi = bindLetheModal(state, {
    onConfirm: async () => {
      try {
        await api.flush();
        const remote = await api.prestige();
        // Sem token / resposta vazia: aplica Catábase local para abrir o Rio.
        if (!remote?.state && !state.ascensionOpen) {
          const local = state.applyPrestige();
          if (!local.ok) {
            showApiWarning('O Ritual falhou.');
            return false;
          }
        }
        // Garante a sessão de selo mesmo se o sync atrasar o flag.
        state.ascensionOpen = true;
        state.milestones = { ...state.milestones, ascensionOpen: true };
        uiRef.renderer?.resetShinyRumor?.();
        return true;
      } catch (error) {
        const local = state.applyPrestige();
        if (local.ok) {
          state.ascensionOpen = true;
          state.milestones = { ...state.milestones, ascensionOpen: true };
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
    onAfterPrestige: () => {
      state.ascensionOpen = true;
      state.milestones = { ...state.milestones, ascensionOpen: true };
      riverUi.open();
    },
  });

  if (state.ascensionOpen) {
    queueMicrotask(() => riverUi.open());
  }

  const renderer = new UIRenderer(document, {
    state,
    getUserId: () => user?.id ?? null,
    getToken: () => getSession()?.token ?? null,
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
    onBuyTalent: sealTalentOptimistic,
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
    onClickShimmer: () => {
      const res = state.clickShimmer();
      if (res?.ok) {
        const reducedMotion = juicePrefersReducedMotion();
        const prefs = uiRef.renderer?.getPerfPrefs?.() || { particles: true, fancy: true };
        uiRef.renderer?._shimmerView?.spawnClickFeedback(res, {
          reducedMotion,
          particles: prefs.particles,
        });
        uiRef.renderer?.markDirty?.('all');
        if (!state.isFreeShopping?.()) {
          api.requestSync();
        }
      }
    },
  });
  uiRef.renderer = renderer;
  renderer.mount(state);
  mountSeasonHallFab({ token });

  // Nomes das unidades = mistura dos nomes/usernames da turma (Cookie: grandma names).
  void (async () => {
    const people = [];
    if (user) {
      people.push({
        fullName: user.fullName || user.name || '',
        username: user.username || '',
      });
    }
    if (token) {
      try {
        const payload = await listClassmates(token);
        for (const row of payload.classmates || []) {
          people.push({
            fullName: row.fullName || row.name || '',
            username: row.username || '',
          });
        }
      } catch {
        /* offline / sem Salão — fallback estático em unitPersona */
      }
    }
    seedUnitNamePool(people);
  })();

  const reap = document.getElementById('despertar-reap');
  const particles = document.querySelector('[data-particle-layer]');
  const floatLayer = document.querySelector('[data-float-layer]');
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
        const resumed = resumeFromHidden(state, seconds, {
          pause: pauseWindowRef.current,
        });
        harvestUi.show(resumed.harvest);
        renderer.markDirty('all');
        api.requestSync();
      },
      onAutoLod: ({ active }) => {
        if (active) renderer.applyAutoLod(true);
      },
    },
  );

  reap?.addEventListener('click', () => {
    const { gained } = state.click();
    const reducedMotion = loop.prefersReducedMotion();
    const perfPrefs = renderer.getPerfPrefs();
    pulseReapButton(reap, { reducedMotion });
    playFoiceSlash(reap, { reducedMotion });
    spawnReapParticles(particles, {
      reducedMotion,
      particles: perfPrefs.particles,
      clickPower: gained,
      gained,
    });
    playReapJuice({
      root: document,
      stage: reapStage,
      floatLayer: floatLayer || particles,
      amount: gained,
      reducedMotion,
      particles: perfPrefs.particles,
      fancy: perfPrefs.fancy,
    });
    if (!reducedMotion && perfPrefs.fancy) {
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
    openRiver: () => riverUi.open(),
    openLetheModal: () => letheUi.open(),
    markDirty: (scope) => uiRef.renderer?.markDirty?.(scope || 'all'),
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
