#!/usr/bin/env node
/**
 * Busca capas faltantes do Juízo (Steam → Wikipedia) e grava WebP 600×800.
 *
 * Uso:
 *   node scripts/fetch-juizo-covers.mjs
 *   node scripts/fetch-juizo-covers.mjs --limit 20
 *   node scripts/fetch-juizo-covers.mjs --only minecraft,fortnite
 *   node scripts/fetch-juizo-covers.mjs --concurrency 4
 *
 * Destino: assets/despertar-juizo/covers/{cover}
 * Não sobrescreve arquivos existentes (resume-safe).
 * Não mexe em assets/classind-dle/covers/.
 */

import path from 'node:path';
import { promises as fs, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STUB_PATH = path.join(root, 'data', 'despertar-juizo-pool.stub.json');
const CLASSIND_DIR = path.join(root, 'assets', 'classind-dle', 'covers');
const OUT_DIR = path.join(root, 'assets', 'despertar-juizo', 'covers');
const FAIL_LOG = path.join(root, 'docs', 'load-results', 'juizo-covers-fail.json');
const URL_OVERRIDE_FILE = path.join(root, 'docs', 'load-results', 'juizo-cover-url-overrides.json');

function loadUrlOverridesFile() {
  try {
    return JSON.parse(readFileSync(URL_OVERRIDE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

const WIDTH = 600;
const HEIGHT = 800;
const QUALITY = 82;
const USER_AGENT = 'FundamentosJogosDigitais-JuizoCoverBot/1.0 (educational; contact: local-lab)';

/** Steam appid forçado quando a busca ambígua falha. */
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
  'garrys-mod': 4000,
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
  'dark-souls-ii-scholar-of-the-first-sin': 335300,
  'sekiro-shadows-die-twice': 814380,
  'control': 870780,
  'prey-2017': 480430,
  'bioshock': 409710,
  'bioshock-infinite': 8870,
  'system-shock-2023': 482400,
  'god-of-war-2018': 1593500,
  'death-stranding': 1850570,
  'uncharted-4-a-thief-s-end': 1659420,
  'spec-ops-the-line': 50300,
  'multiversus': 1818750,
  'call-of-duty-modern-warfare-ii': 1938090,
  'doom-2016': 379720,
  'resident-evil-4-remake': 2050650,
  'resident-evil-2-remake': 883710,
  'resident-evil-3-remake': 952060,
  'saints-row-2022': 742420,
  'diablo-ii-resurrected': 2536520,
  'deltarune': 1671210,
  'escape-from-tarkov': 3932890,
  'fall-guys': 1097150,
  'rocket-league': 252950,
  'ea-sports-fc-24': 2195250,
  'the-elder-scrolls-online': 306130,
  'world-of-warcraft': null,
  'overwatch-2': null,
  'minecraft': null,
  'fortnite': null,
  'roblox': null,
  'valorant': null,
  'league-of-legends': null,
  'genshin-impact': null,
  'bloodborne': null,
  'death-stranding-2': null,
});

/** IDs para forçar re-download (capas claramente erradas no 1º passe). */
const REFETCH_IDS = [
  'overwatch-2',
  'bloodborne',
  'death-stranding-2',
  'pokemon-scarlet',
  'pokemon-legends-arceus',
  'the-legend-of-zelda-tears-of-the-kingdom',
  'the-legend-of-zelda-breath-of-the-wild',
  'mario-kart-8-deluxe',
  'super-mario-odyssey',
  'super-smash-bros-ultimate',
  'kirby-and-the-forgotten-land',
  'bayonetta-3',
  'gran-turismo-7',
  'escape-from-tarkov',
  'alan-wake-2',
  'fire-emblem-three-houses',
  'xenoblade-chronicles-3',
  'splatoon-3',
  'metroid-dread',
  'metroid-prime-remastered',
  'pikmin-4',
  'warioware-move-it',
  'rhythm-heaven-megamix',
  'jet-set-radio',
  'crazy-taxi',
  'tetris-99',
  'starcraft-remastered',
  'warcraft-iii-reforged',
  'starcraft-ii',
  'diablo-ii-resurrected',
  'demon-s-souls',
  'castlevania-symphony-of-the-night',
];

/** Wikipedia title override (PT/EN). */
const WIKI_TITLE_OVERRIDES = Object.freeze({
  minecraft: 'Minecraft',
  fortnite: 'Fortnite',
  roblox: 'Roblox',
  valorant: 'Valorant',
  'league-of-legends': 'League of Legends',
  'genshin-impact': 'Genshin Impact',
  'honkai-star-rail': 'Honkai: Star Rail',
  'apex-legends': 'Apex Legends',
  'overwatch-2': 'Overwatch 2',
  'call-of-duty-warzone': 'Call of Duty: Warzone',
  'grand-theft-auto-v': 'Grand Theft Auto V',
  'gta-v': 'Grand Theft Auto V',
  'the-last-of-us': 'The Last of Us',
  'the-last-of-us-part-ii': 'The Last of Us Part II',
  bloodborne: 'Bloodborne',
  'alan-wake-2': 'Alan Wake 2',
  'death-stranding-2': 'Death Stranding 2',
  'pokemon-scarlet': 'Pokémon Scarlet e Violet',
  'pokemon-legends-arceus': 'Pokémon Legends: Arceus',
  'the-legend-of-zelda-breath-of-the-wild': 'The Legend of Zelda: Breath of the Wild',
  'the-legend-of-zelda-tears-of-the-kingdom': 'The Legend of Zelda: Tears of the Kingdom',
  'mario-kart-8-deluxe': 'Mario Kart 8 Deluxe',
  'super-mario-odyssey': 'Super Mario Odyssey',
  'super-smash-bros-ultimate': 'Super Smash Bros. Ultimate',
  'kirby-and-the-forgotten-land': 'Kirby and the Forgotten Land',
  'bayonetta-3': 'Bayonetta 3',
  'gran-turismo-7': 'Gran Turismo 7',
  'escape-from-tarkov': 'Escape from Tarkov',
  'fire-emblem-three-houses': 'Fire Emblem: Three Houses',
  'xenoblade-chronicles-3': 'Xenoblade Chronicles 3',
  'splatoon-3': 'Splatoon 3',
  'metroid-dread': 'Metroid Dread',
  'metroid-prime-remastered': 'Metroid Prime Remastered',
  'pikmin-4': 'Pikmin 4',
  'animal-crossing-new-horizons': 'Animal Crossing: New Horizons',
});

function parseArgs(argv) {
  const flags = { limit: 0, only: null, concurrency: 3, force: false, help: false, refetchBad: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') flags.help = true;
    else if (arg === '--limit') flags.limit = Math.max(0, Number(argv[++i]) || 0);
    else if (arg === '--only') flags.only = String(argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (arg === '--concurrency') flags.concurrency = Math.max(1, Math.min(8, Number(argv[++i]) || 3));
    else if (arg === '--force') flags.force = true;
    else if (arg === '--refetch-bad') flags.refetchBad = true;
  }
  return flags;
}

async function listWebp(dir) {
  try {
    const names = await fs.readdir(dir);
    return new Set(names.filter((n) => n.toLowerCase().endsWith('.webp')));
  } catch {
    return new Set();
  }
}

async function fetchBuffer(url, { timeoutMs = 20000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'image/*,application/json,*/*',
      },
      redirect: 'follow',
    });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} for ${url}`);
      err.status = res.status;
      throw err;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) throw new Error(`payload too small (${buf.length})`);
    return buf;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

function normalizeTitle(title) {
  return String(title || '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function steamSearchAppId(title) {
  const q = encodeURIComponent(normalizeTitle(title));
  const url = `https://store.steampowered.com/api/storesearch/?term=${q}&l=english&cc=BR`;
  const data = await fetchJson(url);
  const items = Array.isArray(data?.items) ? data.items : [];
  if (items.length === 0) return null;

  const needle = normalizeTitle(title).toLowerCase();
  const exact = items.find((it) => String(it.name || '').toLowerCase() === needle);
  const starts = items.find((it) => String(it.name || '').toLowerCase().startsWith(needle));
  const pick = exact || starts || items[0];
  const id = Number(pick?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function fetchSteamCover(appId) {
  const candidates = [
    `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900_2x.jpg`,
    `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`,
    `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
    `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900_2x.jpg`,
    `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
    `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/capsule_616x353.jpg`,
  ];
  let lastError = null;
  for (const url of candidates) {
    try {
      const buf = await fetchBuffer(url);
      return { buf, source: `steam:${appId}`, url };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error(`Steam cover miss appId=${appId}`);
}

/** URLs diretas de capa (Wikimedia) quando APIs falham/rate-limit. */
const COVER_URL_OVERRIDES = Object.freeze(loadUrlOverridesFile());

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchDirectCover(id) {
  const url = COVER_URL_OVERRIDES[id];
  if (!url) throw new Error(`sem URL direta: ${id}`);
  await sleep(800);
  const buf = await fetchBuffer(url);
  return { buf, source: `direct:${id}`, url };
}

async function fetchWikipediaPtCover(title, id) {
  await sleep(400);
  const wikiTitle = WIKI_TITLE_OVERRIDES[id] || normalizeTitle(title);
  const api = `https://pt.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(wikiTitle)}&prop=pageimages&format=json&pithumbsize=1200&origin=*`;
  const data = await fetchJson(api);
  const page = Object.values(data?.query?.pages || {})[0];
  const thumb = page?.thumbnail?.source;
  if (!thumb) throw new Error(`Wikipedia PT sem imagem: ${wikiTitle}`);
  const original = String(thumb).replace(/\/\d+px-/, '/1200px-').split('?')[0];
  try {
    const buf = await fetchBuffer(original);
    return { buf, source: `wikipedia-pt:${wikiTitle}`, url: original };
  } catch {
    const buf = await fetchBuffer(String(thumb).split('?')[0]);
    return { buf, source: `wikipedia-pt:${wikiTitle}`, url: thumb };
  }
}

async function fetchItunesCover(title, id) {
  const term = encodeURIComponent(normalizeTitle(title));
  const url = `https://itunes.apple.com/search?term=${term}&entity=software&limit=8&country=US`;
  const data = await fetchJson(url);
  const results = Array.isArray(data?.results) ? data.results : [];
  if (!results.length) throw new Error(`iTunes vazio: ${title}`);

  const needle = normalizeTitle(title).toLowerCase();
  const idNeedle = String(id || '').replace(/-/g, ' ').toLowerCase();
  const scored = results.map((r) => {
    const name = String(r.trackName || '').toLowerCase();
    let score = 0;
    if (name === needle) score += 100;
    if (name.startsWith(needle)) score += 50;
    if (name.includes(needle)) score += 20;
    if (idNeedle && name.includes(idNeedle)) score += 15;
    if (/companion|buddy|tracker|guide|wallpaper|quiz|stickers|remote|map\b|builder for|pokélab|flash party|delta force|gate breaker|gangstar|angry bull|shockbot|frontline|sideswipe|stumble guys|battle\.net|geo(?:metry)?\s*dash lite|nightmares inside/i.test(name)) score -= 80;
    return { r, score };
  }).sort((a, b) => b.score - a.score);

  const pick = scored[0];
  if (!pick || pick.score < 25) throw new Error(`iTunes match fraco: ${title}`);
  const art = pick.r.artworkUrl512 || pick.r.artworkUrl100;
  if (!art) throw new Error(`iTunes sem artwork: ${title}`);
  const hi = String(art).replace(/\/\d+x\d+bb\./, '/1024x1024bb.');
  try {
    const buf = await fetchBuffer(hi);
    return { buf, source: `itunes:${pick.r.trackName}`, url: hi };
  } catch {
    const buf = await fetchBuffer(art);
    return { buf, source: `itunes:${pick.r.trackName}`, url: art };
  }
}

let freeToGameCache = null;
async function fetchFreeToGameCover(title) {
  if (!freeToGameCache) {
    freeToGameCache = await fetchJson('https://www.freetogame.com/api/games');
    if (!Array.isArray(freeToGameCache)) freeToGameCache = [];
  }
  const needle = normalizeTitle(title).toLowerCase();
  const hit = freeToGameCache.find((g) => String(g.title || '').toLowerCase() === needle)
    || freeToGameCache.find((g) => String(g.title || '').toLowerCase().includes(needle));
  if (!hit?.thumbnail) throw new Error(`FreeToGame miss: ${title}`);
  const buf = await fetchBuffer(hit.thumbnail);
  return { buf, source: `freetogame:${hit.title}`, url: hit.thumbnail };
}

async function fetchWikipediaCover(title, id) {
  const wikiTitle = WIKI_TITLE_OVERRIDES[id] || normalizeTitle(title);
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`;
  const data = await fetchJson(url);
  const thumb = data?.originalimage?.source || data?.thumbnail?.source;
  if (!thumb) throw new Error(`Wikipedia sem imagem: ${wikiTitle}`);
  const hi = String(thumb).replace(/\/\d+px-/, '/800px-');
  try {
    const buf = await fetchBuffer(hi);
    return { buf, source: `wikipedia:${wikiTitle}`, url: hi };
  } catch {
    const buf = await fetchBuffer(thumb);
    return { buf, source: `wikipedia:${wikiTitle}`, url: thumb };
  }
}

async function writeCoverWebp(buf, destPath) {
  const tmp = `${destPath}.tmp-${process.pid}.webp`;
  await sharp(buf)
    .rotate()
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'centre' })
    .webp({ quality: QUALITY })
    .toFile(tmp);
  await fs.rename(tmp, destPath);
}

async function resolveCoverImage(game) {
  const override = Object.prototype.hasOwnProperty.call(STEAM_APPID_OVERRIDES, game.id)
    ? STEAM_APPID_OVERRIDES[game.id]
    : undefined;

  const attempts = [];

  if (COVER_URL_OVERRIDES[game.id]) {
    attempts.push(() => fetchDirectCover(game.id));
  }

  if (override && override !== null) {
    attempts.push(() => fetchSteamCover(override));
  } else if (override !== null) {
    attempts.push(async () => {
      const appId = await steamSearchAppId(game.title);
      if (!appId) throw new Error('Steam search miss');
      return fetchSteamCover(appId);
    });
  }

  attempts.push(() => fetchWikipediaPtCover(game.title, game.id));
  attempts.push(() => fetchItunesCover(game.title, game.id));
  attempts.push(() => fetchFreeToGameCover(game.title));

  let lastError = null;
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('all sources failed');
}

async function mapPool(concurrency, items, worker) {
  const results = [];
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
  return results;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) {
    console.log(`Uso: node scripts/fetch-juizo-covers.mjs [--limit N] [--only id1,id2] [--concurrency N]`);
    process.exit(0);
  }

  const stub = JSON.parse(await fs.readFile(STUB_PATH, 'utf8'));
  const games = Array.isArray(stub.games) ? stub.games : [];
  const classind = await listWebp(CLASSIND_DIR);
  const existing = await listWebp(OUT_DIR);
  await fs.mkdir(OUT_DIR, { recursive: true });

  let missing = games
    .map((g) => ({
      id: String(g.id),
      title: String(g.title || g.id),
      cover: typeof g.cover === 'string' && g.cover.trim() ? g.cover.trim() : `${g.id}.webp`,
    }))
    .filter((g) => g.cover !== 'no-image.webp');

  if (flags.refetchBad) {
    flags.only = REFETCH_IDS;
    flags.force = true;
  }

  if (flags.only?.length) {
    const only = new Set(flags.only);
    missing = missing.filter((g) => only.has(g.id) || only.has(g.cover));
  }

  if (flags.force) {
    for (const g of missing) {
      await fs.unlink(path.join(OUT_DIR, g.cover)).catch(() => {});
      existing.delete(g.cover);
    }
  }

  missing = missing.filter((g) => !classind.has(g.cover) && !existing.has(g.cover));

  if (flags.limit > 0) missing = missing.slice(0, flags.limit);

  console.log(`Faltam ${missing.length} capas (concurrency=${flags.concurrency})`);
  if (missing.length === 0) {
    console.log('Nada a fazer.');
    return;
  }

  const ok = [];
  const fail = [];

  await mapPool(flags.concurrency, missing, async (game, index) => {
    const label = `[${index + 1}/${missing.length}] ${game.id}`;
    const dest = path.join(OUT_DIR, game.cover);
    try {
      const { buf, source } = await resolveCoverImage(game);
      await writeCoverWebp(buf, dest);
      ok.push({ id: game.id, cover: game.cover, source });
      console.log(`OK  ${label} ← ${source}`);
    } catch (error) {
      fail.push({ id: game.id, cover: game.cover, title: game.title, error: String(error.message || error) });
      console.warn(`FAIL ${label}: ${error.message || error}`);
    }
  });

  await fs.mkdir(path.dirname(FAIL_LOG), { recursive: true });
  await fs.writeFile(FAIL_LOG, JSON.stringify({ updated: new Date().toISOString(), ok: ok.length, fail }, null, 2));

  console.log(`\nOK ${ok.length} | FAIL ${fail.length}`);
  console.log(`Falhas: ${FAIL_LOG}`);
  if (fail.length) {
    console.log('Rode de novo para retentar (resume). Ajuste STEAM_APPID_OVERRIDES / WIKI_TITLE_OVERRIDES se precisar.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
