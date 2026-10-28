-- MySQL 8 / MariaDB 10.5+ (HostGator). Idempotente.
-- Nome civil e visualizações de aula. Sem UPDATE de full_name.
-- Sem DELETE, UPDATE, DROP, TRUNCATE ou MODIFY COLUMN.

SET NAMES utf8mb4;

SET @ddl := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE users ADD COLUMN full_name VARCHAR(255) NULL',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'full_name'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS lesson_views (
  user_id INT NOT NULL,
  lesson_id VARCHAR(64) NOT NULL,
  first_viewed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_viewed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  view_count INT NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, lesson_id),
  KEY lesson_views_lesson_idx (lesson_id, last_viewed_at),
  CONSTRAINT lesson_views_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
