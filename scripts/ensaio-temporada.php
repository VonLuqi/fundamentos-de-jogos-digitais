<?php
/**
 * Ensaio da troca de temporada do Despertar num banco DESCARTÁVEL.
 * Recria o banco do zero a partir de db/mysql/schema.sql, semeia uma turma fictícia,
 * roda o "Abrir Temporada 2" de verdade (DespertarService::openNextSeason) e confere:
 * hold da T1, pódio arquivado, reset da turma, portões, segunda execução recusada,
 * e um aluno começando a T2 com sync + gravação.
 *
 * Uso (só aceita banco com "ensaio" no nome):
 *   DB_HOST=127.0.0.1 DB_USER=root DB_PASS= DB_NAME=fjd_despertar_ensaio php scripts/ensaio-temporada.php
 */

declare(strict_types=1);

$name = (string) getenv('DB_NAME');
if (!str_contains($name, 'ensaio')) {
    fwrite(STDERR, "Recusado: DB_NAME precisa conter 'ensaio' (recebido '{$name}'). Este script APAGA o banco.\n");
    exit(2);
}

$root = dirname(__DIR__);
require $root . '/backend/bootstrap.php';

use App\Core\Database;
use App\Services\Despertar\DespertarFormulas;
use App\Services\Despertar\DespertarService;

