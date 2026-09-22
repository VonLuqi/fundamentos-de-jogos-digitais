import supabase from './supabaseClient.js';
import { loadValidSession } from './_lib/sessions.js';
import { rejectUnlessMessengerSeal } from './_lib/messenger-seal.js';
import {
  createRequestMetrics,
  finishRequestMetrics,
  metricsBumpDb,
  metricsSetAction,
  metricsSetStatus,
  runWithMetrics,
} from './_lib/request-metrics.js';
import { MESSENGER_SEAL_EXEMPT_ACTIONS as SHARED_MESSENGER_SEAL_EXEMPT } from './_lib/progress/shared.js';
import * as profile from './_lib/progress/profile.js';
import * as friends from './_lib/progress/friends.js';
import * as leaderboard from './_lib/progress/leaderboard-handler.js';
import * as notes from './_lib/progress/notes.js';
import * as underworld from './_lib/progress/underworld.js';
import * as redeem from './_lib/progress/redeem.js';
import * as lessons from './_lib/progress/lessons.js';
import * as admin from './_lib/progress/admin.js';

/** Leituras leves permitidas no Painel enquanto o aluno ainda sela o e-mail. */
const MESSENGER_SEAL_EXEMPT_ACTIONS = new Set([
  'lessonGates',
  'lessonGatesBatch',
]);
void SHARED_MESSENGER_SEAL_EXEMPT;

export default async function handler(req, res) {
  const metrics = createRequestMetrics({
    route: 'progress',
    action: req.method === 'GET' ? 'profileGet' : String(req.body?.action || 'n/a'),
  });

  const origStatus = res.status.bind(res);
  res.status = (code) => {
    metricsSetStatus(code);
    return origStatus(code);
  };

  try {
    return await runWithMetrics(metrics, () => handleProgress(req, res));
  } finally {
    finishRequestMetrics(metrics, { status: metrics.status });
  }
}

async function handleProgress(req, res) {
  try {
    if (req.method === 'GET') {
      metricsSetAction('profileGet');
      return profile.profileGet({ req, res, supabase });
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
      lessonIds,
      events,
      fullName,
      mode,
      reason,
      achievementId,
      completed,
      scope: scopeBody,
      sort: sortBody,
      limit: limitBody,
    } = req.body || {};
    metricsSetAction(action || 'n/a');
    const session = await loadValidSession(supabase, token);
    if (!session) return res.status(401).json({ ok: false, error: 'Sessão inválida.' });

    const userId = session.user_id;
    const { data: user } = await supabase.from('users').select('*').eq('id', userId).limit(1).single();
    metricsBumpDb(1);
    if (!user) return res.status(404).json({ ok: false, error: 'Usuário não encontrado.' });

    if (!MESSENGER_SEAL_EXEMPT_ACTIONS.has(action)) {
      if (rejectUnlessMessengerSeal(user, res)) return;
    }

    const ctx = {
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
    };

    if (action === 'friendsList') return friends.friendsList(ctx);
    if (action === 'classmatesList') return friends.classmatesList(ctx);
    if (action === 'leaderboardGet') return leaderboard.handleLeaderboardGet(ctx);
    if (action === 'friendSearch') return friends.friendSearch(ctx);
    if (action === 'friendRequest') return friends.friendRequest(ctx);
    if (action === 'friendRespond') return friends.friendRespond(ctx);
    if (action === 'friendRemove') return friends.friendRemove(ctx);
    if (action === 'friendProfile') return friends.friendProfile(ctx);
    if (action === 'notesList') return notes.notesList(ctx);
    if (action === 'noteGet') return notes.noteGet(ctx);
    if (action === 'noteCreate') return notes.noteCreate(ctx);
    if (action === 'noteUpdate') return notes.noteUpdate(ctx);
    if (action === 'noteDelete') return notes.noteDelete(ctx);
    if (action === 'noteShare') return notes.noteShare(ctx);
    if (action === 'noteUnshare') return notes.noteUnshare(ctx);
    if (action === 'noteClone') return notes.noteClone(ctx);
    if (action === 'noteRefuseShare') return notes.noteRefuseShare(ctx);
    if (action === 'noteEventsAck') return notes.noteEventsAck(ctx);
    if (action === 'notesListAdmin') return notes.notesListAdmin(ctx);
    if (action === 'notesListForUser') return notes.notesListForUser(ctx);
    if (action === 'underworldJudgment') return underworld.underworldJudgment(ctx);
    if (action === 'underworldRedeem') return underworld.underworldRedeem(ctx);
    if (action === 'redeem') return redeem.redeem(ctx);
    if (action === 'avatar') return profile.avatar(ctx);
    if (action === 'generateCode') return redeem.generateCode(ctx);
    if (action === 'lessonCode') return redeem.lessonCode(ctx);
    if (action === 'lessonGates') return lessons.lessonGates(ctx);
    if (action === 'lessonGatesBatch') return lessons.lessonGatesBatch(ctx);
    if (action === 'getLessonParagraph') return lessons.getLessonParagraph(ctx);
    if (action === 'listMyLessonParagraphs') return lessons.listMyLessonParagraphs(ctx);
    if (action === 'saveLessonParagraph') return lessons.saveLessonParagraph(ctx);
    if (action === 'lessonEventsBatch') return lessons.lessonEventsBatch(ctx);
    if (action === 'lessonView') return lessons.lessonView(ctx);
    if (action === 'setLessonGate') return lessons.setLessonGate(ctx);
    if (action === 'listCodes') return redeem.listCodes(ctx);
    if (action === 'listUsers') return admin.listUsers(ctx);
    if (action === 'adminUpdateProfile') return admin.adminUpdateProfile(ctx);
    if (action === 'adminAdjustXp') return admin.adminAdjustXp(ctx);
    if (action === 'adminSetLessonCompleted') return admin.adminSetLessonCompleted(ctx);
    if (action === 'adminGrantAchievement') return admin.adminGrantAchievement(ctx);
    if (action === 'adminRevokeAchievement') return admin.adminRevokeAchievement(ctx);
    if (action === 'adminClearEmailSeal') return admin.adminClearEmailSeal(ctx);
    if (action === 'adminInvalidateSessions') return admin.adminInvalidateSessions(ctx);

    return res.status(400).json({ ok: false, error: 'Ação desconhecida.' });
  } catch (err) {
    console.error('[api/progress] erro', err);
    return res.status(500).json({ ok: false, error: 'Erro interno.' });
  }
}
