<?php
declare(strict_types=1);

namespace App\Services\Progress;

use App\Core\AdminAudit;
use App\Core\Database;
use App\Core\GameCatalog;
use App\Core\Http;
use App\Core\Password;
use App\Core\RateLimiter;
use App\Services\SessionService;
use PDO;
use Throwable;

/**
 * Sistema de Perfil: nome de exibição, bio, foto (com moderação), troca de nome completo e de senha.
 * Actions: profileUpdate, profilePhotoUpload, profilePhotoRemove, profileNameUpdate, passwordChange,
 * adminPhotoQueue, adminPhotoReview, adminPhotoRemove.
 */
final class ProfileService
{
    public const DISPLAY_NAME_MIN = 2;
    public const DISPLAY_NAME_MAX = 40;
    public const BIO_MAX = 160;
    public const FULL_NAME_MIN = 5;
    public const FULL_NAME_MAX = 255;
    public const PASSWORD_MIN = 4;
    public const PASSWORD_MAX = 200;
    public const PHOTO_MAX_BYTES = 1572864; // 1,5 MB decodificado
    public const PHOTO_MAX_SIDE = 4096;
    public const PHOTO_MAX_PIXELS = 16000000;
    public const PHOTO_SIZE = 256;
    public const REJECT_REASON_MAX = 160;

    private const PHOTO_DIR = 'uploads/avatars';
    /** Fotos pendentes ficam FORA da pasta pública (backend/storage) e só saem via API, ao dono e ao Mestre. */
    private const PENDING_DIR = 'storage/avatars-pending';
    /** Únicos formatos de caminho aceitos vindos do banco (defesa em profundidade contra path traversal). */
    private const PHOTO_PATH_RE = '#^uploads/avatars/\d+-[a-f0-9]{16}\.(webp|jpg)$#';
    private const PENDING_PATH_RE = '#^pending/\d+-[a-f0-9]{16}\.(webp|jpg)$#';
    private const ADMIN_QUEUE_MAX = 50;
    private const ALLOWED_MIMES = ['image/webp', 'image/png', 'image/jpeg'];

    // -------------------------------------------------------------------------
    // Campos expostos (usados por sanitizeUser e pelas superfícies públicas)
    // -------------------------------------------------------------------------

    /**
     * Campos públicos (qualquer usuário autenticado pode ver): só foto APROVADA.
     * Aceita linha crua do MySQL ou usuário hidratado.
     *
     * @param array<string, mixed> $row
     * @return array{displayName: ?string, avatarMode: string, photoUrl: ?string}
     */
    public static function publicFields(array $row): array
    {
        $display = isset($row['display_name']) ? trim((string) $row['display_name']) : '';
        $approved = self::cleanPath($row['photo_path'] ?? null);
        $mode = (string) ($row['avatar_mode'] ?? 'catalog');
        return [
            'displayName' => $display !== '' ? $display : null,
            'avatarMode' => $mode === 'photo' ? 'photo' : 'catalog',
            'photoUrl' => $approved !== null ? self::urlFor($approved, $row['photo_updated_at'] ?? null) : null,
        ];
    }

    /**
     * Campos completos para o próprio dono (inclui pendente e motivo de rejeição).
     *
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public static function ownerFields(array $row): array
    {
        $pending = self::cleanPendingPath($row['photo_pending_path'] ?? null);
        $status = (string) ($row['photo_status'] ?? 'none');
        if (!in_array($status, ['none', 'pending', 'approved', 'rejected'], true)) {
            $status = 'none';
        }
        $bio = isset($row['bio']) ? trim((string) $row['bio']) : '';
        $reason = isset($row['photo_reject_reason']) ? trim((string) $row['photo_reject_reason']) : '';
        return array_merge(self::publicFields($row), [
            'bio' => $bio !== '' ? $bio : null,
            'photoPendingUrl' => $pending !== null ? self::pendingDataUrl($pending) : null,
            'photoStatus' => $status,
            'photoRejectReason' => $reason !== '' ? $reason : null,
        ]);
    }

    /** Nomes das colunas de perfil públicas, para SELECTs explícitos. */
    public const PUBLIC_COLUMNS = '`display_name`, `avatar_mode`, `photo_path`, `photo_updated_at`';

