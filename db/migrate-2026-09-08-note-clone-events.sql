-- MySQL 8 / MariaDB 10.5+ (HostGator). Idempotente.
-- Clone de nota e eventos do grimório.
-- Sem DELETE, UPDATE, DROP, TRUNCATE ou MODIFY COLUMN.

SET NAMES utf8mb4;

SET @ddl := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE user_notes ADD COLUMN cloned_from_note_id INT NULL',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_notes' AND COLUMN_NAME = 'cloned_from_note_id'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(COUNT(*) = 0,
    'CREATE INDEX user_notes_cloned_from_idx ON user_notes (cloned_from_note_id)',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_notes' AND INDEX_NAME = 'user_notes_cloned_from_idx'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS user_note_events (
  id INT NOT NULL AUTO_INCREMENT,
  note_id INT NOT NULL,
  actor_user_id INT NOT NULL,
  kind VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  read_at DATETIME(3) NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY user_note_events_note_created_idx (note_id, created_at),
  KEY user_note_events_note_unread_idx (note_id, read_at),
  KEY user_note_events_actor_fk (actor_user_id),
  CONSTRAINT user_note_events_note_fk FOREIGN KEY (note_id) REFERENCES user_notes (id) ON DELETE CASCADE,
  CONSTRAINT user_note_events_actor_fk FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT user_note_events_kind_chk CHECK (kind IN ('veiled_by_recipient', 'cloned_by', 'veiled_by_owner'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
