<?php
declare(strict_types=1);

namespace App\Services\Grades;

use App\Core\Database;
use App\Services\Prova\Exams\Modulo2Exam;
use App\Services\Prova\Exams\TrabalhoFinalExam;
use App\Services\Prova\ProvaCatalog;
use PDO;
use PDOException;
use Throwable;

/**
 * Fechamento de notas da turma: leitura ao vivo, snapshot ao fechar, CSV e nota do aluno.
 */
final class TurmaGradesService
{
    private const EXAM_KEYS = [
        'm1' => ProvaCatalog::EXAM_ID,
        'm2' => Modulo2Exam::ID,
        'tf' => TrabalhoFinalExam::ID,
    ];

    /**
     * Cálculo ao vivo de todos os alunos da turma.
     *
     * @return list<array<string, mixed>>
     */
    public static function liveRows(string $turma): array
    {
        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            "SELECT `id`, `full_name`, `turma`, `redeemed_codes` FROM `users`
             WHERE `turma` = :t AND `role` = 'student' ORDER BY `full_name` ASC"
        );
        $stmt->execute([':t' => $turma]);
        $students = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        if ($students === []) {
            return [];
        }
        $ids = array_map(static fn(array $s): int => (int) $s['id'], $students);
        $in = implode(',', $ids); // inteiros já validados pelo cast

        $allCodes = [];
        foreach ($students as $s) {
            foreach (Database::decodeJsonArray($s['redeemed_codes'] ?? null) as $c) {
                $allCodes[(string) $c] = true;
            }
        }
        $codeLesson = [];
        if ($allCodes !== []) {
            $keys = array_keys($allCodes);
            $ph = implode(',', array_fill(0, count($keys), '?'));
            $q = $pdo->prepare("SELECT `code`, `lesson_id` FROM `redeem_codes` WHERE `code` IN ({$ph})");
            $q->execute($keys);
            foreach ($q->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) {
                $codeLesson[(string) $r['code']] = (string) $r['lesson_id'];
            }
        }

        $delivered = [];
        $q = $pdo->query(
            "SELECT `user_id`, `lesson_id` FROM `lesson_paragraphs`
             WHERE `user_id` IN ({$in}) AND TRIM(`paragraph`) <> ''"
        );
        foreach ($q->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) {
            $delivered[(int) $r['user_id']][(string) $r['lesson_id']] = true;
        }
        $q = $pdo->query(
            "SELECT `owner_user_id`, `partner_user_id`, `lesson_id` FROM `lesson_journals`
             WHERE TRIM(`body`) <> '' AND (`owner_user_id` IN ({$in}) OR `partner_user_id` IN ({$in}))"
        );
        foreach ($q->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) {
            foreach (['owner_user_id', 'partner_user_id'] as $col) {
                if ($r[$col] !== null) {
                    $delivered[(int) $r[$col]][(string) $r['lesson_id']] = true;
                }
            }
        }

        $scores = [];
        $exIn = implode(',', array_map(static fn(string $e): string => $pdo->quote($e), array_values(self::EXAM_KEYS)));
        $q = $pdo->query(
            "SELECT `user_id`, `exam_id`, `final_score` FROM `prova_attempts`
             WHERE `user_id` IN ({$in}) AND `exam_id` IN ({$exIn})
               AND `final_score` IS NOT NULL AND `graded_at` IS NOT NULL"
        );
        $examKey = array_flip(self::EXAM_KEYS);
        foreach ($q->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) {
            $scores[(int) $r['user_id']][$examKey[(string) $r['exam_id']]] = (float) $r['final_score'];
        }

