-- =============================================================================
-- FUNDAMENTOS DE JOGOS DIGITAIS — Schema Consolidado MySQL 8.0+ / MariaDB 10.5+
-- Compatível com phpMyAdmin na HostGator (cPanel / Hospedagem Compartilhada)
-- =============================================================================
-- Nota:
--   - Todas as tabelas usam ENGINE=InnoDB e utf8mb4_unicode_ci.
--   - Colunas de array do PostgreSQL (text[]) e jsonb foram convertidas para JSON.
--   - Colunas timestamptz foram convertidas para DATETIME(3) em UTC (+00:00).
--   - Colunas uuid foram convertidas para CHAR(36).
--   - RPCs PL/pgSQL (despertar_persist_and_award e leaderboard_page) são
--     executadas via transações atômicas PDO no backend PHP (evita bloqueios de
--     SUPER/DEFINER no phpMyAdmin de hospedagem compartilhada).
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- -----------------------------------------------------------------------------
-- 1. users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `full_name` VARCHAR(255) NOT NULL,
  `turma` VARCHAR(16) NOT NULL,
  `username` VARCHAR(100) NOT NULL,
  `email` VARCHAR(254) NULL DEFAULT NULL,
  `email_verified_at` DATETIME(3) NULL DEFAULT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NULL DEFAULT NULL,
  `role` VARCHAR(32) NOT NULL DEFAULT 'student',
  `xp` INT NOT NULL DEFAULT 0,
  `conquistas` JSON NULL,
  `completed_lessons` JSON NULL,
  `redeemed_codes` JSON NULL,
  `avatar_index` INT NOT NULL DEFAULT 0,
  `display_name` VARCHAR(40) NULL DEFAULT NULL,
  `bio` VARCHAR(160) NULL DEFAULT NULL,
  `avatar_mode` VARCHAR(16) NOT NULL DEFAULT 'catalog',
  `photo_path` VARCHAR(255) NULL DEFAULT NULL,
  `photo_pending_path` VARCHAR(255) NULL DEFAULT NULL,
  `photo_status` VARCHAR(16) NOT NULL DEFAULT 'none',
  `photo_updated_at` DATETIME(3) NULL DEFAULT NULL,
  `photo_reject_reason` VARCHAR(160) NULL DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_uidx` (`username`),
  UNIQUE KEY `users_email_uidx` (`email`),
  KEY `users_turma_role_idx` (`turma`, `role`),
  KEY `users_xp_idx` (`xp` DESC),
  KEY `users_photo_status_idx` (`photo_status`, `photo_updated_at`),
  CONSTRAINT `users_turma_chk` CHECK (`turma` IN ('TCG01', 'TCG02'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. sessions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sessions` (
  `token` VARCHAR(128) NOT NULL,
  `user_id` INT NULL DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expires_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`token`),
  KEY `sessions_user_id_idx` (`user_id`),
  KEY `sessions_expires_at_idx` (`expires_at`),
  CONSTRAINT `sessions_user_id_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. auth_rate_events
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `auth_rate_events` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `action` VARCHAR(64) NOT NULL,
  `ip_hash` VARCHAR(128) NOT NULL,
  `username_hash` VARCHAR(128) NULL DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `auth_rate_events_ip_created_idx` (`action`, `ip_hash`, `created_at` DESC),
  KEY `auth_rate_events_user_created_idx` (`action`, `username_hash`, `created_at` DESC),
  CONSTRAINT `auth_rate_events_action_chk` CHECK (
    `action` IN (
      'login',
      'register',
      'legacy_bind',
      'soul_recovery_issue',
      'soul_recovery_consume'
    )
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. redeem_codes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `redeem_codes` (
  `code` VARCHAR(16) NOT NULL,
  `lesson_id` VARCHAR(64) NOT NULL,
  `lesson_title` VARCHAR(255) NOT NULL,
  `xp` INT NOT NULL,
  `created_by` INT NULL DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expires_at` DATETIME(3) NOT NULL,
  `single_use` TINYINT(1) NOT NULL DEFAULT 0,
  `redeemed_by` INT NULL DEFAULT NULL,
  `redeemed_at` DATETIME(3) NULL DEFAULT NULL,
  PRIMARY KEY (`code`),
  KEY `redeem_codes_lesson_created_idx` (`lesson_id`, `created_at` DESC),
  KEY `redeem_codes_active_idx` (`lesson_id`, `expires_at` DESC),
  KEY `redeem_codes_created_by_fk` (`created_by`),
  KEY `redeem_codes_redeemed_by_fk` (`redeemed_by`),
  CONSTRAINT `redeem_codes_created_by_fk`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `redeem_codes_redeemed_by_fk`
    FOREIGN KEY (`redeemed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `redeem_codes_xp_chk` CHECK (`xp` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. lesson_gates
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `lesson_gates` (
  `lesson_id` VARCHAR(64) NOT NULL,
  `gate_key` VARCHAR(64) NOT NULL,
  `released` TINYINT(1) NOT NULL DEFAULT 0,
  `released_by` INT NULL DEFAULT NULL,
  `released_at` DATETIME(3) NULL DEFAULT NULL,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `meta` JSON NULL,
  PRIMARY KEY (`lesson_id`, `gate_key`),
  KEY `lesson_gates_lesson_idx` (`lesson_id`),
  KEY `lesson_gates_released_by_fk` (`released_by`),
  CONSTRAINT `lesson_gates_released_by_fk`
    FOREIGN KEY (`released_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. lesson_paragraphs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `lesson_paragraphs` (
  `user_id` INT NOT NULL,
  `lesson_id` VARCHAR(64) NOT NULL,
  `paragraph` MEDIUMTEXT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`user_id`, `lesson_id`),
  KEY `lesson_paragraphs_lesson_idx` (`lesson_id`),
  CONSTRAINT `lesson_paragraphs_user_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. lesson_views
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `lesson_views` (
  `user_id` INT NOT NULL,
  `lesson_id` VARCHAR(64) NOT NULL,
  `first_viewed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `last_viewed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `view_count` INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`user_id`, `lesson_id`),
  KEY `lesson_views_lesson_idx` (`lesson_id`, `last_viewed_at` DESC),
  CONSTRAINT `lesson_views_user_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. friendships
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `friendships` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `requester_id` INT NOT NULL,
  `addressee_id` INT NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `friendships_pair_uidx` (`requester_id`, `addressee_id`),
  KEY `friendships_requester_status_idx` (`requester_id`, `status`),
  KEY `friendships_addressee_status_idx` (`addressee_id`, `status`),
  CONSTRAINT `friendships_requester_fk`
    FOREIGN KEY (`requester_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `friendships_addressee_fk`
    FOREIGN KEY (`addressee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `friendships_no_self_chk` CHECK (`requester_id` <> `addressee_id`),
  CONSTRAINT `friendships_status_chk` CHECK (`status` IN ('pending', 'accepted'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. lesson_duos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `lesson_duos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `lesson_id` VARCHAR(64) NOT NULL,
  `requester_id` INT NOT NULL,
  `addressee_id` INT NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `requester_role` VARCHAR(32) NULL DEFAULT NULL,
  `addressee_role` VARCHAR(32) NULL DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `lesson_duos_pair_uidx` (`lesson_id`, `requester_id`, `addressee_id`),
  KEY `lesson_duos_requester_status_idx` (`lesson_id`, `requester_id`, `status`),
  KEY `lesson_duos_addressee_status_idx` (`lesson_id`, `addressee_id`, `status`),
  KEY `lesson_duos_addressee_fk` (`addressee_id`),
  CONSTRAINT `lesson_duos_requester_fk`
    FOREIGN KEY (`requester_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lesson_duos_addressee_fk`
    FOREIGN KEY (`addressee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lesson_duos_no_self_chk` CHECK (`requester_id` <> `addressee_id`),
  CONSTRAINT `lesson_duos_status_chk` CHECK (`status` IN ('pending', 'accepted'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. lesson_journals
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `lesson_journals` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `lesson_id` VARCHAR(64) NOT NULL,
  `duo_id` INT NULL DEFAULT NULL,
  `owner_user_id` INT NOT NULL,
  `partner_user_id` INT NULL DEFAULT NULL,
  `body` MEDIUMTEXT NOT NULL,
  `revision` INT NOT NULL DEFAULT 1,
  `updated_by` INT NULL DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `lesson_journals_duo_uidx` (`duo_id`),
  KEY `lesson_journals_lesson_owner_idx` (`lesson_id`, `owner_user_id`),
  KEY `lesson_journals_owner_fk` (`owner_user_id`),
  KEY `lesson_journals_partner_fk` (`partner_user_id`),
  KEY `lesson_journals_updated_by_fk` (`updated_by`),
  CONSTRAINT `lesson_journals_duo_fk`
    FOREIGN KEY (`duo_id`) REFERENCES `lesson_duos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lesson_journals_owner_fk`
    FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lesson_journals_partner_fk`
    FOREIGN KEY (`partner_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `lesson_journals_updated_by_fk`
    FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. user_notes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_notes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `body` MEDIUMTEXT NOT NULL,
  `pinned` TINYINT(1) NOT NULL DEFAULT 0,
  `tags` JSON NULL,
  `lesson_id` VARCHAR(64) NULL DEFAULT NULL,
  `cloned_from_note_id` INT NULL DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `user_notes_user_updated_idx` (`user_id`, `pinned` DESC, `updated_at` DESC),
  KEY `user_notes_user_lesson_idx` (`user_id`, `lesson_id`),
  KEY `user_notes_cloned_from_idx` (`cloned_from_note_id`),
  CONSTRAINT `user_notes_user_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_notes_cloned_from_fk`
    FOREIGN KEY (`cloned_from_note_id`) REFERENCES `user_notes` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 12. user_note_shares
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_note_shares` (
  `note_id` INT NOT NULL,
  `shared_with_user_id` INT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`note_id`, `shared_with_user_id`),
  KEY `user_note_shares_viewer_idx` (`shared_with_user_id`, `note_id`),
  CONSTRAINT `user_note_shares_note_fk`
    FOREIGN KEY (`note_id`) REFERENCES `user_notes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_note_shares_user_fk`
    FOREIGN KEY (`shared_with_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 13. user_note_events
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_note_events` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `note_id` INT NOT NULL,
  `actor_user_id` INT NOT NULL,
  `kind` VARCHAR(64) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `read_at` DATETIME(3) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_note_events_note_created_idx` (`note_id`, `created_at` DESC),
  KEY `user_note_events_note_unread_idx` (`note_id`, `read_at`),
  KEY `user_note_events_actor_fk` (`actor_user_id`),
  CONSTRAINT `user_note_events_note_fk`
    FOREIGN KEY (`note_id`) REFERENCES `user_notes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_note_events_actor_fk`
    FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_note_events_kind_chk` CHECK (
    `kind` IN ('veiled_by_recipient', 'cloned_by', 'veiled_by_owner')
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 14. auth_email_tokens
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `auth_email_tokens` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `purpose` VARCHAR(64) NOT NULL,
  `token_hash` VARCHAR(128) NOT NULL,
  `email` VARCHAR(254) NOT NULL,
  `requested_ip` VARCHAR(64) NULL DEFAULT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `used_at` DATETIME(3) NULL DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_email_tokens_hash_uidx` (`token_hash`),
  KEY `auth_email_tokens_user_purpose_created_idx` (`user_id`, `purpose`, `created_at` DESC),
  KEY `auth_email_tokens_expires_idx` (`expires_at`),
  KEY `auth_email_tokens_email_purpose_created_idx` (`email`, `purpose`, `created_at` DESC),
  KEY `auth_email_tokens_ip_created_idx` (`requested_ip`, `created_at` DESC),
  CONSTRAINT `auth_email_tokens_user_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `auth_email_tokens_purpose_chk` CHECK (
    `purpose` IN ('reset_password', 'verify_email', 'legacy_reset')
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 15. admin_audit_events
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admin_audit_events` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `actor_id` INT NOT NULL,
  `target_user_id` INT NULL DEFAULT NULL,
  `action` VARCHAR(128) NOT NULL,
  `payload` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `admin_audit_events_created_idx` (`created_at` DESC),
  KEY `admin_audit_events_target_idx` (`target_user_id`, `created_at` DESC),
  KEY `admin_audit_events_actor_idx` (`actor_id`, `created_at` DESC),
  CONSTRAINT `admin_audit_events_actor_fk`
    FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `admin_audit_events_target_fk`
    FOREIGN KEY (`target_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 16. site_settings
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `site_settings` (
  `key` VARCHAR(128) NOT NULL,
  `value_hash` VARCHAR(255) NOT NULL,
  `rotated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `rotated_by` INT NULL DEFAULT NULL,
  PRIMARY KEY (`key`),
  KEY `site_settings_rotated_by_fk` (`rotated_by`),
  CONSTRAINT `site_settings_rotated_by_fk`
    FOREIGN KEY (`rotated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 17. soul_recovery_codes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `soul_recovery_codes` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `code_hash` VARCHAR(128) NOT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `used_at` DATETIME(3) NULL DEFAULT NULL,
  `created_by` INT NULL DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `soul_recovery_codes_user_active_idx` (`user_id`, `used_at`),
  KEY `soul_recovery_codes_hash_idx` (`code_hash`, `used_at`),
  KEY `soul_recovery_codes_created_by_fk` (`created_by`),
  CONSTRAINT `soul_recovery_codes_user_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `soul_recovery_codes_created_by_fk`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 18. despertar_states
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `despertar_states` (
  `user_id` INT NOT NULL,
  `souls` DECIMAL(38, 2) NOT NULL DEFAULT 0.00,
  `obols` DECIMAL(38, 2) NOT NULL DEFAULT 0.00,
  `mnemosyne` DECIMAL(38, 2) NOT NULL DEFAULT 0.00,
  `lifetime_souls` DECIMAL(38, 2) NOT NULL DEFAULT 0.00,
  `run_souls` DECIMAL(38, 2) NOT NULL DEFAULT 0.00,
  `prestige_count` INT NOT NULL DEFAULT 0,
  `generators_state` JSON NULL,
  `shiny_counts` JSON NULL,
  `gold_counts` JSON NULL,
  `upgrades_state` JSON NULL,
  `talents_state` JSON NULL,
  `edu_logs_seen` JSON NULL,
  `milestones` JSON NULL,
  `stats` JSON NULL,
  `verdicts` INT NOT NULL DEFAULT 0,
  `juizo_best_streak` INT NOT NULL DEFAULT 0,
  `juizo_current_streak` INT NOT NULL DEFAULT 0,
  `juizo_milestones_claimed` JSON NULL,
  `verdict_purchases` JSON NULL,
  `juizo_run` JSON NULL,
  `last_sync_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`user_id`),
  KEY `despertar_states_juizo_best_idx` (`juizo_best_streak` DESC),
  KEY `despertar_states_prestige_idx` (`prestige_count` DESC),
  KEY `despertar_states_lifetime_souls_idx` (`lifetime_souls` DESC),
  CONSTRAINT `despertar_states_user_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 19. classind_rooms
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `classind_rooms` (
  `id` CHAR(36) NOT NULL,
  `code` VARCHAR(16) NOT NULL,
  `host_user_id` INT NOT NULL,
  `turma` VARCHAR(16) NULL DEFAULT NULL,
  `phase` VARCHAR(32) NOT NULL DEFAULT 'lobby',
  `current_round_index` INT NOT NULL DEFAULT 0,
  `deck_id` VARCHAR(64) NOT NULL DEFAULT 'aula5-v1',
  `state_version` BIGINT NOT NULL DEFAULT 0,
  `settings` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `classind_rooms_code_uidx` (`code`),
  KEY `classind_rooms_host_idx` (`host_user_id`),
  KEY `classind_rooms_phase_updated_idx` (`phase`, `updated_at` DESC),
  CONSTRAINT `classind_rooms_host_fk`
    FOREIGN KEY (`host_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 20. classind_rounds
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `classind_rounds` (
  `id` CHAR(36) NOT NULL,
  `room_id` CHAR(36) NOT NULL,
  `round_index` INT NOT NULL,
  `payload_public` JSON NULL,
  `payload_secret` JSON NULL,
  `phase` VARCHAR(32) NOT NULL DEFAULT 'voting',
  `revealed_at` DATETIME(3) NULL DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `classind_rounds_room_index_uidx` (`room_id`, `round_index`),
  KEY `classind_rounds_room_idx` (`room_id`, `round_index`),
  CONSTRAINT `classind_rounds_room_fk`
    FOREIGN KEY (`room_id`) REFERENCES `classind_rooms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 21. classind_votes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `classind_votes` (
  `id` CHAR(36) NOT NULL,
  `round_id` CHAR(36) NOT NULL,
  `user_id` INT NOT NULL,
  `choice` VARCHAR(4) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `classind_votes_round_user_uidx` (`round_id`, `user_id`),
  KEY `classind_votes_round_idx` (`round_id`),
  KEY `classind_votes_user_idx` (`user_id`),
  CONSTRAINT `classind_votes_round_fk`
    FOREIGN KEY (`round_id`) REFERENCES `classind_rounds` (`id`) ON DELETE CASCADE,
  CONSTRAINT `classind_votes_user_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 22. classind_members
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `classind_members` (
  `room_id` CHAR(36) NOT NULL,
  `user_id` INT NOT NULL,
  `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `last_seen_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`room_id`, `user_id`),
  KEY `classind_members_room_idx` (`room_id`),
  KEY `classind_members_user_idx` (`user_id`),
  CONSTRAINT `classind_members_room_fk`
    FOREIGN KEY (`room_id`) REFERENCES `classind_rooms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `classind_members_user_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 23. classind_live_snapshots
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `classind_live_snapshots` (
  `room_id` CHAR(36) NOT NULL,
  `state_version` BIGINT NOT NULL DEFAULT 0,
  `payload` JSON NULL,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`room_id`),
  KEY `classind_live_snapshots_updated_idx` (`updated_at` DESC),
  CONSTRAINT `classind_live_snapshots_room_fk`
    FOREIGN KEY (`room_id`) REFERENCES `classind_rooms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 24. prova_exams
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `prova_exams` (
  `id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `duration_minutes` INT NOT NULL DEFAULT 90,
  `total_points` DECIMAL(6, 2) NOT NULL DEFAULT 20.00,
  `is_open` TINYINT(1) NOT NULL DEFAULT 0,
  `open_turmas` JSON NULL,
  `opens_at` DATETIME(3) NULL DEFAULT NULL,
  `closes_at` DATETIME(3) NULL DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 25. prova_attempts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `prova_attempts` (
  `id` CHAR(36) NOT NULL,
  `exam_id` VARCHAR(64) NOT NULL,
  `user_id` INT NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'in_progress',
  `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `ends_at` DATETIME(3) NOT NULL,
  `submitted_at` DATETIME(3) NULL DEFAULT NULL,
  `current_question_index` INT NOT NULL DEFAULT 0,
  `mc_score` DECIMAL(6, 2) NULL DEFAULT NULL,
  `discursive_score` DECIMAL(6, 2) NULL DEFAULT NULL,
  `final_score` DECIMAL(6, 2) NULL DEFAULT NULL,
  `graded_at` DATETIME(3) NULL DEFAULT NULL,
  `graded_by` INT NULL DEFAULT NULL,
  `admin_notes` MEDIUMTEXT NULL DEFAULT NULL,
  `integrity_summary` JSON NULL,
  `contest_status` VARCHAR(32) NULL DEFAULT NULL,
  `contest_student_message` TEXT NULL DEFAULT NULL,
  `contest_admin_message` TEXT NULL DEFAULT NULL,
  `contested_at` DATETIME(3) NULL DEFAULT NULL,
  `contest_resolved_at` DATETIME(3) NULL DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `prova_attempts_exam_user_uidx` (`exam_id`, `user_id`),
  KEY `prova_attempts_user_idx` (`user_id`),
  KEY `prova_attempts_status_idx` (`status`, `updated_at` DESC),
  KEY `prova_attempts_ends_at_idx` (`status`, `ends_at`),
  KEY `prova_attempts_exam_status_idx` (`exam_id`, `status`),
  KEY `prova_attempts_contest_status_idx` (`contest_status`),
  KEY `prova_attempts_graded_by_fk` (`graded_by`),
  CONSTRAINT `prova_attempts_exam_fk`
    FOREIGN KEY (`exam_id`) REFERENCES `prova_exams` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `prova_attempts_user_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `prova_attempts_graded_by_fk`
    FOREIGN KEY (`graded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 26. prova_answers
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `prova_answers` (
  `attempt_id` CHAR(36) NOT NULL,
  `question_id` VARCHAR(16) NOT NULL,
  `choice` VARCHAR(4) NULL DEFAULT NULL,
  `text_answer` MEDIUMTEXT NULL DEFAULT NULL,
  `is_correct` TINYINT(1) NULL DEFAULT NULL,
  `points_awarded` DECIMAL(6, 2) NULL DEFAULT NULL,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`attempt_id`, `question_id`),
  KEY `prova_answers_attempt_idx` (`attempt_id`),
  CONSTRAINT `prova_answers_attempt_fk`
    FOREIGN KEY (`attempt_id`) REFERENCES `prova_attempts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 27. prova_integrity_events
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `prova_integrity_events` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `attempt_id` CHAR(36) NOT NULL,
  `event_type` VARCHAR(64) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `meta` JSON NULL,
  PRIMARY KEY (`id`),
  KEY `prova_integrity_events_attempt_created_idx` (`attempt_id`, `created_at` DESC),
  KEY `prova_integrity_events_type_idx` (`attempt_id`, `event_type`),
  CONSTRAINT `prova_integrity_events_attempt_fk`
    FOREIGN KEY (`attempt_id`) REFERENCES `prova_attempts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 27b. prova_submissions (Trabalho Final: entrega .zip; arquivo em uploads/trabalhos/)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `prova_submissions` (
  `attempt_id` CHAR(36) NOT NULL,
  `stored_name` CHAR(40) NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `size_bytes` BIGINT NOT NULL DEFAULT 0,
  `sha256` CHAR(64) NULL DEFAULT NULL,
  `upload_count` INT NOT NULL DEFAULT 1,
  `first_uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`attempt_id`),
  UNIQUE KEY `prova_submissions_stored_uidx` (`stored_name`),
  CONSTRAINT `prova_submissions_attempt_fk`
    FOREIGN KEY (`attempt_id`) REFERENCES `prova_attempts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 28. rate_limit_buckets (Substitui @vercel/kv na HostGator)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rate_limit_buckets` (
  `bucket_key` VARCHAR(191) NOT NULL,
  `hits` INT NOT NULL DEFAULT 0,
  `expires_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`bucket_key`),
  KEY `rate_limit_buckets_expires_idx` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Seeds padrão (Exame Módulo 1 e Admin inicial caso a tabela esteja vazia)
-- -----------------------------------------------------------------------------
INSERT INTO `prova_exams` (
  `id`,
  `title`,
  `duration_minutes`,
  `total_points`,
  `is_open`,
  `open_turmas`,
  `opens_at`,
  `closes_at`
) VALUES (
  'modulo1-provacao',
  'Avaliação Imersiva: A Provação do Círculo Mágico e a Forja do Desenvolvedor',
  90,
  20.00,
  0,
  '[]',
  NULL,
  NULL
) ON DUPLICATE KEY UPDATE
  `title` = VALUES(`title`),
  `duration_minutes` = VALUES(`duration_minutes`),
  `total_points` = VALUES(`total_points`);

-- Exames Módulo 2 e Trabalho Final (nascem fechados)
INSERT IGNORE INTO `prova_exams` (`id`, `title`, `duration_minutes`, `total_points`, `is_open`, `open_turmas`)
VALUES
  ('modulo2-prova', 'Provação do Módulo 2: O Balcão e o Labirinto do Submundo', 45, 20.00, 0, '[]'),
  ('trabalho-final', 'Trabalho Final do Módulo 2', 0, 30.00, 0, '[]');

SET FOREIGN_KEY_CHECKS = 1;
