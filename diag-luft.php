<?php
declare(strict_types=1);

if (($_GET['k'] ?? '') !== 'luft-check-7c3e') {
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
    $out = [];
    foreach ($value as $item) {
        if (is_string($item) || is_int($item)) {
            $out[] = (string) $item;
        }
    }
    return $out;
}

function asMap(mixed $value): array
{
    if (is_string($value)) {
        $decoded = json_decode($value, true);
        $value = is_array($decoded) ? $decoded : [];
    }
    if ($value instanceof stdClass) {
        $value = (array) $value;
    }
    return is_array($value) ? $value : [];
}

try {
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
        $st = $pdo->prepare(
            'SELECT `obols`, `mnemosyne`, `souls`, `run_souls`, `lifetime_souls`, `prestige_count`,
                    `upgrades_state`, `talents_state`, `milestones`, `updated_at`
             FROM `despertar_states` WHERE `user_id` = :id LIMIT 1'
        );
        $st->execute([':id' => (int) $user['id']]);
        $row = $st->fetch(PDO::FETCH_ASSOC) ?: null;
        if (!$row) {
            $out[] = ['username' => $user['username'], 'fullName' => $user['full_name'], 'state' => null];
            continue;
        }
        $milestones = asMap($row['milestones'] ?? []);
        $out[] = [
            'id' => (int) $user['id'],
            'username' => $user['username'],
            'fullName' => $user['full_name'],
            'displayName' => $user['display_name'] ?? null,
            'obols' => (string) $row['obols'],
            'mnemosyne' => (string) $row['mnemosyne'],
            'prestigeCount' => (int) $row['prestige_count'],
            'souls' => (string) $row['souls'],
            'runSouls' => (string) $row['run_souls'],
            'lifetimeSouls' => (string) $row['lifetime_souls'],
            'upgrades' => asList($row['upgrades_state'] ?? []),
            'talents' => asList($row['talents_state'] ?? []),
            'heavenlyLegacy' => (bool) ($milestones['heavenlyPowerLegacy'] ?? false),
            'updatedAt' => $row['updated_at'] ?? null,
        ];
    }
    echo json_encode(['n' => count($out), 'rows' => $out], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
