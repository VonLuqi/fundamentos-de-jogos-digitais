/**
 * Duplas por aula + diário compartilhado (Aula 07).
 * Não usa friendships — vínculo só para a lesson_id.
 */

import {
  LESSON_CATALOG,
  LESSON_DUOS_TABLE,
  LESSON_JOURNALS_TABLE,
  LESSON_PARAGRAPHS_TABLE,
  USERS_TABLE,
  evaluateSecretAchievements,
  fetchUsersByIds,
  getAchievementXp,
  mapAchievementDetails,
  metricsBumpDb,
  normalizeUsernameQuery,
  sameUserId,
  sanitizeUser,
  toFriendCard,
} from './shared.js';

const DUO_LESSON_IDS = new Set(['aula7']);
const ROLES = new Set(['arte', 'programacao']);
const JOURNAL_BODY_MAX = 12000;
const DUO_SELECT =
  'id, lesson_id, requester_id, addressee_id, status, requester_role, addressee_role, created_at, updated_at';
const JOURNAL_SELECT =
  'id, lesson_id, duo_id, owner_user_id, partner_user_id, body, revision, updated_by, created_at, updated_at';

function isMissingDuosTable(error) {
  const code = String(error?.code || '');
  const msg = String(error?.message || '');
  return code === '42P01' || /lesson_duos|lesson_journals/i.test(msg);
}

function duosUnavailable(res) {
  return res.status(503).json({
    ok: false,
    error: 'Tabelas de dupla/diário ausentes. Aplique db/migrate-2026-10-05-lesson-duos.sql.',
  });
}

function normalizeLessonId(raw) {
  const id = String(raw || '').trim();
  if (!DUO_LESSON_IDS.has(id) || !LESSON_CATALOG[id]) return null;
  return id;
}

function oppositeRole(role) {
  if (role === 'arte') return 'programacao';
  if (role === 'programacao') return 'arte';
  return null;
}

function normalizeRole(raw) {
  const role = String(raw || '').trim().toLowerCase();
  return ROLES.has(role) ? role : null;
}

function cardFromUser(user) {
  return user ? toFriendCard(user) : null;
}

function duoPayload(row, userId, usersById) {
  if (!row) return null;
  const iAmRequester = sameUserId(row.requester_id, userId);
  const partnerId = iAmRequester ? row.addressee_id : row.requester_id;
  const myRole = iAmRequester ? row.requester_role : row.addressee_role;
  const partnerRole = iAmRequester ? row.addressee_role : row.requester_role;
  const partner = usersById.get(Number(partnerId)) || null;
  return {
    duoId: row.id,
    lessonId: row.lesson_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    myRole: myRole || null,
    partnerRole: partnerRole || null,
    partner: cardFromUser(partner),
    iAmRequester,
  };
}

