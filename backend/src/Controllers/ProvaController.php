<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Http;
use App\Core\RateLimiter;
use App\Services\Prova\ExamDefinition;
use App\Services\Prova\ProvaCatalog;
use App\Services\Prova\ProvaProjectService;
use App\Services\Prova\ProvaService;
use App\Services\SessionService;
use PDO;
use Throwable;

/**
 * Controller de `/api/prova` (`api/prova.js`).
 */
final class ProvaController
{
    private const PROVA_RATE_BUCKETS = [
        'read' => ['limit' => 90, 'windowSec' => 60],
        'saveAnswer' => ['limit' => 120, 'windowSec' => 60],
        'nav' => ['limit' => 120, 'windowSec' => 60],
        'integrity' => ['limit' => 60, 'windowSec' => 60],
        'submit' => ['limit' => 12, 'windowSec' => 60],
        'contest' => ['limit' => 10, 'windowSec' => 60],
        'upload' => ['limit' => 6, 'windowSec' => 60],
        'admin' => ['limit' => 90, 'windowSec' => 60],
    ];

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
        $examId = trim((string) (($method === 'GET' ? Http::query('examId') : ($body['examId'] ?? Http::query('examId'))) ?: ProvaCatalog::EXAM_ID));

        if ($action === '') {
            Http::json(400, ['error' => 'Informe action.']);
        }

        // Registro de exames: id desconhecido → 404 claro (examId omitido = Módulo 1, compatibilidade).
        $def = ProvaCatalog::forExam($examId);
        if (!$def) {
            Http::json(404, ['error' => "Exame não encontrado: {$examId}", 'code' => 'exam_not_found']);
        }
        $rawExam = $method === 'GET' ? Http::query('examId') : ($body['examId'] ?? Http::query('examId'));
        $examIdExplicit = trim((string) ($rawExam ?? '')) !== '';
        // examId explícito deve bater com o exame da tentativa (omitido = comportamento legado).
        $assertExam = static function (?array $att) use ($examId, $examIdExplicit): void {
            if ($examIdExplicit && $att && (string) ($att['exam_id'] ?? '') !== $examId) {
                Http::json(409, [
                    'error' => 'Esta tentativa pertence a outro exame. Atualize o hub e tente de novo.',
                    'code' => 'exam_mismatch',
                    'attemptExamId' => (string) $att['exam_id'],
                ]);
            }
        };
        $quizOnly = static function () use ($def): void {
            if ($def->isProject()) {
                Http::json(400, ['error' => 'Este exame é uma entrega de arquivo; use o envio do trabalho.', 'code' => 'exam_is_project']);
            }
        };

