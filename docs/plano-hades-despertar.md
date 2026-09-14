# Plano — Hades: O Despertar do Submundo

Implementação completa do GDD [`docs/gdd-hades-despertar.md`](./gdd-hades-despertar.md) **dentro do ecossistema** Fundamentos de Jogos Digitais (HTML/CSS/JS ES-Modules, `api/*` serverless, sessão opaca, Supabase via service role, app-shell Hades).

Este documento é a fonte operacional de implementação. O GDD permanece a fonte de **design**. Onde o GDD descreve um stack paralelo (`/src`, `/api/sync`, `auth.users` UUID, RLS com update do cliente), este plano **adapta** a ideia ao que o repositório já faz — sem diluir mecânicas, rios, fórmulas nem o pilar educacional.

---

## Contexto

A plataforma já é um hub gamificado (Trilha, Álbum, Salão, Grimório, ARG do Submundo). O item de navegação **Minigame em breve** está travado em todas as páginas do shell. Não existe clicker/incremental, nem `GameLoop` com RAF, nem persistência de estado de jogo além de XP/conquistas/notas.

O GDD pede um **módulo prático** que ensine, jogando:

- game loop (RAF + delta time + ticks fixos);
- ES-Modules com simulação separada da UI;
- economia exponencial (custo, SPS, amortização, prestígio);
- persistência local + **server-authoritative**.

Isso encaixa no destino vazio do Minigame e no mantra do curso — sem ocupar as URLs secretas `/submundo/*` (Enigma do Soberano).

Documento de design: [`docs/gdd-hades-despertar.md`](./gdd-hades-despertar.md).  
Stack e convenções: [`docs/contexto.md`](./contexto.md), [`README.md`](../README.md).  
Design system: `css/hades-tokens.css` (`--hades-*`, Cinzel / Crimson Text).

---

## Objetivos

1. Entregar o jogo incremental **completo** descrito no GDD: clique no Acheron, 6 geradores, upgrades do Styx, prestígio no Lethe, óbolos, essência de Mnemosyne, offline catch-up, sync autoritativo.
2. Servir de **módulo educacional** visível: logs da plataforma que nomeiam loop, delta, curva `1.15^n` e prestígio quando o aluno os encontra.
3. Integrar ao ecossistema: sessão, shell, tokens Hades, conquistas, preview no Painel, API no padrão das rotas existentes.
4. Não quebrar o ARG `/submundo/*`, nem a página admin **Almas Registradas**, nem o teto de destinos do shell.

---

## Diagnóstico rápido (estado atual)

| Peça | Onde | Situação |
| --- | --- | --- |
| GDD | `docs/gdd-hades-despertar.md` | Completo em visão/mecânica/arquitetura de referência; lacunas em upgrades, árvore Mnemosyne, fórmula de clique e copy educacional |
| Minigame no shell | `data-nav-item="minigame"` em 10 HTMLs | Travado (`is-locked`, `href="#"`) |
| Rota `minigame` | `js/app-shell.js`, `js/api.js` `ROUTES` | Mapeada no shell; **sem** `ROUTES.despertar` / página |
| Clicker / GameLoop | — | **Não existe** |
| ARG Submundo | `/submundo/*`, `js/submundo/*` | 8 salas secretas; **não** reutilizar pasta nem URLs |
| Almas (admin) | `pages/souls.html` | Lista de alunos; colide **semântica** com a moeda do GDD |
| Auth | `sessions` + token opaco | **Não** é Supabase Auth; `users.id` é `integer` |
| API de progresso | `POST /api/progress` actions | Arquivo já grande; sync de jogo **não** deve inchá-lo |
| Persistência | Supabase service role | Sem tabela de estado de clicker |
| IndexedDB | — | Não usado (só `localStorage` da sessão) |
| Tokens | `--hades-*` | Paleta GDD (`#0a0a0f`, Styx `#00a896`, fogo `#d90429`) ainda não mapeada |
| Aula 03 | `pages/aula3.html` | Placeholder; **não** substitui o minigame neste ciclo |

---

## Status da Fase 0

**Fase 0 fechada neste documento.** Decisões abaixo estão congeladas por coerência com o GDD + o que o repositório já impõe (auth customizada, shell, tokens, ARG). Implementação começa na Task 1.

---

## Task 0 — Decisões congeladas

### Produto / UX

| # | Tema | Decisão |
| --- | --- | --- |
| 1 | Onde vive o jogo | Página própria no shell: `pages/despertar.html`. Substitui o item **Minigame em breve**. |
| 2 | Nome na nav | **O Despertar** (cabe no teto de destinos). Título da página: **Hades: O Despertar do Submundo**. |
| 3 | Quem joga | Só sessão válida (`requireSession`). Sem modo visitante. |
| 4 | Gate de aula | **Sem** `lesson_gates`. Disponível a qualquer aluno logado (módulo transversal, como Grimório). |
| 5 | Layout desktop | Três colunas do GDD: colheita (Acheron) \| mercado (geradores) \| abas (upgrades, Lethe, save, logs). |
| 6 | Layout mobile | Empilhar: altar → mercado → abas. Não exigir três colunas em `<980px`. |
| 7 | Descoberta dos rios | Máscaras/seções reveladas por progresso (ver catálogo de rios). Não mostrar Phlegethon/Lethe no minuto zero. |
| 8 | Clique | Botão semântico no altar (Foice / Portal). Teclado: Enter/Espaço. Partículas CSS; `prefers-reduced-motion` desliga partículas e shake. |
| 9 | Compra | Modos **1 / 10 / 100 / Máx**. Botão cinza/desabilitado se o saldo não cobre o lote. |
| 10 | Prestígio | Ritual do Lethe com confirmação explícita (modal Hades). Não prestigiar com um clique acidental. |
| 11 | Offline | Modal ao voltar: tempo aplicado, almas colhidas, se bateu o teto de 8 h. |
| 12 | Preview no Painel | Card compacto no dashboard: Almas + SPS + CTA **Descer ao Acheron**. |

### Linguagem vs colisões

| # | Tema | Decisão |
| --- | --- | --- |
| 13 | Moeda do jogo | **Almas** (GDD). Nunca rotular a nav do jogo como “Almas”. |
| 14 | Admin `souls.html` | Continua **Almas Registradas**. Superfícies distintas; copy do jogo não usa “Almas Registradas”. |
| 15 | ARG `/submundo` | Intocável. Jogo **não** vive em `pages/submundo/` nem em rewrite `/submundo/*`. |
| 16 | Pasta JS | `js/hades-despertar/` — não `js/submundo/`. |
| 17 | Óbolos | **Óbolos de Caronte** na UI; id interno `obols`. |
| 18 | Essência | **Essência de Mnemosyne**; id interno `mnemosyne`. |
| 19 | SPS | Label **Almas / s** na HUD; tooltip/log educacional pode dizer SPS. |

### Técnico

