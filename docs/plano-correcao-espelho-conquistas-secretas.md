# Plano de Correção — Espelho: texto e estilo das conquistas secretas

## Contexto

No **Espelho** (`pages/companheiro.html`), o álbum de relíquias do companheiro mostra as conquistas `hidden: true` (secretas) de forma incompleta em relação à intenção de produto.

Hoje, no modo `visitorView`, **toda** conquista secreta:

- mostra texto `?` / `???` (ignora se o observador já descobriu);
- aplica chrome de raridade (`is-mystery--styled`, borda prata/ouro/arco-íris) **sempre** (ignora se o espelhado desbloqueou ou não);
- no modal, também força estado `mystery` para qualquer `hidden`.

O print atual (observador sem segredos + espelhado com os três) coincide com **um** dos casos desejados, mas os outros três eixos independentes ainda não existem no código.

Dados já disponíveis na página:


| Papel                  | Fonte                                         | Usado no álbum hoje? |
| ---------------------- | --------------------------------------------- | -------------------- |
| Observador (quem olha) | `requireSession().user.achievements`          | Não                  |
| Espelhado              | `fetchFriendProfile` → `profile.achievements` | Sim (único eixo)     |


Segredos atuais no catálogo (`js/api.js`, `hidden: true`):


| id                                | Nome                    | Raridade visual        |
| --------------------------------- | ----------------------- | ---------------------- |
| `segredo_cartografo_do_inspector` | Cartógrafo do Inspector | prata (borda “branca”) |
| `segredo_alquimista_da_fisica`    | Alquimista da Física    | ouro                   |
| `segredo_juramento_do_circulo`    | Juramento do Círculo    | arco-íris              |




## Síntese da regra (eixos independentes)

Duas decisões **independentes** por slot secreto:


| Eixo       | Quem controla              | Se SIM                                                | Se NÃO                                      |
| ---------- | -------------------------- | ----------------------------------------------------- | ------------------------------------------- |
| **Texto**  | Observador tem a conquista | Nome (e demais textos revelados — ver Fase 0)         | `?` / `???`                                 |
| **Estilo** | Espelhado tem a conquista  | Chrome de raridade secreta (prata / ouro / arco-íris) | Estilo **bloqueado** (sem raridade secreta) |


Matriz dos 4 estados:


| Observador tem? | Espelhado tem? | Texto    | Estilo           |
| --------------- | -------------- | -------- | ---------------- |
| Não             | Sim            | `?`      | Raridade secreta |
| Sim             | Sim            | Original | Raridade secreta |
| Sim             | Não            | Original | Bloqueado        |
| Não             | Não            | `?`      | Bloqueado        |


Conquistas **não secretas** no Espelho continuam como hoje: desbloqueada pelo espelhado → revelada; senão → bloqueada com nome/ícone silhueta (sem mistério).

## Problema técnico atual

Arquivos centrais:

- `js/achievements-ui.js` — `renderAlbumMode`, `getAlbumSlotState`, `getAchievementCollectionStats`
- `js/companheiro.js` — `renderAlbum`, `openRelicModal`, contador
- `css/conquistas.css` — `.is-mystery`, `.is-mystery--styled`, raridades
- Docs desatualizados: `docs/plano-sistema-amigos.md`, `README.md` (descrevem regras diferentes do código e desta matriz)

Gaps:

1. `visitorView` trata segredo como um único estado (`mystery` + styled).
2. Unlock do observador nunca entra no render.
3. Unlock do espelhado não controla o estilo dos segredos (sempre styled).
4. Modal e contador seguem a regra antiga (“segredo no Espelho = sempre ?”).



## Objetivo

No Espelho, cada conquista secreta reflete a matriz acima, de forma consistente em:

- cards/slots do álbum;
- modal da relíquia (texto + raridade visual alinhados aos eixos);
- acessibilidade (`aria-label` coerente com o que está visível);
- documentação (README + plano de amigos).

Sem regressão no álbum **próprio** (`visitorView: false`): segredo não desbloqueado → `?` + raridade `unknown`; desbloqueado → revelado completo.

## Escopo



### Dentro

