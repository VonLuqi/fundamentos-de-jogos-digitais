<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\AdminAudit;
use App\Core\Database;
use App\Core\GameCatalog;
use App\Core\Http;
use App\Core\Mailer;
use App\Core\Password;
use App\Services\AuthEmailService;
use App\Services\SessionService;
use PDO;
use PDOException;

/**
 * Controller de `/api/auth` — espelho completo de `api/auth.js`.
 */
final class AuthController
{
    private static function emailTakenByOther(string $email, ?int $excludeUserId = null): bool
    {
        $pdo = Database::pdo();
        if ($excludeUserId !== null && $excludeUserId > 0) {
            $stmt = $pdo->prepare('SELECT `id` FROM `users` WHERE LOWER(`email`) = :email AND `id` <> :uid LIMIT 1');
            $stmt->execute([':email' => strtolower($email), ':uid' => $excludeUserId]);
        } else {
            $stmt = $pdo->prepare('SELECT `id` FROM `users` WHERE LOWER(`email`) = :email LIMIT 1');
            $stmt->execute([':email' => strtolower($email)]);
        }
        return (bool) $stmt->fetchColumn();
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function loadUserById(int $userId): ?array
    {
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT * FROM `users` WHERE `id` = :id LIMIT 1');
        $stmt->execute([':id' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return Database::HydrateUserRow($row ?: null);
    }

    public static function handle(): never
    {
        $method = Http::method();

        if ($method === 'GET') {
            $token = Http::query('token');
            if ($token === null || trim($token) === '') {
                Http::error(400, 'Token ausente.');
            }
            $user = SessionService::loadUserBySessionToken($token);
            if (!$user) {
                Http::error(401, 'Sessão inválida.');
            }
            Http::json(200, [
                'ok' => true,
                'user' => GameCatalog::sanitizeUser($user),
            ]);
        }

        if ($method !== 'POST') {
            Http::setHeader('Allow', 'GET, POST');
            Http::error(405, 'Método não permitido.');
        }

        $body = Http::jsonBody();
        $action = (string) ($body['action'] ?? '');
        $ip = Http::clientIp();
        $pdo = Database::pdo();

        switch ($action) {
            case 'register': {
                $fullName = trim((string) ($body['fullName'] ?? ''));
                $turma = (string) ($body['turma'] ?? '');
                $username = trim((string) ($body['username'] ?? ''));
                $password = (string) ($body['password'] ?? '');
                $normalizedEmail = AuthEmailService::normalizeEmail($body['email'] ?? '');
                $hasEmail = $normalizedEmail !== '';

                $errors = [];
                if (mb_strlen($fullName) < 5) {
                    $errors[] = 'Nome completo muito curto.';
                }
                if (!in_array($turma, ['TCG01', 'TCG02'], true)) {
                    $errors[] = 'Turma inválida.';
                }
                if (mb_strlen($username) < 3) {
                    $errors[] = 'Username muito curto.';
                }
                if (strlen($password) < 4) {
                    $errors[] = 'Senha muito curta.';
                }
                if ($hasEmail && !AuthEmailService::isValidEmail($normalizedEmail)) {
                    $errors[] = 'E-mail inválido.';
                }
                if ($errors !== []) {
                    Http::error(400, implode(' ', $errors));
                }

                $normalizedUsername = mb_strtolower($username);

                $chk = $pdo->prepare('SELECT `id` FROM `users` WHERE LOWER(`username`) = :u LIMIT 1');
                $chk->execute([':u' => $normalizedUsername]);
                if ($chk->fetchColumn()) {
                    Http::error(409, 'Usuário já existe.');
                }

                if ($hasEmail && self::emailTakenByOther($normalizedEmail)) {
                    Http::error(409, 'Este e-mail já firma outro pacto.');
                }

                $passwordHash = Password::hash($password);
                $nowSql = Database::nowSql();

                try {
                    $ins = $pdo->prepare(
                        'INSERT INTO `users`
                         (`full_name`, `turma`, `username`, `email`, `email_verified_at`, `password_hash`, `role`, `xp`, `conquistas`, `completed_lessons`, `redeemed_codes`, `avatar_index`, `created_at`)
                         VALUES (:fn, :turma, :u, :email, NULL, :ph, :role, 0, :conq, :comp, :red, 0, :created)'
                    );
                    $ins->execute([
                        ':fn' => $fullName,
                        ':turma' => $turma,
                        ':u' => $normalizedUsername,
                        ':email' => $hasEmail ? $normalizedEmail : null,
                        ':ph' => $passwordHash,
                        ':role' => 'student',
                        ':conq' => '[]',
                        ':comp' => '[]',
                        ':red' => '[]',
                        ':created' => $nowSql,
                    ]);
                } catch (PDOException $e) {
                    if ((int) ($e->errorInfo[1] ?? 0) === 1062) {
                        $emailClash = stripos($e->getMessage(), 'email') !== false;
                        Http::error(409, $emailClash ? 'Este e-mail já firma outro pacto.' : 'Usuário já existe.');
                    }
                    Http::error(500, 'Erro ao criar usuário.');
                }

                $newUserId = (int) $pdo->lastInsertId();
                $user = self::loadUserById($newUserId);
                if (!$user) {
                    Http::error(500, 'Erro ao carregar usuário criado.');
                }

                $sessionRes = SessionService::createSessionRow($newUserId);
                if (empty($sessionRes['token'])) {
                    Http::error(500, 'Não foi possível criar a sessão agora. Tente novamente.');
                }

                $mailSent = false;
                if ($hasEmail) {
                    $dispatched = AuthEmailService::dispatchEmailVerification($user, $ip);
                    $mailSent = (bool) ($dispatched['sent'] ?? false);
                }

                Http::json(201, [
                    'ok' => true,
                    'token' => $sessionRes['token'],
                    'user' => GameCatalog::sanitizeUser($user),
                    'mailSent' => $mailSent,
                ]);
            }

            case 'login': {
                $username = trim((string) ($body['username'] ?? ''));
                $password = (string) ($body['password'] ?? '');
                if ($username === '' || $password === '') {
                    Http::error(401, 'Credenciais inválidas.');
                }

                $stmt = $pdo->prepare('SELECT * FROM `users` WHERE LOWER(`username`) = LOWER(:u) LIMIT 1');
                $stmt->execute([':u' => $username]);
                $rawRow = $stmt->fetch(PDO::FETCH_ASSOC);
                $user = Database::HydrateUserRow($rawRow ?: null);

                if (!$user) {
                    Http::error(401, 'Credenciais inválidas.');
                }

                $valid = false;
                $storedHash = (string) ($user['password_hash'] ?? '');
                if ($storedHash !== '' && Password::verify($password, $storedHash)) {
                    $valid = true;
                    if (Password::needsRehash($storedHash)) {
                        try {
                            $newHash = Password::hash($password);
                            $upd = $pdo->prepare('UPDATE `users` SET `password_hash` = :ph, `password` = NULL WHERE `id` = :id');
                            $upd->execute([':ph' => $newHash, ':id' => $user['id']]);
                        } catch (\Throwable) {
                            // best-effort upgrade
                        }
                    }
                }

                if (!$valid && !empty($user['password']) && hash_equals((string) $user['password'], $password)) {
                    $valid = true;
                    try {
                        $newHash = Password::hash($password);
                        $upd = $pdo->prepare('UPDATE `users` SET `password_hash` = :ph, `password` = NULL WHERE `id` = :id');
                        $upd->execute([':ph' => $newHash, ':id' => $user['id']]);
                    } catch (\Throwable) {
                        // best-effort upgrade
                    }
                }

                if (!$valid) {
                    Http::error(401, 'Credenciais inválidas.');
                }

                $sessionRes = SessionService::createSessionRow((int) $user['id']);
                if (empty($sessionRes['token'])) {
                    Http::error(500, 'Não foi possível iniciar a sessão agora. Tente novamente.');
                }

                Http::json(200, [
                    'ok' => true,
                    'token' => $sessionRes['token'],
                    'user' => GameCatalog::sanitizeUser($user),
                ]);
            }

            case 'logout': {
                $token = trim((string) ($body['token'] ?? ''));
                if ($token !== '') {
                    $del = $pdo->prepare('DELETE FROM `sessions` WHERE `token` = :token');
                    $del->execute([':token' => $token]);
                }
                Http::json(200, ['ok' => true]);
            }

            case 'requestEmailVerification': {
                $user = SessionService::loadUserBySessionToken((string) ($body['token'] ?? ''));
                if (!$user) {
                    Http::error(401, 'Sessão inválida.');
                }
                $mailSent = false;
                if (($user['role'] ?? '') === 'student') {
                    $dispatched = AuthEmailService::dispatchEmailVerification($user, $ip);
                    $mailSent = (bool) ($dispatched['sent'] ?? false);
                }
                Http::json(200, ['ok' => true, 'mailSent' => $mailSent]);
            }

            case 'bindEmail': {
                $user = SessionService::loadUserBySessionToken((string) ($body['token'] ?? ''));
                if (!$user) {
                    Http::error(401, 'Sessão inválida.');
                }
                if (($user['role'] ?? '') !== 'student') {
                    Http::error(403, 'Apenas alunos vinculam selo por este caminho.');
                }

                $email = AuthEmailService::normalizeEmail($body['email'] ?? '');
                if (!AuthEmailService::isValidEmail($email)) {
                    Http::error(400, 'E-mail inválido.');
                }

                if (self::emailTakenByOther($email, (int) $user['id'])) {
                    Http::error(409, 'Este e-mail já firma outro pacto.');
                }

                if (AuthEmailService::normalizeEmail($user['email'] ?? '') === $email && !empty($user['email_verified_at'])) {
                    Http::json(200, [
                        'ok' => true,
                        'email' => $email,
                        'emailVerifiedAt' => $user['email_verified_at'],
                    ]);
                }

                try {
                    $upd = $pdo->prepare('UPDATE `users` SET `email` = :email, `email_verified_at` = NULL WHERE `id` = :id');
                    $upd->execute([':email' => $email, ':id' => $user['id']]);
                } catch (PDOException $e) {
                    if ((int) ($e->errorInfo[1] ?? 0) === 1062) {
                        Http::error(409, 'Este e-mail já firma outro pacto.');
                    }
                    Http::error(500, 'Não foi possível vincular o e-mail agora.');
                }

                $updated = self::loadUserById((int) $user['id']);
                $dispatched = $updated ? AuthEmailService::dispatchEmailVerification($updated, $ip) : ['sent' => false];

                Http::json(200, [
                    'ok' => true,
                    'email' => $email,
                    'emailVerifiedAt' => null,
                    'mailSent' => (bool) ($dispatched['sent'] ?? false),
                    'user' => GameCatalog::sanitizeUser($updated),
                ]);
            }

            case 'confirmEmail': {
                $row = AuthEmailService::findValidEmailToken($body['token'] ?? '', AuthEmailService::PURPOSE_VERIFY);
                if (!$row) {
                    Http::error(400, 'Este selo expirou ou já foi usado. Chame o Mensageiro de novo.');
                }

                $owner = self::loadUserById((int) $row['user_id']);
                if (
                    !$owner
                    || AuthEmailService::normalizeEmail($owner['email'] ?? '') !== AuthEmailService::normalizeEmail($row['email'] ?? '')
                ) {
                    AuthEmailService::markTokenUsed((int) $row['id']);
                    Http::error(400, 'Este selo expirou ou já foi usado. Chame o Mensageiro de novo.');
                }

                $nowSql = Database::nowSql();
                $upd = $pdo->prepare('UPDATE `users` SET `email_verified_at` = :now WHERE `id` = :id AND `email` = :email');
                $upd->execute([
                    ':now' => $nowSql,
                    ':id' => $owner['id'],
                    ':email' => $owner['email'],
                ]);

                $updated = self::loadUserById((int) $owner['id']);
                if (!$updated) {
                    Http::error(500, 'Não foi possível confirmar o selo agora.');
                }

                AuthEmailService::markTokenUsed((int) $row['id']);
                AuthEmailService::invalidateOpenTokens((int) $owner['id'], AuthEmailService::PURPOSE_VERIFY);

                Http::json(200, [
                    'ok' => true,
                    'email' => $updated['email'],
                    'user' => GameCatalog::sanitizeUser($updated),
                ]);
            }

            case 'requestPasswordReset': {
                $username = mb_strtolower(trim((string) ($body['username'] ?? '')));
                $email = AuthEmailService::normalizeEmail($body['email'] ?? '');

                if ($username !== '' && AuthEmailService::isValidEmail($email)) {
                    $stmt = $pdo->prepare(
                        'SELECT `id`, `full_name`, `username`, `email`, `email_verified_at`, `role`
                         FROM `users` WHERE LOWER(`email`) = :email LIMIT 1'
                    );
                    $stmt->execute([':email' => $email]);
                    $user = $stmt->fetch(PDO::FETCH_ASSOC);

                    if (
                        $user
                        && mb_strtolower((string) ($user['username'] ?? '')) === $username
                        && ($user['role'] ?? '') === 'student'
                        && !empty($user['email_verified_at'])
                    ) {
                        AuthEmailService::dispatchPasswordReset($user, $ip);
                    }
                }

                Http::json(200, ['ok' => true]);
            }

            case 'requestLegacyEmailBind': {
                $username = mb_strtolower(trim((string) ($body['username'] ?? '')));
                $code = $body['code'] ?? '';
                $email = AuthEmailService::normalizeEmail($body['email'] ?? '');

                if ($username !== '' && AuthEmailService::isValidEmail($email)) {
                    $codeCheck = AuthEmailService::verifyRecoveryCode($code);
                    if ($codeCheck['ok']) {
                        $stmt = $pdo->prepare(
                            'SELECT `id`, `full_name`, `username`, `email`, `email_verified_at`, `role`
                             FROM `users` WHERE LOWER(`username`) = :u LIMIT 1'
                        );
                        $stmt->execute([':u' => $username]);
                        $user = $stmt->fetch(PDO::FETCH_ASSOC);

                        $hasNoEmail = trim((string) ($user['email'] ?? '')) === '';
                        $eligible = $user
                            && mb_strtolower((string) ($user['username'] ?? '')) === $username
                            && ($user['role'] ?? '') === 'student'
                            && empty($user['email_verified_at'])
                            && $hasNoEmail;

                        if ($eligible && !self::emailTakenByOther($email, (int) $user['id'])) {
                            try {
                                $upd = $pdo->prepare('UPDATE `users` SET `email` = :email, `email_verified_at` = NULL WHERE `id` = :id');
                                $upd->execute([':email' => $email, ':id' => $user['id']]);
                                $updated = self::loadUserById((int) $user['id']);
                                if ($updated) {
                                    AuthEmailService::dispatchLegacyReset($updated, $ip);
                                }
                            } catch (\Throwable) {
                                // resposta sempre 200 genérica
                            }
                        }
                    }
                }

                Http::json(200, ['ok' => true]);
            }

            case 'rotateRecoveryCode': {
                $admin = SessionService::loadUserBySessionToken((string) ($body['token'] ?? ''));
                if (!$admin || ($admin['role'] ?? '') !== 'admin') {
                    Http::error(403, 'Esta senda é só do Mestre.');
                }

                $res = AuthEmailService::rotateRecoveryCodeRow((int) $admin['id']);
                if (!$res['ok']) {
                    Http::error(500, (string) ($res['error'] ?? 'Falha ao rotacionar.'));
                }

                Http::json(200, [
                    'ok' => true,
                    'code' => $res['code'],
                    'rotatedAt' => $res['rotatedAt'],
                ]);
            }

            case 'adminMailerStatus': {
                $admin = SessionService::loadUserBySessionToken((string) ($body['token'] ?? ''));
                if (!$admin || ($admin['role'] ?? '') !== 'admin') {
                    Http::error(403, 'Esta senda é só do Mestre.');
                }
                Http::json(200, [
                    'ok' => true,
                    'status' => Mailer::getStatus(),
                ]);
            }

            case 'adminProbeMailer': {
                $admin = SessionService::loadUserBySessionToken((string) ($body['token'] ?? ''));
                if (!$admin || ($admin['role'] ?? '') !== 'admin') {
                    Http::error(403, 'Esta senda é só do Mestre.');
                }

                $status = Mailer::getStatus();
                $rawOverride = trim((string) ($body['to'] ?? $body['email'] ?? ''));
                $override = AuthEmailService::normalizeEmail($rawOverride);
                if ($rawOverride !== '' && !AuthEmailService::isValidEmail($override)) {
                    Http::json(400, [
                        'ok' => false,
                        'reason' => 'e-mail inválido',
                        'error' => 'E-mail de destino inválido. Informe um endereço completo (ex.: voce@dominio.com).',
                        'status' => $status,
                    ]);
                }

                $adminEmail = AuthEmailService::normalizeEmail($admin['email'] ?? '');
                $envAdminEmail = AuthEmailService::normalizeEmail(\App\Core\Env::get('ADMIN_EMAIL', 'vonluqi@gmail.com'));
                $recipient = AuthEmailService::isValidEmail($override)
                    ? $override
                    : (AuthEmailService::isValidEmail($adminEmail)
                        ? $adminEmail
                        : (AuthEmailService::isValidEmail($envAdminEmail) ? $envAdminEmail : ''));

                if ($recipient === '') {
                    Http::json(400, [
                        'ok' => false,
                        'reason' => 'sem destinatário',
                        'error' => 'Informe um e-mail de destino (to) ou vincule um e-mail na conta do Mestre.',
                        'status' => $status,
                    ]);
                }

                $nowIso = Database::nowIso();
                $subject = 'Mensageiro do Domínio — sonda do Mestre';
                $text = implode("\n", [
                    'Esta é uma sonda do canal de e-mail do Domínio.',
                    'Se você recebeu esta mensagem, o Mensageiro consegue partir.',
                    "Provedor preferido: {$status['primary']}.",
                    "Horário: {$nowIso}",
                ]);
                $html = "<p>Esta é uma <strong>sonda</strong> do canal de e-mail do Domínio.</p>\n"
                    . "<p>Se você recebeu esta mensagem, o Mensageiro consegue partir.</p>\n"
                    . "<p>Provedor preferido: <code>{$status['primary']}</code><br/>Horário: {$nowIso}</p>";

                $mailed = Mailer::sendMail([
                    'to' => $recipient,
                    'subject' => $subject,
                    'html' => $html,
                    'text' => $text,
                ]);

                $atPos = strrpos($recipient, '@');
                AdminAudit::record(
                    (int) $admin['id'],
                    AdminAudit::ACTIONS['probeMailer'],
                    (int) $admin['id'],
                    [
                        'toDomain' => $atPos !== false ? substr($recipient, $atPos + 1) : null,
                        'ok' => (bool) ($mailed['ok'] ?? false),
                        'provider' => $mailed['provider'] ?? null,
                        'reason' => $mailed['reason'] ?? null,
                    ]
                );

                Http::json(200, [
                    'ok' => true,
                    'mailSent' => (bool) ($mailed['ok'] ?? false),
                    'provider' => $mailed['provider'] ?? null,
                    'reason' => $mailed['reason'] ?? (!empty($mailed['skipped']) ? 'skipped' : null),
                    'status' => $status,
                    'to' => $recipient,
                ]);
            }

            case 'adminForceTempPassword': {
                $admin = SessionService::loadUserBySessionToken((string) ($body['token'] ?? ''));
                if (!$admin || ($admin['role'] ?? '') !== 'admin') {
                    Http::error(403, 'Esta senda é só do Mestre.');
                }

                $targetId = (int) ($body['targetUserId'] ?? 0);
                if ($targetId <= 0) {
                    Http::error(400, 'Informe targetUserId.');
                }

                $target = self::loadUserById($targetId);
                if (!$target) {
                    Http::error(404, 'Alma não encontrada.');
                }
                if (($target['role'] ?? '') === 'admin') {
                    Http::error(400, 'Não se edita o Mestre por este caminho.');
                }

                $tempPassword = AuthEmailService::generateRecoveryCodePlain();
                $upd = $pdo->prepare('UPDATE `users` SET `password_hash` = :ph, `password` = NULL WHERE `id` = :id');
                $upd->execute([
                    ':ph' => Password::hash($tempPassword),
                    ':id' => $targetId,
                ]);

                $del = $pdo->prepare('DELETE FROM `sessions` WHERE `user_id` = :uid');
                $del->execute([':uid' => $targetId]);

                AdminAudit::record(
                    (int) $admin['id'],
                    AdminAudit::ACTIONS['forceTempPassword'],
                    $targetId,
                    ['username' => $target['username']]
                );

                Http::json(200, [
                    'ok' => true,
                    'tempPassword' => $tempPassword,
                    'username' => $target['username'],
                ]);
            }

            case 'adminIssueSoulRecoveryCode': {
                $admin = SessionService::loadUserBySessionToken((string) ($body['token'] ?? ''));
                if (!$admin || ($admin['role'] ?? '') !== 'admin') {
                    Http::error(403, 'Esta senda é só do Mestre.');
                }

                $targetId = (int) ($body['targetUserId'] ?? 0);
                if ($targetId <= 0) {
                    Http::error(400, 'Informe targetUserId.');
                }

                $target = self::loadUserById($targetId);
                if (!$target) {
                    Http::error(404, 'Alma não encontrada.');
                }
                if (($target['role'] ?? '') === 'admin') {
                    Http::error(400, 'Não se edita o Mestre por este caminho.');
                }

                $issued = AuthEmailService::issueSoulRecoveryCode(
                    $targetId,
                    (int) $admin['id'],
                    (string) $target['username']
                );
                if (!$issued['ok']) {
                    Http::error(500, (string) ($issued['error'] ?? 'Falha ao emitir código.'));
                }

                AdminAudit::record(
                    (int) $admin['id'],
                    AdminAudit::ACTIONS['issueSoulRecoveryCode'],
                    $targetId,
                    ['username' => $target['username'], 'expiresAt' => $issued['expiresAt']]
                );

                Http::json(200, [
                    'ok' => true,
                    'code' => $issued['code'],
                    'expiresAt' => $issued['expiresAt'],
                    'username' => $issued['username'],
                ]);
            }

            case 'consumeSoulRecoveryCode': {
                $username = mb_strtolower(trim((string) ($body['username'] ?? '')));
                $code = $body['code'] ?? '';
                $password = (string) ($body['password'] ?? '');

                if ($username === '' || empty($code) || strlen($password) < 4) {
                    Http::error(400, AuthEmailService::SOUL_RECOVERY_GENERIC_ERROR);
                }

                $stmt = $pdo->prepare('SELECT `id`, `role`, `username` FROM `users` WHERE LOWER(`username`) = :u LIMIT 1');
                $stmt->execute([':u' => $username]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$user && mb_strlen($username) >= 3) {
                    $byName = $pdo->prepare(
                        'SELECT `id`, `role`, `username` FROM `users`
                         WHERE LOWER(`full_name`) = :fn AND `role` = \'student\' LIMIT 2'
                    );
                    $byName->execute([':fn' => $username]);
                    $rows = $byName->fetchAll(PDO::FETCH_ASSOC);
                    if (count($rows) === 1) {
                        $user = $rows[0];
                    }
                }

                if (!$user || ($user['role'] ?? '') !== 'student') {
                    Http::error(400, AuthEmailService::SOUL_RECOVERY_GENERIC_ERROR);
                }

                $found = AuthEmailService::findActiveSoulRecovery((int) $user['id'], $code);
                if (!$found['ok'] || empty($found['row']['id'])) {
                    Http::error(400, AuthEmailService::SOUL_RECOVERY_GENERIC_ERROR);
                }

                $upd = $pdo->prepare('UPDATE `users` SET `password_hash` = :ph, `password` = NULL WHERE `id` = :id');
                $upd->execute([
                    ':ph' => Password::hash($password),
                    ':id' => $user['id'],
                ]);

                $del = $pdo->prepare('DELETE FROM `sessions` WHERE `user_id` = :uid');
                $del->execute([':uid' => $user['id']]);

                AuthEmailService::markSoulRecoveryUsed((int) $found['row']['id']);

                AdminAudit::record(
                    (int) $user['id'],
                    AdminAudit::ACTIONS['consumeSoulRecoveryCode'],
                    (int) $user['id'],
                    ['username' => $user['username']]
                );

                Http::json(200, ['ok' => true]);
            }

            case 'confirmPasswordReset': {
                $password = (string) ($body['password'] ?? '');
                if (strlen($password) < 4) {
                    Http::error(400, 'Senha muito curta.');
                }

                $row = AuthEmailService::findValidEmailToken($body['token'] ?? '', [
                    AuthEmailService::PURPOSE_RESET,
                    AuthEmailService::PURPOSE_LEGACY,
                ]);
                if (!$row) {
                    Http::error(400, 'Este selo expirou ou já foi usado. Chame o Mensageiro de novo.');
                }

                $isLegacy = ($row['purpose'] ?? '') === AuthEmailService::PURPOSE_LEGACY;
                $owner = self::loadUserById((int) $row['user_id']);
                $emailMatches = $owner
                    && AuthEmailService::normalizeEmail($owner['email'] ?? '') === AuthEmailService::normalizeEmail($row['email'] ?? '');
                $eligible = $owner
                    && ($owner['role'] ?? '') === 'student'
                    && $emailMatches
                    && ($isLegacy ? true : !empty($owner['email_verified_at']));

                if (!$eligible) {
                    AuthEmailService::markTokenUsed((int) $row['id']);
                    Http::error(400, 'Este selo expirou ou já foi usado. Chame o Mensageiro de novo.');
                }

                $newHash = Password::hash($password);
                if ($isLegacy) {
                    $upd = $pdo->prepare(
                        'UPDATE `users`
                         SET `password_hash` = :ph, `password` = NULL, `email_verified_at` = :now
                         WHERE `id` = :id'
                    );
                    $upd->execute([
                        ':ph' => $newHash,
                        ':now' => Database::nowSql(),
                        ':id' => $owner['id'],
                    ]);
                } else {
                    $upd = $pdo->prepare(
                        'UPDATE `users` SET `password_hash` = :ph, `password` = NULL WHERE `id` = :id'
                    );
                    $upd->execute([
                        ':ph' => $newHash,
                        ':id' => $owner['id'],
                    ]);
                }

                $del = $pdo->prepare('DELETE FROM `sessions` WHERE `user_id` = :uid');
                $del->execute([':uid' => $owner['id']]);

                AuthEmailService::markTokenUsed((int) $row['id']);
                AuthEmailService::invalidateOpenTokens((int) $owner['id'], AuthEmailService::PURPOSE_RESET);
                AuthEmailService::invalidateOpenTokens((int) $owner['id'], AuthEmailService::PURPOSE_LEGACY);
                if ($isLegacy) {
                    AuthEmailService::invalidateOpenTokens((int) $owner['id'], AuthEmailService::PURPOSE_VERIFY);
                }

                Http::json(200, ['ok' => true]);
            }

            default:
                Http::error(400, 'Ação desconhecida.');
        }
    }
}
