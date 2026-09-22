/**
 * Smoke Task 4 — páginas e módulos ClassInd-dle UI
 * Uso: node tests/classind-dle-pages-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    errors.push(`Ausente: ${rel}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

const files = [
  'pages/classind-dle.html',
  'css/classind-dle.css',
  'js/classind-dle/index.js',
  'js/classind-dle/realtime.js',
  'js/classind-dle/supabase-browser.js',
  'js/classind-dle/ui/RoomLobby.js',
  'js/classind-dle/ui/VoteBoard.js',
  'js/classind-dle/ui/RevealCard.js',
  'js/classind-dle/ui/HostControls.js',
  'js/classind-dle/ui/ResultsPanel.js',
  'js/classind-dle/ui/RankingPanel.js',
  'js/classind-dle/config/rounds.js',
];

files.forEach((rel) => assert(fs.existsSync(path.join(root, rel)), `Ausente: ${rel}`));

const html = read('pages/classind-dle.html');
assert(html.includes('classind-dle.css'), 'HTML linka CSS');
assert(html.includes('js/classind-dle/index.js'), 'HTML carrega index.js');
assert(html.includes('id="classind-board"'), 'container board');
assert(html.includes('id="classind-host"'), 'container host');
assert(html.includes('id="classind-reveal"'), 'container reveal');
assert(html.includes('data-route="classind-dle"'), 'data-route classind-dle');
assert(!html.includes('discovery-overlay'), 'HTML dle sem overlay de discovery');

const index = read('js/classind-dle/index.js');
assert(!index.includes('enqueueDiscovery'), 'dle não dispara discovery');
assert(!index.includes('bindLessonDiscoveryLifecycle'), 'dle sem ciclo de discovery');
assert(!index.includes('notifyAwarded'), 'dle sem notifyAwarded');
assert(index.includes('createRealtimeSync'), 'index usa realtime');
assert(index.includes('classindCastVote'), 'index vota via API');
assert(index.includes('classindCreateRoom'), 'index cria sala');
assert(index.includes('classindShowRanking'), 'index abre ranking');
assert(index.includes('renderResultsPanel'), 'index renderiza desempenho');
assert(index.includes('renderRankingPanel'), 'index renderiza ranking');
assert(index.includes("phase === 'results'"), 'trata phase results');
assert(index.includes("phase === 'ranking'"), 'trata phase ranking');
assert(index.includes('needsEndSessionResync'), 'resync fim de sessão quando falta placar/ranking');
assert(index.includes('resyncEndSessionState') || index.includes('scheduleEndSessionResync'), 'agenda getState no fim');
assert(index.includes('leaveClosedRoom'), 'aluno sai ao phase closed');
assert(index.includes("phase === 'closed'"), 'trata phase closed sem roster');
assert(index.includes('keydown'), 'atalhos A/B');
assert(index.includes('function mergeState'), 'mergeState presente');
assert(
  /hasOwnProperty\.call\(next,\s*['"]myVote['"]\)/.test(index)
    || /Object\.prototype\.hasOwnProperty\.call\(next,\s*['"]myVote['"]\)/.test(index),
  'mergeState não reaproveita myVote antigo com ??'
);
assert(/myVoteLocal\s*=\s*null/.test(index), 'reset myVoteLocal em nova rodada');
assert(/canVote\s*=\s*!isHostViewer\s*&&\s*phase\s*===\s*['"]voting['"]/.test(index), 'canVote deriva de host/admin + phase');
assert(index.includes('hostUserId'), 'client usa hostUserId');
assert(index.includes('renderStudentRoster'), 'aluno vê roster');
assert(index.includes('scoreCorrect'), 'UI placar de acertos');
assert(/confirm\(['"]Encerrar esta sala/.test(index), 'confirm ao Encerrar sala');

const resultsUi = read('js/classind-dle/ui/ResultsPanel.js');
assert(resultsUi.includes('Seu desempenho') || resultsUi.includes('Desempenho da turma'), 'ResultsPanel copy');
assert(resultsUi.includes('Ver ranking'), 'CTA Ver ranking');
assert(resultsUi.includes('Sincronizando desempenho'), 'ResultsPanel aguarda sync sem mentir não-voto');
assert(resultsUi.includes('scoreTotal') || resultsUi.includes('rounds.length'), 'denominador por rodadas reveladas');
assert(
  resultsUi.indexOf('rounds.length') < resultsUi.indexOf('Você não votou'),
  'mensagem “não votou” só quando há myPerformance sem rounds'
);

const rankingUi = read('js/classind-dle/ui/RankingPanel.js');
assert(rankingUi.includes('Ranking'), 'RankingPanel título');
assert(rankingUi.includes('Encerrar sala'), 'RankingPanel encerra');

const voteBoard = read('js/classind-dle/ui/VoteBoard.js');
assert(
  voteBoard.indexOf("phase === 'results'") < voteBoard.indexOf("phase === 'lobby'"),
  'VoteBoard checa results/ranking antes do lobby genérico'
);
assert(voteBoard.includes('Acertos'), 'VoteBoard mostra Acertos');
assert(voteBoard.includes('canVote'), 'VoteBoard respeita canVote');

const host = read('js/classind-dle/ui/HostControls.js');
assert(host.includes('Encerrar sala'), 'botão Encerrar sala');
assert(host.includes('classind-host__close') || host.includes('data-host="close"'), 'host close wired');
assert(host.includes('renderStudentRoster'), 'roster exportado para aluno');
assert(host.includes('Quem está na sala') || host.includes('Participantes'), 'rótulo de lista');

const reveal = read('js/classind-dle/ui/RevealCard.js');
assert(reveal.includes('Mestre — não vota'), 'reveal admin sem “você não votou”');
assert(reveal.includes('isHost'), 'reveal recebe isHost');

const lobby = read('js/classind-dle/ui/RoomLobby.js');
assert(lobby.includes('toUpperCase'), 'código forçado maiúsculo');
assert(lobby.includes('classind-join-code'), 'input de código');
assert(lobby.includes('bindUppercaseCodeInput') || lobby.includes('autocapitalize'), 'uppercase no input');

const rounds = read('js/classind-dle/config/rounds.js');
assert(rounds.includes('shuffleDeckOrder'), 'shuffle por sala');
assert(rounds.includes('deckOrder') || /getRoundByIndex\(index,\s*deckOrder/.test(rounds), 'getRoundByIndex aceita deckOrder');
assert(!/Cenário A|Cenário B|aliens-vs-corpses/i.test(rounds), 'sem rodada de cenários textuais');
assert(rounds.includes('undertale.webp') && rounds.includes('hotline-miami.webp'), 'r3 Undertale vs Hotline');
assert(rounds.includes('mortal-kombat-11.webp') && rounds.includes('street-fighter-6.webp'), 'r1 com capas');

const css = read('css/classind-dle.css');
assert(css.includes('.classind-board'), 'CSS board');
assert(css.includes('.classind-results'), 'CSS resultados');
assert(css.includes('.classind-ranking'), 'CSS ranking');
assert(css.includes('@media (min-width: 800px)'), 'layout telão');
assert(css.includes('prefers-reduced-motion'), 'reduced motion');
assert(css.includes('classind-host__close') || css.includes('--danger') || /close/i.test(css), 'estilo Encerrar sala');
assert(css.includes('classind-join-code') || css.includes('text-transform: uppercase'), 'CSS uppercase código');
assert(css.includes('classind-roster'), 'CSS roster');
assert(/max-width:\s*220px/.test(css) || /width:\s*min\(100%,\s*220px\)/.test(css), 'capa em tamanho retrato limitado');

assert(fs.existsSync(path.join(root, 'assets/classind-dle/covers/mortal-kombat-11.webp')), 'capa MK11');
assert(fs.existsSync(path.join(root, 'assets/classind-dle/covers/street-fighter-6.webp')), 'capa SF6');
assert(fs.existsSync(path.join(root, 'assets/classind-dle/covers/undertale.webp')), 'capa Undertale');
assert(fs.existsSync(path.join(root, 'assets/classind-dle/covers/hotline-miami.webp')), 'capa Hotline');
assert(fs.existsSync(path.join(root, 'assets/slides/diagrama-das-faixas-etarias.png')), 'diagrama faixas slides');

const realtime = read('js/classind-dle/realtime.js');
assert(realtime.includes('postgres_changes'), 'subscribe postgres_changes');
assert(realtime.includes('classind_live_snapshots'), 'filtra live_snapshots');
assert(realtime.includes('FALLBACK_POLL_MS') || realtime.includes('4000'), 'fallback poll');
assert(realtime.includes('visibilitychange'), 'resync on visible');

const browser = read('js/classind-dle/supabase-browser.js');
assert(browser.includes('esm.sh/@supabase/supabase-js'), 'supabase via esm.sh');
assert(browser.includes('createClient'), 'createClient');

const apiJs = read('js/api.js');
assert(apiJs.includes('classindDle:'), 'ROUTES.classindDle');
assert(apiJs.includes('classindShowRanking'), 'api classindShowRanking');

const aula5 = read('pages/aula5.html');
assert(aula5.includes('classind-dle.html') || aula5.includes('cta-classind-dle'), 'aula5 CTA dle');

// syntax check via node --check for local modules (not dynamic CDN)
for (const rel of [
  'js/classind-dle/index.js',
  'js/classind-dle/realtime.js',
  'js/classind-dle/supabase-browser.js',
  'js/classind-dle/ui/RoomLobby.js',
  'js/classind-dle/ui/VoteBoard.js',
  'js/classind-dle/ui/RevealCard.js',
  'js/classind-dle/ui/HostControls.js',
  'js/classind-dle/ui/ResultsPanel.js',
  'js/classind-dle/ui/RankingPanel.js',
  'js/classind-dle/config/rounds.js',
]) {
  try {
    require('child_process').execFileSync(process.execPath, ['--check', path.join(root, rel)], {
      stdio: 'pipe',
    });
  } catch (error) {
    errors.push(`syntax ${rel}: ${error.stderr?.toString() || error.message}`);
  }
}

if (errors.length) {
  console.error('classind-dle-pages-smoke FALHOU:');
  errors.forEach((e) => console.error(` - ${e}`));
  process.exit(1);
}

console.log('classind-dle-pages-smoke OK');
