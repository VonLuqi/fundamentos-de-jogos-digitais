-- MySQL 8 / MariaDB 10.5+ (HostGator). Idempotente.
-- stats JSON em despertar_states. Shape: clicks, max_buy_biggest, juizo_tie_wins. A gravação fica no PHP.
-- Sem DELETE, UPDATE, DROP, TRUNCATE ou MODIFY COLUMN.

SET NAMES utf8mb4;

SET @ddl := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE despertar_states ADD COLUMN stats JSON NULL',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'despertar_states' AND COLUMN_NAME = 'stats'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
