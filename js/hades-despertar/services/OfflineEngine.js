/**
 * Catch-up offline de O Despertar (GDD 5.5).
 * Teto 8 h (12 h com talento), eficiência 80% (100% com talento).
 * Usa o SPS do estado salvo — não um SPS otimista.
 */

import { OFFLINE_MAX_HOURS_BASE } from '../config/constants.js';
import { GameState } from '../core/GameState.js';
import { money } from '../core/decimal.js';
import { calculateOfflineProgress, talentEffects } from '../core/formulas.js';

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
  });
  return {
    ...progress,
    elapsedSeconds,
    maxHours: talentEffects(probe.talents).offlineHours,
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
  const maxHours = talentEffects(gameState.talents).offlineHours;
  return {
    ...applied,
    elapsedSeconds: Number(elapsedSeconds) || 0,
    maxHours,
    harvest: formatHarvest({ ...applied, maxHours }),
  };
}

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
