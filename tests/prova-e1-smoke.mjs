/**
 * Smoke Task E1 — Segurança da Prova
 * docs/plano-prova-modulo1-online.md
 *
 * - Gabarito / answer-key ausente do client público
 * - Rate limit saveAnswer + reportIntegrityEvent
 * - Edge teto /api/prova
 * - RLS ENABLE sem policies (só service role)
 * - admin_audit em open / finalize / score discursiva
 *
 * Uso: node tests/prova-e1-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADMIN_AUDIT_ACTIONS } from '../api/_lib/admin-audit.js';
import {
  EDGE_RATE_LIMITS,
  matchEdgePathGroup,
} from '../api/_lib/edge-rate-limit.js';
import {
  PROVA_RATE_LIMITS,
  consumeProvaRateLimit,
} from '../api/_lib/prova/rate-limit.js';
import { assertNoAnswerKeyLeak } from '../api/_lib/prova/attempt-dto.js';
import { sanitizeQuestionsForClient } from '../api/_lib/prova/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    errors.push(`Arquivo ausente: ${rel}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

[
  'api/_lib/prova/rate-limit.js',
  'api/prova.js',
  'middleware.js',
  'api/_lib/edge-rate-limit.js',
  'db/migrate-2026-09-24-prova-modulo1.sql',
].forEach((rel) => {
  assert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const handler = read('api/prova.js');
const rateSrc = read('api/_lib/prova/rate-limit.js');
const migrate = read('db/migrate-2026-09-24-prova-modulo1.sql');
const mwSrc = read('middleware.js');
const edgeSrc = read('api/_lib/edge-rate-limit.js');
const pkg = read('package.json');
const dtoSrc = read('api/_lib/prova/attempt-dto.js');

// --- Gabarito nunca no client público ---
const publicClientFiles = [
  'js/prova.js',
  'js/prova/questions-ui.js',
  'js/prova/timer.js',
  'js/prova/integrity.js',
  'js/prova/copy.js',
  'pages/prova.html',
  'css/prova.css',
];

const leakPatternsHard = [
  /answer-key-modulo1/,
  /MC_ANSWER_KEY/,
  /MC_JUSTIFICATIONS/,
  /DISCURSIVE_RUBRICS/,
  /from\s+['"].*prova\/answer-key/,
  /from\s+['"].*_lib\/prova\/answer-key/,
];

for (const rel of publicClientFiles) {
  const src = read(rel);
  if (!src) continue;
  for (const re of leakPatternsHard) {
    assert(!re.test(src), `Vazamento em ${rel}: ${re}`);
  }
}

// correctChoice só via API `review` após graded — UI pode referenciar o campo da resposta
assert(
  !/MC_ANSWER_KEY|answer-key-modulo1/.test(read('js/prova.js')),
  'client não embute gabarito estático',
);

const clientQs = sanitizeQuestionsForClient();
try {
  assertNoAnswerKeyLeak({
    ok: true,
    exam: { id: 'modulo1-provacao' },
    questions: clientQs,
    answers: { q01: { choice: 'A' }, q13: { textAnswer: 'texto do aluno' } },
  });
} catch (e) {
  errors.push(`assertNoAnswerKeyLeak no payload aluno: ${e.message || e}`);
}

assert(dtoSrc.includes('assertNoAnswerKeyLeak'), 'DTO exporta assertNoAnswerKeyLeak');
assert(
  handler.includes("action === 'adminGetAttempt'")
    && !/adminGetAttempt[\s\S]{0,400}assertNoAnswerKeyLeak/.test(handler),
  'adminGetAttempt não deve passar por assertNoAnswerKeyLeak',
);

// --- Rate limit save + integrity ---
assert(rateSrc.includes('PROVA_RATE_LIMITS'), 'rate-limit prova exporta PROVA_RATE_LIMITS');
assert(rateSrc.includes('consumeProvaRateLimit'), 'rate-limit prova exporta consume');
assert(handler.includes("rejectIfProvaRateLimited(res, 'saveAnswer'"), 'saveAnswer rate-limited');
assert(
  handler.includes("rejectIfProvaRateLimited(res, 'reportIntegrityEvent'"),
  'reportIntegrityEvent rate-limited',
);
assert(PROVA_RATE_LIMITS.saveAnswer.limit === 90, 'saveAnswer 90/min');
assert(PROVA_RATE_LIMITS.reportIntegrityEvent.limit === 40, 'integrity 40/min');

const uid = `e1-smoke-${Date.now()}`;
const first = await consumeProvaRateLimit('saveAnswer', uid, { forceBackend: 'memory' });
assert(first.limited === false, 'primeiro save não limited');
for (let i = 0; i < PROVA_RATE_LIMITS.saveAnswer.limit - 1; i += 1) {
  await consumeProvaRateLimit('saveAnswer', uid, { forceBackend: 'memory' });
}
const blocked = await consumeProvaRateLimit('saveAnswer', uid, { forceBackend: 'memory' });
assert(blocked.limited === true, 'saveAnswer estoura limite');
assert(Number(blocked.retryAfterSec) >= 1, 'retryAfterSec presente');

const uid2 = `${uid}-int`;
for (let i = 0; i < PROVA_RATE_LIMITS.reportIntegrityEvent.limit; i += 1) {
  await consumeProvaRateLimit('reportIntegrityEvent', uid2, { forceBackend: 'memory' });
}
const intBlocked = await consumeProvaRateLimit('reportIntegrityEvent', uid2, {
  forceBackend: 'memory',
});
assert(intBlocked.limited === true, 'integrity estoura limite');

// --- Edge /api/prova ---
assert(EDGE_RATE_LIMITS.prova, 'EDGE_RATE_LIMITS.prova');
assert(EDGE_RATE_LIMITS.prova.limit === 120, 'edge prova 120/min/IP');
assert(matchEdgePathGroup('/api/prova') === 'prova', 'match /api/prova');
assert(matchEdgePathGroup('/api/prova/') === 'prova', 'match /api/prova/');
assert(mwSrc.includes('/api/prova'), 'middleware matcher inclui /api/prova');
assert(edgeSrc.includes('prova:'), 'edge-rate-limit declara prova');

// --- RLS / service role ---
assert(migrate.includes('ENABLE ROW LEVEL SECURITY'), 'migrate habilita RLS');
assert(
  /ALTER TABLE prova_exams ENABLE ROW LEVEL SECURITY/.test(migrate)
    && /ALTER TABLE prova_attempts ENABLE ROW LEVEL SECURITY/.test(migrate)
    && /ALTER TABLE prova_answers ENABLE ROW LEVEL SECURITY/.test(migrate),
  'RLS nas 3 tabelas principais',
);
assert(
  !/CREATE POLICY/i.test(migrate),
  'sem CREATE POLICY (só service role bypass)',
);
assert(
  /SERVICE_ROLE|service role|service-role/i.test(migrate),
  'migrate documenta service role',
);
assert(handler.includes("import supabase from './supabaseClient.js'"), 'API usa supabaseClient');

// --- Audit finalize / open ---
assert(
  ADMIN_AUDIT_ACTIONS.setProvaExamOpen === 'admin_set_prova_exam_open',
  'audit action open estável',
);
assert(
  ADMIN_AUDIT_ACTIONS.finalizeProvaGrade === 'admin_finalize_prova_grade',
  'audit action finalize estável',
);
assert(
  ADMIN_AUDIT_ACTIONS.scoreProvaDiscursive === 'admin_score_prova_discursive',
  'audit action score discursiva estável',
);
assert(handler.includes('ADMIN_AUDIT_ACTIONS.setProvaExamOpen'), 'open grava audit');
assert(handler.includes('ADMIN_AUDIT_ACTIONS.finalizeProvaGrade'), 'finalize grava audit');
assert(handler.includes('ADMIN_AUDIT_ACTIONS.scoreProvaDiscursive'), 'score grava audit');
assert(handler.includes('recordAdminAudit'), 'handler chama recordAdminAudit');

assert(pkg.includes('api/_lib/prova/rate-limit.js'), 'npm check cobre rate-limit prova');
assert(pkg.includes('prova-e1-smoke.mjs'), 'npm check inclui prova-e1-smoke');

if (errors.length) {
  console.error('FALHAS prova-e1-smoke:');
  for (const e of errors) console.error(`  · ${e}`);
  process.exit(1);
}

console.log('OK prova-e1-smoke');
console.log('  · gabarito ausente do client público');
console.log('  · rate limit saveAnswer + reportIntegrityEvent');
console.log('  · edge /api/prova + RLS sem policies');
console.log('  · admin_audit open / finalize / score');
