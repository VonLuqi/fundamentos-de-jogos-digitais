import {
  ADMIN_AUDIT_ACTIONS,
  ADMIN_FORBIDDEN,
  AVATAR_INDEX_MAX,
  LESSON_CATALOG,
  USERS_TABLE,
  VALID_TURMAS,
  awardAchievementIds,
  getAchievementById,
  getAchievementXp,
  loadTargetStudent,
  recordAdminAudit,
  rejectUnlessAdmin,
  sanitizeUser,
  supabase,
} from './shared.js';
import { invalidateLeaderboardCache } from '../leaderboard-cache.js';

export async function listUsers(ctx) {
  const {
    req,
    res,
    user,
    userId,
    supabase,
    action,
    code,
    avatarIndex,
    lessonId,
    gateKey,
    released,
    paragraph,
    xp,
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
    turmaFilterBody,
    submittedHash,
    lessonIds,
    events,
    fullName,
    mode,
    reason,
    achievementId,
    completed,
    scopeBody,
    sortBody,
    limitBody,
  } = ctx;
if (rejectUnlessAdmin(user, res)) return;
const { data: users } = await supabase
  .from(USERS_TABLE)
  .select('id, full_name, username, turma, role, xp, conquistas, completed_lessons, avatar_index, created_at, email, email_verified_at');

let paragraphRows = [];
const { data: paragraphs, error: paragraphsError } = await supabase
  .from(LESSON_PARAGRAPHS_TABLE)
  .select('user_id, lesson_id, paragraph, updated_at')
  .order('updated_at', { ascending: false });

if (paragraphsError) {
  console.error('[api/progress] listUsers paragraphs', paragraphsError.message);
} else {
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
  const key = String(row.user_id);
  const userViews = viewsByUser.get(key) || [];
  userViews.push({
    lessonId: row.lesson_id,
    lastViewedAt: row.last_viewed_at,
    viewCount: Number(row.view_count || 0),
  });
  viewsByUser.set(key, userViews);
});

// Admin-only list: e-mail/selo entram no DTO para CSV do Véu (não no Espelho público).
const normalized = (users || []).map(({ conquistas, password, password_hash, ...rest }) => ({
  ...rest,
  fullName: rest.full_name || rest.username,
  achievements: conquistas || [],
  email: rest.email ?? null,
  emailVerifiedAt: rest.email_verified_at ?? null,
  viewedLessons: viewsByUser.get(String(rest.id)) || [],
  hasDespertarState: false,
}));

const despertarIds = normalized.map((item) => item.id).filter(Boolean);
if (despertarIds.length) {
  const { data: despertarRows, error: despertarError } = await supabase
    .from('despertar_states')
    .select('user_id')
    .in('user_id', despertarIds);
  if (!despertarError && Array.isArray(despertarRows)) {
    const hasState = new Set(despertarRows.map((row) => String(row.user_id)));
    normalized.forEach((item) => {
      item.hasDespertarState = hasState.has(String(item.id));
    });
  }
}

const usersById = new Map(normalized.map((item) => [String(item.id), item]));
const activities = paragraphRows
  .map((row) => {
    const activityUser = usersById.get(String(row.user_id));
    if (!activityUser || activityUser.role === 'admin') return null;
    return {
      userId: activityUser.id,
      lessonId: row.lesson_id,
      paragraph: row.paragraph,
      updatedAt: row.updated_at,
      fullName: activityUser.fullName,
      username: activityUser.username,
      turma: activityUser.turma,
      avatarIndex: Number(activityUser.avatar_index ?? activityUser.avatarIndex ?? 0),
    };
  })
  .filter(Boolean);

return res.status(200).json({ ok: true, users: normalized, activities });
}

