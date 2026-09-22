/**
 * ============================================================
 * /api/classind — ClassInd-dle (salas live Higher/Lower)
 * ============================================================
 * Task 3 — docs/plano-aula5-classind-iarc.md
 *
 * Mutações: service-role. Push: upsert em classind_live_snapshots.
 * Secrets nunca entram no snapshot antes de phase=revealed.
 * Identidade vem APENAS da sessão. userId no body é ignorado.
 * ============================================================
 */

import crypto from 'node:crypto';
import supabase from './supabaseClient.js';
import { loadValidSession } from './_lib/sessions.js';
import {
  MESSENGER_SEAL_REQUIRED,
  needsMessengerSeal,
} from './_lib/messenger-seal.js';
import {
  DECK_ID,
  deckLength,
  getRoundByIndex,
  shuffleDeckOrder,
  splitRoundPayload,
} from '../js/classind-dle/config/rounds.js';

const USERS_TABLE = 'users';
const ROOMS = 'classind_rooms';
const ROUNDS_TBL = 'classind_rounds';
const VOTES = 'classind_votes';
const MEMBERS = 'classind_members';
const SNAPSHOTS = 'classind_live_snapshots';

const ROOM_TTL_MS = 6 * 60 * 60 * 1000;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TABLE_MISSING =
  'Tabelas ClassInd-dle ausentes. Aplique db/migrate-2026-09-21-classind-dle.sql (ver docs/nota-deploy-classind-dle.md).';

const ADMIN_ACTIONS = new Set([
  'createRoom',
  'startRound',
  'reveal',
  'nextRound',
  'showRanking',
  'closeRoom',
  'listRoomRoster',
]);

