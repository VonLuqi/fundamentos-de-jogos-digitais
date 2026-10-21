<?php
declare(strict_types=1);

namespace App\Services\Progress;

use App\Core\Database;
use App\Core\GameCatalog;
use App\Core\Http;
use App\Core\RateLimiter;
use PDO;

/**
 * Serviços de Perfil (`avatar`), Resgate de Códigos (`redeem`, `generateCode`, `lessonCode`, `listCodes`),
 * Aulas/Gates/Parágrafos (`lessonGates`, `lessonGatesBatch`, `setLessonGate`, `getLessonParagraph`,
 * `listMyLessonParagraphs`, `saveLessonParagraph`, `lessonView`, `lessonEventsBatch`)
 * e Submundo (`underworldJudgment`, `underworldRedeem`).
 */
final class RedeemLessonsService
{
    public const LESSON_EVENTS_BATCH_MAX = 20;

    // -------------------------------------------------------------------------
    // Perfil
    // -------------------------------------------------------------------------

    /**
     * @param array<string, mixed> $body
     */
    public static function avatar(int $userId, array $body): never
    {
        $rawIdx = $body['avatarIndex'] ?? null;
        if (!is_numeric($rawIdx) || (int) $rawIdx != $rawIdx) {
            Http::error(400, 'Avatar inválido.');
        }
        $idx = (int) $rawIdx;
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('UPDATE `users` SET `avatar_index` = :idx WHERE `id` = :id');
        $stmt->execute([':idx' => $idx, ':id' => $userId]);

        $updated = ProgressShared::loadUserById($userId);
        if (!$updated) {
            Http::error(500, 'Erro ao atualizar avatar.');
        }
        Http::json(200, ['ok' => true, 'user' => GameCatalog::sanitizeUser($updated)]);
    }

    // -------------------------------------------------------------------------
    // Códigos de Resgate (Oferenda ao Estige)
    // -------------------------------------------------------------------------

