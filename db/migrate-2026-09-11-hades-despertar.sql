-- Migração 2026-09-11
-- Objetivo: estado server-authoritative de Hades: O Despertar
-- (Task 1 — docs/plano-hades-despertar.md)
--
-- user_id é integer (users.id), não UUID de auth.users.
-- RLS ligado; sem policies de escrita para o browser.
-- O backend usa SUPABASE_SERVICE_ROLE_KEY (bypass RLS).

CREATE TABLE IF NOT EXISTS despertar_states (
  user_id integer PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  souls numeric(38, 2) NOT NULL DEFAULT 0,
  obols numeric(38, 2) NOT NULL DEFAULT 0,
  mnemosyne numeric(38, 2) NOT NULL DEFAULT 0,
  lifetime_souls numeric(38, 2) NOT NULL DEFAULT 0,
  run_souls numeric(38, 2) NOT NULL DEFAULT 0,
  prestige_count integer NOT NULL DEFAULT 0,
  generators_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  upgrades_state jsonb NOT NULL DEFAULT '[]'::jsonb,
  talents_state jsonb NOT NULL DEFAULT '[]'::jsonb,
  edu_logs_seen jsonb NOT NULL DEFAULT '[]'::jsonb,
  milestones jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT despertar_souls_nonneg CHECK (souls >= 0),
  CONSTRAINT despertar_obols_nonneg CHECK (obols >= 0),
  CONSTRAINT despertar_mnemosyne_nonneg CHECK (mnemosyne >= 0)
);

ALTER TABLE despertar_states ENABLE ROW LEVEL SECURITY;
-- Sem policies de INSERT/UPDATE para anon/authenticated.
-- O backend usa SUPABASE_SERVICE_ROLE_KEY (bypass RLS), igual ao restante do Domínio.
