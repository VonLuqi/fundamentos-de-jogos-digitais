# Plano — Revelar colapsável, conquistas do Grimório, Enigma Supremo e Níveis até 99

## Contexto

O Grimório Pessoal já cobre lista/leitura/edição, revelação a companheiros, clone/recusa e workspace Hades (`[plano-grimorio-ui-workspace.md](./plano-grimorio-ui-workspace.md)`, `[plano-grimorio-visao-clone-tags.md](./plano-grimorio-visao-clone-tags.md)`).

A seção **Revelar ao Companheiro** (`#note-share` em `pages/grimorio.html` + `js/grimorio-reading.js`) fica inline no painel de leitura e compete com o corpo da inscrição.

Conquistas e níveis hoje estão **espalhados em JS** (difícil de ver/editar de uma vez):


| Camada          | Arquivo                            | Papel                                                                 |
| --------------- | ---------------------------------- | --------------------------------------------------------------------- |
| Catálogo UI     | `js/api.js` → `RAW_ACHIEVEMENTS`   | nome, desc, `hidden`, difficulty/rarity                               |
| Arte            | `assets/achievements/catalog.json` | só lista de `.webp`                                                   |
| Regras servidor | `api/progress.js`                  | `ACHIEVEMENT_RULES`, `ACTIVITY_CATALOG`, `LESSON_SECRET_ACHIEVEMENTS` |
| Níveis / ranks  | `js/api.js` + `api/progress.js`    | `LEVEL_XP_BASE`, `RANKS`, `levelForXp` (duplicados)                   |
| Álbum / toast   | `js/achievements-ui.js`, aulas     | render + discovery                                                    |


Secretas da Aula 01 usam `hasEveryKeyword` / frases quase literais (ex.: `'neste mundo, a bola'`). Isso funciona, mas é **hard text**: o aluno precisa “acertar o código” do relatório.

Níveis hoje: `levelForXp = floor(xp / 100) + 1` **sem teto**; `RANKS` só até ~240 XP (`Campeão Érebo`). O +1500 XP do Soberano e o conteúdo futuro pedem uma escada até **nível 99** com ranks Domínio e curva que não esmague o mid-game.

Não há ainda:

- conquistas disparadas por eventos do Grimório;
- raridade **Única**;
- cadeia ARG do Submundo;
- progressão formal **1 → 99**;
- **um JSON único** (fonte editável) para conquistas + níveis.

Direção visual: Design System Hades (`--hades-*`, Cinzel/Crimson, `btn-gold`).

### Documento de design do enigma (fonte)

ARG multi-sala: `[enigma-supremo-submundo.md](./enigma-supremo-submundo.md)`. Este plano adapta ao stack do curso (estático + `api/progress.js` + `users.conquistas`/`xp`).

---

## Objetivo

1. **Revelar compacto** — modal Hades; some do scroll da nota; reabre/fecha.
2. **Conquistas do Grimório** — públicas MVP + secretas voláteis/metadados.
3. **Amaciar secretas da Aula 01** — aliases conceituais, sem frase ritual única.
4. **Copy rica** + letras do trailhead nas públicas.
5. **Enigma Supremo do Submundo** — trailhead → 4 salas → **Soberano do Submundo** (`unique`, +1500 XP).
6. **Níveis até 99** — teto, curva de XP, ranks Domínio expandidos, UI de barra/nível coerente em dashboard/Espelho/redeem.
7. **Catálogo JSON** — `data/game-catalog.json` com `achievements` + `levels` para ver e editar num só lugar; front e API leem a mesma fonte.

---

## Escopo

### Dentro

- Modal `#note-share` (gatilho na toolbar).
- **`data/game-catalog.json`** — fonte editável de conquistas e níveis (ranks, faixas, XP, rarity, trailhead).
- Conquistas Grimório + motor volátil Aula 01 (metadados no JSON; testes/aliases no servidor).
- Raridade `unique` + selo CSS.
- Submundo ARG completo (4 salas, rewrite, WAV, judgment/redeem).
- Progressão **nível máx. 99** derivada do JSON.
- Smoke + checklist manual.

