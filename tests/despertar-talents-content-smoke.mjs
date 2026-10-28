/**
 * Smoke — talentos do Rio do Lethe: nome/texto próprios e efeito que o jogo realmente aplica.
 * Uso: node tests/despertar-talents-content-smoke.mjs
 */

import assert from 'node:assert/strict';
import { TALENTS } from '../js/hades-despertar/config/talents.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import { talentEffectText } from '../scripts/data/heavenly-talent-copy.mjs';

// Chaves que nenhum sistema lê (cosmético sem tela, telas inexistentes) — não contam como efeito.
const DEAD_KEYS = new Set(['cosmeticId', 'goldenSwitchUnlock', 'buyAllUnlock', 'vaultUnlock', 'labelPrinter']);

const generic = TALENTS.filter((t) => /Eco celestial espelhado/i.test(t.blurb || ''));
assert.deepEqual(generic.map((t) => t.id), [], 'nenhum talento com texto genérico');

const dead = TALENTS.filter((t) => t.id !== 'legado'
  && Object.keys(t.effects || {}).every((key) => DEAD_KEYS.has(key)));
assert.deepEqual(dead.map((t) => t.id), [], 'todo talento (fora Legado) tem efeito real');

const names = TALENTS.map((t) => t.name);
assert.equal(new Set(names).size, names.length, 'nomes únicos');

for (const t of TALENTS) {
  const effect = talentEffectText(t.effects);
  if (effect) assert.ok(t.blurb.endsWith(effect), `${t.id}: texto descreve o efeito real ("${effect}")`);
}

// Sorte de talento acelera os Ecos (antes só a estação contava).
const base = new GameState({ generators: { wandering_shade: 1 } });
const lucky = new GameState({ generators: { wandering_shade: 1 }, talents: ['legado', 'heavenly_luck'] });
assert.equal(base.shimmerLuckMult(), 1);
assert.ok(lucky.shimmerLuckMult() > 1.04 && lucky.shimmerLuckMult() < 1.06, `Sorte Celeste +5% (${lucky.shimmerLuckMult()})`);

// Frenesi de Néctar exige o talento.
const noTalent = new GameState({ nectar: 5, generators: { wandering_shade: 1 } });
assert.equal(noTalent.isNectarFrenzyUnlocked(), false);
const withTalent = new GameState({ nectar: 5, generators: { wandering_shade: 1 }, talents: ['legado', 'frenesi_de_acucar'] });
assert.equal(withTalent.isNectarFrenzyUnlocked(), true);

console.log(`despertar-talents-content-smoke: ok (${TALENTS.length} talentos)`);
