<?php
declare(strict_types=1);

namespace App\Services\Despertar;

/**
 * Aritmética decimal de precisão arbitrária de O Despertar (`js/hades-despertar/core/decimal.js`).
 * Escala interna de 8 casas decimais; dinheiro arredondado para 2 casas (`DECIMAL(38,2)`).
 * Usa `bcmath` nativo do PHP 8 (padrão na HostGator) com fallback em PHP puro caso necessário.
 */
final class DespertarDecimal
{
    public const MONEY_DECIMALS = 2;
    public const INTERNAL_DECIMALS = 8;

    private const SCALE_STR = '100000000'; // 10^8
    private const HALF_SCALE_STR = '50000000';
    private const COST_NUM = '23'; // 1.15 = 23/20
    private const COST_DEN = '20';

    public static function decimalString(mixed $value, string $fallback = '0.00'): string
    {
        if ($value === null || $value === '') {
            return $fallback;
        }
        $raw = trim((string) $value);
        if (!preg_match('/^(-?\d+)(?:\.(\d+))?$/', $raw, $m)) {
            return $fallback;
        }
        $frac = substr(str_pad($m[2] ?? '', 2, '0', STR_PAD_RIGHT), 0, 2);
        return $m[1] . '.' . $frac;
    }

    /**
     * Converte valor decimal para inteiro escalado por 10^8 (como string inteira).
     */
    public static function toScaled(mixed $value): string
    {
        if (is_int($value)) {
            return self::intMul((string) $value, self::SCALE_STR);
        }
        if (is_float($value)) {
            if (!is_finite($value)) {
                throw new \InvalidArgumentException('Decimal inválido: ' . (string) $value);
            }
            $value = number_format($value, 8, '.', '');
        }
        $raw = trim((string) $value);
        if (!preg_match('/^(-?)(\d+)(?:\.(\d+))?$/', $raw, $m)) {
            throw new \InvalidArgumentException('Decimal inválido: ' . $raw);
        }
        $neg = $m[1] === '-';
        $whole = ltrim($m[2], '0');
        if ($whole === '') {
            $whole = '0';
        }
        $fracRaw = $m[3] ?? '';
        $frac = str_pad(substr($fracRaw, 0, self::INTERNAL_DECIMALS), self::INTERNAL_DECIMALS, '0', STR_PAD_RIGHT);
        $extra = substr($fracRaw, self::INTERNAL_DECIMALS);

        $n = self::intAdd(self::intMul($whole, self::SCALE_STR), ltrim($frac, '0') ?: '0');
        if ($extra !== '' && $extra[0] >= '5') {
            $n = self::intAdd($n, '1');
        }
        if ($n === '0') {
            return '0';
        }
        return $neg ? '-' . $n : $n;
    }

    public static function formatScaled(string $scaled, int $decimals): string
    {
        $neg = str_starts_with($scaled, '-');
        $mag = $neg ? substr($scaled, 1) : $scaled;
        if ($mag === '' || $mag === '0') {
            $mag = '0';
            $neg = false;
        }

        $drop = self::INTERNAL_DECIMALS - $decimals;
        if ($drop > 0) {
            $factor = '1' . str_repeat('0', $drop);
            $half = self::intDiv($factor, '2');
            $mag = self::intDiv(self::intAdd($mag, $half), $factor);
        } elseif ($drop < 0) {
            $factor = '1' . str_repeat('0', -$drop);
            $mag = self::intMul($mag, $factor);
        }

        $sign = ($neg && $mag !== '0') ? '-' : '';
        if ($decimals === 0) {
            return $sign . $mag;
        }

        $decPow = '1' . str_repeat('0', $decimals);
        $intPart = self::intDiv($mag, $decPow);
        $fracPart = self::intMod($mag, $decPow);
        return $sign . $intPart . '.' . str_pad($fracPart, $decimals, '0', STR_PAD_LEFT);
    }

