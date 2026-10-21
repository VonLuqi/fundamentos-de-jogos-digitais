/**
 * Concatena a superfície do módulo `/api/progress` (PHP backend + fachada JS se existir)
 * para smokes que inspecionam contratos do endpoint.
 *
 * @param {string} root — raiz do repositório
 * @returns {string}
 */
import fs from 'node:fs';
import path from 'node:path';

export function readProgressSurface(root) {
  const parts = [];

  const phpController = path.join(root, 'backend', 'src', 'Controllers', 'ProgressController.php');
  if (fs.existsSync(phpController)) {
    parts.push(fs.readFileSync(phpController, 'utf8'));
  }

  const phpServicesDir = path.join(root, 'backend', 'src', 'Services', 'Progress');
  if (fs.existsSync(phpServicesDir)) {
    const files = fs
      .readdirSync(phpServicesDir)
      .filter((name) => name.endsWith('.php'))
      .sort();
    for (const name of files) {
      parts.push(fs.readFileSync(path.join(phpServicesDir, name), 'utf8'));
    }
  }

  const facade = path.join(root, 'api', 'progress.js');
  if (fs.existsSync(facade)) {
    parts.push(fs.readFileSync(facade, 'utf8'));
  }

  const dir = path.join(root, 'api', '_lib', 'progress');
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
