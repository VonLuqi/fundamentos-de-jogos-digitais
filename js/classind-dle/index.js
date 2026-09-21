/**
 * ClassInd-dle — runtime da sala live (Task 4).
 */

'use strict';

import { initAppShell } from '../app-shell.js';
import {
  ApiError,
  classindCastVote,
  classindCloseRoom,
  classindCreateRoom,
  classindGetState,
  classindJoinRoom,
  classindListRoster,
  classindNextRound,
  classindPing,
  classindReveal,
  classindShowRanking,
  classindStartRound,
  getSession,
  logout,
  requireSession,
  ROUTES,
} from '../api.js';
import { createRealtimeSync } from './realtime.js';
import {
  bindLessonDiscoveryLifecycle,
  enqueueDiscovery,
} from '../lesson-discovery.js';
import { renderGate } from './ui/RoomLobby.js';
import { renderVoteBoard } from './ui/VoteBoard.js';
import { renderRevealCard } from './ui/RevealCard.js';
import { renderCodeBanner, renderHostControls, renderStudentRoster } from './ui/HostControls.js';
import { renderResultsPanel } from './ui/ResultsPanel.js';
import { renderRankingPanel } from './ui/RankingPanel.js';

const els = {
  status: null,
  toast: null,
  code: null,
  main: null,
  board: null,
  reveal: null,
  host: null,
  back: null,
};

let currentUser = null;
let currentToken = null;
let roomId = null;
let roomCode = null;
let realtimeConfig = null;
let sync = null;
let state = null;
let busy = false;
let myVoteLocal = null;
let pingTimer = null;
let rosterTimer = null;
let resyncingEndSession = false;
let endSessionResyncTimer = null;

function isHostViewerNow() {
  const isAdminRole = currentUser?.role === 'admin';
  const isHost = Boolean(
    currentUser?.id
    && state?.hostUserId
    && String(state.hostUserId) === String(currentUser.id)
  );
  return isAdminRole || isHost;
}

/** Snapshot público do Realtime não traz placar/ranking — getState é obrigatório. */
function needsEndSessionResync(s) {
  const phase = s?.phase;
  if (phase === 'results') {
    return isHostViewerNow()
      ? !Array.isArray(s.performances)
      : !s.myPerformance;
  }
  if (phase === 'ranking') {
    return !Array.isArray(s.ranking);
  }
  return false;
}

function leaveClosedRoom() {
  showToast('Sala encerrada.');
  showGate();
  history.replaceState(null, '', window.location.pathname);
}

function scheduleEndSessionResync() {
  if (resyncingEndSession || !roomId || !currentToken) return;
  window.clearTimeout(endSessionResyncTimer);
  endSessionResyncTimer = window.setTimeout(() => {
    resyncEndSessionState().catch(() => {});
  }, 0);
}

async function resyncEndSessionState() {
  if (resyncingEndSession || !roomId || !currentToken) return;
  if (!needsEndSessionResync(state)) return;
  resyncingEndSession = true;
  try {
    const fresh = await classindGetState(currentToken, { roomId });
    if (fresh?.realtime) realtimeConfig = fresh.realtime;
    notifyAwarded(fresh);
    if (fresh?.state) {
      sync?.bumpLocalVersion(fresh.state.stateVersion);
      mergeState(fresh.state);
    }
  } catch (error) {
    console.warn('[classind] end-session resync failed', error);
  } finally {
    resyncingEndSession = false;
  }
}

function notifyAwarded(result) {
  const ids = result?.awarded?.achievements;
  if (!Array.isArray(ids) || ids.length === 0) return;
  enqueueDiscovery(ids);
}

function showToast(message, kind = 'info') {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.classList.toggle('is-error', kind === 'error');
  els.toast.classList.add('is-visible');
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => {
    els.toast.classList.remove('is-visible');
  }, 3200);
}

function setStatus(mode, detail) {
  if (!els.status) return;
  const labels = {
    live: 'Ao vivo',
    poll: 'Reconectando (poll)',
    connecting: 'Conectando…',
    offline: 'Offline',
    idle: 'Fora da sala',
  };
  const pillClass = mode === 'live' ? 'is-live' : mode === 'poll' || mode === 'offline' ? 'is-poll' : '';
  const isAdmin = currentUser?.role === 'admin';
  const scoreHtml = !isAdmin && roomId && state
    ? `<span class="classind-status__score">Acertos: <strong>${Number(state.scoreCorrect) || 0}/${Number(state.scoreAnswered) || 0}</strong></span>`
    : '';
  els.status.innerHTML = `
    <span class="classind-status__pill ${pillClass}">${labels[mode] || mode}</span>
    ${roomCode ? `<span>Sala <strong>${roomCode}</strong></span>` : ''}
    ${scoreHtml}
    ${detail ? `<span>${detail}</span>` : ''}
  `;
}

