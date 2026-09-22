import crypto from 'node:crypto';
import { promisify } from 'node:util';
import bcrypt from 'bcryptjs';
import supabase from './supabaseClient.js';
import {
  PURPOSE,
  dispatchEmailVerification,
  dispatchLegacyReset,
  dispatchPasswordReset,
  findValidEmailToken,
  invalidateOpenTokens,
  isValidEmail,
  markTokenUsed,
  normalizeEmail,
  requestIp,
} from './_lib/auth-email.js';
import {
  AUTH_RATE_LIMIT_MESSAGE,
  isAuthActionRateLimited,
  recordAuthRateEvent,
} from './_lib/auth-rate.js';
import {
  rotateRecoveryCodeRow,
  verifyRecoveryCode,
  generateRecoveryCodePlain,
} from './_lib/recovery-code.js';
import {
  createSessionRow,
  loadValidSession,
} from './_lib/sessions.js';
import { sanitizeUser } from './_lib/sanitize-user.js';
import { ADMIN_AUDIT_ACTIONS, recordAdminAudit } from './_lib/admin-audit.js';
import {
  createRequestMetrics,
  finishRequestMetrics,
  metricsAddScryptMs,
  metricsBumpDb,
  metricsSetAction,
  metricsSetRateLimitBackend,
  metricsSetStatus,
  runWithMetrics,
} from './_lib/request-metrics.js';

const USERS_TABLE = 'users';
/** Formato on-disk: `${saltHex12}:${derivedHex}` com keylen 64 (defaults Node N/r/p). */
const SCRYPT_KEYLEN = 64;
const scryptAsync = promisify(crypto.scrypt);

function maybeLogScryptMs(ms, op) {
  metricsAddScryptMs(ms);
  if (process.env.AUTH_LOG_SCRYPT === '1') {
    console.log(`[api/auth] scrypt_ms=${ms} op=${op}`);
  }
}

/**
 * @param {string} password
 * @param {string} [salt]
 * @returns {Promise<string>}
 */
export async function hashPassword(password, salt = crypto.randomBytes(12).toString('hex')) {
  const t0 = Date.now();
  const derived = (await scryptAsync(String(password), salt, SCRYPT_KEYLEN)).toString('hex');
  maybeLogScryptMs(Date.now() - t0, 'hash');
  return `${salt}:${derived}`;
}

