<?php
declare(strict_types=1);

namespace App\Services\Progress;

use App\Core\Database;
use App\Core\GameCatalog;
use App\Core\Http;
use PDO;

/**
 * Serviços de Placar/Ranking (`api/_lib/progress/leaderboard.js`, substituindo a RPC `public.leaderboard_page`)
 * e Ferramentas Administrativas do Mestre (`api/_lib/progress/admin.js`).
 */
final class LeaderboardAdminService
{
    public const LEADERBOARD_PAGE_DEFAULT = 25;
    public const LEADERBOARD_PAGE_MAX = 100;
    public const LEADERBOARD_SORT_KEYS = ['xp', 'achievements', 'juizoBest', 'prestigeCount', 'lifetimeSouls'];

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $params
     */
    public static function leaderboardGet(array $user, int $userId, array $params): never
    {
        $isAdmin = ($user['role'] ?? '') === 'admin';
        $userTurma = !empty($user['turma']) ? (string) $user['turma'] : null;

        $rawScope = isset($params['scope']) && is_string($params['scope']) ? strtolower(trim($params['scope'])) : 'turma';
        $scope = $rawScope === 'global' ? 'global' : 'turma';

        $rawSort = isset($params['sort']) && is_string($params['sort']) ? trim($params['sort']) : 'xp';
        $sort = in_array($rawSort, self::LEADERBOARD_SORT_KEYS, true) ? $rawSort : 'xp';

        $limit = self::LEADERBOARD_PAGE_DEFAULT;
        if (isset($params['limit']) && is_numeric($params['limit'])) {
            $limit = max(1, min(self::LEADERBOARD_PAGE_MAX, (int) $params['limit']));
        }
        $offset = 0;
        if (isset($params['offset']) && is_numeric($params['offset'])) {
            $offset = max(0, (int) $params['offset']);
        }

        $requestedTurma = isset($params['turma']) && is_string($params['turma']) ? strtoupper(trim($params['turma'])) : '';
        $effectiveTurma = null;
        if ($scope === 'turma') {
            if ($isAdmin) {
                $effectiveTurma = in_array($requestedTurma, ProgressShared::VALID_TURMAS, true)
                    ? $requestedTurma
                    : ProgressShared::VALID_TURMAS[0];
            } else {
                $effectiveTurma = $userTurma;
            }
        } elseif ($isAdmin && in_array($requestedTurma, ProgressShared::VALID_TURMAS, true)) {
            $effectiveTurma = $requestedTurma;
        }

        if ($scope === 'turma' && !$isAdmin && !$effectiveTurma) {
            Http::json(200, [
                'ok' => true,
                'scope' => 'turma',
                'turma' => null,
                'sort' => $sort,
                'entries' => [],
                'myEntry' => null,
                'total' => 0,
                'limit' => $limit,
                'offset' => $offset,
            ]);
        }

        $pdo = Database::pdo();
        $whereSql = '`u`.`role` = \'student\'';
        $queryParams = [];
        if ($scope === 'turma' && $effectiveTurma) {
            $whereSql .= ' AND `u`.`turma` = :turma';
            $queryParams[':turma'] = $effectiveTurma;
        }

        $sql = "SELECT
                    `u`.`id`,
                    `u`.`full_name`,
                    `u`.`username`,
                    `u`.`turma`,
                    `u`.`role`,
                    `u`.`xp`,
                    `u`.`avatar_index`,
                    `u`.`conquistas`,
                    `u`.`completed_lessons`,
                    COALESCE(`d`.`juizo_best`, 0) AS `juizo_best`,
                    COALESCE(`d`.`prestige_count`, 0) AS `prestige_count`,
                    COALESCE(`d`.`lifetime_souls`, 0) AS `lifetime_souls`
                FROM `users` `u`
                LEFT JOIN `despertar_states` `d` ON `d`.`user_id` = `u`.`id`
                WHERE {$whereSql}";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($queryParams);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $fStmt = $pdo->prepare(
            'SELECT `id`, `requester_id`, `addressee_id`, `status`
             FROM `friendships`
             WHERE `requester_id` = :u1 OR `addressee_id` = :u2'
        );
        $fStmt->execute([':u1' => $userId, ':u2' => $userId]);
        $bondByOtherId = [];
        foreach ($fStmt->fetchAll(PDO::FETCH_ASSOC) as $b) {
            $otherId = ((int) $b['requester_id'] === $userId) ? (int) $b['addressee_id'] : (int) $b['requester_id'];
            $bondByOtherId[$otherId] = $b;
        }

