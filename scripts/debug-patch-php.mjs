import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TALENTS } from '../js/hades-despertar/config/talents.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PHP_PATH = path.join(root, 'backend/src/Services/Despertar/DespertarCatalog.php');

function phpExportEffects(e) {
  if (!e || typeof e !== 'object') return '[]';
  const parts = [];
  for (const [k, v] of Object.entries(e)) {
    if (typeof v === 'boolean') parts.push(`'${k}' => ${v ? 'true' : 'false'}`);
    else if (typeof v === 'number') parts.push(`'${k}' => ${v}`);
    else parts.push(`'${k}' => '${v}'`);
  }
  return `[${parts.join(', ')}]`;
}

function phpTalentBlock(talents) {
  const lines = talents.map((t) => {
    const req = (t.requires?.talentIds || []).map((id) => `'${id}'`).join(', ');
    return `        '${t.id}' => ['id' => '${t.id}', 'cost' => '${t.cost}', 'branch' => '${t.branch}', 'ring' => ${t.ring}, 'angle' => ${t.angle}, 'requires' => [${req}], 'effects' => ${phpExportEffects(t.effects)}],`;
  });
  return `    public const TALENTS = [\n${lines.join('\n')}\n    ];`;
}

const src = await fs.readFile(PHP_PATH, 'utf8');
const re =
  /    public const TALENTS = \[[\s\S]*?\r?\n    \];\r?\n\r?\n    public const LEGACY_TALENT_COSTS/;
const block = phpTalentBlock(TALENTS);
const next = src.replace(re, `${block}\n\n    public const LEGACY_TALENT_COSTS`);
console.log('patchPhp changed', next !== src);
const legacyRe = /    public const LEGACY_TALENT_COSTS = \[[\s\S]*?\r?\n    \];/;
console.log('legacy simple', legacyRe.test(next));
console.log('has LEGACY string', next.includes('LEGACY_TALENT_COSTS'));
