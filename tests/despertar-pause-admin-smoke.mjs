/**
 * Smoke Task A3 — controles Véu da Aula no dashboard (Mestre).
 * docs/plano-despertar-producao-profundo.md
 *
 * Uso: node tests/despertar-pause-admin-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DESPERTAR_PAUSE_MINUTE_PRESETS,
  DESPERTAR_PAUSE_REASON_OPTIONS,
} from '../js/api.js';
import { localDatetimeToIsoUtc } from '../js/hades-despertar/ui/pauseVeil.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const html = read('pages/dashboard.html');
const dash = read('js/dashboard.js');
const css = read('css/dashboard.css');
const api = read('js/api.js');
const pkg = read('package.json');

assert.match(html, /id="master-despertar-pause"/);
assert.match(html, /id="master-pause-status"/);
assert.match(html, /data-pause-minutes="15"/);
assert.match(html, /data-pause-minutes="30"/);
assert.match(html, /data-pause-minutes="45"/);
assert.match(html, /data-pause-minutes="60"/);
assert.match(html, /id="master-pause-until"/);
assert.match(html, /type="datetime-local"/);
assert.match(html, /id="master-pause-reason-preset"/);
assert.match(html, /id="btn-pause-until"/);
assert.match(html, /id="btn-pause-clear"/);
assert.match(html, /Liberar agora/);
assert.match(html, /Véu da Aula/);
assert.match(html, /Limpar Estelas antecipadas/);

assert.match(dash, /bindMasterClassroomPauseControls/);
assert.match(dash, /despertarPauseSet/);
assert.match(dash, /despertarPauseClear/);
assert.match(dash, /refreshMasterPauseStatus/);
assert.match(dash, /formatMasterPauseStatus/);
assert.match(dash, /localDatetimeToIsoUtc/);
assert.match(dash, /Liberar o Véu da Aula agora/);

assert.match(css, /\.master-tools__pause\b/);
assert.match(api, /function despertarPauseSet/);
assert.match(api, /DESPERTAR_PAUSE_MINUTE_PRESETS/);
assert.match(pkg, /despertar-pause-admin-smoke\.mjs/);

assert.deepEqual([...DESPERTAR_PAUSE_MINUTE_PRESETS], [15, 30, 45, 60]);
assert.ok(DESPERTAR_PAUSE_REASON_OPTIONS.some((o) => o.id === 'aula'));
assert.ok(DESPERTAR_PAUSE_REASON_OPTIONS.some((o) => o.id === 'custom'));

// datetime-local → ISO (hora local do ambiente de teste)
{
  const iso = localDatetimeToIsoUtc('2026-09-28T16:30');
  assert.ok(iso);
  assert.match(iso, /Z$/);
  assert.equal(localDatetimeToIsoUtc(''), null);
  assert.equal(localDatetimeToIsoUtc('não-é-data'), null);
}

console.log('despertar-pause-admin-smoke: ok');
