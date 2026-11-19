-- Migração 2026-11-19
-- Liberação manual da recuperação por aluno (Mestre). Reversível: Remover apaga a linha.
-- MySQL 8 / MariaDB 10.5+ (HostGator / phpMyAdmin). IDEMPOTENTE. Sem DROP/TRUNCATE/UPDATE.
-- Depende de: db/migrate-2026-11-19-recuperacao.sql.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS recovery_overrides (
  user_id INT NOT NULL,
  granted_by INT NULL DEFAULT NULL,
  granted_at DATETIME(3) NOT NULL,
  reason VARCHAR(255) NOT NULL DEFAULT '',
  PRIMARY KEY (user_id),
  CONSTRAINT recovery_overrides_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
