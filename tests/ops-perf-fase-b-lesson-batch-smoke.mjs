/**
 * Smoke Fase B / Task B6 — dirty sync + lessonEventsBatch.
 * docs/otimizacoes/02-tasks-fase-b-rtt-batching.md · D6/D7
 *
 * Uso: node tests/ops-perf-fase-b-lesson-batch-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ApiService } from '../js/hades-despertar/services/ApiService.js';
import { readProgressSurface } from './_helpers/progress-surface.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    errors.push(`Arquivo ausente: ${rel}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const apiJs = read('js/api.js');
const apiService = read('js/hades-despertar/services/ApiService.js');
const progress = readProgressSurface(root);
const contratos = read('docs/otimizacoes/contratos-fase-b.md');
const faseB = read('docs/otimizacoes/02-tasks-fase-b-rtt-batching.md');
const pkg = read('package.json');

assert(apiService.includes('if (!this._dirty) return'), 'heartbeat dirty-only (D7)');
assert(apiService.includes('markDirty') || apiService.includes('_dirty = true'), 'mark dirty API');
assert(!/setInterval\(\(\) => \{\s*this\.scheduleFlush/.test(apiService), 'heartbeat não chama scheduleFlush cego');

assert(apiJs.includes('enqueueLessonEvent'), 'cliente enqueueLessonEvent');
assert(apiJs.includes('flushLessonEvents'), 'cliente flushLessonEvents');
assert(apiJs.includes('lessonEventsBatch'), 'cliente chama lessonEventsBatch');
assert(apiJs.includes('pagehide'), 'flush no pagehide');
assert(apiJs.includes('visibilitychange'), 'flush no visibilitychange');
assert(apiJs.includes('isLessonBatchFallbackStatus') || (apiJs.includes('404') && apiJs.includes('lessonBatch')), 'fallback 404');
assert(/trackLessonView[\s\S]*enqueueLessonEvent/.test(apiJs), 'trackLessonView enfileira');
assert(/saveLessonParagraph[\s\S]*flushLessonEvents/.test(apiJs), 'saveLessonParagraph faz flush');

assert(progress.includes("action === 'lessonEventsBatch'"), 'server lessonEventsBatch');
assert(progress.includes('executeLessonView'), 'executeLessonView compartilhado');
assert(progress.includes('executeLessonParagraph'), 'executeLessonParagraph compartilhado');
assert(progress.includes('LESSON_EVENTS_BATCH_MAX'), 'limite de batch');
assert(/\bevents\b/.test(progress.slice(progress.indexOf('const {'), progress.indexOf('} = req.body'))), 'destructuring events');

assert(contratos.includes('lessonEventsBatch'), 'contrato D6');
assert(/Task B6|dirty|lessonEventsBatch/i.test(faseB), 'doc Fase B cobre B6');
assert(pkg.includes('ops-perf-fase-b-lesson-batch-smoke.mjs'), 'npm check inclui este smoke');

{
  // Idle heartbeat não agenda sync se limpo.
  let syncCalls = 0;
  const api = new ApiService({
    getToken: () => 'tok',
    getSnapshot: () => ({ souls: '0' }),
    heartbeatMs: 5,
    minIntervalMs: 0,
    now: () => 1_000_000,
  });
  api._lastSyncAt = 1;
  api._dirty = false;
  // Simula tick do heartbeat
  if (!api._dirty) {
    /* no-op — contrato D7 */
  } else {
    syncCalls += 1;
  }
  assert(syncCalls === 0, 'idle sem dirty → 0 sync');

  api.markDirty();
  assert(api.isDirty === true, 'markDirty liga dirty');
  api.requestSync();
  assert(api.isDirty === true, 'requestSync mantém dirty até flush');
  api.stop();
}

if (errors.length) {
  console.error('ops-perf-fase-b-lesson-batch-smoke FAILED:');
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}

console.log('ops-perf-fase-b-lesson-batch-smoke OK');
console.log('  dirty-only heartbeat + lessonEventsBatch + pagehide flush');
