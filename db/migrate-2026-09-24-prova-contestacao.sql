-- Migração 2026-09-24 (b)
-- Contestação de nota pelo aluno + resposta / reabertura pelo Mestre
-- docs/plano-prova-modulo1-online.md

ALTER TABLE prova_attempts
  ADD COLUMN IF NOT EXISTS contest_status text NULL
    CHECK (
      contest_status IS NULL
      OR contest_status IN ('open', 'answered', 'revised', 'closed')
    );

ALTER TABLE prova_attempts
  ADD COLUMN IF NOT EXISTS contest_student_message text NULL
    CHECK (
      contest_student_message IS NULL
      OR char_length(contest_student_message) <= 4000
    );

ALTER TABLE prova_attempts
  ADD COLUMN IF NOT EXISTS contest_admin_message text NULL
    CHECK (
      contest_admin_message IS NULL
      OR char_length(contest_admin_message) <= 4000
    );

ALTER TABLE prova_attempts
  ADD COLUMN IF NOT EXISTS contested_at timestamptz NULL;

ALTER TABLE prova_attempts
  ADD COLUMN IF NOT EXISTS contest_resolved_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS prova_attempts_contest_status_idx
  ON prova_attempts (contest_status)
  WHERE contest_status IS NOT NULL;
