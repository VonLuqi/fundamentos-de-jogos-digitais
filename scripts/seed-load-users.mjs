#!/usr/bin/env node
/**
 * Seed de alunos sintéticos + sessões para carga k6 (turma ~30).
 *
 *   node scripts/seed-load-users.mjs
 *   node scripts/seed-load-users.mjs --count 30 --turma TCG01
 *
 * Cria load_aluno_01…NN e grava tokens em docs/load-results/raw/turma-tokens.json
 * (não versionar). Senha: LOAD_PASSWORD ou LoadTest!30.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { createSessionRow } from '../api/_lib/sessions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env.local') });
dotenv.config({ path: path.join(ROOT, '.env') });

const scryptAsync = promisify(crypto.scrypt);
const SCRYPT_KEYLEN = 64;

function parseArgs(argv) {
  let count = 30;
  let turma = 'TCG01';
  let prefix = 'load_aluno_';
  let publishDespertar = true;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--count') count = Math.max(1, Number(argv[++i]) || 30);
    else if (argv[i] === '--turma') turma = String(argv[++i] || 'TCG01');
    else if (argv[i] === '--prefix') prefix = String(argv[++i] || 'load_aluno_');
    else if (argv[i] === '--no-publish') publishDespertar = false;
  }
  return { count, turma, prefix, publishDespertar };
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(12).toString('hex');
  const derived = (await scryptAsync(String(password), salt, SCRYPT_KEYLEN)).toString('hex');
  return `${salt}:${derived}`;
}

async function main() {
  const { count, turma, prefix, publishDespertar } = parseArgs(process.argv.slice(2));
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const password = process.env.LOAD_PASSWORD || 'LoadTest!30';

  if (!url || !key) {
    console.error('Faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em .env.local');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const passwordHash = await hashPassword(password);
  const tokens = [];
  const sealedAt = new Date().toISOString();

  for (let i = 1; i <= count; i += 1) {
    const username = `${prefix}${String(i).padStart(2, '0')}`;
    const fullName = `Load Aluno ${String(i).padStart(2, '0')}`;
    const email = `${username}@load.test.local`;
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    let userId = existing?.id;
    const patch = {
      password_hash: passwordHash,
      turma,
      role: 'student',
      full_name: fullName,
      email,
      email_verified_at: sealedAt,
    };
    if (userId) {
      const { error } = await supabase.from('users').update(patch).eq('id', userId);
      if (error) {
        console.error(`FAIL update ${username}:`, error.message);
        process.exit(1);
      }
    } else {
      const { data, error } = await supabase
        .from('users')
        .insert({
          ...patch,
          username,
          xp: Math.floor(Math.random() * 200),
          conquistas: [],
          completed_lessons: [],
          redeemed_codes: [],
          avatar_index: (i - 1) % 102,
        })
        .select('id')
        .single();
      if (error) {
        console.error(`FAIL insert ${username}:`, error.message);
        process.exit(1);
      }
      userId = data.id;
    }

    const session = await createSessionRow(supabase, userId);
    if (!session.token) {
      console.error(`FAIL session ${username}:`, session.error?.message || session.error);
      process.exit(1);
    }
    tokens.push({ vu: i, username, userId, token: session.token });
    if (i % 10 === 0 || i === count) console.log(`… ${i}/${count}`);
  }

  if (publishDespertar) {
    const { error: gateErr } = await supabase.from('lesson_gates').upsert(
      {
        lesson_id: 'despertar',
        gate_key: 'published',
        released: true,
        updated_at: sealedAt,
      },
      { onConflict: 'lesson_id,gate_key' },
    );
    if (gateErr) {
      console.error('FAIL publish despertar gate:', gateErr.message);
      process.exit(1);
    }
    console.log('Gate despertar/published = true (use --no-publish para pular)');
  }

  const outDir = path.join(ROOT, 'docs', 'load-results', 'raw');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'turma-tokens.json');
  fs.writeFileSync(outFile, JSON.stringify({
    createdAt: new Date().toISOString(),
    count: tokens.length,
    turma,
    prefix,
    publishDespertar,
    tokens,
  }, null, 2));

  console.log(`OK — ${tokens.length} users + sessions (selo) → ${path.relative(ROOT, outFile)}`);
  console.log('k6: LOAD_TOKENS_FILE=../../docs/load-results/raw/turma-tokens.json VUS=30');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