| # | Tema | Decisão | Origem |
| --- | --- | --- | --- |
| 20 | Árvore `/src` do GDD | Mapear para `js/hades-despertar/{config,core,services,ui}` + `pages/despertar.html` | Ecossistema não usa `/src` |
| 21 | Rota `/api/sync` | `POST /api/despertar` (arquivo `api/despertar.js`), session token no body/header como `/api/progress` | `progress.js` já é monolito; GDD quer rota dedicada |
| 22 | `userId` no body | **Proibido.** Identidade vem só da sessão (`sessions` → `users.id` integer) | GDD de exemplo é inseguro |
| 23 | Tabela | `despertar_states` (não `player_states` genérico) | Evita colisão futura |
| 24 | PK / FK | `user_id integer UNIQUE REFERENCES users(id) ON DELETE CASCADE` | GDD UUID `auth.users` não existe aqui |
| 25 | RLS | ENABLE; **nenhuma** policy de UPDATE para o browser. Writes só via service role | Padrão atual (`supabaseClient.js`) |
| 26 | Números | `NUMERIC(38,2)` no SQL; no JS, strings decimais + helper compartilhado (não `Number` puro após ~1e15) | Incremental explode `MAX_SAFE_INTEGER` |
| 27 | Fórmulas | Um módulo importável no client **e** no server: `js/hades-despertar/core/formulas.js` (já existe precedente: `progress.js` importa `js/game-catalog.js`) | Server-authoritative de verdade |
| 28 | Prestígio: √ vs cubo | Código segue a **fórmula** do GDD: `floor(sqrt(runSouls / 1e9))`. O texto “raiz cúbica” é errata do GDD | Fórmula > prosa |
| 29 | IndexedDB | Sim, cache local (GDD). Chave por `user_id`. Servidor vence em conflito | GDD 5.3 + 5.5 |
| 30 | Sync | Heartbeat 30 s + imediato em compra, upgrade, prestígio, talento. Mínimo 5 s entre syncs (rate limit) | GDD 30 s + anti-abuso |
| 31 | Anti-cheat | Recalcular SPS no server a partir do catálogo; teto `SPS_max × Δt × 1.05` + cliques capados; rejeitar ids desconhecidos; compras não podem custar mais que o teto de almas do intervalo | GDD 5.3 + reforço |
| 32 | Clique cap | 20 cliques/s teóricos no server (autoclicker não imprime dinheiro infinito) | Lacuna do GDD; coerência educativa |
| 33 | Tokens visuais | Estender `--hades-*` com `--despertar-*` (rios). Não trocar Cinzel/Crimson por Inter. Mono só nos números (JetBrains Mono **só** em `despertar.html`) | Design system do curso |
| 34 | Conquistas | Família `despertar` no `data/game-catalog.json`; servidor concede no sync | Padrão Grimório |
| 35 | XP do jogo | Baixo (5–50), estilo Grimório. Não competir com Soberano (+1500) | Economia de XP do Domínio |
| 36 | local-server / Vercel | Registrar `/api/despertar` em `local-server.mjs`; `vercel.json` functions já cobrem `api/**/*.js` | Infra existente |
| 37 | Aula 03 | Fora deste plano. O Despertar não é a Aula 03 | Evitar acoplar currículo |

### Fora de escopo (congelado)

- Chat, ranking PvP, leaderboard global de SPS.
- Prestígio de terceira camada além de Mnemosyne.
- Port para Godot / canvas engine / jQuery Aldo111 original.
- Migrar auth para Supabase Auth.
- Reescrever o ARG `/submundo`.
- Modo offline permanente sem login.
- Som obrigatório (SFX opcional numa task de polish; mute default respeita o curso silencioso).
- Artes WebP finais das conquistas (placeholder + ids no catálogo, como outras relíquias).

---

## Linguagem de produto (congelada)

| Conceito | Nome no Domínio | Uso |
| --- | --- | --- |
| Jogo / destino do shell | **O Despertar** | Nav |
| Título longo | **Hades: O Despertar do Submundo** | `<h1>`, `<title>` |
| Eyebrow | Mantra curto: *O trabalho eterno do Submundo* | Header da página |
| CTA dashboard | **Descer ao Acheron** | Preview |
| Recurso primário | **Almas** | HUD |
| Produção | **Almas / s** | HUD |
| Clique | **Ceifar** / **Foice de Hades** | Botão do altar |
| Geradores | Nomes da tabela GDD (Sombra Vagante … Trono de Obsidiana) | Mercado |
| Upgrades | **Juramentos do Styx** | Aba |
| Prestígio | **Ritual do Lethe** | Aba / modal |
| Moeda 1ª ordem | **Óbolos de Caronte** | Prestígio |
| Moeda 2ª ordem | **Essência de Mnemosyne** | Árvore |
| Árvore | **Panteão de Mnemosyne** | Aba Lethe |
| Save | **Estela de Memória** | Aba |
| Logs educacionais | **Códice do Loop** | Aba |
| Offline | **Colheita na ausência** | Modal |
| Sync ok | *O Submundo reconhece teu estado.* | Toast discreto |
| Sync rejeitado | *Os Juízes recusaram o saldo declarado.* | Toast + rehydrate do server |

Evitar na UI do aluno: “sync payload”, “IndexedDB”, “anti-cheat”, “minigame”, “cookie clicker”.

---

## Adaptação GDD → stack (fechada)

| GDD | Adaptação no repositório |
| --- | --- |
| `/src/index.js` | `js/hades-despertar/index.js` bootstrap da página |
| `/src/config/constants.js` | `js/hades-despertar/config/constants.js` + catálogos vizinhos |
| `GameLoop.js` / `GameState.js` / `Entity.js` / `EntitySet.js` | `js/hades-despertar/core/*` — lógica do GDD 5.2 preservada |
| `StorageService.js` | IndexedDB em `services/StorageService.js` |
| `ApiService.js` → `POST /api/sync` | `services/ApiService.js` → `POST /api/despertar` |
| `OfflineEngine.js` | `services/OfflineEngine.js` (8 h, 80%) |
| `UIRenderer.js` / `NumberFormatter.js` | `ui/*` |
| `api/sync.js` + `userId` no body | `api/despertar.js` + token de sessão |
| `player_states` + `auth.users` UUID | `despertar_states.user_id` → `users(id)` integer |
| Paleta `:root` isolada | Tokens `--despertar-*` em `css/despertar.css` + herança `--hades-*` |
| Inter / Georgia | Cinzel + Crimson Text; mono só nos números |
| RLS update pelo `auth.uid()` | **Não copiar.** Service role only |
| Logs da plataforma educacional | Aba **Códice do Loop** (`config/edu-logs.js`) |

```
pages/despertar.html  (app-shell, data-route="despertar")
        │
        ▼
js/hades-despertar/index.js
        ├── core/GameLoop.js          RAF 60 ticks + panic(300)
        ├── core/GameState.js         carteira, compras, prestígio
        ├── core/formulas.js          ★ compartilhado com o server
        ├── config/*.js               geradores, upgrades, talentos, logs
        ├── ui/UIRenderer.js          diffs no DOM (não innerHTML do mundo)
        └── services/
              ├── StorageService.js   IndexedDB
              ├── OfflineEngine.js    catch-up local
              └── ApiService.js       POST /api/despertar
                        │
                        ▼
              api/despertar.js  ──►  formulas.js + despertar_states
                        │
                        ▼
              Supabase (service role)
```

