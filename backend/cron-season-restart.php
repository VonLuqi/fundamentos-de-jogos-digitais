<?php
declare(strict_types=1);

/**
 * Reinício da Temporada 2 do Despertar via Cron Job do cPanel (HostGator).
 * Faz exatamente o mesmo reset que a primeira requisição da API depois de 2026-11-02T12:00:00-03:00
 * (15:00 UTC): idempotente (gate season2_restart_done + GET_LOCK), então pode rodar várias vezes;
 * antes do instante não faz nada.
 *
 * Exemplo de agendamento no cPanel (2026-11-02 às 15:00 UTC; confira o fuso do servidor, veja docs/ENSAIO-TEMPORADA-2.md):
 *   0 15 2 11 * /usr/local/bin/php /home/SEU_USUARIO_CPANEL/SEU_SUBDOMINIO/backend/cron-season-restart.php >> /home/SEU_USUARIO_CPANEL/season-restart.log 2>&1
 *
 * Saída: uma linha JSON. Código de saída 1 se passou do instante e o reset ainda não está feito
 * (ex.: GET_LOCK ocupado): rode de novo; a próxima requisição da API também tenta.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Execute via CLI (cPanel Cron Jobs).']);
    exit(1);
}

require_once __DIR__ . '/bootstrap.php';

use App\Services\Despertar\DespertarService;

try {
    $ran = DespertarService::restartSeason2IfDue();
    $done = DespertarService::isSeasonRestartDone();
    $due = DespertarService::seasonClockNow() >= new DateTimeImmutable(DespertarService::SEASON_RESTART_AT);
    echo json_encode([
        'ran' => $ran,
        'done' => $done,
        'due' => $due,
        'seasonEpoch' => DespertarService::currentSeasonEpoch(),
        'restartAt' => DespertarService::SEASON_RESTART_AT,
        'now' => gmdate('c'),
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;
    exit($due && !$done ? 1 : 0);
} catch (Throwable $e) {
    fwrite(STDERR, 'Erro no cron-season-restart: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}
