-- Migração 2026-09-01
-- Objetivo:
-- 1) Separar nome real (full_name) de username no cadastro
-- 2) Criar rastreio de visualização de aulas para relatórios admin

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS full_name text;

-- Preenche registros antigos sem nome completo
UPDATE users
SET full_name = COALESCE(NULLIF(TRIM(full_name), ''), NULLIF(TRIM(username), ''), 'Aluno')
WHERE full_name IS NULL OR TRIM(full_name) = '';

-- Torna obrigatório após backfill
ALTER TABLE users
  ALTER COLUMN full_name SET NOT NULL;

CREATE TABLE IF NOT EXISTS lesson_views (
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id text NOT NULL,
  first_viewed_at timestamptz NOT NULL DEFAULT now(),
  last_viewed_at timestamptz NOT NULL DEFAULT now(),
  view_count integer NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS lesson_views_lesson_idx ON lesson_views (lesson_id, last_viewed_at DESC);
