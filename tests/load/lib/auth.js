/**
 * Auth helpers for k6 load scripts.
 */
import http from 'k6/http';
import { check } from 'k6';

/**
 * @param {string} baseUrl
 * @param {string} username
 * @param {string} password
 * @returns {string|null} session token
 */
export function login(baseUrl, username, password) {
  const res = http.post(
    `${baseUrl}/api/auth`,
    JSON.stringify({ action: 'login', username, password }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'auth_login' },
    },
  );
  const ok = check(res, {
    'login status 200': (r) => r.status === 200,
    'login ok body': (r) => {
      try {
        return r.json('ok') === true;
      } catch {
        return false;
      }
    },
  });
  if (!ok) return null;
  try {
    return res.json('token') || null;
  } catch {
    return null;
  }
}
