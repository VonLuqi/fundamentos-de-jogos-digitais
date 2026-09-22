import {
  ACTIVITY_CATALOG,
  DESPERTAR_GATE_ID,
  DESPERTAR_PUBLISHED_KEY,
  FEATURE_GATE_IDS,
  LESSON_CATALOG,
  LESSON_GATES,
  LESSON_GATES_TABLE,
  LESSON_PARAGRAPHS_TABLE,
  LESSON_VIEWS_TABLE,
  USERS_TABLE,
  defaultGatesForLesson,
  evaluateSecretAchievements,
  getAchievementXp,
  invalidateDespertarPublishedCache,
  isGateableLessonId,
  mapAchievementDetails,
  metricsBumpDb,
  rejectUnlessAdmin,
  sanitizeUser,
  supabase,
} from './shared.js';
import { metricsSetAction } from '../request-metrics.js';

export const LESSON_EVENTS_BATCH_MAX = 20;

/**
 * Visualização de aula (unitário ou item de batch). B6.
 * @returns {Promise<{ ok: boolean, status: number, body: object }>}
 */
export async function executeLessonView(userId, lessonId) {
  const normalizedLessonId = String(lessonId || '');
  if (!LESSON_CATALOG[normalizedLessonId]) {
    return { ok: false, status: 400, body: { ok: false, error: 'Aula inválida.' } };
  }

  const nowIso = new Date().toISOString();
  const { data: existing, error: selectError } = await supabase
    .from(LESSON_VIEWS_TABLE)
    .select('view_count')
    .eq('user_id', userId)
    .eq('lesson_id', normalizedLessonId)
    .limit(1)
    .maybeSingle();
  metricsBumpDb(1);

  if (selectError) {
    if (selectError.code === '42P01' || /lesson_views/i.test(selectError.message || '')) {
      return {
        ok: false,
        status: 503,
        body: { ok: false, error: 'Tabela lesson_views não existe. Rode o SQL de migração.' },
      };
    }
    return { ok: false, status: 500, body: { ok: false, error: 'Falha ao registrar visualização da aula.' } };
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
    { onConflict: 'user_id,lesson_id' },
  );
  metricsBumpDb(1);

  if (upsertError) {
    if (upsertError.code === '42P01' || /lesson_views/i.test(upsertError.message || '')) {
      return {
        ok: false,
        status: 503,
        body: { ok: false, error: 'Tabela lesson_views não existe. Rode o SQL de migração.' },
      };
    }
    return { ok: false, status: 500, body: { ok: false, error: 'Falha ao registrar visualização da aula.' } };
  }

  return {
    ok: true,
    status: 200,
    body: { ok: true, lessonId: normalizedLessonId, viewedAt: nowIso, viewCount: nextCount },
  };
}

/**
 * Salva parágrafo + awards (unitário ou item de batch). B6.
 * @returns {Promise<{ ok: boolean, status: number, body: object, user?: object }>}
 */
export async function executeLessonParagraph(user, userId, lessonId, paragraph) {
  const normalizedLessonId = String(lessonId || '');
  if (!LESSON_CATALOG[normalizedLessonId]) {
    return { ok: false, status: 400, body: { ok: false, error: 'Aula inválida.' } };
  }

  const text = typeof paragraph === 'string' ? paragraph.trim() : '';
  if (!text) {
    return { ok: false, status: 400, body: { ok: false, error: 'Parágrafo vazio.' } };
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
    { onConflict: 'user_id,lesson_id' },
  );
  metricsBumpDb(1);

  if (error) {
    if (error.code === '42P01' || /lesson_paragraphs/i.test(error.message || '')) {
      return {
        ok: false,
        status: 503,
        body: { ok: false, error: 'Tabela lesson_paragraphs não existe. Rode o SQL de migração.' },
      };
    }
    return { ok: false, status: 500, body: { ok: false, error: 'Falha ao salvar parágrafo da aula.' } };
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
    awardedXp += getAchievementXp(secret.id) || Number(secret.xp || 0);
  });

  if (awardedAchievementIds.length > 0 || awardedXp > 0) {
    const conquistas = [...existingAchievements];
    awardedAchievementIds.forEach((id) => {
      if (!conquistas.includes(id)) conquistas.push(id);
    });
    const xpNext = Number(user.xp || 0) + awardedXp;
    const { data, error: userUpdateError } = await supabase
      .from(USERS_TABLE)
      .update({ xp: xpNext, conquistas })
      .eq('id', userId)
      .select('*')
      .single();
    metricsBumpDb(1);
    if (userUpdateError) {
      return {
        ok: false,
        status: 500,
        body: { ok: false, error: 'Falha ao conceder recompensa da atividade.' },
      };
    }

    updatedUser = data;
    awarded = {
      xp: awardedXp,
      achievements: awardedAchievementIds,
      achievementDetails: mapAchievementDetails(awardedAchievementIds),
    };
  }

  return {
    ok: true,
    status: 200,
    user: updatedUser,
    body: {
      ok: true,
      lessonId: normalizedLessonId,
      paragraph: text,
      updatedAt: nowIso,
      user: sanitizeUser(updatedUser),
      awarded,
    },
  };
}

