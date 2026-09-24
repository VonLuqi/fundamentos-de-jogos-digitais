/**
 * Smoke Task C3 — avisos e copy da Prova Módulo 1
 * docs/plano-prova-modulo1-online.md
 *
 * Uso: node tests/prova-c3-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROVA_COPY } from '../js/prova/copy.js';
import { createProvaIntegrityMonitor } from '../js/prova/integrity.js';

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
  'js/prova/copy.js',
  'js/prova/integrity.js',
  'js/prova.js',
  'pages/prova.html',
].forEach((rel) => {
  assert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const copySrc = read('js/prova/copy.js');
const integritySrc = read('js/prova/integrity.js');
const provaJs = read('js/prova.js');
const html = read('pages/prova.html');
const pkg = read('package.json');
const plano = read('docs/plano-prova-modulo1-online.md');

assert(copySrc.includes('export const PROVA_COPY'), 'copy.js exporta PROVA_COPY');
assert(PROVA_COPY.integrityTitle.includes('saiu'), 'copy integrity title');
assert(
  PROVA_COPY.integrityBody.includes('continua passando') || PROVA_COPY.warnBanner.includes('continua passando'),
  'copy avisa que tempo continua',
);
assert(PROVA_COPY.doneWaiting.length > 10, 'copy done waiting');

assert(integritySrc.includes('shouldWarnUnload'), 'integrity shouldWarnUnload');
assert(integritySrc.includes('allowUnload'), 'integrity allowUnload');
assert(integritySrc.includes('event.returnValue'), 'beforeunload returnValue');
assert(integritySrc.includes('preventDefault'), 'beforeunload preventDefault');

assert(provaJs.includes("from './prova/copy.js'") || provaJs.includes('from "./prova/copy.js"'), 'prova.js importa copy');
assert(provaJs.includes('PROVA_COPY'), 'prova.js usa PROVA_COPY');
assert(provaJs.includes('shouldWarnUnload'), 'prova.js passa shouldWarnUnload');
assert(provaJs.includes('stopIntegrityMonitor') || provaJs.includes('integrityMonitor?.stop'), 'para monitor ao sair do exame');
assert(!html.includes('prova-btn-leave-exam'), 'sem botão Sair no rodapé');
assert(!/window\.addEventListener\(\s*['"]beforeunload['"]/.test(provaJs), 'beforeunload só no integrity monitor');

assert(html.includes('12 de marcar') || html.includes('para escrever'), 'HTML copy simplificada');
assert(html.includes('Ei — você saiu') || html.includes('saiu da prova'), 'HTML modal integridade');
assert(html.includes('não pausa') || html.includes('continua passando'), 'HTML tempo não pausa');

assert(pkg.includes('js/prova/copy.js'), 'npm check inclui copy.js');
assert(/Task C3[\s\S]*\[x\].*beforeunload|Task C3[\s\S]*\[x\].*português/i.test(plano), 'plano marca C3');

// --- Unit: beforeunload warn / allowUnload ---
const fakeDoc = {
  visibilityState: 'visible',
  addEventListener() {},
  removeEventListener() {},
};
/** @type {Array<[string, Function]>} */
const winHandlers = [];
const fakeWin = {
  addEventListener(type, fn) {
    winHandlers.push([type, fn]);
  },
  removeEventListener(type, fn) {
    const i = winHandlers.findIndex(([t, f]) => t === type && f === fn);
    if (i >= 0) winHandlers.splice(i, 1);
  },
};

let warnCalls = 0;
const monitor = createProvaIntegrityMonitor({
  doc: fakeDoc,
  win: fakeWin,
  shouldWarnUnload: () => true,
  onEvent: () => {},
});
monitor.start();

const beforeUnloadFn = winHandlers.find(([t]) => t === 'beforeunload')?.[1];
assert(typeof beforeUnloadFn === 'function', 'listener beforeunload registrado');

const ev1 = {
  prevented: false,
  returnValue: undefined,
  preventDefault() {
    this.prevented = true;
  },
};
beforeUnloadFn(ev1);
assert(ev1.prevented && ev1.returnValue === '', 'warn nativo ativo');
warnCalls += 1;

monitor.allowUnload();
const ev2 = {
  prevented: false,
  returnValue: undefined,
  preventDefault() {
    this.prevented = true;
  },
};
beforeUnloadFn(ev2);
assert(!ev2.prevented, 'allowUnload desativa warn');
assert(warnCalls === 1, 'só um warn antes do allow');

monitor.stop();
assert(winHandlers.length === 0, 'listeners removidos no stop');

if (errors.length) {
  console.error('prova-c3-smoke FAIL:');
  errors.forEach((e) => console.error(' -', e));
  process.exit(1);
}

console.log('prova-c3-smoke OK');