    // -------------------------------------------------------------------------
    // profileUpdate
    // -------------------------------------------------------------------------

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function profileUpdate(array $user, int $userId, array $body): never
    {
        $sets = [];
        $params = [':id' => $userId];

        if (array_key_exists('displayName', $body)) {
            $name = self::cleanText($body['displayName'], 'Nome de exibição');
            if ($name === '') {
                $sets[] = '`display_name` = NULL';
            } else {
                $len = mb_strlen($name);
                if ($len < self::DISPLAY_NAME_MIN || $len > self::DISPLAY_NAME_MAX) {
                    Http::error(400, 'O nome de exibição deve ter entre ' . self::DISPLAY_NAME_MIN . ' e ' . self::DISPLAY_NAME_MAX . ' caracteres.');
                }
                $sets[] = '`display_name` = :dn';
                $params[':dn'] = $name;
            }
        }

        if (array_key_exists('bio', $body)) {
            $bio = self::cleanText($body['bio'], 'Bio');
            if (mb_strlen($bio) > self::BIO_MAX) {
                Http::error(400, 'A bio deve ter no máximo ' . self::BIO_MAX . ' caracteres.');
            }
            if ($bio === '') {
                $sets[] = '`bio` = NULL';
            } else {
                $sets[] = '`bio` = :bio';
                $params[':bio'] = $bio;
            }
        }

        if (array_key_exists('avatarMode', $body)) {
            $mode = is_string($body['avatarMode']) ? $body['avatarMode'] : '';
            if (!in_array($mode, ['catalog', 'photo'], true)) {
                Http::error(400, 'Modo de avatar inválido.');
            }
            if ($mode === 'photo') {
                $hasApproved = self::cleanPath($user['photo_path'] ?? null) !== null;
                $hasPending = self::cleanPendingPath($user['photo_pending_path'] ?? null) !== null;
                if (!$hasApproved && !$hasPending) {
                    Http::error(400, 'Envie uma foto antes de usá-la como avatar.');
                }
            }
            $sets[] = '`avatar_mode` = :am';
            $params[':am'] = $mode;
        }

        if ($sets === []) {
            Http::error(400, 'Nada para atualizar.');
        }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare('UPDATE `users` SET ' . implode(', ', $sets) . ' WHERE `id` = :id');
        $stmt->execute($params);

        self::respondUser($userId);
    }