export async function adminUpdateProfile(ctx) {
  const {
    req,
    res,
    user,
    userId,
    supabase,
    action,
    code,
    avatarIndex,
    lessonId,
    gateKey,
    released,
    paragraph,
    xp,
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
    turmaFilterBody,
    submittedHash,
    lessonIds,
    events,
    fullName,
    mode,
    reason,
    achievementId,
    completed,
    scopeBody,
    sortBody,
    limitBody,
  } = ctx;
if (rejectUnlessAdmin(user, res)) return;
const loaded = await loadTargetStudent(targetUserId);
if (loaded.error) return res.status(loaded.errorStatus).json({ ok: false, error: loaded.error });
const target = loaded.target;

const updates = {};
if (fullName !== undefined) {
  const name = String(fullName || '').trim();
  if (name.length < 3) return res.status(400).json({ ok: false, error: 'Nome muito curto.' });
  updates.full_name = name;
}
if (turmaFilterBody !== undefined) {
  const turma = String(turmaFilterBody || '').trim();
  if (!VALID_TURMAS.has(turma)) return res.status(400).json({ ok: false, error: 'Turma inválida.' });
  updates.turma = turma;
}
if (avatarIndex !== undefined) {
  const idx = Number(avatarIndex);
  if (!Number.isInteger(idx) || idx < 0 || idx > AVATAR_INDEX_MAX) {
    return res.status(400).json({ ok: false, error: 'Avatar inválido.' });
  }
  updates.avatar_index = idx;
}
if (!Object.keys(updates).length) {
  return res.status(400).json({ ok: false, error: 'Nada para atualizar.' });
}

const { data: updated, error } = await supabase
  .from(USERS_TABLE)
  .update(updates)
  .eq('id', target.id)
  .select('*')
  .single();
if (error || !updated) {
  console.error('[api/progress] adminUpdateProfile', error?.message);
  return res.status(500).json({ ok: false, error: 'Não foi possível atualizar o perfil.' });
}

await recordAdminAudit(supabase, {
  actorId: userId,
  targetUserId: target.id,
  action: ADMIN_AUDIT_ACTIONS.updateProfile,
  payload: { updates },
});
return res.status(200).json({ ok: true, user: sanitizeUser(updated) });
}

export async function adminAdjustXp(ctx) {
  const {
    req,
    res,
    user,
    userId,
    supabase,
    action,
    code,
    avatarIndex,
    lessonId,
    gateKey,
    released,
    paragraph,
    xp,
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
    turmaFilterBody,
    submittedHash,
    lessonIds,
    events,
    fullName,
    mode,
    reason,
    achievementId,
    completed,
    scopeBody,
    sortBody,
    limitBody,
  } = ctx;
if (rejectUnlessAdmin(user, res)) return;
const loaded = await loadTargetStudent(targetUserId);
if (loaded.error) return res.status(loaded.errorStatus).json({ ok: false, error: loaded.error });
const target = loaded.target;

const why = String(reason || '').trim();
if (why.length < 3) {
  return res.status(400).json({ ok: false, error: 'Informe a razão do ajuste de XP.' });
}

const amount = Number(xp);
if (!Number.isFinite(amount)) {
  return res.status(400).json({ ok: false, error: 'XP inválido.' });
}

const before = Number(target.xp || 0);
let next = before;
const adjustMode = String(mode || 'set').toLowerCase();
if (adjustMode === 'delta') next = before + amount;
else if (adjustMode === 'set') next = amount;
else return res.status(400).json({ ok: false, error: 'mode deve ser set ou delta.' });

next = Math.max(0, Math.floor(next));

const { data: updated, error } = await supabase
  .from(USERS_TABLE)
  .update({ xp: next })
  .eq('id', target.id)
  .select('*')
  .single();
if (error || !updated) {
  console.error('[api/progress] adminAdjustXp', error?.message);
  return res.status(500).json({ ok: false, error: 'Não foi possível ajustar o XP.' });
}

await recordAdminAudit(supabase, {
  actorId: userId,
  targetUserId: target.id,
  action: ADMIN_AUDIT_ACTIONS.adjustXp,
  payload: { mode: adjustMode, before, after: next, amount, reason: why },
});
await invalidateLeaderboardCache().catch(() => {});
return res.status(200).json({ ok: true, user: sanitizeUser(updated) });
}

