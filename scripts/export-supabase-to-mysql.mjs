#!/usr/bin/env node
/**
 * =============================================================================
 * Extrator Supabase (PostgreSQL) -> MySQL/MariaDB (phpMyAdmin HostGator)
 * =============================================================================
 * Uso:
 *   npm run db:export-mysql
 *   node scripts/export-supabase-to-mysql.mjs [--out db/mysql/hostgator-full-import.sql] [--schema-only]
 *
 * Conecta no Supabase via:
 *   1. SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (PostgREST paginado), ou
 *   2. DATABASE_URL / DATABASE_URL_RUNTIME (PostgreSQL direto via pg).
 *
 * Gera um único arquivo .sql contendo:
 *   - Estrutura completa de tabelas (`db/mysql/schema.sql`)
 *   - Dados reais de todas as tabelas convertidos para MySQL (JSON, DATETIME(3) UTC, booleans)
 *   - Ajuste de AUTO_INCREMENT para preservar todos os IDs originais
 * =============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCHEMA_PATH = path.join(ROOT, 'db', 'mysql', 'schema.sql');
const DEFAULT_OUT_PATH = path.join(ROOT, 'db', 'mysql', 'hostgator-full-import.sql');

dotenv.config({ path: path.join(ROOT, '.env.local') });
dotenv.config({ path: path.join(ROOT, '.env') });

/**
 * Definição das tabelas na ordem topológica de chaves estrangeiras.
 */
