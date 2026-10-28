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

    private static function normalizeUsernameQuery(mixed $raw): string
    {
        if (!is_string($raw)) {
            return '';
        }
        return ltrim(strtolower(trim($raw)), '@');
    }

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

        $accepted = [];
        $incoming = [];
        $outgoing = [];

        foreach ($rows as $r) {
            $otherId = ((int) $r['requester_id'] === $userId) ? (int) $r['addressee_id'] : (int) $r['requester_id'];
            $other = $usersById[$otherId] ?? null;
            if (!$other) {
                continue;
            }
            $createdAtIso = Database::sqlToIso($r['created_at'] ?? null);
            $updatedAtIso = Database::sqlToIso($r['updated_at'] ?? $r['created_at'] ?? null);
            $card = ProgressShared::toFriendCard($other);
            $entry = array_merge($card, [
                'friendshipId' => (int) $r['id'],
                'status' => (string) $r['status'],
                'createdAt' => $createdAtIso,
                'updatedAt' => $updatedAtIso,
                'since' => $updatedAtIso,
                'user' => $card,
            ]);
            if ($r['status'] === 'accepted') {
                $accepted[] = $entry;
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
            'count' => count($accepted),
            'accepted' => $accepted,
            'friends' => $accepted,
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
        $ownTurma = !empty($user['turma']) ? trim((string) $user['turma']) : '';

        $pdo = Database::pdo();
        $tStmt = $pdo->query(
            'SELECT DISTINCT `turma` FROM `users`
             WHERE `role` = \'student\' AND `turma` IS NOT NULL AND `turma` <> \'\'
             ORDER BY `turma` ASC'
        );
        $turmasDisponiveis = [];
        if ($tStmt) {
            foreach ($tStmt->fetchAll(PDO::FETCH_COLUMN) as $tVal) {
                $tClean = trim((string) $tVal);
                if ($tClean !== '') {
                    $turmasDisponiveis[] = $tClean;
                }
            }
        }

        $filterTurma = null;
        if ($isAdmin) {
            $requested = isset($body['turma']) && is_string($body['turma']) ? strtoupper(trim($body['turma'])) : '';
            if ($requested !== '' && $requested !== '*' && strtolower($requested) !== 'all') {
                $filterTurma = $requested;
            }
        } else {
            if ($ownTurma === '') {
                Http::json(200, [
                    'ok' => true,
                    'turma' => null,
                    'adminView' => false,
                    'turmasDisponiveis' => [],
                    'count' => 0,
                    'classmates' => [],
                    'members' => [],
                ]);
            }
            $filterTurma = $ownTurma;
        }

        $limit = ($isAdmin && !$filterTurma) ? 300 : 100;
        if ($filterTurma) {
            $stmt = $pdo->prepare(
                "SELECT `id`, `full_name`, `username`, `turma`, `role`, `xp`, `avatar_index`, `display_name`, `avatar_mode`, `photo_path`, `photo_updated_at`
                 FROM `users`
                 WHERE `role` = 'student' AND `id` <> :uid AND `turma` = :t
                 ORDER BY `username` ASC
                 LIMIT {$limit}"
            );
            $stmt->execute([':uid' => $userId, ':t' => $filterTurma]);
        } else {
            $stmt = $pdo->prepare(
                "SELECT `id`, `full_name`, `username`, `turma`, `role`, `xp`, `avatar_index`, `display_name`, `avatar_mode`, `photo_path`, `photo_updated_at`
                 FROM `users`
                 WHERE `role` = 'student' AND `id` <> :uid
                 ORDER BY `username` ASC
                 LIMIT {$limit}"
            );
            $stmt->execute([':uid' => $userId]);
        }
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

        $classmates = [];
        foreach ($rows as $r) {
            $rid = (int) $r['id'];
            if ($rid === $userId) {
                continue;
            }
            $bond = $bondByOtherId[$rid] ?? null;
            $classmates[] = ProgressShared::toClassmateCard(
                $r,
                ProgressShared::resolveBondStatus($bond, $userId),
                $bond ? (int) $bond['id'] : null
            );
        }

        Http::json(200, [
            'ok' => true,
            'turma' => $filterTurma,
            'adminView' => $isAdmin,
            'turmasDisponiveis' => $turmasDisponiveis,
            'count' => count($classmates),
            'classmates' => $classmates,
            'members' => $classmates,
        ]);
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function friendSearch(int $userId, array $body): never
    {
        $rawQuery = self::normalizeUsernameQuery($body['query'] ?? $body['username'] ?? '');
        $escaped = preg_replace('/[%_\\\\]/', '', $rawQuery) ?? '';
        if ($escaped === '') {
            Http::json(200, ['ok' => true, 'results' => []]);
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'SELECT `id`, `full_name`, `username`, `turma`, `role`, `xp`, `avatar_index`, `display_name`, `avatar_mode`, `photo_path`, `photo_updated_at`
             FROM `users`
             WHERE (`username` LIKE :q1 OR `full_name` LIKE :q2) AND `id` <> :uid
             ORDER BY `username` ASC
             LIMIT :lim'
        );
        $like = '%' . $escaped . '%';
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
            $relation = ProgressShared::resolveBondStatus($b, $userId);
            $bondByOtherId[$otherId] = [
                'friendshipId' => (int) $b['id'],
                'status' => (string) $b['status'],
                'direction' => ((int) $b['requester_id'] === $userId) ? 'outgoing' : 'incoming',
                'relation' => $relation,
            ];
        }

        $results = [];
        foreach ($candidates as $c) {
            $cid = (int) $c['id'];
            $bond = $bondByOtherId[$cid] ?? null;
            $results[] = array_merge(ProgressShared::toFriendCard($c), [
                'relation' => $bond ? $bond['relation'] : 'none',
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
        $targetUsername = self::normalizeUsernameQuery($body['username'] ?? '');

        $pdo = Database::pdo();
        $target = null;
        if ($targetId && $targetId > 0) {
            $stmt = $pdo->prepare(
                'SELECT `id`, `full_name`, `username`, `turma`, `role`, `xp`, `avatar_index`, `display_name`, `avatar_mode`, `photo_path`, `photo_updated_at`
                 FROM `users` WHERE `id` = :id LIMIT 1'
            );
            $stmt->execute([':id' => $targetId]);
            $target = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        } elseif ($targetUsername !== '') {
            $stmt = $pdo->prepare(
                'SELECT `id`, `full_name`, `username`, `turma`, `role`, `xp`, `avatar_index`, `display_name`, `avatar_mode`, `photo_path`, `photo_updated_at`
                 FROM `users` WHERE LOWER(`username`) = :u LIMIT 1'
            );
            $stmt->execute([':u' => $targetUsername]);
            $target = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        } else {
            Http::error(400, 'Username ausente.');
        }

        if (!$target) {
            Http::error(404, 'Nenhuma alma com esse username.');
        }
        $tId = (int) $target['id'];
        if ($tId === $userId) {
            Http::error(400, 'Não se oferece vínculo a si mesmo.');
        }

        $existing = ProgressShared::findFriendshipBetween($userId, $tId);
        if ($existing) {
            if ($existing['status'] === 'accepted') {
                Http::error(409, 'Este vínculo já foi selado.');
            }
            if ((int) $existing['requester_id'] === $userId) {
                Http::error(409, 'Este convite já está em viagem.');
            }

            $myCount = ProgressShared::countAcceptedFriends($userId);
            $theirCount = ProgressShared::countAcceptedFriends($tId);
            if ($myCount >= ProgressShared::FRIEND_LIMIT) {
                Http::error(409, 'Sua companhia já está completa (' . ProgressShared::FRIEND_LIMIT . '). Rompa um vínculo para oferecer outro.');
            }
            if ($theirCount >= ProgressShared::FRIEND_LIMIT) {
                Http::error(409, 'A companhia deste aluno já está completa.');
            }

            $nowSql = Database::nowSql();
            $nowIso = Database::nowIso();
            $upd = $pdo->prepare('UPDATE `friendships` SET `status` = \'accepted\', `updated_at` = :now WHERE `id` = :id');
            $upd->execute([':now' => $nowSql, ':id' => $existing['id']]);

            $card = ProgressShared::toFriendCard($target);
            $friendshipDto = [
                'friendshipId' => (int) $existing['id'],
                'status' => 'accepted',
                'createdAt' => $existing['created_at'] ?? $nowIso,
                'updatedAt' => $nowIso,
                'since' => $nowIso,
                'user' => $card,
            ];

            Http::json(200, [
                'ok' => true,
                'autoAccepted' => true,
                'friendship' => $friendshipDto,
                'friend' => array_merge($card, [
                    'friendshipId' => (int) $existing['id'],
                    'since' => $nowIso,
                ]),
            ]);
        }

        $myCount = ProgressShared::countAcceptedFriends($userId);
        if ($myCount >= ProgressShared::FRIEND_LIMIT) {
            Http::error(409, 'Sua companhia já está completa (' . ProgressShared::FRIEND_LIMIT . '). Rompa um vínculo para oferecer outro.');
        }
        $theirCount = ProgressShared::countAcceptedFriends($tId);
        if ($theirCount >= ProgressShared::FRIEND_LIMIT) {
            Http::error(409, 'A companhia deste aluno já está completa.');
        }

        $nowSql = Database::nowSql();
        $nowIso = Database::nowIso();
        $ins = $pdo->prepare(
            'INSERT INTO `friendships` (`requester_id`, `addressee_id`, `status`, `created_at`, `updated_at`)
             VALUES (:req, :addr, \'pending\', :ca, :ua)'
        );
        $ins->execute([':req' => $userId, ':addr' => $tId, ':ca' => $nowSql, ':ua' => $nowSql]);
        $fid = (int) $pdo->lastInsertId();

        $card = ProgressShared::toFriendCard($target);
        $friendshipDto = [
            'friendshipId' => $fid,
            'status' => 'pending',
            'createdAt' => $nowIso,
            'updatedAt' => $nowIso,
            'since' => $nowIso,
            'user' => $card,
        ];

        Http::json(201, [
            'ok' => true,
            'autoAccepted' => false,
            'friendship' => $friendshipDto,
            'request' => array_merge($card, [
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
        $friendUserId = is_numeric($body['friendUserId'] ?? null) ? (int) $body['friendUserId'] : 0;
        $decision = isset($body['decision']) && is_string($body['decision']) ? strtolower(trim($body['decision'])) : '';

        if (!in_array($decision, ['accept', 'decline'], true)) {
            Http::error(400, 'Decisão inválida. Use accept ou decline.');
        }

        $pdo = Database::pdo();
        $row = null;
        if ($friendshipId > 0) {
            $stmt = $pdo->prepare('SELECT * FROM `friendships` WHERE `id` = :id LIMIT 1');
            $stmt->execute([':id' => $friendshipId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        } elseif ($friendUserId > 0) {
            $row = ProgressShared::findFriendshipBetween($userId, $friendUserId);
        } else {
            Http::error(400, 'Informe friendshipId ou friendUserId.');
        }

        if (!$row || ($row['status'] ?? '') !== 'pending' || (int) $row['addressee_id'] !== $userId) {
            Http::error(404, 'Convite pendente não encontrado.');
        }

        $rowId = (int) $row['id'];
        if ($decision === 'decline') {
            $del = $pdo->prepare('DELETE FROM `friendships` WHERE `id` = :id');
            $del->execute([':id' => $rowId]);
            Http::json(200, ['ok' => true, 'decision' => 'decline']);
        }

        $reqId = (int) $row['requester_id'];
        $myCount = ProgressShared::countAcceptedFriends($userId);
        $theirCount = ProgressShared::countAcceptedFriends($reqId);
        if ($myCount >= ProgressShared::FRIEND_LIMIT) {
            Http::error(409, 'Sua companhia já está completa (' . ProgressShared::FRIEND_LIMIT . '). Rompa um vínculo para oferecer outro.');
        }
        if ($theirCount >= ProgressShared::FRIEND_LIMIT) {
            Http::error(409, 'A companhia deste aluno já está completa.');
        }

        $nowSql = Database::nowSql();
        $nowIso = Database::nowIso();
        $upd = $pdo->prepare('UPDATE `friendships` SET `status` = \'accepted\', `updated_at` = :now WHERE `id` = :id');
        $upd->execute([':now' => $nowSql, ':id' => $rowId]);

        $others = ProgressShared::fetchUsersByIds([$reqId]);
        $other = $others[$reqId] ?? null;
        $card = $other ? ProgressShared::toFriendCard($other) : null;

        Http::json(200, [
            'ok' => true,
            'decision' => 'accept',
            'friendship' => [
                'friendshipId' => $rowId,
                'status' => 'accepted',
                'createdAt' => Database::sqlToIso($row['created_at'] ?? null) ?? $nowIso,
                'updatedAt' => $nowIso,
                'user' => $card,
            ],
            'friend' => $card
                ? array_merge($card, ['friendshipId' => $rowId, 'since' => $nowIso])
                : null,
        ]);
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function friendRemove(int $userId, array $body): never
    {
        $friendshipId = is_numeric($body['friendshipId'] ?? null) ? (int) $body['friendshipId'] : 0;
        $friendUserId = is_numeric($body['friendUserId'] ?? null) ? (int) $body['friendUserId'] : 0;
        $targetUsername = self::normalizeUsernameQuery($body['username'] ?? '');

        $pdo = Database::pdo();
        $row = null;
        if ($friendshipId > 0) {
            $stmt = $pdo->prepare('SELECT * FROM `friendships` WHERE `id` = :id LIMIT 1');
            $stmt->execute([':id' => $friendshipId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        } elseif ($friendUserId > 0) {
            $row = ProgressShared::findFriendshipBetween($userId, $friendUserId);
        } elseif ($targetUsername !== '') {
            $uStmt = $pdo->prepare('SELECT `id` FROM `users` WHERE LOWER(`username`) = :u LIMIT 1');
            $uStmt->execute([':u' => $targetUsername]);
            $tUser = $uStmt->fetch(PDO::FETCH_ASSOC);
            if (!$tUser) {
                Http::error(404, 'Vínculo não encontrado.');
            }
            $row = ProgressShared::findFriendshipBetween($userId, (int) $tUser['id']);
        } else {
            Http::error(400, 'Informe friendshipId, friendUserId ou username.');
        }

        if (!$row) {
            Http::error(404, 'Vínculo não encontrado.');
        }
        if ((int) $row['requester_id'] !== $userId && (int) $row['addressee_id'] !== $userId) {
            Http::error(403, 'Sem permissão para este vínculo.');
        }
        if (($row['status'] ?? '') === 'pending' && (int) $row['requester_id'] !== $userId) {
            Http::error(403, 'Use friendRespond para aceitar ou recusar este convite.');
        }

        $otherId = ((int) $row['requester_id'] === $userId) ? (int) $row['addressee_id'] : (int) $row['requester_id'];

        $delShares = $pdo->prepare(
            'DELETE FROM `user_note_shares`
             WHERE (`shared_with_user_id` = :u1 AND `note_id` IN (SELECT `id` FROM `user_notes` WHERE `user_id` = :o1))
                OR (`shared_with_user_id` = :o2 AND `note_id` IN (SELECT `id` FROM `user_notes` WHERE `user_id` = :u2))'
        );
        $delShares->execute([':u1' => $userId, ':o1' => $otherId, ':o2' => $otherId, ':u2' => $userId]);

        $delFriend = $pdo->prepare('DELETE FROM `friendships` WHERE `id` = :id');
        $delFriend->execute([':id' => $row['id']]);

        Http::json(200, [
            'ok' => true,
            'removed' => true,
            'friendshipId' => (int) $row['id'],
            'removedFriendUserId' => $otherId,
        ]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function friendProfile(array $user, int $userId, array $body): never
    {
        $targetUsername = self::normalizeUsernameQuery($body['username'] ?? '');
        $friendUserId = is_numeric($body['friendUserId'] ?? null) ? (int) $body['friendUserId'] : 0;

        $pdo = Database::pdo();
        $target = null;
        if ($targetUsername !== '') {
            $stmt = $pdo->prepare(
                'SELECT `id`, `full_name`, `username`, `turma`, `role`, `xp`, `conquistas`, `completed_lessons`, `avatar_index`, `display_name`, `avatar_mode`, `photo_path`, `photo_updated_at`
                 FROM `users` WHERE LOWER(`username`) = :u LIMIT 1'
            );
            $stmt->execute([':u' => $targetUsername]);
            $target = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        } elseif ($friendUserId > 0) {
            $stmt = $pdo->prepare(
                'SELECT `id`, `full_name`, `username`, `turma`, `role`, `xp`, `conquistas`, `completed_lessons`, `avatar_index`, `display_name`, `avatar_mode`, `photo_path`, `photo_updated_at`
                 FROM `users` WHERE `id` = :id LIMIT 1'
            );
            $stmt->execute([':id' => $friendUserId]);
            $target = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        } else {
            Http::error(400, 'Informe username ou friendUserId.');
        }

        if (!$target) {
            Http::error(404, 'Companheiro não encontrado.');
        }
        $targetId = (int) $target['id'];
        if ($targetId === $userId) {
            Http::error(400, 'Não é possível espelhar a si mesmo.');
        }

        $target['id'] = $targetId;
        $target['xp'] = (int) ($target['xp'] ?? 0);
        $target['avatar_index'] = (int) ($target['avatar_index'] ?? 0);
        $target['conquistas'] = Database::decodeJsonArray($target['conquistas'] ?? null);
        $target['completed_lessons'] = Database::decodeJsonArray($target['completed_lessons'] ?? null);

        $bond = ProgressShared::findFriendshipBetween($userId, $targetId);
        $bondStatus = ProgressShared::resolveBondStatus($bond, $userId);
        $friendshipId = $bond ? (int) $bond['id'] : null;

        if ($bondStatus === 'accepted') {
            Http::json(200, [
                'ok' => true,
                'bondStatus' => $bondStatus,
                'includeAchievements' => true,
                'profile' => array_merge(ProgressShared::toPublicFriendProfile($target), [
                    'bondStatus' => $bondStatus,
                    'friendshipId' => $friendshipId,
                ]),
            ]);
        }

        $canTurmaMirror = ($target['role'] ?? '') !== 'admin'
            && ($user['role'] ?? '') !== 'admin'
            && !empty($user['turma'])
            && !empty($target['turma'])
            && strcasecmp((string) $user['turma'], (string) $target['turma']) === 0;

        if ($canTurmaMirror) {
            Http::json(200, [
                'ok' => true,
                'bondStatus' => $bondStatus,
                'includeAchievements' => false,
                'profile' => array_merge(ProgressShared::toTurmaMirrorProfile($target), [
                    'bondStatus' => $bondStatus,
                    'friendshipId' => $friendshipId,
                ]),
            ]);
        }

        if ($bondStatus === 'outgoing' || $bondStatus === 'incoming') {
            Http::json(403, [
                'ok' => false,
                'error' => 'É preciso um vínculo para contemplar este espelho.',
                'bondStatus' => $bondStatus,
            ]);
        }

        Http::json(403, [
            'ok' => false,
            'error' => 'Este espelho não se abre a estranhos da jornada.',
            'bondStatus' => 'none',
        ]);
    }

    // -------------------------------------------------------------------------
    // Grimório de Notas (`user_notes`, `user_note_shares`, `user_note_events`)
    // -------------------------------------------------------------------------

    /**
     * @return array<int, string>
     */
    private static function normalizeNoteTags(mixed $raw): array
    {
        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            $raw = is_array($decoded) ? $decoded : [];
        }
        if (!is_array($raw)) {
            return [];
        }
        $seen = [];
        $out = [];
        foreach ($raw as $entry) {
            if (!is_string($entry)) {
                continue;
            }
            $tag = mb_substr(trim($entry), 0, 32, 'UTF-8');
            if ($tag === '') {
                continue;
            }
            $key = mb_strtolower($tag, 'UTF-8');
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $out[] = $tag;
            if (count($out) >= 8) {
                break;
            }
        }
        return $out;
    }

    /**
     * @param array<string, mixed> $row
     * @param array<string, mixed> $shareMeta
     * @return array<string, mixed>
     */
    private static function toNoteSummary(array $row, array $shareMeta = []): array
    {
        $tags = self::normalizeNoteTags($row['tags'] ?? []);
        return [
            'id' => (int) $row['id'],
            'title' => (string) ($row['title'] ?? ''),
            'pinned' => !empty($row['pinned']),
            'tags' => $tags,
            'lessonId' => !empty($row['lesson_id']) ? (string) $row['lesson_id'] : null,
            'clonedFromNoteId' => !empty($row['cloned_from_note_id']) ? (int) $row['cloned_from_note_id'] : null,
            'createdAt' => Database::sqlToIso($row['created_at'] ?? null),
            'updatedAt' => Database::sqlToIso($row['updated_at'] ?? null),
            'sharedWithCount' => (int) ($shareMeta['sharedWithCount'] ?? 0),
            'sharedWithUsernames' => is_array($shareMeta['sharedWithUsernames'] ?? null)
                ? array_values($shareMeta['sharedWithUsernames'])
                : [],
            'unreadEventsCount' => (int) ($shareMeta['unreadEventsCount'] ?? 0),
        ];
    }

    /**
     * @param array<string, mixed> $row
     * @param array<int, array<string, mixed>> $sharedWith
     * @param array<string, mixed> $extras
     * @return array<string, mixed>
     */
    private static function toNoteDetail(array $row, array $sharedWith = [], array $extras = []): array
    {
        $usernames = [];
        foreach ($sharedWith as $u) {
            if (!empty($u['username'])) {
                $usernames[] = (string) $u['username'];
            }
        }
        $summary = self::toNoteSummary($row, [
            'sharedWithCount' => count($sharedWith),
            'sharedWithUsernames' => $usernames,
            'unreadEventsCount' => (int) ($extras['unreadEventsCount'] ?? 0),
        ]);
        return array_merge($summary, [
            'body' => (string) ($row['body'] ?? ''),
            'userId' => (int) $row['user_id'],
            'sharedWith' => $sharedWith,
            'clonedFrom' => $extras['clonedFrom'] ?? null,
            'events' => is_array($extras['events'] ?? null) ? $extras['events'] : [],
        ]);
    }

    /**
     * @param array<int, int> $noteIds
     * @return array<int, array<int, array<string, mixed>>>
     */
    private static function fetchSharesForNotes(array $noteIds): array
    {
        $unique = array_values(array_unique(array_filter(array_map('intval', $noteIds), static fn(int $id): bool => $id > 0)));
        if ($unique === []) {
            return [];
        }
        $pdo = Database::pdo();
        $placeholders = implode(', ', array_fill(0, count($unique), '?'));
        $stmt = $pdo->prepare(
            "SELECT `note_id`, `shared_with_user_id` FROM `user_note_shares` WHERE `note_id` IN ({$placeholders})"
        );
        $stmt->execute($unique);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $userIds = array_map(static fn(array $r): int => (int) $r['shared_with_user_id'], $rows);
        $usersById = ProgressShared::fetchUsersByIds($userIds);

        $byNote = [];
        foreach ($rows as $r) {
            $nid = (int) $r['note_id'];
            $uid = (int) $r['shared_with_user_id'];
            if (!isset($byNote[$nid])) {
                $byNote[$nid] = [];
            }
            if (isset($usersById[$uid])) {
                $u = $usersById[$uid];
                $byNote[$nid][] = [
                    'userId' => (int) $u['id'],
                    'username' => (string) $u['username'],
                    'fullName' => (string) ($u['full_name'] ?: $u['username']),
                ];
            }
        }
        return $byNote;
    }

    /**
     * @param array<int, int> $noteIds
     * @return array<int, int>
     */
    private static function countUnreadNoteEvents(array $noteIds): array
    {
        $unique = array_values(array_unique(array_filter(array_map('intval', $noteIds), static fn(int $id): bool => $id > 0)));
        if ($unique === []) {
            return [];
        }
        $pdo = Database::pdo();
        $placeholders = implode(', ', array_fill(0, count($unique), '?'));
        $stmt = $pdo->prepare(
            "SELECT `note_id` FROM `user_note_events` WHERE `note_id` IN ({$placeholders}) AND `read_at` IS NULL"
        );
        $stmt->execute($unique);
        $counts = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $nid = (int) $r['note_id'];
            $counts[$nid] = ($counts[$nid] ?? 0) + 1;
        }
        return $counts;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private static function fetchNoteEventsForOwner(int $noteId, int $limit = 20): array
    {
        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'SELECT `id`, `note_id`, `actor_user_id`, `kind`, `created_at`, `read_at`
             FROM `user_note_events`
             WHERE `note_id` = :nid
             ORDER BY `created_at` DESC
             LIMIT ' . max(1, min(100, $limit))
        );
        $stmt->execute([':nid' => $noteId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $actorIds = array_map(static fn(array $r): int => (int) $r['actor_user_id'], $rows);
        $actors = ProgressShared::fetchUsersByIds($actorIds);

        $out = [];
        foreach ($rows as $r) {
            $aid = (int) $r['actor_user_id'];
            $actor = $actors[$aid] ?? null;
            $out[] = [
                'id' => (int) $r['id'],
                'kind' => (string) $r['kind'],
                'createdAt' => Database::sqlToIso($r['created_at'] ?? null),
                'readAt' => Database::sqlToIso($r['read_at'] ?? null),
                'actor' => $actor ? [
                    'userId' => (int) $actor['id'],
                    'username' => (string) $actor['username'],
                    'fullName' => (string) ($actor['full_name'] ?: $actor['username']),
                ] : null,
            ];
        }
        return $out;
    }

    private static function insertNoteEvent(int $noteId, int $actorUserId, string $kind): void
    {
        try {
            $pdo = Database::pdo();
            $stmt = $pdo->prepare(
                'INSERT INTO `user_note_events` (`note_id`, `actor_user_id`, `kind`, `created_at`)
                 VALUES (:nid, :aid, :kind, :ca)'
            );
            $stmt->execute([
                ':nid' => $noteId,
                ':aid' => $actorUserId,
                ':kind' => $kind,
                ':ca' => Database::nowSql(),
            ]);
        } catch (\Throwable) {
            // Best-effort
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function resolveClonedFrom(mixed $clonedFromNoteId): ?array
    {
        $id = is_numeric($clonedFromNoteId) ? (int) $clonedFromNoteId : 0;
        if ($id <= 0) {
            return null;
        }
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT `id`, `user_id`, `title` FROM `user_notes` WHERE `id` = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        $owners = ProgressShared::fetchUsersByIds([(int) $row['user_id']]);
        $owner = $owners[(int) $row['user_id']] ?? null;
        return [
            'noteId' => (int) $row['id'],
            'title' => (string) $row['title'],
            'owner' => $owner ? [
                'userId' => (int) $owner['id'],
                'username' => (string) $owner['username'],
                'fullName' => (string) ($owner['full_name'] ?: $owner['username']),
            ] : null,
        ];
    }

    private static function sanitizeLessonScope(mixed $rawLessonId, ?string $allowExisting = null): ?string
    {
        if ($rawLessonId === null || $rawLessonId === '' || $rawLessonId === 'general') {
            return null;
        }
        $id = trim((string) $rawLessonId);
        if (!isset(GameCatalog::LESSON_CATALOG[$id])) {
            return '__invalid__';
        }
        if ($allowExisting !== null && $id === $allowExisting) {
            return $id;
        }
        if (!ProgressShared::isLessonPublishedForNotes($id)) {
            return '__unpublished__';
        }
        return $id;
    }

    private static function countOriginalUserNotes(int $userId): int
    {
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM `user_notes` WHERE `user_id` = :uid AND `cloned_from_note_id` IS NULL');
        $stmt->execute([':uid' => $userId]);
        return (int) $stmt->fetchColumn();
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $snapshot
     * @return array{user: array<string, mixed>, awarded: array<string, mixed>, leveledUp: bool}
     */
    private static function evaluateAndAwardGrimoire(array $user, array $snapshot): array
    {
        $existing = is_array($user['conquistas'] ?? null) ? array_values($user['conquistas']) : [];
        $ids = AchievementsEvaluator::evaluateGrimoireIds(array_merge($snapshot, [
            'unlocked' => $existing,
        ]));
        return ProgressShared::awardAchievementIds($user, $ids);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function notesList(array $user, int $userId, array $body): never
    {
        $includeShared = !empty($body['includeShared']);
        $pdo = Database::pdo();

        $stmt = $pdo->prepare(
            'SELECT `id`, `user_id`, `title`, `body`, `pinned`, `tags`, `lesson_id`, `cloned_from_note_id`, `created_at`, `updated_at`
             FROM `user_notes`
             WHERE `user_id` = :uid
             ORDER BY `pinned` DESC, `updated_at` DESC'
        );
        $stmt->execute([':uid' => $userId]);
        $ownRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $ownIds = array_map(static fn(array $r): int => (int) $r['id'], $ownRows);
        $sharesByNote = self::fetchSharesForNotes($ownIds);
        $unreadByNote = self::countUnreadNoteEvents($ownIds);

        $notes = [];
        foreach ($ownRows as $row) {
            $nid = (int) $row['id'];
            $sharedWith = $sharesByNote[$nid] ?? [];
            $notes[] = self::toNoteSummary($row, [
                'sharedWithCount' => count($sharedWith),
                'sharedWithUsernames' => array_map(static fn(array $u): string => (string) $u['username'], $sharedWith),
                'unreadEventsCount' => $unreadByNote[$nid] ?? 0,
            ]);
        }

        $sharedWithMe = [];
        if ($includeShared) {
            $shStmt = $pdo->prepare(
                'SELECT `note_id` FROM `user_note_shares` WHERE `shared_with_user_id` = :uid'
            );
            $shStmt->execute([':uid' => $userId]);
            $sharedIds = array_map(static fn(array $r): int => (int) $r['note_id'], $shStmt->fetchAll(PDO::FETCH_ASSOC));

            if ($sharedIds !== []) {
                $placeholders = implode(', ', array_fill(0, count($sharedIds), '?'));
                $snStmt = $pdo->prepare(
                    "SELECT `id`, `user_id`, `title`, `body`, `pinned`, `tags`, `lesson_id`, `cloned_from_note_id`, `created_at`, `updated_at`
                     FROM `user_notes`
                     WHERE `id` IN ({$placeholders})
                     ORDER BY `updated_at` DESC"
                );
                $snStmt->execute($sharedIds);
                $sharedNotes = $snStmt->fetchAll(PDO::FETCH_ASSOC);

                $owners = ProgressShared::fetchUsersByIds(array_map(static fn(array $r): int => (int) $r['user_id'], $sharedNotes));
                foreach ($sharedNotes as $row) {
                    $oid = (int) $row['user_id'];
                    $owner = $owners[$oid] ?? null;
                    $sharedWithMe[] = array_merge(self::toNoteSummary($row), [
                        'owner' => $owner ? [
                            'userId' => (int) $owner['id'],
                            'username' => (string) $owner['username'],
                            'fullName' => (string) ($owner['full_name'] ?: $owner['username']),
                        ] : null,
                    ]);
                }
            }
        }

        $count = count($notes);
        Http::json(200, [
            'ok' => true,
            'count' => $count,
            'softWarning' => $count >= ProgressShared::NOTE_SOFT_WARN_COUNT,
            'softWarningMessage' => $count >= ProgressShared::NOTE_SOFT_WARN_COUNT
                ? "O Grimório engrossa… ({$count} inscrições)."
                : null,
            'notes' => $notes,
            'sharedWithMe' => $sharedWithMe,
        ]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function noteGet(array $user, int $userId, array $body): never
    {
        $id = is_numeric($body['noteId'] ?? null) ? (int) $body['noteId'] : 0;
        if ($id <= 0) {
            Http::error(400, 'noteId inválido.');
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'SELECT `id`, `user_id`, `title`, `body`, `pinned`, `tags`, `lesson_id`, `cloned_from_note_id`, `created_at`, `updated_at`
             FROM `user_notes` WHERE `id` = :id LIMIT 1'
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            Http::error(404, 'Inscrição não encontrada.');
        }

        $ownerId = (int) $row['user_id'];
        $isOwner = $ownerId === $userId;
        $isAdmin = ($user['role'] ?? '') === 'admin';
        $isSharedViewer = false;

        if (!$isOwner) {
            $shStmt = $pdo->prepare(
                'SELECT `note_id` FROM `user_note_shares` WHERE `note_id` = :nid AND `shared_with_user_id` = :uid LIMIT 1'
            );
            $shStmt->execute([':nid' => $id, ':uid' => $userId]);
            $isSharedViewer = (bool) $shStmt->fetch(PDO::FETCH_ASSOC);
        }

        if (!$isOwner && !$isAdmin && !$isSharedViewer) {
            Http::error(403, 'Esta inscrição não foi revelada a você.');
        }

        $sharesByNote = self::fetchSharesForNotes([$id]);
        $sharedWith = $sharesByNote[$id] ?? [];
        $canEdit = $isOwner;
        $canClone = $isSharedViewer && !$isOwner;
        $canRefuse = $isSharedViewer && !$isOwner;

        $events = [];
        $unreadEventsCount = 0;
        if ($isOwner) {
            $events = self::fetchNoteEventsForOwner($id);
            foreach ($events as $ev) {
                if (empty($ev['readAt'])) {
                    $unreadEventsCount++;
                }
            }
        }

        $clonedFrom = self::resolveClonedFrom($row['cloned_from_note_id'] ?? null);

        $owner = null;
        if (!$isOwner) {
            $owners = ProgressShared::fetchUsersByIds([$ownerId]);
            $ownerRow = $owners[$ownerId] ?? null;
            if ($ownerRow) {
                $owner = [
                    'userId' => (int) $ownerRow['id'],
                    'username' => (string) $ownerRow['username'],
                    'fullName' => (string) ($ownerRow['full_name'] ?: $ownerRow['username']),
                ];
            }
        }

        Http::json(200, [
            'ok' => true,
            'canEdit' => $canEdit,
            'canClone' => $canClone,
            'canRefuse' => $canRefuse,
            'readOnly' => !$canEdit,
            'note' => array_merge(self::toNoteDetail($row, $sharedWith, [
                'clonedFrom' => $clonedFrom,
                'events' => $events,
                'unreadEventsCount' => $unreadEventsCount,
            ]), [
                'owner' => $owner,
            ]),
        ]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function noteCreate(array $user, int $userId, array $body): never
    {
        $cleanTitle = trim((string) ($body['title'] ?? ''));
        $cleanBody = (string) ($body['body'] ?? '');
        if ($cleanTitle === '') {
            Http::error(400, 'Toda inscrição precisa de um título.');
        }
        if (mb_strlen($cleanTitle, 'UTF-8') > ProgressShared::NOTE_TITLE_MAX) {
            Http::error(400, 'O título ultrapassou o limite do pergaminho (' . ProgressShared::NOTE_TITLE_MAX . ').');
        }
        if (mb_strlen($cleanBody, 'UTF-8') > ProgressShared::NOTE_BODY_MAX) {
            Http::error(400, 'A inscrição é longa demais para este Grimório (' . ProgressShared::NOTE_BODY_MAX . ').');
        }

        $scope = self::sanitizeLessonScope($body['lessonId'] ?? null);
        if ($scope === '__invalid__') {
            Http::error(400, 'Aula desconhecida na Trilha.');
        }
        if ($scope === '__unpublished__') {
            Http::error(400, 'Esta aula ainda não foi liberada na Trilha.');
        }

        $pinned = !empty($body['pinned']) ? 1 : 0;
        $tags = self::normalizeNoteTags($body['tags'] ?? []);
        $nowSql = Database::nowSql();

        $pdo = Database::pdo();
        $ins = $pdo->prepare(
            'INSERT INTO `user_notes` (`user_id`, `title`, `body`, `pinned`, `tags`, `lesson_id`, `created_at`, `updated_at`)
             VALUES (:uid, :title, :body, :pinned, :tags, :lid, :ca, :ua)'
        );
        $ins->execute([
            ':uid' => $userId,
            ':title' => $cleanTitle,
            ':body' => $cleanBody,
            ':pinned' => $pinned,
            ':tags' => Database::encodeJsonArray($tags),
            ':lid' => $scope,
            ':ca' => $nowSql,
            ':ua' => $nowSql,
        ]);
        $newId = (int) $pdo->lastInsertId();

        $created = [
            'id' => $newId,
            'user_id' => $userId,
            'title' => $cleanTitle,
            'body' => $cleanBody,
            'pinned' => (bool) $pinned,
            'tags' => $tags,
            'lesson_id' => $scope,
            'cloned_from_note_id' => null,
            'created_at' => $nowSql,
            'updated_at' => $nowSql,
        ];

        $cntStmt = $pdo->prepare('SELECT COUNT(*) FROM `user_notes` WHERE `user_id` = :uid');
        $cntStmt->execute([':uid' => $userId]);
        $count = (int) $cntStmt->fetchColumn();
        $originalCount = self::countOriginalUserNotes($userId);

        $grimoire = self::evaluateAndAwardGrimoire($user, [
            'event' => 'create',
            'originalNoteCount' => $originalCount,
            'isCloneNote' => false,
            'note' => [
                'lessonId' => $scope,
                'body' => $cleanBody,
                'tags' => $tags,
                'shareCount' => 0,
                'pinned' => (bool) $pinned,
            ],
        ]);

        Http::json(201, [
            'ok' => true,
            'count' => $count,
            'softWarning' => $count >= ProgressShared::NOTE_SOFT_WARN_COUNT,
            'softWarningMessage' => $count >= ProgressShared::NOTE_SOFT_WARN_COUNT
                ? "O Grimório engrossa… ({$count} inscrições)."
                : null,
            'note' => self::toNoteDetail($created, []),
            'awarded' => $grimoire['awarded'],
            'leveledUp' => $grimoire['leveledUp'],
            'user' => GameCatalog::sanitizeUser($grimoire['user'], owner: true),
        ]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function noteUpdate(array $user, int $userId, array $body): never
    {
        $id = is_numeric($body['noteId'] ?? null) ? (int) $body['noteId'] : 0;
        if ($id <= 0) {
            Http::error(400, 'noteId inválido.');
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT * FROM `user_notes` WHERE `id` = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing || (int) $existing['user_id'] !== $userId) {
            Http::error(404, 'Inscrição não encontrada.');
        }

        $nextTitle = (string) $existing['title'];
        if (array_key_exists('title', $body)) {
            $cleanTitle = trim((string) ($body['title'] ?? ''));
            if ($cleanTitle === '') {
                Http::error(400, 'Toda inscrição precisa de um título.');
            }
            if (mb_strlen($cleanTitle, 'UTF-8') > ProgressShared::NOTE_TITLE_MAX) {
                Http::error(400, 'O título ultrapassou o limite do pergaminho (' . ProgressShared::NOTE_TITLE_MAX . ').');
            }
            $nextTitle = $cleanTitle;
        }

        $nextBody = (string) ($existing['body'] ?? '');
        if (array_key_exists('body', $body)) {
            $cleanBody = (string) ($body['body'] ?? '');
            if (mb_strlen($cleanBody, 'UTF-8') > ProgressShared::NOTE_BODY_MAX) {
                Http::error(400, 'A inscrição é longa demais para este Grimório (' . ProgressShared::NOTE_BODY_MAX . ').');
            }
            $nextBody = $cleanBody;
        }

        $nextPinned = array_key_exists('pinned', $body) ? (!empty($body['pinned']) ? 1 : 0) : (!empty($existing['pinned']) ? 1 : 0);
        $nextTags = array_key_exists('tags', $body)
            ? self::normalizeNoteTags($body['tags'])
            : self::normalizeNoteTags($existing['tags'] ?? []);

        $nextLesson = $existing['lesson_id'];
        if (array_key_exists('lessonId', $body)) {
            $scope = self::sanitizeLessonScope($body['lessonId'], $existing['lesson_id'] ? (string) $existing['lesson_id'] : null);
            if ($scope === '__invalid__') {
                Http::error(400, 'Aula desconhecida na Trilha.');
            }
            if ($scope === '__unpublished__') {
                Http::error(400, 'Esta aula ainda não foi liberada na Trilha.');
            }
            $nextLesson = $scope;
        }

        $nowSql = Database::nowSql();
        $upd = $pdo->prepare(
            'UPDATE `user_notes`
             SET `title` = :title, `body` = :body, `pinned` = :pinned, `tags` = :tags, `lesson_id` = :lid, `updated_at` = :ua
             WHERE `id` = :id'
        );
        $upd->execute([
            ':title' => $nextTitle,
            ':body' => $nextBody,
            ':pinned' => $nextPinned,
            ':tags' => Database::encodeJsonArray($nextTags),
            ':lid' => $nextLesson,
            ':ua' => $nowSql,
            ':id' => $id,
        ]);

        $updatedRow = array_merge($existing, [
            'title' => $nextTitle,
            'body' => $nextBody,
            'pinned' => (bool) $nextPinned,
            'tags' => $nextTags,
            'lesson_id' => $nextLesson,
            'updated_at' => $nowSql,
        ]);

        $sharesByNote = self::fetchSharesForNotes([$id]);
        $sharedWith = $sharesByNote[$id] ?? [];
        $grimoire = self::evaluateAndAwardGrimoire($user, [
            'event' => 'update',
            'originalNoteCount' => self::countOriginalUserNotes($userId),
            'isCloneNote' => !empty($updatedRow['cloned_from_note_id']),
            'note' => [
                'lessonId' => $nextLesson,
                'body' => $nextBody,
                'tags' => $nextTags,
                'shareCount' => count($sharedWith),
                'pinned' => (bool) $nextPinned,
            ],
        ]);

        Http::json(200, [
            'ok' => true,
            'note' => self::toNoteDetail($updatedRow, $sharedWith),
            'awarded' => $grimoire['awarded'],
            'leveledUp' => $grimoire['leveledUp'],
            'user' => GameCatalog::sanitizeUser($grimoire['user'], owner: true),
        ]);
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function noteDelete(int $userId, array $body): never
    {
        $id = is_numeric($body['noteId'] ?? null) ? (int) $body['noteId'] : 0;
        if ($id <= 0) {
            Http::error(400, 'noteId inválido.');
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT `id`, `user_id` FROM `user_notes` WHERE `id` = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing || (int) $existing['user_id'] !== $userId) {
            Http::error(404, 'Inscrição não encontrada.');
        }

        $del = $pdo->prepare('DELETE FROM `user_notes` WHERE `id` = :id');
        $del->execute([':id' => $id]);

        Http::json(200, ['ok' => true, 'deleted' => true, 'noteId' => $id]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function noteShare(array $user, int $userId, array $body): never
    {
        $id = is_numeric($body['noteId'] ?? null) ? (int) $body['noteId'] : 0;
        $rawTarget = $body['sharedWithUserId'] ?? $body['friendUserId'] ?? null;
        $targetId = is_numeric($rawTarget) ? (int) $rawTarget : 0;

        if ($id <= 0) {
            Http::error(400, 'noteId inválido.');
        }
        if ($targetId <= 0) {
            Http::error(400, 'Informe o companheiro.');
        }
        if ($targetId === $userId) {
            Http::error(400, 'Não se revela inscrição a si mesmo.');
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT * FROM `user_notes` WHERE `id` = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing || (int) $existing['user_id'] !== $userId) {
            Http::error(404, 'Inscrição não encontrada.');
        }

        $bond = ProgressShared::findFriendshipBetween($userId, $targetId);
        if (!$bond || ($bond['status'] ?? '') !== 'accepted') {
            Http::error(403, 'Só é possível revelar a quem está ao seu lado.');
        }

        $nowSql = Database::nowSql();
        $ups = $pdo->prepare(
            'INSERT INTO `user_note_shares` (`note_id`, `shared_with_user_id`, `created_at`)
             VALUES (:nid, :uid, :ca)
             ON DUPLICATE KEY UPDATE `created_at` = VALUES(`created_at`)'
        );
        $ups->execute([':nid' => $id, ':uid' => $targetId, ':ca' => $nowSql]);

        $sharesByNote = self::fetchSharesForNotes([$id]);
        $sharedWith = $sharesByNote[$id] ?? [];
        $grimoire = self::evaluateAndAwardGrimoire($user, [
            'event' => 'share',
            'originalNoteCount' => self::countOriginalUserNotes($userId),
            'isCloneNote' => !empty($existing['cloned_from_note_id']),
            'note' => [
                'lessonId' => $existing['lesson_id'] ?? null,
                'body' => $existing['body'] ?? '',
                'tags' => self::normalizeNoteTags($existing['tags'] ?? []),
                'shareCount' => count($sharedWith),
                'pinned' => !empty($existing['pinned']),
            ],
        ]);

        Http::json(200, [
            'ok' => true,
            'note' => self::toNoteDetail($existing, $sharedWith),
            'awarded' => $grimoire['awarded'],
            'leveledUp' => $grimoire['leveledUp'],
            'user' => GameCatalog::sanitizeUser($grimoire['user'], owner: true),
        ]);
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function noteUnshare(int $userId, array $body): never
    {
        $id = is_numeric($body['noteId'] ?? null) ? (int) $body['noteId'] : 0;
        $rawTarget = $body['sharedWithUserId'] ?? $body['friendUserId'] ?? null;
        $targetId = is_numeric($rawTarget) ? (int) $rawTarget : 0;

        if ($id <= 0) {
            Http::error(400, 'noteId inválido.');
        }
        if ($targetId <= 0) {
            Http::error(400, 'Informe o companheiro.');
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT * FROM `user_notes` WHERE `id` = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing || (int) $existing['user_id'] !== $userId) {
            Http::error(404, 'Inscrição não encontrada.');
        }

        $del = $pdo->prepare('DELETE FROM `user_note_shares` WHERE `note_id` = :nid AND `shared_with_user_id` = :uid');
        $del->execute([':nid' => $id, ':uid' => $targetId]);

        $sharesByNote = self::fetchSharesForNotes([$id]);
        Http::json(200, [
            'ok' => true,
            'note' => self::toNoteDetail($existing, $sharesByNote[$id] ?? []),
        ]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function noteClone(array $user, int $userId, array $body): never
    {
        $id = is_numeric($body['noteId'] ?? null) ? (int) $body['noteId'] : 0;
        if ($id <= 0) {
            Http::error(400, 'noteId inválido.');
        }

        $pdo = Database::pdo();
        $nStmt = $pdo->prepare('SELECT * FROM `user_notes` WHERE `id` = :id LIMIT 1');
        $nStmt->execute([':id' => $id]);
        $source = $nStmt->fetch(PDO::FETCH_ASSOC);

        if (!$source) {
            Http::error(404, 'Inscrição não encontrada.');
        }
        if ((int) $source['user_id'] === $userId) {
            Http::error(400, 'Essa inscrição já é sua.');
        }

        $shStmt = $pdo->prepare(
            'SELECT `note_id` FROM `user_note_shares` WHERE `note_id` = :nid AND `shared_with_user_id` = :uid LIMIT 1'
        );
        $shStmt->execute([':nid' => $id, ':uid' => $userId]);
        if (!$shStmt->fetch(PDO::FETCH_ASSOC)) {
            Http::error(403, 'Esta inscrição não foi revelada a você.');
        }

        $clonedScope = (!empty($source['lesson_id']) && ProgressShared::isLessonPublishedForNotes((string) $source['lesson_id']))
            ? (string) $source['lesson_id']
            : null;
        $tags = self::normalizeNoteTags($source['tags'] ?? []);
        $nowSql = Database::nowSql();

        $ins = $pdo->prepare(
            'INSERT INTO `user_notes` (`user_id`, `title`, `body`, `pinned`, `tags`, `lesson_id`, `cloned_from_note_id`, `created_at`, `updated_at`)
             VALUES (:uid, :title, :body, 0, :tags, :lid, :cfid, :ca, :ua)'
        );
        $ins->execute([
            ':uid' => $userId,
            ':title' => (string) $source['title'],
            ':body' => (string) ($source['body'] ?? ''),
            ':tags' => Database::encodeJsonArray($tags),
            ':lid' => $clonedScope,
            ':cfid' => (int) $source['id'],
            ':ca' => $nowSql,
            ':ua' => $nowSql,
        ]);
        $clonedId = (int) $pdo->lastInsertId();

        $created = [
            'id' => $clonedId,
            'user_id' => $userId,
            'title' => (string) $source['title'],
            'body' => (string) ($source['body'] ?? ''),
            'pinned' => false,
            'tags' => $tags,
            'lesson_id' => $clonedScope,
            'cloned_from_note_id' => (int) $source['id'],
            'created_at' => $nowSql,
            'updated_at' => $nowSql,
        ];

        $del = $pdo->prepare('DELETE FROM `user_note_shares` WHERE `note_id` = :nid AND `shared_with_user_id` = :uid');
        $del->execute([':nid' => $id, ':uid' => $userId]);

        self::insertNoteEvent($id, $userId, 'cloned_by');

        $clonedFrom = self::resolveClonedFrom((int) $source['id']);
        $grimoire = self::evaluateAndAwardGrimoire($user, [
            'event' => 'clone',
            'originalNoteCount' => self::countOriginalUserNotes($userId),
            'isCloneNote' => true,
            'note' => [
                'lessonId' => $clonedScope,
                'body' => (string) ($source['body'] ?? ''),
                'tags' => $tags,
                'shareCount' => 0,
            ],
        ]);

        Http::json(201, [
            'ok' => true,
            'note' => self::toNoteDetail($created, [], ['clonedFrom' => $clonedFrom]),
            'awarded' => $grimoire['awarded'],
            'leveledUp' => $grimoire['leveledUp'],
            'user' => GameCatalog::sanitizeUser($grimoire['user'], owner: true),
        ]);
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function noteRefuseShare(int $userId, array $body): never
    {
        $id = is_numeric($body['noteId'] ?? null) ? (int) $body['noteId'] : 0;
        if ($id <= 0) {
            Http::error(400, 'noteId inválido.');
        }

        $pdo = Database::pdo();
        $nStmt = $pdo->prepare('SELECT `id`, `user_id` FROM `user_notes` WHERE `id` = :id LIMIT 1');
        $nStmt->execute([':id' => $id]);
        $source = $nStmt->fetch(PDO::FETCH_ASSOC);

        if (!$source) {
            Http::error(404, 'Inscrição não encontrada.');
        }
        if ((int) $source['user_id'] === $userId) {
            Http::error(400, 'Use Velar novamente para remover companheiros.');
        }

        $shStmt = $pdo->prepare(
            'SELECT `note_id` FROM `user_note_shares` WHERE `note_id` = :nid AND `shared_with_user_id` = :uid LIMIT 1'
        );
        $shStmt->execute([':nid' => $id, ':uid' => $userId]);
        if (!$shStmt->fetch(PDO::FETCH_ASSOC)) {
            Http::error(403, 'Esta inscrição não foi revelada a você.');
        }

        $del = $pdo->prepare('DELETE FROM `user_note_shares` WHERE `note_id` = :nid AND `shared_with_user_id` = :uid');
        $del->execute([':nid' => $id, ':uid' => $userId]);

        self::insertNoteEvent($id, $userId, 'veiled_by_recipient');

        Http::json(200, ['ok' => true, 'refused' => true, 'noteId' => $id]);
    }

    /**
     * @param array<string, mixed> $body
     */
    public static function noteEventsAck(int $userId, array $body): never
    {
        $id = is_numeric($body['noteId'] ?? null) ? (int) $body['noteId'] : 0;
        if ($id <= 0) {
            Http::error(400, 'noteId inválido.');
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT `id`, `user_id` FROM `user_notes` WHERE `id` = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing || (int) $existing['user_id'] !== $userId) {
            Http::error(404, 'Inscrição não encontrada.');
        }

        $upd = $pdo->prepare(
            'UPDATE `user_note_events`
             SET `read_at` = :now
             WHERE `note_id` = :nid AND `read_at` IS NULL'
        );
        $upd->execute([':now' => Database::nowSql(), ':nid' => $id]);

        Http::json(200, ['ok' => true, 'acknowledged' => true]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function notesListAdmin(array $user, array $body): never
    {
        ProgressShared::requireAdmin($user);

        $pdo = Database::pdo();
        $stmt = $pdo->query('SELECT `user_id`, `title`, `tags` FROM `user_notes`');
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $counts = [];
        $notesByUser = [];
        foreach ($rows as $row) {
            $uid = (int) $row['user_id'];
            $counts[$uid] = ($counts[$uid] ?? 0) + 1;
            $notesByUser[$uid][] = [
                'title' => (string) ($row['title'] ?? ''),
                'tags' => self::normalizeNoteTags($row['tags'] ?? []),
            ];
        }

        $usersById = ProgressShared::fetchUsersByIds(array_keys($counts));
        $owners = [];
        foreach ($counts as $uid => $notesCount) {
            $owner = $usersById[$uid] ?? null;
            if (!$owner || ($owner['role'] ?? '') === 'admin') {
                continue;
            }
            $owners[] = [
                'userId' => $uid,
                'username' => (string) $owner['username'],
                'fullName' => (string) ($owner['full_name'] ?: $owner['username']),
                'turma' => $owner['turma'] ?? null,
                'notesCount' => $notesCount,
                'notes' => $notesByUser[$uid] ?? [],
            ];
        }

        usort($owners, static fn(array $a, array $b): int => $b['notesCount'] <=> $a['notesCount']);

        Http::json(200, ['ok' => true, 'owners' => $owners]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function notesListForUser(array $user, array $body): never
    {
        ProgressShared::requireAdmin($user);
        $rawTarget = $body['targetUserId'] ?? $body['friendUserId'] ?? null;
        $ownerId = is_numeric($rawTarget) ? (int) $rawTarget : 0;
        if ($ownerId <= 0) {
            Http::error(400, 'Informe targetUserId.');
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'SELECT `id`, `user_id`, `title`, `body`, `pinned`, `tags`, `lesson_id`, `cloned_from_note_id`, `created_at`, `updated_at`
             FROM `user_notes`
             WHERE `user_id` = :uid
             ORDER BY `pinned` DESC, `updated_at` DESC'
        );
        $stmt->execute([':uid' => $ownerId]);
        $ownRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $sharesByNote = self::fetchSharesForNotes(array_map(static fn(array $r): int => (int) $r['id'], $ownRows));
        $notes = [];
        foreach ($ownRows as $row) {
            $nid = (int) $row['id'];
            $sharedWith = $sharesByNote[$nid] ?? [];
            $notes[] = self::toNoteSummary($row, [
                'sharedWithCount' => count($sharedWith),
                'sharedWithUsernames' => array_map(static fn(array $u): string => (string) $u['username'], $sharedWith),
            ]);
        }

        Http::json(200, ['ok' => true, 'userId' => $ownerId, 'notes' => $notes, 'count' => count($notes)]);
    }
}
