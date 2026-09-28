/**
 * Catch-up offline de O Despertar (GDD 5.5) + boot autoritativo (Task 5b).
 * Teto 8 h (12 h com talento), eficiência 80% (100% com talento).
 * Usa o SPS do estado salvo — não um SPS otimista.
 * Task A4: Véu da Aula — não farmá SPS no intervalo pausado.
 */

import { OFFLINE_MAX_HOURS_BASE } from '../config/constants.js';
import { GameState } from '../core/GameState.js';
import { money } from '../core/decimal.js';
import { calculateOfflineProgress, economyEffects } from '../core/formulas.js';

export function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  if (total < 60) return `${total} s`;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  if (hours <= 0) {
    return rest ? `${minutes} min ${rest} s` : `${minutes} min`;
  }
  if (minutes <= 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

export function formatAlmas(value) {
  const [whole, frac = '00'] = money(value).split('.');
  if (frac === '00') return whole;
  return `${whole}.${frac.replace(/0+$/, '')}`;
}

export function formatHarvest(result) {
  const effective = result?.effectiveSeconds ?? 0;
  const cappedOut = Boolean(result?.cappedOut);
  const maxHours = result?.maxHours ?? OFFLINE_MAX_HOURS_BASE;
  const show = Boolean(result?.ok) && !result?.ignored;
  return {
    show,
    title: 'Colheita na ausência',
    body: `O Submundo trabalhou ${formatDuration(effective)}. ${formatAlmas(result?.offlineSouls ?? '0')} almas chegaram à margem.`,
    capNote: cappedOut
      ? `O véu fechou após ${maxHours} h — o restante da ausência não foi colhido.`
      : null,
    cta: 'Retomar o trono',
  };
}

/**
 * Normaliza DTO de pausa (cliente ou meta snake_case).
 * @param {object|null|undefined} pause
 */
export function normalizePauseWindow(pause) {
  if (!pause || typeof pause !== 'object') return null;
  const pauseUntil = pause.pauseUntil ?? pause.pause_until ?? null;
  const pauseStartedAt = pause.pauseStartedAt ?? pause.pause_started_at ?? null;
  if (pauseUntil == null && pauseStartedAt == null && pause.active == null) return null;
  return {
    active: pause.active === true,
    pauseUntil: pauseUntil != null ? String(pauseUntil) : null,
    pauseStartedAt: pauseStartedAt != null ? String(pauseStartedAt) : null,
  };
}

/**
 * Pausa efetiva agora (lazy): active flag ou pauseUntil no futuro.
 * @param {object|null|undefined} pause
 * @param {number} [now]
 */
export function isPauseWindowActive(pause, now = Date.now()) {
  const win = normalizePauseWindow(pause);
  if (!win) return false;
  const until = Date.parse(win.pauseUntil || '');
  if (win.active) {
    if (Number.isFinite(until)) return until > now;
    return true;
  }
  if (!Number.isFinite(until)) return false;
  return until > now;
}

/**
 * Segundos offline creditáveis, excluindo o Véu da Aula.
 * - Pausa ativa → 0
 * - Com pauseStartedAt+pauseUntil → subtrai interseção com [savedAt, now]
 * - Sem pauseStartedAt → clamp conservador (início = savedAt)
 *
 * @param {{ savedAt?: string|null, now?: number, pause?: object|null }} opts
 * @returns {number}
 */
export function effectiveOfflineSeconds({
  savedAt = null,
  now = Date.now(),
  pause = null,
} = {}) {
  const lastMs = Date.parse(savedAt ?? '');
  const nowMs = typeof now === 'number' ? now : Date.parse(String(now));
  if (!Number.isFinite(lastMs) || !Number.isFinite(nowMs) || nowMs <= lastMs) {
    return 0;
  }

  const win = normalizePauseWindow(pause);
  if (isPauseWindowActive(win, nowMs)) {
    return 0;
  }

  let seconds = (nowMs - lastMs) / 1000;
  const untilMs = Date.parse(win?.pauseUntil || '');
  if (!Number.isFinite(untilMs) || untilMs <= lastMs) {
    return Math.max(0, seconds);
  }

  let startMs = Date.parse(win?.pauseStartedAt || '');
  if (!Number.isFinite(startMs)) {
    // Conservador (A4): sem âncora de início, assume pausa cobriu desde o save.
    startMs = lastMs;
  }

  const overlapStart = Math.max(lastMs, startMs);
  const overlapEnd = Math.min(nowMs, untilMs);
  if (overlapEnd > overlapStart) {
    seconds -= (overlapEnd - overlapStart) / 1000;
  }
  return Math.max(0, seconds);
}

/**
 * Clamp de tempo escondido (aba em background) vs janela de pausa.
 * @param {number} elapsedSeconds
 * @param {{ pause?: object|null, now?: number }} [opts]
 */
export function clampHiddenSeconds(elapsedSeconds, { pause = null, now = Date.now() } = {}) {
  const elapsed = Math.max(0, Number(elapsedSeconds) || 0);
  if (elapsed <= 0) return 0;
  if (isPauseWindowActive(pause, now)) return 0;

  const win = normalizePauseWindow(pause);
  const untilMs = Date.parse(win?.pauseUntil || '');
  if (!Number.isFinite(untilMs)) return elapsed;

  const hiddenStart = now - elapsed * 1000;
  let startMs = Date.parse(win?.pauseStartedAt || '');
  if (!Number.isFinite(startMs)) startMs = hiddenStart;

  const overlapStart = Math.max(hiddenStart, startMs);
  const overlapEnd = Math.min(now, untilMs);
  if (overlapEnd > overlapStart) {
    return Math.max(0, elapsed - (overlapEnd - overlapStart) / 1000);
  }
  return elapsed;
}

export function previewCatchUp(snapshot, { savedAt, now = Date.now(), pause = null } = {}) {
  const elapsedSeconds = effectiveOfflineSeconds({
    savedAt: savedAt ?? snapshot?.savedAt ?? snapshot?.lastSyncAt ?? null,
    now,
    pause,
  });
  const probe = snapshot instanceof GameState
    ? snapshot
    : GameState.fromSnapshot(snapshot ?? {});
  const sps = probe.sps();
  const progress = calculateOfflineProgress({
    elapsedSeconds,
    sps,
    talents: probe.talents,
    verdictPurchases: probe.verdictPurchases,
  });
  return {
    ...progress,
    elapsedSeconds,
    maxHours: economyEffects(probe.talents, probe.verdictPurchases).offlineHours,
    sps,
    pauseExcluded: Boolean(normalizePauseWindow(pause)),
  };
}

export function applyCatchUp(gameState, { savedAt, now = Date.now(), pause = null } = {}) {
  const preview = previewCatchUp(gameState, { savedAt, now, pause });
  const applied = gameState.applyOffline(preview.elapsedSeconds);
  const result = {
    ...preview,
    ...applied,
    maxHours: preview.maxHours,
    elapsedSeconds: preview.elapsedSeconds,
  };
  result.harvest = formatHarvest(result);
  return result;
}

export function resumeFromHidden(gameState, elapsedSeconds, { pause = null, now = Date.now() } = {}) {
  const seconds = clampHiddenSeconds(elapsedSeconds, { pause, now });
  gameState.noteHiddenDuration(seconds);
  const applied = gameState.applyOffline(seconds);
  const maxHours = economyEffects(gameState.talents, gameState.verdictPurchases).offlineHours;
  return {
    ...applied,
    elapsedSeconds: seconds,
    maxHours,
    harvest: formatHarvest({ ...applied, maxHours }),
    pauseExcluded: Boolean(normalizePauseWindow(pause)),
  };
}

/** Estado com progresso jogável (não Estela zerada). */
export function isProgressfulState(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return false;
  if (Number(snapshot.prestigeCount ?? snapshot.prestige_count) > 0) return true;
  const lifetime = Number.parseFloat(
    snapshot.lifetimeSouls ?? snapshot.lifetime_souls ?? '0',
  );
  if (Number.isFinite(lifetime) && lifetime > 0) return true;
  const gens = snapshot.generators ?? snapshot.generators_state ?? {};
  return Object.values(gens).some((qty) => Number(qty) > 0);
}

/**
 * Decide quem manda no boot (Task 5b).
 * - Servidor vence se lastSyncAt for mais novo.
 * - Exceção: local tem progresso e servidor ainda está vazio → local vence (push).
 * Catch-up âncora: server.lastSyncAt se server venceu; senão savedAt local
 * (não lastSyncAt local — a Estela local já inclui ticks até o save).
 */
export function resolveBootAuthority({
  local = {},
  localSavedAt = null,
  server = null,
} = {}) {
  const localSyncMs = Date.parse(local?.lastSyncAt || local?.last_sync_at || '') || 0;
  const serverSyncMs = Date.parse(server?.lastSyncAt || server?.last_sync_at || '') || 0;
  const localAlive = isProgressfulState(local);
  const serverEmpty = !isProgressfulState(server);

  if (!server) {
    return {
      source: 'local',
      snapshot: local || {},
      catchUpAnchor: localSavedAt || local?.lastSyncAt || local?.last_sync_at || null,
      shouldPush: false,
      localSyncMs,
      serverSyncMs: 0,
    };
  }

  if (serverSyncMs > localSyncMs + 1000 && !(localAlive && serverEmpty)) {
    return {
      source: 'server',
      snapshot: server,
      catchUpAnchor: server.lastSyncAt || server.last_sync_at || null,
      shouldPush: false,
      localSyncMs,
      serverSyncMs,
    };
  }

  if (localAlive) {
    return {
      source: 'local',
      snapshot: local || {},
      catchUpAnchor: localSavedAt || local?.lastSyncAt || local?.last_sync_at || null,
      shouldPush: true,
      localSyncMs,
      serverSyncMs,
    };
  }

  return {
    source: 'server',
    snapshot: server,
    catchUpAnchor: server.lastSyncAt || server.last_sync_at || null,
    shouldPush: false,
    localSyncMs,
    serverSyncMs,
  };
}

/**
 * Boot só local (Task 5). Catch-up a partir do savedAt da Estela.
 */
export async function bootLocalSession(userId, {
  storage,
  now = Date.now,
  attachTarget,
  pause = null,
} = {}) {
  if (!storage) throw new Error('StorageService é obrigatório no boot local.');
  const clock = typeof now === 'function' ? now : () => now;
  const record = await storage.load(userId);
  const state = GameState.fromSnapshot(record?.state ?? {});
  const catchUp = applyCatchUp(state, { savedAt: record?.savedAt, now: clock(), pause });
  await storage.save(userId, state.toSnapshot());
  const detach = storage.attach(state, userId, { target: attachTarget });
  return { state, record, catchUp, detach };
}

/**
 * Boot IndexedDB ↔ servidor (Task 5b).
 * Um único catch-up, âncora = last_sync do vencedor (server) ou savedAt (local).
 * `fetchServerState` pode devolver o state puro **ou** `{ state, pause }`.
 */
export async function bootAuthoritativeSession(userId, {
  storage,
  fetchServerState,
  now = Date.now,
  attachTarget,
  pause = null,
} = {}) {
  if (!storage) throw new Error('StorageService é obrigatório no boot autoritativo.');
  const clock = typeof now === 'function' ? now : () => now;
  const record = await storage.load(userId);

  let server = null;
  let fetchError = null;
  let pauseFromFetch = null;
  if (typeof fetchServerState === 'function') {
    try {
      const remote = await fetchServerState();
      if (remote && typeof remote === 'object' && Object.prototype.hasOwnProperty.call(remote, 'state')) {
        server = remote.state ?? null;
        pauseFromFetch = remote.pause ?? null;
      } else {
        server = remote;
      }
    } catch (error) {
      fetchError = error;
    }
  }

  const decision = resolveBootAuthority({
    local: record?.state ?? {},
    localSavedAt: record?.savedAt ?? null,
    server,
  });

  const pauseWindow = normalizePauseWindow(pause) || normalizePauseWindow(pauseFromFetch);

  const state = GameState.fromSnapshot(decision.snapshot);
  const catchUp = applyCatchUp(state, {
    savedAt: decision.catchUpAnchor,
    now: clock(),
    pause: pauseWindow,
  });
  await storage.save(userId, state.toSnapshot());
  const detach = storage.attach(state, userId, { target: attachTarget });

  return {
    state,
    record,
    catchUp,
    decision,
    detach,
    fetchError,
    server,
    pause: pauseWindow,
  };
}
