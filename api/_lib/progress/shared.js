import crypto from 'node:crypto';
import supabase from '../../supabaseClient.js';
import {
  ACHIEVEMENTS,
  getAchievementById,
  getAchievementXp,
  levelForXp,
  mapAchievementDetails,
  rankForXp,
} from '../../../js/game-catalog.js';
import { evaluateGrimoireAchievementIds } from '../grimoire-achievements.js';
import {
  allLessonSecretIds,
  evaluateSecretAchievements as evaluateLessonSecretAchievements,
} from '../lesson-secret-achievements.js';
import { hasUnlockedLesson, LESSON_PREREQUISITES } from '../store.js';
import { ADMIN_AUDIT_ACTIONS, recordAdminAudit } from '../admin-audit.js';
import {
  applyRetryAfterHeader,
  consumeGameRateLimit,
} from '../rate-limit-kv.js';
import {
  DESPERTAR_GATE_ID,
  DESPERTAR_PUBLISHED_KEY,
  invalidateDespertarPublishedCache,
} from '../despertar-gate.js';
import {
  metricsBumpDb,
} from '../request-metrics.js';
import { invalidateLeaderboardCache } from '../leaderboard-cache.js';

// Re-export deps domain modules need without deep relative paths
export {
  crypto,
  supabase,
  ACHIEVEMENTS,
  getAchievementById,
  getAchievementXp,
  levelForXp,
  mapAchievementDetails,
  rankForXp,
  evaluateGrimoireAchievementIds,
  allLessonSecretIds,
  evaluateLessonSecretAchievements,
  hasUnlockedLesson,
  LESSON_PREREQUISITES,
  ADMIN_AUDIT_ACTIONS,
  recordAdminAudit,
  applyRetryAfterHeader,
  consumeGameRateLimit,
  DESPERTAR_GATE_ID,
  DESPERTAR_PUBLISHED_KEY,
  invalidateDespertarPublishedCache,
  metricsBumpDb,
};

export const USERS_TABLE = 'users';
export const DESPERTAR_STATES_TABLE = 'despertar_states';
export const CODES_TABLE = 'redeem_codes';
export const LESSON_GATES_TABLE = 'lesson_gates';
export const LESSON_PARAGRAPHS_TABLE = 'lesson_paragraphs';
export const LESSON_VIEWS_TABLE = 'lesson_views';
export const FRIENDSHIPS_TABLE = 'friendships';
export const NOTES_TABLE = 'user_notes';
export const NOTE_SHARES_TABLE = 'user_note_shares';
export const NOTE_EVENTS_TABLE = 'user_note_events';
export const NOTE_ROW_SELECT = 'id, user_id, title, body, pinned, tags, lesson_id, cloned_from_note_id, created_at, updated_at';
export const CODE_TTL_MINUTES = 20;
export const FRIEND_LIMIT = 25;
export const FRIEND_SEARCH_LIMIT = 8;
export const NOTE_TITLE_MAX = 120;
export const NOTE_BODY_MAX = 8000;
export const NOTE_SOFT_WARN_COUNT = 50;
/** Copy alinhada à microcopy Task 1 — respostas 403 de tools do Mestre. */
export const ADMIN_FORBIDDEN = 'Esta senda é só do Mestre.';

/** Leituras leves permitidas no Painel enquanto o aluno ainda sela o e-mail. */
export const MESSENGER_SEAL_EXEMPT_ACTIONS = new Set([
  'lessonGates',
  'lessonGatesBatch',
]);

export const UNDERWORLD_SOBERANO_ID = 'soberano_do_submundo';
export const UNDERWORLD_ESTIGE_HASH = '18fec91c717e94c6b979a9c288ac1e041fd57101a2a2379b346e3b4fce39083c';
export const UNDERWORLD_ORACLE_TOKEN = Buffer.from('key_elestial_hades', 'utf8').toString('base64');

/** Rate limit cross-isolate via KV (fallback memória — Fase A / A2). */
export async function underworldRateLimited(userId) {
  return consumeGameRateLimit('underworld_redeem', userId);
}

export function rejectUnlessAdmin(user, res) {
  if (user?.role === 'admin') return false;
  res.status(403).json({ ok: false, error: ADMIN_FORBIDDEN });
  return true;
}

/** Índices válidos do catálogo de avatares (0-based; 102 entradas). */
export const AVATAR_INDEX_MAX = 101;
export const VALID_TURMAS = new Set(['TCG01', 'TCG02']);

