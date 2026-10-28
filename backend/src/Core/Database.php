<?php
declare(strict_types=1);

namespace App\Core;

use PDO;
use PDOException;

/**
 * Gerenciador de conexão PDO MySQL/MariaDB (utf8mb4, UTC) e utilitários SQL/JSON.
 */
final class Database
{
    private static ?PDO $pdo = null;

    public static function isConfigured(): bool
    {
        $name = trim((string) Env::get('DB_NAME', Env::get('MYSQL_DATABASE', '')));
        $user = trim((string) Env::get('DB_USER', Env::get('MYSQL_USER', '')));
        return $name !== '' && $user !== '';
    }

    public static function pdo(): PDO
    {
        if (self::$pdo !== null) {
            return self::$pdo;
        }

        $host = trim((string) Env::get('DB_HOST', Env::get('MYSQL_HOST', 'localhost')));
        $port = trim((string) Env::get('DB_PORT', Env::get('MYSQL_PORT', '3306')));
        $name = trim((string) Env::get('DB_NAME', Env::get('MYSQL_DATABASE', '')));
        $user = trim((string) Env::get('DB_USER', Env::get('MYSQL_USER', '')));
        $pass = (string) Env::get('DB_PASS', Env::get('DB_PASSWORD', Env::get('MYSQL_PASSWORD', '')));

        if ($name === '' || $user === '') {
            throw new PDOException('Banco de dados MySQL não configurado no .env.');
        }

        $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port ?: '3306', $name);