function mergeState(next) {
  if (!next || typeof next !== 'object') return;

  const prevRound = state?.roundIndex;
  const prevPhase = state?.phase;
  const roundChanged = Object.prototype.hasOwnProperty.call(next, 'roundIndex')
    && next.roundIndex !== prevRound;
  const enteredVoting = next.phase === 'voting'
    && (prevPhase !== 'voting' || roundChanged);

  if (enteredVoting || roundChanged) {
    myVoteLocal = null;
  }

  const nextHasVote = Object.prototype.hasOwnProperty.call(next, 'myVote');
  let myVote;
  if (nextHasVote) {
    myVote = next.myVote == null ? null : next.myVote;
    myVoteLocal = myVote;
  } else if (enteredVoting || roundChanged) {
    myVote = null;
  } else {
    myVote = myVoteLocal ?? state?.myVote ?? null;
  }

  state = {
    ...state,
    ...next,
    myVote,
  };

  if (state.correctSide && state.myVote) {
    state.youWereCorrect = state.myVote === state.correctSide;
  } else if (state.phase === 'voting') {
    state.youWereCorrect = null;
  }

  // Aluno: sala encerrada → sair do gate (host já usa leaveAfter em closeRoom).
  if (state.phase === 'closed' && !isHostViewerNow()) {
    leaveClosedRoom();
    return;
  }

  renderRoom();

  if (needsEndSessionResync(state)) {
    scheduleEndSessionResync();
    return;
  }

  const phase = state.phase || 'lobby';
  if (phase !== 'results' && phase !== 'ranking' && phase !== 'closed') {
    scheduleRosterRefresh();
  }
}

function scheduleRosterRefresh() {
  if (!roomId) return;
  window.clearTimeout(rosterTimer);
  rosterTimer = window.setTimeout(async () => {
    try {
      const roster = await classindListRoster(currentToken, { roomId });
      if (!roster?.roster || !state) return;
      state = {
        ...state,
        roster: roster.roster,
        pendingVoters: roster.pendingVoters,
      };
      renderRoom();
    } catch {
      /* roster best-effort */
    }
  }, 500);
}

function renderRoom() {
  const isAdminRole = currentUser?.role === 'admin';
  const isHost = Boolean(
    currentUser?.id
    && state?.hostUserId
    && String(state.hostUserId) === String(currentUser.id)
  );
  const isHostViewer = isAdminRole || isHost;
  renderCodeBanner(els.code, roomCode);

  if (!roomId || !state) {
    els.board.innerHTML = '';
    els.reveal.innerHTML = '';
    els.reveal.hidden = true;
    if (els.host) els.host.hidden = true;
    return;
  }

  const phase = state.phase || 'lobby';
  const confirmClose = () => {
    if (!window.confirm('Encerrar esta sala? Alunos serão desconectados.')) return;
    runHost(classindCloseRoom, { roomId }, { leaveAfter: true });
  };

  if (phase === 'results') {
    els.reveal.hidden = true;
    els.reveal.innerHTML = '';
    if (els.host) {
      els.host.hidden = true;
      els.host.innerHTML = '';
    }
    renderResultsPanel(els.board, {
      state,
      isHost: isHostViewer,
      onShowRanking: () => runHost(classindShowRanking, { roomId }),
      onCloseRoom: confirmClose,
    });
    setStatus(
      sync?.getMode?.() || (realtimeConfig ? 'connecting' : 'poll'),
      isHostViewer ? 'Mestre (não vota)' : null
    );
    return;
  }

  if (phase === 'ranking') {
    els.reveal.hidden = true;
    els.reveal.innerHTML = '';
    if (els.host) {
      els.host.hidden = true;
      els.host.innerHTML = '';
    }
    renderRankingPanel(els.board, {
      state,
      isHost: isHostViewer,
      onCloseRoom: confirmClose,
    });
    setStatus(
      sync?.getMode?.() || (realtimeConfig ? 'connecting' : 'poll'),
      isHostViewer ? 'Mestre (não vota)' : null
    );
    return;
  }

  if (phase === 'closed') {
    els.reveal.hidden = true;
    els.reveal.innerHTML = '';
    if (els.host) {
      els.host.hidden = true;
      els.host.innerHTML = '';
    }
    els.board.innerHTML = '<div class="classind-empty"><p>Sala encerrada.</p></div>';
    setStatus(sync?.getMode?.() || 'idle');
    return;
  }

  // Snapshot público do Realtime não traz canVote — derivar sempre do role/host + phase.
  const canVote = !isHostViewer && phase === 'voting';

  renderVoteBoard(els.board, {
    state,
    canVote,
    onVote: handleVote,
  });
  renderRevealCard(els.reveal, { state, isHost: isHostViewer });

  if (isHostViewer && els.host) {
    renderHostControls(els.host, {
      state,
      onStartRound: () => runHost(classindStartRound, { roomId }),
      onReveal: () => runHost(classindReveal, { roomId }),
      onNextRound: () => runHost(classindNextRound, { roomId }),
      onCloseRoom: confirmClose,
    });
  } else if (els.host) {
    renderStudentRoster(els.host, { state });
  }

  setStatus(
    sync?.getMode?.() || (realtimeConfig ? 'connecting' : 'poll'),
    isHostViewer ? 'Mestre (não vota)' : null
  );
}

