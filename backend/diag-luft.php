<?php
declare(strict_types=1);

/**
 * Consulta única do save de um aluno. Remover logo após o uso.
 */
if (($_GET['k'] ?? '') !== 'luft-check-7c3e') {
    http_response_code(404);
    exit;
}

$externalBootstrap = dirname(__DIR__, 3) . '/src/' . basename(dirname(__DIR__)) . '/bootstrap.php';
if (is_file($externalBootstrap)) {
    require_once $externalBootstrap;
} else {
    require_once __DIR__ . '/bootstrap.php';
}

use App\Core\Database;
use App\Services\Despertar\DespertarFormulas;
use App\Services\Despertar\DespertarService;

header('Content-Type: application/json; charset=utf-8');

$pdo = Database::pdo();
$stmt = $pdo->query(
    "SELECT `id`, `username`, `full_name`, `display_name`, `role`
     FROM `users`
     WHERE `username` LIKE '%luft%'
        OR `full_name` LIKE '%luft%'
        OR `display_name` LIKE '%Luft%'
        OR `display_name` LIKE '%luft%'
        OR `username` = 'sammy'"
);
$users = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
$out = [];
foreach ($users as $user) {
    $st = $pdo->prepare('SELECT * FROM `despertar_states` WHERE `user_id` = :id LIMIT 1');
    $st->execute([':id' => (int) $user['id']]);
    $row = $st->fetch(PDO::FETCH_ASSOC) ?: null;
    if (!$row) {
        $out[] = ['user' => $user, 'state' => null];
        continue;
    }
    $state = DespertarService::buildStateDto($row);
    $bonus = DespertarFormulas::prestigeBonus(
        (string) ($state['obols'] ?? '0'),
        is_array($state['talents'] ?? null) ? $state['talents'] : [],
        [
            'upgrades' => is_array($state['upgrades'] ?? null) ? $state['upgrades'] : [],
            'milestones' => is_array($state['milestones'] ?? null) ? $state['milestones'] : [],
        ]
    );
    $powerIds = ['segredo_do_obolo', 'banca_do_obolo', 'forja_do_obolo', 'confeitaria_do_obolo', 'chave_do_obolo'];
    $ownedPower = array_values(array_intersect($powerIds, $state['upgrades'] ?? []));
    $out[] = [
        'id' => (int) $user['id'],
        'username' => $user['username'],
        'fullName' => $user['full_name'],
        'displayName' => $user['display_name'] ?? null,
        'obols' => $state['obols'],
        'mnemosyne' => $state['mnemosyne'],
        'prestigeCount' => $state['prestigeCount'],
        'souls' => $state['souls'],
        'runSouls' => $state['runSouls'],
        'lifetimeSouls' => $state['lifetimeSouls'],
        'prestigeBonus' => $bonus,
        'heavenlyUpgrades' => $ownedPower,
        'heavenlyLegacy' => (bool) (($state['milestones']['heavenlyPowerLegacy'] ?? false)),
        'talents' => $state['talents'],
        'updatedAt' => $row['updated_at'] ?? null,
    ];
}

echo json_encode(['n' => count($out), 'rows' => $out], JSON_UNESCAPED_UNICODE);
