<?php
declare(strict_types=1);

namespace App\Services;

use App\Core\Database;
use PDO;
use Throwable;

/**
 * Gerenciamento de sessões opacas com TTL de 14 dias e renovação deslizante (< 7 dias).
 * Espelho de `api/_lib/sessions.js`.
 */
final class SessionService
{
    public const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;
    public const SESSION_RENEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

    public static function sessionExpiresAtSql(?int $fromMs = null): string
    {
        $baseMs = $fromMs ?? (int) round(microtime(true) * 1000);
        return Database::nowSql($baseMs + self::SESSION_TTL_MS);
    }

    /**
     * Cria uma nova sessão para o usuário.
     * @return array{token: ?string, error: ?string}
     */
    public static function createSessionRow(int $userId): array
    {
        try {
            $token = bin2hex(random_bytes(24));
            $nowMs = (int) round(microtime(true) * 1000);
            $createdAt = Database::nowSql($nowMs);
            $expiresAt = self::sessionExpiresAtSql($nowMs);

            $pdo = Database::pdo();
            $stmt = $pdo->prepare(
                'INSERT INTO `sessions` (`token`, `user_id`, `created_at`, `expires_at`)
                 VALUES (:token, :uid, :created, :expires)'
            );
            $stmt->execute([
                ':token' => $token,
                ':uid' => $userId,
                ':created' => $createdAt,
                ':expires' => $expiresAt,
            ]);

            return ['token' => $token, 'error' => null];
        } catch (Throwable $e) {
            error_log('[sessions] createSessionRow: ' . $e->getMessage());
            return ['token' => null, 'error' => $e->getMessage()];
        }
    }

    /**
     * Carrega sessão válida; expira e apaga se passou do TTL; renova se restam < 7 dias.
     * @return array{token: string, user_id: int, expires_at: ?string, created_at: ?string}|null
     */
    public static function loadValidSession(?string $token): ?array
    {
        if ($token === null || trim($token) === '') {
            return null;
        }
        $cleanToken = trim($token);

        try {
            $pdo = Database::pdo();
            $stmt = $pdo->prepare(
                'SELECT `token`, `user_id`, `expires_at`, `created_at`
                 FROM `sessions`
                 WHERE `token` = :token
                 LIMIT 1'
            );
            $stmt->execute([':token' => $cleanToken]);
            $session = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$session || empty($session['user_id'])) {
                return null;
            }

            $nowMs = (int) round(microtime(true) * 1000);
            if (!empty($session['expires_at'])) {
                $expMs = Database::parseMs((string) $session['expires_at']);
                if ($expMs !== null && $expMs <= $nowMs) {
                    $del = $pdo->prepare('DELETE FROM `sessions` WHERE `token` = :token');
                    $del->execute([':token' => $cleanToken]);
                    return null;
                }
                if ($expMs !== null && ($expMs - $nowMs) < self::SESSION_RENEW_WINDOW_MS) {
                    $upd = $pdo->prepare(
                        'UPDATE `sessions` SET `expires_at` = :expires WHERE `token` = :token'
                    );
                    $upd->execute([
                        ':expires' => self::sessionExpiresAtSql($nowMs),
                        ':token' => $cleanToken,
                    ]);
                }
            }

            return [
                'token' => (string) $session['token'],
                'user_id' => (int) $session['user_id'],
                'expires_at' => Database::sqlToIso($session['expires_at'] ?? null),
                'created_at' => Database::sqlToIso($session['created_at'] ?? null),
            ];
        } catch (Throwable $e) {
            error_log('[sessions] loadValidSession: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Carrega a linha hidratada do usuário a partir do token de sessão.
     * @return array<string, mixed>|null
     */
    public static function loadUserBySessionToken(?string $token): ?array
    {
        $session = self::loadValidSession($token);
        if (!$session) {
            return null;
        }
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT * FROM `users` WHERE `id` = :id LIMIT 1');
        $stmt->execute([':id' => $session['user_id']]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return Database::HydrateUserRow($row ?: null);
    }

    /**
     * Extrai o token da requisição atual (Authorization Bearer, query `token` ou body `token`).
     */
    public static function extractRequestToken(): ?string
    {
        $auth = \App\Core\Http::header('Authorization');
        if ($auth !== null && preg_match('/^Bearer\s+(.+)$/i', trim($auth), $m)) {
            $tok = trim($m[1]);
            if ($tok !== '') {
                return $tok;
            }
        }
        $qTok = \App\Core\Http::query('token');
        if ($qTok !== null && trim($qTok) !== '') {
            return trim($qTok);
        }
        $body = \App\Core\Http::jsonBody();
        if (!empty($body['token']) && is_scalar($body['token'])) {
            return trim((string) $body['token']);
        }
        return null;
    }

    /**
     * Resolve sessão opcional a partir da requisição atual.
     * @return array{token: string, user: array<string, mixed>}|null
     */
    public static function resolveSession(): ?array
    {
        $token = self::extractRequestToken();
        if ($token === null || $token === '') {
            return null;
        }
        $user = self::loadUserBySessionToken($token);
        if (!$user) {
            return null;
        }
        return ['token' => $token, 'user' => $user];
    }

    /**
     * Exige sessão válida ou encerra com HTTP 401.
     * @return array{token: string, user: array<string, mixed>}
     */
    public static function requireSession(): array
    {
        $resolved = self::resolveSession();
        if (!$resolved) {
            \App\Core\Http::error(401, 'Sessão inválida ou expirada.');
        }
        return $resolved;
    }

    /**
     * @param array<string, mixed>|null $user
     */
    public static function isAdmin(?array $user): bool
    {
        if (!$user) {
            return false;
        }
        return ($user['role'] ?? '') === 'admin' || strtolower((string) ($user['username'] ?? '')) === 'vonluqi';
    }

    /**
     * Purga sessões expiradas e buckets de rate-limit vencidos.
     * @return array{ok: bool, deleted: int, error: ?string}
     */
    public static function purgeExpiredSessions(): array
    {
        try {
            $pdo = Database::pdo();
            $nowSql = Database::nowSql();

            $stmt = $pdo->prepare('DELETE FROM `sessions` WHERE `expires_at` IS NOT NULL AND `expires_at` < :now');
            $stmt->execute([':now' => $nowSql]);
            $deleted = $stmt->rowCount();

            // Aproveita para limpar buckets de rate limit expirados
            try {
                $rlStmt = $pdo->prepare('DELETE FROM `rate_limit_buckets` WHERE `expires_at` < :now');
                $rlStmt->execute([':now' => $nowSql]);
            } catch (Throwable) {
                // ignora se a tabela não existir
            }

            return [
                'ok' => true,
                'deleted' => $deleted,
                'error' => null,
            ];
        } catch (Throwable $e) {
            error_log('[sessions] purgeExpiredSessions: ' . $e->getMessage());
            return [
                'ok' => false,
                'deleted' => 0,
                'error' => $e->getMessage(),
            ];
        }
    }
}
