<?php
declare(strict_types=1);

namespace App\Core;

use Throwable;

/**
 * Canal de envio de e-mail para ritos da conta (verificação, redefinição e vínculo).
 * Espelho exato de `api/_lib/mailer.js` (`getMailerStatus`, `sendMail`).
 * Suporta:
 * 1) Resend HTTP API (`RESEND_API_KEY` + cURL) com fallback para SMTP se configurado
 * 2) SMTP autenticado via sockets TLS/SSL (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`)
 */
final class Mailer
{
    public const DEFAULT_RESEND_FROM = 'Fundamentos de Jogos Digitais <onboarding@resend.dev>';

    private static function displayFrom(string $address): string
    {
        $val = trim($address);
        if ($val === '') {
            return self::DEFAULT_RESEND_FROM;
        }
        if (str_contains($val, '<')) {
            return $val;
        }
        return "Fundamentos de Jogos Digitais <{$val}>";
    }

    /**
     * @return array{host: string, port: int, user: string, pass: string, secure: bool}|null
     */
    private static function smtpConfig(): ?array
    {
        $host = trim((string) Env::get('SMTP_HOST', ''));
        $user = trim((string) Env::get('SMTP_USER', ''));
        $pass = preg_replace('/\s+/', '', (string) (Env::get('SMTP_PASS') ?: Env::get('SMTP_PASSWORD') ?: '')) ?? '';
        if ($host === '' || $user === '' || $pass === '') {
            return null;
        }
        $port = Env::int('SMTP_PORT', 465) ?: 465;
        $secureFlag = strtolower(trim((string) Env::get('SMTP_SECURE', '')));
        $secure = $secureFlag === 'true' || ($secureFlag !== 'false' && $port === 465);

        return [
            'host' => $host,
            'port' => $port,
            'user' => $user,
            'pass' => $pass,
            'secure' => $secure,
        ];
    }

    public static function mailFrom(): string
    {
        $raw = trim((string) Env::get('MAIL_FROM', ''));
        if ($raw !== '') {
            return self::displayFrom($raw);
        }
        $smtp = self::smtpConfig();
        if ($smtp !== null) {
            return self::displayFrom($smtp['user']);
        }
        return self::DEFAULT_RESEND_FROM;
    }

    public static function resendFrom(): string
    {
        $dedicated = trim((string) Env::get('RESEND_MAIL_FROM', ''));
        if ($dedicated !== '') {
            return self::displayFrom($dedicated);
        }
        $from = self::mailFrom();
        if (preg_match('/@gmail\.com>?$/i', $from)) {
            return self::DEFAULT_RESEND_FROM;
        }
        return $from;
    }

    /**
     * Espelho exato de `getMailerStatus()` em `api/_lib/mailer.js`.
     * @return array<string, mixed>
     */
    public static function getStatus(): array
    {
        $hasResend = trim((string) Env::get('RESEND_API_KEY', '')) !== '';
        $hasSmtp = self::smtpConfig() !== null;
        $hasNative = function_exists('mail') && strtolower(trim((string) Env::get('MAIL_TRANSPORT', 'native'))) === 'native';
        $appBaseUrlSet = trim((string) Env::get('APP_BASE_URL', '')) !== '';
        $fromPreview = self::mailFrom();
        $resendFromPreview = self::resendFrom();
        $usingTestingFrom = (bool) preg_match('/(?:@resend\.dev>?$|onboarding@resend\.dev)/i', $resendFromPreview);

        $primary = 'none';
        if ($hasNative) {
            $primary = 'native';
        } elseif ($hasResend) {
            $primary = 'resend';
        } elseif ($hasSmtp) {
            $primary = 'smtp';
        }

        $hint = null;
        if (!$hasNative && !$hasResend && !$hasSmtp) {
            $hint = 'Nenhum provedor: defina MAIL_TRANSPORT=native, RESEND_API_KEY ou SMTP_HOST + SMTP_USER + SMTP_PASS.';
        } elseif (!$appBaseUrlSet) {
            $hint = 'APP_BASE_URL ausente — links de selo/reset podem usar o host HTTP atual.';
        }

        return [
            'ready' => $hasNative || $hasResend || $hasSmtp,
            'hasNative' => $hasNative,
            'hasResend' => $hasResend,
            'hasSmtp' => $hasSmtp,
            'appBaseUrlSet' => $appBaseUrlSet,
            'fromPreview' => $fromPreview,
            'resendFromPreview' => $resendFromPreview,
            'usingTestingFrom' => $usingTestingFrom,
            'primary' => $primary,
            'hint' => $hint,
        ];
    }

