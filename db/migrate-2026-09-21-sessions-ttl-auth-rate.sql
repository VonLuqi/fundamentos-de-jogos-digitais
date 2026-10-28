-- MySQL 8 / MariaDB 10.5+ (HostGator). Idempotente.
-- TTL de sessão e eventos de taxa. Sem UPDATE das sessões existentes.
-- Sem DELETE, UPDATE, DROP, TRUNCATE ou MODIFY COLUMN.

SET NAMES utf8mb4;

SET @ddl := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE sessions ADD COLUMN expires_at DATETIME(3) NULL',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sessions' AND COLUMN_NAME = 'expires_at'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(COUNT(*) = 0,
    'CREATE INDEX sessions_expires_at_idx ON sessions (expires_at)',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sessions' AND INDEX_NAME = 'sessions_expires_at_idx'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS auth_rate_events (
  id BIGINT NOT NULL AUTO_INCREMENT,
  action VARCHAR(64) NOT NULL,
  ip_hash VARCHAR(128) NOT NULL,
  username_hash VARCHAR(128) NULL DEFAULT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY auth_rate_events_ip_created_idx (action, ip_hash, created_at),
  KEY auth_rate_events_user_created_idx (action, username_hash, created_at),
  CONSTRAINT auth_rate_events_action_chk CHECK (
    action IN ('login', 'register', 'legacy_bind', 'soul_recovery_issue', 'soul_recovery_consume')
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
