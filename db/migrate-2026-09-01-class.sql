-- Migração 2026-09-01
-- Registra a turma do aluno, limitada às turmas atualmente disponíveis.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS turma text;

UPDATE users
SET turma = 'TCG01'
WHERE turma IS NULL OR turma NOT IN ('TCG01', 'TCG02');

ALTER TABLE users
  ALTER COLUMN turma SET NOT NULL;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_turma_check;

ALTER TABLE users
  ADD CONSTRAINT users_turma_check CHECK (turma IN ('TCG01', 'TCG02'));