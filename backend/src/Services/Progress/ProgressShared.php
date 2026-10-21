<?php
declare(strict_types=1);

namespace App\Services\Progress;

use App\Core\Database;
use App\Core\GameCatalog;
use App\Core\Http;
use PDO;

/**
 * Helpers e DTOs compartilhados pelo módulo `/api/progress` (`api/_lib/progress/shared.js`).
 */
final class ProgressShared
{
    public const CODE_TTL_MINUTES = 20;
    public const CODE_TTL_OPTIONS = [5, 10, 20, 30, 45, 60, 90, 120];
    public const FRIEND_LIMIT = 25;
    public const FRIEND_SEARCH_LIMIT = 8;
    public const NOTE_TITLE_MAX = 120;
    public const NOTE_BODY_MAX = 8000;
    public const NOTE_SOFT_WARN_COUNT = 50;
    public const AVATAR_INDEX_MAX = 101;
    public const VALID_TURMAS = ['TCG01', 'TCG02'];
    public const ADMIN_FORBIDDEN = 'Esta senda é só do Mestre.';

    public const UNDERWORLD_SOBERANO_ID = 'soberano_do_submundo';
    public const UNDERWORLD_ESTIGE_HASH = '18fec91c717e94c6b979a9c288ac1e041fd57101a2a2379b346e3b4fce39083c';
    public const UNDERWORLD_ORACLE_TOKEN = 'a2V5X2VsZXN0aWFsX2hhZGVz'; // base64('key_elestial_hades')

    public const UNDERWORLD_GATE_PASSES = ['tartaro oculto', 'tartaro-oculto'];
    public const UNDERWORLD_TARTARO_PASS = 'CERBERUS-UNBOUND';
    public const UNDERWORLD_ASFODELOS_PASS = 'PERSEPHONE_PASS';
    public const UNDERWORLD_HECATE_PASS = 'HECATE_TORCH_KEY_777';
    public const UNDERWORLD_ELISIOS_PASS = 'key_elestial_hades';
    public const UNDERWORLD_PERSEFONE_ROLES = ['queen_consort', 'rainha', 'soberano', 'soberana', 'queen'];
    public const UNDERWORLD_PERSEFONE_SEEDS = '6';
    public const UNDERWORLD_PERSEFONE_PASS = 'POMEGRANATE_6_SEEDS';
    public const UNDERWORLD_OBSERVATORIO_LAT = 36.4005;
    public const UNDERWORLD_OBSERVATORIO_LNG = 22.4858;
    public const UNDERWORLD_OBSERVATORIO_TOLERANCE = 0.025;
    public const UNDERWORLD_OBSERVATORIO_TOKENS = [
        'CAPE_MATAPAN_GATE',
        'CABO_MATAPAN',
        'CABO_TENARO',
        'CAPE_TAENARUM',
    ];
    public const UNDERWORLD_COCITO_PASS = 'COCYTUS_REFLECTION_404';
    public const UNDERWORLD_NEXT_PATHS = [
        'gate' => '/submundo/tartaro-oculto',
        'tartaro' => '/submundo/asfodelos-sussurros',
        'asfodelos' => '/submundo/hecate-encruzilhada',
        'hecate' => '/submundo/elisios-julgamento',
        'elisios' => '/submundo/persefone-jardim',
        'persefone' => '/submundo/observatorio-sombras',
        'observatorio' => '/submundo/cocito-espelho',
        'cocito' => '/submundo/estige-obolo',
    ];

