import crypto from 'node:crypto';
import supabase from './supabaseClient.js';

const USERS_TABLE = 'users';
const CODES_TABLE = 'redeem_codes';
const LESSON_GATES_TABLE = 'lesson_gates';
const LESSON_PARAGRAPHS_TABLE = 'lesson_paragraphs';
const LESSON_VIEWS_TABLE = 'lesson_views';
const FRIENDSHIPS_TABLE = 'friendships';
const CODE_TTL_MINUTES = 20;
const FRIEND_LIMIT = 25;
const FRIEND_SEARCH_LIMIT = 8;

const RANKS = [
  { minXp: 0, title: 'Alma Novata' },
  { minXp: 20, title: 'Iniciado do Tártaro' },
  { minXp: 60, title: 'Operador do Tártaro' },
  { minXp: 120, title: 'Veterano do Submundo' },
  { minXp: 240, title: 'Campeão Érebo' },
];

const ACHIEVEMENT_RARITY = Object.freeze({
  STONE: 'stone',
  COPPER: 'copper',
  SILVER: 'silver',
  GOLD: 'gold',
  RAINBOW: 'rainbow',
});

const ACHIEVEMENT_DIFFICULTY = Object.freeze({
  TRIVIAL: 'trivial',
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  MYTHIC: 'mythic',
});

const DIFFICULTY_TO_RARITY = Object.freeze({
  [ACHIEVEMENT_DIFFICULTY.TRIVIAL]: ACHIEVEMENT_RARITY.STONE,
  [ACHIEVEMENT_DIFFICULTY.EASY]: ACHIEVEMENT_RARITY.COPPER,
  [ACHIEVEMENT_DIFFICULTY.MEDIUM]: ACHIEVEMENT_RARITY.SILVER,
  [ACHIEVEMENT_DIFFICULTY.HARD]: ACHIEVEMENT_RARITY.GOLD,
  [ACHIEVEMENT_DIFFICULTY.MYTHIC]: ACHIEVEMENT_RARITY.RAINBOW,
});

const DEFAULT_ACHIEVEMENT_RARITY = ACHIEVEMENT_RARITY.STONE;

const LESSON_CATALOG = {
  aula1: {
    lessonId: 'aula1',
    lessonTitle: 'Aula 01 — O Círculo Mágico do Roguelite',
    xp: 30,
  },
  aula2: {
    lessonId: 'aula2',
    lessonTitle: 'Aula 02 — Loops e Ritmo',
    xp: 30,
  },
  aula3: {
    lessonId: 'aula3',
    lessonTitle: 'Aula 03 — Em preparação',
    xp: 30,
  },
};

/** Gates por aula: objeto { gateKey: defaultReleased }. `published` controla liberação global na Trilha. */
const LESSON_GATES = {
  aula1: { published: true },
  aula2: { published: false },
  aula3: { published: false },
};

const ACTIVITY_CATALOG = {
  aula1_gdd: {
    lessonId: 'aula1',
    xp: 20,
    achievementId: 'gdd_integracao_documental',
  },
};

const LESSON_SECRET_ACHIEVEMENTS = {
  aula1: [
    {
      id: 'segredo_cartografo_do_inspector',
      xp: 15,
      test: (ctx) => countUniqueTestMarkers(ctx.normalizedText) >= 3,
    },
    {
      id: 'segredo_alquimista_da_fisica',
      xp: 15,
      test: (ctx) =>
        hasEveryKeyword(ctx.normalizedText, ['massa', 'gravidade', 'friccao', 'elasticidade'])
        && hasAnyKeyword(ctx.normalizedText, ['inercia', 'queda', 'quique', 'desliza', 'deslizamento']),
    },
    {
      id: 'segredo_juramento_do_circulo',
      xp: 25,
      test: (ctx) =>
        hasEveryKeyword(ctx.normalizedText, [
          'forca de movimento',
          'impulso de pulo',
          'massa',
          'gravidade da cena',
          'friccao',
          'elasticidade',
          'neste mundo, a bola',
        ]),
    },
  ],
};

