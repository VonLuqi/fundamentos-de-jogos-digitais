<?php
declare(strict_types=1);

namespace App\Core;

use PDO;
use PDOException;
use RuntimeException;
use Throwable;

/**
 * Aplica db/migrate-*.sql (MySQL idempotente) no banco já configurado.
 * Em produção os arquivos chegam em backend/migrations/ pelo FTP privado.
 */
final class MysqlMigrator
{
    private const LOCK = 'fjd_mysql_migrations';

    /**
     * Roda em toda requisição da API: o caminho normal só compara a assinatura dos arquivos com o
     * carimbo da última aplicação bem-sucedida (sem tocar no banco). Arquivo novo ou alterado no
     * deploy muda a assinatura → aplica uma vez e regrava o carimbo. Apagar o carimbo força rodar.
     */
    public static function apply(): void
    {
        $files = self::files();
        $signature = self::signature($files);
        $stamp = self::stampPath();
        if (is_file($stamp) && trim((string) @file_get_contents($stamp)) === $signature) {
            return;
        }
        self::run(Database::pdo());
        $dir = dirname($stamp);
        if (is_dir($dir) || @mkdir($dir, 0775, true)) {
            // Sem permissão de escrita só fica mais lento (verifica o banco a cada requisição).
            @file_put_contents($stamp, $signature, LOCK_EX);
        }
    }

    /** @param list<string> $files */
    private static function signature(array $files): string
    {
        $parts = [];
        foreach ($files as $path) {
            $parts[] = basename($path) . ':' . (int) @filesize($path);
        }
        return sha1(implode('|', $parts));
    }

    private static function stampPath(): string
    {
        $backend = defined('FJD_BACKEND_ROOT') ? FJD_BACKEND_ROOT : dirname(__DIR__, 2);
        return $backend . '/storage/.mysql-migrations';
    }

    public static function run(PDO $pdo): int
    {
        self::ensureLedger($pdo);
        $files = self::files();
        $pending = self::pending($pdo, $files);
        if ($pending === []) {
            self::assertGate($pdo);
            return 0;
        }

        $got = self::scalar($pdo, 'SELECT GET_LOCK(' . $pdo->quote(self::LOCK) . ', 20)');
        if ((string) $got !== '1') {
            throw new RuntimeException('Migração MySQL ocupada. Tente de novo em instantes.');
        }

        $applied = 0;
        try {
            self::ensureLedger($pdo);
            foreach (self::pending($pdo, $files) as $path) {
                self::applyFile($pdo, $path);
                $applied++;
            }
        } finally {
            try {
                self::scalar($pdo, 'SELECT RELEASE_LOCK(' . $pdo->quote(self::LOCK) . ')');
            } catch (Throwable) {
                // A trava cai com a conexão se o release falhar.
            }
        }

        self::assertGate($pdo);
        return $applied;
    }

    /** @return list<string> */
    private static function files(): array
    {
        $dir = self::directory();
        $paths = glob($dir . '/migrate-*.sql') ?: [];
        $out = [];
        foreach ($paths as $path) {
            $base = basename($path);
            if (!preg_match('/^migrate-\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.sql$/', $base)) {
                continue;
            }
            $out[] = $path;
        }
        sort($out, SORT_STRING);
        if ($out === []) {
            throw new RuntimeException('Nenhuma migração MySQL encontrada.');
        }
        return $out;
    }

    private static function directory(): string
    {
        $backend = defined('FJD_BACKEND_ROOT') ? FJD_BACKEND_ROOT : dirname(__DIR__, 2);
        $staged = $backend . '/migrations';
        $stagedFiles = glob($staged . '/migrate-*.sql') ?: [];
        if ($stagedFiles !== []) {
            return $staged;
        }
        $repoDb = dirname($backend) . '/db';
        if (is_dir($repoDb)) {
            return $repoDb;
        }
        return $staged;
    }

    /**
     * @param list<string> $files
     * @return list<string>
     */
    private static function pending(PDO $pdo, array $files): array
    {
        $done = [];
        $list = $pdo->query('SELECT `id` FROM `_schema_migrations`');
        $rows = $list instanceof \PDOStatement ? $list->fetchAll(PDO::FETCH_COLUMN) : [];
        if ($list instanceof \PDOStatement) {
            $list->closeCursor();
        }
        foreach ($rows as $id) {
            $done[(string) $id] = true;
        }
        $pending = [];
        foreach ($files as $path) {
            $id = basename($path, '.sql');
            if (!isset($done[$id])) {
                $pending[] = $path;
            }
        }
        return $pending;
    }