- Passar unlocks do observador para o render do álbum no Espelho.
- Separar flags: `revealText` (observador) vs `applySecretStyle` (espelhado).
- Ajustar `getAlbumSlotState` (ou API equivalente) para os 4 estados.
- Alinhar `openRelicModal` em `companheiro.js`.
- CSS mínimo se faltar combinação (ex.: texto revelado + `is-locked` sem `is-mystery--styled`).
- Atualizar contador conforme decisão da Fase 0.
- Smoke/testes dos 4 combos (se já houver harness de amigos).
- Atualizar docs conflitantes.



### Fora

- Criar novas conquistas secretas.
- Mudar persistência/API de `achievements` no servidor (salvo se Fase 0 exigir campo novo — improvável).
- Religar VFX WebGL rainbow no Espelho (permanece `applyRainbowVfx: false`).
- Redesign geral do álbum / raridades.



### Arquivos previstos

- `js/achievements-ui.js`
- `js/companheiro.js`
- `css/conquistas.css` (e/ou `css/companheiros.css` se precisar de override local)
- `docs/plano-sistema-amigos.md`, `README.md` (trechos do Espelho)
- `tests/friends-phase4-smoke.mjs` (ou teste novo)

---



## Fase 0 — Auditoria + decisões de produto *(bloqueante)*

Validar no código e responder as perguntas abaixo **antes** de implementar.

### Checklist técnico

- [x] Confirmar que `viewerUser.achievements` na sessão contém IDs reais dos segredos (não só o perfil público do amigo).
- [x] Confirmar que `friendProfile.achievements` inclui IDs secretos desbloqueados pelo espelhado (admin não recebe catálogo fake no Espelho).
- [x] Mapear classes CSS atuais: o que `.is-mystery`, `.is-mystery--styled`, `.is-locked`, `data-rarity="unknown"` fazem no card.
- [x] Abrir o modal hoje nos 4 combos mentais e listar campos afetados (ícone, nome, descrição, badge de raridade, borda).
- [x] Ver como o contador `X / Y RELÍQUIAS NESTE ESPELHO` trata `hidden` hoje.

### Achados da auditoria (2026-09-08)

#### Dados — observador

- `companheiro.js` já carrega `viewerUser = result.user` via `requireSession()`.
- `sanitizeUser` / `normalizeUser` expõem `achievements` a partir de `conquistas` do banco.
- **Admin observador:** `achievements` = `ALL_ACHIEVEMENT_IDS` (todos os IDs, inclusive secretos) → no Espelho, admin veria **texto revelado** em todo segredo se usarmos o eixo do observador sem filtro. Aceitável como privilégio; se quiser anti-spoiler para admin, precisaria `ignoreAdminPrivilege` no eixo de texto (não pedido nas Qs).
- Hoje `viewerUser` **não** é passado a `renderAchievementsList` — só role no shell e redirect “sou eu → conquistas”.

#### Dados — espelhado

- `fetchFriendProfile` → `toPublicFriendProfile`: `achievements = row.conquistas` **reais**.
- Comentário explícito: admin espelhado **não** recebe catálogo completo (evita spoiler / “tudo liberado”).
- `toAlbumUser` força `role: 'student'` no álbum — correto para não bypassar unlock por admin.
- Conclusão: IDs secretos desbloqueados pelo amigo **chegam** no client; o bug é só a regra de render.

#### CSS — classes do slot

| Classe / data | Efeito |
| --- | --- |
| `is-locked` | Face com `opacity: 0.45`, `grayscale`, borda **tracejada** |
| `is-mystery` | Fundo escuro; borda tracejada; marca `?` |
| `is-mystery--styled` | **Anula** grayscale/opacity do locked; borda sólida + glow da raridade; `?` na cor da raridade |
| `is-unlocked` | Chrome de raridade + ícone colorido (sem `?`) |
| `data-rarity=silver\|gold\|rainbow` | Variáveis `--rarity-accent` / glow; regras especiais de borda |
| `data-rarity=unknown` | Usado no álbum próprio em mistério; modal tem arte “unknown”; no Espelho hoje **não** se usa (sempre raridade real) |

