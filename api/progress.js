import crypto from 'node:crypto';
import supabase from './supabaseClient.js';

const USERS_TABLE = 'users';
const CODES_TABLE = 'redeem_codes';
const LESSON_GATES_TABLE = 'lesson_gates';
const LESSON_PARAGRAPHS_TABLE = 'lesson_paragraphs';
const LESSON_VIEWS_TABLE = 'lesson_views';
const CODE_TTL_MINUTES = 20;

const LESSON_CATALOG = {
  aula1: {
    lessonId: 'aula1',
    lessonTitle: 'Aula 01 — O Círculo Mágico do Roguelite',
    xp: 30,
  },
};

const LESSON_GATES = {
  aula1: [],
};

const ACTIVITY_CATALOG = {
  aula1_gdd: {
    lessonId: 'aula1',
    xp: 20,
    achievementId: 'gdd_integracao_documental',
  },
};

const ACHIEVEMENT_RULES = [
  {
    id: 'aula1_concluida',
    test: (state) => Array.isArray(state.completed_lessons) && state.completed_lessons.includes('aula1'),
  },
];

const ALL_ACHIEVEMENT_IDS = [
  ...ACHIEVEMENT_RULES.map((rule) => rule.id),
  ...Object.values(ACTIVITY_CATALOG).map((activity) => activity.achievementId),
];

function defaultGatesForLesson(lessonId) {
  const gates = LESSON_GATES[String(lessonId || '')] || [];
  const out = {};
  gates.forEach((key) => {
    out[key] = false;
  });
  return out;
}

function sanitizeUser(u) {
  if (!u) return null;
  const { password_hash, conquistas, ...safe } = u;
  const displayName = safe.full_name ?? safe.name ?? safe.username;
  return {
    ...safe,
    name: displayName,
    fullName: safe.full_name ?? safe.name ?? safe.username,
    username: safe.username ?? displayName,
    achievements: safe.role === 'admin'
      ? ALL_ACHIEVEMENT_IDS
      : (Array.isArray(conquistas) ? conquistas : []),
  };
}

function levelForXp(xp) {
  const LEVEL_XP_BASE = 100;
  return Math.max(1, Math.floor(xp / LEVEL_XP_BASE) + 1);
}

function generateCode(length = 7) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function addMinutesIso(isoDate, minutes) {
  const base = new Date(isoDate);
  return new Date(base.getTime() + minutes * 60 * 1000).toISOString();
}

function codeExpiresAt(row) {
  // Compatibilidade: se a coluna ainda não existir em um ambiente legado,
  // usamos created_at + 20 min como fallback lógico até a migração rodar.
  return row.expires_at || addMinutesIso(row.created_at, CODE_TTL_MINUTES);
}

function isCodeExpired(row, nowIso = new Date().toISOString()) {
  return codeExpiresAt(row) <= nowIso;
}

function normalizeCodes(rows) {
  const nowIso = new Date().toISOString();
  return (rows || []).map((row) => {
    const expiresAt = codeExpiresAt(row);
    const used = Boolean(row.redeemed_at);
    const expired = !used && expiresAt <= nowIso;
    return {
      code: row.code,
      lessonId: row.lesson_id,
      lessonTitle: row.lesson_title,
      xp: row.xp,
      createdAt: row.created_at,
      expiresAt,
      redeemedAt: row.redeemed_at,
      redeemedBy: row.redeemed_by,
      used,
      expired,
    };
  });
}

function recalculateAchievements(userState) {
  const draft = {
    xp: userState.xp,
    completed_lessons: Array.isArray(userState.completed_lessons) ? userState.completed_lessons : [],
    conquistas: Array.isArray(userState.conquistas) ? [...userState.conquistas] : [],
  };

  ACHIEVEMENT_RULES.forEach((rule) => {
    if (rule.test(draft) && !draft.conquistas.includes(rule.id)) {
      draft.conquistas.push(rule.id);
    }
  });

  return draft.conquistas;
}

