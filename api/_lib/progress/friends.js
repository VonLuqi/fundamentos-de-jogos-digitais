import {
  FRIENDSHIPS_TABLE,
  FRIEND_LIMIT,
  FRIEND_SEARCH_LIMIT,
  USERS_TABLE,
  VALID_TURMAS,
  assertAcceptedBond,
  countAcceptedFriends,
  fetchUsersByIds,
  findFriendshipBetween,
  friendshipsUnavailableResponse,
  isMissingFriendshipsTable,
  normalizeUsernameQuery,
  sameTurma,
  sameUserId,
  sanitizeUser,
  toClassmateCard,
  toFriendCard,
  toPublicFriendProfile,
  toTurmaMirrorProfile,
  resolveBondStatus,
  supabase,
} from './shared.js';

export async function friendsList(ctx) {
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

export async function classmatesList(ctx) {
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

export async function friendSearch(ctx) {
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

export async function friendRequest(ctx) {
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

export async function friendRespond(ctx) {
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

export async function friendRemove(ctx) {
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

export async function friendProfile(ctx) {
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
