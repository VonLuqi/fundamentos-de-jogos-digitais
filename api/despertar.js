/**
 * ============================================================
 * /api/despertar — estado autoritativo de O Despertar (Task 9)
 * ============================================================
 * Identidade vem APENAS da sessão. `userId` no body é ignorado.
 * Gate: lesson_gates (despertar / published). Aluno bloqueado se selado;
 * admin sempre passa.
 * ============================================================
 */

import supabase from './supabaseClient.js';
import {
  DESPERTAR_SEALED_ERROR,
  DESPERTAR_SEALED_MESSAGE,
  getLastDespertarGateCacheStatus,
  isDespertarPublished,
  isDespertarSealedForUser,
} from './_lib/despertar-gate.js';
import {
  applyPrestige,
  applyTalentBuy,
  applyVerdictBuy,
  buildStateDto,
  parseClientEpoch,
  rowToCanonical,
  validateSync,
} from './_lib/despertar-validate.js';
import {
  sanitizeEduLogsSeen,
} from './_lib/despertar-achievements.js';
import {
  awardedFromPlan,
  callDespertarPersistAndAward,
  isDespertarPersistRpcMissing,
  isDespertarSyncRpcEnabled,
  planDespertarAwards,
} from './_lib/despertar-persist-rpc.js';
import { invalidateLeaderboardCache } from './_lib/leaderboard-cache.js';
import {
  DEBUG_SANDBOX_PATCH,
  DEBUG_ZERO_PATCH,
  buildDebugGrantPatch,
  buildDebugSetPatch,
  cloneDebugPatch,
  stripDespertarAchievements,
} from './_lib/despertar-debug.js';
import {
  juizoAbandon as applyJuizoAbandon,
  juizoGuess as applyJuizoGuess,
  juizoPatchFromState,
  juizoStart as applyJuizoStart,
} from './_lib/despertar-juizo.js';
import { loadValidSession } from './_lib/sessions.js';
import { rejectUnlessMessengerSeal } from './_lib/messenger-seal.js';
import {
  applyRetryAfterHeader,
  consumeGameRateLimit,
  GAME_RATE_LIMITS,
} from './_lib/rate-limit-kv.js';
import {
  createRequestMetrics,
  finishRequestMetrics,
  metricsBumpDb,
  metricsSetAction,
  metricsSetGateCache,
  metricsSetRateLimitBackend,
  metricsSetStatus,
  runWithMetrics,
} from './_lib/request-metrics.js';
import { SYNC_MAX_PER_MINUTE, JUDGES_REFUSED_MESSAGE } from '../js/hades-despertar/config/constants.js';
import {
  getAchievementXp,
} from '../js/game-catalog.js';

const TABLE = 'despertar_states';
const USERS_TABLE = 'users';
const ROW_SELECT = [
  'user_id',
  'souls',
  'obols',
  'mnemosyne',
  'lifetime_souls',
  'run_souls',
  'prestige_count',
  'generators_state',
  'shiny_counts',
  'gold_counts',
  'upgrades_state',
  'talents_state',
  'edu_logs_seen',
  'milestones',
  'verdicts',
  'juizo_best_streak',
  'juizo_current_streak',
  'juizo_milestones_claimed',
  'verdict_purchases',
  'juizo_run',
  'last_sync_at',
  'created_at',
  'updated_at',
].join(', ');

const TABLE_MISSING = 'Tabela despertar_states ausente. Aplique db/migrate-2026-09-11-hades-despertar.sql.';
const JUDGES_REFUSED = JUDGES_REFUSED_MESSAGE;

if (GAME_RATE_LIMITS.despertar_sync.limit !== SYNC_MAX_PER_MINUTE) {
  console.warn(
    '[api/despertar] GAME_RATE_LIMITS.despertar_sync diverge de SYNC_MAX_PER_MINUTE',
    GAME_RATE_LIMITS.despertar_sync.limit,
    SYNC_MAX_PER_MINUTE,
  );
}

