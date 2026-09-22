/**
 * Concatena a fachada `api/progress.js` com todos os módulos em `api/_lib/progress/*.js`
 * para smokes que fazem string-grep no monólito antigo.
 *
 * @param {string} root — raiz do repositório
 * @returns {string}
 */
import fs from 'node:fs';
import path from 'node:path';

export function readProgressSurface(root) {
  const facade = path.join(root, 'api', 'progress.js');
  const dir = path.join(root, 'api', '_lib', 'progress');
  const parts = [];

  if (fs.existsSync(facade)) {
    parts.push(fs.readFileSync(facade, 'utf8'));
  }

  if (fs.existsSync(dir)) {
    const files = fs
      .readdirSync(dir)
      .filter((name) => name.endsWith('.js'))
      .sort();
    for (const name of files) {
      parts.push(fs.readFileSync(path.join(dir, name), 'utf8'));
    }
  }

  return parts.join('\n');
}
