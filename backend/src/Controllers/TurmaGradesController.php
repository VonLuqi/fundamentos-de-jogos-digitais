<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\AdminAudit;
use App\Core\Http;
use App\Core\RateLimiter;
use App\Services\Grades\TurmaGradesService;
use App\Services\Progress\ProgressShared;
use App\Services\SessionService;

/**
 * Controller de `/api/turma-grades` (fechamento de notas da turma, 100 pts).
 * Admin: adminGradebook, adminClose, adminReopen, adminCsv. Aluno: myGrade.
 */
final class TurmaGradesController
{
    public static function handle(): void
    {
        Http::cors(['GET', 'POST', 'OPTIONS']);
        $method = Http::method();
        if (!in_array($method, ['GET', 'POST'], true)) {
            Http::json(405, ['error' => 'Method not allowed']);
        }

        $auth = SessionService::requireSession();
        $user = $auth['user'];
        $body = $method === 'POST' ? Http::jsonBody() : [];
        $action = trim((string) (($method === 'GET' ? Http::query('action') : ($body['action'] ?? Http::query('action'))) ?? ''));
        if ($action === '') {
            Http::json(400, ['error' => 'Informe action.']);
        }

        $rl = RateLimiter::check('rl:turma-grades:u:' . (int) $user['id'], 60, 60);
        if (!$rl['allowed']) {
            header('Retry-After: ' . $rl['retryAfterSec']);
            Http::json(429, ['error' => 'Muitas requisições. Aguarde alguns segundos.']);
        }

        if ($action === 'myGrade') {
            Http::json(200, ['ok' => true] + TurmaGradesService::studentGrade($user));
        }

        if (!str_starts_with($action, 'admin')) {
            Http::json(400, ['error' => 'Ação desconhecida.']);
        }
        if (!SessionService::isAdmin($user)) {
            Http::json(403, ['error' => 'Acesso restrito ao Mestre.']);
        }
        $rawTurma = $method === 'GET' ? Http::query('turma') : ($body['turma'] ?? Http::query('turma'));
        if (!is_string($rawTurma)) {
            Http::json(400, ['error' => 'turma deve ser texto.']);
        }
        $turma = trim($rawTurma);
        if ($turma === '') {
            Http::json(400, ['error' => 'Informe turma.']);
        }
        if (!in_array($turma, ProgressShared::VALID_TURMAS, true)) {
            Http::json(400, ['error' => 'Turma inválida. Use ' . implode(' ou ', ProgressShared::VALID_TURMAS) . '.']);
        }
        $actorId = (int) $user['id'];

        switch ($action) {
            case 'adminGradebook':
                $rows = TurmaGradesService::liveRows($turma);
                $closure = TurmaGradesService::closure($turma);
                $missing = [];
                if ($closure['status'] === 'closed') {
                    $inSnap = TurmaGradesService::snapshotUserIds($turma);
                    foreach ($rows as $i => $r) {
                        $rows[$i]['inSnapshot'] = isset($inSnap[$r['userId']]);
                        if (!$rows[$i]['inSnapshot']) {
                            $missing[] = ['userId' => $r['userId'], 'name' => $r['name']];
                        }
                    }
                }
                Http::json(200, [
                    'ok' => true,
                    'closure' => $closure,
                    'rows' => $rows,
                    'pending' => TurmaGradesService::pendingList($rows),
                    'missingFromSnapshot' => $missing,
                ]);
                // no break: json() é never
            case 'adminClose':
                if ($method !== 'POST') {
                    Http::json(405, ['error' => 'Method not allowed']);
                }
                $res = TurmaGradesService::close($turma, $actorId, ($body['force'] ?? false) === true);
                if (!$res['ok']) {
                    Http::error($res['status'], $res['error'] ?? 'Erro.', isset($res['pending']) ? ['pending' => $res['pending']] : []);
                }
                AdminAudit::record($actorId, AdminAudit::ACTIONS['closeTurmaGrades'], null, [
                    'turma' => $turma,
                    'force' => ($body['force'] ?? false) === true,
                    'students' => $res['closedCount'],
                    'pendingCount' => count($res['pending'] ?? []),
                ]);
                Http::json(200, ['ok' => true, 'closure' => TurmaGradesService::closure($turma), 'closedCount' => $res['closedCount'], 'pending' => $res['pending']]);
            case 'adminReopen':
                if ($method !== 'POST') {
                    Http::json(405, ['error' => 'Method not allowed']);
                }
                $res = TurmaGradesService::reopen($turma, $actorId);
                if (!$res['ok']) {
                    Http::error($res['status'], $res['error'] ?? 'Erro.');
                }
                AdminAudit::record($actorId, AdminAudit::ACTIONS['reopenTurmaGrades'], null, ['turma' => $turma]);
                Http::json(200, ['ok' => true, 'closure' => TurmaGradesService::closure($turma)]);
            case 'adminCsv':
                $closure = TurmaGradesService::closure($turma);
                Http::json(200, [
                    'ok' => true,
                    'filename' => 'notas-turma-' . preg_replace('/[^A-Za-z0-9_-]+/', '_', $turma) . '.csv',
                    'source' => $closure['status'] === 'closed' ? 'snapshot' : 'live',
                    'csv' => TurmaGradesService::csv($turma),
                ]);
            default:
                Http::json(400, ['error' => 'Ação desconhecida.']);
        }
    }
}
