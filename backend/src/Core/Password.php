<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Hash e verificação de senhas compatível com:
 * 1. Hashes `scrypt` gerados pelo Node.js (`${saltHex}:${derivedHex}`, RFC 7914 N=16384, r=8, p=1, dkLen=64)
 * 2. Hashes `bcrypt` (`$2a$`, `$2b$`, `$2y$`) nativos do PHP e do legado do Supabase
 * 3. Hashes SHA-256 hex para códigos temporários de uso único (`SoulRecoveryCode`, `AuthEmailToken`)
 */
final class Password
{
    private const SCRYPT_KEYLEN = 64;

    /**
     * Gera um hash seguro para novas senhas (bcrypt custo 10, compatível com PHP e Node.js).
     */
    public static function hash(string $password): string
    {
        return password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
    }

    /**
     * Verifica uma senha contra o `password_hash` armazenado no banco (`scrypt` do Node ou `bcrypt`).
     */
    public static function verify(string $password, ?string $stored): bool
    {
        if ($stored === null || $stored === '') {
            return false;
        }
        $raw = trim($stored);

        // 1. Formato bcrypt ($2a$, $2b$, $2y$)
        if (preg_match('/^\$2[aby]\$/', $raw)) {
            return password_verify($password, $raw);
        }

        // 2. Formato Node.js crypto.scrypt: "${salt}:${derivedHex}"
        $parts = explode(':', $raw);
        if (count($parts) !== 2) {
            return false;
        }
        [$salt, $expectedHex] = $parts;
        if ($salt === '' || strlen($expectedHex) !== self::SCRYPT_KEYLEN * 2 || !ctype_xdigit($expectedHex)) {
            return false;
        }

        $actualHex = self::scryptNodeHex($password, $salt, self::SCRYPT_KEYLEN);
        return hash_equals(strtolower($expectedHex), strtolower($actualHex));
    }

    /**
     * Indica se o hash armazenado deve ser atualizado para bcrypt nativo após login com sucesso.
     */
    public static function needsRehash(?string $stored): bool
    {
        if ($stored === null || $stored === '') {
            return true;
        }
        if (!preg_match('/^\$2[aby]\$/', trim($stored))) {
            return true;
        }
        return password_needs_rehash(trim($stored), PASSWORD_BCRYPT, ['cost' => 10]);
    }

    /**
     * Implementação RFC 7914 idêntica a `crypto.scrypt(password, salt, 64)` do Node.js
     * (N = 16384, r = 8, p = 1, keylen = 64).
     */
    public static function scryptNodeHex(string $password, string $salt, int $dkLen = 64): string
    {
        if (function_exists('scrypt')) {
            /** @phpstan-ignore-next-line */
            return (string) scrypt($password, $salt, 16384, 8, 1, $dkLen);
        }

        $b = hash_pbkdf2('sha256', $password, $salt, 1, 1024, true);
        /** @var array<int, int> $unpacked */
        $unpacked = unpack('V256', $b);
        $x = array_values($unpacked);

        $n = 16384;
        $v = [];

        for ($i = 0; $i < $n; $i++) {
            $v[$i] = $x;
            $x = self::scryptBlockMix8($x);
        }

        for ($i = 0; $i < $n; $i++) {
            $j = $x[240] & 16383;
            $vj = $v[$j];
            for ($k = 0; $k < 256; $k++) {
                $x[$k] ^= $vj[$k];
            }
            $x = self::scryptBlockMix8($x);
        }

        $bPrime = pack('V*', ...$x);
        $dk = hash_pbkdf2('sha256', $password, $bPrime, 1, $dkLen, true);
        return bin2hex($dk);
    }

    /**
     * BlockMix para r = 8 (2*r = 16 blocos de 16 palavras uint32 = 256 palavras).
     * @param array<int, int> $b
     * @return array<int, int>
     */
    private static function scryptBlockMix8(array $b): array
    {
        $x = array_slice($b, 240, 16);
        $yEven = [];
        $yOdd = [];

        for ($i = 0; $i < 16; $i++) {
            $offset = $i * 16;
            for ($k = 0; $k < 16; $k++) {
                $x[$k] = ($x[$k] ^ $b[$offset + $k]) & 0xffffffff;
            }
            $x = self::salsa20_8($x);
            if (($i & 1) === 0) {
                foreach ($x as $w) {
                    $yEven[] = $w;
                }
            } else {
                foreach ($x as $w) {
                    $yOdd[] = $w;
                }
            }
        }

        return array_merge($yEven, $yOdd);
    }