export const EXPORT_TABLES = [
  {
    name: 'users',
    pk: 'id',
    autoIncrement: true,
    columns: [
      { name: 'id', type: 'int' },
      { name: 'full_name', type: 'string' },
      { name: 'turma', type: 'string' },
      { name: 'username', type: 'string' },
      { name: 'email', type: 'string' },
      { name: 'email_verified_at', type: 'datetime' },
      { name: 'password_hash', type: 'string' },
      { name: 'password', type: 'string' },
      { name: 'role', type: 'string' },
      { name: 'xp', type: 'int' },
      { name: 'conquistas', type: 'json_array' },
      { name: 'completed_lessons', type: 'json_array' },
      { name: 'redeemed_codes', type: 'json_array' },
      { name: 'avatar_index', type: 'int' },
      { name: 'created_at', type: 'datetime' },
    ],
  },
  {
    name: 'sessions',
    pk: 'token',
    columns: [
      { name: 'token', type: 'string' },
      { name: 'user_id', type: 'int' },
      { name: 'created_at', type: 'datetime' },
      { name: 'expires_at', type: 'datetime' },
    ],
  },
  {
    name: 'auth_rate_events',
    pk: 'id',
    autoIncrement: true,
    columns: [
      { name: 'id', type: 'int' },
      { name: 'action', type: 'string' },
      { name: 'ip_hash', type: 'string' },
      { name: 'username_hash', type: 'string' },
      { name: 'created_at', type: 'datetime' },
    ],
  },
  {
    name: 'redeem_codes',
    pk: 'code',
    columns: [
      { name: 'code', type: 'string' },
      { name: 'lesson_id', type: 'string' },
      { name: 'lesson_title', type: 'string' },
      { name: 'xp', type: 'int' },
      { name: 'created_by', type: 'int' },
      { name: 'created_at', type: 'datetime' },
      { name: 'expires_at', type: 'datetime' },
      { name: 'single_use', type: 'bool' },
      { name: 'redeemed_by', type: 'int' },
      { name: 'redeemed_at', type: 'datetime' },
    ],
  },
  {
    name: 'lesson_gates',
    pk: 'lesson_id',
    columns: [
      { name: 'lesson_id', type: 'string' },
      { name: 'gate_key', type: 'string' },
      { name: 'released', type: 'bool' },
      { name: 'released_by', type: 'int' },
      { name: 'released_at', type: 'datetime' },
      { name: 'updated_at', type: 'datetime' },
      { name: 'meta', type: 'json_object' },
    ],
  },
  {
    name: 'lesson_paragraphs',
    pk: 'user_id',
    columns: [
      { name: 'user_id', type: 'int' },
      { name: 'lesson_id', type: 'string' },
      { name: 'paragraph', type: 'string' },
      { name: 'created_at', type: 'datetime' },
      { name: 'updated_at', type: 'datetime' },
    ],
  },
  {
    name: 'lesson_views',
    pk: 'user_id',
    columns: [
      { name: 'user_id', type: 'int' },
      { name: 'lesson_id', type: 'string' },
      { name: 'first_viewed_at', type: 'datetime' },
      { name: 'last_viewed_at', type: 'datetime' },
      { name: 'view_count', type: 'int' },
    ],
  },
  {
    name: 'friendships',
    pk: 'id',
    autoIncrement: true,
    columns: [
      { name: 'id', type: 'int' },
      { name: 'requester_id', type: 'int' },
      { name: 'addressee_id', type: 'int' },
      { name: 'status', type: 'string' },
      { name: 'created_at', type: 'datetime' },
      { name: 'updated_at', type: 'datetime' },
    ],
  },
  {
    name: 'lesson_duos',
    pk: 'id',
    autoIncrement: true,
    columns: [
      { name: 'id', type: 'int' },
      { name: 'lesson_id', type: 'string' },
      { name: 'requester_id', type: 'int' },
      { name: 'addressee_id', type: 'int' },
      { name: 'status', type: 'string' },
      { name: 'requester_role', type: 'string' },
      { name: 'addressee_role', type: 'string' },
      { name: 'created_at', type: 'datetime' },
      { name: 'updated_at', type: 'datetime' },
    ],
  },
  {
    name: 'lesson_journals',
    pk: 'id',
    autoIncrement: true,
    columns: [
      { name: 'id', type: 'int' },
      { name: 'lesson_id', type: 'string' },
      { name: 'duo_id', type: 'int' },
      { name: 'owner_user_id', type: 'int' },
      { name: 'partner_user_id', type: 'int' },
      { name: 'body', type: 'string' },
      { name: 'revision', type: 'int' },
      { name: 'updated_by', type: 'int' },
      { name: 'created_at', type: 'datetime' },
      { name: 'updated_at', type: 'datetime' },
    ],
  },
  {
    name: 'user_notes',
    pk: 'id',
    autoIncrement: true,
    columns: [
      { name: 'id', type: 'int' },
      { name: 'user_id', type: 'int' },
      { name: 'title', type: 'string' },
      { name: 'body', type: 'string' },
      { name: 'pinned', type: 'bool' },
      { name: 'tags', type: 'json_array' },
      { name: 'lesson_id', type: 'string' },
      { name: 'cloned_from_note_id', type: 'int' },
      { name: 'created_at', type: 'datetime' },
      { name: 'updated_at', type: 'datetime' },
    ],
  },
  {
    name: 'user_note_shares',
    pk: 'note_id',
    columns: [
      { name: 'note_id', type: 'int' },
      { name: 'shared_with_user_id', type: 'int' },
      { name: 'created_at', type: 'datetime' },
    ],
  },
  {
    name: 'user_note_events',
    pk: 'id',
    autoIncrement: true,
    columns: [
      { name: 'id', type: 'int' },
      { name: 'note_id', type: 'int' },
      { name: 'actor_user_id', type: 'int' },
      { name: 'kind', type: 'string' },
      { name: 'created_at', type: 'datetime' },
      { name: 'read_at', type: 'datetime' },
    ],
  },
  {
    name: 'auth_email_tokens',
    pk: 'id',
    autoIncrement: true,
    columns: [
      { name: 'id', type: 'int' },
      { name: 'user_id', type: 'int' },
      { name: 'purpose', type: 'string' },
      { name: 'token_hash', type: 'string' },
      { name: 'email', type: 'string' },
      { name: 'requested_ip', type: 'string' },
      { name: 'expires_at', type: 'datetime' },
      { name: 'used_at', type: 'datetime' },
      { name: 'created_at', type: 'datetime' },
    ],
  },
  {
    name: 'admin_audit_events',
    pk: 'id',
    autoIncrement: true,
    columns: [
      { name: 'id', type: 'int' },
      { name: 'actor_id', type: 'int' },
      { name: 'target_user_id', type: 'int' },
      { name: 'action', type: 'string' },
      { name: 'payload', type: 'json_object' },
      { name: 'created_at', type: 'datetime' },
    ],
  },
  {
    name: 'site_settings',
    pk: 'key',
    columns: [
      { name: 'key', type: 'string' },
      { name: 'value_hash', type: 'string' },
      { name: 'rotated_at', type: 'datetime' },
      { name: 'rotated_by', type: 'int' },
    ],
  },
  {
    name: 'soul_recovery_codes',
    pk: 'id',
    autoIncrement: true,
    columns: [
      { name: 'id', type: 'int' },
      { name: 'user_id', type: 'int' },
      { name: 'code_hash', type: 'string' },
      { name: 'expires_at', type: 'datetime' },
      { name: 'used_at', type: 'datetime' },
      { name: 'created_by', type: 'int' },
      { name: 'created_at', type: 'datetime' },
    ],
  },
  {
    name: 'despertar_states',
    pk: 'user_id',
    columns: [
      { name: 'user_id', type: 'int' },
      { name: 'souls', type: 'decimal' },
      { name: 'obols', type: 'decimal' },
      { name: 'mnemosyne', type: 'decimal' },
      { name: 'lifetime_souls', type: 'decimal' },
      { name: 'run_souls', type: 'decimal' },
      { name: 'prestige_count', type: 'int' },
      { name: 'generators_state', type: 'json_object' },
      { name: 'shiny_counts', type: 'json_object' },
      { name: 'gold_counts', type: 'json_object' },
      { name: 'upgrades_state', type: 'json_array' },
      { name: 'talents_state', type: 'json_array' },
      { name: 'edu_logs_seen', type: 'json_array' },
      { name: 'milestones', type: 'json_object' },
      { name: 'stats', type: 'json_object' },
      { name: 'verdicts', type: 'int' },
      { name: 'juizo_best_streak', type: 'int' },
      { name: 'juizo_current_streak', type: 'int' },
      { name: 'juizo_milestones_claimed', type: 'json_array' },
      { name: 'verdict_purchases', type: 'json_array' },
      { name: 'juizo_run', type: 'json_nullable' },
      { name: 'last_sync_at', type: 'datetime' },
      { name: 'created_at', type: 'datetime' },
      { name: 'updated_at', type: 'datetime' },
    ],
  },
  {
    name: 'classind_rooms',
    pk: 'id',
    columns: [
      { name: 'id', type: 'string' },
      { name: 'code', type: 'string' },
      { name: 'host_user_id', type: 'int' },
      { name: 'turma', type: 'string' },
      { name: 'phase', type: 'string' },
      { name: 'current_round_index', type: 'int' },
      { name: 'deck_id', type: 'string' },
      { name: 'state_version', type: 'int' },
      { name: 'settings', type: 'json_object' },
      { name: 'created_at', type: 'datetime' },
      { name: 'updated_at', type: 'datetime' },
    ],
  },
  {
    name: 'classind_rounds',
    pk: 'id',
    columns: [
      { name: 'id', type: 'string' },
      { name: 'room_id', type: 'string' },
      { name: 'round_index', type: 'int' },
      { name: 'payload_public', type: 'json_object' },
      { name: 'payload_secret', type: 'json_object' },
      { name: 'phase', type: 'string' },
      { name: 'revealed_at', type: 'datetime' },
      { name: 'created_at', type: 'datetime' },
    ],
  },
  {
    name: 'classind_votes',
    pk: 'id',
    columns: [
      { name: 'id', type: 'string' },
      { name: 'round_id', type: 'string' },
      { name: 'user_id', type: 'int' },
      { name: 'choice', type: 'string' },
      { name: 'created_at', type: 'datetime' },
    ],
  },
  {
    name: 'classind_members',
    pk: 'room_id',
    columns: [
      { name: 'room_id', type: 'string' },
      { name: 'user_id', type: 'int' },
      { name: 'joined_at', type: 'datetime' },
      { name: 'last_seen_at', type: 'datetime' },
    ],
  },
  {
    name: 'classind_live_snapshots',
    pk: 'room_id',
    columns: [
      { name: 'room_id', type: 'string' },
      { name: 'state_version', type: 'int' },
      { name: 'payload', type: 'json_object' },
      { name: 'updated_at', type: 'datetime' },
    ],
  },
  {
    name: 'prova_exams',
    pk: 'id',
    columns: [
      { name: 'id', type: 'string' },
      { name: 'title', type: 'string' },
      { name: 'duration_minutes', type: 'int' },
      { name: 'total_points', type: 'decimal' },
      { name: 'is_open', type: 'bool' },
      { name: 'open_turmas', type: 'json_array' },
      { name: 'opens_at', type: 'datetime' },
      { name: 'closes_at', type: 'datetime' },
      { name: 'created_at', type: 'datetime' },
      { name: 'updated_at', type: 'datetime' },
    ],
  },
  {
    name: 'prova_attempts',
    pk: 'id',
    columns: [
      { name: 'id', type: 'string' },
      { name: 'exam_id', type: 'string' },
      { name: 'user_id', type: 'int' },
      { name: 'status', type: 'string' },
      { name: 'started_at', type: 'datetime' },
      { name: 'ends_at', type: 'datetime' },
      { name: 'submitted_at', type: 'datetime' },
      { name: 'current_question_index', type: 'int' },
      { name: 'mc_score', type: 'decimal' },
      { name: 'discursive_score', type: 'decimal' },
      { name: 'final_score', type: 'decimal' },
      { name: 'graded_at', type: 'datetime' },
      { name: 'graded_by', type: 'int' },
      { name: 'admin_notes', type: 'string' },
      { name: 'integrity_summary', type: 'json_object' },
      { name: 'contest_status', type: 'string' },
      { name: 'contest_student_message', type: 'string' },
      { name: 'contest_admin_message', type: 'string' },
      { name: 'contested_at', type: 'datetime' },
      { name: 'contest_resolved_at', type: 'datetime' },
      { name: 'created_at', type: 'datetime' },
      { name: 'updated_at', type: 'datetime' },
    ],
  },
  {
    name: 'prova_answers',
    pk: 'attempt_id',
    columns: [
      { name: 'attempt_id', type: 'string' },
      { name: 'question_id', type: 'string' },
      { name: 'choice', type: 'string' },
      { name: 'text_answer', type: 'string' },
      { name: 'is_correct', type: 'bool_nullable' },
      { name: 'points_awarded', type: 'decimal' },
      { name: 'updated_at', type: 'datetime' },
    ],
  },
  {
    name: 'prova_integrity_events',
    pk: 'id',
    autoIncrement: true,
    columns: [
      { name: 'id', type: 'int' },
      { name: 'attempt_id', type: 'string' },
      { name: 'event_type', type: 'string' },
      { name: 'created_at', type: 'datetime' },
      { name: 'meta', type: 'json_object' },
    ],
  },
];

