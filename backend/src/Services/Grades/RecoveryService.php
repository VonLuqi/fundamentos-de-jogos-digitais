<?php
declare(strict_types=1);

namespace App\Services\Grades;

use App\Core\Database;
use App\Services\Prova\Exams\RecuperacaoExam;
use PDO;

/**
 * Recuperação (FJD): elegibilidade (total da turma fechada < 55), status aprovado/recuperação/reprovado
 * e fechamento/reabertura das notas de recuperação por turma.
 */
final class RecoveryService
{
    public const THRESHOLD = 55.0;
    public const CAP = 60.0;

    /**
     * Regras puras do status do perfil.
     *
     * @param ?float $total      total do snapshot da turma (null = turma não fechada / aluno sem snapshot)
     * @param ?float $recScore   final_score da prova de recuperação já corrigida (null = sem nota)
     * @return array{status: ?string, threshold: float, recoveryCap: float, recovery: array{eligible: bool, score: ?float, closed: bool, finalScore: ?float}}
     */
    public static function statusDto(?float $total, bool $recoveryClosed, ?float $recScore): array
    {
        $dto = [
            'status' => null,
            'threshold' => self::THRESHOLD,
            'recoveryCap' => self::CAP,
            'recovery' => ['eligible' => false, 'score' => null, 'closed' => false, 'finalScore' => null],
        ];
        if ($total === null) {
            return $dto;
        }
        if ($total >= self::THRESHOLD) {
            $dto['status'] = 'aprovado';
            return $dto;
        }
        $dto['recovery']['eligible'] = true;
        $dto['recovery']['score'] = $recScore;
        $dto['recovery']['closed'] = $recoveryClosed;
        if (!$recoveryClosed) {
            $dto['status'] = 'recuperacao';
            return $dto;
        }
        if ($recScore !== null && $recScore >= self::THRESHOLD) {
            $dto['status'] = 'aprovado_recuperacao';
            $dto['recovery']['finalScore'] = min($recScore, self::CAP);
        } else {
            $dto['status'] = 'reprovado';
            $dto['recovery']['finalScore'] = $total;
        }
        return $dto;
    }

    /** Total do snapshot fechado do aluno; null se a turma não está fechada ou não há snapshot. */
    public static function snapshotTotal(string $turma, int $userId): ?float
    {
        if ($turma === '' || TurmaGradesService::closure($turma)['status'] !== 'closed') {
            return null;
        }
        $stmt = Database::pdo()->prepare('SELECT `total` FROM `turma_grade_snapshots` WHERE `turma` = :t AND `user_id` = :u');
        $stmt->execute([':t' => $turma, ':u' => $userId]);
        $v = $stmt->fetchColumn();
        return $v === false ? null : (float) $v;
    }

    public static function isEligible(array $user): bool
    {
        $total = self::snapshotTotal((string) ($user['turma'] ?? ''), (int) $user['id']);
        return ($total !== null && $total < self::THRESHOLD) || self::hasOverride((int) $user['id']);
    }

    /** Liberação manual do Mestre (recovery_overrides). */
    public static function hasOverride(int $userId): bool
    {
        $stmt = Database::pdo()->prepare('SELECT 1 FROM `recovery_overrides` WHERE `user_id` = :u');
        $stmt->execute([':u' => $userId]);
        return $stmt->fetchColumn() !== false;
    }

    /** @return array{ok: bool, status: int, error?: string} */
    public static function grantOverride(int $userId, int $actorId, string $reason): array
    {
        $stmt = Database::pdo()->prepare("SELECT 1 FROM `users` WHERE `id` = :u AND `role` = 'student'");
        $stmt->execute([':u' => $userId]);
        if ($stmt->fetchColumn() === false) {
            return ['ok' => false, 'status' => 404, 'error' => 'Aluno não encontrado.'];
        }
        Database::pdo()->prepare(
            'INSERT INTO `recovery_overrides` (`user_id`, `granted_by`, `granted_at`, `reason`) VALUES (:u, :by, :at, :r)
             ON DUPLICATE KEY UPDATE `granted_by` = VALUES(`granted_by`), `granted_at` = VALUES(`granted_at`), `reason` = VALUES(`reason`)'
        )->execute([':u' => $userId, ':by' => $actorId, ':at' => Database::nowSql(), ':r' => mb_substr(trim($reason), 0, 255)]);
        return ['ok' => true, 'status' => 200];
    }

