/**
 * Smoke Task B3 — timer da Prova Módulo 1
 * Uso: node tests/prova-b3-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PROVA_TIMER_POLL_MS,
  PROVA_TIMER_URGENT_MS,
  computeTimerSync,
  createProvaTimer,
  formatRemaining,
  isUrgent,
  parseTimeMs,
} from '../js/prova/timer.js';

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

['js/prova/timer.js', 'js/prova.js', 'pages/prova.html'].forEach((rel) => {
  assert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const js = read('js/prova.js');
const html = read('pages/prova.html');
const timerSrc = read('js/prova/timer.js');

assert(js.includes("from './prova/timer.js'") || js.includes('from "./prova/timer.js"'), 'prova.js importa timer.js');
assert(js.includes('autoSubmitOnExpire') || js.includes('createProvaTimer'), 'prova.js usa timer');
assert(js.includes('EXPIRE_MAX_RETRIES'), 'retry de envio ao expirar');
assert(html.includes('prova-dialog-expired'), 'HTML sem dialog de tempo esgotado');
assert(timerSrc.includes('PROVA_TIMER_POLL_MS'), 'poll 30s');
assert(PROVA_TIMER_POLL_MS === 30_000, 'poll deve ser 30s');
assert(PROVA_TIMER_URGENT_MS === 5 * 60 * 1000, 'urgência 5 min');

assert(formatRemaining(90 * 60 * 1000) === '90:00', `format 90min: ${formatRemaining(90 * 60 * 1000)}`);
assert(formatRemaining(65_000) === '01:05', `format 65s: ${formatRemaining(65_000)}`);
assert(formatRemaining(0) === '00:00', 'format zero');
assert(isUrgent(4 * 60 * 1000), '4 min é urgente');
assert(!isUrgent(6 * 60 * 1000), '6 min não é urgente');
assert(!isUrgent(0), '0 não é urgente (já zerou)');

const now = Date.now();
const sync = computeTimerSync(new Date(now + 60_000).toISOString(), new Date(now).toISOString());
assert(sync.endsAtMs != null, 'endsAtMs parse');
assert(sync.remainingMs != null && sync.remainingMs > 55_000 && sync.remainingMs <= 60_000, `remaining ~60s got ${sync.remainingMs}`);

assert(parseTimeMs('invalid') === null, 'parse inválido');

// Fake timers for createProvaTimer expire
const originalSetInterval = globalThis.setInterval;
const originalClearInterval = globalThis.clearInterval;
const intervals = new Map();
let nextId = 1;
globalThis.setInterval = (fn, ms) => {
  const id = nextId++;
  intervals.set(id, { fn, ms });
  return id;
};
globalThis.clearInterval = (id) => {
  intervals.delete(id);
};

let expired = false;
const valueEl = { textContent: '' };
const rootEl = {
  classes: new Set(),
  classList: {
    toggle(name, on) {
      if (on) rootEl.classes.add(name);
      else rootEl.classes.delete(name);
    },
  },
};

const timer = createProvaTimer({
  valueEl,
  rootEl,
  onExpire: () => {
    expired = true;
  },
  pollMs: 999999,
  tickMs: 1000,
});

const endsSoon = new Date(Date.now() - 1000).toISOString();
timer.start(endsSoon, new Date().toISOString());
assert(expired, 'deve expirar imediatamente se endsAt no passado');
assert(valueEl.textContent === '00:00', `display zerado: ${valueEl.textContent}`);

expired = false;
timer.start(new Date(Date.now() + 10_000).toISOString(), new Date().toISOString());
assert(!expired, 'não expira com 10s restantes');
assert(rootEl.classes.has('is-urgent'), '10s deve ser urgente');
timer.stop();

globalThis.setInterval = originalSetInterval;
globalThis.clearInterval = originalClearInterval;

console.log(
  errors.length
    ? `prova-b3-smoke FAIL (${errors.length})\n - ${errors.join('\n - ')}`
    : 'prova-b3-smoke OK',
);
process.exit(errors.length ? 1 : 0);
