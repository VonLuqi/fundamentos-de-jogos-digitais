<?php
declare(strict_types=1);

namespace App\Services;

use App\Core\Database;
use App\Core\Http;
use App\Core\Mailer;
use PDO;
use Throwable;

/**
 * Tokens de e-mail (`auth_email_tokens`), Senha do Caronte (`site_settings`) e
 * Código de Recuperação da Alma (`soul_recovery_codes`).
 * Espelho de `api/_lib/auth-email.js`, `api/_lib/recovery-code.js` e `api/_lib/soul-recovery-code.js`.
 */
final class AuthEmailService
{
    public const TOKEN_TTL_MS = 60 * 60 * 1000;
    public const RATE_LIMIT_EMAIL_PER_HOUR = 3;
    public const RATE_LIMIT_IP_PER_HOUR = 5;

    public const PURPOSE_VERIFY = 'verify_email';
    public const PURPOSE_RESET = 'reset_password';
    public const PURPOSE_LEGACY = 'legacy_reset';

    public const RECOVERY_SETTING_KEY = 'caronte_recovery_code';
    public const RECOVERY_CODE_LENGTH = 10;
    public const RECOVERY_CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    public const SOUL_RECOVERY_TTL_MS = 24 * 60 * 60 * 1000;
    public const SOUL_RECOVERY_GENERIC_ERROR = 'Código inválido ou expirado. Peça um novo ao Mestre na sala.';

    public static function normalizeEmail(mixed $value): string
    {
        return strtolower(trim((string) ($value ?? '')));
    }

    public static function isValidEmail(string $email): bool
    {
        $val = self::normalizeEmail($email);
        if ($val === '' || strlen($val) < 3 || strlen($val) > 254) {
            return false;
        }
        return (bool) preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/', $val);
    }

    public static function hashEmailToken(string $plain): string
    {
        return hash('sha256', $plain);
    }

    public static function createPlainToken(): string
    {
        return bin2hex(random_bytes(32));
    }

