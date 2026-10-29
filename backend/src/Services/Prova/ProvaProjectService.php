<?php
declare(strict_types=1);

namespace App\Services\Prova;

use App\Core\Database;
use PDO;

/**
 * Entrega de arquivo do exame `project` (Trabalho Final): validação do .zip, armazenamento
 * fora de acesso público direto, metadados em `prova_submissions` e DTOs.
 */
final class ProvaProjectService
{
    public const ZIP_SIGNATURE = "PK\x03\x04";
    public const MIN_BYTES = 30;

    /**
     * Diretório privado dos .zip. `PROVA_UPLOAD_DIR` permite apontar para fora do webroot.
     */
    public static function storageDir(): string
    {
        $env = getenv('PROVA_UPLOAD_DIR');
        if (is_string($env) && trim($env) !== '') {
            return rtrim(trim($env), '/\\');
        }
        $root = defined('FJD_ROOT') ? (string) FJD_ROOT : dirname(__DIR__, 4);
        return rtrim($root, '/\\') . '/uploads/trabalhos';
    }

    /**
     * Valida um upload recebido (entrada = entrada de `$_FILES['file']`).
     * Não olha o nome do cliente além da extensão; confere assinatura PK\x03\x04 e tamanho.
     *
     * @param array<string, mixed>|null $file
     * @return array{ok: bool, error?: string, status?: int, originalName?: string, size?: int}
     */
    public static function validateUpload(?array $file, int $maxBytes, bool $requireUploadedFile = true): array
    {
        if (!$file || !isset($file['error'])) {
            return ['ok' => false, 'status' => 400, 'error' => 'Envie o arquivo .zip no campo "file".'];
        }
        $err = (int) $file['error'];
        if ($err === UPLOAD_ERR_INI_SIZE || $err === UPLOAD_ERR_FORM_SIZE) {
            return ['ok' => false, 'status' => 413, 'error' => 'Arquivo maior que o limite permitido (' . (int) ($maxBytes / 1048576) . ' MB).'];
        }
        if ($err === UPLOAD_ERR_NO_FILE) {
            return ['ok' => false, 'status' => 400, 'error' => 'Nenhum arquivo enviado.'];
        }
        if ($err !== UPLOAD_ERR_OK) {
            return ['ok' => false, 'status' => 400, 'error' => 'Falha no envio do arquivo (código ' . $err . ').'];
        }
        $tmp = (string) ($file['tmp_name'] ?? '');
        if ($tmp === '' || !is_file($tmp) || ($requireUploadedFile && !is_uploaded_file($tmp))) {
            return ['ok' => false, 'status' => 400, 'error' => 'Upload inválido.'];
        }

        $original = self::cleanOriginalName((string) ($file['name'] ?? ''));
        if (strtolower((string) pathinfo($original, PATHINFO_EXTENSION)) !== 'zip') {
            return ['ok' => false, 'status' => 415, 'error' => 'O arquivo precisa ter a extensão .zip.'];
        }

        $size = (int) filesize($tmp);
        if ($size < self::MIN_BYTES) {
            return ['ok' => false, 'status' => 400, 'error' => 'Arquivo vazio ou corrompido.'];
        }
        if ($size > $maxBytes) {
            return ['ok' => false, 'status' => 413, 'error' => 'Arquivo maior que o limite permitido (' . (int) ($maxBytes / 1048576) . ' MB).'];
        }

        $fh = fopen($tmp, 'rb');
        $head = $fh ? (string) fread($fh, 4) : '';
        if ($fh) {
            fclose($fh);
        }
        if ($head !== self::ZIP_SIGNATURE) {
            return ['ok' => false, 'status' => 415, 'error' => 'O conteúdo não é um .zip válido.'];
        }

        return ['ok' => true, 'originalName' => $original, 'size' => $size];
    }

    /**
     * Nome do cliente apenas como metadado: sem caminho, sem controle, truncado.
     */
    public static function cleanOriginalName(string $name): string
    {
        $name = str_replace('\\', '/', $name);
        $name = basename($name);
        $name = (string) preg_replace('/[\x00-\x1F\x7F]+/u', '', $name);
        $name = trim($name);
        if ($name === '') {
            $name = 'trabalho.zip';
        }
        if (mb_strlen($name, 'UTF-8') > 200) {
            $ext = '.zip';
            $name = mb_substr($name, 0, 200 - strlen($ext), 'UTF-8') . $ext;
        }
        return $name;
    }