/**
 * Escapa uma string para literal SQL MySQL.
 */
export function sqlEscapeString(val) {
  if (val === null || val === undefined) return 'NULL';
  const str = String(val)
    .replace(/\\/g, '\\\\')
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\x1a/g, '\\Z');
  return `'${str}'`;
}

/**
 * Converte data ISO/Date para DATETIME(3) UTC ('YYYY-MM-DD HH:MM:SS.sss').
 */
export function toMysqlDatetime(val) {
  if (val === null || val === undefined || val === '') return 'NULL';
  const d = val instanceof Date ? val : new Date(String(val));
  if (Number.isNaN(d.getTime())) return 'NULL';
  const iso = d.toISOString(); // 2026-10-02T14:30:00.123Z
  return `'${iso.slice(0, 10)} ${iso.slice(11, 23)}'`;
}

/**
 * Formata valor de uma coluna para literal SQL MySQL de acordo com o tipo.
 */
export function formatColumnValue(raw, type) {
  if (type === 'json_array') {
    const arr = Array.isArray(raw) ? raw : [];
    return sqlEscapeString(JSON.stringify(arr));
  }
  if (type === 'json_object') {
    const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    return sqlEscapeString(JSON.stringify(obj));
  }
  if (type === 'json_nullable') {
    if (raw === null || raw === undefined) return 'NULL';
    return sqlEscapeString(JSON.stringify(raw));
  }
  if (type === 'bool') {
    return raw ? '1' : '0';
  }
  if (type === 'bool_nullable') {
    if (raw === null || raw === undefined) return 'NULL';
    return raw ? '1' : '0';
  }
  if (type === 'int') {
    if (raw === null || raw === undefined || raw === '') return 'NULL';
    const n = Number(raw);
    return Number.isFinite(n) ? String(Math.trunc(n)) : 'NULL';
  }
  if (type === 'decimal') {
    if (raw === null || raw === undefined || raw === '') return 'NULL';
    const s = String(raw).trim();
    if (!/^-?\d+(\.\d+)?$/.test(s)) {
      const n = Number(raw);
      return Number.isFinite(n) ? n.toFixed(2) : '0.00';
    }
    return s;
  }
  if (type === 'datetime') {
    return toMysqlDatetime(raw);
  }
  // string
  if (raw === null || raw === undefined) return 'NULL';
  return sqlEscapeString(String(raw));
}

