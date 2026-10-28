<?php
declare(strict_types=1);

namespace App\Core;

use PDO;
use Throwable;

/**
 * Rate Limiter baseado em MySQL (`rate_limit_buckets`) — substitui @vercel/kv na HostGator.
 * Implementa os tetos de Edge IP (`middleware.js`), Jogo (`rate-limit-kv.js`) e Prova (`api/_lib/prova/rate-limit.js`).
 */
final class RateLimiter
{
    public const EDGE_LIMITS = [
        'auth' => ['limit' => 30, 'windowMs' => 60000],
        'despertar' => ['limit' => 60, 'windowMs' => 60000],
        'progress' => ['limit' => 90, 'windowMs' => 60000],
        'prova' => ['limit' => 120, 'windowMs' => 60000],
    ];

    public const GAME_LIMITS = [
        // 36/min: flush de compras + heartbeat 30s + Ritual do Lethe não podem
        // casar no teto antigo (12) e abortar a Catábase com "pede calma".
        'despertar_sync' => ['limit' => 36, 'windowMs' => 60000, 'keyPart' => 'rl:despertar:sync'],
        'despertar_juizo' => ['limit' => 2, 'windowMs' => 1000, 'keyPart' => 'rl:despertar:juizo'],
        'underworld_redeem' => ['limit' => 12, 'windowMs' => 60000, 'keyPart' => 'rl:underworld:redeem'],
    ];

    public const PROVA_LIMITS = [
        'saveAnswer' => ['limit' => 240, 'windowMs' => 60000, 'keyPart' => 'rl:prova:save'],
        'reportIntegrityEvent' => ['limit' => 120, 'windowMs' => 60000, 'keyPart' => 'rl:prova:integrity'],
        'contestGrade' => ['limit' => 5, 'windowMs' => 60000, 'keyPart' => 'rl:prova:contest'],
    ];

    /**
     * @return array{limited: bool, remaining: int, retryAfterSec: int, degraded: bool}
     */
    public static function consume(string $key, int $limit, int $windowMs): array
    {
        $nowMs = (int) round(microtime(true) * 1000);
        $bucket = intdiv($nowMs, max(1, $windowMs));
        $bucketKey = substr("fjd:{$key}:w{$bucket}", 0, 180);
        $expiresAtMs = ($bucket + 1) * $windowMs;
        $retryAfterSec = max(1, (int) ceil(($expiresAtMs - $nowMs) / 1000));

        try {
            $pdo = Database::pdo();
            $expiresAtSql = Database::nowSql($expiresAtMs);

            $stmt = $pdo->prepare(
                'INSERT INTO `rate_limit_buckets` (`bucket_key`, `hits`, `expires_at`)
                 VALUES (:key, 1, :expires)
                 ON DUPLICATE KEY UPDATE `hits` = `hits` + 1'
            );
            $stmt->execute([
                ':key' => $bucketKey,
                ':expires' => $expiresAtSql,
            ]);

            $sel = $pdo->prepare('SELECT `hits` FROM `rate_limit_buckets` WHERE `bucket_key` = :key LIMIT 1');
            $sel->execute([':key' => $bucketKey]);
            $hits = (int) ($sel->fetchColumn() ?: 1);

            if ($hits > $limit) {
                return [
                    'limited' => true,
                    'remaining' => 0,
                    'retryAfterSec' => $retryAfterSec,
                    'degraded' => false,
                ];
            }

            return [
                'limited' => false,
                'remaining' => max(0, $limit - $hits),
                'retryAfterSec' => 0,
                'degraded' => false,
            ];
        } catch (Throwable) {
            // Fail-open caso a tabela ainda não exista ou haja erro transitório
            return [
                'limited' => false,
                'remaining' => $limit,
                'retryAfterSec' => 0,
                'degraded' => true,
            ];
        }
    }

    /**
     * @return array{limited: bool, remaining: int, retryAfterSec: int, degraded: bool}
     */
    public static function consumeEdgeIp(string $group, string $ip): array
    {
        if (!isset(self::EDGE_LIMITS[$group])) {
            return ['limited' => false, 'remaining' => 100, 'retryAfterSec' => 0, 'degraded' => false];
        }
        $spec = self::EDGE_LIMITS[$group];
        $safeIp = substr(trim($ip) ?: 'unknown', 0, 64);
        return self::consume("rl:edge:{$group}:{$safeIp}", $spec['limit'], $spec['windowMs']);
    }

    /**
     * @return array{limited: bool, remaining: int, retryAfterSec: int, degraded: bool}
     */
    public static function consumeGame(string $kind, int|string $userId): array
    {
        if (!isset(self::GAME_LIMITS[$kind])) {
            return ['limited' => false, 'remaining' => 10, 'retryAfterSec' => 0, 'degraded' => false];
        }
        $spec = self::GAME_LIMITS[$kind];
        return self::consume("{$spec['keyPart']}:{$userId}", $spec['limit'], $spec['windowMs']);
    }

    /**
     * @return array{limited: bool, remaining: int, retryAfterSec: int, degraded: bool}
     */
    public static function consumeProva(string $action, int|string $userId): array
    {
        if (!isset(self::PROVA_LIMITS[$action])) {
            return ['limited' => false, 'remaining' => 999, 'retryAfterSec' => 0, 'degraded' => false];
        }
        $spec = self::PROVA_LIMITS[$action];
        return self::consume("{$spec['keyPart']}:{$userId}", $spec['limit'], $spec['windowMs']);
    }

    public static function applyRetryAfterHeader(array $result): int
    {
        $sec = max(1, (int) ceil((float) ($result['retryAfterSec'] ?? 1)));
        Http::setHeader('Retry-After', (string) $sec);
        return $sec;
    }

    /**
     * @return array{allowed: bool, limited: bool, remaining: int, retryAfterSec: int}
     */
    public static function check(string $key, int $limit, int $windowSec): array
    {
        $res = self::consume($key, $limit, max(1, $windowSec) * 1000);
        return [
            'allowed' => !$res['limited'],
            'limited' => $res['limited'],
            'remaining' => $res['remaining'],
            'retryAfterSec' => $res['retryAfterSec'],
        ];
    }

    public static function purgeExpired(): int
    {
        try {
            $pdo = Database::pdo();
            $stmt = $pdo->prepare('DELETE FROM `rate_limit_buckets` WHERE `expires_at` < :now');
            $stmt->execute([':now' => Database::nowSql()]);
            return $stmt->rowCount();
        } catch (Throwable) {
            return 0;
        }
    }
}
