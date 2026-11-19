<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\AdminAudit;
use App\Core\Http;
use App\Core\RateLimiter;
use App\Services\Grades\RecoveryService;
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
            Http::json(200, ['ok' => true] + TurmaGradesService::studentGrade($user) + RecoveryService::studentDto($user));
        }

        if (!str_starts_with($action, 'admin')) {
            Http::json(400, ['error' => 'Ação desconhecida.']);
        }
        if (!SessionService::isAdmin($user)) {
            Http::json(403, ['error' => 'Acesso restrito ao Mestre.']);
        }
        // Liberação manual por aluno: não depende de turma.
        if (in_array($action, ['adminRecoveryOverrides', 'adminRecoveryGrant', 'adminRecoveryRevoke'], true)) {
            $actor = (int) $user['id'];
            if ($action !== 'adminRecoveryOverrides') {
                if ($method !== 'POST') {
                    Http::json(405, ['error' => 'Method not allowed']);
                }
                $target = $body['userId'] ?? null;
                if (!is_int($target) || $target <= 0) {
                    Http::json(400, ['error' => 'Informe userId.']);
                }
                if ($action === 'adminRecoveryGrant') {
                    $reason = is_string($body['reason'] ?? null) ? (string) $body['reason'] : '';
                    $res = RecoveryService::grantOverride($target, $actor, $reason);
                    if (!$res['ok']) {
                        Http::error($res['status'], $res['error'] ?? 'Erro.');
                    }
                    AdminAudit::record($actor, AdminAudit::ACTIONS['grantRecoveryOverride'], $target, ['reason' => mb_substr(trim($reason), 0, 255)]);
                } else {
                    RecoveryService::revokeOverride($target);
                    AdminAudit::record($actor, AdminAudit::ACTIONS['revokeRecoveryOverride'], $target);
                }
            }
            Http::json(200, ['ok' => true, 'students' => RecoveryService::overrideStudents()]);
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
                $recClosure = RecoveryService::closure($turma);
                $board = [];
                if ($closure['status'] === 'closed') {
                    foreach (RecoveryService::boardRows($turma) as $b) {
                        $board[$b['userId']] = $b;
                    }
                }
                foreach ($rows as $i => $r) {
                    $b = $board[$r['userId']] ?? null;
                    $rows[$i]['recovery'] = [
                        'eligible' => $b !== null,
                        'score' => $b['score'] ?? null,
                        'closed' => $b !== null && $recClosure['status'] === 'closed',
                        'status' => $b['status'] ?? null,
                    ];
                }
                Http::json(200, [
                    'ok' => true,
                    'closure' => $closure,
                    'recoveryClosure' => ['status' => $recClosure['status'], 'closedAt' => $recClosure['closedAt']],
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
            case 'adminRecoveryBoard':
                Http::json(200, ['ok' => true, 'closure' => RecoveryService::closure($turma), 'rows' => RecoveryService::boardRows($turma)]);
            case 'adminRecoveryClose':
                if ($method !== 'POST') {
                    Http::json(405, ['error' => 'Method not allowed']);
                }
                $res = RecoveryService::close($turma, $actorId, ($body['force'] ?? false) === true);
                if (!$res['ok']) {
                    Http::error($res['status'], $res['error'] ?? 'Erro.', isset($res['pending']) ? ['pending' => $res['pending']] : []);
                }
                AdminAudit::record($actorId, AdminAudit::ACTIONS['closeRecovery'], null, [
                    'turma' => $turma,
                    'force' => ($body['force'] ?? false) === true,
                    'pendingCount' => count($res['pending'] ?? []),
                ]);
                Http::json(200, ['ok' => true, 'closure' => RecoveryService::closure($turma), 'pending' => $res['pending']]);
            case 'adminRecoveryReopen':
                if ($method !== 'POST') {
                    Http::json(405, ['error' => 'Method not allowed']);
                }
                $res = RecoveryService::reopen($turma, $actorId);
                if (!$res['ok']) {
                    Http::error($res['status'], $res['error'] ?? 'Erro.');
                }
                AdminAudit::record($actorId, AdminAudit::ACTIONS['reopenRecovery'], null, ['turma' => $turma]);
                Http::json(200, ['ok' => true, 'closure' => RecoveryService::closure($turma)]);
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