        try {
            $nowMs = (int) round(microtime(true) * 1000);
            $pdo = Database::get();

            // -----------------------------------------------------------------
            // getExamStatus
            // -----------------------------------------------------------------
            if ($action === 'getExamStatus') {
                if (!self::rateLimitOr429((int) $user['id'], 'read')) {
                    return;
                }
                $exam = ProvaService::loadExam($examId);
                $attempt = ProvaService::loadAttemptForUser($examId, (int) $user['id']);
                $attempt = ProvaService::finalizeIfExpired($attempt, $nowMs);
                $openForUser = ProvaService::isExamOpenForUser($exam, $user);

                $review = null;
                if ($attempt && ($attempt['status'] ?? '') === 'graded') {
                    $answers = ProvaService::loadAnswers((string) $attempt['id']);
                    $review = ProvaService::buildStudentReview($attempt, $answers);
                }

                $out = [
                    'serverNow' => Database::nowIso($nowMs),
                    'exam' => ProvaService::examPublicDto($exam),
                    'openForUser' => $openForUser,
                    'attempt' => ProvaService::attemptStudentDto($attempt, $nowMs),
                    'review' => $review,
                    'canStart' => $openForUser && !$attempt && !$def->isProject() && !$def->placeholder,
                    'mustResume' => $attempt !== null && ($attempt['status'] ?? '') === 'in_progress',
                ];
                if ($def->isProject()) {
                    $sub = $attempt ? ProvaProjectService::loadSubmission((string) $attempt['id']) : null;
                    $out['submission'] = ProvaProjectService::submissionDto($sub);
                    $out['canSubmit'] = $openForUser && (!$attempt || ($attempt['status'] ?? '') !== 'graded');
                }
                Http::json(200, $out);
            }

            // -----------------------------------------------------------------
            // startAttempt
            // -----------------------------------------------------------------
            if ($action === 'startAttempt' && $method === 'POST') {
                if (!self::rateLimitOr429((int) $user['id'], 'submit')) {
                    return;
                }
                $quizOnly();
                $exam = ProvaService::loadExam($examId);
                if (!$exam) {
                    Http::json(404, ['error' => 'Avaliação não encontrada.']);
                }

                $attempt = ProvaService::loadAttemptForUser($examId, (int) $user['id']);
                $attempt = ProvaService::finalizeIfExpired($attempt, $nowMs);

                if (!$attempt) {
                    if ($def->placeholder) {
                        Http::json(403, ['error' => 'O conteúdo desta avaliação ainda não foi publicado.']);
                    }
                    if (!ProvaService::isExamOpenForUser($exam, $user)) {
                        Http::json(403, ['error' => 'Esta avaliação ainda não está liberada para a sua turma.']);
                    }
                    $durationMs = max(1, (int) ($exam['duration_minutes'] ?? 90)) * 60 * 1000;
                    $startedAtSql = Database::nowSql($nowMs);
                    $endsAtSql = Database::nowSql($nowMs + $durationMs);
                    $newId = Database::uuidV4();

                    $ins = $pdo->prepare(
                        'INSERT IGNORE INTO prova_attempts
                         (id, exam_id, user_id, status, started_at, ends_at, current_question_index, integrity_summary, created_at, updated_at)
                         VALUES (:id, :eid, :uid, \'in_progress\', :st, :en, 0, :isum, :cat, :uat)'
                    );
                    // PDO nativo (ATTR_EMULATE_PREPARES=false) não aceita o mesmo named param repetido.
                    $ins->execute([
                        ':id' => $newId,
                        ':eid' => $examId,
                        ':uid' => (int) $user['id'],
                        ':st' => $startedAtSql,
                        ':en' => $endsAtSql,
                        ':isum' => json_encode(['blurCount' => 0, 'leaveCount' => 0, 'lastEventAt' => null]),
                        ':cat' => $startedAtSql,
                        ':uat' => $startedAtSql,
                    ]);
                    $attempt = ProvaService::loadAttemptForUser($examId, (int) $user['id']);
                }

                $answers = ProvaService::loadAnswers((string) $attempt['id']);
                Http::json(200, ProvaService::studentAttemptPayload($attempt, $answers, $nowMs));
            }

            // -----------------------------------------------------------------
            // getAttempt
            // -----------------------------------------------------------------
            if ($action === 'getAttempt') {
                if (!self::rateLimitOr429((int) $user['id'], 'read')) {
                    return;
                }
                $quizOnly();
                $attempt = ProvaService::loadAttemptForUser($examId, (int) $user['id']);
                if (!$attempt) {
                    Http::json(404, ['error' => 'Você ainda não iniciou esta avaliação.']);
                }
                $attempt = ProvaService::finalizeIfExpired($attempt, $nowMs);
                $answers = ProvaService::loadAnswers((string) $attempt['id']);
                Http::json(200, ProvaService::studentAttemptPayload($attempt, $answers, $nowMs));
            }

            // -----------------------------------------------------------------
            // saveAnswer
            // -----------------------------------------------------------------
            if ($action === 'saveAnswer' && $method === 'POST') {
                if (!self::rateLimitOr429((int) $user['id'], 'saveAnswer')) {
                    return;
                }
                $quizOnly();
                $parsed = ProvaService::parseSaveAnswerPayload($body, $def);
                if (!$parsed['ok']) {
                    Http::json(400, ['error' => $parsed['error']]);
                }

                $attempt = ProvaService::loadAttemptForUser($examId, (int) $user['id']);
                if (!$attempt) {
                    Http::json(404, ['error' => 'Tentativa não encontrada.']);
                }
                $attempt = ProvaService::finalizeIfExpired($attempt, $nowMs);
                if (($attempt['status'] ?? '') !== 'in_progress') {
                    Http::json(409, [
                        'error' => 'O tempo da prova encerrou ou a prova já foi entregue.',
                        'attempt' => ProvaService::attemptStudentDto($attempt, $nowMs),
                    ]);
                }

                $nowSql = Database::nowSql($nowMs);
                $upAns = $pdo->prepare(
                    'INSERT INTO prova_answers (attempt_id, question_id, choice, text_answer, updated_at)
                     VALUES (:aid, :qid, :ch, :txt, :now)
                     ON DUPLICATE KEY UPDATE
                       choice = VALUES(choice),
                       text_answer = VALUES(text_answer),
                       updated_at = VALUES(updated_at)'
                );
                $upAns->execute([
                    ':aid' => $attempt['id'],
                    ':qid' => $parsed['questionId'],
                    ':ch' => $parsed['choice'],
                    ':txt' => $parsed['textAnswer'],
                    ':now' => $nowSql,
                ]);

                $idx = ProvaService::clampQuestionIndex($body['currentQuestionIndex'] ?? null, $def);
                if ($idx !== null) {
                    $upAtt = $pdo->prepare('UPDATE prova_attempts SET current_question_index = :idx, updated_at = :now WHERE id = :id AND status = \'in_progress\'');
                    $upAtt->execute([':idx' => $idx, ':now' => $nowSql, ':id' => $attempt['id']]);
                    $attempt['current_question_index'] = $idx;
                }

                Http::json(200, [
                    'ok' => true,
                    'savedAt' => Database::nowIso($nowMs),
                    'questionId' => $parsed['questionId'],
                    'attempt' => ProvaService::attemptStudentDto($attempt, $nowMs),
                ]);
            }

            // -----------------------------------------------------------------
            // setCurrentQuestion
            // -----------------------------------------------------------------
            if ($action === 'setCurrentQuestion' && $method === 'POST') {
                if (!self::rateLimitOr429((int) $user['id'], 'nav')) {
                    return;
                }
                $quizOnly();
                $idx = ProvaService::clampQuestionIndex($body['currentQuestionIndex'] ?? $body['index'] ?? null, $def);
                if ($idx === null) {
                    Http::json(400, ['error' => 'Índice de questão inválido.']);
                }
                $attempt = ProvaService::loadAttemptForUser($examId, (int) $user['id']);
                if (!$attempt) {
                    Http::json(404, ['error' => 'Tentativa não encontrada.']);
                }
                $attempt = ProvaService::finalizeIfExpired($attempt, $nowMs);
                if (($attempt['status'] ?? '') !== 'in_progress') {
                    Http::json(409, [
                        'error' => 'Prova já encerrada.',
                        'attempt' => ProvaService::attemptStudentDto($attempt, $nowMs),
                    ]);
                }

                $nowSql = Database::nowSql($nowMs);
                $up = $pdo->prepare('UPDATE prova_attempts SET current_question_index = :idx, updated_at = :now WHERE id = :id AND status = \'in_progress\'');
                $up->execute([':idx' => $idx, ':now' => $nowSql, ':id' => $attempt['id']]);
                $attempt['current_question_index'] = $idx;

                Http::json(200, [
                    'ok' => true,
                    'attempt' => ProvaService::attemptStudentDto($attempt, $nowMs),
                ]);
            }

            // -----------------------------------------------------------------
            // reportIntegrityEvent
            // -----------------------------------------------------------------
            if ($action === 'reportIntegrityEvent' && $method === 'POST') {
                if (!self::rateLimitOr429((int) $user['id'], 'integrity')) {
                    return;
                }
                if ($def->isProject()) {
                    Http::json(200, ['ok' => true, 'ignored' => true]);
                }
                $eventType = ProvaService::normalizeIntegrityEventType($body['eventType'] ?? $body['type'] ?? null);
                if (!$eventType) {
                    Http::json(400, ['error' => 'Tipo de evento inválido.']);
                }

                $attempt = ProvaService::loadAttemptForUser($examId, (int) $user['id']);
                if (!$attempt || ($attempt['status'] ?? '') !== 'in_progress') {
                    Http::json(200, ['ok' => true, 'ignored' => true]);
                }
                if (ProvaService::isPastEndsAt($attempt['ends_at'] ?? null, $nowMs)) {
                    ProvaService::finalizeIfExpired($attempt, $nowMs);
                    Http::json(200, ['ok' => true, 'ignored' => true]);
                }

                $atIso = Database::nowIso($nowMs);
                $nowSql = Database::nowSql($nowMs);
                $meta = ProvaService::sanitizeIntegrityMeta($body['meta'] ?? []);
                $nextSummary = ProvaService::bumpIntegritySummary($attempt['integrity_summary'] ?? [], $eventType, $atIso);

                $insEv = $pdo->prepare(
                    'INSERT INTO prova_integrity_events (attempt_id, event_type, meta, created_at)
                     VALUES (:aid, :et, :meta, :now)'
                );
                $insEv->execute([
                    ':aid' => $attempt['id'],
                    ':et' => $eventType,
                    ':meta' => json_encode((object) $meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    ':now' => $nowSql,
                ]);

                $upAtt = $pdo->prepare(
                    'UPDATE prova_attempts SET integrity_summary = :isum, updated_at = :now WHERE id = :id'
                );
                $upAtt->execute([
                    ':isum' => json_encode($nextSummary, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    ':now' => $nowSql,
                    ':id' => $attempt['id'],
                ]);

                Http::json(200, ['ok' => true]);
            }

            // -----------------------------------------------------------------
            // submitAttempt
            // -----------------------------------------------------------------
            if ($action === 'submitAttempt' && $method === 'POST') {
                if (!self::rateLimitOr429((int) $user['id'], 'submit')) {
                    return;
                }
                $quizOnly();
                $attempt = ProvaService::loadAttemptForUser($examId, (int) $user['id']);
                if (!$attempt) {
                    Http::json(404, ['error' => 'Tentativa não encontrada.']);
                }
                if (($attempt['status'] ?? '') === 'in_progress') {
                    $expired = ProvaService::isPastEndsAt($attempt['ends_at'] ?? null, $nowMs);
                    $attempt = ProvaService::gradeAndCloseAttempt($attempt, $expired ? 'timed_out' : 'submitted', $nowMs);
                }

                Http::json(200, [
                    'ok' => true,
                    'serverNow' => Database::nowIso($nowMs),
                    'attempt' => ProvaService::attemptStudentDto($attempt, $nowMs),
                ]);
            }

            // -----------------------------------------------------------------
            // adminListAttempts / adminGetProvaOverview
            // -----------------------------------------------------------------
            if ($action === 'adminListAttempts' || $action === 'adminGetProvaOverview') {
                if (!SessionService::isAdmin($user)) {
                    Http::json(403, ['error' => 'Acesso restrito ao Mestre.']);
                }
                if (!self::rateLimitOr429((int) $user['id'], 'admin')) {
                    return;
                }
                $exam = ProvaService::loadExam($examId);
                $stmt = $pdo->prepare('SELECT * FROM prova_attempts WHERE exam_id = :eid');
                $stmt->execute([':eid' => $examId]);
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $normalizedRows = [];
                foreach ($rows as $row) {
                    $normalizedRows[] = ProvaService::finalizeIfExpired($row, $nowMs);
                }

                $userIds = array_values(array_unique(array_filter(array_map(
                    static fn(array $r): int => (int) ($r['user_id'] ?? 0),
                    $normalizedRows
                ))));
                $usersById = [];
                if ($userIds !== []) {
                    $placeholders = implode(',', array_fill(0, count($userIds), '?'));
                    $uStmt = $pdo->prepare("SELECT id, username, full_name, turma FROM users WHERE id IN ({$placeholders})");
                    $uStmt->execute($userIds);
                    foreach ($uStmt->fetchAll(PDO::FETCH_ASSOC) as $u) {
                        $usersById[(int) $u['id']] = $u;
                    }
                }

                $subsByAttempt = $def->isProject()
                    ? ProvaProjectService::loadSubmissionsByAttempt(array_map(static fn(array $r): string => (string) $r['id'], $normalizedRows))
                    : [];
                $allItems = array_map(
                    static function (array $row) use ($usersById, $nowMs, $def, $subsByAttempt): array {
                        $item = ProvaService::attemptAdminListItem($row, $usersById[(int) $row['user_id']] ?? null, $nowMs);
                        if ($def->isProject()) {
                            $item['submission'] = ProvaProjectService::submissionDto($subsByAttempt[(string) $row['id']] ?? null);
                        }
                        return $item;
                    },
                    $normalizedRows
                );
                $filters = [
                    'turma' => $method === 'GET' ? Http::query('turma') : ($body['turma'] ?? Http::query('turma')),
                    'status' => $method === 'GET' ? Http::query('status') : ($body['status'] ?? Http::query('status')),
                    'alertsOnly' => $method === 'GET' ? Http::query('alertsOnly') : ($body['alertsOnly'] ?? Http::query('alertsOnly')),
                ];
                $filtered = ProvaService::sortAdminAttemptItems(ProvaService::filterAdminAttemptItems($allItems, $filters));

                Http::json(200, [
                    'serverNow' => Database::nowIso($nowMs),
                    'exam' => ProvaService::examPublicDto($exam),
                    'gate' => ProvaService::examGateFromRow($exam),
                    'counts' => ProvaService::countAttemptsByStatus($normalizedRows),
                    'attempts' => $filtered,
                ]);
            }

            // -----------------------------------------------------------------
            // adminSetExamOpen
            // -----------------------------------------------------------------
            if ($action === 'adminSetExamOpen' && $method === 'POST') {
                if (!SessionService::isAdmin($user)) {
                    Http::json(403, ['error' => 'Acesso restrito ao Mestre.']);
                }
                if (!self::rateLimitOr429((int) $user['id'], 'admin')) {
                    return;
                }
                $hasGateIntent = false;
                foreach (['mode', 'gate', 'state', 'openTurmas', 'open_turmas', 'isOpen', 'is_open', 'open'] as $gk) {
                    if (array_key_exists($gk, $body)) {
                        $hasGateIntent = true;
                        break;
                    }
                }
                $dateSets = [];
                foreach ([['opensAt', 'opens_at'], ['closesAt', 'closes_at']] as [$bodyKey, $col]) {
                    if (!array_key_exists($bodyKey, $body)) {
                        continue;
                    }
                    $raw = $body[$bodyKey];
                    if ($raw === null || trim((string) $raw) === '') {
                        $dateSets[$col] = null;
                        continue;
                    }
                    $sql = Database::isoToSql((string) $raw);
                    if ($sql === null) {
                        Http::json(400, ['error' => "Data inválida em {$bodyKey} (use ISO-8601)."]);
                    }
                    $dateSets[$col] = $sql;
                }
                if (!$hasGateIntent && $dateSets === []) {
                    Http::json(400, ['error' => 'Informe mode (closed, TCG01 ou TCG02) e/ou opensAt/closesAt.']);
                }
                $parsed = $hasGateIntent ? ProvaService::parseAdminSetExamOpenBody($body) : ['ok' => true];
                if (!$parsed['ok']) {
                    Http::json(400, ['error' => $parsed['error']]);
                }
                if ($hasGateIntent && $parsed['is_open'] && $def->placeholder) {
                    Http::json(409, [
                        'error' => 'O conteúdo desta avaliação (questões e gabarito) ainda não foi publicado. Não é possível liberá-la.',
                        'code' => 'exam_content_pending',
                    ]);
                }

                $nowSql = Database::nowSql($nowMs);
                $setParts = ['updated_at = :now'];
                $params = [':now' => $nowSql, ':id' => $examId];
                if ($hasGateIntent) {
                    $setParts[] = 'is_open = :io';
                    $setParts[] = 'open_turmas = :ot';
                    $params[':io'] = $parsed['is_open'] ? 1 : 0;
                    $params[':ot'] = Database::encodeJsonArray($parsed['open_turmas'] ?? []);
                }
                foreach ($dateSets as $col => $val) {
                    $setParts[] = "{$col} = :d_{$col}";
                    $params[":d_{$col}"] = $val;
                }
                $up = $pdo->prepare('UPDATE prova_exams SET ' . implode(', ', $setParts) . ' WHERE id = :id');
                $up->execute($params);
                $exam = ProvaService::loadExam($examId);
                $gate = ProvaService::examGateFromRow($exam);
                Http::json(200, [
                    'ok' => true,
                    'message' => $gate['openTurma'] ? "Liberada para {$gate['openTurma']}." : 'Portão selado.',
                    'exam' => ProvaService::examPublicDto($exam),
                    'gate' => $gate,
                ]);
            }

            // -----------------------------------------------------------------
            // adminGetAttempt
            // -----------------------------------------------------------------
            if ($action === 'adminGetAttempt') {
                if (!SessionService::isAdmin($user)) {
                    Http::json(403, ['error' => 'Acesso restrito ao Mestre.']);
                }
                if (!self::rateLimitOr429((int) $user['id'], 'admin')) {
                    return;
                }
                $attemptId = trim((string) (($method === 'GET' ? Http::query('attemptId') : ($body['attemptId'] ?? Http::query('attemptId'))) ?? ''));
                if ($attemptId === '') {
                    Http::json(400, ['error' => 'Informe attemptId.']);
                }
                $attempt = ProvaService::loadAttemptById($attemptId);
                $assertExam($attempt);
                if (!$attempt) {
                    Http::json(404, ['error' => 'Tentativa não encontrada.']);
                }
                $attempt = ProvaService::finalizeIfExpired($attempt, $nowMs);

                $uStmt = $pdo->prepare('SELECT id, username, full_name, turma FROM users WHERE id = :id LIMIT 1');
                $uStmt->execute([':id' => (int) $attempt['user_id']]);
                $userRow = $uStmt->fetch(PDO::FETCH_ASSOC) ?: null;

                $answerRows = ProvaService::loadAnswers((string) $attempt['id']);
                $events = ProvaService::loadIntegrityEvents((string) $attempt['id'], 100);

                Http::json(200, [
                    'serverNow' => Database::nowIso($nowMs),
                    'attempt' => ProvaService::buildAdminAttemptDetail($attempt, $userRow, $answerRows, $events, $nowMs),
                ]);
            }

            // -----------------------------------------------------------------
            // adminScoreDiscursive
            // -----------------------------------------------------------------
            if ($action === 'adminScoreDiscursive' && $method === 'POST') {
                if (!SessionService::isAdmin($user)) {
                    Http::json(403, ['error' => 'Acesso restrito ao Mestre.']);
                }
                if (!self::rateLimitOr429((int) $user['id'], 'admin')) {
                    return;
                }
                $attemptId = trim((string) ($body['attemptId'] ?? ''));
                $attempt = $attemptId !== '' ? ProvaService::loadAttemptById($attemptId) : null;
                $assertExam($attempt);
                $attDef = $attempt ? ProvaCatalog::forExam((string) $attempt['exam_id']) : null;
                if ($attemptId === '' || !$attDef) {
                    Http::json(400, ['error' => 'Questão discursiva ou tentativa inválida.']);
                }
                $scoreItems = [];
                if (is_array($body['scores'] ?? null)) {
                    foreach ($body['scores'] as $row) {
                        if (!is_array($row)) {
                            continue;
                        }
                        $scoreItems[] = [
                            'questionId' => trim((string) ($row['questionId'] ?? '')),
                            'points' => $row['pointsAwarded'] ?? $row['points'] ?? null,
                            'hasComment' => array_key_exists('comment', $row),
                            'comment' => (string) ($row['comment'] ?? ''),
                        ];
                    }
                } else {
                    $scoreItems[] = [
                        'questionId' => trim((string) ($body['questionId'] ?? '')),
                        'points' => $body['pointsAwarded'] ?? $body['points'] ?? null,
                        'hasComment' => array_key_exists('comment', $body),
                        'comment' => (string) ($body['comment'] ?? ''),
                    ];
                }
                foreach ($scoreItems as $k => $it) {
                    if (!$attDef->isDiscursiveQuestionId($it['questionId'])) {
                        Http::json(400, ['error' => 'Questão discursiva ou tentativa inválida.']);
                    }
                    $pts = $attDef->normalizeDiscursivePoints($it['points']);
                    if ($pts === null) {
                        Http::json(400, ['error' => 'Informe nota entre 0 e 1 (ex.: 0, 0.25, 0.5, 0.75 ou 1).']);
                    }
                    $scoreItems[$k]['points'] = $pts;
                }
                if ($scoreItems === []) {
                    Http::json(400, ['error' => 'Informe ao menos uma nota discursiva.']);
                }
                $attempt = ProvaService::finalizeIfExpired($attempt, $nowMs);
                if (($attempt['status'] ?? '') === 'in_progress') {
                    Http::json(409, ['error' => 'Aguarde o aluno entregar a prova antes de pontuar as discursivas.']);
                }
                if (($attempt['status'] ?? '') === 'graded') {
                    Http::json(409, ['error' => 'Nota já fechada. Use Reabrir revisão em caso de contestação aberta.']);
                }

                $nowSql = Database::nowSql($nowMs);
                $upAns = $pdo->prepare(
                    'INSERT INTO prova_answers (attempt_id, question_id, points_awarded, updated_at)
                     VALUES (:aid, :qid, :pts, :now)
                     ON DUPLICATE KEY UPDATE
                       points_awarded = VALUES(points_awarded),
                       updated_at = VALUES(updated_at)'
                );
                $notes = ProvaService::parseAttemptAdminNotes($attempt['admin_notes'] ?? null);
                foreach ($scoreItems as $it) {
                    $upAns->execute([
                        ':aid' => $attempt['id'],
                        ':qid' => $it['questionId'],
                        ':pts' => $it['points'],
                        ':now' => $nowSql,
                    ]);
                    if ($it['hasComment']) {
                        $notes['discursiveComments'][$it['questionId']] = $it['comment'];
                    }
                }
                if (array_key_exists('generalNote', $body)) {
                    $notes['general'] = (string) ($body['generalNote'] ?? '');
                }
                $serializedNotes = ProvaService::serializeAttemptAdminNotes($notes);
                $notesErr = ProvaService::validateSerializedAdminNotes($serializedNotes);
                if ($notesErr !== null) {
                    Http::json(400, ['error' => $notesErr]);
                }

                $answerRows = ProvaService::loadAnswers((string) $attempt['id']);
                $discScore = ProvaService::sumDiscursivePoints($answerRows, $attDef);

                $upAtt = $pdo->prepare(
                    'UPDATE prova_attempts SET discursive_score = :ds, admin_notes = :an, updated_at = :now WHERE id = :id'
                );
                $upAtt->execute([
                    ':ds' => $discScore,
                    ':an' => $serializedNotes,
                    ':now' => $nowSql,
                    ':id' => $attempt['id'],
                ]);

                $uStmt = $pdo->prepare('SELECT id, username, full_name, turma FROM users WHERE id = :id LIMIT 1');
                $uStmt->execute([':id' => (int) $attempt['user_id']]);
                $userRow = $uStmt->fetch(PDO::FETCH_ASSOC) ?: null;
                $updated = ProvaService::loadAttemptById((string) $attempt['id']);
                $events = ProvaService::loadIntegrityEvents((string) $attempt['id'], 100);

                Http::json(200, [
                    'ok' => true,
                    'message' => 'Notas salvas.',
                    'attempt' => ProvaService::buildAdminAttemptDetail($updated, $userRow, $answerRows, $events, $nowMs),
                ]);
            }

            // -----------------------------------------------------------------
            // adminFinalizeGrade
            // -----------------------------------------------------------------
            if ($action === 'adminFinalizeGrade' && $method === 'POST') {
                if (!SessionService::isAdmin($user)) {
                    Http::json(403, ['error' => 'Acesso restrito ao Mestre.']);
                }
                if (!self::rateLimitOr429((int) $user['id'], 'admin')) {
                    return;
                }
                $attemptId = trim((string) ($body['attemptId'] ?? ''));
                if ($attemptId === '') {
                    Http::json(400, ['error' => 'Informe attemptId.']);
                }
                $attempt = ProvaService::loadAttemptById($attemptId);
                $assertExam($attempt);
                if (!$attempt) {
                    Http::json(404, ['error' => 'Tentativa não encontrada.']);
                }
                $attDef = ProvaCatalog::forExam((string) $attempt['exam_id']);
                if (!$attDef || $attDef->isProject()) {
                    Http::json(400, ['error' => 'Use a correção do trabalho para este exame.']);
                }
                $attempt = ProvaService::finalizeIfExpired($attempt, $nowMs);
                if (!in_array((string) ($attempt['status'] ?? ''), ['submitted', 'timed_out'], true)) {
                    Http::json(409, ['error' => 'A tentativa precisa estar entregue ou em revisão para fechar a nota.']);
                }

                $nowSql = Database::nowSql($nowMs);
                $answerRows = ProvaService::loadAnswers((string) $attempt['id']);
                $mc = ProvaService::buildMcGradeUpdates($answerRows, $attDef);

                $upAns = $pdo->prepare(
                    'INSERT INTO prova_answers (attempt_id, question_id, choice, is_correct, points_awarded, updated_at)
                     VALUES (:aid, :qid, :ch, :ic, :pts, :now)
                     ON DUPLICATE KEY UPDATE
                       choice = VALUES(choice),
                       is_correct = VALUES(is_correct),
                       points_awarded = VALUES(points_awarded),
                       updated_at = VALUES(updated_at)'
                );
                foreach ($mc['updates'] as $u) {
                    $upAns->execute([
                        ':aid' => $attempt['id'],
                        ':qid' => $u['questionId'],
                        ':ch' => $u['choice'],
                        ':ic' => $u['isCorrect'] ? 1 : 0,
                        ':pts' => $u['pointsAwarded'],
                        ':now' => $nowSql,
                    ]);
                }

                $byId = [];
                foreach ($answerRows as $r) {
                    if (!empty($r['question_id'])) {
                        $byId[(string) $r['question_id']] = $r;
                    }
                }
                $discursiveIds = $attDef->listDiscursiveQuestionIds();
                $missing = [];
                foreach ($discursiveIds as $did) {
                    $r = $byId[$did] ?? null;
                    if ($attDef->normalizeDiscursivePoints($r['points_awarded'] ?? null) === null) {
                        $missing[] = $did;
                    }
                }
                $allowPartial = ($body['allowPartial'] ?? false) === true;
                if ($missing !== [] && !$allowPartial) {
                    Http::json(400, [
                        'error' => 'Pontue todas as ' . count($discursiveIds) . ' discursivas antes de fechar a nota (faltando: ' . implode(', ', $missing) . ').',
                        'missingQuestions' => $missing,
                    ]);
                }

                $discScore = ProvaService::sumDiscursivePoints($answerRows, $attDef);
                $finalScore = round(($mc['mcScore'] + $discScore) * 100.0) / 100.0;

                $notes = ProvaService::parseAttemptAdminNotes($attempt['admin_notes'] ?? null);
                if (array_key_exists('generalNote', $body)) {
                    $notes['general'] = (string) ($body['generalNote'] ?? '');
                }
                $serializedNotes = ProvaService::serializeAttemptAdminNotes($notes);
                $notesErr = ProvaService::validateSerializedAdminNotes($serializedNotes);
                if ($notesErr !== null) {
                    Http::json(400, ['error' => $notesErr]);
                }

                $hadContest = !empty($attempt['contest_status']);
                $contestMsgKey = array_key_exists('contestAdminMessage', $body) ? 'contestAdminMessage'
                    : (array_key_exists('contestMessage', $body) ? 'contestMessage' : null);
                $adminMsg = $contestMsgKey !== null
                    ? trim((string) ($body[$contestMsgKey] ?? ''))
                    : ($attempt['contest_admin_message'] ?? null);

                // PDO nativo (ATTR_EMULATE_PREPARES=false) não aceita o mesmo named param repetido.
                if ($hadContest) {
                    $upAtt = $pdo->prepare(
                        'UPDATE prova_attempts
                         SET status = \'graded\', mc_score = :mcs, discursive_score = :ds, final_score = :fs,
                             graded_at = :gat, admin_notes = :an, updated_at = :uat,
                             contest_status = \'revised\', contest_resolved_at = :crat, contest_admin_message = :cam
                         WHERE id = :id'
                    );
                    $upAtt->execute([
                        ':mcs' => $mc['mcScore'],
                        ':ds' => $discScore,
                        ':fs' => $finalScore,
                        ':gat' => $nowSql,
                        ':an' => $serializedNotes,
                        ':uat' => $nowSql,
                        ':crat' => $nowSql,
                        ':cam' => $adminMsg ?: null,
                        ':id' => $attempt['id'],
                    ]);
                } else {
                    $upAtt = $pdo->prepare(
                        'UPDATE prova_attempts
                         SET status = \'graded\', mc_score = :mcs, discursive_score = :ds, final_score = :fs,
                             graded_at = :gat, admin_notes = :an, updated_at = :uat
                         WHERE id = :id'
                    );
                    $upAtt->execute([
                        ':mcs' => $mc['mcScore'],
                        ':ds' => $discScore,
                        ':fs' => $finalScore,
                        ':gat' => $nowSql,
                        ':an' => $serializedNotes,
                        ':uat' => $nowSql,
                        ':id' => $attempt['id'],
                    ]);
                }

                $uStmt = $pdo->prepare('SELECT id, username, full_name, turma FROM users WHERE id = :id LIMIT 1');
                $uStmt->execute([':id' => (int) $attempt['user_id']]);
                $userRow = $uStmt->fetch(PDO::FETCH_ASSOC) ?: null;
                $updated = ProvaService::loadAttemptById((string) $attempt['id']);
                $freshAnswers = ProvaService::loadAnswers((string) $attempt['id']);
                $events = ProvaService::loadIntegrityEvents((string) $attempt['id'], 100);

                Http::json(200, [
                    'ok' => true,
                    'message' => 'Nota fechada.',
                    'attempt' => ProvaService::buildAdminAttemptDetail($updated, $userRow, $freshAnswers, $events, $nowMs),
                ]);
            }

            // -----------------------------------------------------------------
            // contestGrade
            // -----------------------------------------------------------------
            if ($action === 'contestGrade' && $method === 'POST') {
                if (!self::rateLimitOr429((int) $user['id'], 'contest')) {
                    return;
                }
                $msg = ProvaService::normalizeContestMessage($body['message'] ?? $body['studentMessage'] ?? null);
                if (!$msg) {
                    Http::json(400, ['error' => 'Escreva o motivo da contestação (até 4000 caracteres).']);
                }
                $attempt = ProvaService::loadAttemptForUser($examId, (int) $user['id']);
                if (!$attempt || ($attempt['status'] ?? '') !== 'graded') {
                    Http::json(409, ['error' => 'A contestação só pode ser enviada após o fechamento da nota.']);
                }
                if (($attempt['contest_status'] ?? '') === 'open') {
                    Http::json(409, ['error' => 'Você já possui uma contestação aberta aguardando o Mestre.']);
                }

                $nowSql = Database::nowSql($nowMs);
                $up = $pdo->prepare(
                    'UPDATE prova_attempts
                     SET contest_status = \'open\', contest_student_message = :msg,
                         contested_at = :cat, contest_resolved_at = NULL, updated_at = :uat
                     WHERE id = :id'
                );
                $up->execute([
                    ':msg' => $msg,
                    ':cat' => $nowSql,
                    ':uat' => $nowSql,
                    ':id' => $attempt['id'],
                ]);
                $updated = ProvaService::loadAttemptById((string) $attempt['id']);

                Http::json(200, [
                    'ok' => true,
                    'attempt' => ProvaService::attemptStudentDto($updated, $nowMs),
                ]);
            }

            // -----------------------------------------------------------------
            // adminRespondContest
            // -----------------------------------------------------------------
            if ($action === 'adminRespondContest' && $method === 'POST') {
                if (!SessionService::isAdmin($user)) {
                    Http::json(403, ['error' => 'Acesso restrito ao Mestre.']);
                }
                if (!self::rateLimitOr429((int) $user['id'], 'admin')) {
                    return;
                }
                $attemptId = trim((string) ($body['attemptId'] ?? ''));
                $decision = ProvaService::normalizeContestAdminAction($body['decision'] ?? $body['mode'] ?? $body['contestAction'] ?? null);
                if ($attemptId === '' || !$decision) {
                    Http::json(400, ['error' => 'Informe attemptId e decision (answer | reopen).']);
                }
                $attempt = ProvaService::loadAttemptById($attemptId);
                $assertExam($attempt);
                if (!$attempt) {
                    Http::json(404, ['error' => 'Tentativa não encontrada.']);
                }

                $nowSql = Database::nowSql($nowMs);
                $adminMessage = ProvaService::normalizeContestMessage($body['message'] ?? $body['adminMessage'] ?? '');

                if ($decision === 'answer') {
                    if (!$adminMessage) {
                        Http::json(400, ['error' => 'Escreva a resposta ao aluno para concluir a contestação.']);
                    }
                    $up = $pdo->prepare(
                        'UPDATE prova_attempts
                         SET contest_status = \'answered\', contest_admin_message = :msg,
                             contest_resolved_at = :crat, updated_at = :uat
                         WHERE id = :id'
                    );
                    $up->execute([
                        ':msg' => $adminMessage,
                        ':crat' => $nowSql,
                        ':uat' => $nowSql,
                        ':id' => $attempt['id'],
                    ]);
                } else {
                    $up = $pdo->prepare(
                        'UPDATE prova_attempts
                         SET status = \'submitted\', contest_status = \'open\',
                             contest_admin_message = :msg, updated_at = :now
                         WHERE id = :id'
                    );
                    $up->execute([
                        ':msg' => $adminMessage ?? ($attempt['contest_admin_message'] ?? null),
                        ':now' => $nowSql,
                        ':id' => $attempt['id'],
                    ]);
                }

                $uStmt = $pdo->prepare('SELECT id, username, full_name, turma FROM users WHERE id = :id LIMIT 1');
                $uStmt->execute([':id' => (int) $attempt['user_id']]);
                $userRow = $uStmt->fetch(PDO::FETCH_ASSOC) ?: null;
                $updated = ProvaService::loadAttemptById((string) $attempt['id']);
                $answerRows = ProvaService::loadAnswers((string) $attempt['id']);
                $events = ProvaService::loadIntegrityEvents((string) $attempt['id'], 100);

                Http::json(200, [
                    'ok' => true,
                    'attempt' => ProvaService::buildAdminAttemptDetail($updated, $userRow, $answerRows, $events, $nowMs),
                ]);
            }

            // -----------------------------------------------------------------
            // adminResetAttempt
            // -----------------------------------------------------------------
            if ($action === 'adminResetAttempt' && $method === 'POST') {
                if (!SessionService::isAdmin($user)) {
                    Http::json(403, ['error' => 'Acesso restrito ao Mestre.']);
                }
                if (!self::rateLimitOr429((int) $user['id'], 'admin')) {
                    return;
                }
                $attemptId = trim((string) ($body['attemptId'] ?? ''));
                if ($attemptId === '') {
                    Http::json(400, ['error' => 'Informe attemptId.']);
                }
                $attempt = ProvaService::loadAttemptById($attemptId);
                $assertExam($attempt);
                if (!$attempt) {
                    Http::json(404, ['error' => 'Tentativa não encontrada.']);
                }

                $names = ProvaProjectService::storedNamesForAttempts([$attemptId]);
                $del = $pdo->prepare('DELETE FROM prova_attempts WHERE id = :id');
                $del->execute([':id' => $attemptId]);
                ProvaProjectService::deleteStoredNames($names);

                Http::json(200, [
                    'ok' => true,
                    'deletedAttemptId' => $attemptId,
                    'examId' => $attempt['exam_id'],
                    'userId' => (int) $attempt['user_id'],
                ]);
            }

            // -----------------------------------------------------------------
            // adminResetAllAttempts
            // -----------------------------------------------------------------
            if ($action === 'adminResetAllAttempts' && $method === 'POST') {
                if (!SessionService::isAdmin($user)) {
                    Http::json(403, ['error' => 'Acesso restrito ao Mestre.']);
                }
                if (!self::rateLimitOr429((int) $user['id'], 'admin')) {
                    return;
                }
                $confirmText = strtoupper(trim((string) ($body['confirmText'] ?? $body['confirm'] ?? '')));
                if (!in_array($confirmText, ['ZERAR', 'RESETAR'], true)) {
                    Http::json(400, ['error' => 'Confirmação inválida. Digite RESETAR (ou ZERAR) para apagar todas as tentativas.']);
                }
                $turmaFilter = strtoupper(trim((string) ($body['turma'] ?? '')));

                if ($turmaFilter !== '' && $turmaFilter !== 'ALL' && in_array($turmaFilter, ['TCG01', 'TCG02'], true)) {
                    $uStmt = $pdo->prepare('SELECT id FROM users WHERE turma = :t');
                    $uStmt->execute([':t' => $turmaFilter]);
                    $uids = array_map(static fn(array $r): int => (int) $r['id'], $uStmt->fetchAll(PDO::FETCH_ASSOC));
                    if ($uids === []) {
                        Http::json(200, ['ok' => true, 'deletedCount' => 0, 'turma' => $turmaFilter]);
                    }
                    $placeholders = implode(',', array_fill(0, count($uids), '?'));
                    $names = $def->isProject()
                        ? ProvaProjectService::storedNamesForAttempts(ProvaProjectService::attemptIdsForExam($examId, $uids))
                        : [];
                    $del = $pdo->prepare("DELETE FROM prova_attempts WHERE exam_id = ? AND user_id IN ({$placeholders})");
                    $del->execute(array_merge([$examId], $uids));
                    ProvaProjectService::deleteStoredNames($names);
                    Http::json(200, [
                        'ok' => true,
                        'deletedCount' => $del->rowCount(),
                        'turma' => $turmaFilter,
                    ]);
                }

                $names = $def->isProject()
                    ? ProvaProjectService::storedNamesForAttempts(ProvaProjectService::attemptIdsForExam($examId))
                    : [];
                $del = $pdo->prepare('DELETE FROM prova_attempts WHERE exam_id = :eid');
                $del->execute([':eid' => $examId]);
                ProvaProjectService::deleteStoredNames($names);
                Http::json(200, [
                    'ok' => true,
                    'deletedCount' => $del->rowCount(),
                    'turma' => 'ALL',
                ]);
            }

            // -----------------------------------------------------------------
            // submitProject (exame kind=project): upload do .zip, último envio vale
            // -----------------------------------------------------------------
            if ($action === 'submitProject' && $method === 'POST') {
                if (!$def->isProject()) {
                    Http::json(400, ['error' => 'Este exame não aceita envio de arquivo.']);
                }
                if (!self::rateLimitOr429((int) $user['id'], 'upload')) {
                    return;
                }
                $exam = ProvaService::loadExam($examId);
                if (!$exam) {
                    Http::json(404, ['error' => 'Avaliação não encontrada.']);
                }
                if (!ProvaService::isExamOpenForUser($exam, $user)) {
                    Http::json(403, ['error' => 'As entregas deste trabalho não estão abertas para a sua turma.']);
                }
                $attempt = ProvaService::loadAttemptForUser($examId, (int) $user['id']);
                if ($attempt && ($attempt['status'] ?? '') === 'graded') {
                    Http::json(409, ['error' => 'O trabalho já foi corrigido; não é mais possível reenviar.']);
                }

                $maxBytes = (int) ($def->project['maxBytes'] ?? 50 * 1024 * 1024);
                if ($_FILES === [] && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
                    // post_max_size estourado: o PHP descarta o corpo inteiro (ver playbook, seção .user.ini).
                    Http::json(413, ['error' => 'O servidor recusou o envio por tamanho (post_max_size do PHP). Avise o Mestre.']);
                }
                $v = ProvaProjectService::validateUpload($_FILES['file'] ?? null, $maxBytes);
                if (!$v['ok']) {
                    Http::json((int) ($v['status'] ?? 400), ['error' => $v['error'] ?? 'Upload inválido.']);
                }
                $stored = ProvaProjectService::storeFile((string) $_FILES['file']['tmp_name']);
                if (!$stored['ok']) {
                    Http::json(500, ['error' => $stored['error'] ?? 'Falha ao gravar o arquivo.']);
                }

                $nowSql = Database::nowSql($nowMs);
                $newStored = (string) $stored['storedName'];
                $res = null;
                try {
                    $pdo->beginTransaction();
                    // Garante a linha (UNIQUE exam+user) e trava: reenvio × correção × reset ficam serializados.
                    $ins = $pdo->prepare(
                        'INSERT IGNORE INTO prova_attempts
                         (id, exam_id, user_id, status, started_at, ends_at, submitted_at, current_question_index, integrity_summary, created_at, updated_at)
                         VALUES (:id, :eid, :uid, \'submitted\', :st, :st2, :st3, 0, :isum, :st4, :st5)'
                    );
                    $ins->execute([
                        ':id' => Database::uuidV4(),
                        ':eid' => $examId,
                        ':uid' => (int) $user['id'],
                        ':st' => $nowSql,
                        ':st2' => $nowSql,
                        ':st3' => $nowSql,
                        ':st4' => $nowSql,
                        ':st5' => $nowSql,
                        ':isum' => json_encode(['blurCount' => 0, 'leaveCount' => 0, 'lastEventAt' => null]),
                    ]);
                    $lockStmt = $pdo->prepare('SELECT * FROM prova_attempts WHERE exam_id = :eid AND user_id = :uid LIMIT 1 FOR UPDATE');
                    $lockStmt->execute([':eid' => $examId, ':uid' => (int) $user['id']]);
                    $attempt = $lockStmt->fetch(PDO::FETCH_ASSOC) ?: null;
                    if (!$attempt) {
                        throw new \RuntimeException('tentativa do trabalho não encontrada após INSERT');
                    }
                    if (($attempt['status'] ?? '') === 'graded') {
                        $pdo->rollBack();
                        ProvaProjectService::deleteStoredFile($newStored);
                        Http::json(409, ['error' => 'O trabalho já foi corrigido; não é mais possível reenviar.']);
                    }
                    // Reenvio invalida rascunho de nota/feedback anterior.
                    $upAtt = $pdo->prepare(
                        'UPDATE prova_attempts
                         SET status = \'submitted\', submitted_at = :sub, final_score = NULL, admin_notes = NULL, updated_at = :now
                         WHERE id = :id AND status <> \'graded\''
                    );
                    $upAtt->execute([':sub' => $nowSql, ':now' => $nowSql, ':id' => $attempt['id']]);
                    $res = ProvaProjectService::upsertSubmission(
                        (string) $attempt['id'],
                        $newStored,
                        (string) $v['originalName'],
                        (int) $v['size'],
                        (string) $stored['sha256'],
                        $nowMs
                    );
                    $pdo->commit();
                } catch (Throwable $e) {
                    if ($pdo->inTransaction()) {
                        $pdo->rollBack();
                    }
                    ProvaProjectService::deleteStoredFile($newStored); // compensação: zip novo sem registro
                    throw $e;
                }
                // Arquivo anterior só sai depois do commit.
                ProvaProjectService::deleteStoredFile($res['previous']);
                $attempt = ProvaService::loadAttemptById((string) $attempt['id']);
                $sub = $res['submission'];

                Http::json(200, [
                    'ok' => true,
                    'serverNow' => Database::nowIso($nowMs),
                    'attempt' => ProvaService::attemptStudentDto($attempt, $nowMs),
                    'submission' => ProvaProjectService::submissionDto($sub),
                ]);
            }

            // -----------------------------------------------------------------
            // adminDownloadSubmission (somente admin; streaming do .zip)
            // -----------------------------------------------------------------
            if ($action === 'adminDownloadSubmission') {
                if (!SessionService::isAdmin($user)) {
                    Http::json(403, ['error' => 'Acesso restrito ao Mestre.']);
                }
                if (!self::rateLimitOr429((int) $user['id'], 'admin')) {
                    return;
                }
                $attemptId = trim((string) (($method === 'GET' ? Http::query('attemptId') : ($body['attemptId'] ?? Http::query('attemptId'))) ?? ''));
                if ($attemptId === '') {
                    Http::json(400, ['error' => 'Informe attemptId.']);
                }
                $attempt = ProvaService::loadAttemptById($attemptId);
                $assertExam($attempt);
                $sub = $attempt ? ProvaProjectService::loadSubmission($attemptId) : null;
                $path = $sub ? ProvaProjectService::pathForStoredName((string) $sub['stored_name']) : null;
                if (!$attempt || !$path || !is_file($path)) {
                    Http::json(404, ['error' => 'Entrega não encontrada.']);
                }
                $uStmt = $pdo->prepare('SELECT username FROM users WHERE id = :id LIMIT 1');
                $uStmt->execute([':id' => (int) $attempt['user_id']]);
                $uname = (string) ($uStmt->fetchColumn() ?: 'aluno');
                $fileName = ProvaProjectService::downloadFileName((string) $sub['original_name'], $uname);

                while (ob_get_level() > 0) {
                    ob_end_clean();
                }
                http_response_code(200);
                header('Content-Type: application/zip');
                header('Content-Length: ' . (string) filesize($path));
                header('Content-Disposition: attachment; filename="' . $fileName . '"; filename*=UTF-8\'\'' . rawurlencode($fileName));
                header('Cache-Control: private, no-store, max-age=0');
                header('X-Content-Type-Options: nosniff');
                $fh = fopen($path, 'rb');
                if ($fh) {
                    while (!feof($fh)) {
                        echo fread($fh, 1048576);
                        flush();
                    }
                    fclose($fh);
                }
                exit;
            }

            // -----------------------------------------------------------------
            // adminGradeProject (nota 0–30 + feedback; finalize=true → aluno vê)
            // -----------------------------------------------------------------
            if ($action === 'adminGradeProject' && $method === 'POST') {
                if (!SessionService::isAdmin($user)) {
                    Http::json(403, ['error' => 'Acesso restrito ao Mestre.']);
                }
                if (!self::rateLimitOr429((int) $user['id'], 'admin')) {
                    return;
                }
                $attemptId = trim((string) ($body['attemptId'] ?? ''));
                $attempt = $attemptId !== '' ? ProvaService::loadAttemptById($attemptId) : null;
                $assertExam($attempt);
                if (!$attempt) {
                    Http::json(404, ['error' => 'Tentativa não encontrada.']);
                }
                $attDef = ProvaCatalog::forExam((string) $attempt['exam_id']);
                if (!$attDef || !$attDef->isProject()) {
                    Http::json(400, ['error' => 'Este exame não é um trabalho com entrega de arquivo.']);
                }
                $seenSha = strtolower(trim((string) ($body['sha256'] ?? '')));
                if ($seenSha === '') {
                    Http::json(400, ['error' => 'Informe o sha256 da entrega exibida (atualize o hub).', 'code' => 'sha256_required']);
                }
                $scoreMax = (float) ($attDef->project['scoreMax'] ?? 30);
                $score = ProvaProjectService::normalizeProjectScore($body['score'] ?? $body['finalScore'] ?? null, $scoreMax);
                if ($score === null) {
                    Http::json(400, ['error' => 'Informe a nota entre 0 e ' . rtrim(rtrim(number_format($scoreMax, 2, '.', ''), '0'), '.') . '.']);
                }
                $feedback = trim((string) ($body['feedback'] ?? $body['generalNote'] ?? ''));
                $serializedNotes = ProvaService::serializeAttemptAdminNotes(['discursiveComments' => [], 'general' => $feedback]);
                $notesErr = ProvaService::validateSerializedAdminNotes($serializedNotes);
                if ($notesErr !== null) {
                    Http::json(400, ['error' => $notesErr]);
                }
                $finalize = ($body['finalize'] ?? false) === true;
                $seenRev = isset($body['revision']) && is_numeric($body['revision']) ? (int) $body['revision'] : null;
                $nowSql = Database::nowSql($nowMs);

                $pdo->beginTransaction();
                $attempt = ProvaService::lockAttemptRow($attemptId);
                if (!$attempt) {
                    $pdo->rollBack();
                    Http::json(404, ['error' => 'Tentativa não encontrada.']);
                }
                $subNow = ProvaProjectService::loadSubmission($attemptId);
                if (!$subNow) {
                    $pdo->rollBack();
                    Http::json(409, ['error' => 'O aluno ainda não enviou o arquivo.']);
                }
                if (strtolower((string) ($subNow['sha256'] ?? '')) !== $seenSha
                    || ($seenRev !== null && (int) ($subNow['upload_count'] ?? 0) !== $seenRev)) {
                    $pdo->rollBack();
                    Http::json(409, [
                        'error' => 'O aluno reenviou o arquivo depois que você abriu esta tela. Baixe a versão nova e corrija de novo.',
                        'code' => 'submission_changed',
                    ]);
                }
                if (($attempt['status'] ?? '') === 'graded' && !$finalize) {
                    $pdo->rollBack();
                    Http::json(409, ['error' => 'Nota já publicada. Edite reabrindo pela contestação ou zere a entrega.']);
                }
                $hadContest = !empty($attempt['contest_status']);

                if ($finalize) {
                    $adminMsg = array_key_exists('contestAdminMessage', $body)
                        ? trim((string) ($body['contestAdminMessage'] ?? ''))
                        : ($attempt['contest_admin_message'] ?? null);
                    $sql = 'UPDATE prova_attempts
                            SET status = \'graded\', final_score = :fs, mc_score = NULL, discursive_score = NULL,
                                graded_at = :gat, graded_by = :gby, admin_notes = :an, updated_at = :uat'
                        . ($hadContest ? ', contest_status = \'revised\', contest_resolved_at = :crat, contest_admin_message = :cam' : '')
                        . ' WHERE id = :id AND status <> \'graded\'';
                    $params = [
                        ':fs' => $score,
                        ':gat' => $nowSql,
                        ':gby' => (int) $user['id'],
                        ':an' => $serializedNotes,
                        ':uat' => $nowSql,
                        ':id' => $attemptId,
                    ];
                    if ($hadContest) {
                        $params[':crat'] = $nowSql;
                        $params[':cam'] = $adminMsg ?: null;
                    }
                    $upd = $pdo->prepare($sql);
                    $upd->execute($params);
                    if ($upd->rowCount() !== 1) {
                        $pdo->rollBack();
                        Http::json(409, ['error' => 'Nota já publicada. Reabra pela contestação ou zere a entrega para corrigir de novo.', 'code' => 'already_graded']);
                    }
                } else {
                    $pdo->prepare(
                        'UPDATE prova_attempts SET final_score = :fs, admin_notes = :an, updated_at = :uat WHERE id = :id'
                    )->execute([':fs' => $score, ':an' => $serializedNotes, ':uat' => $nowSql, ':id' => $attemptId]);
                }
                $pdo->commit();

                $uStmt = $pdo->prepare('SELECT id, username, full_name, turma FROM users WHERE id = :id LIMIT 1');
                $uStmt->execute([':id' => (int) $attempt['user_id']]);
                $userRow = $uStmt->fetch(PDO::FETCH_ASSOC) ?: null;
                $updated = ProvaService::loadAttemptById($attemptId);
                Http::json(200, [
                    'ok' => true,
                    'attempt' => ProvaService::buildAdminAttemptDetail($updated, $userRow, [], [], $nowMs),
                ]);
            }

            Http::json(400, ['error' => "Ação desconhecida: {$action}"]);
        } catch (Throwable $e) {
            if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log('prova api error: ' . $e->getMessage());
            Http::json(500, ['error' => 'Erro interno na avaliação.']);
        }
    }

    private static function rateLimitOr429(int $userId, string $bucketKey): bool
    {
        $spec = self::PROVA_RATE_BUCKETS[$bucketKey] ?? self::PROVA_RATE_BUCKETS['read'];
        $res = RateLimiter::check(
            "rl:prova:{$bucketKey}:u:{$userId}",
            $spec['limit'],
            $spec['windowSec']
        );
        if (!$res['allowed']) {
            header('Retry-After: ' . $res['retryAfterSec']);
            Http::json(429, ['error' => 'Muitas requisições na prova. Aguarde alguns segundos.']);
            return false;
        }
        return true;
    }
}