/** Rate limit cross-isolate via KV (fallback memória — Fase A / A2). */
async function isSyncRateLimited(userId) {
  const result = await consumeGameRateLimit('despertar_sync', userId);
  return result;
}

async function isJuizoGuessRateLimited(userId) {
  const result = await consumeGameRateLimit('despertar_juizo', userId);
  return result;
}

function isMissingTable(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return code === '42P01'
    || code === 'PGRST205'
    || /despertar_states/i.test(message) && /does not exist|schema cache/i.test(message);
}

async function loadSessionUser(token) {
  const session = await loadValidSession(supabase, token);
  if (!session?.user_id) return null;

  const { data: user } = await supabase
    .from(USERS_TABLE)
    .select('id, role, email_verified_at, xp, conquistas')
    .eq('id', session.user_id)
    .limit(1)
    .maybeSingle();
  metricsBumpDb(1);

  if (!user?.id) return null;
  return {
    id: user.id,
    role: user.role || 'student',
    email_verified_at: user.email_verified_at ?? null,
    xp: Number(user.xp || 0),
    conquistas: Array.isArray(user.conquistas) ? user.conquistas : [],
  };
}

async function getOrCreateState(userId) {
  const { data: existing, error: readError } = await supabase
    .from(TABLE)
    .select(ROW_SELECT)
    .eq('user_id', userId)
    .maybeSingle();
  metricsBumpDb(1);

  if (readError) return { error: readError };
  if (existing) return { row: existing };

  const { data: created, error: insertError } = await supabase
    .from(TABLE)
    .insert({ user_id: userId })
    .select(ROW_SELECT)
    .single();
  metricsBumpDb(1);

  if (insertError?.code === '23505') {
    const { data: raced, error: raceError } = await supabase
      .from(TABLE)
      .select(ROW_SELECT)
      .eq('user_id', userId)
      .single();
    metricsBumpDb(1);
    if (raceError) return { error: raceError };
    return { row: raced };
  }

  if (insertError) return { error: insertError };
  return { row: created };
}

async function persistPatch(userId, patch) {
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('user_id', userId)
    .select(ROW_SELECT)
    .single();
  metricsBumpDb(1);
  return { row: data, error };
}

function emptyAwarded() {
  return { xp: 0, achievements: [], achievementDetails: [] };
}

/**
 * Grant legado (flag off / fallback). Exige snapshot com `conquistas` quando possível
 * para evitar SELECT extra (B4). Path RPC (`persistPatchAndAward`) não chama isto.
 */
async function grantDespertarAchievements(userId, canonicalState, userSnapshot = null) {
  let user = userSnapshot;
  if (!user || !Array.isArray(user.conquistas)) {
    const { data, error } = await supabase
      .from(USERS_TABLE)
      .select('id, xp, conquistas')
      .eq('id', userId)
      .single();
    metricsBumpDb(1);
    if (error || !data) {
      console.error('[api/despertar] grant load user:', error);
      return emptyAwarded();
    }
    user = data;
  }

  const plan = planDespertarAwards(user, canonicalState);
  if (!plan.fresh.length) return emptyAwarded();

  // Um UPDATE atômico xp+conquistas (D8) — sem re-SELECT.
  const { error: saveError } = await supabase
    .from(USERS_TABLE)
    .update({
      xp: plan.nextXp,
      conquistas: [...(Array.isArray(user.conquistas) ? user.conquistas : []), ...plan.fresh],
    })
    .eq('id', userId);
  metricsBumpDb(1);
  if (saveError) {
    console.error('[api/despertar] grant save:', saveError);
    return emptyAwarded();
  }

  await invalidateLeaderboardCache().catch(() => {});

  return awardedFromPlan(plan);
}

/**
 * Persiste patch + awards. Com DESPERTAR_SYNC_RPC=1 usa 1 RPC; senão path legado.
 * @returns {Promise<{ row: object|null, awarded: object, error: object|null, via: 'rpc'|'legacy' }>}
 */
