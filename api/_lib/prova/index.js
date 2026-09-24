/**
 * Barrel público do domínio prova (server-only).
 */

export {
  DISCURSIVE_POINTS_EACH,
  DISCURSIVE_QUESTION_COUNT,
  EXAM_ID,
  EXAM_TITLE,
  MC_POINTS_EACH,
  MC_QUESTION_COUNT,
  QUESTION_COUNT,
  QUESTIONS,
  TOTAL_POINTS,
  getQuestionById,
  isDiscursiveQuestionId,
  isMcQuestionId,
  isValidQuestionId,
  listDiscursiveQuestionIds,
  listMcQuestionIds,
} from './questions-modulo1.js';

export {
  DISCURSIVE_RUBRICS,
  MC_ANSWER_KEY,
  MC_JUSTIFICATIONS,
  assertAnswerKeyCoversQuestions,
  getDiscursiveRubric,
  getMcCorrectChoice,
  gradeMultipleChoice,
  isMcChoiceCorrect,
  normalizeDiscursivePoints,
  normalizeMcChoice,
  questionsForAdmin,
  sanitizeQuestionsForClient,
} from './answer-key-modulo1.js';

export {
  PROVA_INTEGRITY_EVENT_TYPES,
  bumpIntegritySummary,
  normalizeIntegrityEventType,
  normalizeIntegritySummary,
  sanitizeIntegrityMeta,
} from './integrity-events.js';

export {
  PROVA_GATE_TURMAS,
  countAttemptsByStatus,
  examGateFromRow,
  normalizeOpenTurmas,
  parseAdminSetExamOpenBody,
} from './exam-gate.js';

export {
  PROVA_ALERT_BLUR_MIN,
  attemptAdminListItem,
  attemptHasAlerts,
  filterAdminAttemptItems,
  normalizeAttemptStatusFilter,
  normalizeTurmaFilter,
  sortAdminAttemptItems,
} from './admin-list.js';

export {
  buildAdminAttemptDetail,
  normalizeAttemptId,
  normalizeDiscursiveQuestionId,
  parseAttemptAdminNotes,
  serializeAttemptAdminNotes,
  sumDiscursivePoints,
} from './admin-grade.js';

export {
  PROVA_CONTEST_MESSAGE_MAX,
  PROVA_CONTEST_STATUSES,
  contestDtoFromAttempt,
  normalizeContestAdminAction,
  normalizeContestMessage,
} from './contest.js';
