<?php
/**
 * Aceite T6 (achados 2 e 3 da revisão T2): concorrência entre reinício e escrita, com processos PHP reais.
 * Só roda em 127.0.0.1 / fjd_despertar_ensaio. Rode DEPOIS de `npm run despertar:ensaio-temporada`
 * (ou use tests/despertar-t2-aceite-concorrencia.mjs, que faz as duas coisas).
 */
declare(strict_types=1);

require dirname(__DIR__) . '/backend/bootstrap.php';

use App\Core\Database;
use App\Core\Env;
use App\Services\Despertar\DespertarService as S;
use App\Services\Despertar\StaleSeasonEpochException;

foreach (['DB_HOST' => '127.0.0.1', 'DB_PORT' => '3306', 'DB_NAME' => 'fjd_despertar_ensaio', 'DB_USER' => 'root', 'DB_PASS' => ''] as $k => $v) {
    Env::set($k, $v);
}
$p = Database::pdo();
if ($p->query('SELECT DATABASE()')->fetchColumn() !== 'fjd_despertar_ensaio') {
    throw new RuntimeException('Banco errado');
}
$at = new DateTimeImmutable('2026-11-02T12:00:00-03:00');
$admin = (int) $p->query("SELECT id FROM users WHERE role='admin' LIMIT 1")->fetchColumn();

// ─── Modos de worker (processos filhos) ─────────────────────────────────────
$mode = $argv[1] ?? '';
if ($mode === 'restart') {
    echo json_encode(['ran' => S::restartSeason2IfDue($at), 'epoch' => S::currentSeasonEpoch()]);
    exit;
}
if ($mode === 'write') {
    S::currentSeasonEpoch(); // época em que esta requisição foi "admitida"
    try {
        S::persistPatch($admin, ['souls' => '777.00', 'lifetime_souls' => '777.00']);
        echo json_encode(['result' => 'wrote']);
    } catch (StaleSeasonEpochException $e) {
        echo json_encode(['result' => 'stale', 'epoch' => $e->currentEpoch]);
    }
    exit;
}

