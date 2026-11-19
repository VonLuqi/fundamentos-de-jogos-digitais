/**
 * Smoke — liberação manual da recuperação por aluno (recovery_overrides).
 * Estático (controller/migração/Hub) + PHP real contra MariaDB descartável (banco fjd_rec_override_smoke).
 * Sem php ou sem servidor MariaDB acessível: só o estático roda e avisa.
 *
 * Uso: node tests/recovery-override-smoke.mjs
 * Env opcional: DB_HOST (127.0.0.1), DB_PORT (3306), DB_USER (root), DB_PASS ('').
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

// ---------------------------------------------------------------------------
// Estático
// ---------------------------------------------------------------------------
const mig = read('db/migrate-2026-11-19-recovery-overrides.sql');
assert.ok(/CREATE TABLE IF NOT EXISTS recovery_overrides/.test(mig), 'migração cria recovery_overrides');
assert.ok(/user_id INT NOT NULL/.test(mig) && /PRIMARY KEY \(user_id\)/.test(mig) && /granted_by/.test(mig) && /granted_at/.test(mig) && /reason VARCHAR/.test(mig), 'colunas da tabela');
assert.ok(/FOREIGN KEY \(user_id\) REFERENCES users \(id\) ON DELETE CASCADE/.test(mig), 'FK para users');
assert.ok(!/\b(DROP|TRUNCATE|DELETE|UPDATE)\b/i.test(mig.replace(/--.*$/gm, '').replace(/ON DELETE CASCADE/g, '')), 'migração sem DROP/TRUNCATE/DELETE/UPDATE');

const tg = read('backend/src/Controllers/TurmaGradesController.php');
for (const a of ['adminRecoveryOverrides', 'adminRecoveryGrant', 'adminRecoveryRevoke']) {
  assert.ok(tg.includes(`'${a}'`), `controller suporta ${a}`);
}
// as ações de liberação ficam depois do gate de sessão + admin (403)
assert.ok(tg.indexOf("'adminRecoveryGrant'") > tg.indexOf("Acesso restrito ao Mestre"), 'liberação só depois do gate admin');
assert.ok(tg.includes("ACTIONS['grantRecoveryOverride']") && tg.includes("ACTIONS['revokeRecoveryOverride']"), 'auditoria de grant/revoke');
const audit = read('backend/src/Core/AdminAudit.php');
assert.ok(audit.includes("'grantRecoveryOverride' =>") && audit.includes("'revokeRecoveryOverride' =>"), 'AdminAudit tem as ações');
const rs = read('backend/src/Services/Grades/RecoveryService.php');
assert.ok(/\|\| self::hasOverride\(\(int\) \$user\['id'\]\)/.test(rs), 'isEligible = snapshot < 55 OU liberação');
const prova = read('backend/src/Controllers/ProvaController.php');
assert.ok(prova.includes('RecoveryService::isEligible($user)'), 'gate da prova segue usando isEligible');
const api = read('js/api.js');
for (const f of ['turmaGradesAdminRecoveryOverrides', 'turmaGradesAdminRecoveryGrant', 'turmaGradesAdminRecoveryRevoke']) {
  assert.ok(api.includes(`export function ${f}`), `api.js exporta ${f}`);
}
const hub = read('js/prova-admin.js');
assert.ok(hub.includes('turmaGradesAdminRecoveryGrant') && hub.includes('Remover') && hub.includes('liberado manualmente'), 'Hub: liberar, remover e tag');
const html = read('pages/prova-admin.html');
for (const id of ['prova-admin-override-search', 'prova-admin-override-select', 'prova-admin-override-reason', 'prova-admin-override-grant', 'prova-admin-override-list']) {
  assert.ok(html.includes(`id="${id}"`), `HTML tem #${id}`);
}
assert.ok(html.includes('Liberar recuperação'), 'botão "Liberar recuperação"');

const php = spawnSync('php', ['-v'], { encoding: 'utf8' });
if (php.status !== 0) {
  console.log('recovery-override-smoke: php ausente — só estático OK');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// PHP real + MariaDB
// ---------------------------------------------------------------------------
const env = {
  ...process.env,
  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_PORT: process.env.DB_PORT || '3306',
  DB_USER: process.env.DB_USER || 'root',
  DB_PASS: process.env.DB_PASS || '',
  DB_NAME: 'fjd_rec_override_smoke',
};
const script = `<?php
$root = ${JSON.stringify(root)};
spl_autoload_register(function ($c) use ($root) {
  $p = $root . '/backend/src/' . str_replace('\\\\', '/', substr($c, 4)) . '.php';
  if (strncmp($c, 'App\\\\', 4) === 0 && is_file($p)) require $p;
});
$dsn = sprintf('mysql:host=%s;port=%s;charset=utf8mb4', getenv('DB_HOST'), getenv('DB_PORT'));
try {
  $adm = new PDO($dsn, getenv('DB_USER'), getenv('DB_PASS'), [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
} catch (Throwable $e) { echo json_encode(['skip' => $e->getMessage()]); exit(0); }
$adm->exec('DROP DATABASE IF EXISTS fjd_rec_override_smoke');
$adm->exec('CREATE DATABASE fjd_rec_override_smoke CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
$adm->exec('USE fjd_rec_override_smoke');
foreach (['db/mysql/schema.sql', 'db/migrate-2026-09-24-prova-modulo1.sql', 'db/migrate-2026-11-16-turma-grades.sql', 'db/migrate-2026-11-19-recuperacao.sql', 'db/migrate-2026-11-19-recovery-overrides.sql'] as $f) {
  $adm->exec((string) file_get_contents($root . '/' . $f));
}
use App\\Core\\Database;
use App\\Services\\Grades\\RecoveryService as R;
$pdo = Database::pdo();
$mk = function (string $name, string $role = 'student') use ($pdo): int {
  $pdo->prepare("INSERT INTO users (full_name, turma, username, password_hash, role) VALUES (:n, 'TCG01', :u, 'x', :r)")
      ->execute([':n' => $name, ':u' => strtolower(str_replace(' ', '', $name)), ':r' => $role]);
  return (int) $pdo->lastInsertId();
};
$A = $mk('Aluna Abaixo');   // snapshot 40
$B = $mk('Aluno Aprovado'); // snapshot 70
$C = $mk('Aluno Novo');     // sem snapshot
$D = $mk('Aluno Dois');     // snapshot 30
$M = $mk('Mestre', 'admin');
$pdo->exec("INSERT INTO turma_grade_closures (turma, status, closed_at) VALUES ('TCG01', 'closed', NOW(3)) ON DUPLICATE KEY UPDATE status='closed'");
foreach ([[$A, 40], [$B, 70], [$D, 30]] as [$id, $t]) {
  $pdo->prepare("INSERT INTO turma_grade_snapshots (turma, user_id, total, closed_at) VALUES ('TCG01', :u, :t, NOW(3))")->execute([':u' => $id, ':t' => $t]);
}
$u = fn(int $id) => ['id' => $id, 'turma' => 'TCG01'];
$ids = fn(array $rows) => array_map(fn($r) => $r['userId'], $rows);
$out = [];
$out['before'] = [$A => R::isEligible($u($A)), $B => R::isEligible($u($B)), $C => R::isEligible($u($C)), $D => R::isEligible($u($D))];
$out['boardBefore'] = $ids(R::boardRows('TCG01'));
// grant: aluno sem snapshot
$out['grantC'] = R::grantOverride($C, $M, '  conta criada hoje  ');
$out['grantAgain'] = R::grantOverride($C, $M, 'segunda vez');
$out['grantAdmin'] = R::grantOverride($M, $M, '');
$out['grantGhost'] = R::grantOverride(999999, $M, '');
$out['hasC'] = R::hasOverride($C);
$out['eligC'] = R::isEligible($u($C));
$out['eligB'] = R::isEligible($u($B));
$out['dtoC'] = R::studentDto($u($C));
$board = R::boardRows('TCG01');
$out['boardC'] = array_values(array_filter($board, fn($r) => $r['userId'] === $C))[0] ?? null;
$out['boardIds'] = $ids($board);
$out['reasonRow'] = $pdo->query("SELECT reason, granted_by FROM recovery_overrides WHERE user_id = $C")->fetch();
// nota da recuperação + fechamento: base 0 e teto 60
$ins = $pdo->prepare("INSERT INTO prova_attempts (id, exam_id, user_id, status, ends_at, final_score, graded_at) VALUES (UUID(), 'recuperacao-prova', :u, 'graded', NOW(3), :s, NOW(3))");
$ins->execute([':u' => $C, ':s' => 80]);
$pdo->exec("INSERT INTO turma_recovery_closures (turma, status, closed_at) VALUES ('TCG01', 'closed', NOW(3))");
$out['dtoC80'] = R::studentDto($u($C));
$pdo->exec("UPDATE prova_attempts SET final_score = 30 WHERE user_id = $C");
$out['dtoC30'] = R::studentDto($u($C));
$pdo->exec("DELETE FROM turma_recovery_closures");
$pdo->exec("DELETE FROM prova_attempts");
// grant em aluno já aprovado: segue aprovado (não vira recuperação com teto 60)
R::grantOverride($B, $M, '');
$out['dtoB'] = R::studentDto($u($B));
$out['boardB'] = array_values(array_filter(R::boardRows('TCG01'), fn($r) => $r['userId'] === $B))[0] ?? null;
$pdo->exec("INSERT INTO turma_recovery_closures (turma, status, closed_at) VALUES ('TCG01', 'closed', NOW(3))");
$ins->execute([':u' => $B, ':s' => 40]);
$out['dtoBclosed40'] = R::studentDto($u($B));
$pdo->exec("UPDATE prova_attempts SET final_score = 80 WHERE user_id = $B");
$out['dtoBclosed80'] = R::studentDto($u($B));
$pdo->exec("DELETE FROM turma_recovery_closures");
$pdo->exec("DELETE FROM prova_attempts");
$out['dtoNoOv70'] = R::statusDto(70.0, false, null);
$out['picker'] = array_map(fn($r) => [$r['userId'], $r['override']], R::overrideStudents());
// revoke
R::revokeOverride($C); R::revokeOverride($B);
$out['afterRevoke'] = [R::hasOverride($C), R::isEligible($u($C)), R::isEligible($u($B)), R::isEligible($u($A))];
$out['boardAfter'] = $ids(R::boardRows('TCG01'));
$out['ids'] = compact('A', 'B', 'C', 'D', 'M');
$adm->exec('DROP DATABASE fjd_rec_override_smoke');
echo json_encode($out);
`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rec-ovr-'));
const file = path.join(tmp, 'run.php');
fs.writeFileSync(file, script);
const run = spawnSync('php', [file], { encoding: 'utf8', env });
fs.rmSync(tmp, { recursive: true, force: true });
assert.equal(run.status, 0, `php falhou: ${run.stderr || run.stdout}`);
const r = JSON.parse(run.stdout);
if (r.skip) {
  console.log(`recovery-override-smoke: sem MariaDB acessível (${r.skip}) — só estático OK`);
  process.exit(0);
}
const { A, B, C, D } = r.ids;
const sorted = (a) => [...a].sort((x, y) => x - y);

assert.deepEqual(r.before, { [A]: true, [B]: false, [C]: false, [D]: true }, 'elegibilidade sem liberação = snapshot < 55');
assert.deepEqual(sorted(r.boardBefore), sorted([A, D]), 'lista só com < 55');
assert.deepEqual(r.grantC, { ok: true, status: 200 });
assert.deepEqual(r.grantAgain, { ok: true, status: 200 }, 'grant repetido é idempotente');
assert.equal(r.grantAdmin.ok, false, 'só aluno');
assert.equal(r.grantGhost.status, 404, 'aluno inexistente');
assert.equal(r.hasC, true);
assert.equal(r.eligC, true, 'sem snapshot + liberação = elegível');
assert.equal(r.eligB, false, 'outro aluno aprovado continua inelegível');
assert.equal(r.dtoC.status, 'recuperacao');
assert.equal(r.dtoC.recovery.eligible, true);
assert.equal(r.boardC.override, true);
assert.equal(r.boardC.total, null, 'sem snapshot: total null (sem NaN)');
assert.equal(r.boardC.status, 'recuperacao');
assert.equal(r.reasonRow.reason, 'segunda vez');
assert.equal(r.reasonRow.granted_by, r.ids.M);
assert.deepEqual(sorted(r.boardIds), sorted([A, C, D]), 'liberado entra na lista');
assert.equal(r.dtoC80.status, 'aprovado_recuperacao');
assert.equal(r.dtoC80.recovery.finalScore, 60, 'teto 60');
assert.equal(r.dtoC30.status, 'reprovado');
assert.equal(r.dtoC30.recovery.finalScore, 0, 'base 0 sem snapshot');
assert.equal(r.dtoB.status, 'recuperacao', 'liberado com snapshot 70: em recuperação');
assert.equal(r.dtoB.recovery.eligible, true);
assert.equal(r.dtoBclosed40.status, 'reprovado', 'liberado, fechada, rec 40');
assert.equal(r.dtoBclosed80.status, 'aprovado_recuperacao', 'liberado, fechada, rec 80');
assert.equal(r.dtoBclosed80.recovery.finalScore, 60, 'teto 60');
assert.equal(r.boardB.status, 'recuperacao', 'lista do Hub: liberado >=55 em recuperação');
assert.equal(r.boardB.total, 70);
assert.equal(r.dtoNoOv70.status, 'aprovado', 'sem liberação: inalterado');
assert.deepEqual(r.picker.find(([id]) => id === C), [C, true]);
assert.deepEqual(r.picker.find(([id]) => id === D), [D, false]);
assert.equal(r.picker.length, 4, 'picker lista só alunos (sem admin)');
assert.deepEqual(r.afterRevoke, [false, false, false, true], 'revogar desfaz a liberação');
assert.deepEqual(sorted(r.boardAfter), sorted([A, D]));

console.log('recovery-override-smoke: OK');
