-- MySQL 8 / MariaDB 10.5+ (HostGator). Idempotente.
-- Fechamento de notas da turma (100 pts). Sem DELETE/UPDATE/DROP/TRUNCATE/MODIFY COLUMN.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS turma_grade_closures (
  turma VARCHAR(16) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'open',
  closed_at DATETIME(3) NULL DEFAULT NULL,
  closed_by INT NULL DEFAULT NULL,
  reopened_at DATETIME(3) NULL DEFAULT NULL,
  reopened_by INT NULL DEFAULT NULL,
  PRIMARY KEY (turma),
  CONSTRAINT turma_grade_closures_status_chk CHECK (status IN ('closed', 'open'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS turma_grade_snapshots (
  turma VARCHAR(16) NOT NULL,
  user_id INT NOT NULL,
  codes DECIMAL(6, 2) NOT NULL DEFAULT 0,
  entregas DECIMAL(6, 2) NOT NULL DEFAULT 0,
  m1 DECIMAL(6, 2) NOT NULL DEFAULT 0,
  m2 DECIMAL(6, 2) NOT NULL DEFAULT 0,
  tf DECIMAL(6, 2) NOT NULL DEFAULT 0,
  total DECIMAL(6, 2) NOT NULL DEFAULT 0,
  details JSON NULL,
  closed_at DATETIME(3) NOT NULL,
  PRIMARY KEY (turma, user_id),
  KEY turma_grade_snapshots_user_idx (user_id),
  CONSTRAINT turma_grade_snapshots_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
