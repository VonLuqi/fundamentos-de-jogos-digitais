import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import supabase from './supabaseClient.js';
import {
  PURPOSE,
  dispatchEmailVerification,
  dispatchPasswordReset,
  findValidEmailToken,
  invalidateOpenTokens,
  isValidEmail,
  markTokenUsed,
  normalizeEmail,
  requestIp,
} from './_lib/auth-email.js';

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
  const { password_hash, password, conquistas, ...safe } = u;
  const displayName = safe.full_name ?? safe.name ?? safe.username;
  return {
    ...safe,
    name: displayName,
    fullName: safe.full_name ?? safe.name ?? safe.username,
    username: safe.username ?? displayName,
    email: safe.email ?? null,
    emailVerifiedAt: safe.email_verified_at ?? null,
    // Contrato da API: o front-end recebe `achievements`; no banco a
    // coluna real chama-se `conquistas` (schema de produção).
    achievements: Array.isArray(conquistas) ? conquistas : [],
  };
}

async function loadUserBySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const { data: session } = await supabase
    .from('sessions')
    .select('user_id')
    .eq('token', token)
    .limit(1)
    .maybeSingle();
  if (!session?.user_id) return null;
  const { data: user } = await supabase
    .from(USERS_TABLE)
    .select('*')
    .eq('id', session.user_id)
    .limit(1)
    .maybeSingle();
  return user || null;
}

async function emailTakenByOther(email, userId) {
  let query = supabase.from(USERS_TABLE).select('id').eq('email', email);
  if (userId) query = query.neq('id', userId);
  const { data } = await query.limit(1).maybeSingle();
  return Boolean(data?.id);
}

