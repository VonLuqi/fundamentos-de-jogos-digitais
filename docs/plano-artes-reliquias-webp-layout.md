# Plano — Artes WebP das Relíquias + novo layout de card

## Contexto

Foi adicionado o arquivo de teste:

`assets/achievements/segredo_juramento_do_circulo.webp`

(arte: livro aberto + círculo mágico iridescente, fundo claro/transparente — **somente a ilustração**, sem título nem badge de raridade embutidos).

Na UI, a conquista **continua com emoji** (`🔮`). O README da pasta já documentava a convenção `{achievementId}.webp`, mas **nenhum código carrega esses arquivos**.

Além disso, a referência visual anexada pede um **novo formato/disposição** do card (não só trocar o emoji):


| Referência (alvo)                                      | UI atual                       |
| ------------------------------------------------------ | ------------------------------ |
| Título no topo                                         | Título abaixo do ícone         |
| Badge de raridade perto do título                      | Badge no rodapé do face        |
| Ilustração grande no centro                            | Emoji ~2rem                    |
| Badge de raridade no rodapé                            | Descrição no face (modo cards) |
| Moldura de raridade (pedra/cobre/prata/ouro/arco-íris) | Já existe parcialmente via CSS |


Print atual do álbum (emoji + nome + badge + desc no hub): layout compacto “ícone tipográfico”.

## Problema A — WebP não entra na UI

Causa raiz (confirmada na auditoria estática):

- `js/achievements-ui.js` sempre faz `textContent = ach.icon` (emoji do catálogo).
- Modal (`js/conquistas.js`, `js/companheiro.js`) também usa `art.textContent = achievement.icon`.
- Não há helper `achievementArtUrl(id)`, fetch de asset, nem `<img>`.
- Colocar o arquivo na pasta **não altera** o render.



## Problema B — Layout ≠ referência

Mesmo após plugar o WebP no slot de emoji, o card atual não replica a hierarquia da referência. É preciso redesenhar a estrutura DOM/CSS do face (álbum e, se aplicável, cards do hub).

## Objetivo

1. Se existir `assets/achievements/{id}.webp` (ou fallback `.png`), usar como arte; senão manter emoji.
2. Adotar o layout de referência nos slots revelados (título → raridade → arte grande → raridade).
3. Funcionar com **arte parcial** (só Juramento agora; outras IDs caem no emoji até você adicionar os arquivos).
4. Não regressar Espelho (matriz texto×estilo), mistério `?`, locked, VFX rainbow.



## Escopo



### Dentro

- Helper de URL + resolução arte vs emoji.
- Render album + cards + modal: `<img>` quando houver arte.
- Novo layout CSS/HTML do face alinhado à referência.
- Fallback graceful se o arquivo 404 (voltar ao emoji).
- Atualizar `assets/achievements/README.md` se a convenção mudar.



### Fora (salvo decisão na Fase 0)

- Gerar/comprimir artes restantes.
- Mudar IDs ou raridades no catálogo.
- Redesign do Espelho além do que o álbum compartilhado já herda.
- Trocar tipografia global do site.



### Arquivos previstos

- `js/api.js` ou `js/achievements-ui.js` — URL/resolução de arte
- `js/achievements-ui.js` — render album + cards
- `js/conquistas.js` / `js/companheiro.js` — modal
- `css/conquistas.css` (+ `companheiros.css` se grid do Espelho precisar)
- `assets/achievements/README.md`
- smoke opcional (existência do helper + fallback)

---



## Fase 0 — Auditoria + decisões *(bloqueante)*

### Checklist técnico

- [x] Confirmar que o WebP existe e o nome bate com o id (`segredo_juramento_do_circulo.webp`).
- [x] Confirmar que o asset é **ilustração pura** (sem título/raridade baked-in).
- [x] Confirmar que o render só usa `ach.icon` (emoji) — sem caminho para `assets/achievements/`.
- [x] Validar proporção real do arquivo: **512×512**, formato `webp`, **sem alpha** (fundo branco opaco — `object-fit: cover` / contain precisa de caixa escura ou blend para não “estourar” branco no card).
- [x] Pontos de render que usam emoji hoje: `achievements-ui.js` (cards + album), `conquistas.js` / `companheiro.js` (modal), e também `aula1.js` (toast/discovery de conquista).
- [x] 404: com manifest (Q6-B) **não há request** para ids sem arte → fallback emoji sem 404. Teste de 404 fica irrelevante enquanto o manifest estiver correto.

### Perguntas — respostas travadas

#### Q1 — Onde a arte WebP aparece?

- [x] **C / ampliado:** Álbum + modal + cards do Painel + Espelho — **todos os locais que exibem conquistas**

#### Q2 — Layout novo (referência)

- [x] **D)** Todos os locais que tiverem conquistas (álbum, hub cards, Espelho; modal alinhado visualmente na arte)

#### Q3 — Descrição no face

- [x] **A)** Remover descrição do face; descrição só no **modal**

#### Q4 — Ordem dos elementos

- [x] **C)** Título → arte grande → badge **só no rodapé** (sem badge duplicada no topo)

#### Q5 — Estados (arte / P&B)

| Estado | Decisão |
| --- | --- |
| Mistério | Mostrar a **arte em preto e branco** (não o `?` tipográfico) — *aceita spoiler da ilustração* |
| Locked comum | Arte (ou emoji) em **preto e branco** |
| Secret known (Espelho) | Arte em **preto e branco** |
| Sem WebP no manifest | **Emoji** no mesmo layout novo |