function isMissingTable(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return code === '42P01'
    || code === 'PGRST205'
    || /classind_/i.test(message) && /does not exist|schema cache|Could not find the table/i.test(message);
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeCode(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function generateRoomCode(length = 5) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

function getRealtimeConfig(roomId) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || null;
  const anonKey = process.env.SUPABASE_ANON_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || null;
  if (!url || !anonKey || !roomId) return null;
  return { url, anonKey, roomId };
}

function roomExpired(room) {
  if (!room?.updated_at) return false;
  const updated = new Date(room.updated_at).getTime();
  if (Number.isNaN(updated)) return false;
  return Date.now() - updated > ROOM_TTL_MS;
}

/**
 * Monta payload público do snapshot (sem secrets pré-reveal).
 * Exportado para smoke / testes.
 */
export function buildPublicSnapshotPayload({
  room,
  roundRow = null,
  tallies = { A: 0, B: 0 },
  votersCount = 0,
  membersCount = 0,
  deckFinished = false,
}) {
  const phase = room?.phase || 'lobby';
  const roundIndex = Number(room?.current_round_index) || 0;
  const publicPayload = asObject(roundRow?.payload_public);
  const secret = asObject(roundRow?.payload_secret);
  const revealed = phase === 'revealed' || roundRow?.phase === 'revealed';

  const base = {
    phase,
    roundIndex,
    deckId: room?.deck_id || DECK_ID,
    deckLength: deckLength(),
    deckFinished: Boolean(deckFinished),
    question: publicPayload.question || 'Qual exige a idade mais alta?',
    sideA: publicPayload.sideA || null,
    sideB: publicPayload.sideB || null,
    tallies: {
      A: Number(tallies.A) || 0,
      B: Number(tallies.B) || 0,
    },
    votersCount: Number(votersCount) || 0,
    membersCount: Number(membersCount) || 0,
    stateVersion: Number(room?.state_version) || 0,
    code: room?.code || null,
    requireAllVotes: Boolean(asObject(room?.settings).requireAllVotes),
  };

  if (!revealed) {
    return base;
  }

  return {
    ...base,
    correctSide: secret.correctSide || null,
    ratingA: secret.ratingA || null,
    ratingB: secret.ratingB || null,
    descriptors: secret.descriptors || null,
    rationale: secret.rationale || null,
  };
}

/** Garante que o objeto não vaza ratings/correctSide antes do reveal. */
export function assertNoSecrets(payload) {
  if (!payload || typeof payload !== 'object') return true;
  const forbidden = ['correctSide', 'ratingA', 'ratingB', 'descriptors', 'rationale', 'payload_secret'];
  return forbidden.every((key) => payload[key] == null);
}

async function loadSessionUser(token) {
  if (!token || typeof token !== 'string') return { errorStatus: 401, error: 'Sessão inválida.' };

  const session = await loadValidSession(supabase, token);
  if (!session?.user_id) return { errorStatus: 401, error: 'Sessão inválida.' };

  const { data: user, error: userError } = await supabase
    .from(USERS_TABLE)
    .select('id, role, username, full_name, turma, email_verified_at')
    .eq('id', session.user_id)
    .limit(1)
    .maybeSingle();

  if (userError) return { errorStatus: 500, error: 'Falha ao carregar usuário.' };
  if (!user) return { errorStatus: 404, error: 'Usuário não encontrado.' };
  if (needsMessengerSeal(user)) {
    return { errorStatus: 403, error: MESSENGER_SEAL_REQUIRED };
  }
  return { user };
}

async function countMembers(roomId) {
  const { count, error } = await supabase
    .from(MEMBERS)
    .select('*', { count: 'exact', head: true })
    .eq('room_id', roomId);
  if (error) return { error };
  return { count: count || 0 };
}

/** Alunos elegíveis a votar (exclui admin). */
async function countEligibleVoters(roomId) {
  const { data: memberRows, error: membersError } = await supabase
    .from(MEMBERS)
    .select('user_id')
    .eq('room_id', roomId);
  if (membersError) return { error: membersError };
  const userIds = (memberRows || []).map((m) => m.user_id);
  if (!userIds.length) return { count: 0, studentIds: [] };

  const { data: users, error: usersError } = await supabase
    .from(USERS_TABLE)
    .select('id, role')
    .in('id', userIds);
  if (usersError) return { error: usersError };

  const studentIds = (users || [])
    .filter((u) => String(u.role || '') !== 'admin')
    .map((u) => u.id);
  return { count: studentIds.length, studentIds };
}

async function countVotes(roundId) {
  const { data, error } = await supabase
    .from(VOTES)
    .select('choice')
    .eq('round_id', roundId);
  if (error) return { error };
  const tallies = { A: 0, B: 0 };
  for (const row of data || []) {
    if (row.choice === 'A') tallies.A += 1;
    if (row.choice === 'B') tallies.B += 1;
  }
  return { tallies, votersCount: (data || []).length };
}

/** Placar pessoal: rodadas reveladas; scoreTotal = deck jogado (inclui skipped). */
async function computeUserScore(roomId, userId) {
  const { data: rounds, error } = await supabase
    .from(ROUNDS_TBL)
    .select('id, round_index, phase, payload_public, payload_secret')
    .eq('room_id', roomId)
    .eq('phase', 'revealed')
    .order('round_index', { ascending: true });
  if (error) return { error };

  let scoreAnswered = 0;
  let scoreCorrect = 0;
  const breakdown = [];
  for (const round of rounds || []) {
    const { data: vote, error: voteError } = await supabase
      .from(VOTES)
      .select('choice')
      .eq('round_id', round.id)
      .eq('user_id', userId)
      .maybeSingle();
    if (voteError) return { error: voteError };
    const secret = asObject(round.payload_secret);
    const pub = asObject(round.payload_public);
    const choice = vote?.choice || null;
    const correctSide = secret.correctSide || null;
    let outcome = 'skipped';
    if (choice) {
      scoreAnswered += 1;
      if (correctSide && choice === correctSide) {
        scoreCorrect += 1;
        outcome = 'correct';
      } else {
        outcome = 'wrong';
      }
    }
    breakdown.push({
      roundIndex: Number(round.round_index) || 0,
      titleA: pub.sideA?.title || 'A',
      titleB: pub.sideB?.title || 'B',
      choice,
      correctSide,
      outcome,
    });
  }
  const scoreTotal = breakdown.length;
  return { scoreCorrect, scoreAnswered, scoreTotal, rounds: breakdown };
}

/** Placar de todos os alunos da sala (exclui admin/host). */
async function buildSessionScores(room) {
  const { round } = await loadCurrentRound(room);
  const rosterResult = await buildRoster(room, round || null);
  if (rosterResult.error) return { error: rosterResult.error };

  const students = (rosterResult.roster || []).filter((row) => row.role !== 'admin');
  const performances = [];
  for (const student of students) {
    const score = await computeUserScore(room.id, student.userId);
    if (score.error) return { error: score.error };
    performances.push({
      userId: student.userId,
      username: student.username || student.fullName || `user ${student.userId}`,
      scoreCorrect: score.scoreCorrect,
      scoreAnswered: score.scoreAnswered,
      // Denominador de UI = rodadas reveladas (alinha com /10 do deck).
      scoreTotal: score.scoreTotal ?? score.scoreAnswered,
    });
  }

  performances.sort((a, b) => {
    if (b.scoreCorrect !== a.scoreCorrect) return b.scoreCorrect - a.scoreCorrect;
    if (b.scoreAnswered !== a.scoreAnswered) return b.scoreAnswered - a.scoreAnswered;
    return String(a.username).localeCompare(String(b.username), 'pt-BR');
  });

  const ranking = performances.map((row, index) => ({
    rank: index + 1,
    userId: row.userId,
    username: row.username,
    scoreCorrect: row.scoreCorrect,
    scoreAnswered: row.scoreTotal ?? row.scoreAnswered,
    scoreTotal: row.scoreTotal ?? row.scoreAnswered,
  }));

  return { performances, ranking };
}

function isDeckFinishedPhase(room) {
  const phase = room?.phase || '';
  if (phase === 'results' || phase === 'ranking') return true;
  return phase === 'lobby'
    && Number(room?.current_round_index) >= deckLength()
    && deckLength() > 0;
}

async function getMember(roomId, userId) {
  const { data, error } = await supabase
    .from(MEMBERS)
    .select('room_id, user_id, joined_at, last_seen_at')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return { error };
  return { member: data };
}

async function ensureMember(roomId, userId) {
  const { member, error: readError } = await getMember(roomId, userId);
  if (readError) return { error: readError };
  const now = new Date().toISOString();
  if (member) {
    const { error } = await supabase
      .from(MEMBERS)
      .update({ last_seen_at: now })
      .eq('room_id', roomId)
      .eq('user_id', userId);
    return { error };
  }
  const { error } = await supabase.from(MEMBERS).insert({
    room_id: roomId,
    user_id: userId,
    joined_at: now,
    last_seen_at: now,
  });
  if (error?.code === '23505') return { error: null };
  return { error };
}

async function loadRoomById(roomId) {
  const { data, error } = await supabase
    .from(ROOMS)
    .select('*')
    .eq('id', roomId)
    .maybeSingle();
  if (error) return { error };
  return { room: data };
}

async function loadRoomByCode(code) {
  const { data, error } = await supabase
    .from(ROOMS)
    .select('*')
    .eq('code', code)
    .maybeSingle();
  if (error) return { error };
  return { room: data };
}

async function loadCurrentRound(room) {
  if (!room) return { round: null };
  const { data, error } = await supabase
    .from(ROUNDS_TBL)
    .select('*')
    .eq('room_id', room.id)
    .eq('round_index', room.current_round_index)
    .maybeSingle();
  if (error) return { error };
  return { round: data };
}

async function bumpRoom(roomId, patch) {
  const { data, error } = await supabase
    .from(ROOMS)
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', roomId)
    .select('*')
    .single();
  if (error) return { error };
  return { room: data };
}

async function writeSnapshot(room, roundRow, tallies, votersCount, membersCount, deckFinished = false) {
  const payload = buildPublicSnapshotPayload({
    room,
    roundRow,
    tallies,
    votersCount,
    membersCount,
    deckFinished,
  });

  if (room.phase !== 'revealed' && !assertNoSecrets(payload)) {
    return { error: new Error('Snapshot tentou vazar segredo pré-reveal.') };
  }

  const { error } = await supabase.from(SNAPSHOTS).upsert(
    {
      room_id: room.id,
      state_version: room.state_version,
      payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'room_id' }
  );
  return { error, payload };
}

async function refreshSnapshotForRoom(room, { deckFinished = false } = {}) {
  const { round, error: roundError } = await loadCurrentRound(room);
  if (roundError) return { error: roundError };

  let tallies = { A: 0, B: 0 };
  let votersCount = 0;
  if (round?.id) {
    const votes = await countVotes(round.id);
    if (votes.error) return { error: votes.error };
    tallies = votes.tallies;
    votersCount = votes.votersCount;
  }

  const members = await countMembers(room.id);
  if (members.error) return { error: members.error };

  return writeSnapshot(room, round, tallies, votersCount, members.count, deckFinished);
}

async function buildRoster(room, round) {
  const { data: memberRows, error: membersError } = await supabase
    .from(MEMBERS)
    .select('user_id, joined_at, last_seen_at')
    .eq('room_id', room.id)
    .order('joined_at', { ascending: true });
  if (membersError) return { error: membersError };

  const userIds = (memberRows || []).map((m) => m.user_id);
  let usersById = {};
  if (userIds.length) {
    const { data: users, error: usersError } = await supabase
      .from(USERS_TABLE)
      .select('id, username, full_name, role')
      .in('id', userIds);
    if (usersError) return { error: usersError };
    usersById = Object.fromEntries((users || []).map((u) => [u.id, u]));
  }

  let votedIds = new Set();
  if (round?.id) {
    const { data: voteRows, error: voteError } = await supabase
      .from(VOTES)
      .select('user_id, choice')
      .eq('round_id', round.id);
    if (voteError) return { error: voteError };
    votedIds = new Set((voteRows || []).map((v) => v.user_id));
  }

  const roster = (memberRows || []).map((m) => {
    const u = usersById[m.user_id] || {};
    const isHost = m.user_id === room.host_user_id;
    const role = isHost || u.role === 'admin' ? 'admin' : (u.role || null);
    return {
      userId: m.user_id,
      username: u.username || null,
      fullName: u.full_name || null,
      role,
      hasVoted: votedIds.has(m.user_id),
      lastSeenAt: m.last_seen_at,
    };
  });

  const pendingVoters = roster
    .filter((r) => !r.hasVoted && room.phase === 'voting' && r.role !== 'admin')
    .map((r) => ({ userId: r.userId, username: r.username, fullName: r.fullName }));

  return { roster, pendingVoters };
}

async function buildClientState(user, room, { includeRoster = false } = {}) {
  const { round, error: roundError } = await loadCurrentRound(room);
  if (roundError) return { error: roundError };

  let tallies = { A: 0, B: 0 };
  let votersCount = 0;
  let myVote = null;

  if (round?.id) {
    const votes = await countVotes(round.id);
    if (votes.error) return { error: votes.error };
    tallies = votes.tallies;
    votersCount = votes.votersCount;

    const { data: mine, error: mineError } = await supabase
      .from(VOTES)
      .select('choice')
      .eq('round_id', round.id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (mineError) return { error: mineError };
    myVote = mine?.choice || null;
  }

  const members = await countMembers(room.id);
  if (members.error) return { error: members.error };

  const eligible = await countEligibleVoters(room.id);
  if (eligible.error) return { error: eligible.error };

  const deckFinished = isDeckFinishedPhase(room);

  const snapshot = buildPublicSnapshotPayload({
    room,
    roundRow: (room.phase === 'results' || room.phase === 'ranking') ? null : round,
    tallies,
    votersCount,
    membersCount: members.count,
    deckFinished,
  });

  let scoreCorrect = 0;
  let scoreAnswered = 0;
  const isHost = user.id === room.host_user_id;
  const isAdmin = user.role === 'admin' || isHost;
  let myPerformance = null;
  let performances = null;
  let ranking = null;

  if (!isAdmin) {
    const score = await computeUserScore(room.id, user.id);
    if (score.error) return { error: score.error };
    scoreCorrect = score.scoreCorrect;
    scoreAnswered = score.scoreAnswered;
    if (room.phase === 'results' || room.phase === 'ranking') {
      myPerformance = {
        scoreCorrect: score.scoreCorrect,
        scoreAnswered: score.scoreAnswered,
        scoreTotal: score.scoreTotal ?? (score.rounds || []).length,
        rounds: score.rounds || [],
      };
    }
  }

  if (room.phase === 'results' || room.phase === 'ranking') {
    const sessionScores = await buildSessionScores(room);
    if (sessionScores.error) return { error: sessionScores.error };
    if (isAdmin) {
      performances = sessionScores.performances;
    }
    if (room.phase === 'ranking') {
      ranking = sessionScores.ranking;
    }
  }

  const state = {
    ...snapshot,
    myVote,
    roomId: room.id,
    hostUserId: room.host_user_id || null,
    youWereCorrect: null,
    eligibleVotersCount: eligible.count,
    canVote: !isAdmin && room.phase === 'voting',
    scoreCorrect,
    scoreAnswered,
    myPerformance,
    performances,
    ranking,
  };

  if (snapshot.correctSide && myVote) {
    state.youWereCorrect = myVote === snapshot.correctSide;
  }

  if (includeRoster) {
    const roster = await buildRoster(room, round);
    if (roster.error) return { error: roster.error };
    state.roster = roster.roster;
    state.pendingVoters = roster.pendingVoters;
  }

  return { state, round };
}

async function createRoomWithCode(hostUserId, turma, settings) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateRoomCode(5);
    const { data, error } = await supabase
      .from(ROOMS)
      .insert({
        code,
        host_user_id: hostUserId,
        turma: turma || null,
        phase: 'lobby',
        current_round_index: 0,
        deck_id: DECK_ID,
        state_version: 1,
        settings: {
          requireAllVotes: Boolean(settings?.requireAllVotes),
          deckOrder: Array.isArray(settings?.deckOrder) && settings.deckOrder.length === deckLength()
            ? settings.deckOrder
            : shuffleDeckOrder(),
        },
      })
      .select('*')
      .single();

    if (!error) return { room: data };
    if (error.code === '23505') continue;
    return { error };
  }
  return { error: new Error('Não foi possível gerar código único da sala.') };
}

