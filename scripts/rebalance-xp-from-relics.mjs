#!/usr/bin/env node
/**
 * Remove contas de lab do placar e recalcula XP dos alunos
 * a partir das relíquias (conquistas) + XP das aulas concluídas (Altar).
 *
 * Fórmula (paridade com redeem + awardAchievementIds):
 *   xp = Σ getAchievementXp(conquista) + Σ 30 por aula em completed_lessons
 *
 * Uso:
 *   node scripts/rebalance-xp-from-relics.mjs --dry-run
 *   node scripts/rebalance-xp-from-relics.mjs --apply
 *
 * Requer DATABASE_URL em .env.local.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
import { getAchievementXp } from '../js/game-catalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(ROOT, '.env.local') });
dotenv.config({ path: path.join(ROOT, '.env') });

const LESSON_XP = Object.freeze({
  aula1: 30,
  aula2: 30,
  aula3: 30,
  aula4: 30,
  aula5: 30,
  aula6: 30,
  aula7: 30,
});

/** Contas de laboratório que não devem aparecer no placar. */
const TEST_PATTERNS = [
  /teste\s+da\s+silva\s+sauro/i,
  /^load\s+aluno\s+\d+/i,
];

const flags = {
  apply: process.argv.includes('--apply'),
  help: process.argv.includes('--help') || process.argv.includes('-h'),
};

function expectedXp(user) {
  const conquistas = Array.isArray(user.conquistas) ? user.conquistas : [];
  const lessons = Array.isArray(user.completed_lessons) ? user.completed_lessons : [];
  const fromRelics = conquistas.reduce((sum, id) => sum + (getAchievementXp(id) || 0), 0);
  const fromLessons = [...new Set(lessons)].reduce((sum, id) => sum + (LESSON_XP[id] || 0), 0);
  return {
    fromRelics,
    fromLessons,
    total: fromRelics + fromLessons,
  };
}

function isTestAccount(user) {
  const name = String(user.full_name || '').trim();
  const username = String(user.username || '').trim();
  return TEST_PATTERNS.some((re) => re.test(name) || re.test(username));
}

function createClient(connectionString) {
  let url = String(connectionString || '').trim();
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('sslmode');
    parsed.searchParams.delete('uselibpqcompat');
    url = parsed.toString();
  } catch {
    // connection string não-URL
  }
  return new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
}

async function deleteTestUser(client, userId) {
  // actor_id tem ON DELETE RESTRICT — apaga auditoria de lab antes.
  await client.query('DELETE FROM admin_audit_events WHERE actor_id = $1', [userId]);
  await client.query(
    `DELETE FROM users WHERE id = $1 AND COALESCE(role, 'student') <> 'admin'`,
    [userId],
  );
}

async function main() {
  if (flags.help) {
    console.log('Uso: node scripts/rebalance-xp-from-relics.mjs [--dry-run|--apply]');
    process.exit(0);
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL ausente (.env.local).');
    process.exit(1);
  }

  const client = createClient(process.env.DATABASE_URL);
  await client.connect();

  try {
    const { rows } = await client.query(`
      SELECT id, full_name, username, turma, role, xp, conquistas, completed_lessons
      FROM users
      ORDER BY xp DESC NULLS LAST, id
    `);

    const students = rows.filter((u) => (u.role || 'student') !== 'admin');
    const tests = students.filter(isTestAccount);
    const toRebalance = students.filter((u) => !isTestAccount(u));

    console.log(`Modo: ${flags.apply ? 'APPLY' : 'DRY-RUN'}`);
    console.log(`Alunos: ${students.length} | testes: ${tests.length} | rebalance: ${toRebalance.length}`);

    if (tests.length === 0) {
      console.log('Nenhuma conta de teste encontrada.');
    } else {
      console.log('\n--- Remover dos placares ---');
      for (const u of tests) {
        console.log(`TEST id=${u.id} "${u.full_name}" turma=${u.turma} xp=${u.xp}`);
      }
    }

    console.log('\n--- Diferenças de XP (alunos reais) ---');
    const updates = [];
    for (const u of toRebalance) {
      const exp = expectedXp(u);
      const current = Math.max(0, Number(u.xp) || 0);
      if (current === exp.total) continue;
      updates.push({ id: u.id, name: u.full_name || u.username, before: current, after: exp.total, ...exp });
      console.log(
        `${String(u.id).padStart(4)}  ${(u.full_name || u.username || '').slice(0, 36).padEnd(36)}  ${String(current).padStart(5)} → ${String(exp.total).padStart(5)}  (reliq ${exp.fromRelics} + aulas ${exp.fromLessons})`,
      );
    }
    console.log(`Alunos com XP a corrigir: ${updates.length}/${toRebalance.length}`);

    if (!flags.apply) {
      console.log('\nDry-run ok. Rode com --apply para gravar.');
      return;
    }

    await client.query('BEGIN');

    for (const u of tests) {
      await deleteTestUser(client, u.id);
      console.log(`Deleted test user id=${u.id} "${u.full_name}"`);
    }

    for (const row of updates) {
      await client.query(
        `UPDATE users SET xp = $1 WHERE id = $2 AND COALESCE(role, 'student') <> 'admin'`,
        [row.after, row.id],
      );
    }

    await client.query('COMMIT');
    console.log(`\nAplicado: ${tests.length} teste(s) removido(s), ${updates.length} XP atualizado(s).`);
    console.log('Cache do placar expira em ~45s; atualize a página depois disso.');
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    console.error('Falha:', error.message || error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