async function persistPatchAndAward(user, patch, canonicalState, { award = true } = {}) {
  const plan = award
    ? planDespertarAwards(user, canonicalState)
    : { fresh: [], xpGain: 0, nextXp: Number(user?.xp || 0), prevXp: Number(user?.xp || 0) };

  if (isDespertarSyncRpcEnabled()) {
    const rpc = await callDespertarPersistAndAward(
      supabase,
      user.id,
      patch,
      plan.fresh,
      plan.xpGain,
    );
    if (rpc.ok) {
      if (award && plan.fresh.length) {
        await invalidateLeaderboardCache().catch(() => {});
      }
      return {
        row: rpc.state,
        awarded: award ? awardedFromPlan(plan) : emptyAwarded(),
        error: null,
        via: 'rpc',
      };
    }
    console.warn(
      '[api/despertar] sync_rpc_fallback=1',
      rpc.error?.message || rpc.error?.code || rpc.error,
    );
    if (!isDespertarPersistRpcMissing(rpc.error)) {
      // Erro de dados/constraint: não mascara com legado silencioso se for falha real de patch.
      // Ainda assim o contrato pede fallback — legacy tenta o mesmo patch.
    }
  }

  const { row, error } = await persistPatch(user.id, patch);
  if (error) {
    return { row: null, awarded: emptyAwarded(), error, via: 'legacy' };
  }

  const awarded = award
    ? await grantDespertarAchievements(user.id, canonicalState, user)
    : emptyAwarded();

  return { row, awarded, error: null, via: 'legacy' };
}

function applySanitizedEduLogs(result) {
  if (!result?.ok || !result.next) return result;
  const sanitized = sanitizeEduLogsSeen(result.next.eduLogsSeen, result.next, { syncOk: true });
  result.next = { ...result.next, eduLogsSeen: sanitized };
  if (result.patch) {
    result.patch = { ...result.patch, edu_logs_seen: sanitized };
  }
  const echoOpts = result.echoEpoch != null ? { echoEpoch: result.echoEpoch } : {};
  result.state = buildStateDto(result.next, echoOpts);
  return result;
}

function tableErrorResponse(res, error, fallback) {
  if (isMissingTable(error)) {
    return res.status(503).json({ ok: false, error: TABLE_MISSING });
  }
  console.error('[api/despertar]', fallback, error);
  return res.status(500).json({ ok: false, error: fallback });
}

export default async function handler(req, res) {
  const metrics = createRequestMetrics({
    route: 'despertar',
    action: String(req.body?.action || 'n/a'),
  });

  const origStatus = res.status.bind(res);
  res.status = (code) => {
    metricsSetStatus(code);
    return origStatus(code);
  };

  try {
    return await runWithMetrics(metrics, () => handleDespertar(req, res));
  } finally {
    finishRequestMetrics(metrics, { status: metrics.status });
  }
}

