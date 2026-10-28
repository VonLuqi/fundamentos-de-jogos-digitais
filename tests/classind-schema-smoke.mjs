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
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let supabase = null;
const supabaseClient = path.join(root, 'api/supabaseClient.js');
if (fs.existsSync(supabaseClient)) {
  supabase = (await import(pathToFileURL(supabaseClient).href)).default;
}
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

staticAssert(/host_user_id INT NOT NULL/.test(migrate), 'rooms usa users.id integer');
staticAssert(/REFERENCES users \(id\)/.test(migrate), 'FK para users');
staticAssert(!/REFERENCES\s+auth\.users/i.test(migrate), 'migration não referencia auth.users');
staticAssert(/payload_secret JSON/.test(migrate), 'rounds tem payload_secret');
staticAssert(/payload_public JSON/.test(migrate), 'rounds tem payload_public');
staticAssert(/classind_votes_round_user_uidx \(round_id, user_id\)/.test(migrate), 'votes unique round+user');
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

staticAssert(/ENGINE=InnoDB/.test(migrate), 'tabelas InnoDB');
staticAssert(!/ENABLE ROW LEVEL SECURITY/.test(migrate), 'sem RLS no MySQL');
staticAssert(!/CREATE POLICY/i.test(migrate), 'sem policy');
staticAssert(!/REPLICA IDENTITY/i.test(migrate), 'sem replica identity');
staticAssert(!/supabase_realtime/.test(migrate), 'sem publication');

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
