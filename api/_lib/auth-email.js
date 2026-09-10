import crypto from 'node:crypto';
import { sendMail } from './mailer.js';

export const TOKEN_TTL_MS = 60 * 60 * 1000;
export const RATE_LIMIT_EMAIL_PER_HOUR = 3;
export const RATE_LIMIT_IP_PER_HOUR = 5;

const PURPOSE_VERIFY = 'verify_email';
const PURPOSE_RESET = 'reset_password';

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function isValidEmail(email) {
  const value = normalizeEmail(email);
  if (!value || value.length < 3 || value.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function hashEmailToken(plain) {
  return crypto.createHash('sha256').update(String(plain || ''), 'utf8').digest('hex');
}

export function createPlainToken() {
  return crypto.randomBytes(32).toString('hex');
}

const PRODUCTION_APP_URL = 'https://fundamentos-de-jogos-digitais.vercel.app';

export function appBaseUrl() {
  const raw = String(process.env.APP_BASE_URL || '').trim().replace(/\/+$/, '');
  if (raw) return raw;

  // Preview Vercel não deve inventar link: APP_BASE_URL continua obrigatório lá.
  if (process.env.VERCEL_ENV === 'production') return PRODUCTION_APP_URL;
  if (!process.env.VERCEL && !process.env.VERCEL_ENV) return 'http://localhost:3000';

  return null;
}

export function requestIp(req) {
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim().slice(0, 64);
  }
  const real = req?.headers?.['x-real-ip'];
  if (typeof real === 'string' && real.trim()) return real.trim().slice(0, 64);
  return null;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function verificationEmailCopy({ name, url }) {
  const display = name || 'alma';
  const text = [
    `Olá, ${display}.`,
    '',
    'Confirme o selo desta alma no Domínio (Fundamentos de Jogos Digitais).',
    'O link vale por 60 minutos:',
    url,
    '',
    'Se você não firmou este pacto, ignore esta mensagem.',
  ].join('\n');

  const safeName = escapeHtml(display);
  const html = `
<div style="background:#0d0a10;color:#ece1d1;font-family:Georgia,serif;padding:32px;line-height:1.5">
  <p style="color:#cfa759;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 12px">Fundamentos de Jogos Digitais</p>
  <h1 style="color:#cfa759;font-size:22px;margin:0 0 16px">Confirmar o selo</h1>
  <p>Olá, ${safeName}.</p>
  <p>Confirme o e-mail desta alma para poder recuperar a Palavra de Passagem.</p>
  <p style="margin:28px 0">
    <a href="${url}" style="display:inline-block;background:#cfa759;color:#0d0a10;padding:12px 18px;text-decoration:none;font-weight:700">Confirmar o selo</a>
  </p>
  <p style="color:#ab9c8a;font-size:14px">O selo vale por 60 minutos. Se você não firmou este pacto, ignore esta mensagem.</p>
  <p style="color:#6f6459;font-size:13px;word-break:break-all">${url}</p>
</div>`.trim();

  return {
    subject: 'Fundamentos de Jogos Digitais — confirmar o selo',
    text,
    html,
  };
}

export function resetPasswordEmailCopy({ name, url }) {
  const display = name || 'alma';
  const text = [
    `Olá, ${display}.`,
    '',
    'Alguém pediu para redefinir a Palavra de Passagem desta alma no Domínio (Fundamentos de Jogos Digitais).',
    'O link vale por 60 minutos:',
    url,
    '',
    'Se você não pediu isso, ignore. A Palavra antiga continua válida.',
  ].join('\n');

  const safeName = escapeHtml(display);
  const html = `
<div style="background:#0d0a10;color:#ece1d1;font-family:Georgia,serif;padding:32px;line-height:1.5">
  <p style="color:#cfa759;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 12px">Fundamentos de Jogos Digitais</p>
  <h1 style="color:#cfa759;font-size:22px;margin:0 0 16px">Redefinir Palavra de Passagem</h1>
  <p>Olá, ${safeName}.</p>
  <p>Use o botão abaixo para selar uma nova Palavra. O link vale por 60 minutos.</p>
  <p style="margin:28px 0">
    <a href="${url}" style="display:inline-block;background:#cfa759;color:#0d0a10;padding:12px 18px;text-decoration:none;font-weight:700">Redefinir Palavra de Passagem</a>
  </p>
  <p style="color:#ab9c8a;font-size:14px">Se você não pediu isso, ignore. A Palavra antiga continua válida.</p>
  <p style="color:#6f6459;font-size:13px;word-break:break-all">${url}</p>
</div>`.trim();

  return {
    subject: 'Fundamentos de Jogos Digitais — redefinir Palavra de Passagem',
    text,
    html,
  };
}

export async function isRateLimited({ supabase, email, ip, purpose }) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  if (email) {
    const { count, error } = await supabase
      .from('auth_email_tokens')
      .select('id', { count: 'exact', head: true })
      .eq('purpose', purpose)
      .eq('email', email)
      .gte('created_at', since);

    if (error) {
      console.error('[auth-email] falha ao contar rate limit por e-mail', error.message);
    } else if ((count || 0) >= RATE_LIMIT_EMAIL_PER_HOUR) {
      return true;
    }
  }

  if (ip) {
    const { count, error } = await supabase
      .from('auth_email_tokens')
      .select('id', { count: 'exact', head: true })
      .eq('requested_ip', ip)
      .gte('created_at', since);

    if (error) {
      console.error('[auth-email] falha ao contar rate limit por IP', error.message);
    } else if ((count || 0) >= RATE_LIMIT_IP_PER_HOUR) {
      return true;
    }
  }

  return false;
}

export async function invalidateOpenTokens(supabase, userId, purpose) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('auth_email_tokens')
    .update({ used_at: now })
    .eq('user_id', userId)
    .eq('purpose', purpose)
    .is('used_at', null);

  if (error) {
    console.error('[auth-email] falha ao invalidar tokens', { userId, purpose, message: error.message });
  }
}