        $rows = [];
        foreach ($students as $s) {
            $uid = (int) $s['id'];
            $lessons = [];
            foreach (Database::decodeJsonArray($s['redeemed_codes'] ?? null) as $c) {
                if (isset($codeLesson[(string) $c])) {
                    $lessons[$codeLesson[(string) $c]] = true;
                }
            }
            $res = GradeCalculator::compute(
                array_keys($lessons),
                array_keys($delivered[$uid] ?? []),
                $scores[$uid] ?? []
            );
            $rows[] = ['userId' => $uid, 'name' => (string) $s['full_name'], 'turma' => (string) $s['turma']] + $res;
        }
        return $rows;
    }

    /** @return array{turma: string, status: string, closedAt: ?string, reopenedAt: ?string} */
    public static function closure(string $turma): array
    {
        $stmt = Database::pdo()->prepare('SELECT * FROM `turma_grade_closures` WHERE `turma` = :t');
        $stmt->execute([':t' => $turma]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        return [
            'turma' => $turma,
            'status' => $r ? (string) $r['status'] : 'open',
            'closedAt' => Database::sqlToIso($r['closed_at'] ?? null),
            'reopenedAt' => Database::sqlToIso($r['reopened_at'] ?? null),
        ];
    }

    /**
     * @return array{ok: bool, status: int, error?: string, pending?: list<array<string, mixed>>, closedCount?: int}
     */
    public static function close(string $turma, int $actorId, bool $force): array
    {
        $rows = self::liveRows($turma);
        if ($rows === []) {
            return ['ok' => false, 'status' => 404, 'error' => 'Turma sem alunos.'];
        }
        $pending = self::pendingList($rows);
        if ($pending !== [] && !$force) {
            return ['ok' => false, 'status' => 409, 'error' => 'Há notas pendentes. Use force para fechar mesmo assim.', 'pending' => $pending];
        }

        $pdo = Database::pdo();
        // Deadlock (1213/40001) entre fechamentos simultâneos: tenta de novo uma vez.
        for ($attempt = 1; $attempt <= 2; $attempt++) {
            try {
                return self::closeTx($pdo, $turma, $actorId, $rows, $pending, Database::nowSql());
            } catch (PDOException $e) {
                if (!self::isDeadlock($e)) {
                    throw $e;
                }
            }
        }
        return ['ok' => false, 'status' => 409, 'error' => 'Fechamento em andamento. Tente de novo.'];
    }

    private static function isDeadlock(PDOException $e): bool
    {
        return (string) $e->getCode() === '40001' || (int) ($e->errorInfo[1] ?? 0) === 1213;
    }

    /**
     * @param list<array<string, mixed>> $rows
     * @param list<array<string, mixed>> $pending
     * @return array{ok: bool, status: int, error?: string, pending?: list<array<string, mixed>>, closedCount?: int}
     */
    private static function closeTx(PDO $pdo, string $turma, int $actorId, array $rows, array $pending, string $now): array
    {
        $pdo->beginTransaction();
        try {
            // Trava primeiro (sem lock compartilhado prévio); cria a linha só se não existir.
            $lock = $pdo->prepare('SELECT `status` FROM `turma_grade_closures` WHERE `turma` = :t FOR UPDATE');
            $lock->execute([':t' => $turma]);
            $status = $lock->fetchColumn();
            if ($status === false) {
                $pdo->prepare("INSERT IGNORE INTO `turma_grade_closures` (`turma`, `status`) VALUES (:t, 'open')")->execute([':t' => $turma]);
                $lock->execute([':t' => $turma]);
                $status = $lock->fetchColumn();
            }
            if ($status === 'closed') {
                $pdo->rollBack();
                return ['ok' => false, 'status' => 409, 'error' => 'Turma já está fechada.'];
            }
            $pdo->prepare('DELETE FROM `turma_grade_snapshots` WHERE `turma` = :t')->execute([':t' => $turma]);
            $ins = $pdo->prepare(
                'INSERT INTO `turma_grade_snapshots`
                 (`turma`, `user_id`, `codes`, `entregas`, `m1`, `m2`, `tf`, `total`, `details`, `closed_at`)
                 VALUES (:t, :u, :c, :e, :m1, :m2, :tf, :tot, :d, :at)'
            );
            foreach ($rows as $r) {
                $ins->execute([
                    ':t' => $turma, ':u' => $r['userId'], ':c' => $r['codes'], ':e' => $r['entregas'],
                    ':m1' => $r['m1'], ':m2' => $r['m2'], ':tf' => $r['tf'], ':tot' => $r['total'],
                    ':d' => Database::encodeJsonObject($r['details'] + ['pending' => $r['pending']]),
                    ':at' => $now,
                ]);
            }
            $pdo->prepare(
                "INSERT INTO `turma_grade_closures` (`turma`, `status`, `closed_at`, `closed_by`)
                 VALUES (:t, 'closed', :at, :by)
                 ON DUPLICATE KEY UPDATE `status` = 'closed', `closed_at` = VALUES(`closed_at`), `closed_by` = VALUES(`closed_by`)"
            )->execute([':t' => $turma, ':at' => $now, ':by' => $actorId]);
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
        return ['ok' => true, 'status' => 200, 'closedCount' => count($rows), 'pending' => $pending];
    }

    /** @return array{ok: bool, status: int, error?: string} */
    public static function reopen(string $turma, int $actorId): array
    {
        if (self::closure($turma)['status'] !== 'closed') {
            return ['ok' => false, 'status' => 409, 'error' => 'Turma não está fechada.'];
        }
        Database::pdo()->prepare(
            "UPDATE `turma_grade_closures` SET `status` = 'open', `reopened_at` = :at, `reopened_by` = :by WHERE `turma` = :t"
        )->execute([':at' => Database::nowSql(), ':by' => $actorId, ':t' => $turma]);
        return ['ok' => true, 'status' => 200];
    }

    /** CSV da turma: snapshot se fechada, senão ao vivo. */
    public static function csv(string $turma): string
    {
        $rows = self::closure($turma)['status'] === 'closed' ? self::snapshotRows($turma) : self::liveRows($turma);
        $lines = [['Aluno', 'Turma', 'Codigos', 'Entregas', 'M1', 'M2', 'TrabalhoFinal', 'Total']];
        foreach ($rows as $r) {
            $lines[] = [$r['name'], $turma, $r['codes'], $r['entregas'], $r['m1'], $r['m2'], $r['tf'], $r['total']];
        }
        return "\xEF\xBB\xBF" . implode("\r\n", array_map([self::class, 'csvLine'], $lines)) . "\r\n";
    }

    /** @return array<string, mixed> */
    public static function studentGrade(array $user): array
    {
        $turma = (string) ($user['turma'] ?? '');
        $closure = $turma === '' ? ['status' => 'open'] : self::closure($turma);
        if ($closure['status'] !== 'closed') {
            return ['closed' => false];
        }
        $stmt = Database::pdo()->prepare('SELECT * FROM `turma_grade_snapshots` WHERE `turma` = :t AND `user_id` = :u');
        $stmt->execute([':t' => $turma, ':u' => (int) $user['id']]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$r) {
            return ['closed' => true, 'missing' => true, 'closedAt' => $closure['closedAt'] ?? null];
        }
        return ['closed' => true] + self::snapshotDto($r);
    }

    /** @return array<int, true> user_id => true */
    public static function snapshotUserIds(string $turma): array
    {
        $stmt = Database::pdo()->prepare('SELECT `user_id` FROM `turma_grade_snapshots` WHERE `turma` = :t');
        $stmt->execute([':t' => $turma]);
        $out = [];
        foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) ?: [] as $id) {
            $out[(int) $id] = true;
        }
        return $out;
    }

    /** @return list<array<string, mixed>> */
    private static function snapshotRows(string $turma): array
    {
        $stmt = Database::pdo()->prepare(
            'SELECT s.*, u.`full_name` FROM `turma_grade_snapshots` s
             JOIN `users` u ON u.`id` = s.`user_id` WHERE s.`turma` = :t ORDER BY u.`full_name` ASC'
        );
        $stmt->execute([':t' => $turma]);
        $out = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) {
            $out[] = ['name' => (string) $r['full_name']] + self::snapshotDto($r);
        }
        return $out;
    }

    /** @return array<string, mixed> */
    private static function snapshotDto(array $r): array
    {
        $details = json_decode((string) ($r['details'] ?? '{}'), true);
        return [
            'userId' => (int) $r['user_id'],
            'codes' => (float) $r['codes'],
            'entregas' => (float) $r['entregas'],
            'm1' => (float) $r['m1'],
            'm2' => (float) $r['m2'],
            'tf' => (float) $r['tf'],
            'total' => (float) $r['total'],
            'details' => is_array($details) ? $details : [],
            'closedAt' => Database::sqlToIso($r['closed_at'] ?? null),
        ];
    }

    /**
     * @param list<array<string, mixed>> $rows
     * @return list<array<string, mixed>>
     */
    public static function pendingList(array $rows): array
    {
        $out = [];
        foreach ($rows as $r) {
            if ($r['pending'] !== []) {
                $out[] = ['userId' => $r['userId'], 'name' => $r['name'], 'items' => $r['pending']];
            }
        }
        return $out;
    }

    /** @param list<mixed> $cells */
    private static function csvLine(array $cells): string
    {
        return implode(',', array_map(static function ($v): string {
            $s = is_float($v) ? rtrim(rtrim(number_format($v, 2, '.', ''), '0'), '.') : (string) $v;
            if (is_string($v) && $v !== '' && strpbrk($v[0], "=+-@\t\r") !== false) {
                $s = "'" . $s; // evita injeção de fórmula no Excel
            }
            return preg_match('/[",\r\n]/', $s) ? '"' . str_replace('"', '""', $s) . '"' : $s;
        }, $cells));
    }
}
