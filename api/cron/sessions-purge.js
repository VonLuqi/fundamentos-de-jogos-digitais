/**
 * Cron — purge de sessions expiradas (Fase A / Task A5).
 * Rota: GET|POST /api/cron/sessions-purge
 *
 * Auth: Authorization: Bearer $CRON_SECRET
 *   (Vercel Cron injeta isso automaticamente quando CRON_SECRET está nas env vars)
 * Alternativa local: header x-cron-secret: $CRON_SECRET
 *
 * Schedule: vercel.json → 0 5 * * * (05:00 UTC diário)
 *
 * @see docs/otimizacoes/01-tasks-fase-a-contencao.md
 */

import supabase from '../supabaseClient.js';
import { authorizeCron } from '../_lib/cron-auth.js';
import { purgeExpiredSessions } from '../_lib/sessions.js';

export default async function handler(req, res) {
  try {
    const method = String(req?.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'POST') {
      res.setHeader?.('Allow', 'GET, POST');
      return res.status(405).json({ ok: false, error: 'Método não permitido.' });
    }

    const authz = authorizeCron(req);
    if (!authz.ok) {
      return res.status(authz.status).json({ ok: false, error: authz.error });
    }

    if (!supabase) {
      return res.status(503).json({ ok: false, error: 'Supabase não configurado.' });
    }

    const result = await purgeExpiredSessions(supabase);
    if (!result.ok) {
      console.error('[cron/sessions-purge] falha', result.error);
      return res.status(500).json({
        ok: false,
        error: 'Falha ao purgar sessões.',
        deleted: result.deleted,
      });
    }

    console.log(`[cron/sessions-purge] deleted=${result.deleted}`);
    return res.status(200).json({
      ok: true,
      deleted: result.deleted,
    });
  } catch (error) {
    console.error('[cron/sessions-purge]', error);
    return res.status(500).json({ ok: false, error: 'Erro interno no purge.' });
  }
}
