/**
 * Smoke Task C2 — integridade da Prova Módulo 1
 * docs/plano-prova-modulo1-online.md
 *
 * Uso: node tests/prova-c2-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PROVA_INTEGRITY_EVENT_TYPES,
  bumpIntegritySummary,
  normalizeIntegrityEventType,
  sanitizeIntegrityMeta,
} from '../api/_lib/prova/integrity-events.js';
import {
  PROVA_INTEGRITY_DEBOUNCE_MS,
  createProvaIntegrityMonitor,
} from '../js/prova/integrity.js';

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
  'api/_lib/prova/integrity-events.js',
  'js/prova/integrity.js',
  'api/prova.js',
  'js/prova.js',
  'js/api.js',
  'pages/prova.html',
].forEach((rel) => {
  assert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const apiHandler = read('api/prova.js');
const apiJs = read('js/api.js');
const provaJs = read('js/prova.js');
const html = read('pages/prova.html');
const pkg = read('package.json');
const plano = read('docs/plano-prova-modulo1-online.md');

assert(apiHandler.includes("action === 'reportIntegrityEvent'"), 'API reportIntegrityEvent');
assert(apiHandler.includes('bumpIntegritySummary'), 'API bump summary');
assert(apiHandler.includes('prova_integrity_events') || apiHandler.includes('INTEGRITY_EVENTS'), 'insere em integrity events');

assert(apiJs.includes('provaReportIntegrityEvent'), 'wrapper client');
assert(apiJs.includes("navigated_away"), 'redirect registra navigated_away');

assert(provaJs.includes("from './prova/integrity.js'") || provaJs.includes('from "./prova/integrity.js"'), 'prova.js importa integrity');
assert(provaJs.includes('createProvaIntegrityMonitor'), 'prova.js usa monitor');
assert(provaJs.includes('showIntegrityFirstExitModal') || provaJs.includes('dialogIntegrity'), 'modal 1ª saída');

assert(html.includes('prova-dialog-integrity'), 'HTML dialog integridade');
assert(html.includes('Você saiu da prova') || html.includes('saiu da prova'), 'copy modal');

assert(pkg.includes('js/prova/integrity.js'), 'npm check inclui integrity.js');
assert(/Task C2[\s\S]*\[x\].*reportIntegrityEvent/i.test(plano), 'plano marca C2');

// --- Unit: summary bump ---
assert(normalizeIntegrityEventType('tab_blur') === 'tab_blur', 'normalize ok');
assert(normalizeIntegrityEventType('hack') === null, 'normalize rejeita');
assert(PROVA_INTEGRITY_EVENT_TYPES.includes('navigated_away'), 'tipo navigated_away');

let sum = bumpIntegritySummary({}, 'tab_blur', '2026-01-01T00:00:00.000Z');
assert(sum.blurCount === 1 && sum.leaveCount === 0, `blur bump: ${JSON.stringify(sum)}`);
sum = bumpIntegritySummary(sum, 'window_blur', '2026-01-01T00:00:01.000Z');
assert(sum.blurCount === 2, 'segundo blur');
sum = bumpIntegritySummary(sum, 'page_leave', '2026-01-01T00:00:02.000Z');
assert(sum.leaveCount === 1, 'leave bump');
sum = bumpIntegritySummary(sum, 'tab_focus', '2026-01-01T00:00:03.000Z');
assert(sum.blurCount === 2 && sum.leaveCount === 1, 'tab_focus não conta');

const meta = sanitizeIntegrityMeta({ path: '/x', nested: { a: 1 } });
assert(meta.path === '/x', 'meta sanitizada');
assert(sanitizeIntegrityMeta(null) && Object.keys(sanitizeIntegrityMeta(null)).length === 0, 'meta null → {}');

assert(PROVA_INTEGRITY_DEBOUNCE_MS === 3000, 'debounce 3s');

// --- Unit: monitor debounce ---
const events = [];
let firstExit = 0;
const fakeDoc = {
  visibilityState: 'visible',
  addEventListener() {},
  removeEventListener() {},
};
const fakeWin = {
  addEventListener() {},
  removeEventListener() {},
};
const monitor = createProvaIntegrityMonitor({
  debounceMs: 3000,
  doc: fakeDoc,
  win: fakeWin,
  onEvent: (type, metaArg) => {
    events.push({ type, meta: metaArg });
  },
  onFirstExit: () => {
    firstExit += 1;
  },
});

monitor.start();
assert(monitor.running, 'monitor running');

// Simula blur via API interna: reportManualLeave + double leave
monitor.reportManualLeave({ t: 1 });
monitor.reportManualLeave({ t: 2 });
assert(events.filter((e) => e.type === 'page_leave').length === 1, 'leave debounced');
assert(firstExit === 1, 'firstExit uma vez');

monitor.stop();
assert(!monitor.running, 'monitor parado');

if (errors.length) {
  console.error('prova-c2-smoke FAIL:');
  errors.forEach((e) => console.error(' -', e));
  process.exit(1);
}

console.log('prova-c2-smoke OK');
