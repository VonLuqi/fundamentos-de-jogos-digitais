/**
 * Véu da Aula — UI de pausa temporária (Task A2).
 * Copy congelada em docs/plano-despertar-producao-profundo.md Task 0A.
 * Inclui véu de temporada encerrada (top 3 por categoria) até o próximo patch.
 */

import {
  SEASON_CLOSED_CATEGORIES,
  SEASON_CLOSED_COPY,
} from '../config/season-closed.js';
import { formatSouls } from './NumberFormatter.js';

export const PAUSE_VEIL_COPY = Object.freeze({
  title: 'O Acheron guarda silêncio',
  reasonDefault: 'Aula em andamento',
  body: 'As almas aguardam. Tua Estela está intacta.',
  timerPrefix: 'Reabre em',
  reopenPrefix: 'Liberação prevista:',
  expired: 'O véu se abre…',
  ctaExpired: 'Retomar o trono',
});

export const SEALED_VEIL_COPY = Object.freeze({
  title: 'O Acheron ainda está selado',
  body: 'O Mestre ainda não abriu O Despertar para a turma. Volte à Trilha e aguarde a liberação.',
  cta: 'Voltar à Trilha',
});

/**
 * Offset local − server: localNow + offset ≈ serverNow (ms).
 * Countdown deve usar pause_until − (Date.now() + offset).
 * @param {string|number|Date|null|undefined} serverNow
 * @param {number} [localNow]
 * @returns {number}
 */
export function computeServerOffsetMs(serverNow, localNow = Date.now()) {
  const serverMs = typeof serverNow === 'number'
    ? serverNow
    : Date.parse(String(serverNow || ''));
  if (!Number.isFinite(serverMs)) return 0;
  return serverMs - localNow;
}

/**
 * @param {string|null|undefined} pauseUntil
 * @param {number} serverOffsetMs
 * @param {number} [localNow]
 * @returns {number} ms restantes (≥ 0)
 */
export function remainingPauseMs(pauseUntil, serverOffsetMs = 0, localNow = Date.now()) {
  const until = Date.parse(String(pauseUntil || ''));
  if (!Number.isFinite(until)) return 0;
  const serverApprox = localNow + (Number(serverOffsetMs) || 0);
  return Math.max(0, until - serverApprox);
}

/**
 * @param {number} ms
 * @returns {string} mm:ss ou h:mm:ss
 */