    // -------------------------------------------------------------------------
    // profilePhotoUpload / profilePhotoRemove
    // -------------------------------------------------------------------------

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function profilePhotoUpload(array $user, int $userId, array $body): never
    {
        $short = RateLimiter::check("rl:profile:photo:{$userId}", 5, 60);
        $long = $short['limited'] ? $short : RateLimiter::check("rl:profile:photo:h:{$userId}", 20, 3600);
        if ($long['limited']) {
            Http::setHeader('Retry-After', (string) max(1, $long['retryAfterSec']));
            Http::error(429, 'Muitos envios de foto. Aguarde um pouco e tente de novo.');
        }

        $image = $body['image'] ?? null;
        if (!is_string($image) || $image === '') {
            Http::error(400, 'Informe a imagem.');
        }
        // base64 de 1,5 MB ≈ 2,1 MB; corta cedo antes de decodificar.
        if (strlen($image) > (int) (self::PHOTO_MAX_BYTES * 4 / 3) + 128) {
            Http::error(400, 'Imagem grande demais (máx. 1,5 MB).');
        }
        if (!preg_match('#^data:image/(webp|png|jpeg);base64,([A-Za-z0-9+/=\r\n]+)$#', $image, $m)) {
            Http::error(400, 'Formato inválido. Envie uma imagem WEBP, PNG ou JPEG.');
        }
        $bytes = base64_decode($m[2], true);
        if ($bytes === false || $bytes === '') {
            Http::error(400, 'Imagem corrompida.');
        }
        if (strlen($bytes) > self::PHOTO_MAX_BYTES) {
            Http::error(400, 'Imagem grande demais (máx. 1,5 MB).');
        }

        // Valida pelo CONTEÚDO (não pelo prefixo declarado pelo cliente).
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = (string) $finfo->buffer($bytes);
        $info = @getimagesizefromstring($bytes);
        if (
            !in_array($mime, self::ALLOWED_MIMES, true)
            || $info === false
            || !in_array((string) ($info['mime'] ?? ''), self::ALLOWED_MIMES, true)
            || $info['mime'] !== $mime
        ) {
            Http::error(400, 'O arquivo enviado não é uma imagem válida.');
        }
        $w = (int) $info[0];
        $h = (int) $info[1];
        if ($w < 32 || $h < 32) {
            Http::error(400, 'Imagem pequena demais (mínimo 32×32).');
        }
        if ($w > self::PHOTO_MAX_SIDE || $h > self::PHOTO_MAX_SIDE || $w * $h > self::PHOTO_MAX_PIXELS) {
            Http::error(400, 'Dimensões da imagem grandes demais.');
        }
        if (!function_exists('imagecreatefromstring')) {
            Http::error(500, 'Processamento de imagem indisponível no servidor.');
        }

        // Re-encode: os bytes originais NUNCA são salvos.
        $encoded = self::reencode($bytes, $w, $h);
        unset($bytes);
        if ($encoded === null) {
            Http::error(400, 'Não foi possível processar a imagem.');
        }
        [$data, $ext] = $encoded;

        $dir = self::pendingDir();
        if (!self::ensurePrivateDir($dir)) {
            error_log('[profile] mkdir falhou: ' . $dir);
            Http::error(500, 'Não foi possível salvar a foto.');
        }
        $name = $userId . '-' . bin2hex(random_bytes(8)) . '.' . $ext;
        $relPath = 'pending/' . $name;
        if (@file_put_contents($dir . '/' . $name, $data, LOCK_EX) === false) {
            error_log('[profile] gravação falhou: ' . $name);
            Http::error(500, 'Não foi possível salvar a foto.');
        }
        @chmod($dir . '/' . $name, 0644);

        // Estado ATUAL lido sob lock (FOR UPDATE): uploads/remoções concorrentes são serializados e o
        // arquivo pendente efetivamente substituído é o do banco, não um snapshot do início da requisição.
        $pdo = Database::pdo();
        $oldPending = null;
        try {
            $pdo->beginTransaction();
            $cur = self::lockPhotoState($pdo, $userId);
            $oldPending = self::cleanPendingPath($cur['photo_pending_path'] ?? null);
            $stmt = $pdo->prepare(
                "UPDATE `users`
                 SET `photo_pending_path` = :p, `photo_status` = 'pending',
                     `photo_updated_at` = :ts, `photo_reject_reason` = NULL
                 WHERE `id` = :id"
            );
            $stmt->execute([':p' => $relPath, ':ts' => Database::nowSql(), ':id' => $userId]);
            $pdo->commit();
        } catch (Throwable $e) {
            self::rollbackQuietly($pdo);
            @unlink($dir . '/' . $name);
            error_log('[profile] upload db: ' . $e->getMessage());
            Http::error(500, 'Não foi possível salvar a foto.');
        }

        // Só após o commit.
        if ($oldPending !== null) {
            self::deleteFile($oldPending);
        }
        self::respondUser($userId);
    }