    /**
     * Espelho de `sendMail({ to, subject, html, text })` em `api/_lib/mailer.js`.
     * @param array{to: string, subject: string, html?: string, text?: string} $msg
     * @return array{ok: bool, id?: ?string, provider?: string, reason?: string, skipped?: bool}
     */
    public static function sendMail(array $msg): array
    {
        $recipient = trim((string) ($msg['to'] ?? ''));
        $subject = trim((string) ($msg['subject'] ?? ''));
        $html = (string) ($msg['html'] ?? '');
        $text = (string) ($msg['text'] ?? '');

        if ($recipient === '') {
            return ['ok' => false, 'skipped' => true, 'reason' => 'empty_to'];
        }

        $status = self::getStatus();

        // 1) Envio nativo via servidor de e-mail local do cPanel (Exim / noreply@vonluqi.com com DKIM/SPF)
        if (!empty($status['hasNative'])) {
            $nativeRes = self::sendViaNativeMail($recipient, $subject, $html, $text);
            if ($nativeRes['ok']) {
                return $nativeRes;
            }
        }

        // 2) Resend API (se configurado)
        if ($status['hasResend']) {
            $res = self::sendViaResend($recipient, $subject, $html, $text);
            if ($res['ok']) {
                return $res;
            }
            if ($status['hasSmtp']) {
                return self::sendViaSmtp($recipient, $subject, $html, $text);
            }
            return $res;
        }

        // 3) Fallback SMTP autenticado
        if ($status['hasSmtp']) {
            return self::sendViaSmtp($recipient, $subject, $html, $text);
        }

        error_log("[mailer] Nenhum provedor configurado; e-mail para {$recipient} ({$subject}) não enviado.");
        return ['ok' => false, 'skipped' => true, 'reason' => 'no_provider'];
    }

    /**
     * Envia pelo MTA local do cPanel/HostGator (Exim) usando a conta local (ex.: noreply@vonluqi.com).
     * @return array{ok: bool, id?: ?string, provider?: string, reason?: string}
     */
    private static function sendViaNativeMail(string $recipient, string $subject, string $html, string $text): array
    {
        if (!function_exists('mail')) {
            return ['ok' => false, 'reason' => 'mail_disabled'];
        }

        $fromHeader = self::mailFrom();
        $envelopeFrom = 'noreply@vonluqi.com';
        if (preg_match('/<([^>]+)>/', $fromHeader, $m)) {
            $envelopeFrom = trim($m[1]);
        } elseif (filter_var($fromHeader, FILTER_VALIDATE_EMAIL)) {
            $envelopeFrom = $fromHeader;
        }

        $boundary = '=_fjd_' . bin2hex(random_bytes(12));
        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        $domain = substr(strrchr($envelopeFrom, '@') ?: '@vonluqi.com', 1) ?: 'vonluqi.com';
        $msgId = '<' . bin2hex(random_bytes(12)) . '@' . $domain . '>';

        $plainBody = $text !== '' ? $text : strip_tags($html);
        $htmlBody = $html !== '' ? $html : nl2br(htmlspecialchars($plainBody, ENT_QUOTES, 'UTF-8'));

        $headers = [
            "From: {$fromHeader}",
            "Reply-To: {$envelopeFrom}",
            "Return-Path: <{$envelopeFrom}>",
            "Message-ID: {$msgId}",
            'MIME-Version: 1.0',
            "Content-Type: multipart/alternative; boundary=\"{$boundary}\"",
        ];

        $body = "--{$boundary}\r\n"
            . "Content-Type: text/plain; charset=UTF-8\r\n"
            . "Content-Transfer-Encoding: base64\r\n\r\n"
            . chunk_split(base64_encode($plainBody)) . "\r\n"
            . "--{$boundary}\r\n"
            . "Content-Type: text/html; charset=UTF-8\r\n"
            . "Content-Transfer-Encoding: base64\r\n\r\n"
            . chunk_split(base64_encode($htmlBody)) . "\r\n"
            . "--{$boundary}--";

        $sent = @mail($recipient, $encodedSubject, $body, implode("\r\n", $headers), "-f{$envelopeFrom}");
        if (!$sent) {
            return ['ok' => false, 'reason' => 'native_mail_failed'];
        }

        return [
            'ok' => true,
            'id' => $msgId,
            'provider' => 'cpanel-native',
        ];
    }