Chrome secreto no Espelho depende de **`is-mystery--styled` + `data-rarity` real**. Sem `--styled`, mesmo com raridade no dataset, o locked cinza domina.

Lacuna CSS provável na Fase 3: combinação **texto/ícone revelados + visual bloqueado** (observador tem, espelhado não) — hoje não há estado “nome real + `is-locked` sem parecer figurinha comum bloqueada”. Pode reutilizar locked comum (silhueta) **ou** ícone real + locked (Q1 = nome+ícone reais, sem badge → ícone colorido/apagado sem chrome).

#### Modal hoje (`openRelicModal`)

Para **qualquer** `achievement.hidden`, força `effectiveState = 'mystery'`:

| Campo | Valor forçado |
| --- | --- |
| art | `?` |
| rarity badge | `???` |
| title | `???` |
| desc | texto velado fixo (`MIRROR_SECRET_DESC`) |
| meta | “Segredo velado no Espelho” |
| `panel.dataset.rarity` | raridade **real** (borda do modal ainda “vaza” estilo) |

Estados `locked` / revelado do `getAlbumSlotState` **nunca** se aplicam a secretas. Campos a realinhar na Fase 2 conforme Q2-C: art, title, desc, rarity badge, meta, `data-rarity` / `data-state`.

#### Contador hoje

`getAchievementCollectionStats(..., { visitorView: true })`:

- `Y` = tamanho do catálogo completo.
- `X` = só conquistas com **`!hidden`** e desbloqueadas pelo espelhado.
- Secretas **nunca** entram em X (equivalente à opção A atual).

#### Render atual vs matriz desejada

| Combo | Desejado | Código atual |
| --- | --- | --- |
| obs ✗ / esp ✓ | `?` + estilo | `?` + estilo ✓ (único combo que “parece” certo) |
| obs ✓ / esp ✓ | texto + estilo | `?` + estilo ✗ |
| obs ✓ / esp ✗ | texto + bloqueado | `?` + estilo ✗ |
| obs ✗ / esp ✗ | `?` + bloqueado | `?` + estilo ✗ |

---

### Perguntas para você responder

Responda neste bloco (pode editar o doc) para destravar a implementação:

#### Q1 — O que “texto original” inclui no slot?

Quando o observador tem a secreta, o card deve mostrar:

- [ ] A) Só o **nome** (ícone continua `?` se quiser manter mistério visual parcial)
- [x] B) **Nome + ícone** reais
- [ ] C) Nome + ícone + **badge de raridade** (Pedra/Cobre/Prata/…) mesmo sem estilo do espelhado
- [ ] D) Outro: ___

**Decisão:** B — nome + ícone reais. Badge só quando o estilo do espelhado estiver ativo (ver Q5).

#### Q2 — Modal da relíquia

Mesma matriz no modal?

- [ ] A) Sim: texto (nome/descrição) pelo observador; raridade/chrome pelo espelhado
- [ ] B) Modal sempre velado (`???`) no Espelho; só o card muda
- [x] C) Se o observador tem, mostra nome + descrição completa; se não, `???` — independente do estilo

**Decisão:** C — texto do modal (nome + descrição completa) só pelo observador. Chrome/`data-rarity` do painel ainda deve seguir o espelhado (borda estilizada vs bloqueada), senão o modal contradiz o card. Meta sugerida na implementação:
- observador tem + espelhado tem → revelado completo + raridade
- observador tem + espelhado não → nome/desc completos + visual bloqueado / rarity neutra
- observador não → `???` + desc velada; rarity badge conforme estilo do espelhado (Q5-B se styled)

#### Q3 — Contador `X / Y RELÍQUIAS NESTE ESPELHO` *(explicação)*

É só o número do título do álbum, tipo **`0 / 5 RELÍQUIAS NESTE ESPELHO`**.

- **Y** = total de slots do álbum (hoje = todas as conquistas do catálogo, ex.: 5).
- **X** = “quantas o espelhado já tem”, o número que sobe quando alguém desbloqueia.

A dúvida é: **as secretas do espelhado entram nesse X?**

Exemplo com 5 relíquias (2 comuns + 3 secretas): o espelhado tem as 2 comuns **e** as 3 secretas.

