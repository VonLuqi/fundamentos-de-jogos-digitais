/**
 * Sync live do ClassInd-dle via HTTP polling (HostGator PHP + MySQL).
 */

'use strict';

const FALLBACK_POLL_MS = 3000;

/**
 * @param {{
 *   roomId: string,
 *   realtime?: { url: string, anonKey: string, roomId: string } | null,
 *   getState: () => Promise<{ state: object }>,
 *   onSnapshot: (payload: object, meta: { source: string }) => void,
 *   onStatus: (status: 'live'|'poll'|'offline'|'connecting', detail?: string) => void,
 * }} options
 */
export function createRealtimeSync(options) {
  const {
    getState,
    onSnapshot,
    onStatus,
  } = options;

  let localVersion = 0;
  let pollTimer = null;
  let stopped = false;
  let mode = 'connecting';

  function setMode(next, detail) {
    mode = next;
    onStatus?.(next, detail);
  }

  function applyPayload(payload, source) {
    if (!payload || typeof payload !== 'object') return;
    const version = Number(payload.stateVersion) || 0;
    if (version < localVersion) return;
    localVersion = version;
    onSnapshot(payload, { source });
  }

  async function resync(source = 'resync') {
    if (stopped) return;
    try {
      const result = await getState();
      if (result?.state) applyPayload(result.state, source);
    } catch (error) {
      console.warn('[classind-realtime] getState falhou', error);
      setMode('offline', error?.message || 'Falha ao sincronizar');
    }
  }

  function stopPoll() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function startPoll(reason) {
    stopPoll();
    setMode('poll', reason || 'Sincronização ativa');
    pollTimer = setInterval(() => {
      if (document.hidden) return;
      resync('poll');
    }, FALLBACK_POLL_MS);
    resync('poll');
  }

  function onVisibility() {
    if (document.hidden || stopped) return;
    resync('visible');
  }

  document.addEventListener('visibilitychange', onVisibility);

  return {
    start() {
      stopped = false;
      startPoll('Sincronização HTTP ativa');
    },
    stop() {
      stopped = true;
      stopPoll();
      document.removeEventListener('visibilitychange', onVisibility);
    },
    bumpLocalVersion(version) {
      const v = Number(version) || 0;
      if (v > localVersion) localVersion = v;
    },
    getMode() {
      return mode;
    },
    resync,
  };
}