/**
 * Gera bloco de INSERTs em lotes para uma tabela.
 */
export function buildTableInsertSql(tableDef, rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return `-- Tabela \`${tableDef.name}\`: 0 registros exportados\n`;
  }

  const colNames = tableDef.columns.map((c) => `\`${c.name}\``).join(', ');
  const updateCols = tableDef.columns
    .map((c) => `\`${c.name}\` = VALUES(\`${c.name}\`)`)
    .join(', ');

  const lines = [];
  lines.push(`-- -----------------------------------------------------------------------------`);
  lines.push(`-- Dados da tabela \`${tableDef.name}\` (${rows.length} registro(s))`);
  lines.push(`-- -----------------------------------------------------------------------------`);

  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const valuesList = chunk.map((row) => {
      const vals = tableDef.columns.map((col) => formatColumnValue(row[col.name], col.type));
      return `  (${vals.join(', ')})`;
    });
    lines.push(
      `INSERT INTO \`${tableDef.name}\` (${colNames}) VALUES\n${valuesList.join(',\n')}\nON DUPLICATE KEY UPDATE ${updateCols};\n`
    );
  }

  if (tableDef.autoIncrement) {
    let maxId = 0;
    for (const r of rows) {
      const id = Number(r[tableDef.pk]);
      if (Number.isFinite(id) && id > maxId) maxId = id;
    }
    if (maxId > 0) {
      lines.push(`ALTER TABLE \`${tableDef.name}\` AUTO_INCREMENT = ${maxId + 1};\n`);
    }
  }

  return lines.join('\n');
}