### Fora

- Redesign geral do Álbum (exceto trailhead spans).
- Artes WebP completas (placeholder no MVP do Soberano).
- Ranking público de quem resolveu o Submundo.
- Rich-text nas notas.
- Stack Next.js / RPC do doc de design.
- Tabela `underworld_progress` (decisão 0.18 = estilo Notpron).

---

## Adaptação ARG → stack (fechada)


| Design                     | Adaptação                                                                      |
| -------------------------- | ------------------------------------------------------------------------------ |
| `/submundo/tartaro-oculto` | `pages/submundo/*.html` + **rewrites** em `vercel.json`                        |
| Edge judgment              | `action: 'underworldJudgment'` em `progress.js` (auth)                         |
| Redeem + RPC               | `action: 'underworldRedeem'` → `users.xp` + `users.conquistas`                 |
| `underworld_progress`      | **Não** no MVP — progresso = conhecer a URL (Notpron); telemetria só no redeem |
| `soberano-do-submundo`     | id `soberano_do_submundo`                                                      |
| Badge roxo                 | Raridade **Única**, aura ouro/sangue/estige (não clonar rainbow)               |
| `key_elestial_hades`       | Grafia **intencional** (cipher / armadilha ortográfica)                        |


### Jornada


| Elo | Sala      | Mecânica                                                          | Chave → próximo                                        |
| --- | --------- | ----------------------------------------------------------------- | ------------------------------------------------------ |
| 0   | Trailhead | Letras cipher em conquistas **públicas** (sempre legíveis no hub) | Anagrama `TARTARO OCULTO` → `/submundo/tartaro-oculto` |
| 1   | Tártaro   | CSS `--shadow-color` / `.hidden-rune`                             | `CERBERUS-UNBOUND` → Asfódelos                         |
| 2   | Asfódelos | WAV + espectrograma                                               | `PERSEPHONE_PASS` → Elísios                            |
| 3   | Elísios   | Network + Base64                                                  | `key_elestial_hades` → Estige                          |
| 4   | Estige    | SHA-256 no console; hash **só no servidor**                       | Award Soberano +1500 XP                                |


---

## Task 0 — Decisões (fechada — otimizada para ARG)

Critério: TINAG / Notpron, URLs limpas, award server-side, fricção educativa sem gate chato, trailhead caçável no hub.