        $enriched = [];
        foreach ($rows as $row) {
            $conq = Database::decodeJsonArray($row['conquistas'] ?? null);
            $comp = Database::decodeJsonArray($row['completed_lessons'] ?? null);
            $lifetimeNum = is_numeric($row['lifetime_souls'] ?? null) ? (float) $row['lifetime_souls'] : 0.0;
            $lifetimeStr = number_format($lifetimeNum, 0, '.', '');

            $enriched[] = [
                'row' => $row,
                'xp' => (int) ($row['xp'] ?? 0),
                'achievementsCount' => count($conq),
                'completedLessonsCount' => count($comp),
                'juizoBest' => (int) ($row['juizo_best'] ?? 0),
                'prestigeCount' => (int) ($row['prestige_count'] ?? 0),
                'lifetimeSoulsNum' => $lifetimeNum,
                'lifetimeSoulsStr' => $lifetimeStr,
            ];
        }

        usort($enriched, static function (array $a, array $b) use ($sort): int {
            if ($sort === 'achievements') {
                $primary = $b['achievementsCount'] <=> $a['achievementsCount'];
            } elseif ($sort === 'juizoBest') {
                $primary = $b['juizoBest'] <=> $a['juizoBest'];
            } elseif ($sort === 'prestigeCount') {
                $primary = $b['prestigeCount'] <=> $a['prestigeCount'];
            } elseif ($sort === 'lifetimeSouls') {
                $primary = $b['lifetimeSoulsNum'] <=> $a['lifetimeSoulsNum'];
            } else {
                $primary = $b['xp'] <=> $a['xp'];
            }
            if ($primary !== 0) {
                return $primary;
            }
            $tieXp = $b['xp'] <=> $a['xp'];
            if ($tieXp !== 0) {
                return $tieXp;
            }
            $tieAch = $b['achievementsCount'] <=> $a['achievementsCount'];
            if ($tieAch !== 0) {
                return $tieAch;
            }
            $nameA = (string) (($a['row']['full_name'] ?? '') ?: ($a['row']['username'] ?? ''));
            $nameB = (string) (($b['row']['full_name'] ?? '') ?: ($b['row']['username'] ?? ''));
            $tieName = strcasecmp($nameA, $nameB);
            if ($tieName !== 0) {
                return $tieName;
            }
            return ((int) $a['row']['id']) <=> ((int) $b['row']['id']);
        });

        $total = count($enriched);
        $entries = [];
        $myEntry = null;

        foreach ($enriched as $idx => $item) {
            $pos = $idx + 1;
            $r = $item['row'];
            $rid = (int) $r['id'];
            $isMe = $rid === $userId;
            $bond = $bondByOtherId[$rid] ?? null;
            $bondStatus = $isMe ? 'self' : ProgressShared::resolveBondStatus($bond, $userId);
            $card = ProgressShared::toFriendCard($r);

            $dto = [
                'position' => $pos,
                'id' => $card['id'],
                'username' => $card['username'],
                'fullName' => $card['fullName'],
                'turma' => $card['turma'],
                'avatarIndex' => $card['avatarIndex'],
                'xp' => $item['xp'],
                'rank' => $card['rank'],
                'level' => $card['level'],
                'achievementsCount' => $item['achievementsCount'],
                'completedLessonsCount' => $item['completedLessonsCount'],
                'juizoBest' => $item['juizoBest'],
                'prestigeCount' => $item['prestigeCount'],
                'lifetimeSouls' => $item['lifetimeSoulsStr'],
                'bondStatus' => $bondStatus,
                'friendshipId' => $bond ? (int) $bond['id'] : null,
                'isMe' => $isMe,
            ];

            if ($isMe) {
                $myEntry = $dto;
            }
            if ($idx >= $offset && count($entries) < $limit) {
                $entries[] = $dto;
            }
        }