export async function lessonGates(ctx) {
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
const normalizedLessonId = String(lessonId || '');
if (!isGateableLessonId(normalizedLessonId)) {
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

export async function lessonGatesBatch(ctx) {
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
const rawIds = Array.isArray(lessonIds) ? lessonIds : [];
const catalogIds = Object.keys(LESSON_CATALOG);
const requested = rawIds.length > 0
  ? rawIds.map((id) => String(id || '')).filter(Boolean)
  : [...catalogIds, 'despertar'];
const ids = [...new Set(requested.filter((id) => isGateableLessonId(id)))];
if (ids.length === 0) {
  return res.status(400).json({ ok: false, error: 'Nenhuma aula válida no lote.' });
}

const gatesByLesson = {};
ids.forEach((id) => {
  gatesByLesson[id] = defaultGatesForLesson(id);
});

const { data: rows, error } = await supabase
  .from(LESSON_GATES_TABLE)
  .select('lesson_id, gate_key, released')
  .in('lesson_id', ids);

if (error) {
  if (error.code === '42P01' || /lesson_gates/i.test(error.message || '')) {
    return res.status(200).json({
      ok: true,
      gates: gatesByLesson,
      warning: 'Tabela lesson_gates ausente.',
    });
  }
  return res.status(500).json({ ok: false, error: 'Falha ao carregar conteúdo censurado.' });
}

(rows || []).forEach((row) => {
  const id = String(row.lesson_id || '');
  if (!gatesByLesson[id]) return;
  const key = String(row.gate_key || '');
  if (key === 'published' || Object.prototype.hasOwnProperty.call(gatesByLesson[id], key)) {
    gatesByLesson[id][key] = Boolean(row.released);
  }
});

return res.status(200).json({ ok: true, gates: gatesByLesson });
}

export async function getLessonParagraph(ctx) {
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

export async function listMyLessonParagraphs(ctx) {
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
const { data, error } = await supabase
  .from(LESSON_PARAGRAPHS_TABLE)
  .select('lesson_id, paragraph, created_at, updated_at')
  .eq('user_id', userId)
  .order('updated_at', { ascending: false });

if (error) {
  if (error.code === '42P01' || /lesson_paragraphs/i.test(error.message || '')) {
    return res.status(200).json({
      ok: true,
      activities: [],
      warning: 'Tabela lesson_paragraphs ausente.',
    });
  }
  return res.status(500).json({ ok: false, error: 'Falha ao carregar atividades da Trilha.' });
}

const activities = (data || [])
  .map((row) => {
    const lessonId = String(row.lesson_id || '');
    const paragraph = String(row.paragraph || '').trim();
    if (!lessonId || !paragraph || !LESSON_CATALOG[lessonId]) return null;
    return {
      lessonId,
      paragraph,
      createdAt: row.created_at || null,
      updatedAt: row.updated_at || null,
    };
  })
  .filter(Boolean);

return res.status(200).json({ ok: true, activities });
}

export async function saveLessonParagraph(ctx) {
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
const result = await executeLessonParagraph(user, userId, lessonId, paragraph);
return res.status(result.status).json(result.body);
}

export async function lessonEventsBatch(ctx) {
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
metricsSetAction('lessonEventsBatch');
const rawEvents = Array.isArray(events) ? events : null;
if (!rawEvents) {
  return res.status(400).json({ ok: false, error: 'events deve ser um array.' });
}
if (rawEvents.length === 0) {
  return res.status(200).json({ ok: true, results: [] });
}
if (rawEvents.length > LESSON_EVENTS_BATCH_MAX) {
  return res.status(400).json({
    ok: false,
    error: `No máximo ${LESSON_EVENTS_BATCH_MAX} eventos por batch.`,
  });
}

let workingUser = user;
const results = [];
for (let index = 0; index < rawEvents.length; index += 1) {
  const event = rawEvents[index] && typeof rawEvents[index] === 'object'
    ? rawEvents[index]
    : {};
  const type = String(event.type || '');
  try {
    if (type === 'lessonView') {
      const result = await executeLessonView(userId, event.lessonId);
      results.push({
        ok: result.ok,
        index,
        type,
        error: result.ok ? undefined : result.body?.error,
        ...(result.ok ? {
          lessonId: result.body.lessonId,
          viewedAt: result.body.viewedAt,
          viewCount: result.body.viewCount,
        } : {}),
      });
    } else if (type === 'lessonParagraph') {
      const result = await executeLessonParagraph(
        workingUser,
        userId,
        event.lessonId,
        event.paragraph,
      );
      if (result.ok && result.user) workingUser = result.user;
      results.push({
        ok: result.ok,
        index,
        type,
        error: result.ok ? undefined : result.body?.error,
        ...(result.ok ? {
          lessonId: result.body.lessonId,
          paragraph: result.body.paragraph,
          updatedAt: result.body.updatedAt,
          user: result.body.user,
          awarded: result.body.awarded,
        } : {}),
      });
    } else {
      results.push({
        ok: false,
        index,
        type: type || null,
        error: 'Tipo de evento inválido.',
      });
    }
  } catch (batchItemError) {
    console.error('[api/progress] lessonEventsBatch item', index, batchItemError);
    results.push({
      ok: false,
      index,
      type: type || null,
      error: 'Falha ao processar evento.',
    });
  }
}

return res.status(200).json({ ok: true, results });
}

export async function lessonView(ctx) {
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
const result = await executeLessonView(userId, lessonId);
return res.status(result.status).json(result.body);
}

export async function setLessonGate(ctx) {
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

const normalizedLessonId = String(lessonId || '');
const normalizedGateKey = String(gateKey || '');
const gateDefaults = defaultGatesForLesson(normalizedLessonId);

if (!isGateableLessonId(normalizedLessonId)) {
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

if (
  normalizedLessonId === DESPERTAR_GATE_ID
  && normalizedGateKey === DESPERTAR_PUBLISHED_KEY
) {
  await invalidateDespertarPublishedCache();
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
