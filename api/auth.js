/**
 * ============================================================
 * /api/auth — Pacto de Sangue (login, cadastro, sessão, logout)
 * ============================================================
 * Contrato da API (todas as ações em um único endpoint para
 * economizar funções serverless no plano gratuito do Vercel):
 *
 *   POST /api/auth  { action: "register", name, password }
 *     → 201 { ok: true, token, user }
 *
 *   POST /api/auth  { action: "login", name, password }
 *     → 200 { ok: true, token, user }
 *
 *   POST /api/auth  { action: "logout", token }
 *     → 200 { ok: true }
 *
 *   GET  /api/auth?token=...      (valida a sessão ativa)
 *     → 200 { ok: true, user }  |  401 { ok: false }
 * ============================================================
 */

import {
  ensureSeed,
  findUserByName,
  createUserRecord,
  evaluateAchievements,
  saveUser,
  verifyPassword,
  createSession,
  destroySession,
  getUserFromToken,
  sanitizeUser,
  sendJson,
  readBody,
  getStorageMode,
} from './_lib/store.js';

/* ---------- Validação de credenciais ---------- */
function validateCredentials(name, password) {
  const errors = [];
  if (typeof name !== 'string' || name.trim().length < 2) {
    errors.push('O nome da alma precisa de ao menos 2 letras.');
  }
  if (typeof name === 'string' && name.trim().length > 24) {
    errors.push('O nome da alma não pode passar de 24 letras.');
  }
  if (typeof password !== 'string' || password.length < 4) {
    errors.push('A palavra de passagem precisa de ao menos 4 símbolos.');
  }
  return errors;
}

export default async function handler(req, res) {
  try {
    // O ADMIN é re-semeado em toda invocação: nunca se perde.
    await ensureSeed();

    /* ============ GET: validar sessão ativa ============ */
    if (req.method === 'GET') {
      const token = req.query?.token;
      const user = await getUserFromToken(token);
      if (!user) {
        return sendJson(res, 401, { ok: false, error: 'Sessão inválida ou expirada.' });
      }
      return sendJson(res, 200, { ok: true, user: sanitizeUser(user), storage: getStorageMode() });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return sendJson(res, 405, { ok: false, error: 'Método não permitido.' });
    }

    const body = readBody(req);
    const action = body.action;

    /* ============ LOGOUT ============ */
    if (action === 'logout') {
      await destroySession(body.token);
      return sendJson(res, 200, { ok: true });
    }

    /* ============ REGISTER ============ */
    if (action === 'register') {
      const errors = validateCredentials(body.name, body.password);
      if (errors.length > 0) {
        return sendJson(res, 400, { ok: false, error: errors.join(' ') });
      }

      const existing = await findUserByName(body.name);
      if (existing) {
        return sendJson(res, 409, { ok: false, error: 'Essa alma já assinou o tomo. Tente "Entrar".' });
      }

      // CORREÇÃO: novo usuário SEMPRE nasce com xp = 0 e achievements = [].
      const user = createUserRecord({
        name: body.name,
        password: body.password,
        role: 'student',
      });
      // Reavalie conquistas iniciais (caso regras dependam de estado inicial)
      evaluateAchievements(user);
      await saveUser(user);

      const token = await createSession(user.name);
      return sendJson(res, 201, { ok: true, token, user: sanitizeUser(user), storage: getStorageMode() });
    }

    /* ============ LOGIN ============ */
    if (action === 'login') {
      const errors = validateCredentials(body.name, body.password);
      if (errors.length > 0) {
        return sendJson(res, 400, { ok: false, error: errors.join(' ') });
      }

      const user = await findUserByName(body.name);
      if (!user || !verifyPassword(body.password, user.passwordHash)) {
        // Mensagem genérica: não revela se o nome existe.
        return sendJson(res, 401, { ok: false, error: 'O nome da alma ou a palavra de passagem estão errados.' });
      }

      const token = await createSession(user.name);
      return sendJson(res, 200, { ok: true, token, user: sanitizeUser(user), storage: getStorageMode() });
    }

    return sendJson(res, 400, { ok: false, error: 'Ação desconhecida.' });
  } catch (error) {
    console.error('[api/auth] Erro inesperado:', error);
    return sendJson(res, 500, { ok: false, error: 'Os deuses estão em silêncio. Tente novamente.' });
  }
}