function stopSync() {
  if (sync) {
    sync.stop();
    sync = null;
  }
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
  window.clearTimeout(rosterTimer);
  rosterTimer = null;
  window.clearTimeout(endSessionResyncTimer);
  endSessionResyncTimer = null;
  resyncingEndSession = false;
}

function startSync() {
  stopSync();
  if (!roomId) return;

  sync = createRealtimeSync({
    roomId,
    realtime: realtimeConfig,
    getState: async () => {
      const result = await classindGetState(currentToken, { roomId });
      if (result?.realtime) realtimeConfig = result.realtime;
      notifyAwarded(result);
      return result;
    },
    onSnapshot: (payload) => {
      // Realtime = snapshot público; poll/resync = getState completo.
      mergeState(payload);
    },
    onStatus: (mode, detail) => setStatus(mode, detail),
  });

  if (state?.stateVersion) sync.bumpLocalVersion(state.stateVersion);
  sync.start();

  pingTimer = setInterval(() => {
    if (document.hidden || !roomId) return;
    classindPing(currentToken, { roomId }).catch(() => {});
  }, 60000);
}

async function enterSession(result) {
  roomId = result.roomId;
  roomCode = result.code || result.state?.code || roomCode;
  realtimeConfig = result.realtime || null;
  myVoteLocal = result.state?.myVote || null;
  state = result.state || null;

  if (roomId) {
    try {
      const roster = await classindListRoster(currentToken, { roomId });
      if (roster?.roster) {
        state = { ...state, roster: roster.roster, pendingVoters: roster.pendingVoters };
      }
    } catch {
      /* roster opcional */
    }
  }

  els.main.hidden = false;
  els.back.hidden = false;
  mergeState(state);
  startSync();
  history.replaceState(null, '', `?room=${encodeURIComponent(roomCode || '')}`);
  showToast(`Entrou na sala ${roomCode}`);
  notifyAwarded(result);
}

function showGate(initialCode = '') {
  stopSync();
  roomId = null;
  roomCode = null;
  state = null;
  myVoteLocal = null;
  realtimeConfig = null;
  setStatus('idle');
  els.code.hidden = true;
  els.code.innerHTML = '';
  els.reveal.hidden = true;
  els.reveal.innerHTML = '';
  if (els.host) {
    els.host.hidden = true;
    els.host.innerHTML = '';
  }
  els.back.hidden = true;
  els.main.hidden = true;

  renderGate(els.board, {
    isAdmin: currentUser?.role === 'admin',
    initialCode,
    busy,
    onJoin: handleJoin,
    onCreate: handleCreate,
  });
}

async function handleJoin(rawCode) {
  if (busy) return;
  const code = String(rawCode || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4,6}$/.test(code)) {
    showToast('Código inválido (4–6 caracteres).', 'error');
    return;
  }
  busy = true;
  try {
    const result = await classindJoinRoom(currentToken, code);
    await enterSession(result);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : 'Não foi possível entrar na sala.';
    showToast(message, 'error');
  } finally {
    busy = false;
  }
}