| #    | Tema                  | Decisão                                                                                                                                                                                                             |
| ---- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1  | UI Revelar            | **B — Modal** Hades. Some do canvas; ritual “abrir o véu”; mobile e desktop iguais.                                                                                                                                 |
| 0.2  | Gatilho               | Ícone + label curto **“Revelar”** (descoberta sem depender só de ícone).                                                                                                                                            |
| 0.3  | Já revelado           | **Badge/count** no gatilho fechado (ex. “2”); lista completa só no modal.                                                                                                                                           |
| 0.4  | MVP Grimório públicas | **MVP:** `grimorio_primeira_inscricao`, `grimorio_elo_da_trilha`, `grimorio_dez_inscricoes` (**exclui clones**), `grimorio_revelacao`. **Fase 2:** fixador, eco clonado.                                            |
| 0.5  | Secretas Grimório     | **4 secretas:** 2 por eventos/metadados (vínculo oculto, eco invertido) + 2 por conteúdo volátil (escriba ritual, cartógrafo pessoal).                                                                              |
| 0.6  | Volatilidade Aula 01  | **C — aliases conceituais** + mínimo M de N; sem frase literal obrigatória; sem score % opaco.                                                                                                                      |
| 0.7  | Retroativo            | **Reavaliar no próximo save** da aula; sem backfill em massa.                                                                                                                                                       |
| 0.8  | Raridade Única        | Label **Única**; VFX próprio (não rainbow canvas); XP final **1500** confirmado.                                                                                                                                    |
| 0.9  | Formato enigma        | **Trailhead + 4 salas completas** no mesmo arco de entrega (não fatiar Tártaro-só).                                                                                                                                 |
| 0.10 | Trailhead             | Só conquistas **públicas**; letras em spans cipher **sempre visíveis** no hub/álbum (mesmo locked); **sem** exigir set X desbloqueado; secretas **não** carregam o anagrama.                                        |
| 0.11 | Paths                 | **A — Rewrites Vercel** → paths limpos `/submundo/...` (essencial ao anagrama).                                                                                                                                     |
| 0.12 | Anti-spoiler          | `noindex` + meta nas salas; **rate limit** no redeem; spoilers entre alunos **OK** (cultura de turma); admin vê award via conquistas/XP (sem painel de salas no MVP).                                               |
| 0.13 | Suprema               | id `soberano_do_submundo`, `hidden: true`, `unique`, copy do doc de enigma; **placeholder** de arte no MVP, porém a raridade Unica será a única com full art.                                                       |
| 0.14 | Toast                 | **Discovery overlay** no Soberano + travessia na Fase 4; grimório usa toast/discovery mais leve (mesmo padrão de fila se já existir).                                                                               |
| 0.15 | Copy                  | **Agente propõe** lote Domínio (públicas + secretas) já com letras `TARTARO OCULTO` coordenadas; você aprova/edita.                                                                                                 |
| 0.16 | Soluções              | Permanecem em `[enigma-supremo-submundo.md](./enigma-supremo-submundo.md)` (curso/repo controlado).                                                                                                                 |
| 0.17 | Prioridade            | **1** Revelar → **2** copy públicas + trailhead + Submundo (4 salas) + Única → **3** regras Grimório + secretas → **4** amaciar Aula 01 → **5** níveis 1–99 (pode paralelizar UI de nível cedo se bloquear redeem). |
| 0.18 | Progresso salas       | **A — Notpron:** URL conhecida = entrada; **sem** tabela `underworld_progress`; sem conquistas intermediárias por sala (spoil).                                                                                     |
| 0.19 | Auth                  | Salas **visíveis sem login** (rabbit hole compartilhável); `underworldJudgment` e `underworldRedeem` **exigem sessão**.                                                                                             |
| 0.20 | Áudio                 | Gerar WAV no pipeline do projeto (script/`sox`/Python); pista Audacity **+** link de analisador espectral web na própria sala.                                                                                      |
| 0.21 | Gates                 | **URL livre** entre salas; única trava “cara” = hash no redeem.                                                                                                                                                     |
| 0.22 | `elestial`            | **Manter** grafia do design (cipher intencional).                                                                                                                                                                   |
| 0.23 | **Níveis até 99**     | `MAX_LEVEL = 99`; curva de XP crescente por faixa; `RANKS` Domínio expandidos até o teto; UI mostra teto; XP do Soberano conta normalmente (salto grande, não atalho ao 99 sozinho).                                |
| 0.24 | **Catálogo JSON**     | **Um** arquivo `data/game-catalog.json` com `achievements` + `levels`. Front e API leem o mesmo arquivo. Hashes/segredos do redeem **fora** desse JSON. Campo `trailhead` por conquista para não quebrar o anagrama ao editar copy. Arte via `art`; raridade Única com full art (0.13). |


### Justificativas curtas (ARG)

- Modal e paths limpos reforçam o ritual e o “site secreto”.
- Trailhead sempre legível = caça no hub sem grind prévio (TINAG).
- Notpron (URL livre) + redeem auth = mistério social OK + XP à prova de truque barato.
- `elestial` e CSS invisível são a aula; não “corrigir” o flavor.
- Nível 99 + 1500 XP: o Soberano é marco épico na escada, não o fim dela.
- JSON único: balancear XP, copy e faixas sem caçar constantes em dois JS.

