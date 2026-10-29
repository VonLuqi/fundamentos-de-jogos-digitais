-- Migração 2026-10-29
-- Multi-exame: Prova do Módulo 2 (modulo2-prova) e Trabalho Final (trabalho-final, entrega de .zip).
-- MySQL 8 / MariaDB 10.5+ (HostGator / phpMyAdmin). IDEMPOTENTE.
-- Sem DELETE, UPDATE, DROP, TRUNCATE ou MODIFY COLUMN. Os exames nascem FECHADOS (is_open = 0).
-- Rodar ANTES de publicar o backend (a tabela prova_submissions é lida no hub e no envio do trabalho).
-- Depende de: db/migrate-2026-09-24-prova-modulo1.sql (prova_exams, prova_attempts).

SET NAMES utf8mb4;

-- Entrega do Trabalho Final: 1 linha por tentativa (último envio vale). O arquivo fica em
-- uploads/trabalhos/<stored_name> (negado por .htaccess); original_name é só metadado.
CREATE TABLE IF NOT EXISTS prova_submissions (
  attempt_id CHAR(36) NOT NULL,
  stored_name CHAR(40) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  sha256 CHAR(64) NULL DEFAULT NULL,
  upload_count INT NOT NULL DEFAULT 1,
  first_uploaded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  uploaded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (attempt_id),
  UNIQUE KEY prova_submissions_stored_uidx (stored_name),
  CONSTRAINT prova_submissions_attempt_fk FOREIGN KEY (attempt_id) REFERENCES prova_attempts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- INSERT IGNORE: não altera linhas já existentes (nem is_open/open_turmas de um exame já liberado).
INSERT IGNORE INTO prova_exams (id, title, duration_minutes, total_points, is_open, open_turmas, opens_at, closes_at)
VALUES (
  'modulo2-prova',
  'Provação do Módulo 2: O Balcão e o Labirinto do Submundo',
  45,
  20.00,
  0,
  '[]',
  NULL,
  NULL
);

INSERT IGNORE INTO prova_exams (id, title, duration_minutes, total_points, is_open, open_turmas, opens_at, closes_at)
VALUES (
  'trabalho-final',
  'Trabalho Final do Módulo 2',
  0,
  30.00,
  0,
  '[]',
  NULL,
  NULL
);
