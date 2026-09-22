/**
 * Audit de mutações do Mestre (Task 7 — Espelho da Alma).
 * Melhor esforço: falha de insert não derruba a mutação já aplicada.
 */

const TABLE = 'admin_audit_events';

function isMissingAuditTable(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return code === '42P01'
    || code === 'PGRST205'
    || /admin_audit_events/i.test(message);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ actorId: number|string, targetUserId?: number|string|null, action: string, payload?: object }} entry
 */
export async function recordAdminAudit(supabase, entry) {
  if (!supabase || !entry?.action || entry.actorId == null) return { ok: false };
  try {
    const { error } = await supabase.from(TABLE).insert({
      actor_id: entry.actorId,
      target_user_id: entry.targetUserId ?? null,
      action: String(entry.action),
      payload: entry.payload && typeof entry.payload === 'object' ? entry.payload : {},
      created_at: new Date().toISOString(),
    });
    if (error) {
      if (isMissingAuditTable(error)) {
        console.warn('[admin-audit] tabela ausente — aplique migrate-2026-09-22-admin-audit-events.sql');
        return { ok: false, missingTable: true };
      }
      console.warn('[admin-audit] insert failed', error.message);
      return { ok: false };
    }
    return { ok: true };
  } catch (error) {
    console.warn('[admin-audit] insert threw', error?.message || error);
    return { ok: false };
  }
}

export const ADMIN_AUDIT_ACTIONS = Object.freeze({
  adjustXp: 'admin_adjust_xp',
  grantAchievement: 'admin_grant_achievement',
  revokeAchievement: 'admin_revoke_achievement',
  forceTempPassword: 'admin_force_temp_password',
  updateProfile: 'admin_update_profile',
  setLessonCompleted: 'admin_set_lesson_completed',
  clearEmailSeal: 'admin_clear_email_seal',
  invalidateSessions: 'admin_invalidate_sessions',
});