---

## Diagnóstico rápido (baseline)

### Revelar

- `#note-share` inline; `grimorio-reading.js`; CSS largo em `grimorio.css`.

### Secretas Aula 01


| ID         | Problema                             |
| ---------- | ------------------------------------ |
| Cartógrafo | literal `teste N`                    |
| Alquimista | keywords fixas                       |
| Juramento  | frase ritual `'neste mundo, a bola'` |


### Níveis / ranks


| Hoje                                                      | Meta                                |
| --------------------------------------------------------- | ----------------------------------- |
| `LEVEL_XP_BASE = 100` linear, sem teto                    | Curva + **cap 99**                  |
| 5 ranks até 240 XP                                        | Escada Domínio cobrindo 1–99        |
| `levelForXp` duplicado em `js/api.js` e `api/progress.js` | Uma regra alinhada (mesmo contrato) |


### Deploy

Sem rewrites `/submundo/*` — a criar (0.11=A).

---

## Catálogo Grimório (fechado MVP)

### Públicas MVP


| ID                            | Gatilho                     | Raridade |
| ----------------------------- | --------------------------- | -------- |
| `grimorio_primeira_inscricao` | 1ª nota própria             | Pedra    |
| `grimorio_elo_da_trilha`      | 1ª com `lesson_id`          | Cobre    |
| `grimorio_dez_inscricoes`     | ≥10 próprias **sem** clones | Prata    |
| `grimorio_revelacao`          | 1ª share OK                 | Prata    |


### Fase 2 (depois → feito na Fase 7)


| ID                     | Gatilho  |
| ---------------------- | -------- |
| `grimorio_fixador`     | 1º pin   |
| `grimorio_eco_clonado` | 1º clone |


### Secretas Grimório (4)


| Tema               | Tipo                       |
| ------------------ | -------------------------- |
| Vínculo oculto     | eventos (aula + revelar)   |
| Eco invertido      | eventos (receber + clonar) |
| Escriba ritual     | body volátil               |
| Cartógrafo pessoal | tags / diversidade         |


### Final ARG


| ID                     | Nome                 | XP   | Rarity   |
| ---------------------- | -------------------- | ---- | -------- |
| `soberano_do_submundo` | Soberano do Submundo | 1500 | `unique` |


---

## Progressão — Níveis 1 a 99

### Regras alvo

1. `**MAX_LEVEL = 99**` — `levelForXp` nunca retorna > 99 para alunos (admin pode continuar `∞`).
2. **Curva:** XP necessário por nível **aumenta por faixas** (ex. a cada 10 níveis), para o late-game não ser trivial e o +1500 do Soberano ser um salto marcante (~vários níveis), não um teleporte ao teto.
3. `**xpWithinLevel` / barra:** no 99, barra cheia ou estado “máximo do Domínio”; XP extra pode acumular para rank/histórico sem subir nível.
4. `**RANKS`:** expandir títulos narrativos Domínio/Hades ao longo da escada (manter os 5 atuais como base baixa; acrescentar degraus até 99).
5. **Paridade:** mesma fórmula em `js/api.js` e `api/progress.js` (ou helper compartilhado se o bundling permitir; senão espelho documentado + teste).
6. **UI:** dashboard, Espelho do companheiro, toasts de level-up, Salão — todos respeitam teto e novos ranks.
7. **Testes:** tabela de XP→nível (amostras 1, 10, 50, 98, 99, overflow); redeem Soberano não quebra cap.

### Faixas sugeridas (ajustar na implementação, valores ilustrativos)


| Faixa de nível | XP aprox. para o próximo | Sensação   |
| -------------- | ------------------------ | ---------- |
| 1–10           | ~100                     | onboarding |
| 11–30          | ~120–150                 | trilha     |
| 31–60          | ~160–200                 | veterano   |
| 61–90          | ~220–280                 | endgame    |
| 91–99          | ~300+                    | ápice      |