async function insertCodeWithRetry(payload, retries = 5) {
  let supportsExpiresColumn = true;
  for (let i = 0; i < retries; i += 1) {
    const code = generateCode(7);
    const createdAt = new Date().toISOString();
    const expiresAt = addMinutesIso(createdAt, CODE_TTL_MINUTES);
    const insertPayload = supportsExpiresColumn
      ? { ...payload, code, created_at: createdAt, expires_at: expiresAt }
      : { ...payload, code, created_at: createdAt };

    const { data, error } = await supabase
      .from(CODES_TABLE)
      .insert(insertPayload)
      .select('*')
      .single();

    if (!error && data) return { code: data, error: null };

    // Coluna ainda não migrada em um ambiente antigo: refaz sem expires_at.
    if (supportsExpiresColumn && (error?.code === 'PGRST204' || /expires_at/i.test(error?.message || ''))) {
      supportsExpiresColumn = false;
      i -= 1;
      continue;
    }

    // 23505 = unique_violation (código já existe); tenta novamente.
    if (error?.code !== '23505') {
      return { code: null, error };
    }
  }
  return { code: null, error: new Error('Falha ao gerar código único após múltiplas tentativas.') };
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const token = req.query?.token;
      const { data: session } = await supabase
        .from('sessions')
        .select('user_id')
        .eq('token', token)
        .limit(1)
        .single();
      if (!session) return res.status(401).json({ ok: false, error: 'Sessão inválida.' });

      const { data: user } = await supabase
        .from(USERS_TABLE)
        .select('*')
        .eq('id', session.user_id)
        .limit(1)
        .single();
      return res.status(200).json({ ok: true, user: sanitizeUser(user) });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ ok: false, error: 'Método não permitido.' });
    }

    const { action, token, code, avatarIndex, lessonId, gateKey, released, paragraph } = req.body || {};
    const { data: session } = await supabase
      .from('sessions')
      .select('user_id')
      .eq('token', token)
      .limit(1)
      .single();
    if (!session) return res.status(401).json({ ok: false, error: 'Sessão inválida.' });

    const userId = session.user_id;
    const { data: user } = await supabase.from(USERS_TABLE).select('*').eq('id', userId).limit(1).single();
    if (!user) return res.status(404).json({ ok: false, error: 'Usuário não encontrado.' });

    if (action === 'redeem') {
      const raw = typeof code === 'string' ? code.trim().toUpperCase() : '';
      if (!raw) return res.status(400).json({ ok: false, error: 'Código ausente.' });

      const { data: rewardRow } = await supabase
        .from(CODES_TABLE)
        .select('*')
        .eq('code', raw)
        .limit(1)
        .single();
      if (!rewardRow) return res.status(400).json({ ok: false, error: 'Código inválido.' });
      if (!LESSON_CATALOG[rewardRow.lesson_id]) {
        return res.status(410).json({ ok: false, error: 'Código vinculado a uma aula desativada.' });
      }
      if (rewardRow.redeemed_at) return res.status(409).json({ ok: false, error: 'Código já usado.' });
      if (isCodeExpired(rewardRow)) {
        return res.status(410).json({ ok: false, error: 'Código expirado (validade de 20 minutos).' });
      }

      const levelBefore = levelForXp(user.xp || 0);
      const newXp = (user.xp || 0) + (rewardRow.xp || 0);
      const completed = Array.isArray(user.completed_lessons) ? [...user.completed_lessons] : [];
      if (!completed.includes(rewardRow.lesson_id)) completed.push(rewardRow.lesson_id);

      const redeemed = Array.isArray(user.redeemed_codes) ? [...user.redeemed_codes] : [];
      if (!redeemed.includes(raw)) redeemed.push(raw);

      const newAchievements = recalculateAchievements({
        xp: newXp,
        completed_lessons: completed,
        conquistas: Array.isArray(user.conquistas) ? [...user.conquistas] : [],
      });
      const awardedAchievements = newAchievements.filter((id) => !(user.conquistas || []).includes(id));

      const { error: userUpdateError } = await supabase
        .from(USERS_TABLE)
        .update({
          xp: newXp,
          completed_lessons: completed,
          redeemed_codes: redeemed,
          conquistas: newAchievements,
        })
        .eq('id', userId);
      if (userUpdateError) return res.status(500).json({ ok: false, error: 'Erro ao atualizar usuário.' });

      const { error: markCodeError } = await supabase
        .from(CODES_TABLE)
        .update({ redeemed_at: new Date().toISOString(), redeemed_by: userId })
        .eq('code', raw)
        .is('redeemed_at', null);
      if (markCodeError) return res.status(500).json({ ok: false, error: 'Erro ao registrar resgate do código.' });

      const levelAfter = levelForXp(newXp);
      const { data: updated } = await supabase.from(USERS_TABLE).select('*').eq('id', userId).limit(1).single();

      return res.status(200).json({
        ok: true,
        user: sanitizeUser(updated),
        awarded: {
          xp: rewardRow.xp,
          achievements: awardedAchievements,
          lesson: rewardRow.lesson_title,
        },
        code: {
          code: rewardRow.code,
          expiresAt: codeExpiresAt(rewardRow),
        },
        leveledUp: levelAfter > levelBefore,
      });
    }

    if (action === 'avatar') {
      const idx = Number(avatarIndex);
      if (!Number.isInteger(idx)) return res.status(400).json({ ok: false, error: 'Avatar inválido.' });
      await supabase.from(USERS_TABLE).update({ avatar_index: idx }).eq('id', userId);
      const { data: updated } = await supabase.from(USERS_TABLE).select('*').eq('id', userId).limit(1).single();
      return res.status(200).json({ ok: true, user: sanitizeUser(updated) });
    }

    if (action === 'generateCode') {
      if (user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Somente admin.' });
      if (Object.keys(LESSON_CATALOG).length === 0) {
        return res.status(409).json({ ok: false, error: 'Não há aulas cadastradas para gerar códigos.' });
      }
      const lesson = LESSON_CATALOG[String(lessonId || '')];
      if (!lesson) return res.status(400).json({ ok: false, error: 'Aula inválida para geração de código.' });

      const payload = {
        lesson_id: lesson.lessonId,
        lesson_title: lesson.lessonTitle,
        xp: lesson.xp,
        created_by: userId,
      };

      const { code: created, error } = await insertCodeWithRetry(payload);
      if (error || !created) return res.status(500).json({ ok: false, error: 'Falha ao gerar código.' });

      return res.status(201).json({
        ok: true,
        code: {
          code: created.code,
          lessonId: created.lesson_id,
          lessonTitle: created.lesson_title,
          xp: created.xp,
          createdAt: created.created_at,
          expiresAt: codeExpiresAt(created),
        },
      });
    }

    if (action === 'lessonCode') {
      const lesson = LESSON_CATALOG[String(lessonId || '')];
      if (!lesson) return res.status(400).json({ ok: false, error: 'Aula inválida.' });

      const { data: rows } = await supabase
        .from(CODES_TABLE)
        .select('*')
        .eq('lesson_id', lesson.lessonId)
        .is('redeemed_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      const latest = (rows || []).find((row) => !isCodeExpired(row));

      if (!latest) {
        return res.status(404).json({
          ok: false,
          error: 'Nenhum código ativo para esta aula (validade de 20 minutos). Peça para um admin gerar no Salão dos Heróis.',
        });
      }

      return res.status(200).json({
        ok: true,
        code: {
          code: latest.code,
          lessonId: latest.lesson_id,
          lessonTitle: latest.lesson_title,
          xp: latest.xp,
          createdAt: latest.created_at,
          expiresAt: codeExpiresAt(latest),
        },
      });
    }

    if (action === 'lessonGates') {
      const normalizedLessonId = String(lessonId || '');
      if (!LESSON_CATALOG[normalizedLessonId]) {
        return res.status(400).json({ ok: false, error: 'Aula inválida.' });
      }

      const defaults = defaultGatesForLesson(normalizedLessonId);
      const { data: rows, error } = await supabase
        .from(LESSON_GATES_TABLE)
        .select('gate_key, released')
        .eq('lesson_id', normalizedLessonId);

      if (error) {
        if (error.code === '42P01' || /lesson_gates/i.test(error.message || '')) {
          return res.status(200).json({ ok: true, lessonId: normalizedLessonId, gates: defaults, warning: 'Tabela lesson_gates ausente.' });
        }
        return res.status(500).json({ ok: false, error: 'Falha ao carregar conteúdo censurado.' });
      }

      const gates = { ...defaults };
      (rows || []).forEach((row) => {
        if (Object.prototype.hasOwnProperty.call(gates, row.gate_key)) {
          gates[row.gate_key] = Boolean(row.released);
        }
      });

      return res.status(200).json({ ok: true, lessonId: normalizedLessonId, gates });
    }

    if (action === 'getLessonParagraph') {
      const normalizedLessonId = String(lessonId || '');
      if (!LESSON_CATALOG[normalizedLessonId]) {
        return res.status(400).json({ ok: false, error: 'Aula inválida.' });
      }

      const { data, error } = await supabase
        .from(LESSON_PARAGRAPHS_TABLE)
        .select('paragraph, updated_at')
        .eq('lesson_id', normalizedLessonId)
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (error) {
        if (error.code === '42P01' || /lesson_paragraphs/i.test(error.message || '')) {
          return res.status(200).json({ ok: true, lessonId: normalizedLessonId, paragraph: '', updatedAt: null, warning: 'Tabela lesson_paragraphs ausente.' });
        }
        return res.status(500).json({ ok: false, error: 'Falha ao carregar parágrafo da aula.' });
      }

      return res.status(200).json({
        ok: true,
        lessonId: normalizedLessonId,
        paragraph: data?.paragraph || '',
        updatedAt: data?.updated_at || null,
      });
    }

    if (action === 'saveLessonParagraph') {
      const normalizedLessonId = String(lessonId || '');
      if (!LESSON_CATALOG[normalizedLessonId]) {
        return res.status(400).json({ ok: false, error: 'Aula inválida.' });
      }

      const text = typeof paragraph === 'string' ? paragraph.trim() : '';
      if (!text) {
        return res.status(400).json({ ok: false, error: 'Parágrafo vazio.' });
      }

      const activity = ACTIVITY_CATALOG[`${normalizedLessonId}_gdd`];
      const activityAlreadyAwarded = activity && Array.isArray(user.conquistas)
        ? user.conquistas.includes(activity.achievementId)
        : false;
      const nowIso = new Date().toISOString();
      const { error } = await supabase.from(LESSON_PARAGRAPHS_TABLE).upsert(
        {
          user_id: userId,
          lesson_id: normalizedLessonId,
          paragraph: text,
          updated_at: nowIso,
        },
        { onConflict: 'user_id,lesson_id' }
      );

      if (error) {
        if (error.code === '42P01' || /lesson_paragraphs/i.test(error.message || '')) {
          return res.status(503).json({ ok: false, error: 'Tabela lesson_paragraphs não existe. Rode o SQL de migração.' });
        }
        return res.status(500).json({ ok: false, error: 'Falha ao salvar parágrafo da aula.' });
      }

      let awarded = null;
      let updatedUser = user;
      if (activity && !activityAlreadyAwarded) {
        const xp = Number(user.xp || 0) + activity.xp;
        const conquistas = [...(Array.isArray(user.conquistas) ? user.conquistas : []), activity.achievementId];
        const { data, error: userUpdateError } = await supabase
          .from(USERS_TABLE)
          .update({ xp, conquistas })
          .eq('id', userId)
          .select('*')
          .single();
        if (userUpdateError) return res.status(500).json({ ok: false, error: 'Falha ao conceder recompensa da atividade.' });

        updatedUser = data;
        awarded = {
          xp: activity.xp,
          achievements: [activity.achievementId],
        };
      }

      return res.status(200).json({
        ok: true,
        lessonId: normalizedLessonId,
        paragraph: text,
        updatedAt: nowIso,
        user: sanitizeUser(updatedUser),
        awarded,
      });
    }

    if (action === 'lessonView') {
      const normalizedLessonId = String(lessonId || '');
      if (!LESSON_CATALOG[normalizedLessonId]) {
        return res.status(400).json({ ok: false, error: 'Aula inválida.' });
      }

      const nowIso = new Date().toISOString();
      const { data: existing, error: selectError } = await supabase
        .from(LESSON_VIEWS_TABLE)
        .select('view_count')
        .eq('user_id', userId)
        .eq('lesson_id', normalizedLessonId)
        .limit(1)
        .maybeSingle();

      if (selectError) {
        if (selectError.code === '42P01' || /lesson_views/i.test(selectError.message || '')) {
          return res.status(503).json({ ok: false, error: 'Tabela lesson_views não existe. Rode o SQL de migração.' });
        }
        return res.status(500).json({ ok: false, error: 'Falha ao registrar visualização da aula.' });
      }

      const nextCount = Number(existing?.view_count || 0) + 1;
      const { error: upsertError } = await supabase.from(LESSON_VIEWS_TABLE).upsert(
        {
          user_id: userId,
          lesson_id: normalizedLessonId,
          first_viewed_at: existing ? undefined : nowIso,
          last_viewed_at: nowIso,
          view_count: nextCount,
        },
        { onConflict: 'user_id,lesson_id' }
      );

      if (upsertError) {
        if (upsertError.code === '42P01' || /lesson_views/i.test(upsertError.message || '')) {
          return res.status(503).json({ ok: false, error: 'Tabela lesson_views não existe. Rode o SQL de migração.' });
        }
        return res.status(500).json({ ok: false, error: 'Falha ao registrar visualização da aula.' });
      }

      return res.status(200).json({ ok: true, lessonId: normalizedLessonId, viewedAt: nowIso });
    }

    if (action === 'setLessonGate') {
      if (user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Somente admin.' });

      const normalizedLessonId = String(lessonId || '');
      const normalizedGateKey = String(gateKey || '');
      const gateDefaults = defaultGatesForLesson(normalizedLessonId);

      if (!LESSON_CATALOG[normalizedLessonId]) {
        return res.status(400).json({ ok: false, error: 'Aula inválida.' });
      }
      if (!Object.prototype.hasOwnProperty.call(gateDefaults, normalizedGateKey)) {
        return res.status(400).json({ ok: false, error: 'Chave de censura inválida para esta aula.' });
      }

      const releaseValue = Boolean(released);
      const nowIso = new Date().toISOString();
      const { error } = await supabase.from(LESSON_GATES_TABLE).upsert(
        {
          lesson_id: normalizedLessonId,
          gate_key: normalizedGateKey,
          released: releaseValue,
          released_by: userId,
          released_at: releaseValue ? nowIso : null,
          updated_at: nowIso,
        },
        { onConflict: 'lesson_id,gate_key' }
      );

      if (error) {
        if (error.code === '42P01' || /lesson_gates/i.test(error.message || '')) {
          return res.status(503).json({ ok: false, error: 'Tabela lesson_gates não existe. Rode o SQL de migração.' });
        }
        return res.status(500).json({ ok: false, error: 'Falha ao atualizar censura da aula.' });
      }

      const { data: rows } = await supabase
        .from(LESSON_GATES_TABLE)
        .select('gate_key, released')
        .eq('lesson_id', normalizedLessonId);

      const gates = { ...gateDefaults };
      (rows || []).forEach((row) => {
        if (Object.prototype.hasOwnProperty.call(gates, row.gate_key)) {
          gates[row.gate_key] = Boolean(row.released);
        }
      });

      return res.status(200).json({ ok: true, lessonId: normalizedLessonId, gates });
    }

    if (action === 'listCodes') {
      if (user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Somente admin.' });
      const { data: rows, error } = await supabase
        .from(CODES_TABLE)
        .select('code, lesson_id, lesson_title, xp, created_at, redeemed_at, redeemed_by')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) return res.status(500).json({ ok: false, error: 'Falha ao listar códigos.' });
      return res.status(200).json({ ok: true, codes: normalizeCodes(rows) });
    }

    if (action === 'listUsers') {
      if (user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Somente admin.' });
      const { data: users } = await supabase
        .from(USERS_TABLE)
        .select('id, full_name, username, turma, role, xp, conquistas, completed_lessons, avatar_index, created_at');

      let paragraphRows = [];
      const { data: paragraphs, error: paragraphsError } = await supabase
        .from(LESSON_PARAGRAPHS_TABLE)
        .select('user_id, lesson_id, paragraph, updated_at')
        .order('updated_at', { ascending: false });

      if (!paragraphsError) {
        paragraphRows = paragraphs || [];
      }

      let viewRows = [];
      const { data: views, error: viewsError } = await supabase
        .from(LESSON_VIEWS_TABLE)
        .select('user_id, lesson_id, last_viewed_at, view_count');

      if (!viewsError) {
        viewRows = views || [];
      }

      const viewsByUser = new Map();
      viewRows.forEach((row) => {
        const userViews = viewsByUser.get(row.user_id) || [];
        userViews.push({
          lessonId: row.lesson_id,
          lastViewedAt: row.last_viewed_at,
          viewCount: Number(row.view_count || 0),
        });
        viewsByUser.set(row.user_id, userViews);
      });

      const normalized = (users || []).map(({ conquistas, ...rest }) => ({
        ...rest,
        fullName: rest.full_name || rest.username,
        achievements: conquistas || [],
        viewedLessons: viewsByUser.get(rest.id) || [],
      }));

      const usersById = new Map(normalized.map((item) => [item.id, item]));
      const activities = paragraphRows
        .map((row) => {
          const activityUser = usersById.get(row.user_id);
          if (!activityUser || activityUser.role === 'admin') return null;
          return {
            lessonId: row.lesson_id,
            paragraph: row.paragraph,
            updatedAt: row.updated_at,
            fullName: activityUser.fullName,
            username: activityUser.username,
            turma: activityUser.turma,
          };
        })
        .filter(Boolean);

      return res.status(200).json({ ok: true, users: normalized, activities });
    }

    return res.status(400).json({ ok: false, error: 'Ação desconhecida.' });
  } catch (err) {
    console.error('[api/progress] erro', err);
    return res.status(500).json({ ok: false, error: 'Erro interno.' });
  }
}
