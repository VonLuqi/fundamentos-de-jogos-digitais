import crypto from 'node:crypto';
import supabase from './supabaseClient.js';
import {
  ACHIEVEMENTS,
  getAchievementXp,
  levelForXp,
  mapAchievementDetails,
  rankForXp,
} from '../js/game-catalog.js';
import { evaluateGrimoireAchievementIds } from './_lib/grimoire-achievements.js';
import {
  allLessonSecretIds,
  evaluateSecretAchievements as evaluateLessonSecretAchievements,
} from './_lib/lesson-secret-achievements.js';

const USERS_TABLE = 'users';
const CODES_TABLE = 'redeem_codes';
const LESSON_GATES_TABLE = 'lesson_gates';
const LESSON_PARAGRAPHS_TABLE = 'lesson_paragraphs';
const LESSON_VIEWS_TABLE = 'lesson_views';
const FRIENDSHIPS_TABLE = 'friendships';
const NOTES_TABLE = 'user_notes';
const NOTE_SHARES_TABLE = 'user_note_shares';
const NOTE_EVENTS_TABLE = 'user_note_events';
const NOTE_ROW_SELECT = 'id, user_id, title, body, pinned, tags, lesson_id, cloned_from_note_id, created_at, updated_at';
const CODE_TTL_MINUTES = 20;
const FRIEND_LIMIT = 25;
const FRIEND_SEARCH_LIMIT = 8;
const NOTE_TITLE_MAX = 120;
const NOTE_BODY_MAX = 8000;
const NOTE_SOFT_WARN_COUNT = 50;
/** Copy alinhada à microcopy Task 1 — respostas 403 de tools do Mestre. */
const ADMIN_FORBIDDEN = 'Esta senda é só do Mestre.';

const UNDERWORLD_SOBERANO_ID = 'soberano_do_submundo';
const UNDERWORLD_ESTIGE_HASH = '18fec91c717e94c6b979a9c288ac1e041fd57101a2a2379b346e3b4fce39083c';
const UNDERWORLD_ORACLE_TOKEN = Buffer.from('key_elestial_hades', 'utf8').toString('base64');
const underworldRedeemAttempts = new Map();

function underworldRateLimited(userId) {
  const key = String(userId);
  const now = Date.now();
  const windowMs = 60_000;
  const maxAttempts = 12;
  const recent = (underworldRedeemAttempts.get(key) || []).filter((ts) => now - ts < windowMs);
  if (recent.length >= maxAttempts) {
    underworldRedeemAttempts.set(key, recent);
    return true;
  }
  recent.push(now);
  underworldRedeemAttempts.set(key, recent);
  return false;
}

function rejectUnlessAdmin(user, res) {
  if (user?.role === 'admin') return false;
  res.status(403).json({ ok: false, error: ADMIN_FORBIDDEN });
  return true;
}

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

const ACHIEVEMENT_RULES = [
  {
    id: 'aula1_concluida',
    test: (state) => Array.isArray(state.completed_lessons) && state.completed_lessons.includes('aula1'),
  },
];

const ALL_ACHIEVEMENT_IDS = [
  ...new Set([
    ...ACHIEVEMENTS.map((entry) => entry.id),
    ...ACHIEVEMENT_RULES.map((rule) => rule.id),
    ...Object.values(ACTIVITY_CATALOG).map((activity) => activity.achievementId),
    ...allLessonSecretIds(),
  ]),
];

