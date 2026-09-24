#!/usr/bin/env node
/**
 * Recorrige MC de tentativas com o gabarito canônico (único).
 * Corrige o caso em que TCG01 viu a prova canônica mas foi gradado com
 * o gabarito variante (todas MC 0/12).
 *
 * Uso:
 *   node scripts/regrade-prova-mc.mjs
 *   node scripts/regrade-prova-mc.mjs --turma TCG01
 *   node scripts/regrade-prova-mc.mjs --dry-run
 *
 * Lê DATABASE_URL ou POSTGRES_URL_NON_POOLING / POSTGRES_URL de .env.local.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
import { buildMcGradeUpdates } from '../api/_lib/prova/attempt-dto.js';
import { EXAM_ID } from '../api/_lib/prova/questions-modulo1.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env.local') });
dotenv.config({ path: path.join(ROOT, '.env') });

function resolveDatabaseUrl() {
  const raw = process.env.DATABASE_URL
    || process.env.POSTGRES_URL_NON_POOLING
    || process.env.POSTGRES_URL
    || '';
  return String(raw).trim().replace(/^['"]|['"]$/g, '');
}

function createClient(connectionString) {
  let url = String(connectionString || '').trim();
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('sslmode');
    parsed.searchParams.delete('uselibpqcompat');
    url = parsed.toString();
  } catch {
    /* keep raw */
  }
  return new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
}

function parseArgs(argv) {
  const out = { turma: null, dryRun: false, examId: EXAM_ID };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--turma') out.turma = String(argv[++i] || '').toUpperCase() || null;
    else if (a === '--exam') out.examId = String(argv[++i] || EXAM_ID);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    console.error('DATABASE_URL / POSTGRES_URL ausente em .env.local');
    process.exit(1);
  }

  const client = createClient(databaseUrl);
  await client.connect();

  try {
    const params = [args.examId];
    let sql = `
      SELECT a.id, a.status, a.mc_score, a.discursive_score, a.final_score, u.turma, u.full_name, u.username
      FROM prova_attempts a
      JOIN users u ON u.id = a.user_id
      WHERE a.exam_id = $1
        AND a.status IN ('submitted', 'timed_out', 'graded')
    `;
    if (args.turma) {
      params.push(args.turma);
      sql += ` AND u.turma = $2`;
    }
    sql += ' ORDER BY a.submitted_at NULLS LAST, a.updated_at';

    const { rows: attempts } = await client.query(sql, params);
    console.log(`Tentativas: ${attempts.length}${args.turma ? ` (turma ${args.turma})` : ''}${args.dryRun ? ' [dry-run]' : ''}`);

    let changed = 0;
    for (const att of attempts) {
      const { rows: answers } = await client.query(
        `SELECT question_id, choice, text_answer, is_correct, points_awarded
         FROM prova_answers WHERE attempt_id = $1`,
        [att.id],
      );
      const { mcScore, updates } = buildMcGradeUpdates(answers);
      const oldMc = att.mc_score == null ? null : Number(att.mc_score);
      if (oldMc === mcScore) {
        // still refresh per-question flags if any diverge
        const needsRowFix = updates.some((u) => {
          const row = answers.find((a) => a.question_id === u.questionId);
          if (!row) return u.choice != null || u.isCorrect;
          const wasCorrect = row.is_correct == null ? null : Boolean(row.is_correct);
          const pts = row.points_awarded == null ? null : Number(row.points_awarded);
          return wasCorrect !== u.isCorrect || pts !== u.pointsAwarded;
        });
        if (!needsRowFix) continue;
      }

      const disc = att.discursive_score == null ? null : Number(att.discursive_score);
      const nextFinal = att.status === 'graded' && disc != null
        ? Math.round((mcScore + disc) * 100) / 100
        : att.final_score;

      console.log(
        `  ${att.username || att.id} (${att.turma}) ${oldMc ?? '—'} → ${mcScore}/12`
        + (att.status === 'graded' && nextFinal != att.final_score
          ? ` · final ${att.final_score} → ${nextFinal}`
          : ''),
      );

      if (args.dryRun) {
        changed += 1;
        continue;
      }

      await client.query('BEGIN');
      try {
        for (const u of updates) {
          const existing = answers.find((a) => a.question_id === u.questionId);
          if (existing) {
            await client.query(
              `UPDATE prova_answers
               SET is_correct = $1, points_awarded = $2, updated_at = now()
               WHERE attempt_id = $3 AND question_id = $4`,
              [u.isCorrect, u.pointsAwarded, att.id, u.questionId],
            );
          } else if (u.questionId) {
            // MC sem linha: cria só se houver escolha no update (em branco = false/0)
            await client.query(
              `INSERT INTO prova_answers (attempt_id, question_id, choice, text_answer, is_correct, points_awarded, updated_at)
               VALUES ($1, $2, NULL, '', $3, $4, now())
               ON CONFLICT (attempt_id, question_id) DO UPDATE
               SET is_correct = EXCLUDED.is_correct, points_awarded = EXCLUDED.points_awarded, updated_at = now()`,
              [att.id, u.questionId, u.isCorrect, u.pointsAwarded],
            );
          }
        }

        await client.query(
          `UPDATE prova_attempts
           SET mc_score = $1,
               final_score = COALESCE($2, final_score),
               updated_at = now()
           WHERE id = $3`,
          [mcScore, att.status === 'graded' ? nextFinal : null, att.id],
        );
        await client.query('COMMIT');
        changed += 1;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    console.log(args.dryRun
      ? `Dry-run: ${changed} tentativa(s) mudariam.`
      : `Pronto. ${changed} tentativa(s) recorrigida(s).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
