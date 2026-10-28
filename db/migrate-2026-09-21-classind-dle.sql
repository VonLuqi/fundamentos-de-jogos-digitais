-- MySQL 8 / MariaDB 10.5+ (HostGator). Idempotente.
-- Salas do ClassInd. phase é VARCHAR(32) e aceita 'results' e 'ranking'. Sem RLS, policy ou publication.
-- Sem DELETE, UPDATE, DROP, TRUNCATE ou MODIFY COLUMN.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS classind_rooms (
  id CHAR(36) NOT NULL,
  code VARCHAR(16) NOT NULL,
  host_user_id INT NOT NULL,
  turma VARCHAR(16) NULL DEFAULT NULL,
  phase VARCHAR(32) NOT NULL DEFAULT 'lobby',
  current_round_index INT NOT NULL DEFAULT 0,
  deck_id VARCHAR(64) NOT NULL DEFAULT 'aula5-v1',
  state_version BIGINT NOT NULL DEFAULT 0,
  settings JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY classind_rooms_code_uidx (code),
  KEY classind_rooms_host_idx (host_user_id),
  KEY classind_rooms_phase_updated_idx (phase, updated_at),
  CONSTRAINT classind_rooms_host_fk FOREIGN KEY (host_user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS classind_rounds (
  id CHAR(36) NOT NULL,
  room_id CHAR(36) NOT NULL,
  round_index INT NOT NULL,
  payload_public JSON NULL,
  payload_secret JSON NULL,
  phase VARCHAR(32) NOT NULL DEFAULT 'voting',
  revealed_at DATETIME(3) NULL DEFAULT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY classind_rounds_room_index_uidx (room_id, round_index),
  KEY classind_rounds_room_idx (room_id, round_index),
  CONSTRAINT classind_rounds_room_fk FOREIGN KEY (room_id) REFERENCES classind_rooms (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS classind_votes (
  id CHAR(36) NOT NULL,
  round_id CHAR(36) NOT NULL,
  user_id INT NOT NULL,
  choice VARCHAR(4) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY classind_votes_round_user_uidx (round_id, user_id),
  KEY classind_votes_round_idx (round_id),
  KEY classind_votes_user_idx (user_id),
  CONSTRAINT classind_votes_round_fk FOREIGN KEY (round_id) REFERENCES classind_rounds (id) ON DELETE CASCADE,
  CONSTRAINT classind_votes_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS classind_members (
  room_id CHAR(36) NOT NULL,
  user_id INT NOT NULL,
  joined_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (room_id, user_id),
  KEY classind_members_room_idx (room_id),
  KEY classind_members_user_idx (user_id),
  CONSTRAINT classind_members_room_fk FOREIGN KEY (room_id) REFERENCES classind_rooms (id) ON DELETE CASCADE,
  CONSTRAINT classind_members_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS classind_live_snapshots (
  room_id CHAR(36) NOT NULL,
  state_version BIGINT NOT NULL DEFAULT 0,
  payload JSON NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (room_id),
  KEY classind_live_snapshots_updated_idx (updated_at),
  CONSTRAINT classind_live_snapshots_room_fk FOREIGN KEY (room_id) REFERENCES classind_rooms (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