async function openRoundAtIndex(room, index) {
  const deckOrder = asObject(room?.settings).deckOrder;
  const deckRound = getRoundByIndex(index, deckOrder);
  if (!deckRound) {
    return { errorStatus: 400, error: 'Não há mais rodadas neste deck.' };
  }

  const { public: payloadPublic, secret: payloadSecret } = splitRoundPayload(deckRound);

  const { data: roundRow, error: roundError } = await supabase
    .from(ROUNDS_TBL)
    .upsert(
      {
        room_id: room.id,
        round_index: index,
        payload_public: payloadPublic,
        payload_secret: payloadSecret,
        phase: 'voting',
        revealed_at: null,
      },
      { onConflict: 'room_id,round_index' }
    )
    .select('*')
    .single();

  if (roundError) return { error: roundError };

  await supabase.from(VOTES).delete().eq('round_id', roundRow.id);

  const nextVersion = Number(room.state_version || 0) + 1;
  const { room: updated, error: roomError } = await bumpRoom(room.id, {
    phase: 'voting',
    current_round_index: index,
    state_version: nextVersion,
  });
  if (roomError) return { error: roomError };

  const snap = await refreshSnapshotForRoom(updated);
  if (snap.error) return { error: snap.error };

  return { room: updated, round: roundRow };
}

