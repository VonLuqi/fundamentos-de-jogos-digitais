-- MySQL 8 / MariaDB 10.5+ (HostGator). Idempotente.
-- Grimório: notas e compartilhamentos.
-- Sem DELETE, UPDATE, DROP, TRUNCATE ou MODIFY COLUMN.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS user_notes (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  body MEDIUMTEXT NOT NULL,
  pinned TINYINT(1) NOT NULL DEFAULT 0,
  tags JSON NULL,
  lesson_id VARCHAR(64) NULL DEFAULT NULL,
  cloned_from_note_id INT NULL DEFAULT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY user_notes_user_updated_idx (user_id, pinned, updated_at),
  KEY user_notes_user_lesson_idx (user_id, lesson_id),
  KEY user_notes_cloned_from_idx (cloned_from_note_id),
  CONSTRAINT user_notes_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT user_notes_cloned_from_fk FOREIGN KEY (cloned_from_note_id) REFERENCES user_notes (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_note_shares (
  note_id INT NOT NULL,
  shared_with_user_id INT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (note_id, shared_with_user_id),
  KEY user_note_shares_viewer_idx (shared_with_user_id, note_id),
  CONSTRAINT user_note_shares_note_fk FOREIGN KEY (note_id) REFERENCES user_notes (id) ON DELETE CASCADE,
  CONSTRAINT user_note_shares_user_fk FOREIGN KEY (shared_with_user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