    public static function normalize(mixed $value): string
    {
        $scaled = self::toScaled($value);
        $neg = str_starts_with($scaled, '-');
        $mag = $neg ? substr($scaled, 1) : $scaled;
        if ($mag === '0' || $mag === '') {
            return '0';
        }
        $whole = self::intDiv($mag, self::SCALE_STR);
        $rem = self::intMod($mag, self::SCALE_STR);
        $frac = rtrim(str_pad($rem, self::INTERNAL_DECIMALS, '0', STR_PAD_LEFT), '0');
        $sign = $neg ? '-' : '';
        if ($frac === '') {
            return $sign . $whole;
        }
        return $sign . $whole . '.' . $frac;
    }

    public static function money(mixed $value): string
    {
        return self::formatScaled(self::toScaled($value), self::MONEY_DECIMALS);
    }

    public static function add(mixed $a, mixed $b): string
    {
        $sum = self::intAdd(self::toScaled($a), self::toScaled($b));
        return self::normalize(self::formatScaled($sum, self::INTERNAL_DECIMALS));
    }

    public static function sub(mixed $a, mixed $b): string
    {
        $diff = self::intSub(self::toScaled($a), self::toScaled($b));
        return self::normalize(self::formatScaled($diff, self::INTERNAL_DECIMALS));
    }

    public static function mul(mixed $a, mixed $b): string
    {
        $sa = self::toScaled($a);
        $sb = self::toScaled($b);
        $prod = self::intMul($sa, $sb);
        $neg = str_starts_with($prod, '-');
        $mag = $neg ? substr($prod, 1) : $prod;
        $rounded = self::intDiv(self::intAdd($mag, self::HALF_SCALE_STR), self::SCALE_STR);
        $signed = ($neg && $rounded !== '0') ? '-' . $rounded : $rounded;
        return self::normalize(self::formatScaled($signed, self::INTERNAL_DECIMALS));
    }

    public static function div(mixed $a, mixed $b): string
    {
        $den = self::toScaled($b);
        if ($den === '0') {
            throw new \DivisionByZeroError('Divisão por zero.');
        }
        $num = self::toScaled($a);
        $negNum = str_starts_with($num, '-');
        $negDen = str_starts_with($den, '-');
        $sameSign = $negNum === $negDen;

        $absNum = $negNum ? substr($num, 1) : $num;
        $absDen = $negDen ? substr($den, 1) : $den;
        $halfDen = self::intDiv($absDen, '2');
        $numer = self::intAdd(self::intMul($absNum, self::SCALE_STR), $halfDen);
        $quot = self::intDiv($numer, $absDen);
        $signed = (!$sameSign && $quot !== '0') ? '-' . $quot : $quot;
        return self::normalize(self::formatScaled($signed, self::INTERNAL_DECIMALS));
    }

    public static function cmp(mixed $a, mixed $b): int
    {
        return self::intCmp(self::toScaled($a), self::toScaled($b));
    }

    public static function isZero(mixed $value): bool
    {
        return self::toScaled($value) === '0';
    }

    public static function toBigIntFloor(mixed $value): string
    {
        $scaled = self::toScaled($value);
        if (str_starts_with($scaled, '-')) {
            $mag = substr($scaled, 1);
            $adj = self::intAdd($mag, self::intSub(self::SCALE_STR, '1'));
            $q = self::intDiv($adj, self::SCALE_STR);
            return $q === '0' ? '0' : '-' . $q;
        }
        return self::intDiv($scaled, self::SCALE_STR);
    }

    /**
     * BaseCost * (23/20)^owned * costMult
     */
    public static function mulPow115(mixed $baseCost, int $owned, mixed $costMult = '1'): string
    {
        $n = max(0, $owned);
        $base = self::toScaled($baseCost);
        $disc = self::toScaled($costMult);
        $num = self::intPow(self::COST_NUM, $n);
        $den = self::intPow(self::COST_DEN, $n);

        $raw = self::intMul(self::intMul($base, $num), $disc);
        $denom = self::intMul($den, self::SCALE_STR);
        $half = self::intDiv($denom, '2');
        $rounded = self::intDiv(self::intAdd($raw, $half), $denom);
        return self::normalize(self::formatScaled($rounded, self::INTERNAL_DECIMALS));
    }

