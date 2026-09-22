-- Migração 2026-09-22
-- Objetivo: shiny_counts (G4.3) — mapa jsonb { generatorId → count }
-- docs/plano-despertar-aureolas-letreiro-shiny-hud-juizo.md Task G4.3
--
-- Tolerante: DEFAULT '{}'; saves antigos continuam válidos.
-- Também atualiza despertar_persist_and_award para aceitar o campo no patch.

ALTER TABLE despertar_states
  ADD COLUMN IF NOT EXISTS shiny_counts jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.despertar_persist_and_award(
  p_user_id integer,
  p_patch jsonb,
  p_achievement_ids text[] DEFAULT '{}'::text[],
  p_xp_delta integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patch jsonb := COALESCE(p_patch, '{}'::jsonb);
  v_state public.despertar_states%ROWTYPE;
  v_user_id integer;
  v_xp integer;
  v_conquistas text[];
  v_existing text[];
  v_fresh text[] := '{}'::text[];
  v_id text;
  v_xp_delta integer := GREATEST(COALESCE(p_xp_delta, 0), 0);
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id obrigatório' USING ERRCODE = '22023';
  END IF;

  UPDATE public.despertar_states AS ds
  SET
    souls = CASE
      WHEN v_patch ? 'souls' THEN (v_patch->>'souls')::numeric
      ELSE ds.souls
    END,
    obols = CASE
      WHEN v_patch ? 'obols' THEN (v_patch->>'obols')::numeric
      ELSE ds.obols
    END,
    mnemosyne = CASE
      WHEN v_patch ? 'mnemosyne' THEN (v_patch->>'mnemosyne')::numeric
      ELSE ds.mnemosyne
    END,
    lifetime_souls = CASE
      WHEN v_patch ? 'lifetime_souls' THEN (v_patch->>'lifetime_souls')::numeric
      ELSE ds.lifetime_souls
    END,
    run_souls = CASE
      WHEN v_patch ? 'run_souls' THEN (v_patch->>'run_souls')::numeric
      ELSE ds.run_souls
    END,
    prestige_count = CASE
      WHEN v_patch ? 'prestige_count' THEN (v_patch->>'prestige_count')::integer
      ELSE ds.prestige_count
    END,
    generators_state = CASE
      WHEN v_patch ? 'generators_state' THEN COALESCE(v_patch->'generators_state', '{}'::jsonb)
      ELSE ds.generators_state
    END,
    shiny_counts = CASE
      WHEN v_patch ? 'shiny_counts' THEN COALESCE(v_patch->'shiny_counts', '{}'::jsonb)
      ELSE ds.shiny_counts
    END,
    upgrades_state = CASE
      WHEN v_patch ? 'upgrades_state' THEN COALESCE(v_patch->'upgrades_state', '[]'::jsonb)
      ELSE ds.upgrades_state
    END,
    talents_state = CASE
      WHEN v_patch ? 'talents_state' THEN COALESCE(v_patch->'talents_state', '[]'::jsonb)
      ELSE ds.talents_state
    END,
    edu_logs_seen = CASE
      WHEN v_patch ? 'edu_logs_seen' THEN COALESCE(v_patch->'edu_logs_seen', '[]'::jsonb)
      ELSE ds.edu_logs_seen
    END,
    milestones = CASE
      WHEN v_patch ? 'milestones' THEN COALESCE(v_patch->'milestones', '{}'::jsonb)
      ELSE ds.milestones
    END,
    verdicts = CASE
      WHEN v_patch ? 'verdicts' THEN (v_patch->>'verdicts')::integer
      ELSE ds.verdicts
    END,
    juizo_best_streak = CASE
      WHEN v_patch ? 'juizo_best_streak' THEN (v_patch->>'juizo_best_streak')::integer
      ELSE ds.juizo_best_streak
    END,
    juizo_current_streak = CASE
      WHEN v_patch ? 'juizo_current_streak' THEN (v_patch->>'juizo_current_streak')::integer
      ELSE ds.juizo_current_streak
    END,
    juizo_milestones_claimed = CASE
      WHEN v_patch ? 'juizo_milestones_claimed' THEN COALESCE(v_patch->'juizo_milestones_claimed', '[]'::jsonb)
      ELSE ds.juizo_milestones_claimed
    END,
    verdict_purchases = CASE
      WHEN v_patch ? 'verdict_purchases' THEN COALESCE(v_patch->'verdict_purchases', '[]'::jsonb)
      ELSE ds.verdict_purchases
    END,
    juizo_run = CASE
      WHEN NOT (v_patch ? 'juizo_run') THEN ds.juizo_run
      WHEN v_patch->'juizo_run' IS NULL OR v_patch->'juizo_run' = 'null'::jsonb THEN NULL
      ELSE v_patch->'juizo_run'
    END,
    last_sync_at = CASE
      WHEN v_patch ? 'last_sync_at' THEN (v_patch->>'last_sync_at')::timestamptz
      ELSE ds.last_sync_at
    END,
    updated_at = CASE
      WHEN v_patch ? 'updated_at' THEN (v_patch->>'updated_at')::timestamptz
      ELSE now()
    END
  WHERE ds.user_id = p_user_id
  RETURNING * INTO v_state;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'despertar_state_missing for user_id=%', p_user_id
      USING ERRCODE = 'P0002';
  END IF;

  SELECT u.id, u.xp, COALESCE(u.conquistas, '{}'::text[])
  INTO v_user_id, v_xp, v_existing
  FROM public.users AS u
  WHERE u.id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_missing for id=%', p_user_id
      USING ERRCODE = 'P0002';
  END IF;

  IF p_achievement_ids IS NOT NULL AND cardinality(p_achievement_ids) > 0 THEN
    FOREACH v_id IN ARRAY p_achievement_ids LOOP
      IF v_id IS NOT NULL
        AND length(btrim(v_id)) > 0
        AND NOT (v_id = ANY (v_existing))
        AND NOT (v_id = ANY (v_fresh))
      THEN
        v_fresh := array_append(v_fresh, v_id);
      END IF;
    END LOOP;

    IF cardinality(v_fresh) > 0 THEN
      UPDATE public.users
      SET
        xp = COALESCE(xp, 0) + v_xp_delta,
        conquistas = v_existing || v_fresh
      WHERE id = p_user_id
      RETURNING id, xp, conquistas
      INTO v_user_id, v_xp, v_conquistas;
    ELSE
      v_conquistas := v_existing;
    END IF;
  ELSE
    v_conquistas := v_existing;
  END IF;

  RETURN jsonb_build_object(
    'state', to_jsonb(v_state),
    'user', jsonb_build_object(
      'id', v_user_id,
      'xp', v_xp,
      'conquistas', to_jsonb(COALESCE(v_conquistas, '{}'::text[]))
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.despertar_persist_and_award(integer, jsonb, text[], integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.despertar_persist_and_award(integer, jsonb, text[], integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.despertar_persist_and_award(integer, jsonb, text[], integer) TO postgres;

COMMENT ON FUNCTION public.despertar_persist_and_award(integer, jsonb, text[], integer) IS
  'Fase B / B3 + G4.3: persiste patch (incl. shiny_counts) + append de conquistas/xp. Sem validação de economia.';