async function fetchAllViaSupabase(supabase, tableDef) {
  const pageSize = 1000;
  let offset = 0;
  const all = [];

  while (true) {
    let query = supabase
      .from(tableDef.name)
      .select('*')
      .range(offset, offset + pageSize - 1);

    if (tableDef.pk) {
      query = query.order(tableDef.pk, { ascending: true });
    }

    const { data, error } = await query;
    if (error) {
      const code = String(error.code || '');
      const msg = String(error.message || '');
      if (code === '42P01' || code === 'PGRST205' || /does not exist|schema cache/i.test(msg)) {
        console.warn(`  [WARN] Tabela ${tableDef.name} ausente no Supabase — pulando.`);
        return [];
      }
      throw new Error(`Falha ao ler ${tableDef.name} via Supabase: ${msg}`);
    }

    const batch = Array.isArray(data) ? data : [];
    all.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  return all;
}

async function fetchAllViaPg(pgClient, tableDef) {
  const existsRes = await pgClient.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
    [tableDef.name]
  );
  if (existsRes.rows.length === 0) {
    console.warn(`  [WARN] Tabela ${tableDef.name} ausente no PostgreSQL — pulando.`);
    return [];
  }

  const orderClause = tableDef.pk ? ` ORDER BY "${tableDef.pk}" ASC` : '';
  const res = await pgClient.query(`SELECT * FROM public."${tableDef.name}"${orderClause}`);
  return res.rows || [];
}

