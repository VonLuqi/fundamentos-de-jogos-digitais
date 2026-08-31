import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import supabase from './supabaseClient.js';

const USERS_TABLE = 'users';

function hashPassword(password, salt = crypto.randomBytes(12).toString('hex')) {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;

  if (stored.includes(':')) {
    const [salt] = stored.split(':');
    const candidate = hashPassword(password, salt);
    const a = Buffer.from(candidate);
    const b = Buffer.from(stored);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  if (/^\$2[aby]\$/.test(stored)) {
    try {
      return bcrypt.compareSync(password, stored);
    } catch {
      return false;
    }
  }

  return false;
}

function sanitizeUser(u) {
  if (!u) return null;
  const { password_hash, ...safe } = u;
  const displayName = safe.name ?? safe.username;
  return {
    ...safe,
    name: displayName,
    username: safe.username ?? displayName,
  };
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const token = req.query?.token;
      if (!token) return res.status(400).json({ ok: false, error: 'Token ausente.' });

      const { data: session, error: sessionError } = await supabase.from('sessions').select('token, user_id').eq('token', token).limit(1).single();
      console.log(`[api/auth] GET /api/auth token search:`, { token: token.substring(0, 10) + '...', sessionError, sessionExists: !!session, session });
      if (sessionError || !session) return res.status(401).json({ ok: false, error: 'Sessão inválida.' });

      const { data: user } = await supabase.from(USERS_TABLE).select('*').eq('id', session.user_id).limit(1).single();
      return res.status(200).json({ ok: true, user: sanitizeUser(user) });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ ok: false, error: 'Método não permitido.' });
    }

    const { action } = req.body || {};

    if (action === 'register') {
      const { username, password } = req.body;
      const errors = [];
      if (!username || username.trim().length < 2) errors.push('Nome muito curto.');
      if (!password || password.length < 4) errors.push('Senha muito curta.');
      if (errors.length) return res.status(400).json({ ok: false, error: errors.join(' ') });

      const { data: existing } = await supabase.from(USERS_TABLE).select('id').eq('username', username.trim().toLowerCase()).limit(1).single();
      if (existing) return res.status(409).json({ ok: false, error: 'Usuário já existe.' });

      const password_hash = hashPassword(password);
      const now = new Date().toISOString();
      const payload = {
        username: username.trim(),
        password_hash,
        role: 'student',
        xp: 0,
        achievements: [],
        completed_lessons: [],
        redeemed_codes: [],
        avatar_index: 0,
        created_at: now,
      };

      const { data, error } = await supabase.from(USERS_TABLE).insert(payload).select('*').single();
      if (error) return res.status(500).json({ ok: false, error: 'Erro ao criar usuário.' });

      const token = crypto.randomBytes(24).toString('hex');
      await supabase.from('sessions').insert({ token, user_id: data.id, created_at: new Date().toISOString() });

      return res.status(201).json({ ok: true, token, user: sanitizeUser(data) });
    }

    if (action === 'login') {
      const { username, password } = req.body;
      const { data: user } = await supabase.from(USERS_TABLE).select('*').ilike('username', username).limit(1).single();
      if (!user) return res.status(401).json({ ok: false, error: 'Credenciais inválidas.' });

      let valid = false;
      // primary check: hashed password
      if (user.password_hash && verifyPassword(password, user.password_hash)) {
        valid = true;
      }

      // fallback: legacy plaintext `password` column — migrate on successful match
      if (!valid && user.password && password === user.password) {
        try {
          const newHash = hashPassword(password);
          await supabase.from(USERS_TABLE).update({ password_hash: newHash, password: null }).eq('id', user.id);
          valid = true;
          console.log(`[api/auth] migrated plaintext password for user id=${user.id}`);
        } catch (e) {
          console.warn('[api/auth] migration failed for user', user.id, e);
        }
      }

      if (!valid) return res.status(401).json({ ok: false, error: 'Credenciais inválidas.' });

      const token = crypto.randomBytes(24).toString('hex');
      await supabase.from('sessions').insert({ token, user_id: user.id, created_at: new Date().toISOString() });

      return res.status(200).json({ ok: true, token, user: sanitizeUser(user) });
    }

    if (action === 'logout') {
      const { token } = req.body;
      if (token) {
        await supabase.from('sessions').delete().eq('token', token);
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, error: 'Ação desconhecida.' });
  } catch (err) {
    console.error('[api/auth] erro', err);
    return res.status(500).json({ ok: false, error: 'Erro interno.' });
  }
}
