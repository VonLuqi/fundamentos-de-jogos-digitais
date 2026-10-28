-- MySQL 8 / MariaDB 10.5+ (HostGator). Idempotente.
-- Placar paginado.
-- Sem DELETE, UPDATE, DROP, TRUNCATE ou MODIFY COLUMN.

SET NAMES utf8mb4;

-- leaderboard_page, o ORDER BY e o juizo_best_streak ficam em LeaderboardAdminService.php. Sem GRANT EXECUTE.
SELECT 1;
