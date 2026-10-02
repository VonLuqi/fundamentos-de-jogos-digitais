/**
 * Smoke — VFX pódio top 4 (Placar + Painel).
 * Uso: node tests/podium-vfx-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyPodiumClasses,
  clearPodiumClasses,
  podiumTierForRank,
  PODIUM_TIERS,
} from '../js/podium-vfx.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const expected = [
  [1, 'rainbow', 'Arco-íris', 'is-podium-1'],
  [2, 'gold', 'Ouro', 'is-podium-2'],
  [3, 'silver', 'Prata', 'is-podium-3'],
  [4, 'copper', 'Cobre', 'is-podium-4'],
];

for (const [rank, tier, label, className] of expected) {
  const podium = podiumTierForRank(rank);
  staticAssert(podium?.tier === tier, `rank ${rank} → tier ${tier}`);
  staticAssert(podium?.label === label, `rank ${rank} → label ${label}`);
  staticAssert(podium?.className === className, `rank ${rank} → ${className}`);
}

staticAssert(podiumTierForRank(0) === null, 'rank 0 sem pódio');
staticAssert(podiumTierForRank(5) === null, 'rank 5 sem pódio');
staticAssert(podiumTierForRank(null) === null, 'rank null sem pódio');
staticAssert(PODIUM_TIERS.length === 4, '4 tiers no mapa');

const classSet = new Set();
const fakeEl = {
  classList: {
    add: (c) => classSet.add(c),
    remove: (c) => classSet.delete(c),
  },
  dataset: {},
};
applyPodiumClasses(fakeEl, 2);
staticAssert(classSet.has('is-podium-2'), 'applyPodiumClasses adiciona is-podium-2');
staticAssert(fakeEl.dataset.podiumRank === '2', 'dataset.podiumRank');
clearPodiumClasses(fakeEl);
staticAssert(!classSet.has('is-podium-2'), 'clearPodiumClasses remove is-podium-2');

const rankingJs = read('js/ranking.js');
const dashboardJs = read('js/dashboard.js');
const rankingCss = read('css/ranking.css');
const dashboardCss = read('css/dashboard.css');
const dashboardHtml = read('pages/dashboard.html');
const pkg = read('package.json');

staticAssert(rankingJs.includes("from './podium-vfx.js'"), 'ranking importa podium-vfx');
staticAssert(rankingJs.includes('ranking-table__name'), 'ranking renderiza nome estilizado');
staticAssert(rankingJs.includes('is-podium-glitch'), 'ranking marca top 1 com glitch');
staticAssert(rankingJs.includes('applyPodiumNameGlitch'), 'ranking aplica glitch no nome');
staticAssert(rankingCss.includes('ranking-table__name--podium-1'), 'CSS nome podium-1');
staticAssert(rankingCss.includes('podiumNameGlitchA'), 'CSS glitch keyframes');
staticAssert(dashboardCss.includes('profile-panel__name.is-podium-glitch'), 'dashboard nome glitch');

staticAssert(dashboardJs.includes("from './podium-vfx.js'"), 'dashboard importa podium-vfx');
staticAssert(dashboardJs.includes('leaderboardGet'), 'dashboard chama leaderboardGet');
staticAssert(dashboardJs.includes("scope: 'turma'"), 'dashboard scope turma');
staticAssert(dashboardJs.includes("sort: 'xp'"), 'dashboard sort xp');
staticAssert(dashboardJs.includes('refreshDashboardPodium'), 'dashboard refreshDashboardPodium');
staticAssert(dashboardJs.includes('applyPodiumClasses(panel'), 'dashboard aplica no profile-panel');
staticAssert(dashboardJs.includes('applyPodiumClasses(frame'), 'dashboard aplica no avatar-frame');
staticAssert(dashboardJs.includes('ranking-preview-summary'), 'dashboard atualiza preview');

staticAssert(dashboardHtml.includes('id="ranking-preview-summary"'), 'HTML ranking-preview-summary');

for (let i = 1; i <= 4; i += 1) {
  staticAssert(rankingCss.includes(`.is-podium-${i}`), `ranking.css .is-podium-${i}`);
  staticAssert(dashboardCss.includes(`.is-podium-${i}`), `dashboard.css .is-podium-${i}`);
}

staticAssert(pkg.includes('podium-vfx-smoke.mjs'), 'check inclui podium-vfx-smoke');
staticAssert(pkg.includes('js/podium-vfx.js'), 'check faz node --check podium-vfx');

if (errors.length) {
  console.error('podium-vfx-smoke:');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

console.log('podium-vfx-smoke OK');
console.log('  · mapa 1→rainbow … 4→copper');
console.log('  · ranking + dashboard classes');
console.log('  · CSS is-podium-1..4');