Total estimado até 99: ordem de **~15k–20k XP** de carreira (calibrar com soma real de aulas + conquistas + Soberano). **Valores oficiais** ficam em `data/game-catalog.json` → `levels`.

---

## Catálogo JSON — fonte editável (`data/game-catalog.json`)

Um arquivo para **ver e modificar** conquistas e níveis sem caçar constantes em `js/api.js` / `api/progress.js`.

### Contrato (rascunho)

```json
{
  "version": 1,
  "achievements": [
    {
      "id": "aula1_concluida",
      "name": "Primeira Travessia",
      "desc": "…",
      "icon": "🏁",
      "art": "aula1_concluida.webp",
      "hidden": false,
      "difficulty": "trivial",
      "rarity": "stone",
      "xp": 0,
      "trailhead": { "letters": ["T"], "in": "name" }
    },
    {
      "id": "soberano_do_submundo",
      "name": "Soberano do Submundo",
      "desc": "…",
      "hidden": true,
      "difficulty": "legendary",
      "rarity": "unique",
      "xp": 1500,
      "art": "soberano_do_submundo.webp"
    }
  ],
  "levels": {
    "maxLevel": 99,
    "bands": [
      { "fromLevel": 1, "toLevel": 10, "xpPerLevel": 100 },
      { "fromLevel": 11, "toLevel": 30, "xpPerLevel": 130 },
      { "fromLevel": 31, "toLevel": 60, "xpPerLevel": 180 },
      { "fromLevel": 61, "toLevel": 90, "xpPerLevel": 240 },
      { "fromLevel": 91, "toLevel": 99, "xpPerLevel": 300 }
    ],
    "ranks": [
      { "minLevel": 1, "title": "Alma Novata" },
      { "minLevel": 5, "title": "Iniciado do Tártaro" }
    ]
  }
}
```

| Campo | Uso |
| --- | --- |
| `achievements[].xp` | XP no unlock (0 se a recompensa vem só da activity/aula) |
| `trailhead` | Documenta letras cipher — evita quebrar `TARTARO OCULTO` ao editar copy |
| `levels.bands` | Curva; `levelForXp` / barra derivados daqui |
| `levels.ranks` | Preferir `minLevel` (estável com a curva) |

### O que **não** vai no JSON público

- Hash SHA-256 do Estige (só servidor / doc de enigma).
- Funções de teste secretas; aliases sensíveis podem ir em `data/secret-rules.json` lido **só** pela API (opcional). MVP: metadados no `game-catalog.json`; lógica de match em `progress.js`.

### Carregamento

| Lado | Como |
| --- | --- |
| Frontend | `fetch` / import → `ACHIEVEMENTS`, `levelForXp`, ranks |
| API | `fs.readFileSync` do mesmo path no deploy |
| Testes | Parse OK; ids únicos; `maxLevel === 99`; rules referenciam ids existentes |

### Edição no dia a dia

1. Abrir `data/game-catalog.json`.
2. Ajustar name/desc/rarity/xp/bands/ranks.
3. Conferir `trailhead.letters` ainda soletram o anagrama.
4. Rodar smoke — sem hardcode paralelo divergente.

---

## Arquitetura

```
data/game-catalog.json  ←── editar aqui (achievements + levels)
        │
        ├─► js (api / game-catalog)  → álbum, barra, discovery
        └─► api/progress.js          → XP awards, difficulty, level cap

[Álbum + cipher] → /submundo/… → judgment / redeem → users (+ cap 99)
[Grimório] modal Revelar → evaluateGrimoireAchievements
[Aula] save → evaluateSecretAchievements
```

| Action | Auth | Papel |
| --- | --- | --- |
| `underworldJudgment` | sim | Negado + `oracle_token` Base64 |
| `underworldRedeem` | sim | Hash server-side; Soberano + XP do JSON; idempotente; level-up respeita `maxLevel` |