    /**
     * @param array<string, mixed> $user
     */
    public static function requireAdmin(array $user): void
    {
        if (($user['role'] ?? '') !== 'admin') {
            Http::error(403, self::ADMIN_FORBIDDEN);
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function loadUserById(int $userId): ?array
    {
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT * FROM `users` WHERE `id` = :id LIMIT 1');
        $stmt->execute([':id' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return Database::HydrateUserRow($row ?: null);
    }

    /**
     * @return array<string, mixed>
     */
    public static function loadTargetStudentOrAbort(mixed $targetUserId): array
    {
        $id = is_numeric($targetUserId) ? (int) $targetUserId : 0;
        if ($id <= 0) {
            Http::error(400, 'Informe targetUserId.');
        }
        $target = self::loadUserById($id);
        if (!$target) {
            Http::error(404, 'Alma não encontrada.');
        }
        if (($target['role'] ?? '') === 'admin') {
            Http::error(400, 'Não se edita o Mestre por este caminho.');
        }
        return $target;
    }

    /**
     * @param array<int, int|string> $ids
     * @return array<int, array<string, mixed>>
     */
    public static function fetchUsersByIds(array $ids): array
    {
        $unique = [];
        foreach ($ids as $id) {
            $n = (int) $id;
            if ($n > 0) {
                $unique[$n] = $n;
            }
        }
        if ($unique === []) {
            return [];
        }
        $list = array_values($unique);
        $placeholders = implode(', ', array_fill(0, count($list), '?'));
        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            "SELECT `id`, `full_name`, `username`, `turma`, `role`, `xp`, `conquistas`, `completed_lessons`, `avatar_index`
             FROM `users` WHERE `id` IN ({$placeholders})"
        );
        $stmt->execute($list);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $out = [];
        foreach ($rows as $row) {
            $uid = (int) $row['id'];
            $row['id'] = $uid;
            $row['xp'] = (int) ($row['xp'] ?? 0);
            $row['avatar_index'] = (int) ($row['avatar_index'] ?? 0);
            $row['conquistas'] = Database::decodeJsonArray($row['conquistas'] ?? null);
            $row['completed_lessons'] = Database::decodeJsonArray($row['completed_lessons'] ?? null);
            $out[$uid] = $row;
        }
        return $out;
    }

    public static function isGateableLessonId(string $lessonId): bool
    {
        return isset(GameCatalog::LESSON_CATALOG[$lessonId]) || $lessonId === 'despertar';
    }

    /**
     * @return array<string, bool>
     */
    public static function defaultGatesForLesson(string $lessonId): array
    {
        if (isset(GameCatalog::LESSON_GATES[$lessonId])) {
            return GameCatalog::LESSON_GATES[$lessonId];
        }
        return ['published' => $lessonId === 'aula1'];
    }

    public static function isLessonPublishedForNotes(string $lessonId): bool
    {
        if (!isset(GameCatalog::LESSON_CATALOG[$lessonId])) {
            return false;
        }
        $defaults = self::defaultGatesForLesson($lessonId);
        $published = (bool) ($defaults['published'] ?? false);

        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT `gate_key`, `released` FROM `lesson_gates` WHERE `lesson_id` = :lid');
        $stmt->execute([':lid' => $lessonId]);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            if ((string) ($row['gate_key'] ?? '') === 'published') {
                $published = (bool) $row['released'];
            }
        }
        return $published;
    }

    /**
     * @param array<string, mixed> $user
     * @param array<int, string> $achievementIds
     * @return array{user: array<string, mixed>, awarded: array<string, mixed>, leveledUp: bool}
     */
    public static function awardAchievementIds(array $user, array $achievementIds): array
    {
        $existing = is_array($user['conquistas'] ?? null) ? array_values($user['conquistas']) : [];
        $fresh = [];
        foreach ($achievementIds as $rawId) {
            $id = trim((string) $rawId);
            if ($id !== '' && !in_array($id, $existing, true) && !in_array($id, $fresh, true)) {
                $fresh[] = $id;
            }
        }

        if ($fresh === []) {
            return [
                'user' => $user,
                'awarded' => ['xp' => 0, 'achievements' => [], 'achievementDetails' => []],
                'leveledUp' => false,
            ];
        }

        $xpGain = 0;
        foreach ($fresh as $id) {
            $xpGain += GameCatalog::getAchievementXp($id);
        }

        $prevXp = (int) ($user['xp'] ?? 0);
        $nextXp = $prevXp + $xpGain;
        $conquistas = array_values(array_merge($existing, $fresh));

        $pdo = Database::pdo();
        $upd = $pdo->prepare('UPDATE `users` SET `xp` = :xp, `conquistas` = :conq WHERE `id` = :id');
        $upd->execute([
            ':xp' => $nextXp,
            ':conq' => Database::encodeJsonArray($conquistas),
            ':id' => $user['id'],
        ]);

        $updated = self::loadUserById((int) $user['id']) ?? array_merge($user, [
            'xp' => $nextXp,
            'conquistas' => $conquistas,
        ]);

        return [
            'user' => $updated,
            'awarded' => [
                'xp' => $xpGain,
                'achievements' => $fresh,
                'achievementDetails' => GameCatalog::mapAchievementDetails($fresh),
            ],
            'leveledUp' => GameCatalog::levelForXp($nextXp) > GameCatalog::levelForXp($prevXp),
        ];
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public static function toFriendCard(array $row): array
    {
        $xp = (int) ($row['xp'] ?? 0);
        $isAdmin = ($row['role'] ?? '') === 'admin';
        return [
            'id' => (int) $row['id'],
            'username' => (string) ($row['username'] ?? ''),
            'fullName' => (string) (($row['full_name'] ?? '') ?: ($row['username'] ?? '')),
            'turma' => !empty($row['turma']) ? (string) $row['turma'] : null,
            'avatarIndex' => (int) ($row['avatar_index'] ?? 0),
            'role' => (string) ($row['role'] ?? 'student'),
            'xp' => $isAdmin ? null : $xp,
            'rank' => $isAdmin ? 'Mestre do Infinito' : GameCatalog::rankForXp($xp),
            'level' => $isAdmin ? '∞' : GameCatalog::levelForXp($xp),
        ];
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public static function toClassmateCard(array $row, string $bondStatus = 'none', ?int $friendshipId = null): array
    {
        $card = self::toFriendCard($row);
        return [
            'id' => $card['id'],
            'username' => $card['username'],
            'fullName' => $card['fullName'],
            'avatarIndex' => $card['avatarIndex'],
            'turma' => $card['turma'],
            'role' => $card['role'],
            'xp' => $card['xp'],
            'rank' => $card['rank'],
            'level' => $card['level'],
            'bondStatus' => $bondStatus,
            'friendshipId' => $friendshipId ?: null,
        ];
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public static function toPublicFriendProfile(array $row): array
    {
        $card = self::toFriendCard($row);
        $achievements = is_array($row['conquistas'] ?? null)
            ? array_values($row['conquistas'])
            : Database::decodeJsonArray($row['conquistas'] ?? null);
        $completed = is_array($row['completed_lessons'] ?? null)
            ? array_values($row['completed_lessons'])
            : Database::decodeJsonArray($row['completed_lessons'] ?? null);

        return array_merge($card, [
            'achievements' => $achievements,
            'completedLessonsCount' => count($completed),
            'mirrorMode' => 'companion',
        ]);
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public static function toTurmaMirrorProfile(array $row): array
    {
        $card = self::toFriendCard($row);
        return [
            'id' => $card['id'],
            'username' => $card['username'],
            'fullName' => $card['fullName'],
            'turma' => $card['turma'],
            'avatarIndex' => $card['avatarIndex'],
            'rank' => $card['rank'],
            'level' => $card['level'],
            'role' => $card['role'],
            'mirrorMode' => 'turma',
        ];
    }

    /**
     * @param array<string, mixed>|null $bond
     */
    public static function resolveBondStatus(?array $bond, int $viewerId): string
    {
        if (!$bond) {
            return 'none';
        }
        $status = (string) ($bond['status'] ?? '');
        if ($status === 'accepted') {
            return 'accepted';
        }
        if ($status === 'pending') {
            if ((int) ($bond['requester_id'] ?? 0) === $viewerId) {
                return 'outgoing';
            }
            if ((int) ($bond['addressee_id'] ?? 0) === $viewerId) {
                return 'incoming';
            }
        }
        return 'none';
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function findFriendshipBetween(int $userA, int $userB): ?array
    {
        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'SELECT `id`, `requester_id`, `addressee_id`, `status`, `created_at`, `updated_at`
             FROM `friendships`
             WHERE (`requester_id` = :a1 AND `addressee_id` = :b1)
                OR (`requester_id` = :b2 AND `addressee_id` = :a2)
             LIMIT 1'
        );
        $stmt->execute([':a1' => $userA, ':b1' => $userB, ':b2' => $userB, ':a2' => $userA]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        $row['id'] = (int) $row['id'];
        $row['requester_id'] = (int) $row['requester_id'];
        $row['addressee_id'] = (int) $row['addressee_id'];
        $row['created_at'] = Database::sqlToIso($row['created_at'] ?? null);
        $row['updated_at'] = Database::sqlToIso($row['updated_at'] ?? null);
        return $row;
    }

    public static function countAcceptedFriends(int $userId): int
    {
        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM `friendships`
             WHERE `status` = \'accepted\' AND (`requester_id` = :u1 OR `addressee_id` = :u2)'
        );
        $stmt->execute([':u1' => $userId, ':u2' => $userId]);
        return (int) $stmt->fetchColumn();
    }
}