function child(string $mode): array
{
    $pipes = [];
    $proc = proc_open([PHP_BINARY, __FILE__, $mode], [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
    if (!is_resource($proc)) {
        throw new RuntimeException('proc_open');
    }
    fclose($pipes[0]);
    return [$proc, $pipes];
}
function finish(array $c): array
{
    [$proc, $pipes] = $c;
    $out = stream_get_contents($pipes[1]);
    $err = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    if (proc_close($proc) !== 0) {
        throw new RuntimeException($err . $out);
    }
    return json_decode($out, true, 512, JSON_THROW_ON_ERROR);
}
function running(array $c): bool
{
    return (bool) (proc_get_status($c[0])['running'] ?? false);
}
function dsn(): PDO
{
    return new PDO('mysql:host=127.0.0.1;port=3306;dbname=fjd_despertar_ensaio', 'root', '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
}

$fail = 0;
$ok = static function (string $label, bool $cond, string $detail = '') use (&$fail): void {
    echo ($cond ? '[PASS] ' : '[FAIL] ') . $label . ($detail !== '' ? " — {$detail}" : '') . PHP_EOL;
    $fail += $cond ? 0 : 1;
};
$gateRow = static fn(bool $released) => S::setDespertarGate(S::SEASON_RESTART_GATE, $released, $admin);
$count = static fn(): int => (int) $p->query('SELECT COUNT(*) FROM despertar_states')->fetchColumn();
$soulsOf = static fn() => $p->query('SELECT souls FROM despertar_states WHERE user_id=' . $admin)->fetchColumn();
if (!$admin) {
    throw new RuntimeException('Rode o ensaio-temporada antes');
}

// ─── A) 8 processos disputando o mesmo reinício: exatamente 1 roda ──────────
$gateRow(false);
S::forgetSeasonCaches();
S::getOrCreateStateRow($admin);
S::persistPatch($admin, ['souls' => '777.00', 'lifetime_souls' => '777.00']);
$lock = new PDO('mysql:host=127.0.0.1;port=3306;dbname=fjd_despertar_ensaio', 'root', '');
$lock->query("SELECT GET_LOCK('fjd_season2_restart',0)")->fetchColumn();
$children = [];
for ($i = 0; $i < 8; $i++) {
    $children[] = child('restart');
}
usleep(700000);
$lock->query("SELECT RELEASE_LOCK('fjd_season2_restart')")->fetchColumn();
$results = array_map('finish', $children);
$ran = count(array_filter($results, static fn($r) => $r['ran']));
$ok('A) 8 processos concorrentes: exatamente 1 reinício, todos veem a época 2, estados vazios',
    $ran === 1 && array_unique(array_column($results, 'epoch')) === [2] && $count() === 0, json_encode(['ran' => $ran]));

// ─── B) escrita admitida na época 1 que chega DEPOIS do commit do reinício ──
$gateRow(false);
S::forgetSeasonCaches();
S::getOrCreateStateRow($admin);
S::persistPatch($admin, ['souls' => '777.00', 'lifetime_souls' => '777.00']);
$admitted = S::isSeasonEpochCurrent(1); // cache da requisição = 1
$old = S::rowToCanonical(S::getOrCreateStateRow($admin));
$restarted = finish(child('restart'));
S::getOrCreateStateRow($admin); // outra requisição, já na época nova, cria a linha nova
$user = $p->query('SELECT * FROM users WHERE id=' . $admin)->fetch(PDO::FETCH_ASSOC);
$user['conquistas'] = [];
$r1 = 'wrote';
try {
    S::persistPatchAndAward($user, ['souls' => '777.00', 'lifetime_souls' => '777.00'], $old, false);
} catch (StaleSeasonEpochException) {
    $r1 = 'stale';
}
$r2 = 'wrote';
try {
    S::persistPatch($admin, ['souls' => '777.00', 'lifetime_souls' => '777.00']);
} catch (StaleSeasonEpochException) {
    $r2 = 'stale';
}
$ok('B) escrita tardia (persistPatchAndAward e persistPatch) é abortada com StaleSeasonEpochException',
    $admitted && $restarted['ran'] === true && $r1 === 'stale' && $r2 === 'stale', "award={$r1} patch={$r2}");
$ok('B) a linha nova da época 2 NÃO foi ressuscitada (continua zerada)', (float) $soulsOf() === 0.0, 'souls=' . $soulsOf());

// ─── C) escritor bloqueado pelo reinício em andamento ───────────────────────
$gateRow(false);
S::forgetSeasonCaches();
S::getOrCreateStateRow($admin);
S::persistPatch($admin, ['souls' => '5.00', 'lifetime_souls' => '5.00']);
$reset = dsn(); // faz o papel do reinício: segura a linha do gate FOR UPDATE
$reset->beginTransaction();
$reset->query("SELECT released FROM lesson_gates WHERE lesson_id='despertar' AND gate_key='season2_restart_done' FOR UPDATE")->fetchAll();
$writer = child('write');
usleep(1200000);
$blocked = running($writer);
$reset->exec("UPDATE lesson_gates SET released=1 WHERE lesson_id='despertar' AND gate_key='season2_restart_done'");
$reset->exec('DELETE FROM despertar_states');
$reset->commit();
$w = finish($writer);
$ok('C) escritor admitido na época 1 espera o reinício e depois é abortado (stale, época 2)', $blocked && $w['result'] === 'stale' && ($w['epoch'] ?? 0) === 2, json_encode([$blocked, $w]));
$ok('C) nada foi regravado depois do reinício', $count() === 0);

// ─── D) reinício espera a escrita em andamento terminar ─────────────────────
$gateRow(false);
S::forgetSeasonCaches();
S::getOrCreateStateRow($admin);
S::persistPatch($admin, ['souls' => '5.00', 'lifetime_souls' => '5.00']);
$inflight = dsn(); // escrita já admitida: segura o gate compartilhado e ainda não gravou
$inflight->beginTransaction();
$inflight->query("SELECT released FROM lesson_gates WHERE lesson_id='despertar' AND gate_key='season2_restart_done' LOCK IN SHARE MODE")->fetchAll();
$resetter = child('restart');
usleep(1200000);
$waited = running($resetter);
$inflight->exec('UPDATE despertar_states SET souls=999 WHERE user_id=' . $admin);
$inflight->commit();
$rr = finish($resetter);
$ok('D) o reinício espera a escrita em andamento e então zera tudo (nada de 999 sobrevivendo)', $waited && $rr['ran'] === true && $count() === 0, json_encode([$waited, $rr]));

// ─── F) HTTP real: requisição admitida na época 1, bloqueada pelo reinício → 409 e nada gravado ──
$gateRow(false);
S::forgetSeasonCaches();
S::getOrCreateStateRow($admin);
S::persistPatch($admin, ['souls' => '5.00', 'lifetime_souls' => '5.00']);
$p->prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (:t, :u, DATE_ADD(NOW(3), INTERVAL 1 DAY)) ON DUPLICATE KEY UPDATE expires_at = VALUES(expires_at)')
    ->execute([':t' => 'aceite-admin', ':u' => $admin]);
$srvEnv = array_merge(getenv(), ['DB_HOST' => '127.0.0.1', 'DB_PORT' => '3306', 'DB_NAME' => 'fjd_despertar_ensaio', 'DB_USER' => 'root', 'DB_PASS' => '']);
$srv = proc_open([PHP_BINARY, '-S', '127.0.0.1:8096', dirname(__DIR__) . '/backend/index.php'], [1 => ['file', 'php://stderr', 'w'], 2 => ['file', 'php://stderr', 'w']], $sp, dirname(__DIR__), $srvEnv);
for ($i = 0; $i < 50; $i++) {
    if (@file_get_contents('http://127.0.0.1:8096/api/none', false, stream_context_create(['http' => ['ignore_errors' => true, 'timeout' => 2]])) !== false) {
        break;
    }
    usleep(200000);
}
$resetCode = '$d=new PDO("mysql:host=127.0.0.1;dbname=fjd_despertar_ensaio","root","");$d->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);'
    . '$d->beginTransaction();$d->query("SELECT released FROM lesson_gates WHERE lesson_id=\'despertar\' AND gate_key=\'season2_restart_done\' FOR UPDATE")->fetchAll();'
    . 'echo "held\n";usleep(2500000);'
    . '$d->exec("UPDATE lesson_gates SET released=1 WHERE lesson_id=\'despertar\' AND gate_key=\'season2_restart_done\'");$d->exec("DELETE FROM despertar_states");$d->commit();';
$holder = proc_open([PHP_BINARY, '-r', $resetCode], [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $hp);
fgets($hp[1]); // "held": o "reinício" já segura a linha do gate
$t0 = microtime(true);
$ctx = stream_context_create(['http' => [
    'method' => 'POST', 'ignore_errors' => true, 'timeout' => 30,
    'header' => "Content-Type: application/json\r\nAuthorization: Bearer aceite-admin\r\n",
    'content' => json_encode(['action' => 'stateSync', 'token' => 'aceite-admin', 'seasonEpoch' => 1,
        'clientState' => ['seasonEpoch' => 1, 'souls' => '777', 'lifetimeSouls' => '777', 'runSouls' => '777']]),
]]);
$raw = @file_get_contents('http://127.0.0.1:8096/api/despertar', false, $ctx);
$elapsed = microtime(true) - $t0;
$status = 0;
foreach ($http_response_header ?? [] as $h) {
    if (preg_match('#^HTTP/\S+ (\d{3})#', $h, $m)) {
        $status = (int) $m[1];
    }
}
$j = json_decode((string) $raw, true) ?: [];
stream_get_contents($hp[1]);
stream_get_contents($hp[2]);
proc_close($holder);
proc_terminate($srv);
proc_close($srv);
$ok('F) HTTP: escrita admitida na época 1 e bloqueada pelo reinício sai 409 despertar_stale_epoch com a época nova',
    $status === 409 && ($j['error'] ?? '') === 'despertar_stale_epoch' && ($j['seasonEpoch'] ?? null) === 2 && $elapsed > 1.0,
    json_encode(['status' => $status, 'elapsed' => round($elapsed, 1), 'error' => $j['error'] ?? null, 'epoch' => $j['seasonEpoch'] ?? null]));
S::forgetSeasonCaches();
$ok('F) HTTP: nada de 777 foi gravado depois do reinício', $count() === 0 || (float) $soulsOf() !== 777.0);

// ─── E) idempotência: depois de feito, rodar de novo não apaga a T2 nova ────
S::forgetSeasonCaches();
S::getOrCreateStateRow($admin);
S::persistPatch($admin, ['souls' => '321.00', 'lifetime_souls' => '321.00']);
$again = finish(child('restart'));
$ok('E) reinício repetido é no-op e preserva a T2 nova', $again['ran'] === false && (float) $soulsOf() === 321.0);

echo PHP_EOL . 'aceite-concorrencia: ' . ($fail === 0 ? 'ok' : "{$fail} falha(s)") . PHP_EOL;
exit($fail > 0 ? 1 : 0);