async function handleDespertar(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ ok: false, error: 'Método não permitido.' });
    }

    if (!supabase) {
      return res.status(503).json({ ok: false, error: 'O Despertar está offline: Supabase não configurado.' });
    }

    const { action, token, clientState, talentId, purchaseId, choice, grantId, set } = req.body || {};
    metricsSetAction(action || 'n/a');
    const user = await loadSessionUser(token);
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Sessão inválida.' });
    }

    if (rejectUnlessMessengerSeal(user, res)) return;

    // Admin pode limpar Estelas mesmo com o Acheron selado (correção pós-vazamento).
    if (action === 'stateResetStudents') {
      if (user.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Esta senda é só do Mestre.' });
      }

      const { data: students, error: studentsError } = await supabase
        .from(USERS_TABLE)
        .select('id')
        .neq('role', 'admin');

      if (studentsError) {
        console.error('[api/despertar] stateResetStudents users:', studentsError);
        return res.status(500).json({ ok: false, error: 'Não foi possível listar as almas.' });
      }

      const studentIds = (students || []).map((row) => row.id).filter(Boolean);
      if (studentIds.length === 0) {
        return res.status(200).json({ ok: true, deleted: 0, scanned: 0 });
      }

      const { data: existing, error: existingError } = await supabase
        .from(TABLE)
        .select('user_id')
        .in('user_id', studentIds);

      if (existingError) {
        if (isMissingTable(existingError)) {
          return res.status(503).json({ ok: false, error: TABLE_MISSING });
        }
        console.error('[api/despertar] stateResetStudents list:', existingError);
        return res.status(500).json({ ok: false, error: 'Não foi possível ler as Estelas.' });
      }

      const toDelete = (existing || []).map((row) => row.user_id);
      if (toDelete.length === 0) {
        return res.status(200).json({ ok: true, deleted: 0, scanned: studentIds.length });
      }

      const { error: deleteError } = await supabase
        .from(TABLE)
        .delete()
        .in('user_id', toDelete);

      if (deleteError) {
        console.error('[api/despertar] stateResetStudents delete:', deleteError);
        return res.status(500).json({ ok: false, error: 'Não foi possível apagar as Estelas.' });
      }

      return res.status(200).json({
        ok: true,
        deleted: toDelete.length,
        scanned: studentIds.length,
      });
    }

    // Admin: reseta a própria Estela + conquistas do Despertar e planta sandbox.
    if (action === 'debugSandbox' || action === 'debugReset' || action === 'debugGrant') {
      if (user.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Esta senda é só do Mestre.' });
      }

      const nowIso = new Date().toISOString();

      if (action === 'debugGrant') {
        const { row, error } = await getOrCreateState(user.id);
        if (error) return tableErrorResponse(res, error, 'Não foi possível ler a Estela de Memória.');

        // B2: set absoluto (DEBUG_SET_PATCH) ou preset aditivo (grantId)
        const grant = set && typeof set === 'object' && !Array.isArray(set)
          ? buildDebugSetPatch(row, set)
          : buildDebugGrantPatch(row, grantId);
        if (!grant.ok) {
          return res.status(400).json({ ok: false, error: grant.error || 'Concessão inválida.' });
        }

        const patch = {
          ...grant.patch,
          last_sync_at: nowIso,
          updated_at: nowIso,
        };
        const { row: saved, error: saveError } = await persistPatch(user.id, patch);
        if (saveError) {
          if (isMissingTable(saveError)) {
            return res.status(503).json({ ok: false, error: TABLE_MISSING });
          }
          console.error('[api/despertar] debugGrant save:', saveError);
          return res.status(500).json({ ok: false, error: 'Não foi possível conceder recursos.' });
        }

        return res.status(200).json({
          ok: true,
          state: buildStateDto(saved || { ...row, ...patch }),
          grantId: grant.grantId || null,
          label: grant.label,
          awarded: emptyAwarded(),
          grant: true,
          set: Boolean(set && typeof set === 'object'),
        });
      }

      const { data: fullUser, error: userError } = await supabase
        .from(USERS_TABLE)
        .select('id, xp, conquistas')
        .eq('id', user.id)
        .single();
      if (userError || !fullUser) {
        console.error('[api/despertar] debug user:', userError);
        return res.status(500).json({ ok: false, error: 'Não foi possível ler o perfil do Mestre.' });
      }

      const stripped = stripDespertarAchievements(fullUser, getAchievementXp);
      const { error: stripError } = await supabase
        .from(USERS_TABLE)
        .update({ xp: stripped.xp, conquistas: stripped.conquistas })
        .eq('id', user.id);
      if (stripError) {
        console.error('[api/despertar] debug strip:', stripError);
        return res.status(500).json({ ok: false, error: 'Não foi possível limpar as conquistas do Despertar.' });
      }

      const { row, error } = await getOrCreateState(user.id);
      if (error) return tableErrorResponse(res, error, 'Não foi possível ler a Estela de Memória.');

      const basePatch = action === 'debugReset' ? DEBUG_ZERO_PATCH : DEBUG_SANDBOX_PATCH;
      const patch = {
        ...cloneDebugPatch(basePatch),
        last_sync_at: nowIso,
        updated_at: nowIso,
      };

      const { row: saved, error: saveError } = await persistPatch(user.id, patch);
      if (saveError) {
        if (isMissingTable(saveError)) {
          return res.status(503).json({ ok: false, error: TABLE_MISSING });
        }
        console.error('[api/despertar] debug save:', saveError);
        return res.status(500).json({
          ok: false,
          error: action === 'debugReset'
            ? 'Não foi possível zerar a Estela.'
            : 'Não foi possível gravar o sandbox.',
        });
      }

      return res.status(200).json({
        ok: true,
        state: buildStateDto(saved || { ...row, ...patch }),
        strippedAchievements: stripped.removed,
        xpLoss: stripped.xpLoss,
        xp: stripped.xp,
        awarded: emptyAwarded(),
        sandbox: action === 'debugSandbox',
        reset: action === 'debugReset',
      });
    }

    const published = await isDespertarPublished(supabase);
    metricsSetGateCache(getLastDespertarGateCacheStatus());
    if (isDespertarSealedForUser(user, published)) {
      return res.status(403).json({
        ok: false,
        error: DESPERTAR_SEALED_ERROR,
        message: DESPERTAR_SEALED_MESSAGE,
      });
    }

    if (action === 'stateGet') {
      const { row, error } = await getOrCreateState(user.id);
      if (error) return tableErrorResponse(res, error, 'Não foi possível ler a Estela de Memória.');
      return res.status(200).json({ ok: true, state: buildStateDto(row), awarded: emptyAwarded() });
    }

    if (action === 'stateSync') {
      const syncLimit = await isSyncRateLimited(user.id);
      metricsSetRateLimitBackend(syncLimit.backend);
      if (syncLimit.limited) {
        applyRetryAfterHeader(res, syncLimit);
        return res.status(429).json({ ok: false, error: 'O Submundo pede calma — aguarde um instante.' });
      }

      const { row, error } = await getOrCreateState(user.id);
      if (error) return tableErrorResponse(res, error, 'Não foi possível ler a Estela de Memória.');

      let result = validateSync(row, clientState, new Date());
      if (!result.ok) {
        return res.status(result.status || 400).json({
          ok: false,
          error: result.error || JUDGES_REFUSED,
          state: result.state,
          ...(result.echoEpoch != null ? { echoEpoch: result.echoEpoch } : {}),
          awarded: emptyAwarded(),
        });
      }

      result = applySanitizedEduLogs(result);
      const canonical = result.next;
      const {
        row: saved,
        awarded,
        error: saveError,
      } = await persistPatchAndAward(user, result.patch, canonical, { award: true });
      if (saveError) return tableErrorResponse(res, saveError, 'Não foi possível gravar a Estela.');

      const echoEpoch = result.echoEpoch ?? parseClientEpoch(clientState);
      const echoOpts = echoEpoch != null ? { echoEpoch } : {};
      return res.status(200).json({
        ok: true,
        state: buildStateDto(saved || result.next, echoOpts),
        ...(echoEpoch != null ? { echoEpoch } : {}),
        awarded,
      });
    }

    if (action === 'prestige') {
      const { row, error } = await getOrCreateState(user.id);
      if (error) return tableErrorResponse(res, error, 'Não foi possível ler a Estela de Memória.');

      const result = applyPrestige(row, new Date());
      if (!result.ok) {
        return res.status(result.status || 400).json({
          ok: false,
          error: result.error,
          state: result.state,
          awarded: emptyAwarded(),
        });
      }

      const {
        row: saved,
        awarded,
        error: saveError,
      } = await persistPatchAndAward(user, result.patch, result.next, { award: true });
      if (saveError) return tableErrorResponse(res, saveError, 'Não foi possível gravar o Ritual.');

      return res.status(200).json({
        ok: true,
        state: buildStateDto(saved || result.next),
        awarded,
      });
    }

    if (action === 'talentBuy') {
      const { row, error } = await getOrCreateState(user.id);
      if (error) return tableErrorResponse(res, error, 'Não foi possível ler a Estela de Memória.');

      const result = applyTalentBuy(row, talentId, new Date());
      if (!result.ok) {
        return res.status(result.status || 400).json({
          ok: false,
          error: result.error,
          state: result.state,
          awarded: emptyAwarded(),
        });
      }

      const {
        row: saved,
        awarded,
        error: saveError,
      } = await persistPatchAndAward(user, result.patch, result.next, { award: true });
      if (saveError) return tableErrorResponse(res, saveError, 'Não foi possível selar o talento.');

      return res.status(200).json({
        ok: true,
        state: buildStateDto(saved || result.next),
        awarded,
      });
    }

    if (action === 'verdictBuy') {
      const { row, error } = await getOrCreateState(user.id);
      if (error) return tableErrorResponse(res, error, 'Não foi possível ler a Estela de Memória.');

      const result = applyVerdictBuy(row, purchaseId, new Date());
      if (!result.ok) {
        return res.status(result.status || 400).json({
          ok: false,
          error: result.error,
          state: result.state,
          awarded: emptyAwarded(),
        });
      }

      const {
        row: saved,
        awarded,
        error: saveError,
      } = await persistPatchAndAward(user, result.patch, result.next, { award: true });
      if (saveError) return tableErrorResponse(res, saveError, 'Não foi possível selar a Bancada.');

      return res.status(200).json({
        ok: true,
        state: buildStateDto(saved || result.next),
        awarded,
      });
    }

    if (action === 'juizoStart' || action === 'juizoGuess' || action === 'juizoAbandon') {
      const { row, error } = await getOrCreateState(user.id);
      if (error) return tableErrorResponse(res, error, 'Não foi possível ler a Estela de Memória.');

      const canonical = rowToCanonical(row);
      let result;
      if (action === 'juizoStart') {
        result = applyJuizoStart(canonical);
      } else if (action === 'juizoAbandon') {
        result = applyJuizoAbandon(canonical);
      } else {
        const juizoLimit = await isJuizoGuessRateLimited(user.id);
        metricsSetRateLimitBackend(juizoLimit.backend);
        if (juizoLimit.limited) {
          applyRetryAfterHeader(res, juizoLimit);
          return res.status(429).json({ ok: false, error: 'O Juízo pede calma — aguarde um instante.' });
        }
        result = applyJuizoGuess(canonical, choice);
      }

      if (!result.ok) {
        return res.status(result.status || 400).json({
          ok: false,
          error: result.error || 'O Juízo se fecha.',
          state: buildStateDto(canonical),
        });
      }

      const nowIso = new Date().toISOString();
      const patch = {
        ...juizoPatchFromState(result.next),
        updated_at: nowIso,
      };
      const grantAwards = action === 'juizoGuess';
      const {
        row: saved,
        awarded,
        error: saveError,
      } = await persistPatchAndAward(user, patch, result.next, { award: grantAwards });
      if (saveError) return tableErrorResponse(res, saveError, 'Não foi possível gravar o Juízo.');

      const stateDto = buildStateDto(saved || result.next);
      const payload = {
        ok: true,
        state: stateDto,
        hud: result.hud,
        ended: Boolean(result.ended),
        abandoned: Boolean(result.abandoned),
        pair: result.pair || null,
        milestones: result.milestones || { newly: [], verdictGain: 0 },
        awarded: grantAwards ? awarded : emptyAwarded(),
      };
      if (result.ended && !result.abandoned) {
        payload.ratingA = result.ratingA;
        payload.ratingB = result.ratingB;
        payload.deltaLabel = result.deltaLabel;
        payload.brokenStreak = result.brokenStreak;
      } else if (!result.ended && result.ratingA != null) {
        // F3 juice: revelar faixas da rodada vencida antes do próximo par.
        payload.ratingA = result.ratingA;
        payload.ratingB = result.ratingB;
      }
      return res.status(200).json(payload);
    }

    return res.status(400).json({ ok: false, error: 'Ação desconhecida.' });
  } catch (error) {
    console.error('[api/despertar]', error);
    return res.status(500).json({ ok: false, error: 'Erro interno do Submundo.' });
  }
}

export { isSyncRateLimited, isJuizoGuessRateLimited };