export async function adminSetLessonCompleted(ctx) {
  const {
    req,
    res,
    user,
    userId,
    supabase,
    action,
    code,
    avatarIndex,
    lessonId,
    gateKey,
    released,
    paragraph,
    xp,
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
    turmaFilterBody,
    submittedHash,
    lessonIds,
    events,
    fullName,
    mode,
    reason,
    achievementId,
    completed,
    scopeBody,
    sortBody,
    limitBody,
  } = ctx;
if (rejectUnlessAdmin(user, res)) return;
const loaded = await loadTargetStudent(targetUserId);
if (loaded.error) return res.status(loaded.errorStatus).json({ ok: false, error: loaded.error });
const target = loaded.target;

const lesson = String(lessonId || '').trim();
if (!LESSON_CATALOG[lesson] && !['aula1', 'aula2', 'aula3', 'aula4', 'aula5'].includes(lesson)) {
  return res.status(400).json({ ok: false, error: 'Aula inválida.' });
}

const mark = completed !== false && completed !== 'false' && completed !== 0;
const current = Array.isArray(target.completed_lessons) ? [...target.completed_lessons] : [];
const next = mark
  ? (current.includes(lesson) ? current : [...current, lesson])
  : current.filter((id) => id !== lesson);

const { data: updated, error } = await supabase
  .from(USERS_TABLE)
  .update({ completed_lessons: next })
  .eq('id', target.id)
  .select('*')
  .single();
if (error || !updated) {
  console.error('[api/progress] adminSetLessonCompleted', error?.message);
  return res.status(500).json({ ok: false, error: 'Não foi possível atualizar a aula.' });
}

await recordAdminAudit(supabase, {
  actorId: userId,
  targetUserId: target.id,
  action: ADMIN_AUDIT_ACTIONS.setLessonCompleted,
  payload: { lessonId: lesson, completed: mark },
});
await invalidateLeaderboardCache().catch(() => {});
return res.status(200).json({ ok: true, user: sanitizeUser(updated) });
}

export async function adminGrantAchievement(ctx) {
  const {
    req,
    res,
    user,
    userId,
    supabase,
    action,
    code,
    avatarIndex,
    lessonId,
    gateKey,
    released,
    paragraph,
    xp,
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
    turmaFilterBody,
    submittedHash,
    lessonIds,
    events,
    fullName,
    mode,
    reason,
    achievementId,
    completed,
    scopeBody,
    sortBody,
    limitBody,
  } = ctx;
if (rejectUnlessAdmin(user, res)) return;
const loaded = await loadTargetStudent(targetUserId);
if (loaded.error) return res.status(loaded.errorStatus).json({ ok: false, error: loaded.error });
const target = loaded.target;

const id = String(achievementId || '').trim();
if (!id || !getAchievementById(id)) {
  return res.status(400).json({ ok: false, error: 'Conquista inválida.' });
}

let result;
try {
  result = await awardAchievementIds(target, [id]);
} catch (error) {
  console.error('[api/progress] adminGrantAchievement', error?.message || error);
  return res.status(500).json({ ok: false, error: 'Não foi possível conceder a conquista.' });
}

await recordAdminAudit(supabase, {
  actorId: userId,
  targetUserId: target.id,
  action: ADMIN_AUDIT_ACTIONS.grantAchievement,
  payload: {
    achievementId: id,
    xpGain: result.awarded?.xp || 0,
    alreadyHad: (result.awarded?.achievements || []).length === 0,
  },
});
return res.status(200).json({
  ok: true,
  user: sanitizeUser(result.user),
  awarded: result.awarded,
});
}