---

## Fases e tasks

### Fase 0 — Alinhamento

- [x] **T0.** Task 0 fechada (ARG + níveis 99 + catálogo JSON).

### Fase 1 — Fundação: `data/game-catalog.json`

- [x] **T1.** Criar `data/game-catalog.json` migrando conquistas atuais + `levels` (max 99, bands, ranks).
- [x] **T2.** Loader front (`js/game-catalog.js` ou `api.js`): exporta catálogo e helpers de nível.
- [x] **T3.** Loader API em `progress.js`: mesma fonte; awards usam `xp`/ids do JSON.
- [x] **T4.** Remover/`deprecate` `RAW_ACHIEVEMENTS` e `LEVEL_XP_BASE` soltos; alinhar `art` ↔ webp.
- [x] **T5.** Smoke: parse, ids únicos, raridades, `maxLevel`, paridade XP→nível front/API.
- [x] **T6.** `data/README.md` — como editar trailhead/bands sem quebrar o ARG.

### Fase 2 — Revelar (modal)

- [x] **T7.** Gatilho “Revelar” + badge count; modal Hades.
- [x] **T8.** CSS open/close; `prefers-reduced-motion`.
- [x] **T9.** JS open/close, foco, Escape, share/unshare.
- [x] **T10.** Smoke + papéis.

### Fase 3 — Trailhead, Única e Submundo

- [x] **T11.** `unique` no JSON + CSS selo (+ full art só Única, 0.13).
- [x] **T12.** Rewrites + `pages/submundo/`.
- [x] **T13.** Cipher spans; `trailhead` no JSON = `TARTARO OCULTO`.
- [x] **T14.** Sala Tártaro.
- [x] **T15.** Sala Asfódelos + WAV.
- [x] **T16.** Sala Elísios + `underworldJudgment`.
- [x] **T17.** Sala Estige + `underworldRedeem` (XP do JSON) + travessia.
- [x] **T18.** Entry `soberano_do_submundo`; rate limit; idempotência; `noindex`.
- [x] **T19.** Smoke + checklist 0→4.

### Fase 4 — Conquistas Grimório

- [x] **T20.** Entries no JSON + hooks; clones fora da contagem de 10.
- [x] **T21.** 4 secretas; metadados no JSON.
- [x] **T22.** Copy no JSON + toast leve.
- [x] **T23.** Testes first-event / contagem.

### Fase 5 — Secretas Aula 01 voláteis

- [x] **T24.** Aliases + coverage M de N.
- [x] **T25.** Regras aula1; `desc` no JSON.
- [x] **T26.** Corpus teste; reavaliar no save.

### Fase 6 — Níveis 1–99 (calibração no JSON)

- [x] **T27.** Fechar `levels.bands` / `ranks`; UI barra / Espelho / Salão com cap.
- [x] **T28.** Calibrar recompensas + 1500 Soberano editando só o JSON.
- [x] **T29.** Testes curva, overflow, redeem perto do teto.

### Fase 7 — Polimento + grimório fase 2

- [x] **T30.** `grimorio_fixador` + `grimorio_eco_clonado` no JSON.
- [x] **T31.** A11y + exceções ARG.
- [x] **T32.** Espelho / secretas + Única.
- [x] **T33.** `npm run check` + smokes finais.

---

## Critérios de aceite

1. Modal Revelar abre/fecha; badge de count; sem roubar scroll da nota.
2. Trailhead → 4 salas; mecânicas do design.
3. Redeem server-side; Soberano `unique` +1500 **uma vez**.
4. Grimório MVP + 4 secretas; Aula 01 sem hard text ritual.
5. Nível ∈ [1, 99]; ranks/UI alinhados **via JSON**.
6. **Editar conquistas/níveis = editar `data/game-catalog.json`** (sem hardcode paralelo divergente).
7. Spoilers de URL OK; award não é free.

