/**
 * Smoke Task 3 — API ClassInd-dle
 * (docs/plano-aula5-classind-iarc.md)
 *
 * Estático: arquivos, actions, anti-spoiler do snapshot, deck.
 * Handler: 401 sem token; 405 GET.
 * Integração opcional: se CLASSIND_SMOKE_ADMIN_TOKEN + tabelas existirem,
 * roda create→start→vote→reveal→next.
 *
 * Uso: node tests/classind-api-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import classindHandler, {
  assertNoSecrets,
  buildPublicSnapshotPayload,
} from '../api/classind.js';
import {
  DECK_ID,
  ROUNDS,
  getRoundByIndex,
  shuffleDeckOrder,
  splitRoundPayload,
} from '../js/classind-dle/config/rounds.js';
import supabase from '../api/supabaseClient.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
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

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return payload;
    },
  };
}

async function call(action, body = {}) {
  const req = { method: 'POST', body: { action, ...body } };
  const res = mockRes();
  await classindHandler(req, res);
  return res;
}

// --- arquivos ---
[
  'api/classind.js',
  'api/_lib/classind-dle-achievements.js',
  'js/classind-dle/config/rounds.js',
  'local-server.mjs',
  'js/api.js',
].forEach((rel) => {
  staticAssert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const apiSrc = read('api/classind.js');
const localServer = read('local-server.mjs');
const apiJs = read('js/api.js');

staticAssert(localServer.includes("'/api/classind'"), 'local-server registra /api/classind');
staticAssert(localServer.includes('classindHandler'), 'local-server importa classindHandler');
staticAssert(!apiSrc.includes('SERVICE_ROLE') || !/res\.status\(200\)[\s\S]{0,200}SERVICE_ROLE/.test(apiSrc), 'não devolve service role no 200');
staticAssert(!/json\(\{[\s\S]*serviceRole/i.test(apiSrc), 'payload sem serviceRole');

for (const action of [
  'createRoom',
  'joinRoom',
  'ping',
  'getState',
  'startRound',
  'castVote',
  'reveal',
  'nextRound',
  'showRanking',
  'closeRoom',
  'listRoomRoster',
]) {
  staticAssert(apiSrc.includes(`'${action}'`) || apiSrc.includes(`"${action}"`) || apiSrc.includes(`action === '${action}'`), `action ${action}`);
}

staticAssert(apiJs.includes('export function classindCreateRoom'), 'js/api.js classindCreateRoom');
staticAssert(apiJs.includes('export function classindCastVote'), 'js/api.js classindCastVote');
staticAssert(apiJs.includes('export function classindShowRanking'), 'js/api.js classindShowRanking');
staticAssert(apiJs.includes("request('/classind'"), 'js/api.js request /classind');

staticAssert(apiSrc.includes('countEligibleVoters'), 'quorum só alunos (eligible)');
staticAssert(apiSrc.includes('computeUserScore'), 'score por usuário');
staticAssert(apiSrc.includes('buildSessionScores'), 'placar da sessão');
staticAssert(apiSrc.includes("phase: 'results'"), 'fim de deck → results');
staticAssert(apiSrc.includes("phase: 'ranking'"), 'showRanking → ranking');
staticAssert(apiSrc.includes('myPerformance'), 'desempenho pessoal');
staticAssert(apiSrc.includes('performances'), 'desempenho da turma');
staticAssert(apiSrc.includes('scoreTotal'), 'denominador scoreTotal (rodadas reveladas)');
staticAssert(fs.existsSync(path.join(root, 'db/migrate-2026-09-21-classind-dle-results-ranking.sql')), 'migration results/ranking');
staticAssert(
  /results['"],\s*['"]ranking/.test(read('db/migrate-2026-09-21-classind-dle.sql').replace(/\s+/g, ' '))
    || read('db/migrate-2026-09-21-classind-dle.sql').includes("'results'"),
  'schema base inclui results/ranking'
);

staticAssert(apiSrc.includes('maybeAwardDleSecret'), 'getState/join concede Júri do Telão');
staticAssert(apiSrc.includes('awardDleSecretsForFinishedRoom'), 'closeRoom concede Júri em lote');
staticAssert(apiSrc.includes('segredo_juri_do_telao') || apiSrc.includes('CLASSIND_DLE_SECRET_ID'), 'id da secreta dle');
staticAssert(fs.existsSync(path.join(root, 'api/_lib/classind-dle-achievements.js')), 'lib qualifies dle secret');
staticAssert(apiSrc.includes('eligibleVotersCount'), 'payload eligibleVotersCount');
staticAssert(
  /Mestre não vota/i.test(apiSrc),
  'castVote rejeita admin'
);
staticAssert(apiSrc.includes('shuffleDeckOrder'), 'createRoom embaralha deck');
staticAssert(apiSrc.includes('deckOrder'), 'settings.deckOrder');
staticAssert(apiSrc.includes('hostUserId'), 'state inclui hostUserId');
staticAssert(apiSrc.includes('host_user_id'), 'castVote considera host');
staticAssert(/includeRoster:\s*true/.test(apiSrc), 'roster para todos os membros');

staticAssert(DECK_ID === 'aula5-v1', 'DECK_ID aula5-v1');
staticAssert(ROUNDS.length >= 6, 'deck com ≥6 rodadas');
staticAssert(ROUNDS[0].correctSide === 'A', 'rodada 1 MK > SF');
staticAssert(ROUNDS[1].correctSide === 'A', 'rodada 2 Sims > HK');
staticAssert(ROUNDS[2].correctSide === 'B', 'rodada 3 Hotline > Undertale');
staticAssert(ROUNDS[2].sideA.cover === 'undertale.webp', 'r3 capa Undertale');
staticAssert(ROUNDS[2].sideB.cover === 'hotline-miami.webp', 'r3 capa Hotline');
staticAssert(!/Cenário/i.test(ROUNDS.map((r) => r.sideA.title + r.sideB.title).join(' ')), 'sem títulos Cenário');

{
  const order = shuffleDeckOrder();
  staticAssert(order.length === ROUNDS.length, 'shuffle mesmo tamanho');
  staticAssert(new Set(order).size === order.length, 'shuffle sem índices repetidos');
  staticAssert(order.every((i) => i >= 0 && i < ROUNDS.length), 'shuffle índices válidos');
  const mapped = getRoundByIndex(0, order);
  staticAssert(Boolean(mapped?.id), 'getRoundByIndex com deckOrder');
  staticAssert(mapped.id === ROUNDS[order[0]].id, 'deckOrder resolve rodada correta');
}

// --- anti-spoiler unitário ---
const { public: pub, secret } = splitRoundPayload(ROUNDS[0]);
staticAssert(pub.sideA?.title && !pub.sideA.rating, 'public side sem rating');
staticAssert(secret.correctSide === 'A' && secret.ratingA === '18', 'secret tem rating');

const votingPayload = buildPublicSnapshotPayload({
  room: { phase: 'voting', current_round_index: 0, state_version: 3, deck_id: DECK_ID, code: 'TEST1', settings: {} },
  roundRow: { payload_public: pub, payload_secret: secret, phase: 'voting' },
  tallies: { A: 2, B: 1 },
  votersCount: 3,
  membersCount: 5,
});
staticAssert(assertNoSecrets(votingPayload), 'snapshot voting sem secrets');
staticAssert(votingPayload.tallies.A === 2, 'tallies no snapshot');
staticAssert(votingPayload.correctSide == null, 'correctSide ausente pré-reveal');

const revealedPayload = buildPublicSnapshotPayload({
  room: { phase: 'revealed', current_round_index: 0, state_version: 4, deck_id: DECK_ID, code: 'TEST1', settings: {} },
  roundRow: { payload_public: pub, payload_secret: secret, phase: 'revealed' },
  tallies: { A: 2, B: 1 },
  votersCount: 3,
  membersCount: 5,
});
staticAssert(revealedPayload.correctSide === 'A', 'reveal inclui correctSide');
staticAssert(revealedPayload.ratingA === '18', 'reveal inclui ratingA');
staticAssert(Boolean(revealedPayload.rationale), 'reveal inclui rationale');

// --- handler sem sessão ---
{
  const res = await call('createRoom', { token: 'invalid-token' });
  staticAssert(res.statusCode === 401, `createRoom sem sessão → 401 (foi ${res.statusCode})`);
}

{
  const res = mockRes();
  await classindHandler({ method: 'GET', body: {} }, res);
  staticAssert(res.statusCode === 405, `GET → 405 (foi ${res.statusCode})`);
}

// --- integração opcional ---
async function integration() {
  const adminToken = process.env.CLASSIND_SMOKE_ADMIN_TOKEN;
  const studentToken = process.env.CLASSIND_SMOKE_STUDENT_TOKEN;
  if (!adminToken || !supabase) {
    console.log('[classind-api] Integração DB pulada (defina CLASSIND_SMOKE_ADMIN_TOKEN para exercitar create→reveal).');
    return;
  }

  const { error: probe } = await supabase.from('classind_rooms').select('id').limit(1);
  if (probe && /does not exist|schema cache|Could not find the table/i.test(probe.message || '')) {
    console.warn('[classind-api] WARN: tabelas ausentes — rode a migration Task 2.');
    return;
  }

  const created = await call('createRoom', { token: adminToken });
  if (created.statusCode === 503) {
    console.warn('[classind-api] WARN:', created.body?.error);
    return;
  }
  staticAssert(created.statusCode === 200 && created.body?.ok, `createRoom ok (status ${created.statusCode})`);
  staticAssert(Boolean(created.body?.code), 'createRoom devolve code');
  staticAssert(
    created.body?.realtime == null || Boolean(created.body?.realtime?.anonKey),
    'realtime null ou com anonKey'
  );

  const roomId = created.body.roomId;
  const code = created.body.code;

  if (studentToken) {
    const joined = await call('joinRoom', { token: studentToken, code });
    staticAssert(joined.statusCode === 200 && joined.body?.ok, 'joinRoom aluno');
  }

  const started = await call('startRound', { token: adminToken, roomId, roundIndex: 0 });
  staticAssert(started.statusCode === 200 && started.body?.state?.phase === 'voting', 'startRound → voting');
  staticAssert(assertNoSecrets(started.body.state), 'state pré-reveal sem secrets');
  staticAssert(started.body.state.canVote === false, 'admin canVote false no state');

  const adminVote = await call('castVote', { token: adminToken, roomId, choice: 'A' });
  staticAssert(adminVote.statusCode === 403, 'admin castVote → 403');

  if (studentToken) {
    const voted = await call('castVote', { token: studentToken, roomId, choice: 'A' });
    staticAssert(voted.statusCode === 200 && voted.body?.myVote === 'A', 'castVote A (aluno)');
    staticAssert(assertNoSecrets(voted.body.state), 'state pós-voto sem secrets');
    staticAssert((voted.body.state.tallies?.A || 0) >= 1, 'tally A incrementou');
    staticAssert(typeof voted.body.state.scoreCorrect === 'number', 'scoreCorrect no state');

    const dup = await call('castVote', { token: studentToken, roomId, choice: 'B' });
    staticAssert(dup.statusCode === 409, 'segundo voto → 409');

    const revealed = await call('reveal', { token: adminToken, roomId });
    staticAssert(revealed.statusCode === 200 && revealed.body?.state?.phase === 'revealed', 'reveal');
    staticAssert(revealed.body.state.correctSide === 'A', 'reveal correctSide A');
    staticAssert(Boolean(revealed.body.state.rationale), 'reveal rationale');

    const next = await call('nextRound', { token: adminToken, roomId });
    staticAssert(next.statusCode === 200 && next.body?.state?.phase === 'voting', 'nextRound → voting');
    staticAssert(next.body.state.roundIndex === 1, 'roundIndex 1');
    staticAssert(next.body.myVote == null || next.body.state?.myVote == null, 'myVote limpo na 2ª rodada');
    staticAssert(assertNoSecrets(next.body.state), 'próxima rodada sem secrets');
  } else {
    console.log('[classind-api] Sem CLASSIND_SMOKE_STUDENT_TOKEN — voto/reveal de aluno pulados (admin-403 ok).');
  }

  const closed = await call('closeRoom', { token: adminToken, roomId });
  staticAssert(closed.statusCode === 200 && closed.body?.ok, 'closeRoom ok');
}

await integration();

if (errors.length) {
  console.error('classind-api-smoke FALHOU:');
  errors.forEach((e) => console.error(` - ${e}`));
  process.exit(1);
}

console.log('classind-api-smoke OK');