    /**
     * @return array{ok: bool, id?: ?string, provider?: string, reason?: string}
     */
    private static function sendViaResend(string $recipient, string $subject, string $html, string $text): array
    {
        $apiKey = trim((string) Env::get('RESEND_API_KEY', ''));
        if ($apiKey === '' || !function_exists('curl_init')) {
            return ['ok' => false, 'reason' => 'no_resend_key'];
        }

        $payload = json_encode([
            'from' => self::resendFrom(),
            'to' => [$recipient],
            'subject' => $subject,
            'html' => $html,
            'text' => $text,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $ch = curl_init('https://api.resend.com/emails');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => [
                "Authorization: Bearer {$apiKey}",
                'Content-Type: application/json',
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 12,
        ]);
        $rawResp = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($rawResp === false) {
            return ['ok' => false, 'reason' => 'resend_exception'];
        }
        $data = json_decode((string) $rawResp, true) ?: [];
        if ($httpCode < 200 || $httpCode >= 300) {
            $errMsg = (string) ($data['message'] ?? $data['name'] ?? '');
            $testing = (bool) preg_match('/only send testing emails|verify a domain|domain is not verified|onboarding\.dev/i', $errMsg);
            return ['ok' => false, 'reason' => $testing ? 'resend_testing_domain' : 'resend_rejected'];
        }
        return [
            'ok' => true,
            'id' => isset($data['id']) ? (string) $data['id'] : null,
            'provider' => 'resend',
        ];
    }

    /**
     * @return array{ok: bool, id?: ?string, provider?: string, reason?: string}
     */
    private static function sendViaSmtp(string $recipient, string $subject, string $html, string $text): array
    {
        $smtp = self::smtpConfig();
        if ($smtp === null) {
            return ['ok' => false, 'reason' => 'no_smtp'];
        }

        $fromHeader = self::displayFrom($smtp['user']);
        $envelopeFrom = $smtp['user'];
        if (preg_match('/<([^>]+)>/', $fromHeader, $m)) {
            $envelopeFrom = trim($m[1]);
        }

        try {
            $remote = ($smtp['secure'] ? 'ssl://' : 'tcp://') . $smtp['host'] . ':' . $smtp['port'];
            $ctx = stream_context_create([
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                    'allow_self_signed' => true,
                ],
            ]);
            $fp = @stream_socket_client($remote, $errno, $errstr, 10, STREAM_CLIENT_CONNECT, $ctx);
            if (!is_resource($fp)) {
                error_log("[mailer] SMTP connect error ({$errno}): {$errstr}");
                return ['ok' => false, 'reason' => 'smtp_exception'];
            }
            stream_set_timeout($fp, 10);

            self::smtpExpect($fp, [220]);
            $ehloHost = $_SERVER['HTTP_HOST'] ?? 'localhost';
            self::smtpSend($fp, "EHLO {$ehloHost}", [250]);

            if (!$smtp['secure'] && $smtp['port'] === 587) {
                self::smtpSend($fp, 'STARTTLS', [220]);
                if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                    fclose($fp);
                    return ['ok' => false, 'reason' => 'smtp_exception'];
                }
                self::smtpSend($fp, "EHLO {$ehloHost}", [250]);
            }

            self::smtpSend($fp, 'AUTH LOGIN', [334]);
            self::smtpSend($fp, base64_encode($smtp['user']), [334]);
            self::smtpSend($fp, base64_encode($smtp['pass']), [235]);

            self::smtpSend($fp, "MAIL FROM:<{$envelopeFrom}>", [250]);
            self::smtpSend($fp, "RCPT TO:<{$recipient}>", [250, 251]);
            self::smtpSend($fp, 'DATA', [354]);

            $boundary = '=_fjd_' . bin2hex(random_bytes(12));
            $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
            $msgId = '<' . bin2hex(random_bytes(12)) . '@' . $smtp['host'] . '>';

            $plainBody = $text !== '' ? $text : strip_tags($html);
            $htmlBody = $html !== '' ? $html : nl2br(htmlspecialchars($plainBody, ENT_QUOTES, 'UTF-8'));

            $headers = [
                'Date: ' . gmdate('r'),
                "From: {$fromHeader}",
                "To: <{$recipient}>",
                "Subject: {$encodedSubject}",
                "Message-ID: {$msgId}",
                'MIME-Version: 1.0',
                "Content-Type: multipart/alternative; boundary=\"{$boundary}\"",
            ];

            $mime = implode("\r\n", $headers) . "\r\n\r\n"
                . "--{$boundary}\r\n"
                . "Content-Type: text/plain; charset=UTF-8\r\n"
                . "Content-Transfer-Encoding: base64\r\n\r\n"
                . chunk_split(base64_encode($plainBody)) . "\r\n"
                . "--{$boundary}\r\n"
                . "Content-Type: text/html; charset=UTF-8\r\n"
                . "Content-Transfer-Encoding: base64\r\n\r\n"
                . chunk_split(base64_encode($htmlBody)) . "\r\n"
                . "--{$boundary}--\r\n.";

            self::smtpSend($fp, $mime, [250]);
            @fwrite($fp, "QUIT\r\n");
            @fclose($fp);

            return ['ok' => true, 'id' => $msgId, 'provider' => 'smtp'];
        } catch (Throwable $e) {
            error_log('[mailer] SMTP exception: ' . $e->getMessage());
            return ['ok' => false, 'reason' => 'smtp_exception'];
        }
    }

    /**
     * @param resource $fp
     * @param array<int, int> $expectedCodes
     */
    private static function smtpSend($fp, string $command, array $expectedCodes): string
    {
        fwrite($fp, $command . "\r\n");
        return self::smtpExpect($fp, $expectedCodes);
    }

    /**
     * @param resource $fp
     * @param array<int, int> $expectedCodes
     */
    private static function smtpExpect($fp, array $expectedCodes): string
    {
        $response = '';
        while (($line = fgets($fp, 515)) !== false) {
            $response .= $line;
            if (strlen($line) >= 4 && $line[3] === ' ') {
                break;
            }
        }
        $code = (int) substr($response, 0, 3);
        if (!in_array($code, $expectedCodes, true)) {
            throw new \RuntimeException('Erro SMTP: ' . trim($response));
        }
        return $response;
    }
}