    private static function escapeHtml(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    /**
     * @return array{subject: string, text: string, html: string}
     */
    public static function verificationEmailCopy(string $name, string $url): array
    {
        $display = trim($name) !== '' ? $name : 'alma';
        $text = implode("\n", [
            "Olá, {$display}.",
            '',
            'Confirme o selo desta alma no Domínio (Fundamentos de Jogos Digitais).',
            'O link vale por 60 minutos:',
            $url,
            '',
            'Se você não firmou este pacto, ignore esta mensagem.',
        ]);

        $safeName = self::escapeHtml($display);
        $html = <<<HTML
<div style="background:#0d0a10;color:#ece1d1;font-family:Georgia,serif;padding:32px;line-height:1.5">
  <p style="color:#cfa759;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 12px">Fundamentos de Jogos Digitais</p>
  <h1 style="color:#cfa759;font-size:22px;margin:0 0 16px">Confirmar o selo</h1>
  <p>Olá, {$safeName}.</p>
  <p>Confirme o e-mail desta alma para poder recuperar a Palavra de Passagem.</p>
  <p style="margin:28px 0">
    <a href="{$url}" style="display:inline-block;background:#cfa759;color:#0d0a10;padding:12px 18px;text-decoration:none;font-weight:700">Confirmar o selo</a>
  </p>
  <p style="color:#ab9c8a;font-size:14px">O selo vale por 60 minutos. Se você não firmou este pacto, ignore esta mensagem.</p>
  <p style="color:#6f6459;font-size:13px;word-break:break-all">{$url}</p>
</div>
HTML;

        return [
            'subject' => 'Fundamentos de Jogos Digitais — confirmar o selo',
            'text' => $text,
            'html' => trim($html),
        ];
    }

    /**
     * @return array{subject: string, text: string, html: string}
     */
    public static function resetPasswordEmailCopy(string $name, string $url): array
    {
        $display = trim($name) !== '' ? $name : 'alma';
        $text = implode("\n", [
            "Olá, {$display}.",
            '',
            'Alguém pediu para redefinir a Palavra de Passagem desta alma no Domínio (Fundamentos de Jogos Digitais).',
            'O link vale por 60 minutos:',
            $url,
            '',
            'Se você não pediu isso, ignore. A Palavra antiga continua válida.',
        ]);

        $safeName = self::escapeHtml($display);
        $html = <<<HTML
<div style="background:#0d0a10;color:#ece1d1;font-family:Georgia,serif;padding:32px;line-height:1.5">
  <p style="color:#cfa759;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 12px">Fundamentos de Jogos Digitais</p>
  <h1 style="color:#cfa759;font-size:22px;margin:0 0 16px">Redefinir Palavra de Passagem</h1>
  <p>Olá, {$safeName}.</p>
  <p>Use o botão abaixo para selar uma nova Palavra. O link vale por 60 minutos.</p>
  <p style="margin:28px 0">
    <a href="{$url}" style="display:inline-block;background:#cfa759;color:#0d0a10;padding:12px 18px;text-decoration:none;font-weight:700">Redefinir Palavra de Passagem</a>
  </p>
  <p style="color:#ab9c8a;font-size:14px">Se você não pediu isso, ignore. A Palavra antiga continua válida.</p>
  <p style="color:#6f6459;font-size:13px;word-break:break-all">{$url}</p>
</div>
HTML;

        return [
            'subject' => 'Fundamentos de Jogos Digitais — redefinir Palavra de Passagem',
            'text' => $text,
            'html' => trim($html),
        ];
    }

    /**
     * @return array{subject: string, text: string, html: string}
     */
    public static function legacyResetEmailCopy(string $name, string $url): array
    {
        $display = trim($name) !== '' ? $name : 'alma';
        $text = implode("\n", [
            "Olá, {$display}.",
            '',
            'O Mestre autorizou selar o Mensageiro desta alma e renovar a Palavra de Passagem.',
            'Um clique confirma o selo e abre o painel da Nova Palavra. O link vale por 60 minutos:',
            $url,
            '',
            'Se você não pediu isso na sala, ignore esta mensagem.',
        ]);

        $safeName = self::escapeHtml($display);
        $html = <<<HTML
<div style="background:#0d0a10;color:#ece1d1;font-family:Georgia,serif;padding:32px;line-height:1.5">
  <p style="color:#cfa759;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 12px">Fundamentos de Jogos Digitais</p>
  <h1 style="color:#cfa759;font-size:22px;margin:0 0 16px">Selar Mensageiro e Nova Palavra</h1>
  <p>Olá, {$safeName}.</p>
  <p>O Mestre liberou a Senha do Caronte. Este link confirma o e-mail e deixa você selar uma nova Palavra de Passagem.</p>
  <p style="margin:28px 0">
    <a href="{$url}" style="display:inline-block;background:#cfa759;color:#0d0a10;padding:12px 18px;text-decoration:none;font-weight:700">Confirmar selo e Nova Palavra</a>
  </p>
  <p style="color:#ab9c8a;font-size:14px">O link vale por 60 minutos. Se você não pediu isso na sala, ignore.</p>
  <p style="color:#6f6459;font-size:13px;word-break:break-all">{$url}</p>
</div>
HTML;

        return [
            'subject' => 'Fundamentos de Jogos Digitais — selar Mensageiro e Nova Palavra',
            'text' => $text,
            'html' => trim($html),
        ];
    }

    public static function isRateLimited(string $email, ?string $ip, string $purpose): bool
    {
        if (in_array($purpose, [self::PURPOSE_RESET, self::PURPOSE_LEGACY], true)) {
            return false;
        }
        $pdo = Database::pdo();
        $sinceSql = Database::nowSql((int) round(microtime(true) * 1000) - 3600000);

        if ($email !== '') {
            $stmt = $pdo->prepare(
                'SELECT COUNT(*) FROM `auth_email_tokens`
                 WHERE `purpose` = :purpose AND `email` = :email AND `created_at` >= :since'
            );
            $stmt->execute([':purpose' => $purpose, ':email' => $email, ':since' => $sinceSql]);
            if ((int) $stmt->fetchColumn() >= self::RATE_LIMIT_EMAIL_PER_HOUR) {
                return true;
            }
        }

        if ($ip !== null && $ip !== '') {
            $stmt = $pdo->prepare(
                'SELECT COUNT(*) FROM `auth_email_tokens`
                 WHERE `requested_ip` = :ip AND `created_at` >= :since'
            );
            $stmt->execute([':ip' => $ip, ':since' => $sinceSql]);
            if ((int) $stmt->fetchColumn() >= self::RATE_LIMIT_IP_PER_HOUR) {
                return true;
            }
        }

        return false;
    }

    public static function invalidateOpenTokens(int $userId, string $purpose): void
    {
        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'UPDATE `auth_email_tokens`
             SET `used_at` = :now
             WHERE `user_id` = :uid AND `purpose` = :purpose AND `used_at` IS NULL'
        );
        $stmt->execute([
            ':now' => Database::nowSql(),
            ':uid' => $userId,
            ':purpose' => $purpose,
        ]);
    }

