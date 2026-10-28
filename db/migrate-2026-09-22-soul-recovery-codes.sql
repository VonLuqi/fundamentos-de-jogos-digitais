-- MySQL 8 / MariaDB 10.5+ (HostGator). Idempotente.
-- Códigos de recuperação. As actions soul_recovery_issue e soul_recovery_consume já estão no CHECK de auth_rate_events.
-- Sem DELETE, UPDATE, DROP, TRUNCATE ou MODIFY COLUMN.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS soul_recovery_codes (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  code_hash VARCHAR(128) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) NULL DEFAULT NULL,
  created_by INT NULL DEFAULT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY soul_recovery_codes_user_active_idx (user_id, used_at),
  KEY soul_recovery_codes_hash_idx (code_hash, used_at),
  KEY soul_recovery_codes_created_by_fk (created_by),
  CONSTRAINT soul_recovery_codes_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT soul_recovery_codes_created_by_fk FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
