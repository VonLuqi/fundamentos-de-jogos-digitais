<?php
declare(strict_types=1);

/**
 * Bootstrap do Backend PHP 8+ (HostGator cPanel / Apache + PDO MySQL).
 */

date_default_timezone_set('UTC');
mb_internal_encoding('UTF-8');

define('FJD_ROOT', dirname(__DIR__));
define('FJD_BACKEND_ROOT', __DIR__);

spl_autoload_register(static function (string $class): void {
    $prefix = 'App\\';
    if (strncmp($prefix, $class, strlen($prefix)) !== 0) {
        return;
    }
    $relative = substr($class, strlen($prefix));
    $file = __DIR__ . '/src/' . str_replace('\\', '/', $relative) . '.php';
    if (is_file($file)) {
        require_once $file;
    }
});

\App\Core\Env::load(FJD_ROOT);
