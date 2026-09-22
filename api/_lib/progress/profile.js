import {
  AVATAR_INDEX_MAX,
  USERS_TABLE,
  metricsBumpDb,
  sanitizeUser,
  supabase,
} from './shared.js';
import { loadValidSession } from '../sessions.js';

export async function profileGet(ctx) {
  const { req, res, supabase } = ctx;
  const token = req.query?.token;
  const session = await loadValidSession(supabase, token);
  if (!session) return res.status(401).json({ ok: false, error: 'Sessão inválida.' });

  const { data: user } = await supabase
    .from(USERS_TABLE)
    .select('*')
    .eq('id', session.user_id)
    .limit(1)
    .single();
  metricsBumpDb(1);
  return res.status(200).json({ ok: true, user: sanitizeUser(user) });
}

export async function avatar(ctx) {
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
const idx = Number(avatarIndex);
if (!Number.isInteger(idx)) return res.status(400).json({ ok: false, error: 'Avatar inválido.' });
const { data: updated, error: avatarError } = await supabase
  .from(USERS_TABLE)
  .update({ avatar_index: idx })
  .eq('id', userId)
  .select('*')
  .single();
metricsBumpDb(1);
if (avatarError) return res.status(500).json({ ok: false, error: 'Erro ao atualizar avatar.' });
return res.status(200).json({ ok: true, user: sanitizeUser(updated) });
}