---

## Arquitetura alvo (congelada)

```
Dashboard (Painel do Herói)
└── [D] Preview O Despertar     ← Almas, Almas/s, CTA Descer ao Acheron

pages/despertar.html
├── Coluna esquerda — Santuário do Acheron
│     altar, Foice, Almas, Almas/s, taxa de clique, partículas
├── Coluna centro — Mercado dos Rios
│     geradores T1–T6 (máscara até desbloquear)
│     toggle compra 1/10/100/Máx
└── Coluna direita — abas
      ├── Juramentos do Styx (upgrades)
      ├── Ritual do Lethe (óbolos, essência, Panteão)
      ├── Estela de Memória (save/sync status)
      └── Códice do Loop (logs educacionais)
```

### Contrato da API `POST /api/despertar`

Actions (mesmo estilo `action` + `token` de `progress.js`):

| Action | Papel |
| --- | --- |
| `stateGet` | Cria linha vazia se não existir; devolve estado autoritativo |
| `stateSync` | Valida ganho/compras; persiste; devolve estado + conquistas novas |
| `prestige` | Valida ritual; reseta corrida; credita óbolos/essência no server |
| `talentBuy` | Compra talento Mnemosyne se essência bastar |

**Não** existir `stateSet` cego.

DTO de estado (camelCase na API, snake no SQL):

```text
souls, obols, mnemosyne, lifetimeSouls, runSouls, prestigeCount,
generators: { [generatorId]: quantity },
upgrades: string[],          // ids comprados nesta corrida
talents: string[],           // ids permanentes
eduLogsSeen: string[],
lastSyncAt: ISO string,
sps: string,                 // derivado no server, só leitura
prestigePreview: { obolsGain, mnemosyneGain, unlocked }
```

Números grandes via **string decimal** no JSON (`"1400000.00"`), nunca float.

### Validação `stateSync` (anti-cheat)

1. Autenticar sessão; carregar `despertar_states`.
2. `deltaSeconds = now - last_sync_at` (clamp 0 … 8 h + margem curta de jitter 60 s).
3. `serverSps = calculateTotalSPS(dbGenerators, dbUpgrades, dbTalents, dbObols)`.
4. `maxClicks = 20 * deltaSeconds`.
5. `maxGain = (serverSps * deltaSeconds + clickPower(db) * maxClicks) * 1.05`.
6. Se `claimedSouls - dbSouls + spentThisPayload > maxGain` e a diferença absoluta `> 100` → **400**, devolver estado do DB (como o GDD).
7. Recalcular custo total das quantidades/upgrades novos com `formulas.js`. Se o gasto exceder o teto de almas disponíveis no intervalo → 400.
8. Ids fora do catálogo → 400.
9. Prestígio e talentos **não** passam por `stateSync` genérico: actions dedicadas.
10. Depois de persistir, avaliar conquistas `despertar_*` e anexar `awarded[]` (xp/conquistas em `users`).

### Authz

| Ação | student | admin |
| --- | --- | --- |
| Jogar / sync próprio estado | sim | sim (conta própria) |
| Ver estado de outro aluno | não | opcional Task 11 (souls) |
| Mutar estado alheio | não | não neste ciclo |

---

## Matemática congelada (GDD + lacunas preenchidas)

### Custo de gerador

\[
Price(n) = BaseCost \times 1.15^{n}
\]

`n` = quantidade **já possuída** (próxima compra). Lote 10/100/Máx = soma da série geométrica, não `10 × Price(n)`.

### SPS

\[
SPS = \left( \sum_i Quantity_i \times BaseRate_i \times UpgradeMult_i \right) \times PrestigeBonus
\]

`UpgradeMult_i` começa em `1` e **multiplica** a cada juramento que afeta aquele gerador (em geral ×2).

### Prestígio

\[
ÓbolosGanhos = \left\lfloor \sqrt{\frac{runSouls}{10^{9}}} \right\rfloor
\]

\[
PrestigeBonus = 1 + (obolsTotais \times 0.05) \times MultiplicadorMnemosyne
\]

`MultiplicadorMnemosyne` inicia em `1`. Talentos podem aumentá-lo.

`runSouls` = almas **geradas nesta corrida** (clique + passivo + offline), não o saldo atual (saldo é gasto em compras). Persistir `run_souls` e `lifetime_souls`.

### Clique (lacuna do GDD)

\[
ClickPower = (1 + FlatClick) \times ClickMult \times (1 + k_{sps} \times SPS)
\]

- Base: `1` alma / clique, `FlatClick = 0`, `ClickMult = 1`, `k_{sps} = 0`.
- Juramentos de foice alteram `ClickMult` (×2 cada).
- Talento **Foice Ancestral**: `k_{sps} = 0.01`.

### Offline (GDD 5.5)

- Ignorar se `elapsed < 10 s`.
- Teto `maxOfflineHours` (base 8; talento pode ir a 12).
- Eficiência base `0.80` (talento pode ir a `1.00`).
- Usa o SPS do **estado salvo** (geradores da corrida), não um SPS “otimista”.

### Essência de Mnemosyne (lacuna do GDD)

No Ritual do Lethe que rende **≥ 1 óbolo**:

\[
EssênciaGanha = 1 + \left\lfloor \frac{ÓbolosGanhos}{10} \right\rfloor
\]

Ritual com 0 óbolos: botão bloqueado (não queimar a corrida à toa).

---

## Catálogos congelados

### Rios (descoberta de UI — pilar 1.3 / §2.1)

| Rio | Papel | Unlock |
| --- | --- | --- |
| **Acheron** | Clique + HUD | Sempre |
| **Cocytus** | Geradores T1–T3 visíveis como “lamento automatizado” | Sempre T1; T2 com ≥ 50 almas **ou** 1× T1; T3 com 1× T2 **ou** almas ≥ `BaseCost/4` |
| **Styx** | Aba Juramentos | Primeira compra de gerador **ou** 100 almas |
| **Phlegethon** | Geradores T5–T6 + visual de fogo | 1× T4 **ou** almas ≥ 32_500 |
| **Lethe + Mnemosyne** | Aba ritual | `runSouls ≥ 1e8` (prévia) ou `obolsGain ≥ 1` (ritual ativo) |

Máscara cinza com copy narrativa (“O rio ainda não aceita teu nome”) — não sumir o slot sem explicação.

### Geradores (GDD §4.1 — ids estáveis)