    /**
     * @param string|array<int, string> $purpose
     * @return array<string, mixed>|null
     */
    public static function findValidEmailToken(mixed $plain, string|array $purpose): ?array
    {
        $token = trim((string) ($plain ?? ''));
        if (strlen($token) < 32) {
            return null;
        }
        $purposes = is_array($purpose) ? array_values($purpose) : [$purpose];
        if ($purposes === []) {
            return null;
        }

        $pdo = Database::pdo();
        $placeholders = implode(', ', array_fill(0, count($purposes), '?'));
        $sql = "SELECT `id`, `user_id`, `purpose`, `email`, `expires_at`, `used_at`
                FROM `auth_email_tokens`
                WHERE `token_hash` = ?
                  AND `used_at` IS NULL
                  AND `expires_at` > ?
                  AND `purpose` IN ({$placeholders})
                LIMIT 1";
        $params = array_merge([self::hashEmailToken($token), Database::nowSql()], $purposes);
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public static function markTokenUsed(int $tokenId): bool
    {
        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'UPDATE `auth_email_tokens` SET `used_at` = :now WHERE `id` = :id AND `used_at` IS NULL'
        );
        return $stmt->execute([
            ':now' => Database::nowSql(),
            ':id' => $tokenId,
        ]);
    }

    /**
     * @param array<string, mixed> $user
     * @return array{sent: bool, reason?: string}
     */
    public static function dispatchEmailVerification(array $user, ?string $ip): array
    {
        $email = self::normalizeEmail($user['email'] ?? '');
        if (!self::isValidEmail($email)) {
            return ['sent' => false, 'reason' => 'invalid'];
        }
        if (!empty($user['email_verified_at'])) {
            return ['sent' => false, 'reason' => 'already_verified'];
        }
        if (self::isRateLimited($email, $ip, self::PURPOSE_VERIFY)) {
            return ['sent' => false, 'reason' => 'rate_limit'];
        }

        $userId = (int) $user['id'];
        self::invalidateOpenTokens($userId, self::PURPOSE_VERIFY);

        $plain = self::createPlainToken();
        $nowMs = (int) round(microtime(true) * 1000);
        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'INSERT INTO `auth_email_tokens`
             (`user_id`, `purpose`, `token_hash`, `email`, `requested_ip`, `expires_at`, `created_at`)
             VALUES (:uid, :purpose, :hash, :email, :ip, :expires, :created)'
        );
        $stmt->execute([
            ':uid' => $userId,
            ':purpose' => self::PURPOSE_VERIFY,
            ':hash' => self::hashEmailToken($plain),
            ':email' => $email,
            ':ip' => $ip,
            ':expires' => Database::nowSql($nowMs + self::TOKEN_TTL_MS),
            ':created' => Database::nowSql($nowMs),
        ]);

        $base = Http::appBaseUrl();
        if (!$base) {
            return ['sent' => false, 'reason' => 'no_base_url'];
        }