    /**
     * @param array<string, mixed> $user
     */
    public static function profilePhotoRemove(array $user, int $userId): never
    {
        $pdo = Database::pdo();
        try {
            $pdo->beginTransaction();
            $cur = self::lockPhotoState($pdo, $userId);
            $approved = self::cleanPath($cur['photo_path'] ?? null);
            $pending = self::cleanPendingPath($cur['photo_pending_path'] ?? null);
            $stmt = $pdo->prepare(
                "UPDATE `users`
                 SET `photo_path` = NULL, `photo_pending_path` = NULL, `photo_status` = 'none',
                     `photo_reject_reason` = NULL, `photo_updated_at` = NULL, `avatar_mode` = 'catalog'
                 WHERE `id` = :id"
            );
            $stmt->execute([':id' => $userId]);
            $pdo->commit();
        } catch (Throwable $e) {
            self::rollbackQuietly($pdo);
            error_log('[profile] remove db: ' . $e->getMessage());
            Http::error(500, 'Não foi possível remover a foto.');
        }

        // Só após o commit.
        foreach ([$approved, $pending] as $p) {
            if ($p !== null) {
                self::deleteFile($p);
            }
        }
        self::respondUser($userId);
    }

    // -------------------------------------------------------------------------
    // profileNameUpdate / passwordChange
    // -------------------------------------------------------------------------

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function profileNameUpdate(array $user, int $userId, array $body): never
    {
        self::throttleCredentials($userId);
        $current = (string) ($body['currentPassword'] ?? '');
        if ($current === '') {
            Http::error(400, 'Informe a senha atual.');
        }
        $fullName = trim((string) preg_replace('/\s+/u', ' ', (string) ($body['fullName'] ?? '')));
        if (preg_match('/[\x00-\x1F\x7F<>]/u', $fullName)) {
            Http::error(400, 'Nome completo contém caracteres inválidos.');
        }
        $len = mb_strlen($fullName);
        if ($len < self::FULL_NAME_MIN) {
            Http::error(400, 'Nome completo muito curto.');
        }
        if ($len > self::FULL_NAME_MAX) {
            Http::error(400, 'Nome completo muito longo.');
        }
        if (!Password::verify($current, (string) ($user['password_hash'] ?? ''))) {
            Http::error(403, 'Senha atual incorreta.');
        }

        $old = (string) ($user['full_name'] ?? '');
        if ($old !== $fullName) {
            $pdo = Database::pdo();
            $stmt = $pdo->prepare('UPDATE `users` SET `full_name` = :n WHERE `id` = :id');
            $stmt->execute([':n' => $fullName, ':id' => $userId]);
            AdminAudit::record($userId, 'user_update_full_name', $userId, ['from' => $old, 'to' => $fullName]);
        }
        self::respondUser($userId);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function passwordChange(array $user, int $userId, array $body): never
    {
        self::throttleCredentials($userId);
        $current = (string) ($body['currentPassword'] ?? '');
        $next = (string) ($body['newPassword'] ?? '');
        if ($current === '') {
            Http::error(400, 'Informe a senha atual.');
        }
        if (strlen($next) < self::PASSWORD_MIN) {
            Http::error(400, 'Senha muito curta.');
        }
        if (strlen($next) > self::PASSWORD_MAX) {
            Http::error(400, 'Senha muito longa.');
        }
        if (!Password::verify($current, (string) ($user['password_hash'] ?? ''))) {
            Http::error(403, 'Senha atual incorreta.');
        }
        if (hash_equals($current, $next)) {
            Http::error(400, 'A nova senha deve ser diferente da atual.');
        }

        $newHash = Password::hash($next);
        $token = trim((string) (SessionService::extractRequestToken() ?? ''));
        $pdo = Database::pdo();
        try {
            // Mesma transação: nunca fica senha nova com sessões antigas vivas (nem o inverso).
            $pdo->beginTransaction();
            $stmt = $pdo->prepare('UPDATE `users` SET `password_hash` = :ph, `password` = NULL WHERE `id` = :id');
            $stmt->execute([':ph' => $newHash, ':id' => $userId]);
            // Invalida as OUTRAS sessões; a atual permanece.
            $del = $pdo->prepare('DELETE FROM `sessions` WHERE `user_id` = :u AND `token` <> :t');
            $del->execute([':u' => $userId, ':t' => $token]);
            $pdo->commit();
        } catch (Throwable $e) {
            self::rollbackQuietly($pdo);
            error_log('[profile] passwordChange: ' . $e->getMessage());
            Http::error(500, 'Não foi possível alterar a senha.');
        }

        AdminAudit::record($userId, 'user_change_password', $userId, []);
        Http::json(200, ['ok' => true]);
    }

    // -------------------------------------------------------------------------
    // Admin: fila / revisão / remoção de fotos
    // -------------------------------------------------------------------------

    /**
     * @param array<string, mixed> $user
     */
    public static function adminPhotoQueue(array $user): never
    {
        ProgressShared::requireAdmin($user);
        $pdo = Database::pdo();
        $stmt = $pdo->query(
            "SELECT `id`, `username`, `full_name`, `turma`, `photo_pending_path`, `photo_updated_at`
             FROM `users`
             WHERE `photo_status` = 'pending' AND `photo_pending_path` IS NOT NULL
             ORDER BY `photo_updated_at` ASC, `id` ASC
             LIMIT " . self::ADMIN_QUEUE_MAX
        );
        $items = [];
        foreach ($stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [] as $row) {
            $path = self::cleanPendingPath($row['photo_pending_path'] ?? null);
            $dataUrl = $path !== null ? self::pendingDataUrl($path) : null;
            if ($dataUrl === null) {
                continue;
            }
            $items[] = [
                'userId' => (int) $row['id'],
                'username' => (string) $row['username'],
                'fullName' => (string) $row['full_name'],
                'turma' => !empty($row['turma']) ? (string) $row['turma'] : null,
                'photoPendingUrl' => $dataUrl,
                'photoUpdatedAt' => Database::sqlToIso($row['photo_updated_at'] ?? null),
            ];
        }
        Http::json(200, ['ok' => true, 'items' => $items]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function adminPhotoReview(array $user, int $adminId, array $body): never
    {
        ProgressShared::requireAdmin($user);
        $target = self::loadTargetOrAbort($body['targetUserId'] ?? null);
        $targetId = (int) $target['id'];
        $decision = is_string($body['decision'] ?? null) ? $body['decision'] : '';
        if (!in_array($decision, ['approve', 'reject'], true)) {
            Http::error(400, 'Decisão inválida.');
        }

        $reason = '';
        if ($decision === 'reject') {
            $reason = self::cleanText($body['reason'] ?? '', 'Motivo');
            if (mb_strlen($reason) > self::REJECT_REASON_MAX) {
                Http::error(400, 'O motivo deve ter no máximo ' . self::REJECT_REASON_MAX . ' caracteres.');
            }
        }

        $pdo = Database::pdo();
        // Havia pendente no início da requisição? (distingue "nunca houve" de "já revisada")
        $hadPending = self::cleanPendingPath($target['photo_pending_path'] ?? null) !== null
            && ($target['photo_status'] ?? '') === 'pending';
        $outcome = 'ok'; // 'ok' | 'none' (sem pendente) | 'copy' (falha ao copiar)
        $pending = null;
        $oldApproved = null;
        $publicPath = null;
        try {
            $pdo->beginTransaction();
            // Estado atual sob lock: serializa com upload/remoção do dono e com outro Mestre.
            $cur = self::lockPhotoState($pdo, $targetId);
            $pending = self::cleanPendingPath($cur['photo_pending_path'] ?? null);
            $oldApproved = self::cleanPath($cur['photo_path'] ?? null);
            if ($pending === null || ($cur['photo_status'] ?? '') !== 'pending') {
                $outcome = 'none';
            } elseif ($decision === 'approve') {
                // COPIA (não move): a pendente privada só é apagada depois do commit.
                $publicPath = self::copyPendingToPublic($pending);
                if ($publicPath === null) {
                    $outcome = 'copy';
                } else {
                    $stmt = $pdo->prepare(
                        "UPDATE `users`
                         SET `photo_path` = :pub, `photo_pending_path` = NULL, `photo_updated_at` = :ts,
                             `photo_status` = 'approved', `photo_reject_reason` = NULL
                         WHERE `id` = :id"
                    );
                    $stmt->execute([':pub' => $publicPath, ':ts' => Database::nowSql(), ':id' => $targetId]);
                }
            } else {
                $stmt = $pdo->prepare(
                    "UPDATE `users`
                     SET `photo_pending_path` = NULL, `photo_status` = 'rejected',
                         `photo_reject_reason` = :r, `avatar_mode` = 'catalog'
                     WHERE `id` = :id"
                );
                $stmt->execute([':r' => $reason !== '' ? $reason : null, ':id' => $targetId]);
            }
            if ($outcome === 'ok') {
                $pdo->commit();
            } else {
                $pdo->rollBack();
            }
        } catch (Throwable $e) {
            self::rollbackQuietly($pdo);
            // Falhou: a pendente continua intacta; remove só a cópia pública eventualmente criada.
            if ($publicPath !== null) {
                self::deleteFile($publicPath);
            }
            error_log('[profile] adminPhotoReview: ' . $e->getMessage());
            Http::error(500, 'Não foi possível revisar a foto.');
        }

        if ($outcome === 'none') {
            if ($hadPending) {
                Http::error(409, 'A foto já foi revisada por outra pessoa.');
            }
            Http::error(400, 'Não há foto pendente para este usuário.');
        }
        if ($outcome === 'copy') {
            Http::error(500, 'Não foi possível publicar a foto.');
        }

        // Só após o commit: apaga a pendente privada (e a aprovada antiga, no approve).
        self::deleteFile($pending);
        if ($decision === 'approve' && $oldApproved !== null) {
            self::deleteFile($oldApproved);
        }
        AdminAudit::record(
            $adminId,
            'admin_photo_review',
            $targetId,
            $decision === 'reject' ? ['decision' => 'reject', 'reason' => $reason] : ['decision' => 'approve']
        );
        Http::json(200, ['ok' => true]);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $body
     */
    public static function adminPhotoRemove(array $user, int $adminId, array $body): never
    {
        ProgressShared::requireAdmin($user);
        $target = self::loadTargetOrAbort($body['targetUserId'] ?? null);
        $targetId = (int) $target['id'];
        $pdo = Database::pdo();
        $approved = null;
        try {
            $pdo->beginTransaction();
            $cur = self::lockPhotoState($pdo, $targetId);
            $approved = self::cleanPath($cur['photo_path'] ?? null);
            if ($approved !== null) {
                $hasPending = self::cleanPendingPath($cur['photo_pending_path'] ?? null) !== null;
                $stmt = $pdo->prepare(
                    'UPDATE `users` SET `photo_path` = NULL, `photo_status` = :st, `avatar_mode` = \'catalog\'
                     WHERE `id` = :id'
                );
                $stmt->execute([':st' => $hasPending ? 'pending' : 'none', ':id' => $targetId]);
                $pdo->commit();
            } else {
                $pdo->rollBack();
            }
        } catch (Throwable $e) {
            self::rollbackQuietly($pdo);
            error_log('[profile] adminPhotoRemove: ' . $e->getMessage());
            Http::error(500, 'Não foi possível remover a foto.');
        }
        if ($approved === null) {
            Http::error(400, 'Este usuário não tem foto aprovada.');
        }
        self::deleteFile($approved);
        AdminAudit::record($adminId, 'admin_photo_remove', $targetId, []);
        Http::json(200, ['ok' => true]);
    }

    // -------------------------------------------------------------------------
    // Internos
    // -------------------------------------------------------------------------

    /**
     * @return array<string, mixed>
     */
    private static function loadTargetOrAbort(mixed $targetUserId): array
    {
        $id = is_numeric($targetUserId) ? (int) $targetUserId : 0;
        if ($id <= 0) {
            Http::error(400, 'Informe targetUserId.');
        }
        $target = ProgressShared::loadUserById($id);
        if (!$target) {
            Http::error(404, 'Alma não encontrada.');
        }
        return $target;
    }

    /**
     * Lê o estado de foto ATUAL com lock de linha (exige transação aberta).
     *
     * @return array<string, mixed>
     */
    private static function lockPhotoState(PDO $pdo, int $userId): array
    {
        $stmt = $pdo->prepare(
            'SELECT `photo_path`, `photo_pending_path`, `photo_status` FROM `users` WHERE `id` = :id FOR UPDATE'
        );
        $stmt->execute([':id' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return is_array($row) ? $row : [];
    }

    private static function rollbackQuietly(PDO $pdo): void
    {
        try {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
        } catch (Throwable) {
            // sem ação: conexão já caiu
        }
    }

    private static function respondUser(int $userId): never
    {
        $updated = ProgressShared::loadUserById($userId);
        if (!$updated) {
            Http::error(500, 'Erro ao atualizar perfil.');
        }
        Http::json(200, ['ok' => true, 'user' => GameCatalog::sanitizeUser($updated, owner: true)]);
    }

    /** Limita tentativas de senha (força bruta com sessão roubada). */
    private static function throttleCredentials(int $userId): void
    {
        $rl = RateLimiter::check("rl:profile:cred:{$userId}", 8, 600);
        if ($rl['limited']) {
            Http::setHeader('Retry-After', (string) max(1, $rl['retryAfterSec']));
            Http::error(429, 'Muitas tentativas. Aguarde alguns minutos.');
        }
    }

    /**
     * Texto livre de uma linha: trim, colapsa espaços, rejeita controle e HTML.
     */
    private static function cleanText(mixed $raw, string $label): string
    {
        if ($raw === null) {
            return '';
        }
        if (!is_string($raw)) {
            Http::error(400, "{$label} inválido.");
        }
        $text = trim((string) preg_replace('/\s+/u', ' ', $raw));
        if (preg_match('/[\x00-\x1F\x7F<>]/u', $text) || preg_last_error() !== PREG_NO_ERROR) {
            Http::error(400, "{$label} contém caracteres inválidos.");
        }
        return $text;
    }

    /**
     * Valida um caminho vindo do banco; qualquer coisa fora do padrão vira null.
     */
    private static function cleanPath(mixed $path): ?string
    {
        if (!is_string($path) || $path === '' || !preg_match(self::PHOTO_PATH_RE, $path)) {
            return null;
        }
        return $path;
    }

    private static function cleanPendingPath(mixed $path): ?string
    {
        if (!is_string($path) || $path === '' || !preg_match(self::PENDING_PATH_RE, $path)) {
            return null;
        }
        return $path;
    }

    /** Foto pendente como data URL (<img> não envia Authorization; o arquivo nunca é público). */
    private static function pendingDataUrl(string $pendingPath): ?string
    {
        $full = self::pendingDir() . '/' . substr($pendingPath, strlen('pending/'));
        if (!is_file($full)) {
            return null;
        }
        $bytes = @file_get_contents($full);
        if ($bytes === false || $bytes === '') {
            return null;
        }
        $mime = str_ends_with($pendingPath, '.webp') ? 'image/webp' : 'image/jpeg';
        return "data:{$mime};base64," . base64_encode($bytes);
    }

    /**
     * COPIA pending/NAME → uploads/avatars/NAME (a pendente só é apagada após o commit).
     * Retorna o novo caminho relativo ou null.
     */
    private static function copyPendingToPublic(string $pendingPath): ?string
    {
        $name = substr($pendingPath, strlen('pending/'));
        $from = self::pendingDir() . '/' . $name;
        $toDir = self::uploadDir();
        if (!is_file($from) || (!is_dir($toDir) && !@mkdir($toDir, 0755, true) && !is_dir($toDir))) {
            return null;
        }
        $to = $toDir . '/' . $name;

        // Copia para um temporário NÃO público (no próprio storage privado) e só então promove com
        // rename(): em nenhum momento existe arquivo parcial em uploads/avatars.
        $tmp = self::pendingDir() . '/.tmp-' . bin2hex(random_bytes(8));
        $ok = false;
        try {
            $ok = @copy($from, $tmp) && @chmod($tmp, 0644) && @rename($tmp, $to);
        } catch (Throwable $e) {
            error_log('[profile] promoção da foto falhou: ' . $e->getMessage());
        }
        if (!$ok) {
            self::unlinkLogged($tmp);
            self::unlinkLogged($to);
            return null; // nada a limpar para o chamador
        }
        return self::PHOTO_DIR . '/' . $name;
    }

    /** Remove o arquivo se existir; registra no log se a remoção falhar. */
    private static function unlinkLogged(string $full): void
    {
        if (!is_file($full)) {
            return;
        }
        if (!@unlink($full) && is_file($full)) {
            error_log('[profile] falha ao apagar arquivo: ' . basename($full));
        }
    }

    private static function pendingDir(): string
    {
        $root = defined('FJD_BACKEND_ROOT') ? (string) FJD_BACKEND_ROOT : dirname(__DIR__, 3);
        return rtrim(str_replace('\\', '/', $root), '/') . '/' . self::PENDING_DIR;
    }

    /** Cria o diretório (0750) com .htaccess de negação total, caso o Apache o alcance. */
    private static function ensurePrivateDir(string $dir): bool
    {
        if (!is_dir($dir) && !@mkdir($dir, 0750, true) && !is_dir($dir)) {
            return false;
        }
        $ht = $dir . '/.htaccess';
        if (!is_file($ht)) {
            @file_put_contents(
                $ht,
                "Require all denied\n<IfModule !mod_authz_core.c>\n  Order allow,deny\n  Deny from all\n</IfModule>\n"
            );
        }
        return true;
    }

    private static function urlFor(string $path, mixed $updatedAt): string
    {
        $ms = is_string($updatedAt) ? Database::parseMs($updatedAt) : null;
        return $ms !== null ? "{$path}?v={$ms}" : $path;
    }

    private static function uploadDir(): string
    {
        $root = defined('FJD_ROOT') ? (string) FJD_ROOT : dirname(__DIR__, 4);
        return rtrim(str_replace('\\', '/', $root), '/') . '/' . self::PHOTO_DIR;
    }

    private static function deleteFile(string $relPath): void
    {
        if (self::cleanPendingPath($relPath) !== null) {
            $full = self::pendingDir() . '/' . substr($relPath, strlen('pending/'));
        } elseif (self::cleanPath($relPath) !== null) {
            $root = defined('FJD_ROOT') ? (string) FJD_ROOT : dirname(__DIR__, 4);
            $full = rtrim(str_replace('\\', '/', $root), '/') . '/' . $relPath;
        } else {
            return;
        }
        self::unlinkLogged($full);
    }

    /**
     * Decodifica, recorta ao centro (quadrado), redimensiona para 256×256 e re-encoda (WEBP; fallback JPEG).
     *
     * @return array{0: string, 1: string}|null [bytes, extensão]
     */
    private static function reencode(string $bytes, int $w, int $h): ?array
    {
        $src = @imagecreatefromstring($bytes);
        if ($src === false) {
            return null;
        }
        $side = min($w, $h);
        $sx = intdiv($w - $side, 2);
        $sy = intdiv($h - $side, 2);
        $size = self::PHOTO_SIZE;

        $dst = imagecreatetruecolor($size, $size);
        if ($dst === false) {
            imagedestroy($src);
            return null;
        }
        $useWebp = function_exists('imagewebp');
        if ($useWebp) {
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
            imagefill($dst, 0, 0, imagecolorallocatealpha($dst, 0, 0, 0, 127));
        } else {
            imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255));
        }
        $ok = imagecopyresampled($dst, $src, 0, 0, $sx, $sy, $size, $size, $side, $side);
        imagedestroy($src);
        if (!$ok) {
            imagedestroy($dst);
            return null;
        }

        ob_start();
        $written = $useWebp ? imagewebp($dst, null, 82) : imagejpeg($dst, null, 85);
        $out = (string) ob_get_clean();
        imagedestroy($dst);
        if (!$written || $out === '') {
            return null;
        }
        return [$out, $useWebp ? 'webp' : 'jpg'];
    }
}
