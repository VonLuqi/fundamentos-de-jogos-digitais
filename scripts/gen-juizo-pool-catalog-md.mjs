/**
 * Gera docs/juizo-pool-catalogo.md a partir de data/despertar-juizo-pool.stub.json.
 * Uso: node scripts/gen-juizo-pool-catalog-md.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import stub from '../data/despertar-juizo-pool.stub.json' with { type: 'json' };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.join(root, 'docs', 'juizo-pool-catalogo.md');

const games = Array.isArray(stub.games) ? stub.games : [];
const order = (stub.ratingOrder || ['L', '10', '12', '14', '16', '18']).map(String);
const ratingSet = new Set(order);

function esc(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

const ready = [];
const pending = [];
for (const game of games) {
  const rating = game.rating == null ? '' : String(game.rating).trim();
  if (rating && ratingSet.has(rating)) ready.push(game);
  else pending.push(game);
}

ready.sort((a, b) => {
  const byRating = order.indexOf(String(a.rating)) - order.indexOf(String(b.rating));
  if (byRating !== 0) return byRating;
  return String(a.title).localeCompare(String(b.title), 'pt');
});
pending.sort((a, b) => String(a.title).localeCompare(String(b.title), 'pt'));

const byRating = Object.fromEntries(
  order.map((rating) => [rating, ready.filter((game) => String(game.rating) === rating).length]),
);

const lines = [
  '# Catálogo do Juízo — pool de jogos',
  '',
  'Fonte canônica: [`data/despertar-juizo-pool.stub.json`](../data/despertar-juizo-pool.stub.json).',
  'Este MD é um espelho para o Mestre preencher — **editar o JSON** (não só este arquivo) para o jogo usar.',
  '',
  '## Como liberar um título no sorteio',
  '',
  '1. No stub, preencha `rating` ∈ `{L, 10, 12, 14, 16, 18}`.',
  '2. Complete `blurb` (1 frase) e confira `cover` (filename WebP).',
  '3. Capas: `assets/classind-dle/covers/` (compartilhadas) ou `assets/despertar-juizo/covers/`.',
  '4. Só entradas com `rating` válido entram no Juízo. CTA exige ≥30 ready.',
  '',
  '## Resumo',
  '',
  '| Métrica | Valor |',
  '| :--- | ---: |',
  `| Total no stub | ${games.length} |`,
  `| **Ready** (no sorteio) | **${ready.length}** |`,
  `| Pendentes (sem rating) | ${pending.length} |`,
  `| Pool id | \`${stub.poolId || ''}\` |`,
  '',
  '### Ready por faixa',
  '',
  '| Faixa | Qtd |',
  '| :---: | ---: |',
  ...order.map((rating) => `| ${rating} | ${byRating[rating]} |`),
  '',
  '---',
  '',
  `## Ready — no sorteio (${ready.length})`,
  '',
  '| Faixa | Título | `id` | Capa |',
  '| :---: | :--- | :--- | :--- |',
  ...ready.map((game) => {
    const cover = game.cover || `${game.id}.webp`;
    return `| ${esc(game.rating)} | ${esc(game.title)} | \`${esc(game.id)}\` | \`${esc(cover)}\` |`;
  }),
  '',
  '---',
  '',
  `## Pendentes — preencher rating (${pending.length})`,
  '',
  'Coluna **Rating** vazia = ainda fora do sorteio. Ao editar, preencha no JSON.',
  '',
  '| # | Título | `id` | Rating | Capa |',
  '| ---: | :--- | :--- | :---: | :--- |',
  ...pending.map((game, index) => {
    const cover = game.cover || `${game.id}.webp`;
    return `| ${index + 1} | ${esc(game.title)} | \`${esc(game.id)}\` |  | \`${esc(cover)}\` |`;
  }),
  '',
  '---',
  '',
  '_Gerado a partir do stub. Para regenerar: `node scripts/gen-juizo-pool-catalog-md.mjs`._',
  '',
];

fs.writeFileSync(outPath, `${lines.join('\n')}`, 'utf8');
console.log(`Wrote ${path.relative(root, outPath)} (${ready.length} ready, ${pending.length} pending)`);
