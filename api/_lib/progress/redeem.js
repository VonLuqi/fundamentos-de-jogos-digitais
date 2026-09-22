import {
  ACTIVITY_CATALOG,
  CODES_TABLE,
  CODE_TTL_MINUTES,
  LESSON_CATALOG,
  USERS_TABLE,
  addMinutesIso,
  getAchievementXp,
  hasUnlockedLesson,
  insertCodeWithRetry,
  isCodeExpired,
  LESSON_PREREQUISITES,
  levelForXp,
  mapAchievementDetails,
  metricsBumpDb,
  normalizeCodes,
  recalculateAchievements,
  rejectUnlessAdmin,
  sanitizeUser,
  supabase,
} from './shared.js';
import { invalidateLeaderboardCache } from '../leaderboard-cache.js';

export async function redeem(ctx) {
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

if (user.role !== 'admin' && !hasUnlockedLesson(user, rewardRow.lesson_id)) {
  const required = LESSON_PREREQUISITES[rewardRow.lesson_id];
  return res.status(403).json({
    ok: false,
    error: required
      ? `Ainda falta concluir a aula anterior (${required}) na Trilha.`
      : 'Ainda falta a aula anterior na Trilha.',
  });
}

const redeemed = Array.isArray(user.redeemed_codes) ? [...user.redeemed_codes] : [];
if (redeemed.includes(raw)) {
  return res.status(409).json({ ok: false, error: 'Você já resgatou este código.' });
}

const levelBefore = levelForXp(user.xp || 0);
const newXp = (user.xp || 0) + (rewardRow.xp || 0);
const completedLessons = Array.isArray(user.completed_lessons) ? [...user.completed_lessons] : [];
if (!completedLessons.includes(rewardRow.lesson_id)) completedLessons.push(rewardRow.lesson_id);

redeemed.push(raw);

const newAchievements = recalculateAchievements({
  xp: newXp,
  completed_lessons: completedLessons,
  conquistas: Array.isArray(user.conquistas) ? [...user.conquistas] : [],
});
const awardedAchievements = newAchievements.filter((id) => !(user.conquistas || []).includes(id));

const { data: updated, error: userUpdateError } = await supabase
  .from(USERS_TABLE)
  .update({
    xp: newXp,
    completed_lessons: completedLessons,
    redeemed_codes: redeemed,
    conquistas: newAchievements,
  })
  .eq('id', userId)
  .select('*')
  .single();
metricsBumpDb(1);
if (userUpdateError) return res.status(500).json({ ok: false, error: 'Erro ao atualizar usuário.' });

// Telemetria do primeiro resgate; não invalida o código para os demais alunos.
await supabase
  .from(CODES_TABLE)
  .update({ redeemed_at: new Date().toISOString(), redeemed_by: userId })
  .eq('code', raw)
  .is('redeemed_at', null);
metricsBumpDb(1);

const levelAfter = levelForXp(newXp);

await invalidateLeaderboardCache().catch(() => {});

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

export async function generateCode(ctx) {
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

export async function lessonCode(ctx) {
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

export async function listCodes(ctx) {
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
const { data: rows, error } = await supabase
  .from(CODES_TABLE)
  .select('code, lesson_id, lesson_title, xp, created_at, redeemed_at, redeemed_by')
  .order('created_at', { ascending: false })
  .limit(100);
if (error) return res.status(500).json({ ok: false, error: 'Falha ao listar códigos.' });
return res.status(200).json({ ok: true, codes: normalizeCodes(rows) });
}