async function handleCreate(options) {
  if (busy) return;
  busy = true;
  try {
    const result = await classindCreateRoom(currentToken, options);
    await enterSession(result);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : 'Não foi possível criar a sala.';
    showToast(message, 'error');
  } finally {
    busy = false;
  }
}

async function handleVote(choice) {
  if (busy || !roomId || myVoteLocal) return;
  const isHostViewer = currentUser?.role === 'admin'
    || (state?.hostUserId && String(state.hostUserId) === String(currentUser?.id));
  if (isHostViewer) return;
  if (state?.phase !== 'voting') return;

  myVoteLocal = choice;
  mergeState({ myVote: choice });

  busy = true;
  try {
    const result = await classindCastVote(currentToken, { roomId, choice });
    if (result?.state) {
      sync?.bumpLocalVersion(result.state.stateVersion);
      mergeState(result.state);
    } else {
      mergeState({ myVote: result?.myVote || choice });
    }
  } catch (error) {
    myVoteLocal = null;
    const message = error instanceof ApiError ? error.message : 'Falha ao votar.';
    showToast(message, 'error');
    try {
      const fresh = await classindGetState(currentToken, { roomId });
      notifyAwarded(fresh);
      if (fresh?.state) mergeState(fresh.state);
    } catch {
      mergeState({ myVote: null });
    }
  } finally {
    busy = false;
  }
}

async function runHost(fn, args, { leaveAfter = false } = {}) {
  if (busy || !roomId) return;
  busy = true;
  try {
    const result = await fn(currentToken, args);
    if (result?.realtime) realtimeConfig = result.realtime;
    notifyAwarded(result);
    if (result?.state) {
      sync?.bumpLocalVersion(result.state.stateVersion);
      try {
        const roster = await classindListRoster(currentToken, { roomId });
        result.state.roster = roster.roster;
        result.state.pendingVoters = roster.pendingVoters;
      } catch {
        /* ignore */
      }
      mergeState(result.state);
    }
    if (leaveAfter || result?.state?.phase === 'closed') {
      showToast('Sala encerrada.');
      showGate();
      history.replaceState(null, '', window.location.pathname);
    }
  } catch (error) {
    const message = error instanceof ApiError ? error.message : 'Ação do Mestre falhou.';
    showToast(message, 'error');
  } finally {
    busy = false;
  }
}

function onKeyVote(event) {
  if (!roomId || state?.phase !== 'voting' || myVoteLocal) return;
  const isHostViewer = currentUser?.role === 'admin'
    || (state?.hostUserId && String(state.hostUserId) === String(currentUser?.id));
  if (isHostViewer) return;
  const tag = event.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (event.key === 'a' || event.key === 'A') handleVote('A');
  if (event.key === 'b' || event.key === 'B') handleVote('B');
}

async function init() {
  els.status = document.getElementById('classind-status');
  els.toast = document.getElementById('classind-toast');
  els.code = document.getElementById('classind-code');
  els.main = document.getElementById('classind-session');
  els.board = document.getElementById('classind-board');
  els.reveal = document.getElementById('classind-reveal');
  els.host = document.getElementById('classind-host');
  els.back = document.getElementById('classind-leave');

  const result = await requireSession();
  if (!result) return;

  currentUser = result.user;
  currentToken = getSession()?.token ?? null;

  initAppShell({
    route: 'classind-dle',
    role: currentUser.role === 'admin' ? 'admin' : 'student',
    onLogout: async () => {
      stopSync();
      await logout();
      window.location.href = ROUTES.auth();
    },
  });

  bindLessonDiscoveryLifecycle();

  document.addEventListener('keydown', onKeyVote);
  els.back?.addEventListener('click', () => {
    stopSync();
    showGate();
    history.replaceState(null, '', window.location.pathname);
  });

  const params = new URLSearchParams(window.location.search);
  const deepCode = (params.get('room') || '').trim().toUpperCase();

  showGate(deepCode);
  if (deepCode && /^[A-Z0-9]{4,6}$/.test(deepCode)) {
    await handleJoin(deepCode);
  }
}

init().catch((error) => {
  const message = error instanceof ApiError
    ? error.message
    : 'Falha ao inicializar o ClassInd-dle.';
  window.alert(message);
});