    /**
     * Soma geométrica: Base * r^owned * (r^count - 1) / (r - 1) * costMult, r = 1.15.
     */
    public static function geometricSum115(mixed $baseCost, int $owned, int $count, mixed $costMult = '1'): string
    {
        $n = max(0, $owned);
        $k = max(0, $count);
        if ($k === 0) {
            return '0';
        }
        if ($k === 1) {
            return self::mulPow115($baseCost, $n, $costMult);
        }

        $base = self::toScaled($baseCost);
        $disc = self::toScaled($costMult);
        $powOwned = self::intPow(self::COST_NUM, $n);
        $powCount = self::intPow(self::COST_NUM, $k);
        $denCount = self::intPow(self::COST_DEN, $k);
        $series = self::intSub($powCount, $denCount);
        $denPow = self::intPow(self::COST_DEN, $n + $k - 1);

        $raw = self::intMul(self::intMul(self::intMul($base, $powOwned), $series), $disc);
        $denom = self::intMul(self::intMul($denPow, '3'), self::SCALE_STR);
        $half = self::intDiv($denom, '2');
        $rounded = self::intDiv(self::intAdd($raw, $half), $denom);
        return self::normalize(self::formatScaled($rounded, self::INTERNAL_DECIMALS));
    }

    /**
     * floor(sqrt(p / q)) para inteiros escalados p, q >= 0.
     */
    public static function floorSqrtRatio(string $pScaled, string $qScaled): string
    {
        if (self::intCmp($qScaled, '0') <= 0) {
            throw new \InvalidArgumentException('Denominador inválido.');
        }
        if (self::intCmp($pScaled, '0') <= 0) {
            return '0';
        }
        $ratio = self::intDiv($pScaled, $qScaled);
        if ($ratio === '0') {
            return '0';
        }
        if (function_exists('bcsqrt')) {
            return bcsqrt($ratio, 0);
        }
        // Newton integer sqrt
        $x0 = $ratio;
        $x1 = self::intAdd(self::intDiv($ratio, '2'), '1');
        while (self::intCmp($x1, $x0) < 0) {
            $x0 = $x1;
            $x1 = self::intDiv(self::intAdd($x0, self::intDiv($ratio, $x0)), '2');
        }
        return $x0;
    }

    // -------------------------------------------------------------------------
    // Primitivas inteiras de precisão arbitrária (bcmath + fallback puro)
    // -------------------------------------------------------------------------

    public static function intAdd(string $a, string $b): string
    {
        if (function_exists('bcadd')) {
            return bcadd($a, $b, 0);
        }
        return (string) ((float) $a + (float) $b);
    }

    public static function intSub(string $a, string $b): string
    {
        if (function_exists('bcsub')) {
            return bcsub($a, $b, 0);
        }
        return (string) ((float) $a - (float) $b);
    }

    public static function intMul(string $a, string $b): string
    {
        if (function_exists('bcmul')) {
            return bcmul($a, $b, 0);
        }
        return (string) ((float) $a * (float) $b);
    }

    public static function intDiv(string $a, string $b): string
    {
        if (function_exists('bcdiv')) {
            return bcdiv($a, $b, 0);
        }
        return (string) floor((float) $a / (float) $b);
    }

    public static function intMod(string $a, string $b): string
    {
        if (function_exists('bcmod')) {
            return bcmod($a, $b, 0);
        }
        $q = self::intDiv($a, $b);
        return self::intSub($a, self::intMul($q, $b));
    }

    public static function intPow(string $base, int $exp): string
    {
        if ($exp <= 0) {
            return '1';
        }
        if (function_exists('bcpow')) {
            return bcpow($base, (string) $exp, 0);
        }
        $res = '1';
        $b = $base;
        $e = $exp;
        while ($e > 0) {
            if (($e & 1) === 1) {
                $res = self::intMul($res, $b);
            }
            $b = self::intMul($b, $b);
            $e >>= 1;
        }
        return $res;
    }

    public static function intCmp(string $a, string $b): int
    {
        if (function_exists('bccomp')) {
            return bccomp($a, $b, 0);
        }
        return (float) $a <=> (float) $b;
    }
}
