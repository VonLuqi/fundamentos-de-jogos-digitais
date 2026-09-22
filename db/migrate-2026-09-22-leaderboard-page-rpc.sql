-- Migração 2026-09-22
-- Objetivo: leaderboard paginado em SQL (Fase B / Task B5)
-- docs/otimizacoes/02-tasks-fase-b-rtt-batching.md · contratos-fase-b.md §4
--
-- Uma query com LEFT JOIN despertar_states + ORDER BY + LIMIT.
-- Retorna top-N, self (com rank) e total sem transferir a turma inteira ao Node.

CREATE OR REPLACE FUNCTION public.leaderboard_page(
  p_scope text DEFAULT 'turma',
  p_turma text DEFAULT NULL,
  p_sort text DEFAULT 'xp',
  p_limit integer DEFAULT 50,
  p_viewer_id integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scope text := lower(coalesce(nullif(btrim(p_scope), ''), 'turma'));
  v_sort text := coalesce(nullif(btrim(p_sort), ''), 'xp');
  v_limit integer := GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
  v_turma text := nullif(btrim(p_turma), '');
  v_entries jsonb;
  v_self jsonb;
  v_total integer := 0;
BEGIN
  IF v_scope NOT IN ('turma', 'global') THEN
    v_scope := 'turma';
  END IF;
  IF v_sort NOT IN ('xp', 'achievements', 'juizoBest') THEN
    v_sort := 'xp';
  END IF;

  IF v_scope = 'turma' AND v_turma IS NULL THEN
    RETURN jsonb_build_object(
      'entries', '[]'::jsonb,
      'self', NULL,
      'total', 0
    );
  END IF;

  WITH base AS (
    SELECT
      u.id AS user_id,
      u.username,
      u.full_name,
      u.turma,
      COALESCE(u.xp, 0)::integer AS xp,
      COALESCE(cardinality(u.conquistas), 0)::integer AS achievements,
      COALESCE(d.juizo_best_streak, 0)::integer AS juizo_best
    FROM public.users AS u
    LEFT JOIN public.despertar_states AS d ON d.user_id = u.id
    WHERE COALESCE(u.role, 'student') <> 'admin'
      AND (
        v_scope = 'global'
        OR u.turma = v_turma
      )
  ),
  ranked AS (
    SELECT
      b.*,
      COUNT(*) OVER ()::integer AS total_count,
      ROW_NUMBER() OVER (
        ORDER BY
          CASE v_sort
            WHEN 'achievements' THEN b.achievements
            WHEN 'juizoBest' THEN b.juizo_best
            ELSE b.xp
          END DESC,
          b.username ASC NULLS LAST,
          b.user_id ASC
      )::integer AS rank
    FROM base AS b
  )
  SELECT
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'rank', r.rank,
            'userId', r.user_id,
            'username', r.username,
            'fullName', r.full_name,
            'turma', r.turma,
            'xp', r.xp,
            'achievements', r.achievements,
            'juizoBest', r.juizo_best
          )
          ORDER BY r.rank
        )
        FROM ranked AS r
        WHERE r.rank <= v_limit
      ),
      '[]'::jsonb
    ),
    (
      SELECT jsonb_build_object(
        'rank', r.rank,
        'userId', r.user_id,
        'username', r.username,
        'fullName', r.full_name,
        'turma', r.turma,
        'xp', r.xp,
        'achievements', r.achievements,
        'juizoBest', r.juizo_best
      )
      FROM ranked AS r
      WHERE p_viewer_id IS NOT NULL AND r.user_id = p_viewer_id
      LIMIT 1
    ),
    COALESCE((SELECT r.total_count FROM ranked AS r LIMIT 1), 0)
  INTO v_entries, v_self, v_total;

  RETURN jsonb_build_object(
    'entries', v_entries,
    'self', v_self,
    'total', v_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.leaderboard_page(text, text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leaderboard_page(text, text, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.leaderboard_page(text, text, text, integer, integer) TO postgres;

COMMENT ON FUNCTION public.leaderboard_page(text, text, text, integer, integer) IS
  'Fase B / B5: placar paginado (xp|achievements|juizoBest) com self+total.';