| Id | Tier | Nome | BaseCost | BaseRate (SPS) | Mult |
| --- | ---: | --- | ---: | ---: | ---: |
| `wandering_shade` | 1 | Sombra Vagante | 15 | 0.1 | 1.15 |
| `charon_servants` | 2 | Servos de Caronte | 100 | 0.8 | 1.15 |
| `cerberian_hound` | 3 | Cão Cerberiano | 1_100 | 8.0 | 1.15 |
| `tartarus_judge` | 4 | Juiz do Tártaro | 12_000 | 47.0 | 1.15 |
| `phlegethon_forge` | 5 | Forja de Phlegethon | 130_000 | 260.0 | 1.15 |
| `obsidian_throne` | 6 | Trono de Obsidiana | 1_400_000 | 1_400.0 | 1.15 |

Copy curta (mercado):

| Id | Sub |
| --- | --- |
| `wandering_shade` | Sombras à margem do Acheron. |
| `charon_servants` | Remadores que cobram a passagem. |
| `cerberian_hound` | Três goelas, um posto. |
| `tartarus_judge` | Sentença que rende almas. |
| `phlegethon_forge` | Fogo industrial do rio. |
| `obsidian_throne` | O assento do Imperador Ctoniano. |

### Juramentos do Styx (lacuna do GDD — preenchida)

Todos ×2 no alvo. `requires` = quantidade mínima do gerador **ou** almas (click). Resetam no Lethe.

**Clique**

| Id | Nome | Custo | Efeito |
| --- | --- | ---: | --- |
| `foice_afilada` | Foice Afiada | 100 | `ClickMult ×2` |
| `juramento_acheron` | Juramento do Acheron | 500 | `ClickMult ×2` |
| `pacto_das_margens` | Pacto das Margens | 2_500 | `ClickMult ×2` |
| `ceifador_ctoniano` | Ceifador Ctoniano | 10_000 | `ClickMult ×2` |
| `colheita_eterna` | Colheita Eterna | 50_000 | `ClickMult ×2` |

**Por gerador** (1 possuído / 10 possuídos)

| Id | Requer | Custo | Alvo |
| --- | --- | ---: | --- |
| `umbras_despertas` | 1× T1 | 100 | T1 ×2 |
| `cortejo_das_sombras` | 10× T1 | 500 | T1 ×2 |
| `moeda_no_barquinho` | 1× T2 | 1_000 | T2 ×2 |
| `frota_de_caronte` | 10× T2 | 5_000 | T2 ×2 |
| `trela_cerberiana` | 1× T3 | 11_000 | T3 ×2 |
| `tres_cabecas` | 10× T3 | 55_000 | T3 ×2 |
| `veredito_tartaro` | 1× T4 | 120_000 | T4 ×2 |
| `lei_inquebravel` | 10× T4 | 600_000 | T4 ×2 |
| `brasa_phlegethon` | 1× T5 | 1_300_000 | T5 ×2 |
| `fornalha_industrial` | 10× T5 | 6_500_000 | T5 ×2 |
| `cetro_obsidiana` | 1× T6 | 14_000_000 | T6 ×2 |
| `soberania_absoluta` | 10× T6 | 70_000_000 | T6 ×2 |

**Global**

| Id | Nome | Custo | Efeito |
| --- | --- | ---: | --- |
| `coroacao_imperador` | Coroação do Imperador | 1_000_000 | todos os geradores ×2 |
| `rios_unificados` | Rios Unificados | 100_000_000 | todos os geradores ×2 |

### Panteão de Mnemosyne (lacuna do GDD — preenchida)

Permanente. Custo em **Essência**. Sem reset no Lethe.

| Id | Nome | Custo | Efeito |
| --- | ---: | --- | --- |
| `memoria_das_sombras` | Memória das Sombras | 1 | Nova corrida começa com 100 almas (contam em `runSouls`) |
| `juramento_eterno` | Juramento Eterno | 1 | `MultiplicadorMnemosyne × 1.10` |
| `noite_prolongada` | Noite Prolongada | 2 | Offline 8 h → 12 h |
| `veu_eficiente` | Véu Eficiente | 2 | Offline 80% → 100% |
| `foice_ancestral` | Foice Ancestral | 3 | `k_sps = 0.01` |
| `favor_de_caronte` | Favor de Caronte | 3 | Custos de gerador × 0.95 |
| `mnemosyne_profunda` | Mnemosyne Profunda | 5 | `MultiplicadorMnemosyne × 1.25` |
| `segundo_folego` | Segundo Fôlego | 5 | Nova corrida começa com 1× Sombra Vagante |

### Códice do Loop (logs educacionais — GDD §2.3)

Desbloqueio **local + persistido** (`edu_logs_seen`). Texto visível na aba; não é spoiler de fórmulas futuras além do sistema já encontrado.

| Id | Gatilho | Título | Corpo (essência) |
| --- | --- | --- | --- |
| `log_input` | 1º clique | O clique é o input | Ação do jogador altera o estado (saldo de Almas). |
| `log_state` | 10 almas | Estado e carteira | Números na HUD são o estado do jogo, não “pontos de história”. |
| `log_loop` | 5 s de sessão com loop vivo | O Game Loop | O mundo avança em ticks mesmo sem clicar — RAF + delta time. |
| `log_delta` | Aba oculta ≥ 15 s e retorno | Delta e ausência | Tempo real importa; o loop não “inventa” frames perdidos — acumula ou faz catch-up. |
| `log_generator` | 1º gerador | Automação | SPS = quantidade × taxa × juramentos. |
| `log_curve` | 5× do mesmo gerador | Curva 1.15 | `Preço = Base × 1.15^n` — cada unidade fica mais cara. |
| `log_amort` | Tooltip de amortização visto **ou** 1× T3 | Amortização | Tempo para o gerador “se pagar”; o GDD calcula `T_amort` na tabela. |
| `log_upgrade` | 1º juramento | Multiplicadores | Upgrades não somam +1 alma; **multiplicam** a máquina. |
| `log_wall` | `runSouls ≥ 1e8` | A parede | Curva exponencial cria barreira; o gênero responde com prestígio. |
| `log_prestige` | 1º Lethe | Catábase | Reset da corrida em troca de óbolos; bônus permanente no SPS. |
| `log_authority` | 1º sync 200 | O servidor julga | O browser simula fluido; o saldo eterno é o que o servidor aceita. |
| `log_offline` | 1º catch-up > 60 s | Colheita na ausência | Teto de horas × eficiência — design de respeito ao sono do aluno. |

### Formatador numérico

Sufixos até a ordem de `NUMERIC(38)`: `K M B T Qa Qi Sx Sp Oc No Dc`. Uma casa decimal quando `≥ 10_000` (`15.0K`, `1.4M`). Abaixo de 10_000: inteiro ou 1 decimal para taxas `< 10` (`0.1`).

### Conquistas `despertar` (catálogo)