    /**
     * Move o arquivo validado para o storage privado com nome uuid gerado no servidor.
     *
     * @return array{ok: bool, storedName?: string, sha256?: string, error?: string}
     */
    public static function storeFile(string $tmpPath, bool $viaUploadedFile = true): array
    {
        $dir = self::storageDir();
        if (!is_dir($dir) && !@mkdir($dir, 0750, true) && !is_dir($dir)) {
            return ['ok' => false, 'error' => 'Armazenamento indisponível.'];
        }
        self::ensureDenyAll($dir);

        $storedName = Database::uuidV4() . '.zip';
        $dest = $dir . '/' . $storedName;
        $moved = $viaUploadedFile ? @move_uploaded_file($tmpPath, $dest) : @copy($tmpPath, $dest);
        if (!$moved) {
            return ['ok' => false, 'error' => 'Não foi possível gravar o arquivo.'];
        }
        @chmod($dest, 0640);
        $hash = hash_file('sha256', $dest) ?: '';
        return ['ok' => true, 'storedName' => $storedName, 'sha256' => $hash];
    }

    /** Garante .htaccess "Deny from all" na pasta de entregas (defesa em profundidade). */
    public static function ensureDenyAll(string $dir): void
    {
        $ht = $dir . '/.htaccess';
        if (is_file($ht)) {
            return;
        }
        @file_put_contents(
            $ht,
            "Options -Indexes\n<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n  Order allow,deny\n  Deny from all\n</IfModule>\n"
        );
    }

