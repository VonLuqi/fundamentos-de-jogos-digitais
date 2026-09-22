#!/usr/bin/env node
/**
 * Aplica db/migrate-*.sql com ledger `_schema_migrations` (Task 5).
 * docs/plano-ops-nav-email-perf-admin.md
 *
 * Uso:
 *   npm run db:migrate
 *   npm run db:migrate -- --dry-run
 *   npm run db:migrate -- --bootstrap      # banco zero: setup.sql + migrates
 *   npm run db:migrate -- --mark-applied   # baseline: marca todos como aplicados (sem SQL)
 *
 * Lê DATABASE_URL de .env.local / .env. Nunca imprime a connection string.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DB_DIR = path.join(ROOT, 'db');
const SETUP_FILE = 'setup.sql';
const LEDGER_TABLE = '_schema_migrations';

dotenv.config({ path: path.join(ROOT, '.env.local') });
dotenv.config({ path: path.join(ROOT, '.env') });

function printHelp() {
  console.log(`
Uso:
  node scripts/apply-migrations.mjs [opções]
  npm run db:migrate -- [opções]

Opções:
  --dry-run         Lista APPLY/SKIP sem escrever no banco
  --bootstrap       Em banco zero: aplica db/setup.sql e depois os migrates
  --mark-applied    Marca todos os migrate-*.sql como aplicados (sem executar)
  --help            Esta ajuda

Requer DATABASE_URL (Supabase Direct ou Pooler) em .env.local.
Nunca versionar a connection string. Faça backup antes de migrar produção.
`);
}

function parseArgs(argv) {
  const flags = {
    dryRun: false,
    bootstrap: false,
    markApplied: false,
    help: false,
  };
  for (const arg of argv) {
    if (arg === '--dry-run') flags.dryRun = true;
    else if (arg === '--bootstrap') flags.bootstrap = true;
    else if (arg === '--mark-applied') flags.markApplied = true;
    else if (arg === '--help' || arg === '-h') flags.help = true;
    else {
      console.error(`Flag desconhecida: ${arg}`);
      flags.help = true;
      flags.unknown = true;
    }
  }
  return flags;
}

/** Remove senha de URIs / mensagens de erro do pg. */
function redact(value) {
  return String(value || '')
    .replace(/(postgres(?:ql)?:\/\/[^:/\s]+:)[^@/\s]+(@)/gi, '$1***$2')
    .replace(/(password=)[^&\s]+/gi, '$1***');
}

function listMigrationFiles() {
  if (!fs.existsSync(DB_DIR)) {
    throw new Error(`Pasta db/ ausente em ${DB_DIR}`);
  }
  return fs
    .readdirSync(DB_DIR)
    .filter((name) => /^migrate-.+\.sql$/i.test(name))
    .sort((a, b) => a.localeCompare(b, 'en'));
}

function readSql(relName) {
  const full = path.join(DB_DIR, relName);
  if (!fs.existsSync(full)) {
    throw new Error(`Arquivo ausente: db/${relName}`);
  }
  return fs.readFileSync(full, 'utf8');
}

function requireDatabaseUrl() {
  const raw = String(process.env.DATABASE_URL || '').trim();
  if (!raw) {
    console.error('DATABASE_URL ausente. Defina em .env.local (Supabase → Database → URI).');
    process.exit(1);
  }
  return raw;
}

function createClient(connectionString) {
  // pg v8+ trata sslmode=require como verify-full; remova da URI e force TLS
  // com rejectUnauthorized:false (CA do Pooler/Direct do Supabase).
  let url = String(connectionString || '').trim();
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('sslmode');
    parsed.searchParams.delete('uselibpqcompat');
    url = parsed.toString();
  } catch {
    // connection string não-URL: segue com o valor bruto
  }
  return new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
}

async function ensureLedger(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${LEDGER_TABLE} (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function loadAppliedIds(client) {
  const { rows } = await client.query(`SELECT id FROM ${LEDGER_TABLE}`);
  return new Set(rows.map((row) => row.id));
}

async function applySqlFile(client, { id, sql, dryRun }) {
  if (dryRun) {
    console.log(`DRY  APPLY  ${id}`);
    return { applied: false, dry: true };
  }

  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query(
      `INSERT INTO ${LEDGER_TABLE} (id, applied_at) VALUES ($1, now())
       ON CONFLICT (id) DO NOTHING`,
      [id],
    );
    await client.query('COMMIT');
    console.log(`APPLY  ${id}`);
    return { applied: true };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`FAIL   ${id}`);
    console.error(`       ${redact(error.message || error)}`);
    throw error;
  }
}

