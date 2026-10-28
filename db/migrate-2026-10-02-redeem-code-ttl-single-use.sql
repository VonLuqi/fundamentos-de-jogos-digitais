-- MySQL 8 / MariaDB 10.5+ (HostGator). Idempotente.
-- Código de uso único. single_use false compartilha na turma; true esgota no primeiro resgate.
-- Sem DELETE, UPDATE, DROP, TRUNCATE ou MODIFY COLUMN.

SET NAMES utf8mb4;

SET @ddl := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE redeem_codes ADD COLUMN single_use TINYINT(1) NOT NULL DEFAULT 0',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'redeem_codes' AND COLUMN_NAME = 'single_use'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
