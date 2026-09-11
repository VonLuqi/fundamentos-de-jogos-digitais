'use strict';

const NEXT = '/submundo/estige-obolo';
const EXPECTED = 'COCYTUS_REFLECTION_404';

const canvas = document.getElementById('cocito-mirror');
const form = document.getElementById('cocito-form');
const statusEl = document.getElementById('cocito-status');

function paintMirror() {
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  // Versão "verdadeira" (clara) — depois invertida no buffer para ficar ilegível.
  ctx.fillStyle = '#0a0e14';
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 16; i += 1) {
    ctx.strokeStyle = `rgba(40, 70, 90, ${0.12 + (i % 4) * 0.03})`;
    ctx.beginPath();
    ctx.moveTo(0, 16 + i * 13);
    for (let x = 0; x <= w; x += 10) {
      ctx.lineTo(x, 16 + i * 13 + Math.sin(x * 0.045 + i * 0.4) * 5);
    }
    ctx.stroke();
  }

  ctx.font = '600 26px Cinzel, Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e8d5a3';
  ctx.fillText(EXPECTED, w / 2, h / 2);

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 255 - d[i];
    d[i + 1] = 255 - d[i + 1];
    d[i + 2] = 255 - d[i + 2];
    // Alfa mascarado: o espelho parece opaco/negro até forçar opacidade ou invert+contrast
    d[i + 3] = Math.min(d[i + 3], 36);
  }
  ctx.putImageData(img, 0, 0);
}

paintMirror();

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = String(document.getElementById('cocito-pass')?.value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
  if (value !== EXPECTED) {
    if (statusEl) {
      statusEl.dataset.tone = 'error';
      statusEl.textContent = 'O lamento ainda é negro.';
    }
    return;
  }
  if (statusEl) {
    statusEl.dataset.tone = 'ok';
    statusEl.textContent = 'A runa emerge. O Estige chama…';
  }
  window.location.assign(NEXT);
});
