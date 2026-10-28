-- MySQL 8 / MariaDB 10.5+ (HostGator). Idempotente.
-- Duplas e diários de aula.
-- Sem DELETE, UPDATE, DROP, TRUNCATE ou MODIFY COLUMN.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS lesson_duos (
  id INT NOT NULL AUTO_INCREMENT,
  lesson_id VARCHAR(64) NOT NULL,
  requester_id INT NOT NULL,
  addressee_id INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  requester_role VARCHAR(32) NULL DEFAULT NULL,
  addressee_role VARCHAR(32) NULL DEFAULT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY lesson_duos_pair_uidx (lesson_id, requester_id, addressee_id),
  KEY lesson_duos_requester_status_idx (lesson_id, requester_id, status),
  KEY lesson_duos_addressee_status_idx (lesson_id, addressee_id, status),
  KEY lesson_duos_addressee_fk (addressee_id),
  CONSTRAINT lesson_duos_requester_fk FOREIGN KEY (requester_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT lesson_duos_addressee_fk FOREIGN KEY (addressee_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT lesson_duos_no_self_chk CHECK (requester_id <> addressee_id),
  CONSTRAINT lesson_duos_status_chk CHECK (status IN ('pending', 'accepted'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lesson_journals (
  id INT NOT NULL AUTO_INCREMENT,
  lesson_id VARCHAR(64) NOT NULL,
  duo_id INT NULL DEFAULT NULL,
  owner_user_id INT NOT NULL,
  partner_user_id INT NULL DEFAULT NULL,
  body MEDIUMTEXT NOT NULL,
  revision INT NOT NULL DEFAULT 1,
  updated_by INT NULL DEFAULT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY lesson_journals_duo_uidx (duo_id),
  KEY lesson_journals_lesson_owner_idx (lesson_id, owner_user_id),
  KEY lesson_journals_owner_fk (owner_user_id),
  KEY lesson_journals_partner_fk (partner_user_id),
  KEY lesson_journals_updated_by_fk (updated_by),
  CONSTRAINT lesson_journals_duo_fk FOREIGN KEY (duo_id) REFERENCES lesson_duos (id) ON DELETE CASCADE,
  CONSTRAINT lesson_journals_owner_fk FOREIGN KEY (owner_user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT lesson_journals_partner_fk FOREIGN KEY (partner_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT lesson_journals_updated_by_fk FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
