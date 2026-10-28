-- MySQL 8 / MariaDB 10.5+ (HostGator). Idempotente.
-- Índice de códigos ativos. Não remove o índice anterior.
-- Sem DELETE, UPDATE, DROP, TRUNCATE ou MODIFY COLUMN.

SET NAMES utf8mb4;

SET @ddl := (
  SELECT IF(COUNT(*) = 0,
    'CREATE INDEX redeem_codes_active_idx ON redeem_codes (lesson_id, expires_at)',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'redeem_codes' AND INDEX_NAME = 'redeem_codes_active_idx'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
