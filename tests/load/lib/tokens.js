/**
 * Tokens pré-emitidos (seed-load-users) — evita rate limit login_ip (10/15 min).
 * SharedArray **deve** ser criado no init context (top-level do módulo).
 * open() é relativo a **este** arquivo (`tests/load/lib/`), não ao CWD:
 *
 *   LOAD_TOKENS_FILE=../../../docs/load-results/raw/turma-tokens.json
 */
import { SharedArray } from 'k6/data';

const tokensFile = String(__ENV.LOAD_TOKENS_FILE || '').trim();

const tokenRows = new SharedArray('load_tokens', () => {
  if (!tokensFile) return [];
  const raw = open(tokensFile);
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.tokens) || !parsed.tokens.length) {
    throw new Error(`Sem tokens em ${tokensFile} — rode: node scripts/seed-load-users.mjs --count 30`);
  }
  return parsed.tokens;
});

/**
 * @param {number} vu
 * @returns {string|null}
 */
export function tokenForVu(vu) {
  if (!tokenRows.length) return null;
  const idx = (Math.max(1, vu) - 1) % tokenRows.length;
  return tokenRows[idx].token || null;
}

export function hasTokenFile() {
  return Boolean(tokensFile) && tokenRows.length > 0;
}
