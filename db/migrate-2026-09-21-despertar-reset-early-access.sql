-- MySQL 8 / MariaDB 10.5+ (HostGator). Idempotente.
-- Reset de acesso antecipado.
-- Sem DELETE, UPDATE, DROP, TRUNCATE ou MODIFY COLUMN.

SET NAMES utf8mb4;

-- O DELETE de despertar_states dos alunos já ocorreu na era Supabase. Repetir apagaria o progresso atual.
SELECT 1;
