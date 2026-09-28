-- Migração 2026-09-28
-- Objetivo: meta jsonb em lesson_gates para Véu da Aula (classroom_pause)
-- docs/plano-despertar-producao-profundo.md Task A1

ALTER TABLE lesson_gates
  ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}'::jsonb;
