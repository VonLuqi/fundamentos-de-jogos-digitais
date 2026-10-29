/**
 * Smoke — status de arte é medido, não declarado.
 * Cada pedido auditável de art-requests.json precisa ter o status que o disco mostra
 * (scripts/despertar-status.mjs). Marcar `delivered` à mão com placeholder no disco quebra aqui.
 *
 * Uso: node tests/despertar-art-status-smoke.mjs
 * Conserto: npm run despertar:status -- --sync-requests
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditArt,
  classifySprite,
  requestSpriteKeys,
  requestStatus,
} from '../scripts/despertar-status.mjs';
import { computeArtVersions } from '../scripts/update-art-versions.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const doc = JSON.parse(fs.readFileSync(path.join(root, 'assets/despertar/art-requests.json'), 'utf8'));

// Âncoras calibradas: pintado, vetorial e placeholder conhecidos.
assert.equal((await classifySprite('generators', 'wandering_shade')).status, 'ilustrada', 'arte escura pintada não vira placeholder');
assert.equal((await classifySprite('upgrades', 'ceifador_ctoniano')).status, 'ilustrada');
assert.equal((await classifySprite('upgrades', 'martelos_automatos')).status, 'vetorial');
assert.equal((await classifySprite('upgrades', 'nao_existe_xyz')).status, 'faltando');

const { byKey } = await auditArt();
const stale = [];
for (const req of doc.requests) {
  const keys = requestSpriteKeys(req);
  if (!keys.length) continue;
  const measured = requestStatus(keys, byKey);
  if (req.status !== measured.status) {
    stale.push(`${req.id}: json=${req.status} medido=${measured.status} ${JSON.stringify(measured.counts)}`);
  }
}
assert.deepEqual(stale, [], `art-requests.json desatualizado — rode npm run despertar:status -- --sync-requests\n${stale.join('\n')}`);
assert.match(doc.statusSource || '', /despertar-status\.mjs/, 'art-requests declara a fonte do status');

// Versão de cache dos sprites = hash do disco. Arte trocada sem atualizar = jogador vê a antiga por 7 dias.
const { ART_VERSIONS } = await import('../js/hades-despertar/config/art-versions.js');
assert.deepEqual({ ...ART_VERSIONS }, computeArtVersions(), 'art-versions.js desatualizado — rode npm run despertar:art-versions');
const page = fs.readFileSync(path.join(root, 'pages/despertar.html'), 'utf8');
assert.match(page, /"\.\.\/js\/hades-despertar\/config\/art-versions\.js": "\.\.\/js\/hades-despertar\/config\/art-versions\.js\?v=[0-9a-f]{8}"/, 'importmap versiona art-versions.js');

console.log('despertar-art-status-smoke: ok');