| Opção | O que aparece | Por quê |
| --- | --- | --- |
| **A** | `2 / 5` | Secretas **fora** do contador (comportamento atual do código). |
| **B** | `5 / 5` | Secretas **dentro** — placar = álbum real do espelhado. |

Não muda texto nem estilo dos cards — só o número **X**.

O que você prefere?

- [ ] A) Secretas **fora** do X (só comuns do espelhado)
- [x] B) Secretas **dentro** do X (tudo que o espelhado desbloqueou)
- [ ] C) Outro: ___

**Decisão:** B — X conta tudo que o espelhado desbloqueou, inclusive secretas.

#### Q4 — Ícone quando texto = `?` e estilo = raridade (caso do print)

- [x] A) Continua o `?` grande (como hoje)
- [ ] B) Silhueta do ícone real (spoiler de forma, sem nome)
- [ ] C) Outro: ___

**Decisão:** A.

#### Q5 — Badge de raridade no card (`Prata` / `???` / oculto)

Quando estilo secreto está ativo e texto está mascarado:

- [ ] A) Badge também `???` (como no print)
- [x] B) Mostra o nome da raridade (Prata/Ouro/Arco-íris) — o estilo já “vaza” a raridade pela borda
- [ ] C) Esconde o badge

Quando estilo está **bloqueado** e texto está revelado (observador tem, espelhado não):

- [x] D) Sem badge / badge neutro
- [ ] E) Mostra raridade em texto mesmo sem chrome secreto
- [ ] F) Outro: ___

**Decisão:** B + D — badge com label de raridade só se `applySecretStyle`; senão sem badge (ou neutro).

#### Q6 — Álbum próprio e docs

Confirmar que **não** mudamos a regra do álbum do próprio herói (só Espelho). Ok?

- [x] Sim, só Espelho
- [ ] Também ajustar algo no álbum próprio: ___

**Decisão:** só Espelho.

---

### Contrato de implementação (travado pós-Fase 0)

| Eixo | Regra |
| --- | --- |
| Texto no slot | Observador tem → nome + ícone; senão → `?` / `???` |
| Badge no slot | Só se espelhado tem (label real Prata/Ouro/Arco-íris) |
| Estilo no slot | Espelhado tem → `--styled` + `data-rarity` real; senão → bloqueado / `unknown` |
| Modal texto | Observador tem → nome + desc completa; senão → `???` + desc velada |
| Modal chrome | Alinhar ao espelhado (styled vs blocked) |
| Contador X | Tudo que o espelhado desbloqueou, **incluindo** secretas (Q3-B) |
| Álbum próprio | Sem mudança |

---



## Fase 1 — Modelo de estado no JS

**Status: concluída** (`js/achievements-ui.js`)

Helpers exportados:

- `resolveMirrorSecretAxes(achievement, { friendUser, viewerUser })`
- `getAlbumSlotModel(user, achievement, { visitorView, viewerUser })`
- `getAlbumSlotState(...)` — wrapper de `model.kind` (compat)

Contador Espelho (Q3-B): `getAchievementCollectionStats(..., { visitorView: true })` conta secretas desbloqueadas pelo espelhado.

`renderAlbumMode` / `renderAchievementsList` aceitam `viewerUser` e aplicam a matriz nos slots. Sem `viewerUser`, o eixo de texto fica fechado (`?`) — a Fase 2 liga o observador em `companheiro.js`.

Introduzir helpers explícitos (nomes sugeridos):

```js
// Espelho — eixos independentes
revealSecretText = achievement.hidden && viewerUnlocked
applySecretStyle = achievement.hidden && friendUnlocked
```

Estados derivados para DOM:


| revealSecretText | applySecretStyle | classes / data sugeridos                                                          |
| ---------------- | ---------------- | --------------------------------------------------------------------------------- |
| false            | true             | `is-locked is-mystery is-mystery--styled` + `data-rarity` real + texto `?`        |
| true             | true             | revelado + raridade (equivalente a “unlocked” visual do segredo)                  |
| true             | false            | texto/ícone reais + `is-locked` (sem `--styled`, `data-rarity` unknown ou locked) |
| false            | false            | `is-locked is-mystery` sem `--styled` + `data-rarity=unknown` + texto `?`         |