async function markApplied(client, id, dryRun) {
  if (dryRun) {
    console.log(`DRY  MARK   ${id}`);
    return;
  }
  await client.query(
    `INSERT INTO ${LEDGER_TABLE} (id, applied_at) VALUES ($1, now())
     ON CONFLICT (id) DO NOTHING`,
    [id],
  );
  console.log(`MARK   ${id}`);
}

async function tableExists(client, name) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1
     LIMIT 1`,
    [name],
  );
  return rows.length > 0;
}

async function countUsers(client) {
  if (!(await tableExists(client, 'users'))) return 0;
  const { rows } = await client.query('SELECT count(*)::int AS n FROM users');
  return rows[0]?.n || 0;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) {
    printHelp();
    process.exit(flags.unknown ? 1 : 0);
  }

  if (flags.bootstrap && flags.markApplied) {
    console.error('Use --bootstrap OU --mark-applied, não os dois.');
    process.exit(1);
  }

  const files = listMigrationFiles();
  const connectionString = requireDatabaseUrl();
  const client = createClient(connectionString);

  let exitCode = 0;
  try {
    await client.connect();
    // Não logar host/user da URI — só confirma que conectou.
    console.log(flags.dryRun ? 'db:migrate (dry-run)' : 'db:migrate');
    console.log(`  migrates encontrados: ${files.length}`);

    if (!flags.dryRun) {
      await ensureLedger(client);
    } else {
      // Dry-run ainda precisa do ledger para listar SKIP vs APPLY.
      const hasLedger = await tableExists(client, LEDGER_TABLE);
      if (!hasLedger) {
        console.log(`  ledger ${LEDGER_TABLE}: (ainda não existe)`);
      }
    }

    const applied = flags.dryRun && !(await tableExists(client, LEDGER_TABLE))
      ? new Set()
      : await (async () => {
        if (flags.dryRun) {
          // Garante leitura mesmo se a tabela existir.
          try {
            return await loadAppliedIds(client);
          } catch {
            return new Set();
          }
        }
        return loadAppliedIds(client);
      })();

    if (flags.bootstrap) {
      const users = await countUsers(client);
      if (users > 0 && !flags.dryRun) {
        console.error(
          'Bootstrap recusado: a tabela users já tem dados. '
          + 'Use --mark-applied em bancos existentes, ou um banco vazio.',
        );
        process.exit(1);
      }
      if (users > 0 && flags.dryRun) {
        console.log('DRY  WARN   bootstrap em banco com users (seria recusado)');
      }

      const setupSql = readSql(SETUP_FILE);
      const setupId = SETUP_FILE;
      if (applied.has(setupId)) {
        console.log(`SKIP   ${setupId}`);
      } else {
        await applySqlFile(client, { id: setupId, sql: setupSql, dryRun: flags.dryRun });
        applied.add(setupId);
      }
    }

    if (flags.markApplied) {
      let marked = 0;
      for (const file of files) {
        if (applied.has(file)) {
          console.log(`SKIP   ${file}`);
          continue;
        }
        await markApplied(client, file, flags.dryRun);
        marked += 1;
      }
      console.log(flags.dryRun
        ? `Pronto (dry-run). ${marked} seriam marcados.`
        : `Pronto. ${marked} marcados como aplicados.`);
      return;
    }

    let appliedCount = 0;
    let skippedCount = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`SKIP   ${file}`);
        skippedCount += 1;
        continue;
      }
      const sql = readSql(file);
      await applySqlFile(client, { id: file, sql, dryRun: flags.dryRun });
      appliedCount += 1;
    }

    console.log(
      flags.dryRun
        ? `Pronto (dry-run). APPLY ${appliedCount} · SKIP ${skippedCount}`
        : `Pronto. APPLY ${appliedCount} · SKIP ${skippedCount}`,
    );
  } catch (error) {
    exitCode = 1;
    console.error('db:migrate falhou:', redact(error.message || error));
  } finally {
    await client.end().catch(() => {});
  }

  process.exit(exitCode);
}

main();
