/**
 * Smoke — fechamento de notas da turma (100 pts): GradeCalculator (PHP CLI, sem banco) + checagens estáticas.
 *
 * Uso: node tests/turma-grades-smoke.mjs   (requer `php` no PATH)
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

// ---------------------------------------------------------------------------
// Estático
// ---------------------------------------------------------------------------
const ctrl = read('backend/src/Controllers/TurmaGradesController.php');
const svc = read('backend/src/Services/Grades/TurmaGradesService.php');
const index = read('backend/index.php');
assert.ok(index.includes("case 'turma-grades':") && index.includes('TurmaGradesController::handle()'), 'rota turma-grades registrada');
for (const a of ['myGrade', 'adminGradebook', 'adminClose', 'adminReopen', 'adminCsv']) {
  assert.ok(ctrl.includes(`'${a}'`), `controller suporta ${a}`);
}
// admin-only: toda ação admin* passa por isAdmin antes do switch
assert.ok(/str_starts_with\(\$action, 'admin'\)[\s\S]*?SessionService::isAdmin\(\$user\)[\s\S]*?switch \(\$action\)/.test(ctrl), 'ações admin* exigem isAdmin');
// close: 409 com pendentes sem force; auditoria em close e reopen
assert.ok(svc.includes("'status' => 409") && svc.includes('$pending !== [] && !$force'), 'close devolve 409 com pendentes sem force');
assert.ok(ctrl.includes("ACTIONS['closeTurmaGrades']") && ctrl.includes("ACTIONS['reopenTurmaGrades']"), 'close/reopen auditados');
assert.ok(read('backend/src/Core/AdminAudit.php').includes("'closeTurmaGrades' => 'admin_close_turma_grades'"), 'ações no AdminAudit');
// aluno só vê com turma fechada
assert.ok(/studentGrade[\s\S]*?\$closure\['status'\] !== 'closed'[\s\S]*?\['closed' => false\]/.test(svc), 'aluno bloqueado antes do fechamento');
// turma não-string (array/int/bool) → 400, sem cast silencioso
assert.ok(/if \(!is_string\(\$rawTurma\)\) \{\s*Http::json\(400/.test(ctrl), 'turma não-string devolve 400');
assert.ok(!/\(string\) \(\$method === 'GET' \? Http::query\('turma'\)/.test(ctrl), 'sem cast (string) em turma');
// aluno movido para a turma após o fechamento: closed + missing, nunca "closed:false"
assert.ok(/\['closed' => true, 'missing' => true, 'closedAt' =>/.test(svc), 'myGrade closed+missing sem snapshot');
// gradebook marca inSnapshot e lista missingFromSnapshot quando fechada
assert.ok(ctrl.includes("'inSnapshot'") && ctrl.includes("'missingFromSnapshot' => $missing"), 'gradebook expõe inSnapshot/missingFromSnapshot');
// close(): checagem de "já fechada" dentro da transação, sob FOR UPDATE
assert.ok(/beginTransaction\(\);[\s\S]*?FOR UPDATE[\s\S]*?=== false[\s\S]*?INSERT IGNORE INTO `turma_grade_closures`[\s\S]*?=== 'closed'/.test(svc), 'close() faz SELECT FOR UPDATE primeiro e só insere a linha se ausente');
// deadlock 1213/40001: uma nova tentativa, depois 409 "em andamento"; rollback só se ainda em transação
assert.ok(/for \(\$attempt = 1; \$attempt <= 2; \$attempt\+\+\)/.test(svc) && svc.includes("=== '40001'") && svc.includes('=== 1213'), 'retry em deadlock 1213/40001');
assert.ok(svc.includes('Fechamento em andamento') && svc.includes('$pdo->inTransaction()'), '409 após retry + rollback seguro');
// datas ISO-8601 com offset (sessão MySQL em UTC): closedAt/reopenedAt via sqlToIso
assert.equal((svc.match(/Database::sqlToIso\(/g) || []).length, 3, 'closedAt (closure+snapshot) e reopenedAt via sqlToIso');
// turma só aceita as turmas válidas (ProgressShared::VALID_TURMAS) → 400
assert.ok(/in_array\(\$turma, ProgressShared::VALID_TURMAS, true\)[\s\S]*?Http::json\(400/.test(ctrl), 'turma fora da whitelist devolve 400');
// schema + migração
for (const f of ['db/migrate-2026-11-16-turma-grades.sql', 'db/mysql/schema.sql']) {
  const sql = read(f);
  assert.ok(sql.includes('turma_grade_closures') && sql.includes('turma_grade_snapshots'), `${f} tem as tabelas`);
}
assert.ok(read('js/api.js').includes('turmaGradesAdminClose') && read('js/api.js').includes('turmaGradesMyGrade'), 'client js/api.js');

// ---------------------------------------------------------------------------
// Cálculo (PHP real)
// ---------------------------------------------------------------------------
const php = spawnSync('php', ['-v'], { encoding: 'utf8' });
if (php.status !== 0) {
  console.log('turma-grades-smoke: php ausente — só checagens estáticas OK');
  process.exit(0);
}

const script = `<?php
spl_autoload_register(function ($c) {
  $p = ${JSON.stringify(path.join(root, 'backend/src'))} . '/' . str_replace('\\\\', '/', substr($c, 4)) . '.php';
  if (strncmp($c, 'App\\\\', 4) === 0 && is_file($p)) require $p;
});
use App\\Services\\Grades\\GradeCalculator as G;
use App\\Services\\Grades\\TurmaGradesService as S;
$all = G::LESSONS;
$out = [
  'full' => G::compute($all, $all, ['m1' => 20, 'm2' => 20, 'tf' => 30]),
  'empty' => G::compute([], [], []),
  'partial' => G::compute(['aula1','aula2','aula3'], ['aula1','aula2'], ['m1' => 13.5, 'm2' => null, 'tf' => 30]),
  'overflow' => G::compute($all, $all, ['m1' => 99, 'm2' => -4, 'tf' => 0]),
  'dup' => G::compute(['aula1','aula1','aulaX'], ['aula9'], ['m1' => 0, 'm2' => 0, 'tf' => 0]),
];
$m = new ReflectionMethod(S::class, 'csvLine'); $m->setAccessible(true);
$out['csv'] = $m->invoke(null, ['Ana, "A"', '1A', 10.0, 20.0, 13.5, 0.0, 30.0, 73.5]);
$out['csvFormula'] = $m->invoke(null, ['=HYPERLINK("x")', '1A', 0.0]);
$out['csvEmpty'] = $m->invoke(null, ['', '1A', 0.0]);
$out['iso'] = App\\Core\\Database::sqlToIso('2026-11-16 15:25:00.123');
echo json_encode($out);
`;
const tmp = path.join(root, 'tmp');
fs.mkdirSync(tmp, { recursive: true });
const file = path.join(tmp, 'turma-grades-smoke.php');
fs.writeFileSync(file, script);
const run = spawnSync('php', [file], { encoding: 'utf8' });
fs.rmSync(file, { force: true });
assert.equal(run.status, 0, `php falhou: ${run.stderr || run.stdout}`);
const r = JSON.parse(run.stdout);

// aluno completo = 100
assert.equal(r.full.total, 100);
assert.deepEqual([r.full.codes, r.full.entregas, r.full.m1, r.full.m2, r.full.tf], [10, 20, 20, 20, 30]);
assert.deepEqual(r.full.pending, []);
// vazio = 0 e três pendências
assert.equal(r.empty.total, 0);
assert.deepEqual(r.empty.pending, ['m1', 'm2', 'tf']);
// parcial: 3*1.25 + 2*2.5 + 13.5 + 0 + 30 = 52.25; M2 pendente
assert.equal(r.partial.codes, 3.75);
assert.equal(r.partial.entregas, 5);
assert.equal(r.partial.total, 52.25);
assert.deepEqual(r.partial.pending, ['m2']);
// limites: nota acima do máximo é cortada, negativa vira 0
assert.equal(r.overflow.m1, 20);
assert.equal(r.overflow.m2, 0);
assert.equal(r.overflow.total, 10 + 20 + 20 + 0 + 0);
// duplicatas e aulas inexistentes não contam
assert.equal(r.dup.codes, 1.25);
assert.equal(r.dup.entregas, 0);
// nota 0 gravada ≠ pendente
assert.deepEqual(r.dup.pending, []);
// CSV
assert.equal(r.csv, '"Ana, ""A""",1A,10,20,13.5,0,30,73.5');
assert.ok(r.csvFormula.startsWith("\"'=HYPERLINK") || r.csvFormula.startsWith("'=HYPERLINK"), 'CSV neutraliza fórmula');

// nome vazio fica célula vazia (não '0')
assert.equal(r.csvEmpty, ',1A,0');
// closedAt: ISO-8601 com offset explícito (new Date(iso) no front não depende do fuso local)
assert.match(r.iso, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
assert.equal(new Date(r.iso).toISOString(), '2026-11-16T15:25:00.123Z');

console.log('turma-grades-smoke: OK');
