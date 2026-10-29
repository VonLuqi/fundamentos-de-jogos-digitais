/**
 * Smoke — Prova multi-exame (M1 + M2 + Trabalho Final) e validação de upload .zip.
 * Roda o PHP real (CLI) sobre ProvaCatalog/ExamDefinition/ProvaService/ProvaProjectService sem banco.
 *
 * Uso: node tests/prova-multiexam-smoke.mjs   (requer `php` no PATH; sem php, só checagens estáticas)
 */

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

// ---------------------------------------------------------------------------
// Estático
// ---------------------------------------------------------------------------
const ctrl = read('backend/src/Controllers/ProvaController.php');
assert.ok(ctrl.includes('ProvaCatalog::forExam($examId)'), 'Controller deve resolver o exame pelo registro');
assert.ok(ctrl.includes('exam_not_found'), 'Exame inexistente deve devolver 404 claro');
for (const action of ['submitProject', 'adminDownloadSubmission', 'adminGradeProject']) {
  assert.ok(ctrl.includes(`'${action}'`), `Controller deve suportar ${action}`);
}
assert.ok(!/ProvaCatalog::(QUESTIONS|MC_ANSWER_KEY|QUESTION_COUNT)/.test(ctrl), 'Controller não deve usar constantes do M1 em fluxos genéricos');
// Contrato do reset em lote: o hub manda RESETAR; o backend aceita RESETAR e ZERAR.
const adminJs = read('js/prova-admin.js');
assert.ok(/confirm:\s*'RESETAR'/.test(adminJs), 'hub envia confirm=RESETAR');
assert.ok(/in_array\(\$confirmText,\s*\['ZERAR',\s*'RESETAR'\],\s*true\)/.test(ctrl), 'backend aceita ZERAR e RESETAR');
// examId explícito × attempt.exam_id
assert.ok(ctrl.includes('exam_mismatch') && ctrl.includes('$assertExam($attempt);'), 'admin confere examId explícito com attempt.exam_id');
const assertCalls = (ctrl.match(/\$assertExam\(\$attempt\);/g) || []).length;
assert.ok(assertCalls >= 7, `assertExam em todas as ações por attemptId (achou ${assertCalls})`);
// reenvio × correção atômicos
assert.ok(ctrl.includes('FOR UPDATE') && ctrl.includes('beginTransaction'), 'submit/grade em transação com lock');
assert.ok(ctrl.includes('submission_changed') && ctrl.includes('sha256_required'), 'correção presa à versão (sha256) da entrega');
assert.ok(/status <> .{1,3}graded/.test(ctrl), 'UPDATE condicional contra tentativa graded');
assert.ok(/sha256:\s*currentDetail\.submission/.test(adminJs), 'hub envia sha256 da entrega exibida');
assert.ok(adminJs.includes('listGen') && adminJs.includes('detailGen'), 'hub descarta respostas antigas (geração)');
// Página do aluno: a URL é a identidade; backend sem o exame nunca vira M1.
const provaJs = read('js/prova.js');
assert.ok(provaJs.includes('examMatchesUrl(status.exam)') && provaJs.includes('showExamUnavailable'), 'prova.js bloqueia exame divergente do servidor');
assert.ok(provaJs.includes('Este exame ainda não está disponível no servidor. Avise o Mestre.'), 'mensagem clara de exame indisponível');
assert.ok(/'trabalho-final':\s*\{\s*kind:\s*'project'/.test(provaJs), 'mapa local trabalho-final → project');
assert.ok(!/buildExamCopy\(status\.exam \|\| null\)/.test(provaJs), 'sem copy M1 para exame ausente');
assert.ok(provaJs.includes("typeof exam.kind !== 'string'"), 'exame não-M1 exige exam.kind explícito (backend antigo ecoa o id)');
assert.ok(read('scripts/dev-server.mjs').includes('DEV_API_BASE'), 'dev-server aceita DEV_API_BASE');
const svc = read('backend/src/Services/Prova/ProvaService.php');
assert.ok(!/ProvaCatalog::(QUESTIONS|MC_ANSWER_KEY|QUESTION_COUNT|MC_POINTS_EACH|DISCURSIVE_POINTS_EACH)/.test(svc), 'ProvaService não deve fixar constantes do M1');
assert.ok(svc.includes('releasePendingAutoGrades') && ctrl.includes('releasePendingAutoGrades'), 'M2 promove entregas antigas a graded');
assert.ok(svc.includes("'all', 'todas', 'both', 'open_all'"), 'gate aceita mode=all');
assert.ok(!svc.includes('apenas uma turma por vez'), 'gate não rejeita múltiplas turmas');
assert.ok(adminJs.includes("data-gate-mode") && read('pages/prova-admin.html').includes('data-gate-mode="all"'), 'hub tem Liberar todas');
assert.ok(read('js/aulas.js').includes('openTurmas.includes'), 'trilha usa openTurmas (não só openTurma)');

const migration = read('db/migrate-2026-10-29-prova-modulo2-trabalho-final.sql');
assert.ok(!/\b(DELETE|DROP|TRUNCATE|MODIFY)\b/i.test(migration.replace(/--.*$/gm, '').replace(/ON DELETE (CASCADE|RESTRICT|SET NULL)/gi, '')), 'Migração não pode ter DELETE/DROP/TRUNCATE/MODIFY');
assert.ok(!/\bUPDATE\b/i.test(migration.replace(/--.*$/gm, '').replace(/ON DUPLICATE KEY UPDATE/gi, '')), 'Migração não pode ter UPDATE');
assert.ok(migration.includes('modulo2-prova') && migration.includes('trabalho-final'), 'Migração deve inserir os 2 exames');
assert.ok(migration.includes('prova_submissions'), 'Migração deve criar prova_submissions');
assert.ok(read('db/mysql/schema.sql').includes('prova_submissions'), 'schema.sql canônico deve ter prova_submissions');
assert.ok(read('uploads/trabalhos/.htaccess').includes('denied') || read('uploads/trabalhos/.htaccess').includes('Deny from all'), 'uploads/trabalhos deve negar acesso direto');

// ---------------------------------------------------------------------------
// Runtime PHP
// ---------------------------------------------------------------------------
const php = spawnSync('php', ['-v'], { encoding: 'utf8' });
if (php.status !== 0) {
  console.log('prova-multiexam-smoke: php indisponível — apenas checagens estáticas OK.');
  process.exit(0);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prova-multi-'));
const goodZip = path.join(tmp, 'ok.zip');
fs.writeFileSync(goodZip, Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(64, 1)]));
const fakeZip = path.join(tmp, 'fake.zip');
fs.writeFileSync(fakeZip, Buffer.from('MZ-not-a-zip-but-has-zip-name-and-enough-bytes'));
const tinyZip = path.join(tmp, 'tiny.zip');
fs.writeFileSync(tinyZip, Buffer.from([0x50, 0x4b, 0x03, 0x04]));

