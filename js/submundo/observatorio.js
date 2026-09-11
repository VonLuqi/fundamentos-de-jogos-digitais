'use strict';

const NEXT = '/submundo/cocito-espelho';
const GATE_TOKEN = 'CAPE_MATAPAN_GATE';
const TOLERANCE = 0.02;

const form = document.getElementById('observatorio-form');
const statusEl = document.getElementById('observatorio-status');
const input = document.getElementById('observatorio-coords');
const mapEl = document.getElementById('observatorio-map');

let marker = null;

function targetPoint() {
  // Evita literais óbvios no HTML; ainda auditável no JS (Notpron).
  return {
    lat: Number(atob('MzYuNDAwNQ==')),
    lng: Number(atob('MjIuNDg1OA==')),
  };
}

function coordsMatch(lat, lng) {
  const t = targetPoint();
  return Math.abs(lat - t.lat) <= TOLERANCE && Math.abs(lng - t.lng) <= TOLERANCE;
}

function parseCoords(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  const normalized = text.replace(/;/g, ',').replace(/\s+/g, ' ');
  const token = normalized.toUpperCase().replace(/\s+/g, '_');
  if (token === GATE_TOKEN) return { kind: 'token' };

  const match = normalized.match(/(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { kind: 'coords', lat, lng };
}

function succeed() {
  if (statusEl) {
    statusEl.dataset.tone = 'ok';
    statusEl.textContent = 'Hélio aponta o portal. O espelho aguarda…';
  }
  window.location.assign(NEXT);
}

function fail() {
  if (statusEl) {
    statusEl.dataset.tone = 'error';
    statusEl.textContent = 'Hélio ainda não aponta o portal.';
  }
}

function placeMarker(lat, lng) {
  if (!marker) return;
  marker.setLatLng([lat, lng]);
  if (input) input.value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
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
    if (coordsMatch(lat, lng)) {
      succeed();
    } else {
      fail();
    }
  });
}

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const parsed = parseCoords(input?.value);
  if (!parsed) {
    fail();
    return;
  }
  if (parsed.kind === 'token') {
    succeed();
    return;
  }
  placeMarker(parsed.lat, parsed.lng);
  if (coordsMatch(parsed.lat, parsed.lng)) {
    succeed();
  } else {
    fail();
  }
});