        self::$pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci, time_zone = '+00:00'",
        ]);

        return self::$pdo;
    }

    public static function get(): PDO
    {
        return self::pdo();
    }

    public static function decodeJson(mixed $raw, mixed $fallback = []): mixed
    {
        if (is_array($raw)) {
            return $raw;
        }
        if (!is_string($raw) || trim($raw) === '') {
            return $fallback;
        }
        $decoded = json_decode($raw, true);
        return json_last_error() === JSON_ERROR_NONE ? $decoded : $fallback;
    }

    /**
     * Retorna o instante atual formatado para coluna DATETIME(3) em UTC.
     */
    public static function nowSql(?int $timestampMs = null): string
    {
        if ($timestampMs === null) {
            $micro = microtime(true);
            $sec = (int) floor($micro);
            $ms = (int) round(($micro - $sec) * 1000);
            if ($ms >= 1000) {
                $sec += 1;
                $ms = 0;
            }
            return gmdate('Y-m-d H:i:s', $sec) . '.' . str_pad((string) $ms, 3, '0', STR_PAD_LEFT);
        }
        $sec = intdiv($timestampMs, 1000);
        $ms = abs($timestampMs % 1000);
        return gmdate('Y-m-d H:i:s', $sec) . '.' . str_pad((string) $ms, 3, '0', STR_PAD_LEFT);
    }

    /**
     * Retorna o instante atual em formato ISO-8601 UTC (compatível com Date.prototype.toISOString).
     */
    public static function nowIso(?int $timestampMs = null): string
    {
        $sql = self::nowSql($timestampMs);
        return str_replace(' ', 'T', $sql) . 'Z';
    }

    /**
     * Converte ISO-8601 ou DATETIME para DATETIME(3) do MySQL.
     */
    public static function isoToSql(?string $iso): ?string
    {
        if ($iso === null || trim($iso) === '') {
            return null;
        }
        $ts = strtotime($iso);
        if ($ts === false) {
            return null;
        }
        $ms = '000';
        if (preg_match('/\.(\d{1,6})/', $iso, $m)) {
            $ms = substr(str_pad($m[1], 3, '0'), 0, 3);
        }
        return gmdate('Y-m-d H:i:s', $ts) . '.' . $ms;
    }

    /**
     * Converte DATETIME(3) do MySQL para ISO-8601 UTC ('YYYY-MM-DDTHH:MM:SS.sssZ').
     */
    public static function sqlToIso(?string $sql): ?string
    {
        if ($sql === null || trim($sql) === '') {
            return null;
        }
        $trimmed = trim($sql);
        if (str_ends_with($trimmed, 'Z') && str_contains($trimmed, 'T')) {
            return $trimmed;
        }
        if (preg_match('/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?$/', $trimmed, $m)) {
            $ms = isset($m[3]) ? substr(str_pad($m[3], 3, '0'), 0, 3) : '000';
            return "{$m[1]}T{$m[2]}.{$ms}Z";
        }
        $ts = strtotime($trimmed . ' UTC');
        if ($ts === false) {
            return $trimmed;
        }
        return gmdate('Y-m-d\TH:i:s.000\Z', $ts);
    }

    /**
     * Converte DATETIME(3) ou ISO para epoch em milissegundos.
     */
    public static function parseMs(?string $dateStr): ?int
    {
        if ($dateStr === null || trim($dateStr) === '') {
            return null;
        }
        $iso = self::sqlToIso($dateStr);
        if ($iso === null) {
            return null;
        }
        $ts = strtotime($iso);
        if ($ts === false) {
            return null;
        }
        $ms = 0;
        if (preg_match('/\.(\d{3})Z$/', $iso, $m)) {
            $ms = (int) $m[1];
        }
        return ($ts * 1000) + $ms;
    }

    /**
     * Decodifica coluna JSON em array associativo ou lista.
     * @return array<mixed>
     */
    public static function decodeJsonArray(mixed $raw): array
    {
        if (is_array($raw)) {
            return array_values($raw);
        }
        if (!is_string($raw) || trim($raw) === '') {
            return [];
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? array_values($decoded) : [];
    }

    /**
     * Decodifica coluna JSON em objeto/mapa associativo.
     * @return array<string, mixed>
     */
    public static function decodeJsonObject(mixed $raw): array
    {
        if (is_array($raw)) {
            return $raw;
        }
        if (!is_string($raw) || trim($raw) === '') {
            return [];
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    public static function encodeJson(mixed $value): string
    {
        $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return $json !== false ? $json : 'null';
    }

    public static function encodeJsonObject(mixed $value): string
    {
        if (!is_array($value) || $value === []) {
            return '{}';
        }
        // Se for array associativo ou lista vazia que deve ser objeto no JSON
        $json = json_encode((object) $value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return $json !== false ? $json : '{}';
    }

    public static function encodeJsonArray(mixed $value): string
    {
        if (!is_array($value)) {
            return '[]';
        }
        $json = json_encode(array_values($value), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return $json !== false ? $json : '[]';
    }

    /**
     * Gera UUID v4 compatível com gen_random_uuid() do PostgreSQL.
     */
    public static function uuidV4(): string
    {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    /**
     * Normaliza uma linha da tabela `users` vinda do MySQL para o formato esperado pelos módulos.
     * @param array<string, mixed>|null $row
     * @return array<string, mixed>|null
     */
    public static function HydrateUserRow(?array $row): ?array
    {
        if (!$row) {
            return null;
        }
        return [
            'id' => (int) $row['id'],
            'full_name' => (string) ($row['full_name'] ?? ''),
            'turma' => (string) ($row['turma'] ?? ''),
            'username' => (string) ($row['username'] ?? ''),
            'email' => isset($row['email']) && $row['email'] !== '' ? (string) $row['email'] : null,
            'email_verified_at' => self::sqlToIso($row['email_verified_at'] ?? null),
            'password_hash' => (string) ($row['password_hash'] ?? ''),
            'password' => $row['password'] ?? null,
            'role' => (string) ($row['role'] ?? 'student'),
            'xp' => (int) ($row['xp'] ?? 0),
            'conquistas' => self::decodeJsonArray($row['conquistas'] ?? null),
            'completed_lessons' => self::decodeJsonArray($row['completed_lessons'] ?? null),
            'redeemed_codes' => self::decodeJsonArray($row['redeemed_codes'] ?? null),
            'avatar_index' => (int) ($row['avatar_index'] ?? 0),
            'display_name' => $row['display_name'] ?? null,
            'bio' => $row['bio'] ?? null,
            'avatar_mode' => (string) ($row['avatar_mode'] ?? 'catalog'),
            'photo_path' => $row['photo_path'] ?? null,
            'photo_pending_path' => $row['photo_pending_path'] ?? null,
            'photo_status' => (string) ($row['photo_status'] ?? 'none'),
            'photo_updated_at' => self::sqlToIso($row['photo_updated_at'] ?? null),
            'photo_reject_reason' => $row['photo_reject_reason'] ?? null,
            'created_at' => self::sqlToIso($row['created_at'] ?? null),
        ];
    }
}
