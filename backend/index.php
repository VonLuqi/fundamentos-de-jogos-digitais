<?php
declare(strict_types=1);

/**
 * Front Controller da API PHP 8+ (HostGator cPanel / Apache).
 * Todas as requisições a `/api/*` são encaminhadas para cá pelo `.htaccess`.
 */

define('FJD_ROOT', dirname(__DIR__));

$externalBootstrap = dirname(__DIR__, 3) . '/src/' . basename(dirname(__DIR__)) . '/bootstrap.php';
if (is_file($externalBootstrap)) {
    require_once $externalBootstrap;
} else {
    require_once __DIR__ . '/bootstrap.php';
}

use App\Controllers\AuthController;
use App\Controllers\ClassindController;
use App\Controllers\CronController;
use App\Controllers\DespertarController;
use App\Controllers\ProgressController;
use App\Controllers\ProvaController;
use App\Controllers\SessionBootstrapController;
use App\Core\Database;
use App\Core\Http;
use App\Core\MysqlMigrator;
use App\Core\RateLimiter;

// Resposta imediata para preflight CORS se aplicável
if (Http::method() === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Determina a rota chamada (ex.: "auth", "progress", "cron/sessions-purge")
$route = trim((string) ($_GET['_route'] ?? ''), '/');
if ($route === '') {
    $uriPath = (string) parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH);
    if (preg_match('#/api/(.*)$#', $uriPath, $m)) {
        $route = trim($m[1], '/');
    }
}

// Verifica configuração do banco MySQL
if (!Database::isConfigured()) {
    Http::error(500, 'Servidor sem configuração de banco MySQL (.env ausente ou incompleto).');
}

try {
    MysqlMigrator::apply();
} catch (Throwable $e) {
    error_log('[migrate] ' . $e->getMessage());
    Http::error(500, $e->getMessage());
}

// Rate limit por IP na borda (espelho do `middleware.js` da Vercel)
$edgeGroups = [
    'auth' => 'auth',
    'despertar' => 'despertar',
    'progress' => 'progress',
    'prova' => 'prova',
];
if (isset($edgeGroups[$route])) {
    $edgeRes = RateLimiter::consumeEdgeIp($edgeGroups[$route], Http::clientIp());
    if ($edgeRes['limited']) {
        RateLimiter::applyRetryAfterHeader($edgeRes);
        Http::json(429, [
            'ok' => false,
            'error' => 'Muitas requisições deste endereço. Aguarde e tente de novo.',
            'code' => 'edge_rate_limited',
        ]);
    }
}

try {
    switch ($route) {
        case 'auth':
            AuthController::handle();
            break;

        case 'session-bootstrap':
            SessionBootstrapController::handle();
            break;

        case 'progress':
            ProgressController::handle();
            break;

        case 'despertar':
            DespertarController::handle();
            break;

        case 'prova':
            ProvaController::handle();
            break;

        case 'classind':
            ClassindController::handle();
            break;

        case 'cron/sessions-purge':
            CronController::sessionsPurge();
            break;

        case 'cron/warmup':
            CronController::warmup();
            break;

        default:
            Http::error(404, 'Rota de API não encontrada.');
    }
} catch (Throwable $e) {
    error_log('[api/fatal] ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    Http::error(500, 'Erro interno no servidor.');
}
