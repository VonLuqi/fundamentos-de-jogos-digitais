<?php
declare(strict_types=1);

namespace App\Services\Prova;

use App\Core\Database;
use PDO;

/**
 * Serviços de negócio, DTOs, correção e persistência da Prova Módulo 1 (`api/_lib/prova/*`).
 */
final class ProvaService
{
    public const PROVA_GATE_TURMAS = ['TCG01', 'TCG02'];
    public const PROVA_ALERT_BLUR_MIN = 3;
    public const ADMIN_NOTES_MAX = 24000;
    public const ADMIN_COMMENT_MAX = 2000;
    public const ADMIN_GENERAL_NOTE_MAX = 4000;
    public const PROVA_CONTEST_MESSAGE_MAX = 4000;

    public const INTEGRITY_EVENT_TYPES = [
        'tab_blur',
        'tab_focus',
        'window_blur',
        'page_leave',
        'navigated_away',
        'beforeunload',
    ];

    // -------------------------------------------------------------------------
    // Gate e Tempo
    // -------------------------------------------------------------------------

    public static function remainingMs(mixed $endsAt, ?int $nowMs = null): int
    {
        $now = $nowMs ?? (int) round(microtime(true) * 1000);
        $end = Database::parseMs($endsAt ? (string) $endsAt : null);
        if ($end === null) {
            return 0;
        }
        return max(0, $end - $now);
    }

    public static function isPastEndsAt(mixed $endsAt, ?int $nowMs = null): bool
    {
        return self::remainingMs($endsAt, $nowMs) <= 0;
    }

    /**
     * @return array<int, string>
     */
    public static function normalizeOpenTurmas(mixed $raw): array
    {
        if (is_string($raw)) {
            $raw = Database::decodeJsonArray($raw);
        }
        if (!is_array($raw)) {
            return [];
        }
        $out = [];
        foreach ($raw as $item) {
            $t = strtoupper(trim((string) $item));
            if (in_array($t, self::PROVA_GATE_TURMAS, true) && !in_array($t, $out, true)) {
                $out[] = $t;
            }
        }
        return $out;
    }

    /**
     * @param array<string, mixed>|null $exam
     * @return array{state: string, openTurma: string|null, isOpen: bool, openTurmas: array<int, string>}
     */
    public static function examGateFromRow(?array $exam): array
    {
        $openTurmas = self::normalizeOpenTurmas($exam['open_turmas'] ?? []);
        $isOpenFlag = !empty($exam['is_open']);
        if (!$isOpenFlag || $openTurmas === []) {
            return [
                'state' => 'closed',
                'openTurma' => null,
                'isOpen' => false,
                'openTurmas' => [],
            ];
        }
        $allOpen = count($openTurmas) === count(self::PROVA_GATE_TURMAS)
            && count(array_diff(self::PROVA_GATE_TURMAS, $openTurmas)) === 0;
        return [
            'state' => $allOpen ? 'all' : $openTurmas[0],
            'openTurma' => count($openTurmas) === 1 ? $openTurmas[0] : null,
            'isOpen' => true,
            'openTurmas' => $openTurmas,
        ];
    }