const script = `<?php
require ${JSON.stringify(path.join(root, 'backend/bootstrap.php').replace(/\\/g, '/'))};
use App\\Services\\Prova\\ProvaCatalog;
use App\\Services\\Prova\\ProvaService;
use App\\Services\\Prova\\ProvaProjectService;

function fail(string $m): never { fwrite(STDERR, $m . "\\n"); exit(1); }

// --- registro
if (ProvaCatalog::examIds() !== ['modulo1-provacao', 'modulo2-prova', 'trabalho-final']) fail('examIds');
if (ProvaCatalog::forExam('nao-existe') !== null) fail('exame inexistente deve ser null');

$m1 = ProvaCatalog::forExam('modulo1-provacao');
if ($m1->questionCount() !== 20 || $m1->mcQuestionCount() !== 12 || $m1->discursiveQuestionCount() !== 8) fail('M1 contagens');
if ($m1->releasesGradeOnSubmit()) fail('M1 continua com Fechar nota');
if ((int) $m1->totalPoints !== 20 || $m1->durationMinutes !== 90) fail('M1 total/duração');
if ($m1->mcAnswerKey !== ProvaCatalog::MC_ANSWER_KEY) fail('M1 gabarito idêntico');
if ($m1->sanitizeQuestionsForClient() !== ProvaCatalog::sanitizeQuestionsForClient()) fail('M1 sanitize idêntico');
if ($m1->questionsForAdmin() !== ProvaCatalog::questionsForAdmin()) fail('M1 admin idêntico');

$m2 = ProvaCatalog::forExam('modulo2-prova');
if ($m2->questionCount() !== 10 || $m2->mcQuestionCount() !== 10 || $m2->discursiveQuestionCount() !== 0) fail('M2 contagens');
if (!$m2->releasesGradeOnSubmit()) fail('M2 libera a nota no envio');
if ((int) $m2->totalPoints !== 20 || $m2->durationMinutes !== 45 || $m2->placeholder) fail('M2 regras');
if (implode('', $m2->mcAnswerKey) !== 'BDAECADBEC') fail('M2 gabarito');
foreach ($m2->sanitizeQuestionsForClient() as $q) {
    if (isset($q['correctChoice']) || isset($q['answer']) || count($q['choices']) !== 5) fail('M2 sanitize vaza gabarito ou faltam alternativas');
}
$rows = [];
foreach ($m2->mcAnswerKey as $qid => $c) { $rows[] = ['question_id' => $qid, 'choice' => $c]; }
$g = ProvaService::buildMcGradeUpdates($rows, $m2);
if ($g['mcScore'] !== 20.0) fail('M2 correção perfeita deve dar 20, deu ' . $g['mcScore']);
$g = ProvaService::buildMcGradeUpdates([['question_id' => 'q01', 'choice' => 'B']], $m2);
if ($g['mcScore'] !== 2.0) fail('M2 correção parcial (2 pts por questão)');
// M1 sem def explícito continua igual
$g1 = ProvaService::buildMcGradeUpdates([['question_id' => 'q01', 'choice' => 'B']]);
if ($g1['mcScore'] !== 1.0 || count($g1['updates']) !== 12) fail('M1 compat buildMcGradeUpdates');
if (ProvaService::parseSaveAnswerPayload(['questionId' => 'q13', 'textAnswer' => 'x'], $m2)['ok']) fail('M2 não aceita discursiva');
if (!ProvaService::parseSaveAnswerPayload(['questionId' => 'q13', 'textAnswer' => 'x'], $m1)['ok']) fail('M1 aceita discursiva');
if (ProvaService::clampQuestionIndex(10, $m2) !== null || ProvaService::clampQuestionIndex(9, $m2) !== 9) fail('clamp M2');
if (ProvaService::clampQuestionIndex(19, $m1) !== 19) fail('clamp M1');

$tf = ProvaCatalog::forExam('trabalho-final');
if (!$tf->isProject() || $tf->hasTimer() || $tf->questionCount() !== 0) fail('TF kind');
if ($tf->releasesGradeOnSubmit()) fail('Trabalho Final não libera nota sozinho');
if (($tf->projectPublic()['maxBytes'] ?? 0) !== 50 * 1024 * 1024) fail('TF 50MB');
if (!str_contains((string) $tf->projectPublic()['guideUrl'], 'guia-trabalho-final')) fail('TF guia');

// --- upload
$max = 50 * 1024 * 1024;
$ok = ProvaProjectService::validateUpload(['error' => 0, 'tmp_name' => ${JSON.stringify(goodZip.replace(/\\/g, '/'))}, 'name' => 'C:\\\\fakepath\\\\Meu Trabalho.ZIP'], $max, false);
if (!$ok['ok'] || $ok['originalName'] !== 'Meu Trabalho.ZIP') fail('zip válido deve passar: ' . json_encode($ok));
$bad = ProvaProjectService::validateUpload(['error' => 0, 'tmp_name' => ${JSON.stringify(goodZip.replace(/\\/g, '/'))}, 'name' => 'x.exe'], $max, false);
if ($bad['ok'] || $bad['status'] !== 415) fail('extensão errada deve falhar');
$bad = ProvaProjectService::validateUpload(['error' => 0, 'tmp_name' => ${JSON.stringify(fakeZip.replace(/\\/g, '/'))}, 'name' => 'x.zip'], $max, false);
if ($bad['ok'] || $bad['status'] !== 415) fail('assinatura inválida deve falhar');
$bad = ProvaProjectService::validateUpload(['error' => 0, 'tmp_name' => ${JSON.stringify(tinyZip.replace(/\\/g, '/'))}, 'name' => 'x.zip'], $max, false);
if ($bad['ok']) fail('zip minúsculo deve falhar');
$bad = ProvaProjectService::validateUpload(['error' => 0, 'tmp_name' => ${JSON.stringify(goodZip.replace(/\\/g, '/'))}, 'name' => 'x.zip'], 32, false);
if ($bad['ok'] || $bad['status'] !== 413) fail('acima do limite deve dar 413');
$bad = ProvaProjectService::validateUpload(['error' => UPLOAD_ERR_INI_SIZE, 'tmp_name' => '', 'name' => 'x.zip'], $max, false);
if ($bad['ok'] || $bad['status'] !== 413) fail('UPLOAD_ERR_INI_SIZE → 413');
$bad = ProvaProjectService::validateUpload(null, $max, false);
if ($bad['ok']) fail('sem arquivo deve falhar');
// move_uploaded_file exige upload HTTP real → arquivo "não enviado" é recusado por padrão
$bad = ProvaProjectService::validateUpload(['error' => 0, 'tmp_name' => ${JSON.stringify(goodZip.replace(/\\/g, '/'))}, 'name' => 'x.zip'], $max, true);
if ($bad['ok']) fail('is_uploaded_file deve recusar arquivo local');

// --- armazenamento: nome uuid gerado no servidor, nunca o do cliente
putenv('PROVA_UPLOAD_DIR=' . ${JSON.stringify(path.join(tmp, 'store').replace(/\\/g, '/'))});
$st = ProvaProjectService::storeFile(${JSON.stringify(goodZip.replace(/\\/g, '/'))}, false);
if (!$st['ok'] || !preg_match('/^[0-9a-f-]{36}\\\\.zip$/', $st['storedName'])) fail('storedName uuid: ' . json_encode($st));
$p = ProvaProjectService::pathForStoredName($st['storedName']);
if (!$p || !is_file($p) || !is_file(dirname($p) . '/.htaccess')) fail('arquivo guardado + .htaccess deny');
if (ProvaProjectService::pathForStoredName('../../etc/passwd') !== null || ProvaProjectService::pathForStoredName('x.zip') !== null) fail('path traversal');
if (ProvaProjectService::cleanOriginalName('../../a/b\\\\c' . chr(1) . '.zip') !== 'c.zip') fail('cleanOriginalName: ' . ProvaProjectService::cleanOriginalName('../../a/b\\\\c.zip'));
if (ProvaProjectService::normalizeProjectScore('30', 30.0) !== 30.0 || ProvaProjectService::normalizeProjectScore('31', 30.0) !== null || ProvaProjectService::normalizeProjectScore('-1', 30.0) !== null) fail('nota 0–30');
if ((int) $tf->totalPoints !== 30 || $tf->project['scoreMax'] !== 30) fail('TF total/scoreMax 30');
if ($m2->mcMax() !== 20.0 || $m2->mcPointsEach !== 2) fail('M2 2 pts por questão');
if (str_contains(json_encode($tf->project, JSON_UNESCAPED_UNICODE), 'bola')) fail('TF sem bola');

// --- gate multi-turma (Trabalho Final / provas)
$gClosed = ProvaService::examGateFromRow(['is_open' => 1, 'open_turmas' => []]);
if ($gClosed['isOpen'] || $gClosed['state'] !== 'closed') fail('is_open sem turma = fechada');
$g1 = ProvaService::examGateFromRow(['is_open' => 1, 'open_turmas' => ['TCG01']]);
if (!$g1['isOpen'] || $g1['state'] !== 'TCG01' || $g1['openTurma'] !== 'TCG01') fail('só TCG01');
$gAll = ProvaService::examGateFromRow(['is_open' => 1, 'open_turmas' => ['TCG01', 'TCG02']]);
if (!$gAll['isOpen'] || $gAll['state'] !== 'all' || $gAll['openTurma'] !== null || count($gAll['openTurmas']) !== 2) fail('duas turmas = all');
$pAll = ProvaService::parseAdminSetExamOpenBody(['mode' => 'all']);
if (!$pAll['ok'] || !$pAll['is_open'] || $pAll['open_turmas'] !== ProvaService::PROVA_GATE_TURMAS) fail('parse mode=all');
$pBoth = ProvaService::parseAdminSetExamOpenBody(['isOpen' => true, 'openTurmas' => ['TCG01', 'TCG02']]);
if (!$pBoth['ok'] || count($pBoth['open_turmas']) !== 2) fail('parse openTurmas ambas');
$examAll = ['is_open' => 1, 'open_turmas' => ['TCG01', 'TCG02']];
if (!ProvaService::isExamOpenForUser($examAll, ['turma' => 'TCG01']) || !ProvaService::isExamOpenForUser($examAll, ['turma' => 'TCG02'])) fail('all libera TCG01 e TCG02');
if (ProvaService::isExamOpenForUser($examAll, ['turma' => 'TCG99'])) fail('turma desconhecida bloqueada');
$exam1 = ['is_open' => 1, 'open_turmas' => ['TCG01']];
if (!ProvaService::isExamOpenForUser($exam1, ['turma' => 'TCG01']) || ProvaService::isExamOpenForUser($exam1, ['turma' => 'TCG02'])) fail('só TCG01 respeita a outra turma');
echo "OK";
`;

const scriptPath = path.join(tmp, 'check.php');
fs.writeFileSync(scriptPath, script);
try {
  const out = execFileSync('php', [scriptPath], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  assert.equal(out.trim(), 'OK');
} catch (e) {
  console.error(String(e.stderr || e.message));
  process.exit(1);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('prova-multiexam-smoke: OK');