function jsonError(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

function maybeTableError(res, error) {
  if (isMissingTable(error)) {
    return jsonError(res, 503, TABLE_MISSING);
  }
  return null;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return jsonError(res, 405, 'Método não permitido.');
    }

    if (!supabase) {
      return jsonError(res, 503, 'ClassInd-dle offline: Supabase não configurado.');
    }

    const body = req.body || {};
    const { action, token } = body;
    const session = await loadSessionUser(token);
    if (session.error) {
      return jsonError(res, session.errorStatus || 401, session.error);
    }
    const { user } = session;
    const isAdmin = user.role === 'admin';

    if (ADMIN_ACTIONS.has(action) && !isAdmin) {
      return jsonError(res, 403, 'Apenas o Mestre controla a sala.');
    }

    if (action === 'createRoom') {
      const turma = body.turma && ['TCG01', 'TCG02'].includes(body.turma) ? body.turma : null;
      const { room, error } = await createRoomWithCode(user.id, turma, body.settings);
      if (error) {
        return maybeTableError(res, error) || jsonError(res, 500, 'Falha ao criar sala.');
      }

      const member = await ensureMember(room.id, user.id);
      if (member.error) {
        return maybeTableError(res, member.error) || jsonError(res, 500, 'Falha ao registrar o Mestre na sala.');
      }

      const snap = await refreshSnapshotForRoom(room);
      if (snap.error) {
        return maybeTableError(res, snap.error) || jsonError(res, 500, 'Falha ao criar snapshot da sala.');
      }

      const { state, error: stateError } = await buildClientState(user, room, { includeRoster: true });
      if (stateError) {
        return maybeTableError(res, stateError) || jsonError(res, 500, 'Falha ao montar estado da sala.');
      }

      return res.status(200).json({
        ok: true,
        roomId: room.id,
        code: room.code,
        state,
        realtime: getRealtimeConfig(room.id),
      });
    }

    if (action === 'joinRoom') {
      const code = normalizeCode(body.code);
      if (!/^[A-Z0-9]{4,6}$/.test(code)) {
        return jsonError(res, 400, 'Código de sala inválido.');
      }

      const { room, error } = await loadRoomByCode(code);
      if (error) {
        return maybeTableError(res, error) || jsonError(res, 500, 'Falha ao buscar sala.');
      }
      if (!room) return jsonError(res, 404, 'Sala não encontrada.');
      if (room.phase === 'closed' || roomExpired(room)) {
        return jsonError(res, 410, 'Esta sala foi encerrada ou expirou.');
      }
      if (room.turma && user.role !== 'admin' && user.turma && room.turma !== user.turma) {
        return jsonError(res, 403, 'Esta sala é de outra turma.');
      }

      const member = await ensureMember(room.id, user.id);
      if (member.error) {
        return maybeTableError(res, member.error) || jsonError(res, 500, 'Falha ao entrar na sala.');
      }

      await supabase
        .from(ROOMS)
        .update({ updated_at: new Date().toISOString() })
        .eq('id', room.id);

      const { room: fresh } = await loadRoomById(room.id);
      const active = fresh || room;
      const snap = await refreshSnapshotForRoom(active);
      if (snap.error) {
        return maybeTableError(res, snap.error) || jsonError(res, 500, 'Falha ao atualizar snapshot.');
      }

      const { state, error: stateError } = await buildClientState(user, active, {
        includeRoster: true,
      });
      if (stateError) {
        return maybeTableError(res, stateError) || jsonError(res, 500, 'Falha ao montar estado.');
      }

      return res.status(200).json({
        ok: true,
        roomId: active.id,
        code: active.code,
        state,
        realtime: getRealtimeConfig(active.id),
      });
    }

    const resolveRoomForMember = async () => {
      let room = null;
      if (body.roomId) {
        const loaded = await loadRoomById(body.roomId);
        if (loaded.error) return loaded;
        room = loaded.room;
      } else if (body.code) {
        const loaded = await loadRoomByCode(normalizeCode(body.code));
        if (loaded.error) return loaded;
        room = loaded.room;
      }
      if (!room) return { errorStatus: 404, error: 'Sala não encontrada.' };
      if (room.phase === 'closed' || roomExpired(room)) {
        return { errorStatus: 410, error: 'Esta sala foi encerrada ou expirou.' };
      }
      const { member, error: memberError } = await getMember(room.id, user.id);
      if (memberError) return { error: memberError };
      if (!member && !isAdmin) {
        return { errorStatus: 403, error: 'Entre na sala antes de continuar.' };
      }
      if (!member && isAdmin) {
        const ensured = await ensureMember(room.id, user.id);
        if (ensured.error) return { error: ensured.error };
      }
      return { room };
    };

    if (action === 'ping') {
      const resolved = await resolveRoomForMember();
      if (resolved.errorStatus) return jsonError(res, resolved.errorStatus, resolved.error);
      if (resolved.error) {
        return maybeTableError(res, resolved.error) || jsonError(res, 500, 'Falha no ping.');
      }
      const ensured = await ensureMember(resolved.room.id, user.id);
      if (ensured.error) {
        return maybeTableError(res, ensured.error) || jsonError(res, 500, 'Falha no ping.');
      }
      return res.status(200).json({ ok: true });
    }

    if (action === 'getState') {
      const resolved = await resolveRoomForMember();
      if (resolved.errorStatus) return jsonError(res, resolved.errorStatus, resolved.error);
      if (resolved.error) {
        return maybeTableError(res, resolved.error) || jsonError(res, 500, 'Falha ao ler sala.');
      }
      const { state, error: stateError } = await buildClientState(user, resolved.room, {
        includeRoster: true,
      });
      if (stateError) {
        return maybeTableError(res, stateError) || jsonError(res, 500, 'Falha ao montar estado.');
      }
      return res.status(200).json({
        ok: true,
        state,
        realtime: getRealtimeConfig(resolved.room.id),
      });
    }

    if (action === 'startRound') {
      const resolved = await resolveRoomForMember();
      if (resolved.errorStatus) return jsonError(res, resolved.errorStatus, resolved.error);
      if (resolved.error) {
        return maybeTableError(res, resolved.error) || jsonError(res, 500, 'Falha ao ler sala.');
      }
      const room = resolved.room;
      if (!['lobby', 'revealed'].includes(room.phase)) {
        return jsonError(res, 400, 'Não é possível abrir rodada neste estado. Revelar ou avançar primeiro.');
      }
      if (isDeckFinishedPhase(room)) {
        return jsonError(res, 400, 'O deck desta sessão já terminou. Veja o desempenho ou encerre a sala.');
      }

      const index = Number.isInteger(body.roundIndex)
        ? body.roundIndex
        : Number(room.current_round_index) || 0;

      const opened = await openRoundAtIndex(room, index);
      if (opened.errorStatus) return jsonError(res, opened.errorStatus, opened.error);
      if (opened.error) {
        return maybeTableError(res, opened.error) || jsonError(res, 500, 'Falha ao abrir rodada.');
      }

      const { state, error: stateError } = await buildClientState(user, opened.room, {
        includeRoster: true,
      });
      if (stateError) {
        return maybeTableError(res, stateError) || jsonError(res, 500, 'Falha ao montar estado.');
      }

      return res.status(200).json({ ok: true, state, realtime: getRealtimeConfig(opened.room.id) });
    }

    if (action === 'castVote') {
      const resolved = await resolveRoomForMember();
      if (resolved.errorStatus) return jsonError(res, resolved.errorStatus, resolved.error);
      if (resolved.error) {
        return maybeTableError(res, resolved.error) || jsonError(res, 500, 'Falha ao ler sala.');
      }
      const room = resolved.room;
      if (user.role === 'admin' || user.id === room.host_user_id) {
        return jsonError(res, 403, 'O Mestre não vota — apenas conduz a sala.');
      }

      const choice = String(body.choice || '').toUpperCase();
      if (choice !== 'A' && choice !== 'B') {
        return jsonError(res, 400, 'Escolha inválida. Use A ou B.');
      }

      if (room.phase !== 'voting') {
        return jsonError(res, 400, 'A votação não está aberta.');
      }

      const { round, error: roundError } = await loadCurrentRound(room);
      if (roundError) {
        return maybeTableError(res, roundError) || jsonError(res, 500, 'Falha ao ler rodada.');
      }
      if (!round || round.phase !== 'voting') {
        return jsonError(res, 400, 'Rodada inválida para voto.');
      }

      const { error: voteError } = await supabase.from(VOTES).insert({
        round_id: round.id,
        user_id: user.id,
        choice,
      });

      if (voteError?.code === '23505') {
        return jsonError(res, 409, 'Você já votou nesta rodada.');
      }
      if (voteError) {
        return maybeTableError(res, voteError) || jsonError(res, 500, 'Falha ao registrar voto.');
      }

      await ensureMember(room.id, user.id);

      const nextVersion = Number(room.state_version || 0) + 1;
      const { room: updated, error: roomError } = await bumpRoom(room.id, {
        state_version: nextVersion,
        phase: 'voting',
      });
      if (roomError) {
        return maybeTableError(res, roomError) || jsonError(res, 500, 'Falha ao atualizar sala.');
      }

      const snap = await refreshSnapshotForRoom(updated);
      if (snap.error) {
        return maybeTableError(res, snap.error) || jsonError(res, 500, 'Falha ao atualizar placar.');
      }
      if (!assertNoSecrets(snap.payload)) {
        return jsonError(res, 500, 'Snapshot inválido (segredo vazou).');
      }

      const { state, error: stateError } = await buildClientState(user, updated, {
        includeRoster: true,
      });
      if (stateError) {
        return maybeTableError(res, stateError) || jsonError(res, 500, 'Falha ao montar estado.');
      }

      return res.status(200).json({
        ok: true,
        myVote: choice,
        state,
        realtime: getRealtimeConfig(updated.id),
      });
    }

    if (action === 'reveal') {
      const resolved = await resolveRoomForMember();
      if (resolved.errorStatus) return jsonError(res, resolved.errorStatus, resolved.error);
      if (resolved.error) {
        return maybeTableError(res, resolved.error) || jsonError(res, 500, 'Falha ao ler sala.');
      }
      const room = resolved.room;
      if (room.phase !== 'voting') {
        return jsonError(res, 400, 'Só é possível revelar durante a votação.');
      }

      const { round, error: roundError } = await loadCurrentRound(room);
      if (roundError) {
        return maybeTableError(res, roundError) || jsonError(res, 500, 'Falha ao ler rodada.');
      }
      if (!round) return jsonError(res, 400, 'Nenhuma rodada ativa.');

      const requireAll = Boolean(asObject(room.settings).requireAllVotes);
      if (requireAll) {
        const eligible = await countEligibleVoters(room.id);
        if (eligible.error) {
          return maybeTableError(res, eligible.error) || jsonError(res, 500, 'Falha ao contar alunos.');
        }
        const votes = await countVotes(round.id);
        if (votes.error) {
          return maybeTableError(res, votes.error) || jsonError(res, 500, 'Falha ao contar votos.');
        }
        const need = Math.max(0, eligible.count);
        if (votes.votersCount < need) {
          return jsonError(res, 400, `Ainda faltam votos (${votes.votersCount}/${need}).`);
        }
      }

      const { error: roundUpdateError } = await supabase
        .from(ROUNDS_TBL)
        .update({
          phase: 'revealed',
          revealed_at: new Date().toISOString(),
        })
        .eq('id', round.id)
        .eq('phase', 'voting');
      if (roundUpdateError) {
        return maybeTableError(res, roundUpdateError) || jsonError(res, 500, 'Falha ao revelar rodada.');
      }

      const nextVersion = Number(room.state_version || 0) + 1;
      const { room: updated, error: roomError } = await bumpRoom(room.id, {
        phase: 'revealed',
        state_version: nextVersion,
      });
      if (roomError) {
        return maybeTableError(res, roomError) || jsonError(res, 500, 'Falha ao atualizar sala.');
      }

      const snap = await refreshSnapshotForRoom(updated);
      if (snap.error) {
        return maybeTableError(res, snap.error) || jsonError(res, 500, 'Falha ao publicar revelação.');
      }

      const { state, error: stateError } = await buildClientState(user, updated, {
        includeRoster: true,
      });
      if (stateError) {
        return maybeTableError(res, stateError) || jsonError(res, 500, 'Falha ao montar estado.');
      }

      return res.status(200).json({ ok: true, state, realtime: getRealtimeConfig(updated.id) });
    }

    if (action === 'nextRound') {
      const resolved = await resolveRoomForMember();
      if (resolved.errorStatus) return jsonError(res, resolved.errorStatus, resolved.error);
      if (resolved.error) {
        return maybeTableError(res, resolved.error) || jsonError(res, 500, 'Falha ao ler sala.');
      }
      const room = resolved.room;
      if (room.phase !== 'revealed' && room.phase !== 'lobby') {
        return jsonError(res, 400, 'Revele a rodada atual antes de avançar.');
      }

      const nextIndex = (Number(room.current_round_index) || 0) + 1;
      if (nextIndex >= deckLength()) {
        const nextVersion = Number(room.state_version || 0) + 1;
        const { room: updated, error: roomError } = await bumpRoom(room.id, {
          phase: 'results',
          current_round_index: nextIndex,
          state_version: nextVersion,
        });
        if (roomError) {
          return maybeTableError(res, roomError) || jsonError(res, 500, 'Falha ao encerrar o deck.');
        }
        const snap = await refreshSnapshotForRoom(updated, { deckFinished: true });
        if (snap.error) {
          return maybeTableError(res, snap.error) || jsonError(res, 500, 'Falha ao atualizar snapshot.');
        }
        const { state, error: stateError } = await buildClientState(user, updated, {
          includeRoster: true,
        });
        if (stateError) {
          return maybeTableError(res, stateError) || jsonError(res, 500, 'Falha ao montar estado.');
        }
        return res.status(200).json({
          ok: true,
          deckFinished: true,
          state,
          realtime: getRealtimeConfig(updated.id),
        });
      }

      const opened = await openRoundAtIndex(room, nextIndex);
      if (opened.errorStatus) return jsonError(res, opened.errorStatus, opened.error);
      if (opened.error) {
        return maybeTableError(res, opened.error) || jsonError(res, 500, 'Falha ao abrir próxima rodada.');
      }

      const { state, error: stateError } = await buildClientState(user, opened.room, {
        includeRoster: true,
      });
      if (stateError) {
        return maybeTableError(res, stateError) || jsonError(res, 500, 'Falha ao montar estado.');
      }

      return res.status(200).json({ ok: true, state, realtime: getRealtimeConfig(opened.room.id) });
    }

    if (action === 'showRanking') {
      const resolved = await resolveRoomForMember();
      if (resolved.errorStatus) return jsonError(res, resolved.errorStatus, resolved.error);
      if (resolved.error) {
        return maybeTableError(res, resolved.error) || jsonError(res, 500, 'Falha ao ler sala.');
      }
      const room = resolved.room;
      if (user.role !== 'admin' && user.id !== room.host_user_id) {
        return jsonError(res, 403, 'Apenas o Mestre controla a sala.');
      }
      if (room.phase !== 'results') {
        return jsonError(res, 400, 'O ranking só abre após o desempenho final.');
      }

      const nextVersion = Number(room.state_version || 0) + 1;
      const { room: updated, error: roomError } = await bumpRoom(room.id, {
        phase: 'ranking',
        state_version: nextVersion,
      });
      if (roomError) {
        return maybeTableError(res, roomError) || jsonError(res, 500, 'Falha ao abrir o ranking.');
      }
      const snap = await refreshSnapshotForRoom(updated, { deckFinished: true });
      if (snap.error) {
        return maybeTableError(res, snap.error) || jsonError(res, 500, 'Falha ao atualizar snapshot.');
      }
      const { state, error: stateError } = await buildClientState(user, updated, {
        includeRoster: true,
      });
      if (stateError) {
        return maybeTableError(res, stateError) || jsonError(res, 500, 'Falha ao montar estado.');
      }
      return res.status(200).json({
        ok: true,
        state,
        realtime: getRealtimeConfig(updated.id),
      });
    }

    if (action === 'closeRoom') {
      const resolved = await resolveRoomForMember();
      if (resolved.errorStatus) return jsonError(res, resolved.errorStatus, resolved.error);
      if (resolved.error) {
        return maybeTableError(res, resolved.error) || jsonError(res, 500, 'Falha ao ler sala.');
      }
      const nextVersion = Number(resolved.room.state_version || 0) + 1;
      const { room: updated, error: roomError } = await bumpRoom(resolved.room.id, {
        phase: 'closed',
        state_version: nextVersion,
      });
      if (roomError) {
        return maybeTableError(res, roomError) || jsonError(res, 500, 'Falha ao encerrar sala.');
      }
      const snap = await refreshSnapshotForRoom(updated);
      if (snap.error) {
        return maybeTableError(res, snap.error) || jsonError(res, 500, 'Falha ao atualizar snapshot.');
      }
      return res.status(200).json({
        ok: true,
        state: { phase: 'closed', roomId: updated.id, stateVersion: updated.state_version },
        realtime: getRealtimeConfig(updated.id),
      });
    }

    if (action === 'listRoomRoster') {
      const resolved = await resolveRoomForMember();
      if (resolved.errorStatus) return jsonError(res, resolved.errorStatus, resolved.error);
      if (resolved.error) {
        return maybeTableError(res, resolved.error) || jsonError(res, 500, 'Falha ao ler sala.');
      }
      const { round, error: roundError } = await loadCurrentRound(resolved.room);
      if (roundError) {
        return maybeTableError(res, roundError) || jsonError(res, 500, 'Falha ao ler rodada.');
      }
      const roster = await buildRoster(resolved.room, round);
      if (roster.error) {
        return maybeTableError(res, roster.error) || jsonError(res, 500, 'Falha ao listar participantes.');
      }
      return res.status(200).json({
        ok: true,
        roster: roster.roster,
        pendingVoters: roster.pendingVoters,
      });
    }

    return jsonError(res, 400, 'Ação desconhecida.');
  } catch (error) {
    console.error('[api/classind]', error);
    if (isMissingTable(error)) {
      return jsonError(res, 503, TABLE_MISSING);
    }
    return jsonError(res, 500, 'Erro interno do ClassInd-dle.');
  }
}