    public static function revokeOverride(int $userId): void
    {
        Database::pdo()->prepare('DELETE FROM `recovery_overrides` WHERE `user_id` = :u')->execute([':u' => $userId]);
    }

    /**
     * Picker do Hub: todos os alunos + se há liberação.
     *
     * @return list<array<string, mixed>>
     */
    public static function overrideStudents(): array
    {
        $rows = Database::pdo()->query(
            "SELECT u.`id`, u.`full_name`, u.`turma`, o.`reason`, o.`granted_at`
             FROM `users` u LEFT JOIN `recovery_overrides` o ON o.`user_id` = u.`id`
             WHERE u.`role` = 'student' ORDER BY u.`full_name` ASC"
        )->fetchAll(PDO::FETCH_ASSOC) ?: [];
        return array_map(static fn(array $r): array => [
            'userId' => (int) $r['id'],
            'name' => (string) $r['full_name'],
            'turma' => (string) ($r['turma'] ?? ''),
            'override' => $r['granted_at'] !== null,
            'reason' => (string) ($r['reason'] ?? ''),
        ], $rows);
    }

    /** @return array{status: string, closedAt: ?string, reopenedAt: ?string} */
    public static function closure(string $turma): array
    {
        $stmt = Database::pdo()->prepare('SELECT * FROM `turma_recovery_closures` WHERE `turma` = :t');
        $stmt->execute([':t' => $turma]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        return [
            'status' => $r ? (string) $r['status'] : 'open',
            'closedAt' => Database::sqlToIso($r['closed_at'] ?? null),
            'reopenedAt' => Database::sqlToIso($r['reopened_at'] ?? null),
        ];
    }

    /** Nota (final_score corrigida) do aluno na recuperação, ou null. */
    public static function recoveryScore(int $userId): ?float
    {
        $stmt = Database::pdo()->prepare(
            'SELECT `final_score` FROM `prova_attempts`
             WHERE `exam_id` = :e AND `user_id` = :u AND `final_score` IS NOT NULL AND `graded_at` IS NOT NULL'
        );
        $stmt->execute([':e' => RecuperacaoExam::ID, ':u' => $userId]);
        $v = $stmt->fetchColumn();
        return $v === false ? null : (float) $v;
    }

    /** Campos extras do my-grade (`status`, `threshold`, `recoveryCap`, `recovery`). */
    public static function studentDto(array $user): array
    {
        $turma = (string) ($user['turma'] ?? '');
        // Liberado manualmente sem snapshot: base 0 para status/teto.
        $total = self::snapshotTotal($turma, (int) $user['id']) ?? (self::hasOverride((int) $user['id']) ? 0.0 : null);
        if ($total === null || $total >= self::THRESHOLD) {
            return self::statusDto($total, false, null);
        }
        return self::statusDto($total, self::closure($turma)['status'] === 'closed', self::recoveryScore((int) $user['id']));
    }

    /**
     * Alunos elegíveis da turma com a situação da prova.
     *
     * @return list<array<string, mixed>>
     */
    public static function boardRows(string $turma): array
    {
        $stmt = Database::pdo()->prepare(
            'SELECT u.`id` AS user_id, s.`total`, u.`full_name`, o.`user_id` AS ov, o.`reason`,
                    a.`status` AS attempt_status, a.`final_score`, a.`graded_at`
             FROM `users` u
             LEFT JOIN `turma_grade_snapshots` s ON s.`user_id` = u.`id` AND s.`turma` = :t1
             LEFT JOIN `recovery_overrides` o ON o.`user_id` = u.`id`
             LEFT JOIN `prova_attempts` a ON a.`user_id` = u.`id` AND a.`exam_id` = :e
             WHERE (s.`total` IS NOT NULL AND s.`total` < :th) OR (o.`user_id` IS NOT NULL AND u.`turma` = :t2)
             ORDER BY u.`full_name` ASC'
        );
        $stmt->execute([':e' => RecuperacaoExam::ID, ':t1' => $turma, ':t2' => $turma, ':th' => self::THRESHOLD]);
        $closed = self::closure($turma)['status'] === 'closed';
        $out = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) {
            $score = $r['final_score'] !== null && $r['graded_at'] !== null ? (float) $r['final_score'] : null;
            // Liberado manualmente sem snapshot: total exibido null, cálculo com base 0.
            $total = $r['total'] !== null ? (float) $r['total'] : null;
            $dto = self::statusDto($total ?? 0.0, $closed, $score);
            $out[] = [
                'userId' => (int) $r['user_id'],
                'name' => (string) $r['full_name'],
                'total' => $total,
                'override' => $r['ov'] !== null,
                'reason' => (string) ($r['reason'] ?? ''),
                'attemptStatus' => $r['attempt_status'] !== null ? (string) $r['attempt_status'] : null,
                'score' => $score,
                'status' => $dto['status'],
                'finalScore' => $dto['recovery']['finalScore'],
            ];
        }
        return $out;
    }