export async function loadTargetStudent(targetUserId) {
  const id = Number(targetUserId);
  if (!Number.isInteger(id) || id <= 0) {
    return { errorStatus: 400, error: 'Informe targetUserId.' };
  }
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select('*')
    .eq('id', id)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('[api/progress] loadTargetStudent', error.message);
    return { errorStatus: 500, error: 'Falha ao carregar a alma.' };
  }
  if (!data) return { errorStatus: 404, error: 'Alma não encontrada.' };
  if (data.role === 'admin') {
    return { errorStatus: 400, error: 'Não se edita o Mestre por este caminho.' };
  }
  return { target: data };
}

export const LESSON_CATALOG = {
  aula1: {
    lessonId: 'aula1',
    lessonTitle: 'Aula 01 — O Círculo Mágico do Roguelite',
    xp: 30,
  },
  aula2: {
    lessonId: 'aula2',
    lessonTitle: 'Aula 02 — O Glossário do Desenvolvedor e o Player na Tela',
    xp: 30,
  },
  aula3: {
    lessonId: 'aula3',
    lessonTitle: 'Aula 03 — Homo Ludens, Identidade e Expressão Cultural',
    xp: 30,
  },
  aula4: {
    lessonId: 'aula4',
    lessonTitle: 'Aula 04 — A Linha do Tempo das Plataformas e as Restrições Técnicas',
    xp: 30,
  },
  aula5: {
    lessonId: 'aula5',
    lessonTitle: 'Aula 05 — Classificação Indicativa (ClassInd), IARC e Design Saudável',
    xp: 30,
  },
};

/** Gates por aula/módulo: objeto { gateKey: defaultReleased }. `published` controla liberação. */
export const LESSON_GATES = {
  aula1: { published: true },
  aula2: { published: false },
  aula3: { published: false },
  aula4: { published: false },
  aula5: { published: false },
  /** Módulo transversal O Despertar — default selado até o Mestre abrir o Acheron. */
  despertar: { published: false },
};

/** IDs que aceitam lesson_gates sem serem aula curricular (não entram em redeem/parágrafos). */
export const FEATURE_GATE_IDS = new Set(['despertar']);

export function isGateableLessonId(lessonId) {
  const id = String(lessonId || '');
  return Boolean(LESSON_CATALOG[id]) || FEATURE_GATE_IDS.has(id);
}

export const ACTIVITY_CATALOG = {
  aula1_gdd: {
    lessonId: 'aula1',
    xp: 20,
    achievementId: 'gdd_integracao_documental',
  },
};

export const ACHIEVEMENT_RULES = [
  {
    id: 'aula1_concluida',
    test: (state) => Array.isArray(state.completed_lessons) && state.completed_lessons.includes('aula1'),
  },
  {
    id: 'aula2_concluida',
    test: (state) => Array.isArray(state.completed_lessons) && state.completed_lessons.includes('aula2'),
  },
  {
    id: 'aula3_concluida',
    test: (state) => Array.isArray(state.completed_lessons) && state.completed_lessons.includes('aula3'),
  },
  {
    id: 'aula4_concluida',
    test: (state) => Array.isArray(state.completed_lessons) && state.completed_lessons.includes('aula4'),
  },
  {
    id: 'aula5_concluida',
    test: (state) => Array.isArray(state.completed_lessons) && state.completed_lessons.includes('aula5'),
  },
];

export const ALL_ACHIEVEMENT_IDS = [
  ...new Set([
    ...ACHIEVEMENTS.map((entry) => entry.id),
    ...ACHIEVEMENT_RULES.map((rule) => rule.id),
    ...Object.values(ACTIVITY_CATALOG).map((activity) => activity.achievementId),
    ...allLessonSecretIds(),
  ]),
];

export function evaluateSecretAchievements(lessonId, paragraphText, alreadyUnlocked = []) {
  return evaluateLessonSecretAchievements(lessonId, paragraphText, alreadyUnlocked)
    .map((entry) => ({
      id: entry.id,
      xp: getAchievementXp(entry.id),
    }));
}

export function defaultGatesForLesson(lessonId) {
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

export function sanitizeUser(u) {
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
    achievements: safe.role === 'admin'
      ? ALL_ACHIEVEMENT_IDS
      : (Array.isArray(conquistas) ? conquistas : []),
  };
}

export function isMissingFriendshipsTable(error) {
  return Boolean(
    error
    && (error.code === '42P01' || /friendships/i.test(error.message || ''))
  );
}

export function friendshipsUnavailableResponse(res) {
  return res.status(503).json({
    ok: false,
    error: 'Tabela friendships não existe. Rode o SQL de migração.',
  });
}

