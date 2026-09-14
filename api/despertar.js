/**
 * ============================================================
 * /api/despertar — estado autoritativo de O Despertar
 * ============================================================
 * Task 1: stub autenticado. Só `stateGet` cria/devolve a linha.
 * `stateSync` / `prestige` / `talentBuy` entram na Task 9.
 *
 * Identidade vem APENAS da sessão. `userId` no body é ignorado.
 * ============================================================
 */

import supabase from './supabaseClient.js';

const TABLE = 'despertar_states';
const ROW_SELECT = [
  'user_id',
  'souls',
  'obols',
  'mnemosyne',
  'lifetime_souls',
  'run_souls',
  'prestige_count',
  'generators_state',
  'upgrades_state',
  'talents_state',
  'edu_logs_seen',
  'milestones',
  'last_sync_at',
  'created_at',
  'updated_at',
].join(', ');

const STUB_ACTIONS = new Set(['stateSync', 'prestige', 'talentBuy']);
const STUB_FORBIDDEN = 'O Acheron ainda não aceita essa senda.';
const TABLE_MISSING = 'Tabela despertar_states ausente. Aplique db/migrate-2026-09-11-hades-despertar.sql.';

function decimalString(value, fallback = '0.00') {
  if (value == null || value === '') return fallback;
  const raw = String(value).trim();
  const match = raw.match(/^(-?\d+)(?:\.(\d+))?$/);
  if (!match) return fallback;
  const frac = (match[2] || '').padEnd(2, '0').slice(0, 2);
  return `${match[1]}.${frac}`;
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item));
}

function toStateDto(row) {
  const lastSyncAt = row?.last_sync_at
    ? new Date(row.last_sync_at).toISOString()
    : new Date().toISOString();

  return {
    souls: decimalString(row?.souls),
    obols: decimalString(row?.obols),
    mnemosyne: decimalString(row?.mnemosyne),
    lifetimeSouls: decimalString(row?.lifetime_souls),
    runSouls: decimalString(row?.run_souls),
    prestigeCount: Number.parseInt(row?.prestige_count, 10) || 0,
    generators: asObject(row?.generators_state),
    upgrades: asStringArray(row?.upgrades_state),
    talents: asStringArray(row?.talents_state),
    eduLogsSeen: asStringArray(row?.edu_logs_seen),
    milestones: asObject(row?.milestones),
    lastSyncAt,
    sps: '0.00',
    prestigePreview: {
      obolsGain: '0',
      mnemosyneGain: '0',
      unlocked: false,
    },
  };
}

function isMissingTable(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return code === '42P01'
    || code === 'PGRST205'
    || /despertar_states/i.test(message) && /does not exist|schema cache/i.test(message);
}

async function loadUserIdByToken(token) {
  if (!token || typeof token !== 'string') return null;
  const { data: session } = await supabase
    .from('sessions')
    .select('user_id')
    .eq('token', token)
    .limit(1)
    .maybeSingle();
  return session?.user_id ?? null;
}

async function getOrCreateState(userId) {
  const { data: existing, error: readError } = await supabase
    .from(TABLE)
    .select(ROW_SELECT)
    .eq('user_id', userId)
    .maybeSingle();

  if (readError) return { error: readError };
  if (existing) return { row: existing };

  const { data: created, error: insertError } = await supabase
    .from(TABLE)
    .insert({ user_id: userId })
    .select(ROW_SELECT)
    .single();

  if (insertError?.code === '23505') {
    const { data: raced, error: raceError } = await supabase
      .from(TABLE)
      .select(ROW_SELECT)
      .eq('user_id', userId)
      .single();
    if (raceError) return { error: raceError };
    return { row: raced };
  }

  if (insertError) return { error: insertError };
  return { row: created };
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ ok: false, error: 'Método não permitido.' });
    }

    if (!supabase) {
      return res.status(503).json({ ok: false, error: 'O Despertar está offline: Supabase não configurado.' });
    }

    const { action, token } = req.body || {};
    const userId = await loadUserIdByToken(token);
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Sessão inválida.' });
    }

    if (STUB_ACTIONS.has(action)) {
      return res.status(501).json({ ok: false, error: STUB_FORBIDDEN });
    }

    if (action !== 'stateGet') {
      return res.status(400).json({ ok: false, error: 'Ação desconhecida.' });
    }

    const { row, error } = await getOrCreateState(userId);
    if (error) {
      if (isMissingTable(error)) {
        return res.status(503).json({ ok: false, error: TABLE_MISSING });
      }
      console.error('[api/despertar] stateGet:', error);
      return res.status(500).json({ ok: false, error: 'Não foi possível ler a Estela de Memória.' });
    }

    return res.status(200).json({ ok: true, state: toStateDto(row) });
  } catch (error) {
    console.error('[api/despertar]', error);
    return res.status(500).json({ ok: false, error: 'Erro interno do Submundo.' });
  }
}
