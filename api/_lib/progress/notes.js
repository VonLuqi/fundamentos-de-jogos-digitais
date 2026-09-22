import {
  FRIENDSHIPS_TABLE,
  NOTE_BODY_MAX,
  NOTE_EVENTS_TABLE,
  NOTE_ROW_SELECT,
  NOTE_SHARES_TABLE,
  NOTE_SOFT_WARN_COUNT,
  NOTE_TITLE_MAX,
  NOTES_TABLE,
  USERS_TABLE,
  assertAcceptedBond,
  countOriginalUserNotes,
  countUnreadNoteEvents,
  countUserNotes,
  evaluateAndAwardGrimoire,
  fetchNoteEventsForOwner,
  fetchSharesForNotes,
  fetchUsersByIds,
  insertNoteEvent,
  isMissingFriendshipsTable,
  isMissingNotesTable,
  normalizeNoteTags,
  notesUnavailableResponse,
  resolveClonedFrom,
  resolveNoteLessonIdOrReject,
  sanitizeUser,
  toNoteDetail,
  toNoteSummary,
  supabase,
} from './shared.js';

export async function notesList(ctx) {
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

export async function noteGet(ctx) {
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

export async function noteCreate(ctx) {
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

export async function noteUpdate(ctx) {
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

export async function noteDelete(ctx) {
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

export async function noteShare(ctx) {
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

export async function noteUnshare(ctx) {
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

export async function noteClone(ctx) {
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

export async function noteRefuseShare(ctx) {
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

export async function noteEventsAck(ctx) {
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

async function notesListAdminOrForUser(ctx) {
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
try {
  if (action === 'notesListAdmin') {
    const { data: rows, error } = await supabase
      .from(NOTES_TABLE)
      .select('user_id, title, tags');
    if (error) {
      if (isMissingNotesTable(error)) return notesUnavailableResponse(res);
      return res.status(500).json({ ok: false, error: 'Falha ao listar grimórios.' });
    }
    const counts = new Map();
    const notesByUser = new Map();
    (rows || []).forEach((row) => {
      const id = Number(row.user_id);
      counts.set(id, (counts.get(id) || 0) + 1);
      const list = notesByUser.get(id) || [];
      list.push({
        title: row.title || '',
        tags: Array.isArray(row.tags) ? row.tags : [],
      });
      notesByUser.set(id, list);
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
          notes: notesByUser.get(id) || [],
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

export async function notesListAdmin(ctx) {
  return notesListAdminOrForUser(ctx);
}

export async function notesListForUser(ctx) {
  return notesListAdminOrForUser(ctx);
}
