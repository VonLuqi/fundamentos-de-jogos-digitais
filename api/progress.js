
import crypto from 'node:crypto';
import supabase from './supabaseClient.js';

const USERS_TABLE = 'users';

export const REDEEM_CODES = {
  MDA2026: {
    lessonId: 'aula1',
    lessonTitle: 'Aula 1 — A Regra do Jogo',
    xp: 20,
    achievement: 'primeiro_sangue',
  },
};

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

function levelForXp(xp) {
  const LEVEL_XP_BASE = 100;
  return Math.max(1, Math.floor(xp / LEVEL_XP_BASE) + 1);
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const token = req.query?.token;
      const { data: session } = await supabase.from('sessions').select('user_id').eq('token', token).limit(1).single();
      if (!session) return res.status(401).json({ ok: false, error: 'Sessão inválida.' });
      const { data: user } = await supabase.from(USERS_TABLE).select('*').eq('id', session.user_id).limit(1).single();
      return res.status(200).json({ ok: true, user: sanitizeUser(user) });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ ok: false, error: 'Método não permitido.' });
    }

    const { action, token, code, avatarIndex } = req.body || {};
    const { data: session } = await supabase.from('sessions').select('user_id').eq('token', token).limit(1).single();
    if (!session) return res.status(401).json({ ok: false, error: 'Sessão inválida.' });
    const userId = session.user_id;
    const { data: user } = await supabase.from(USERS_TABLE).select('*').eq('id', userId).limit(1).single();
    if (!user) return res.status(404).json({ ok: false, error: 'Usuário não encontrado.' });

    if (action === 'redeem') {
      const raw = typeof code === 'string' ? code.trim().toUpperCase() : '';
      if (!raw) return res.status(400).json({ ok: false, error: 'Código ausente.' });
      const reward = REDEEM_CODES[raw];
      if (!reward) return res.status(400).json({ ok: false, error: 'Código inválido.' });
      if ((user.redeemed_codes || []).includes(raw)) return res.status(409).json({ ok: false, error: 'Código já usado.' });

      const levelBefore = levelForXp(user.xp || 0);
      const newXp = (user.xp || 0) + reward.xp;
      const completed = Array.isArray(user.completed_lessons) ? user.completed_lessons : [];
      if (!completed.includes(reward.lessonId)) completed.push(reward.lessonId);
      const redeemed = Array.isArray(user.redeemed_codes) ? user.redeemed_codes : [];
      redeemed.push(raw);
      const achievements = Array.isArray(user.achievements) ? user.achievements : [];
      if (!achievements.includes(reward.achievement)) achievements.push(reward.achievement);

      const { error } = await supabase.from(USERS_TABLE).update({ xp: newXp, completed_lessons: completed, redeemed_codes: redeemed, achievements }).eq('id', userId);
      if (error) return res.status(500).json({ ok: false, error: 'Erro ao atualizar usuário.' });

      const levelAfter = levelForXp(newXp);
      const { data: updated } = await supabase.from(USERS_TABLE).select('*').eq('id', userId).limit(1).single();

      return res.status(200).json({ ok: true, user: sanitizeUser(updated), awarded: { xp: reward.xp, achievements: [reward.achievement], lesson: reward.lessonTitle }, leveledUp: levelAfter > levelBefore });
    }

    if (action === 'avatar') {
      const idx = Number(avatarIndex);
      if (!Number.isInteger(idx)) return res.status(400).json({ ok: false, error: 'Avatar inválido.' });
      await supabase.from(USERS_TABLE).update({ avatar_index: idx }).eq('id', userId);
      const { data: updated } = await supabase.from(USERS_TABLE).select('*').eq('id', userId).limit(1).single();
      return res.status(200).json({ ok: true, user: sanitizeUser(updated) });
    }

    if (action === 'listCodes') {
      if (user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Somente admin.' });
      const codes = Object.entries(REDEEM_CODES).map(([code, m]) => ({ code, ...m }));
      return res.status(200).json({ ok: true, codes });
    }

    if (action === 'listUsers') {
      if (user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Somente admin.' });
      const { data: users } = await supabase.from(USERS_TABLE).select('id, username, role, xp, achievements, completed_lessons, avatar_index');
      return res.status(200).json({ ok: true, users });
    }

    return res.status(400).json({ ok: false, error: 'Ação desconhecida.' });
  } catch (err) {
    console.error('[api/progress] erro', err);
    return res.status(500).json({ ok: false, error: 'Erro interno.' });
  }
}