const ACHIEVEMENT_DIFFICULTY_BY_ID = Object.freeze({
  aula1_concluida: ACHIEVEMENT_DIFFICULTY.TRIVIAL,
  gdd_integracao_documental: ACHIEVEMENT_DIFFICULTY.EASY,
  segredo_cartografo_do_inspector: ACHIEVEMENT_DIFFICULTY.MEDIUM,
  segredo_alquimista_da_fisica: ACHIEVEMENT_DIFFICULTY.HARD,
  segredo_juramento_do_circulo: ACHIEVEMENT_DIFFICULTY.MYTHIC,
});

const ACHIEVEMENT_RULES = [
  {
    id: 'aula1_concluida',
    test: (state) => Array.isArray(state.completed_lessons) && state.completed_lessons.includes('aula1'),
  },
];

const ALL_ACHIEVEMENT_IDS = [
  ...ACHIEVEMENT_RULES.map((rule) => rule.id),
  ...Object.values(ACTIVITY_CATALOG).map((activity) => activity.achievementId),
  ...Object.values(LESSON_SECRET_ACHIEVEMENTS).flatMap((entries) => entries.map((entry) => entry.id)),
];

function normalizeForSecretCheck(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function rarityFromDifficulty(difficulty) {
  return DIFFICULTY_TO_RARITY[difficulty] || DEFAULT_ACHIEVEMENT_RARITY;
}

function rarityForAchievement(achievementId) {
  return rarityFromDifficulty(ACHIEVEMENT_DIFFICULTY_BY_ID[achievementId]);
}

function mapAchievementDetails(ids = []) {
  return ids.map((id) => ({
    id,
    difficulty: ACHIEVEMENT_DIFFICULTY_BY_ID[id] || ACHIEVEMENT_DIFFICULTY.TRIVIAL,
    rarity: rarityForAchievement(id),
  }));
}

function hasEveryKeyword(text, keywords) {
  return keywords.every((keyword) => text.includes(keyword));
}

function hasAnyKeyword(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function countUniqueTestMarkers(text) {
  const matches = [...text.matchAll(/teste\s*(\d+)/g)].map((entry) => entry[1]);
  return new Set(matches).size;
}

function evaluateSecretAchievements(lessonId, paragraphText, alreadyUnlocked = []) {
  const rules = LESSON_SECRET_ACHIEVEMENTS[String(lessonId || '')] || [];
  if (rules.length === 0) return [];

  const normalizedText = normalizeForSecretCheck(paragraphText);
  const context = { normalizedText };

  return rules
    .filter((rule) => !alreadyUnlocked.includes(rule.id))
    .filter((rule) => {
      try {
        return Boolean(rule.test(context));
      } catch {
        return false;
      }
    });
}

function defaultGatesForLesson(lessonId) {
  const configured = LESSON_GATES[String(lessonId || '')];
  if (Array.isArray(configured)) {
    const out = {};
    configured.forEach((key) => {
      out[key] = false;
    });
    if (!Object.prototype.hasOwnProperty.call(out, 'published')) {
      out.published = String(lessonId) === 'aula1';
    }
    return out;
  }
  if (configured && typeof configured === 'object') {
    return { ...configured };
  }
  return { published: String(lessonId) === 'aula1' };
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

function rankForXp(xp) {
  const match = RANKS.filter((entry) => xp >= entry.minXp).pop();
  return match ? match.title : RANKS[0].title;
}

function isMissingFriendshipsTable(error) {
  return Boolean(
    error
    && (error.code === '42P01' || /friendships/i.test(error.message || ''))
  );
}

function friendshipsUnavailableResponse(res) {
  return res.status(503).json({
    ok: false,
    error: 'Tabela friendships não existe. Rode o SQL de migração.',
  });
}

function toFriendCard(row) {
  const xp = Number(row?.xp || 0);
  const isAdmin = row?.role === 'admin';
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name || row.username,
    turma: row.turma || null,
    avatarIndex: Number(row.avatar_index ?? 0),
    role: row.role || 'student',
    xp: isAdmin ? null : xp,
    rank: isAdmin ? 'Mestre do Infinito' : rankForXp(xp),
    level: isAdmin ? '∞' : levelForXp(xp),
  };
}

function toPublicFriendProfile(row) {
  const card = toFriendCard(row);
  // Espelho: conquistas reais do banco (admin não recebe catálogo completo — evita spoiler).
  const achievements = Array.isArray(row.conquistas) ? row.conquistas : [];
  const completed = Array.isArray(row.completed_lessons) ? row.completed_lessons : [];
  return {
    ...card,
    achievements,
    completedLessonsCount: completed.length,
  };
}

function normalizeUsernameQuery(value) {
  return String(value || '').trim();
}

async function fetchUsersByIds(ids = []) {
  const unique = [...new Set(
    ids
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
  )];
  if (unique.length === 0) return new Map();

  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select('id, full_name, username, turma, role, xp, conquistas, completed_lessons, avatar_index')
    .in('id', unique);

  if (error) throw error;

  return new Map((data || []).map((row) => [Number(row.id), row]));
}

function sameUserId(a, b) {
  return Number(a) === Number(b);
}

async function countAcceptedFriends(userId) {
  const { count: asRequester, error: reqError } = await supabase
    .from(FRIENDSHIPS_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('status', 'accepted')
    .eq('requester_id', userId);
  if (reqError) throw reqError;

  const { count: asAddressee, error: addrError } = await supabase
    .from(FRIENDSHIPS_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('status', 'accepted')
    .eq('addressee_id', userId);
  if (addrError) throw addrError;

  return Number(asRequester || 0) + Number(asAddressee || 0);
}

async function findFriendshipBetween(userA, userB) {
  const { data, error } = await supabase
    .from(FRIENDSHIPS_TABLE)
    .select('id, requester_id, addressee_id, status, created_at, updated_at')
    .or(
      `and(requester_id.eq.${userA},addressee_id.eq.${userB}),and(requester_id.eq.${userB},addressee_id.eq.${userA})`
    )
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
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
    const expired = expiresAt <= nowIso;
    return {
      code: row.code,
      lessonId: row.lesson_id,
      lessonTitle: row.lesson_title,
      xp: row.xp,
      createdAt: row.created_at,
      expiresAt,
      redeemedAt: row.redeemed_at,
      redeemedBy: row.redeemed_by,
      used: Boolean(row.redeemed_at),
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

    const {
      action,
      token,
      code,
      avatarIndex,
      lessonId,
      gateKey,
      released,
      paragraph,
      xp,
      duration,
      username,
      query,
      decision,
      friendUserId,
      friendshipId,
    } = req.body || {};
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

    if (action === 'friendsList') {
      try {
        const { data: rows, error } = await supabase
          .from(FRIENDSHIPS_TABLE)
          .select('id, requester_id, addressee_id, status, created_at, updated_at')
          .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
          .order('updated_at', { ascending: false });

        if (error) {
          if (isMissingFriendshipsTable(error)) return friendshipsUnavailableResponse(res);
          return res.status(500).json({ ok: false, error: 'Falha ao listar companheiros.' });
        }

        const otherIds = (rows || []).map((row) => (
          sameUserId(row.requester_id, userId) ? row.addressee_id : row.requester_id
        ));
        const usersById = await fetchUsersByIds(otherIds);

        const accepted = [];
        const incoming = [];
        const outgoing = [];

        (rows || []).forEach((row) => {
          const otherId = sameUserId(row.requester_id, userId) ? row.addressee_id : row.requester_id;
          const other = usersById.get(Number(otherId));
          // Mostra o outro lado mesmo se for admin (ex.: mestre convidou o aluno).
          if (!other) return;

          const entry = {
            friendshipId: row.id,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            user: toFriendCard(other),
          };

          if (row.status === 'accepted') {
            accepted.push(entry);
            return;
          }
          if (row.status === 'pending' && sameUserId(row.addressee_id, userId)) {
            incoming.push(entry);
            return;
          }
          if (row.status === 'pending' && sameUserId(row.requester_id, userId)) {
            outgoing.push(entry);
          }
        });

        return res.status(200).json({
          ok: true,
          limit: FRIEND_LIMIT,
          count: accepted.length,
          accepted,
          incoming,
          outgoing,
        });
      } catch (error) {
        if (isMissingFriendshipsTable(error)) return friendshipsUnavailableResponse(res);
        console.error('[api/progress] friendsList', error);
        return res.status(500).json({ ok: false, error: 'Falha ao listar companheiros.' });
      }
    }

    if (action === 'friendSearch') {
      try {
        const rawQuery = normalizeUsernameQuery(query ?? username);
        if (rawQuery.length < 1) {
          return res.status(200).json({ ok: true, results: [] });
        }

        const resultsById = new Map();
        const escaped = rawQuery.replace(/[%_]/g, '');
        if (!escaped) {
          return res.status(200).json({ ok: true, results: [] });
        }

        // Autocomplete: mesma turma, prefixo de username (não enumera a plataforma).
        if (user.turma) {
          const { data: turmaMatches, error: turmaError } = await supabase
            .from(USERS_TABLE)
            .select('id, full_name, username, turma, role, xp, avatar_index')
            .eq('turma', user.turma)
            .neq('id', userId)
            .neq('role', 'admin')
            .ilike('username', `${escaped}%`)
            .order('username', { ascending: true })
            .limit(FRIEND_SEARCH_LIMIT);

          if (turmaError) {
            return res.status(500).json({ ok: false, error: 'Falha na busca de companheiros.' });
          }

          (turmaMatches || []).forEach((row) => {
            resultsById.set(row.id, row);
          });
        }

        // Match exato global (outra turma / mestre) — só se username bater exatamente.
        const { data: exactMatch, error: exactError } = await supabase
          .from(USERS_TABLE)
          .select('id, full_name, username, turma, role, xp, avatar_index')
          .ilike('username', escaped)
          .neq('id', userId)
          .limit(1)
          .maybeSingle();

        if (exactError) {
          return res.status(500).json({ ok: false, error: 'Falha na busca de companheiros.' });
        }
        if (exactMatch) {
          resultsById.set(exactMatch.id, exactMatch);
        }

        const candidateIds = [...resultsById.keys()];
        const relationByUserId = new Map();

        if (candidateIds.length > 0) {
          const { data: relations, error: relError } = await supabase
            .from(FRIENDSHIPS_TABLE)
            .select('id, requester_id, addressee_id, status')
            .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

          if (relError) {
            if (isMissingFriendshipsTable(relError)) return friendshipsUnavailableResponse(res);
            return res.status(500).json({ ok: false, error: 'Falha na busca de companheiros.' });
          }

          (relations || []).forEach((row) => {
            const otherId = sameUserId(row.requester_id, userId) ? row.addressee_id : row.requester_id;
            if (!candidateIds.includes(Number(otherId)) && !candidateIds.includes(otherId)) return;
            let relation = 'none';
            if (row.status === 'accepted') relation = 'accepted';
            else if (row.status === 'pending' && sameUserId(row.requester_id, userId)) relation = 'outgoing';
            else if (row.status === 'pending' && sameUserId(row.addressee_id, userId)) relation = 'incoming';
            relationByUserId.set(Number(otherId), { relation, friendshipId: row.id });
          });
        }

        const results = [...resultsById.values()]
          .slice(0, FRIEND_SEARCH_LIMIT)
          .map((row) => {
            const rel = relationByUserId.get(Number(row.id)) || { relation: 'none', friendshipId: null };
            return {
              ...toFriendCard(row),
              relation: rel.relation,
              friendshipId: rel.friendshipId,
            };
          });

        return res.status(200).json({ ok: true, results });
      } catch (error) {
        if (isMissingFriendshipsTable(error)) return friendshipsUnavailableResponse(res);
        console.error('[api/progress] friendSearch', error);
        return res.status(500).json({ ok: false, error: 'Falha na busca de companheiros.' });
      }
    }

    if (action === 'friendRequest') {
      try {
        const targetUsername = normalizeUsernameQuery(username);
        if (!targetUsername) {
          return res.status(400).json({ ok: false, error: 'Username ausente.' });
        }

        const { data: target, error: targetError } = await supabase
          .from(USERS_TABLE)
          .select('id, full_name, username, turma, role, xp, avatar_index')
          .ilike('username', targetUsername)
          .limit(1)
          .maybeSingle();

        if (targetError) {
          return res.status(500).json({ ok: false, error: 'Falha ao enviar convite.' });
        }
        if (!target) {
          return res.status(404).json({ ok: false, error: 'Aluno não encontrado.' });
        }
        if (target.id === userId) {
          return res.status(400).json({ ok: false, error: 'Não é possível convidar a si mesmo.' });
        }

        // Match global exato: exige igualdade case-insensitive completa (não prefixo).
        if (String(target.username).toLowerCase() !== targetUsername.toLowerCase()) {
          return res.status(404).json({ ok: false, error: 'Aluno não encontrado.' });
        }

        const existing = await findFriendshipBetween(userId, target.id);
        if (existing?.status === 'accepted') {
          return res.status(409).json({ ok: false, error: 'Vocês já são companheiros.' });
        }
        if (existing?.status === 'pending') {
          return res.status(409).json({ ok: false, error: 'Já existe um convite pendente.' });
        }

        const myCount = await countAcceptedFriends(userId);
        if (myCount >= FRIEND_LIMIT) {
          return res.status(409).json({
            ok: false,
            error: `Limite de ${FRIEND_LIMIT} companheiros atingido.`,
          });
        }

        const theirCount = await countAcceptedFriends(target.id);
        if (theirCount >= FRIEND_LIMIT) {
          return res.status(409).json({
            ok: false,
            error: 'Este aluno já atingiu o limite de companheiros.',
          });
        }

        const nowIso = new Date().toISOString();
        const { data: created, error: insertError } = await supabase
          .from(FRIENDSHIPS_TABLE)
          .insert({
            requester_id: userId,
            addressee_id: target.id,
            status: 'pending',
            created_at: nowIso,
            updated_at: nowIso,
          })
          .select('id, requester_id, addressee_id, status, created_at, updated_at')
          .single();

        if (insertError) {
          if (isMissingFriendshipsTable(insertError)) return friendshipsUnavailableResponse(res);
          if (insertError.code === '23505') {
            return res.status(409).json({ ok: false, error: 'Já existe um convite pendente.' });
          }
          return res.status(500).json({ ok: false, error: 'Falha ao enviar convite.' });
        }

        return res.status(201).json({
          ok: true,
          friendship: {
            friendshipId: created.id,
            status: created.status,
            createdAt: created.created_at,
            updatedAt: created.updated_at,
            user: toFriendCard(target),
          },
        });
      } catch (error) {
        if (isMissingFriendshipsTable(error)) return friendshipsUnavailableResponse(res);
        console.error('[api/progress] friendRequest', error);
        return res.status(500).json({ ok: false, error: 'Falha ao enviar convite.' });
      }
    }

    if (action === 'friendRespond') {
      try {
        const verdict = String(decision || '').trim().toLowerCase();
        if (!['accept', 'decline'].includes(verdict)) {
          return res.status(400).json({ ok: false, error: 'Decisão inválida. Use accept ou decline.' });
        }

        let row = null;
        const normalizedFriendshipId = Number(friendshipId);
        const normalizedFriendUserId = Number(friendUserId);

        if (Number.isInteger(normalizedFriendshipId) && normalizedFriendshipId > 0) {
          const { data, error } = await supabase
            .from(FRIENDSHIPS_TABLE)
            .select('id, requester_id, addressee_id, status, created_at, updated_at')
            .eq('id', normalizedFriendshipId)
            .limit(1)
            .maybeSingle();
          if (error) {
            if (isMissingFriendshipsTable(error)) return friendshipsUnavailableResponse(res);
            return res.status(500).json({ ok: false, error: 'Falha ao responder convite.' });
          }
          row = data;
        } else if (Number.isInteger(normalizedFriendUserId) && normalizedFriendUserId > 0) {
          row = await findFriendshipBetween(userId, normalizedFriendUserId);
        } else {
          return res.status(400).json({ ok: false, error: 'Informe friendshipId ou friendUserId.' });
        }

        if (!row || row.status !== 'pending' || !sameUserId(row.addressee_id, userId)) {
          return res.status(404).json({ ok: false, error: 'Convite pendente não encontrado.' });
        }

        if (verdict === 'decline') {
          const { error: deleteError } = await supabase
            .from(FRIENDSHIPS_TABLE)
            .delete()
            .eq('id', row.id);
          if (deleteError) {
            if (isMissingFriendshipsTable(deleteError)) return friendshipsUnavailableResponse(res);
            return res.status(500).json({ ok: false, error: 'Falha ao recusar convite.' });
          }
          return res.status(200).json({ ok: true, decision: 'decline' });
        }

        const myCount = await countAcceptedFriends(userId);
        if (myCount >= FRIEND_LIMIT) {
          return res.status(409).json({
            ok: false,
            error: `Limite de ${FRIEND_LIMIT} companheiros atingido.`,
          });
        }
        const theirCount = await countAcceptedFriends(row.requester_id);
        if (theirCount >= FRIEND_LIMIT) {
          return res.status(409).json({
            ok: false,
            error: 'Este aluno já atingiu o limite de companheiros.',
          });
        }

        const nowIso = new Date().toISOString();
        const { data: updated, error: updateError } = await supabase
          .from(FRIENDSHIPS_TABLE)
          .update({ status: 'accepted', updated_at: nowIso })
          .eq('id', row.id)
          .eq('status', 'pending')
          .select('id, requester_id, addressee_id, status, created_at, updated_at')
          .single();

        if (updateError) {
          if (isMissingFriendshipsTable(updateError)) return friendshipsUnavailableResponse(res);
          return res.status(500).json({ ok: false, error: 'Falha ao aceitar convite.' });
        }

        const usersById = await fetchUsersByIds([updated.requester_id]);
        const other = usersById.get(updated.requester_id);

        return res.status(200).json({
          ok: true,
          decision: 'accept',
          friendship: {
            friendshipId: updated.id,
            status: updated.status,
            createdAt: updated.created_at,
            updatedAt: updated.updated_at,
            user: other ? toFriendCard(other) : null,
          },
        });
      } catch (error) {
        if (isMissingFriendshipsTable(error)) return friendshipsUnavailableResponse(res);
        console.error('[api/progress] friendRespond', error);
        return res.status(500).json({ ok: false, error: 'Falha ao responder convite.' });
      }
    }

    if (action === 'friendRemove') {
      try {
        let row = null;
        const normalizedFriendshipId = Number(friendshipId);
        const normalizedFriendUserId = Number(friendUserId);
        const targetUsername = normalizeUsernameQuery(username);

        if (Number.isInteger(normalizedFriendshipId) && normalizedFriendshipId > 0) {
          const { data, error } = await supabase
            .from(FRIENDSHIPS_TABLE)
            .select('id, requester_id, addressee_id, status')
            .eq('id', normalizedFriendshipId)
            .limit(1)
            .maybeSingle();
          if (error) {
            if (isMissingFriendshipsTable(error)) return friendshipsUnavailableResponse(res);
            return res.status(500).json({ ok: false, error: 'Falha ao remover vínculo.' });
          }
          row = data;
        } else if (Number.isInteger(normalizedFriendUserId) && normalizedFriendUserId > 0) {
          row = await findFriendshipBetween(userId, normalizedFriendUserId);
        } else if (targetUsername) {
          const { data: target, error: targetError } = await supabase
            .from(USERS_TABLE)
            .select('id')
            .ilike('username', targetUsername)
            .limit(1)
            .maybeSingle();
          if (targetError) {
            return res.status(500).json({ ok: false, error: 'Falha ao remover vínculo.' });
          }
          if (!target) {
            return res.status(404).json({ ok: false, error: 'Vínculo não encontrado.' });
          }
          row = await findFriendshipBetween(userId, target.id);
        } else {
          return res.status(400).json({
            ok: false,
            error: 'Informe friendshipId, friendUserId ou username.',
          });
        }

        if (!row) {
          return res.status(404).json({ ok: false, error: 'Vínculo não encontrado.' });
        }
        if (!sameUserId(row.requester_id, userId) && !sameUserId(row.addressee_id, userId)) {
          return res.status(403).json({ ok: false, error: 'Sem permissão para este vínculo.' });
        }

        // Aceito: qualquer lado remove. Pending: requester cancela OU addressee recusa via respond.
        if (row.status === 'pending' && !sameUserId(row.requester_id, userId)) {
          return res.status(403).json({
            ok: false,
            error: 'Use friendRespond para aceitar ou recusar este convite.',
          });
        }

        const { error: deleteError } = await supabase
          .from(FRIENDSHIPS_TABLE)
          .delete()
          .eq('id', row.id);

        if (deleteError) {
          if (isMissingFriendshipsTable(deleteError)) return friendshipsUnavailableResponse(res);
          return res.status(500).json({ ok: false, error: 'Falha ao remover vínculo.' });
        }

        return res.status(200).json({ ok: true, removed: true, friendshipId: row.id });
      } catch (error) {
        if (isMissingFriendshipsTable(error)) return friendshipsUnavailableResponse(res);
        console.error('[api/progress] friendRemove', error);
        return res.status(500).json({ ok: false, error: 'Falha ao remover vínculo.' });
      }
    }

    if (action === 'friendProfile') {
      try {
        const targetUsername = normalizeUsernameQuery(username);
        const normalizedFriendUserId = Number(friendUserId);
        let target = null;

        if (targetUsername) {
          const { data, error } = await supabase
            .from(USERS_TABLE)
            .select('id, full_name, username, turma, role, xp, conquistas, completed_lessons, avatar_index')
            .ilike('username', targetUsername)
            .limit(1)
            .maybeSingle();
          if (error) {
            return res.status(500).json({ ok: false, error: 'Falha ao carregar perfil do companheiro.' });
          }
          target = data;
        } else if (Number.isInteger(normalizedFriendUserId) && normalizedFriendUserId > 0) {
          const { data, error } = await supabase
            .from(USERS_TABLE)
            .select('id, full_name, username, turma, role, xp, conquistas, completed_lessons, avatar_index')
            .eq('id', normalizedFriendUserId)
            .limit(1)
            .maybeSingle();
          if (error) {
            return res.status(500).json({ ok: false, error: 'Falha ao carregar perfil do companheiro.' });
          }
          target = data;
        } else {
          return res.status(400).json({ ok: false, error: 'Informe username ou friendUserId.' });
        }

        if (!target) {
          return res.status(404).json({ ok: false, error: 'Companheiro não encontrado.' });
        }
        if (sameUserId(target.id, userId)) {
          return res.status(400).json({ ok: false, error: 'Não é possível espelhar a si mesmo.' });
        }

        const bond = await findFriendshipBetween(userId, target.id);
        if (!bond || bond.status !== 'accepted') {
          // 404 genérico: não vaza existência de perfil sem vínculo aceito.
          return res.status(404).json({ ok: false, error: 'Companheiro não encontrado.' });
        }

        return res.status(200).json({
          ok: true,
          profile: toPublicFriendProfile(target),
        });
      } catch (error) {
        if (isMissingFriendshipsTable(error)) return friendshipsUnavailableResponse(res);
        console.error('[api/progress] friendProfile', error);
        return res.status(500).json({ ok: false, error: 'Falha ao carregar perfil do companheiro.' });
      }
    }

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
      // O código é compartilhado pela turma: a única invalidação é o tempo.
      if (isCodeExpired(rewardRow)) {
        return res.status(410).json({ ok: false, error: 'Código expirado (validade de 20 minutos).' });
      }

      const redeemed = Array.isArray(user.redeemed_codes) ? [...user.redeemed_codes] : [];
      if (redeemed.includes(raw)) {
        return res.status(409).json({ ok: false, error: 'Você já resgatou este código.' });
      }

      const levelBefore = levelForXp(user.xp || 0);
      const newXp = (user.xp || 0) + (rewardRow.xp || 0);
      const completed = Array.isArray(user.completed_lessons) ? [...user.completed_lessons] : [];
      if (!completed.includes(rewardRow.lesson_id)) completed.push(rewardRow.lesson_id);

      redeemed.push(raw);

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

      // Telemetria do primeiro resgate; não invalida o código para os demais alunos.
      await supabase
        .from(CODES_TABLE)
        .update({ redeemed_at: new Date().toISOString(), redeemed_by: userId })
        .eq('code', raw)
        .is('redeemed_at', null);

      const levelAfter = levelForXp(newXp);
      const { data: updated } = await supabase.from(USERS_TABLE).select('*').eq('id', userId).limit(1).single();

      return res.status(200).json({
        ok: true,
        user: sanitizeUser(updated),
        awarded: {
          xp: rewardRow.xp,
          achievements: awardedAchievements,
          achievementDetails: mapAchievementDetails(awardedAchievements),
          lesson: rewardRow.lesson_title,
        },
        code: {
          code: rewardRow.code,
          expiresAt: codeExpiresAt(rewardRow),
        },
        leveledUp: levelAfter > levelBefore,
      });
    }

    if (action === 'addRunXP') {
      const xpDelta = Number(xp);
      const durationSeconds = Number(duration) || 0;
      if (!Number.isFinite(xpDelta) || xpDelta < 0) {
        return res.status(400).json({ ok: false, error: 'XP da run inválido.' });
      }

      const nextXp = Math.max(0, Number(user.xp || 0) + xpDelta);
      const { data: updated, error: updateError } = await supabase
        .from(USERS_TABLE)
        .update({ xp: nextXp })
        .eq('id', userId)
        .select('*')
        .single();

      if (updateError) {
        return res.status(500).json({ ok: false, error: 'Falha ao salvar XP da run.' });
      }

      return res.status(200).json({
        ok: true,
        user: sanitizeUser(updated),
        awarded: {
          xp: xpDelta,
          durationSeconds,
        },
        totalXp: nextXp,
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
        const key = String(row.gate_key || '');
        if (key === 'published' || Object.prototype.hasOwnProperty.call(gates, key)) {
          gates[key] = Boolean(row.released);
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
      const existingAchievements = Array.isArray(user.conquistas) ? [...user.conquistas] : [];
      const activityAlreadyAwarded = activity
        ? existingAchievements.includes(activity.achievementId)
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
      const awardedAchievementIds = [];
      let awardedXp = 0;

      if (activity && !activityAlreadyAwarded) {
        awardedAchievementIds.push(activity.achievementId);
        awardedXp += Number(activity.xp || 0);
      }

      const secretAwards = evaluateSecretAchievements(normalizedLessonId, text, existingAchievements);
      secretAwards.forEach((secret) => {
        awardedAchievementIds.push(secret.id);
        awardedXp += Number(secret.xp || 0);
      });

      if (awardedAchievementIds.length > 0 || awardedXp > 0) {
        const conquistas = [...existingAchievements];
        awardedAchievementIds.forEach((id) => {
          if (!conquistas.includes(id)) conquistas.push(id);
        });
        const xp = Number(user.xp || 0) + awardedXp;
        const { data, error: userUpdateError } = await supabase
          .from(USERS_TABLE)
          .update({ xp, conquistas })
          .eq('id', userId)
          .select('*')
          .single();
        if (userUpdateError) return res.status(500).json({ ok: false, error: 'Falha ao conceder recompensa da atividade.' });

        updatedUser = data;
        awarded = {
          xp: awardedXp,
          achievements: awardedAchievementIds,
          achievementDetails: mapAchievementDetails(awardedAchievementIds),
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
        const key = String(row.gate_key || '');
        if (key === 'published' || Object.prototype.hasOwnProperty.call(gates, key)) {
          gates[key] = Boolean(row.released);
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