    /** Caminho absoluto de um arquivo guardado; null se o nome não for um uuid.zip válido. */
    public static function pathForStoredName(string $storedName): ?string
    {
        if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.zip$/', $storedName)) {
            return null;
        }
        return self::storageDir() . '/' . $storedName;
    }

    public static function deleteStoredFile(?string $storedName): void
    {
        if (!$storedName) {
            return;
        }
        $path = self::pathForStoredName($storedName);
        if ($path && is_file($path)) {
            @unlink($path);
        }
    }

    // -------------------------------------------------------------------------
    // Banco
    // -------------------------------------------------------------------------

    /**
     * @return array<string, mixed>|null
     */
    public static function loadSubmission(string $attemptId): ?array
    {
        $stmt = Database::get()->prepare('SELECT * FROM prova_submissions WHERE attempt_id = :aid LIMIT 1');
        $stmt->execute([':aid' => $attemptId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * @param array<int, string> $attemptIds
     * @return array<string, array<string, mixed>>
     */
    public static function loadSubmissionsByAttempt(array $attemptIds): array
    {
        if ($attemptIds === []) {
            return [];
        }
        $ph = implode(',', array_fill(0, count($attemptIds), '?'));
        $stmt = Database::get()->prepare("SELECT * FROM prova_submissions WHERE attempt_id IN ({$ph})");
        $stmt->execute(array_values($attemptIds));
        $out = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $out[(string) $r['attempt_id']] = $r;
        }
        return $out;
    }

    /**
     * Trava a tentativa (SELECT ... FOR UPDATE) — exige transação aberta. Serializa reenvio × correção × reset.
     *
     * @return array<string, mixed>|null
     */
    public static function lockAttempt(string $attemptId): ?array
    {
        $stmt = Database::get()->prepare('SELECT * FROM prova_attempts WHERE id = :id LIMIT 1 FOR UPDATE');
        $stmt->execute([':id' => $attemptId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Grava/substitui a entrega do attempt (último envio vale). NÃO apaga o arquivo anterior:
     * devolve `previous` para o chamador removê-lo só depois do commit.
     *
     * @return array{submission: array<string, mixed>, previous: string|null}
     */
    public static function upsertSubmission(string $attemptId, string $storedName, string $originalName, int $size, string $sha256, int $nowMs): array
    {
        $pdo = Database::get();
        $old = self::loadSubmission($attemptId);
        $nowSql = Database::nowSql($nowMs);
        $stmt = $pdo->prepare(
            'INSERT INTO prova_submissions
               (attempt_id, stored_name, original_name, size_bytes, sha256, upload_count, first_uploaded_at, uploaded_at)
             VALUES (:aid, :sn, :on, :sz, :sha, 1, :now, :now2)
             ON DUPLICATE KEY UPDATE
               stored_name = VALUES(stored_name),
               original_name = VALUES(original_name),
               size_bytes = VALUES(size_bytes),
               sha256 = VALUES(sha256),
               upload_count = upload_count + 1,
               uploaded_at = VALUES(uploaded_at)'
        );
        $stmt->execute([
            ':aid' => $attemptId,
            ':sn' => $storedName,
            ':on' => $originalName,
            ':sz' => $size,
            ':sha' => $sha256,
            ':now' => $nowSql,
            ':now2' => $nowSql,
        ]);
        $previous = ($old && !empty($old['stored_name']) && $old['stored_name'] !== $storedName)
            ? (string) $old['stored_name']
            : null;
        return ['submission' => self::loadSubmission($attemptId) ?? [], 'previous' => $previous];
    }

    /**
     * Nomes guardados das entregas de uma lista de attempts (capturar ANTES do DELETE em cascata).
     *
     * @param array<int, string> $attemptIds
     * @return array<int, string>
     */
    public static function storedNamesForAttempts(array $attemptIds): array
    {
        $out = [];
        foreach (self::loadSubmissionsByAttempt($attemptIds) as $row) {
            if (!empty($row['stored_name'])) {
                $out[] = (string) $row['stored_name'];
            }
        }
        return $out;
    }

    /**
     * Remove os arquivos físicos (chamar só depois do commit/DELETE).
     *
     * @param array<int, string> $storedNames
     */
    public static function deleteStoredNames(array $storedNames): void
    {
        foreach ($storedNames as $name) {
            self::deleteStoredFile($name);
        }
    }

    /**
     * @return array<int, string>
     */
    public static function attemptIdsForExam(string $examId, ?array $userIds = null): array
    {
        $pdo = Database::get();
        if ($userIds !== null) {
            if ($userIds === []) {
                return [];
            }
            $ph = implode(',', array_fill(0, count($userIds), '?'));
            $stmt = $pdo->prepare("SELECT id FROM prova_attempts WHERE exam_id = ? AND user_id IN ({$ph})");
            $stmt->execute(array_merge([$examId], array_values($userIds)));
        } else {
            $stmt = $pdo->prepare('SELECT id FROM prova_attempts WHERE exam_id = ?');
            $stmt->execute([$examId]);
        }
        return array_map(static fn(array $r): string => (string) $r['id'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // -------------------------------------------------------------------------
    // DTOs
    // -------------------------------------------------------------------------

    /**
     * @param array<string, mixed>|null $row
     * @return array<string, mixed>|null
     */
    public static function submissionDto(?array $row): ?array
    {
        if (!$row) {
            return null;
        }
        return [
            'originalName' => (string) ($row['original_name'] ?? ''),
            'sizeBytes' => (int) ($row['size_bytes'] ?? 0),
            'uploadedAt' => Database::sqlToIso($row['uploaded_at'] ?? null),
            'firstUploadedAt' => Database::sqlToIso($row['first_uploaded_at'] ?? null),
            'uploadCount' => (int) ($row['upload_count'] ?? 1),
            'sha256' => (string) ($row['sha256'] ?? ''),
        ];
    }

    /**
     * Nota 0–scoreMax em passos de 0.01; null se inválida.
     */
    public static function normalizeProjectScore(mixed $value, float $max): ?float
    {
        if ($value === null || $value === '' || !is_numeric($value)) {
            return null;
        }
        $n = (float) $value;
        if (!is_finite($n) || $n < 0.0 || $n > $max) {
            return null;
        }
        return round($n * 100.0) / 100.0;
    }

    /** Nome seguro para o header Content-Disposition. */
    public static function downloadFileName(string $originalName, string $username): string
    {
        $base = preg_replace('/[^A-Za-z0-9._-]+/', '_', pathinfo($originalName, PATHINFO_FILENAME)) ?: 'trabalho';
        $user = preg_replace('/[^A-Za-z0-9._-]+/', '_', $username) ?: 'aluno';
        return substr($user . '__' . $base, 0, 120) . '.zip';
    }
}