---

## Arquivos previstos

| Arquivo | Papel |
| --- | --- |
| `docs/plano-grimorio-conquistas-enigma.md` | Este plano |
| `docs/enigma-supremo-submundo.md` | Design / soluções ARG |
| **`data/game-catalog.json`** | **Fonte: achievements + levels** |
| `data/README.md` | Como editar catálogo / trailhead |
| `js/game-catalog.js` (opc.) | Loader front |
| `pages/grimorio.html`, `css/grimorio.css`, `js/grimorio-reading.js` | Modal Revelar |
| `js/api.js` | Consome catálogo; helpers |
| `api/progress.js` | Consome catálogo; rules; judgment/redeem |
| `pages/submundo/*`, `css/submundo.css`, `js/submundo/*` | 4 salas |
| `assets/submundo/asfodelos_echo.wav` | Asfódelos |
| `vercel.json` | Rewrites |
| `css/conquistas.css`, `js/achievements-ui.js` | Única + cipher |
| `js/dashboard.js` (+ Espelho/Salão) | UI nível 99 |
| `tests/*-smoke.mjs` | Catálogo + nível + submundo + grimório |

---

## Riscos

| Risco | Mitigação |
| --- | --- |
| JSON público vaza hashes/aliases | Segredos fora do `game-catalog.json` |
| Front/API dessincronizam | Um arquivo + smoke de paridade |
| Vercel não empacota `data/` | Garantir path no deploy; testar readFile |
| Curva 99 / +1500 | Ajustar só `levels.bands` |
| Trailhead quebra ao editar copy | Campo `trailhead` + README |
| Rewrite 404 | Smoke pós-deploy |
| Asfódelos sem Audacity | Link analisador web |

---

## Ordem de implementação (pós T0)

1. **Fase 1 — `game-catalog.json`** (fundação)  
2. Fase 2 — Modal Revelar  
3. Fase 3 — Única + trailhead + 4 salas + redeem  
4. Fase 4 — Grimório MVP + secretas  
5. Fase 5 — Aula 01 volátil  
6. Fase 6 — Calibrar níveis 1–99 no JSON  
7. Fase 7 — Polimento + grimório fase 2  

---

## Registro de decisões

| # | Decisão final |
| --- | --- |
| 0.1 | **B** Modal Hades |
| 0.2 | Ícone + “Revelar” |
| 0.3 | Badge/count no gatilho |
| 0.4 | MVP: 1ª, elo, 10 (sem clones), revelar; fix/clone = fase 2 |
| 0.5 | 4 secretas (2 evento + 2 conteúdo) |
| 0.6 | **C** aliases + M de N |
| 0.7 | Reavaliar no save |
| 0.8 | **Única**; VFX próprio; 1500 XP |
| 0.9 | 4 salas completas |
| 0.10 | Públicas; cipher sempre visível; sem pré-requisito de set |
| 0.11 | **A** Rewrites `/submundo/...` |
| 0.12 | noindex + rate limit; spoilers OK; admin via conquistas |
| 0.13 | `soberano_do_submundo` hidden unique; full art só na Única |
| 0.14 | Discovery + travessia no final; toast leve no grimório |
| 0.15 | Agente propõe copy; você aprova |
| 0.16 | Soluções em `enigma-supremo-submundo.md` |
| 0.17 | JSON primeiro → Revelar → Submundo → Grimório → Aula01 → calibração 99 |
| 0.18 | **A** Notpron (sem tabela de progresso) |
| 0.19 | Salas abertas; APIs com sessão |
| 0.20 | WAV no repo + Audacity + analisador web |
| 0.21 | URL livre entre salas |
| 0.22 | Manter `elestial` |
| 0.23 | `MAX_LEVEL = 99` + curva + ranks Domínio |
| 0.24 | **`data/game-catalog.json`** com `achievements` + `levels`; hashes ARG fora |


