<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Http;
use App\Core\RateLimiter;
use App\Services\Prova\ProvaCatalog;
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

                Http::json(200, [
                    'serverNow' => Database::nowIso($nowMs),
                    'exam' => ProvaService::examPublicDto($exam),
                    'openForUser' => $openForUser,
                    'attempt' => ProvaService::attemptStudentDto($attempt, $nowMs),
                    'review' => $review,
                ]);
            }

            // -----------------------------------------------------------------
            // startAttempt
            // -----------------------------------------------------------------
            if ($action === 'startAttempt' && $method === 'POST') {
                if (!self::rateLimitOr429((int) $user['id'], 'submit')) {
                    return;
                }
                $exam = ProvaService::loadExam($examId);
                if (!$exam) {
                    Http::json(404, ['error' => 'Avaliação não encontrada.']);
                }

                $attempt = ProvaService::loadAttemptForUser($examId, (int) $user['id']);
                $attempt = ProvaService::finalizeIfExpired($attempt, $nowMs);

                if (!$attempt) {
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
                         VALUES (:id, :eid, :uid, \'in_progress\', :st, :en, 0, :isum, :st, :st)'
                    );
                    $ins->execute([
                        ':id' => $newId,
                        ':eid' => $examId,
                        ':uid' => (int) $user['id'],
                        ':st' => $startedAtSql,
                        ':en' => $endsAtSql,
                        ':isum' => json_encode(['blurCount' => 0, 'leaveCount' => 0, 'lastEventAt' => null]),
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
                $parsed = ProvaService::parseSaveAnswerPayload($body);
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

                $idx = ProvaService::clampQuestionIndex($body['currentQuestionIndex'] ?? null);
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
                $idx = ProvaService::clampQuestionIndex($body['currentQuestionIndex'] ?? $body['index'] ?? null);
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

                $allItems = array_map(
                    static fn(array $row): array => ProvaService::attemptAdminListItem($row, $usersById[(int) $row['user_id']] ?? null, $nowMs),
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
                $parsed = ProvaService::parseAdminSetExamOpenBody($body);
                if (!$parsed['ok']) {
                    Http::json(400, ['error' => $parsed['error']]);
                }

                $nowSql = Database::nowSql($nowMs);
                $up = $pdo->prepare(
                    'UPDATE prova_exams SET is_open = :io, open_turmas = :ot, updated_at = :now WHERE id = :id'
                );
                $up->execute([
                    ':io' => $parsed['is_open'] ? 1 : 0,
                    ':ot' => Database::encodeJsonArray($parsed['open_turmas'] ?? []),
                    ':now' => $nowSql,
                    ':id' => $examId,
                ]);
                $exam = ProvaService::loadExam($examId);
                Http::json(200, [
                    'ok' => true,
                    'exam' => ProvaService::examPublicDto($exam),
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
                $questionId = trim((string) ($body['questionId'] ?? ''));
                if ($attemptId === '' || !ProvaCatalog::isDiscursiveQuestionId($questionId)) {
                    Http::json(400, ['error' => 'Questão discursiva ou tentativa inválida.']);
                }
                $pts = ProvaCatalog::normalizeDiscursivePoints($body['pointsAwarded'] ?? $body['points'] ?? null);
                if ($pts === null) {
                    Http::json(400, ['error' => 'Informe nota entre 0 e 1 (ex.: 0, 0.25, 0.5, 0.75 ou 1).']);
                }

                $attempt = ProvaService::loadAttemptById($attemptId);
                if (!$attempt) {
                    Http::json(404, ['error' => 'Tentativa não encontrada.']);
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
                $upAns->execute([
                    ':aid' => $attempt['id'],
                    ':qid' => $questionId,
                    ':pts' => $pts,
                    ':now' => $nowSql,
                ]);

                $notes = ProvaService::parseAttemptAdminNotes($attempt['admin_notes'] ?? null);
                if (array_key_exists('comment', $body)) {
                    $notes['discursiveComments'][$questionId] = (string) ($body['comment'] ?? '');
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
                $discScore = ProvaService::sumDiscursivePoints($answerRows);

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
                if (!$attempt) {
                    Http::json(404, ['error' => 'Tentativa não encontrada.']);
                }
                $attempt = ProvaService::finalizeIfExpired($attempt, $nowMs);
                if (!in_array((string) ($attempt['status'] ?? ''), ['submitted', 'timed_out'], true)) {
                    Http::json(409, ['error' => 'A tentativa precisa estar entregue ou em revisão para fechar a nota.']);
                }

                $nowSql = Database::nowSql($nowMs);
                $answerRows = ProvaService::loadAnswers((string) $attempt['id']);
                $mc = ProvaService::buildMcGradeUpdates($answerRows);

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
                $discursiveIds = ProvaCatalog::listDiscursiveQuestionIds();
                $missing = [];
                foreach ($discursiveIds as $did) {
                    $r = $byId[$did] ?? null;
                    if (ProvaCatalog::normalizeDiscursivePoints($r['points_awarded'] ?? null) === null) {
                        $missing[] = $did;
                    }
                }
                if ($missing !== []) {
                    Http::json(400, [
                        'error' => 'Pontue todas as 8 discursivas antes de fechar a nota (faltando: ' . implode(', ', $missing) . ').',
                        'missingQuestions' => $missing,
                    ]);
                }

                $discScore = ProvaService::sumDiscursivePoints($answerRows);
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
                $adminMsg = array_key_exists('contestAdminMessage', $body)
                    ? trim((string) ($body['contestAdminMessage'] ?? ''))
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
                if (!$attempt) {
                    Http::json(404, ['error' => 'Tentativa não encontrada.']);
                }

                $del = $pdo->prepare('DELETE FROM prova_attempts WHERE id = :id');
                $del->execute([':id' => $attemptId]);

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
                if ($confirmText !== 'ZERAR') {
                    Http::json(400, ['error' => 'Confirmação inválida. Digite ZERAR para apagar todas as tentativas.']);
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
                    $del = $pdo->prepare("DELETE FROM prova_attempts WHERE exam_id = ? AND user_id IN ({$placeholders})");
                    $del->execute(array_merge([$examId], $uids));
                    Http::json(200, [
                        'ok' => true,
                        'deletedCount' => $del->rowCount(),
                        'turma' => $turmaFilter,
                    ]);
                }

                $del = $pdo->prepare('DELETE FROM prova_attempts WHERE exam_id = :eid');
                $del->execute([':eid' => $examId]);
                Http::json(200, [
                    'ok' => true,
                    'deletedCount' => $del->rowCount(),
                    'turma' => 'ALL',
                ]);
            }

            Http::json(400, ['error' => "Ação desconhecida: {$action}"]);
        } catch (Throwable $e) {
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
