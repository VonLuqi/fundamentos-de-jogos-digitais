<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Carregador leve de arquivos .env / .env.local sem dependências externas.
 */
final class Env
{
    private static bool $loaded = false;
    /** @var array<string, string> */
    private static array $vars = [];

    public static function load(string $rootDir): void
    {
        if (self::$loaded) {
            return;
        }
        self::$loaded = true;

        // .env primeiro, depois .env.local sobrescreve (mesma precedência do projeto)
        self::loadFile($rootDir . '/.env');
        self::loadFile($rootDir . '/.env.local');
    }

    private static function loadFile(string $path): void
    {
        if (!is_file($path) || !is_readable($path)) {
            return;
        }
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if (!is_array($lines)) {
            return;
        }
        foreach ($lines as $line) {
            $trimmed = trim($line);
            if ($trimmed === '' || str_starts_with($trimmed, '#')) {
                continue;
            }
            $eqPos = strpos($trimmed, '=');
            if ($eqPos === false) {
                continue;
            }
            $key = trim(substr($trimmed, 0, $eqPos));
            if (str_starts_with($key, 'export ')) {
                $key = trim(substr($key, 7));
            }
            if ($key === '') {
                continue;
            }
            $val = trim(substr($trimmed, $eqPos + 1));
            if (
                (str_starts_with($val, '"') && str_ends_with($val, '"'))
                || (str_starts_with($val, "'") && str_ends_with($val, "'"))
            ) {
                $val = substr($val, 1, -1);
            }
            self::$vars[$key] = $val;
            if (getenv($key) === false) {
                putenv("{$key}={$val}");
                $_ENV[$key] = $val;
            }
        }
    }

    public static function set(string $key, ?string $value): void
    {
        if ($value === null) {
            unset(self::$vars[$key], $_ENV[$key]);
            putenv($key);
            return;
        }
        self::$vars[$key] = $value;
        $_ENV[$key] = $value;
        putenv("{$key}={$value}");
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        if (array_key_exists($key, self::$vars)) {
            return self::$vars[$key];
        }
        if (isset($_ENV[$key]) && is_string($_ENV[$key])) {
            return $_ENV[$key];
        }
        $env = getenv($key);
        if ($env !== false) {
            return (string) $env;
        }
        return $default;
    }

    public static function bool(string $key, bool $default = false): bool
    {
        $raw = strtolower(trim((string) self::get($key, '')));
        if ($raw === '') {
            return $default;
        }
        return in_array($raw, ['1', 'true', 'yes', 'on'], true);
    }

    public static function int(string $key, int $default = 0): int
    {
        $raw = self::get($key);
        if ($raw === null || !is_numeric(trim($raw))) {
            return $default;
        }
        return (int) trim($raw);
    }
}