export async function findValidEmailToken(supabase, plain, purpose) {
  const token = String(plain || '').trim();
  if (token.length < 32) return null;

  const { data, error } = await supabase
    .from('auth_email_tokens')
    .select('id, user_id, purpose, email, expires_at, used_at')
    .eq('token_hash', hashEmailToken(token))
    .eq('purpose', purpose)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function markTokenUsed(supabase, tokenId) {
  const { error } = await supabase
    .from('auth_email_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tokenId)
    .is('used_at', null);

  if (error) {
    console.error('[auth-email] falha ao marcar token usado', { tokenId, message: error.message });
    return false;
  }
  return true;
}

export async function dispatchEmailVerification({ supabase, user, ip }) {
  const email = normalizeEmail(user?.email);
  if (!isValidEmail(email)) return { sent: false, reason: 'invalid' };
  if (user.email_verified_at) return { sent: false, reason: 'already_verified' };

  const limited = await isRateLimited({
    supabase,
    email,
    ip,
    purpose: PURPOSE_VERIFY,
  });
  if (limited) {
    console.warn('[auth-email] rate limit verify', { userId: user.id });
    return { sent: false, reason: 'rate_limit' };
  }

  await invalidateOpenTokens(supabase, user.id, PURPOSE_VERIFY);

  const plain = createPlainToken();
  const { error } = await supabase.from('auth_email_tokens').insert({
    user_id: user.id,
    purpose: PURPOSE_VERIFY,
    token_hash: hashEmailToken(plain),
    email,
    requested_ip: ip,
    expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
  });

  if (error) {
    console.error('[auth-email] falha ao gravar token verify', { userId: user.id, message: error.message });
    return { sent: false, reason: 'persist' };
  }

  const base = appBaseUrl();
  if (!base) {
    console.error('[auth-email] APP_BASE_URL ausente; selo não enviado.', { userId: user.id });
    return { sent: false, reason: 'no_base_url' };
  }

  const url = `${base}/pages/auth.html?verify=${plain}`;
  const copy = verificationEmailCopy({
    name: user.full_name || user.username || 'alma',
    url,
  });
  const mailed = await sendMail({
    to: email,
    subject: copy.subject,
    text: copy.text,
    html: copy.html,
  });
  if (!mailed.ok) {
    console.error('[auth-email] selo não entregue', {
      userId: user.id,
      reason: mailed.reason || (mailed.skipped ? 'skipped' : 'provider'),
    });
    return { sent: false, reason: mailed.reason || 'provider' };
  }
  return { sent: true };
}

export async function dispatchPasswordReset({ supabase, user, ip }) {
  const email = normalizeEmail(user?.email);
  if (!isValidEmail(email)) return { sent: false, reason: 'invalid' };
  if (user.role !== 'student' || !user.email_verified_at) {
    return { sent: false, reason: 'not_eligible' };
  }

  const limited = await isRateLimited({
    supabase,
    email,
    ip,
    purpose: PURPOSE_RESET,
  });
  if (limited) {
    console.warn('[auth-email] rate limit reset', { userId: user.id });
    return { sent: false, reason: 'rate_limit' };
  }

  await invalidateOpenTokens(supabase, user.id, PURPOSE_RESET);

  const plain = createPlainToken();
  const { error } = await supabase.from('auth_email_tokens').insert({
    user_id: user.id,
    purpose: PURPOSE_RESET,
    token_hash: hashEmailToken(plain),
    email,
    requested_ip: ip,
    expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
  });

  if (error) {
    console.error('[auth-email] falha ao gravar token reset', { userId: user.id, message: error.message });
    return { sent: false, reason: 'persist' };
  }

  const base = appBaseUrl();
  if (!base) {
    console.error('[auth-email] APP_BASE_URL ausente; reset não enviado.', { userId: user.id });
    return { sent: false, reason: 'no_base_url' };
  }

  const url = `${base}/pages/auth.html?reset=${plain}`;
  const copy = resetPasswordEmailCopy({
    name: user.full_name || user.username || 'alma',
    url,
  });
  const mailed = await sendMail({
    to: email,
    subject: copy.subject,
    text: copy.text,
    html: copy.html,
  });
  if (!mailed.ok) {
    console.error('[auth-email] reset não entregue', {
      userId: user.id,
      reason: mailed.reason || (mailed.skipped ? 'skipped' : 'provider'),
    });
    return { sent: false, reason: mailed.reason || 'provider' };
  }
  return { sent: true };
}

export const PURPOSE = Object.freeze({
  verifyEmail: PURPOSE_VERIFY,
  resetPassword: PURPOSE_RESET,
});