export default async function handler(req, res) {
  try {
    if (!supabase) {
      return res.status(503).json({ ok: false, error: 'Autenticação offline: Supabase não configurado.' });
    }

    if (req.method === 'GET') {
      const token = req.query?.token;
      if (!token) return res.status(400).json({ ok: false, error: 'Token ausente.' });

      const { data: session, error: sessionLookup } = await supabase.from('sessions').select('token, user_id').eq('token', token).limit(1).single();
      console.log(`[api/auth] GET /api/auth token search:`, { token: token.substring(0, 10) + '...', sessionLookup: sessionLookup?.message || null, sessionExists: !!session, session });
      if (sessionLookup || !session) return res.status(401).json({ ok: false, error: 'Sessão inválida.' });

      const { data: user } = await supabase.from(USERS_TABLE).select('*').eq('id', session.user_id).limit(1).single();
      return res.status(200).json({ ok: true, user: sanitizeUser(user) });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ ok: false, error: 'Método não permitido.' });
    }

    const { action } = req.body || {};
    const ip = requestIp(req);

    if (action === 'register') {
      const { fullName, turma, username, password, email } = req.body;
      const normalizedEmail = normalizeEmail(email);
      const errors = [];
      if (!fullName || fullName.trim().length < 5) errors.push('Nome completo muito curto.');
      if (!['TCG01', 'TCG02'].includes(turma)) errors.push('Turma inválida.');
      if (!username || username.trim().length < 3) errors.push('Username muito curto.');
      if (!password || password.length < 4) errors.push('Senha muito curta.');
      if (!isValidEmail(normalizedEmail)) errors.push('E-mail inválido.');
      if (errors.length) return res.status(400).json({ ok: false, error: errors.join(' ') });

      const normalizedUsername = username.trim().toLowerCase();

      const { data: existing } = await supabase.from(USERS_TABLE).select('id').eq('username', normalizedUsername).limit(1).single();
      if (existing) return res.status(409).json({ ok: false, error: 'Usuário já existe.' });

      if (await emailTakenByOther(normalizedEmail)) {
        return res.status(409).json({ ok: false, error: 'Este e-mail já firma outro pacto.' });
      }

      const password_hash = hashPassword(password);
      const now = new Date().toISOString();
      const payload = {
        full_name: fullName.trim(),
        turma,
        username: normalizedUsername,
        email: normalizedEmail,
        email_verified_at: null,
        password_hash,
        role: 'student',
        xp: 0,
        conquistas: [],
        completed_lessons: [],
        redeemed_codes: [],
        avatar_index: 0,
        created_at: now,
      };

      const { data, error } = await supabase.from(USERS_TABLE).insert(payload).select('*').single();
      if (error) {
        if (error.code === '23505') {
          const emailClash = /email/i.test(error.message || '');
          return res.status(409).json({
            ok: false,
            error: emailClash ? 'Este e-mail já firma outro pacto.' : 'Usuário já existe.',
          });
        }
        return res.status(500).json({ ok: false, error: 'Erro ao criar usuário.' });
      }

      const token = crypto.randomBytes(24).toString('hex');
      const { error: registerSessionError } = await supabase
        .from('sessions')
        .insert({ token, user_id: data.id, created_at: new Date().toISOString() });

      if (registerSessionError) {
        console.error('[api/auth] falha ao criar sessão após registro:', registerSessionError);
        return res.status(500).json({ ok: false, error: 'Não foi possível criar a sessão agora. Tente novamente.' });
      }

      const dispatched = await dispatchEmailVerification({ supabase, user: data, ip });

      return res.status(201).json({
        ok: true,
        token,
        user: sanitizeUser(data),
        mailSent: Boolean(dispatched?.sent),
      });
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
      const { error: loginSessionError } = await supabase
        .from('sessions')
        .insert({ token, user_id: user.id, created_at: new Date().toISOString() });

      if (loginSessionError) {
        console.error('[api/auth] falha ao criar sessão após login:', loginSessionError);
        return res.status(500).json({ ok: false, error: 'Não foi possível iniciar a sessão agora. Tente novamente.' });
      }

      return res.status(200).json({ ok: true, token, user: sanitizeUser(user) });
    }

    if (action === 'logout') {
      const { token } = req.body;
      if (token) {
        await supabase.from('sessions').delete().eq('token', token);
      }
      return res.status(200).json({ ok: true });
    }

    if (action === 'requestEmailVerification') {
      const user = await loadUserBySessionToken(req.body?.token);
      if (!user) return res.status(401).json({ ok: false, error: 'Sessão inválida.' });
      let mailSent = false;
      if (user.role === 'student') {
        const dispatched = await dispatchEmailVerification({ supabase, user, ip });
        mailSent = Boolean(dispatched?.sent);
      }
      return res.status(200).json({ ok: true, mailSent });
    }

    if (action === 'bindEmail') {
      const user = await loadUserBySessionToken(req.body?.token);
      if (!user) return res.status(401).json({ ok: false, error: 'Sessão inválida.' });
      if (user.role !== 'student') {
        return res.status(403).json({ ok: false, error: 'Apenas alunos vinculam selo por este caminho.' });
      }

      const email = normalizeEmail(req.body?.email);
      if (!isValidEmail(email)) {
        return res.status(400).json({ ok: false, error: 'E-mail inválido.' });
      }

      if (await emailTakenByOther(email, user.id)) {
        return res.status(409).json({ ok: false, error: 'Este e-mail já firma outro pacto.' });
      }

      const alreadySameAndVerified = normalizeEmail(user.email) === email && user.email_verified_at;
      if (alreadySameAndVerified) {
        return res.status(200).json({ ok: true, email, emailVerifiedAt: user.email_verified_at });
      }

      const { data: updated, error } = await supabase
        .from(USERS_TABLE)
        .update({ email, email_verified_at: null })
        .eq('id', user.id)
        .select('*')
        .single();

      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({ ok: false, error: 'Este e-mail já firma outro pacto.' });
        }
        console.error('[api/auth] falha ao vincular e-mail', { userId: user.id, message: error.message });
        return res.status(500).json({ ok: false, error: 'Não foi possível vincular o e-mail agora.' });
      }

      const dispatched = await dispatchEmailVerification({ supabase, user: updated, ip });
      return res.status(200).json({
        ok: true,
        email,
        emailVerifiedAt: null,
        mailSent: Boolean(dispatched?.sent),
        user: sanitizeUser(updated),
      });
    }

    if (action === 'confirmEmail') {
      const row = await findValidEmailToken(supabase, req.body?.token, PURPOSE.verifyEmail);
      if (!row) {
        return res.status(400).json({
          ok: false,
          error: 'Este selo expirou ou já foi usado. Chame o Mensageiro de novo.',
        });
      }

      const { data: owner } = await supabase
        .from(USERS_TABLE)
        .select('id, email')
        .eq('id', row.user_id)
        .limit(1)
        .maybeSingle();

      if (!owner || normalizeEmail(owner.email) !== normalizeEmail(row.email)) {
        await markTokenUsed(supabase, row.id);
        return res.status(400).json({
          ok: false,
          error: 'Este selo expirou ou já foi usado. Chame o Mensageiro de novo.',
        });
      }

      const now = new Date().toISOString();
      const { data: updated, error } = await supabase
        .from(USERS_TABLE)
        .update({ email_verified_at: now })
        .eq('id', owner.id)
        .eq('email', owner.email)
        .select('*')
        .single();

      if (error || !updated) {
        console.error('[api/auth] falha ao confirmar e-mail', { userId: owner.id, message: error?.message });
        return res.status(500).json({ ok: false, error: 'Não foi possível confirmar o selo agora.' });
      }

      await markTokenUsed(supabase, row.id);
      await invalidateOpenTokens(supabase, owner.id, PURPOSE.verifyEmail);
      return res.status(200).json({ ok: true, email: updated.email, user: sanitizeUser(updated) });
    }

    if (action === 'requestPasswordReset') {
      const username = String(req.body?.username || '').trim().toLowerCase();
      const email = normalizeEmail(req.body?.email);

      if (username && isValidEmail(email)) {
        const { data: user } = await supabase
          .from(USERS_TABLE)
          .select('id, full_name, username, email, email_verified_at, role')
          .eq('email', email)
          .limit(1)
          .maybeSingle();

        const usernameMatches = String(user?.username || '').toLowerCase() === username;
        if (
          user
          && usernameMatches
          && user.role === 'student'
          && user.email_verified_at
        ) {
          await dispatchPasswordReset({ supabase, user, ip });
        }
      }

      return res.status(200).json({ ok: true });
    }

    if (action === 'confirmPasswordReset') {
      const password = req.body?.password;
      if (!password || String(password).length < 4) {
        return res.status(400).json({ ok: false, error: 'Senha muito curta.' });
      }

      const row = await findValidEmailToken(supabase, req.body?.token, PURPOSE.resetPassword);
      if (!row) {
        return res.status(400).json({
          ok: false,
          error: 'Este selo expirou ou já foi usado. Chame o Mensageiro de novo.',
        });
      }

      const { data: owner } = await supabase
        .from(USERS_TABLE)
        .select('id, email, email_verified_at, role')
        .eq('id', row.user_id)
        .limit(1)
        .maybeSingle();

      if (
        !owner
        || owner.role !== 'student'
        || !owner.email_verified_at
        || normalizeEmail(owner.email) !== normalizeEmail(row.email)
      ) {
        await markTokenUsed(supabase, row.id);
        return res.status(400).json({
          ok: false,
          error: 'Este selo expirou ou já foi usado. Chame o Mensageiro de novo.',
        });
      }

      const { error: updateError } = await supabase
        .from(USERS_TABLE)
        .update({
          password_hash: hashPassword(String(password)),
          password: null,
        })
        .eq('id', owner.id);

      if (updateError) {
        console.error('[api/auth] falha ao renovar Palavra', { userId: owner.id, message: updateError.message });
        return res.status(500).json({ ok: false, error: 'Não foi possível selar a nova Palavra agora.' });
      }

      const { error: sessionError } = await supabase
        .from('sessions')
        .delete()
        .eq('user_id', owner.id);

      if (sessionError) {
        console.error('[api/auth] falha ao invalidar sessões após reset', {
          userId: owner.id,
          message: sessionError.message,
        });
        return res.status(500).json({ ok: false, error: 'Não foi possível encerrar as sessões agora.' });
      }

      await markTokenUsed(supabase, row.id);
      await invalidateOpenTokens(supabase, owner.id, PURPOSE.resetPassword);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, error: 'Ação desconhecida.' });
  } catch (err) {
    console.error('[api/auth] erro', err);
    return res.status(500).json({ ok: false, error: 'Erro interno.' });
  }
}