    /**
     * Core Salsa20/8 em 16 palavras uint32.
     * @param array<int, int> $b
     * @return array<int, int>
     */
    private static function salsa20_8(array $b): array
    {
        [
            $x0, $x1, $x2, $x3,
            $x4, $x5, $x6, $x7,
            $x8, $x9, $x10, $x11,
            $x12, $x13, $x14, $x15
        ] = $b;

        for ($round = 0; $round < 4; $round++) {
            $u = ($x0 + $x12) & 0xffffffff;
            $x4 ^= (($u << 7) | ($u >> 25)) & 0xffffffff;
            $u = ($x4 + $x0) & 0xffffffff;
            $x8 ^= (($u << 9) | ($u >> 23)) & 0xffffffff;
            $u = ($x8 + $x4) & 0xffffffff;
            $x12 ^= (($u << 13) | ($u >> 19)) & 0xffffffff;
            $u = ($x12 + $x8) & 0xffffffff;
            $x0 ^= (($u << 18) | ($u >> 14)) & 0xffffffff;

            $u = ($x5 + $x1) & 0xffffffff;
            $x9 ^= (($u << 7) | ($u >> 25)) & 0xffffffff;
            $u = ($x9 + $x5) & 0xffffffff;
            $x13 ^= (($u << 9) | ($u >> 23)) & 0xffffffff;
            $u = ($x13 + $x9) & 0xffffffff;
            $x1 ^= (($u << 13) | ($u >> 19)) & 0xffffffff;
            $u = ($x1 + $x13) & 0xffffffff;
            $x5 ^= (($u << 18) | ($u >> 14)) & 0xffffffff;

            $u = ($x10 + $x6) & 0xffffffff;
            $x14 ^= (($u << 7) | ($u >> 25)) & 0xffffffff;
            $u = ($x14 + $x10) & 0xffffffff;
            $x2 ^= (($u << 9) | ($u >> 23)) & 0xffffffff;
            $u = ($x2 + $x14) & 0xffffffff;
            $x6 ^= (($u << 13) | ($u >> 19)) & 0xffffffff;
            $u = ($x6 + $x2) & 0xffffffff;
            $x10 ^= (($u << 18) | ($u >> 14)) & 0xffffffff;

            $u = ($x15 + $x11) & 0xffffffff;
            $x3 ^= (($u << 7) | ($u >> 25)) & 0xffffffff;
            $u = ($x3 + $x15) & 0xffffffff;
            $x7 ^= (($u << 9) | ($u >> 23)) & 0xffffffff;
            $u = ($x7 + $x3) & 0xffffffff;
            $x11 ^= (($u << 13) | ($u >> 19)) & 0xffffffff;
            $u = ($x11 + $x7) & 0xffffffff;
            $x15 ^= (($u << 18) | ($u >> 14)) & 0xffffffff;

            $u = ($x0 + $x3) & 0xffffffff;
            $x1 ^= (($u << 7) | ($u >> 25)) & 0xffffffff;
            $u = ($x1 + $x0) & 0xffffffff;
            $x2 ^= (($u << 9) | ($u >> 23)) & 0xffffffff;
            $u = ($x2 + $x1) & 0xffffffff;
            $x3 ^= (($u << 13) | ($u >> 19)) & 0xffffffff;
            $u = ($x3 + $x2) & 0xffffffff;
            $x0 ^= (($u << 18) | ($u >> 14)) & 0xffffffff;

            $u = ($x5 + $x4) & 0xffffffff;
            $x6 ^= (($u << 7) | ($u >> 25)) & 0xffffffff;
            $u = ($x6 + $x5) & 0xffffffff;
            $x7 ^= (($u << 9) | ($u >> 23)) & 0xffffffff;
            $u = ($x7 + $x6) & 0xffffffff;
            $x4 ^= (($u << 13) | ($u >> 19)) & 0xffffffff;
            $u = ($x4 + $x7) & 0xffffffff;
            $x5 ^= (($u << 18) | ($u >> 14)) & 0xffffffff;

            $u = ($x10 + $x9) & 0xffffffff;
            $x11 ^= (($u << 7) | ($u >> 25)) & 0xffffffff;
            $u = ($x11 + $x10) & 0xffffffff;
            $x8 ^= (($u << 9) | ($u >> 23)) & 0xffffffff;
            $u = ($x8 + $x11) & 0xffffffff;
            $x9 ^= (($u << 13) | ($u >> 19)) & 0xffffffff;
            $u = ($x9 + $x8) & 0xffffffff;
            $x10 ^= (($u << 18) | ($u >> 14)) & 0xffffffff;

            $u = ($x15 + $x14) & 0xffffffff;
            $x12 ^= (($u << 7) | ($u >> 25)) & 0xffffffff;
            $u = ($x12 + $x15) & 0xffffffff;
            $x13 ^= (($u << 9) | ($u >> 23)) & 0xffffffff;
            $u = ($x13 + $x12) & 0xffffffff;
            $x14 ^= (($u << 13) | ($u >> 19)) & 0xffffffff;
            $u = ($x14 + $x13) & 0xffffffff;
            $x15 ^= (($u << 18) | ($u >> 14)) & 0xffffffff;
        }

        return [
            ($b[0] + $x0) & 0xffffffff,
            ($b[1] + $x1) & 0xffffffff,
            ($b[2] + $x2) & 0xffffffff,
            ($b[3] + $x3) & 0xffffffff,
            ($b[4] + $x4) & 0xffffffff,
            ($b[5] + $x5) & 0xffffffff,
            ($b[6] + $x6) & 0xffffffff,
            ($b[7] + $x7) & 0xffffffff,
            ($b[8] + $x8) & 0xffffffff,
            ($b[9] + $x9) & 0xffffffff,
            ($b[10] + $x10) & 0xffffffff,
            ($b[11] + $x11) & 0xffffffff,
            ($b[12] + $x12) & 0xffffffff,
            ($b[13] + $x13) & 0xffffffff,
            ($b[14] + $x14) & 0xffffffff,
            ($b[15] + $x15) & 0xffffffff,
        ];
    }
}
