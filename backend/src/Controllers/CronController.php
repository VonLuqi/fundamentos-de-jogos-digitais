<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Env;
use App\Core\Http;
use App\Core\RateLimiter;
use PDO;
use Throwable;

/**
 * Controller de `/api/cron/sessions-purge` e `/api/cron/warmup` (`api/cron/*.js`).
 */
final class CronController
{
    public static function sessionsPurge(): void
    {
        if (Http::method() !== 'GET') {
            Http::json(405, ['error' => 'Method not allowed']);
        }
        self::requireCronSecret();

        try {
            $result = self::runPurgeNow();
            Http::json(200, $result);
        } catch (Throwable $e) {
            error_log('sessions-purge error: ' . $e->getMessage());
            Http::json(500, ['error' => 'Internal server error']);
        }
    }

    public static function warmup(): void
    {
        if (Http::method() !== 'GET') {
            Http::json(405, ['error' => 'Method not allowed']);
        }
        self::requireCronSecret();

        try {
            $pdo = Database::get();
            $pdo->query('SELECT `key` FROM site_settings LIMIT 1');
            Http::json(200, [
                'ok' => true,
                'warmedAt' => Database::nowIso(),
            ]);
        } catch (Throwable $e) {
            error_log('warmup error: ' . $e->getMessage());
            Http::json(500, ['error' => 'Warmup failed']);
        }
    }

    /**
     * Executa limpeza de sessões expiradas, eventos de rate limit antigos e buckets expirados.
     * Usado tanto pelo endpoint HTTP `/api/cron/sessions-purge` quanto pelo CLI `backend/cron-purge.php`.
     *
     * @return array{ok: bool, purgedSessions: int, purgedRateEvents: int, purgedRateBuckets: int, purgedEmailTokens: int, purgedAt: string}
     */
    public static function runPurgeNow(): array
    {
        $pdo = Database::get();
        $nowMs = (int) round(microtime(true) * 1000);
        $nowSql = Database::nowSql($nowMs);

        // 1. Expired sessions
        $delSess = $pdo->prepare('DELETE FROM sessions WHERE expires_at < :now');
        $delSess->execute([':now' => $nowSql]);
        $purgedSessions = $delSess->rowCount();

        // 2. Old auth_rate_events (> 7 days)
        $sevenDaysAgoSql = Database::nowSql($nowMs - (7 * 86400 * 1000));
        $delRateEv = $pdo->prepare('DELETE FROM auth_rate_events WHERE created_at < :cut');
        $delRateEv->execute([':cut' => $sevenDaysAgoSql]);
        $purgedRateEvents = $delRateEv->rowCount();

        // 3. Expired rate_limit_buckets
        $purgedRateBuckets = RateLimiter::purgeExpired();

        // 4. Expired or consumed auth_email_tokens older than 7 days
        $delTokens = $pdo->prepare('DELETE FROM auth_email_tokens WHERE expires_at < :cut');
        $delTokens->execute([':cut' => $sevenDaysAgoSql]);
        $purgedEmailTokens = $delTokens->rowCount();

        return [
            'ok' => true,
            'purgedSessions' => $purgedSessions,
            'purgedRateEvents' => $purgedRateEvents,
            'purgedRateBuckets' => $purgedRateBuckets,
            'purgedEmailTokens' => $purgedEmailTokens,
            'purgedAt' => Database::nowIso($nowMs),
        ];
    }

    private static function requireCronSecret(): void
    {
        $secret = trim((string) Env::get('CRON_SECRET', ''));
        $bearer = trim((string) (Http::bearerToken() ?? ''));
        $querySecret = trim((string) (Http::query('secret', '') ?? ''));
        $provided = $bearer !== '' ? $bearer : $querySecret;
        if ($secret === '' || $provided === '' || !hash_equals($secret, $provided)) {
            Http::json(401, ['error' => 'Unauthorized']);
        }
    }
}
