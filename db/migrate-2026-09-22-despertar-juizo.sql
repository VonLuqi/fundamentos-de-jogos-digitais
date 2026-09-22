-- Migração 2026-09-22
-- Objetivo: colunas do Juízo do Tartarus + Vereditos (Task 17)
-- docs/plano-hades-despertar.md Fase 7

ALTER TABLE despertar_states
  ADD COLUMN IF NOT EXISTS verdicts integer NOT NULL DEFAULT 0;

ALTER TABLE despertar_states
  ADD COLUMN IF NOT EXISTS juizo_best_streak integer NOT NULL DEFAULT 0;

ALTER TABLE despertar_states
  ADD COLUMN IF NOT EXISTS juizo_current_streak integer NOT NULL DEFAULT 0;

ALTER TABLE despertar_states
  ADD COLUMN IF NOT EXISTS juizo_milestones_claimed jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE despertar_states
  ADD COLUMN IF NOT EXISTS verdict_purchases jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE despertar_states
  ADD COLUMN IF NOT EXISTS juizo_run jsonb NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'despertar_verdicts_nonneg'
  ) THEN
    ALTER TABLE despertar_states
      ADD CONSTRAINT despertar_verdicts_nonneg CHECK (verdicts >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'despertar_juizo_best_nonneg'
  ) THEN
    ALTER TABLE despertar_states
      ADD CONSTRAINT despertar_juizo_best_nonneg CHECK (juizo_best_streak >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'despertar_juizo_current_nonneg'
  ) THEN
    ALTER TABLE despertar_states
      ADD CONSTRAINT despertar_juizo_current_nonneg CHECK (juizo_current_streak >= 0);
  END IF;
END $$;
