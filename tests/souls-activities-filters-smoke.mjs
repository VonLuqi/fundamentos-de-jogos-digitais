/**
 * Smoke Tasks 3–5 — DTO, agrupamento, aba Atividades e filtros
 * (docs/plano-relatorio-admin-atividades-filtros.md).
 *
 * Uso: node tests/souls-activities-filters-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  deliveredLessonCount,
  emptyReportFilters,
  groupActivitiesByUser,
  hasUniqueRelic,
  lessonChipLabel,
  lessonHeading,
  matchesSoulFilters,
  orderedDeliveredActivities,
  parseActivityOffer,
  parseReportFilters,
  writeReportFilterParams,
} from '../js/souls-report.js';
import {
  composeLessonRecord,
  CONFIG_NOTES_END,
  CONFIG_NOTES_START,
} from '../js/lesson-paragraph.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function listUsersMapper(src) {
  const start = src.indexOf("if (action === 'listUsers')");
  assert.ok(start >= 0, 'api/progress.js precisa da action listUsers');
  const nextAction = src.indexOf('return res.status(400)', start);
  return src.slice(start, nextAction > start ? nextAction : start + 4000);
}

const progressApi = read('api/progress.js');
const mapper = listUsersMapper(progressApi);

assert.match(mapper, /userId:\s*activityUser\.id/, 'listUsers precisa mapear userId em cada activity');
assert.match(
  mapper,
  /avatarIndex:\s*Number\(activityUser\.avatar_index/,
  'listUsers precisa mapear avatarIndex em cada activity'
);
assert.doesNotMatch(
  mapper,
  /completedLessons:/,
  'activities não devem ganhar completedLessons (fica em users[])'
);

const soulsJs = read('js/souls.js');
assert.ok(
  soulsJs.includes("from './souls-report.js'"),
  'souls.js precisa importar groupActivitiesByUser de souls-report.js'
);
assert.ok(
  soulsJs.includes('groupActivitiesByUser('),
  'souls.js precisa agrupar atividades no load'
);

const ana = {
  id: 1,
  fullName: 'Ana Souza',
  username: 'ana',
  turma: 'TCG01',
  role: 'student',
  avatarIndex: 3,
};
const bruno = {
  id: 2,
  fullName: 'Bruno Lima',
  username: 'bruno',
  turma: 'TCG02',
  role: 'student',
  avatarIndex: 7,
};
const mestre = {
  id: 99,
  fullName: 'Mestre',
  username: 'admin',
  turma: 'TCG01',
  role: 'admin',
  avatarIndex: 0,
};

const activities = [
  {
    userId: 1,
    lessonId: 'aula1',
    paragraph: 'Síntese da Ana',
    updatedAt: '2026-09-10T12:00:00.000Z',
    fullName: 'Ana Souza',
    username: 'ana',
    turma: 'TCG01',
    avatarIndex: 3,
  },
  {
    userId: 2,
    lessonId: 'aula2',
    paragraph: 'Síntese do Bruno',
    updatedAt: '2026-09-14T18:00:00.000Z',
    fullName: 'Bruno Lima',
    username: 'bruno',
    turma: 'TCG02',
    avatarIndex: 7,
  },
  {
    userId: 1,
    lessonId: 'aula3',
    paragraph: 'Aula 3 da Ana',
    updatedAt: '2026-09-11T09:00:00.000Z',
    fullName: 'Ana Souza',
    username: 'ana',
    turma: 'TCG01',
    avatarIndex: 3,
  },
  {
    userId: 99,
    lessonId: 'aula1',
    paragraph: 'Não deve aparecer',
    updatedAt: '2026-09-15T00:00:00.000Z',
    fullName: 'Mestre',
    username: 'admin',
    turma: 'TCG01',
    avatarIndex: 0,
  },
];

const grouped = groupActivitiesByUser([ana, bruno, mestre], activities);
assert.equal(grouped.length, 2, 'admin e alunos sem oferenda ficam de fora');
assert.equal(grouped[0].user.username, 'bruno', 'dono mais recente vem primeiro');
assert.equal(grouped[1].user.username, 'ana');
assert.deepEqual(
  grouped[0].activities.map((item) => item.lessonId),
  ['aula2']
);
assert.deepEqual(
  grouped[1].activities.map((item) => item.lessonId),
  ['aula1', 'aula3']
);

assert.deepEqual(groupActivitiesByUser(null, null), []);
assert.deepEqual(groupActivitiesByUser([ana], []), []);
assert.equal(
  groupActivitiesByUser([ana], [{ userId: 1, lessonId: 'aula1', updatedAt: '2026-09-01' }]).length,
  1
);

const stringIds = groupActivitiesByUser(
  [{ ...ana, id: 1 }],
  [{ userId: '1', lessonId: 'aula1', updatedAt: '2026-09-01' }]
);
assert.equal(stringIds.length, 1, 'userId string deve casar com id numérico');

const catalog = [
  { id: 'aula1', number: '01', title: 'O Círculo Mágico e a Interface Amigável da Engine' },
  { id: 'aula2', number: '02', title: 'O Glossário do Desenvolvedor e o Player na Tela' },
  { id: 'aula3', number: '03', title: 'Homo Ludens, Identidade e Expressão Cultural' },
  { id: 'aula4', number: '04', title: 'A Linha do Tempo das Plataformas e as Restrições Técnicas' },
];

assert.equal(
  lessonHeading('aula1', catalog),
  '01 — O Círculo Mágico e a Interface Amigável da Engine'
);
assert.equal(lessonChipLabel(catalog[0]), 'Aula 01');
assert.equal(deliveredLessonCount(grouped[0].activities, catalog), 1);
assert.equal(deliveredLessonCount(grouped[1].activities, catalog), 2);

const ordered = orderedDeliveredActivities(
  [
    { lessonId: 'aula3', paragraph: 'c', updatedAt: '2026-09-14T00:00:00.000Z' },
    { lessonId: 'aula1', paragraph: 'a', updatedAt: '2026-09-10T00:00:00.000Z' },
  ],
  catalog
);
assert.deepEqual(
  ordered.map((item) => item.lessonId),
  ['aula1', 'aula3'],
  'seções seguem a ordem do catálogo LESSONS, não a data'
);

const both = parseActivityOffer(
  composeLessonRecord('Síntese visível.', 'Anotação da prática.')
);
assert.equal(both.summary, 'Síntese visível.');
assert.equal(both.notes, 'Anotação da prática.');
assert.equal(both.empty, false);
assert.ok(!both.summary.includes('==='), 'síntese não pode vazar marcador');
assert.ok(!both.notes.includes('==='), 'notas não podem vazar marcador');

const onlySummary = parseActivityOffer(composeLessonRecord('Só síntese', ''));
assert.equal(onlySummary.notes, '');
assert.equal(onlySummary.summary, 'Só síntese');

const onlyNotes = parseActivityOffer(composeLessonRecord('', 'Só prática'));
assert.equal(onlyNotes.summary, '');
assert.equal(onlyNotes.notes, 'Só prática');

const vacant = parseActivityOffer(`${CONFIG_NOTES_START}\n\n${CONFIG_NOTES_END}`);
assert.equal(vacant.empty, true);
assert.equal(vacant.summary, '');
assert.equal(vacant.notes, '');

const soulsHtml = read('pages/souls.html');
const activityIds = [
  'activity-owners',
  'activity-detail',
  'activity-detail-title',
  'activity-detail-close',
  'activity-trail-map',
  'activity-lessons',
];
for (const id of activityIds) {
  assert.ok(soulsHtml.includes(`id="${id}"`), `souls.html precisa de #${id}`);
}
assert.ok(soulsHtml.includes('activity-layout'), 'souls.html precisa do layout 2 colunas');
assert.ok(!soulsHtml.includes('id="activities-list"'), '#activities-list deve ter sumido');

assert.ok(!soulsJs.includes('GDD - Integracao documental'), 'título hardcoded GDD precisa sumir');
assert.ok(soulsJs.includes('openOwnerActivities'), 'souls.js precisa abrir o detalhe do aluno');
assert.ok(soulsJs.includes('LESSONS'), 'títulos das seções vêm de LESSONS');
assert.ok(soulsJs.includes("searchParams.set('u'"), 'deep link precisa gravar ?u=');
assert.ok(soulsJs.includes("searchParams.get('u')"), 'deep link precisa ler ?u=');
assert.ok(soulsJs.includes('Síntese'), 'bloco Síntese no detalhe');
assert.ok(soulsJs.includes('Anotações da prática'), 'bloco Anotações da prática no detalhe');
assert.ok(soulsJs.includes('Enviou') && soulsJs.includes('Ausente'), 'chips do mapa Enviou/Ausente');
assert.ok(
  soulsJs.includes('Nenhuma oferenda na Trilha ainda.'),
  'empty da lista de perfis'
);

const soulsCss = read('css/souls.css');
assert.match(
  soulsCss,
  /\.activity-layout\s*\{[^}]*minmax\(0,\s*320px\)/,
  'activity-layout precisa do grid da Vigília'
);
assert.ok(soulsCss.includes('.trail-chip'), 'css precisa de .trail-chip');
assert.ok(soulsCss.includes('.activity-lesson'), 'css precisa de .activity-lesson');
assert.match(
  soulsCss,
  /@media \(max-width: 900px\)[\s\S]*\.activity-layout/,
  'aba Atividades empilha em 900px'
);

const filterIds = [
  'report-filters',
  'filter-q',
  'filter-turma',
  'filter-completed',
  'filter-viewed',
  'filter-activity',
  'filter-need-all',
  'filter-no-activity',
  'filter-unique',
  'filter-clear',
  'filter-count',
];
for (const id of filterIds) {
  assert.ok(soulsHtml.includes(`id="${id}"`), `souls.html precisa de #${id}`);
}
assert.ok(soulsHtml.includes('Buscar alma…'), 'placeholder congelado da busca');
assert.ok(soulsHtml.includes('Limpar véu'), 'copy Limpar véu');
assert.ok(soulsHtml.includes('Exigir todas as marcadas'), 'copy exigir todas');
assert.ok(soulsHtml.includes('Sem oferenda'), 'copy Sem oferenda');
assert.ok(soulsCss.includes('.report-filters'), 'souls.css precisa da barra de filtros');
assert.ok(soulsCss.includes('.filter-chip'), 'souls.css precisa de .filter-chip');
assert.ok(soulsCss.includes('.relic-pill'), 'souls.css precisa da pílula Única');

assert.ok(soulsJs.includes('getAchievementRarity'), 'Única usa getAchievementRarity');
assert.ok(soulsJs.includes('matchesSoulFilters'), 'souls.js aplica matchesSoulFilters');
assert.ok(
  !soulsJs.includes('soberano_do_submundo'),
  'filtro Única não pode hardcodar soberano_do_submundo'
);
assert.ok(soulsJs.includes('Nenhuma alma neste véu.'), 'empty do filtro');

const rarityOf = (id) => (id === 'relic_x' ? 'unique' : 'gold');
assert.equal(hasUniqueRelic(['soberano_do_submundo'], rarityOf), false);
assert.equal(hasUniqueRelic(['relic_x'], rarityOf), true);

const carla = {
  id: 3,
  fullName: 'Carla Nunes',
  username: 'carla',
  turma: 'TCG02',
  completedLessons: ['aula1'],
  viewedLessons: [{ lessonId: 'aula1' }],
  achievements: ['relic_x'],
};
const dora = {
  id: 4,
  fullName: 'Dora',
  username: 'dora',
  turma: 'TCG02',
  completedLessons: ['aula1', 'aula2'],
  viewedLessons: [{ lessonId: 'aula2' }],
  achievements: ['soberano_do_submundo'],
};
const eva = {
  id: 5,
  fullName: 'Éva Souza',
  username: 'eva',
  turma: 'TCG01',
  completedLessons: [],
  viewedLessons: [],
  achievements: [],
};

const filterUsers = [
  {
    user: { ...ana, completedLessons: ['aula1'], viewedLessons: [{ lessonId: 'aula1' }], achievements: [] },
    activities: [{ lessonId: 'aula1' }],
  },
  {
    user: { ...bruno, completedLessons: ['aula2'], viewedLessons: [{ lessonId: 'aula2' }], achievements: [] },
    activities: [{ lessonId: 'aula2' }],
  },
  {
    user: carla,
    activities: [{ lessonId: 'aula1' }, { lessonId: 'aula3' }],
  },
  {
    user: dora,
    activities: [{ lessonId: 'aula1' }],
  },
  {
    user: eva,
    activities: [],
  },
];

function namesMatching(partial) {
  return filterUsers
    .filter((row) => matchesSoulFilters(row, { ...emptyReportFilters(), ...partial }, { rarityOf }))
    .map((row) => row.user.username);
}

assert.deepEqual(
  namesMatching({ turmas: ['TCG02'], activity: ['aula1'] }).sort(),
  ['carla', 'dora'],
  'TCG02 + Aula 01 combina facetas com E e aulas com OU'
);
assert.deepEqual(
  namesMatching({ activity: ['aula1', 'aula3'], needAll: true }),
  ['carla'],
  'Exigir todas as marcadas pede ⊆ nas aulas'
);
assert.deepEqual(
  namesMatching({ noActivity: true, activity: ['aula1'] }),
  ['eva'],
  'Sem oferenda vence a faceta Enviou em'
);
assert.deepEqual(
  namesMatching({ unique: true }),
  ['carla'],
  'Única olha raridade, não o id soberano_do_submundo'
);
assert.deepEqual(namesMatching({ q: '@BRUNO' }), ['bruno']);
assert.deepEqual(namesMatching({ q: 'eva souza' }), ['eva']);
assert.deepEqual(
  filterUsers
    .filter((row) => matchesSoulFilters(row, { ...emptyReportFilters(), q: 'eva' }, {
      scope: 'activities',
      rarityOf,
    }))
    .map((row) => row.user.username),
  [],
  'aba Atividades não lista quem não enviou, mesmo se a busca bate'
);

const parsed = parseReportFilters('q=@ana&turma=TCG01,TCG02&aula=aula1,aula3&concluiu=aula2&viu=aula1&need=all&sem=1&unica=1');
assert.deepEqual(parsed.turmas, ['TCG01', 'TCG02']);
assert.deepEqual(parsed.activity, ['aula1', 'aula3']);
assert.equal(parsed.needAll, true);
assert.equal(parsed.noActivity, true);
assert.equal(parsed.unique, true);

const roundtrip = new URL('https://example.test/pages/souls.html');
writeReportFilterParams(roundtrip, parsed);
assert.equal(roundtrip.searchParams.get('need'), 'all');
assert.equal(roundtrip.searchParams.get('sem'), '1');
assert.equal(roundtrip.searchParams.get('unica'), '1');
assert.equal(roundtrip.searchParams.get('aula'), 'aula1,aula3');

const pkg = read('package.json');
assert.ok(pkg.includes('js/souls-report.js'), 'package.json check precisa de node --check no agrupador');
assert.ok(pkg.includes('js/souls.js'), 'package.json check precisa de node --check em souls.js');
assert.ok(pkg.includes('tests/souls-report-overflow-smoke.mjs'), 'check precisa do smoke de overflow');
assert.ok(pkg.includes('tests/lesson-paragraph-smoke.mjs'), 'check precisa do smoke do parser');
assert.ok(
  pkg.includes('tests/souls-activities-filters-smoke.mjs'),
  'package.json check precisa deste smoke'
);

const readme = read('README.md');
assert.ok(readme.includes('/pages/souls.html'), 'README aponta Almas Registradas');
assert.ok(readme.includes('relíquia Única'), 'README menciona filtros/Única na área admin');
assert.ok(!readme.includes('/api/souls'), 'não inventar rota nova; listUsers segue em /api/progress');

console.log('OK souls-activities-filters-smoke (Tasks 3–6 DTO + aba Atividades + filtros + README)');