        Http::json(200, [
            'ok' => true,
            'scope' => $scope,
            'turma' => $scope === 'turma' ? $effectiveTurma : null,
            'sort' => $sort,
            'entries' => $entries,
            'myEntry' => $myEntry,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
        ]);
    }

    // -------------------------------------------------------------------------
    // Ferramentas do Mestre (`listUsers`, `adminUpdateProfile`, etc.)
    // -------------------------------------------------------------------------

    /**
     * @param array<string, mixed> $user
     */
    public static function listUsers(array $user): never
    {
        ProgressShared::requireAdmin($user);
        $pdo = Database::pdo();

        $uStmt = $pdo->query(
            'SELECT `id`, `full_name`, `username`, `turma`, `role`, `xp`, `conquistas`, `completed_lessons`,
                    `redeemed_codes`, `avatar_index`, `created_at`, `email`, `email_verified_at`
             FROM `users`'
        );
        $users = $uStmt ? $uStmt->fetchAll(PDO::FETCH_ASSOC) : [];

        $pStmt = $pdo->query(
            'SELECT `user_id`, `lesson_id`, `paragraph`, `created_at`, `updated_at`
             FROM `lesson_paragraphs`
             ORDER BY `updated_at` DESC'
        );
        $paragraphRows = $pStmt ? $pStmt->fetchAll(PDO::FETCH_ASSOC) : [];

        $vStmt = $pdo->query(
            'SELECT `user_id`, `lesson_id`, `first_viewed_at`, `last_viewed_at`, `view_count`
             FROM `lesson_views`'
        );
        $viewRows = $vStmt ? $vStmt->fetchAll(PDO::FETCH_ASSOC) : [];

        $dStmt = $pdo->query(
            'SELECT `user_id`, `souls`, `lifetime_souls`, `total_clicks`, `prestige_count`,
                    `prestige_shards`, `juizo_best`, `play_time_sec`, `updated_at`
             FROM `despertar_states`'
        );
        $despertarRows = $dStmt ? $dStmt->fetchAll(PDO::FETCH_ASSOC) : [];

        $paragraphsByUser = [];
        foreach ($paragraphRows as $row) {
            $uid = (int) $row['user_id'];
            $paragraphsByUser[$uid][] = [
                'lessonId' => (string) $row['lesson_id'],
                'paragraph' => (string) ($row['paragraph'] ?? ''),
                'createdAt' => Database::sqlToIso($row['created_at'] ?? null),
                'updatedAt' => Database::sqlToIso($row['updated_at'] ?? null),
            ];
        }

        $viewsByUser = [];
        foreach ($viewRows as $row) {
            $uid = (int) $row['user_id'];
            $viewsByUser[$uid][] = [
                'lessonId' => (string) $row['lesson_id'],
                'firstViewedAt' => Database::sqlToIso($row['first_viewed_at'] ?? null),
                'lastViewedAt' => Database::sqlToIso($row['last_viewed_at'] ?? null),
                'viewCount' => (int) ($row['view_count'] ?? 1),
            ];
        }

        $despertarByUser = [];
        foreach ($despertarRows as $row) {
            $uid = (int) $row['user_id'];
            $despertarByUser[$uid] = [
                'souls' => (string) ($row['souls'] ?? '0'),
                'lifetimeSouls' => (string) ($row['lifetime_souls'] ?? '0'),
                'totalClicks' => (int) ($row['total_clicks'] ?? 0),
                'prestigeCount' => (int) ($row['prestige_count'] ?? 0),
                'prestigeShards' => (int) ($row['prestige_shards'] ?? 0),
                'juizoBest' => (int) ($row['juizo_best'] ?? 0),
                'playTimeSec' => (int) ($row['play_time_sec'] ?? 0),
                'updatedAt' => Database::sqlToIso($row['updated_at'] ?? null),
            ];
        }

        $normalized = [];
        foreach ($users as $raw) {
            $hydrated = Database::HydrateUserRow($raw);
            if (!$hydrated) {
                continue;
            }
            $s = GameCatalog::sanitizeUser($hydrated);
            $uid = (int) $hydrated['id'];
            $normalized[] = array_merge($s, [
                'createdAt' => $hydrated['created_at'],
                'activities' => $paragraphsByUser[$uid] ?? [],
                'lessonViews' => $viewsByUser[$uid] ?? [],
                'despertar' => $despertarByUser[$uid] ?? null,
            ]);
        }

        usort($normalized, static function (array $a, array $b): int {
            if (($a['role'] ?? '') === 'admin' && ($b['role'] ?? '') !== 'admin') {
                return -1;
            }
            if (($b['role'] ?? '') === 'admin' && ($a['role'] ?? '') !== 'admin') {
                return 1;
            }
            return ((int) ($b['xp'] ?? 0)) <=> ((int) ($a['xp'] ?? 0));
        });

        Http::json(200, ['ok' => true, 'users' => $normalized]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function adminUpdateProfile(array $user, array $body): never
    {
        ProgressShared::requireAdmin($user);
        $target = ProgressShared::loadTargetStudentOrAbort($body['targetUserId'] ?? null);
        $targetId = (int) $target['id'];

        $sets = [];
        $params = [':id' => $targetId];

        if (array_key_exists('fullName', $body)) {
            $fn = is_string($body['fullName']) ? trim($body['fullName']) : '';
            if (mb_strlen($fn, 'UTF-8') < 3) {
                Http::error(400, 'Nome completo deve ter ao menos 3 caracteres.');
            }
            $sets[] = '`full_name` = :fn';
            $params[':fn'] = $fn;
        }

        if (array_key_exists('username', $body)) {
            $un = is_string($body['username']) ? strtolower(trim($body['username'])) : '';
            if (!preg_match('/^[a-z0-9_]{3,24}$/', $un)) {
                Http::error(400, 'Usuário deve ter 3-24 caracteres (a-z, 0-9 ou _).');
            }
            $pdo = Database::pdo();
            $chk = $pdo->prepare('SELECT `id` FROM `users` WHERE LOWER(`username`) = :un AND `id` <> :id LIMIT 1');
            $chk->execute([':un' => $un, ':id' => $targetId]);
            if ($chk->fetch(PDO::FETCH_ASSOC)) {
                Http::error(409, 'Este nome de usuário já pertence a outra alma.');
            }
            $sets[] = '`username` = :un';
            $params[':un'] = $un;
        }

        if (array_key_exists('turma', $body)) {
            $t = is_string($body['turma']) ? strtoupper(trim($body['turma'])) : '';
            if (!in_array($t, ProgressShared::VALID_TURMAS, true)) {
                Http::error(400, 'Turma inválida.');
            }
            $sets[] = '`turma` = :turma';
            $params[':turma'] = $t;
        }

        if (array_key_exists('avatarIndex', $body)) {
            $idx = is_numeric($body['avatarIndex']) ? (int) $body['avatarIndex'] : -1;
            if ($idx < 0 || $idx > ProgressShared::AVATAR_INDEX_MAX) {
                Http::error(400, 'Avatar inválido.');
            }
            $sets[] = '`avatar_index` = :av';
            $params[':av'] = $idx;
        }

        if ($sets === []) {
            Http::error(400, 'Nenhum campo válido para atualizar.');
        }

        $pdo = Database::pdo();
        $sql = 'UPDATE `users` SET ' . implode(', ', $sets) . ' WHERE `id` = :id';
        $upd = $pdo->prepare($sql);
        $upd->execute($params);

        $updated = ProgressShared::loadUserById($targetId);
        Http::json(200, ['ok' => true, 'user' => GameCatalog::sanitizeUser($updated)]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function adminAdjustXp(array $user, array $body): never
    {
        ProgressShared::requireAdmin($user);
        $target = ProgressShared::loadTargetStudentOrAbort($body['targetUserId'] ?? null);
        $targetId = (int) $target['id'];

        $nextXp = null;
        if (isset($body['setXp']) && is_numeric($body['setXp'])) {
            $nextXp = max(0, (int) round((float) $body['setXp']));
        } elseif (isset($body['deltaXp']) && is_numeric($body['deltaXp'])) {
            $nextXp = max(0, (int) ($target['xp'] ?? 0) + (int) round((float) $body['deltaXp']));
        } else {
            Http::error(400, 'Informe deltaXp ou setXp.');
        }

        $nextAchievements = GameCatalog::recalculateAchievements([
            'xp' => $nextXp,
            'completed_lessons' => $target['completed_lessons'] ?? [],
            'conquistas' => $target['conquistas'] ?? [],
        ]);

        $pdo = Database::pdo();
        $upd = $pdo->prepare('UPDATE `users` SET `xp` = :xp, `conquistas` = :conq WHERE `id` = :id');
        $upd->execute([
            ':xp' => $nextXp,
            ':conq' => Database::encodeJsonArray($nextAchievements),
            ':id' => $targetId,
        ]);

        $updated = ProgressShared::loadUserById($targetId);
        Http::json(200, ['ok' => true, 'user' => GameCatalog::sanitizeUser($updated)]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function adminSetLessonCompleted(array $user, array $body): never
    {
        ProgressShared::requireAdmin($user);
        $target = ProgressShared::loadTargetStudentOrAbort($body['targetUserId'] ?? null);
        $targetId = (int) $target['id'];

        $lessonId = isset($body['lessonId']) && is_string($body['lessonId']) ? trim($body['lessonId']) : '';
        $lesson = GameCatalog::LESSON_CATALOG[$lessonId] ?? null;
        if (!$lesson) {
            Http::error(400, 'Aula inválida.');
        }

        $completed = !empty($body['completed']);
        $applyLessonXp = !array_key_exists('applyLessonXp', $body) || !empty($body['applyLessonXp']);

        $currentLessons = is_array($target['completed_lessons'] ?? null) ? array_values($target['completed_lessons']) : [];
        $alreadyHas = in_array($lessonId, $currentLessons, true);

        if ($completed) {
            $nextLessons = $alreadyHas ? $currentLessons : array_merge($currentLessons, [$lessonId]);
        } else {
            $nextLessons = array_values(array_filter($currentLessons, static fn(string $id): bool => $id !== $lessonId));
        }

        $nextXp = (int) ($target['xp'] ?? 0);
        if ($applyLessonXp) {
            if ($completed && !$alreadyHas) {
                $nextXp += (int) $lesson['xp'];
            } elseif (!$completed && $alreadyHas) {
                $nextXp = max(0, $nextXp - (int) $lesson['xp']);
            }
        }

        $lessonAchMap = [
            'aula1' => 'primeira_aula',
            'aula2' => 'aula2_completa',
            'aula3' => 'aula3_completa',
            'aula4' => 'aula4_completa',
        ];
        $seededAchievements = is_array($target['conquistas'] ?? null) ? array_values($target['conquistas']) : [];
        if (!$completed && isset($lessonAchMap[$lessonId])) {
            $remId = $lessonAchMap[$lessonId];
            $seededAchievements = array_values(array_filter($seededAchievements, static fn(string $id): bool => $id !== $remId));
            if (count($nextLessons) < 3) {
                $seededAchievements = array_values(array_filter($seededAchievements, static fn(string $id): bool => $id !== 'tres_aulas'));
            }
        }

        $nextAchievements = GameCatalog::recalculateAchievements([
            'xp' => $nextXp,
            'completed_lessons' => $nextLessons,
            'conquistas' => $seededAchievements,
        ]);

        $pdo = Database::pdo();
        $upd = $pdo->prepare(
            'UPDATE `users` SET `xp` = :xp, `completed_lessons` = :comp, `conquistas` = :conq WHERE `id` = :id'
        );
        $upd->execute([
            ':xp' => $nextXp,
            ':comp' => Database::encodeJsonArray($nextLessons),
            ':conq' => Database::encodeJsonArray($nextAchievements),
            ':id' => $targetId,
        ]);

        $updated = ProgressShared::loadUserById($targetId);
        Http::json(200, ['ok' => true, 'user' => GameCatalog::sanitizeUser($updated)]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function adminGrantAchievement(array $user, array $body): never
    {
        ProgressShared::requireAdmin($user);
        $target = ProgressShared::loadTargetStudentOrAbort($body['targetUserId'] ?? null);
        $targetId = (int) $target['id'];

        $achievementId = isset($body['achievementId']) && is_string($body['achievementId']) ? trim($body['achievementId']) : '';
        if ($achievementId === '') {
            Http::error(400, 'Informe achievementId.');
        }

        $applyXp = !array_key_exists('applyAchievementXp', $body) || !empty($body['applyAchievementXp']);
        $current = is_array($target['conquistas'] ?? null) ? array_values($target['conquistas']) : [];
        $already = in_array($achievementId, $current, true);
        $nextConq = $already ? $current : array_merge($current, [$achievementId]);
        $achXp = (!$already && $applyXp) ? GameCatalog::getAchievementXp($achievementId) : 0;
        $nextXp = max(0, (int) ($target['xp'] ?? 0) + $achXp);

        $pdo = Database::pdo();
        $upd = $pdo->prepare('UPDATE `users` SET `xp` = :xp, `conquistas` = :conq WHERE `id` = :id');
        $upd->execute([
            ':xp' => $nextXp,
            ':conq' => Database::encodeJsonArray($nextConq),
            ':id' => $targetId,
        ]);

        $updated = ProgressShared::loadUserById($targetId);
        Http::json(200, ['ok' => true, 'user' => GameCatalog::sanitizeUser($updated)]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function adminRevokeAchievement(array $user, array $body): never
    {
        ProgressShared::requireAdmin($user);
        $target = ProgressShared::loadTargetStudentOrAbort($body['targetUserId'] ?? null);
        $targetId = (int) $target['id'];

        $achievementId = isset($body['achievementId']) && is_string($body['achievementId']) ? trim($body['achievementId']) : '';
        if ($achievementId === '') {
            Http::error(400, 'Informe achievementId.');
        }

        $applyXp = !array_key_exists('applyAchievementXp', $body) || !empty($body['applyAchievementXp']);
        $current = is_array($target['conquistas'] ?? null) ? array_values($target['conquistas']) : [];
        $had = in_array($achievementId, $current, true);
        $nextConq = array_values(array_filter($current, static fn(string $id): bool => $id !== $achievementId));
        $achXp = ($had && $applyXp) ? GameCatalog::getAchievementXp($achievementId) : 0;
        $nextXp = max(0, (int) ($target['xp'] ?? 0) - $achXp);

        $pdo = Database::pdo();
        $upd = $pdo->prepare('UPDATE `users` SET `xp` = :xp, `conquistas` = :conq WHERE `id` = :id');
        $upd->execute([
            ':xp' => $nextXp,
            ':conq' => Database::encodeJsonArray($nextConq),
            ':id' => $targetId,
        ]);

        $updated = ProgressShared::loadUserById($targetId);
        Http::json(200, ['ok' => true, 'user' => GameCatalog::sanitizeUser($updated)]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function adminClearEmailSeal(array $user, array $body): never
    {
        ProgressShared::requireAdmin($user);
        $target = ProgressShared::loadTargetStudentOrAbort($body['targetUserId'] ?? null);
        $targetId = (int) $target['id'];

        $pdo = Database::pdo();
        $delTokens = $pdo->prepare('DELETE FROM `auth_email_tokens` WHERE `user_id` = :uid');
        $delTokens->execute([':uid' => $targetId]);

        $upd = $pdo->prepare('UPDATE `users` SET `email` = NULL, `email_verified_at` = NULL WHERE `id` = :id');
        $upd->execute([':id' => $targetId]);

        $updated = ProgressShared::loadUserById($targetId);
        Http::json(200, ['ok' => true, 'user' => GameCatalog::sanitizeUser($updated)]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function adminInvalidateSessions(array $user, array $body): never
    {
        ProgressShared::requireAdmin($user);
        $target = ProgressShared::loadTargetStudentOrAbort($body['targetUserId'] ?? null);
        $targetId = (int) $target['id'];

        $pdo = Database::pdo();
        $del = $pdo->prepare('DELETE FROM `sessions` WHERE `user_id` = :uid');
        $del->execute([':uid' => $targetId]);

        Http::json(200, ['ok' => true, 'invalidatedUserId' => $targetId]);
    }
}