export async function adminRevokeAchievement(ctx) {
  const {
    req,
    res,
    user,
    userId,
    supabase,
    action,
    code,
    avatarIndex,
    lessonId,
    gateKey,
    released,
    paragraph,
    xp,
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
    turmaFilterBody,
    submittedHash,
    lessonIds,
    events,
    fullName,
    mode,
    reason,
    achievementId,
    completed,
    scopeBody,
    sortBody,
    limitBody,
  } = ctx;
if (rejectUnlessAdmin(user, res)) return;
const loaded = await loadTargetStudent(targetUserId);
if (loaded.error) return res.status(loaded.errorStatus).json({ ok: false, error: loaded.error });
const target = loaded.target;

const id = String(achievementId || '').trim();
if (!id) return res.status(400).json({ ok: false, error: 'Conquista inválida.' });

const current = Array.isArray(target.conquistas) ? target.conquistas : [];
if (!current.includes(id)) {
  return res.status(200).json({ ok: true, user: sanitizeUser(target), revoked: false });
}

const xpLoss = getAchievementXp(id) || 0;
const nextXp = Math.max(0, Number(target.xp || 0) - xpLoss);
const next = current.filter((item) => item !== id);

const { data: updated, error } = await supabase
  .from(USERS_TABLE)
  .update({ conquistas: next, xp: nextXp })
  .eq('id', target.id)
  .select('*')
  .single();
if (error || !updated) {
  console.error('[api/progress] adminRevokeAchievement', error?.message);
  return res.status(500).json({ ok: false, error: 'Não foi possível revogar a conquista.' });
}

await recordAdminAudit(supabase, {
  actorId: userId,
  targetUserId: target.id,
  action: ADMIN_AUDIT_ACTIONS.revokeAchievement,
  payload: { achievementId: id, xpLoss },
});
await invalidateLeaderboardCache().catch(() => {});
return res.status(200).json({ ok: true, user: sanitizeUser(updated), revoked: true });
}

export async function adminClearEmailSeal(ctx) {
  const {
    req,
    res,
    user,
    userId,
    supabase,
    action,
    code,
    avatarIndex,
    lessonId,
    gateKey,
    released,
    paragraph,
    xp,
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
    turmaFilterBody,
    submittedHash,
    lessonIds,
    events,
    fullName,
    mode,
    reason,
    achievementId,
    completed,
    scopeBody,
    sortBody,
    limitBody,
  } = ctx;
if (rejectUnlessAdmin(user, res)) return;
const loaded = await loadTargetStudent(targetUserId);
if (loaded.error) return res.status(loaded.errorStatus).json({ ok: false, error: loaded.error });
const target = loaded.target;

const { data: updated, error } = await supabase
  .from(USERS_TABLE)
  .update({ email: null, email_verified_at: null })
  .eq('id', target.id)
  .select('*')
  .single();
if (error || !updated) {
  console.error('[api/progress] adminClearEmailSeal', error?.message);
  return res.status(500).json({ ok: false, error: 'Não foi possível limpar o selo.' });
}

await recordAdminAudit(supabase, {
  actorId: userId,
  targetUserId: target.id,
  action: ADMIN_AUDIT_ACTIONS.clearEmailSeal,
  payload: { previousEmail: target.email || null },
});
return res.status(200).json({ ok: true, user: sanitizeUser(updated) });
}

export async function adminInvalidateSessions(ctx) {
  const {
    req,
    res,
    user,
    userId,
    supabase,
    action,
    code,
    avatarIndex,
    lessonId,
    gateKey,
    released,
    paragraph,
    xp,
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
    turmaFilterBody,
    submittedHash,
    lessonIds,
    events,
    fullName,
    mode,
    reason,
    achievementId,
    completed,
    scopeBody,
    sortBody,
    limitBody,
  } = ctx;
if (rejectUnlessAdmin(user, res)) return;
const loaded = await loadTargetStudent(targetUserId);
if (loaded.error) return res.status(loaded.errorStatus).json({ ok: false, error: loaded.error });
const target = loaded.target;

const { error } = await supabase.from('sessions').delete().eq('user_id', target.id);
if (error) {
  console.error('[api/progress] adminInvalidateSessions', error.message);
  return res.status(500).json({ ok: false, error: 'Não foi possível encerrar as sessões.' });
}

await recordAdminAudit(supabase, {
  actorId: userId,
  targetUserId: target.id,
  action: ADMIN_AUDIT_ACTIONS.invalidateSessions,
  payload: {},
});
return res.status(200).json({ ok: true });
}
