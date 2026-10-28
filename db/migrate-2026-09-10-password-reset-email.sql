-- MySQL 8 / MariaDB 10.5+ (HostGator). Idempotente.
-- E-mail e tokens. O único de e-mail no MySQL é users_email_uidx (o users_email_lower_uidx do Postgres não se aplica).
-- Sem DELETE, UPDATE, DROP, TRUNCATE ou MODIFY COLUMN.

SET NAMES utf8mb4;

SET @ddl := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE users ADD COLUMN email VARCHAR(254) NULL',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE users ADD COLUMN email_verified_at DATETIME(3) NULL',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email_verified_at'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(COUNT(*) = 0,
    'CREATE UNIQUE INDEX users_email_uidx ON users (email)',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'users_email_uidx'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS auth_email_tokens (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  purpose VARCHAR(64) NOT NULL,
  token_hash VARCHAR(128) NOT NULL,
  email VARCHAR(254) NOT NULL,
  requested_ip VARCHAR(64) NULL DEFAULT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) NULL DEFAULT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY auth_email_tokens_hash_uidx (token_hash),
  KEY auth_email_tokens_user_purpose_created_idx (user_id, purpose, created_at),
  KEY auth_email_tokens_expires_idx (expires_at),
  KEY auth_email_tokens_email_purpose_created_idx (email, purpose, created_at),
  KEY auth_email_tokens_ip_created_idx (requested_ip, created_at),
  CONSTRAINT auth_email_tokens_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT auth_email_tokens_purpose_chk CHECK (purpose IN ('reset_password', 'verify_email', 'legacy_reset'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
