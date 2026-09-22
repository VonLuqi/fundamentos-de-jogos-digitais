/**
 * Shared config for k6 load scripts (Fase B / doc 04).
 * Secrets via env — never commit credentials.
 */
export function getConfig() {
  const baseUrl = String(__ENV.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
  return {
    baseUrl,
    username: String(__ENV.LOAD_USERNAME || ''),
    password: String(__ENV.LOAD_PASSWORD || ''),
    lessonId: String(__ENV.LOAD_LESSON_ID || 'aula1'),
    syncIntervalMs: Number(__ENV.LOAD_SYNC_INTERVAL_MS || 10000),
    lbScope: String(__ENV.LOAD_LB_SCOPE || 'turma'),
    lbSort: String(__ENV.LOAD_LB_SORT || 'xp'),
    lbLimit: Number(__ENV.LOAD_LB_LIMIT || 25),
    classindRoomId: String(__ENV.LOAD_CLASSIND_ROOM_ID || ''),
    classindCode: String(__ENV.LOAD_CLASSIND_CODE || ''),
  };
}

export const defaultThresholds = {
  http_req_failed: ['rate<0.01'],
  'http_req_duration{name:auth_login}': ['p(95)<2500'],
  'http_req_duration{name:despertar_sync}': ['p(95)<1500'],
  'http_req_duration{name:session_bootstrap}': ['p(95)<800'],
  'http_req_duration{name:session_get}': ['p(95)<800'],
  'http_req_duration{name:profile_get}': ['p(95)<800'],
  'http_req_duration{name:leaderboard_get}': ['p(95)<800'],
  'http_req_duration{name:classind_get_state}': ['p(95)<1500'],
};
