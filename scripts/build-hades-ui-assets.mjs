#!/usr/bin/env node
/**
 * Pipeline de Artes de UI estilo Hades (Supergiant Games)
 * Analisa as 7 imagens de referência (Mirror of Night, Pool of Purging, Zagreus Dialogue,
 * Boon Tokens, Blessings of Guanyin, Hades GUI Set e Keepsakes) e gera:
 *   1. Molduras e Cantoneiras SVG (Mirror of Night, Greek-key Meander, Laurel Crest, Sealed Padlock Gate)
 *   2. Divisores Ornamentados SVG (Laurel & Skull, Styx Diamond Gems)
 *   3. 8 Boon Token Icons Losangulares (64x64px, validados e exportados via preflight.py ui-export @1x/@2x WebP/PNG/SVG)
 *   4. 2 Banners Widescreen (admin-throne-banner 1200x320px e hero-underworld-banner 1440x600px,
 *      validados com preflight.py check e exportados via preflight.py ui-export --css em SVG + WebP/PNG @1x/@2x)
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const OUT_ROOT = path.join(ROOT, 'assets', 'ui', 'hades');
const FRAMES_DIR = path.join(OUT_ROOT, 'frames');
const DIVIDERS_DIR = path.join(OUT_ROOT, 'dividers');
const ICONS_DIR = path.join(OUT_ROOT, 'icons');
const BANNERS_DIR = path.join(OUT_ROOT, 'banners');
const SRC_DIR = path.join(OUT_ROOT, 'src');

const PREFLIGHT_PY = 'C:/Users/VonLuqi/Projects/papelprint-print-kit/preflight.py';

for (const dir of [OUT_ROOT, FRAMES_DIR, DIVIDERS_DIR, ICONS_DIR, BANNERS_DIR, SRC_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeSvg(filePath, content) {
  fs.writeFileSync(filePath, content.trim() + '\n', 'utf8');
  console.log(`[svg] ${path.relative(ROOT, filePath)}`);
}

// =============================================================================
// 1. MOLDURAS E CANTONEIRAS ORNAMENTADAS (FRAMES)
// =============================================================================

// Ref 1: Mirror of Night — Cantoneira Chthonica com Filigrana de Bronze e Ametista Facetada
const mirrorCornerSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
  <defs>
    <linearGradient id="bronzeGold" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#f6d365"/>
      <stop offset="45%" stop-color="#d4af37"/>
      <stop offset="100%" stop-color="#6e5219"/>
    </linearGradient>
    <linearGradient id="amethystGem" x1="12" y1="12" x2="44" y2="44" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#f3d9fa"/>
      <stop offset="35%" stop-color="#c77dff"/>
      <stop offset="75%" stop-color="#7b2cbf"/>
      <stop offset="100%" stop-color="#3c096c"/>
    </linearGradient>
  </defs>
  <!-- Base angular de bronze escuro -->
  <path d="M2 2 H88 L76 14 H22 L14 22 V76 L2 88 V2 Z" fill="#140e1c" stroke="url(#bronzeGold)" stroke-width="2"/>
  <!-- Filete interno chanfrado -->
  <path d="M8 8 H68 L60 16 H26 L16 26 V60 L8 68 V8 Z" fill="#231630" stroke="#d4af37" stroke-width="1.2" opacity="0.9"/>
  <!-- Espinho barroco diagonal -->
  <path d="M18 18 L46 24 L34 34 L24 46 Z" fill="url(#bronzeGold)"/>
  <!-- Gema de Ametista estilo Mirror of Night -->
  <polygon points="24,10 38,16 32,32 16,38 10,24" fill="url(#amethystGem)" stroke="#f6d365" stroke-width="1.5"/>
  <polygon points="24,13 33,18 28,28 18,33 13,24" fill="#e0aaff" opacity="0.45"/>
  <!-- Cravos dourados nas extremidades -->
  <polygon points="78,8 83,4 88,8 83,12" fill="#f6d365"/>
  <polygon points="8,78 4,83 8,88 12,83" fill="#f6d365"/>
</svg>
`;
writeSvg(path.join(FRAMES_DIR, 'mirror-frame-corners.svg'), mirrorCornerSvg);

// Ref 5: Blessings of Guanyin — Cantoneira Meandro Grego (Greek-Key) Carmesim e Ouro
const meanderCornerSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72" fill="none">
  <path d="M2 70 V2 H70" stroke="#d4af37" stroke-width="2.5"/>
  <path d="M8 64 V8 H64" stroke="#c92a2a" stroke-width="1.8"/>
  <path d="M14 44 V14 H44 V28 H24 V20 H36 V24" stroke="#d4af37" stroke-width="2" stroke-linecap="square"/>
  <polygon points="2,2 14,2 2,14" fill="#f6d365"/>
  <polygon points="14,14 22,14 18,22" fill="#ff4500"/>
</svg>
`;
writeSvg(path.join(FRAMES_DIR, 'meander-corners.svg'), meanderCornerSvg);

// Ref 1 & 2: Brasão de Topo com Louros de Sangue, Crânio Ctônico e Ametista
const laurelHeaderCrestSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="360" height="64" viewBox="0 0 360 64" fill="none">
  <defs>
    <linearGradient id="crestGold" x1="0" y1="0" x2="360" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#8f6f28"/>
      <stop offset="50%" stop-color="#f6d365"/>
      <stop offset="100%" stop-color="#8f6f28"/>
    </linearGradient>
    <linearGradient id="crestAmethyst" x1="164" y1="12" x2="196" y2="52" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#f3d9fa"/>
      <stop offset="50%" stop-color="#a020f0"/>
      <stop offset="100%" stop-color="#3c096c"/>
    </linearGradient>
  </defs>
  <!-- Hastes em lança -->
  <polygon points="8,32 132,29 142,32 132,35" fill="url(#crestGold)"/>
  <polygon points="352,32 228,29 218,32 228,35" fill="url(#crestGold)"/>
  <!-- Folhas de louro carmesim (Esquerda) -->
  <path d="M126 28 C110 14 92 16 82 26 C96 26 112 29 126 28 Z" fill="#d9381e" stroke="#d4af37" stroke-width="1.2"/>
  <path d="M126 36 C110 50 92 48 82 38 C96 38 112 35 126 36 Z" fill="#9e1b1b" stroke="#d4af37" stroke-width="1.2"/>
  <path d="M104 29 C92 18 76 20 68 28 C80 28 92 30 104 29 Z" fill="#ff4500" stroke="#d4af37" stroke-width="1"/>
  <!-- Folhas de louro carmesim (Direita) -->
  <path d="M234 28 C250 14 268 16 278 26 C264 26 248 29 234 28 Z" fill="#d9381e" stroke="#d4af37" stroke-width="1.2"/>
  <path d="M234 36 C250 50 268 48 278 38 C264 38 248 35 234 36 Z" fill="#9e1b1b" stroke="#d4af37" stroke-width="1.2"/>
  <path d="M256 29 C268 18 284 20 292 28 C280 28 268 30 256 29 Z" fill="#ff4500" stroke="#d4af37" stroke-width="1"/>
  <!-- Gemas laterais -->
  <polygon points="146,32 136,22 126,32 136,42" fill="#5e111a" stroke="url(#crestGold)" stroke-width="1.6"/>
  <polygon points="214,32 224,22 234,32 224,42" fill="#5e111a" stroke="url(#crestGold)" stroke-width="1.6"/>
  <!-- Moldura Central Losangular Dupla -->
  <polygon points="150,32 180,4 210,32 180,60" fill="#120b18" stroke="url(#crestGold)" stroke-width="2.4"/>
  <polygon points="156,32 180,10 204,32 180,54" fill="#241332" stroke="#d4af37" stroke-width="1.2"/>
  <!-- Gema Central Facetada -->
  <polygon points="168,32 180,15 192,32 180,49" fill="url(#crestAmethyst)" stroke="#f6d365" stroke-width="1.4"/>
  <polygon points="174,27 180,18 186,27 180,35" fill="#f3d9fa" opacity="0.65"/>
</svg>
`;
writeSvg(path.join(FRAMES_DIR, 'laurel-header-crest.svg'), laurelHeaderCrestSvg);

// Ref 7: Keepsakes — Cadeado Dourado de Portão Selado (Sealed Gate Padlock)
const sealedPadlockSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
  <defs>
    <linearGradient id="lockGold" x1="16" y1="8" x2="80" y2="88" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#f6d365"/>
      <stop offset="50%" stop-color="#c59b27"/>
      <stop offset="100%" stop-color="#6b4e11"/>
    </linearGradient>
  </defs>
  <!-- Moldura externa chanfrada -->
  <polygon points="48,4 90,48 48,92 6,48" fill="#15101c" stroke="url(#lockGold)" stroke-width="2.5"/>
  <polygon points="48,10 84,48 48,86 12,48" fill="#1e1628" stroke="#7a5c1d" stroke-width="1.2"/>
  <!-- Arco do cadeado -->
  <path d="M34 42 V29 C34 20.5 40.3 15 48 15 C55.7 15 62 20.5 62 29 V42" stroke="url(#lockGold)" stroke-width="6" stroke-linecap="round"/>
  <!-- Corpo em coração/escudo estilo Keepsakes Ref 7 -->
  <path d="M26 42 H70 L66 72 L48 82 L30 72 Z" fill="url(#lockGold)" stroke="#2b1d06" stroke-width="2"/>
  <path d="M31 46 H65 L62 69 L48 77 L34 69 Z" fill="#9e781c"/>
  <!-- Fechadura estígia -->
  <circle cx="48" cy="56" r="5.5" fill="#120c18"/>
  <polygon points="45,58 51,58 53,70 43,70" fill="#120c18"/>
</svg>
`;
writeSvg(path.join(FRAMES_DIR, 'sealed-padlock-gate.svg'), sealedPadlockSvg);

// =============================================================================
// 2. DIVISORES ORNAMENTADOS (DIVIDERS)
// =============================================================================

const dividerLaurelSkullSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="32" viewBox="0 0 640 32" fill="none">
  <defs>
    <linearGradient id="divGold" x1="0" y1="16" x2="640" y2="16" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#d4af37" stop-opacity="0"/>
      <stop offset="22%" stop-color="#d4af37" stop-opacity="0.85"/>
      <stop offset="50%" stop-color="#f6d365" stop-opacity="1"/>
      <stop offset="78%" stop-color="#d4af37" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#d4af37" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <line x1="12" y1="16" x2="276" y2="16" stroke="url(#divGold)" stroke-width="1.8"/>
  <line x1="364" y1="16" x2="628" y2="16" stroke="url(#divGold)" stroke-width="1.8"/>
  <polygon points="276,16 290,9 304,16 290,23" fill="#7a1f2b" stroke="#d4af37" stroke-width="1.4"/>
  <polygon points="336,16 350,9 364,16 350,23" fill="#7a1f2b" stroke="#d4af37" stroke-width="1.4"/>
  <polygon points="304,16 320,3 336,16 320,29" fill="#160f20" stroke="#f6d365" stroke-width="2"/>
  <polygon points="312,16 320,9 328,16 320,23" fill="#d9381e"/>
</svg>
`;
writeSvg(path.join(DIVIDERS_DIR, 'divider-laurel-skull.svg'), dividerLaurelSkullSvg);

const dividerStyxGemsSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="20" viewBox="0 0 480 20" fill="none">
  <path d="M0 10 L210 9 L218 10 L210 11 Z" fill="#d4af37" opacity="0.65"/>
  <path d="M480 10 L270 9 L262 10 L270 11 Z" fill="#d4af37" opacity="0.65"/>
  <polygon points="222,10 228,5 234,10 228,15" fill="#a020f0" stroke="#d4af37" stroke-width="1"/>
  <polygon points="240,2 248,10 240,18 232,10" fill="#f6d365"/>
  <polygon points="246,10 252,5 258,10 252,15" fill="#a020f0" stroke="#d4af37" stroke-width="1"/>
</svg>
`;
writeSvg(path.join(DIVIDERS_DIR, 'divider-styx-gems.svg'), dividerStyxGemsSvg);

// =============================================================================
// 3. OITO BOON TOKENS LOSANGULARES (ICONS 64x64px — Ref 2, Ref 4, Ref 5)
// =============================================================================

function makeBoonTokenSvg({ bgStart, bgEnd, rimColor, burstColor, innerPath }) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
  <defs>
    <radialGradient id="bgRad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${bgStart}"/>
      <stop offset="100%" stop-color="${bgEnd}"/>
    </radialGradient>
    <linearGradient id="rimGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#f6d365"/>
      <stop offset="50%" stop-color="${rimColor}"/>
      <stop offset="100%" stop-color="#6e5219"/>
    </linearGradient>
  </defs>
  <g id="pp-artwork">
    <!-- Moldura Losangular Externa (Boon Diamond Housing) -->
    <polygon points="32,4 60,32 32,60 4,32" fill="#100b16" stroke="url(#rimGrad)" stroke-width="2.6"/>
    <!-- Bisel Interno -->
    <polygon points="32,8 56,32 32,56 8,32" fill="url(#bgRad)" stroke="#f6d365" stroke-width="1.1" stroke-opacity="0.75"/>
    <!-- Raios de Explosão (Ref 4 Boon Tokens) -->
    <path d="M32 10 L35 24 L32 32 L29 24 Z M54 32 L40 35 L32 32 L40 29 Z M32 54 L29 40 L32 32 L35 40 Z M10 32 L24 29 L32 32 L24 35 Z" fill="${burstColor}" opacity="0.24"/>
    <!-- Cantos de Filigrana -->
    <polygon points="32,4 36,9 32,12 28,9" fill="#f6d365"/>
    <polygon points="60,32 55,36 52,32 55,28" fill="#f6d365"/>
    <polygon points="32,60 28,55 32,52 36,55" fill="#f6d365"/>
    <polygon points="4,32 9,28 12,32 9,36" fill="#f6d365"/>
    <!-- Símbolo Central -->
    ${innerPath}
  </g>
</svg>`;
}

const BOON_ICONS = [
  {
    name: 'icon-styx-coin',
    bgStart: '#4a2511',
    bgEnd: '#140b08',
    rimColor: '#d4af37',
    burstColor: '#f6d365',
    innerPath: `
      <circle cx="32" cy="32" r="13" fill="#d4af37" stroke="#2b1908" stroke-width="1.8"/>
      <circle cx="32" cy="32" r="9.5" fill="#1b110a" stroke="#f6d365" stroke-width="1.2"/>
      <path d="M29 25 V39 M35 25 V39 M27 29 H37 M28 36 H36" stroke="#ff4500" stroke-width="2.2" stroke-linecap="round"/>
    `,
  },
  {
    name: 'icon-mirror-night',
    bgStart: '#4c1d95',
    bgEnd: '#130924',
    rimColor: '#c084fc',
    burstColor: '#e879f9',
    innerPath: `
      <polygon points="32,15 44,32 32,49 20,32" fill="#a855f7" stroke="#f6d365" stroke-width="1.8"/>
      <polygon points="32,20 39,32 32,44 25,32" fill="#f3e8ff" opacity="0.8"/>
      <circle cx="32" cy="32" r="3.2" fill="#3b0764"/>
    `,
  },
  {
    name: 'icon-acheron-flame',
    bgStart: '#0f4c5c',
    bgEnd: '#091520',
    rimColor: '#2ce6d0',
    burstColor: '#4ce666',
    innerPath: `
      <path d="M32 15 C39 23 44 29 41 39 C39 45 35 48 32 48 C29 48 25 45 23 39 C20 29 25 23 32 15 Z" fill="#2ce6d0" stroke="#f6d365" stroke-width="1.5"/>
      <path d="M32 24 C36 29 37 34 35 40 C34 43 32 45 32 45 C32 45 30 43 29 40 C27 34 28 29 32 24 Z" fill="#d9f99d"/>
    `,
  },
  {
    name: 'icon-minos-scales',
    bgStart: '#6b141a',
    bgEnd: '#19080c',
    rimColor: '#ff4500',
    burstColor: '#f87171',
    innerPath: `
      <path d="M32 17 V45 M22 24 H42 M26 45 H38" stroke="#f6d365" stroke-width="2.2" stroke-linecap="round"/>
      <polygon points="22,25 26,35 18,35" fill="#d9381e" stroke="#f6d365" stroke-width="1.2"/>
      <polygon points="42,25 46,35 38,35" fill="#d9381e" stroke="#f6d365" stroke-width="1.2"/>
    `,
  },
  {
    name: 'icon-hermes-wing',
    bgStart: '#4a3510',
    bgEnd: '#161008',
    rimColor: '#f59e0b',
    burstColor: '#fde047',
    innerPath: `
      <path d="M19 39 C22 27 31 20 45 19 C41 25 38 28 33 30 C38 30 42 29 45 32 C38 36 30 39 19 39 Z" fill="#f6d365" stroke="#d9381e" stroke-width="1.4"/>
      <path d="M22 43 H36" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>
    `,
  },
  {
    name: 'icon-nyx-veil',
    bgStart: '#311042',
    bgEnd: '#0d0714',
    rimColor: '#a855f7',
    burstColor: '#c084fc',
    innerPath: `
      <path d="M36 18 C27 19 21 26 21 34 C21 42 28 47 36 46 C30 43 28 38 28 32 C28 26 31 21 36 18 Z" fill="#f6d365"/>
      <polygon points="40,24 42,28 46,30 42,32 40,36 38,32 34,30 38,28" fill="#e0aaff"/>
    `,
  },
  {
    name: 'icon-grimoire-quill',
    bgStart: '#143d2b',
    bgEnd: '#081812',
    rimColor: '#4ce666',
    burstColor: '#86efac',
    innerPath: `
      <rect x="22" y="19" width="20" height="26" rx="2" fill="#1e293b" stroke="#f6d365" stroke-width="1.8"/>
      <line x1="26" y1="26" x2="38" y2="26" stroke="#4ce666" stroke-width="1.8"/>
      <line x1="26" y1="32" x2="38" y2="32" stroke="#4ce666" stroke-width="1.8"/>
      <line x1="26" y1="38" x2="34" y2="38" stroke="#f6d365" stroke-width="1.8"/>
    `,
  },
  {
    name: 'icon-cerberus-shield',
    bgStart: '#5e111a',
    bgEnd: '#17070a',
    rimColor: '#d4af37',
    burstColor: '#ff4500',
    innerPath: `
      <path d="M22 20 H42 V33 C42 40 32 46 32 46 C32 46 22 40 22 33 V20 Z" fill="#8b1a1a" stroke="#f6d365" stroke-width="2"/>
      <polygon points="32,24 37,32 32,40 27,32" fill="#f6d365"/>
    `,
  },
];

for (const icon of BOON_ICONS) {
  const svgPath = path.join(ICONS_DIR, `${icon.name}.svg`);
  writeSvg(svgPath, makeBoonTokenSvg(icon));
}

// =============================================================================
// 4. BANNERS WIDESCREEN (1200x320 ui_banner_cta e 1440x600 ui_hero_banner)
// =============================================================================

const adminThroneBannerSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="320" viewBox="0 0 1200 320" fill="none">
  <defs>
    <linearGradient id="throneBg" x1="0" y1="0" x2="1200" y2="320" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0d0814"/>
      <stop offset="38%" stop-color="#1b0f24"/>
      <stop offset="72%" stop-color="#38101c"/>
      <stop offset="100%" stop-color="#120916"/>
    </linearGradient>
    <radialGradient id="throneGlowLeft" cx="18%" cy="50%" r="48%">
      <stop offset="0%" stop-color="#a020f0" stop-opacity="0.34"/>
      <stop offset="100%" stop-color="#a020f0" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="throneGlowRight" cx="84%" cy="45%" r="45%">
      <stop offset="0%" stop-color="#ff4500" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="#ff4500" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="goldBorder" x1="0" y1="0" x2="1200" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#6e5219"/>
      <stop offset="50%" stop-color="#f6d365"/>
      <stop offset="100%" stop-color="#6e5219"/>
    </linearGradient>
  </defs>
  <g id="pp-artwork">
    <!-- Fundo Ctônico Obsidiana & Carmesim -->
    <rect x="0" y="0" width="1200" height="320" fill="url(#throneBg)"/>
    <rect x="0" y="0" width="1200" height="320" fill="url(#throneGlowLeft)"/>
    <rect x="0" y="0" width="1200" height="320" fill="url(#throneGlowRight)"/>

    <!-- Feixes Diagonais de Luz (Ref 1 Mirror of Night & Ref 5 Blessings) -->
    <polygon points="180,0 310,0 140,320 10,320" fill="#ffffff" opacity="0.03"/>
    <polygon points="360,0 420,0 250,320 190,320" fill="#f6d365" opacity="0.04"/>
    <polygon points="820,0 960,0 790,320 650,320" fill="#ff4500" opacity="0.05"/>

    <!-- Moldura Arquitetônica Interna (Respeitando safe padding de 32px) -->
    <polygon points="36,36 1164,36 1164,284 36,284" fill="none" stroke="url(#goldBorder)" stroke-width="2" opacity="0.8"/>
    <polygon points="44,44 1156,44 1156,276 44,276" fill="none" stroke="#c92a2a" stroke-width="1" opacity="0.65"/>

    <!-- Ornamentos de Canto e Cristais de Ametista (Dentro da área segura >=36px) -->
    <polygon points="36,36 96,36 82,50 50,50 50,82 36,96" fill="#d4af37"/>
    <polygon points="1164,36 1104,36 1118,50 1150,50 1150,82 1164,96" fill="#d4af37"/>
    <polygon points="36,284 96,284 82,270 50,270 50,238 36,224" fill="#d4af37"/>
    <polygon points="1164,284 1104,284 1118,270 1150,270 1150,238 1164,224" fill="#d4af37"/>

    <!-- Brasão Losangular Esquerdo (Espelho da Noite) -->
    <polygon points="160,64 256,160 160,256 64,160" fill="#140c1f" stroke="#d4af37" stroke-width="3"/>
    <polygon points="160,78 242,160 160,242 78,160" fill="#251238" stroke="#a020f0" stroke-width="1.6"/>
    <polygon points="160,104 216,160 160,216 104,160" fill="#7b2cbf" stroke="#f6d365" stroke-width="2"/>
    <polygon points="160,122 198,160 160,198 122,160" fill="#e0aaff" opacity="0.55"/>

    <!-- Brasão Losangular Direito (Chama de Minos & Estige) -->
    <polygon points="1040,64 1136,160 1040,256 944,160" fill="#1a0b10" stroke="#d4af37" stroke-width="3"/>
    <polygon points="1040,78 1122,160 1040,242 958,160" fill="#3d1018" stroke="#ff4500" stroke-width="1.6"/>
    <polygon points="1040,106 1094,160 1040,214 986,160" fill="#9e1b1b" stroke="#f6d365" stroke-width="2"/>
    <circle cx="1040" cy="160" r="22" fill="#f6d365" opacity="0.85"/>
    <circle cx="1040" cy="160" r="13" fill="#1a0b10"/>

    <!-- Constelação de Filigrana Central -->
    <line x1="290" y1="160" x2="910" y2="160" stroke="url(#goldBorder)" stroke-width="1.5" opacity="0.35"/>
    <polygon points="600,48 618,66 600,84 582,66" fill="#d9381e" stroke="#f6d365" stroke-width="1.5"/>
    <polygon points="600,236 618,254 600,272 582,254" fill="#a020f0" stroke="#f6d365" stroke-width="1.5"/>
  </g>
</svg>
`;

const heroUnderworldBannerSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="600" viewBox="0 0 1440 600" fill="none">
  <defs>
    <linearGradient id="heroBg" x1="0" y1="0" x2="1440" y2="600" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#09060e"/>
      <stop offset="45%" stop-color="#180d22"/>
      <stop offset="80%" stop-color="#2e0e19"/>
      <stop offset="100%" stop-color="#0b0710"/>
    </linearGradient>
    <radialGradient id="heroCenterGlow" cx="50%" cy="45%" r="46%">
      <stop offset="0%" stop-color="#d9381e" stop-opacity="0.26"/>
      <stop offset="55%" stop-color="#a020f0" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#09060e" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <g id="pp-artwork">
    <rect x="0" y="0" width="1440" height="600" fill="url(#heroBg)"/>
    <rect x="0" y="0" width="1440" height="600" fill="url(#heroCenterGlow)"/>
    <!-- Moldura Segura (safe margin >= 64px) -->
    <polygon points="68,68 1372,68 1372,532 68,532" fill="none" stroke="#d4af37" stroke-width="2" opacity="0.65"/>
    <polygon points="78,78 1362,78 1362,522 78,522" fill="none" stroke="#8b1a1a" stroke-width="1.2" opacity="0.6"/>
    <!-- Grandes Diamantes Ctônicos Laterais -->
    <polygon points="220,140 380,300 220,460 68,308 68,292" fill="#140c1f" stroke="#d4af37" stroke-width="2.4" opacity="0.75"/>
    <polygon points="1220,140 1372,292 1372,308 1220,460 1060,300" fill="#1c0c14" stroke="#d4af37" stroke-width="2.4" opacity="0.75"/>
    <!-- Arco Solar/Estígio Central -->
    <circle cx="720" cy="300" r="190" stroke="#d4af37" stroke-width="1.5" opacity="0.3"/>
    <polygon points="720,96 924,300 720,504 516,300" fill="none" stroke="#ff4500" stroke-width="1.6" opacity="0.35"/>
  </g>
</svg>
`;

const throneSrcPath = path.join(SRC_DIR, 'admin-throne-banner.svg');
const heroSrcPath = path.join(SRC_DIR, 'hero-underworld-banner.svg');
writeSvg(throneSrcPath, adminThroneBannerSvg);
writeSvg(heroSrcPath, heroUnderworldBannerSvg);

// Executa validação geométrica (`preflight.py check`) e exportação (`preflight.py ui-export`)
function runPreflight(args) {
  const out = execFileSync('python', [PREFLIGHT_PY, ...args], { encoding: 'utf8' });
  return JSON.parse(out);
}

console.log('\n[preflight] Validando e exportando banners e ícones via VectorCraft...');
const checkThrone = runPreflight(['check', '--product', 'ui_banner_cta', '--svg', throneSrcPath]);
console.log('[preflight check ui_banner_cta]', checkThrone.ok ? 'OK' : checkThrone);

const checkHero = runPreflight(['check', '--product', 'ui_hero_banner', '--svg', heroSrcPath]);
console.log('[preflight check ui_hero_banner]', checkHero.ok ? 'OK' : checkHero);

const exportThrone = runPreflight([
  'ui-export',
  '--in', throneSrcPath,
  '--out-dir', BANNERS_DIR,
  '--name', 'admin-throne-banner',
  '--css',
]);
console.log('[ui-export admin-throne-banner]', exportThrone.ok ? 'OK' : exportThrone);

const exportHero = runPreflight([
  'ui-export',
  '--in', heroSrcPath,
  '--out-dir', BANNERS_DIR,
  '--name', 'hero-underworld-banner',
  '--css',
]);
console.log('[ui-export hero-underworld-banner]', exportHero.ok ? 'OK' : exportHero);

for (const icon of BOON_ICONS) {
  const svgPath = path.join(ICONS_DIR, `${icon.name}.svg`);
  const res = runPreflight([
    'ui-export',
    '--in', svgPath,
    '--out-dir', ICONS_DIR,
    '--name', icon.name,
  ]);
  console.log(`[ui-export ${icon.name}]`, res.ok ? 'OK' : res);
}

console.log('\n[done] Kit de assets Hades gerado em assets/ui/hades/');
