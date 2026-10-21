<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Helpers de Request/Response JSON compatíveis com os contratos da API Vercel.
 */
final class Http
{
    /** @var array<string, mixed>|null */
    private static ?array $cachedBody = null;

    public static function method(): string
    {
        return strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    }

    public static function query(string $key, ?string $default = null): ?string
    {
        if (!isset($_GET[$key]) || !is_scalar($_GET[$key])) {
            return $default;
        }
        return (string) $_GET[$key];
    }

    /**
     * @return array<string, mixed>
     */
    public static function allQuery(): array
    {
        return is_array($_GET) ? $_GET : [];
    }

    /**
     * @return array<string, mixed>
     */
    public static function jsonBody(): array
    {
        if (self::$cachedBody !== null) {
            return self::$cachedBody;
        }
        $raw = file_get_contents('php://input');
        if (!is_string($raw) || trim($raw) === '') {
            self::$cachedBody = is_array($_POST) && $_POST !== [] ? $_POST : [];
            return self::$cachedBody;
        }
        $decoded = json_decode($raw, true);
        self::$cachedBody = is_array($decoded) ? $decoded : [];
        return self::$cachedBody;
    }

    /**
     * @return array<string, mixed>
     */
    public static function body(): array
    {
        return self::jsonBody();
    }

    /**
     * @param array<int, string> $methods
     */
    public static function cors(array $methods = ['GET', 'POST', 'OPTIONS']): void
    {
        self::setHeader('Access-Control-Allow-Methods', implode(', ', $methods));
        self::setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        if (self::method() === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }

    public static function header(string $name): ?string
    {
        $upper = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        if (!empty($_SERVER[$upper])) {
            return (string) $_SERVER[$upper];
        }
        if ($upper === 'HTTP_AUTHORIZATION') {
            if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
                return (string) $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
            }
            if (function_exists('apache_request_headers')) {
                $headers = apache_request_headers();
                foreach ($headers as $k => $v) {
                    if (strcasecmp((string) $k, 'Authorization') === 0) {
                        return (string) $v;
                    }
                }
            }
        }
        return null;
    }

    public static function clientIp(): string
    {
        $cf = self::header('cf-connecting-ip');
        if ($cf !== null && trim($cf) !== '') {
            return substr(trim($cf), 0, 64);
        }
        $remote = trim((string) ($_SERVER['REMOTE_ADDR'] ?? ''));
        if ($remote !== '' && !in_array($remote, ['127.0.0.1', '::1'], true)) {
            return substr($remote, 0, 64);
        }
        $xff = self::header('x-forwarded-for');
        if ($xff !== null && trim($xff) !== '') {
            $parts = explode(',', $xff);
            $first = trim($parts[0]);
            if ($first !== '') {
                return substr($first, 0, 64);
            }
        }
        $real = self::header('x-real-ip');
        if ($real !== null && trim($real) !== '') {
            return substr(trim($real), 0, 64);
        }
        return $remote !== '' ? substr($remote, 0, 64) : 'unknown';
    }

    public static function setHeader(string $name, string $value): void
    {
        if (!headers_sent()) {
            header("{$name}: {$value}");
        }
    }

    /**
     * @param array<string, mixed> $payload
     */
    public static function json(int $status, array $payload): never
    {
        if (!headers_sent()) {
            http_response_code($status);
            header('Content-Type: application/json; charset=utf-8');
            header('Cache-Control: no-store, max-age=0');
            header('X-Content-Type-Options: nosniff');
            header('X-Frame-Options: SAMEORIGIN');
            header('Referrer-Policy: strict-origin-when-cross-origin');
        }
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    /**
     * @param array<string, mixed> $extra
     */
    public static function error(int $status, string $message, array $extra = []): never
    {
        self::json($status, array_merge(['ok' => false, 'error' => $message], $extra));
    }

    public static function bearerToken(): ?string
    {
        $auth = self::header('authorization');
        if ($auth !== null && preg_match('/^Bearer\s+(.+)$/i', trim($auth), $m)) {
            return trim($m[1]);
        }
        return null;
    }

    public static function appBaseUrl(): ?string
    {
        $raw = rtrim(trim((string) Env::get('APP_BASE_URL', '')), '/');
        if ($raw !== '') {
            return $raw;
        }
        $host = trim((string) ($_SERVER['HTTP_HOST'] ?? ''));
        if ($host !== '') {
            $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
                || ((string) ($_SERVER['SERVER_PORT'] ?? '') === '443')
                || (strtolower((string) self::header('x-forwarded-proto')) === 'https');
            $scheme = $https ? 'https' : 'http';
            $scriptName = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? ''));
            $basePath = preg_replace('#/backend/[^/]+$#', '', $scriptName) ?? '';
            $basePath = rtrim($basePath, '/');
            if ($basePath === '/' || $basePath === '.') {
                $basePath = '';
            }
            return "{$scheme}://{$host}{$basePath}";
        }
        return 'http://localhost:3000';
    }
}