| Id | Nome | Raridade | XP | Gatilho no server |
| --- | --- | --- | ---: | --- |
| `despertar_primeira_alma` | Primeira Alma | stone | 5 | `lifetimeSouls ≥ 1` |
| `despertar_primeira_sombra` | Primeira Sombra | copper | 10 | `wandering_shade ≥ 1` (corrida ou histórico via lifetime/geradores atuais) |
| `despertar_automacao` | Máquina do Pesar | copper | 10 | SPS derivado ≥ 1 |
| `despertar_forja` | Brasa do Phlegethon | silver | 20 | possuir T5 nesta corrida **ou** `lifetime` já teve (simplificar: `phlegethon_forge ≥ 1` no estado **ou** flag `seenForge` — MVP: quantidade atual **ou** `run` pós-prestígio não apaga `lifetime` flags). **MVP rígido:** `lifetimeSouls ≥ 130000` **e** `prestigeCount ≥ 0` não basta. Persistir `milestones jsonb` no estado: `{ forge: true, throne: true, ... }` setado quando compra. |
| `despertar_trono` | Trono de Obsidiana | silver | 25 | milestone `throne` |
| `despertar_catabase` | Catábase | gold | 35 | `prestigeCount ≥ 1` |
| `despertar_mnemosyne` | Memória Despertada | gold | 35 | `talents.length ≥ 1` |
| `despertar_soberania` | Seis Rios | rainbow | 50 | possuir ≥ 1 de cada gerador **ao mesmo tempo** (corrida) |
| `despertar_arquiteto_do_loop` | Arquiteto do Loop | gold, **hidden** | 30 | `eduLogsSeen` contém todos os ids do Códice |

Milestones em `milestones jsonb` default `{}` para não perder Forja/Trono no Lethe.

Arte: ids em `assets/achievements/catalog.json`; WebP placeholder ok no MVP.

---

## Schema SQL (alvo)

Arquivo: `db/migrate-2026-09-11-hades-despertar.sql`.

```sql
CREATE TABLE IF NOT EXISTS despertar_states (
  user_id integer PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  souls numeric(38, 2) NOT NULL DEFAULT 0,
  obols numeric(38, 2) NOT NULL DEFAULT 0,
  mnemosyne numeric(38, 2) NOT NULL DEFAULT 0,
  lifetime_souls numeric(38, 2) NOT NULL DEFAULT 0,
  run_souls numeric(38, 2) NOT NULL DEFAULT 0,
  prestige_count integer NOT NULL DEFAULT 0,
  generators_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  upgrades_state jsonb NOT NULL DEFAULT '[]'::jsonb,
  talents_state jsonb NOT NULL DEFAULT '[]'::jsonb,
  edu_logs_seen jsonb NOT NULL DEFAULT '[]'::jsonb,
  milestones jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT despertar_souls_nonneg CHECK (souls >= 0),
  CONSTRAINT despertar_obols_nonneg CHECK (obols >= 0),
  CONSTRAINT despertar_mnemosyne_nonneg CHECK (mnemosyne >= 0)
);

ALTER TABLE despertar_states ENABLE ROW LEVEL SECURITY;
-- Sem policies de INSERT/UPDATE para anon/authenticated.
-- O backend usa SUPABASE_SERVICE_ROLE_KEY (bypass RLS), igual ao restante do Domínio.
```

Espelhar o bloco em `db/setup.sql` (schema de referência).

---

## Mapa GDD → tasks (rastreio)

| Seção GDD | O que cobre | Tasks |
| --- | --- | --- |
| 1.1–1.3 Visão, mantra, pilares | Página, copy, rios progressivos, módulo educativo | 1, 6, 7, 10 |
| 2.1 Rios | Unlock geográfico da UI | 6, 7, 8 |
| 2.2 Paleta / fontes | Tokens `--despertar-*`, Cinzel, mono em números | 6 |
| 2.3 Três colunas + abas | HTML/CSS/renderer | 6, 7, 8, 9, 10 |
| 3.1 Loop ativo/passivo | Clique + SPS + compra + prestígio | 3, 4, 5, 8 |
| 3.2 Três moedas | Almas, óbolos, essência | 3, 8 |
| 3.3 Fórmulas | `formulas.js` + testes | 2 |
| 4.1 Tabela geradores | Catálogo + mercado | 2, 7 |
| 4.2 Lethe / óbolos / bonus | Ritual + Panteão | 8 |
| 5.1 ES-Modules | Pasta `js/hades-despertar` | 2–5 |
| 5.2 GameLoop RAF | Classe do GDD (panic 300, alpha render) | 4 |
| 5.3 Sync 30 s + crítico | `ApiService` + `/api/despertar` | 5, 9 |
| 5.4 Schema | Migration | 1, 9 |
| 5.5 Offline 8 h / 80% | `OfflineEngine` + modal | 5 |
| 5.6 Handler sync | `api/despertar.js` (versão segura) | 9 |
| 6 Módulo educacional | Códice + conquistas hidden | 10, 12 |

---

## Fases e tasks de implementação

Cada task é fatiável em PR. Critério de pronto = checklist da task + smoke se indicado. Não pular a ordem 2 → 4 → 9 (matemática e loop antes do server).

### Fase 1 — Fundações

#### Task 1 — Schema e fiação da rota vazia

**Status:** feita (2026-09-11)

**Faz**

- [x] Criar `db/migrate-2026-09-11-hades-despertar.sql` e atualizar `db/setup.sql`.
- [x] Criar `api/despertar.js` com stub autenticado: só `stateGet` devolvendo estado zerado / linha inserida.
- [x] Registrar `/api/despertar` em `local-server.mjs` (mesmo wrapper JSON de auth/progress).
- [x] Helpers em `js/api.js`: `ROUTES.despertar()`, `despertarStateGet()`, `despertarStateSync()`, `despertarPrestige()`, `despertarTalentBuy()`.
- [x] 401 sem token / token inválido (`userId` no body ignorado).
- [x] Smoke `tests/despertar-task1-smoke.mjs` no `npm run check`.

**Não faz:** validação anti-cheat completa (Task 9). `stateSync` / `prestige` / `talentBuy` respondem **501**.

**Pronto quando:** migration aplicável no Supabase; `POST { action: 'stateGet', token }` com sessão válida retorna DTO zerado; 401 sem token.

#### Task 2 — Núcleo matemático compartilhado (sem UI)

**Arquivos:** `js/hades-despertar/config/constants.js`, `generators.js`, `upgrades.js`, `talents.js`, `core/formulas.js`, `core/Entity.js`, `core/EntitySet.js`.

**Faz**

- Portar a ideia Aldo111 (`Entity` / `EntitySet`) para ES-Modules puros: quantidade, `priceAt(n)`, `rate`, `buy(count, wallet)`.
- Implementar **todas** as fórmulas congeladas (custo em lote, SPS, click, óbolos, essência, prestige bonus, offline).
- Números via helper decimal (string in/out). Proibido `0.1 * 15` solto na economia.

**Testes:** `tests/despertar-formulas-smoke.mjs`

- Preço T1 n=0 → 15; n=1 → 15×1.15.
- Lote 10 de T1 a n=0 = soma geométrica conhecida.
- SPS: 10 sombras sem upgrade = 1.0.
- Óbolos: `runSouls = 1e9` → 1; `9.99e8` → 0.
- Offline 10 s a SPS 1, 80% → 8 almas.

