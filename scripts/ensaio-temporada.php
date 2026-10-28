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
$check('Portões: season_liberated e published ligados', DespertarService::isSeasonLiberated() && DespertarService::isDespertarPublished());

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

// Conquistas do Despertar ficam no perfil (users.conquistas) entre temporadas → Véu da T2 já começa alto.
$conq = json_decode((string) $pdo->query("SELECT `conquistas` FROM `users` WHERE `id` = {$uid}")->fetchColumn(), true);
$veil = DespertarFormulas::veilPercent($conq);
$check('Informativo: conquistas da T1 continuam no perfil', true, 'ana entra na T2 com ' . count($conq) . " conquistas → Véu {$veil}%");

$failed = count(array_filter($results, static fn($r) => !$r['ok']));
echo "\nensaio-temporada: " . (count($results) - $failed) . '/' . count($results) . " ok\n";
exit($failed > 0 ? 1 : 0);
