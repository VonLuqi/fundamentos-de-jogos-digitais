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

const form = document.getElementById('observatorio-form');
const statusEl = document.getElementById('observatorio-status');
const input = document.getElementById('observatorio-coords');
const mapEl = document.getElementById('observatorio-map');

let marker = null;

function parseCoords(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  const normalized = text.replace(/;/g, ',').replace(/\s+/g, ' ');
  const match = normalized.match(/(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return { kind: 'token', pass: text };
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { kind: 'token', pass: text };
  return { kind: 'coords', lat, lng, pass: text };
}

function succeed(result) {
  if (statusEl) {
    statusEl.dataset.tone = 'ok';
    statusEl.textContent = result?.message || 'Hélio aponta o portal. O espelho aguarda…';
  }
  if (result?.nextPath) {
    window.location.assign(resolveSubmundoPath(result.nextPath));
  }
}

function fail(message) {
  if (statusEl) {
    statusEl.dataset.tone = 'error';
    statusEl.textContent = message || 'Hélio ainda não aponta o portal.';
  }
}

function placeMarker(lat, lng) {
  if (!marker) return;
  marker.setLatLng([lat, lng]);
  if (input) input.value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

async function checkObservatorioPayload(payload) {
  try {
    const result = await postUnderworldStep({ stage: 'observatorio', ...payload });
    if (result?.ok && result?.nextPath) {
      succeed(result);
    } else {
      fail(result?.message);
    }
  } catch {
    fail();
  }
}

if (mapEl && typeof window.L !== 'undefined') {
  const map = window.L.map(mapEl, {
    center: [37.0, 22.0],
    zoom: 7,
    minZoom: 5,
    maxZoom: 12,
    worldCopyJump: false,
  });

  window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 12,
  }).addTo(map);

  marker = window.L.circleMarker([37.0, 22.0], {
    radius: 7,
    color: '#cfa759',
    weight: 2,
    fillColor: '#c23548',
    fillOpacity: 0.85,
  }).addTo(map);

  map.on('click', (event) => {
    const { lat, lng } = event.latlng;
    placeMarker(lat, lng);
    void checkObservatorioPayload({ lat, lng, pass: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
  });
}

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const parsed = parseCoords(input?.value);
  if (!parsed) {
    fail();
    return;
  }
  if (parsed.kind === 'coords') {
    placeMarker(parsed.lat, parsed.lng);
    void checkObservatorioPayload({ lat: parsed.lat, lng: parsed.lng, pass: parsed.pass });
    return;
  }
  void checkObservatorioPayload({ pass: parsed.pass });
});