**Pronto quando:** smoke verde; módulo importável no Node (`type: module`).

---

### Fase 2 — Simulação viva no cliente

#### Task 3 — `GameState` reativo

**Arquivo:** `js/hades-despertar/core/GameState.js`

**Faz**

- Estado da corrida: almas, geradores, juramentos, run/lifetime, óbolos, essência, talentos, logs, milestones.
- Métodos: `tick(dtSeconds)`, `click()`, `buyGenerator(id, mode)`, `buyUpgrade(id)`, `canPrestige()`, `applyPrestige()` (local, ainda sem server), `buyTalent(id)`, `unlockLogs()`.
- Carteira nunca negativa; compras no-op se falhar.
- Expor snapshot serializável (DTO).

**Pronto quando:** teste de fumaça Node instancia estado, 10 cliques + 1 sombra + 2 s de tick, saldo bate com `formulas.js`.

#### Task 4 — `GameLoop` RAF (GDD §5.2)

**Arquivo:** `js/hades-despertar/core/GameLoop.js`

**Faz** — implementar o loop do GDD (copiar a semântica, não jQuery):

- `step = 1000/60`; acumulador; `update(dt)`; `render(alpha)`; `panic` aos 300 updates.
- `start` / `stop`; `visibilitychange`: ao voltar, não spiral; deixar Task 5 aplicar catch-up se o delta for grande.
- `prefers-reduced-motion` não para o **update** (economia continua); só suaviza o render.

**Pronto quando:** página de harness ou teste mínimo prova 60 updates em ~1 s de relógio (tolerância); stop cancela RAF.

#### Task 5 — Persistência local + offline

**Arquivos:** `services/StorageService.js`, `services/OfflineEngine.js`

**Faz**

- IndexedDB `despertar-db` / store `states` / key = `userId`.
- Fallback: se IndexedDB falhar, `sessionStorage` (não `localStorage` da sessão de auth — não misturar chaves).
- No boot: ler local → `calculateOfflineProgress` → aplicar almas → gravar.
- Debounce save 1 s após mutação; flush no `pagehide`.

**Pronto quando:** reload após 15 s com 1 sombra mostra modal de colheita (ou harness); teto 8 h respeitado.

---

### Fase 3 — UI do Submundo

#### Task 6 — Página shell, tokens, layout de três colunas

**Arquivos:** `pages/despertar.html`, `css/despertar.css`, bootstrap `js/hades-despertar/index.js`, `js/app-shell.js` (`route === 'despertar'`).

**Faz**

- Página no contrato do shell: `hades-tokens.css` + `app-shell.css` + `despertar.css`; `data-route="despertar"`; `requireSession`; logout.
- Tokens do GDD mapeados:

```css
--despertar-bg: #0a0a0f;
--despertar-bg-2: #12121a;
--despertar-card: #1a1a26;
--despertar-gold: var(--hades-gold);
--despertar-styx: #00a896;
--despertar-fire: #d90429;
--despertar-purple: #7209b7;
```

- Grid 3 colunas desktop; 1 coluna mobile.
- Esqueleto das regiões (ainda que estáticas): `#acheron-altar`, `#river-market`, `#despertar-tabs`.
- Fonte mono (JetBrains Mono) **somente** nesta página, aplicada a `.despertar-num`.

**Pronto quando:** logado vê a página no visual Hades; deslogado cai no Pacto; mobile não estoura horizontal.

#### Task 7 — Mercado + altar (loop jogável local)

**Arquivos:** `ui/UIRenderer.js`, `ui/NumberFormatter.js`, `ui/particles.js`

**Faz**

- HUD: Almas, Almas/s, almas/clique.
- Botão **Ceifar** + partículas (CSS) + gamefeel leve (`shake` existente se couber, sem copiar o rainbow VFX).
- Lista dos 6 geradores com qtd, produção, preço do lote, máscara de rio, botão disabled se pobre.
- Toggle 1/10/100/Máx.
- Updates **cirúrgicos** (textContent de nós já existentes). Proibido recriar a lista inteira a 60 Hz.
- Render interpolado pode animar o número de almas; compras só no `update`.

**Pronto quando:** dá para clicar, comprar T1–T2, ver SPS subir, números formatados; 60 fps sem relayout da coluna inteira (checar em DevTools Performance de forma manual).

#### Task 8 — Styx, Lethe, Panteão

**Faz**

- Aba Juramentos: lista filtrada pelo que já pode aparecer (`requires`); compra.
- Aba Lethe: preview de óbolos/essência; bloqueio se 0 óbolos; modal **Ritual do Lethe** (confirmar / recuar).
- Reset local da corrida + crédito de óbolos/essência; PrestigeBonus visível na HUD.
- Panteão: 8 talentos, compra com essência, efeitos imediatos na corrida atual quando fizer sentido (bonus SPS) ou na **próxima** (memória / segundo fôlego).

**Pronto quando:** uma corrida “cheat” de harness consegue prestigiar e comprar 1 talento; geradores zeram; óbolos permanecem.

#### Task 10a — Códice do Loop (UI)

(Pode ir junto da 7–8.)

**Faz:** aba com logs bloqueados/desbloqueados; persistir ids no estado.

**Pronto quando:** 1º clique revela `log_input`; 1º gerador revela `log_generator`.

---

### Fase 4 — Servidor autoritativo

#### Task 9 — `/api/despertar` completo

**Arquivos:** `api/despertar.js`; import de `formulas.js` + catálogos.

**Faz**

- `stateGet` / `stateSync` / `prestige` / `talentBuy` com as regras da seção anti-cheat.
- Recusar `userId` do cliente.
- Rate limit simples em memória (igual `underworldRedeemAttempts`): máx. 12 syncs / min / user.
- Resposta 400 com `state` do DB quando o ganho estoura o teto (GDD).
- 409/merge: se `client.lastSyncAt` for mais velho que o DB de forma inconsistente, vencer o DB.
- Avaliar conquistas (Task 12 pode completar o grant; nesta task já persistir estado válido).

**Testes:** `tests/despertar-sync-smoke.mjs`

- Sem token → 401.
- Sync com almas absurdas em Δt=1 s → 400 + souls do DB.
- Compra T1 com souls suficientes no DB simulável (harness unitário das funções de validação, não precisa Supabase real se extrair `validateSync(db, client, now)`).

**Pronto quando:** smoke verde; cliente `ApiService` heartbeat 30 s + flush em compra.

#### Task 5b — Ligar IndexedDB ↔ servidor

No boot: `stateGet` → se server `lastSyncAt` > local, server vence → então offline catch-up **a partir do last_sync do server** (não somar offline duas vezes).

**Pronto quando:** dois browsers (ou incógnito) na mesma conta: o último sync 200 é a verdade; o outro rehydrate.

---

### Fase 5 — Ecossistema

#### Task 11 — Shell, Painel, admin

