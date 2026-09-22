import {
  UNDERWORLD_ESTIGE_HASH,
  UNDERWORLD_ORACLE_TOKEN,
  UNDERWORLD_SOBERANO_ID,
  USERS_TABLE,
  applyRetryAfterHeader,
  getAchievementXp,
  levelForXp,
  mapAchievementDetails,
  metricsBumpDb,
  underworldRateLimited,
  supabase,
} from './shared.js';
import { metricsSetRateLimitBackend } from '../request-metrics.js';

export async function underworldJudgment(ctx) {
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
return res.status(200).json({
  ok: true,
  status: 'denied',
  message: 'Acesso Negado pelos Juízes',
  oracle_token: UNDERWORLD_ORACLE_TOKEN,
  echo: 'O oráculo murmura em língua que os mortais não leem à vista.',
});
}

export async function underworldRedeem(ctx) {
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
const redeemLimit = await underworldRateLimited(userId);
metricsSetRateLimitBackend(redeemLimit.backend);
if (redeemLimit.limited) {
  applyRetryAfterHeader(res, redeemLimit);
  return res.status(429).json({ ok: false, error: 'Demasiadas oferendas. Aguarde um momento.' });
}
const hash = String(submittedHash || '').trim().toLowerCase();
if (!hash) {
  return res.status(400).json({ ok: false, error: 'Óbolo ausente.' });
}
if (hash !== UNDERWORLD_ESTIGE_HASH) {
  return res.status(400).json({ ok: false, error: 'Tributo insuficiente.' });
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
metricsBumpDb(1);
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