function journalPayload(row) {
  if (!row) return null;
  return {
    journalId: row.id,
    lessonId: row.lesson_id,
    duoId: row.duo_id ?? null,
    body: String(row.body || ''),
    revision: Number(row.revision) || 1,
    updatedBy: row.updated_by ?? null,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

async function findUserDuos(supabase, lessonId, userId) {
  const { data, error } = await supabase
    .from(LESSON_DUOS_TABLE)
    .select(DUO_SELECT)
    .eq('lesson_id', lessonId)
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order('updated_at', { ascending: false });
  metricsBumpDb(1);
  if (error) throw error;
  return data || [];
}

async function findAcceptedDuo(supabase, lessonId, userId) {
  const rows = await findUserDuos(supabase, lessonId, userId);
  return rows.find((row) => row.status === 'accepted') || null;
}

async function getOrCreateSoloJournal(supabase, lessonId, userId) {
  const { data: existing, error: selErr } = await supabase
    .from(LESSON_JOURNALS_TABLE)
    .select(JOURNAL_SELECT)
    .eq('lesson_id', lessonId)
    .eq('owner_user_id', userId)
    .is('duo_id', null)
    .maybeSingle();
  metricsBumpDb(1);
  if (selErr) throw selErr;
  if (existing) return existing;

  const nowIso = new Date().toISOString();
  const { data: created, error: insErr } = await supabase
    .from(LESSON_JOURNALS_TABLE)
    .insert({
      lesson_id: lessonId,
      duo_id: null,
      owner_user_id: userId,
      partner_user_id: null,
      body: '',
      revision: 1,
      updated_by: userId,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select(JOURNAL_SELECT)
    .single();
  metricsBumpDb(1);
  if (insErr) {
    if (insErr.code === '23505') {
      const { data: again, error: againErr } = await supabase
        .from(LESSON_JOURNALS_TABLE)
        .select(JOURNAL_SELECT)
        .eq('lesson_id', lessonId)
        .eq('owner_user_id', userId)
        .is('duo_id', null)
        .maybeSingle();
      metricsBumpDb(1);
      if (againErr) throw againErr;
      return again;
    }
    throw insErr;
  }
  return created;
}

async function getOrCreateDuoJournal(supabase, lessonId, duoRow, userId) {
  const { data: existing, error: selErr } = await supabase
    .from(LESSON_JOURNALS_TABLE)
    .select(JOURNAL_SELECT)
    .eq('duo_id', duoRow.id)
    .maybeSingle();
  metricsBumpDb(1);
  if (selErr) throw selErr;
  if (existing) return existing;

  // Prefer body from requester's solo journal if any.
  let seedBody = '';
  const { data: soloA } = await supabase
    .from(LESSON_JOURNALS_TABLE)
    .select('body')
    .eq('lesson_id', lessonId)
    .eq('owner_user_id', duoRow.requester_id)
    .is('duo_id', null)
    .maybeSingle();
  metricsBumpDb(1);
  const { data: soloB } = await supabase
    .from(LESSON_JOURNALS_TABLE)
    .select('body')
    .eq('lesson_id', lessonId)
    .eq('owner_user_id', duoRow.addressee_id)
    .is('duo_id', null)
    .maybeSingle();
  metricsBumpDb(1);
  const a = String(soloA?.body || '').trim();
  const b = String(soloB?.body || '').trim();
  if (a && b) seedBody = a.length >= b.length ? a : b;
  else seedBody = a || b;

  const partnerId = sameUserId(duoRow.requester_id, userId)
    ? duoRow.addressee_id
    : duoRow.requester_id;
  const nowIso = new Date().toISOString();
  const { data: created, error: insErr } = await supabase
    .from(LESSON_JOURNALS_TABLE)
    .insert({
      lesson_id: lessonId,
      duo_id: duoRow.id,
      owner_user_id: duoRow.requester_id,
      partner_user_id: duoRow.addressee_id,
      body: seedBody,
      revision: 1,
      updated_by: userId,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select(JOURNAL_SELECT)
    .single();
  metricsBumpDb(1);
  if (insErr) {
    if (insErr.code === '23505') {
      const { data: again, error: againErr } = await supabase
        .from(LESSON_JOURNALS_TABLE)
        .select(JOURNAL_SELECT)
        .eq('duo_id', duoRow.id)
        .maybeSingle();
      metricsBumpDb(1);
      if (againErr) throw againErr;
      return again;
    }
    throw insErr;
  }
  void partnerId;
  return created;
}

async function resolveJournal(supabase, lessonId, userId) {
  const accepted = await findAcceptedDuo(supabase, lessonId, userId);
  if (accepted) {
    const journal = await getOrCreateDuoJournal(supabase, lessonId, accepted, userId);
    return { mode: 'duo', duo: accepted, journal };
  }
  const journal = await getOrCreateSoloJournal(supabase, lessonId, userId);
  return { mode: 'solo', duo: null, journal };
}

async function buildListResponse(supabase, lessonId, userId) {
  const rows = await findUserDuos(supabase, lessonId, userId);
  const otherIds = rows.map((row) => (
    sameUserId(row.requester_id, userId) ? row.addressee_id : row.requester_id
  ));
  const usersById = await fetchUsersByIds(otherIds);

  const accepted = rows.find((row) => row.status === 'accepted') || null;
  const incoming = [];
  const outgoing = [];
  for (const row of rows) {
    if (row.status !== 'pending') continue;
    const entry = duoPayload(row, userId, usersById);
    if (sameUserId(row.addressee_id, userId)) incoming.push(entry);
    else outgoing.push(entry);
  }

  const { mode, duo, journal } = await resolveJournal(supabase, lessonId, userId);
  const duoCard = duo ? duoPayload(duo, userId, usersById) : null;

  return {
    ok: true,
    lessonId,
    mode: accepted ? 'duo' : (incoming.length || outgoing.length ? 'pending' : mode),
    duo: duoCard,
    incoming,
    outgoing,
    journal: journalPayload(journal),
  };
}

export async function lessonDuoList(ctx) {
  const { res, userId, supabase, lessonId } = ctx;
  try {
    const id = normalizeLessonId(lessonId);
    if (!id) return res.status(400).json({ ok: false, error: 'Aula inválida para dupla.' });
    const payload = await buildListResponse(supabase, id, userId);
    return res.status(200).json(payload);
  } catch (error) {
    if (isMissingDuosTable(error)) return duosUnavailable(res);
    console.error('[api/progress] lessonDuoList', error);
    return res.status(500).json({ ok: false, error: 'Falha ao listar dupla da aula.' });
  }
}

export async function lessonDuoRequest(ctx) {
  const { res, userId, supabase, lessonId, username } = ctx;
  try {
    const id = normalizeLessonId(lessonId);
    if (!id) return res.status(400).json({ ok: false, error: 'Aula inválida para dupla.' });

    const targetUsername = normalizeUsernameQuery(username);
    if (!targetUsername) {
      return res.status(400).json({ ok: false, error: 'Username ausente.' });
    }

    const mine = await findUserDuos(supabase, id, userId);
    if (mine.some((row) => row.status === 'accepted')) {
      return res.status(409).json({ ok: false, error: 'Você já está em uma dupla nesta aula.' });
    }
    if (mine.filter((row) => row.status === 'pending' && sameUserId(row.requester_id, userId)).length >= 3) {
      return res.status(409).json({ ok: false, error: 'Limite de convites pendentes nesta aula.' });
    }

    const { data: target, error: targetError } = await supabase
      .from(USERS_TABLE)
      .select('id, full_name, username, turma, role, xp, avatar_index')
      .ilike('username', targetUsername)
      .limit(1)
      .maybeSingle();
    metricsBumpDb(1);
    if (targetError) {
      return res.status(500).json({ ok: false, error: 'Falha ao enviar convite.' });
    }
    if (!target || String(target.username).toLowerCase() !== targetUsername.toLowerCase()) {
      return res.status(404).json({ ok: false, error: 'Nenhuma alma com esse username.' });
    }
    if (sameUserId(target.id, userId)) {
      return res.status(400).json({ ok: false, error: 'Não se convida a si mesmo.' });
    }
    if (String(target.role || '') === 'admin') {
      return res.status(400).json({ ok: false, error: 'Convide um colega da turma, não o Mestre.' });
    }

    const their = await findUserDuos(supabase, id, target.id);
    if (their.some((row) => row.status === 'accepted')) {
      return res.status(409).json({ ok: false, error: 'Este colega já está em uma dupla nesta aula.' });
    }

    const nowIso = new Date().toISOString();
    const { data: created, error: insertError } = await supabase
      .from(LESSON_DUOS_TABLE)
      .insert({
        lesson_id: id,
        requester_id: userId,
        addressee_id: target.id,
        status: 'pending',
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select(DUO_SELECT)
      .single();
    metricsBumpDb(1);

    if (insertError) {
      if (isMissingDuosTable(insertError)) return duosUnavailable(res);
      if (insertError.code === '23505') {
        return res.status(409).json({ ok: false, error: 'Este convite já está em viagem.' });
      }
      return res.status(500).json({ ok: false, error: 'Falha ao enviar convite.' });
    }

    const usersById = new Map([[Number(target.id), target]]);
    return res.status(201).json({
      ok: true,
      duo: duoPayload(created, userId, usersById),
    });
  } catch (error) {
    if (isMissingDuosTable(error)) return duosUnavailable(res);
    console.error('[api/progress] lessonDuoRequest', error);
    return res.status(500).json({ ok: false, error: 'Falha ao enviar convite.' });
  }
}

export async function lessonDuoRespond(ctx) {
  const { res, userId, supabase, lessonId, decision, duoId } = ctx;
  try {
    const id = normalizeLessonId(lessonId);
    if (!id) return res.status(400).json({ ok: false, error: 'Aula inválida para dupla.' });

    const dec = String(decision || '').toLowerCase();
    if (dec !== 'accept' && dec !== 'decline') {
      return res.status(400).json({ ok: false, error: 'Decisão inválida.' });
    }

    const duoKey = Number.parseInt(duoId, 10);
    if (!Number.isFinite(duoKey)) {
      return res.status(400).json({ ok: false, error: 'Convite inválido.' });
    }

    const { data: row, error: selErr } = await supabase
      .from(LESSON_DUOS_TABLE)
      .select(DUO_SELECT)
      .eq('id', duoKey)
      .eq('lesson_id', id)
      .maybeSingle();
    metricsBumpDb(1);
    if (selErr) throw selErr;
    if (!row || row.status !== 'pending') {
      return res.status(404).json({ ok: false, error: 'Convite não encontrado.' });
    }
    if (!sameUserId(row.addressee_id, userId)) {
      return res.status(403).json({ ok: false, error: 'Só o convidado pode responder.' });
    }

    if (dec === 'decline') {
      const { error: delErr } = await supabase
        .from(LESSON_DUOS_TABLE)
        .delete()
        .eq('id', duoKey);
      metricsBumpDb(1);
      if (delErr) throw delErr;
      return res.status(200).json({ ok: true, declined: true });
    }

    // Accept: ensure neither already in accepted duo.
    const myAccepted = await findAcceptedDuo(supabase, id, userId);
    if (myAccepted) {
      return res.status(409).json({ ok: false, error: 'Você já está em uma dupla nesta aula.' });
    }
    const theirAccepted = await findAcceptedDuo(supabase, id, row.requester_id);
    if (theirAccepted) {
      return res.status(409).json({ ok: false, error: 'O colega já formou outra dupla.' });
    }

    const nowIso = new Date().toISOString();
    const { data: updated, error: updErr } = await supabase
      .from(LESSON_DUOS_TABLE)
      .update({ status: 'accepted', updated_at: nowIso })
      .eq('id', duoKey)
      .eq('status', 'pending')
      .select(DUO_SELECT)
      .single();
    metricsBumpDb(1);
    if (updErr) throw updErr;

    // Cancel other pending invites involving either user for this lesson.
    await supabase
      .from(LESSON_DUOS_TABLE)
      .delete()
      .eq('lesson_id', id)
      .eq('status', 'pending')
      .or(
        `requester_id.eq.${userId},addressee_id.eq.${userId},requester_id.eq.${row.requester_id},addressee_id.eq.${row.requester_id}`,
      )
      .neq('id', duoKey);
    metricsBumpDb(1);

    await getOrCreateDuoJournal(supabase, id, updated, userId);

    const usersById = await fetchUsersByIds([row.requester_id, row.addressee_id]);
    return res.status(200).json({
      ok: true,
      duo: duoPayload(updated, userId, usersById),
    });
  } catch (error) {
    if (isMissingDuosTable(error)) return duosUnavailable(res);
    console.error('[api/progress] lessonDuoRespond', error);
    return res.status(500).json({ ok: false, error: 'Falha ao responder convite.' });
  }
}

export async function lessonDuoLeave(ctx) {
  const { res, userId, supabase, lessonId } = ctx;
  try {
    const id = normalizeLessonId(lessonId);
    if (!id) return res.status(400).json({ ok: false, error: 'Aula inválida para dupla.' });

    const rows = await findUserDuos(supabase, id, userId);
    if (!rows.length) {
      return res.status(200).json({ ok: true, left: false });
    }

    const ids = rows.map((row) => row.id);
    const { error: delErr } = await supabase
      .from(LESSON_DUOS_TABLE)
      .delete()
      .in('id', ids);
    metricsBumpDb(1);
    if (delErr) throw delErr;

    // Ensure solo journal exists again.
    await getOrCreateSoloJournal(supabase, id, userId);
    return res.status(200).json({ ok: true, left: true });
  } catch (error) {
    if (isMissingDuosTable(error)) return duosUnavailable(res);
    console.error('[api/progress] lessonDuoLeave', error);
    return res.status(500).json({ ok: false, error: 'Falha ao sair da dupla.' });
  }
}

export async function lessonDuoSetRole(ctx) {
  const { res, userId, supabase, lessonId, role } = ctx;
  try {
    const id = normalizeLessonId(lessonId);
    if (!id) return res.status(400).json({ ok: false, error: 'Aula inválida para dupla.' });
    const picked = normalizeRole(role);
    if (!picked) {
      return res.status(400).json({ ok: false, error: 'Ofício inválido (arte ou programacao).' });
    }

    const duo = await findAcceptedDuo(supabase, id, userId);
    if (!duo) {
      return res.status(400).json({ ok: false, error: 'Forme uma dupla antes de escolher ofício.' });
    }

    const iAmRequester = sameUserId(duo.requester_id, userId);
    const partnerRole = oppositeRole(picked);
    const patch = {
      updated_at: new Date().toISOString(),
      requester_role: iAmRequester ? picked : partnerRole,
      addressee_role: iAmRequester ? partnerRole : picked,
    };

    const { data: updated, error: updErr } = await supabase
      .from(LESSON_DUOS_TABLE)
      .update(patch)
      .eq('id', duo.id)
      .select(DUO_SELECT)
      .single();
    metricsBumpDb(1);
    if (updErr) throw updErr;

    const usersById = await fetchUsersByIds([duo.requester_id, duo.addressee_id]);
    return res.status(200).json({
      ok: true,
      duo: duoPayload(updated, userId, usersById),
    });
  } catch (error) {
    if (isMissingDuosTable(error)) return duosUnavailable(res);
    console.error('[api/progress] lessonDuoSetRole', error);
    return res.status(500).json({ ok: false, error: 'Falha ao definir ofício.' });
  }
}

export async function lessonJournalGet(ctx) {
  const { res, userId, supabase, lessonId } = ctx;
  try {
    const id = normalizeLessonId(lessonId);
    if (!id) return res.status(400).json({ ok: false, error: 'Aula inválida.' });
    const payload = await buildListResponse(supabase, id, userId);
    return res.status(200).json(payload);
  } catch (error) {
    if (isMissingDuosTable(error)) return duosUnavailable(res);
    console.error('[api/progress] lessonJournalGet', error);
    return res.status(500).json({ ok: false, error: 'Falha ao ler o diário.' });
  }
}

export async function lessonJournalSave(ctx) {
  const { res, userId, supabase, lessonId, body, revision } = ctx;
  try {
    const id = normalizeLessonId(lessonId);
    if (!id) return res.status(400).json({ ok: false, error: 'Aula inválida.' });

    const text = String(body ?? '');
    if (text.length > JOURNAL_BODY_MAX) {
      return res.status(400).json({
        ok: false,
        error: `Diário excede ${JOURNAL_BODY_MAX} caracteres.`,
      });
    }

    const { duo, journal } = await resolveJournal(supabase, id, userId);
    if (!journal) {
      return res.status(500).json({ ok: false, error: 'Diário indisponível.' });
    }

    const clientRev = Number.parseInt(revision, 10);
    const serverRev = Number(journal.revision) || 1;
    if (Number.isFinite(clientRev) && clientRev > 0 && clientRev < serverRev) {
      return res.status(409).json({
        ok: false,
        conflict: true,
        error: 'O parceiro atualizou — recarregamos o diário.',
        journal: journalPayload(journal),
      });
    }

    const nextRev = serverRev + 1;
    const nowIso = new Date().toISOString();
    const { data: updated, error: updErr } = await supabase
      .from(LESSON_JOURNALS_TABLE)
      .update({
        body: text,
        revision: nextRev,
        updated_by: userId,
        updated_at: nowIso,
      })
      .eq('id', journal.id)
      .eq('revision', serverRev)
      .select(JOURNAL_SELECT)
      .maybeSingle();
    metricsBumpDb(1);

    if (updErr) throw updErr;
    if (!updated) {
      const { data: fresh } = await supabase
        .from(LESSON_JOURNALS_TABLE)
        .select(JOURNAL_SELECT)
        .eq('id', journal.id)
        .maybeSingle();
      metricsBumpDb(1);
      return res.status(409).json({
        ok: false,
        conflict: true,
        error: 'O parceiro atualizou — recarregamos o diário.',
        journal: journalPayload(fresh || journal),
      });
    }

    void duo;
    return res.status(200).json({
      ok: true,
      journal: journalPayload(updated),
    });
  } catch (error) {
    if (isMissingDuosTable(error)) return duosUnavailable(res);
    console.error('[api/progress] lessonJournalSave', error);
    return res.status(500).json({ ok: false, error: 'Falha ao salvar o diário.' });
  }
}

/**
 * Finaliza: snapshot do diário → lesson_paragraphs do aluno + secretas.
 */
export async function lessonJournalFinalize(ctx) {
  const {
    res,
    user,
    userId,
    supabase,
    lessonId,
  } = ctx;
  try {
    const id = normalizeLessonId(lessonId);
    if (!id) return res.status(400).json({ ok: false, error: 'Aula inválida.' });

    const { journal, duo } = await resolveJournal(supabase, id, userId);
    const text = String(journal?.body || '').trim();
    if (text.length < 40) {
      return res.status(400).json({
        ok: false,
        error: 'Preencha o diário de desenvolvimento antes de finalizar (mín. ~40 caracteres).',
      });
    }

    if (duo) {
      const iAmRequester = sameUserId(duo.requester_id, userId);
      const myRole = iAmRequester ? duo.requester_role : duo.addressee_role;
      if (!myRole) {
        return res.status(400).json({
          ok: false,
          error: 'Escolha seu ofício (arte ou programação) antes de finalizar.',
        });
      }
    }

    const nowIso = new Date().toISOString();
    const { error: upsertError } = await supabase.from(LESSON_PARAGRAPHS_TABLE).upsert(
      {
        user_id: userId,
        lesson_id: id,
        paragraph: text,
        updated_at: nowIso,
      },
      { onConflict: 'user_id,lesson_id' },
    );
    metricsBumpDb(1);
    if (upsertError) {
      if (upsertError.code === '42P01') {
        return res.status(503).json({
          ok: false,
          error: 'Tabela lesson_paragraphs ausente.',
        });
      }
      return res.status(500).json({ ok: false, error: 'Falha ao gravar a finalização.' });
    }

    const existingAchievements = Array.isArray(user.conquistas) ? user.conquistas : [];
    const secretAwards = evaluateSecretAchievements(id, text, existingAchievements);
    let awardedXp = 0;
    const awardedAchievementIds = [];
    secretAwards.forEach((secret) => {
      awardedAchievementIds.push(secret.id);
      awardedXp += getAchievementXp(secret.id) || Number(secret.xp || 0);
    });

    let updatedUser = user;
    let awarded = { xp: 0, achievements: [], achievementDetails: [] };
    if (awardedAchievementIds.length > 0 || awardedXp > 0) {
      const conquistas = [...existingAchievements];
      awardedAchievementIds.forEach((aid) => {
        if (!conquistas.includes(aid)) conquistas.push(aid);
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
        return res.status(500).json({ ok: false, error: 'Falha ao conceder recompensa.' });
      }
      updatedUser = data;
      awarded = {
        xp: awardedXp,
        achievements: awardedAchievementIds,
        achievementDetails: mapAchievementDetails(awardedAchievementIds),
      };
    }

    return res.status(200).json({
      ok: true,
      user: sanitizeUser(updatedUser),
      awarded,
      journal: journalPayload(journal),
    });
  } catch (error) {
    if (isMissingDuosTable(error)) return duosUnavailable(res);
    console.error('[api/progress] lessonJournalFinalize', error);
    return res.status(500).json({ ok: false, error: 'Falha ao finalizar a aula.' });
  }
}

/** Helpers exportados para smokes puros (sem HTTP). */
export const __test = {
  oppositeRole,
  normalizeRole,
  normalizeLessonId,
  JOURNAL_BODY_MAX,
};
