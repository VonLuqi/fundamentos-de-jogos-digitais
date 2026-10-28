-- MySQL 8 / MariaDB 10.5+ (HostGator). Idempotente.
-- Prova do Módulo 1. Acesso só pelo PHP; não há service role nem RLS.
-- Sem DELETE, UPDATE, DROP, TRUNCATE ou MODIFY COLUMN.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS prova_exams (
  id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 90,
  total_points DECIMAL(6, 2) NOT NULL DEFAULT 20.00,
  is_open TINYINT(1) NOT NULL DEFAULT 0,
  open_turmas JSON NULL,
  opens_at DATETIME(3) NULL DEFAULT NULL,
  closes_at DATETIME(3) NULL DEFAULT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS prova_attempts (
  id CHAR(36) NOT NULL,
  exam_id VARCHAR(64) NOT NULL,
  user_id INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'in_progress',
  started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ends_at DATETIME(3) NOT NULL,
  submitted_at DATETIME(3) NULL DEFAULT NULL,
  current_question_index INT NOT NULL DEFAULT 0,
  mc_score DECIMAL(6, 2) NULL DEFAULT NULL,
  discursive_score DECIMAL(6, 2) NULL DEFAULT NULL,
  final_score DECIMAL(6, 2) NULL DEFAULT NULL,
  graded_at DATETIME(3) NULL DEFAULT NULL,
  graded_by INT NULL DEFAULT NULL,
  admin_notes MEDIUMTEXT NULL DEFAULT NULL,
  integrity_summary JSON NULL,
  contest_status VARCHAR(32) NULL DEFAULT NULL,
  contest_student_message TEXT NULL DEFAULT NULL,
  contest_admin_message TEXT NULL DEFAULT NULL,
  contested_at DATETIME(3) NULL DEFAULT NULL,
  contest_resolved_at DATETIME(3) NULL DEFAULT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY prova_attempts_exam_user_uidx (exam_id, user_id),
  KEY prova_attempts_user_idx (user_id),
  KEY prova_attempts_status_idx (status, updated_at),
  KEY prova_attempts_ends_at_idx (status, ends_at),
  KEY prova_attempts_exam_status_idx (exam_id, status),
  KEY prova_attempts_contest_status_idx (contest_status),
  KEY prova_attempts_graded_by_fk (graded_by),
  CONSTRAINT prova_attempts_exam_fk FOREIGN KEY (exam_id) REFERENCES prova_exams (id) ON DELETE RESTRICT,
  CONSTRAINT prova_attempts_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT prova_attempts_graded_by_fk FOREIGN KEY (graded_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS prova_answers (
  attempt_id CHAR(36) NOT NULL,
  question_id VARCHAR(16) NOT NULL,
  choice VARCHAR(4) NULL DEFAULT NULL,
  text_answer MEDIUMTEXT NULL DEFAULT NULL,
  is_correct TINYINT(1) NULL DEFAULT NULL,
  points_awarded DECIMAL(6, 2) NULL DEFAULT NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (attempt_id, question_id),
  KEY prova_answers_attempt_idx (attempt_id),
  CONSTRAINT prova_answers_attempt_fk FOREIGN KEY (attempt_id) REFERENCES prova_attempts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS prova_integrity_events (
  id BIGINT NOT NULL AUTO_INCREMENT,
  attempt_id CHAR(36) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  meta JSON NULL,
  PRIMARY KEY (id),
  KEY prova_integrity_events_attempt_created_idx (attempt_id, created_at),
  KEY prova_integrity_events_type_idx (attempt_id, event_type),
  CONSTRAINT prova_integrity_events_attempt_fk FOREIGN KEY (attempt_id) REFERENCES prova_attempts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO prova_exams (id, title, duration_minutes, total_points, is_open, open_turmas, opens_at, closes_at)
VALUES (
  'modulo1-provacao',
  'Avaliação Imersiva: A Provação do Círculo Mágico e a Forja do Desenvolvedor',
  90,
  20.00,
  0,
  '[]',
  NULL,
  NULL
) ON DUPLICATE KEY UPDATE title = VALUES(title);
