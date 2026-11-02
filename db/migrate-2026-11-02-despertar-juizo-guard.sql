-- Migração 2026-11-02
-- Anti-bot do Juízo do Despertar: pontuação de suspeita por aluno (com decaimento), sinais brutos
-- recentes e ban de 6 h SÓ no Juízo. NÃO é apagada pelo reinício da Temporada 2 (o reinício só apaga
-- despertar_states e as conquistas despertar_*).
-- Criada também em runtime por JuizoGuard::ensureTable() (não depende de rodar esta migração).
-- MySQL / HostGator.

CREATE TABLE IF NOT EXISTS `despertar_juizo_guard` (
  `user_id` INT NOT NULL,
  `score` DOUBLE NOT NULL DEFAULT 0,
  `score_at` DATETIME(3) NULL DEFAULT NULL,
  `banned_at` DATETIME(3) NULL DEFAULT NULL,
  `banned_until` DATETIME(3) NULL DEFAULT NULL,
  `ban_reason` VARCHAR(500) NULL DEFAULT NULL,
  `ban_count` INT NOT NULL DEFAULT 0,
  `state` JSON NULL,
  `unbanned_by` INT NULL DEFAULT NULL,
  `unbanned_at` DATETIME(3) NULL DEFAULT NULL,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`user_id`),
  KEY `despertar_juizo_guard_banned_idx` (`banned_until`),
  CONSTRAINT `despertar_juizo_guard_user_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
