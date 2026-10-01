#!/usr/bin/env node
/**
 * Sincroniza faixas ClassInd (DEJUS) do pool do Juízo.
 *
 * Ordem de fontes:
 *   1. Steam `ratings.dejus` (API appdetails, cc=br)
 *   2. Steam PEGI / ESRB mapeados (se dejus ausente)
 *   3. Wikipedia PT (texto ClassInd / "não recomendado para menores")
 *   4. Rating já no stub (fallback pedagógico)
 *
 * Uso:
 *   node scripts/sync-juizo-classind.mjs --dry-run
 *   node scripts/sync-juizo-classind.mjs --apply
 *   node scripts/sync-juizo-classind.mjs --apply --limit 40
 *   node scripts/sync-juizo-classind.mjs --apply --only hollow-knight,terraria
 *
 * Atualiza data/despertar-juizo-pool.stub.json (rating + descriptors + ratingSource).
 * Inclui faixa 6 (Portaria MJSP 1.048/2025).
 */

import path from 'node:path';
import { promises as fs, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STUB_PATH = path.join(root, 'data', 'despertar-juizo-pool.stub.json');
const APPID_CACHE = path.join(root, 'docs', 'load-results', 'juizo-steam-appids.json');
const REPORT_PATH = path.join(root, 'docs', 'load-results', 'juizo-classind-sync.json');

const USER_AGENT = 'FundamentosJogosDigitais-ClassIndSync/1.0 (educational)';
const RATING_ORDER = Object.freeze(['L', '6', '10', '12', '14', '16', '18']);
const RATING_SET = new Set(RATING_ORDER);

/** null = não está na Steam / pular busca. */
const STEAM_APPID_OVERRIDES = Object.freeze({
  'counter-strike-2': 730,
  'dota-2': 570,
  'team-fortress-2': 440,
  'half-life-2': 220,
  'half-life': 70,
  'portal-2': 620,
  'portal': 400,
  'left-4-dead-2': 550,
  'garry-s-mod': 4000,
  'the-witcher-3': 292030,
  'the-witcher-3-wild-hunt': 292030,
  'elden-ring': 1245620,
  'cyberpunk-2077': 1091500,
  'hades': 1145360,
  'hades-ii': 1145350,
  'stardew-valley': 413150,
  'terraria': 105600,
  'among-us': 945360,
  'dark-souls-iii': 374320,
  'dark-souls-remastered': 570940,
  'sekiro-shadows-die-twice': 814380,
  'control': 870780,
  'prey-2017': 480430,
  'bioshock': 409710,
  'bioshock-infinite': 8870,
  'god-of-war-2018': 1593500,
  'death-stranding': 1850570,
  'uncharted-4-a-thief-s-end': 1659420,
  'resident-evil-4-remake': 2050650,
  'resident-evil-2-remake': 883710,
  'resident-evil-3-remake': 952060,
  'saints-row-2022': 742420,
  'diablo-ii-resurrected': 2536520,
  'deltarune': 1671210,
  'hollow-knight': 367520,
  'celeste': 504230,
  'cuphead': 268910,
  'minecraft': null,
  'fortnite': null,
  'roblox': null,
  'valorant': null,
  'league-of-legends': null,
  'genshin-impact': null,
  'overwatch-2': null,
  'world-of-warcraft': null,
  'bloodborne': null,
  'death-stranding-2': null,
  'alan-wake-2': null,
  'pokemon-scarlet': null,
  'pokemon-legends-arceus': null,
  'the-legend-of-zelda-breath-of-the-wild': null,
  'the-legend-of-zelda-tears-of-the-kingdom': null,
  'mario-kart-8-deluxe': null,
  'super-mario-odyssey': null,
  'super-smash-bros-ultimate': null,
  'animal-crossing-new-horizons': null,
});

const PEGI_TO_CLASSIND = Object.freeze({
  3: 'L',
  7: '6',
  12: '12',
  16: '16',
  18: '18',
});

const ESRB_TO_CLASSIND = Object.freeze({
  e: 'L',
  ec: 'L',
  e10: '10',
  'e10+': '10',
  t: '14',
  m: '16',
  ao: '18',
  rp: null,
});

function parseArgs(argv) {
  const flags = {
    apply: false,
    dryRun: true,
    limit: 0,
    only: null,
    concurrency: 3,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') {
      flags.apply = true;
      flags.dryRun = false;
    } else if (arg === '--dry-run') flags.dryRun = true;
    else if (arg === '--limit') flags.limit = Math.max(0, Number(argv[++i]) || 0);
    else if (arg === '--only') {
      flags.only = String(argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
    } else if (arg === '--concurrency') {
      flags.concurrency = Math.max(1, Math.min(6, Number(argv[++i]) || 3));
    } else if (arg === '--help' || arg === '-h') flags.help = true;
  }
  return flags;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function normalizeTitle(title) {
  return String(title || '').replace(/\s+/g, ' ').trim();
}

/** Steam DEJUS usa "l" para Livre; Portaria 2025 inclui 6. */
export function normalizeClassIndRating(raw) {
  if (raw == null || raw === '') return null;
  const value = String(raw).trim().toLowerCase();
  if (!value || value === 'pending' || value === 'rp' || value === 'banned') return null;
  if (value === 'l' || value === 'livre' || value === 'free' || value === '0') return 'L';
  if (value === '6' || value === '06') return '6';
  if (value === '10') return '10';
  if (value === '12') return '12';
  if (value === '14') return '14';
  if (value === '16') return '16';
  if (value === '18') return '18';
  const digits = value.replace(/[^\d]/g, '');
  if (RATING_SET.has(digits)) return digits;
  return null;
}

function splitDescriptors(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/\r?\n|;|\|/g)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((s) => s.replace(/\s*\(.*\)\s*$/, '').trim())
    .filter(Boolean);
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function steamSearchAppId(title, cache) {
  const key = normalizeTitle(title).toLowerCase();
  if (Object.prototype.hasOwnProperty.call(cache, key)) return cache[key];

  const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(normalizeTitle(title))}&l=brazilian&cc=BR`;
  await sleep(120);
  const data = await fetchJson(url);
  const items = Array.isArray(data?.items) ? data.items : [];
  if (!items.length) {
    cache[key] = null;
    return null;
  }
  const needle = key;
  const scored = items.map((it) => {
    const name = String(it.name || '').toLowerCase();
    let score = 0;
    if (name === needle) score += 100;
    else if (name.startsWith(needle)) score += 60;
    else if (name.includes(needle)) score += 30;
    // Tokens principais (ignora artigos)
    const needleTokens = needle.split(/[^a-z0-9]+/).filter((t) => t.length > 2);
    const hitTokens = needleTokens.filter((t) => name.includes(t)).length;
    score += hitTokens * 8;
    if (/soundtrack|ost|dlc|pack|bundle|demo|trailer|wallpaper|mixtape|guide/i.test(name)) score -= 50;
    return { id: Number(it.id), score, name };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  // Exige overlap mínimo — evita "Alan Wake 2" → Beat Saber Alan Walker.
  if (!best || best.score < 30 || !Number.isFinite(best.id) || best.id <= 0) {
    cache[key] = null;
    return null;
  }
  cache[key] = best.id;
  return best.id;
}

async function fetchSteamAppDetails(appId) {
  const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=br&l=brazilian`;
  await sleep(80);
  const data = await fetchJson(url);
  const row = data?.[String(appId)];
  if (!row?.success || !row.data) throw new Error(`appdetails miss ${appId}`);
  return row.data;
}

function fromDejus(dejus) {
  if (!dejus || typeof dejus !== 'object') return null;
  const rating = normalizeClassIndRating(dejus.rating);
  if (!rating) return null;
  return {
    rating,
    descriptors: splitDescriptors(dejus.descriptors),
    source: dejus.rating_generated === '1' || dejus.rating_generated === 1
      ? 'steam-dejus-auto'
      : 'steam-dejus',
    generated: Boolean(dejus.rating_generated === '1' || dejus.rating_generated === 1),
  };
}

function fromPegiOrEsrb(ratings) {
  if (!ratings || typeof ratings !== 'object') return null;
  const pegi = ratings.pegi?.rating;
  if (pegi != null) {
    const mapped = PEGI_TO_CLASSIND[String(pegi).replace(/[^\d]/g, '')]
      || PEGI_TO_CLASSIND[Number(pegi)];
    if (mapped) {
      return {
        rating: mapped,
        descriptors: splitDescriptors(ratings.pegi?.descriptors),
        source: 'steam-pegi-map',
        generated: true,
      };
    }
  }
  const esrbRaw = String(ratings.esrb?.rating || '').toLowerCase().replace(/\s+/g, '');
  const mapped = ESRB_TO_CLASSIND[esrbRaw] || ESRB_TO_CLASSIND[esrbRaw.replace('+', '')];
  if (mapped) {
    return {
      rating: mapped,
      descriptors: splitDescriptors(ratings.esrb?.descriptors),
      source: 'steam-esrb-map',
      generated: true,
    };
  }
  return null;
}

async function fromWikipediaPt(title) {
  const wikiTitle = normalizeTitle(title);
  const api = `https://pt.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(wikiTitle)}&format=json&origin=*`;
  await sleep(400);
  try {
    const data = await fetchJson(api);
    const page = Object.values(data?.query?.pages || {})[0];
    const text = String(page?.extract || '');
    if (!text) return null;

    // Ex.: "classificação indicativa ... 16 anos" / "Não recomendado para menores de 12 anos" / "Livre"
    const patterns = [
      /classifica[cç][aã]o\s+indicativa[^.\n]{0,40}?\b(livre|l)\b/i,
      /n[aã]o\s+recomendad[oa]\s+para\s+menores\s+de\s+(\d{1,2})\s*anos/i,
      /classind[^.\n]{0,30}?\b(livre|l|6|10|12|14|16|18)\b/i,
      /\b(livre)\b[^.\n]{0,20}classifica/i,
    ];
    for (const re of patterns) {
      const m = text.match(re);
      if (!m) continue;
      const raw = m[1] || m[0];
      const rating = normalizeClassIndRating(raw);
      if (rating) {
        return {
          rating,
          descriptors: [],
          source: 'wikipedia-pt',
          generated: true,
        };
      }
    }
  } catch {
    return null;
  }
  return null;
}

async function resolveSteamAppId(game, cache) {
  if (Object.prototype.hasOwnProperty.call(STEAM_APPID_OVERRIDES, game.id)) {
    return STEAM_APPID_OVERRIDES[game.id];
  }
  if (cache.byId?.[game.id] != null || Object.prototype.hasOwnProperty.call(cache.byId || {}, game.id)) {
    return cache.byId[game.id];
  }
  const found = await steamSearchAppId(game.title, cache.byTitle || (cache.byTitle = {}));
  cache.byId = cache.byId || {};
  cache.byId[game.id] = found;
  return found;
}

async function resolveRating(game, cache) {
  const previous = normalizeClassIndRating(game.rating);
  const previousDescriptors = Array.isArray(game.descriptors) ? game.descriptors.map(String) : [];

  let appId = null;
  try {
    appId = await resolveSteamAppId(game, cache);
  } catch {
    appId = null;
  }

  if (appId) {
    try {
      const details = await fetchSteamAppDetails(appId);
      const dejus = fromDejus(details.ratings?.dejus);
      if (dejus) {
        return {
          ...dejus,
          steamAppId: appId,
          previous,
        };
      }
      const mapped = fromPegiOrEsrb(details.ratings);
      if (mapped) {
        return {
          ...mapped,
          steamAppId: appId,
          previous,
        };
      }
    } catch (error) {
      // cai nos fallbacks
      return {
        rating: previous,
        descriptors: previousDescriptors,
        source: previous ? 'stub-keep' : 'unresolved',
        steamAppId: appId,
        previous,
        error: String(error.message || error),
      };
    }
  }

  // Sem Steam (exclusivas / F2P): Wikipedia → stub
  if (appId === null || !appId) {
    const wiki = await fromWikipediaPt(game.title);
    if (wiki) {
      return {
        ...wiki,
        steamAppId: null,
        previous,
      };
    }
  }

  if (previous) {
    return {
      rating: previous,
      descriptors: previousDescriptors,
      source: 'stub-keep',
      steamAppId: appId || null,
      previous,
    };
  }

  return {
    rating: null,
    descriptors: [],
    source: 'unresolved',
    steamAppId: appId || null,
    previous: null,
  };
}

async function mapPool(concurrency, items, worker) {
  const out = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const i = cursor;
      cursor += 1;
      out[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length || 1) }, () => run()));
  return out;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) {
    console.log('Uso: node scripts/sync-juizo-classind.mjs [--dry-run|--apply] [--limit N] [--only id1,id2]');
    process.exit(0);
  }

  const stub = JSON.parse(await fs.readFile(STUB_PATH, 'utf8'));
  let games = Array.isArray(stub.games) ? stub.games : [];
  if (flags.only?.length) {
    const only = new Set(flags.only);
    games = games.filter((g) => only.has(String(g.id)));
  }
  if (flags.limit > 0) games = games.slice(0, flags.limit);

  const cache = loadJson(APPID_CACHE, { byId: {}, byTitle: {} });
  cache.byId = cache.byId || {};
  cache.byTitle = cache.byTitle || {};

  console.log(`Modo: ${flags.apply ? 'APPLY' : 'DRY-RUN'} · ${games.length} jogos · concurrency=${flags.concurrency}`);

  const results = await mapPool(flags.concurrency, games, async (game, index) => {
    const resolved = await resolveRating(game, cache);
    const changed = normalizeClassIndRating(game.rating) !== resolved.rating
      || (resolved.source || '').startsWith('steam')
      || resolved.source === 'wikipedia-pt';
    const line = `[${index + 1}/${games.length}] ${game.id}: ${game.rating || '∅'} → ${resolved.rating || '∅'} (${resolved.source})`;
    if (resolved.rating && resolved.rating !== normalizeClassIndRating(game.rating)) {
      console.log(`CHG ${line}`);
    } else if (resolved.source === 'unresolved') {
      console.warn(`MISS ${line}`);
    } else {
      console.log(`OK  ${line}`);
    }
    return { id: game.id, title: game.title, before: game.rating ?? null, ...resolved, changed };
  });

  const bySource = {};
  for (const r of results) {
    bySource[r.source] = (bySource[r.source] || 0) + 1;
  }
  console.log('\nFontes:', bySource);

  // Aplica no stub completo (não só no subset)
  const resultById = new Map(results.map((r) => [r.id, r]));
  const nextGames = (stub.games || []).map((game) => {
    const hit = resultById.get(game.id);
    if (!hit || !hit.rating) return game;
    const descriptors = (hit.descriptors && hit.descriptors.length)
      ? hit.descriptors
      : (Array.isArray(game.descriptors) ? game.descriptors : []);
    return {
      ...game,
      rating: hit.rating,
      descriptors,
      ratingSource: hit.source,
      ...(hit.steamAppId ? { steamAppId: hit.steamAppId } : {}),
    };
  });

  const nextStub = {
    ...stub,
    note: 'Pool Juízo ClassInd. rating ∈ {L,6,10,12,14,16,18}. Fontes: steam-dejus / steam-*-map / wikipedia-pt / stub-keep. Capas em assets/classind-dle/covers/ ou assets/despertar-juizo/covers/.',
    ratingOrder: [...RATING_ORDER],
    count: nextGames.length,
    games: nextGames,
    classindSyncedAt: new Date().toISOString(),
  };

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, JSON.stringify({
    updated: nextStub.classindSyncedAt,
    mode: flags.apply ? 'apply' : 'dry-run',
    bySource,
    changed: results.filter((r) => r.before !== r.rating).length,
    unresolved: results.filter((r) => !r.rating).map((r) => r.id),
    sample: results.filter((r) => r.before !== r.rating).slice(0, 40),
  }, null, 2));
  writeFileSync(APPID_CACHE, JSON.stringify(cache, null, 2));

  if (!flags.apply) {
    console.log(`\nDry-run ok. Relatório: ${REPORT_PATH}`);
    console.log('Rode com --apply para gravar o stub.');
    return;
  }

  await fs.writeFile(STUB_PATH, `${JSON.stringify(nextStub, null, 2)}\n`);
  console.log(`\nStub atualizado: ${STUB_PATH}`);
  console.log(`Cache appids: ${APPID_CACHE}`);
  console.log(`Relatório: ${REPORT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