function evaluateSecretAchievements(lessonId, paragraphText, alreadyUnlocked = []) {
  return evaluateLessonSecretAchievements(lessonId, paragraphText, alreadyUnlocked)
    .map((entry) => ({
      id: entry.id,
      xp: getAchievementXp(entry.id),
    }));
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

function isMissingNotesTable(error) {
  return Boolean(
    error
    && (
      error.code === '42P01'
      || /user_notes|user_note_shares/i.test(error.message || '')
    )
  );
}

function notesUnavailableResponse(res) {
  return res.status(503).json({
    ok: false,
    error: 'Tabela user_notes não existe. Rode o SQL de migração.',
  });
}

function normalizeNoteTags(raw) {
  let list = [];
  if (Array.isArray(raw)) list = raw;
  else if (typeof raw === 'string') {
    list = raw.split(/[,;#]+/);
  }
  const cleaned = [...new Set(
    list
      .map((tag) => String(tag || '').trim().slice(0, 32))
      .filter(Boolean)
  )].slice(0, 12);
  return cleaned;
}

function normalizeNoteLessonId(raw) {
  const id = String(raw || '').trim();
  if (!id) return null;
  if (!LESSON_CATALOG[id]) return null;
  return id;
}

/** Gate `published` efetivo (defaults + lesson_gates), alinhado à Trilha. */
async function isLessonPublishedForNotes(lessonId) {
  const id = String(lessonId || '');
  if (!LESSON_CATALOG[id]) return false;
  const defaults = defaultGatesForLesson(id);
  let published = Boolean(defaults.published);

  const { data: rows, error } = await supabase
    .from(LESSON_GATES_TABLE)
    .select('gate_key, released')
    .eq('lesson_id', id);

  if (error) {
    if (error.code === '42P01' || /lesson_gates/i.test(error.message || '')) {
      return published;
    }
    throw error;
  }

  (rows || []).forEach((row) => {
    if (String(row.gate_key || '') === 'published') {
      published = Boolean(row.released);
    }
  });
  return published;
}

/**
 * Valida lesson_id em create/update de notas.
 * @param {*} rawLessonId
 * @param {{ allowExistingId?: string|null }} [options] — update: permite manter vínculo já salvo mesmo se a aula foi re-trancada
 */
async function resolveNoteLessonIdOrReject(rawLessonId, options = {}) {
  const normalized = normalizeNoteLessonId(rawLessonId);
  if (!normalized) return { ok: true, lessonId: null };

  const allowExisting = options.allowExistingId
    ? normalizeNoteLessonId(options.allowExistingId)
    : null;
  if (allowExisting && normalized === allowExisting) {
    return { ok: true, lessonId: normalized };
  }

  const published = await isLessonPublishedForNotes(normalized);
  if (!published) {
    return {
      ok: false,
      error: 'Esta aula ainda não foi liberada na Trilha.',
    };
  }
  return { ok: true, lessonId: normalized };
}

function toNoteSummary(row, shareMeta = {}) {
  const tags = Array.isArray(row.tags) ? row.tags : normalizeNoteTags(row.tags);
  return {
    id: row.id,
    title: row.title,
    pinned: Boolean(row.pinned),
    tags,
    lessonId: row.lesson_id || null,
    clonedFromNoteId: row.cloned_from_note_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sharedWithCount: Number(shareMeta.sharedWithCount || 0),
    sharedWithUsernames: Array.isArray(shareMeta.sharedWithUsernames)
      ? shareMeta.sharedWithUsernames
      : [],
    unreadEventsCount: Number(shareMeta.unreadEventsCount || 0),
  };
}

function toNoteDetail(row, sharedWith = [], extras = {}) {
  return {
    ...toNoteSummary(row, {
      sharedWithCount: sharedWith.length,
      sharedWithUsernames: sharedWith.map((u) => u.username).filter(Boolean),
      unreadEventsCount: extras.unreadEventsCount,
    }),
    body: row.body || '',
    userId: row.user_id,
    sharedWith,
    clonedFrom: extras.clonedFrom || null,
    events: Array.isArray(extras.events) ? extras.events : [],
  };
}

async function insertNoteEvent(noteId, actorUserId, kind) {
  const { error } = await supabase.from(NOTE_EVENTS_TABLE).insert({
    note_id: noteId,
    actor_user_id: actorUserId,
    kind,
    created_at: new Date().toISOString(),
  });
  if (error) {
    if (error.code === '42P01' || /user_note_events/i.test(error.message || '')) {
      return;
    }
    throw error;
  }
}

async function fetchNoteEventsForOwner(noteId, { limit = 20 } = {}) {
  const { data: rows, error } = await supabase
    .from(NOTE_EVENTS_TABLE)
    .select('id, note_id, actor_user_id, kind, created_at, read_at')
    .eq('note_id', noteId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    if (error.code === '42P01' || /user_note_events/i.test(error.message || '')) {
      return [];
    }
    throw error;
  }
  const actors = await fetchUsersByIds((rows || []).map((row) => row.actor_user_id));
  return (rows || []).map((row) => {
    const actor = actors.get(Number(row.actor_user_id));
    return {
      id: row.id,
      kind: row.kind,
      createdAt: row.created_at,
      readAt: row.read_at || null,
      actor: actor
        ? {
            userId: actor.id,
            username: actor.username,
            fullName: actor.full_name || actor.username,
          }
        : null,
    };
  });
}

async function countUnreadNoteEvents(noteIds = []) {
  const unique = [...new Set(noteIds.map((id) => Number(id)).filter((id) => id > 0))];
  const counts = new Map();
  if (unique.length === 0) return counts;
  const { data: rows, error } = await supabase
    .from(NOTE_EVENTS_TABLE)
    .select('note_id')
    .in('note_id', unique)
    .is('read_at', null);
  if (error) {
    if (error.code === '42P01' || /user_note_events/i.test(error.message || '')) {
      return counts;
    }
    throw error;
  }
  (rows || []).forEach((row) => {
    const id = Number(row.note_id);
    counts.set(id, (counts.get(id) || 0) + 1);
  });
  return counts;
}

async function resolveClonedFrom(clonedFromNoteId) {
  const id = Number(clonedFromNoteId);
  if (!Number.isInteger(id) || id <= 0) return null;
  const { data: row, error } = await supabase
    .from(NOTES_TABLE)
    .select('id, user_id, title')
    .eq('id', id)
    .maybeSingle();
  if (error || !row) return null;
  const owners = await fetchUsersByIds([row.user_id]);
  const owner = owners.get(Number(row.user_id));
  return {
    noteId: row.id,
    title: row.title,
    owner: owner
      ? {
          userId: owner.id,
          username: owner.username,
          fullName: owner.full_name || owner.username,
        }
      : null,
  };
}

async function countUserNotes(ownerId) {
  const { count, error } = await supabase
    .from(NOTES_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', ownerId);
  if (error) throw error;
  return Number(count || 0);
}

/** Contagem de inscrições próprias excluindo clones (Fase 4 — dez_inscricoes). */
async function countOriginalUserNotes(ownerId) {
  const { count, error } = await supabase
    .from(NOTES_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', ownerId)
    .is('cloned_from_note_id', null);
  if (error) throw error;
  return Number(count || 0);
}

async function awardAchievementIds(user, achievementIds = []) {
  const existing = Array.isArray(user.conquistas) ? [...user.conquistas] : [];
  const fresh = [...new Set(
    (Array.isArray(achievementIds) ? achievementIds : [])
      .map((id) => String(id || ''))
      .filter((id) => id && !existing.includes(id))
  )];
  if (fresh.length === 0) {
    return {
      user,
      awarded: { xp: 0, achievements: [], achievementDetails: [] },
      leveledUp: false,
    };
  }

  const xpGain = fresh.reduce((sum, id) => sum + (getAchievementXp(id) || 0), 0);
  const nextXp = Number(user.xp || 0) + xpGain;
  const conquistas = [...existing, ...fresh];
  const { data: updated, error } = await supabase
    .from(USERS_TABLE)
    .update({ xp: nextXp, conquistas })
    .eq('id', user.id)
    .select('*')
    .single();
  if (error) throw error;

  return {
    user: updated,
    awarded: {
      xp: xpGain,
      achievements: fresh,
      achievementDetails: mapAchievementDetails(fresh),
    },
    leveledUp: levelForXp(nextXp) > levelForXp(user.xp || 0),
  };
}

async function evaluateAndAwardGrimoire(user, snapshot) {
  const ids = evaluateGrimoireAchievementIds({
    ...snapshot,
    unlocked: Array.isArray(user.conquistas) ? user.conquistas : [],
  });
  if (ids.length === 0) {
    return {
      user,
      awarded: { xp: 0, achievements: [], achievementDetails: [] },
      leveledUp: false,
    };
  }
  return awardAchievementIds(user, ids);
}

async function fetchSharesForNotes(noteIds = []) {
  const unique = [...new Set(noteIds.map((id) => Number(id)).filter((id) => id > 0))];
  if (unique.length === 0) return new Map();

  const { data, error } = await supabase
    .from(NOTE_SHARES_TABLE)
    .select('note_id, shared_with_user_id')
    .in('note_id', unique);
  if (error) throw error;

  const userIds = (data || []).map((row) => row.shared_with_user_id);
  const usersById = await fetchUsersByIds(userIds);
  const byNote = new Map();

  (data || []).forEach((row) => {
    const noteId = Number(row.note_id);
    const user = usersById.get(Number(row.shared_with_user_id));
    if (!byNote.has(noteId)) byNote.set(noteId, []);
    if (user) {
      byNote.get(noteId).push({
        userId: user.id,
        username: user.username,
        fullName: user.full_name || user.username,
      });
    }
  });

  return byNote;
}

async function assertAcceptedBond(userA, userB) {
  const bond = await findFriendshipBetween(userA, userB);
  return Boolean(bond && bond.status === 'accepted');
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

function toClassmateCard(row, bondStatus = 'none', friendshipId = null) {
  const card = toFriendCard(row);
  return {
    id: card.id,
    username: card.username,
    fullName: card.fullName,
    avatarIndex: card.avatarIndex,
    turma: card.turma,
    role: card.role,
    xp: card.xp,
    rank: card.rank,
    level: card.level,
    bondStatus,
    friendshipId: friendshipId || null,
  };
}

/** Espelho completo — bond aceito. */
function toPublicFriendProfile(row) {
  const card = toFriendCard(row);
  const achievements = Array.isArray(row.conquistas) ? row.conquistas : [];
  const completed = Array.isArray(row.completed_lessons) ? row.completed_lessons : [];
  return {
    ...card,
    achievements,
    completedLessonsCount: completed.length,
    mirrorMode: 'companion',
  };
}

/** Espelho da Turma — mesma turma, sem bond; sem álbum/XP detalhado. */
function toTurmaMirrorProfile(row) {
  const card = toFriendCard(row);
  return {
    id: card.id,
    username: card.username,
    fullName: card.fullName,
    turma: card.turma,
    avatarIndex: card.avatarIndex,
    rank: card.rank,
    level: card.level,
    role: card.role,
    mirrorMode: 'turma',
  };
}

function resolveBondStatus(bond, viewerId) {
  if (!bond) return 'none';
  if (bond.status === 'accepted') return 'accepted';
  if (bond.status === 'pending') {
    if (sameUserId(bond.requester_id, viewerId)) return 'outgoing';
    if (sameUserId(bond.addressee_id, viewerId)) return 'incoming';
  }
  return 'none';
}

function sameTurma(a, b) {
  const left = String(a || '').trim();
  const right = String(b || '').trim();
  return Boolean(left) && left === right;
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
      noteId,
      title,
      body,
      pinned,
      tags,
      sharedWithUserId,
      targetUserId,
      includeShared,
      turma: turmaFilterBody,
      submittedHash,
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

    if (action === 'classmatesList') {
      try {
        const isAdmin = user.role === 'admin';
        const ownTurma = String(user.turma || '').trim();

        // Lista de turmas com ≥1 aluno (para o filtro do Mestre).
        let turmasDisponiveis = [];
        {
          const { data: turmaRows, error: turmaListError } = await supabase
            .from(USERS_TABLE)
            .select('turma')
            .eq('role', 'student')
            .not('turma', 'is', null)
            .neq('turma', '');
          if (turmaListError) {
            return res.status(500).json({ ok: false, error: 'Falha ao listar a turma.' });
          }
          turmasDisponiveis = [...new Set(
            (turmaRows || [])
              .map((row) => String(row.turma || '').trim())
              .filter(Boolean)
          )].sort((a, b) => a.localeCompare(b, 'pt'));
        }

        let filterTurma = null;
        if (isAdmin) {
          const requested = String(turmaFilterBody || '').trim();
          if (requested && requested !== '*' && requested.toLowerCase() !== 'all') {
            filterTurma = requested;
          }
        } else {
          // Aluno: sempre a própria turma (ignora turma do body).
          if (!ownTurma) {
            return res.status(200).json({
              ok: true,
              turma: null,
              adminView: false,
              turmasDisponiveis: [],
              count: 0,
              classmates: [],
            });
          }
          filterTurma = ownTurma;
        }

        let query = supabase
          .from(USERS_TABLE)
          .select('id, full_name, username, turma, role, xp, avatar_index')
          .eq('role', 'student')
          .neq('id', userId)
          .order('username', { ascending: true })
          .limit(isAdmin && !filterTurma ? 300 : 100);

        if (filterTurma) {
          query = query.eq('turma', filterTurma);
        }

        const { data: rows, error } = await query;

        if (error) {
          return res.status(500).json({ ok: false, error: 'Falha ao listar a turma.' });
        }

        let bondByOtherId = new Map();
        try {
          const { data: bonds, error: bondError } = await supabase
            .from(FRIENDSHIPS_TABLE)
            .select('id, requester_id, addressee_id, status')
            .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

          if (bondError) {
            if (isMissingFriendshipsTable(bondError)) return friendshipsUnavailableResponse(res);
            return res.status(500).json({ ok: false, error: 'Falha ao listar a turma.' });
          }

          bondByOtherId = new Map();
          (bonds || []).forEach((bond) => {
            const otherId = sameUserId(bond.requester_id, userId)
              ? Number(bond.addressee_id)
              : Number(bond.requester_id);
            bondByOtherId.set(otherId, {
              status: resolveBondStatus(bond, userId),
              friendshipId: bond.id,
            });
          });
        } catch (bondErr) {
          if (isMissingFriendshipsTable(bondErr)) return friendshipsUnavailableResponse(res);
          throw bondErr;
        }

        const classmates = (rows || []).map((row) => {
          const bondMeta = bondByOtherId.get(Number(row.id));
          return toClassmateCard(
            row,
            bondMeta?.status || 'none',
            bondMeta?.friendshipId || null
          );
        });

        return res.status(200).json({
          ok: true,
          turma: filterTurma,
          adminView: isAdmin,
          turmasDisponiveis,
          count: classmates.length,
          classmates,
        });
      } catch (error) {
        if (isMissingFriendshipsTable(error)) return friendshipsUnavailableResponse(res);
        console.error('[api/progress] classmatesList', error);
        return res.status(500).json({ ok: false, error: 'Falha ao listar a turma.' });
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
          return res.status(404).json({ ok: false, error: 'Nenhuma alma com esse username.' });
        }
        if (target.id === userId) {
          return res.status(400).json({ ok: false, error: 'Não se oferece vínculo a si mesmo.' });
        }

        // Match global exato: exige igualdade case-insensitive completa (não prefixo).
        if (String(target.username).toLowerCase() !== targetUsername.toLowerCase()) {
          return res.status(404).json({ ok: false, error: 'Nenhuma alma com esse username.' });
        }

        const existing = await findFriendshipBetween(userId, target.id);
        if (existing?.status === 'accepted') {
          return res.status(409).json({ ok: false, error: 'Este vínculo já foi selado.' });
        }
        if (existing?.status === 'pending') {
          return res.status(409).json({ ok: false, error: 'Este convite já está em viagem.' });
        }

        const myCount = await countAcceptedFriends(userId);
        if (myCount >= FRIEND_LIMIT) {
          return res.status(409).json({
            ok: false,
            error: `Sua companhia já está completa (${FRIEND_LIMIT}). Rompa um vínculo para oferecer outro.`,
          });
        }

        const theirCount = await countAcceptedFriends(target.id);
        if (theirCount >= FRIEND_LIMIT) {
          return res.status(409).json({
            ok: false,
            error: 'A companhia deste aluno já está completa.',
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
            return res.status(409).json({ ok: false, error: 'Este convite já está em viagem.' });
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
            error: `Sua companhia já está completa (${FRIEND_LIMIT}). Rompa um vínculo para oferecer outro.`,
          });
        }
        const theirCount = await countAcceptedFriends(row.requester_id);
        if (theirCount >= FRIEND_LIMIT) {
          return res.status(409).json({
            ok: false,
            error: 'A companhia deste aluno já está completa.',
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
        const bondStatus = resolveBondStatus(bond, userId);

        if (bondStatus === 'accepted') {
          return res.status(200).json({
            ok: true,
            bondStatus,
            includeAchievements: true,
            profile: toPublicFriendProfile(target),
          });
        }

        // Espelho da Turma: mesma turma, alvo aluno (não admin).
        const canTurmaMirror = (
          target.role !== 'admin'
          && user.role !== 'admin'
          && sameTurma(user.turma, target.turma)
        );

        if (canTurmaMirror) {
          return res.status(200).json({
            ok: true,
            bondStatus,
            includeAchievements: false,
            profile: toTurmaMirrorProfile(target),
          });
        }

        if (bondStatus === 'outgoing' || bondStatus === 'incoming') {
          return res.status(403).json({
            ok: false,
            error: 'É preciso um vínculo para contemplar este espelho.',
            bondStatus,
          });
        }

        return res.status(403).json({
          ok: false,
          error: 'Este espelho não se abre a estranhos da jornada.',
          bondStatus: 'none',
        });
      } catch (error) {
        if (isMissingFriendshipsTable(error)) return friendshipsUnavailableResponse(res);
        console.error('[api/progress] friendProfile', error);
        return res.status(500).json({ ok: false, error: 'Falha ao carregar perfil do companheiro.' });
      }
    }

    /* ---------- Grimório Pessoal (user_notes) ---------- */

    if (action === 'notesList') {
      try {
        const { data: ownRows, error } = await supabase
          .from(NOTES_TABLE)
          .select(NOTE_ROW_SELECT)
          .eq('user_id', userId)
          .order('pinned', { ascending: false })
          .order('updated_at', { ascending: false });

        if (error) {
          if (isMissingNotesTable(error)) return notesUnavailableResponse(res);
          return res.status(500).json({ ok: false, error: 'Falha ao listar o Grimório.' });
        }

        const ownIds = (ownRows || []).map((row) => row.id);
        const sharesByNote = await fetchSharesForNotes(ownIds);
        const unreadByNote = await countUnreadNoteEvents(ownIds);
        const notes = (ownRows || []).map((row) => {
          const sharedWith = sharesByNote.get(Number(row.id)) || [];
          return toNoteSummary(row, {
            sharedWithCount: sharedWith.length,
            sharedWithUsernames: sharedWith.map((u) => u.username),
            unreadEventsCount: unreadByNote.get(Number(row.id)) || 0,
          });
        });

        let sharedWithMe = [];
        if (includeShared) {
          const { data: shareRows, error: shareError } = await supabase
            .from(NOTE_SHARES_TABLE)
            .select('note_id')
            .eq('shared_with_user_id', userId);
          if (shareError) {
            if (isMissingNotesTable(shareError)) return notesUnavailableResponse(res);
            return res.status(500).json({ ok: false, error: 'Falha ao listar revelações.' });
          }
          const sharedIds = (shareRows || []).map((row) => Number(row.note_id));
          if (sharedIds.length > 0) {
            const { data: sharedNotes, error: sharedNotesError } = await supabase
              .from(NOTES_TABLE)
              .select(NOTE_ROW_SELECT)
              .in('id', sharedIds)
              .order('updated_at', { ascending: false });
            if (sharedNotesError) {
              return res.status(500).json({ ok: false, error: 'Falha ao listar revelações.' });
            }
            const owners = await fetchUsersByIds((sharedNotes || []).map((row) => row.user_id));
            sharedWithMe = (sharedNotes || []).map((row) => ({
              ...toNoteSummary(row),
              owner: (() => {
                const owner = owners.get(Number(row.user_id));
                return owner
                  ? {
                      userId: owner.id,
                      username: owner.username,
                      fullName: owner.full_name || owner.username,
                    }
                  : null;
              })(),
            }));
          }
        }

        const count = notes.length;
        return res.status(200).json({
          ok: true,
          count,
          softWarning: count >= NOTE_SOFT_WARN_COUNT,
          softWarningMessage: count >= NOTE_SOFT_WARN_COUNT
            ? `O Grimório engrossa… (${count} inscrições).`
            : null,
          notes,
          sharedWithMe,
        });
      } catch (error) {
        if (isMissingNotesTable(error)) return notesUnavailableResponse(res);
        console.error('[api/progress] notesList', error);
        return res.status(500).json({ ok: false, error: 'Falha ao listar o Grimório.' });
      }
    }

    if (action === 'noteGet') {
      try {
        const id = Number(noteId);
        if (!Number.isInteger(id) || id <= 0) {
          return res.status(400).json({ ok: false, error: 'noteId inválido.' });
        }

        const { data: row, error } = await supabase
          .from(NOTES_TABLE)
          .select(NOTE_ROW_SELECT)
          .eq('id', id)
          .limit(1)
          .maybeSingle();

        if (error) {
          if (isMissingNotesTable(error)) return notesUnavailableResponse(res);
          return res.status(500).json({ ok: false, error: 'Falha ao abrir a inscrição.' });
        }
        if (!row) {
          return res.status(404).json({ ok: false, error: 'Inscrição não encontrada.' });
        }

        const isOwner = sameUserId(row.user_id, userId);
        const isAdmin = user.role === 'admin';
        let isSharedViewer = false;
        if (!isOwner) {
          const { data: share, error: shareError } = await supabase
            .from(NOTE_SHARES_TABLE)
            .select('note_id')
            .eq('note_id', id)
            .eq('shared_with_user_id', userId)
            .maybeSingle();
          if (shareError) {
            if (isMissingNotesTable(shareError)) return notesUnavailableResponse(res);
            return res.status(500).json({ ok: false, error: 'Falha ao abrir a inscrição.' });
          }
          isSharedViewer = Boolean(share);
        }

        if (!isOwner && !isAdmin && !isSharedViewer) {
          return res.status(403).json({ ok: false, error: 'Esta inscrição não foi revelada a você.' });
        }

        const sharesByNote = await fetchSharesForNotes([id]);
        const sharedWith = sharesByNote.get(id) || [];
        const canEdit = isOwner;
        const canClone = isSharedViewer && !isOwner;
        const canRefuse = isSharedViewer && !isOwner;

        let events = [];
        let unreadEventsCount = 0;
        if (isOwner) {
          events = await fetchNoteEventsForOwner(id);
          unreadEventsCount = events.filter((event) => !event.readAt).length;
        }

        const clonedFrom = await resolveClonedFrom(row.cloned_from_note_id);

        let owner = null;
        if (!isOwner) {
          const owners = await fetchUsersByIds([row.user_id]);
          const ownerRow = owners.get(Number(row.user_id));
          owner = ownerRow
            ? {
                userId: ownerRow.id,
                username: ownerRow.username,
                fullName: ownerRow.full_name || ownerRow.username,
              }
            : null;
        }

        return res.status(200).json({
          ok: true,
          canEdit,
          canClone,
          canRefuse,
          readOnly: !canEdit,
          note: {
            ...toNoteDetail(row, sharedWith, {
              clonedFrom,
              events,
              unreadEventsCount,
            }),
            owner,
          },
        });
      } catch (error) {
        if (isMissingNotesTable(error)) return notesUnavailableResponse(res);
        console.error('[api/progress] noteGet', error);
        return res.status(500).json({ ok: false, error: 'Falha ao abrir a inscrição.' });
      }
    }

    if (action === 'noteCreate') {
      try {
        const cleanTitle = String(title || '').trim();
        const cleanBody = String(body ?? '');
        if (!cleanTitle) {
          return res.status(400).json({ ok: false, error: 'Toda inscrição precisa de um título.' });
        }
        if (cleanTitle.length > NOTE_TITLE_MAX) {
          return res.status(400).json({
            ok: false,
            error: `O título ultrapassou o limite do pergaminho (${NOTE_TITLE_MAX}).`,
          });
        }
        if (cleanBody.length > NOTE_BODY_MAX) {
          return res.status(400).json({
            ok: false,
            error: `A inscrição é longa demais para este Grimório (${NOTE_BODY_MAX}).`,
          });
        }

        let resolvedLesson;
        try {
          resolvedLesson = await resolveNoteLessonIdOrReject(lessonId);
        } catch (gateError) {
          console.error('[api/progress] noteCreate lesson gate', gateError);
          return res.status(500).json({ ok: false, error: 'Falha ao validar a aula da inscrição.' });
        }
        if (!resolvedLesson.ok) {
          return res.status(400).json({ ok: false, error: resolvedLesson.error });
        }

        const nowIso = new Date().toISOString();
        const payload = {
          user_id: userId,
          title: cleanTitle,
          body: cleanBody,
          pinned: Boolean(pinned),
          tags: normalizeNoteTags(tags),
          lesson_id: resolvedLesson.lessonId,
          created_at: nowIso,
          updated_at: nowIso,
        };

        const { data: created, error } = await supabase
          .from(NOTES_TABLE)
          .insert(payload)
          .select(NOTE_ROW_SELECT)
          .single();

        if (error) {
          if (isMissingNotesTable(error)) return notesUnavailableResponse(res);
          return res.status(500).json({ ok: false, error: 'Falha ao criar inscrição.' });
        }

        const count = await countUserNotes(userId);
        const originalCount = await countOriginalUserNotes(userId);
        let awardResult = {
          user,
          awarded: { xp: 0, achievements: [], achievementDetails: [] },
          leveledUp: false,
        };
        try {
          awardResult = await evaluateAndAwardGrimoire(user, {
            event: 'create',
            originalNoteCount: originalCount,
            isCloneNote: false,
            note: {
              lessonId: created.lesson_id,
              body: created.body,
              tags: created.tags,
              shareCount: 0,
              pinned: Boolean(created.pinned),
            },
          });
        } catch (awardError) {
          console.error('[api/progress] noteCreate awards', awardError);
        }

        return res.status(201).json({
          ok: true,
          count,
          softWarning: count >= NOTE_SOFT_WARN_COUNT,
          softWarningMessage: count >= NOTE_SOFT_WARN_COUNT
            ? `O Grimório engrossa… (${count} inscrições).`
            : null,
          note: toNoteDetail(created, []),
          awarded: awardResult.awarded,
          leveledUp: awardResult.leveledUp,
          user: sanitizeUser(awardResult.user),
        });
      } catch (error) {
        if (isMissingNotesTable(error)) return notesUnavailableResponse(res);
        console.error('[api/progress] noteCreate', error);
        return res.status(500).json({ ok: false, error: 'Falha ao criar inscrição.' });
      }
    }

    if (action === 'noteUpdate') {
      try {
        const id = Number(noteId);
        if (!Number.isInteger(id) || id <= 0) {
          return res.status(400).json({ ok: false, error: 'noteId inválido.' });
        }

        const { data: existing, error: loadError } = await supabase
          .from(NOTES_TABLE)
          .select('id, user_id, lesson_id')
          .eq('id', id)
          .limit(1)
          .maybeSingle();
        if (loadError) {
          if (isMissingNotesTable(loadError)) return notesUnavailableResponse(res);
          return res.status(500).json({ ok: false, error: 'Falha ao atualizar inscrição.' });
        }
        if (!existing || !sameUserId(existing.user_id, userId)) {
          return res.status(404).json({ ok: false, error: 'Inscrição não encontrada.' });
        }

        const patch = { updated_at: new Date().toISOString() };
        if (title !== undefined) {
          const cleanTitle = String(title || '').trim();
          if (!cleanTitle) {
            return res.status(400).json({ ok: false, error: 'Toda inscrição precisa de um título.' });
          }
          if (cleanTitle.length > NOTE_TITLE_MAX) {
            return res.status(400).json({
              ok: false,
              error: `O título ultrapassou o limite do pergaminho (${NOTE_TITLE_MAX}).`,
            });
          }
          patch.title = cleanTitle;
        }
        if (body !== undefined) {
          const cleanBody = String(body ?? '');
          if (cleanBody.length > NOTE_BODY_MAX) {
            return res.status(400).json({
              ok: false,
              error: `A inscrição é longa demais para este Grimório (${NOTE_BODY_MAX}).`,
            });
          }
          patch.body = cleanBody;
        }
        if (pinned !== undefined) patch.pinned = Boolean(pinned);
        if (tags !== undefined) patch.tags = normalizeNoteTags(tags);
        if (lessonId !== undefined) {
          let resolvedLesson;
          try {
            resolvedLesson = await resolveNoteLessonIdOrReject(lessonId, {
              allowExistingId: existing.lesson_id,
            });
          } catch (gateError) {
            console.error('[api/progress] noteUpdate lesson gate', gateError);
            return res.status(500).json({ ok: false, error: 'Falha ao validar a aula da inscrição.' });
          }
          if (!resolvedLesson.ok) {
            return res.status(400).json({ ok: false, error: resolvedLesson.error });
          }
          patch.lesson_id = resolvedLesson.lessonId;
        }

        const { data: updated, error } = await supabase
          .from(NOTES_TABLE)
          .update(patch)
          .eq('id', id)
          .eq('user_id', userId)
          .select(NOTE_ROW_SELECT)
          .single();

        if (error) {
          if (isMissingNotesTable(error)) return notesUnavailableResponse(res);
          return res.status(500).json({ ok: false, error: 'Falha ao atualizar inscrição.' });
        }

        const sharesByNote = await fetchSharesForNotes([id]);
        const sharedWith = sharesByNote.get(id) || [];
        const originalCount = await countOriginalUserNotes(userId);
        let awardResult = {
          user,
          awarded: { xp: 0, achievements: [], achievementDetails: [] },
          leveledUp: false,
        };
        try {
          awardResult = await evaluateAndAwardGrimoire(user, {
            event: 'update',
            originalNoteCount: originalCount,
            isCloneNote: Boolean(updated.cloned_from_note_id),
            note: {
              lessonId: updated.lesson_id,
              body: updated.body,
              tags: updated.tags,
              shareCount: sharedWith.length,
              pinned: Boolean(updated.pinned),
            },
          });
        } catch (awardError) {
          console.error('[api/progress] noteUpdate awards', awardError);
        }

        return res.status(200).json({
          ok: true,
          note: toNoteDetail(updated, sharedWith),
          awarded: awardResult.awarded,
          leveledUp: awardResult.leveledUp,
          user: sanitizeUser(awardResult.user),
        });
      } catch (error) {
        if (isMissingNotesTable(error)) return notesUnavailableResponse(res);
        console.error('[api/progress] noteUpdate', error);
        return res.status(500).json({ ok: false, error: 'Falha ao atualizar inscrição.' });
      }
    }

    if (action === 'noteDelete') {
      try {
        const id = Number(noteId);
        if (!Number.isInteger(id) || id <= 0) {
          return res.status(400).json({ ok: false, error: 'noteId inválido.' });
        }

        const { data: existing, error: loadError } = await supabase
          .from(NOTES_TABLE)
          .select('id, user_id')
          .eq('id', id)
          .limit(1)
          .maybeSingle();
        if (loadError) {
          if (isMissingNotesTable(loadError)) return notesUnavailableResponse(res);
          return res.status(500).json({ ok: false, error: 'Falha ao rasgar inscrição.' });
        }
        if (!existing || !sameUserId(existing.user_id, userId)) {
          return res.status(404).json({ ok: false, error: 'Inscrição não encontrada.' });
        }

        const { error } = await supabase
          .from(NOTES_TABLE)
          .delete()
          .eq('id', id)
          .eq('user_id', userId);

        if (error) {
          if (isMissingNotesTable(error)) return notesUnavailableResponse(res);
          return res.status(500).json({ ok: false, error: 'Falha ao rasgar inscrição.' });
        }

        return res.status(200).json({ ok: true, deleted: true, noteId: id });
      } catch (error) {
        if (isMissingNotesTable(error)) return notesUnavailableResponse(res);
        console.error('[api/progress] noteDelete', error);
        return res.status(500).json({ ok: false, error: 'Falha ao rasgar inscrição.' });
      }
    }

    if (action === 'noteShare') {
      try {
        const id = Number(noteId);
        const targetId = Number(sharedWithUserId || friendUserId);
        if (!Number.isInteger(id) || id <= 0) {
          return res.status(400).json({ ok: false, error: 'noteId inválido.' });
        }
        if (!Number.isInteger(targetId) || targetId <= 0) {
          return res.status(400).json({ ok: false, error: 'Informe o companheiro.' });
        }
        if (sameUserId(targetId, userId)) {
          return res.status(400).json({ ok: false, error: 'Não se revela inscrição a si mesmo.' });
        }

        const { data: existing, error: loadError } = await supabase
          .from(NOTES_TABLE)
          .select('id, user_id')
          .eq('id', id)
          .limit(1)
          .maybeSingle();
        if (loadError) {
          if (isMissingNotesTable(loadError)) return notesUnavailableResponse(res);
          return res.status(500).json({ ok: false, error: 'Falha ao revelar inscrição.' });
        }
        if (!existing || !sameUserId(existing.user_id, userId)) {
          return res.status(404).json({ ok: false, error: 'Inscrição não encontrada.' });
        }

        const bonded = await assertAcceptedBond(userId, targetId);
        if (!bonded) {
          return res.status(403).json({
            ok: false,
            error: 'Só é possível revelar a quem está ao seu lado.',
          });
        }

        const { error } = await supabase
          .from(NOTE_SHARES_TABLE)
          .upsert(
            { note_id: id, shared_with_user_id: targetId, created_at: new Date().toISOString() },
            { onConflict: 'note_id,shared_with_user_id' }
          );
        if (error) {
          if (isMissingNotesTable(error)) return notesUnavailableResponse(res);
          return res.status(500).json({ ok: false, error: 'Falha ao revelar inscrição.' });
        }

        const sharesByNote = await fetchSharesForNotes([id]);
        const { data: row } = await supabase
          .from(NOTES_TABLE)
          .select(NOTE_ROW_SELECT)
          .eq('id', id)
          .single();

        const sharedWith = sharesByNote.get(id) || [];
        let awardResult = {
          user,
          awarded: { xp: 0, achievements: [], achievementDetails: [] },
          leveledUp: false,
        };
        try {
          awardResult = await evaluateAndAwardGrimoire(user, {
            event: 'share',
            originalNoteCount: await countOriginalUserNotes(userId),
            isCloneNote: Boolean(row?.cloned_from_note_id),
            note: {
              lessonId: row?.lesson_id,
              body: row?.body,
              tags: row?.tags,
              shareCount: sharedWith.length,
            },
          });
        } catch (awardError) {
          console.error('[api/progress] noteShare awards', awardError);
        }

        return res.status(200).json({
          ok: true,
          note: toNoteDetail(row, sharedWith),
          awarded: awardResult.awarded,
          leveledUp: awardResult.leveledUp,
          user: sanitizeUser(awardResult.user),
        });
      } catch (error) {
        if (isMissingNotesTable(error) || isMissingFriendshipsTable(error)) {
          if (isMissingNotesTable(error)) return notesUnavailableResponse(res);
          return friendshipsUnavailableResponse(res);
        }
        console.error('[api/progress] noteShare', error);
        return res.status(500).json({ ok: false, error: 'Falha ao revelar inscrição.' });
      }
    }

    if (action === 'noteUnshare') {
      try {
        const id = Number(noteId);
        const targetId = Number(sharedWithUserId || friendUserId);
        if (!Number.isInteger(id) || id <= 0) {
          return res.status(400).json({ ok: false, error: 'noteId inválido.' });
        }
        if (!Number.isInteger(targetId) || targetId <= 0) {
          return res.status(400).json({ ok: false, error: 'Informe o companheiro.' });
        }

        const { data: existing, error: loadError } = await supabase
          .from(NOTES_TABLE)
          .select('id, user_id')
          .eq('id', id)
          .limit(1)
          .maybeSingle();
        if (loadError) {
          if (isMissingNotesTable(loadError)) return notesUnavailableResponse(res);
          return res.status(500).json({ ok: false, error: 'Falha ao velar inscrição.' });
        }
        if (!existing || !sameUserId(existing.user_id, userId)) {
          return res.status(404).json({ ok: false, error: 'Inscrição não encontrada.' });
        }

        const { error } = await supabase
          .from(NOTE_SHARES_TABLE)
          .delete()
          .eq('note_id', id)
          .eq('shared_with_user_id', targetId);
        if (error) {
          if (isMissingNotesTable(error)) return notesUnavailableResponse(res);
          return res.status(500).json({ ok: false, error: 'Falha ao velar inscrição.' });
        }

        const sharesByNote = await fetchSharesForNotes([id]);
        const { data: row } = await supabase
          .from(NOTES_TABLE)
          .select(NOTE_ROW_SELECT)
          .eq('id', id)
          .single();

        return res.status(200).json({
          ok: true,
          note: toNoteDetail(row, sharesByNote.get(id) || []),
        });
      } catch (error) {
        if (isMissingNotesTable(error)) return notesUnavailableResponse(res);
        console.error('[api/progress] noteUnshare', error);
        return res.status(500).json({ ok: false, error: 'Falha ao velar inscrição.' });
      }
    }

    if (action === 'noteClone') {
      try {
        const id = Number(noteId);
        if (!Number.isInteger(id) || id <= 0) {
          return res.status(400).json({ ok: false, error: 'noteId inválido.' });
        }

        const { data: source, error: loadError } = await supabase
          .from(NOTES_TABLE)
          .select(NOTE_ROW_SELECT)
          .eq('id', id)
          .limit(1)
          .maybeSingle();
        if (loadError) {
          if (isMissingNotesTable(loadError)) return notesUnavailableResponse(res);
          return res.status(500).json({ ok: false, error: 'Falha ao clonar inscrição.' });
        }
        if (!source) {
          return res.status(404).json({ ok: false, error: 'Inscrição não encontrada.' });
        }
        if (sameUserId(source.user_id, userId)) {
          return res.status(400).json({ ok: false, error: 'Essa inscrição já é sua.' });
        }

        const { data: share, error: shareError } = await supabase
          .from(NOTE_SHARES_TABLE)
          .select('note_id')
          .eq('note_id', id)
          .eq('shared_with_user_id', userId)
          .maybeSingle();
        if (shareError) {
          if (isMissingNotesTable(shareError)) return notesUnavailableResponse(res);
          return res.status(500).json({ ok: false, error: 'Falha ao clonar inscrição.' });
        }
        if (!share) {
          return res.status(403).json({ ok: false, error: 'Esta inscrição não foi revelada a você.' });
        }

        let resolvedLesson = { ok: true, lessonId: null };
        if (source.lesson_id) {
          try {
            resolvedLesson = await resolveNoteLessonIdOrReject(source.lesson_id);
          } catch (gateError) {
            console.error('[api/progress] noteClone lesson gate', gateError);
            return res.status(500).json({ ok: false, error: 'Falha ao validar a aula da inscrição.' });
          }
          if (!resolvedLesson.ok) {
            resolvedLesson = { ok: true, lessonId: null };
          }
        }

        const nowIso = new Date().toISOString();
        const payload = {
          user_id: userId,
          title: source.title,
          body: source.body || '',
          pinned: false,
          tags: normalizeNoteTags(source.tags),
          lesson_id: resolvedLesson.lessonId,
          cloned_from_note_id: source.id,
          created_at: nowIso,
          updated_at: nowIso,
        };

        const { data: created, error: createError } = await supabase
          .from(NOTES_TABLE)
          .insert(payload)
          .select(NOTE_ROW_SELECT)
          .single();
        if (createError) {
          if (isMissingNotesTable(createError)) return notesUnavailableResponse(res);
          return res.status(500).json({ ok: false, error: 'Falha ao clonar inscrição.' });
        }

        const { error: deleteShareError } = await supabase
          .from(NOTE_SHARES_TABLE)
          .delete()
          .eq('note_id', id)
          .eq('shared_with_user_id', userId);
        if (deleteShareError) {
          console.error('[api/progress] noteClone unshare', deleteShareError);
        }

        try {
          await insertNoteEvent(id, userId, 'cloned_by');
        } catch (eventError) {
          console.error('[api/progress] noteClone event', eventError);
        }

        const clonedFrom = await resolveClonedFrom(created.cloned_from_note_id);
        let awardResult = {
          user,
          awarded: { xp: 0, achievements: [], achievementDetails: [] },
          leveledUp: false,
        };
        try {
          awardResult = await evaluateAndAwardGrimoire(user, {
            event: 'clone',
            originalNoteCount: await countOriginalUserNotes(userId),
            isCloneNote: true,
            note: {
              lessonId: created.lesson_id,
              body: created.body,
              tags: created.tags,
              shareCount: 0,
            },
          });
        } catch (awardError) {
          console.error('[api/progress] noteClone awards', awardError);
        }

        return res.status(201).json({
          ok: true,
          note: toNoteDetail(created, [], { clonedFrom }),
          awarded: awardResult.awarded,
          leveledUp: awardResult.leveledUp,
          user: sanitizeUser(awardResult.user),
        });
      } catch (error) {
        if (isMissingNotesTable(error)) return notesUnavailableResponse(res);
        console.error('[api/progress] noteClone', error);
        return res.status(500).json({ ok: false, error: 'Falha ao clonar inscrição.' });
      }
    }

    if (action === 'noteRefuseShare') {
      try {
        const id = Number(noteId);
        if (!Number.isInteger(id) || id <= 0) {
          return res.status(400).json({ ok: false, error: 'noteId inválido.' });
        }

        const { data: source, error: loadError } = await supabase
          .from(NOTES_TABLE)
          .select('id, user_id')
          .eq('id', id)
          .limit(1)
          .maybeSingle();
        if (loadError) {
          if (isMissingNotesTable(loadError)) return notesUnavailableResponse(res);
          return res.status(500).json({ ok: false, error: 'Falha ao recusar revelação.' });
        }
        if (!source) {
          return res.status(404).json({ ok: false, error: 'Inscrição não encontrada.' });
        }
        if (sameUserId(source.user_id, userId)) {
          return res.status(400).json({ ok: false, error: 'Use Velar novamente para remover companheiros.' });
        }

        const { data: share, error: shareError } = await supabase
          .from(NOTE_SHARES_TABLE)
          .select('note_id')
          .eq('note_id', id)
          .eq('shared_with_user_id', userId)
          .maybeSingle();
        if (shareError) {
          if (isMissingNotesTable(shareError)) return notesUnavailableResponse(res);
          return res.status(500).json({ ok: false, error: 'Falha ao recusar revelação.' });
        }
        if (!share) {
          return res.status(403).json({ ok: false, error: 'Esta inscrição não foi revelada a você.' });
        }

        const { error: deleteError } = await supabase
          .from(NOTE_SHARES_TABLE)
          .delete()
          .eq('note_id', id)
          .eq('shared_with_user_id', userId);
        if (deleteError) {
          if (isMissingNotesTable(deleteError)) return notesUnavailableResponse(res);
          return res.status(500).json({ ok: false, error: 'Falha ao recusar revelação.' });
        }

        try {
          await insertNoteEvent(id, userId, 'veiled_by_recipient');
        } catch (eventError) {
          console.error('[api/progress] noteRefuseShare event', eventError);
        }

        return res.status(200).json({ ok: true, refused: true, noteId: id });
      } catch (error) {
        if (isMissingNotesTable(error)) return notesUnavailableResponse(res);
        console.error('[api/progress] noteRefuseShare', error);
        return res.status(500).json({ ok: false, error: 'Falha ao recusar revelação.' });
      }
    }

    if (action === 'noteEventsAck') {
      try {
        const id = Number(noteId);
        if (!Number.isInteger(id) || id <= 0) {
          return res.status(400).json({ ok: false, error: 'noteId inválido.' });
        }

        const { data: existing, error: loadError } = await supabase
          .from(NOTES_TABLE)
          .select('id, user_id')
          .eq('id', id)
          .limit(1)
          .maybeSingle();
        if (loadError) {
          if (isMissingNotesTable(loadError)) return notesUnavailableResponse(res);
          return res.status(500).json({ ok: false, error: 'Falha ao marcar eventos.' });
        }
        if (!existing || !sameUserId(existing.user_id, userId)) {
          return res.status(404).json({ ok: false, error: 'Inscrição não encontrada.' });
        }

        const { error } = await supabase
          .from(NOTE_EVENTS_TABLE)
          .update({ read_at: new Date().toISOString() })
          .eq('note_id', id)
          .is('read_at', null);
        if (error) {
          if (error.code === '42P01' || /user_note_events/i.test(error.message || '')) {
            return res.status(200).json({ ok: true, acknowledged: 0 });
          }
          return res.status(500).json({ ok: false, error: 'Falha ao marcar eventos.' });
        }

        return res.status(200).json({ ok: true, acknowledged: true });
      } catch (error) {
        if (isMissingNotesTable(error)) return notesUnavailableResponse(res);
        console.error('[api/progress] noteEventsAck', error);
        return res.status(500).json({ ok: false, error: 'Falha ao marcar eventos.' });
      }
    }

    if (action === 'notesListAdmin' || action === 'notesListForUser') {
      if (rejectUnlessAdmin(user, res)) return;
      try {
        if (action === 'notesListAdmin') {
          const { data: rows, error } = await supabase
            .from(NOTES_TABLE)
            .select('user_id');
          if (error) {
            if (isMissingNotesTable(error)) return notesUnavailableResponse(res);
            return res.status(500).json({ ok: false, error: 'Falha ao listar grimórios.' });
          }
          const counts = new Map();
          (rows || []).forEach((row) => {
            const id = Number(row.user_id);
            counts.set(id, (counts.get(id) || 0) + 1);
          });
          const usersById = await fetchUsersByIds([...counts.keys()]);
          const owners = [...counts.entries()]
            .map(([id, notesCount]) => {
              const owner = usersById.get(id);
              if (!owner || owner.role === 'admin') return null;
              return {
                userId: id,
                username: owner.username,
                fullName: owner.full_name || owner.username,
                turma: owner.turma || null,
                notesCount,
              };
            })
            .filter(Boolean)
            .sort((a, b) => b.notesCount - a.notesCount);

          return res.status(200).json({ ok: true, owners });
        }

        const ownerId = Number(targetUserId || friendUserId);
        if (!Number.isInteger(ownerId) || ownerId <= 0) {
          return res.status(400).json({ ok: false, error: 'Informe targetUserId.' });
        }
        const { data: ownRows, error } = await supabase
          .from(NOTES_TABLE)
          .select(NOTE_ROW_SELECT)
          .eq('user_id', ownerId)
          .order('pinned', { ascending: false })
          .order('updated_at', { ascending: false });
        if (error) {
          if (isMissingNotesTable(error)) return notesUnavailableResponse(res);
          return res.status(500).json({ ok: false, error: 'Falha ao listar grimório do aluno.' });
        }
        const sharesByNote = await fetchSharesForNotes((ownRows || []).map((row) => row.id));
        const notes = (ownRows || []).map((row) => {
          const sharedWith = sharesByNote.get(Number(row.id)) || [];
          return toNoteSummary(row, {
            sharedWithCount: sharedWith.length,
            sharedWithUsernames: sharedWith.map((u) => u.username),
          });
        });
        return res.status(200).json({ ok: true, userId: ownerId, notes, count: notes.length });
      } catch (error) {
        if (isMissingNotesTable(error)) return notesUnavailableResponse(res);
        console.error('[api/progress] notes admin', error);
        return res.status(500).json({ ok: false, error: 'Falha na vigília do Grimório.' });
      }
    }

    if (action === 'underworldJudgment') {
      return res.status(200).json({
        ok: true,
        status: 'denied',
        message: 'Acesso Negado pelos Juízes',
        oracle_token: UNDERWORLD_ORACLE_TOKEN,
        encoding: 'Base64',
        hint: 'Use atob() no Console ou CyberChef para revelar o segredo.',
      });
    }

    if (action === 'underworldRedeem') {
      if (underworldRateLimited(userId)) {
        return res.status(429).json({ ok: false, error: 'Demasiadas oferendas. Aguarde um momento.' });
      }
      const hash = String(submittedHash || '').trim().toLowerCase();
      if (!hash) {
        return res.status(400).json({ ok: false, error: 'Óbolo ausente.' });
      }
      if (hash !== UNDERWORLD_ESTIGE_HASH) {
        return res.status(400).json({ ok: false, error: 'Óbolo rejeitado. Hash incorreto.' });
      }

      const existing = Array.isArray(user.conquistas) ? [...user.conquistas] : [];
      if (existing.includes(UNDERWORLD_SOBERANO_ID)) {
        return res.status(200).json({
          ok: true,
          alreadyOwned: true,
          awarded: { xp: 0, achievements: [], achievementDetails: [] },
          user: sanitizeUser(user),
        });
      }

      const xpGain = getAchievementXp(UNDERWORLD_SOBERANO_ID) || 1500;
      const nextXp = Number(user.xp || 0) + xpGain;
      const conquistas = [...existing, UNDERWORLD_SOBERANO_ID];
      const { data: updated, error: updateError } = await supabase
        .from(USERS_TABLE)
        .update({ xp: nextXp, conquistas })
        .eq('id', userId)
        .select('*')
        .single();
      if (updateError) {
        return res.status(500).json({ ok: false, error: 'Falha ao registrar a travessia.' });
      }

      return res.status(200).json({
        ok: true,
        alreadyOwned: false,
        awarded: {
          xp: xpGain,
          achievements: [UNDERWORLD_SOBERANO_ID],
          achievementDetails: mapAchievementDetails([UNDERWORLD_SOBERANO_ID]),
        },
        user: sanitizeUser(updated),
        leveledUp: levelForXp(nextXp) > levelForXp(user.xp || 0),
      });
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
      if (rejectUnlessAdmin(user, res)) return;
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
        const catalogXp = getAchievementXp(activity.achievementId);
        awardedXp += catalogXp > 0 ? catalogXp : Number(activity.xp || 0);
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
      if (rejectUnlessAdmin(user, res)) return;

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
      if (rejectUnlessAdmin(user, res)) return;
      const { data: rows, error } = await supabase
        .from(CODES_TABLE)
        .select('code, lesson_id, lesson_title, xp, created_at, redeemed_at, redeemed_by')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) return res.status(500).json({ ok: false, error: 'Falha ao listar códigos.' });
      return res.status(200).json({ ok: true, codes: normalizeCodes(rows) });
    }

    if (action === 'listUsers') {
      if (rejectUnlessAdmin(user, res)) return;
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
