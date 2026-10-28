-- Migração 2026-10-28
-- Conquistas do Despertar que já pagaram XP numa temporada anterior.
-- Ao abrir a Temporada 2, as conquistas do Despertar saem dos perfis (voltam a ser
-- conquistáveis) sem tirar o XP; reconquistar não paga o XP de novo.
-- Criada também por DespertarService::ensurePaidAchievementsTable() na virada de temporada.
-- MySQL / HostGator.

CREATE TABLE IF NOT EXISTS `despertar_paid_achievements` (
  `user_id` INT NOT NULL,
  `achievement_ids` JSON NOT NULL,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
