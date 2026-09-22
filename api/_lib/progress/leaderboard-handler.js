import {
  DESPERTAR_STATES_TABLE,
  USERS_TABLE,
  VALID_TURMAS,
  metricsBumpDb,
} from './shared.js';
import {
  assembleLeaderboard,
  fetchLeaderboardPageRpc,
  isLeaderboardRpcMissing,
  LEADERBOARD_TOP,
  normalizeLeaderboardLimit,
  normalizeLeaderboardScope,
  normalizeLeaderboardSort,
} from '../leaderboard.js';
import {
  isLeaderboardKvCacheEnabled,
  readLeaderboardCache,
  selfFromCachedEntries,
  writeLeaderboardCache,
} from '../leaderboard-cache.js';

export async function handleLeaderboardGet(ctx) {
  const {
    res,
    user,
    userId,
    supabase,
    turmaFilterBody,
    scopeBody,
    sortBody,
    limitBody,
  } = ctx;

  try {
    const scope = normalizeLeaderboardScope(scopeBody);
    const sort = normalizeLeaderboardSort(sortBody);
    const topN = normalizeLeaderboardLimit(limitBody, LEADERBOARD_TOP);
    const isAdmin = user.role === 'admin';

    let filterTurma = null;
    let turmasDisponiveis = [];

    if (scope === 'turma') {
      if (isAdmin) {
        // Sem full-scan: turmas conhecidas do Domínio (VALID_TURMAS).
        turmasDisponiveis = [...VALID_TURMAS].sort();
        const requested = String(turmaFilterBody || '').trim();
        if (requested && VALID_TURMAS.has(requested)) {
          filterTurma = requested;
        } else if (turmasDisponiveis.length) {
          filterTurma = turmasDisponiveis[0];
        }
      } else {
        filterTurma = String(user.turma || '').trim() || null;
        if (!filterTurma) {
          return res.status(200).json({
            ok: true,
            scope,
            sort,
            turma: null,
            turmasDisponiveis: [],
            entries: [],
            self: null,
            total: 0,
            topN,
          });
        }
      }
    }

    const cacheOpts = {
      scope,
      turma: filterTurma,
      sort,
      limit: topN,
    };

    // C4: snapshot KV compartilhado (flag LEADERBOARD_KV_CACHE=1).
    if (isLeaderboardKvCacheEnabled()) {
      const cached = await readLeaderboardCache(cacheOpts);
      if (cached.hit) {
        const self = selfFromCachedEntries(cached.entries, userId);
        // Viewer fora do top-N: miss semântico → RPC para self com rank correto.
        if (self || !userId) {
          return res.status(200).json({
            ok: true,
            scope,
            sort,
            turma: scope === 'turma' ? filterTurma : null,
            turmasDisponiveis: isAdmin && scope === 'turma' ? turmasDisponiveis : [],
            adminView: isAdmin,
            topN,
            entries: cached.entries,
            self,
            total: cached.total,
            via: cached.backend === 'kv' ? 'rpc+kv' : 'rpc+memory',
            cache: 'hit',
          });
        }
      }
    }

    // B5: preferir RPC SQL (1 RTT). Fallback legado se função ausente.
    const rpc = await fetchLeaderboardPageRpc(supabase, {
      scope,
      turma: filterTurma,
      sort,
      limit: topN,
      viewerUserId: userId,
    });

    if (rpc.ok) {
      if (isLeaderboardKvCacheEnabled()) {
        await writeLeaderboardCache({
          ...cacheOpts,
          entries: rpc.entries,
          total: rpc.total,
        });
      }
      return res.status(200).json({
        ok: true,
        scope,
        sort,
        turma: scope === 'turma' ? filterTurma : null,
        turmasDisponiveis: isAdmin && scope === 'turma' ? turmasDisponiveis : [],
        adminView: isAdmin,
        topN,
        entries: rpc.entries,
        self: rpc.self,
        total: rpc.total,
        via: 'rpc',
        cache: isLeaderboardKvCacheEnabled() ? 'miss' : 'off',
      });
    }

    if (!isLeaderboardRpcMissing(rpc.error)) {
      console.error('[api/progress] leaderboardGet rpc', rpc.error);
      return res.status(500).json({ ok: false, error: 'Falha ao montar o Placar.' });
    }

    console.warn('[api/progress] leaderboard_rpc_fallback=1', rpc.error?.message || rpc.error);

    let query = supabase
      .from(USERS_TABLE)
      .select('id, full_name, username, turma, role, xp, conquistas')
      .neq('role', 'admin');

    if (scope === 'turma' && filterTurma) {
      query = query.eq('turma', filterTurma);
    }

    const { data: users, error: usersError } = await query;
    metricsBumpDb(1);
    if (usersError) {
      console.error('[api/progress] leaderboardGet users', usersError);
      return res.status(500).json({ ok: false, error: 'Falha ao montar o Placar.' });
    }

    const rows = users || [];
    const ids = rows.map((row) => row.id).filter((id) => id != null);
    const juizoByUser = new Map();

    if (ids.length) {
      const { data: states, error: statesError } = await supabase
        .from(DESPERTAR_STATES_TABLE)
        .select('user_id, juizo_best_streak')
        .in('user_id', ids);
      metricsBumpDb(1);

      if (statesError) {
        const missing = /does not exist|schema cache|despertar_states/i.test(
          String(statesError.message || ''),
        );
        if (!missing) {
          console.error('[api/progress] leaderboardGet juizo', statesError);
          return res.status(500).json({ ok: false, error: 'Falha ao montar o Placar.' });
        }
      } else {
        for (const state of states || []) {
          juizoByUser.set(
            Number(state.user_id),
            Math.max(0, Number.parseInt(state.juizo_best_streak, 10) || 0),
          );
        }
      }
    }

    const payload = assembleLeaderboard(rows, juizoByUser, {
      sort,
      viewerUserId: userId,
      topN,
    });

    if (isLeaderboardKvCacheEnabled()) {
      await writeLeaderboardCache({
        ...cacheOpts,
        entries: payload.entries,
        total: payload.total,
      });
    }

    return res.status(200).json({
      ok: true,
      scope,
      sort,
      turma: scope === 'turma' ? filterTurma : null,
      turmasDisponiveis: isAdmin && scope === 'turma' ? turmasDisponiveis : [],
      adminView: isAdmin,
      topN,
      via: 'legacy',
      cache: isLeaderboardKvCacheEnabled() ? 'miss' : 'off',
      ...payload,
    });
  } catch (error) {
    console.error('[api/progress] leaderboardGet', error);
    return res.status(500).json({ ok: false, error: 'Falha ao montar o Placar.' });
  }
}
