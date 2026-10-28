-- MySQL 8 / MariaDB 10.5+ (HostGator). Idempotente.
-- Conquistas do admin.
-- Sem DELETE, UPDATE, DROP, TRUNCATE ou MODIFY COLUMN.

SET NAMES utf8mb4;

-- O UPDATE único de conquistas do admin já rodou na era Supabase. Não se repete.
SELECT 1;
