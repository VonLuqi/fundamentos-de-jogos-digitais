-- Migração 2026-11-19
-- Prova de Recuperação (recuperacao-prova) + correção por IA + fechamento de notas de recuperação por turma.
-- MySQL 8 / MariaDB 10.5+ (HostGator / phpMyAdmin). IDEMPOTENTE.
-- Sem DELETE, UPDATE, DROP, TRUNCATE ou MODIFY COLUMN. O exame nasce FECHADO (is_open = 0).
-- Depende de: db/migrate-2026-09-24-prova-modulo1.sql, db/migrate-2026-11-16-turma-grades.sql.

SET NAMES utf8mb4;

-- Feedback da IA por questão discursiva (prova_answers.ai_feedback).
SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE prova_answers ADD COLUMN ai_feedback TEXT NULL DEFAULT NULL',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prova_answers' AND COLUMN_NAME = 'ai_feedback'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Nota original da IA por questão (a nota final do Mestre fica em points_awarded).
SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE prova_answers ADD COLUMN ai_points DECIMAL(6, 2) NULL DEFAULT NULL',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prova_answers' AND COLUMN_NAME = 'ai_points'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Fechamento das notas de recuperação (espelha turma_grade_closures).
CREATE TABLE IF NOT EXISTS turma_recovery_closures (
  turma VARCHAR(16) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'open',
  closed_at DATETIME(3) NULL DEFAULT NULL,
  closed_by INT NULL DEFAULT NULL,
  reopened_at DATETIME(3) NULL DEFAULT NULL,
  reopened_by INT NULL DEFAULT NULL,
  PRIMARY KEY (turma),
  CONSTRAINT turma_recovery_closures_status_chk CHECK (status IN ('closed', 'open'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- INSERT IGNORE: não altera linha existente (nem is_open/open_turmas de exame já liberado).
INSERT IGNORE INTO prova_exams (id, title, duration_minutes, total_points, is_open, open_turmas, opens_at, closes_at)
VALUES (
  'recuperacao-prova',
  'Prova de Recuperação: Fundamentos de Jogos Digitais',
  120,
  100.00,
  0,
  '[]',
  NULL,
  NULL
);
