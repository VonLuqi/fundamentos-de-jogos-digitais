-- MySQL 8 / MariaDB 10.5+ (HostGator). Idempotente.
-- Contagem dourada. A gravação do patch fica no PHP, sem função plpgsql.
-- Sem DELETE, UPDATE, DROP, TRUNCATE ou MODIFY COLUMN.

SET NAMES utf8mb4;

SET @ddl := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE despertar_states ADD COLUMN gold_counts JSON NULL',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'despertar_states' AND COLUMN_NAME = 'gold_counts'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
