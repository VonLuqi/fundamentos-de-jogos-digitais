<?php
declare(strict_types=1);

if (($_GET['k'] ?? '') !== 'audit-bonus-91c') {
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

function asJson(mixed $value): array
{
    if (is_string($value)) {
        $decoded = json_decode($value, true);
        $value = is_array($decoded) ? $decoded : [];
    }
    if ($value instanceof stdClass) {
        $value = json_decode(json_encode($value), true);
    }
    return is_array($value) ? $value : [];
}

try {
    $pdo = Database::pdo();
    $sql = "SELECT u.id, u.username, u.full_name, u.display_name,
                   d.obols, d.mnemosyne, d.souls, d.prestige_count,
                   d.generators_state, d.upgrades_state, d.talents_state, d.milestones
            FROM users u
            INNER JOIN despertar_states d ON d.user_id = u.id
            WHERE u.role = 'student'";
    $rows = $pdo->query($sql)?->fetchAll(PDO::FETCH_ASSOC) ?: [];
    $out = [];
    foreach ($rows as $row) {
        $milestones = asJson($row['milestones'] ?? []);
        $out[] = [
            'username' => $row['username'],
            'fullName' => $row['full_name'],
            'displayName' => $row['display_name'] ?? null,
            'obols' => (string) $row['obols'],
            'mnemosyne' => (string) $row['mnemosyne'],
            'souls' => (string) $row['souls'],
            'prestigeCount' => (int) $row['prestige_count'],
            'generators' => asJson($row['generators_state'] ?? []),
            'upgrades' => array_values(array_filter(asJson($row['upgrades_state'] ?? []), 'is_string')),
            'talents' => array_values(array_filter(asJson($row['talents_state'] ?? []), 'is_string')),
            'heavenlyLegacy' => (bool) ($milestones['heavenlyPowerLegacy'] ?? false),
        ];
    }
    echo json_encode(['n' => count($out), 'rows' => $out], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
