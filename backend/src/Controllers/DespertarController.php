<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\AdminAudit;
use App\Core\Database;
use App\Core\GameCatalog;
use App\Core\Http;
use App\Core\RateLimiter;
use App\Services\Despertar\DespertarCatalog;
use App\Services\Despertar\DespertarService;
use App\Services\SessionService;
use PDO;

/**
 * Controller de `/api/despertar` (`api/despertar.js`).
 */
final class DespertarController
{
    /**
     * @return array{xp: int, achievements: array<int, string>, achievementDetails: array<int, array<string, mixed>>}
     */
    private static function emptyAwarded(): array
    {
        return ['xp' => 0, 'achievements' => [], 'achievementDetails' => []];
    }

    public static function handle(): never
    {
        if (Http::method() !== 'POST') {
            header('Allow: POST');
            Http::error(405, 'Método não permitido.');
        }

        $body = Http::body();
        $action = (string) ($body['action'] ?? '');
        $token = SessionService::extractRequestToken() ?? '';

        $user = SessionService::loadUserBySessionToken($token);
        if (!$user) {
            Http::error(401, 'Sessão inválida.');
        }
        $userId = (int) $user['id'];
        $isAdmin = ($user['role'] ?? '') === 'admin';

        // Admin: pausa de aula (Véu)
        if ($action === 'pauseSet' || $action === 'pauseClear') {
            if (!$isAdmin) {
                Http::error(403, 'Esta senda é só do Mestre.');
            }
            if ($action === 'pauseClear') {
                $cleared = DespertarService::clearClassroomPause($userId);
                Http::json(200, [
                    'ok' => true,
                    'pause' => null,
                    'serverNow' => $cleared['serverNow'],
                    'published' => DespertarService::isDespertarPublished(),
                ]);
            }

            $armed = DespertarService::setClassroomPause($userId, $body);
            if (!$armed['ok']) {
                Http::error(400, $armed['error'] ?? 'Não foi possível pausar o Acheron.');
            }
            Http::json(200, [
                'ok' => true,
                'pause' => DespertarService::pausePublicDto($armed['pause']),
                'serverNow' => $armed['serverNow'],
                'published' => DespertarService::isDespertarPublished(),
            ]);
        }

        // Admin: limpar Estelas dos alunos
        if ($action === 'stateResetStudents') {
            if (!$isAdmin) {
                Http::error(403, 'Esta senda é só do Mestre.');
            }
            $pdo = Database::pdo();
            $sStmt = $pdo->query('SELECT `id` FROM `users` WHERE `role` <> \'admin\'');
            $studentIds = $sStmt ? array_map(static fn(array $r): int => (int) $r['id'], $sStmt->fetchAll(PDO::FETCH_ASSOC)) : [];
            if ($studentIds === []) {
                Http::json(200, ['ok' => true, 'deleted' => 0, 'scanned' => 0]);
            }

            $placeholders = implode(', ', array_fill(0, count($studentIds), '?'));
            $delStmt = $pdo->prepare("DELETE FROM `despertar_states` WHERE `user_id` IN ({$placeholders})");
            $delStmt->execute($studentIds);
            $deleted = $delStmt->rowCount();

            Http::json(200, [
                'ok' => true,
                'deleted' => $deleted,
                'scanned' => count($studentIds),
            ]);
        }

        // Admin: recalcular óbolos/essência/bônus após rebalance Lethe
        if ($action === 'rebalanceLetheWallets') {
            if (!$isAdmin) {
                Http::error(403, 'Esta senda é só do Mestre.');
            }
            $apply = ($body['apply'] ?? false) === true
                || ($body['apply'] ?? '') === 'true'
                || ($body['apply'] ?? 0) === 1;
            $force = ($body['force'] ?? false) === true
                || ($body['force'] ?? '') === 'true'
                || ($body['force'] ?? 0) === 1;

            $result = DespertarService::rebalanceStudentLetheWallets($apply, $force);
            if ($apply) {
                AdminAudit::record(
                    $userId,
                    AdminAudit::ACTIONS['rebalanceLetheWallets'],
                    null,
                    [
                        'force' => $force,
                        'scanned' => $result['scanned'],
                        'changed' => $result['changed'],
                        'skipped' => $result['skipped'],
                        'aligned' => $result['aligned'],
                    ]
                );
            }
            Http::json(200, $result);
        }

        // Admin: sandbox / reset / grant
        if ($action === 'debugSandbox' || $action === 'debugReset' || $action === 'debugGrant') {
            if (!$isAdmin) {
                Http::error(403, 'Esta senda é só do Mestre.');
            }
            $nowIso = Database::nowIso();

            if ($action === 'debugGrant') {
                $row = DespertarService::getOrCreateStateRow($userId);
                $setInput = $body['set'] ?? null;
                $grant = (is_array($setInput) && !array_is_list($setInput))
                    ? DespertarService::buildDebugSetPatch($setInput)
                    : DespertarService::buildDebugGrantPatch($row, $body['grantId'] ?? null);

                if (!$grant['ok']) {
                    Http::error(400, $grant['error'] ?? 'Concessão inválida.');
                }

                $patch = array_merge($grant['patch'] ?? [], [
                    'last_sync_at' => $nowIso,
                    'updated_at' => $nowIso,
                ]);
                $saved = DespertarService::persistPatch($userId, $patch);

                Http::json(200, [
                    'ok' => true,
                    // Perfil atual: o replace no cliente não pode apagar conquistas do Domínio.
                    'state' => DespertarService::buildStateDto($saved, [
                        'achievements' => $user['conquistas'] ?? [],
                    ]),
                    'grantId' => $grant['grantId'] ?? null,
                    'label' => $grant['label'] ?? '',
                    'awarded' => self::emptyAwarded(),
                    'grant' => true,
                    'set' => is_array($setInput) && !array_is_list($setInput),
                ]);
            }

            // Strip Despertar achievements from admin profile
            $despertarSet = array_flip(DespertarCatalog::DESPERTAR_ACHIEVEMENT_IDS);
            $existingConq = is_array($user['conquistas'] ?? null) ? array_values($user['conquistas']) : [];
            $removed = [];
            $kept = [];
            $xpLoss = 0;
            foreach ($existingConq as $cid) {
                if (isset($despertarSet[$cid])) {
                    $removed[] = $cid;
                    $xpLoss += GameCatalog::getAchievementXp($cid);
                } else {
                    $kept[] = $cid;
                }
            }
            $nextXp = max(0, (int) ($user['xp'] ?? 0) - $xpLoss);

            $pdo = Database::pdo();
            $uUpd = $pdo->prepare('UPDATE `users` SET `xp` = :xp, `conquistas` = :conq WHERE `id` = :uid');
            $uUpd->execute([
                ':xp' => $nextXp,
                ':conq' => Database::encodeJsonArray($kept),
                ':uid' => $userId,
            ]);

            DespertarService::getOrCreateStateRow($userId);
            $patch = $action === 'debugReset'
                ? DespertarService::debugZeroPatch($nowIso)
                : DespertarService::debugSandboxPatch($nowIso);
            $saved = DespertarService::persistPatch($userId, $patch);

            Http::json(200, [
                'ok' => true,
                // `$kept` = perfil sem família Despertar (já persistido acima).
                'state' => DespertarService::buildStateDto($saved, [
                    'achievements' => $kept,
                ]),
                'strippedAchievements' => $removed,
                'xpLoss' => $xpLoss,
                'xp' => $nextXp,
                'awarded' => self::emptyAwarded(),
                'sandbox' => $action === 'debugSandbox',
                'reset' => $action === 'debugReset',
            ]);
        }

        // Gate check (published + classroom_pause)
        $published = DespertarService::isDespertarPublished();
        $pauseState = DespertarService::getDespertarPauseState();
        $nowMs = (int) round(microtime(true) * 1000);
        $serverNow = Database::nowIso($nowMs);
        $pauseDto = DespertarService::pausePublicDto($pauseState, $nowMs);
        $pauseWindow = DespertarService::pauseWindowDto($pauseState, $nowMs);

        $isSealedForUser = !$isAdmin && !$published;
        $isPlayBlocked = !$isAdmin && (!$published || DespertarService::isDespertarPauseActive($pauseState, $nowMs));

        if ($action === 'stateGet') {
            if ($isSealedForUser) {
                Http::json(403, [
                    'ok' => false,
                    'error' => DespertarService::DESPERTAR_SEALED_ERROR,
                    'message' => DespertarService::DESPERTAR_SEALED_MESSAGE,
                    'published' => false,
                    'pause' => null,
                    'pauseWindow' => null,
                    'serverNow' => $serverNow,
                ]);
            }

            $row = DespertarService::getOrCreateStateRow($userId);
            Http::json(200, [
                'ok' => true,
                'state' => DespertarService::buildStateDto($row, ['achievements' => $user['conquistas'] ?? []]),
                'awarded' => self::emptyAwarded(),
                'published' => true,
                'pause' => $pauseDto,
                'pauseWindow' => $pauseWindow,
                'serverNow' => $serverNow,
            ]);
        }

        if ($isSealedForUser) {
            Http::json(403, [
                'ok' => false,
                'error' => DespertarService::DESPERTAR_SEALED_ERROR,
                'message' => DespertarService::DESPERTAR_SEALED_MESSAGE,
                'published' => false,
                'pause' => null,
                'pauseWindow' => null,
                'serverNow' => $serverNow,
            ]);
        }

        if ($isPlayBlocked) {
            Http::json(403, [
                'ok' => false,
                'error' => DespertarService::DESPERTAR_PAUSED_ERROR,
                'message' => DespertarService::DESPERTAR_PAUSED_MESSAGE,
                'published' => true,
                'pause' => $pauseDto,
                'pauseWindow' => $pauseWindow,
                'serverNow' => $serverNow,
            ]);
        }

        if ($action === 'stateSync') {
            $syncLimit = RateLimiter::consumeGame('despertar_sync', $userId);
            if ($syncLimit['limited']) {
                RateLimiter::applyRetryAfterHeader($syncLimit);
                Http::error(429, 'O Submundo pede calma — aguarde um instante.');
            }

            $row = DespertarService::getOrCreateStateRow($userId);
            $clientState = $body['clientState'] ?? null;
            $result = DespertarService::validateSync($row, $clientState, $nowMs, is_array($user['conquistas'] ?? null) ? $user['conquistas'] : []);

            if (!$result['ok']) {
                $resp = [
                    'ok' => false,
                    'error' => $result['error'] ?? DespertarCatalog::JUDGES_REFUSED_MESSAGE,
                    'state' => $result['state'],
                    'awarded' => self::emptyAwarded(),
                ];
                if (isset($result['echoEpoch'])) {
                    $resp['echoEpoch'] = $result['echoEpoch'];
                }
                Http::json((int) ($result['status'] ?? 400), $resp);
            }

            $persisted = DespertarService::persistPatchAndAward($user, $result['patch'], $result['next'], true);
            $echoEpoch = $result['echoEpoch'] ?? DespertarService::parseClientEpoch($clientState);
            $echoOpts = $echoEpoch !== null ? ['echoEpoch' => $echoEpoch] : [];
            $echoOpts['achievements'] = array_values(array_unique(array_merge(
                is_array($user['conquistas'] ?? null) ? $user['conquistas'] : [],
                $persisted['awarded']['achievements'] ?? []
            )));

            $resp = [
                'ok' => true,
                'state' => DespertarService::buildStateDto($persisted['row'], $echoOpts),
                'awarded' => $persisted['awarded'],
            ];
            if ($echoEpoch !== null) {
                $resp['echoEpoch'] = $echoEpoch;
            }
            Http::json(200, $resp);
        }

        if ($action === 'prestige') {
            $row = DespertarService::getOrCreateStateRow($userId);
            $result = DespertarService::applyPrestige($row, $nowMs);
            if (!$result['ok']) {
                Http::json((int) ($result['status'] ?? 400), [
                    'ok' => false,
                    'error' => $result['error'],
                    'state' => $result['state'],
                    'awarded' => self::emptyAwarded(),
                ]);
            }

            $persisted = DespertarService::persistPatchAndAward($user, $result['patch'], $result['next'], true);
            Http::json(200, [
                'ok' => true,
                'state' => DespertarService::buildStateDto($persisted['row']),
                'awarded' => $persisted['awarded'],
            ]);
        }

        if ($action === 'talentBuy') {
            $row = DespertarService::getOrCreateStateRow($userId);
            $result = DespertarService::applyTalentBuy($row, $body['talentId'] ?? null, $nowMs);
            if (!$result['ok']) {
                Http::json((int) ($result['status'] ?? 400), [
                    'ok' => false,
                    'error' => $result['error'],
                    'state' => $result['state'],
                    'awarded' => self::emptyAwarded(),
                ]);
            }

            $persisted = DespertarService::persistPatchAndAward($user, $result['patch'], $result['next'], true);
            Http::json(200, [
                'ok' => true,
                'state' => DespertarService::buildStateDto($persisted['row']),
                'awarded' => $persisted['awarded'],
            ]);
        }

        if ($action === 'verdictBuy') {
            $row = DespertarService::getOrCreateStateRow($userId);
            $result = DespertarService::applyVerdictBuy($row, $body['purchaseId'] ?? null, $nowMs);
            if (!$result['ok']) {
                Http::json((int) ($result['status'] ?? 400), [
                    'ok' => false,
                    'error' => $result['error'],
                    'state' => $result['state'],
                    'awarded' => self::emptyAwarded(),
                ]);
            }

            $persisted = DespertarService::persistPatchAndAward($user, $result['patch'], $result['next'], true);
            Http::json(200, [
                'ok' => true,
                'state' => DespertarService::buildStateDto($persisted['row']),
                'awarded' => $persisted['awarded'],
            ]);
        }

        if ($action === 'juizoStart' || $action === 'juizoGuess' || $action === 'juizoAbandon') {
            $row = DespertarService::getOrCreateStateRow($userId);
            $canonical = DespertarService::rowToCanonical($row);

            if ($action === 'juizoStart') {
                $result = DespertarService::juizoStart($canonical);
            } elseif ($action === 'juizoAbandon') {
                $result = DespertarService::juizoAbandon($canonical);
            } else {
                $juizoLimit = RateLimiter::consumeGame('despertar_juizo', $userId);
                if ($juizoLimit['limited']) {
                    RateLimiter::applyRetryAfterHeader($juizoLimit);
                    Http::error(429, 'O Juízo pede calma — aguarde um instante.');
                }
                $result = DespertarService::juizoGuess($canonical, $body['choice'] ?? null);
            }

            if (!$result['ok']) {
                Http::json((int) ($result['status'] ?? 400), [
                    'ok' => false,
                    'error' => $result['error'] ?? 'O Juízo se fecha.',
                    'state' => DespertarService::buildStateDto($canonical),
                ]);
            }

            $patch = DespertarService::juizoPatchFromState($result['next'], $serverNow);
            $grantAwards = $action === 'juizoGuess';
            $persisted = DespertarService::persistPatchAndAward($user, $patch, $result['next'], $grantAwards);

            $payload = [
                'ok' => true,
                'state' => DespertarService::buildStateDto($persisted['row']),
                'hud' => $result['hud'],
                'ended' => !empty($result['ended']),
                'abandoned' => !empty($result['abandoned']),
                'mercy' => !empty($result['mercy']),
                'pair' => $result['pair'] ?? null,
                'milestones' => $result['milestones'] ?? ['newly' => [], 'verdictGain' => 0],
                'awarded' => $grantAwards ? $persisted['awarded'] : self::emptyAwarded(),
            ];

            if (!empty($result['ended']) && empty($result['abandoned'])) {
                $payload['ratingA'] = $result['ratingA'] ?? null;
                $payload['ratingB'] = $result['ratingB'] ?? null;
                $payload['deltaLabel'] = $result['deltaLabel'] ?? null;
                $payload['brokenStreak'] = $result['brokenStreak'] ?? 0;
            } elseif (empty($result['ended']) && isset($result['ratingA'])) {
                $payload['ratingA'] = $result['ratingA'];
                $payload['ratingB'] = $result['ratingB'] ?? null;
                if (!empty($result['mercy'])) {
                    $payload['deltaLabel'] = $result['deltaLabel'] ?? null;
                    $payload['brokenStreak'] = $result['brokenStreak'] ?? 0;
                }
            }

            Http::json(200, $payload);
        }

        Http::error(400, 'Ação desconhecida.');
    }
}
