-- MySQL 8 / MariaDB 10.5+ (HostGator). Idempotente.
-- Vínculos entre alunos.
-- Sem DELETE, UPDATE, DROP, TRUNCATE ou MODIFY COLUMN.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS friendships (
  id INT NOT NULL AUTO_INCREMENT,
  requester_id INT NOT NULL,
  addressee_id INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY friendships_pair_uidx (requester_id, addressee_id),
  KEY friendships_requester_status_idx (requester_id, status),
  KEY friendships_addressee_status_idx (addressee_id, status),
  CONSTRAINT friendships_requester_fk FOREIGN KEY (requester_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT friendships_addressee_fk FOREIGN KEY (addressee_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT friendships_no_self_chk CHECK (requester_id <> addressee_id),
  CONSTRAINT friendships_status_chk CHECK (status IN ('pending', 'accepted'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
