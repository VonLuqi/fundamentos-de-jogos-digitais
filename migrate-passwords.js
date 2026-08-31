import 'dotenv/config';
import crypto from 'node:crypto';
import supabase from './api/supabaseClient.js';

function hashPassword(password, salt = crypto.randomBytes(12).toString('hex')) {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

async function migrate() {
  console.log('[migrate] iniciando migração de senhas em texto claro → password_hash');
  const { data: users, error } = await supabase.from('users').select('*').not('password', 'is', null);
  if (error) {
    console.error('[migrate] erro ao buscar usuários:', error);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log('[migrate] nenhum usuário com coluna `password` encontrada. Nada a migrar.');
    return;
  }

  for (const u of users) {
    try {
      if (!u.password) continue;
      if (u.password_hash && typeof u.password_hash === 'string' && u.password_hash.includes(':')) {
        console.log(`[migrate] usuário ${u.username} já possui password_hash — pulando`);
        continue;
      }

      const passwordHash = hashPassword(u.password);
      const { error: upErr } = await supabase.from('users').update({ password_hash: passwordHash, password: null }).eq('id', u.id);
      if (upErr) {
        console.error(`[migrate] erro ao atualizar usuário ${u.username}:`, upErr);
      } else {
        console.log(`[migrate] atualizado ${u.username} (id=${u.id})`);
      }
    } catch (e) {
      console.error('[migrate] exceção para usuário', u.username, e);
    }
  }

  console.log('[migrate] migração concluída. Recomenda-se verificar no Supabase e remover a coluna `password` posteriormente.');
}

migrate().catch((err) => {
  console.error('[migrate] falha', err);
  process.exit(1);
});