    /**
     * @param array<string, mixed> $body
     * @return array{ok: bool, is_open?: bool, open_turmas?: array<int, string>, error?: string}
     */
    public static function parseAdminSetExamOpenBody(array $body): array
    {
        $modeRaw = $body['mode'] ?? $body['gate'] ?? $body['state'] ?? null;
        if ($modeRaw !== null && trim((string) $modeRaw) !== '') {
            $mode = trim((string) $modeRaw);
            if (in_array(strtolower($mode), ['closed', 'fechada', 'off', 'false'], true)) {
                return ['ok' => true, 'is_open' => false, 'open_turmas' => []];
            }
            if (in_array(strtolower($mode), ['all', 'todas', 'both', 'open_all'], true)) {
                return ['ok' => true, 'is_open' => true, 'open_turmas' => self::PROVA_GATE_TURMAS];
            }
            $turma = strtoupper($mode);
            if (in_array($turma, self::PROVA_GATE_TURMAS, true)) {
                return ['ok' => true, 'is_open' => true, 'open_turmas' => [$turma]];
            }
            return ['ok' => false, 'error' => 'Modo inválido. Use closed, all, TCG01 ou TCG02.'];
        }

        $openTurmas = self::normalizeOpenTurmas($body['openTurmas'] ?? $body['open_turmas'] ?? []);
        $isOpen = ($body['isOpen'] ?? false) === true || ($body['is_open'] ?? false) === true || ($body['open'] ?? false) === true;

        if (!$isOpen || $openTurmas === []) {
            return ['ok' => true, 'is_open' => false, 'open_turmas' => []];
        }
        return ['ok' => true, 'is_open' => true, 'open_turmas' => $openTurmas];
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     * @return array<string, int>
     */
    public static function countAttemptsByStatus(array $rows): array
    {
        $counts = [
            'inProgress' => 0,
            'submitted' => 0,
            'timedOut' => 0,
            'graded' => 0,
            'total' => 0,
            'awaitingGrade' => 0,
        ];
        foreach ($rows as $row) {
            $status = (string) ($row['status'] ?? '');
            $counts['total'] += 1;
            if ($status === 'in_progress') {
                $counts['inProgress'] += 1;
            } elseif ($status === 'submitted') {
                $counts['submitted'] += 1;
            } elseif ($status === 'timed_out') {
                $counts['timedOut'] += 1;
            } elseif ($status === 'graded') {
                $counts['graded'] += 1;
            }
        }
        $counts['awaitingGrade'] = $counts['submitted'] + $counts['timedOut'];
        return $counts;
    }

    /**
     * @param array<string, mixed>|null $exam
     * @param array<string, mixed> $user
     */
    public static function isExamOpenForUser(?array $exam, array $user): bool
    {
        $gate = self::examGateFromRow($exam);
        if (!$gate['isOpen'] || $gate['openTurmas'] === []) {
            return false;
        }
        $nowMs = (int) round(microtime(true) * 1000);
        if (!empty($exam['opens_at'])) {
            $opens = Database::parseMs((string) $exam['opens_at']);
            if ($opens !== null && $nowMs < $opens) {
                return false;
            }
        }
        if (!empty($exam['closes_at'])) {
            $closes = Database::parseMs((string) $exam['closes_at']);
            if ($closes !== null && $nowMs > $closes) {
                return false;
            }
        }
        return !empty($user['turma']) && in_array((string) $user['turma'], $gate['openTurmas'], true);
    }

    /**
     * @param array<string, mixed>|null $exam
     * @return array<string, mixed>|null
     */
    public static function examPublicDto(?array $exam): ?array
    {
        if (!$exam) {
            return null;
        }
        $gate = self::examGateFromRow($exam);
        $def = ProvaCatalog::forExam((string) $exam['id']);
        return [
            'id' => (string) $exam['id'],
            'kind' => $def ? $def->kind : ExamDefinition::KIND_QUIZ,
            'title' => !empty($exam['title']) ? (string) $exam['title'] : ($def ? $def->title : (string) $exam['id']),
            'durationMinutes' => (int) ($exam['duration_minutes'] ?? ($def ? $def->durationMinutes : 90)),
            'totalPoints' => (float) ($exam['total_points'] ?? ($def ? $def->totalPoints : ProvaCatalog::TOTAL_POINTS)),
            'questionCount' => $def ? $def->questionCount() : 0,
            'hasDiscursive' => $def ? $def->discursiveQuestionCount() > 0 : false,
            'contentReady' => $def ? !$def->placeholder : false,
            'project' => $def && $def->isProject() ? $def->projectPublic() : null,
            'isOpen' => $gate['isOpen'],
            'openTurmas' => $gate['openTurmas'],
            'openTurma' => $gate['openTurma'],
            'gateState' => $gate['state'],
            'gate' => $gate,
            'mcMax' => $def ? $def->mcMax() : 0,
            'discursiveMax' => $def ? $def->discursiveMax() : 0,
            'opensAt' => Database::sqlToIso($exam['opens_at'] ?? null),
            'closesAt' => Database::sqlToIso($exam['closes_at'] ?? null),
        ];
    }

    // -------------------------------------------------------------------------
    // Contestação e Notas Admin
    // -------------------------------------------------------------------------

    public static function normalizeContestMessage(mixed $raw): ?string
    {
        $text = trim((string) ($raw ?? ''));
        if ($text === '' || mb_strlen($text, 'UTF-8') > self::PROVA_CONTEST_MESSAGE_MAX) {
            return null;
        }
        return $text;
    }

    public static function normalizeContestAdminAction(mixed $action): ?string
    {
        $a = strtolower(trim((string) ($action ?? '')));
        if (in_array($a, ['answer', 'responder', 'reply'], true)) {
            return 'answer';
        }
        if (in_array($a, ['reopen', 'reabrir', 'revise', 'revisar'], true)) {
            return 'reopen';
        }
        return null;
    }

    /**
     * @param array<string, mixed>|null $attempt
     * @return array<string, mixed>|null
     */
    public static function contestDtoFromAttempt(?array $attempt): ?array
    {
        if (!$attempt) {
            return null;
        }
        $status = !empty($attempt['contest_status']) ? (string) $attempt['contest_status'] : null;
        $graded = ($attempt['status'] ?? '') === 'graded';
        return [
            'status' => $status,
            'studentMessage' => $attempt['contest_student_message'] ?? null,
            'adminMessage' => $attempt['contest_admin_message'] ?? null,
            'contestedAt' => Database::sqlToIso($attempt['contested_at'] ?? null),
            'resolvedAt' => Database::sqlToIso($attempt['contest_resolved_at'] ?? null),
            'canContest' => $graded && $status !== 'open',
            'isOpen' => $status === 'open',
        ];
    }

    /**
     * @return array{discursiveComments: array<string, string>, general: string}
     */
    public static function parseAttemptAdminNotes(mixed $raw): array
    {
        $empty = ['discursiveComments' => [], 'general' => ''];
        if ($raw === null || $raw === '') {
            return $empty;
        }
        if (is_string($raw)) {
            $trimmed = trim($raw);
            if (str_starts_with($trimmed, '{')) {
                $decoded = json_decode($trimmed, true);
                if (is_array($decoded)) {
                    $raw = $decoded;
                } else {
                    return ['discursiveComments' => [], 'general' => mb_substr($raw, 0, self::ADMIN_GENERAL_NOTE_MAX, 'UTF-8')];
                }
            } else {
                return ['discursiveComments' => [], 'general' => mb_substr($raw, 0, self::ADMIN_GENERAL_NOTE_MAX, 'UTF-8')];
            }
        }
        if (!is_array($raw)) {
            return $empty;
        }
        $comments = is_array($raw['discursiveComments'] ?? null) ? $raw['discursiveComments'] : [];
        $out = [];
        foreach ($comments as $k => $v) {
            $out[(string) $k] = mb_substr((string) ($v ?? ''), 0, self::ADMIN_COMMENT_MAX, 'UTF-8');
        }
        $general = mb_substr((string) ($raw['general'] ?? $raw['note'] ?? ''), 0, self::ADMIN_GENERAL_NOTE_MAX, 'UTF-8');
        return ['discursiveComments' => $out, 'general' => $general];
    }

    /**
     * @param array{discursiveComments?: array<string, string>, general?: string} $notes
     */
    public static function serializeAttemptAdminNotes(array $notes): string
    {
        $discursiveComments = [];
        foreach (($notes['discursiveComments'] ?? []) as $k => $v) {
            $t = trim((string) ($v ?? ''));
            if ($t !== '') {
                $discursiveComments[(string) $k] = mb_substr($t, 0, self::ADMIN_COMMENT_MAX, 'UTF-8');
            }
        }
        $general = mb_substr(trim((string) ($notes['general'] ?? '')), 0, self::ADMIN_GENERAL_NOTE_MAX, 'UTF-8');
        return json_encode([
            'discursiveComments' => (object) $discursiveComments,
            'general' => $general,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';
    }

    public static function validateSerializedAdminNotes(string $serialized): ?string
    {
        $len = strlen($serialized);
        if ($len <= self::ADMIN_NOTES_MAX) {
            return null;
        }
        return "Anotações da correção muito longas ({$len}/" . self::ADMIN_NOTES_MAX . " caracteres). Encurte os comentários das discursivas (máx. " . self::ADMIN_COMMENT_MAX . " cada).";
    }

    // -------------------------------------------------------------------------
    // Integridade
    // -------------------------------------------------------------------------

    public static function normalizeIntegrityEventType(mixed $raw): ?string
    {
        $type = trim((string) ($raw ?? ''));
        return in_array($type, self::INTEGRITY_EVENT_TYPES, true) ? $type : null;
    }

    /**
     * @return array{blurCount: int, leaveCount: int, lastEventAt: string|null}
     */
    public static function normalizeIntegritySummary(mixed $summary): array
    {
        if (is_string($summary)) {
            $summary = Database::decodeJson($summary, []);
        }
        $src = is_array($summary) ? $summary : [];
        return [
            'blurCount' => max(0, (int) ($src['blurCount'] ?? 0)),
            'leaveCount' => max(0, (int) ($src['leaveCount'] ?? 0)),
            'lastEventAt' => !empty($src['lastEventAt']) ? (string) $src['lastEventAt'] : null,
        ];
    }

    /**
     * @return array{blurCount: int, leaveCount: int, lastEventAt: string}
     */
    public static function bumpIntegritySummary(mixed $summary, string $eventType, string $atIso): array
    {
        $next = self::normalizeIntegritySummary($summary);
        $next['lastEventAt'] = $atIso;
        if (in_array($eventType, ['tab_blur', 'window_blur'], true)) {
            $next['blurCount'] += 1;
        }
        if (in_array($eventType, ['page_leave', 'navigated_away', 'beforeunload'], true)) {
            $next['leaveCount'] += 1;
        }
        return $next;
    }

    /**
     * @return array<string, mixed>
     */
    public static function sanitizeIntegrityMeta(mixed $raw): array
    {
        if (!is_array($raw) || array_is_list($raw)) {
            return [];
        }
        $json = json_encode($raw, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (!is_string($json) || strlen($json) > 2000) {
            return ['truncated' => true];
        }
        return $raw;
    }

    // -------------------------------------------------------------------------
    // DTOs Aluno e Admin
    // -------------------------------------------------------------------------

    /**
     * @param array<string, mixed>|null $attempt
     * @return array<string, mixed>|null
     */
    public static function attemptStudentDto(?array $attempt, ?int $nowMs = null): ?array
    {
        if (!$attempt) {
            return null;
        }
        $def = ProvaCatalog::forExam((string) $attempt['exam_id']);
        $status = (string) $attempt['status'];
        $dto = [
            'id' => (string) $attempt['id'],
            'examId' => (string) $attempt['exam_id'],
            'status' => $status,
            'startedAt' => Database::sqlToIso($attempt['started_at'] ?? null),
            'endsAt' => Database::sqlToIso($attempt['ends_at'] ?? null),
            'remainingMs' => $status === 'in_progress' ? self::remainingMs($attempt['ends_at'] ?? null, $nowMs) : 0,
            'currentQuestionIndex' => (int) ($attempt['current_question_index'] ?? 0),
            'submittedAt' => Database::sqlToIso($attempt['submitted_at'] ?? null),
        ];
        if ($status === 'submitted' || $status === 'timed_out') {
            $dto['awaitingGrade'] = true;
        }
        if ($status === 'graded') {
            $dto['awaitingGrade'] = false;
            $dto['finalScore'] = isset($attempt['final_score']) ? (float) $attempt['final_score'] : null;
            $dto['mcScore'] = isset($attempt['mc_score']) ? (float) $attempt['mc_score'] : null;
            $dto['discursiveScore'] = isset($attempt['discursive_score']) ? (float) $attempt['discursive_score'] : null;
            $dto['mcMax'] = $def ? $def->mcMax() : 0;
            $dto['discursiveMax'] = $def ? $def->discursiveMax() : 0;
            $dto['totalMax'] = $def ? $def->totalPoints : ProvaCatalog::TOTAL_POINTS;
            $dto['gradedAt'] = Database::sqlToIso($attempt['graded_at'] ?? null);
        }
        $dto['contest'] = self::contestDtoFromAttempt($attempt);
        return $dto;
    }

    /**
     * @param array<string, mixed> $attempt
     * @param array<int, array<string, mixed>> $answerRows
     * @return array<string, mixed>|null
     */
    public static function buildStudentReview(array $attempt, array $answerRows): ?array
    {
        if (($attempt['status'] ?? '') !== 'graded') {
            return null;
        }
        $byId = [];
        foreach ($answerRows as $row) {
            if (!empty($row['question_id'])) {
                $byId[(string) $row['question_id']] = $row;
            }
        }
        $def = ProvaCatalog::forExam((string) $attempt['exam_id']);
        if (!$def) {
            return null;
        }
        $notes = self::parseAttemptAdminNotes($attempt['admin_notes'] ?? null);
        $comments = $notes['discursiveComments'];

        $items = [];
        foreach ($def->questions as $q) {
            $qid = $q['id'];
            $row = $byId[$qid] ?? null;
            $base = [
                'questionId' => $qid,
                'number' => $q['index'] + 1,
                'type' => $q['type'],
                'title' => $q['title'] ?? null,
                'prompt' => $q['prompt'],
            ];
            if ($q['type'] === 'mc') {
                $studentChoice = $row['choice'] ?? null;
                $correctChoice = $def->mcAnswerKey[$qid] ?? null;
                $isCorrect = isset($row['is_correct'])
                    ? (bool) $row['is_correct']
                    : ($correctChoice !== null && $studentChoice === $correctChoice);
                $pointsAwarded = isset($row['points_awarded'])
                    ? (float) $row['points_awarded']
                    : ($isCorrect ? (float) $def->mcPointsEach : 0.0);
                $items[] = array_merge($base, [
                    'choices' => $q['choices'],
                    'studentChoice' => $studentChoice,
                    'correctChoice' => $correctChoice,
                    'isCorrect' => $isCorrect,
                    'pointsAwarded' => $pointsAwarded,
                    'maxPoints' => $def->mcPointsEach,
                    'comment' => $def->mcJustifications[$qid] ?? '',
                ]);
            } else {
                $pointsAwarded = isset($row['points_awarded']) ? (float) $row['points_awarded'] : 0.0;
                $items[] = array_merge($base, [
                    'studentText' => isset($row['text_answer']) ? (string) $row['text_answer'] : '',
                    'pointsAwarded' => $pointsAwarded,
                    'maxPoints' => $def->discursivePointsEach,
                    'comment' => $comments[$qid] ?? '',
                ]);
            }
        }

        return [
            'generalNote' => $notes['general'],
            'items' => $items,
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     * @return array<string, array{choice: string|null, textAnswer: string|null}>
     */
    public static function answersToClientMap(array $rows): array
    {
        $out = [];
        foreach ($rows as $row) {
            $id = (string) ($row['question_id'] ?? '');
            if ($id === '') {
                continue;
            }
            $out[$id] = [
                'choice' => !empty($row['choice']) ? (string) $row['choice'] : null,
                'textAnswer' => isset($row['text_answer']) ? (string) $row['text_answer'] : null,
            ];
        }
        return $out;
    }

    /**
     * @param array<string, mixed> $attempt
     * @param array<int, array<string, mixed>> $answerRows
     * @return array<string, mixed>
     */
    public static function studentAttemptPayload(array $attempt, array $answerRows, ?int $nowMs = null): array
    {
        $now = $nowMs ?? (int) round(microtime(true) * 1000);
        $def = ProvaCatalog::forExam((string) $attempt['exam_id']);
        $payload = [
            'serverNow' => Database::nowIso($now),
            'exam' => [
                'id' => (string) $attempt['exam_id'],
                'kind' => $def ? $def->kind : ExamDefinition::KIND_QUIZ,
                'title' => $def ? $def->title : (string) $attempt['exam_id'],
                'durationMinutes' => null,
                'totalPoints' => $def ? $def->totalPoints : ProvaCatalog::TOTAL_POINTS,
            ],
            'attempt' => self::attemptStudentDto($attempt, $now),
            'questions' => $def ? $def->sanitizeQuestionsForClient() : [],
            'answers' => (object) self::answersToClientMap($answerRows),
        ];
        if (($attempt['status'] ?? '') === 'graded') {
            $payload['review'] = self::buildStudentReview($attempt, $answerRows);
        }
        return $payload;
    }

    public static function clampQuestionIndex(mixed $index, ExamDefinition $def): ?int
    {
        if ($index === null || $index === '' || !is_numeric($index)) {
            return null;
        }
        $n = (int) $index;
        if ((string) $n !== trim((string) $index) && (float) $index != $n) {
            return null;
        }
        if ($n < 0 || $n >= $def->questionCount()) {
            return null;
        }
        return $n;
    }

    /**
     * @param array<string, mixed> $body
     * @return array{ok: bool, questionId?: string, choice?: string|null, textAnswer?: string|null, error?: string}
     */
    public static function parseSaveAnswerPayload(array $body, ExamDefinition $def): array
    {
        $questionId = trim((string) ($body['questionId'] ?? $body['question_id'] ?? ''));
        if ($questionId === '' || !$def->getQuestionById($questionId)) {
            return ['ok' => false, 'error' => 'Questão inválida.'];
        }
        if ($def->isMcQuestionId($questionId)) {
            $choice = ProvaCatalog::normalizeMcChoice($body['choice'] ?? null);
            if (!$choice) {
                return ['ok' => false, 'error' => 'Escolha uma alternativa (A–E).'];
            }
            return ['ok' => true, 'questionId' => $questionId, 'choice' => $choice, 'textAnswer' => null];
        }
        if ($def->isDiscursiveQuestionId($questionId)) {
            $textAnswer = (string) ($body['textAnswer'] ?? $body['text_answer'] ?? '');
            if (mb_strlen($textAnswer, 'UTF-8') > 12000) {
                return ['ok' => false, 'error' => 'Resposta longa demais (máx. 12000 caracteres).'];
            }
            return ['ok' => true, 'questionId' => $questionId, 'choice' => null, 'textAnswer' => $textAnswer];
        }
        return ['ok' => false, 'error' => 'Tipo de questão inválido.'];
    }

    /**
     * @param array<int, array<string, mixed>> $answerRows
     * @return array{mcScore: float, updates: array<int, array{questionId: string, isCorrect: bool, pointsAwarded: float, choice: string|null}>}
     */
    public static function buildMcGradeUpdates(array $answerRows, ?ExamDefinition $def = null): array
    {
        $def ??= ProvaCatalog::forExam(ProvaCatalog::EXAM_ID);
        $byId = [];
        foreach ($answerRows as $row) {
            $qid = (string) ($row['question_id'] ?? '');
            if ($qid !== '') {
                $byId[$qid] = $row['choice'] ?? null;
            }
        }
        $mcScore = 0.0;
        $updates = [];
        foreach ($def->listMcQuestionIds() as $qid) {
            $correct = $def->mcAnswerKey[$qid];
            $choice = ProvaCatalog::normalizeMcChoice($byId[$qid] ?? null);
            $isCorrect = $choice !== null && $choice === $correct;
            $pts = $isCorrect ? (float) $def->mcPointsEach : 0.0;
            if ($isCorrect) {
                $mcScore += $pts;
            }
            $updates[] = [
                'questionId' => $qid,
                'isCorrect' => $isCorrect,
                'pointsAwarded' => $pts,
                'choice' => $choice,
            ];
        }
        return ['mcScore' => $mcScore, 'updates' => $updates];
    }

    /**
     * @param array<int, array<string, mixed>> $answerRows
     */
    public static function sumDiscursivePoints(array $answerRows, ?ExamDefinition $def = null): float
    {
        $def ??= ProvaCatalog::forExam(ProvaCatalog::EXAM_ID);
        $discSet = array_flip($def->listDiscursiveQuestionIds());
        $sum = 0.0;
        foreach ($answerRows as $row) {
            $id = (string) ($row['question_id'] ?? '');
            if (!isset($discSet[$id])) {
                continue;
            }
            $pts = $def->normalizeDiscursivePoints($row['points_awarded'] ?? null);
            if ($pts !== null) {
                $sum += $pts;
            }
        }
        return round($sum * 100.0) / 100.0;
    }

    /**
     * @param array<string, mixed> $attempt
     * @param array<string, mixed>|null $userRow
     * @return array<string, mixed>
     */
    public static function attemptAdminListItem(array $attempt, ?array $userRow, ?int $nowMs = null): array
    {
        $summary = self::normalizeIntegritySummary($attempt['integrity_summary'] ?? []);
        $status = (string) $attempt['status'];
        $hasAlerts = $summary['blurCount'] >= self::PROVA_ALERT_BLUR_MIN || $summary['leaveCount'] >= 1;

        return [
            'id' => (string) $attempt['id'],
            'examId' => (string) $attempt['exam_id'],
            'userId' => (int) $attempt['user_id'],
            'status' => $status,
            'startedAt' => Database::sqlToIso($attempt['started_at'] ?? null),
            'endsAt' => Database::sqlToIso($attempt['ends_at'] ?? null),
            'submittedAt' => Database::sqlToIso($attempt['submitted_at'] ?? null),
            'gradedAt' => Database::sqlToIso($attempt['graded_at'] ?? null),
            'currentQuestionIndex' => (int) ($attempt['current_question_index'] ?? 0),
            'remainingMs' => $status === 'in_progress' ? self::remainingMs($attempt['ends_at'] ?? null, $nowMs) : 0,
            'mcScore' => isset($attempt['mc_score']) ? (float) $attempt['mc_score'] : null,
            'discursiveScore' => isset($attempt['discursive_score']) ? (float) $attempt['discursive_score'] : null,
            'finalScore' => isset($attempt['final_score']) ? (float) $attempt['final_score'] : null,
            'integritySummary' => $summary,
            'blurCount' => $summary['blurCount'],
            'leaveCount' => $summary['leaveCount'],
            'hasAlerts' => $hasAlerts,
            'contestStatus' => $attempt['contest_status'] ?? null,
            'hasOpenContest' => ($attempt['contest_status'] ?? '') === 'open',
            'student' => $userRow
                ? [
                    'id' => (int) $userRow['id'],
                    'fullName' => (string) (($userRow['full_name'] ?? '') ?: ($userRow['username'] ?? '—')),
                    'username' => $userRow['username'] ?? null,
                    'turma' => $userRow['turma'] ?? null,
                ]
                : [
                    'id' => (int) $attempt['user_id'],
                    'fullName' => '—',
                    'username' => null,
                    'turma' => null,
                ],
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $items
     * @param array<string, mixed> $filters
     * @return array<int, array<string, mixed>>
     */
    public static function filterAdminAttemptItems(array $items, array $filters = []): array
    {
        $turma = strtoupper(trim((string) ($filters['turma'] ?? '')));
        $status = trim((string) ($filters['status'] ?? ''));
        $alertsOnly = ($filters['alertsOnly'] ?? false) === true
            || ($filters['alertsOnly'] ?? '') === 'true'
            || ($filters['alertsOnly'] ?? '') === '1';

        return array_values(array_filter($items, static function (array $item) use ($turma, $status, $alertsOnly): bool {
            if ($turma !== '' && $turma !== 'ALL') {
                if (($item['student']['turma'] ?? null) !== $turma) {
                    return false;
                }
            }
            if ($status !== '' && $status !== 'all') {
                if ($status === 'awaiting_grade' || $status === 'awaiting') {
                    if ($item['status'] !== 'submitted' && $item['status'] !== 'timed_out') {
                        return false;
                    }
                } elseif ($item['status'] !== $status) {
                    return false;
                }
            }
            if ($alertsOnly && empty($item['hasAlerts'])) {
                return false;
            }
            return true;
        }));
    }

    /**
     * @param array<int, array<string, mixed>> $items
     * @return array<int, array<string, mixed>>
     */
    public static function sortAdminAttemptItems(array $items): array
    {
        $rank = static function (string $s): int {
            if ($s === 'in_progress') {
                return 0;
            }
            if ($s === 'submitted' || $s === 'timed_out') {
                return 1;
            }
            if ($s === 'graded') {
                return 2;
            }
            return 3;
        };

        usort($items, static function (array $a, array $b) use ($rank): int {
            $ra = $rank((string) $a['status']);
            $rb = $rank((string) $b['status']);
            if ($ra !== $rb) {
                return $ra <=> $rb;
            }
            $ta = Database::parseMs((string) ($a['submittedAt'] ?? $a['startedAt'] ?? '')) ?? 0;
            $tb = Database::parseMs((string) ($b['submittedAt'] ?? $b['startedAt'] ?? '')) ?? 0;
            return $tb <=> $ta;
        });

        return $items;
    }

    // -------------------------------------------------------------------------
    // DB Operations
    // -------------------------------------------------------------------------

    /**
     * @return array<string, mixed>|null
     */
    public static function loadExam(string $examId): ?array
    {
        $pdo = Database::get();
        $stmt = $pdo->prepare('SELECT * FROM prova_exams WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $examId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function loadAttemptForUser(string $examId, int $userId): ?array
    {
        $pdo = Database::get();
        $stmt = $pdo->prepare('SELECT * FROM prova_attempts WHERE exam_id = :eid AND user_id = :uid LIMIT 1');
        $stmt->execute([':eid' => $examId, ':uid' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * SELECT ... FOR UPDATE (exige transação aberta).
     *
     * @return array<string, mixed>|null
     */
    public static function lockAttemptRow(string $attemptId): ?array
    {
        return ProvaProjectService::lockAttempt($attemptId);
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function loadAttemptById(string $attemptId): ?array
    {
        $pdo = Database::get();
        $stmt = $pdo->prepare('SELECT * FROM prova_attempts WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $attemptId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function loadAnswers(string $attemptId): array
    {
        $pdo = Database::get();
        $stmt = $pdo->prepare('SELECT question_id, choice, text_answer, points_awarded, is_correct, updated_at FROM prova_answers WHERE attempt_id = :aid');
        $stmt->execute([':aid' => $attemptId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function loadIntegrityEvents(string $attemptId, int $limit = 100): array
    {
        $pdo = Database::get();
        $lim = max(1, min(200, $limit));
        $stmt = $pdo->prepare(
            "SELECT id, event_type, created_at, meta
             FROM prova_integrity_events
             WHERE attempt_id = :aid
             ORDER BY created_at DESC
             LIMIT {$lim}"
        );
        $stmt->execute([':aid' => $attemptId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * @param array<string, mixed> $attempt
     * @param 'submitted'|'timed_out' $nextStatus
     * @return array<string, mixed>
     */
    public static function gradeAndCloseAttempt(array $attempt, string $nextStatus, int $nowMs): array
    {
        $pdo = Database::get();
        $answers = self::loadAnswers((string) $attempt['id']);
        $def = ProvaCatalog::forExam((string) $attempt['exam_id']);
        $mc = self::buildMcGradeUpdates($answers, $def);
        $nowSql = Database::nowSql($nowMs);

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

        $submittedSql = !empty($attempt['submitted_at']) ? (string) $attempt['submitted_at'] : $nowSql;
        if ($def !== null && $def->releasesGradeOnSubmit()) {
            $upAtt = $pdo->prepare(
                'UPDATE prova_attempts
                 SET status = \'graded\', submitted_at = :sub, mc_score = :mcs,
                     discursive_score = :ds, final_score = :fs, graded_at = :gat, updated_at = :now
                 WHERE id = :id AND status = \'in_progress\''
            );
            $upAtt->execute([
                ':sub' => $submittedSql,
                ':mcs' => $mc['mcScore'],
                ':ds' => 0,
                ':fs' => $mc['mcScore'],
                ':gat' => $nowSql,
                ':now' => $nowSql,
                ':id' => $attempt['id'],
            ]);
        } else {
            $upAtt = $pdo->prepare(
                'UPDATE prova_attempts
                 SET status = :st, submitted_at = :sub, mc_score = :mcs, updated_at = :now
                 WHERE id = :id AND status = \'in_progress\''
            );
            $upAtt->execute([
                ':st' => $nextStatus,
                ':sub' => $submittedSql,
                ':mcs' => $mc['mcScore'],
                ':now' => $nowSql,
                ':id' => $attempt['id'],
            ]);
        }

        return self::loadAttemptById((string) $attempt['id']) ?? $attempt;
    }

    /**
     * Prova só de múltipla escolha: quem já entregou (ou estourou o tempo) e ainda
     * espera o Mestre passa a `graded`, com a nota que a correção automática já gravou.
     */
    public static function releasePendingAutoGrades(string $examId, int $nowMs): int
    {
        $def = ProvaCatalog::forExam($examId);
        if ($def === null || !$def->releasesGradeOnSubmit()) {
            return 0;
        }
        $pdo = Database::get();
        $nowSql = Database::nowSql($nowMs);
        $stmt = $pdo->prepare(
            'UPDATE prova_attempts
             SET status = \'graded\',
                 discursive_score = 0,
                 final_score = mc_score,
                 graded_at = :gat,
                 updated_at = :uat
             WHERE exam_id = :eid
               AND status IN (\'submitted\', \'timed_out\')
               AND mc_score IS NOT NULL'
        );
        $stmt->execute([
            ':gat' => $nowSql,
            ':uat' => $nowSql,
            ':eid' => $examId,
        ]);
        return $stmt->rowCount();
    }

    /**
     * @param array<string, mixed>|null $attempt
     * @return array<string, mixed>|null
     */
    public static function finalizeIfExpired(?array $attempt, int $nowMs): ?array
    {
        if (!$attempt || ($attempt['status'] ?? '') !== 'in_progress') {
            return $attempt;
        }
        if (!self::isPastEndsAt($attempt['ends_at'] ?? null, $nowMs)) {
            return $attempt;
        }
        return self::gradeAndCloseAttempt($attempt, 'timed_out', $nowMs);
    }

    /**
     * @param array<string, mixed> $attempt
     * @param array<string, mixed>|null $userRow
     * @param array<int, array<string, mixed>> $answerRows
     * @param array<int, array<string, mixed>> $integrityEvents
     * @return array<string, mixed>
     */
    public static function buildAdminAttemptDetail(
        array $attempt,
        ?array $userRow,
        array $answerRows,
        array $integrityEvents,
        ?int $nowMs = null
    ): array {
        $notes = self::parseAttemptAdminNotes($attempt['admin_notes'] ?? null);
        $listItem = self::attemptAdminListItem($attempt, $userRow, $nowMs);

        $byId = [];
        foreach ($answerRows as $row) {
            if (!empty($row['question_id'])) {
                $byId[(string) $row['question_id']] = $row;
            }
        }
        $def = ProvaCatalog::forExam((string) $attempt['exam_id']);
        $questions = $def ? $def->questionsForAdmin() : [];
        $comments = $notes['discursiveComments'];

        $answers = [];
        foreach ($questions as $q) {
            $qid = $q['id'];
            $row = $byId[$qid] ?? null;
            $base = [
                'questionId' => $qid,
                'number' => $q['index'] + 1,
                'type' => $q['type'],
                'title' => $q['title'] ?? null,
                'prompt' => $q['prompt'],
                'choices' => $q['choices'] ?? null,
                'studentChoice' => $row['choice'] ?? null,
                'studentText' => isset($row['text_answer']) ? (string) $row['text_answer'] : '',
                'pointsAwarded' => isset($row['points_awarded']) ? (float) $row['points_awarded'] : null,
                'isCorrect' => isset($row['is_correct']) ? (bool) $row['is_correct'] : null,
            ];
            if ($q['type'] === 'mc') {
                $correctChoice = $q['correctChoice'] ?? ($def->mcAnswerKey[$qid] ?? null);
                $studentChoice = $row['choice'] ?? null;
                $isCorrect = $correctChoice && $studentChoice
                    ? ($studentChoice === $correctChoice)
                    : ($correctChoice && !$studentChoice ? false : $base['isCorrect']);
                $pointsAwarded = $studentChoice
                    ? ($isCorrect ? (float) $def->mcPointsEach : 0.0)
                    : $base['pointsAwarded'];
                $answers[] = array_merge($base, [
                    'studentChoice' => $studentChoice,
                    'pointsAwarded' => $pointsAwarded,
                    'isCorrect' => $isCorrect,
                    'correctChoice' => $correctChoice,
                    'justification' => $q['justification'] ?? null,
                ]);
            } else {
                $answers[] = array_merge($base, [
                    'rubric' => $q['rubric'] ?? null,
                    'maxPoints' => $def ? $def->discursivePointsEach : 1,
                    'comment' => $comments[$qid] ?? '',
                ]);
            }
        }

        $discursiveIds = $def ? $def->listDiscursiveQuestionIds() : [];
        $scoredDiscursive = 0;
        foreach ($discursiveIds as $did) {
            $r = $byId[$did] ?? null;
            if ($def->normalizeDiscursivePoints($r['points_awarded'] ?? null) !== null) {
                $scoredDiscursive += 1;
            }
        }

        $status = (string) $attempt['status'];
        $canScore = $status === 'submitted' || $status === 'timed_out';
        $locked = $status === 'graded';

        $eventsDto = [];
        foreach ($integrityEvents as $ev) {
            $meta = $ev['meta'] ?? [];
            if (is_string($meta)) {
                $meta = Database::decodeJson($meta, []);
            }
            $eventsDto[] = [
                'id' => (int) $ev['id'],
                'eventType' => (string) $ev['event_type'],
                'createdAt' => Database::sqlToIso($ev['created_at'] ?? null),
                'meta' => is_array($meta) ? (object) $meta : (object) [],
            ];
        }

        $detail = array_merge($listItem, [
            'kind' => $def ? $def->kind : ExamDefinition::KIND_QUIZ,
            'adminNotesGeneral' => $notes['general'],
            'answers' => $answers,
            'contest' => [
                'status' => $attempt['contest_status'] ?? null,
                'studentMessage' => $attempt['contest_student_message'] ?? null,
                'adminMessage' => $attempt['contest_admin_message'] ?? null,
                'contestedAt' => Database::sqlToIso($attempt['contested_at'] ?? null),
                'resolvedAt' => Database::sqlToIso($attempt['contest_resolved_at'] ?? null),
                'isOpen' => ($attempt['contest_status'] ?? '') === 'open',
            ],
            'integrityEvents' => $eventsDto,
            'grading' => [
                'canScore' => $canScore,
                'locked' => $locked,
                'discursiveScored' => $scoredDiscursive,
                'discursiveTotal' => count($discursiveIds),
                'mcScore' => isset($attempt['mc_score']) ? (float) $attempt['mc_score'] : null,
                'discursiveScore' => isset($attempt['discursive_score'])
                    ? (float) $attempt['discursive_score']
                    : self::sumDiscursivePoints($answerRows, $def),
                'finalScore' => isset($attempt['final_score']) ? (float) $attempt['final_score'] : null,
                'canFinalize' => $canScore && !$locked,
                'canReopen' => $locked && ($attempt['contest_status'] ?? '') === 'open',
            ],
        ]);

        if ($def && $def->isProject()) {
            $sub = ProvaProjectService::loadSubmission((string) $attempt['id']);
            $detail['submission'] = ProvaProjectService::submissionDto($sub);
            $detail['feedback'] = $notes['general'];
            $detail['grading'] = [
                'canScore' => $sub !== null && $status !== 'graded',
                'locked' => $locked,
                'scoreMax' => (float) ($def->project['scoreMax'] ?? 30),
                'finalScore' => isset($attempt['final_score']) ? (float) $attempt['final_score'] : null,
                'canFinalize' => $sub !== null && $status !== 'graded',
                'canReopen' => $locked && ($attempt['contest_status'] ?? '') === 'open',
            ];
        }

        return $detail;
    }
}
