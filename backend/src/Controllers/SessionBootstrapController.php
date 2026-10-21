<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\GameCatalog;
use App\Core\Http;
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
            $pdo = Database::pdo();
            $stmt = $pdo->prepare(
                'SELECT `released` FROM `lesson_gates`
                 WHERE `lesson_id` = \'despertar\' AND `gate_key` = \'published\'
                 LIMIT 1'
            );
            $stmt->execute();
            $val = $stmt->fetchColumn();
            return $val !== false && (bool) $val;
        } catch (Throwable) {
            return false;
        }
    }

    /**
     * @return array<string, mixed>
     */
    public static function loadProvaGateForUser(int $userId, string $examId = 'modulo1-provacao'): array
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
                 WHERE `user_id` = :uid AND `exam_id` = :eid AND `status` = \'in_progress\'
                 LIMIT 1'
            );
            $stmt->execute([':uid' => $userId, ':eid' => $examId]);
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
                'examId' => (string) ($row['exam_id'] ?? $examId),
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

        $token = Http::query('token');
        if ($token === null || trim($token) === '') {
            Http::error(400, 'Token ausente.');
        }

        $user = SessionService::loadUserBySessionToken($token);
        if (!$user) {
            Http::error(401, 'Sessão inválida.');
        }

        $published = self::isDespertarPublished();
        $provaGate = ($user['role'] ?? '') !== 'admin'
            ? self::loadProvaGateForUser((int) $user['id'])
            : ['inProgress' => false];

        Http::json(200, [
            'ok' => true,
            'user' => GameCatalog::sanitizeUser($user),
            'gates' => [
                'despertar' => [
                    'published' => $published,
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
