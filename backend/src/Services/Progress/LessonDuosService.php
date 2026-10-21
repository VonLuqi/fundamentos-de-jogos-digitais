<?php
declare(strict_types=1);

namespace App\Services\Progress;

use App\Core\Database;
use App\Core\GameCatalog;
use App\Core\Http;
use PDO;

/**
 * Serviços de Duplas de Aula e Diário de Jogo (`api/_lib/progress/lesson-duos.js`).
 */
final class LessonDuosService
{
    public const VALID_DUO_ROLES = ['player', 'observer', 'coauthor'];
    public const VALID_JOURNAL_PLATFORMS = ['Analogico', 'PC', 'Mobile', 'Console', 'Web', 'Outro'];
    public const JOURNAL_NAME_MAX = 120;
    public const JOURNAL_TEXT_MAX = 4000;

    private static function requireDuoLessonOrAbort(string $lessonId): string
    {
        $id = trim($lessonId);
        if (!isset(GameCatalog::LESSON_CATALOG[$id])) {
            Http::error(400, 'Aula inválida.');
        }
        return $id;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private static function listUserLessonDuos(int $userId, string $lessonId): array
    {
        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'SELECT `id`, `lesson_id`, `requester_id`, `addressee_id`, `status`,
                    `requester_role`, `addressee_role`, `created_at`, `updated_at`
             FROM `lesson_duos`
             WHERE `lesson_id` = :lid AND (`requester_id` = :u1 OR `addressee_id` = :u2)
             ORDER BY `updated_at` DESC'
        );
        $stmt->execute([':lid' => $lessonId, ':u1' => $userId, ':u2' => $userId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['id'] = (int) $r['id'];
            $r['requester_id'] = (int) $r['requester_id'];
            $r['addressee_id'] = (int) $r['addressee_id'];
        }
        return $rows;
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function findAcceptedLessonDuo(int $userId, string $lessonId): ?array
    {
        foreach (self::listUserLessonDuos($userId, $lessonId) as $row) {
            if (($row['status'] ?? '') === 'accepted') {
                return $row;
            }
        }
        return null;
    }

    /**
     * @param array<string, mixed>|null $duo
     */
    private static function resolveMyDuoRole(?array $duo, int $userId): string
    {
        if (!$duo) {
            return 'coauthor';
        }
        if ((int) ($duo['requester_id'] ?? 0) === $userId) {
            return (string) (($duo['requester_role'] ?? '') ?: 'coauthor');
        }
        if ((int) ($duo['addressee_id'] ?? 0) === $userId) {
            return (string) (($duo['addressee_role'] ?? '') ?: 'coauthor');
        }
        return 'coauthor';
    }

    /**
     * @param array<string, mixed> $duo
     * @param array<string, mixed>|null $partnerRow
     * @return array<string, mixed>|null
     */
    private static function toDuoDto(array $duo, int $viewerId, ?array $partnerRow): ?array
    {
        if (!$partnerRow) {
            return null;
        }
        $isRequester = (int) ($duo['requester_id'] ?? 0) === $viewerId;
        return [
            'duoId' => (int) $duo['id'],
            'lessonId' => (string) $duo['lesson_id'],
            'status' => (string) $duo['status'],
            'direction' => $isRequester ? 'outgoing' : 'incoming',
            'myRole' => $isRequester
                ? (string) (($duo['requester_role'] ?? '') ?: 'coauthor')
                : (string) (($duo['addressee_role'] ?? '') ?: 'coauthor'),
            'partnerRole' => $isRequester
                ? (string) (($duo['addressee_role'] ?? '') ?: 'coauthor')
                : (string) (($duo['requester_role'] ?? '') ?: 'coauthor'),
            'partner' => ProgressShared::toFriendCard($partnerRow),
            'createdAt' => Database::sqlToIso($duo['created_at'] ?? null),
            'updatedAt' => Database::sqlToIso($duo['updated_at'] ?? null),
        ];
    }

    /**
     * @param array<string, mixed>|null $row
     * @return array<string, mixed>
     */
    private static function toJournalDto(?array $row, string $lessonId): array
    {
        if (!$row) {
            return [
                'id' => null,
                'lessonId' => $lessonId,
                'duoId' => null,
                'ownerUserId' => null,
                'mode' => 'solo',
                'gameName' => '',
                'platform' => '',
                'genre' => '',
                'firstImpression' => '',
                'mechanicsObserved' => '',
                'aestheticSoundNotes' => '',
                'finalVerdict' => '',
                'rating' => null,
                'finalizedAt' => null,
                'updatedBy' => null,
                'updatedAt' => null,
            ];
        }
        return [
            'id' => (int) $row['id'],
            'lessonId' => (string) ($row['lesson_id'] ?? $lessonId),
            'duoId' => isset($row['duo_id']) ? (int) $row['duo_id'] : null,
            'ownerUserId' => isset($row['owner_user_id']) ? (int) $row['owner_user_id'] : null,
            'mode' => !empty($row['duo_id']) ? 'duo' : 'solo',
            'gameName' => (string) ($row['game_name'] ?? ''),
            'platform' => (string) ($row['platform'] ?? ''),
            'genre' => (string) ($row['genre'] ?? ''),
            'firstImpression' => (string) ($row['first_impression'] ?? ''),
            'mechanicsObserved' => (string) ($row['mechanics_observed'] ?? ''),
            'aestheticSoundNotes' => (string) ($row['aesthetic_sound_notes'] ?? ''),
            'finalVerdict' => (string) ($row['final_verdict'] ?? ''),
            'rating' => isset($row['rating']) && is_numeric($row['rating']) ? (int) $row['rating'] : null,
            'finalizedAt' => Database::sqlToIso($row['finalized_at'] ?? null),
            'updatedBy' => isset($row['updated_by']) ? (int) $row['updated_by'] : null,
            'updatedAt' => Database::sqlToIso($row['updated_at'] ?? null),
        ];
    }

    /**
     * @return array{duo: array<string, mixed>|null, journal: array<string, mixed>|null}
     */
    private static function loadEffectiveJournalRow(int $userId, string $lessonId): array
    {
        $duo = self::findAcceptedLessonDuo($userId, $lessonId);
        $pdo = Database::pdo();

        if ($duo) {
            $stmt = $pdo->prepare(
                'SELECT * FROM `lesson_journals` WHERE `lesson_id` = :lid AND `duo_id` = :did LIMIT 1'
            );
            $stmt->execute([':lid' => $lessonId, ':did' => $duo['id']]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return ['duo' => $duo, 'journal' => $row ?: null];
        }

        $stmt = $pdo->prepare(
            'SELECT * FROM `lesson_journals`
             WHERE `lesson_id` = :lid AND `owner_user_id` = :uid AND `duo_id` IS NULL
             LIMIT 1'
        );
        $stmt->execute([':lid' => $lessonId, ':uid' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return ['duo' => null, 'journal' => $row ?: null];
    }

    /**
     * @param array<string, mixed> $body
     * @param array<string, mixed>|null $existingRow
     * @return array<string, mixed>
     */
    private static function sanitizeJournalFields(array $body, ?array $existingRow): array
    {
        $pickStr = static function (string $key, string $col, int $max) use ($body, $existingRow): string {
            if (array_key_exists($key, $body)) {
                $val = is_string($body[$key]) ? trim($body[$key]) : '';
                return mb_substr($val, 0, $max, 'UTF-8');
            }
            return (string) ($existingRow[$col] ?? '');
        };

        $platform = array_key_exists('platform', $body)
            ? (is_string($body['platform']) ? trim($body['platform']) : '')
            : (string) ($existingRow['platform'] ?? '');
        $validPlatform = in_array($platform, self::VALID_JOURNAL_PLATFORMS, true) ? $platform : '';

        $rating = isset($existingRow['rating']) && is_numeric($existingRow['rating'])
            ? (int) $existingRow['rating']
            : null;
        if (array_key_exists('rating', $body)) {
            if ($body['rating'] === null || $body['rating'] === '') {
                $rating = null;
            } else {
                $n = (int) $body['rating'];
                if ($n >= 1 && $n <= 5) {
                    $rating = $n;
                }
            }
        }

        return [
            'game_name' => $pickStr('gameName', 'game_name', self::JOURNAL_NAME_MAX),
            'platform' => $validPlatform,
            'genre' => $pickStr('genre', 'genre', self::JOURNAL_NAME_MAX),
            'first_impression' => $pickStr('firstImpression', 'first_impression', self::JOURNAL_TEXT_MAX),
            'mechanics_observed' => $pickStr('mechanicsObserved', 'mechanics_observed', self::JOURNAL_TEXT_MAX),
            'aesthetic_sound_notes' => $pickStr('aestheticSoundNotes', 'aesthetic_sound_notes', self::JOURNAL_TEXT_MAX),
            'final_verdict' => $pickStr('finalVerdict', 'final_verdict', self::JOURNAL_TEXT_MAX),
            'rating' => $rating,
        ];
    }

    /**
     * @param array<string, mixed> $fields
     */
    private static function isJournalCompleteForFinalize(array $fields): bool
    {
        $hasName = strlen(trim((string) ($fields['game_name'] ?? ''))) >= 2;
        $hasFirst = strlen(trim((string) ($fields['first_impression'] ?? ''))) >= 10;
        $hasMech = strlen(trim((string) ($fields['mechanics_observed'] ?? ''))) >= 10;
        $hasVerdict = strlen(trim((string) ($fields['final_verdict'] ?? ''))) >= 10;
        $r = $fields['rating'] ?? null;
        $hasRating = is_int($r) && $r >= 1 && $r <= 5;
        return $hasName && $hasFirst && $hasMech && $hasVerdict && $hasRating;
    }

    /**
     * @param array<string, mixed> $duoRow
     */
    private static function seedDuoJournalFromSoloDrafts(array $duoRow): void
    {
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT * FROM `lesson_journals` WHERE `lesson_id` = :lid AND `duo_id` = :did LIMIT 1');
        $stmt->execute([':lid' => $duoRow['lesson_id'], ':did' => $duoRow['id']]);
        if ($stmt->fetch(PDO::FETCH_ASSOC)) {
            return;
        }

        $solosStmt = $pdo->prepare(
            'SELECT * FROM `lesson_journals`
             WHERE `lesson_id` = :lid AND `duo_id` IS NULL AND `owner_user_id` IN (:r, :a)
             ORDER BY `updated_at` DESC'
        );
        $solosStmt->execute([
            ':lid' => $duoRow['lesson_id'],
            ':r' => $duoRow['requester_id'],
            ':a' => $duoRow['addressee_id'],
        ]);
        $solos = $solosStmt->fetchAll(PDO::FETCH_ASSOC);

        $seed = null;
        foreach ($solos as $row) {
            $nonEmpty = trim((string) ($row['game_name'] ?? '')) !== ''
                || trim((string) ($row['first_impression'] ?? '')) !== ''
                || trim((string) ($row['mechanics_observed'] ?? '')) !== ''
                || trim((string) ($row['aesthetic_sound_notes'] ?? '')) !== ''
                || trim((string) ($row['final_verdict'] ?? '')) !== '';
            if ($nonEmpty) {
                $seed = $row;
                break;
            }
        }
        if (!$seed) {
            return;
        }

        $nowSql = Database::nowSql();
        $ins = $pdo->prepare(
            'INSERT INTO `lesson_journals`
             (`lesson_id`, `duo_id`, `owner_user_id`, `game_name`, `platform`, `genre`,
              `first_impression`, `mechanics_observed`, `aesthetic_sound_notes`, `final_verdict`,
              `rating`, `updated_by`, `created_at`, `updated_at`)
             VALUES (:lid, :did, NULL, :gn, :pl, :ge, :fi, :mo, :as_notes, :fv, :rt, :ub, :ca, :ua)'
        );
        $ins->execute([
            ':lid' => $duoRow['lesson_id'],
            ':did' => $duoRow['id'],
            ':gn' => $seed['game_name'] ?? '',
            ':pl' => $seed['platform'] ?? '',
            ':ge' => $seed['genre'] ?? '',
            ':fi' => $seed['first_impression'] ?? '',
            ':mo' => $seed['mechanics_observed'] ?? '',
            ':as_notes' => $seed['aesthetic_sound_notes'] ?? '',
            ':fv' => $seed['final_verdict'] ?? '',
            ':rt' => $seed['rating'] ?? null,
            ':ub' => $seed['updated_by'] ?? $duoRow['requester_id'],
            ':ca' => $nowSql,
            ':ua' => $nowSql,
        ]);
    }

    // -------------------------------------------------------------------------
    // Endpoints Públicos
    // -------------------------------------------------------------------------

    /**
     * @param array<string, mixed> $body
     */
    public static function lessonDuoList(int $userId, array $body): never
    {
        $lessonId = self::requireDuoLessonOrAbort((string) ($body['lessonId'] ?? ''));
        $duos = self::listUserLessonDuos($userId, $lessonId);

        $partnerIds = [];
        foreach ($duos as $d) {
            $partnerIds[] = ((int) $d['requester_id'] === $userId) ? (int) $d['addressee_id'] : (int) $d['requester_id'];
        }

        $pdo = Database::pdo();
        $fStmt = $pdo->prepare(
            'SELECT `requester_id`, `addressee_id` FROM `friendships`
             WHERE `status` = \'accepted\' AND (`requester_id` = :u1 OR `addressee_id` = :u2)'
        );
        $fStmt->execute([':u1' => $userId, ':u2' => $userId]);
        $friendIds = [];
        foreach ($fStmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $friendIds[] = ((int) $r['requester_id'] === $userId) ? (int) $r['addressee_id'] : (int) $r['requester_id'];
        }

        $usersById = ProgressShared::fetchUsersByIds(array_merge($partnerIds, $friendIds));

        $activeDuo = null;
        $incoming = [];
        $outgoing = [];

        foreach ($duos as $row) {
            $otherId = ((int) $row['requester_id'] === $userId) ? (int) $row['addressee_id'] : (int) $row['requester_id'];
            $dto = self::toDuoDto($row, $userId, $usersById[$otherId] ?? null);
            if (!$dto) {
                continue;
            }
            if ($row['status'] === 'accepted' && !$activeDuo) {
                $activeDuo = $dto;
            } elseif ($row['status'] === 'pending') {
                if ((int) $row['addressee_id'] === $userId) {
                    $incoming[] = $dto;
                } else {
                    $outgoing[] = $dto;
                }
            }
        }

        $busyUserIds = [];
        if ($friendIds !== []) {
            $placeholders = implode(', ', array_fill(0, count($friendIds), '?'));
            $params = array_merge([$lessonId], $friendIds, $friendIds);
            $bStmt = $pdo->prepare(
                "SELECT `requester_id`, `addressee_id` FROM `lesson_duos`
                 WHERE `lesson_id` = ? AND `status` = 'accepted'
                   AND (`requester_id` IN ({$placeholders}) OR `addressee_id` IN ({$placeholders}))"
            );
            $bStmt->execute($params);
            foreach ($bStmt->fetchAll(PDO::FETCH_ASSOC) as $b) {
                $busyUserIds[(int) $b['requester_id']] = true;
                $busyUserIds[(int) $b['addressee_id']] = true;
            }
        }

        $eligibleCompanions = [];
        foreach ($friendIds as $fid) {
            if (!isset($usersById[$fid])) {
                continue;
            }
            $card = ProgressShared::toFriendCard($usersById[$fid]);
            $card['busyInLesson'] = isset($busyUserIds[$fid]);
            $eligibleCompanions[] = $card;
        }

        Http::json(200, [
            'ok' => true,
            'lessonId' => $lessonId,
            'activeDuo' => $activeDuo,
            'incoming' => $incoming,
            'outgoing' => $outgoing,
            'eligibleCompanions' => $eligibleCompanions,
        ]);
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function lessonDuoRequest(int $userId, array $body): never
    {
        $lessonId = self::requireDuoLessonOrAbort((string) ($body['lessonId'] ?? ''));
        $targetId = is_numeric($body['targetUserId'] ?? null) ? (int) $body['targetUserId'] : 0;

        if ($targetId <= 0) {
            Http::error(400, 'Companheiro inválido.');
        }
        if ($targetId === $userId) {
            Http::error(400, 'Não é possível formar dupla consigo mesmo.');
        }

        $bond = ProgressShared::findFriendshipBetween($userId, $targetId);
        if (!$bond || ($bond['status'] ?? '') !== 'accepted') {
            Http::error(403, 'Apenas Companheiros selados podem formar dupla nesta aula.');
        }

        $myActive = self::findAcceptedLessonDuo($userId, $lessonId);
        if ($myActive) {
            Http::error(409, 'Você já possui uma dupla ativa nesta aula.');
        }
        $theirActive = self::findAcceptedLessonDuo($targetId, $lessonId);
        if ($theirActive) {
            Http::error(409, 'Este Companheiro já está em dupla com outra alma nesta aula.');
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'SELECT * FROM `lesson_duos`
             WHERE `lesson_id` = :lid
               AND ((`requester_id` = :u1 AND `addressee_id` = :t1)
                 OR (`requester_id` = :t2 AND `addressee_id` = :u2))
             LIMIT 1'
        );
        $stmt->execute([':lid' => $lessonId, ':u1' => $userId, ':t1' => $targetId, ':t2' => $targetId, ':u2' => $userId]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        $nowSql = Database::nowSql();
        if ($existing) {
            $existing['id'] = (int) $existing['id'];
            $existing['requester_id'] = (int) $existing['requester_id'];
            $existing['addressee_id'] = (int) $existing['addressee_id'];

            if ($existing['status'] === 'pending' && $existing['addressee_id'] === $userId) {
                $upd = $pdo->prepare('UPDATE `lesson_duos` SET `status` = \'accepted\', `updated_at` = :now WHERE `id` = :id');
                $upd->execute([':now' => $nowSql, ':id' => $existing['id']]);
                $existing['status'] = 'accepted';
                $existing['updated_at'] = $nowSql;
                self::seedDuoJournalFromSoloDrafts($existing);
                $usersById = ProgressShared::fetchUsersByIds([$targetId]);
                Http::json(200, [
                    'ok' => true,
                    'autoAccepted' => true,
                    'duo' => self::toDuoDto($existing, $userId, $usersById[$targetId] ?? null),
                ]);
            }
            if ($existing['status'] === 'pending') {
                Http::error(409, 'Convite de dupla já enviado para esta aula.');
            }
        }

        $ins = $pdo->prepare(
            'INSERT INTO `lesson_duos`
             (`lesson_id`, `requester_id`, `addressee_id`, `status`, `requester_role`, `addressee_role`, `created_at`, `updated_at`)
             VALUES (:lid, :req, :addr, \'pending\', \'coauthor\', \'coauthor\', :ca, :ua)'
        );
        $ins->execute([':lid' => $lessonId, ':req' => $userId, ':addr' => $targetId, ':ca' => $nowSql, ':ua' => $nowSql]);
        $newId = (int) $pdo->lastInsertId();

        $inserted = [
            'id' => $newId,
            'lesson_id' => $lessonId,
            'requester_id' => $userId,
            'addressee_id' => $targetId,
            'status' => 'pending',
            'requester_role' => 'coauthor',
            'addressee_role' => 'coauthor',
            'created_at' => $nowSql,
            'updated_at' => $nowSql,
        ];
        $usersById = ProgressShared::fetchUsersByIds([$targetId]);
        Http::json(201, [
            'ok' => true,
            'autoAccepted' => false,
            'duo' => self::toDuoDto($inserted, $userId, $usersById[$targetId] ?? null),
        ]);
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function lessonDuoRespond(int $userId, array $body): never
    {
        $duoId = is_numeric($body['duoId'] ?? null) ? (int) $body['duoId'] : 0;
        $decision = isset($body['decision']) && is_string($body['decision']) ? strtolower(trim($body['decision'])) : '';

        if ($duoId <= 0 || !in_array($decision, ['accept', 'decline'], true)) {
            Http::error(400, 'Parâmetros inválidos.');
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT * FROM `lesson_duos` WHERE `id` = :id LIMIT 1');
        $stmt->execute([':id' => $duoId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            Http::error(404, 'Convite de dupla não encontrado.');
        }
        $row['id'] = (int) $row['id'];
        $row['requester_id'] = (int) $row['requester_id'];
        $row['addressee_id'] = (int) $row['addressee_id'];

        if ($row['addressee_id'] !== $userId) {
            Http::error(403, 'Apenas o destinatário pode responder este convite.');
        }
        if ($row['status'] !== 'pending') {
            Http::error(409, 'Este convite já foi processado.');
        }

        if ($decision === 'decline') {
            $del = $pdo->prepare('DELETE FROM `lesson_duos` WHERE `id` = :id');
            $del->execute([':id' => $duoId]);
            Http::json(200, ['ok' => true, 'decision' => 'decline']);
        }

        $myActive = self::findAcceptedLessonDuo($userId, (string) $row['lesson_id']);
        $theirActive = self::findAcceptedLessonDuo($row['requester_id'], (string) $row['lesson_id']);
        if ($myActive || $theirActive) {
            Http::error(409, 'Uma das almas já entrou em outra dupla nesta aula.');
        }

        $nowSql = Database::nowSql();
        $upd = $pdo->prepare('UPDATE `lesson_duos` SET `status` = \'accepted\', `updated_at` = :now WHERE `id` = :id');
        $upd->execute([':now' => $nowSql, ':id' => $duoId]);
        $row['status'] = 'accepted';
        $row['updated_at'] = $nowSql;

        $cleanup = $pdo->prepare(
            'DELETE FROM `lesson_duos`
             WHERE `lesson_id` = :lid AND `status` = \'pending\' AND `id` <> :id
               AND (`requester_id` IN (:u1, :r1) OR `addressee_id` IN (:u2, :r2))'
        );
        $cleanup->execute([
            ':lid' => $row['lesson_id'],
            ':id' => $duoId,
            ':u1' => $userId,
            ':r1' => $row['requester_id'],
            ':u2' => $userId,
            ':r2' => $row['requester_id'],
        ]);

        self::seedDuoJournalFromSoloDrafts($row);
        $usersById = ProgressShared::fetchUsersByIds([$row['requester_id']]);

        Http::json(200, [
            'ok' => true,
            'decision' => 'accept',
            'duo' => self::toDuoDto($row, $userId, $usersById[$row['requester_id']] ?? null),
        ]);
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function lessonDuoLeave(int $userId, array $body): never
    {
        $lessonId = self::requireDuoLessonOrAbort((string) ($body['lessonId'] ?? ''));
        $duoId = is_numeric($body['duoId'] ?? null) ? (int) $body['duoId'] : null;

        $duos = self::listUserLessonDuos($userId, $lessonId);
        $target = null;
        if ($duoId) {
            foreach ($duos as $d) {
                if ((int) $d['id'] === $duoId) {
                    $target = $d;
                    break;
                }
            }
        } else {
            $target = $duos[0] ?? null;
        }

        if (!$target) {
            Http::error(404, 'Dupla ou convite não encontrado.');
        }

        $pdo = Database::pdo();
        $del = $pdo->prepare('DELETE FROM `lesson_duos` WHERE `id` = :id');
        $del->execute([':id' => $target['id']]);

        Http::json(200, ['ok' => true, 'lessonId' => $lessonId, 'removedDuoId' => (int) $target['id']]);
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function lessonDuoSetRole(int $userId, array $body): never
    {
        $lessonId = self::requireDuoLessonOrAbort((string) ($body['lessonId'] ?? ''));
        $myRole = isset($body['role']) && is_string($body['role']) ? strtolower(trim($body['role'])) : '';
        if (!in_array($myRole, self::VALID_DUO_ROLES, true)) {
            Http::error(400, 'Papel inválido na dupla.');
        }

        $duo = self::findAcceptedLessonDuo($userId, $lessonId);
        if (!$duo) {
            Http::error(404, 'Você não possui dupla ativa nesta aula.');
        }

        $isRequester = (int) $duo['requester_id'] === $userId;
        $column = $isRequester ? 'requester_role' : 'addressee_role';
        $nowSql = Database::nowSql();

        $pdo = Database::pdo();
        $upd = $pdo->prepare("UPDATE `lesson_duos` SET `{$column}` = :role, `updated_at` = :now WHERE `id` = :id");
        $upd->execute([':role' => $myRole, ':now' => $nowSql, ':id' => $duo['id']]);

        $duo[$column] = $myRole;
        $duo['updated_at'] = $nowSql;
        $partnerId = $isRequester ? (int) $duo['addressee_id'] : (int) $duo['requester_id'];
        $usersById = ProgressShared::fetchUsersByIds([$partnerId]);

        Http::json(200, [
            'ok' => true,
            'duo' => self::toDuoDto($duo, $userId, $usersById[$partnerId] ?? null),
        ]);
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function lessonJournalGet(int $userId, array $body): never
    {
        $lessonId = self::requireDuoLessonOrAbort((string) ($body['lessonId'] ?? ''));
        ['duo' => $duo, 'journal' => $journal] = self::loadEffectiveJournalRow($userId, $lessonId);

        $activeDuoDto = null;
        if ($duo) {
            $partnerId = ((int) $duo['requester_id'] === $userId) ? (int) $duo['addressee_id'] : (int) $duo['requester_id'];
            $usersById = ProgressShared::fetchUsersByIds([$partnerId]);
            $activeDuoDto = self::toDuoDto($duo, $userId, $usersById[$partnerId] ?? null);
        }

        Http::json(200, [
            'ok' => true,
            'lessonId' => $lessonId,
            'activeDuo' => $activeDuoDto,
            'journal' => self::toJournalDto($journal, $lessonId),
        ]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function lessonJournalSave(array $user, int $userId, array $body): never
    {
        $lessonId = self::requireDuoLessonOrAbort((string) ($body['lessonId'] ?? ''));
        ['duo' => $duo, 'journal' => $existing] = self::loadEffectiveJournalRow($userId, $lessonId);

        $fields = self::sanitizeJournalFields($body, $existing);
        $nowSql = Database::nowSql();
        $pdo = Database::pdo();

        if ($existing) {
            $upd = $pdo->prepare(
                'UPDATE `lesson_journals`
                 SET `game_name` = :gn, `platform` = :pl, `genre` = :ge,
                     `first_impression` = :fi, `mechanics_observed` = :mo,
                     `aesthetic_sound_notes` = :as_notes, `final_verdict` = :fv,
                     `rating` = :rt, `updated_by` = :ub, `updated_at` = :ua
                 WHERE `id` = :id'
            );
            $upd->execute([
                ':gn' => $fields['game_name'],
                ':pl' => $fields['platform'],
                ':ge' => $fields['genre'],
                ':fi' => $fields['first_impression'],
                ':mo' => $fields['mechanics_observed'],
                ':as_notes' => $fields['aesthetic_sound_notes'],
                ':fv' => $fields['final_verdict'],
                ':rt' => $fields['rating'],
                ':ub' => $userId,
                ':ua' => $nowSql,
                ':id' => $existing['id'],
            ]);
            $savedId = (int) $existing['id'];
        } else {
            $ins = $pdo->prepare(
                'INSERT INTO `lesson_journals`
                 (`lesson_id`, `duo_id`, `owner_user_id`, `game_name`, `platform`, `genre`,
                  `first_impression`, `mechanics_observed`, `aesthetic_sound_notes`, `final_verdict`,
                  `rating`, `updated_by`, `created_at`, `updated_at`)
                 VALUES (:lid, :did, :uid, :gn, :pl, :ge, :fi, :mo, :as_notes, :fv, :rt, :ub, :ca, :ua)'
            );
            $ins->execute([
                ':lid' => $lessonId,
                ':did' => $duo ? $duo['id'] : null,
                ':uid' => $duo ? null : $userId,
                ':gn' => $fields['game_name'],
                ':pl' => $fields['platform'],
                ':ge' => $fields['genre'],
                ':fi' => $fields['first_impression'],
                ':mo' => $fields['mechanics_observed'],
                ':as_notes' => $fields['aesthetic_sound_notes'],
                ':fv' => $fields['final_verdict'],
                ':rt' => $fields['rating'],
                ':ub' => $userId,
                ':ca' => $nowSql,
                ':ua' => $nowSql,
            ]);
            $savedId = (int) $pdo->lastInsertId();
        }

        $sel = $pdo->prepare('SELECT * FROM `lesson_journals` WHERE `id` = :id LIMIT 1');
        $sel->execute([':id' => $savedId]);
        $saved = $sel->fetch(PDO::FETCH_ASSOC) ?: null;

        Http::json(200, [
            'ok' => true,
            'lessonId' => $lessonId,
            'journal' => self::toJournalDto($saved, $lessonId),
            'user' => GameCatalog::sanitizeUser($user),
        ]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function lessonJournalFinalize(array $user, int $userId, array $body): never
    {
        $lessonId = self::requireDuoLessonOrAbort((string) ($body['lessonId'] ?? ''));
        ['duo' => $duo, 'journal' => $existing] = self::loadEffectiveJournalRow($userId, $lessonId);

        $fields = self::sanitizeJournalFields($body, $existing);
        if (!self::isJournalCompleteForFinalize($fields)) {
            Http::error(
                400,
                'Preencha o nome do jogo, primeiras impressões, mecânicas observadas, veredito final (mín. 10 caracteres cada) e a nota (1 a 5) antes de selar o Diário.'
            );
        }

        $nowSql = Database::nowSql();
        $finalizedAtSql = !empty($existing['finalized_at']) ? (string) $existing['finalized_at'] : $nowSql;
        $pdo = Database::pdo();

        if ($existing) {
            $upd = $pdo->prepare(
                'UPDATE `lesson_journals`
                 SET `game_name` = :gn, `platform` = :pl, `genre` = :ge,
                     `first_impression` = :fi, `mechanics_observed` = :mo,
                     `aesthetic_sound_notes` = :as_notes, `final_verdict` = :fv,
                     `rating` = :rt, `finalized_at` = :fa, `updated_by` = :ub, `updated_at` = :ua
                 WHERE `id` = :id'
            );
            $upd->execute([
                ':gn' => $fields['game_name'],
                ':pl' => $fields['platform'],
                ':ge' => $fields['genre'],
                ':fi' => $fields['first_impression'],
                ':mo' => $fields['mechanics_observed'],
                ':as_notes' => $fields['aesthetic_sound_notes'],
                ':fv' => $fields['final_verdict'],
                ':rt' => $fields['rating'],
                ':fa' => $finalizedAtSql,
                ':ub' => $userId,
                ':ua' => $nowSql,
                ':id' => $existing['id'],
            ]);
            $savedId = (int) $existing['id'];
        } else {
            $ins = $pdo->prepare(
                'INSERT INTO `lesson_journals`
                 (`lesson_id`, `duo_id`, `owner_user_id`, `game_name`, `platform`, `genre`,
                  `first_impression`, `mechanics_observed`, `aesthetic_sound_notes`, `final_verdict`,
                  `rating`, `finalized_at`, `updated_by`, `created_at`, `updated_at`)
                 VALUES (:lid, :did, :uid, :gn, :pl, :ge, :fi, :mo, :as_notes, :fv, :rt, :fa, :ub, :ca, :ua)'
            );
            $ins->execute([
                ':lid' => $lessonId,
                ':did' => $duo ? $duo['id'] : null,
                ':uid' => $duo ? null : $userId,
                ':gn' => $fields['game_name'],
                ':pl' => $fields['platform'],
                ':ge' => $fields['genre'],
                ':fi' => $fields['first_impression'],
                ':mo' => $fields['mechanics_observed'],
                ':as_notes' => $fields['aesthetic_sound_notes'],
                ':fv' => $fields['final_verdict'],
                ':rt' => $fields['rating'],
                ':fa' => $finalizedAtSql,
                ':ub' => $userId,
                ':ca' => $nowSql,
                ':ua' => $nowSql,
            ]);
            $savedId = (int) $pdo->lastInsertId();
        }

        $sel = $pdo->prepare('SELECT * FROM `lesson_journals` WHERE `id` = :id LIMIT 1');
        $sel->execute([':id' => $savedId]);
        $saved = $sel->fetch(PDO::FETCH_ASSOC) ?: null;

        $myRole = self::resolveMyDuoRole($duo, $userId);
        $idsForMe = ['aula2_diario'];
        if ($duo) {
            $idsForMe[] = 'aula2_dupla';
        }
        if ($myRole === 'observer') {
            $idsForMe[] = 'aula2_observador';
        }

        $myAward = ProgressShared::awardAchievementIds($user, $idsForMe);

        if ($duo) {
            $partnerId = ((int) $duo['requester_id'] === $userId) ? (int) $duo['addressee_id'] : (int) $duo['requester_id'];
            $partnerUser = ProgressShared::loadUserById($partnerId);
            if ($partnerUser) {
                $partnerRole = self::resolveMyDuoRole($duo, $partnerId);
                $idsForPartner = ['aula2_diario', 'aula2_dupla'];
                if ($partnerRole === 'observer') {
                    $idsForPartner[] = 'aula2_observador';
                }
                ProgressShared::awardAchievementIds($partnerUser, $idsForPartner);
            }
        }

        Http::json(200, [
            'ok' => true,
            'lessonId' => $lessonId,
            'journal' => self::toJournalDto($saved, $lessonId),
            'user' => GameCatalog::sanitizeUser($myAward['user']),
            'awarded' => $myAward['awarded'],
            'leveledUp' => $myAward['leveledUp'],
        ]);
    }
}
