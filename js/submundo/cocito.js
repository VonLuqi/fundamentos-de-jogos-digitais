'use strict';

function resolveSubmundoRoot() {
  const p = String(window.location?.pathname || '');
  for (const marker of ['/pages/submundo/', '/pages/', '/submundo/']) {
    const idx = p.indexOf(marker);
    if (idx >= 0) return p.slice(0, idx);
  }
  return '';
}

function resolveSubmundoPath(nextPath) {
  const root = resolveSubmundoRoot();
  return `${root}${String(nextPath || '').replace(/\/+$/, '')}/`;
}

async function postUnderworldStep(payload) {
  const root = resolveSubmundoRoot();
  const res = await fetch(`${root}/api/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'underworldStep', ...payload }),
  });
  return res.json();
}

const canvas = document.getElementById('cocito-mirror');
const form = document.getElementById('cocito-form');
const statusEl = document.getElementById('cocito-status');

function paintWaterBase(ctx, w, h) {
  ctx.fillStyle = '#05070c';
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 16; i += 1) {
    ctx.strokeStyle = `rgba(18, 28, 38, ${0.35 + (i % 4) * 0.08})`;
    ctx.beginPath();
    ctx.moveTo(0, 16 + i * 13);
    for (let x = 0; x <= w; x += 10) {
      ctx.lineTo(x, 16 + i * 13 + Math.sin(x * 0.045 + i * 0.4) * 5);
    }
    ctx.stroke();
  }

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 4 + (i % 3);
    d[i + 1] = 6;
    d[i + 2] = 10;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

function applySubmergedSpans(ctx, w, h, spans) {
  if (!Array.isArray(spans) || !spans.length) return;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  for (const span of spans) {
    if (!Array.isArray(span) || span.length < 4) continue;
    const x0 = Math.max(0, Number(span[0]) | 0);
    const y0 = Math.max(0, Number(span[1]) | 0);
    const sw = Math.max(0, Number(span[2]) | 0);
    const sh = Math.max(0, Number(span[3]) | 0);
    const xEnd = Math.min(w, x0 + sw);
    const yEnd = Math.min(h, y0 + sh);

    for (let y = y0; y < yEnd; y += 1) {
      for (let x = x0; x < xEnd; x += 1) {
        const idx = (y * w + x) * 4;
        // Negativo submerso do ouro (#e8d5a3 -> 23, 42, 92) com alfa 0:
        // só emerge quando o detetive inverte RGB (255 - c) e força alfa 255 no Console.
        d[idx] = 23;
        d[idx + 1] = 42;
        d[idx + 2] = 92;
        d[idx + 3] = 0;
      }
    }
  }

  ctx.putImageData(img, 0, 0);
}

async function paintMirror() {
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  paintWaterBase(ctx, w, h);

  try {
    const payload = await postUnderworldStep({ stage: 'cocito_mirror' });
    if (payload?.ok && Array.isArray(payload.spans)) {
      applySubmergedSpans(ctx, w, h, payload.spans);
    }
  } catch {
    /* Mantém a superfície negra caso o espelho esteja inacessível */
  }
}

void paintMirror();

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const value = String(document.getElementById('cocito-pass')?.value || '').trim();
  if (!value) {
    if (statusEl) {
      statusEl.dataset.tone = 'error';
      statusEl.textContent = 'O lamento ainda é negro.';
    }
    return;
  }

  try {
    const result = await postUnderworldStep({ stage: 'cocito', pass: value });
    if (!result?.ok || !result?.nextPath) {
      if (statusEl) {
        statusEl.dataset.tone = 'error';
        statusEl.textContent = result?.message || 'O lamento ainda é negro.';
      }
      return;
    }
    if (statusEl) {
      statusEl.dataset.tone = 'ok';
      statusEl.textContent = result.message || 'A runa emerge. O Estige chama…';
    }
    window.location.assign(resolveSubmundoPath(result.nextPath));
  } catch {
    if (statusEl) {
      statusEl.dataset.tone = 'error';
      statusEl.textContent = 'O lamento ainda é negro.';
    }
  }
});