function parseCliArgs(argv) {
  let outPath = DEFAULT_OUT_PATH;
  let schemaOnly = false;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out' && argv[i + 1]) {
      outPath = path.resolve(ROOT, argv[i + 1]);
      i += 1;
    } else if (argv[i] === '--schema-only') {
      schemaOnly = true;
    }
  }
  return { outPath, schemaOnly };
}

async function main() {
  const { outPath, schemaOnly } = parseCliArgs(process.argv.slice(2));
  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');

  const supabaseUrl = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const supabaseKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '').trim();
  const dbUrl = String(process.env.DATABASE_URL || process.env.DATABASE_URL_RUNTIME || '').trim();

  const chunks = [
    `-- =============================================================================`,
    `-- DUMP COMPLETO PARA HOSTGATOR (MySQL / MariaDB via phpMyAdmin)`,
    `-- Gerado em: ${new Date().toISOString()}`,
    `-- =============================================================================\n`,
    schemaSql.replace(/SET FOREIGN_KEY_CHECKS = 1;\s*$/, ''),
    `\nSET FOREIGN_KEY_CHECKS = 0;\nSTART TRANSACTION;\n`,
  ];

  let exportedTables = 0;
  let exportedRows = 0;

  if (!schemaOnly && supabaseUrl && supabaseKey) {
    console.log('[export-mysql] Conectando ao Supabase via Service Role REST...');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    for (const tableDef of EXPORT_TABLES) {
      const rows = await fetchAllViaSupabase(supabase, tableDef);
      console.log(`  -> ${tableDef.name}: ${rows.length} registro(s)`);
      chunks.push(buildTableInsertSql(tableDef, rows));
      exportedTables += 1;
      exportedRows += rows.length;
    }
  } else if (!schemaOnly && dbUrl) {
    console.log('[export-mysql] Conectando ao PostgreSQL via DATABASE_URL...');
    let cleanUrl = dbUrl;
    try {
      const parsed = new URL(cleanUrl);
      parsed.searchParams.delete('sslmode');
      parsed.searchParams.delete('uselibpqcompat');
      cleanUrl = parsed.toString();
    } catch {
      // ignora
    }
    const pgClient = new pg.Client({
      connectionString: cleanUrl,
      ssl: { rejectUnauthorized: false },
    });
    await pgClient.connect();
    try {
      for (const tableDef of EXPORT_TABLES) {
        const rows = await fetchAllViaPg(pgClient, tableDef);
        console.log(`  -> ${tableDef.name}: ${rows.length} registro(s)`);
        chunks.push(buildTableInsertSql(tableDef, rows));
        exportedTables += 1;
        exportedRows += rows.length;
      }
    } finally {
      await pgClient.end().catch(() => {});
    }
  } else {
    console.warn(
      '[export-mysql] Credenciais do Supabase ausentes (ou --schema-only ativo). Gerando pacote com schema + seeds padrão.'
    );
  }

  chunks.push(`COMMIT;\nSET FOREIGN_KEY_CHECKS = 1;\n`);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, chunks.join('\n'), 'utf8');
  console.log(
    `[export-mysql] Arquivo gerado com sucesso em: ${path.relative(ROOT, outPath)} (${exportedTables} tabelas lidas, ${exportedRows} linhas exportadas)`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('[export-mysql] ERRO:', err?.message || err);
    process.exit(1);
  });
}
