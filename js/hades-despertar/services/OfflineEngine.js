/**
 * Catch-up offline de O Despertar (GDD 5.5) + boot autoritativo (Task 5b).
 * Teto 8 h (12 h com talento), eficiência 80% (100% com talento).
 * Usa o SPS do estado salvo — não um SPS otimista.
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

export function previewCatchUp(snapshot, { savedAt, now = Date.now() } = {}) {
  const lastMs = Date.parse(savedAt ?? snapshot?.savedAt ?? snapshot?.lastSyncAt ?? '');
  const elapsedSeconds = Number.isFinite(lastMs) ? Math.max(0, (now - lastMs) / 1000) : 0;
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
  };
}

export function applyCatchUp(gameState, { savedAt, now = Date.now() } = {}) {
  const preview = previewCatchUp(gameState, { savedAt, now });
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

export function resumeFromHidden(gameState, elapsedSeconds) {
  gameState.noteHiddenDuration(elapsedSeconds);
  const applied = gameState.applyOffline(elapsedSeconds);
  const maxHours = economyEffects(gameState.talents, gameState.verdictPurchases).offlineHours;
  return {
    ...applied,
    elapsedSeconds: Number(elapsedSeconds) || 0,
    maxHours,
    harvest: formatHarvest({ ...applied, maxHours }),
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
} = {}) {
  if (!storage) throw new Error('StorageService é obrigatório no boot local.');
  const clock = typeof now === 'function' ? now : () => now;
  const record = await storage.load(userId);
  const state = GameState.fromSnapshot(record?.state ?? {});
  const catchUp = applyCatchUp(state, { savedAt: record?.savedAt, now: clock() });
  await storage.save(userId, state.toSnapshot());
  const detach = storage.attach(state, userId, { target: attachTarget });
  return { state, record, catchUp, detach };
}

/**
 * Boot IndexedDB ↔ servidor (Task 5b).
 * Um único catch-up, âncora = last_sync do vencedor (server) ou savedAt (local).
 */
export async function bootAuthoritativeSession(userId, {
  storage,
  fetchServerState,
  now = Date.now,
  attachTarget,
} = {}) {
  if (!storage) throw new Error('StorageService é obrigatório no boot autoritativo.');
  const clock = typeof now === 'function' ? now : () => now;
  const record = await storage.load(userId);

  let server = null;
  let fetchError = null;
  if (typeof fetchServerState === 'function') {
    try {
      server = await fetchServerState();
    } catch (error) {
      fetchError = error;
    }
  }

  const decision = resolveBootAuthority({
    local: record?.state ?? {},
    localSavedAt: record?.savedAt ?? null,
    server,
  });

  const state = GameState.fromSnapshot(decision.snapshot);
  const catchUp = applyCatchUp(state, {
    savedAt: decision.catchUpAnchor,
    now: clock(),
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
  };
}