Atualizar:

- `getAlbumSlotState` — deixar de retornar só `mystery` para todo `hidden` no Espelho; ou expandir retorno (`{ kind, revealText, styled }`).
- `renderAlbumMode` — receber `viewerUser` / `viewerAchievementIds`.
- `getAchievementCollectionStats` — no Espelho, X = todos os IDs desbloqueados pelo espelhado (incluindo `hidden`), conforme Q3-B.



## Fase 2 — Wire no Espelho

**Status: concluída** (`js/companheiro.js`)

1. `renderAlbum` passa `viewerUser` para `renderAchievementsList`.
2. Click / deep-link usam `getAlbumSlotModel(friendUser, …, { visitorView, viewerUser })`.
3. `openRelicModal` aplica Q2-C (texto pelo observador) + chrome/badge pelo espelhado; não força mais `mystery` só por `hidden`.

Em `companheiro.js`:

1. Passar `viewerUser` (já carregado) para `renderAchievementsList` / `renderAlbum`.
2. No click do slot, calcular estado com os dois usuários.
3. `openRelicModal` aplicar Q2 (não forçar `mystery` só por `hidden`).



## Fase 3 — CSS / a11y

**Status: concluída**

- Classe `is-secret-known` + CSS: texto/ícone legíveis sem chrome de raridade.
- `data-rarity='unknown'` sem vazamento de glow no hover.
- Modal: `data-secret` + painel `unknown`/`known`; badge `[hidden]` oculto de verdade.
- `aria-label` nos 4 estados do Espelho.
- `applyRainbowVfx: false` mantido no Espelho.

- Garantir combinação “texto revelado + bloqueado” legível (sem parecer desbloqueada do espelhado).
- Garantir “`?` + styled” igual ao print (já existe via `--styled`).
- `aria-label` por estado (ex.: “Segredo que você conhece, ainda velado neste Espelho” vs “Segredo desconhecido…”).
- Manter `applyRainbowVfx: false` no Espelho.



## Fase 4 — Docs + validação

**Status: concluída**

- [x] Matriz atualizada em `docs/plano-sistema-amigos.md` (addendum) e `README.md`
- [x] Smoke automatizado: `tests/mirror-secret-axes-smoke.mjs` (4 combos + Q3-B + álbum próprio)
- [x] `tests/friends-phase4-smoke.mjs` valida docs alinhados
- Checklist de aceite (contrato de código) marcado abaixo — validação visual manual opcional em duas contas

### Checklist de aceite

- [x] Observador sem segredos + espelhado com todas → estilo + `?` *(coberto pelo smoke)*
- [x] Ambos com só Alquimista → texto + estilo nessa; demais secretas conforme eixos *(smoke + modelo)*
- [x] Observador com secreta, espelhado sem → texto + `is-secret-known` *(smoke)*
- [x] Nenhum dos dois tem → bloqueado + `?` *(smoke)*
- [x] Não secretas inalteradas *(smoke comum)*
- [x] Álbum próprio inalterado *(smoke visitorView false)*
- [x] Modal alinhado à decisão Q2 *(companheiro.js + data-secret)*
- [x] Contador alinhado à Q3-B *(smoke)*

## Ordem sugerida de implementação

1. Fase 0 (respostas Q1–Q6) → trava escopo visual do card/modal/contador
2. Fase 1 (helpers + render)
3. Fase 2 (companheiro + modal)
4. Fase 3 (CSS/a11y fino)
5. Fase 4 (docs + teste)

## Status

| Fase                      | Status |
| ------------------------- | --- |
| 0 — Auditoria + perguntas | Concluída — Q1–Q6 travadas |
| 1 — Modelo de estado      | Concluída — helpers + render album + stats Q3-B |
| 2 — Wire Espelho          | Concluída — `viewerUser` + modal Q2-C |
| 3 — CSS / a11y            | Concluída — `is-secret-known` + modal/a11y |
| 4 — Docs + validação      | Concluída — README, plano amigos, smoke matriz |



