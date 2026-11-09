<?php
declare(strict_types=1);

namespace App\Services\Prova;

use App\Core\Database;
use RuntimeException;

/** Private, bounded filesystem staging. No database or client-supplied paths. */
final class ProvaProjectUploadService
{
    public const CHUNK_SIZE = 20 * 1024 * 1024;
    public const TTL = 86400;

    private static function error(int $status, string $error): array
    {
        return ['ok' => false, 'status' => $status, 'error' => $error];
    }

    private static function validId(string $id): bool
    {
        return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/D', $id) === 1;
    }

    public static function partsDir(): string
    {
        return ProvaProjectService::storageDir() . '/.project-parts';
    }

    private static function locked(int $userId, callable $operation): array
    {
        if ($userId <= 0) {
            return self::error(403, 'Envio não autorizado.');
        }
        $root = self::partsDir();
        $userDir = $root . '/user-' . hash('sha256', (string) $userId);
        if (!is_dir($userDir) && !@mkdir($userDir, 0750, true) && !is_dir($userDir)) {
            return self::error(500, 'Armazenamento temporário indisponível.');
        }
        ProvaProjectService::ensureDenyAll($root);
        if (!is_file($root . '/.htaccess') || is_link($userDir)) {
            return self::error(500, 'Armazenamento temporário indisponível.');
        }
        $lock = @fopen($userDir . '/.lock', 'c');
        if (!$lock || !flock($lock, LOCK_EX)) {
            if ($lock) fclose($lock);
            return self::error(500, 'Não foi possível reservar o envio.');
        }
        try {
            return $operation($userDir);
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    private static function readMeta(string $dir): ?array
    {
        $path = $dir . '/meta.json';
        if (!is_file($path) || is_link($path) || filesize($path) > 8192) return null;
        $meta = json_decode((string) file_get_contents($path), true);
        return is_array($meta) ? $meta : null;
    }

    private static function saveMeta(string $dir, array $meta): void
    {
        $json = json_encode($meta, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        if (file_put_contents($dir . '/meta.tmp', $json) !== strlen($json)
            || !rename($dir . '/meta.tmp', $dir . '/meta.json')) {
            throw new RuntimeException('Não foi possível salvar o estado do envio.');
        }
        @chmod($dir . '/meta.json', 0640);
    }

    /** Remove only our fixed filenames, never arbitrary user files or symlinks. */
    private static function discard(string $dir, string $id): void
    {
        if (!self::validId($id)) return;
        $parts = $dir . '/' . $id;
        if (!is_dir($parts) || is_link($parts)) return;
        foreach (scandir($parts) ?: [] as $name) {
            if (preg_match('/^(?:[0-9]+\.part|incoming\.tmp|assembled\.tmp)$/D', $name)) {
                $path = $parts . '/' . $name;
                if (is_file($path) && !is_link($path)) @unlink($path);
            }
        }
        @rmdir($parts);
    }

    private static function ownedMeta(string $dir, int $userId, string $examId, string $id): ?array
    {
        $meta = self::readMeta($dir);
        if (!$meta || ($meta['uploadId'] ?? '') !== $id || ($meta['owner'] ?? 0) !== $userId
            || ($meta['examId'] ?? '') !== $examId) return null;
        if ((int) ($meta['updatedAt'] ?? 0) < time() - self::TTL) {
            self::discard($dir, $id);
            @unlink($dir . '/meta.json');
            return null;
        }
        return $meta;
    }

    public static function init(int $userId, string $examId, string $fileName, mixed $size, int $maxBytes): array
    {
        if (trim($fileName) === '') return self::error(400, 'Informe o nome do arquivo .zip.');
        // Check before name truncation, which deliberately preserves a .zip suffix.
        if (strtolower(pathinfo(str_replace('\\', '/', $fileName), PATHINFO_EXTENSION)) !== 'zip') {
            return self::error(415, 'O arquivo precisa ter a extensão .zip.');
        }
        if (!is_int($size) || $size <= 0 || $size > $maxBytes) {
            return self::error($size > $maxBytes ? 413 : 400, 'Tamanho do arquivo inválido ou acima do limite permitido.');
        }
        $fileName = ProvaProjectService::cleanOriginalName($fileName);
        if (strtolower(pathinfo($fileName, PATHINFO_EXTENSION)) !== 'zip') {
            return self::error(415, 'O arquivo precisa ter a extensão .zip.');
        }
        return self::locked($userId, static function (string $dir) use ($userId, $examId, $fileName, $size): array {
            $previous = self::readMeta($dir);
            if ($previous) self::discard($dir, (string) ($previous['uploadId'] ?? ''));
            $id = Database::uuidV4();
            if (!mkdir($dir . '/' . $id, 0750)) throw new RuntimeException('Falha ao criar envio.');
            $meta = ['uploadId' => $id, 'owner' => $userId, 'examId' => $examId, 'fileName' => $fileName,
                'size' => $size, 'chunkSize' => self::CHUNK_SIZE, 'totalChunks' => (int) ceil($size / self::CHUNK_SIZE),
                'createdAt' => time(), 'updatedAt' => time()];
            self::saveMeta($dir, $meta);
            return ['ok' => true, 'uploadId' => $id, 'chunkSize' => self::CHUNK_SIZE, 'totalChunks' => $meta['totalChunks']];
        });
    }

    public static function chunk(int $userId, string $examId, string $id, mixed $index, ?array $file, bool $requireUploadedFile = true): array
    {
        if (!self::validId($id)) return self::error(400, 'Identificador de envio inválido.');
        if (!(is_int($index) || (is_string($index) && preg_match('/^(0|[1-9][0-9]{0,5})$/D', $index)))) {
            return self::error(400, 'Índice de parte inválido.');
        }
        return self::locked($userId, static function (string $dir) use ($userId, $examId, $id, $index, $file, $requireUploadedFile): array {
            $meta = self::ownedMeta($dir, $userId, $examId, $id);
            if (!$meta) return self::error(404, 'Envio não encontrado ou expirado. Reinicie o envio.');
            $index = (int) $index;
            if ($index < 0 || $index >= $meta['totalChunks']) return self::error(400, 'Índice de parte inválido.');
            $err = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
            if (in_array($err, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
                return self::error(413, 'A hospedagem ou o proxy recusou esta parte por tamanho. Avise o Mestre.');
            }
            $tmp = (string) ($file['tmp_name'] ?? '');
            if ($err !== UPLOAD_ERR_OK || !is_file($tmp) || ($requireUploadedFile && !is_uploaded_file($tmp))) {
                return self::error(400, 'Parte inválida. Envie novamente.');
            }
            $expected = min(self::CHUNK_SIZE, $meta['size'] - $index * self::CHUNK_SIZE);
            if (filesize($tmp) !== $expected) return self::error(400, 'A parte recebida tem tamanho incorreto.');
            $path = $dir . '/' . $id . '/' . $index . '.part';
            if (is_file($path)) {
                if (filesize($path) !== $expected || !hash_equals((string) hash_file('sha256', $path), (string) hash_file('sha256', $tmp))) {
                    return self::error(409, 'Esta parte já foi recebida com outro conteúdo. Reinicie o envio.');
                }
            } else {
                $incoming = $dir . '/' . $id . '/incoming.tmp';
                $saved = $requireUploadedFile ? move_uploaded_file($tmp, $incoming) : copy($tmp, $incoming);
                if (!$saved || !rename($incoming, $path)) throw new RuntimeException('Falha ao gravar parte.');
                @chmod($path, 0640);
            }
            $meta['updatedAt'] = time();
            self::saveMeta($dir, $meta);
            return ['ok' => true, 'index' => $index];
        });
    }

    /** Hold the same user lock through validation AND the shared DB transaction. */
    public static function finish(int $userId, string $examId, string $id, int $maxBytes, callable $submit): array
    {
        if (!self::validId($id)) return self::error(400, 'Identificador de envio inválido.');
        return self::locked($userId, static function (string $dir) use ($userId, $examId, $id, $maxBytes, $submit): array {
            $meta = self::ownedMeta($dir, $userId, $examId, $id);
            if (!$meta) return self::error(404, 'Envio não encontrado ou expirado. Reinicie o envio.');
            $out = null;
            try {
                if ($meta['size'] > $maxBytes) return self::error(413, 'Arquivo acima do limite permitido.');
                $assembled = $dir . '/' . $id . '/assembled.tmp';
                $out = fopen($assembled, 'wb');
                if (!$out) throw new RuntimeException('Falha ao montar arquivo.');
                for ($i = 0; $i < $meta['totalChunks']; $i++) {
                    $part = $dir . '/' . $id . '/' . $i . '.part';
                    $expected = min(self::CHUNK_SIZE, $meta['size'] - $i * self::CHUNK_SIZE);
                    if (!is_file($part) || is_link($part) || filesize($part) !== $expected) return self::error(400, 'Envio incompleto. Reinicie o envio.');
                    $in = fopen($part, 'rb');
                    if (!$in) throw new RuntimeException('Falha ao ler parte.');
                    try { $copied = stream_copy_to_stream($in, $out); } finally { fclose($in); }
                    if ($copied !== $expected) throw new RuntimeException('Falha ao montar parte.');
                }
                fclose($out); $out = null;
                clearstatcache(true, $assembled);
                if (filesize($assembled) !== $meta['size']) return self::error(400, 'Tamanho final incorreto.');
                $v = ProvaProjectService::validateUpload(['error' => UPLOAD_ERR_OK, 'tmp_name' => $assembled, 'name' => $meta['fileName']], $maxBytes, false);
                if (!$v['ok']) return $v;
                // Callback stores with viaUploadedFile=false and uses the legacy transaction.
                return $submit($assembled, $v);
            } finally {
                if (is_resource($out)) fclose($out);
                self::discard($dir, $id);
                @unlink($dir . '/meta.json');
            }
        });
    }

    /** Non-blocking per-user lock prevents deleting in-flight parts/transactions. */
    public static function purgeStale(?int $now = null): int
    {
        $cutoff = ($now ?? time()) - self::TTL; $purged = 0;
        foreach (glob(self::partsDir() . '/user-*', GLOB_ONLYDIR) ?: [] as $dir) {
            if (is_link($dir) || !preg_match('/^user-[a-f0-9]{64}$/D', basename($dir))) continue;
            $lock = @fopen($dir . '/.lock', 'c');
            if (!$lock) continue;
            if (!flock($lock, LOCK_EX | LOCK_NB)) { fclose($lock); continue; }
            try {
                $meta = self::readMeta($dir);
                foreach (glob($dir . '/*', GLOB_ONLYDIR) ?: [] as $parts) {
                    $id = basename($parts);
                    if (!self::validId($id) || is_link($parts)) continue;
                    $active = $meta && ($meta['uploadId'] ?? '') === $id;
                    $updated = $active ? (int) ($meta['updatedAt'] ?? 0) : (int) filemtime($parts);
                    if ($updated >= $cutoff) continue;
                    self::discard($dir, $id); $purged++;
                    if ($active) @unlink($dir . '/meta.json');
                }
            } finally { flock($lock, LOCK_UN); fclose($lock); }
        }
        return $purged;
    }
}