**Faz**

- Destravar nav em **todas** as páginas que hoje têm Minigame travado (lista abaixo).
- `href="./despertar.html"` (ou relativo correto); texto **O Despertar**; remover `is-locked` / `aria-disabled`.
- `pages/despertar.html` inclui o mesmo bloco de nav, item ativo.
- `js/app-shell.js`: `mapRouteToNavItem('despertar')`.
- Preview no `pages/dashboard.html` + `js/dashboard.js` (não inflar o card de perfil: bloco próprio, padrão Grimório/Salão).
- **Opcional no mesmo PR ou Task 11b:** em `souls.html`, métrica compacta `despertarSouls` / `prestigeCount` se o `listUsers` passar a fazer left join — só se não pesar a query. Se pesar, adiar; não bloquear o jogo.

**Páginas a atualizar (nav):**

- `pages/dashboard.html`
- `pages/aulas.html`
- `pages/conquistas.html`
- `pages/salao-espiritual.html`
- `pages/companheiro.html`
- `pages/grimorio.html`
- `pages/grimorio-editar.html`
- `pages/aula1.html`
- `pages/aula2.html`
- `pages/aula3.html`
- `pages/despertar.html` (nova)

`pages/souls.html` e `pages/grimorio-nota.html` não usam esse nav.

**Testes:** estender `tests/phase5-pages-smoke.mjs` (ou `tests/despertar-pages-smoke.mjs`): todo shell com minigame antigo **não** pode permanecer `href="#"` + “Minigame em breve”.

**Pronto quando:** aluno navega Painel → O Despertar → volta; item marca ativo; preview mostra números após `stateGet`.

#### Task 12 — Conquistas e Códice no servidor

**Faz**

- Entradas em `data/game-catalog.json`.
- Ids em `assets/achievements/catalog.json`.
- Grant no `stateSync` / `prestige` / `talentBuy` (não confiar `eduLogsSeen` inflado: logs podem ser client-side, mas a conquista hidden exige que o server aceite só logs cujo gatilho o estado **poderia** ter disparado — MVP: server deriva logs possíveis do estado + timestamps, ou replica gatilhos no `validate`).
- Toast/relíquia: reutilizar `achievements-ui` se o payload devolver `awarded` (padrão aulas/grimório).

**Regra hidden Arquiteto do Loop:** server calcula o conjunto de logs *elegíveis* pelo estado (cliques implícitos se `lifetimeSouls≥1`, gerador se qtd≥1, etc.) e só então concede. Cliente não “marca os 12” no DevTools.

**Pronto quando:** smoke de catálogo + um teste de elegibilidade de logs; Álbum mostra as públicas; hidden só após Códice completo legítimo.

#### Task 13 — `npm run check` e README

- `node --check` nos novos JS.
- Incluir smokes no script `check`.
- README: 1 parágrafo no Status + item na árvore de diretórios + rota `/api/despertar`.
- **Não** reescrever o GDD; opcional nota no topo do GDD: “Implementação: `docs/plano-hades-despertar.md`”.

---

### Fase 6 — Polarização, a11y, QA

#### Task 14 — Acessibilidade e mobile

- Altar é `<button>`.
- Abas com teclado (setas ou tab).
- Contraste dos rios (Styx `#00a896` em fundo `#0a0a0f` — validar WCAG do **texto**; se falhar, clarear o texto do acento, não o token de atmosfera).
- `prefers-reduced-motion`: sem partículas, sem interpolação nervosa.
- iOS: clique não dá zoom (`touch-action`); HUD visível acima do teclado (não há inputs de texto no loop principal).

#### Task 15 — Polarização juice (sem mentir o saldo)

- Pulso no altar ao ceifar.
- Flash Styx ao comprar juramento.
- Overlay Lethe (vinheta roxa) no ritual — pode reusar `#levelup-overlay` com copy própria, sem dar XP falso.
- Máscaras de rio com transição de opacidade.

#### Task 16 — QA manual (checklist)

