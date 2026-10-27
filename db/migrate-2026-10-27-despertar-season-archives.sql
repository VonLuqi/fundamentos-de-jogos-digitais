-- Migração 2026-10-27
-- Archive eterno de temporadas do Despertar (Hall + Placar T1).
-- MySQL / HostGator.

CREATE TABLE IF NOT EXISTS `despertar_season_archives` (
  `season_id` INT NOT NULL,
  `label` VARCHAR(120) NOT NULL DEFAULT '',
  `closed_at` DATETIME(3) NOT NULL,
  `boards` JSON NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`season_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