export function isMissingNotesTable(error) {
  return Boolean(
    error
    && (
      error.code === '42P01'
      || /user_notes|user_note_shares/i.test(error.message || '')
    )
  );
}

export function notesUnavailableResponse(res) {
  return res.status(503).json({
    ok: false,
    error: 'Tabela user_notes não existe. Rode o SQL de migração.',
  });
}

export function normalizeNoteTags(raw) {
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

export function normalizeNoteLessonId(raw) {
  const id = String(raw || '').trim();
  if (!id) return null;
  if (!LESSON_CATALOG[id]) return null;
  return id;
}

/** Gate `published` efetivo (defaults + lesson_gates), alinhado à Trilha. */
export async function isLessonPublishedForNotes(lessonId) {
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
export async function resolveNoteLessonIdOrReject(rawLessonId, options = {}) {
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

export function toNoteSummary(row, shareMeta = {}) {
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

export function toNoteDetail(row, sharedWith = [], extras = {}) {
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

export async function insertNoteEvent(noteId, actorUserId, kind) {
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

export async function fetchNoteEventsForOwner(noteId, { limit = 20 } = {}) {
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

export async function countUnreadNoteEvents(noteIds = []) {
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

export async function resolveClonedFrom(clonedFromNoteId) {
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

export async function countUserNotes(ownerId) {
  const { count, error } = await supabase
    .from(NOTES_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', ownerId);
  if (error) throw error;
  return Number(count || 0);
}

/** Contagem de inscrições próprias excluindo clones (Fase 4 — dez_inscricoes). */
export async function countOriginalUserNotes(ownerId) {
  const { count, error } = await supabase
    .from(NOTES_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', ownerId)
    .is('cloned_from_note_id', null);
  if (error) throw error;
  return Number(count || 0);
}

export async function awardAchievementIds(user, achievementIds = []) {
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
  // B4 / D8: um único UPDATE + RETURNING — sem SELECT prévio (user já em memória).
  const { data: updated, error } = await supabase
    .from(USERS_TABLE)
    .update({ xp: nextXp, conquistas })
    .eq('id', user.id)
    .select('*')
    .single();
  metricsBumpDb(1);
  if (error) throw error;

  // C4: invalidação best-effort do snapshot do Placar.
  await invalidateLeaderboardCache().catch(() => {});

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

export async function evaluateAndAwardGrimoire(user, snapshot) {
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

export async function fetchSharesForNotes(noteIds = []) {
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

export async function assertAcceptedBond(userA, userB) {
  const bond = await findFriendshipBetween(userA, userB);
  return Boolean(bond && bond.status === 'accepted');
}

/** Cartão público: nunca incluir e-mail, senha ou tokens. */
export function toFriendCard(row) {
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

export function toClassmateCard(row, bondStatus = 'none', friendshipId = null) {
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
export function toPublicFriendProfile(row) {
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
export function toTurmaMirrorProfile(row) {
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

export function resolveBondStatus(bond, viewerId) {
  if (!bond) return 'none';
  if (bond.status === 'accepted') return 'accepted';
  if (bond.status === 'pending') {
    if (sameUserId(bond.requester_id, viewerId)) return 'outgoing';
    if (sameUserId(bond.addressee_id, viewerId)) return 'incoming';
  }
  return 'none';
}

export function sameTurma(a, b) {
  const left = String(a || '').trim();
  const right = String(b || '').trim();
  return Boolean(left) && left === right;
}

export function normalizeUsernameQuery(value) {
  return String(value || '').trim();
}

export async function fetchUsersByIds(ids = []) {
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

export function sameUserId(a, b) {
  return Number(a) === Number(b);
}

export async function countAcceptedFriends(userId) {
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

export async function findFriendshipBetween(userA, userB) {
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

export function generateCode(length = 7) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

export function addMinutesIso(isoDate, minutes) {
  const base = new Date(isoDate);
  return new Date(base.getTime() + minutes * 60 * 1000).toISOString();
}

export function codeExpiresAt(row) {
  // Compatibilidade: se a coluna ainda não existir em um ambiente legado,
  // usamos created_at + 20 min como fallback lógico até a migração rodar.
  return row.expires_at || addMinutesIso(row.created_at, CODE_TTL_MINUTES);
}

export function isCodeExpired(row, nowIso = new Date().toISOString()) {
  return codeExpiresAt(row) <= nowIso;
}

export function normalizeCodes(rows) {
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

export function recalculateAchievements(userState) {
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

export async function insertCodeWithRetry(payload, retries = 5) {
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

