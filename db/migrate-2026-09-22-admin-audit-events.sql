-- MySQL 8 / MariaDB 10.5+ (HostGator). Idempotente.
-- Auditoria do Mestre. payload é JSON.
-- Sem DELETE, UPDATE, DROP, TRUNCATE ou MODIFY COLUMN.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS admin_audit_events (
  id BIGINT NOT NULL AUTO_INCREMENT,
  actor_id INT NOT NULL,
  target_user_id INT NULL DEFAULT NULL,
  action VARCHAR(128) NOT NULL,
  payload JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY admin_audit_events_created_idx (created_at),
  KEY admin_audit_events_target_idx (target_user_id, created_at),
  KEY admin_audit_events_actor_idx (actor_id, created_at),
  CONSTRAINT admin_audit_events_actor_fk FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT admin_audit_events_target_fk FOREIGN KEY (target_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
