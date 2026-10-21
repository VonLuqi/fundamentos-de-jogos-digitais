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
    public const DUO_LESSON_IDS = ['aula7', 'aula8'];
    public const ROLES_BY_LESSON = [
        'aula7' => ['arte', 'programacao'],
        'aula8' => ['design', 'programacao'],
    ];
    public const JOURNAL_BODY_MAX = 12000;

    private static function normalizeLessonId(string $raw, string $errorMsg = 'Aula inválida.'): string
    {
        $id = trim($raw);
        if (!in_array($id, self::DUO_LESSON_IDS, true) || !isset(GameCatalog::LESSON_CATALOG[$id])) {
            Http::error(400, $errorMsg);
        }
        return $id;
    }

    /**
     * @return array<int, string>|null
     */
    private static function rolesForLesson(string $lessonId): ?array
    {
        return self::ROLES_BY_LESSON[$lessonId] ?? null;
    }

    private static function normalizeRole(mixed $raw, string $lessonId = 'aula7'): ?string
    {
        if (!is_string($raw)) {
            return null;
        }
        $role = strtolower(trim($raw));
        $pair = self::rolesForLesson($lessonId);
        if (!$pair) {
            return null;
        }
        return in_array($role, $pair, true) ? $role : null;
    }

    private static function oppositeRole(string $role, string $lessonId = 'aula7'): ?string
    {
        $pair = self::rolesForLesson($lessonId);
        if (!$pair) {
            return null;
        }
        $picked = strtolower(trim($role));
        if ($picked === $pair[0]) {
            return $pair[1];
        }
        if ($picked === $pair[1]) {
            return $pair[0];
        }
        return null;
    }

    private static function normalizeUsernameQuery(mixed $raw): string
    {
        if (!is_string($raw)) {
            return '';
        }
        return ltrim(strtolower(trim($raw)), '@');
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private static function findUserDuos(string $lessonId, int $userId): array
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
    private static function findAcceptedDuo(string $lessonId, int $userId): ?array
    {
        foreach (self::findUserDuos($lessonId, $userId) as $row) {
            if (($row['status'] ?? '') === 'accepted') {
                return $row;
            }
        }
        return null;
    }

    /**
     * @param array<string, mixed>|null $row
     * @param array<int, array<string, mixed>> $usersById
     * @return array<string, mixed>|null
     */
    private static function duoPayload(?array $row, int $userId, array $usersById): ?array
    {
        if (!$row) {
            return null;
        }
        $iAmRequester = (int) $row['requester_id'] === $userId;
        $partnerId = $iAmRequester ? (int) $row['addressee_id'] : (int) $row['requester_id'];
        $myRole = $iAmRequester ? ($row['requester_role'] ?? null) : ($row['addressee_role'] ?? null);
        $partnerRole = $iAmRequester ? ($row['addressee_role'] ?? null) : ($row['requester_role'] ?? null);
        $partner = $usersById[$partnerId] ?? null;

        return [
            'duoId' => (int) $row['id'],
            'lessonId' => (string) $row['lesson_id'],
            'status' => (string) $row['status'],
            'createdAt' => Database::sqlToIso($row['created_at'] ?? null),
            'updatedAt' => Database::sqlToIso($row['updated_at'] ?? null),
            'myRole' => $myRole ?: null,
            'partnerRole' => $partnerRole ?: null,
            'partner' => $partner ? ProgressShared::toFriendCard($partner) : null,
            'iAmRequester' => $iAmRequester,
        ];
    }

    /**
     * @param array<string, mixed>|null $row
     * @return array<string, mixed>|null
     */
    private static function journalPayload(?array $row): ?array
    {
        if (!$row) {
            return null;
        }
        return [
            'journalId' => (int) $row['id'],
            'lessonId' => (string) $row['lesson_id'],
            'duoId' => isset($row['duo_id']) && $row['duo_id'] !== null ? (int) $row['duo_id'] : null,
            'body' => (string) ($row['body'] ?? ''),
            'revision' => max(1, (int) ($row['revision'] ?? 1)),
            'updatedBy' => isset($row['updated_by']) && $row['updated_by'] !== null ? (int) $row['updated_by'] : null,
            'updatedAt' => Database::sqlToIso($row['updated_at'] ?? null),
            'createdAt' => Database::sqlToIso($row['created_at'] ?? null),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function getOrCreateSoloJournal(string $lessonId, int $userId): array
    {
        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'SELECT `id`, `lesson_id`, `duo_id`, `owner_user_id`, `partner_user_id`,
                    `body`, `revision`, `updated_by`, `created_at`, `updated_at`
             FROM `lesson_journals`
             WHERE `lesson_id` = :lid AND `owner_user_id` = :uid AND `duo_id` IS NULL
             LIMIT 1'
        );
        $stmt->execute([':lid' => $lessonId, ':uid' => $userId]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($existing) {
            return $existing;
        }

        $nowSql = Database::nowSql();
        $ins = $pdo->prepare(
            'INSERT INTO `lesson_journals`
             (`lesson_id`, `duo_id`, `owner_user_id`, `partner_user_id`, `body`, `revision`, `updated_by`, `created_at`, `updated_at`)
             VALUES (:lid, NULL, :uid, NULL, \'\', 1, :ub, :ca, :ua)'
        );
        $ins->execute([
            ':lid' => $lessonId,
            ':uid' => $userId,
            ':ub' => $userId,
            ':ca' => $nowSql,
            ':ua' => $nowSql,
        ]);
        $id = (int) $pdo->lastInsertId();

        return [
            'id' => $id,
            'lesson_id' => $lessonId,
            'duo_id' => null,
            'owner_user_id' => $userId,
            'partner_user_id' => null,
            'body' => '',
            'revision' => 1,
            'updated_by' => $userId,
            'created_at' => $nowSql,
            'updated_at' => $nowSql,
        ];
    }

    /**
     * @param array<string, mixed> $duoRow
     * @return array<string, mixed>
     */
    private static function getOrCreateDuoJournal(string $lessonId, array $duoRow, int $userId): array
    {
        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'SELECT `id`, `lesson_id`, `duo_id`, `owner_user_id`, `partner_user_id`,
                    `body`, `revision`, `updated_by`, `created_at`, `updated_at`
             FROM `lesson_journals`
             WHERE `duo_id` = :did
             LIMIT 1'
        );
        $stmt->execute([':did' => $duoRow['id']]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($existing) {
            return $existing;
        }

        $soloStmt = $pdo->prepare(
            'SELECT `owner_user_id`, `body` FROM `lesson_journals`
             WHERE `lesson_id` = :lid AND `duo_id` IS NULL AND `owner_user_id` IN (:r, :a)'
        );
        $soloStmt->execute([
            ':lid' => $lessonId,
            ':r' => $duoRow['requester_id'],
            ':a' => $duoRow['addressee_id'],
        ]);
        $a = '';
        $b = '';
        foreach ($soloStmt->fetchAll(PDO::FETCH_ASSOC) as $s) {
            if ((int) $s['owner_user_id'] === (int) $duoRow['requester_id']) {
                $a = trim((string) ($s['body'] ?? ''));
            } else {
                $b = trim((string) ($s['body'] ?? ''));
            }
        }
        $seedBody = ($a !== '' && $b !== '') ? (strlen($a) >= strlen($b) ? $a : $b) : ($a !== '' ? $a : $b);

        $nowSql = Database::nowSql();
        try {
            $ins = $pdo->prepare(
                'INSERT INTO `lesson_journals`
                 (`lesson_id`, `duo_id`, `owner_user_id`, `partner_user_id`, `body`, `revision`, `updated_by`, `created_at`, `updated_at`)
                 VALUES (:lid, :did, :owner, :partner, :body, 1, :ub, :ca, :ua)'
            );
            $ins->execute([
                ':lid' => $lessonId,
                ':did' => $duoRow['id'],
                ':owner' => $duoRow['requester_id'],
                ':partner' => $duoRow['addressee_id'],
                ':body' => $seedBody,
                ':ub' => $userId,
                ':ca' => $nowSql,
                ':ua' => $nowSql,
            ]);
            $id = (int) $pdo->lastInsertId();
            return [
                'id' => $id,
                'lesson_id' => $lessonId,
                'duo_id' => (int) $duoRow['id'],
                'owner_user_id' => (int) $duoRow['requester_id'],
                'partner_user_id' => (int) $duoRow['addressee_id'],
                'body' => $seedBody,
                'revision' => 1,
                'updated_by' => $userId,
                'created_at' => $nowSql,
                'updated_at' => $nowSql,
            ];
        } catch (\PDOException) {
            $stmt->execute([':did' => $duoRow['id']]);
            return $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        }
    }

    /**
     * @return array{mode: string, duo: array<string, mixed>|null, journal: array<string, mixed>}
     */
    private static function resolveJournal(string $lessonId, int $userId): array
    {
        $accepted = self::findAcceptedDuo($lessonId, $userId);
        if ($accepted) {
            $journal = self::getOrCreateDuoJournal($lessonId, $accepted, $userId);
            return ['mode' => 'duo', 'duo' => $accepted, 'journal' => $journal];
        }
        $journal = self::getOrCreateSoloJournal($lessonId, $userId);
        return ['mode' => 'solo', 'duo' => null, 'journal' => $journal];
    }

    /**
     * @return array<string, mixed>
     */
    private static function buildListResponse(string $lessonId, int $userId): array
    {
        $rows = self::findUserDuos($lessonId, $userId);
        $otherIds = [];
        foreach ($rows as $row) {
            $otherIds[] = ((int) $row['requester_id'] === $userId) ? (int) $row['addressee_id'] : (int) $row['requester_id'];
        }
        $usersById = ProgressShared::fetchUsersByIds($otherIds);

        $accepted = null;
        $incoming = [];
        $outgoing = [];
        foreach ($rows as $row) {
            if (($row['status'] ?? '') === 'accepted' && !$accepted) {
                $accepted = $row;
                continue;
            }
            if (($row['status'] ?? '') !== 'pending') {
                continue;
            }
            $entry = self::duoPayload($row, $userId, $usersById);
            if ((int) $row['addressee_id'] === $userId) {
                $incoming[] = $entry;
            } else {
                $outgoing[] = $entry;
            }
        }

        ['mode' => $mode, 'duo' => $duo, 'journal' => $journal] = self::resolveJournal($lessonId, $userId);
        $duoCard = $duo ? self::duoPayload($duo, $userId, $usersById) : null;

        return [
            'ok' => true,
            'lessonId' => $lessonId,
            'mode' => $accepted ? 'duo' : (($incoming !== [] || $outgoing !== []) ? 'pending' : $mode),
            'duo' => $duoCard,
            'incoming' => $incoming,
            'outgoing' => $outgoing,
            'journal' => self::journalPayload($journal),
        ];
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function lessonDuoList(int $userId, array $body): never
    {
        $lessonId = self::normalizeLessonId((string) ($body['lessonId'] ?? ''), 'Aula inválida para dupla.');
        Http::json(200, self::buildListResponse($lessonId, $userId));
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function lessonDuoRequest(int $userId, array $body): never
    {
        $lessonId = self::normalizeLessonId((string) ($body['lessonId'] ?? ''), 'Aula inválida para dupla.');
        $targetUsername = self::normalizeUsernameQuery($body['username'] ?? '');
        if ($targetUsername === '') {
            Http::error(400, 'Username ausente.');
        }

        $mine = self::findUserDuos($lessonId, $userId);
        foreach ($mine as $row) {
            if (($row['status'] ?? '') === 'accepted') {
                Http::error(409, 'Você já está em uma dupla nesta aula.');
            }
        }
        $pendingOut = array_filter(
            $mine,
            static fn(array $r): bool => ($r['status'] ?? '') === 'pending' && (int) $r['requester_id'] === $userId
        );
        if (count($pendingOut) >= 3) {
            Http::error(409, 'Limite de convites pendentes nesta aula.');
        }

        $pdo = Database::pdo();
        $tStmt = $pdo->prepare(
            'SELECT `id`, `full_name`, `username`, `turma`, `role`, `xp`, `avatar_index`
             FROM `users` WHERE LOWER(`username`) = :u LIMIT 1'
        );
        $tStmt->execute([':u' => $targetUsername]);
        $target = $tStmt->fetch(PDO::FETCH_ASSOC);

        if (!$target) {
            Http::error(404, 'Nenhuma alma com esse username.');
        }
        $targetId = (int) $target['id'];
        if ($targetId === $userId) {
            Http::error(400, 'Não se convida a si mesmo.');
        }
        if (($target['role'] ?? '') === 'admin') {
            Http::error(400, 'Convide um colega da turma, não o Mestre.');
        }

        $their = self::findUserDuos($lessonId, $targetId);
        foreach ($their as $row) {
            if (($row['status'] ?? '') === 'accepted') {
                Http::error(409, 'Este colega já está em uma dupla nesta aula.');
            }
        }

        $nowSql = Database::nowSql();
        try {
            $ins = $pdo->prepare(
                'INSERT INTO `lesson_duos`
                 (`lesson_id`, `requester_id`, `addressee_id`, `status`, `created_at`, `updated_at`)
                 VALUES (:lid, :req, :addr, \'pending\', :ca, :ua)'
            );
            $ins->execute([
                ':lid' => $lessonId,
                ':req' => $userId,
                ':addr' => $targetId,
                ':ca' => $nowSql,
                ':ua' => $nowSql,
            ]);
            $newId = (int) $pdo->lastInsertId();
        } catch (\PDOException $e) {
            if ((int) ($e->errorInfo[1] ?? 0) === 1062) {
                Http::error(409, 'Este convite já está em viagem.');
            }
            Http::error(500, 'Falha ao enviar convite.');
        }

        $created = [
            'id' => $newId,
            'lesson_id' => $lessonId,
            'requester_id' => $userId,
            'addressee_id' => $targetId,
            'status' => 'pending',
            'requester_role' => null,
            'addressee_role' => null,
            'created_at' => $nowSql,
            'updated_at' => $nowSql,
        ];
        Http::json(201, [
            'ok' => true,
            'duo' => self::duoPayload($created, $userId, [$targetId => $target]),
        ]);
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function lessonDuoRespond(int $userId, array $body): never
    {
        $lessonId = self::normalizeLessonId((string) ($body['lessonId'] ?? ''), 'Aula inválida para dupla.');
        $decision = isset($body['decision']) && is_string($body['decision']) ? strtolower(trim($body['decision'])) : '';
        if (!in_array($decision, ['accept', 'decline'], true)) {
            Http::error(400, 'Decisão inválida. Use accept ou decline.');
        }

        $duoId = is_numeric($body['duoId'] ?? null) ? (int) $body['duoId'] : 0;
        $mine = self::findUserDuos($lessonId, $userId);
        $row = null;
        foreach ($mine as $r) {
            if (($r['status'] ?? '') === 'pending' && (int) $r['addressee_id'] === $userId) {
                if ($duoId <= 0 || (int) $r['id'] === $duoId) {
                    $row = $r;
                    break;
                }
            }
        }

        if (!$row) {
            Http::error(404, 'Convite pendente não encontrado.');
        }
        $duoKey = (int) $row['id'];
        $pdo = Database::pdo();

        if ($decision === 'decline') {
            $del = $pdo->prepare('DELETE FROM `lesson_duos` WHERE `id` = :id');
            $del->execute([':id' => $duoKey]);
            Http::json(200, ['ok' => true, 'decision' => 'decline']);
        }

        if (self::findAcceptedDuo($lessonId, $userId)) {
            Http::error(409, 'Você já está em uma dupla nesta aula.');
        }
        if (self::findAcceptedDuo($lessonId, (int) $row['requester_id'])) {
            Http::error(409, 'Este colega já formou dupla.');
        }

        $nowSql = Database::nowSql();
        $upd = $pdo->prepare(
            'UPDATE `lesson_duos` SET `status` = \'accepted\', `updated_at` = :now
             WHERE `id` = :id AND `status` = \'pending\''
        );
        $upd->execute([':now' => $nowSql, ':id' => $duoKey]);
        $row['status'] = 'accepted';
        $row['updated_at'] = $nowSql;

        $cleanup = $pdo->prepare(
            'DELETE FROM `lesson_duos`
             WHERE `lesson_id` = :lid AND `status` = \'pending\' AND `id` <> :id
               AND (`requester_id` IN (:u1, :r1) OR `addressee_id` IN (:u2, :r2))'
        );
        $cleanup->execute([
            ':lid' => $lessonId,
            ':id' => $duoKey,
            ':u1' => $userId,
            ':r1' => $row['requester_id'],
            ':u2' => $userId,
            ':r2' => $row['requester_id'],
        ]);

        self::getOrCreateDuoJournal($lessonId, $row, $userId);
        $usersById = ProgressShared::fetchUsersByIds([(int) $row['requester_id'], (int) $row['addressee_id']]);

        Http::json(200, [
            'ok' => true,
            'duo' => self::duoPayload($row, $userId, $usersById),
        ]);
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function lessonDuoLeave(int $userId, array $body): never
    {
        $lessonId = self::normalizeLessonId((string) ($body['lessonId'] ?? ''), 'Aula inválida para dupla.');
        $rows = self::findUserDuos($lessonId, $userId);
        if ($rows === []) {
            Http::json(200, ['ok' => true, 'left' => false]);
        }

        $ids = array_map(static fn(array $r): int => (int) $r['id'], $rows);
        $placeholders = implode(', ', array_fill(0, count($ids), '?'));
        $pdo = Database::pdo();
        $del = $pdo->prepare("DELETE FROM `lesson_duos` WHERE `id` IN ({$placeholders})");
        $del->execute($ids);

        self::getOrCreateSoloJournal($lessonId, $userId);
        Http::json(200, ['ok' => true, 'left' => true]);
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function lessonDuoSetRole(int $userId, array $body): never
    {
        $lessonId = self::normalizeLessonId((string) ($body['lessonId'] ?? ''), 'Aula inválida para dupla.');
        $picked = self::normalizeRole($body['role'] ?? null, $lessonId);
        if (!$picked) {
            $allowed = implode(' ou ', self::rolesForLesson($lessonId) ?? []);
            Http::error(400, "Ofício inválido ({$allowed}).");
        }

        $duo = self::findAcceptedDuo($lessonId, $userId);
        if (!$duo) {
            Http::error(400, 'Forme uma dupla antes de escolher ofício.');
        }

        $iAmRequester = (int) $duo['requester_id'] === $userId;
        $partnerRole = self::oppositeRole($picked, $lessonId);
        $reqRole = $iAmRequester ? $picked : $partnerRole;
        $addrRole = $iAmRequester ? $partnerRole : $picked;
        $nowSql = Database::nowSql();

        $pdo = Database::pdo();
        $upd = $pdo->prepare(
            'UPDATE `lesson_duos`
             SET `requester_role` = :rr, `addressee_role` = :ar, `updated_at` = :now
             WHERE `id` = :id'
        );
        $upd->execute([
            ':rr' => $reqRole,
            ':ar' => $addrRole,
            ':now' => $nowSql,
            ':id' => $duo['id'],
        ]);

        $duo['requester_role'] = $reqRole;
        $duo['addressee_role'] = $addrRole;
        $duo['updated_at'] = $nowSql;
        $usersById = ProgressShared::fetchUsersByIds([(int) $duo['requester_id'], (int) $duo['addressee_id']]);

        Http::json(200, [
            'ok' => true,
            'duo' => self::duoPayload($duo, $userId, $usersById),
        ]);
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function lessonJournalGet(int $userId, array $body): never
    {
        $lessonId = self::normalizeLessonId((string) ($body['lessonId'] ?? ''));
        Http::json(200, self::buildListResponse($lessonId, $userId));
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function lessonJournalSave(array $user, int $userId, array $body): never
    {
        $lessonId = self::normalizeLessonId((string) ($body['lessonId'] ?? ''));
        $text = isset($body['body']) && is_string($body['body']) ? $body['body'] : '';
        if (mb_strlen($text, 'UTF-8') > self::JOURNAL_BODY_MAX) {
            Http::error(400, 'Diário excede ' . self::JOURNAL_BODY_MAX . ' caracteres.');
        }

        ['journal' => $journal] = self::resolveJournal($lessonId, $userId);
        if (!$journal) {
            Http::error(500, 'Diário indisponível.');
        }

        $clientRev = isset($body['revision']) && is_numeric($body['revision']) ? (int) $body['revision'] : 0;
        $serverRev = max(1, (int) ($journal['revision'] ?? 1));
        if ($clientRev > 0 && $clientRev < $serverRev) {
            Http::json(409, [
                'ok' => false,
                'conflict' => true,
                'error' => 'O parceiro atualizou — recarregamos o diário.',
                'journal' => self::journalPayload($journal),
            ]);
        }

        $nextRev = $serverRev + 1;
        $nowSql = Database::nowSql();
        $pdo = Database::pdo();
        $upd = $pdo->prepare(
            'UPDATE `lesson_journals`
             SET `body` = :body, `revision` = :rev, `updated_by` = :ub, `updated_at` = :ua
             WHERE `id` = :id AND `revision` = :srev'
        );
        $upd->execute([
            ':body' => $text,
            ':rev' => $nextRev,
            ':ub' => $userId,
            ':ua' => $nowSql,
            ':id' => $journal['id'],
            ':srev' => $serverRev,
        ]);

        if ($upd->rowCount() === 0) {
            $sel = $pdo->prepare('SELECT * FROM `lesson_journals` WHERE `id` = :id LIMIT 1');
            $sel->execute([':id' => $journal['id']]);
            $fresh = $sel->fetch(PDO::FETCH_ASSOC) ?: $journal;
            Http::json(409, [
                'ok' => false,
                'conflict' => true,
                'error' => 'O parceiro atualizou — recarregamos o diário.',
                'journal' => self::journalPayload($fresh),
            ]);
        }

        $journal['body'] = $text;
        $journal['revision'] = $nextRev;
        $journal['updated_by'] = $userId;
        $journal['updated_at'] = $nowSql;

        Http::json(200, [
            'ok' => true,
            'journal' => self::journalPayload($journal),
        ]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function lessonJournalFinalize(array $user, int $userId, array $body): never
    {
        $lessonId = self::normalizeLessonId((string) ($body['lessonId'] ?? ''));
        ['duo' => $duo, 'journal' => $journal] = self::resolveJournal($lessonId, $userId);

        $text = trim((string) ($journal['body'] ?? ''));
        if (mb_strlen($text, 'UTF-8') < 40) {
            Http::error(400, 'Preencha o diário de desenvolvimento antes de finalizar (mín. ~40 caracteres).');
        }

        if ($duo) {
            $iAmRequester = (int) $duo['requester_id'] === $userId;
            $myRole = $iAmRequester ? ($duo['requester_role'] ?? null) : ($duo['addressee_role'] ?? null);
            if (!$myRole) {
                Http::error(400, 'Escolha seu ofício antes de finalizar.');
            }
        }

        $nowSql = Database::nowSql();
        $pdo = Database::pdo();
        $ups = $pdo->prepare(
            'INSERT INTO `lesson_paragraphs` (`user_id`, `lesson_id`, `paragraph`, `created_at`, `updated_at`)
             VALUES (:uid, :lid, :p, :ca, :ua)
             ON DUPLICATE KEY UPDATE
               `paragraph` = VALUES(`paragraph`),
               `updated_at` = VALUES(`updated_at`)'
        );
        $ups->execute([
            ':uid' => $userId,
            ':lid' => $lessonId,
            ':p' => $text,
            ':ca' => $nowSql,
            ':ua' => $nowSql,
        ]);

        $existingAchievements = is_array($user['conquistas'] ?? null) ? array_values($user['conquistas']) : [];
        $secretAwards = AchievementsEvaluator::evaluateLessonSecrets($lessonId, $text, $existingAchievements);
        $awardedIds = [];
        foreach ($secretAwards as $secret) {
            $awardedIds[] = $secret['id'];
        }

        $awardResult = ProgressShared::awardAchievementIds($user, $awardedIds);

        Http::json(200, [
            'ok' => true,
            'user' => GameCatalog::sanitizeUser($awardResult['user']),
            'awarded' => $awardResult['awarded'],
            'journal' => self::journalPayload($journal),
        ]);
    }
}