        $url = "{$base}/pages/auth.html?verify={$plain}";
        $copy = self::verificationEmailCopy(
            (string) ($user['full_name'] ?? $user['username'] ?? 'alma'),
            $url
        );
        $mailed = Mailer::sendMail([
            'to' => $email,
            'subject' => $copy['subject'],
            'text' => $copy['text'],
            'html' => $copy['html'],
        ]);
        if (!$mailed['ok']) {
            return ['sent' => false, 'reason' => (string) ($mailed['reason'] ?? 'provider')];
        }
        return ['sent' => true];
    }

    /**
     * @param array<string, mixed> $user
     * @return array{sent: bool, reason?: string}
     */
    public static function dispatchPasswordReset(array $user, ?string $ip): array
    {
        $email = self::normalizeEmail($user['email'] ?? '');
        if (!self::isValidEmail($email)) {
            return ['sent' => false, 'reason' => 'invalid'];
        }
        if (($user['role'] ?? '') !== 'student' || empty($user['email_verified_at'])) {
            return ['sent' => false, 'reason' => 'not_eligible'];
        }

        $userId = (int) $user['id'];
        self::invalidateOpenTokens($userId, self::PURPOSE_RESET);

        $plain = self::createPlainToken();
        $nowMs = (int) round(microtime(true) * 1000);
        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'INSERT INTO `auth_email_tokens`
             (`user_id`, `purpose`, `token_hash`, `email`, `requested_ip`, `expires_at`, `created_at`)
             VALUES (:uid, :purpose, :hash, :email, :ip, :expires, :created)'
        );
        $stmt->execute([
            ':uid' => $userId,
            ':purpose' => self::PURPOSE_RESET,
            ':hash' => self::hashEmailToken($plain),
            ':email' => $email,
            ':ip' => $ip,
            ':expires' => Database::nowSql($nowMs + self::TOKEN_TTL_MS),
            ':created' => Database::nowSql($nowMs),
        ]);

        $base = Http::appBaseUrl();
        if (!$base) {
            return ['sent' => false, 'reason' => 'no_base_url'];
        }

        $url = "{$base}/pages/auth.html?reset={$plain}";
        $copy = self::resetPasswordEmailCopy(
            (string) ($user['full_name'] ?? $user['username'] ?? 'alma'),
            $url
        );
        $mailed = Mailer::sendMail([
            'to' => $email,
            'subject' => $copy['subject'],
            'text' => $copy['text'],
            'html' => $copy['html'],
        ]);
        if (!$mailed['ok']) {
            return ['sent' => false, 'reason' => (string) ($mailed['reason'] ?? 'provider')];
        }
        return ['sent' => true];
    }

    /**
     * @param array<string, mixed> $user
     * @return array{sent: bool, reason?: string}
     */
    public static function dispatchLegacyReset(array $user, ?string $ip): array
    {
        $email = self::normalizeEmail($user['email'] ?? '');
        if (!self::isValidEmail($email)) {
            return ['sent' => false, 'reason' => 'invalid'];
        }
        if (($user['role'] ?? '') !== 'student' || !empty($user['email_verified_at'])) {
            return ['sent' => false, 'reason' => 'not_eligible'];
        }

        $userId = (int) $user['id'];
        self::invalidateOpenTokens($userId, self::PURPOSE_LEGACY);
        self::invalidateOpenTokens($userId, self::PURPOSE_RESET);

        $plain = self::createPlainToken();
        $nowMs = (int) round(microtime(true) * 1000);
        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'INSERT INTO `auth_email_tokens`
             (`user_id`, `purpose`, `token_hash`, `email`, `requested_ip`, `expires_at`, `created_at`)
             VALUES (:uid, :purpose, :hash, :email, :ip, :expires, :created)'
        );
        $stmt->execute([
            ':uid' => $userId,
            ':purpose' => self::PURPOSE_LEGACY,
            ':hash' => self::hashEmailToken($plain),
            ':email' => $email,
            ':ip' => $ip,
            ':expires' => Database::nowSql($nowMs + self::TOKEN_TTL_MS),
            ':created' => Database::nowSql($nowMs),
        ]);

        $base = Http::appBaseUrl();
        if (!$base) {
            return ['sent' => false, 'reason' => 'no_base_url'];
        }

        $url = "{$base}/pages/auth.html?reset={$plain}";
        $copy = self::legacyResetEmailCopy(
            (string) ($user['full_name'] ?? $user['username'] ?? 'alma'),
            $url
        );
        $mailed = Mailer::sendMail([
            'to' => $email,
            'subject' => $copy['subject'],
            'text' => $copy['text'],
            'html' => $copy['html'],
        ]);
        if (!$mailed['ok']) {
            return ['sent' => false, 'reason' => (string) ($mailed['reason'] ?? 'provider')];
        }
        return ['sent' => true];
    }

    // -------------------------------------------------------------------------
    // Senha do Caronte (recovery-code.js)
    // -------------------------------------------------------------------------

    public static function generateRecoveryCodePlain(): string
    {
        $charset = self::RECOVERY_CODE_CHARSET;
        $len = strlen($charset);
        $bytes = random_bytes(self::RECOVERY_CODE_LENGTH);
        $out = '';
        for ($i = 0; $i < self::RECOVERY_CODE_LENGTH; $i++) {
            $out .= $charset[ord($bytes[$i]) % $len];
        }
        return $out;
    }

    public static function normalizeRecoveryCodeInput(mixed $value): string
    {
        return preg_replace('/[^A-Z0-9]/', '', strtoupper(trim((string) ($value ?? '')))) ?? '';
    }

    public static function hashRecoveryCode(string $plain): string
    {
        $norm = strtoupper(trim($plain));
        return hash('sha256', "caronte:{$norm}");
    }

    /**
     * @return array{ok: bool, reason: string}
     */
    public static function verifyRecoveryCode(mixed $plain): array
    {
        $normalized = self::normalizeRecoveryCodeInput($plain);
        if (strlen($normalized) < 8) {
            return ['ok' => false, 'reason' => 'short'];
        }

        try {
            $pdo = Database::pdo();
            $stmt = $pdo->prepare('SELECT `value_hash` FROM `site_settings` WHERE `key` = :key LIMIT 1');
            $stmt->execute([':key' => self::RECOVERY_SETTING_KEY]);
            $stored = (string) ($stmt->fetchColumn() ?: '');
            if ($stored === '') {
                return ['ok' => false, 'reason' => 'unset'];
            }
            $candidate = self::hashRecoveryCode($normalized);
            $match = hash_equals($stored, $candidate);
            return ['ok' => $match, 'reason' => $match ? 'match' : 'mismatch'];
        } catch (Throwable $e) {
            error_log('[recovery-code] verify: ' . $e->getMessage());
            return ['ok' => false, 'reason' => 'error'];
        }
    }

    /**
     * @return array{ok: bool, code?: string, rotatedAt?: string, error?: string}
     */
    public static function rotateRecoveryCodeRow(int $adminUserId): array
    {
        try {
            $plain = self::generateRecoveryCodePlain();
            $valueHash = self::hashRecoveryCode($plain);
            $nowMs = (int) round(microtime(true) * 1000);
            $rotatedAtSql = Database::nowSql($nowMs);
            $rotatedAtIso = Database::nowIso($nowMs);

            $pdo = Database::pdo();
            $stmt = $pdo->prepare(
                'INSERT INTO `site_settings` (`key`, `value_hash`, `rotated_at`, `rotated_by`)
                 VALUES (:key, :hash, :rotated_at, :rotated_by)
                 ON DUPLICATE KEY UPDATE
                   `value_hash` = VALUES(`value_hash`),
                   `rotated_at` = VALUES(`rotated_at`),
                   `rotated_by` = VALUES(`rotated_by`)'
            );
            $stmt->execute([
                ':key' => self::RECOVERY_SETTING_KEY,
                ':hash' => $valueHash,
                ':rotated_at' => $rotatedAtSql,
                ':rotated_by' => $adminUserId ?: null,
            ]);

            return ['ok' => true, 'code' => $plain, 'rotatedAt' => $rotatedAtIso];
        } catch (Throwable $e) {
            error_log('[recovery-code] rotate: ' . $e->getMessage());
            return ['ok' => false, 'error' => 'Não foi possível rotacionar a Senha do Caronte agora.'];
        }
    }

    // -------------------------------------------------------------------------
    // Código de Recuperação da Alma (soul-recovery-code.js)
    // -------------------------------------------------------------------------

    public static function hashSoulRecoveryCode(string $plain): string
    {
        $norm = self::normalizeRecoveryCodeInput($plain);
        return hash('sha256', "soul:{$norm}");
    }

    /**
     * @return array{ok: bool, code?: string, expiresAt?: string, username?: string, error?: string}
     */
    public static function issueSoulRecoveryCode(int $userId, int $adminId, string $username): array
    {
        if ($userId <= 0) {
            return ['ok' => false, 'error' => 'Alvo inválido.'];
        }

        try {
            $nowMs = (int) round(microtime(true) * 1000);
            $nowSql = Database::nowSql($nowMs);
            $expMs = $nowMs + self::SOUL_RECOVERY_TTL_MS;
            $expSql = Database::nowSql($expMs);
            $expIso = Database::nowIso($expMs);

            $plain = self::generateRecoveryCodePlain();
            $codeHash = self::hashSoulRecoveryCode($plain);

            $pdo = Database::pdo();
            $inv = $pdo->prepare(
                'UPDATE `soul_recovery_codes`
                 SET `used_at` = :now
                 WHERE `user_id` = :uid AND `used_at` IS NULL'
            );
            $inv->execute([':now' => $nowSql, ':uid' => $userId]);

            $ins = $pdo->prepare(
                'INSERT INTO `soul_recovery_codes`
                 (`user_id`, `code_hash`, `expires_at`, `created_by`, `created_at`)
                 VALUES (:uid, :hash, :expires, :by, :created)'
            );
            $ins->execute([
                ':uid' => $userId,
                ':hash' => $codeHash,
                ':expires' => $expSql,
                ':by' => $adminId ?: null,
                ':created' => $nowSql,
            ]);

            return [
                'ok' => true,
                'code' => $plain,
                'expiresAt' => $expIso,
                'username' => $username,
            ];
        } catch (Throwable $e) {
            error_log('[soul-recovery] issue: ' . $e->getMessage());
            return ['ok' => false, 'error' => 'Não foi possível emitir o código agora.'];
        }
    }

    /**
     * @return array{ok: bool, row?: array<string, mixed>, reason?: string}
     */
    public static function findActiveSoulRecovery(int $userId, mixed $code): array
    {
        $normalized = self::normalizeRecoveryCodeInput($code);
        if (strlen($normalized) < 8) {
            return ['ok' => false, 'reason' => 'short'];
        }
        $codeHash = self::hashSoulRecoveryCode($normalized);

        try {
            $pdo = Database::pdo();
            $stmt = $pdo->prepare(
                'SELECT `id`, `user_id`, `expires_at`, `used_at`
                 FROM `soul_recovery_codes`
                 WHERE `user_id` = :uid
                   AND `code_hash` = :hash
                   AND `used_at` IS NULL
                   AND `expires_at` > :now
                 ORDER BY `created_at` DESC
                 LIMIT 1'
            );
            $stmt->execute([
                ':uid' => $userId,
                ':hash' => $codeHash,
                ':now' => Database::nowSql(),
            ]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row || empty($row['id'])) {
                return ['ok' => false, 'reason' => 'mismatch'];
            }
            return ['ok' => true, 'row' => $row];
        } catch (Throwable $e) {
            error_log('[soul-recovery] find: ' . $e->getMessage());
            return ['ok' => false, 'reason' => 'error'];
        }
    }

    public static function markSoulRecoveryUsed(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        try {
            $pdo = Database::pdo();
            $stmt = $pdo->prepare(
                'UPDATE `soul_recovery_codes` SET `used_at` = :now WHERE `id` = :id AND `used_at` IS NULL'
            );
            return $stmt->execute([
                ':now' => Database::nowSql(),
                ':id' => $id,
            ]);
        } catch (Throwable) {
            return false;
        }
    }
}