export function formatCountdown(ms) {
  const total = Math.max(0, Math.ceil(Number(ms) / 1000) || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  if (hours > 0) return `${hours}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

/**
 * @param {string|null|undefined} pauseUntil
 * @param {string} [locale]
 * @returns {string}
 */
export function formatLocalReopen(pauseUntil, locale = 'pt-BR') {
  const until = Date.parse(String(pauseUntil || ''));
  if (!Number.isFinite(until)) return '';
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(until));
  } catch {
    const d = new Date(until);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
}

/**
 * @param {{ reason?: string|null, pauseUntil?: string|null }} pause
 * @param {{ serverOffsetMs?: number, reducedMotion?: boolean, aulasHref?: string }} [opts]
 */
export function buildPauseVeilModel(pause = {}, opts = {}) {
  const reason = String(pause.reason || '').trim() || PAUSE_VEIL_COPY.reasonDefault;
  const localNow = Number.isFinite(opts.localNow) ? opts.localNow : Date.now();
  const remaining = remainingPauseMs(pause.pauseUntil, opts.serverOffsetMs ?? 0, localNow);
  const reopen = formatLocalReopen(pause.pauseUntil);
  return {
    title: PAUSE_VEIL_COPY.title,
    reason,
    body: PAUSE_VEIL_COPY.body,
    timerLabel: `${PAUSE_VEIL_COPY.timerPrefix} ${formatCountdown(remaining)}`,
    reopenLabel: reopen ? `${PAUSE_VEIL_COPY.reopenPrefix} ${reopen}` : '',
    remainingMs: remaining,
    expired: remaining <= 0,
    reducedMotion: Boolean(opts.reducedMotion),
  };
}

/**
 * Monta o véu de pausa no container (substitui conteúdo).
 * Resolve quando a pausa expira e fetchPause confirma !active (ou CTA manual).
 *
 * @param {ParentNode & { innerHTML?: string }} container
 * @param {{
 *   pause: { active?: boolean, pauseUntil?: string, reason?: string, pauseStartedAt?: string|null },
 *   serverNow?: string,
 *   fetchPause?: () => Promise<{ pause?: object|null, serverNow?: string }>,
 *   reducedMotion?: boolean,
 *   setIntervalFn?: typeof setInterval,
 *   clearIntervalFn?: typeof clearInterval,
 *   locationReload?: () => void,
 * }} options
 * @returns {Promise<'resumed'|'aborted'>}
 */
export function presentClassroomPauseVeil(container, options = {}) {
  if (!container) return Promise.resolve('aborted');

  const reducedMotion = options.reducedMotion
    ?? (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

  let serverOffsetMs = computeServerOffsetMs(options.serverNow);
  let pause = options.pause && typeof options.pause === 'object' ? { ...options.pause } : null;
  if (!pause?.pauseUntil) return Promise.resolve('aborted');

  const setIntervalFn = options.setIntervalFn || globalThis.setInterval.bind(globalThis);
  const clearIntervalFn = options.clearIntervalFn || globalThis.clearInterval.bind(globalThis);

  return new Promise((resolve) => {
    let timerId = null;
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (timerId != null) clearIntervalFn(timerId);
      resolve(result);
    };

    const paint = () => {
      const model = buildPauseVeilModel(pause, { serverOffsetMs, reducedMotion });
      const pulseClass = reducedMotion ? '' : ' despertar-classroom-veil--pulse';
      container.innerHTML = `
        <article class="despertar-classroom-veil hades-frame${pulseClass}" role="status" aria-live="polite" data-despertar-pause-veil>
          <p class="despertar-classroom-veil__eyebrow">Véu da Aula</p>
          <h2 class="despertar-classroom-veil__title app-shell__title">${escapeHtml(model.title)}</h2>
          <p class="despertar-classroom-veil__reason">${escapeHtml(model.reason)}</p>
          <p class="despertar-classroom-veil__body">${escapeHtml(model.body)}</p>
          <p class="despertar-classroom-veil__timer despertar-num" data-pause-timer>${escapeHtml(model.timerLabel)}</p>
          ${model.reopenLabel
            ? `<p class="despertar-classroom-veil__reopen" data-pause-reopen>${escapeHtml(model.reopenLabel)}</p>`
            : ''}
          <p class="despertar-classroom-veil__expired" data-pause-expired hidden>${escapeHtml(PAUSE_VEIL_COPY.expired)}</p>
          <p class="despertar-classroom-veil__actions" data-pause-actions hidden>
            <button type="button" class="btn-gold" data-pause-resume>${escapeHtml(PAUSE_VEIL_COPY.ctaExpired)}</button>
          </p>
        </article>
      `;

      const resumeBtn = container.querySelector('[data-pause-resume]');
      resumeBtn?.addEventListener('click', () => {
        finish('resumed');
      });
    };

    const tick = async () => {
      const left = remainingPauseMs(pause.pauseUntil, serverOffsetMs);
      const timerNode = container.querySelector('[data-pause-timer]');
      if (timerNode) {
        timerNode.textContent = `${PAUSE_VEIL_COPY.timerPrefix} ${formatCountdown(left)}`;
      }

      if (left > 0) return;

      const expiredNode = container.querySelector('[data-pause-expired]');
      const actionsNode = container.querySelector('[data-pause-actions]');
      if (expiredNode) expiredNode.hidden = false;
      if (timerNode) timerNode.hidden = true;

      if (typeof options.fetchPause === 'function') {
        try {
          const remote = await options.fetchPause();
          if (remote?.serverNow) {
            serverOffsetMs = computeServerOffsetMs(remote.serverNow);
          }
          if (!remote?.pause?.active) {
            finish('resumed');
            return;
          }
          pause = { ...pause, ...remote.pause };
          // ainda ativo (clock skew) — mostra CTA
        } catch {
          // mantém CTA
        }
      }

      if (actionsNode) actionsNode.hidden = false;
    };

    paint();
    void tick();
    timerId = setIntervalFn(() => {
      void tick();
    }, 250);
  });
}

/**
 * @param {ParentNode & { innerHTML?: string }} container
 * @param {{ aulasHref: string }} opts
 */
export function presentSealedVeil(container, opts = {}) {
  if (!container) return;
  const href = String(opts.aulasHref || '#');
  container.innerHTML = `
    <article class="despertar-classroom-veil hades-frame" data-despertar-sealed-veil>
      <h2 class="despertar-classroom-veil__title app-shell__title">${escapeHtml(SEALED_VEIL_COPY.title)}</h2>
      <p class="despertar-classroom-veil__body">${escapeHtml(SEALED_VEIL_COPY.body)}</p>
      <p class="despertar-classroom-veil__actions">
        <a class="btn-gold" href="${escapeAttr(href)}">${escapeHtml(SEALED_VEIL_COPY.cta)}</a>
      </p>
    </article>
  `;
}

function formatSeasonMetric(entry, category) {
  const raw = entry?.[category.metricKey];
  if (category.format === 'souls') {
    return formatSouls(raw == null || raw === '' ? '0' : String(raw));
  }
  const n = Number(raw) || 0;
  try {
    return n.toLocaleString('pt-BR');
  } catch {
    return String(n);
  }
}

function renderSeasonBoardRows(entries, category) {
  if (!entries?.length) {
    return `<li class="despertar-season-board__empty">${escapeHtml(SEASON_CLOSED_COPY.empty)}</li>`;
  }
  return entries.slice(0, 3).map((row, index) => {
    const rank = Number(row.rank) || index + 1;
    const name = row.fullName || row.username || '—';
    const metric = formatSeasonMetric(row, category);
    return `
      <li class="despertar-season-board__row is-podium-${rank}">
        <span class="despertar-season-board__rank">#${rank}</span>
        <span class="despertar-season-board__name" title="${escapeAttr(row.username ? `@${row.username}` : name)}">${escapeHtml(name)}</span>
        <span class="despertar-season-board__metric despertar-num">${escapeHtml(metric)}</span>
      </li>
    `;
  }).join('');
}

/**
 * Temporada encerrada: jogo fechado + top 3 por categoria do placar.
 *
 * @param {ParentNode & { innerHTML?: string }} container
 * @param {{
 *   aulasHref?: string,
 *   rankingHref?: string,
 *   token?: string|null,
 *   leaderboardGet?: (token: string, opts: object) => Promise<object>,
 *   scope?: 'turma'|'global',
 * }} [opts]
 */
export async function presentSeasonClosedVeil(container, opts = {}) {
  if (!container) return;
  const aulasHref = String(opts.aulasHref || '#');
  const rankingHref = String(opts.rankingHref || '#');
  const scope = opts.scope === 'turma' ? 'turma' : 'global';

  const boardSlots = SEASON_CLOSED_CATEGORIES.map((category) => `
    <section class="despertar-season-board" data-season-board="${escapeAttr(category.sort)}">
      <h3 class="despertar-season-board__title">${escapeHtml(category.label)}</h3>
      <ol class="despertar-season-board__list" data-season-list>
        <li class="despertar-season-board__empty">${escapeHtml(SEASON_CLOSED_COPY.loading)}</li>
      </ol>
    </section>
  `).join('');

  container.innerHTML = `
    <article class="despertar-classroom-veil despertar-classroom-veil--season hades-frame" data-despertar-season-closed-veil>
      <p class="despertar-classroom-veil__eyebrow">${escapeHtml(SEASON_CLOSED_COPY.eyebrow)}</p>
      <h2 class="despertar-classroom-veil__title app-shell__title">${escapeHtml(SEASON_CLOSED_COPY.title)}</h2>
      <p class="despertar-classroom-veil__body">${escapeHtml(SEASON_CLOSED_COPY.body)}</p>
      <p class="despertar-season-prize" data-season-prize>${escapeHtml(SEASON_CLOSED_COPY.prizeNote)}</p>
      <p class="despertar-classroom-veil__eyebrow despertar-season-boards__eyebrow">${escapeHtml(SEASON_CLOSED_COPY.boardsEyebrow)}</p>
      <div class="despertar-season-boards" data-season-boards>
        ${boardSlots}
      </div>
      <p class="despertar-season-tablet" data-season-tablet>${escapeHtml(SEASON_CLOSED_COPY.tabletNote)}</p>
      <p class="despertar-classroom-veil__actions despertar-season-closed__actions">
        <a class="btn-gold" href="${escapeAttr(aulasHref)}">${escapeHtml(SEASON_CLOSED_COPY.ctaAulas)}</a>
        <a class="despertar-ghost" href="${escapeAttr(rankingHref)}">${escapeHtml(SEASON_CLOSED_COPY.ctaRanking)}</a>
      </p>
    </article>
  `;

  const token = opts.token;
  const fetchBoard = typeof opts.leaderboardGet === 'function' ? opts.leaderboardGet : null;
  if (!token || !fetchBoard) {
    container.querySelectorAll('[data-season-list]').forEach((list) => {
      list.innerHTML = `<li class="despertar-season-board__empty">${escapeHtml(SEASON_CLOSED_COPY.error)}</li>`;
    });
    return;
  }

  await Promise.all(SEASON_CLOSED_CATEGORIES.map(async (category) => {
    const section = container.querySelector(`[data-season-board="${category.sort}"]`);
    const list = section?.querySelector('[data-season-list]');
    if (!list) return;
    try {
      const result = await fetchBoard(token, { scope, sort: category.sort, limit: 3 });
      const entries = Array.isArray(result?.entries) ? result.entries : [];
      list.innerHTML = renderSeasonBoardRows(entries, category);
    } catch {
      list.innerHTML = `<li class="despertar-season-board__empty">${escapeHtml(SEASON_CLOSED_COPY.error)}</li>`;
    }
  }));
}

/**
 * datetime-local (valor do input, horário do browser) → ISO UTC.
 * @param {string} localValue
 * @returns {string|null}
 */
export function localDatetimeToIsoUtc(localValue) {
  const raw = String(localValue || '').trim();
  if (!raw) return null;
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, '&#39;');
}
