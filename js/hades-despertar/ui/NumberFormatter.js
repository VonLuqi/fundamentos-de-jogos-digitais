/**
 * Formatador de O Despertar — sufixos 1.2M / 4.7B (GDD NumberFormatter).
 * Opera em string decimal; não converte a carteira para Number.
 */

import { INTERNAL_DECIMALS, toScaled } from '../core/decimal.js';

const SCALE = 10n ** BigInt(INTERNAL_DECIMALS);
const SUFFIXES = Object.freeze([
  '', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc',
]);

function trimFrac(whole, fracRaw, maxFrac) {
  const frac = fracRaw.slice(0, maxFrac).replace(/0+$/, '');
  if (!frac) return whole;
  return `${whole}.${frac}`;
}

export function formatGameNumber(value) {
  const scaled = toScaled(value);
  const sign = scaled < 0n ? '-' : '';
  const mag = scaled < 0n ? -scaled : scaled;
  const whole = mag / SCALE;
  const fracPart = mag % SCALE;

  if (whole < 1000n) {
    const frac = fracPart.toString().padStart(INTERNAL_DECIMALS, '0');
    return sign + trimFrac(whole.toString(), frac, 2);
  }

  const digits = whole.toString();
  const suffixIndex = Math.min(
    Math.floor((digits.length - 1) / 3),
    SUFFIXES.length - 1,
  );
  const headLen = digits.length - suffixIndex * 3;
  const head = digits.slice(0, headLen);
  const rest = digits.slice(headLen, headLen + 2).replace(/0+$/, '');
  const body = rest ? `${head}.${rest}` : head;
  return `${sign}${body}${SUFFIXES[suffixIndex]}`;
}

export function formatSouls(value) {
  return formatGameNumber(value);
}

export function formatRate(value) {
  return formatGameNumber(value);
}

export function formatOwned(qty) {
  const n = Math.max(0, Math.floor(Number(qty) || 0));
  return formatGameNumber(String(n));
}

export function formatAmortSeconds(seconds) {
  if (seconds == null) return '—';
  const value = Number(seconds);
  if (!Number.isFinite(value) || value < 0) return '—';
  if (value < 600) return `${Math.round(value)} s`;
  if (value < 3600) {
    const minutes = value / 60;
    const shown = minutes >= 10 ? minutes.toFixed(0) : minutes.toFixed(1).replace(/\.0$/, '');
    return `${shown} min`;
  }
  const hours = value / 3600;
  const shown = hours >= 10 ? hours.toFixed(0) : hours.toFixed(1).replace(/\.0$/, '');
  return `${shown} h`;
}
