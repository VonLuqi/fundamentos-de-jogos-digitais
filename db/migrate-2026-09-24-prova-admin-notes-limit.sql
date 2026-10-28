-- MySQL 8 / MariaDB 10.5+ (HostGator). Idempotente.
-- Notas do Mestre na prova.
-- Sem DELETE, UPDATE, DROP, TRUNCATE ou MODIFY COLUMN.

SET NAMES utf8mb4;

-- admin_notes é MEDIUMTEXT no MySQL, acima do teto antigo de 24000 caracteres. Sem DROP CONSTRAINT.
SELECT 1;