/**
 * @param {string} password
 * @param {string} stored
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;

  if (stored.includes(':')) {
    const [salt] = stored.split(':');
    if (!salt) return false;
    const candidate = await hashPassword(password, salt);
    const a = Buffer.from(candidate);
    const b = Buffer.from(stored);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  if (/^\$2[aby]\$/.test(stored)) {
    try {
      const t0 = Date.now();
      const ok = await bcrypt.compare(String(password), stored);
      maybeLogScryptMs(Date.now() - t0, 'bcrypt');
      return ok;
    } catch {
      return false;
    }
  }

  return false;
}

async function loadUserBySessionToken(token) {
  const session = await loadValidSession(supabase, token);
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
  const metrics = createRequestMetrics({
    route: 'auth',
    action: req.method === 'GET' ? 'sessionGet' : String(req.body?.action || 'n/a'),
  });

  const origStatus = res.status.bind(res);
  res.status = (code) => {
    metricsSetStatus(code);
    return origStatus(code);
  };

  try {
    return await runWithMetrics(metrics, () => handleAuth(req, res));
  } finally {
    finishRequestMetrics(metrics, { status: metrics.status });
  }
}

async function handleAuth(req, res) {
  try {
    if (!supabase) {
      return res.status(503).json({ ok: false, error: 'Autenticação offline: Supabase não configurado.' });
    }

    if (req.method === 'GET') {
      metricsSetAction('sessionGet');
      const token = req.query?.token;
      if (!token) return res.status(400).json({ ok: false, error: 'Token ausente.' });

      const session = await loadValidSession(supabase, token);
      console.log(`[api/auth] GET /api/auth token search:`, {
        token: String(token).substring(0, 10) + '...',
        sessionExists: !!session,
      });
      if (!session) return res.status(401).json({ ok: false, error: 'Sessão inválida.' });

      const { data: user } = await supabase.from(USERS_TABLE).select('*').eq('id', session.user_id).limit(1).single();
      metricsBumpDb(1);
      return res.status(200).json({ ok: true, user: sanitizeUser(user) });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ ok: false, error: 'Método não permitido.' });
    }

    const { action } = req.body || {};
    metricsSetAction(action || 'n/a');
    const ip = requestIp(req);

    if (action === 'register') {
      const rate = await isAuthActionRateLimited(supabase, { action: 'register', ip });
      if (rate.limited) {
        return res.status(429).json({ ok: false, error: AUTH_RATE_LIMIT_MESSAGE });
      }
      await recordAuthRateEvent(supabase, { action: 'register', ip });

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

      const password_hash = await hashPassword(password);
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

      const { token, error: registerSessionError } = await createSessionRow(supabase, data.id);

      if (registerSessionError || !token) {
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
      const normalizedUsername = typeof username === 'string' ? username.trim().toLowerCase() : '';

      const rate = await isAuthActionRateLimited(supabase, {
        action: 'login',
        ip,
        username: normalizedUsername,
      });
      if (rate.limited) {
        metricsSetRateLimitBackend('db');
        return res.status(429).json({ ok: false, error: AUTH_RATE_LIMIT_MESSAGE });
      }
      metricsSetRateLimitBackend('db');
      await recordAuthRateEvent(supabase, {
        action: 'login',
        ip,
        username: normalizedUsername,
      });

      const { data: user } = await supabase.from(USERS_TABLE).select('*').ilike('username', username).limit(1).single();
      metricsBumpDb(1);
      if (!user) return res.status(401).json({ ok: false, error: 'Credenciais inválidas.' });

      let valid = false;
      // primary check: hashed password (scrypt ou bcrypt legado)
      if (user.password_hash && await verifyPassword(password, user.password_hash)) {
        valid = true;
        // bcrypt → scrypt on-success (mesmo formato do Domínio)
        if (/^\$2[aby]\$/.test(user.password_hash)) {
          try {
            const newHash = await hashPassword(password);
            await supabase.from(USERS_TABLE).update({ password_hash: newHash, password: null }).eq('id', user.id);
            console.log(`[api/auth] migrated bcrypt password for user id=${user.id}`);
          } catch (e) {
            console.warn('[api/auth] bcrypt→scrypt migration failed for user', user.id, e);
          }
        }
      }

      // fallback: legacy plaintext `password` column — migrate on successful match
      if (!valid && user.password && password === user.password) {
        try {
          const newHash = await hashPassword(password);
          await supabase.from(USERS_TABLE).update({ password_hash: newHash, password: null }).eq('id', user.id);
          valid = true;
          console.log(`[api/auth] migrated plaintext password for user id=${user.id}`);
        } catch (e) {
          console.warn('[api/auth] migration failed for user', user.id, e);
        }
      }

      if (!valid) return res.status(401).json({ ok: false, error: 'Credenciais inválidas.' });

      const { token, error: loginSessionError } = await createSessionRow(supabase, user.id);

      if (loginSessionError || !token) {
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

    // Task 4 — alma legada sem e-mail: username + Senha do Caronte + e-mail novo.
    // Sempre 200 genérico (não revela se username/código falharam).
    if (action === 'requestLegacyEmailBind') {
      const username = String(req.body?.username || '').trim().toLowerCase();
      const code = req.body?.code;
      const email = normalizeEmail(req.body?.email);

      const rate = await isAuthActionRateLimited(supabase, {
        action: 'legacy_bind',
        ip,
        username,
      });
      await recordAuthRateEvent(supabase, {
        action: 'legacy_bind',
        ip,
        username: username || null,
      });

      if (
        !rate.limited
        && username
        && isValidEmail(email)
      ) {
        const codeCheck = await verifyRecoveryCode(supabase, code);
        if (codeCheck.ok) {
          const { data: user } = await supabase
            .from(USERS_TABLE)
            .select('id, full_name, username, email, email_verified_at, role')
            .ilike('username', username)
            .limit(1)
            .maybeSingle();

          const usernameMatches = String(user?.username || '').toLowerCase() === username;
          const hasNoEmail = !String(user?.email || '').trim();
          const eligible = user
            && usernameMatches
            && user.role === 'student'
            && !user.email_verified_at
            && hasNoEmail;

          if (eligible && !(await emailTakenByOther(email, user.id))) {
            const { data: updated, error } = await supabase
              .from(USERS_TABLE)
              .update({ email, email_verified_at: null })
              .eq('id', user.id)
              .select('*')
              .single();

            if (!error && updated) {
              await dispatchLegacyReset({ supabase, user: updated, ip });
            } else if (error && error.code !== '23505') {
              console.error('[api/auth] falha no vínculo legado', {
                userId: user.id,
                message: error.message,
              });
            }
          }
        }
      }

      return res.status(200).json({ ok: true });
    }

    if (action === 'rotateRecoveryCode') {
      const admin = await loadUserBySessionToken(req.body?.token);
      if (!admin || admin.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Esta senda é só do Mestre.' });
      }

      const result = await rotateRecoveryCodeRow(supabase, admin.id);
      if (!result.ok) {
        return res.status(500).json({ ok: false, error: result.error || 'Falha ao rotacionar.' });
      }

      return res.status(200).json({
        ok: true,
        code: result.code,
        rotatedAt: result.rotatedAt,
      });
    }

    if (action === 'adminForceTempPassword') {
      const admin = await loadUserBySessionToken(req.body?.token);
      if (!admin || admin.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Esta senda é só do Mestre.' });
      }

      const targetId = Number(req.body?.targetUserId);
      if (!Number.isInteger(targetId) || targetId <= 0) {
        return res.status(400).json({ ok: false, error: 'Informe targetUserId.' });
      }

      const { data: target } = await supabase
        .from(USERS_TABLE)
        .select('id, role, username')
        .eq('id', targetId)
        .limit(1)
        .maybeSingle();

      if (!target) return res.status(404).json({ ok: false, error: 'Alma não encontrada.' });
      if (target.role === 'admin') {
        return res.status(400).json({ ok: false, error: 'Não se edita o Mestre por este caminho.' });
      }

      const tempPassword = generateRecoveryCodePlain();
      const { error: updateError } = await supabase
        .from(USERS_TABLE)
        .update({
          password_hash: await hashPassword(tempPassword),
          password: null,
        })
        .eq('id', target.id);

      if (updateError) {
        console.error('[api/auth] adminForceTempPassword', updateError.message);
        return res.status(500).json({ ok: false, error: 'Não foi possível gerar a Palavra temporária.' });
      }

      await supabase.from('sessions').delete().eq('user_id', target.id);

      await recordAdminAudit(supabase, {
        actorId: admin.id,
        targetUserId: target.id,
        action: ADMIN_AUDIT_ACTIONS.forceTempPassword,
        payload: { username: target.username },
      });

      return res.status(200).json({
        ok: true,
        tempPassword,
        username: target.username,
      });
    }

    if (action === 'confirmPasswordReset') {
      const password = req.body?.password;
      if (!password || String(password).length < 4) {
        return res.status(400).json({ ok: false, error: 'Senha muito curta.' });
      }

      const row = await findValidEmailToken(supabase, req.body?.token, [
        PURPOSE.resetPassword,
        PURPOSE.legacyReset,
      ]);
      if (!row) {
        return res.status(400).json({
          ok: false,
          error: 'Este selo expirou ou já foi usado. Chame o Mensageiro de novo.',
        });
      }

      const isLegacy = row.purpose === PURPOSE.legacyReset;

      const { data: owner } = await supabase
        .from(USERS_TABLE)
        .select('id, email, email_verified_at, role')
        .eq('id', row.user_id)
        .limit(1)
        .maybeSingle();

      const emailMatches = owner && normalizeEmail(owner.email) === normalizeEmail(row.email);
      const eligible = owner
        && owner.role === 'student'
        && emailMatches
        && (isLegacy ? true : Boolean(owner.email_verified_at));

      if (!eligible) {
        await markTokenUsed(supabase, row.id);
        return res.status(400).json({
          ok: false,
          error: 'Este selo expirou ou já foi usado. Chame o Mensageiro de novo.',
        });
      }

      const updates = {
        password_hash: await hashPassword(String(password)),
        password: null,
      };
      if (isLegacy) {
        updates.email_verified_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from(USERS_TABLE)
        .update(updates)
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
      await invalidateOpenTokens(supabase, owner.id, PURPOSE.legacyReset);
      if (isLegacy) {
        await invalidateOpenTokens(supabase, owner.id, PURPOSE.verifyEmail);
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, error: 'Ação desconhecida.' });
  } catch (err) {
    console.error('[api/auth] erro', err);
    return res.status(500).json({ ok: false, error: 'Erro interno.' });
  }
}
