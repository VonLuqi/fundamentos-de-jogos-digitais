<?php
declare(strict_types=1);

if (($_GET['k'] ?? '') !== 'seb-check-4a91') {
    http_response_code(404);
    exit;
}

$externalBootstrap = dirname(__DIR__, 2) . '/src/' . basename(__DIR__) . '/bootstrap.php';
if (!is_file($externalBootstrap)) {
    http_response_code(500);
    echo 'bootstrap';
    exit;
}
require_once $externalBootstrap;

use App\Core\Database;

header('Content-Type: application/json; charset=utf-8');

function asList(mixed $value): array
{
    if (is_string($value)) {
        $decoded = json_decode($value, true);
        $value = is_array($decoded) ? $decoded : [];
    }
    if ($value instanceof stdClass) {
        $value = (array) $value;
    }
    if (!is_array($value)) {
        return [];
    }
    if (array_is_list($value)) {
        $out = [];
        foreach ($value as $item) {
            if (is_string($item) || is_int($item)) {
                $out[] = (string) $item;
            }
        }
        return $out;
    }
    return $value;
}

try {
    $pdo = Database::pdo();
    $stmt = $pdo->query(
        "SELECT `id`, `username`, `full_name`, `display_name`
         FROM `users`
         WHERE `username` LIKE '%seb%'
            OR `full_name` LIKE '%seb%'
            OR `display_name` LIKE '%seb%'"
    );
    $users = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
    $out = [];
    foreach ($users as $user) {
        $st = $pdo->prepare(
            'SELECT `obols`, `souls`, `run_souls`, `lifetime_souls`, `prestige_count`,
                    `generators_state`, `upgrades_state`, `talents_state`, `stats`, `updated_at`
             FROM `despertar_states` WHERE `user_id` = :id LIMIT 1'
        );
        $st->execute([':id' => (int) $user['id']]);
        $row = $st->fetch(PDO::FETCH_ASSOC) ?: null;
        if (!$row) {
            $out[] = ['username' => $user['username'], 'fullName' => $user['full_name'], 'state' => null];
            continue;
        }
        $stats = asList($row['stats'] ?? []);
        $out[] = [
            'id' => (int) $user['id'],
            'username' => $user['username'],
            'fullName' => $user['full_name'],
            'displayName' => $user['display_name'] ?? null,
            'obols' => (string) $row['obols'],
            'souls' => (string) $row['souls'],
            'runSouls' => (string) $row['run_souls'],
            'lifetimeSouls' => (string) $row['lifetime_souls'],
            'prestigeCount' => (int) $row['prestige_count'],
            'generators' => asList($row['generators_state'] ?? []),
            'upgrades' => asList($row['upgrades_state'] ?? []),
            'talents' => asList($row['talents_state'] ?? []),
            'shimmersClicked' => (int) ($stats['shimmersClicked'] ?? $stats['shimmers_clicked'] ?? 0),
            'shimmersMissed' => (int) ($stats['shimmersMissed'] ?? $stats['shimmers_missed'] ?? 0),
            'updatedAt' => $row['updated_at'] ?? null,
        ];
    }
    echo json_encode(['n' => count($out), 'rows' => $out], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
