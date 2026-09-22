/**
 * Cron — warmup de isolates (Fase C / Task C7).
 * Rota: GET|POST /api/cron/warmup
 *
 * Auth: Authorization: Bearer $CRON_SECRET (ou x-cron-secret)
 * Sem secrets em querystring. Não executa hash de senha (só GET auth/progress/bootstrap 401).
 *
 * Schedule: vercel.json → 45 11 * * 1-5 (08:45 BRT / 11:45 UTC, dias úteis)
 * Janela recomendada: 15–30 min antes da abertura da turma; ajustar o cron se a aula mudar.
 *
 * @see docs/otimizacoes/03-tasks-fase-c-escala-obs.md
 */

import supabase from '../supabaseClient.js';
import { authorizeCron } from '../_lib/cron-auth.js';
import {
  createRequestMetrics,
  finishRequestMetrics,
  metricsBumpDb,
  metricsSetAction,
  metricsSetStatus,
  runWithMetrics,
} from '../_lib/request-metrics.js';

const WARM_PATHS = [
  { name: 'auth_get', path: '/api/auth' },
  { name: 'progress_get', path: '/api/progress?token=warmup-invalid' },
  { name: 'session_bootstrap', path: '/api/session-bootstrap?token=warmup-invalid' },
];

function resolveBaseUrl(req) {
  const fromEnv = String(process.env.APP_BASE_URL || '').replace(/\/+$/, '');
  if (fromEnv) return fromEnv;
  const vercel = String(process.env.VERCEL_URL || '').replace(/\/+$/, '');
  if (vercel) return vercel.startsWith('http') ? vercel : `https://${vercel}`;
  const host = String(req?.headers?.host || '').trim();
  if (host) {
    const proto = String(req?.headers?.['x-forwarded-proto'] || 'https').split(',')[0].trim();
    return `${proto}://${host}`.replace(/\/+$/, '');
  }
  return '';
}

/**
 * @param {string} baseUrl
 * @param {{ name: string, path: string }} target
 */
async function pingRoute(baseUrl, target) {
  const started = Date.now();
  try {
    const res = await fetch(`${baseUrl}${target.path}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-store',
      },
      redirect: 'manual',
    });
    return {
      name: target.name,
      ok: true,
      status: res.status,
      duration_ms: Date.now() - started,
    };
  } catch (error) {
    return {
      name: target.name,
      ok: false,
      status: 0,
      duration_ms: Date.now() - started,
      error: String(error?.message || error),
    };
  }
}

export default async function handler(req, res) {
  const metrics = createRequestMetrics({ route: 'cron', action: 'warmup' });
  const origStatus = res.status.bind(res);
  res.status = (code) => {
    metricsSetStatus(code);
    return origStatus(code);
  };

  try {
    return await runWithMetrics(metrics, () => handleWarmup(req, res));
  } finally {
    finishRequestMetrics(metrics, { status: metrics.status });
  }
}

async function handleWarmup(req, res) {
  try {
    const method = String(req?.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'POST') {
      res.setHeader?.('Allow', 'GET, POST');
      return res.status(405).json({ ok: false, error: 'Método não permitido.' });
    }

    metricsSetAction('warmup');
    const authz = authorizeCron(req);
    if (!authz.ok) {
      return res.status(authz.status).json({ ok: false, error: authz.error });
    }

    const baseUrl = resolveBaseUrl(req);
    if (!baseUrl) {
      return res.status(503).json({
        ok: false,
        error: 'APP_BASE_URL (ou VERCEL_URL) ausente — não dá para pingar as rotas.',
      });
    }

    // Ping leve no PostgREST deste isolate (sem scrypt).
    let dbMs = null;
    if (supabase) {
      const t0 = Date.now();
      const { error } = await supabase.from('users').select('id').limit(1);
      metricsBumpDb(1);
      dbMs = Date.now() - t0;
      if (error && !/permission|JWT|schema/i.test(String(error.message || ''))) {
        console.warn('[cron/warmup] db ping', error.message || error);
      }
    }

    const pings = [];
    for (const target of WARM_PATHS) {
      // Sequencial: evita burst desnecessário no próprio projeto.
      // eslint-disable-next-line no-await-in-loop
      pings.push(await pingRoute(baseUrl, target));
    }

    const summary = {
      ok: true,
      baseUrl,
      db_ping_ms: dbMs,
      pings,
      note: 'Warmup sem hash de senha (GET 401 esperado). Não substitui A4. Janela: 15–30 min pré-aula.',
    };

    console.log(
      `[cron/warmup] base=${baseUrl} db_ms=${dbMs ?? 'n/a'} `
      + pings.map((p) => `${p.name}=${p.status}/${p.duration_ms}ms`).join(' '),
    );

    return res.status(200).json(summary);
  } catch (error) {
    console.error('[cron/warmup]', error);
    return res.status(500).json({ ok: false, error: 'Erro interno no warmup.' });
  }
}
