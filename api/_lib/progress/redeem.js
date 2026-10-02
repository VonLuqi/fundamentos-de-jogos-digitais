import {
  CODES_TABLE,
  LESSON_CATALOG,
  USERS_TABLE,
  codeExpiresAt,
  insertCodeWithRetry,
  isCodeExpired,
  isCodeRedeemable,
  isCodeSingleUse,
  levelForXp,
  mapAchievementDetails,
  metricsBumpDb,
  normalizeCodeTtlMinutes,
  normalizeCodes,
  recalculateAchievements,
  rejectUnlessAdmin,
  sanitizeUser,
  supabase,
} from './shared.js';
import { invalidateLeaderboardCache } from '../leaderboard-cache.js';

export async function redeem(ctx) {
  const {
    res,
    user,
    userId,
    code,
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
  if (isCodeExpired(rewardRow)) {
    return res.status(410).json({ ok: false, error: 'Código expirado.' });
  }

  const singleUse = isCodeSingleUse(rewardRow);
  if (singleUse && rewardRow.redeemed_at) {
    return res.status(409).json({ ok: false, error: 'Código de uso único já foi resgatado.' });
  }

  const redeemed = Array.isArray(user.redeemed_codes) ? [...user.redeemed_codes] : [];
  if (redeemed.includes(raw)) {
    return res.status(409).json({ ok: false, error: 'Você já resgatou este código.' });
  }

  const nowIso = new Date().toISOString();

  // Uso único: reivindica atomicamente antes de conceder XP (evita corrida).
  if (singleUse) {
    const { data: claimed, error: claimError } = await supabase
      .from(CODES_TABLE)
      .update({ redeemed_at: nowIso, redeemed_by: userId })
      .eq('code', raw)
      .is('redeemed_at', null)
      .select('code')
      .maybeSingle();
    metricsBumpDb(1);
    if (claimError) {
      return res.status(500).json({ ok: false, error: 'Falha ao reservar o código de uso único.' });
    }
    if (!claimed) {
      return res.status(409).json({ ok: false, error: 'Código de uso único já foi resgatado.' });
    }
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
  if (userUpdateError) {
    return res.status(500).json({ ok: false, error: 'Erro ao atualizar usuário.' });
  }

  // Turma compartilhada: telemetria do primeiro resgate (não invalida para os demais).
  if (!singleUse) {
    await supabase
      .from(CODES_TABLE)
      .update({ redeemed_at: nowIso, redeemed_by: userId })
      .eq('code', raw)
      .is('redeemed_at', null);
    metricsBumpDb(1);
  }

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
      singleUse,
    },
    leveledUp: levelAfter > levelBefore,
  });
}

export async function generateCode(ctx) {
  const {
    res,
    user,
    userId,
    lessonId,
    ttlMinutes,
    singleUse,
  } = ctx;
  if (rejectUnlessAdmin(user, res)) return;
  if (Object.keys(LESSON_CATALOG).length === 0) {
    return res.status(409).json({ ok: false, error: 'Não há aulas cadastradas para gerar códigos.' });
  }
  const lesson = LESSON_CATALOG[String(lessonId || '')];
  if (!lesson) return res.status(400).json({ ok: false, error: 'Aula inválida para geração de código.' });

  const ttl = normalizeCodeTtlMinutes(ttlMinutes);
  const asSingleUse = Boolean(singleUse);

  const payload = {
    lesson_id: lesson.lessonId,
    lesson_title: lesson.lessonTitle,
    xp: lesson.xp,
    created_by: userId,
  };

  const { code: created, error } = await insertCodeWithRetry(payload, {
    ttlMinutes: ttl,
    singleUse: asSingleUse,
  });
  if (error || !created) {
    const message = error?.message && /single_use/i.test(error.message)
      ? error.message
      : 'Falha ao gerar código.';
    return res.status(500).json({ ok: false, error: message });
  }

  return res.status(201).json({
    ok: true,
    code: {
      code: created.code,
      lessonId: created.lesson_id,
      lessonTitle: created.lesson_title,
      xp: created.xp,
      createdAt: created.created_at,
      expiresAt: codeExpiresAt(created),
      singleUse: isCodeSingleUse(created) || asSingleUse,
      ttlMinutes: ttl,
    },
  });
}

export async function lessonCode(ctx) {
  const {
    res,
    lessonId,
  } = ctx;
  const lesson = LESSON_CATALOG[String(lessonId || '')];
  if (!lesson) return res.status(400).json({ ok: false, error: 'Aula inválida.' });

  const { data: rows } = await supabase
    .from(CODES_TABLE)
    .select('*')
    .eq('lesson_id', lesson.lessonId)
    .order('created_at', { ascending: false })
    .limit(50);

  const latest = (rows || []).find((row) => isCodeRedeemable(row));

  if (!latest) {
    return res.status(404).json({
      ok: false,
      error: 'Nenhum código ativo para esta aula. Peça para um admin gerar no Salão dos Heróis.',
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
      singleUse: isCodeSingleUse(latest),
    },
  });
}

export async function listCodes(ctx) {
  const {
    res,
    user,
  } = ctx;
  if (rejectUnlessAdmin(user, res)) return;
  const { data: rows, error } = await supabase
    .from(CODES_TABLE)
    .select('code, lesson_id, lesson_title, xp, created_at, expires_at, redeemed_at, redeemed_by, single_use')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) {
    // Ambiente sem coluna single_use ainda: refaz select legado.
    if (error.code === 'PGRST204' || /single_use/i.test(error.message || '')) {
      const legacy = await supabase
        .from(CODES_TABLE)
        .select('code, lesson_id, lesson_title, xp, created_at, expires_at, redeemed_at, redeemed_by')
        .order('created_at', { ascending: false })
        .limit(100);
      if (legacy.error) {
        return res.status(500).json({ ok: false, error: 'Falha ao listar códigos.' });
      }
      return res.status(200).json({ ok: true, codes: normalizeCodes(legacy.data) });
    }
    return res.status(500).json({ ok: false, error: 'Falha ao listar códigos.' });
  }
  return res.status(200).json({ ok: true, codes: normalizeCodes(rows) });
}
