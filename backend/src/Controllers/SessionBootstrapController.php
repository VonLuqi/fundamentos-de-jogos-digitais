<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\GameCatalog;
use App\Core\Http;
use App\Services\Despertar\DespertarService;
use App\Services\SessionService;
use PDO;
use Throwable;

/**
 * Controller de `GET /api/session-bootstrap?token=...` — espelho de `api/session-bootstrap.js`.
 */
final class SessionBootstrapController
{
    public static function isDespertarPublished(): bool
    {
        try {
            return DespertarService::isDespertarPublished();
        } catch (Throwable) {
            return false;
        }
    }

    /**
     * @return array<string, mixed>
     */
    public static function loadProvaGateForUser(int $userId, ?string $examId = null): array
    {
        $empty = ['inProgress' => false];
        if ($userId <= 0) {
            return $empty;
        }

        try {
            $pdo = Database::pdo();
            $stmt = $pdo->prepare(
                'SELECT `id`, `exam_id`, `status`, `ends_at`, `current_question_index`
                 FROM `prova_attempts`
                 WHERE `user_id` = :uid AND `status` = \'in_progress\''
                . ($examId !== null ? ' AND `exam_id` = :eid' : '')
                . ' ORDER BY `started_at` DESC LIMIT 1'
            );
            $stmt->execute($examId !== null ? [':uid' => $userId, ':eid' => $examId] : [':uid' => $userId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                return $empty;
            }

            $endsAtIso = Database::sqlToIso($row['ends_at'] ?? null);
            $endsMs = Database::parseMs($row['ends_at'] ?? null);
            $nowMs = (int) round(microtime(true) * 1000);
            $remainingMs = $endsMs !== null ? max(0, $endsMs - $nowMs) : null;

            return [
                'inProgress' => true,
                'attemptId' => (string) $row['id'],
                'examId' => (string) ($row['exam_id'] ?? ''),
                'endsAt' => $endsAtIso,
                'remainingMs' => $remainingMs,
                'currentQuestionIndex' => (int) ($row['current_question_index'] ?? 0),
            ];
        } catch (Throwable) {
            return $empty;
        }
    }

    public static function handle(): never
    {
        if (Http::method() !== 'GET') {
            Http::setHeader('Allow', 'GET');
            Http::error(405, 'Método não permitido.');
        }

        $token = SessionService::extractRequestToken();
        if ($token === null || trim($token) === '') {
            Http::error(400, 'Token ausente.');
        }

        $user = SessionService::loadUserBySessionToken($token);
        if (!$user) {
            Http::error(401, 'Sessão inválida.');
        }

        $published = self::isDespertarPublished();
        $seasonLiberated = false;
        try {
            $seasonLiberated = DespertarService::isSeasonLiberated();
        } catch (Throwable) {
            $seasonLiberated = false;
        }
        $provaGate = ($user['role'] ?? '') !== 'admin'
            ? self::loadProvaGateForUser((int) $user['id'])
            : ['inProgress' => false];

        Http::json(200, [
            'ok' => true,
            'user' => GameCatalog::sanitizeUser($user, owner: true),
            'gates' => [
                'despertar' => [
                    'published' => $published,
                    'seasonLiberated' => $seasonLiberated,
                ],
                'prova' => [
                    'inProgress' => (bool) ($provaGate['inProgress'] ?? false),
                    'attemptId' => $provaGate['attemptId'] ?? null,
                    'examId' => $provaGate['examId'] ?? null,
                    'endsAt' => $provaGate['endsAt'] ?? null,
                    'remainingMs' => $provaGate['remainingMs'] ?? null,
                    'currentQuestionIndex' => $provaGate['currentQuestionIndex'] ?? null,
                ],
            ],
        ]);
    }
}
