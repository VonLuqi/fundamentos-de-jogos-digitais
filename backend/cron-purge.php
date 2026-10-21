<?php
declare(strict_types=1);

/**
 * Script CLI para Cron Jobs do cPanel na HostGator.
 * Exemplo de agendamento no cPanel (1x por dia às 04:00):
 *   /usr/local/bin/php /home/SEU_USUARIO_CPANEL/SEU_SUBDOMINIO/backend/cron-purge.php >/dev/null 2>&1
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Execute via CLI (cPanel Cron Jobs) ou use GET /api/cron/sessions-purge com Bearer CRON_SECRET.']);
    exit(1);
}

require_once __DIR__ . '/bootstrap.php';

use App\Controllers\CronController;

try {
    $result = CronController::runPurgeNow();
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . PHP_EOL;
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, 'Erro no cron-purge: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}
