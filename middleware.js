/**
 * Vercel Routing Middleware — Fase C / Task C1.
 * Teto por IP em /api/auth, /api/despertar, /api/progress (antes do isolate Node).
 * Cron (/api/cron/*) fica fora do matcher.
 *
 * @see docs/otimizacoes/03-tasks-fase-c-escala-obs.md
 */

import { next } from '@vercel/functions';
import {
  buildEdge429Response,
  clientIpFromRequest,
  consumeEdgeIpRateLimit,
  matchEdgePathGroup,
} from './api/_lib/edge-rate-limit.js';

export const config = {
  matcher: [
    '/api/auth',
    '/api/auth/:path*',
    '/api/despertar',
    '/api/despertar/:path*',
    '/api/progress',
    '/api/progress/:path*',
  ],
};

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export default async function middleware(request) {
  const pathname = new URL(request.url).pathname;

  // Cinto de segurança: cron nunca no matcher, mas não aplicar budget de aluno.
  if (pathname.startsWith('/api/cron')) {
    return next();
  }

  const group = matchEdgePathGroup(pathname);
  if (!group) {
    return next();
  }

  const ip = clientIpFromRequest(request);
  const result = await consumeEdgeIpRateLimit(group, ip);

  if (result.limited) {
    return buildEdge429Response(result);
  }

  if (result.degraded) {
    return next({
      headers: {
        'x-edge-rate-degraded': '1',
      },
    });
  }

  return next();
}
