<?php
declare(strict_types=1);

namespace App\Services\Progress;

use App\Core\Database;
use App\Core\GameCatalog;
use App\Core\Http;
use PDO;

/**
 * Serviços de Amizades (`api/_lib/progress/friends.js`) e Grimório de Notas (`api/_lib/progress/notes.js`).
 */
final class FriendsNotesService
{
    // -------------------------------------------------------------------------
    // Amizades e Espelho da Turma
    // -------------------------------------------------------------------------

    public static function friendsList(int $userId): never
    {
        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'SELECT `id`, `requester_id`, `addressee_id`, `status`, `created_at`, `updated_at`
             FROM `friendships`
             WHERE `requester_id` = :u1 OR `addressee_id` = :u2
             ORDER BY `updated_at` DESC'
        );
        $stmt->execute([':u1' => $userId, ':u2' => $userId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $otherIds = [];
        foreach ($rows as $r) {
            $otherIds[] = ((int) $r['requester_id'] === $userId) ? (int) $r['addressee_id'] : (int) $r['requester_id'];
        }
        $usersById = ProgressShared::fetchUsersByIds($otherIds);

        $friends = [];
        $incoming = [];
        $outgoing = [];

        foreach ($rows as $r) {
            $otherId = ((int) $r['requester_id'] === $userId) ? (int) $r['addressee_id'] : (int) $r['requester_id'];
            $other = $usersById[$otherId] ?? null;
            if (!$other) {
                continue;
            }
            $entry = array_merge(ProgressShared::toFriendCard($other), [
                'friendshipId' => (int) $r['id'],
                'since' => Database::sqlToIso($r['updated_at'] ?? $r['created_at'] ?? null),
            ]);
            if ($r['status'] === 'accepted') {
                $friends[] = $entry;
            } elseif ($r['status'] === 'pending') {
                if ((int) $r['addressee_id'] === $userId) {
                    $incoming[] = $entry;
                } else {
                    $outgoing[] = $entry;
                }
            }
        }

        Http::json(200, [
            'ok' => true,
            'limit' => ProgressShared::FRIEND_LIMIT,
            'count' => count($friends),
            'friends' => $friends,
            'incoming' => $incoming,
            'outgoing' => $outgoing,
        ]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function classmatesList(array $user, int $userId, array $body): never
    {
        $isAdmin = ($user['role'] ?? '') === 'admin';
        $userTurma = !empty($user['turma']) ? (string) $user['turma'] : null;

        if (!$isAdmin && !$userTurma) {
            Http::json(200, ['ok' => true, 'turma' => null, 'members' => []]);
        }

        $requestedTurma = isset($body['turma']) && is_string($body['turma']) ? strtoupper(trim($body['turma'])) : '';
        $filterTurma = $isAdmin
            ? (in_array($requestedTurma, ProgressShared::VALID_TURMAS, true) ? $requestedTurma : null)
            : $userTurma;

        $pdo = Database::pdo();
        if ($filterTurma) {
            $stmt = $pdo->prepare(
                'SELECT `id`, `full_name`, `username`, `turma`, `role`, `xp`, `avatar_index`
                 FROM `users` WHERE `role` = \'student\' AND `turma` = :t LIMIT 200'
            );
            $stmt->execute([':t' => $filterTurma]);
        } else {
            $stmt = $pdo->query(
                'SELECT `id`, `full_name`, `username`, `turma`, `role`, `xp`, `avatar_index`
                 FROM `users` WHERE `role` = \'student\' LIMIT 200'
            );
        }
        $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];

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

        $members = [];
        foreach ($rows as $r) {
            $rid = (int) $r['id'];
            if ($rid === $userId) {
                continue;
            }
            $bond = $bondByOtherId[$rid] ?? null;
            $members[] = ProgressShared::toClassmateCard(
                $r,
                ProgressShared::resolveBondStatus($bond, $userId),
                $bond ? (int) $bond['id'] : null
            );
        }

        usort($members, static function (array $a, array $b): int {
            $xpDiff = ((int) ($b['xp'] ?? 0)) <=> ((int) ($a['xp'] ?? 0));
            if ($xpDiff !== 0) {
                return $xpDiff;
            }
            return strcasecmp((string) ($a['fullName'] ?? ''), (string) ($b['fullName'] ?? ''));
        });

        Http::json(200, [
            'ok' => true,
            'turma' => $filterTurma,
            'members' => $members,
        ]);
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function friendSearch(int $userId, array $body): never
    {
        $rawQuery = isset($body['query']) && is_string($body['query']) ? trim($body['query']) : '';
        $clean = preg_replace('/[%_\\\\]/', '', $rawQuery) ?? '';
        if (mb_strlen($clean, 'UTF-8') < 2) {
            Http::json(200, ['ok' => true, 'results' => []]);
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'SELECT `id`, `full_name`, `username`, `turma`, `role`, `xp`, `avatar_index`
             FROM `users`
             WHERE (`username` LIKE :q1 OR `full_name` LIKE :q2) AND `id` <> :uid
             LIMIT :lim'
        );
        $like = '%' . $clean . '%';
        $stmt->bindValue(':q1', $like, PDO::PARAM_STR);
        $stmt->bindValue(':q2', $like, PDO::PARAM_STR);
        $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':lim', ProgressShared::FRIEND_SEARCH_LIMIT, PDO::PARAM_INT);
        $stmt->execute();
        $candidates = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $fStmt = $pdo->prepare(
            'SELECT `id`, `requester_id`, `addressee_id`, `status`
             FROM `friendships`
             WHERE `requester_id` = :u1 OR `addressee_id` = :u2'
        );
        $fStmt->execute([':u1' => $userId, ':u2' => $userId]);
        $bondByOtherId = [];
        foreach ($fStmt->fetchAll(PDO::FETCH_ASSOC) as $b) {
            $otherId = ((int) $b['requester_id'] === $userId) ? (int) $b['addressee_id'] : (int) $b['requester_id'];
            $bondByOtherId[$otherId] = [
                'friendshipId' => (int) $b['id'],
                'status' => (string) $b['status'],
                'direction' => ((int) $b['requester_id'] === $userId) ? 'outgoing' : 'incoming',
            ];
        }

        $results = [];
        foreach ($candidates as $c) {
            $cid = (int) $c['id'];
            $bond = $bondByOtherId[$cid] ?? null;
            $results[] = array_merge(ProgressShared::toFriendCard($c), [
                'friendshipStatus' => $bond ? $bond['status'] : null,
                'friendshipDirection' => $bond ? $bond['direction'] : null,
                'friendshipId' => $bond ? $bond['friendshipId'] : null,
            ]);
        }

        Http::json(200, ['ok' => true, 'results' => $results]);
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function friendRequest(int $userId, array $body): never
    {
        $targetId = is_numeric($body['targetUserId'] ?? null) ? (int) $body['targetUserId'] : null;
        $targetUsername = isset($body['username']) && is_string($body['username']) ? strtolower(trim($body['username'])) : '';

        $pdo = Database::pdo();
        $target = null;
        if ($targetId && $targetId > 0) {
            $stmt = $pdo->prepare(
                'SELECT `id`, `full_name`, `username`, `turma`, `role`, `xp`, `avatar_index`
                 FROM `users` WHERE `id` = :id LIMIT 1'
            );
            $stmt->execute([':id' => $targetId]);
            $target = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        } elseif ($targetUsername !== '') {
            $stmt = $pdo->prepare(
                'SELECT `id`, `full_name`, `username`, `turma`, `role`, `xp`, `avatar_index`
                 FROM `users` WHERE LOWER(`username`) = :u LIMIT 1'
            );
            $stmt->execute([':u' => $targetUsername]);
            $target = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        }

        if (!$target) {
            Http::error(404, 'Alma não encontrada.');
        }
        $tId = (int) $target['id'];
        if ($tId === $userId) {
            Http::error(400, 'Não é possível invocar a própria sombra como companheira.');
        }

        $existing = ProgressShared::findFriendshipBetween($userId, $tId);
        if ($existing) {
            if ($existing['status'] === 'accepted') {
                Http::error(409, 'Vocês já são Companheiros selados.');
            }
            if ((int) $existing['requester_id'] === $userId) {
                Http::error(409, 'Pacto já enviado — aguarde a resposta.');
            }

            $myCount = ProgressShared::countAcceptedFriends($userId);
            $theirCount = ProgressShared::countAcceptedFriends($tId);
            if ($myCount >= ProgressShared::FRIEND_LIMIT) {
                Http::error(409, 'Você atingiu o limite de ' . ProgressShared::FRIEND_LIMIT . ' Companheiros.');
            }
            if ($theirCount >= ProgressShared::FRIEND_LIMIT) {
                Http::error(409, 'Esta alma já atingiu o limite de Companheiros.');
            }

            $nowSql = Database::nowSql();
            $nowIso = Database::nowIso();
            $upd = $pdo->prepare('UPDATE `friendships` SET `status` = \'accepted\', `updated_at` = :now WHERE `id` = :id');
            $upd->execute([':now' => $nowSql, ':id' => $existing['id']]);

            Http::json(200, [
                'ok' => true,
                'autoAccepted' => true,
                'friend' => array_merge(ProgressShared::toFriendCard($target), [
                    'friendshipId' => (int) $existing['id'],
                    'since' => $nowIso,
                ]),
            ]);
        }

        $myCount = ProgressShared::countAcceptedFriends($userId);
        if ($myCount >= ProgressShared::FRIEND_LIMIT) {
            Http::error(409, 'Você atingiu o limite de ' . ProgressShared::FRIEND_LIMIT . ' Companheiros.');
        }

        $nowSql = Database::nowSql();
        $nowIso = Database::nowIso();
        $ins = $pdo->prepare(
            'INSERT INTO `friendships` (`requester_id`, `addressee_id`, `status`, `created_at`, `updated_at`)
             VALUES (:req, :addr, \'pending\', :ca, :ua)'
        );
        $ins->execute([':req' => $userId, ':addr' => $tId, ':ca' => $nowSql, ':ua' => $nowSql]);
        $fid = (int) $pdo->lastInsertId();

        Http::json(201, [
            'ok' => true,
            'autoAccepted' => false,
            'request' => array_merge(ProgressShared::toFriendCard($target), [
                'friendshipId' => $fid,
                'since' => $nowIso,
            ]),
        ]);
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function friendRespond(int $userId, array $body): never
    {
        $friendshipId = is_numeric($body['friendshipId'] ?? null) ? (int) $body['friendshipId'] : 0;
        $decision = isset($body['decision']) && is_string($body['decision']) ? strtolower(trim($body['decision'])) : '';

        if ($friendshipId <= 0 || !in_array($decision, ['accept', 'decline'], true)) {
            Http::error(400, 'Parâmetros inválidos.');
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT * FROM `friendships` WHERE `id` = :id LIMIT 1');
        $stmt->execute([':id' => $friendshipId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            Http::error(404, 'Pedido de amizade não encontrado.');
        }
        if ((int) $row['addressee_id'] !== $userId) {
            Http::error(403, 'Apenas o destinatário pode responder este pedido.');
        }
        if ($row['status'] !== 'pending') {
            Http::error(409, 'Este pedido já foi processado.');
        }

        if ($decision === 'decline') {
            $del = $pdo->prepare('DELETE FROM `friendships` WHERE `id` = :id');
            $del->execute([':id' => $friendshipId]);
            Http::json(200, ['ok' => true, 'decision' => 'decline']);
        }

        $reqId = (int) $row['requester_id'];
        $myCount = ProgressShared::countAcceptedFriends($userId);
        $theirCount = ProgressShared::countAcceptedFriends($reqId);
        if ($myCount >= ProgressShared::FRIEND_LIMIT) {
            Http::error(409, 'Você atingiu o limite de ' . ProgressShared::FRIEND_LIMIT . ' Companheiros.');
        }
        if ($theirCount >= ProgressShared::FRIEND_LIMIT) {
            Http::error(409, 'O remetente já atingiu o limite de Companheiros.');
        }

        $nowSql = Database::nowSql();
        $nowIso = Database::nowIso();
        $upd = $pdo->prepare('UPDATE `friendships` SET `status` = \'accepted\', `updated_at` = :now WHERE `id` = :id');
        $upd->execute([':now' => $nowSql, ':id' => $friendshipId]);

        $others = ProgressShared::fetchUsersByIds([$reqId]);
        $other = $others[$reqId] ?? null;

        Http::json(200, [
            'ok' => true,
            'decision' => 'accept',
            'friend' => $other
                ? array_merge(ProgressShared::toFriendCard($other), ['friendshipId' => $friendshipId, 'since' => $nowIso])
                : null,
        ]);
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function friendRemove(int $userId, array $body): never
    {
        $friendshipId = is_numeric($body['friendshipId'] ?? null) ? (int) $body['friendshipId'] : null;
        $friendUserId = is_numeric($body['friendUserId'] ?? null) ? (int) $body['friendUserId'] : null;

        $pdo = Database::pdo();
        $row = null;
        if ($friendshipId && $friendshipId > 0) {
            $stmt = $pdo->prepare('SELECT * FROM `friendships` WHERE `id` = :id LIMIT 1');
            $stmt->execute([':id' => $friendshipId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        } elseif ($friendUserId && $friendUserId > 0) {
            $row = ProgressShared::findFriendshipBetween($userId, $friendUserId);
        }

        if (!$row) {
            Http::error(404, 'Vínculo não encontrado.');
        }
        if ((int) $row['requester_id'] !== $userId && (int) $row['addressee_id'] !== $userId) {
            Http::error(403, 'Operação não permitida.');
        }

        $otherId = ((int) $row['requester_id'] === $userId) ? (int) $row['addressee_id'] : (int) $row['requester_id'];

        $delShares = $pdo->prepare(
            'DELETE FROM `user_note_shares`
             WHERE (`recipient_id` = :u1 AND `note_id` IN (SELECT `id` FROM `user_notes` WHERE `user_id` = :o1))
                OR (`recipient_id` = :o2 AND `note_id` IN (SELECT `id` FROM `user_notes` WHERE `user_id` = :u2))'
        );
        $delShares->execute([':u1' => $userId, ':o1' => $otherId, ':o2' => $otherId, ':u2' => $userId]);

        $delFriend = $pdo->prepare('DELETE FROM `friendships` WHERE `id` = :id');
        $delFriend->execute([':id' => $row['id']]);

        Http::json(200, ['ok' => true, 'removedFriendUserId' => $otherId]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function friendProfile(array $user, int $userId, array $body): never
    {
        $friendUserId = is_numeric($body['friendUserId'] ?? null) ? (int) $body['friendUserId'] : 0;
        if ($friendUserId <= 0) {
            Http::error(400, 'Companheiro inválido.');
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'SELECT `id`, `full_name`, `username`, `turma`, `role`, `xp`, `conquistas`, `completed_lessons`, `avatar_index`
             FROM `users` WHERE `id` = :id LIMIT 1'
        );
        $stmt->execute([':id' => $friendUserId]);
        $target = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$target) {
            Http::error(404, 'Alma não encontrada.');
        }
        $target['id'] = (int) $target['id'];
        $target['xp'] = (int) ($target['xp'] ?? 0);
        $target['avatar_index'] = (int) ($target['avatar_index'] ?? 0);
        $target['conquistas'] = Database::decodeJsonArray($target['conquistas'] ?? null);
        $target['completed_lessons'] = Database::decodeJsonArray($target['completed_lessons'] ?? null);

        $isSelf = $friendUserId === $userId;
        $isAdmin = ($user['role'] ?? '') === 'admin';
        $bond = $isSelf ? null : ProgressShared::findFriendshipBetween($userId, $friendUserId);
        $isAcceptedFriend = $bond && ($bond['status'] ?? '') === 'accepted';
        $sameTurma = !empty($user['turma']) && !empty($target['turma']) && $user['turma'] === $target['turma'];

        if (!$isSelf && !$isAdmin && !$isAcceptedFriend && !$sameTurma) {
            Http::error(403, 'Apenas Companheiros selados ou colegas de turma podem contemplar este espelho.');
        }

        $bondStatus = $isSelf ? 'self' : ProgressShared::resolveBondStatus($bond, $userId);
        $friendshipId = $bond ? (int) $bond['id'] : null;

        if (!$isSelf && !$isAdmin && !$isAcceptedFriend && $sameTurma) {
            Http::json(200, [
                'ok' => true,
                'profile' => array_merge(ProgressShared::toTurmaMirrorProfile($target), [
                    'bondStatus' => $bondStatus,
                    'friendshipId' => $friendshipId,
                ]),
                'sharedNotes' => [],
            ]);
        }

        $sStmt = $pdo->prepare(
            'SELECT `note_id`, `created_at` FROM `user_note_shares`
             WHERE `recipient_id` = :uid ORDER BY `created_at` DESC'
        );
        $sStmt->execute([':uid' => $userId]);
        $shares = $sStmt->fetchAll(PDO::FETCH_ASSOC);

        $sharedNotes = [];
        if ($shares !== []) {
            $noteIds = array_map(static fn(array $s): int => (int) $s['note_id'], $shares);
            $placeholders = implode(', ', array_fill(0, count($noteIds), '?'));
            $params = array_merge([$friendUserId], $noteIds);
            $nStmt = $pdo->prepare(
                "SELECT `id`, `user_id`, `lesson_id`, `title`, `body`, `created_at`, `updated_at`
                 FROM `user_notes`
                 WHERE `user_id` = ? AND `id` IN ({$placeholders})
                 ORDER BY `updated_at` DESC"
            );
            $nStmt->execute($params);
            foreach ($nStmt->fetchAll(PDO::FETCH_ASSOC) as $n) {
                $sharedNotes[] = self::toNoteDto($n, $target, []);
            }
        }

        Http::json(200, [
            'ok' => true,
            'profile' => array_merge(ProgressShared::toPublicFriendProfile($target), [
                'bondStatus' => $bondStatus,
                'friendshipId' => $friendshipId,
            ]),
            'sharedNotes' => $sharedNotes,
        ]);
    }

    // -------------------------------------------------------------------------
    // Grimório de Notas (`user_notes`, `user_note_shares`, `user_note_events`)
    // -------------------------------------------------------------------------

    /**
     * @param array<string, mixed> $noteRow
     * @param array<string, mixed>|null $ownerCard
     * @param array<int, array<string, mixed>> $sharedWith
     * @return array<string, mixed>
     */
    private static function toNoteDto(array $noteRow, ?array $ownerCard = null, array $sharedWith = []): array
    {
        $lessonId = !empty($noteRow['lesson_id']) ? (string) $noteRow['lesson_id'] : null;
        $lesson = ($lessonId && isset(GameCatalog::LESSON_CATALOG[$lessonId])) ? GameCatalog::LESSON_CATALOG[$lessonId] : null;
        return [
            'id' => (int) $noteRow['id'],
            'userId' => (int) $noteRow['user_id'],
            'lessonId' => $lessonId,
            'lessonTitle' => $lesson ? $lesson['lessonTitle'] : null,
            'title' => (string) ($noteRow['title'] ?? ''),
            'body' => (string) ($noteRow['body'] ?? ''),
            'createdAt' => Database::sqlToIso($noteRow['created_at'] ?? null),
            'updatedAt' => Database::sqlToIso($noteRow['updated_at'] ?? null),
            'owner' => $ownerCard ? ProgressShared::toFriendCard($ownerCard) : null,
            'sharedWith' => $sharedWith,
        ];
    }

    private static function sanitizeLessonScope(mixed $rawLessonId): ?string
    {
        if ($rawLessonId === null || $rawLessonId === '' || $rawLessonId === 'general') {
            return null;
        }
        $id = trim((string) $rawLessonId);
        if (!isset(GameCatalog::LESSON_CATALOG[$id])) {
            return '__invalid__';
        }
        if (!ProgressShared::isLessonPublishedForNotes($id)) {
            return '__unpublished__';
        }
        return $id;
    }

    /**
     * @return array<string, mixed>
     */
    private static function gatherGrimoireStats(int $userId): array
    {
        $pdo = Database::pdo();
        $nStmt = $pdo->prepare('SELECT `id`, `lesson_id`, `body` FROM `user_notes` WHERE `user_id` = :uid');
        $nStmt->execute([':uid' => $userId]);
        $noteRows = $nStmt->fetchAll(PDO::FETCH_ASSOC);

        $noteIds = [];
        $distinctLessons = [];
        $maxBodyLength = 0;

        foreach ($noteRows as $n) {
            $noteIds[] = (int) $n['id'];
            if (!empty($n['lesson_id'])) {
                $distinctLessons[(string) $n['lesson_id']] = true;
            }
            $len = mb_strlen((string) ($n['body'] ?? ''), 'UTF-8');
            if ($len > $maxBodyLength) {
                $maxBodyLength = $len;
            }
        }

        $sharedNotesCount = 0;
        if ($noteIds !== []) {
            $placeholders = implode(', ', array_fill(0, count($noteIds), '?'));
            $sStmt = $pdo->prepare("SELECT DISTINCT `note_id` FROM `user_note_shares` WHERE `note_id` IN ({$placeholders})");
            $sStmt->execute($noteIds);
            $sharedNotesCount = count($sStmt->fetchAll(PDO::FETCH_ASSOC));
        }

        $eStmt = $pdo->prepare(
            'SELECT COUNT(*) FROM `user_note_events` WHERE `owner_id` = :uid AND `event_type` = \'cloned\''
        );
        $eStmt->execute([':uid' => $userId]);
        $clonesReceivedCount = (int) $eStmt->fetchColumn();

        return [
            'totalNotes' => count($noteRows),
            'distinctLessonIdsCount' => count($distinctLessons),
            'maxBodyLength' => $maxBodyLength,
            'sharedNotesCount' => $sharedNotesCount,
            'clonesReceivedCount' => $clonesReceivedCount,
        ];
    }

    /**
     * @param array<string, mixed> $user
     * @param array<int, string> $extraIds
     * @return array{user: array<string, mixed>, awarded: array<string, mixed>, leveledUp: bool}
     */
    private static function evaluateAndAwardGrimoire(array $user, array $extraIds = []): array
    {
        $stats = self::gatherGrimoireStats((int) $user['id']);
        $existing = is_array($user['conquistas'] ?? null) ? array_values($user['conquistas']) : [];
        $fromStats = AchievementsEvaluator::evaluateGrimoire($stats, $existing);
        return ProgressShared::awardAchievementIds($user, array_merge($fromStats, $extraIds));
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function notesList(array $user, int $userId, array $body): never
    {
        $lessonFilter = array_key_exists('lessonId', $body) ? $body['lessonId'] : '__all__';
        $pdo = Database::pdo();

        if ($lessonFilter === null || $lessonFilter === 'general') {
            $stmt = $pdo->prepare(
                'SELECT `id`, `user_id`, `lesson_id`, `title`, `body`, `created_at`, `updated_at`
                 FROM `user_notes`
                 WHERE `user_id` = :uid AND `lesson_id` IS NULL
                 ORDER BY `updated_at` DESC'
            );
            $stmt->execute([':uid' => $userId]);
        } elseif ($lessonFilter !== '__all__' && is_string($lessonFilter) && trim($lessonFilter) !== '') {
            $stmt = $pdo->prepare(
                'SELECT `id`, `user_id`, `lesson_id`, `title`, `body`, `created_at`, `updated_at`
                 FROM `user_notes`
                 WHERE `user_id` = :uid AND `lesson_id` = :lid
                 ORDER BY `updated_at` DESC'
            );
            $stmt->execute([':uid' => $userId, ':lid' => trim($lessonFilter)]);
        } else {
            $stmt = $pdo->prepare(
                'SELECT `id`, `user_id`, `lesson_id`, `title`, `body`, `created_at`, `updated_at`
                 FROM `user_notes`
                 WHERE `user_id` = :uid
                 ORDER BY `updated_at` DESC'
            );
            $stmt->execute([':uid' => $userId]);
        }
        $myRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $myNoteIds = array_map(static fn(array $n): int => (int) $n['id'], $myRows);
        $myShareRows = [];
        if ($myNoteIds !== []) {
            $placeholders = implode(', ', array_fill(0, count($myNoteIds), '?'));
            $shStmt = $pdo->prepare(
                "SELECT `note_id`, `recipient_id`, `created_at` FROM `user_note_shares` WHERE `note_id` IN ({$placeholders})"
            );
            $shStmt->execute($myNoteIds);
            $myShareRows = $shStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        $incStmt = $pdo->prepare(
            'SELECT `note_id`, `recipient_id`, `created_at`
             FROM `user_note_shares`
             WHERE `recipient_id` = :uid
             ORDER BY `created_at` DESC'
        );
        $incStmt->execute([':uid' => $userId]);
        $incomingShareRows = $incStmt->fetchAll(PDO::FETCH_ASSOC);

        $sharedNoteRows = [];
        if ($incomingShareRows !== []) {
            $incNoteIds = array_map(static fn(array $s): int => (int) $s['note_id'], $incomingShareRows);
            $placeholders = implode(', ', array_fill(0, count($incNoteIds), '?'));
            if ($lessonFilter === null || $lessonFilter === 'general') {
                $snStmt = $pdo->prepare(
                    "SELECT `id`, `user_id`, `lesson_id`, `title`, `body`, `created_at`, `updated_at`
                     FROM `user_notes`
                     WHERE `id` IN ({$placeholders}) AND `lesson_id` IS NULL
                     ORDER BY `updated_at` DESC"
                );
                $snStmt->execute($incNoteIds);
            } elseif ($lessonFilter !== '__all__' && is_string($lessonFilter) && trim($lessonFilter) !== '') {
                $snStmt = $pdo->prepare(
                    "SELECT `id`, `user_id`, `lesson_id`, `title`, `body`, `created_at`, `updated_at`
                     FROM `user_notes`
                     WHERE `id` IN ({$placeholders}) AND `lesson_id` = ?
                     ORDER BY `updated_at` DESC"
                );
                $snStmt->execute(array_merge($incNoteIds, [trim($lessonFilter)]));
            } else {
                $snStmt = $pdo->prepare(
                    "SELECT `id`, `user_id`, `lesson_id`, `title`, `body`, `created_at`, `updated_at`
                     FROM `user_notes`
                     WHERE `id` IN ({$placeholders})
                     ORDER BY `updated_at` DESC"
                );
                $snStmt->execute($incNoteIds);
            }
            $sharedNoteRows = $snStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        $evStmt = $pdo->prepare(
            'SELECT `id`, `note_id`, `note_title`, `owner_id`, `actor_id`, `event_type`, `acknowledged_at`, `created_at`
             FROM `user_note_events`
             WHERE `owner_id` = :uid AND `acknowledged_at` IS NULL
             ORDER BY `created_at` DESC
             LIMIT 30'
        );
        $evStmt->execute([':uid' => $userId]);
        $eventRows = $evStmt->fetchAll(PDO::FETCH_ASSOC);

        $relatedUserIds = [];
        foreach ($myShareRows as $s) {
            $relatedUserIds[] = (int) $s['recipient_id'];
        }
        foreach ($sharedNoteRows as $n) {
            $relatedUserIds[] = (int) $n['user_id'];
        }
        foreach ($eventRows as $ev) {
            $relatedUserIds[] = (int) $ev['actor_id'];
        }
        $usersById = ProgressShared::fetchUsersByIds($relatedUserIds);

        $sharesByNoteId = [];
        foreach ($myShareRows as $s) {
            $recId = (int) $s['recipient_id'];
            $rec = $usersById[$recId] ?? null;
            if (!$rec) {
                continue;
            }
            $nid = (int) $s['note_id'];
            $sharesByNoteId[$nid][] = array_merge(ProgressShared::toFriendCard($rec), [
                'sharedAt' => Database::sqlToIso($s['created_at'] ?? null),
            ]);
        }

        $myNotes = [];
        foreach ($myRows as $n) {
            $nid = (int) $n['id'];
            $myNotes[] = self::toNoteDto($n, $user, $sharesByNoteId[$nid] ?? []);
        }

        $sharedWithMe = [];
        foreach ($sharedNoteRows as $n) {
            $ownerId = (int) $n['user_id'];
            $sharedWithMe[] = self::toNoteDto($n, $usersById[$ownerId] ?? null, []);
        }

        $pendingEvents = [];
        foreach ($eventRows as $ev) {
            $actorId = (int) $ev['actor_id'];
            $actor = $usersById[$actorId] ?? null;
            $pendingEvents[] = [
                'id' => (int) $ev['id'],
                'noteId' => isset($ev['note_id']) ? (int) $ev['note_id'] : null,
                'noteTitle' => (string) ($ev['note_title'] ?? ''),
                'eventType' => (string) ($ev['event_type'] ?? ''),
                'createdAt' => Database::sqlToIso($ev['created_at'] ?? null),
                'actor' => $actor ? ProgressShared::toFriendCard($actor) : null,
            ];
        }

        Http::json(200, [
            'ok' => true,
            'myNotes' => $myNotes,
            'sharedWithMe' => $sharedWithMe,
            'pendingEvents' => $pendingEvents,
            'softWarnCount' => ProgressShared::NOTE_SOFT_WARN_COUNT,
            'limits' => [
                'titleMax' => ProgressShared::NOTE_TITLE_MAX,
                'bodyMax' => ProgressShared::NOTE_BODY_MAX,
            ],
        ]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function noteGet(array $user, int $userId, array $body): never
    {
        $noteId = is_numeric($body['noteId'] ?? null) ? (int) $body['noteId'] : 0;
        if ($noteId <= 0) {
            Http::error(400, 'Nota inválida.');
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'SELECT `id`, `user_id`, `lesson_id`, `title`, `body`, `created_at`, `updated_at`
             FROM `user_notes` WHERE `id` = :id LIMIT 1'
        );
        $stmt->execute([':id' => $noteId]);
        $note = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$note) {
            Http::error(404, 'Nota não encontrada.');
        }

        $ownerId = (int) $note['user_id'];
        $isOwner = $ownerId === $userId;
        $isAdmin = ($user['role'] ?? '') === 'admin';
        $isRecipient = false;

        if (!$isOwner && !$isAdmin) {
            $shStmt = $pdo->prepare(
                'SELECT `note_id` FROM `user_note_shares` WHERE `note_id` = :nid AND `recipient_id` = :uid LIMIT 1'
            );
            $shStmt->execute([':nid' => $noteId, ':uid' => $userId]);
            $isRecipient = (bool) $shStmt->fetch(PDO::FETCH_ASSOC);
        }

        if (!$isOwner && !$isAdmin && !$isRecipient) {
            Http::error(403, 'Este pergaminho não foi compartilhado com você.');
        }

        $usersById = ProgressShared::fetchUsersByIds([$ownerId]);
        $sharedWith = [];
        if ($isOwner || $isAdmin) {
            $shStmt = $pdo->prepare(
                'SELECT `recipient_id`, `created_at` FROM `user_note_shares` WHERE `note_id` = :nid'
            );
            $shStmt->execute([':nid' => $noteId]);
            $shRows = $shStmt->fetchAll(PDO::FETCH_ASSOC);
            $recMap = ProgressShared::fetchUsersByIds(array_map(static fn(array $s): int => (int) $s['recipient_id'], $shRows));
            foreach ($shRows as $s) {
                $rid = (int) $s['recipient_id'];
                if (isset($recMap[$rid])) {
                    $sharedWith[] = array_merge(ProgressShared::toFriendCard($recMap[$rid]), [
                        'sharedAt' => Database::sqlToIso($s['created_at'] ?? null),
                    ]);
                }
            }
        }

        Http::json(200, [
            'ok' => true,
            'note' => self::toNoteDto($note, $usersById[$ownerId] ?? null, $sharedWith),
            'permissions' => [
                'canEdit' => $isOwner,
                'canShare' => $isOwner,
                'isAdminView' => $isAdmin && !$isOwner,
            ],
        ]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function noteCreate(array $user, int $userId, array $body): never
    {
        $scope = self::sanitizeLessonScope($body['lessonId'] ?? null);
        if ($scope === '__invalid__') {
            Http::error(400, 'Aula inválida para vincular a nota.');
        }
        if ($scope === '__unpublished__') {
            Http::error(403, 'Esta aula ainda está selada pelo Mestre; só é possível anotar em aulas liberadas ou em Notas Gerais.');
        }

        $rawTitle = isset($body['title']) && is_string($body['title']) ? trim($body['title']) : '';
        $rawBody = isset($body['body']) && is_string($body['body']) ? $body['body'] : '';

        if (mb_strlen($rawTitle, 'UTF-8') > ProgressShared::NOTE_TITLE_MAX) {
            Http::error(400, 'Título excede ' . ProgressShared::NOTE_TITLE_MAX . ' caracteres.');
        }
        if (mb_strlen($rawBody, 'UTF-8') > ProgressShared::NOTE_BODY_MAX) {
            Http::error(400, 'Texto excede ' . ProgressShared::NOTE_BODY_MAX . ' caracteres.');
        }
        if ($rawTitle === '' && trim($rawBody) === '') {
            Http::error(400, 'Escreva um título ou conteúdo antes de guardar.');
        }

        $title = $rawTitle !== '' ? $rawTitle : 'Pergaminho sem título';
        $nowSql = Database::nowSql();

        $pdo = Database::pdo();
        $ins = $pdo->prepare(
            'INSERT INTO `user_notes` (`user_id`, `lesson_id`, `title`, `body`, `created_at`, `updated_at`)
             VALUES (:uid, :lid, :title, :body, :ca, :ua)'
        );
        $ins->execute([
            ':uid' => $userId,
            ':lid' => $scope,
            ':title' => $title,
            ':body' => $rawBody,
            ':ca' => $nowSql,
            ':ua' => $nowSql,
        ]);
        $newId = (int) $pdo->lastInsertId();

        $inserted = [
            'id' => $newId,
            'user_id' => $userId,
            'lesson_id' => $scope,
            'title' => $title,
            'body' => $rawBody,
            'created_at' => $nowSql,
            'updated_at' => $nowSql,
        ];

        $grimoire = self::evaluateAndAwardGrimoire($user);

        Http::json(201, [
            'ok' => true,
            'note' => self::toNoteDto($inserted, $grimoire['user'], []),
            'user' => GameCatalog::sanitizeUser($grimoire['user']),
            'awarded' => $grimoire['awarded'],
            'leveledUp' => $grimoire['leveledUp'],
        ]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function noteUpdate(array $user, int $userId, array $body): never
    {
        $noteId = is_numeric($body['noteId'] ?? null) ? (int) $body['noteId'] : 0;
        if ($noteId <= 0) {
            Http::error(400, 'Nota inválida.');
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT * FROM `user_notes` WHERE `id` = :id LIMIT 1');
        $stmt->execute([':id' => $noteId]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            Http::error(404, 'Nota não encontrada.');
        }
        if ((int) $existing['user_id'] !== $userId) {
            Http::error(403, 'Apenas o autor pode editar este pergaminho.');
        }

        $lessonScope = $existing['lesson_id'];
        if (array_key_exists('lessonId', $body)) {
            $scope = self::sanitizeLessonScope($body['lessonId']);
            if ($scope === '__invalid__') {
                Http::error(400, 'Aula inválida para vincular a nota.');
            }
            if ($scope === '__unpublished__' && $scope !== $existing['lesson_id']) {
                Http::error(403, 'Esta aula ainda está selada pelo Mestre; só é possível vincular a aulas liberadas ou a Notas Gerais.');
            }
            $lessonScope = ($scope === '__unpublished__') ? $existing['lesson_id'] : $scope;
        }

        $nextTitle = array_key_exists('title', $body) && is_string($body['title'])
            ? (trim($body['title']) !== '' ? trim($body['title']) : 'Pergaminho sem título')
            : (string) $existing['title'];
        $nextBody = array_key_exists('body', $body) && is_string($body['body'])
            ? $body['body']
            : (string) $existing['body'];

        if (mb_strlen($nextTitle, 'UTF-8') > ProgressShared::NOTE_TITLE_MAX) {
            Http::error(400, 'Título excede ' . ProgressShared::NOTE_TITLE_MAX . ' caracteres.');
        }
        if (mb_strlen($nextBody, 'UTF-8') > ProgressShared::NOTE_BODY_MAX) {
            Http::error(400, 'Texto excede ' . ProgressShared::NOTE_BODY_MAX . ' caracteres.');
        }

        $nowSql = Database::nowSql();
        $upd = $pdo->prepare(
            'UPDATE `user_notes`
             SET `title` = :title, `body` = :body, `lesson_id` = :lid, `updated_at` = :ua
             WHERE `id` = :id'
        );
        $upd->execute([
            ':title' => $nextTitle,
            ':body' => $nextBody,
            ':lid' => $lessonScope,
            ':ua' => $nowSql,
            ':id' => $noteId,
        ]);

        $updatedRow = [
            'id' => $noteId,
            'user_id' => $userId,
            'lesson_id' => $lessonScope,
            'title' => $nextTitle,
            'body' => $nextBody,
            'created_at' => $existing['created_at'],
            'updated_at' => $nowSql,
        ];

        $grimoire = self::evaluateAndAwardGrimoire($user);

        Http::json(200, [
            'ok' => true,
            'note' => self::toNoteDto($updatedRow, $grimoire['user'], []),
            'user' => GameCatalog::sanitizeUser($grimoire['user']),
            'awarded' => $grimoire['awarded'],
            'leveledUp' => $grimoire['leveledUp'],
        ]);
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function noteDelete(int $userId, array $body): never
    {
        $noteId = is_numeric($body['noteId'] ?? null) ? (int) $body['noteId'] : 0;
        if ($noteId <= 0) {
            Http::error(400, 'Nota inválida.');
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT `id`, `user_id` FROM `user_notes` WHERE `id` = :id LIMIT 1');
        $stmt->execute([':id' => $noteId]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            Http::error(404, 'Nota não encontrada.');
        }
        if ((int) $existing['user_id'] !== $userId) {
            Http::error(403, 'Apenas o autor pode queimar este pergaminho.');
        }

        $del = $pdo->prepare('DELETE FROM `user_notes` WHERE `id` = :id');
        $del->execute([':id' => $noteId]);

        Http::json(200, ['ok' => true, 'deletedNoteId' => $noteId]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function noteShare(array $user, int $userId, array $body): never
    {
        $noteId = is_numeric($body['noteId'] ?? null) ? (int) $body['noteId'] : 0;
        $friendUserId = is_numeric($body['friendUserId'] ?? null) ? (int) $body['friendUserId'] : 0;

        if ($noteId <= 0 || $friendUserId <= 0) {
            Http::error(400, 'Parâmetros inválidos.');
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT `id`, `user_id` FROM `user_notes` WHERE `id` = :id LIMIT 1');
        $stmt->execute([':id' => $noteId]);
        $note = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$note) {
            Http::error(404, 'Nota não encontrada.');
        }
        if ((int) $note['user_id'] !== $userId) {
            Http::error(403, 'Apenas o autor pode compartilhar esta nota.');
        }

        $bond = ProgressShared::findFriendshipBetween($userId, $friendUserId);
        if (!$bond || ($bond['status'] ?? '') !== 'accepted') {
            Http::error(403, 'Você só pode compartilhar notas com Companheiros selados.');
        }

        $nowSql = Database::nowSql();
        $nowIso = Database::nowIso();
        $ups = $pdo->prepare(
            'INSERT INTO `user_note_shares` (`note_id`, `recipient_id`, `created_at`)
             VALUES (:nid, :rid, :ca)
             ON DUPLICATE KEY UPDATE `created_at` = VALUES(`created_at`)'
        );
        $ups->execute([':nid' => $noteId, ':rid' => $friendUserId, ':ca' => $nowSql]);

        $grimoire = self::evaluateAndAwardGrimoire($user, ['grimorio_partilha']);
        $friendsMap = ProgressShared::fetchUsersByIds([$friendUserId]);
        $friend = $friendsMap[$friendUserId] ?? null;

        Http::json(200, [
            'ok' => true,
            'sharedWith' => $friend
                ? array_merge(ProgressShared::toFriendCard($friend), ['sharedAt' => $nowIso])
                : null,
            'user' => GameCatalog::sanitizeUser($grimoire['user']),
            'awarded' => $grimoire['awarded'],
            'leveledUp' => $grimoire['leveledUp'],
        ]);
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function noteUnshare(int $userId, array $body): never
    {
        $noteId = is_numeric($body['noteId'] ?? null) ? (int) $body['noteId'] : 0;
        $friendUserId = is_numeric($body['friendUserId'] ?? null) ? (int) $body['friendUserId'] : 0;

        if ($noteId <= 0 || $friendUserId <= 0) {
            Http::error(400, 'Parâmetros inválidos.');
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT `id`, `user_id` FROM `user_notes` WHERE `id` = :id LIMIT 1');
        $stmt->execute([':id' => $noteId]);
        $note = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$note) {
            Http::error(404, 'Nota não encontrada.');
        }
        $isOwner = (int) $note['user_id'] === $userId;
        $isRecipientSelf = $friendUserId === $userId;
        if (!$isOwner && !$isRecipientSelf) {
            Http::error(403, 'Operação não permitida.');
        }

        $del = $pdo->prepare('DELETE FROM `user_note_shares` WHERE `note_id` = :nid AND `recipient_id` = :rid');
        $del->execute([':nid' => $noteId, ':rid' => $friendUserId]);

        Http::json(200, ['ok' => true, 'noteId' => $noteId, 'friendUserId' => $friendUserId]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function noteClone(array $user, int $userId, array $body): never
    {
        $noteId = is_numeric($body['noteId'] ?? null) ? (int) $body['noteId'] : 0;
        if ($noteId <= 0) {
            Http::error(400, 'Nota inválida.');
        }

        $pdo = Database::pdo();
        $shStmt = $pdo->prepare(
            'SELECT `note_id` FROM `user_note_shares` WHERE `note_id` = :nid AND `recipient_id` = :uid LIMIT 1'
        );
        $shStmt->execute([':nid' => $noteId, ':uid' => $userId]);
        if (!$shStmt->fetch(PDO::FETCH_ASSOC)) {
            Http::error(403, 'Este pergaminho não foi compartilhado com você.');
        }

        $nStmt = $pdo->prepare('SELECT * FROM `user_notes` WHERE `id` = :id LIMIT 1');
        $nStmt->execute([':id' => $noteId]);
        $sourceNote = $nStmt->fetch(PDO::FETCH_ASSOC);

        if (!$sourceNote) {
            Http::error(404, 'Pergaminho original não encontrado.');
        }

        $ownerId = (int) $sourceNote['user_id'];
        $ownersMap = ProgressShared::fetchUsersByIds([$ownerId]);
        $ownerRow = $ownersMap[$ownerId] ?? null;
        $ownerLabel = $ownerRow ? '@' . $ownerRow['username'] : 'um Companheiro';

        $prefix = "[Cópia de {$ownerLabel}] ";
        $rawClonedTitle = $prefix . ($sourceNote['title'] ?: 'Pergaminho');
        $clonedTitle = mb_substr($rawClonedTitle, 0, ProgressShared::NOTE_TITLE_MAX, 'UTF-8');
        $clonedBody = mb_substr((string) ($sourceNote['body'] ?? ''), 0, ProgressShared::NOTE_BODY_MAX, 'UTF-8');
        $clonedScope = (!empty($sourceNote['lesson_id']) && ProgressShared::isLessonPublishedForNotes((string) $sourceNote['lesson_id']))
            ? (string) $sourceNote['lesson_id']
            : null;

        $nowSql = Database::nowSql();
        $ins = $pdo->prepare(
            'INSERT INTO `user_notes` (`user_id`, `lesson_id`, `title`, `body`, `created_at`, `updated_at`)
             VALUES (:uid, :lid, :title, :body, :ca, :ua)'
        );
        $ins->execute([
            ':uid' => $userId,
            ':lid' => $clonedScope,
            ':title' => $clonedTitle,
            ':body' => $clonedBody,
            ':ca' => $nowSql,
            ':ua' => $nowSql,
        ]);
        $clonedId = (int) $pdo->lastInsertId();

        $clonedNote = [
            'id' => $clonedId,
            'user_id' => $userId,
            'lesson_id' => $clonedScope,
            'title' => $clonedTitle,
            'body' => $clonedBody,
            'created_at' => $nowSql,
            'updated_at' => $nowSql,
        ];

        $evIns = $pdo->prepare(
            'INSERT INTO `user_note_events` (`note_id`, `note_title`, `owner_id`, `actor_id`, `event_type`, `created_at`)
             VALUES (:nid, :ntitle, :oid, :aid, \'cloned\', :ca)'
        );
        $evIns->execute([
            ':nid' => (int) $sourceNote['id'],
            ':ntitle' => mb_substr((string) ($sourceNote['title'] ?: 'Pergaminho'), 0, ProgressShared::NOTE_TITLE_MAX, 'UTF-8'),
            ':oid' => $ownerId,
            ':aid' => $userId,
            ':ca' => $nowSql,
        ]);

        $ownerUser = ProgressShared::loadUserById($ownerId);
        if ($ownerUser) {
            self::evaluateAndAwardGrimoire($ownerUser, ['grimorio_eco_compartilhado']);
        }

        $myGrimoire = self::evaluateAndAwardGrimoire($user, ['grimorio_escriba_aprendiz']);

        Http::json(201, [
            'ok' => true,
            'note' => self::toNoteDto($clonedNote, $myGrimoire['user'], []),
            'user' => GameCatalog::sanitizeUser($myGrimoire['user']),
            'awarded' => $myGrimoire['awarded'],
            'leveledUp' => $myGrimoire['leveledUp'],
        ]);
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function noteRefuseShare(int $userId, array $body): never
    {
        $noteId = is_numeric($body['noteId'] ?? null) ? (int) $body['noteId'] : 0;
        if ($noteId <= 0) {
            Http::error(400, 'Nota inválida.');
        }

        $pdo = Database::pdo();
        $shStmt = $pdo->prepare(
            'SELECT `note_id` FROM `user_note_shares` WHERE `note_id` = :nid AND `recipient_id` = :uid LIMIT 1'
        );
        $shStmt->execute([':nid' => $noteId, ':uid' => $userId]);
        if (!$shStmt->fetch(PDO::FETCH_ASSOC)) {
            Http::error(404, 'Compartilhamento não encontrado.');
        }

        $nStmt = $pdo->prepare('SELECT `id`, `user_id`, `title` FROM `user_notes` WHERE `id` = :id LIMIT 1');
        $nStmt->execute([':id' => $noteId]);
        $sourceNote = $nStmt->fetch(PDO::FETCH_ASSOC);

        $del = $pdo->prepare('DELETE FROM `user_note_shares` WHERE `note_id` = :nid AND `recipient_id` = :uid');
        $del->execute([':nid' => $noteId, ':uid' => $userId]);

        if ($sourceNote && (int) $sourceNote['user_id'] !== $userId) {
            $evIns = $pdo->prepare(
                'INSERT INTO `user_note_events` (`note_id`, `note_title`, `owner_id`, `actor_id`, `event_type`, `created_at`)
                 VALUES (:nid, :ntitle, :oid, :aid, \'refused\', :ca)'
            );
            $evIns->execute([
                ':nid' => (int) $sourceNote['id'],
                ':ntitle' => mb_substr((string) ($sourceNote['title'] ?: 'Pergaminho'), 0, ProgressShared::NOTE_TITLE_MAX, 'UTF-8'),
                ':oid' => (int) $sourceNote['user_id'],
                ':aid' => $userId,
                ':ca' => Database::nowSql(),
            ]);
        }

        Http::json(200, ['ok' => true, 'refusedNoteId' => $noteId]);
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function noteEventsAck(int $userId, array $body): never
    {
        $rawIds = is_array($body['eventIds'] ?? null) ? $body['eventIds'] : [];
        $ids = [];
        foreach ($rawIds as $x) {
            $n = (int) $x;
            if ($n > 0) {
                $ids[] = $n;
            }
        }

        $nowSql = Database::nowSql();
        $pdo = Database::pdo();
        if ($ids !== []) {
            $placeholders = implode(', ', array_fill(0, count($ids), '?'));
            $params = array_merge([$nowSql, $userId], $ids);
            $upd = $pdo->prepare(
                "UPDATE `user_note_events`
                 SET `acknowledged_at` = ?
                 WHERE `owner_id` = ? AND `id` IN ({$placeholders})"
            );
            $upd->execute($params);
        } else {
            $upd = $pdo->prepare(
                'UPDATE `user_note_events`
                 SET `acknowledged_at` = :now
                 WHERE `owner_id` = :uid AND `acknowledged_at` IS NULL'
            );
            $upd->execute([':now' => $nowSql, ':uid' => $userId]);
        }

        Http::json(200, ['ok' => true]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function notesListAdmin(array $user, array $body): never
    {
        ProgressShared::requireAdmin($user);

        $filterUserId = is_numeric($body['targetUserId'] ?? null) ? (int) $body['targetUserId'] : null;
        $filterLessonId = isset($body['lessonId']) && is_string($body['lessonId']) && trim($body['lessonId']) !== ''
            ? trim($body['lessonId'])
            : null;
        $rawSearch = isset($body['query']) && is_string($body['query']) ? trim($body['query']) : '';
        $cleanSearch = preg_replace('/[%_\\\\]/', '', $rawSearch) ?? '';

        $sql = 'SELECT `id`, `user_id`, `lesson_id`, `title`, `body`, `created_at`, `updated_at` FROM `user_notes` WHERE 1=1';
        $params = [];

        if ($filterUserId && $filterUserId > 0) {
            $sql .= ' AND `user_id` = :uid';
            $params[':uid'] = $filterUserId;
        }
        if ($filterLessonId === 'general') {
            $sql .= ' AND `lesson_id` IS NULL';
        } elseif ($filterLessonId) {
            $sql .= ' AND `lesson_id` = :lid';
            $params[':lid'] = $filterLessonId;
        }
        if (mb_strlen($cleanSearch, 'UTF-8') >= 2) {
            $sql .= ' AND (`title` LIKE :q1 OR `body` LIKE :q2)';
            $params[':q1'] = '%' . $cleanSearch . '%';
            $params[':q2'] = '%' . $cleanSearch . '%';
        }
        $sql .= ' ORDER BY `updated_at` DESC LIMIT 200';

        $pdo = Database::pdo();
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $ownerIds = array_map(static fn(array $r): int => (int) $r['user_id'], $rows);
        $usersById = ProgressShared::fetchUsersByIds($ownerIds);

        $notes = [];
        foreach ($rows as $r) {
            $oid = (int) $r['user_id'];
            $notes[] = self::toNoteDto($r, $usersById[$oid] ?? null, []);
        }

        Http::json(200, ['ok' => true, 'notes' => $notes]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function notesListForUser(array $user, array $body): never
    {
        ProgressShared::requireAdmin($user);
        $targetUserId = is_numeric($body['targetUserId'] ?? null) ? (int) $body['targetUserId'] : 0;
        if ($targetUserId <= 0) {
            Http::error(400, 'Informe targetUserId.');
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'SELECT `id`, `user_id`, `lesson_id`, `title`, `body`, `created_at`, `updated_at`
             FROM `user_notes`
             WHERE `user_id` = :uid
             ORDER BY `updated_at` DESC'
        );
        $stmt->execute([':uid' => $targetUserId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $usersById = ProgressShared::fetchUsersByIds([$targetUserId]);
        $owner = $usersById[$targetUserId] ?? null;

        $notes = [];
        foreach ($rows as $r) {
            $notes[] = self::toNoteDto($r, $owner, []);
        }

        Http::json(200, ['ok' => true, 'notes' => $notes]);
    }
}
