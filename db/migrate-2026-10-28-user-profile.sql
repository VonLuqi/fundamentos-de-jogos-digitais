-- Migração 2026-10-28
-- Sistema de Perfil: nome de exibição, bio, foto de perfil (com moderação).
-- MySQL 8 / MariaDB 10.5+ (HostGator / phpMyAdmin).
--
-- IDEMPOTENTE: MySQL 8 não tem `ADD COLUMN IF NOT EXISTS`; cada coluna é criada só se
-- ainda não existir em INFORMATION_SCHEMA (via prepared statement). Pode rodar mais de uma vez.
-- Rodar ANTES de publicar o backend: os SELECTs de ranking/amigos passam a ler estas colunas.

SET NAMES utf8mb4;

SET @ddl := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `users` ADD COLUMN `display_name` VARCHAR(40) NULL DEFAULT NULL AFTER `avatar_index`',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'display_name'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `users` ADD COLUMN `bio` VARCHAR(160) NULL DEFAULT NULL AFTER `display_name`',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'bio'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `users` ADD COLUMN `avatar_mode` VARCHAR(16) NOT NULL DEFAULT ''catalog'' AFTER `bio`',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_mode'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `users` ADD COLUMN `photo_path` VARCHAR(255) NULL DEFAULT NULL AFTER `avatar_mode`',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'photo_path'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `users` ADD COLUMN `photo_pending_path` VARCHAR(255) NULL DEFAULT NULL AFTER `photo_path`',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'photo_pending_path'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `users` ADD COLUMN `photo_status` VARCHAR(16) NOT NULL DEFAULT ''none'' AFTER `photo_pending_path`',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'photo_status'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `users` ADD COLUMN `photo_updated_at` DATETIME(3) NULL DEFAULT NULL AFTER `photo_status`',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'photo_updated_at'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `users` ADD COLUMN `photo_reject_reason` VARCHAR(160) NULL DEFAULT NULL AFTER `photo_updated_at`',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'photo_reject_reason'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Fila de moderação (admin): fotos pendentes por data de envio.
SET @ddl := (
  SELECT IF(COUNT(*) = 0,
    'CREATE INDEX `users_photo_status_idx` ON `users` (`photo_status`, `photo_updated_at`)',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'users_photo_status_idx'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
