/**
 * Decimal em string para a economia de O Despertar.
 * Escala interna 8 casas; dinheiro arredonda para 2 (NUMERIC(38,2)).
 * Não usar Number na carteira — 1.15^n e NUMERIC(38) estouram MAX_SAFE_INTEGER.
 */

export const MONEY_DECIMALS = 2;
export const INTERNAL_DECIMALS = 8;

const SCALE = 10n ** BigInt(INTERNAL_DECIMALS);
const COST_NUM = 23n; // 1.15 = 23/20
const COST_DEN = 20n;

function fail(value) {
  throw new Error(`Decimal inválido: ${String(value)}`);
}

export function toScaled(value) {
  if (typeof value === 'bigint') return value * SCALE;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail(value);
    if (Math.abs(value) > Number.MAX_SAFE_INTEGER) {
      throw new Error('Use string decimal para números grandes.');
    }
    return toScaled(String(value));
  }
  if (typeof value !== 'string' && typeof value !== 'number') fail(value);
  const raw = String(value).trim();
  const match = raw.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) fail(value);
  const negative = match[1] === '-';
  const whole = match[2];
  const frac = (match[3] || '').slice(0, INTERNAL_DECIMALS).padEnd(INTERNAL_DECIMALS, '0');
  const extra = (match[3] || '').slice(INTERNAL_DECIMALS);
  let n = BigInt(whole) * SCALE + BigInt(frac || '0');
  if (extra && extra[0] >= '5') n += 1n;
  return negative ? -n : n;
}

function formatScaled(scaled, decimals) {
  const negative = scaled < 0n;
  let mag = negative ? -scaled : scaled;
  const drop = INTERNAL_DECIMALS - decimals;
  if (drop > 0) {
    const factor = 10n ** BigInt(drop);
    mag = (mag + factor / 2n) / factor;
  } else if (drop < 0) {
    mag *= 10n ** BigInt(-drop);
  }
  const decPow = 10n ** BigInt(decimals);
  const intPart = mag / decPow;
  const frac = mag % decPow;
  const sign = negative ? '-' : '';
  if (decimals === 0) return `${sign}${intPart.toString()}`;
  return `${sign}${intPart.toString()}.${frac.toString().padStart(decimals, '0')}`;
}

export function normalize(value) {
  const scaled = toScaled(value);
  const negative = scaled < 0n;
  const mag = negative ? -scaled : scaled;
  const whole = mag / SCALE;
  let frac = (mag % SCALE).toString().padStart(INTERNAL_DECIMALS, '0').replace(/0+$/, '');
  const sign = negative ? '-' : '';
  if (!frac) return `${sign}${whole.toString()}`;
  return `${sign}${whole.toString()}.${frac}`;
}

export function money(value) {
  return formatScaled(toScaled(value), MONEY_DECIMALS);
}

export function add(a, b) {
  return normalize(formatScaled(toScaled(a) + toScaled(b), INTERNAL_DECIMALS));
}

export function sub(a, b) {
  return normalize(formatScaled(toScaled(a) - toScaled(b), INTERNAL_DECIMALS));
}

export function mul(a, b) {
  const product = (toScaled(a) * toScaled(b) + SCALE / 2n) / SCALE;
  return normalize(formatScaled(product, INTERNAL_DECIMALS));
}

export function div(a, b) {
  const den = toScaled(b);
  if (den === 0n) throw new Error('Divisão por zero.');
  const num = toScaled(a);
  const rounded = num < 0n === den < 0n
    ? (num * SCALE + den / 2n) / den
    : (num * SCALE - den / 2n) / den;
  return normalize(formatScaled(rounded, INTERNAL_DECIMALS));
}

export function cmp(a, b) {
  const d = toScaled(a) - toScaled(b);
  if (d < 0n) return -1;
  if (d > 0n) return 1;
  return 0;
}

export function isZero(value) {
  return toScaled(value) === 0n;
}

export function abs(value) {
  const scaled = toScaled(value);
  return normalize(formatScaled(scaled < 0n ? -scaled : scaled, INTERNAL_DECIMALS));
}

export function min(a, b) {
  return cmp(a, b) <= 0 ? normalize(a) : normalize(b);
}

export function max(a, b) {
  return cmp(a, b) >= 0 ? normalize(a) : normalize(b);
}

export function clampNonNegative(value) {
  return cmp(value, '0') < 0 ? '0' : normalize(value);
}

export function isqrt(n) {
  if (n < 0n) throw new Error('Raiz de negativo.');
  if (n < 2n) return n;
  let x0 = n;
  let x1 = (n >> 1n) + 1n;
  while (x1 < x0) {
    x0 = x1;
    x1 = (x1 + n / x1) >> 1n;
  }
  return x0;
}

/**
 * floor(sqrt(p / q)) para p,q inteiros não negativos.
 */
export function floorSqrtRatio(p, q) {
  if (q <= 0n) throw new Error('Denominador inválido.');
  if (p <= 0n) return 0n;
  let lo = 0n;
  let hi = isqrt(p) + 1n;
  while (lo < hi) {
    const mid = (lo + hi + 1n) / 2n;
    if (mid * mid * q <= p) lo = mid;
    else hi = mid - 1n;
  }
  return lo;
}

function asCount(n) {
  const count = Number(n);
  if (!Number.isInteger(count) || count < 0) {
    throw new Error(`Quantidade inválida: ${String(n)}`);
  }
  return count;
}

/**
 * BaseCost × (23/20)^owned × costMult, em string decimal.
 */
export function mulPow115(baseCost, owned, costMult = '1') {
  const n = asCount(owned);
  const base = toScaled(baseCost);
  const disc = toScaled(costMult);
  const num = COST_NUM ** BigInt(n);
  const den = COST_DEN ** BigInt(n);
  const raw = base * num * disc;
  const denom = den * SCALE;
  const rounded = (raw + denom / 2n) / denom;
  return normalize(formatScaled(rounded, INTERNAL_DECIMALS));
}

/**
 * Soma geométrica: Base × r^owned × (r^count − 1) / (r − 1) × costMult, r = 1.15.
 */
export function geometricSum115(baseCost, owned, count, costMult = '1') {
  const n = asCount(owned);
  const k = asCount(count);
  if (k === 0) return '0';
  if (k === 1) return mulPow115(baseCost, n, costMult);

  const base = toScaled(baseCost);
  const disc = toScaled(costMult);
  const powOwned = COST_NUM ** BigInt(n);
  const powCount = COST_NUM ** BigInt(k);
  const denCount = COST_DEN ** BigInt(k);
  const series = powCount - denCount;
  const denPow = COST_DEN ** BigInt(n + k - 1);
  const raw = base * powOwned * series * disc;
  const denom = denPow * 3n * SCALE;
  const rounded = (raw + denom / 2n) / denom;
  return normalize(formatScaled(rounded, INTERNAL_DECIMALS));
}

export function toIntegerString(value) {
  const scaled = toScaled(value);
  const whole = scaled / SCALE;
  return whole.toString();
}

export function toBigIntFloor(value) {
  const scaled = toScaled(value);
  return scaled < 0n ? (scaled - SCALE + 1n) / SCALE : scaled / SCALE;
}