> Nota: mistério com arte P&B revela a figurinha. Diferente da regra anti-spoiler anterior (`?`). Confirmado pelo usuário.

#### Q6 — Detecção

- [x] **B)** Manifest/lista dos ids com arte (começar com `segredo_juramento_do_circulo`)

#### Q7 — Enquadramento

- [x] **B)** Arte ocupando a maior parte do card (`object-fit: cover`)  
> Asset é 512×512 sem alpha — a caixa de arte deve mascarar o fundo branco (cover + overflow hidden ou fundo do card atrás).

#### Q8 — Tipografia

- [x] **A)** Manter **Cinzel**

### Contrato de implementação (pós-Fase 0)

| Tema | Regra |
| --- | --- |
| Manifest | `assets/achievements/catalog.json` (lista de `{ file }` / opcional `id`) |
| URL | `{root}/assets/achievements/{file}` só se id ∈ catálogo |
| Fallback | Emoji do catálogo |
| Layout face | `nome` → `arte` (flex dominante, cover) → `badge raridade` |
| Descrição | Só no modal |
| Bloqueado / mistério / secret-known | Mesma arte (se houver) ou emoji, filtro **grayscale** |
| Superfícies | Álbum, Espelho, cards do hub, modal; avaliar discovery da aula1 na mesma passagem |
| Espelho texto×estilo | Intacta (P&B ≠ remover chrome de raridade do espelhado) |

**Atenção Espelho:** mistério estilizado (amigo tem, você não) hoje usa `?` + chrome. Com Q5, a arte P&B aparece **e** o chrome de raridade do espelhado pode continuar (matriz estilo). Texto do nome continua `???` se observador não tem. Validar na Fase 2 para não parecer “desbloqueado”.

### Estrutura DOM alvo (face)

```html
<button class="achievement-slot__face">
  <p class="achievement-slot__name">…</p>
  <img|span class="achievement-slot__art is-bw?">…</img>
  <p class="achievement-slot__rarity">…</p>
</button>
```

(Hub `.achievement-card`: mesma hierarquia; sem `achievement-card__desc`.)

---

## Fase 1 — Resolução de arte (WebP → UI)

**Status: concluída**

- Manifest `ACHIEVEMENT_ART_IDS` + `achievementArtUrl` / `createAchievementArtNode` / `fillAchievementArtHost` em `js/achievements-ui.js`
- Wire: álbum, cards do hub, modais (Conquistas + Espelho), discovery da Aula 01
- CSS mínimo para `<img class="…has-art">`
- Smoke: `tests/achievement-art-smoke.mjs`
- README da pasta explica como atualizar o manifest

**Aceite:** Juramento desbloqueado mostra WebP; ids fora do manifest continuam emoji. Layout novo = Fase 2.

## Fase 2 — Novo layout do card (referência)

**Status: concluída**

Ordem: **título → arte → badge** (Q4-C). Sem badge no topo. Sem descrição no face (Q3-A).

Implementado:

- `appendRelicFaceContent` — nome → arte → badge; cards sem `__desc`
- Mistério / locked / secret-known: arte ou emoji com `is-bw` (sem `?` tipográfico); título `???` quando texto oculto
- CSS álbum (`conquistas.css`) + hub (`dashboard.css`): `__art` dominante, `object-fit: cover`, seletores `__icon` retirados/ocultos
- Smoke estendido em `tests/achievement-art-smoke.mjs`

**Aceite Fase 2:** Juramento (WebP) e uma comum (emoji) no layout novo; estados P&B corretos.

## Fase 3 — Modal + superfícies extras

**Status: concluída**

- Modal: hierarquia **título → arte grande (cover) → badge → descrição → meta**; caixa ~16.5rem, fundo escuro
- Hub cards: já alinhados na Fase 2 (sem desc no face)
- Discovery `aula1.js`: `discovery-card__item-art` + ordem nome → arte → desc; WebP quando no manifest
- HTML do modal sem `?` estático; smoke cobre ordem do modal e discovery

## Fase 4 — Docs + validação

- README: como atualizar o manifest ao adicionar WebP.
- Checklist visual + smoke manifest/helper.
- Confirmar Espelho: P&B + chrome de raridade + `???` quando observador não tem.

### Checklist de aceite global

- [ ] Juramento desbloqueado mostra WebP (não emoji)
- [ ] IDs fora do manifest continuam com emoji no layout novo
- [ ] Mistério / locked / secret-known em P&B (não `?` tipográfico)
- [ ] Nome `???` no mistério quando texto não revelado (Espelho)
- [ ] Descrição só no modal
- [ ] Badge só no rodapé do face
- [ ] Modal / hub / álbum / Espelho alinhados
- [ ] Sem regressão matriz Espelho nem VFX rainbow
- [ ] Mobile legível

## Ordem sugerida

1. Fase 0 (Q1–Q8) — **concluída**
2. Fase 1 (manifest + plugar WebP)
3. Fase 2 (layout título → arte → badge + P&B)
4. Fase 3 (modal / hub / discovery)
5. Fase 4 (docs + check)

## Status

| Fase | Status |
| --- | --- |
| 0 — Auditoria + perguntas | Concluída — Q1–Q8 travadas |
| 1 — Resolução de arte | **Concluída** — manifest + WebP no render |
| 2 — Layout referência | **Concluída** — título → arte → badge + P&B |
| 3 — Modal / hub | **Concluída** — modal grande + discovery alinhado |
| 4 — Docs + validação | Pendente |


