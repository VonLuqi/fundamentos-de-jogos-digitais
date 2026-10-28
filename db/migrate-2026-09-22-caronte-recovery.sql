-- MySQL 8 / MariaDB 10.5+ (HostGator). Idempotente.
-- Ajustes do Caronte: site_settings. purpose legacy_reset e action legacy_bind já entram no CHECK do schema.
-- Sem DELETE, UPDATE, DROP, TRUNCATE ou MODIFY COLUMN.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS site_settings (
  `key` VARCHAR(128) NOT NULL,
  value_hash VARCHAR(255) NOT NULL,
  rotated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  rotated_by INT NULL DEFAULT NULL,
  PRIMARY KEY (`key`),
  KEY site_settings_rotated_by_fk (rotated_by),
  CONSTRAINT site_settings_rotated_by_fk FOREIGN KEY (rotated_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
