/**
 * Aceite T6 (achados 2 e 3): recria o banco de ensaio, roda o ensaio da temporada e depois a concorrência
 * com processos PHP reais (tests/despertar-t2-aceite-concorrencia.php). Só toca 127.0.0.1 / fjd_despertar_ensaio.
 * Sem PHP ou sem MariaDB local, avisa e sai 0 (não dá para provar nada sem eles).
 *
 * Uso: node tests/despertar-t2-aceite-concorrencia.mjs
 */
import { spawnSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env, DB_HOST: '127.0.0.1', DB_USER: 'root', DB_PASS: '', DB_NAME: 'fjd_despertar_ensaio' };

const php = spawnSync('php', ['-v'], { encoding: 'utf8' });
const dbUp = await new Promise((resolve) => {
  const s = net.connect({ host: '127.0.0.1', port: 3306 }, () => { s.destroy(); resolve(true); });
  s.on('error', () => resolve(false));
  s.setTimeout(1500, () => { s.destroy(); resolve(false); });
});
if (php.status !== 0 || !dbUp) {
  console.log('SKIP — precisa de `php` no PATH e MariaDB em 127.0.0.1:3306 (banco de ensaio).');
  process.exit(0);
}

function run(label, args) {
  const res = spawnSync('php', args, { cwd: root, env, encoding: 'utf8', timeout: 150_000 });
  const out = `${res.stdout || ''}${res.stderr || ''}`;
  const lines = out.split('\n').filter((l) => /^\[(PASS|FAIL)\]|ensaio-temporada:|aceite-concorrencia:/.test(l));
  console.log(`— ${label}\n${lines.join('\n')}`);
  return res.status === 0;
}

const okEnsaio = run('ensaio-temporada', ['scripts/ensaio-temporada.php']);
const okConc = okEnsaio && run('concorrência', ['tests/despertar-t2-aceite-concorrencia.php']);
process.exit(okEnsaio && okConc ? 0 : 1);