$host = getenv('DB_HOST') ?: '127.0.0.1';
$port = getenv('DB_PORT') ?: '3306';
$server = new PDO("mysql:host={$host};port={$port};charset=utf8mb4", (string) getenv('DB_USER'), (string) getenv('DB_PASS'), [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);
$server->exec("DROP DATABASE IF EXISTS `{$name}`");
$server->exec("CREATE DATABASE `{$name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
$server->exec("USE `{$name}`");
$schema = (string) file_get_contents($root . '/db/mysql/schema.sql');
$schema = preg_replace('/^\s*--.*$/m', '', $schema) ?? $schema;
foreach (array_filter(array_map('trim', explode(";\n", str_replace("\r\n", "\n", $schema)))) as $stmt) {
    $server->exec($stmt);
}

$pdo = Database::pdo();
$results = [];
$check = static function (string $label, bool $ok, string $detail = '') use (&$results): void {
    $results[] = ['ok' => $ok, 'label' => $label, 'detail' => $detail];
    echo ($ok ? '[PASS] ' : '[FAIL] ') . $label . ($detail !== '' ? " — {$detail}" : '') . "\n";
};

// ─── Turma fictícia ────────────────────────────────────────────────────────
$insUser = $pdo->prepare('INSERT INTO `users` (`full_name`, `turma`, `username`, `password_hash`, `role`, `conquistas`)
                          VALUES (:n, \'TCG01\', :u, \'x\', :r, :c)');
$insUser->execute([':n' => 'Mestre', ':u' => 'mestre', ':r' => 'admin', ':c' => '[]']);
$adminId = (int) $pdo->lastInsertId();

$students = [
    // username => [juizo, catábases, almas totais]
    'ana' => [12, 3, '5000000000.00'],
    'bia' => [40, 1, '900000.00'],
    'caio' => [7, 9, '120000000000.00'],
    'duda' => [25, 2, '9900000000000000000000000000000.00'], // > 2^53: ordenação numérica
    'enzo' => [0, 0, '15.00'],
    'fabi' => [40, 5, '70000000.00'], // empata Juízo com bia → desempate por username
];
$ids = [];
foreach ($students as $u => [$juizo, $prestige, $lifetime]) {
    $insUser->execute([':n' => ucfirst($u), ':u' => $u, ':r' => 'student', ':c' => json_encode(['despertar_primeira_alma', 'despertar_cem_almas'])]);
    $ids[$u] = (int) $pdo->lastInsertId();
    $pdo->prepare('INSERT INTO `despertar_states` (`user_id`, `souls`, `lifetime_souls`, `run_souls`, `prestige_count`, `juizo_best_streak`, `generators_state`)
                   VALUES (:id, 10, :lt, :lt2, :p, :j, :g)')
        ->execute([':id' => $ids[$u], ':lt' => $lifetime, ':lt2' => $lifetime, ':p' => $prestige, ':j' => $juizo, ':g' => '{"wandering_shade": 5}']);
}
$insUser->execute([':n' => 'Gabi', ':u' => 'gabi', ':r' => 'student', ':c' => '[]']); // nunca jogou
$ids['gabi'] = (int) $pdo->lastInsertId();
// ana: XP da T1 + uma conquista de aula (não é do Despertar e tem que ficar).
$pdo->prepare('UPDATE `users` SET `xp` = 500, `conquistas` = :c WHERE `id` = :id')->execute([
    ':c' => json_encode(['despertar_primeira_alma', 'despertar_cem_almas', 'aula1_concluida']),
    ':id' => $ids['ana'],
]);
DespertarService::setDespertarGate('published', true, $adminId);

// ─── T1 encerrada: hold ativo até abrir a T2 ───────────────────────────────
$check('Hold da T1: Despertar fechado antes de abrir a T2', DespertarService::isDespertarPublished() === false);

$bad = DespertarService::openNextSeason($adminId, 'temporada dois');
$check('Confirmação errada é recusada e não apaga nada', $bad['ok'] === false
    && (int) $pdo->query('SELECT COUNT(*) FROM `despertar_states`')->fetchColumn() === 6);

// ─── Abrir a T2 ─────────────────────────────────────────────────────────────
$open = DespertarService::openNextSeason($adminId, 'Temporada 2');
$check('Abrir Temporada 2 com "Temporada 2" (case-insensitive)', $open['ok'] === true, json_encode(['deleted' => $open['deleted']]));
$check('Todos os estados apagados', (int) $pdo->query('SELECT COUNT(*) FROM `despertar_states`')->fetchColumn() === 0, "deleted={$open['deleted']}");
$check('Portões: season_liberated e published ligados', DespertarService::isSeasonLiberated()
    && (bool) $pdo->query("SELECT `released` FROM `lesson_gates` WHERE `lesson_id` = 'despertar' AND `gate_key` = 'published'")->fetchColumn());
$check('Com o reinício pendente o jogo segue trancado para aluno mesmo após abrir a T2', DespertarService::isDespertarPublished() === false);

$archive = DespertarService::getSeasonArchive(1);
$names = static fn(string $board): array => array_map(static fn($r) => $r['username'], $archive['boards'][$board] ?? []);
$check('Pódio Juízo: bia e fabi empatadas em 40 (desempate alfabético), depois duda', $names('juizoBest') === ['bia', 'fabi', 'duda'], implode(',', $names('juizoBest')));
$check('Pódio Catábases: caio, fabi, ana', $names('prestigeCount') === ['caio', 'fabi', 'ana'], implode(',', $names('prestigeCount')));
$check('Pódio Almas: duda (9,9e30) acima de caio — ordenação numérica, não texto', $names('lifetimeSouls') === ['duda', 'caio', 'ana'], implode(',', $names('lifetimeSouls')));
$check('Admin fora do pódio', !in_array('mestre', array_merge($names('juizoBest'), $names('prestigeCount'), $names('lifetimeSouls')), true));

// ─── Segunda execução não pode destruir o arquivo da T1 ─────────────────────
$before = json_encode($archive['boards']);
$again = DespertarService::openNextSeason($adminId, 'TEMPORADA 2');
$after = json_encode(DespertarService::getSeasonArchive(1)['boards'] ?? []);
$check('Segunda execução recusada', $again['ok'] === false, (string) ($again['error'] ?? ''));
$check('Pódio da T1 intacto após a segunda tentativa', $before === $after);

// ─── Um aluno começa a T2 ───────────────────────────────────────────────────
$uid = $ids['ana'];
$row = DespertarService::getOrCreateStateRow($uid);
$fresh = DespertarService::rowToCanonical($row);
$check('Linha nova da T2 começa zerada', (float) $fresh['souls'] === 0.0 && (float) $fresh['lifetimeSouls'] === 0.0 && $fresh['prestigeCount'] === 0);

$nowMs = (int) round(microtime(true) * 1000) + 60_000; // 1 min de jogo
$sync = DespertarService::validateSync($row, [
    'souls' => '35', 'runSouls' => '50', 'lifetimeSouls' => '50',
    'generators' => ['wandering_shade' => 1], 'upgrades' => [],
], $nowMs);
$check('Primeiro sync da T2 aceito', $sync['ok'] === true, (string) ($sync['ceiling']['action'] ?? ''));
$saved = DespertarService::persistPatch($uid, $sync['patch']);
$reloaded = DespertarService::rowToCanonical($saved);
$check('Progresso gravado e relido do banco', (float) $reloaded['lifetimeSouls'] === 50.0 && ($reloaded['generators']['wandering_shade'] ?? 0) === 1);

// ─── Conquistas: saem do perfil na virada, XP fica, e reconquistar não paga de novo ──
$userRow = static function (int $id) use ($pdo): array {
    $r = $pdo->query("SELECT `id`, `xp`, `conquistas` FROM `users` WHERE `id` = {$id}")->fetch(PDO::FETCH_ASSOC);
    return ['id' => (int) $r['id'], 'xp' => (int) $r['xp'], 'conquistas' => json_decode((string) $r['conquistas'], true) ?: []];
};
$ana = $userRow($uid);
$check('Conquistas do Despertar saíram do perfil; a de aula ficou', $ana['conquistas'] === ['aula1_concluida'], json_encode($ana['conquistas']));
$check('XP da T1 mantido', $ana['xp'] === 500, "xp={$ana['xp']}");
$check('Véu da T2 só conta as conquistas fora do Despertar', (float) DespertarFormulas::veilPercent($ana['conquistas']) === (float) DespertarFormulas::veilPercent(['aula1_concluida'])
    && (float) DespertarFormulas::veilPercent($ana['conquistas']) < (float) DespertarFormulas::veilPercent(['despertar_primeira_alma', 'despertar_cem_almas', 'aula1_concluida']));
$check('Resumo da virada conta perfis e conquistas', ($open['achievementsReset']['users'] ?? 0) === 6 && ($open['achievementsReset']['removed'] ?? 0) === 12, json_encode($open['achievementsReset'] ?? null));
$paid = json_decode((string) $pdo->query("SELECT `achievement_ids` FROM `despertar_paid_achievements` WHERE `user_id` = {$uid}")->fetchColumn(), true);
$check('Já pagas anotadas', $paid === ['despertar_primeira_alma', 'despertar_cem_almas'], json_encode($paid));

// Reconquista (paga na T1): volta ao perfil sem XP; as novas do mesmo sync pagam normalmente.
$xpOf = static fn(array $ids, array $paidIds): int => array_sum(array_map(
    static fn($id) => in_array($id, $paidIds, true) ? 0 : \App\Core\GameCatalog::getAchievementXp($id), $ids));
$award = DespertarService::persistPatchAndAward($ana, [], $reloaded, true);
$got = $award['awarded']['achievements'] ?? [];
$ana = $userRow($uid);
$check('Reconquistar na T2 devolve a conquista sem XP', in_array('despertar_primeira_alma', $got, true)
    && $ana['xp'] === 500 + $xpOf($got, $paid) && ($award['awarded']['xp'] ?? -1) === $xpOf($got, $paid),
    "xp={$ana['xp']} awarded=" . json_encode($got) . " (só as não pagas valem XP)");
$xpBefore = $ana['xp'];

// Conquista nova (nunca paga): paga XP normalmente.
$richer = array_merge($reloaded, ['lifetimeSouls' => '1500.00', 'runSouls' => '1500.00']);
$award = DespertarService::persistPatchAndAward($ana, [], $richer, true);
$ana = $userRow($uid);
$milXp = \App\Core\GameCatalog::getAchievementXp('despertar_mil_almas');
$check('Conquista nova na T2 paga XP; a já paga (cem almas) não', in_array('despertar_mil_almas', $ana['conquistas'], true)
    && in_array('despertar_cem_almas', $ana['conquistas'], true) && $ana['xp'] === $xpBefore + $xpOf($award['awarded']['achievements'] ?? [], $paid)
    && $milXp > 0 && ($award['awarded']['xp'] ?? -1) === $xpOf($award['awarded']['achievements'] ?? [], $paid),
    "xp={$ana['xp']} (mil_almas vale {$milXp})");

// ═════════════════════════════════════════════════════════════════════════════
// REINÍCIO DA TEMPORADA 2 (bugs): tranco até 2026-11-02 12:00 -03:00, zera tudo, sobe a época
// ═════════════════════════════════════════════════════════════════════════════
echo "\n— Reinício da T2 —\n";
$restartAt = new \DateTimeImmutable(DespertarService::SEASON_RESTART_AT);
$check('Instante do reinício é 2026-11-02 12:00 de Brasília', $restartAt->format('Y-m-d\TH:i:sP') === '2026-11-02T12:00:00-03:00');

// Estado "bugado" da T2: todo mundo com progresso, inclusive óbolos/essência/talentos/Juízo/stats.
$bugged = static fn(string $big) => [
    'souls' => $big, 'obols' => '7110.00', 'mnemosyne' => '5100.00', 'lifetime_souls' => $big, 'run_souls' => $big,
    'prestige_count' => 6, 'generators_state' => ['wandering_shade' => 40], 'upgrades_state' => ['x'], 'talents_state' => ['t'],
    'stats' => ['clicks' => 999, 'max_buy_biggest' => 5, 'juizo_tie_wins' => 2], 'verdicts' => 33,
    'juizo_best_streak' => 21, 'juizo_current_streak' => 4, 'verdict_purchases' => ['v'], 'milestones' => ['ascensionOpen' => true],
    'last_sync_at' => \App\Core\Database::nowIso(), 'updated_at' => \App\Core\Database::nowIso(),
];
foreach (['ana', 'bia', 'caio', 'mestre'] as $u) {
    $uid2 = $u === 'mestre' ? $adminId : $ids[$u];
    DespertarService::getOrCreateStateRow($uid2);
    DespertarService::persistPatch($uid2, $bugged('25700000000000.00'));
    $pdo->prepare('UPDATE `users` SET `conquistas` = :c, `xp` = 500 WHERE `id` = :id')->execute([
        ':c' => json_encode(['despertar_primeira_alma', 'despertar_mil_almas', 'aula1_concluida']), ':id' => $uid2,
    ]);
}
$archiveBefore = json_encode(DespertarService::getSeasonArchive(1));
$archiveRowsBefore = (int) $pdo->query('SELECT COUNT(*) FROM `despertar_season_archives`')->fetchColumn();

// 1) Antes do instante: trancado para aluno, época 1, nada é apagado.
$check('Tranco: Despertar fechado para aluno até o reinício (mesmo com T2 aberta e published ligado)',
    DespertarService::isSeasonRestartHold() && DespertarService::isDespertarPublished() === false);
$check('Época autoritativa antes do reinício = 1', DespertarService::currentSeasonEpoch() === 1);
$check('Antes do instante o reinício não roda', DespertarService::restartSeason2IfDue($restartAt->modify('-1 second')) === false
    && (int) $pdo->query('SELECT COUNT(*) FROM `despertar_states`')->fetchColumn() === 4
    && !DespertarService::isSeasonRestartDone());
$check('Save local da T1 (sem época) recusado; época antiga (0) recusada; época certa aceita',
    !DespertarService::isSeasonEpochCurrent(null) && !DespertarService::isSeasonEpochCurrent(0)
    && !DespertarService::isSeasonEpochCurrent('') && DespertarService::isSeasonEpochCurrent(1) && DespertarService::isSeasonEpochCurrent('1'));
$dto1 = DespertarService::buildStateDto(DespertarService::getOrCreateStateRow($ids['ana']));
$check('O estado devolvido carrega a época', ($dto1['seasonEpoch'] ?? null) === 1);

// 2) Servidor HTTP de verdade (php -S) contra este banco: tranco e recusa por época.
$port = 8099;
$srv = proc_open([PHP_BINARY, '-S', "127.0.0.1:{$port}", $root . '/backend/index.php'], [1 => ['file', 'php://stderr', 'w'], 2 => ['file', 'php://stderr', 'w']], $pipes, $root);
$http = static function (string $action, array $body, string $token) use ($port): array {
    $ctx = stream_context_create(['http' => [
        'method' => 'POST', 'ignore_errors' => true, 'timeout' => 20,
        'header' => "Content-Type: application/json\r\nAuthorization: Bearer {$token}\r\n",
        'content' => json_encode(['action' => $action, 'token' => $token] + $body),
    ]]);
    $raw = @file_get_contents("http://127.0.0.1:{$port}/api/despertar", false, $ctx);
    $status = 0;
    foreach ($http_response_header ?? [] as $h) {
        if (preg_match('#^HTTP/\S+ (\d{3})#', $h, $m)) {
            $status = (int) $m[1];
        }
    }
    return ['status' => $status, 'json' => json_decode((string) $raw, true) ?: []];
};
$mkSession = static function (int $userId, string $tok) use ($pdo): string {
    $pdo->prepare('INSERT INTO `sessions` (`token`, `user_id`, `expires_at`) VALUES (:t, :u, DATE_ADD(NOW(3), INTERVAL 1 DAY))')
        ->execute([':t' => $tok, ':u' => $userId]);
    return $tok;
};
$tokAna = $mkSession($ids['ana'], 'ensaio-ana');
$tokAdmin = $mkSession($adminId, 'ensaio-admin');
for ($i = 0; $i < 50; $i++) {
    $up = @file_get_contents("http://127.0.0.1:{$port}/api/despertar", false, stream_context_create(['http' => ['ignore_errors' => true, 'method' => 'POST', 'timeout' => 2, 'content' => '{}']]));
    if ($up !== false) {
        break;
    }
    usleep(200000);
}
$st = $http('seasonStatus', [], $tokAna);
$check('HTTP seasonStatus: trancado, época 1, instante do reinício', ($st['json']['restartHold'] ?? null) === true
    && ($st['json']['seasonEpoch'] ?? null) === 1 && ($st['json']['restartAt'] ?? '') === '2026-11-02T12:00:00-03:00' && ($st['json']['published'] ?? null) === false,
    json_encode($st['json']));
$sync = $http('stateSync', ['seasonEpoch' => 1, 'clientState' => ['seasonEpoch' => 1, 'souls' => '999999999999', 'lifetimeSouls' => '999999999999', 'runSouls' => '999999999999']], $tokAna);
$check('HTTP durante o tranco: aluno não escreve (sync 403 selado, restartHold)', $sync['status'] === 403
    && ($sync['json']['error'] ?? '') === 'despertar_sealed' && ($sync['json']['restartHold'] ?? null) === true, "status={$sync['status']}");
$get = $http('stateGet', [], $tokAna);
$check('HTTP durante o tranco: aluno não lê o jogo (stateGet 403)', $get['status'] === 403);
$adm = $http('stateGet', [], $tokAdmin);
$check('HTTP durante o tranco: admin continua entrando (prévia/teste), com época 1', $adm['status'] === 200
    && ($adm['json']['state']['seasonEpoch'] ?? null) === 1, "status={$adm['status']}");
$admSyncOk = $http('stateSync', ['clientState' => ['seasonEpoch' => 1, 'souls' => '5', 'lifetimeSouls' => '5', 'runSouls' => '5']], $tokAdmin);
$check('HTTP admin com a época certa grava', $admSyncOk['status'] === 200, "status={$admSyncOk['status']} " . ($admSyncOk['json']['error'] ?? ''));
$admSyncOld = $http('stateSync', ['clientState' => ['souls' => '5', 'lifetimeSouls' => '5', 'runSouls' => '5']], $tokAdmin);
$check('HTTP save sem época é recusado (409 despertar_stale_epoch + estado novo + flag)', $admSyncOld['status'] === 409
    && ($admSyncOld['json']['error'] ?? '') === 'despertar_stale_epoch' && ($admSyncOld['json']['staleEpoch'] ?? null) === true
    && ($admSyncOld['json']['state']['seasonEpoch'] ?? null) === 1, "status={$admSyncOld['status']}");
foreach (['prestige', 'talentBuy', 'verdictBuy', 'juizoStart', 'juizoGuess', 'juizoAbandon'] as $act) {
    $r = $http($act, ['seasonEpoch' => 0], $tokAdmin);
    $check("HTTP {$act} de época velha recusado", $r['status'] === 409 && ($r['json']['error'] ?? '') === 'despertar_stale_epoch', "status={$r['status']}");
}

// 3) Meio-dia de segunda: a primeira requisição depois do instante reinicia.
$stateBeforeRestart = (int) $pdo->query('SELECT COUNT(*) FROM `despertar_states`')->fetchColumn();
$ran = DespertarService::restartSeason2IfDue($restartAt);
$check('No instante exato o reinício roda', $ran === true && DespertarService::isSeasonRestartDone(), "estados antes={$stateBeforeRestart}");
$check('Zerou TODOS os estados (alunos e admin)', (int) $pdo->query('SELECT COUNT(*) FROM `despertar_states`')->fetchColumn() === 0);
$ana2 = $userRow($ids['ana']);
$check('Conquistas despertar_* saíram; a de aula ficou; XP mantido (500)', $ana2['conquistas'] === ['aula1_concluida'] && $ana2['xp'] === 500, json_encode($ana2));
$paidAna = json_decode((string) $pdo->query("SELECT `achievement_ids` FROM `despertar_paid_achievements` WHERE `user_id` = {$ids['ana']}")->fetchColumn(), true);
$check('Já pagas acumulam (T1 + T2): reconquistar não paga XP de novo', in_array('despertar_primeira_alma', $paidAna, true) && in_array('despertar_mil_almas', $paidAna, true), json_encode($paidAna));
$check('Pódio/arquivo da T1 intacto (mesmo conteúdo, mesma contagem) e T2 NÃO arquivada',
    json_encode(DespertarService::getSeasonArchive(1)) === $archiveBefore
    && (int) $pdo->query('SELECT COUNT(*) FROM `despertar_season_archives`')->fetchColumn() === $archiveRowsBefore
    && DespertarService::getSeasonArchive(2) === null);
$check('Libera o jogo: sem tranco, published, época 2',
    !DespertarService::isSeasonRestartHold() && DespertarService::isDespertarPublished() && DespertarService::currentSeasonEpoch() === 2);

// 4) Aluno novo na T2 nova: zerado, sem óbolo/essência "curados", época 2.
$fresh2 = DespertarService::getOrCreateStateRow($ids['ana']);
$f2 = DespertarService::rowToCanonical($fresh2);
$check('Linha nova zerada: almas, óbolos, essência, catábases, geradores, talentos, Juízo, stats',
    (float) $f2['souls'] === 0.0 && (float) $f2['obols'] === 0.0 && (float) $f2['mnemosyne'] === 0.0 && (float) $f2['lifetimeSouls'] === 0.0
    && $f2['prestigeCount'] === 0 && array_sum($f2['generators'] ?? []) === 0 && $f2['talents'] === [] && $f2['upgrades'] === []
    && $f2['verdicts'] === 0 && $f2['juizoBestStreak'] === 0 && ($f2['stats']['clicks'] ?? 0) === 0);
$check('O heal do Lethe não dá óbolo/essência à linha nova', (float) $fresh2['obols'] === 0.0 && (float) $fresh2['mnemosyne'] === 0.0);
$check('Estado novo carrega época 2', (DespertarService::buildStateDto($fresh2)['seasonEpoch'] ?? null) === 2);

// 5) Segunda execução não apaga a T2 nova.
DespertarService::persistPatch($ids['ana'], ['souls' => '321.00', 'lifetime_souls' => '321.00', 'run_souls' => '321.00', 'last_sync_at' => \App\Core\Database::nowIso()]);
$again = DespertarService::restartSeason2IfDue($restartAt->modify('+2 hours'));
$againNow = DespertarService::restartSeason2IfDue();
$ana3 = DespertarService::rowToCanonical(DespertarService::getOrCreateStateRow($ids['ana']));
$check('Segunda execução recusada: a T2 nova (321 almas) continua lá', $again === false && $againNow === false && (float) $ana3['souls'] === 321.0);

// 6) HTTP depois do reinício: save/aba da T1 (época 1 ou sem época) é recusado; época 2 grava.
$s1 = $http('stateSync', ['seasonEpoch' => 1, 'clientState' => ['seasonEpoch' => 1, 'souls' => '25700000000000', 'lifetimeSouls' => '25700000000000', 'runSouls' => '25700000000000', 'generators' => ['wandering_shade' => 40]]], $tokAna);
$check('HTTP: save local da T1 (época 1) recusado com 409 e estado novo zerado', $s1['status'] === 409
    && ($s1['json']['staleEpoch'] ?? null) === true && ($s1['json']['seasonEpoch'] ?? null) === 2
    && (float) ($s1['json']['state']['souls'] ?? -1) === 321.0 && ($s1['json']['state']['seasonEpoch'] ?? null) === 2, "status={$s1['status']}");
$ana4 = DespertarService::rowToCanonical(DespertarService::getOrCreateStateRow($ids['ana']));
$check('HTTP: o servidor NÃO regravou nada com o save velho', (float) $ana4['souls'] === 321.0 && (float) $ana4['lifetimeSouls'] === 321.0 && array_sum($ana4['generators'] ?? []) === 0);
$s0 = $http('stateSync', ['clientState' => ['souls' => '25700000000000', 'lifetimeSouls' => '25700000000000', 'runSouls' => '25700000000000']], $tokAna);
$check('HTTP: save sem época também recusado', $s0['status'] === 409 && ($s0['json']['error'] ?? '') === 'despertar_stale_epoch');
$s2 = $http('stateSync', ['seasonEpoch' => 2, 'clientState' => ['seasonEpoch' => 2, 'souls' => '350', 'lifetimeSouls' => '350', 'runSouls' => '350']], $tokAna);
$check('HTTP: sync com a época nova (2) é aceito', $s2['status'] === 200 && ($s2['json']['state']['seasonEpoch'] ?? null) === 2, "status={$s2['status']} " . ($s2['json']['error'] ?? ''));
$pr = $http('prestige', ['seasonEpoch' => 1], $tokAna);
$check('HTTP: prestígio de época velha recusado', $pr['status'] === 409 && ($pr['json']['error'] ?? '') === 'despertar_stale_epoch');
$ga = $http('stateGet', [], $tokAna);
$check('HTTP: stateGet devolve a época 2 e o jogo já está liberado', $ga['status'] === 200 && ($ga['json']['state']['seasonEpoch'] ?? null) === 2);
$st2 = $http('seasonStatus', [], $tokAna);
$check('HTTP seasonStatus pós-reinício: sem tranco, época 2', ($st2['json']['restartHold'] ?? null) === false && ($st2['json']['seasonEpoch'] ?? null) === 2 && ($st2['json']['published'] ?? null) === true);
// ═════════════════════════════════════════════════════════════════════════════
// LETHE DE PONTA A PONTA (época 2, save zerado, API real): quem faz a Catábase compra o selo
// O banco só entra para "ter jogado até lá" (almas da corrida); prestige/talentBuy/stateGet são HTTP.
// ═════════════════════════════════════════════════════════════════════════════
echo "\n— Lethe de ponta a ponta —\n";
$bearer = static fn(int $uid, string $tok): string => $mkSession($uid, $tok);
$post = static fn(string $tok, string $action, array $extra = []) => $http($action, ['seasonEpoch' => 2] + $extra, $tok);
$runUpTo = static function (int $uid, string $souls) {
    DespertarService::getOrCreateStateRow($uid);
    DespertarService::persistPatch($uid, [
        'souls' => $souls, 'run_souls' => $souls, 'lifetime_souls' => $souls,
        'last_sync_at' => \App\Core\Database::nowIso(), 'updated_at' => \App\Core\Database::nowIso(),
    ]);
};
$st = static fn(array $r): array => $r['json']['state'] ?? [];
$money = static fn($v): float => (float) $v;

// A) O mínimo possível: 5,1e8 almas = 1 óbolo. Tem que sobrar Essência para o selo raiz.
$tokEnzo = $bearer($ids['enzo'], 'ensaio-enzo');
$runUpTo($ids['enzo'], '510000000.00');
$g0 = $post($tokEnzo, 'stateGet');
$check('Lethe A: save zerado na época 2 (sem talentos, sem essência, época certa)', $g0['status'] === 200
    && $st($g0)['talents'] === [] && $money($st($g0)['mnemosyne']) === 0.0 && ($st($g0)['seasonEpoch'] ?? null) === 2);
$p0 = $post($tokEnzo, 'prestige');
$check('Lethe A: 1ª Catábase no mínimo (5,1e8) aceita e deixa 1 óbolo + 1 Essência', $p0['status'] === 200
    && $money($st($p0)['obols']) === 1.0 && $money($st($p0)['mnemosyne']) === 1.0 && $st($p0)['prestigeCount'] === 1, json_encode($p0['json']['error'] ?? ''));
$bad = $post($tokEnzo, 'talentBuy', ['talentId' => 'portoes_gemeos']);
$check('Lethe A: filho sem a raiz é recusado dizendo QUAL selo falta', $bad['status'] === 400
    && str_contains((string) ($bad['json']['error'] ?? ''), 'faltam vertentes') && str_contains((string) ($bad['json']['error'] ?? ''), '«legado»'), (string) ($bad['json']['error'] ?? ''));
$b0 = $post($tokEnzo, 'talentBuy', ['talentId' => 'legado']);
$check('Lethe A: selo raiz comprado logo após o prestige, sem esperar flush/sync', $b0['status'] === 200
    && $st($b0)['talents'] === ['legado'] && $money($st($b0)['mnemosyne']) === 0.0, (string) ($b0['json']['error'] ?? ''));
$poor = $post($tokEnzo, 'talentBuy', ['talentId' => 'portoes_gemeos']);
$check('Lethe A: sem essência a recusa diz quanto tem e quanto custa', $poor['status'] === 400
    && str_contains((string) ($poor['json']['error'] ?? ''), 'Essência insuficiente: você tem 0, este selo custa 1'), (string) ($poor['json']['error'] ?? ''));
$gA = $post($tokEnzo, 'stateGet');
$check('Lethe A: recarregar (stateGet + heal) mantém selo, essência e óbolo', $st($gA)['talents'] === ['legado']
    && $money($st($gA)['mnemosyne']) === 0.0 && $money($st($gA)['obols']) === 1.0);

// B) Fluxo completo: raiz + filho, recarga, fechar/reabrir o Rio, 2ª Catábase.
$tokFabi = $bearer($ids['fabi'], 'ensaio-fabi');
$runUpTo($ids['fabi'], '64000000000.00'); // sqrt(64e9/4e9)=4 óbolos → 2 de Essência
$p1 = $post($tokFabi, 'prestige');
$check('Lethe B: Catábase com 6,4e10 almas dá 4 óbolos e 2 de Essência', $p1['status'] === 200
    && $money($st($p1)['obols']) === 4.0 && $money($st($p1)['mnemosyne']) === 2.0 && ($st($p1)['ascensionOpen'] ?? null) === true);
$sRoot = $post($tokFabi, 'talentBuy', ['talentId' => 'legado']);
$sKid = $post($tokFabi, 'talentBuy', ['talentId' => 'portoes_gemeos']);
$check('Lethe B: selo raiz e logo em seguida o filho comprados', $sRoot['status'] === 200 && $sKid['status'] === 200
    && $st($sKid)['talents'] === ['legado', 'portoes_gemeos'] && $money($st($sKid)['mnemosyne']) === 0.0, (string) ($sKid['json']['error'] ?? ''));
$again = $post($tokFabi, 'talentBuy', ['talentId' => 'legado']);
$check('Lethe B: comprar o mesmo selo de novo é idempotente (sem cobrar)', $again['status'] === 200 && $money($st($again)['mnemosyne']) === 0.0);
$syncAfter = $post($tokFabi, 'stateSync', ['clientState' => $st($sKid)]);
$check('Lethe B: sync com o estado que o servidor acabou de devolver não perde selo nem essência', $syncAfter['status'] === 200
    && $st($syncAfter)['talents'] === ['legado', 'portoes_gemeos'] && $money($st($syncAfter)['mnemosyne']) === 0.0, (string) ($syncAfter['json']['error'] ?? ''));
$reload = $post($tokFabi, 'stateGet');
$check('Lethe B: recarregar (stateGet) = selos, essência e óbolos batem', $st($reload)['talents'] === ['legado', 'portoes_gemeos']
    && $money($st($reload)['mnemosyne']) === 0.0 && $money($st($reload)['obols']) === 4.0 && $st($reload)['prestigeCount'] === 1);

// fechar e reabrir o Rio
DespertarService::persistPatch($ids['fabi'], ['mnemosyne' => '3.00', 'updated_at' => \App\Core\Database::nowIso()]);
$close = $post($tokFabi, 'closeAscension');
$gClosed = $post($tokFabi, 'stateGet');
$check('Rio: closeAscension é tratado pelo servidor (200) e o estado volta fechado', $close['status'] === 200
    && ($st($close)['ascensionOpen'] ?? null) === false && ($st($gClosed)['ascensionOpen'] ?? null) === false, "status={$close['status']}");
$reopen = $post($tokFabi, 'talentBuy', ['talentId' => 'bolachas_celestes']);
$check('Rio: reabrir e comprar de novo (essência 3, selo de custo 3) funciona', $reopen['status'] === 200
    && ($st($reopen)['ascensionOpen'] ?? null) === true && in_array('bolachas_celestes', $st($reopen)['talents'], true)
    && $money($st($reopen)['mnemosyne']) === 0.0, (string) ($reopen['json']['error'] ?? ''));

// 2ª Catábase e compra
$runUpTo($ids['fabi'], '5184000000000.00'); // raw=36, /(1+1)=18 óbolos → 9 de Essência
$p2 = $post($tokFabi, 'prestige');
$check('Lethe B: 2ª Catábase aceita (18 óbolos novos, 9 de Essência)', $p2['status'] === 200 && $st($p2)['prestigeCount'] === 2
    && $money($st($p2)['obols']) === 22.0 && $money($st($p2)['mnemosyne']) === 9.0, json_encode([$p2['json']['error'] ?? '', $st($p2)['obols'] ?? null, $st($p2)['mnemosyne'] ?? null]));
$b2 = $post($tokFabi, 'talentBuy', ['talentId' => 'classic_dairy_selection']);
$check('Lethe B: compra após a 2ª Catábase (custo 9)', $b2['status'] === 200 && $money($st($b2)['mnemosyne']) === 0.0
    && in_array('classic_dairy_selection', $st($b2)['talents'], true), (string) ($b2['json']['error'] ?? ''));
$gEnd = $post($tokFabi, 'stateGet');
$check('Lethe B: no fim, selos e essência no servidor batem com o que a API devolveu', $st($gEnd)['talents'] === $st($b2)['talents']
    && $money($st($gEnd)['mnemosyne']) === 0.0 && $money($st($gEnd)['obols']) === 22.0);

// ═════════════════════════════════════════════════════════════════════════════
// REINÍCIO INDEPENDENTE DE TRÁFEGO DO DESPERTAR (T6): qualquer requisição da API e o cron CLI
// ═════════════════════════════════════════════════════════════════════════════
echo "\n— Reinício por ranking e por cron —\n";
$childEnv = static fn(string $now): array => array_merge(getenv(), ['FJD_ENSAIO_NOW' => $now]);
$serverAt = static function (int $p, string $now) use ($root, $childEnv) {
    $proc = proc_open([PHP_BINARY, '-S', "127.0.0.1:{$p}", $root . '/backend/index.php'], [1 => ['file', 'php://stderr', 'w'], 2 => ['file', 'php://stderr', 'w']], $pipes, $root, $childEnv($now));
    for ($i = 0; $i < 50; $i++) {
        if (@file_get_contents("http://127.0.0.1:{$p}/api/none", false, stream_context_create(['http' => ['ignore_errors' => true, 'timeout' => 2]])) !== false) {
            break;
        }
        usleep(200000);
    }
    return $proc;
};
$apiPost = static function (int $p, string $route, array $body, string $tok): array {
    $ctx = stream_context_create(['http' => [
        'method' => 'POST', 'ignore_errors' => true, 'timeout' => 20,
        'header' => "Content-Type: application/json\r\nAuthorization: Bearer {$tok}\r\n",
        'content' => json_encode($body + ['token' => $tok]),
    ]]);
    $raw = @file_get_contents("http://127.0.0.1:{$p}/api/{$route}", false, $ctx);
    $status = 0;
    foreach ($http_response_header ?? [] as $h) {
        if (preg_match('#^HTTP/\S+ (\d{3})#', $h, $m)) {
            $status = (int) $m[1];
        }
    }
    return ['status' => $status, 'json' => json_decode((string) $raw, true) ?: []];
};
$arm = static function () use ($adminId, $ids, $bugged, $pdo) {
    DespertarService::setDespertarGate(DespertarService::SEASON_RESTART_GATE, false, $adminId);
    DespertarService::forgetSeasonCaches();
    foreach (['ana', 'bia'] as $u) {
        DespertarService::getOrCreateStateRow($ids[$u]);
        DespertarService::persistPatch($ids[$u], $bugged('25700000000000.00'));
    }
};
$nStates = static fn(): int => (int) $pdo->query('SELECT COUNT(*) FROM `despertar_states`')->fetchColumn();

// 1) Requisição de RANKING (rota progress, nem toca o Despertar) depois do instante dispara o reinício.
$arm();
$before = $serverAt(8097, '2026-11-02T14:59:59Z');
$rBefore = $apiPost(8097, 'progress', ['action' => 'leaderboardGet', 'scope' => 'global', 'sort' => 'xp'], $tokAna);
$stillThere = $nStates() >= 2 && !DespertarService::isSeasonRestartDone();
proc_terminate($before);
proc_close($before);
$check('Ranking 1s ANTES do instante: responde e NÃO reinicia', $rBefore['status'] === 200 && $stillThere, "status={$rBefore['status']}");
$after = $serverAt(8098, '2026-11-02T15:00:01Z');
$rAfter = $apiPost(8098, 'progress', ['action' => 'leaderboardGet', 'scope' => 'global', 'sort' => 'xp'], $tokAna);
DespertarService::forgetSeasonCaches();
$check('Ranking 1s DEPOIS do instante: a própria requisição reinicia (estados zerados, gate feito, época 2)', $rAfter['status'] === 200
    && $nStates() === 0 && DespertarService::isSeasonRestartDone() && DespertarService::currentSeasonEpoch() === 2, "status={$rAfter['status']} estados={$nStates()}");
$rAgain = $apiPost(8098, 'progress', ['action' => 'leaderboardGet', 'scope' => 'global', 'sort' => 'xp'], $tokAna);
$check('Ranking de novo: segue funcionando e não reinicia outra vez', $rAgain['status'] === 200 && $nStates() === 0);
proc_terminate($after);
proc_close($after);

// 2) CLI idempotente (cron do cPanel).
$cli = static function (string $now) use ($root, $childEnv): array {
    $proc = proc_open([PHP_BINARY, $root . '/backend/cron-season-restart.php'], [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, $root, $childEnv($now));
    $out = stream_get_contents($pipes[1]);
    stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    return ['exit' => proc_close($proc), 'json' => json_decode(trim($out), true) ?: []];
};
$arm();
$c0 = $cli('2026-11-02T14:59:59Z');
$check('CLI antes do instante: não faz nada e sai 0', $c0['exit'] === 0 && ($c0['json']['ran'] ?? null) === false
    && ($c0['json']['due'] ?? null) === false && $nStates() >= 2, json_encode($c0));
$c1 = $cli('2026-11-02T15:00:00Z');
DespertarService::forgetSeasonCaches();
$check('CLI no instante: reinicia (ran=true, época 2, estados zerados) e sai 0', $c1['exit'] === 0 && ($c1['json']['ran'] ?? null) === true
    && ($c1['json']['seasonEpoch'] ?? null) === 2 && $nStates() === 0, json_encode($c1));
DespertarService::getOrCreateStateRow($ids['ana']);
DespertarService::persistPatch($ids['ana'], ['souls' => '321.00', 'lifetime_souls' => '321.00', 'run_souls' => '321.00', 'last_sync_at' => \App\Core\Database::nowIso()]);
$c2 = $cli('2026-11-02T18:00:00Z');
$anaSouls = (float) $pdo->query('SELECT souls FROM despertar_states WHERE user_id=' . $ids['ana'])->fetchColumn();
$check('CLI de novo (idempotente): ran=false, done=true, exit 0 e a T2 nova (321) fica', $c2['exit'] === 0 && ($c2['json']['ran'] ?? null) === false
    && ($c2['json']['done'] ?? null) === true && $anaSouls === 321.0, json_encode($c2));

// ═════════════════════════════════════════════════════════════════════════════
// ANTI-BOT DO JUÍZO (T8) pelo HTTP real: ban de 6 h só no Juízo, recorde zerado, desban, expiração
// ═════════════════════════════════════════════════════════════════════════════
echo "\n— Anti-bot do Juízo (HTTP) —\n";
$chromeUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
$browserH = ["User-Agent: {$chromeUa}", 'Origin: http://127.0.0.1:8099', 'Sec-Fetch-Site: same-origin', 'Sec-Fetch-Mode: cors'];
$pythonH = ['User-Agent: python-requests/2.31.0'];
$gx = static function (string $action, array $body, string $tok, array $headers) use ($port): array {
    $ctx = stream_context_create(['http' => [
        'method' => 'POST', 'ignore_errors' => true, 'timeout' => 20,
        'header' => implode("\r\n", array_merge(['Content-Type: application/json', "Authorization: Bearer {$tok}"], $headers)),
        'content' => json_encode(array_merge(['action' => $action, 'token' => $tok, 'seasonEpoch' => 2], $body)),
    ]]);
    $raw = @file_get_contents("http://127.0.0.1:{$port}/api/despertar", false, $ctx);
    $status = 0;
    foreach ($http_response_header ?? [] as $h) {
        if (preg_match('#^HTTP/\S+ (\d{3})#', $h, $m)) {
            $status = (int) $m[1];
        }
    }
    return ['status' => $status, 'json' => json_decode((string) $raw, true) ?: []];
};
$tokBia = $mkSession($ids['bia'], 'ensaio-bia');
$tokDuda = $mkSession($ids['duda'], 'ensaio-duda');
$tokGabi = $mkSession($ids['gabi'], 'ensaio-gabi');
$milestone0 = \App\Services\Despertar\DespertarCatalog::JUIZO_STREAK_MILESTONES[0]['id'];
$seedJuizo = static function (int $uid) use ($milestone0) {
    DespertarService::getOrCreateStateRow($uid);
    DespertarService::persistPatch($uid, [
        'juizo_best_streak' => 21, 'juizo_current_streak' => 4, 'verdicts' => 33,
        'juizo_milestones_claimed' => [$milestone0], 'updated_at' => \App\Core\Database::nowIso(),
    ]);
};
$rowOf = static fn(int $uid): array => $pdo->query('SELECT juizo_best_streak b, juizo_current_streak c, juizo_run r, verdicts v, juizo_milestones_claimed m FROM despertar_states WHERE user_id=' . $uid)->fetch(PDO::FETCH_ASSOC) ?: [];

// 1) Humano (Chrome, cabeçalhos de navegador, palpite com pausa humana): joga normal.
$seedJuizo($ids['bia']);
$hs = $gx('juizoStart', [], $tokBia, $browserH);
usleep(900000);
$hg = $gx('juizoGuess', ['choice' => 'A', 'juizoSignals' => ['webdriver' => false, 'trusted' => true]], $tokBia, $browserH);
$check('Humano: Juízo inicia e o palpite é julgado (sem ban)', $hs['status'] === 200 && !empty($hs['json']['pair']) && $hg['status'] === 200,
    "start={$hs['status']} guess={$hg['status']}");
$check('Humano: o recorde não foi tocado', (int) $rowOf($ids['bia'])['b'] >= 21);

// 2) Script (UA python-requests, sem Sec-Fetch/Origin): banido na hora, só no Juízo.
$preBan = $rowOf($ids['bia']); // o palpite humano é aleatório: compara Vereditos/marcos com o instante ANTES do ban
$bot = $gx('juizoStart', [], $tokBia, $pythonH);
$until = $bot['json']['bannedUntil'] ?? '';
$secs = $until !== '' ? (strtotime($until) - time()) : 0;
$check('Bot (python-requests): Juízo recusado com 403 despertar_juizo_banned, mensagem clara e hora de liberação', $bot['status'] === 403
    && ($bot['json']['error'] ?? '') === 'despertar_juizo_banned' && str_contains((string) ($bot['json']['message'] ?? ''), 'suspenso para você até')
    && str_contains((string) ($bot['json']['message'] ?? ''), 'horário de Brasília'), (string) ($bot['json']['message'] ?? ''));
$check('Ban dura 6 h (21600 s)', abs($secs - 21600) < 120, "restam {$secs}s");
$dbBan = $pdo->query('SELECT TIMESTAMPDIFF(SECOND, banned_at, banned_until) d FROM despertar_juizo_guard WHERE user_id=' . $ids['bia'])->fetchColumn();
$check('No banco: banned_until - banned_at = 21600 s', (int) $dbBan === 21600, "d={$dbBan}");
$r = $rowOf($ids['bia']);
$check('Ban zera recorde e sequência e encerra a corrida; Vereditos e marcos ficam', (int) $r['b'] === 0 && (int) $r['c'] === 0
    && $r['r'] === null && (int) $r['v'] === (int) $preBan['v'] && $r['m'] === $preBan['m'] && (int) $preBan['v'] >= 33, json_encode([$preBan, $r]));

// 3) O resto do Despertar segue; só o Juízo fecha (mesmo com cabeçalhos de navegador).
$g = $gx('stateGet', [], $tokBia, $browserH);
$sy = $gx('stateSync', ['clientState' => ['seasonEpoch' => 2] + ($g['json']['state'] ?? [])], $tokBia, $browserH);
$check('No ban o resto do Despertar funciona (stateGet e stateSync 200)', $g['status'] === 200 && $sy['status'] === 200, "get={$g['status']} sync={$sy['status']}");
$s1 = $gx('juizoStart', [], $tokBia, $browserH);
$s2 = $gx('juizoGuess', ['choice' => 'A'], $tokBia, $browserH);
$ab = $gx('juizoAbandon', [], $tokBia, $browserH);
$check('No ban: juizoStart e juizoGuess seguem recusados (403) e abandonar é inofensivo', $s1['status'] === 403 && $s2['status'] === 403 && $ab['status'] === 200,
    "start={$s1['status']} guess={$s2['status']} abandon={$ab['status']}");

// 4) Painel do Mestre: lista com motivo/sinais; aluno não vê; desbanir registra auditoria.
$lst = $gx('juizoGuardList', [], $tokAdmin, $browserH);
$mine = array_values(array_filter($lst['json']['entries'] ?? [], static fn($e) => ($e['userId'] ?? 0) === $ids['bia']))[0] ?? [];
$check('Admin vê o ban na lista: aluno, motivo, sinais e até quando', $lst['status'] === 200 && ($mine['active'] ?? false) === true
    && str_contains((string) ($mine['reason'] ?? ''), 'User-Agent') && !empty($mine['signals']) && !empty($mine['bannedUntil']) && ($mine['name'] ?? '') !== '',
    json_encode($mine['signals'][0] ?? null));
$check('Aluno não acessa a lista nem desbane (403)', $gx('juizoGuardList', [], $tokBia, $browserH)['status'] === 403
    && $gx('juizoGuardUnban', ['userId' => $ids['bia']], $tokBia, $browserH)['status'] === 403);
$un = $gx('juizoGuardUnban', ['userId' => $ids['bia']], $tokAdmin, $browserH);
$audit = (int) $pdo->query("SELECT COUNT(*) FROM admin_audit_events WHERE action='admin_despertar_juizo_unban' AND target_user_id=" . $ids['bia'])->fetchColumn();
$check('Desbanir funciona e é registrado no AdminAudit', $un['status'] === 200 && $audit === 1, "status={$un['status']} audit={$audit}");
$back = $gx('juizoStart', [], $tokBia, $browserH);
$check('Depois de desbanido o aluno volta a jogar o Juízo', $back['status'] === 200 && !empty($back['json']['pair']), "status={$back['status']}");

// 5) Expiração em 6 h (simulada recuando banned_until): volta sem precisar de desban.
$gx('juizoStart', [], $tokBia, $pythonH); // bane de novo
$pdo->exec("UPDATE despertar_juizo_guard SET banned_until = DATE_SUB(NOW(3), INTERVAL 1 SECOND) WHERE user_id=" . $ids['bia']);
$exp = $gx('juizoStart', [], $tokBia, $browserH);
$check('Ban expirado (6 h) libera sozinho', $exp['status'] === 200, "status={$exp['status']}");

// 6) Bot de navegador sem webdriver: palpites instantâneos (< 350 ms) com TUDO o mais perfeito → banido no 2º.
$seedJuizo($ids['duda']);
$banAt = 0;
for ($i = 1; $i <= 6 && $banAt === 0; $i++) {
    $gx('juizoStart', [], $tokDuda, $browserH);
    $gr = $gx('juizoGuess', ['choice' => 'A', 'juizoSignals' => ['webdriver' => false, 'trusted' => true]], $tokDuda, $browserH);
    if ($gr['status'] === 403) {
        $banAt = $i;
    }
}
$check('Bot com UA/cabeçalhos de Chrome mas palpite instantâneo (<350 ms): banido no 2º palpite rápido', $banAt === 2, "banAt={$banAt}");
$check('Esse ban também zerou o recorde', (int) $rowOf($ids['duda'])['b'] === 0);

// 7) navigator.webdriver=true informado pelo cliente: banido na hora.
$seedJuizo($ids['gabi']);
$wd = $gx('juizoStart', ['juizoSignals' => ['webdriver' => true]], $tokGabi, $browserH);
$check('webdriver=true: banido no primeiro pedido', $wd['status'] === 403 && ($wd['json']['error'] ?? '') === 'despertar_juizo_banned');

// 8) Admin nunca é banido (prévia/teste).
$adm = $gx('juizoStart', [], $tokAdmin, $pythonH);
$check('Admin com UA de script não é banido (prévia/teste do Mestre)', $adm['status'] === 200 || $adm['status'] === 503, "status={$adm['status']}");

// 9) Época/stale continua valendo no Juízo e o ban sobrevive ao reinício.
$stale = $gx('juizoGuess', ['choice' => 'A', 'seasonEpoch' => 1], $tokBia, $browserH);
$check('Juízo respeita a checagem de época (409 stale)', $stale['status'] === 409);
$guardBefore = (int) $pdo->query('SELECT COUNT(*) FROM despertar_juizo_guard')->fetchColumn();
DespertarService::setDespertarGate(DespertarService::SEASON_RESTART_GATE, false, $adminId);
DespertarService::forgetSeasonCaches();
DespertarService::restartSeason2IfDue($restartAt);
$guardAfter = (int) $pdo->query('SELECT COUNT(*) FROM despertar_juizo_guard')->fetchColumn();
$check('O reinício da temporada NÃO apaga o guard (bans seguem valendo)', $guardBefore >= 3 && $guardAfter === $guardBefore, "antes={$guardBefore} depois={$guardAfter}");

if (is_resource($srv)) {
    proc_terminate($srv);
    proc_close($srv);
}

$failed = count(array_filter($results, static fn($r) => !$r['ok']));
echo "\nensaio-temporada: " . (count($results) - $failed) . '/' . count($results) . " ok\n";
exit($failed > 0 ? 1 : 0);
