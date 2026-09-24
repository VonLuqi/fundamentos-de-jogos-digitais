#!/usr/bin/env node
/**
 * Smoke vivo opcional — Prova Módulo 1 (Task E3)
 * Fluxo: open gate → start → save → submit → score → finalize → graded
 *
 * Pré-requisito: servidor no ar (`npm run dev`) + migration da prova aplicada.
 *
 * Uso:
 *   node scripts/smoke-prova.mjs
 *   node scripts/smoke-prova.mjs --base-url http://127.0.0.1:3000 --reset
 *   node scripts/smoke-prova.mjs --duration 2 --turma TCG01 --reset
 *
 * Credenciais (obrigatórias para rodar; sem elas → SKIP exit 0):
 *   PROVA_SMOKE_ADMIN_USER + PROVA_SMOKE_ADMIN_PASSWORD
 *   PROVA_SMOKE_STUDENT_USER + PROVA_SMOKE_STUDENT_PASSWORD
 *   — ou —
 *   PROVA_SMOKE_ADMIN_TOKEN / PROVA_SMOKE_STUDENT_TOKEN
 *
 * Opcional:
 *   PROVA_SMOKE_BASE_URL   (default http://127.0.0.1:3000)
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY  (para --reset / --duration)
 *
 * @see docs/checklist-prova-qa-manual.md
 * @see docs/plano-prova-modulo1-online.md (Task E3)
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { getMcAnswerKeyForTurma } from '../api/_lib/prova/questions-by-turma.js';
import { EXAM_ID, listDiscursiveQuestionIds } from '../api/_lib/prova/questions-modulo1.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env.local') });
dotenv.config({ path: path.join(ROOT, '.env') });

const EXAM = EXAM_ID || 'modulo1-provacao';

function parseArgs(argv) {
  const out = {
    baseUrl: process.env.PROVA_SMOKE_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:3000',
    turma: null,
    duration: null,
    reset: false,
    keepOpen: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--reset') out.reset = true;
    else if (a === '--keep-open') out.keepOpen = true;
    else if (a === '--base-url') out.baseUrl = String(argv[++i] || out.baseUrl).replace(/\/$/, '');
    else if (a === '--turma') out.turma = String(argv[++i] || '').toUpperCase();
    else if (a === '--duration') {
      const n = Number(argv[++i]);
      out.duration = Number.isFinite(n) && n > 0 ? Math.min(24 * 60, Math.floor(n)) : null;
    }
  }
  return out;
}

function printHelp() {
  console.log(`smoke-prova.mjs — start → save → submit → grade (opcional)

Uso:
  node scripts/smoke-prova.mjs [--base-url URL] [--turma TCG01|TCG02] [--reset] [--duration N] [--keep-open]

Env:
  PROVA_SMOKE_ADMIN_USER / PROVA_SMOKE_ADMIN_PASSWORD
  PROVA_SMOKE_STUDENT_USER / PROVA_SMOKE_STUDENT_PASSWORD
  (ou tokens PROVA_SMOKE_ADMIN_TOKEN / PROVA_SMOKE_STUDENT_TOKEN)

--reset / --duration exigem SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
Sem credenciais de login: exit 0 (SKIP).`);
}

async function postJson(baseUrl, route, body) {
  const url = `${baseUrl}${route}`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Falha de rede em ${url}: ${msg}. O servidor está no ar?`);
  }
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${route} HTTP ${res.status}: resposta não-JSON (${text.slice(0, 160)})`);
  }
  if (!res.ok || data?.ok === false) {
    const errMsg = data?.error || data?.message || `HTTP ${res.status}`;
    const e = new Error(`${route} → ${errMsg}`);
    e.status = res.status;
    e.data = data;
    throw e;
  }
  return data;
}

async function login(baseUrl, username, password) {
  const data = await postJson(baseUrl, '/api/auth', {
    action: 'login',
    username,
    password,
  });
  if (!data.token) throw new Error(`Login ${username}: sem token`);
  return { token: data.token, user: data.user };
}

async function prova(baseUrl, token, action, payload = {}) {
  return postJson(baseUrl, '/api/prova', { token, action, examId: EXAM, ...payload });
}

function serviceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function resetAttempt(supabase, userId) {
  const { data: attempt, error } = await supabase
    .from('prova_attempts')
    .select('id')
    .eq('exam_id', EXAM)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`reset: ler attempt — ${error.message}`);
  if (!attempt?.id) {
    console.log('  · reset: nenhuma tentativa anterior');
    return;
  }
  const id = attempt.id;
  await supabase.from('prova_integrity_events').delete().eq('attempt_id', id);
  await supabase.from('prova_answers').delete().eq('attempt_id', id);
  const { error: delErr } = await supabase.from('prova_attempts').delete().eq('id', id);
  if (delErr) throw new Error(`reset: delete attempt — ${delErr.message}`);
  console.log(`  · reset: tentativa ${id} apagada`);
}

async function setDuration(supabase, minutes) {
  const { data: before } = await supabase
    .from('prova_exams')
    .select('duration_minutes')
    .eq('id', EXAM)
    .maybeSingle();
  const prev = before?.duration_minutes != null ? Number(before.duration_minutes) : 90;
  const { error } = await supabase
    .from('prova_exams')
    .update({ duration_minutes: minutes, updated_at: new Date().toISOString() })
    .eq('id', EXAM);
  if (error) throw new Error(`duration: ${error.message}`);
  console.log(`  · duration_minutes: ${prev} → ${minutes}`);
  return prev;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const adminUser = process.env.PROVA_SMOKE_ADMIN_USER || process.env.SMOKE_ADMIN_USER;
  const adminPass = process.env.PROVA_SMOKE_ADMIN_PASSWORD || process.env.SMOKE_ADMIN_PASSWORD;
  const studentUser = process.env.PROVA_SMOKE_STUDENT_USER || process.env.SMOKE_STUDENT_USER;
  const studentPass = process.env.PROVA_SMOKE_STUDENT_PASSWORD || process.env.SMOKE_STUDENT_PASSWORD;
  let adminToken = process.env.PROVA_SMOKE_ADMIN_TOKEN || '';
  let studentToken = process.env.PROVA_SMOKE_STUDENT_TOKEN || '';

  const hasLogin = Boolean(adminUser && adminPass && studentUser && studentPass);
  const hasTokens = Boolean(adminToken && studentToken);

  if (!hasLogin && !hasTokens) {
    console.log('SKIP smoke-prova — sem credenciais.');
    console.log('Defina PROVA_SMOKE_ADMIN_USER/PASSWORD + PROVA_SMOKE_STUDENT_USER/PASSWORD');
    console.log('(ou *_TOKEN). Checklist humano: docs/checklist-prova-qa-manual.md');
    process.exit(0);
  }

  console.log(`smoke-prova → ${args.baseUrl} (exam=${EXAM})`);

  let student;
  let admin;
  if (hasTokens) {
    admin = { token: adminToken, user: null };
    student = { token: studentToken, user: null };
    console.log('  · auth: tokens via env');
  } else {
    admin = await login(args.baseUrl, adminUser, adminPass);
    student = await login(args.baseUrl, studentUser, studentPass);
    console.log(`  · auth: admin=${admin.user?.username || adminUser} student=${student.user?.username || studentUser}`);
  }

  if (admin.user && admin.user.role !== 'admin') {
    throw new Error('PROVA_SMOKE_ADMIN_* precisa ser role=admin');
  }

  const turma = (args.turma
    || student.user?.turma
    || process.env.PROVA_SMOKE_TURMA
    || 'TCG01').toUpperCase();
  if (turma !== 'TCG01' && turma !== 'TCG02') {
    throw new Error(`Turma inválida: ${turma}`);
  }

  const supabase = serviceClient();
  let previousDuration = null;

  try {
    if (args.duration != null) {
      if (!supabase) {
        throw new Error('--duration exige SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
      }
      previousDuration = await setDuration(supabase, args.duration);
    }

    if (args.reset) {
      if (!supabase) {
        throw new Error('--reset exige SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
      }
      let userId = student.user?.id;
      if (userId == null && studentUser) {
        const { data } = await supabase
          .from('users')
          .select('id')
          .ilike('username', studentUser)
          .maybeSingle();
        userId = data?.id;
      }
      if (userId == null) throw new Error('--reset: não achei user_id do aluno');
      await resetAttempt(supabase, userId);
    }

    // Gate: liberar só a turma do aluno
    await prova(args.baseUrl, admin.token, 'adminSetExamOpen', { mode: turma });
    console.log(`  · gate: liberado ${turma}`);
    const answerKey = getMcAnswerKeyForTurma(turma);

    const started = await prova(args.baseUrl, student.token, 'startAttempt');
    const attemptId = started.attempt?.id;
    if (!attemptId) throw new Error('startAttempt sem attempt.id');
    console.log(`  · start: ${attemptId} (resumed=${Boolean(started.resumed)})`);

    // save MC (gabarito q01) + uma discursiva
    await prova(args.baseUrl, student.token, 'saveAnswer', {
      questionId: 'q01',
      choice: answerKey.q01,
    });
    await prova(args.baseUrl, student.token, 'saveAnswer', {
      questionId: 'q02',
      choice: answerKey.q02,
    });
    await prova(args.baseUrl, student.token, 'saveAnswer', {
      questionId: 'q13',
      textAnswer: 'Smoke E3: círculo mágico = contrato de regras ao apertar Play.',
    });
    console.log('  · save: q01, q02, q13');

    // Integridade leve (não falha o fluxo)
    try {
      await prova(args.baseUrl, student.token, 'reportIntegrityEvent', {
        eventType: 'tab_blur',
        meta: { source: 'smoke-prova' },
      });
      console.log('  · integrity: tab_blur');
    } catch (err) {
      console.warn(`  · integrity (aviso): ${err.message}`);
    }

    const submitted = await prova(args.baseUrl, student.token, 'submitAttempt', {
      answers: [
        { questionId: 'q01', choice: answerKey.q01 },
        { questionId: 'q02', choice: answerKey.q02 },
        {
          questionId: 'q13',
          textAnswer: 'Smoke E3: círculo mágico = contrato de regras ao apertar Play.',
        },
      ],
    });
    if (!['submitted', 'timed_out'].includes(submitted.attempt?.status)) {
      throw new Error(`submit: status inesperado ${submitted.attempt?.status}`);
    }
    console.log(`  · submit: ${submitted.attempt.status}`);

    const discIds = listDiscursiveQuestionIds();
    const scores = discIds.map((questionId) => ({
      questionId,
      points: questionId === 'q13' ? 1 : 0,
      comment: questionId === 'q13' ? 'smoke ok' : '',
    }));
    await prova(args.baseUrl, admin.token, 'adminScoreDiscursive', {
      attemptId,
      scores,
      generalNote: 'smoke-prova E3',
    });
    console.log(`  · score: ${discIds.length} discursivas`);

    const finalized = await prova(args.baseUrl, admin.token, 'adminFinalizeGrade', {
      attemptId,
      allowPartial: false,
    });
    if (finalized.attempt?.status !== 'graded') {
      throw new Error(`finalize: status ${finalized.attempt?.status}`);
    }
    const finalScore = Number(finalized.attempt.finalScore);
    console.log(`  · finalize: finalScore=${finalScore}`);

    const studentView = await prova(args.baseUrl, student.token, 'getAttempt');
    if (studentView.attempt?.status !== 'graded') {
      throw new Error('aluno não vê status graded após finalize');
    }
    if (studentView.attempt.finalScore == null) {
      throw new Error('aluno sem finalScore após finalize');
    }
    // Gabarito não deve vazar no payload do aluno
    const raw = JSON.stringify(studentView);
    if (/correctChoice|MC_ANSWER_KEY|DISCURSIVE_RUBRICS/i.test(raw)) {
      throw new Error('LEAK de gabarito no getAttempt do aluno');
    }
    console.log(`  · aluno: graded ${studentView.attempt.finalScore}/20`);

    if (!args.keepOpen) {
      await prova(args.baseUrl, admin.token, 'adminSetExamOpen', { mode: 'closed' });
      console.log('  · gate: fechado');
    }

    console.log('OK smoke-prova (start → save → submit → grade)');
  } finally {
    if (previousDuration != null && supabase) {
      try {
        await setDuration(supabase, previousDuration);
        console.log(`  · duration restaurado: ${previousDuration}`);
      } catch (err) {
        console.warn(`  · aviso: não restaurou duration (${err.message})`);
      }
    }
  }
}

main().catch((err) => {
  console.error('FAIL smoke-prova:', err.message || err);
  if (err.data) console.error(JSON.stringify(err.data, null, 2));
  process.exit(1);
});
