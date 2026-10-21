<?php
declare(strict_types=1);

namespace App\Services\Progress;

use App\Core\AdminAudit;
use App\Core\Database;
use App\Core\GameCatalog;
use App\Core\Http;
use App\Core\Mailer;
use App\Services\Despertar\DespertarService;
use App\Services\Prova\ProvaCatalog;
use App\Services\Prova\ProvaService;
use PDO;

/**
 * Serviços de Placar/Ranking (`api/_lib/progress/leaderboard.js`, substituindo a RPC `public.leaderboard_page`)
 * e Ferramentas Administrativas do Mestre (`api/_lib/progress/admin.js`).
 */
final class LeaderboardAdminService
{
    public const LEADERBOARD_PAGE_DEFAULT = 50;
    public const LEADERBOARD_PAGE_MAX = 200;
    public const LEADERBOARD_SORT_KEYS = ['xp', 'achievements', 'juizoBest', 'prestigeCount', 'lifetimeSouls'];

    private static function normalizeLifetimeSoulsString(mixed $raw): string
    {
        if ($raw === null || $raw === '') {
            return '0';
        }
        $s = trim((string) $raw);
        if (!preg_match('/^\d+(?:\.\d+)?$/', $s)) {
            return '0';
        }
        if (str_contains($s, '.')) {
            $s = rtrim(rtrim($s, '0'), '.');
        }
        return $s !== '' ? $s : '0';
    }

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
                'turmasDisponiveis' => [],
                'adminView' => false,
                'topN' => $limit,
                'sort' => $sort,
                'entries' => [],
                'self' => null,
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
                    COALESCE(`d`.`juizo_best_streak`, 0) AS `juizo_best`,
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
            $lifetimeStr = self::normalizeLifetimeSoulsString($row['lifetime_souls'] ?? '0');
            $lifetimeNum = is_numeric($row['lifetime_souls'] ?? null) ? (float) $row['lifetime_souls'] : 0.0;

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
                'rank' => $pos,
                'position' => $pos,
                'userId' => $card['id'],
                'id' => $card['id'],
                'username' => $card['username'],
                'fullName' => $card['fullName'],
                'turma' => $card['turma'],
                'avatarIndex' => $card['avatarIndex'],
                'xp' => $item['xp'],
                'rankTitle' => $card['rank'],
                'level' => $card['level'],
                'achievements' => $item['achievementsCount'],
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
            'turmasDisponiveis' => $isAdmin && $scope === 'turma' ? ProgressShared::VALID_TURMAS : [],
            'adminView' => $isAdmin,
            'topN' => $limit,
            'sort' => $sort,
            'entries' => $entries,
            'self' => $myEntry,
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
            'SELECT `user_id`, `souls`, `lifetime_souls`, `prestige_count`,
                    `juizo_best_streak`, `stats`, `updated_at`
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
            $stats = Database::decodeJsonObject($row['stats'] ?? null);
            $despertarByUser[$uid] = [
                'souls' => (string) ($row['souls'] ?? '0'),
                'lifetimeSouls' => (string) ($row['lifetime_souls'] ?? '0'),
                'totalClicks' => (int) ($stats['clicks'] ?? $stats['totalClicks'] ?? 0),
                'prestigeCount' => (int) ($row['prestige_count'] ?? 0),
                'juizoBest' => (int) ($row['juizo_best_streak'] ?? 0),
                'playTimeSec' => (int) ($stats['playTimeSec'] ?? $stats['play_time_sec'] ?? 0),
                'updatedAt' => Database::sqlToIso($row['updated_at'] ?? null),
            ];
        }

        $normalized = [];
        $usersById = [];
        foreach ($users as $raw) {
            $hydrated = Database::HydrateUserRow($raw);
            if (!$hydrated) {
                continue;
            }
            $s = GameCatalog::sanitizeUser($hydrated);
            $uid = (int) $hydrated['id'];
            $userViews = $viewsByUser[$uid] ?? [];
            $entry = array_merge($s, [
                'createdAt' => $hydrated['created_at'],
                'activities' => $paragraphsByUser[$uid] ?? [],
                'viewedLessons' => $userViews,
                'lessonViews' => $userViews,
                'hasDespertarState' => isset($despertarByUser[$uid]),
                'despertar' => $despertarByUser[$uid] ?? null,
            ]);
            $normalized[] = $entry;
            $usersById[$uid] = $entry;
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

        $activities = [];
        foreach ($paragraphRows as $row) {
            $uid = (int) $row['user_id'];
            $activityUser = $usersById[$uid] ?? null;
            if (!$activityUser || ($activityUser['role'] ?? '') === 'admin') {
                continue;
            }
            $activities[] = [
                'userId' => $activityUser['id'],
                'lessonId' => (string) $row['lesson_id'],
                'paragraph' => (string) ($row['paragraph'] ?? ''),
                'updatedAt' => Database::sqlToIso($row['updated_at'] ?? null),
                'fullName' => $activityUser['fullName'],
                'username' => $activityUser['username'],
                'turma' => $activityUser['turma'],
                'avatarIndex' => (int) ($activityUser['avatar_index'] ?? $activityUser['avatarIndex'] ?? 0),
            ];
        }

        Http::json(200, [
            'ok' => true,
            'users' => $normalized,
            'activities' => $activities,
        ]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function adminUpdateProfile(array $user, array $body, int $actorId = 0): never
    {
        ProgressShared::requireAdmin($user);
        $target = ProgressShared::loadTargetStudentOrAbort($body['targetUserId'] ?? null);
        $targetId = (int) $target['id'];

        $sets = [];
        $params = [':id' => $targetId];
        $auditUpdates = [];

        if (array_key_exists('fullName', $body) && $body['fullName'] !== null) {
            $fn = is_string($body['fullName']) ? trim($body['fullName']) : '';
            if (mb_strlen($fn, 'UTF-8') < 3) {
                Http::error(400, 'Nome muito curto.');
            }
            $sets[] = '`full_name` = :fn';
            $params[':fn'] = $fn;
            $auditUpdates['full_name'] = $fn;
        }

        if (array_key_exists('username', $body) && $body['username'] !== null) {
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
            $auditUpdates['username'] = $un;
        }

        if (array_key_exists('turma', $body) && $body['turma'] !== null) {
            $t = is_string($body['turma']) ? strtoupper(trim($body['turma'])) : '';
            if (!in_array($t, ProgressShared::VALID_TURMAS, true)) {
                Http::error(400, 'Turma inválida.');
            }
            $sets[] = '`turma` = :turma';
            $params[':turma'] = $t;
            $auditUpdates['turma'] = $t;
        }

        if (array_key_exists('avatarIndex', $body) && $body['avatarIndex'] !== null) {
            $idx = is_numeric($body['avatarIndex']) ? (int) $body['avatarIndex'] : -1;
            if ($idx < 0 || $idx > ProgressShared::AVATAR_INDEX_MAX) {
                Http::error(400, 'Avatar inválido.');
            }
            $sets[] = '`avatar_index` = :av';
            $params[':av'] = $idx;
            $auditUpdates['avatar_index'] = $idx;
        }

        if ($sets === []) {
            Http::error(400, 'Nada para atualizar.');
        }

        $pdo = Database::pdo();
        $sql = 'UPDATE `users` SET ' . implode(', ', $sets) . ' WHERE `id` = :id';
        $upd = $pdo->prepare($sql);
        $upd->execute($params);

        $actor = $actorId > 0 ? $actorId : (int) ($user['id'] ?? 0);
        AdminAudit::record($actor, AdminAudit::ACTIONS['updateProfile'], $targetId, ['updates' => $auditUpdates]);

        $updated = ProgressShared::loadUserById($targetId);
        Http::json(200, ['ok' => true, 'user' => GameCatalog::sanitizeUser($updated)]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function adminAdjustXp(array $user, array $body, int $actorId = 0): never
    {
        ProgressShared::requireAdmin($user);
        $target = ProgressShared::loadTargetStudentOrAbort($body['targetUserId'] ?? null);
        $targetId = (int) $target['id'];

        $before = (int) ($target['xp'] ?? 0);
        $nextXp = null;
        $adjustMode = 'set';
        $amount = 0;
        $reason = isset($body['reason']) && is_string($body['reason']) ? trim($body['reason']) : '';

        if (array_key_exists('xp', $body) || array_key_exists('mode', $body)) {
            if (mb_strlen($reason, 'UTF-8') < 3) {
                Http::error(400, 'Informe a razão do ajuste de XP.');
            }
            if (!isset($body['xp']) || !is_numeric($body['xp'])) {
                Http::error(400, 'XP inválido.');
            }
            $amount = (int) floor((float) $body['xp']);
            $adjustMode = isset($body['mode']) && is_string($body['mode'])
                ? strtolower(trim($body['mode']))
                : 'set';
            if ($adjustMode === 'delta') {
                $nextXp = max(0, $before + $amount);
            } elseif ($adjustMode === 'set') {
                $nextXp = max(0, $amount);
            } else {
                Http::error(400, 'mode deve ser set ou delta.');
            }
        } elseif (isset($body['setXp']) && is_numeric($body['setXp'])) {
            $adjustMode = 'set';
            $amount = (int) round((float) $body['setXp']);
            $nextXp = max(0, $amount);
        } elseif (isset($body['deltaXp']) && is_numeric($body['deltaXp'])) {
            $adjustMode = 'delta';
            $amount = (int) round((float) $body['deltaXp']);
            $nextXp = max(0, $before + $amount);
        } else {
            Http::error(400, 'XP inválido.');
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

        $actor = $actorId > 0 ? $actorId : (int) ($user['id'] ?? 0);
        AdminAudit::record($actor, AdminAudit::ACTIONS['adjustXp'], $targetId, [
            'mode' => $adjustMode,
            'before' => $before,
            'after' => $nextXp,
            'amount' => $amount,
            'reason' => $reason,
        ]);

        $updated = ProgressShared::loadUserById($targetId);
        Http::json(200, ['ok' => true, 'user' => GameCatalog::sanitizeUser($updated)]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function adminSetLessonCompleted(array $user, array $body, int $actorId = 0): never
    {
        ProgressShared::requireAdmin($user);
        $target = ProgressShared::loadTargetStudentOrAbort($body['targetUserId'] ?? null);
        $targetId = (int) $target['id'];

        $lessonId = isset($body['lessonId']) && is_string($body['lessonId']) ? trim($body['lessonId']) : '';
        $lesson = GameCatalog::LESSON_CATALOG[$lessonId] ?? null;
        if (!$lesson) {
            Http::error(400, 'Aula inválida.');
        }

        $completed = ($body['completed'] ?? true) !== false
            && ($body['completed'] ?? true) !== 'false'
            && ($body['completed'] ?? true) !== 0;

        $currentLessons = is_array($target['completed_lessons'] ?? null) ? array_values($target['completed_lessons']) : [];
        $alreadyHas = in_array($lessonId, $currentLessons, true);

        if ($completed) {
            $nextLessons = $alreadyHas ? $currentLessons : array_merge($currentLessons, [$lessonId]);
        } else {
            $nextLessons = array_values(array_filter($currentLessons, static fn(string $id): bool => $id !== $lessonId));
        }

        $pdo = Database::pdo();
        $upd = $pdo->prepare(
            'UPDATE `users` SET `completed_lessons` = :comp WHERE `id` = :id'
        );
        $upd->execute([
            ':comp' => Database::encodeJsonArray($nextLessons),
            ':id' => $targetId,
        ]);

        $actor = $actorId > 0 ? $actorId : (int) ($user['id'] ?? 0);
        AdminAudit::record($actor, AdminAudit::ACTIONS['setLessonCompleted'], $targetId, [
            'lessonId' => $lessonId,
            'completed' => $completed,
        ]);

        $updated = ProgressShared::loadUserById($targetId);
        Http::json(200, ['ok' => true, 'user' => GameCatalog::sanitizeUser($updated)]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function adminGrantAchievement(array $user, array $body, int $actorId = 0): never
    {
        ProgressShared::requireAdmin($user);
        $target = ProgressShared::loadTargetStudentOrAbort($body['targetUserId'] ?? null);
        $targetId = (int) $target['id'];

        $achievementId = isset($body['achievementId']) && is_string($body['achievementId']) ? trim($body['achievementId']) : '';
        if ($achievementId === '' || !GameCatalog::getAchievementById($achievementId)) {
            Http::error(400, 'Conquista inválida.');
        }

        $result = ProgressShared::awardAchievementIds($target, [$achievementId]);

        $actor = $actorId > 0 ? $actorId : (int) ($user['id'] ?? 0);
        AdminAudit::record($actor, AdminAudit::ACTIONS['grantAchievement'], $targetId, [
            'achievementId' => $achievementId,
            'xpGain' => $result['awarded']['xp'] ?? 0,
            'alreadyHad' => empty($result['awarded']['achievements']),
        ]);

        Http::json(200, [
            'ok' => true,
            'user' => GameCatalog::sanitizeUser($result['user']),
            'awarded' => $result['awarded'],
        ]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function adminRevokeAchievement(array $user, array $body, int $actorId = 0): never
    {
        ProgressShared::requireAdmin($user);
        $target = ProgressShared::loadTargetStudentOrAbort($body['targetUserId'] ?? null);
        $targetId = (int) $target['id'];

        $achievementId = isset($body['achievementId']) && is_string($body['achievementId']) ? trim($body['achievementId']) : '';
        if ($achievementId === '') {
            Http::error(400, 'Conquista inválida.');
        }

        $current = is_array($target['conquistas'] ?? null) ? array_values($target['conquistas']) : [];
        if (!in_array($achievementId, $current, true)) {
            Http::json(200, ['ok' => true, 'user' => GameCatalog::sanitizeUser($target), 'revoked' => false]);
        }

        $xpLoss = GameCatalog::getAchievementXp($achievementId);
        $nextXp = max(0, (int) ($target['xp'] ?? 0) - $xpLoss);
        $nextConq = array_values(array_filter($current, static fn(string $id): bool => $id !== $achievementId));

        $pdo = Database::pdo();
        $upd = $pdo->prepare('UPDATE `users` SET `xp` = :xp, `conquistas` = :conq WHERE `id` = :id');
        $upd->execute([
            ':xp' => $nextXp,
            ':conq' => Database::encodeJsonArray($nextConq),
            ':id' => $targetId,
        ]);

        $actor = $actorId > 0 ? $actorId : (int) ($user['id'] ?? 0);
        AdminAudit::record($actor, AdminAudit::ACTIONS['revokeAchievement'], $targetId, [
            'achievementId' => $achievementId,
            'xpLoss' => $xpLoss,
        ]);

        $updated = ProgressShared::loadUserById($targetId);
        Http::json(200, ['ok' => true, 'user' => GameCatalog::sanitizeUser($updated), 'revoked' => true]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function adminClearEmailSeal(array $user, array $body, int $actorId = 0): never
    {
        ProgressShared::requireAdmin($user);
        $target = ProgressShared::loadTargetStudentOrAbort($body['targetUserId'] ?? null);
        $targetId = (int) $target['id'];

        $pdo = Database::pdo();
        $delTokens = $pdo->prepare('DELETE FROM `auth_email_tokens` WHERE `user_id` = :uid');
        $delTokens->execute([':uid' => $targetId]);

        $upd = $pdo->prepare('UPDATE `users` SET `email` = NULL, `email_verified_at` = NULL WHERE `id` = :id');
        $upd->execute([':id' => $targetId]);

        $actor = $actorId > 0 ? $actorId : (int) ($user['id'] ?? 0);
        AdminAudit::record($actor, AdminAudit::ACTIONS['clearEmailSeal'], $targetId, [
            'previousEmail' => $target['email'] ?? null,
        ]);

        $updated = ProgressShared::loadUserById($targetId);
        Http::json(200, ['ok' => true, 'user' => GameCatalog::sanitizeUser($updated)]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function adminInvalidateSessions(array $user, array $body, int $actorId = 0): never
    {
        ProgressShared::requireAdmin($user);
        $target = ProgressShared::loadTargetStudentOrAbort($body['targetUserId'] ?? null);
        $targetId = (int) $target['id'];

        $pdo = Database::pdo();
        $del = $pdo->prepare('DELETE FROM `sessions` WHERE `user_id` = :uid');
        $del->execute([':uid' => $targetId]);

        $actor = $actorId > 0 ? $actorId : (int) ($user['id'] ?? 0);
        AdminAudit::record($actor, AdminAudit::ACTIONS['invalidateSessions'], $targetId, []);

        Http::json(200, ['ok' => true, 'invalidatedUserId' => $targetId]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function adminAuditLog(array $user, array $body = []): never
    {
        ProgressShared::requireAdmin($user);
        $limit = isset($body['limit']) && is_numeric($body['limit'])
            ? max(1, min(100, (int) $body['limit']))
            : 25;

        Http::json(200, [
            'ok' => true,
            'events' => self::fetchAuditEvents($limit),
        ]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private static function fetchAuditEvents(int $limit = 25): array
    {
        $pdo = Database::pdo();
        $lim = max(1, min(100, $limit));
        $stmt = $pdo->query(
            "SELECT
                `e`.`id`,
                `e`.`actor_id`,
                `e`.`target_user_id`,
                `e`.`action`,
                `e`.`payload`,
                `e`.`created_at`,
                `a`.`username` AS `actor_username`,
                `a`.`full_name` AS `actor_full_name`,
                `t`.`username` AS `target_username`,
                `t`.`full_name` AS `target_full_name`,
                `t`.`turma` AS `target_turma`
             FROM `admin_audit_events` `e`
             LEFT JOIN `users` `a` ON `a`.`id` = `e`.`actor_id`
             LEFT JOIN `users` `t` ON `t`.`id` = `e`.`target_user_id`
             ORDER BY `e`.`created_at` DESC
             LIMIT {$lim}"
        );
        $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'id' => (int) $r['id'],
                'action' => (string) $r['action'],
                'actorId' => (int) $r['actor_id'],
                'actorUsername' => (string) ($r['actor_username'] ?? 'mestre'),
                'actorName' => (string) (($r['actor_full_name'] ?? '') ?: ($r['actor_username'] ?? 'Mestre')),
                'targetUserId' => isset($r['target_user_id']) ? (int) $r['target_user_id'] : null,
                'targetUsername' => isset($r['target_username']) ? (string) $r['target_username'] : null,
                'targetName' => isset($r['target_full_name']) || isset($r['target_username'])
                    ? (string) (($r['target_full_name'] ?? '') ?: ($r['target_username'] ?? ''))
                    : null,
                'targetTurma' => isset($r['target_turma']) ? (string) $r['target_turma'] : null,
                'payload' => Database::decodeJsonObject($r['payload'] ?? null),
                'createdAt' => Database::sqlToIso($r['created_at'] ?? null),
            ];
        }
        return $out;
    }

    /**
     * Telemetria consolidada do Trono do Mestre (`adminOverview`).
     *
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function adminOverview(array $user, array $body = []): never
    {
        ProgressShared::requireAdmin($user);
        $pdo = Database::pdo();
        $nowMs = (int) round(microtime(true) * 1000);
        $nowIso = Database::nowIso($nowMs);
        $nowSql = Database::nowSql($nowMs);

        // 1. Almas Registradas
        $uStmt = $pdo->query(
            'SELECT `id`, `turma`, `role`, `xp`, `completed_lessons`, `email`, `email_verified_at`
             FROM `users` WHERE `role` = \'student\''
        );
        $students = $uStmt ? $uStmt->fetchAll(PDO::FETCH_ASSOC) : [];
        $totalStudents = count($students);
        $byTurma = ['TCG01' => 0, 'TCG02' => 0, 'OUTRA' => 0];
        $verifiedEmailCount = 0;
        $pendingEmailCount = 0;
        $noEmailCount = 0;
        $xpSum = 0;
        $maxXp = 0;
        $completedCountByLesson = [];

        foreach ($students as $st) {
            $t = strtoupper(trim((string) ($st['turma'] ?? '')));
            if (isset($byTurma[$t])) {
                $byTurma[$t]++;
            } else {
                $byTurma['OUTRA']++;
            }

            $email = trim((string) ($st['email'] ?? ''));
            if ($email === '') {
                $noEmailCount++;
            } elseif (!empty($st['email_verified_at'])) {
                $verifiedEmailCount++;
            } else {
                $pendingEmailCount++;
            }

            $xp = (int) ($st['xp'] ?? 0);
            $xpSum += $xp;
            if ($xp > $maxXp) {
                $maxXp = $xp;
            }

            $comp = Database::decodeJsonArray($st['completed_lessons'] ?? null);
            foreach ($comp as $lid) {
                $lidStr = (string) $lid;
                $completedCountByLesson[$lidStr] = ($completedCountByLesson[$lidStr] ?? 0) + 1;
            }
        }

        // 2. Parágrafos GDD e Visualizações por aula
        $pStmt = $pdo->query(
            'SELECT `p`.`lesson_id`, COUNT(*) AS `cnt`
             FROM `lesson_paragraphs` `p`
             INNER JOIN `users` `u` ON `u`.`id` = `p`.`user_id` AND `u`.`role` = \'student\'
             GROUP BY `p`.`lesson_id`'
        );
        $paragraphsByLesson = [];
        $totalActivitiesSubmitted = 0;
        if ($pStmt) {
            foreach ($pStmt->fetchAll(PDO::FETCH_ASSOC) as $pr) {
                $c = (int) ($pr['cnt'] ?? 0);
                $paragraphsByLesson[(string) $pr['lesson_id']] = $c;
                $totalActivitiesSubmitted += $c;
            }
        }

        $vStmt = $pdo->query(
            'SELECT `v`.`lesson_id`, COUNT(DISTINCT `v`.`user_id`) AS `viewers`
             FROM `lesson_views` `v`
             INNER JOIN `users` `u` ON `u`.`id` = `v`.`user_id` AND `u`.`role` = \'student\'
             GROUP BY `v`.`lesson_id`'
        );
        $viewsByLesson = [];
        if ($vStmt) {
            foreach ($vStmt->fetchAll(PDO::FETCH_ASSOC) as $vr) {
                $viewsByLesson[(string) $vr['lesson_id']] = (int) ($vr['viewers'] ?? 0);
            }
        }

        // 3. Gates de Aulas e O Despertar
        $gStmt = $pdo->query('SELECT `lesson_id`, `gate_key`, `released` FROM `lesson_gates`');
        $gateRows = $gStmt ? $gStmt->fetchAll(PDO::FETCH_ASSOC) : [];
        $gatesMap = [];
        foreach (array_keys(GameCatalog::LESSON_CATALOG) as $lid) {
            $gatesMap[$lid] = ProgressShared::defaultGatesForLesson($lid);
        }
        $gatesMap['despertar'] = ProgressShared::defaultGatesForLesson('despertar');
        foreach ($gateRows as $gr) {
            $lid = (string) ($gr['lesson_id'] ?? '');
            $gk = (string) ($gr['gate_key'] ?? '');
            if ($lid !== '' && $gk !== '' && isset($gatesMap[$lid])) {
                $gatesMap[$lid][$gk] = (bool) $gr['released'];
            }
        }

        // 4. Códigos de Oferenda Ativos
        $cStmt = $pdo->query(
            'SELECT `code`, `lesson_id`, `lesson_title`, `xp`, `created_at`, `expires_at`, `redeemed_at`, `redeemed_by`, `single_use`
             FROM `redeem_codes`
             ORDER BY `created_at` DESC
             LIMIT 60'
        );
        $codeRows = $cStmt ? $cStmt->fetchAll(PDO::FETCH_ASSOC) : [];
        $activeCodes = [];
        $activeCodeByLesson = [];
        foreach ($codeRows as $cr) {
            $expIso = !empty($cr['expires_at'])
                ? (Database::sqlToIso((string) $cr['expires_at']) ?? $nowIso)
                : Database::nowIso((Database::parseMs((string) ($cr['created_at'] ?? '')) ?? $nowMs) + ProgressShared::CODE_TTL_MINUTES * 60000);
            $expired = $expIso <= $nowIso;
            $singleUse = (bool) ($cr['single_use'] ?? false);
            $used = !empty($cr['redeemed_at']);
            if (!$expired && !($singleUse && $used)) {
                $dto = [
                    'code' => (string) $cr['code'],
                    'lessonId' => (string) $cr['lesson_id'],
                    'lessonTitle' => (string) $cr['lesson_title'],
                    'xp' => (int) ($cr['xp'] ?? 0),
                    'createdAt' => Database::sqlToIso($cr['created_at'] ?? null),
                    'expiresAt' => $expIso,
                    'singleUse' => $singleUse,
                    'used' => $used,
                ];
                $activeCodes[] = $dto;
                if (!isset($activeCodeByLesson[$dto['lessonId']])) {
                    $activeCodeByLesson[$dto['lessonId']] = $dto;
                }
            }
        }

        $publishedLessonsCount = 0;
        $perLessonStats = [];
        foreach (GameCatalog::LESSON_CATALOG as $lid => $lmeta) {
            $pub = !empty($gatesMap[$lid]['published']);
            if ($pub) {
                $publishedLessonsCount++;
            }
            $perLessonStats[$lid] = [
                'lessonId' => $lid,
                'title' => $lmeta['lessonTitle'],
                'xp' => (int) $lmeta['xp'],
                'published' => $pub,
                'completedCount' => $completedCountByLesson[$lid] ?? 0,
                'paragraphCount' => $paragraphsByLesson[$lid] ?? 0,
                'viewCount' => $viewsByLesson[$lid] ?? 0,
                'activeCode' => $activeCodeByLesson[$lid] ?? null,
            ];
        }

        // 5. Acheron & Sessões
        $dCountStmt = $pdo->query(
            'SELECT COUNT(*) FROM `despertar_states` `d`
             INNER JOIN `users` `u` ON `u`.`id` = `d`.`user_id` AND `u`.`role` = \'student\''
        );
        $activeDespertarSouls = $dCountStmt ? (int) $dCountStmt->fetchColumn() : 0;

        $sCountStmt = $pdo->prepare('SELECT COUNT(*) FROM `sessions` WHERE `expires_at` IS NULL OR `expires_at` > :now');
        $sCountStmt->execute([':now' => $nowSql]);
        $activeSessionsCount = (int) $sCountStmt->fetchColumn();

        $pauseState = DespertarService::getDespertarPauseState();
        $pauseDto = DespertarService::pausePublicDto($pauseState, $nowMs);

        // 6. Provação Módulo 1
        $exam = ProvaService::loadExam(ProvaCatalog::EXAM_ID);
        $attStmt = $pdo->prepare(
            'SELECT `status`, `contest_status`, `integrity_summary`
             FROM `prova_attempts`
             WHERE `exam_id` = :eid'
        );
        $attStmt->execute([':eid' => ProvaCatalog::EXAM_ID]);
        $attRows = $attStmt->fetchAll(PDO::FETCH_ASSOC);
        $provaCounts = ProvaService::countAttemptsByStatus($attRows);
        $openContests = 0;
        $integrityAlerts = 0;
        foreach ($attRows as $ar) {
            if (($ar['contest_status'] ?? '') === 'open') {
                $openContests++;
            }
            $isum = Database::decodeJsonObject($ar['integrity_summary'] ?? null);
            $blurCount = (int) ($isum['tab_blur'] ?? 0) + (int) ($isum['window_blur'] ?? 0);
            if ($blurCount >= ProvaService::PROVA_ALERT_BLUR_MIN) {
                $integrityAlerts++;
            }
        }
        $provaCounts['openContests'] = $openContests;
        $provaCounts['integrityAlerts'] = $integrityAlerts;

        $totalLessons = count(GameCatalog::LESSON_CATALOG);
        $sealedPercent = $totalStudents > 0 ? (int) round(($verifiedEmailCount / $totalStudents) * 100) : 0;
        $publishedPercent = $totalLessons > 0 ? (int) round(($publishedLessonsCount / $totalLessons) * 100) : 0;

        Http::json(200, [
            'ok' => true,
            'serverNow' => $nowIso,
            'kpis' => [
                'totalStudents' => $totalStudents,
                'byTurma' => [
                    'TCG01' => $byTurma['TCG01'],
                    'TCG02' => $byTurma['TCG02'],
                ],
                'verifiedEmailCount' => $verifiedEmailCount,
                'pendingEmailCount' => $pendingEmailCount,
                'noEmailCount' => $noEmailCount,
                'sealedPercent' => $sealedPercent,
                'avgXp' => $totalStudents > 0 ? (int) round($xpSum / $totalStudents) : 0,
                'maxXp' => $maxXp,
                'totalActivitiesSubmitted' => $totalActivitiesSubmitted,
                'activeDespertarSouls' => $activeDespertarSouls,
                'activeSessionsCount' => $activeSessionsCount,
            ],
            'lessons' => [
                'gates' => $gatesMap,
                'publishedCount' => $publishedLessonsCount,
                'totalLessons' => $totalLessons,
                'publishedPercent' => $publishedPercent,
                'perLessonStats' => $perLessonStats,
            ],
            'activeCodes' => $activeCodes,
            'acheron' => [
                'published' => !empty($gatesMap['despertar']['published']),
                'pause' => $pauseDto,
                'soulsInAcheron' => $activeDespertarSouls,
            ],
            'prova' => [
                'exam' => ProvaService::examPublicDto($exam),
                'counts' => $provaCounts,
            ],
            'mailer' => Mailer::getStatus(),
            'auditLog' => self::fetchAuditEvents(15),
        ]);
    }
}
