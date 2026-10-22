<?php
declare(strict_types=1);

namespace App\Core;

use Throwable;

/**
 * Auditoria de mutações do Mestre (`admin_audit_events`).
 * Espelho de `api/_lib/admin-audit.js`.
 */
final class AdminAudit
{
    public const ACTIONS = [
        'adjustXp' => 'admin_adjust_xp',
        'grantAchievement' => 'admin_grant_achievement',
        'revokeAchievement' => 'admin_revoke_achievement',
        'forceTempPassword' => 'admin_force_temp_password',
        'updateProfile' => 'admin_update_profile',
        'setLessonCompleted' => 'admin_set_lesson_completed',
        'clearEmailSeal' => 'admin_clear_email_seal',
        'invalidateSessions' => 'admin_invalidate_sessions',
        'probeMailer' => 'admin_probe_mailer',
        'issueSoulRecoveryCode' => 'admin_issue_soul_recovery_code',
        'consumeSoulRecoveryCode' => 'consume_soul_recovery_code',
        'setProvaExamOpen' => 'admin_set_prova_exam_open',
        'scoreProvaDiscursive' => 'admin_score_prova_discursive',
        'finalizeProvaGrade' => 'admin_finalize_prova_grade',
        'respondProvaContest' => 'admin_respond_prova_contest',
        'reopenProvaGrade' => 'admin_reopen_prova_grade',
        'resetProvaAttempt' => 'admin_reset_prova_attempt',
        'resetAllProvaAttempts' => 'admin_reset_all_prova_attempts',
        'rebalanceLetheWallets' => 'admin_rebalance_lethe_wallets',
    ];

    /**
     * @param array<string, mixed> $payload
     */
    public static function record(
        int $actorId,
        string $action,
        ?int $targetUserId = null,
        array $payload = []
    ): bool {
        if ($actorId <= 0 || trim($action) === '') {
            return false;
        }
        try {
            $pdo = Database::pdo();
            $stmt = $pdo->prepare(
                'INSERT INTO `admin_audit_events` (`actor_id`, `target_user_id`, `action`, `payload`, `created_at`)
                 VALUES (:actor, :target, :action, :payload, :created)'
            );
            $stmt->execute([
                ':actor' => $actorId,
                ':target' => $targetUserId,
                ':action' => $action,
                ':payload' => Database::encodeJsonObject($payload),
                ':created' => Database::nowSql(),
            ]);
            return true;
        } catch (Throwable $e) {
            error_log('[admin-audit] ' . $e->getMessage());
            return false;
        }
    }
}