    private static function generateRandomCode(int $length = 7): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $len = strlen($alphabet);
        $bytes = random_bytes($length);
        $out = '';
        for ($i = 0; $i < $length; $i++) {
            $out .= $alphabet[ord($bytes[$i]) % $len];
        }
        return $out;
    }

    private static function normalizeTtlMinutes(mixed $raw): int
    {
        if (!is_numeric($raw)) {
            return ProgressShared::CODE_TTL_MINUTES;
        }
        $minutes = (int) round((float) $raw);
        return in_array($minutes, ProgressShared::CODE_TTL_OPTIONS, true)
            ? $minutes
            : ProgressShared::CODE_TTL_MINUTES;
    }

    /**
     * @param array<string, mixed> $row
     */
    private static function codeExpiresAtIso(array $row): string
    {
        if (!empty($row['expires_at'])) {
            return Database::sqlToIso((string) $row['expires_at']) ?? Database::nowIso();
        }
        $createdMs = Database::parseMs((string) ($row['created_at'] ?? '')) ?? (int) round(microtime(true) * 1000);
        return Database::nowIso($createdMs + ProgressShared::CODE_TTL_MINUTES * 60000);
    }

    /**
     * @param array<string, mixed> $row
     */
    private static function isCodeExpired(array $row, ?string $nowIso = null): bool
    {
        $now = $nowIso ?? Database::nowIso();
        return self::codeExpiresAtIso($row) <= $now;
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     * @return array<int, array<string, mixed>>
     */
    private static function normalizeCodesList(array $rows): array
    {
        $nowIso = Database::nowIso();
        $out = [];
        foreach ($rows as $row) {
            $expiresAt = self::codeExpiresAtIso($row);
            $expired = $expiresAt <= $nowIso;
            $singleUse = (bool) ($row['single_use'] ?? false);
            $used = !empty($row['redeemed_at']);
            $out[] = [
                'code' => (string) $row['code'],
                'lessonId' => (string) $row['lesson_id'],
                'lessonTitle' => (string) $row['lesson_title'],
                'xp' => (int) ($row['xp'] ?? 0),
                'createdAt' => Database::sqlToIso($row['created_at'] ?? null),
                'expiresAt' => $expiresAt,
                'redeemedAt' => Database::sqlToIso($row['redeemed_at'] ?? null),
                'redeemedBy' => isset($row['redeemed_by']) ? (int) $row['redeemed_by'] : null,
                'singleUse' => $singleUse,
                'used' => $used,
                'expired' => $expired,
                'redeemable' => !$expired && !($singleUse && $used),
            ];
        }
        return $out;
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function redeem(array $user, int $userId, array $body): never
    {
        $raw = isset($body['code']) && is_string($body['code']) ? strtoupper(trim($body['code'])) : '';
        if ($raw === '') {
            Http::error(400, 'Código ausente.');
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT * FROM `redeem_codes` WHERE `code` = :code LIMIT 1');
        $stmt->execute([':code' => $raw]);
        $rewardRow = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$rewardRow) {
            Http::error(400, 'Código inválido.');
        }
        $lessonId = (string) ($rewardRow['lesson_id'] ?? '');
        if (!isset(GameCatalog::LESSON_CATALOG[$lessonId])) {
            Http::error(410, 'Código vinculado a uma aula desativada.');
        }
        if (self::isCodeExpired($rewardRow)) {
            Http::error(410, 'Código expirado.');
        }

        $singleUse = (bool) ($rewardRow['single_use'] ?? false);
        if ($singleUse && !empty($rewardRow['redeemed_at'])) {
            Http::error(409, 'Código de uso único já foi resgatado.');
        }

        $redeemed = is_array($user['redeemed_codes'] ?? null) ? array_values($user['redeemed_codes']) : [];
        if (in_array($raw, $redeemed, true)) {
            Http::error(409, 'Você já resgatou este código.');
        }

        $nowSql = Database::nowSql();
        if ($singleUse) {
            $claim = $pdo->prepare(
                'UPDATE `redeem_codes`
                 SET `redeemed_at` = :now, `redeemed_by` = :uid
                 WHERE `code` = :code AND `redeemed_at` IS NULL'
            );
            $claim->execute([':now' => $nowSql, ':uid' => $userId, ':code' => $raw]);
            if ($claim->rowCount() === 0) {
                Http::error(409, 'Código de uso único já foi resgatado.');
            }
        }

        $prevXp = (int) ($user['xp'] ?? 0);
        $levelBefore = GameCatalog::levelForXp($prevXp);
        $rewardXp = (int) ($rewardRow['xp'] ?? 0);
        $newXp = $prevXp + $rewardXp;

        $completedLessons = is_array($user['completed_lessons'] ?? null) ? array_values($user['completed_lessons']) : [];
        if (!in_array($lessonId, $completedLessons, true)) {
            $completedLessons[] = $lessonId;
        }
        $redeemed[] = $raw;

        $prevConq = is_array($user['conquistas'] ?? null) ? array_values($user['conquistas']) : [];
        $newAchievements = GameCatalog::recalculateAchievements([
            'xp' => $newXp,
            'completed_lessons' => $completedLessons,
            'conquistas' => $prevConq,
        ]);
        $awardedAchievements = array_values(array_diff($newAchievements, $prevConq));

        $upd = $pdo->prepare(
            'UPDATE `users`
             SET `xp` = :xp, `completed_lessons` = :comp, `redeemed_codes` = :red, `conquistas` = :conq
             WHERE `id` = :id'
        );
        $upd->execute([
            ':xp' => $newXp,
            ':comp' => Database::encodeJsonArray($completedLessons),
            ':red' => Database::encodeJsonArray($redeemed),
            ':conq' => Database::encodeJsonArray($newAchievements),
            ':id' => $userId,
        ]);

        if (!$singleUse) {
            $mark = $pdo->prepare(
                'UPDATE `redeem_codes`
                 SET `redeemed_at` = :now, `redeemed_by` = :uid
                 WHERE `code` = :code AND `redeemed_at` IS NULL'
            );
            $mark->execute([':now' => $nowSql, ':uid' => $userId, ':code' => $raw]);
        }

        $updated = ProgressShared::loadUserById($userId);
        $levelAfter = GameCatalog::levelForXp($newXp);

        Http::json(200, [
            'ok' => true,
            'user' => GameCatalog::sanitizeUser($updated),
            'awarded' => [
                'xp' => $rewardXp,
                'achievements' => $awardedAchievements,
                'achievementDetails' => GameCatalog::mapAchievementDetails($awardedAchievements),
                'lesson' => (string) $rewardRow['lesson_title'],
            ],
            'code' => [
                'code' => (string) $rewardRow['code'],
                'expiresAt' => self::codeExpiresAtIso($rewardRow),
                'singleUse' => $singleUse,
            ],
            'leveledUp' => $levelAfter > $levelBefore,
        ]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function generateCode(array $user, int $userId, array $body): never
    {
        ProgressShared::requireAdmin($user);
        $lessonId = (string) ($body['lessonId'] ?? '');
        $lesson = GameCatalog::LESSON_CATALOG[$lessonId] ?? null;
        if (!$lesson) {
            Http::error(400, 'Aula inválida para geração de código.');
        }

        $ttl = self::normalizeTtlMinutes($body['ttlMinutes'] ?? null);
        $singleUse = !empty($body['singleUse']);
        $pdo = Database::pdo();

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $code = self::generateRandomCode(7);
            $nowMs = (int) round(microtime(true) * 1000);
            $createdAtSql = Database::nowSql($nowMs);
            $expiresAtSql = Database::nowSql($nowMs + $ttl * 60000);
            $createdAtIso = Database::nowIso($nowMs);
            $expiresAtIso = Database::nowIso($nowMs + $ttl * 60000);

            try {
                $stmt = $pdo->prepare(
                    'INSERT INTO `redeem_codes`
                     (`code`, `lesson_id`, `lesson_title`, `xp`, `single_use`, `created_by`, `created_at`, `expires_at`)
                     VALUES (:code, :lid, :ltitle, :xp, :single, :by, :created, :expires)'
                );
                $stmt->execute([
                    ':code' => $code,
                    ':lid' => $lesson['lessonId'],
                    ':ltitle' => $lesson['lessonTitle'],
                    ':xp' => $lesson['xp'],
                    ':single' => $singleUse ? 1 : 0,
                    ':by' => $userId,
                    ':created' => $createdAtSql,
                    ':expires' => $expiresAtSql,
                ]);

                Http::json(201, [
                    'ok' => true,
                    'code' => [
                        'code' => $code,
                        'lessonId' => $lesson['lessonId'],
                        'lessonTitle' => $lesson['lessonTitle'],
                        'xp' => $lesson['xp'],
                        'createdAt' => $createdAtIso,
                        'expiresAt' => $expiresAtIso,
                        'singleUse' => $singleUse,
                        'ttlMinutes' => $ttl,
                    ],
                ]);
            } catch (\PDOException $e) {
                if ((int) ($e->errorInfo[1] ?? 0) === 1062) {
                    continue;
                }
                Http::error(500, 'Falha ao gerar código.');
            }
        }

        Http::error(500, 'Falha ao gerar código único após múltiplas tentativas.');
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function lessonCode(array $body): never
    {
        $lessonId = (string) ($body['lessonId'] ?? '');
        $lesson = GameCatalog::LESSON_CATALOG[$lessonId] ?? null;
        if (!$lesson) {
            Http::error(400, 'Aula inválida.');
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'SELECT * FROM `redeem_codes` WHERE `lesson_id` = :lid ORDER BY `created_at` DESC LIMIT 50'
        );
        $stmt->execute([':lid' => $lessonId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $nowIso = Database::nowIso();
        $latest = null;
        foreach ($rows as $row) {
            $expired = self::isCodeExpired($row, $nowIso);
            $singleUse = (bool) ($row['single_use'] ?? false);
            $used = !empty($row['redeemed_at']);
            if (!$expired && !($singleUse && $used)) {
                $latest = $row;
                break;
            }
        }

        if (!$latest) {
            Http::error(404, 'Nenhum código ativo para esta aula. Peça para um admin gerar no Salão dos Heróis.');
        }

        Http::json(200, [
            'ok' => true,
            'code' => [
                'code' => (string) $latest['code'],
                'lessonId' => (string) $latest['lesson_id'],
                'lessonTitle' => (string) $latest['lesson_title'],
                'xp' => (int) ($latest['xp'] ?? 0),
                'createdAt' => Database::sqlToIso($latest['created_at'] ?? null),
                'expiresAt' => self::codeExpiresAtIso($latest),
                'singleUse' => (bool) ($latest['single_use'] ?? false),
            ],
        ]);
    }

    /**
     * @param array<string, mixed> $user
     */
    public static function listCodes(array $user): never
    {
        ProgressShared::requireAdmin($user);
        $pdo = Database::pdo();
        $stmt = $pdo->query(
            'SELECT `code`, `lesson_id`, `lesson_title`, `xp`, `created_at`, `expires_at`, `redeemed_at`, `redeemed_by`, `single_use`
             FROM `redeem_codes`
             ORDER BY `created_at` DESC
             LIMIT 100'
        );
        $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
        Http::json(200, [
            'ok' => true,
            'codes' => self::normalizeCodesList($rows),
        ]);
    }

    // -------------------------------------------------------------------------
    // Gates, Parágrafos e Visualizações de Aula
    // -------------------------------------------------------------------------

    /**
     * @return array{ok: bool, status: int, body: array<string, mixed>}
     */
    public static function executeLessonView(int $userId, string $lessonId): array
    {
        if (!isset(GameCatalog::LESSON_CATALOG[$lessonId])) {
            return ['ok' => false, 'status' => 400, 'body' => ['ok' => false, 'error' => 'Aula inválida.']];
        }

        $pdo = Database::pdo();
        $nowMs = (int) round(microtime(true) * 1000);
        $nowSql = Database::nowSql($nowMs);
        $nowIso = Database::nowIso($nowMs);

        $sel = $pdo->prepare('SELECT `view_count` FROM `lesson_views` WHERE `user_id` = :uid AND `lesson_id` = :lid LIMIT 1');
        $sel->execute([':uid' => $userId, ':lid' => $lessonId]);
        $existingCount = $sel->fetchColumn();
        $nextCount = ($existingCount !== false ? (int) $existingCount : 0) + 1;

        $ups = $pdo->prepare(
            'INSERT INTO `lesson_views` (`user_id`, `lesson_id`, `first_viewed_at`, `last_viewed_at`, `view_count`)
             VALUES (:uid, :lid, :first, :last, 1)
             ON DUPLICATE KEY UPDATE
               `last_viewed_at` = VALUES(`last_viewed_at`),
               `view_count` = `view_count` + 1'
        );
        $ups->execute([
            ':uid' => $userId,
            ':lid' => $lessonId,
            ':first' => $nowSql,
            ':last' => $nowSql,
        ]);

        return [
            'ok' => true,
            'status' => 200,
            'body' => [
                'ok' => true,
                'lessonId' => $lessonId,
                'viewedAt' => $nowIso,
                'viewCount' => $nextCount,
            ],
        ];
    }

    /**
     * @param array<string, mixed> $user
     * @return array{ok: bool, status: int, body: array<string, mixed>, user?: array<string, mixed>}
     */
    public static function executeLessonParagraph(array $user, int $userId, string $lessonId, string $rawParagraph): array
    {
        if (!isset(GameCatalog::LESSON_CATALOG[$lessonId])) {
            return ['ok' => false, 'status' => 400, 'body' => ['ok' => false, 'error' => 'Aula inválida.']];
        }
        $text = trim($rawParagraph);
        if ($text === '') {
            return ['ok' => false, 'status' => 400, 'body' => ['ok' => false, 'error' => 'Parágrafo vazio.']];
        }

        $pdo = Database::pdo();
        $nowMs = (int) round(microtime(true) * 1000);
        $nowSql = Database::nowSql($nowMs);
        $nowIso = Database::nowIso($nowMs);

        $ups = $pdo->prepare(
            'INSERT INTO `lesson_paragraphs` (`user_id`, `lesson_id`, `paragraph`, `created_at`, `updated_at`)
             VALUES (:uid, :lid, :p, :created, :updated)
             ON DUPLICATE KEY UPDATE
               `paragraph` = VALUES(`paragraph`),
               `updated_at` = VALUES(`updated_at`)'
        );
        $ups->execute([
            ':uid' => $userId,
            ':lid' => $lessonId,
            ':p' => $text,
            ':created' => $nowSql,
            ':updated' => $nowSql,
        ]);

        $activity = GameCatalog::ACTIVITY_CATALOG["{$lessonId}_gdd"] ?? null;
        $existingAchievements = is_array($user['conquistas'] ?? null) ? array_values($user['conquistas']) : [];
        $activityAlreadyAwarded = $activity && in_array($activity['achievementId'], $existingAchievements, true);

        $awardedAchievementIds = [];
        $awardedXp = 0;

        if ($activity && !$activityAlreadyAwarded) {
            $awardedAchievementIds[] = $activity['achievementId'];
            $catXp = GameCatalog::getAchievementXp($activity['achievementId']);
            $awardedXp += $catXp > 0 ? $catXp : (int) $activity['xp'];
        }

        $secretAwards = AchievementsEvaluator::evaluateLessonSecrets($lessonId, $text, $existingAchievements);
        foreach ($secretAwards as $secret) {
            if (!in_array($secret['id'], $awardedAchievementIds, true)) {
                $awardedAchievementIds[] = $secret['id'];
                $awardedXp += GameCatalog::getAchievementXp($secret['id']) ?: (int) $secret['xp'];
            }
        }

        $updatedUser = $user;
        $awarded = null;

        if ($awardedAchievementIds !== [] || $awardedXp > 0) {
            $conquistas = $existingAchievements;
            foreach ($awardedAchievementIds as $id) {
                if (!in_array($id, $conquistas, true)) {
                    $conquistas[] = $id;
                }
            }
            $xpNext = (int) ($user['xp'] ?? 0) + $awardedXp;
            $upd = $pdo->prepare('UPDATE `users` SET `xp` = :xp, `conquistas` = :conq WHERE `id` = :id');
            $upd->execute([
                ':xp' => $xpNext,
                ':conq' => Database::encodeJsonArray($conquistas),
                ':id' => $userId,
            ]);
            $updatedUser = ProgressShared::loadUserById($userId) ?? array_merge($user, [
                'xp' => $xpNext,
                'conquistas' => $conquistas,
            ]);
            $awarded = [
                'xp' => $awardedXp,
                'achievements' => $awardedAchievementIds,
                'achievementDetails' => GameCatalog::mapAchievementDetails($awardedAchievementIds),
            ];
        }

        return [
            'ok' => true,
            'status' => 200,
            'user' => $updatedUser,
            'body' => [
                'ok' => true,
                'lessonId' => $lessonId,
                'paragraph' => $text,
                'updatedAt' => $nowIso,
                'user' => GameCatalog::sanitizeUser($updatedUser),
                'awarded' => $awarded,
            ],
        ];
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function lessonGates(array $body): never
    {
        $lessonId = (string) ($body['lessonId'] ?? '');
        if (!ProgressShared::isGateableLessonId($lessonId)) {
            Http::error(400, 'Aula inválida.');
        }

        $gates = ProgressShared::defaultGatesForLesson($lessonId);
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT `gate_key`, `released` FROM `lesson_gates` WHERE `lesson_id` = :lid');
        $stmt->execute([':lid' => $lessonId]);

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $key = (string) ($row['gate_key'] ?? '');
            if ($key === 'published' || array_key_exists($key, $gates)) {
                $gates[$key] = (bool) $row['released'];
            }
        }

        Http::json(200, [
            'ok' => true,
            'lessonId' => $lessonId,
            'gates' => $gates,
        ]);
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function lessonGatesBatch(array $body): never
    {
        $rawIds = is_array($body['lessonIds'] ?? null) ? $body['lessonIds'] : [];
        $requested = $rawIds !== []
            ? array_values(array_filter(array_map('strval', $rawIds)))
            : array_merge(array_keys(GameCatalog::LESSON_CATALOG), ['despertar']);

        $ids = [];
        foreach ($requested as $id) {
            if (ProgressShared::isGateableLessonId($id) && !in_array($id, $ids, true)) {
                $ids[] = $id;
            }
        }
        if ($ids === []) {
            Http::error(400, 'Nenhuma aula válida no lote.');
        }

        $gatesByLesson = [];
        foreach ($ids as $id) {
            $gatesByLesson[$id] = ProgressShared::defaultGatesForLesson($id);
        }

        $placeholders = implode(', ', array_fill(0, count($ids), '?'));
        $pdo = Database::pdo();
        $stmt = $pdo->prepare("SELECT `lesson_id`, `gate_key`, `released` FROM `lesson_gates` WHERE `lesson_id` IN ({$placeholders})");
        $stmt->execute($ids);

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $id = (string) ($row['lesson_id'] ?? '');
            $key = (string) ($row['gate_key'] ?? '');
            if (isset($gatesByLesson[$id]) && ($key === 'published' || array_key_exists($key, $gatesByLesson[$id]))) {
                $gatesByLesson[$id][$key] = (bool) $row['released'];
            }
        }

        Http::json(200, ['ok' => true, 'gates' => $gatesByLesson]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function setLessonGate(array $user, int $userId, array $body): never
    {
        ProgressShared::requireAdmin($user);
        $lessonId = (string) ($body['lessonId'] ?? '');
        $gateKey = (string) ($body['gateKey'] ?? '');
        $defaults = ProgressShared::defaultGatesForLesson($lessonId);

        if (!ProgressShared::isGateableLessonId($lessonId)) {
            Http::error(400, 'Aula inválida.');
        }
        if (!array_key_exists($gateKey, $defaults)) {
            Http::error(400, 'Chave de censura inválida para esta aula.');
        }

        $releaseValue = !empty($body['released']);
        $nowSql = Database::nowSql();
        $pdo = Database::pdo();

        $ups = $pdo->prepare(
            'INSERT INTO `lesson_gates` (`lesson_id`, `gate_key`, `released`, `released_by`, `released_at`, `updated_at`)
             VALUES (:lid, :gkey, :rel, :by, :rel_at, :upd)
             ON DUPLICATE KEY UPDATE
               `released` = VALUES(`released`),
               `released_by` = VALUES(`released_by`),
               `released_at` = VALUES(`released_at`),
               `updated_at` = VALUES(`updated_at`)'
        );
        $ups->execute([
            ':lid' => $lessonId,
            ':gkey' => $gateKey,
            ':rel' => $releaseValue ? 1 : 0,
            ':by' => $userId,
            ':rel_at' => $releaseValue ? $nowSql : null,
            ':upd' => $nowSql,
        ]);

        self::lessonGates(['lessonId' => $lessonId]);
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function getLessonParagraph(int $userId, array $body): never
    {
        $lessonId = (string) ($body['lessonId'] ?? '');
        if (!isset(GameCatalog::LESSON_CATALOG[$lessonId])) {
            Http::error(400, 'Aula inválida.');
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'SELECT `paragraph`, `updated_at` FROM `lesson_paragraphs`
             WHERE `lesson_id` = :lid AND `user_id` = :uid LIMIT 1'
        );
        $stmt->execute([':lid' => $lessonId, ':uid' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        Http::json(200, [
            'ok' => true,
            'lessonId' => $lessonId,
            'paragraph' => $row ? (string) ($row['paragraph'] ?? '') : '',
            'updatedAt' => $row ? Database::sqlToIso($row['updated_at'] ?? null) : null,
        ]);
    }

    public static function listMyLessonParagraphs(int $userId): never
    {
        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'SELECT `lesson_id`, `paragraph`, `created_at`, `updated_at`
             FROM `lesson_paragraphs`
             WHERE `user_id` = :uid
             ORDER BY `updated_at` DESC'
        );
        $stmt->execute([':uid' => $userId]);
        $activities = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $lid = (string) ($row['lesson_id'] ?? '');
            $p = trim((string) ($row['paragraph'] ?? ''));
            if ($lid === '' || $p === '' || !isset(GameCatalog::LESSON_CATALOG[$lid])) {
                continue;
            }
            $activities[] = [
                'lessonId' => $lid,
                'paragraph' => $p,
                'createdAt' => Database::sqlToIso($row['created_at'] ?? null),
                'updatedAt' => Database::sqlToIso($row['updated_at'] ?? null),
            ];
        }

        Http::json(200, ['ok' => true, 'activities' => $activities]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function saveLessonParagraph(array $user, int $userId, array $body): never
    {
        $res = self::executeLessonParagraph(
            $user,
            $userId,
            (string) ($body['lessonId'] ?? ''),
            (string) ($body['paragraph'] ?? '')
        );
        Http::json($res['status'], $res['body']);
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function lessonView(int $userId, array $body): never
    {
        $res = self::executeLessonView($userId, (string) ($body['lessonId'] ?? ''));
        Http::json($res['status'], $res['body']);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function lessonEventsBatch(array $user, int $userId, array $body): never
    {
        if (!isset($body['events']) || !is_array($body['events'])) {
            Http::error(400, 'events deve ser um array.');
        }
        $rawEvents = array_values($body['events']);
        if ($rawEvents === []) {
            Http::json(200, ['ok' => true, 'results' => []]);
        }
        if (count($rawEvents) > self::LESSON_EVENTS_BATCH_MAX) {
            Http::error(400, 'No máximo ' . self::LESSON_EVENTS_BATCH_MAX . ' eventos por batch.');
        }

        $workingUser = $user;
        $results = [];

        foreach ($rawEvents as $index => $event) {
            if (!is_array($event)) {
                $event = [];
            }
            $type = (string) ($event['type'] ?? '');
            if ($type === 'lessonView') {
                $res = self::executeLessonView($userId, (string) ($event['lessonId'] ?? ''));
                $item = ['ok' => $res['ok'], 'index' => $index, 'type' => $type];
                if (!$res['ok']) {
                    $item['error'] = $res['body']['error'] ?? 'Erro';
                } else {
                    $item['lessonId'] = $res['body']['lessonId'];
                    $item['viewedAt'] = $res['body']['viewedAt'];
                    $item['viewCount'] = $res['body']['viewCount'];
                }
                $results[] = $item;
            } elseif ($type === 'lessonParagraph') {
                $res = self::executeLessonParagraph(
                    $workingUser,
                    $userId,
                    (string) ($event['lessonId'] ?? ''),
                    (string) ($event['paragraph'] ?? '')
                );
                if ($res['ok'] && isset($res['user'])) {
                    $workingUser = $res['user'];
                }
                $item = ['ok' => $res['ok'], 'index' => $index, 'type' => $type];
                if (!$res['ok']) {
                    $item['error'] = $res['body']['error'] ?? 'Erro';
                } else {
                    $item['lessonId'] = $res['body']['lessonId'];
                    $item['paragraph'] = $res['body']['paragraph'];
                    $item['updatedAt'] = $res['body']['updatedAt'];
                    $item['user'] = $res['body']['user'];
                    $item['awarded'] = $res['body']['awarded'];
                }
                $results[] = $item;
            } else {
                $results[] = [
                    'ok' => false,
                    'index' => $index,
                    'type' => $type !== '' ? $type : null,
                    'error' => 'Tipo de evento inválido.',
                ];
            }
        }

        Http::json(200, ['ok' => true, 'results' => $results]);
    }

    // -------------------------------------------------------------------------
    // ARG do Submundo (Portão + 8 Salas)
    // -------------------------------------------------------------------------

    private static function stripAccentsAscii(string $value): string
    {
        return strtr($value, [
            'á' => 'a', 'à' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a',
            'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
            'í' => 'i', 'ì' => 'i', 'î' => 'i', 'ï' => 'i',
            'ó' => 'o', 'ò' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o',
            'ú' => 'u', 'ù' => 'u', 'û' => 'u', 'ü' => 'u',
            'ç' => 'c',
            'Á' => 'a', 'À' => 'a', 'Â' => 'a', 'Ã' => 'a', 'Ä' => 'a',
            'É' => 'e', 'È' => 'e', 'Ê' => 'e', 'Ë' => 'e',
            'Í' => 'i', 'Ì' => 'i', 'Î' => 'i', 'Ï' => 'i',
            'Ó' => 'o', 'Ò' => 'o', 'Ô' => 'o', 'Õ' => 'o', 'Ö' => 'o',
            'Ú' => 'u', 'Ù' => 'u', 'Û' => 'u', 'Ü' => 'u',
            'Ç' => 'c',
        ]);
    }

    /**
     * Gera retângulos [x, y, w, h] para a inscrição submersa do Rio Cócito
     * a partir da constante no servidor, embaralhados para não expor ordem de glifos.
     *
     * @return array<int, array{0:int,1:int,2:int,3:int}>
     */
    private static function buildCocitoMirrorSpans(): array
    {
        $glyphs = [
            'C' => [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
            'O' => [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
            'Y' => [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
            'T' => [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
            'U' => [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
            'S' => [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
            '_' => [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b11111],
            'R' => [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
            'E' => [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
            'F' => [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
            'L' => [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
            'I' => [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
            'N' => [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
            '4' => [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
            '0' => [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
        ];

        $text = ProgressShared::UNDERWORLD_COCITO_PASS;
        $len = strlen($text);
        $scaleX = 4;
        $scaleY = 5;
        $advance = 6 * $scaleX;
        $totalW = $len * $advance - $scaleX;
        $startX = (int) floor((640 - $totalW) / 2);
        $startY = (int) floor((220 - 7 * $scaleY) / 2);

        $spans = [];
        for ($i = 0; $i < $len; $i++) {
            $ch = $text[$i];
            $rows = $glyphs[$ch] ?? null;
            if (!$rows) {
                continue;
            }
            $charX = $startX + $i * $advance;
            for ($row = 0; $row < 7; $row++) {
                $bits = $rows[$row];
                $col = 0;
                while ($col < 5) {
                    if ((($bits >> (4 - $col)) & 1) === 0) {
                        $col++;
                        continue;
                    }
                    $runStart = $col;
                    while ($col < 5 && ((($bits >> (4 - $col)) & 1) === 1)) {
                        $col++;
                    }
                    $runCols = $col - $runStart;
                    $spans[] = [
                        $charX + $runStart * $scaleX,
                        $startY + $row * $scaleY,
                        $runCols * $scaleX,
                        $scaleY,
                    ];
                }
            }
        }

        usort($spans, static function (array $a, array $b): int {
            $ha = (($a[1] * 37) + ($a[0] * 73) + ($a[2] * 19)) % 997;
            $hb = (($b[1] * 37) + ($b[0] * 73) + ($b[2] * 19)) % 997;
            return $ha <=> $hb;
        });

        return $spans;
    }

    /**
     * Valida todas as etapas do ARG no servidor sem expor senhas nem URLs no JS cliente.
     *
     * @param array<string, mixed>|null $user
     * @param array<string, mixed> $body
     */
    public static function underworldStep(?array $user, array $body): never
    {
        $stage = strtolower(trim((string) ($body['stage'] ?? '')));
        $rawPass = (string) ($body['pass'] ?? '');

        switch ($stage) {
            case 'gate': {
                $norm = strtolower(trim(self::stripAccentsAscii($rawPass)));
                $normSpaces = (string) preg_replace('/[\s\-]+/', ' ', $norm);
                $normHyphen = (string) preg_replace('/[\s\-]+/', '-', $norm);
                $ok = in_array($normSpaces, ProgressShared::UNDERWORLD_GATE_PASSES, true)
                    || in_array($normHyphen, ProgressShared::UNDERWORLD_GATE_PASSES, true);

                if (!$ok) {
                    Http::json(200, [
                        'ok' => false,
                        'message' => 'O Cérbero não reconhece essa voz.',
                    ]);
                }
                Http::json(200, [
                    'ok' => true,
                    'nextPath' => ProgressShared::UNDERWORLD_NEXT_PATHS['gate'],
                    'message' => 'O portão cede…',
                ]);
            }

            case 'tartaro': {
                $norm = strtoupper(trim($rawPass));
                if ($norm !== ProgressShared::UNDERWORLD_TARTARO_PASS) {
                    Http::json(200, [
                        'ok' => false,
                        'message' => 'As runas ainda dormem.',
                    ]);
                }
                Http::json(200, [
                    'ok' => true,
                    'nextPath' => ProgressShared::UNDERWORLD_NEXT_PATHS['tartaro'],
                    'message' => 'O abismo cede…',
                ]);
            }

            case 'asfodelos': {
                $norm = (string) preg_replace('/\s+/', '_', strtoupper(trim($rawPass)));
                if ($norm !== ProgressShared::UNDERWORLD_ASFODELOS_PASS) {
                    Http::json(200, [
                        'ok' => false,
                        'message' => 'O eco ainda é só chiado.',
                    ]);
                }
                Http::json(200, [
                    'ok' => true,
                    'nextPath' => ProgressShared::UNDERWORLD_NEXT_PATHS['asfodelos'],
                    'message' => 'O caminho se abre entre as flores pálidas…',
                ]);
            }

            case 'hecate': {
                $norm = (string) preg_replace('/\s+/', '_', strtoupper(trim($rawPass)));
                if ($norm !== ProgressShared::UNDERWORLD_HECATE_PASS) {
                    Http::json(200, [
                        'ok' => false,
                        'message' => 'A relíquia ainda guarda silêncio.',
                    ]);
                }
                Http::json(200, [
                    'ok' => true,
                    'nextPath' => ProgressShared::UNDERWORLD_NEXT_PATHS['hecate'],
                    'message' => 'As três vias se alinham…',
                ]);
            }

            case 'elisios': {
                $norm = trim($rawPass);
                if ($norm !== ProgressShared::UNDERWORLD_ELISIOS_PASS) {
                    Http::json(200, [
                        'ok' => false,
                        'message' => 'Os juízes permanecem mudos.',
                    ]);
                }
                Http::json(200, [
                    'ok' => true,
                    'nextPath' => ProgressShared::UNDERWORLD_NEXT_PATHS['elisios'],
                    'message' => 'Os juízes se calam. O jardim chama…',
                ]);
            }

            case 'persefone_claim': {
                $role = strtolower(trim(self::stripAccentsAscii((string) ($body['role'] ?? ''))));
                $seeds = trim((string) ($body['seeds'] ?? ''));
                $roleOk = in_array($role, ProgressShared::UNDERWORLD_PERSEFONE_ROLES, true);
                $seedsOk = $seeds === ProgressShared::UNDERWORLD_PERSEFONE_SEEDS;

                if (!$roleOk || !$seedsOk) {
                    Http::json(200, [
                        'ok' => false,
                        'message' => 'Ainda és mortal neste jardim.',
                        'whisper' => 'O trono rejeita quem ainda não provou das sementes nem reivindicou o consórcio.',
                    ]);
                }
                Http::json(200, [
                    'ok' => true,
                    'seal' => ProgressShared::UNDERWORLD_PERSEFONE_PASS,
                    'message' => 'Selo revelado: ' . ProgressShared::UNDERWORLD_PERSEFONE_PASS,
                    'whisper' => 'O jardim cede. O selo do trono desperta.',
                ]);
            }

            case 'persefone': {
                $norm = (string) preg_replace('/\s+/', '_', strtoupper(trim($rawPass)));
                if ($norm !== ProgressShared::UNDERWORLD_PERSEFONE_PASS) {
                    Http::json(200, [
                        'ok' => false,
                        'message' => 'Ainda és mortal neste jardim.',
                    ]);
                }
                Http::json(200, [
                    'ok' => true,
                    'nextPath' => ProgressShared::UNDERWORLD_NEXT_PATHS['persefone'],
                    'message' => 'As romãs abrem o caminho…',
                ]);
            }

            case 'observatorio': {
                $lat = isset($body['lat']) && is_numeric($body['lat']) ? (float) $body['lat'] : null;
                $lng = isset($body['lng']) && is_numeric($body['lng']) ? (float) $body['lng'] : null;

                $text = trim(self::stripAccentsAscii($rawPass));
                $tokenNorm = (string) preg_replace('/\s+/', '_', strtoupper(str_replace(';', ',', $text)));
                $tokenOk = in_array($tokenNorm, ProgressShared::UNDERWORLD_OBSERVATORIO_TOKENS, true);

                if (!$tokenOk && ($lat === null || $lng === null) && $text !== '') {
                    if (preg_match('/(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)/', $text, $m)) {
                        $lat = (float) $m[1];
                        $lng = (float) $m[2];
                    }
                }

                $coordsOk = $lat !== null
                    && $lng !== null
                    && abs($lat - ProgressShared::UNDERWORLD_OBSERVATORIO_LAT) <= ProgressShared::UNDERWORLD_OBSERVATORIO_TOLERANCE
                    && abs($lng - ProgressShared::UNDERWORLD_OBSERVATORIO_LNG) <= ProgressShared::UNDERWORLD_OBSERVATORIO_TOLERANCE;

                if (!$tokenOk && !$coordsOk) {
                    Http::json(200, [
                        'ok' => false,
                        'message' => 'Hélio ainda não aponta o portal.',
                    ]);
                }

                Http::json(200, [
                    'ok' => true,
                    'nextPath' => ProgressShared::UNDERWORLD_NEXT_PATHS['observatorio'],
                    'message' => 'Hélio aponta o portal. O espelho aguarda…',
                ]);
            }

            case 'cocito_mirror': {
                Http::json(200, [
                    'ok' => true,
                    'width' => 640,
                    'height' => 220,
                    'spans' => self::buildCocitoMirrorSpans(),
                ]);
            }

            case 'cocito': {
                $norm = (string) preg_replace('/\s+/', '_', strtoupper(trim($rawPass)));
                if ($norm !== ProgressShared::UNDERWORLD_COCITO_PASS) {
                    Http::json(200, [
                        'ok' => false,
                        'message' => 'O lamento ainda é negro.',
                    ]);
                }
                Http::json(200, [
                    'ok' => true,
                    'nextPath' => ProgressShared::UNDERWORLD_NEXT_PATHS['cocito'],
                    'message' => 'A runa emerge. O Estige chama…',
                ]);
            }

            default:
                Http::error(400, 'Etapa desconhecida.');
        }
    }

    public static function underworldJudgment(): never
    {
        Http::json(200, [
            'ok' => true,
            'status' => 'denied',
            'message' => 'Acesso Negado pelos Juízes',
            'oracle_token' => ProgressShared::UNDERWORLD_ORACLE_TOKEN,
            'echo' => 'O oráculo murmura em língua que os mortais não leem à vista.',
        ]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function underworldRedeem(array $user, int $userId, array $body): never
    {
        $rl = RateLimiter::consumeGame('underworld_redeem', $userId);
        if ($rl['limited']) {
            RateLimiter::applyRetryAfterHeader($rl);
            Http::error(429, 'Demasiadas oferendas. Aguarde um momento.');
        }

        $hash = strtolower(trim((string) ($body['submittedHash'] ?? '')));
        if ($hash === '') {
            Http::error(400, 'Óbolo ausente.');
        }
        if ($hash !== ProgressShared::UNDERWORLD_ESTIGE_HASH) {
            Http::error(400, 'Tributo insuficiente.');
        }

        $existing = is_array($user['conquistas'] ?? null) ? array_values($user['conquistas']) : [];
        if (in_array(ProgressShared::UNDERWORLD_SOBERANO_ID, $existing, true)) {
            Http::json(200, [
                'ok' => true,
                'alreadyOwned' => true,
                'awarded' => ['xp' => 0, 'achievements' => [], 'achievementDetails' => []],
                'user' => GameCatalog::sanitizeUser($user),
            ]);
        }

        $res = ProgressShared::awardAchievementIds($user, [ProgressShared::UNDERWORLD_SOBERANO_ID]);
        Http::json(200, [
            'ok' => true,
            'alreadyOwned' => false,
            'awarded' => $res['awarded'],
            'user' => GameCatalog::sanitizeUser($res['user']),
            'leveledUp' => $res['leveledUp'],
        ]);
    }
}
