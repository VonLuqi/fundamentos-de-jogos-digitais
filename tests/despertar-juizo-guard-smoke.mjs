/**
 * Anti-bot do Juízo: simulação de humanos (nunca banidos) e bots (banidos) no núcleo do JuizoGuard,
 * mais conferências estáticas do cliente. O caminho HTTP real (ban/desban) está em despertar:ensaio-temporada.
 * Precisa de `php` no PATH (sem banco).
 *
 * Uso: node tests/despertar-juizo-guard-smoke.mjs
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const res = spawnSync('php', ['tests/despertar-juizo-guard-unit.php'], { cwd: root, encoding: 'utf8', timeout: 120_000 });
if (res.error) {
  console.log('SKIP — precisa de `php` no PATH.');
  process.exit(0);
}
process.stdout.write(res.stdout || '');
process.stderr.write(res.stderr || '');
let failed = res.status === 0 ? 0 : 1;

for (const [label, fn] of [
  ['cliente: o palpite leva webdriver e isTrusted (só informam; o servidor decide)', () => {
    const modal = read('js/hades-despertar/ui/JuizoModal.js');
    assert.ok(modal.includes('navigator') && modal.includes('webdriver') && modal.includes('isTrusted'));
    assert.ok(modal.includes('this.api.guess(choice, this.#signals())'));
    const api = read('js/api.js');
    assert.match(api, /despertarJuizoGuess\(token, choice, signals\)[\s\S]*juizoSignals/);
    assert.ok(read('js/hades-despertar/services/ApiService.js').includes('despertarJuizoGuess(token, choice, signals)'));
  }],
  ['cliente: a mensagem de ban do servidor aparece no modal e no botão do Juízo', () => {
    const modal = read('js/hades-despertar/ui/JuizoModal.js');
    assert.ok(modal.includes("despertar_juizo_banned") && modal.includes('#showBanned'));
    assert.ok(read('js/hades-despertar/index.js').includes("despertar_juizo_banned"));
  }],
  ['servidor: pairServedAt gravado a cada par servido; latência medida no servidor', () => {
    const svc = read('backend/src/Services/Despertar/DespertarService.php');
    assert.equal((svc.match(/'pairServedAt' => \$servedAt/g) || []).length, 3, 'início, indulgência e acerto');
    const ctl = read('backend/src/Controllers/DespertarController.php');
    assert.ok(ctl.includes("$nowMs - $servedAt") && ctl.includes('JuizoGuard::record'));
  }],
  ['tabela do guard: migração + schema + criação em runtime; o reinício só apaga despertar_states', () => {
    assert.ok(fs.existsSync(path.join(root, 'db/migrate-2026-11-02-despertar-juizo-guard.sql')));
    assert.ok(read('db/mysql/schema.sql').includes('despertar_juizo_guard'));
    const guard = read('backend/src/Services/Despertar/JuizoGuard.php');
    assert.ok(guard.includes('CREATE TABLE IF NOT EXISTS `despertar_juizo_guard`'));
    const svc = read('backend/src/Services/Despertar/DespertarService.php');
    const restart = svc.slice(svc.indexOf('private static function performSeasonRestart'), svc.indexOf('public static function seasonStatus'));
    assert.ok(restart.includes('DELETE FROM `despertar_states`') && !restart.includes('despertar_juizo_guard'));
  }],
]) {
  try {
    fn();
    console.log(`ok — ${label}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL — ${label}\n  ${error.message}`);
  }
}
process.exit(failed > 0 ? 1 : 0);
