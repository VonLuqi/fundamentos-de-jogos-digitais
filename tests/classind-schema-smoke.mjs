/**
 * Smoke Task 2 — Schema ClassInd-dle
 * (docs/plano-aula5-classind-iarc.md)
 *
 * Valida migration + espelho em setup.sql (estático).
 * Se Supabase estiver configurado, verifica presença das tabelas.
 *
 * Uso: node tests/classind-schema-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import supabase from '../api/supabaseClient.js';

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

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const MIGRATE = 'db/migrate-2026-09-21-classind-dle.sql';
const SETUP = 'db/setup.sql';

const requiredFiles = [MIGRATE, SETUP];
requiredFiles.forEach((rel) => {
  staticAssert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const migrate = read(MIGRATE);
const setup = read(SETUP);

const tables = [
  'classind_rooms',
  'classind_rounds',
  'classind_votes',
  'classind_members',
  'classind_live_snapshots',
];

for (const table of tables) {
  const re = new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`);
  staticAssert(re.test(migrate), `migration cria ${table}`);
  staticAssert(re.test(setup), `setup.sql espelha ${table}`);
}

staticAssert(/host_user_id integer NOT NULL REFERENCES users\(id\)/.test(migrate), 'rooms usa users.id integer');
staticAssert(!/REFERENCES\s+auth\.users/i.test(migrate), 'migration não referencia auth.users');
staticAssert(/payload_secret jsonb/.test(migrate), 'rounds tem payload_secret');
staticAssert(/payload_public jsonb/.test(migrate), 'rounds tem payload_public');
staticAssert(/UNIQUE \(round_id, user_id\)/.test(migrate) || /classind_votes_round_user_uidx UNIQUE \(round_id, user_id\)/.test(migrate), 'votes unique round+user');
staticAssert(/PRIMARY KEY \(room_id, user_id\)/.test(migrate), 'members PK composta');
staticAssert(/classind_rooms_code_uidx/.test(migrate), 'índice único code');
staticAssert(/'results'/.test(migrate) && /'ranking'/.test(migrate), 'phase CHECK inclui results/ranking');
staticAssert(
  fs.existsSync(path.join(root, 'db/migrate-2026-09-21-classind-dle-results-ranking.sql')),
  'migration alter phase results/ranking presente'
);
staticAssert(
  /'results'/.test(read('db/migrate-2026-09-21-classind-dle-results-ranking.sql')),
  'migration alter lista results'
);
staticAssert(/classind_votes_round_idx/.test(migrate), 'índice votes(round_id)');
staticAssert(/classind_rounds_room_idx/.test(migrate), 'índice rounds(room_id, round_index)');
staticAssert(/classind_members_room_idx/.test(migrate), 'índice members(room_id)');

staticAssert(/ENABLE ROW LEVEL SECURITY/.test(migrate), 'migration liga RLS');
staticAssert(/classind_live_snapshots_select_public/.test(migrate), 'policy SELECT no snapshot');
staticAssert(/TO anon, authenticated/.test(migrate), 'policy liberada a anon+authenticated');
staticAssert(/FOR SELECT/.test(migrate), 'policy é só SELECT');
staticAssert(/ALTER PUBLICATION supabase_realtime ADD TABLE classind_live_snapshots/.test(migrate), 'adiciona snapshot à publication');
staticAssert(/REPLICA IDENTITY FULL/.test(migrate), 'replica identity FULL no snapshot');

const policyMatches = migrate.match(/CREATE POLICY/gi) || [];
staticAssert(policyMatches.length === 1, 'só uma CREATE POLICY (snapshot SELECT)');
staticAssert(!/CREATE POLICY[\s\S]*FOR (INSERT|UPDATE|DELETE)/i.test(migrate), 'sem policy de write para anon');

for (const table of ['classind_rooms', 'classind_rounds', 'classind_votes', 'classind_members']) {
  staticAssert(
    new RegExp(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`).test(migrate),
    `RLS ligado em ${table}`
  );
}

async function checkRemote() {
  if (!supabase) {
    console.log('[classind-schema] Supabase offline — smoke estático ok; pule check remoto.');
    return;
  }

  const pending = [];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error && /does not exist|schema cache|Could not find the table/i.test(error.message || '')) {
      pending.push(table);
    } else if (error && !/permission|RLS|row-level|JWT|API key/i.test(error.message || '')) {
      errors.push(`Falha ao inspecionar ${table}: ${error.message}`);
    }
  }

  if (pending.length) {
    console.warn(
      `[classind-schema] WARN: tabelas ainda não migradas no Supabase (${pending.join(', ')}).`
    );
    console.warn(`[classind-schema] Rode ${MIGRATE} no SQL Editor — ver docs/nota-deploy-classind-dle.md`);
  } else {
    console.log('[classind-schema] Supabase: tabelas ClassInd-dle presentes.');
  }
}

await checkRemote();

if (errors.length) {
  console.error('classind-schema-smoke FALHOU:');
  errors.forEach((e) => console.error(` - ${e}`));
  process.exit(1);
}

console.log('classind-schema-smoke OK');
