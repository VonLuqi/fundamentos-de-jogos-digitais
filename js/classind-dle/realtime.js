/**
 * Sync live: Supabase Realtime em classind_live_snapshots + fallback poll.
 */

'use strict';

import { createBrowserSupabase } from './supabase-browser.js';

const FALLBACK_POLL_MS = 4000;

/**
 * @param {{
 *   roomId: string,
 *   realtime: { url: string, anonKey: string, roomId: string } | null,
 *   getState: () => Promise<{ state: object }>,
 *   onSnapshot: (payload: object, meta: { source: string }) => void,
 *   onStatus: (status: 'live'|'poll'|'offline'|'connecting', detail?: string) => void,
 * }} options
 */
export function createRealtimeSync(options) {
  const {
    roomId,
    realtime,
    getState,
    onSnapshot,
    onStatus,
  } = options;

  let localVersion = 0;
  let supabase = null;
  let channel = null;
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
    setMode('poll', reason || 'Fallback polling');
    pollTimer = setInterval(() => {
      if (document.hidden) return;
      resync('poll');
    }, FALLBACK_POLL_MS);
    resync('poll');
  }

  async function subscribe() {
    if (!realtime?.url || !realtime?.anonKey) {
      startPoll('Sem anon key — polling');
      return;
    }

    try {
      setMode('connecting');
      supabase = await createBrowserSupabase({
        url: realtime.url,
        anonKey: realtime.anonKey,
      });

      channel = supabase
        .channel(`classind-live:${roomId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'classind_live_snapshots',
            filter: `room_id=eq.${roomId}`,
          },
          (event) => {
            const row = event?.new || event?.record || null;
            const payload = row?.payload;
            if (payload) {
              if (typeof payload === 'string') {
                try {
                  applyPayload(JSON.parse(payload), 'realtime');
                } catch {
                  /* ignore */
                }
              } else {
                applyPayload(payload, 'realtime');
              }
            }
          }
        )
        .subscribe((status) => {
          if (stopped) return;
          if (status === 'SUBSCRIBED') {
            stopPoll();
            setMode('live');
            resync('subscribed');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            startPoll(`Canal ${status}`);
          }
        });
    } catch (error) {
      console.warn('[classind-realtime] subscribe falhou', error);
      startPoll(error?.message || 'Realtime indisponível');
    }
  }

  function onVisibility() {
    if (document.hidden || stopped) return;
    resync('visible');
  }

  document.addEventListener('visibilitychange', onVisibility);

  return {
    start() {
      stopped = false;
      subscribe();
    },
    stop() {
      stopped = true;
      stopPoll();
      document.removeEventListener('visibilitychange', onVisibility);
      if (channel && supabase) {
        supabase.removeChannel(channel).catch(() => {});
      }
      channel = null;
      supabase = null;
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
