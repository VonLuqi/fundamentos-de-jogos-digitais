# Catálogo do Domínio (`game-catalog.json`)

Fonte única e editável de **conquistas** e **níveis**. Front (`js/game-catalog.js` → `js/api.js`) e API (`api/progress.js`) leem o mesmo arquivo.

## Arquivo

- [`game-catalog.json`](./game-catalog.json) — edite aqui.

## Conquistas (`achievements`)

| Campo | Obrigatório | Notas |
| --- | --- | --- |
| `id` | sim | snake_case estável (não renomear à toa — está no DB `users.conquistas`) |
| `name` / `desc` | sim | Copy do álbum |
| `hidden` | sim | Secretas no álbum até unlock |
| `difficulty` | sim | `trivial` … `mythic` / `legendary` |
| `rarity` | recomendado | `stone` … `rainbow` / `unique`; se omitir, deriva da difficulty |
| `xp` | sim | XP concedido no unlock (0 se a aula/activity já paga o XP) |
| `art` | não | Arquivo em `assets/achievements/` |
| `icon` | não | Fallback emoji |
| `trailhead` | não | `{ "nameIndexes": [...], "descIndexes": [...] }` — letras do anagrama `TARTARO OCULTO` (só públicas do trailhead) |
| `meta` | não | Metadados leves (ex. Grimório: `family`, `kind` event/content) — **thresholds de secretas ficam no servidor** |

## Níveis (`levels`)

| Campo | Notas |
| --- | --- |
| `maxLevel` | Teto do aluno (99) |
| `bands` | Faixas `{ fromLevel, toLevel, xpPerLevel }` — curva da carreira |
| `ranks` | `{ minLevel, title }` — título Domínio a partir daquele nível |

### Calibrar XP / níveis 1–99

1. Ajuste `bands[].xpPerLevel` e `ranks` em `game-catalog.json`.
2. Rode `node tests/levels-99-calibration-smoke.mjs` (e `game-catalog-smoke.mjs`).
3. Confira: carreira até 99 ~15–20k XP; **+1500** do Soberano é salto marcante, **não** teleporte ao teto sozinho.
4. UI (dashboard / Espelho / Salão) usa `describeLevelProgress` — no 99 a barra fica cheia (“máximo do Domínio”).

Curva fechada (Fase 6): faixas 100 → 130 → 180 → 240 → 300; ranks Domínio até `Sombra do Olimpo` (99).

### Trailhead (ARG)

Ao mudar `name`/`desc` de conquistas **públicas** com `trailhead`, mantenha as letras listadas visíveis no texto (spans cipher virão na Fase 3). Soletram: **TARTARO OCULTO**.

## O que não colocar neste JSON

- Hash SHA-256 do Estige / segredos de redeem (só servidor / `docs/enigma-supremo-submundo.md`).
- Funções / aliases / thresholds de secretas da Aula 01 (ficam em `api/_lib/lesson-secret-achievements.js`).
- Funções de validação do Grimório (ficam em `api/_lib/grimoire-achievements.js`).