    /**
     * Fecha as notas de recuperação da turma (exige turma fechada). Tentativas ainda não corrigidas bloqueiam sem force.
     *
     * @return array{ok: bool, status: int, error?: string, pending?: list<array<string, mixed>>}
     */
    public static function close(string $turma, int $actorId, bool $force): array
    {
        if (TurmaGradesService::closure($turma)['status'] !== 'closed') {
            return ['ok' => false, 'status' => 409, 'error' => 'Feche as notas da turma antes de fechar a recuperação.'];
        }
        if (self::closure($turma)['status'] === 'closed') {
            return ['ok' => false, 'status' => 409, 'error' => 'Recuperação já está fechada.'];
        }
        $pending = [];
        foreach (self::boardRows($turma) as $r) {
            if ($r['attemptStatus'] !== null && $r['score'] === null) {
                $pending[] = ['userId' => $r['userId'], 'name' => $r['name'], 'attemptStatus' => $r['attemptStatus']];
            }
        }
        if ($pending !== [] && !$force) {
            return ['ok' => false, 'status' => 409, 'error' => 'Há provas de recuperação sem correção. Use force para fechar mesmo assim.', 'pending' => $pending];
        }
        Database::pdo()->prepare(
            "INSERT INTO `turma_recovery_closures` (`turma`, `status`, `closed_at`, `closed_by`)
             VALUES (:t, 'closed', :at, :by)
             ON DUPLICATE KEY UPDATE `status` = 'closed', `closed_at` = VALUES(`closed_at`), `closed_by` = VALUES(`closed_by`)"
        )->execute([':t' => $turma, ':at' => Database::nowSql(), ':by' => $actorId]);
        return ['ok' => true, 'status' => 200, 'pending' => $pending];
    }

    /** @return array{ok: bool, status: int, error?: string} */
    public static function reopen(string $turma, int $actorId): array
    {
        if (self::closure($turma)['status'] !== 'closed') {
            return ['ok' => false, 'status' => 409, 'error' => 'Recuperação não está fechada.'];
        }
        Database::pdo()->prepare(
            "UPDATE `turma_recovery_closures` SET `status` = 'open', `reopened_at` = :at, `reopened_by` = :by WHERE `turma` = :t"
        )->execute([':at' => Database::nowSql(), ':by' => $actorId, ':t' => $turma]);
        return ['ok' => true, 'status' => 200];
    }
}
