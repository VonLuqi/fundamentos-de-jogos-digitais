-- Migração 2026-09-24
-- Objetivo: schema da Prova Online do Módulo 1 (Provação do Círculo Mágico)
-- Task A1 — docs/plano-prova-modulo1-online.md
--
-- user_id é integer (users.id), não UUID.
-- Mutações: só via API com SUPABASE_SERVICE_ROLE_KEY (bypass RLS).
-- Conteúdo das questões e gabarito ficam no código server-side (Tasks A2+), não nesta migration.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Exams (definição / gate)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prova_exams (
  id text PRIMARY KEY,
  title text NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 90
    CHECK (duration_minutes > 0 AND duration_minutes <= 24 * 60),
  total_points numeric(6, 2) NOT NULL DEFAULT 20
    CHECK (total_points > 0),
  is_open boolean NOT NULL DEFAULT false,
  open_turmas text[] NOT NULL DEFAULT '{}',
  opens_at timestamptz NULL,
  closes_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prova_exams_open_turmas_chk CHECK (
    open_turmas <@ ARRAY['TCG01', 'TCG02']::text[]
  ),
  CONSTRAINT prova_exams_window_chk CHECK (
    closes_at IS NULL OR opens_at IS NULL OR closes_at >= opens_at
  )
);

ALTER TABLE prova_exams ENABLE ROW LEVEL SECURITY;
-- Sem policies: anon/authenticated não leem nem escrevem. Service-role bypass.

-- ---------------------------------------------------------------------------
-- Attempts (1 por aluno/exame na v1)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prova_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id text NOT NULL REFERENCES prova_exams(id) ON DELETE RESTRICT,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'submitted', 'timed_out', 'graded')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  submitted_at timestamptz NULL,
  current_question_index integer NOT NULL DEFAULT 0
    CHECK (current_question_index >= 0 AND current_question_index < 20),
  mc_score numeric(6, 2) NULL
    CHECK (mc_score IS NULL OR (mc_score >= 0 AND mc_score <= 12)),
  discursive_score numeric(6, 2) NULL
    CHECK (discursive_score IS NULL OR (discursive_score >= 0 AND discursive_score <= 8)),
  final_score numeric(6, 2) NULL
    CHECK (final_score IS NULL OR (final_score >= 0 AND final_score <= 20)),
  graded_at timestamptz NULL,
  graded_by integer NULL REFERENCES users(id) ON DELETE SET NULL,
  admin_notes text NULL
    CHECK (admin_notes IS NULL OR char_length(admin_notes) <= 4000),
  integrity_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prova_attempts_ends_after_start_chk CHECK (ends_at > started_at),
  CONSTRAINT prova_attempts_submitted_requires_ts_chk CHECK (
    status NOT IN ('submitted', 'timed_out', 'graded')
    OR submitted_at IS NOT NULL
  ),
  CONSTRAINT prova_attempts_graded_requires_final_chk CHECK (
    status <> 'graded'
    OR (final_score IS NOT NULL AND graded_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS prova_attempts_exam_user_uidx
  ON prova_attempts (exam_id, user_id);

CREATE INDEX IF NOT EXISTS prova_attempts_user_idx
  ON prova_attempts (user_id);

CREATE INDEX IF NOT EXISTS prova_attempts_status_idx
  ON prova_attempts (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS prova_attempts_ends_at_idx
  ON prova_attempts (ends_at)
  WHERE status = 'in_progress';

CREATE INDEX IF NOT EXISTS prova_attempts_exam_status_idx
  ON prova_attempts (exam_id, status);

ALTER TABLE prova_attempts ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Answers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prova_answers (
  attempt_id uuid NOT NULL REFERENCES prova_attempts(id) ON DELETE CASCADE,
  question_id text NOT NULL
    CHECK (question_id ~ '^q(0[1-9]|1[0-9]|20)$'),
  choice text NULL
    CHECK (choice IS NULL OR choice IN ('A', 'B', 'C', 'D', 'E')),
  text_answer text NULL
    CHECK (text_answer IS NULL OR char_length(text_answer) <= 12000),
  is_correct boolean NULL,
  points_awarded numeric(6, 2) NULL
    CHECK (points_awarded IS NULL OR (points_awarded >= 0 AND points_awarded <= 1)),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (attempt_id, question_id),
  CONSTRAINT prova_answers_payload_chk CHECK (
    choice IS NOT NULL OR text_answer IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS prova_answers_attempt_idx
  ON prova_answers (attempt_id);

ALTER TABLE prova_answers ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Integrity events (saída de aba / janela / navegação)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prova_integrity_events (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  attempt_id uuid NOT NULL REFERENCES prova_attempts(id) ON DELETE CASCADE,
  event_type text NOT NULL
    CHECK (event_type IN (
      'tab_blur',
      'tab_focus',
      'window_blur',
      'page_leave',
      'navigated_away',
      'beforeunload'
    )),
  created_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS prova_integrity_events_attempt_created_idx
  ON prova_integrity_events (attempt_id, created_at DESC);

CREATE INDEX IF NOT EXISTS prova_integrity_events_type_idx
  ON prova_integrity_events (attempt_id, event_type);

ALTER TABLE prova_integrity_events ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Seed — Prova Módulo 1 (fechada por padrão; admin abre no dia)
-- ---------------------------------------------------------------------------
INSERT INTO prova_exams (
  id,
  title,
  duration_minutes,
  total_points,
  is_open,
  open_turmas,
  opens_at,
  closes_at
) VALUES (
  'modulo1-provacao',
  'Avaliação Imersiva: A Provação do Círculo Mágico e a Forja do Desenvolvedor',
  90,
  20,
  false,
  '{}',
  NULL,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  duration_minutes = EXCLUDED.duration_minutes,
  total_points = EXCLUDED.total_points,
  updated_at = now();
-- Não sobrescreve is_open / open_turmas / janela em re-runs (gate do admin).