    private static function ensureLedger(PDO $pdo): void
    {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS `_schema_migrations` (
              `id` VARCHAR(191) NOT NULL,
              `applied_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
              PRIMARY KEY (`id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    }

    private static function applyFile(PDO $pdo, string $path): void
    {
        $sql = file_get_contents($path);
        if (!is_string($sql) || trim($sql) === '') {
            throw new RuntimeException('Migração vazia: ' . basename($path));
        }
        $id = basename($path, '.sql');
        foreach (self::statements($sql) as $statement) {
            if (self::forbidden($statement)) {
                throw new RuntimeException('Comando recusado em ' . basename($path) . '.');
            }
            try {
                self::execStatement($pdo, $statement);
            } catch (Throwable $e) {
                $detail = $e instanceof PDOException ? $e->getMessage() : $e->getMessage();
                throw new RuntimeException('Falha em ' . basename($path) . ': ' . self::clip($detail), 0, $e);
            }
        }
        $stamp = gmdate('Y-m-d H:i:s') . sprintf('.%03d', (int) floor(fmod(microtime(true), 1) * 1000));
        $ins = $pdo->prepare('INSERT IGNORE INTO `_schema_migrations` (`id`, `applied_at`) VALUES (:id, :at)');
        $ins->execute([':id' => $id, ':at' => $stamp]);
    }

    private static function execStatement(PDO $pdo, string $statement): void
    {
        $stmt = $pdo->query($statement);
        if ($stmt instanceof \PDOStatement) {
            $stmt->fetchAll();
            $stmt->closeCursor();
        }
    }

    private static function scalar(PDO $pdo, string $statement): mixed
    {
        $stmt = $pdo->query($statement);
        if (!$stmt instanceof \PDOStatement) {
            throw new RuntimeException('Consulta sem resultado.');
        }
        $value = $stmt->fetchColumn();
        $stmt->closeCursor();
        return $value;
    }

    /** @return list<string> */
    private static function statements(string $sql): array
    {
        $len = strlen($sql);
        $buf = '';
        $out = [];
        $inQuote = false;
        $inLine = false;
        $inBlock = false;
        for ($i = 0; $i < $len; $i++) {
            $c = $sql[$i];
            $n = $i + 1 < $len ? $sql[$i + 1] : '';
            if ($inLine) {
                if ($c === "\n") {
                    $inLine = false;
                }
                continue;
            }
            if ($inBlock) {
                if ($c === '*' && $n === '/') {
                    $inBlock = false;
                    $i++;
                }
                continue;
            }
            if ($inQuote) {
                $buf .= $c;
                if ($c === "'" && $n === "'") {
                    $buf .= $n;
                    $i++;
                    continue;
                }
                if ($c === "'") {
                    $inQuote = false;
                }
                continue;
            }
            if ($c === '-' && $n === '-') {
                $inLine = true;
                $i++;
                continue;
            }
            if ($c === '/' && $n === '*') {
                $inBlock = true;
                $i++;
                continue;
            }
            if ($c === "'") {
                $inQuote = true;
                $buf .= $c;
                continue;
            }
            if ($c === ';') {
                $trim = trim($buf);
                if ($trim !== '') {
                    $out[] = $trim;
                }
                $buf = '';
                continue;
            }
            $buf .= $c;
        }
        $trim = trim($buf);
        if ($trim !== '') {
            $out[] = $trim;
        }
        return $out;
    }

    private static function forbidden(string $sql): bool
    {
        if (preg_match('/^(DELETE|DROP|TRUNCATE|UPDATE)\b/i', $sql)) {
            return true;
        }
        return (bool) preg_match('/^ALTER\s+TABLE\b/i', $sql) && (bool) preg_match('/\bMODIFY\b/i', $sql);
    }

    private static function assertGate(PDO $pdo): void
    {
        $columns = [
            'display_name',
            'bio',
            'avatar_mode',
            'photo_path',
            'photo_pending_path',
            'photo_status',
            'photo_updated_at',
            'photo_reject_reason',
        ];
        $marks = implode(',', array_fill(0, count($columns), '?'));
        $colStmt = $pdo->prepare(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME IN ($marks)"
        );
        $colStmt->execute($columns);
        $foundCols = $colStmt->fetchAll(PDO::FETCH_COLUMN);
        $missingCols = array_values(array_diff($columns, array_map('strval', $foundCols)));

        $tables = ['despertar_season_archives', 'despertar_paid_achievements'];
        $tableMarks = implode(',', array_fill(0, count($tables), '?'));
        $tableStmt = $pdo->prepare(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ($tableMarks)"
        );
        $tableStmt->execute($tables);
        $foundTables = $tableStmt->fetchAll(PDO::FETCH_COLUMN);
        $missingTables = array_values(array_diff($tables, array_map('strval', $foundTables)));

        if ($missingCols !== [] || $missingTables !== []) {
            throw new RuntimeException(
                'Schema incompleto. Colunas: '
                . ($missingCols === [] ? 'ok' : implode(', ', $missingCols))
                . '. Tabelas: '
                . ($missingTables === [] ? 'ok' : implode(', ', $missingTables))
                . '.'
            );
        }

        if (PHP_SAPI !== 'cli') {
            Http::setHeader('X-Fjd-Schema', 'columns=8;tables=2');
        }
    }

    private static function clip(string $text): string
    {
        $text = preg_replace('/\s+/', ' ', $text) ?? $text;
        return strlen($text) > 280 ? substr($text, 0, 280) : $text;
    }
}