Ver seção [Checklist de aceite](#checklist-de-aceite).

---

## Arquivos (criar / tocar)

### Criar

| Arquivo | Papel |
| --- | --- |
| `pages/despertar.html` | Página do jogo no shell |
| `css/despertar.css` | Layout 3 colunas + rios |
| `js/hades-despertar/index.js` | Boot |
| `js/hades-despertar/config/constants.js` | FPS, sync, offline, caps |
| `js/hades-despertar/config/generators.js` | Tabela §4.1 |
| `js/hades-despertar/config/upgrades.js` | Juramentos |
| `js/hades-despertar/config/talents.js` | Panteão |
| `js/hades-despertar/config/edu-logs.js` | Códice |
| `js/hades-despertar/core/GameLoop.js` | RAF |
| `js/hades-despertar/core/GameState.js` | Simulação |
| `js/hades-despertar/core/Entity.js` | Unidade |
| `js/hades-despertar/core/EntitySet.js` | Coleção |
| `js/hades-despertar/core/formulas.js` | Matemática compartilhada |
| `js/hades-despertar/core/decimal.js` | Helper numérico |
| `js/hades-despertar/services/StorageService.js` | IndexedDB |
| `js/hades-despertar/services/ApiService.js` | HTTP |
| `js/hades-despertar/services/OfflineEngine.js` | Catch-up |
| `js/hades-despertar/ui/UIRenderer.js` | DOM |
| `js/hades-despertar/ui/NumberFormatter.js` | Sufixos |
| `js/hades-despertar/ui/particles.js` | Partículas Acheron |
| `api/despertar.js` | Serverless |
| `db/migrate-2026-09-11-hades-despertar.sql` | Tabela |
| `tests/despertar-formulas-smoke.mjs` | Economia |
| `tests/despertar-sync-smoke.mjs` | Anti-cheat |
| `tests/despertar-pages-smoke.mjs` | Shell/nav |

### Tocar

| Arquivo | Por quê |
| --- | --- |
| `local-server.mjs` | Rota `/api/despertar` |
| `db/setup.sql` | Schema de referência |
| `js/api.js` | `ROUTES` + fetch helpers |
| `js/app-shell.js` | Nav item |
| `js/dashboard.js` + `pages/dashboard.html` | Preview |
| 10 HTMLs do shell | Link O Despertar |
| `data/game-catalog.json` | Conquistas |
| `assets/achievements/catalog.json` | Artes |
| `package.json` | `check` |
| `README.md` | Status / árvore |
| `css/app-shell.css` | Só se o 7º item do aluno exigir ajuste de densidade (já comenta 8 itens admin) |
| `docs/gdd-hades-despertar.md` | Linha no topo apontando este plano (opcional, 1 frase) |

### Não tocar

- `pages/submundo/**`, `js/submundo/**`, rewrites ARG.
- Fluxo de e-mail / amigos / grimório, salvo nav compartilhada.
- `api/progress.js` (exceto se Task 12 precisar de um helper **extraído**; preferir grant dentro de `api/despertar.js` importando `game-catalog.js`).

---

## Microcopy congelada

### Página

| Superfície | Copy |
| --- | --- |
| Nav | O Despertar |
| Eyebrow | O trabalho eterno do Submundo |
| Título | HADES: O DESPERTAR DO **SUBMUNDO** |
| Botão clique | Ceifar |
| SPS | Almas / s |
| Compra 1/10/100 | 1 · 10 · 100 · Máx |
| Aba upgrades | Juramentos do Styx |
| Aba prestígio | Rio Lethe |
| Aba save | Estela de Memória |
| Aba logs | Códice do Loop |
| CTA preview | Descer ao Acheron |
| Gerador pobre | (botão disabled; sem alert) |

### Ritual

| Peça | Copy |
| --- | --- |
| Título modal | Ritual do Lethe |
| Corpo | As almas e os servos desta corrida se dissolvem. Restam os Óbolos e a memória de Mnemosyne. |
| Confirmar | Beber do Lethe |
| Cancelar | Recuar |

### Offline

| Peça | Copy |
| --- | --- |
| Título | Colheita na ausência |
| Corpo | O Submundo trabalhou {tempo}. {almas} almas chegaram à margem. |
| Teto | O véu fechou após {n} h — o restante da ausência não foi colhido. |
| CTA | Retomar o trono |

### Erros

| Caso | Copy |
| --- | --- |
| Sync 400 | Os Juízes recusaram o saldo declarado. O estado verdadeiro foi restaurado. |
| Rede | O Submundo não responde… a Estela local guarda a corrida. |
| Sessão | O Pacto expirou. As almas aguardam teu retorno. |

### Empty / máscaras

| Onde | Copy |
| --- | --- |
| Rio não revelado | Este rio ainda não aceita teu nome. |
| Sem juramentos visíveis | Os juramentos do Styx exigem servos — ou um punhado de almas. |
| Lethe cedo | O Lethe só se abre quando a corrida encontra a parede. |
| Panteão sem essência | Mnemosyne ainda não bebeu tua memória. |

---

## Ordem sugerida de PRs

1. Task 1 + 2 (schema + math) — sem UI.
2. Tasks 3–5 (simulação + IDB) — harness aceitável.
3. Tasks 6–8 + 10a (página jogável local).
4. Task 9 + 5b (autoritativo).
5. Tasks 11–13 (shell, conquistas, check).
6. Tasks 14–16 (a11y, juice, QA).

Não abrir o nav “O Despertar” na produção antes do PR 4 (senão o aluno joga só no IndexedDB e perde a lição server-authoritative). Até lá, a página pode existir mas a nav continua travada **ou** a rota exige flag `local`. Preferência: **nav só no PR 5**, quando o sync existir.

---

## Checklist de aceite

Funcional (GDD)

- [ ] Clique no Acheron aumenta Almas.
- [ ] Geradores T1–T6 com custos e taxas da tabela §4.1.
- [ ] Preço segue `Base × 1.15^n`; lote 10/100/Máx usa série, não atalho linear.
- [ ] SPS da HUD = fórmula §3.3 (conferir com 2 geradores + 1 juramento + 1 óbolo).
- [ ] Juramentos ×2 aplicam no alvo certo e resetam no Lethe.
- [ ] Ritual só com `obolsGain ≥ 1`; reseta almas/geradores/juramentos; mantém óbolos, essência, talentos, lifetime, milestones.
- [ ] `PrestigeBonus = 1 + obols×0.05×Mnemosyne`.
- [ ] Essência e os 8 talentos do Panteão.
- [ ] Offline 8 h / 80% (e 12 h / 100% com talentos).
- [ ] Loop RAF 60 Hz com panic; aba em background não explode.
- [ ] Sync 30 s + compras; recusa saldo hackeado no DevTools após F5 (estado volta ao server).
- [ ] Três colunas no desktop; rios se revelam; Códice registra os marcos.

Ecossistema

- [ ] Login obrigatório; ARG `/submundo` intacto.
- [ ] Nav **O Despertar** no lugar do Minigame; sem “Almas Registradas” no jogo.
- [ ] Preview no Painel.
- [ ] Conquistas no Álbum; hidden Arquiteto só com Códice legítimo.
- [ ] `npm run check` inclui os smokes novos.
- [x] Migration aplicada; `stateGet` cria linha.

Qualidade

- [ ] Sem `innerHTML` a 60 Hz.
- [ ] Números grandes não viram `1e+21` cru na HUD.
- [ ] Reduced motion respeitado.
- [ ] Mobile jogável (ceifar + comprar T1).

---

## Riscos e mitigações

| Risco | Mitigação |
| --- | --- |
| `Number` JS quebra a economia | Decimal por string desde a Task 2 |
| `progress.js` vira 4 k linhas | API dedicada |
| Confusão Almas (admin) vs Almas (jogo) | Nomes de rota diferentes; copy congelada |
| Aluno acha que o ARG é o clicker | URL `/pages/despertar.html`; nunca `/submundo/` |
| Autoclicker / DevTools | Cap 20 CPS + teto SPS×Δt×1.05 no server |
| Double offline (local + server) | Catch-up só a partir de `last_sync_at` autoritativo |
| Nav 7 itens estoura mobile | Densidade já prevista no CSS do shell; testar Task 14 |
| Primeiro prestígio em 1e9 parece longe | Curva do GDD é intencional; Lethe **prévia** em 1e8 ensina a parede sem mentir a fórmula |
| GDD pede Inter | Ignorado de propósito — tokens do curso vencem |

---

## Notas de implementação (detalhe que o GDD não fecha)

1. **Amortização na UI:** mostrar `T_amort ≈ preço_atual / produção_da_próxima_unidade` no card do gerador (olho avançado / título). Valores iniciais da tabela GDD são documentação de balance, não um campo persistido.
2. **Entity vs upgrades:** `UpgradeMult_i` vive no estado (produto dos juramentos ativos), não hardcoded no `Entity`.
3. **Buy Máx:** calcular `n` máximo tal que a soma geométrica `≤ souls` (busca fechada da série, não loop de 10k iterações sem teto; teto de segurança 10_000 unidades por clique de compra).
4. **Render alpha:** interpolar só o display de almas entre ticks; geradores são discretos.
5. **Service worker:** não. Offline = catch-up matemático, não PWA.
6. **Cheat harness:** query `?harness=1` **somente** se `location.hostname === 'localhost'` para QA da Task 8 (dar almas). Morto em produção.
7. **Grant de XP:** somar em `users.xp` com o mesmo `levelForXp` do catálogo; nunca o cliente soma XP.

---

## Critério de “GDD implementado”

O ciclo só se encerra quando **todas** as linhas da tabela [Mapa GDD → tasks](#mapa-gdd--tasks-rastreio) têm task marcada feita **e** o [checklist de aceite](#checklist-de-aceite) está verde. Lacunas que este plano preenche (juramentos, Panteão, clique, Códice, ids, auth) fazem parte do aceite — não são “extras opcionais”.
