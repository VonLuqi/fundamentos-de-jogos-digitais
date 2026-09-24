/**
 * GET /api/session-bootstrap?token=
 * Sessão + perfil sanitize + gate Despertar + gate Prova (Task C1) em um request.
 *
 * @see docs/otimizacoes/contratos-fase-b.md §1
 * @see docs/plano-prova-modulo1-online.md Task C1
 */

import supabase from './supabaseClient.js';
import {
  getLastDespertarGateCacheStatus,
  isDespertarPublished,
} from './_lib/despertar-gate.js';
import { loadProvaGateForUser } from './_lib/prova/active-attempt.js';
import { sanitizeUser } from './_lib/sanitize-user.js';
import { loadValidSession } from './_lib/sessions.js';
import {
  createRequestMetrics,
  finishRequestMetrics,
  metricsBumpDb,
  metricsSetAction,
  metricsSetGateCache,
  metricsSetStatus,
  runWithMetrics,
} from './_lib/request-metrics.js';

const USERS_TABLE = 'users';

export default async function handler(req, res) {
  const metrics = createRequestMetrics({
    route: 'session-bootstrap',
    action: 'bootstrap',
  });

  const origStatus = res.status.bind(res);
  res.status = (code) => {
    metricsSetStatus(code);
    return origStatus(code);
  };

  try {
    return await runWithMetrics(metrics, () => handleBootstrap(req, res));
  } finally {
    finishRequestMetrics(metrics, { status: metrics.status });
  }
}

async function handleBootstrap(req, res) {
  try {
    if (!supabase) {
      return res.status(503).json({
        ok: false,
        error: 'Autenticação offline: Supabase não configurado.',
      });
    }

    const method = String(req?.method || 'GET').toUpperCase();
    if (method !== 'GET') {
      res.setHeader?.('Allow', 'GET');
      return res.status(405).json({ ok: false, error: 'Método não permitido.' });
    }

    metricsSetAction('bootstrap');
    const token = req.query?.token;
    if (!token) {
      return res.status(400).json({ ok: false, error: 'Token ausente.' });
    }

    const session = await loadValidSession(supabase, token);
    if (!session?.user_id) {
      return res.status(401).json({ ok: false, error: 'Sessão inválida.' });
    }

    const { data: user, error: userError } = await supabase
      .from(USERS_TABLE)
      .select('*')
      .eq('id', session.user_id)
      .limit(1)
      .maybeSingle();
    metricsBumpDb(1);

    if (userError || !user) {
      return res.status(401).json({ ok: false, error: 'Sessão inválida.' });
    }

    const published = await isDespertarPublished(supabase);
    metricsSetGateCache(getLastDespertarGateCacheStatus());

    // Task C1: tentativa de prova em andamento (barato; não finaliza timed_out aqui)
    let provaGate = { inProgress: false };
    if (user.role !== 'admin') {
      provaGate = await loadProvaGateForUser(supabase, user.id);
      metricsBumpDb(1);
    }

    return res.status(200).json({
      ok: true,
      user: sanitizeUser(user),
      gates: {
        despertar: {
          published: Boolean(published),
        },
        prova: {
          inProgress: Boolean(provaGate.inProgress),
          attemptId: provaGate.attemptId || null,
          examId: provaGate.examId || null,
          endsAt: provaGate.endsAt || null,
          remainingMs: provaGate.remainingMs ?? null,
          currentQuestionIndex: provaGate.currentQuestionIndex ?? null,
        },
      },
    });
  } catch (error) {
    console.error('[api/session-bootstrap]', error);
    return res.status(500).json({ ok: false, error: 'Erro interno no bootstrap.' });
  }
}
