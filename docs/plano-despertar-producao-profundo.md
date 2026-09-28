# Plano — Despertar Produção Profunda

**Status:** planejamento — **Fases A–F feitas** (0F + F1–F3)  
**Data:** 2026-09-28  
**Pai:** [`plano-hades-despertar.md`](./plano-hades-despertar.md) (inventário de produção)  
**Vizinhos:** [`despertar-sync/00-master-plan.md`](./despertar-sync/00-master-plan.md) · [`plano-despertar-aureolas-letreiro-shiny-hud-juizo.md`](./plano-despertar-aureolas-letreiro-shiny-hud-juizo.md) · [`assets/despertar/PEDIDOS-MESTRE.md`](../assets/despertar/PEDIDOS-MESTRE.md)

**Objetivo:** Pacote de produção para turma ao vivo — **pausa com timer durante a aula**, mais **divertimento** (conquistas, cosméticos/VFX, profundidade Lethe/Bancada), e **UX pedagógica** (Códice como livro no canto + subabas de permanentes).

**Não reabre:** anti-cheat de almas, fórmula de prestígio √, RNG shiny no server, wipe de `despertar_states` ao selar, ARG `/submundo`.

---

## Índice de fases

| Prioridade | Fase | Foco | Bloqueia |
| --- | --- | --- | --- |
| **P0** | **A** — Véu da Aula (pausa temporária + timer) | Ops em sala | Nada; faz primeiro |
| **P1** | **B** — Códice Livro (widget + dicas) | Pedagogia / presença | Pode ∥ A após Task 0 |
| **P1** | **C** — Subabas permanentes | UX Mnemosyne + Bancada | Antes de F (loja mais cheia) |
| **P2** | **D** — Conquistas divertidas | Álbum + Juízo | Após A estável (gate/awards) |
| **P2** | **E** — Cosméticos + VFX | Mundo / Foice | Após C opcional; independente de D |
| **P3** | **F** — Lethe & Bancada profundos | Re-jogabilidade | Após C (subabas) |

```text
[ A Véu da Aula ] ──► (ops live)
        │
        ├──► [ B Códice Livro ]          (∥)
        ├──► [ C Subabas ] ──► [ F Lethe/Bancada ]
        ├──► [ D Conquistas ]
        └──► [ E Cosméticos/VFX ]
```

---

## Task 0 global — decisões a congelar

Antes do primeiro PR de cada fase, marcar a linha correspondente.

| # | Tema | Default sugerido | Fase | Status |
| --- | --- | --- | --- | --- |
| **G1** | Pausa ≠ wipe | Pausar **nunca** apaga `despertar_states`; só bloqueia jogar / sync mutante | A | **Congelado** (0A) |
| **G2** | Modelo de gate | `lesson_gates` gate_key `classroom_pause` + col `meta jsonb` — ver A-D1 | A | **Congelado** (0A) |
| **G3** | Relógio | Timer **server-authoritative** (`pause_until` ISO UTC); cliente só exibe countdown | A | **Congelado** (0A) |
| **G4** | Admin na pausa | Admin **entra e joga**; aluno vê véu + timer + motivo | A | **Congelado** (0A) |
| **G5** | Offline durante pausa | Catch-up **congela** no instante do selo (não acumula SPS enquanto pausado) | A | **Congelado** (0A) |
| **G6** | Códice | Aba lista permanece; destaque = **livro flutuante**; aba vira arquivo/histórico | B | **Congelado** (0B) |
| **G7** | Subabas | Mesmo padrão em **Panteão** e **Bancada**: `Disponíveis` \| `Comprados` | C | **Congelado** (0C) |
| **G8** | XP novas conquistas | Família `despertar`, 5–40 XP; teto extra ≤ ~400 além das 12 atuais | D | **Congelado** (0D: +190 XP / 12 ids) |
| **G9** | Cosméticos | Continuam **ligados a Juramentos/Bancada** (não shop separado P0); VFX respeita `prefers-reduced-motion`; **0E:** +10 novos (+2 existentes = 12) | E | **Congelado** (0E) |
| **G10** | Balance F | Novos talentos/Bancada **fracos** (QoL / starting / Juízo ≫ SPS bruto); **0F:** +5 talentos · +4 Bancada; B3 adiado | F | **Congelado** (0F) |

---

## Estado atual (âncora)

| Superfície | Hoje |
| --- | --- |
| Gate | `lesson_gates (despertar, published)` booleano; UI selado estática; **sem timer** |
| Conquistas | **24** `despertar_*` (D2/D3); P1 adiado |
| Cosméticos | **12** P0 draw/CSS; WebP open em `cosmetics/` (E3) |
| Mnemosyne | **13** talentos (F1) |
| Bancada | **8** itens (F2); UX Lethe F3 feita |
| Códice | Aba **Arquivo** + livro + tip; **21** `edu-logs` (B3); Arquiteto exige os 21 elegíveis |
| Selar Acheron | Toggle dashboard; **não** mostra motivo/timer ao aluno |

---

# Fase A — Véu da Aula (pausa temporária + timer)

**Estado da fase:** Task **0A congelada** · **A1–A4 feitas** (2026-09-28) · Fase A completa

## Objetivo

Durante a aula, o Mestre **pausa o Acheron** por N minutos (ou até horário), com:

1. Progresso **preservado**.
2. Aluno vê **motivo** (“Aula em andamento”) + **countdown**.
3. Ao expirar (ou Mestre liberar), o jogo **reabre sozinho** sem wipe.
4. Sync mutante / Juízo / compras **bloqueados** enquanto pausado (igual selado).

## Task 0A — decisões

**Status:** ✅ **congelada** (2026-09-28)

| # | Tema | Decisão congelada | Status |
| --- | --- | --- | --- |
| **A-D1** | Onde guardar | Gate_key **`classroom_pause`** em `lesson_gates` (`lesson_id=despertar`) + coluna nova **`meta jsonb NOT NULL DEFAULT '{}'`**. **Não** misturar no `published`. **Não** criar tabela `despertar_ops`. **Não** persistir pausa só em KV (KV = cache). | **Congelado** |
| **A-D2** | Forma do timer | Campo **`meta.pause_until`** (ISO 8601 UTC). Presets do Mestre calculam `now + N min` → UTC no server. | **Congelado** |
| **A-D3** | Motivo | `meta.reason` string trim, **1–120** chars. Presets fixos + custom. Default: `Aula em andamento`. | **Congelado** |
| **A-D4** | Auto-unpause | **Lazy** em toda leitura de gate: se `released && pause_until <= now` → pausa **inefetiva** (jogo aberto). Sem cron Edge no MVP. Clear explícito do Mestre zera row; lazy pode opcionalmente `released=false` em write de manutenção (não obrigatório no A1). | **Congelado** |
| **A-D5** | Nav | Item **O Despertar** permanece clicável → `pages/despertar.html` com **véu** (não some da nav; não redirect cego). | **Congelado** |

**Checklist Task 0A**

- [x] A-D1…A-D5 congelados
- [x] Copy do véu aprovada (PT) — ver tabela abaixo
- [x] Confirmado: `#btn-reset-despertar` **não** é o botão de pausa (wipe ≠ véu)
- [x] G1–G5 alinhados a estas decisões

### Contrato A-D1 (detalhe congelado)

**Row**

| Campo | Uso na pausa |
| --- | --- |
| `lesson_id` | `'despertar'` |
| `gate_key` | `'classroom_pause'` |
| `released` | `true` = Mestre armou pausa; `false` = liberado / sem pausa |
| `meta` | JSON da pausa (abaixo) |
| `released_by` / `released_at` | Auditoria (quem armou / quando) |

**`meta` shape**

```json
{
  "pause_until": "2026-09-28T16:30:00.000Z",
  "reason": "Aula em andamento",
  "pause_started_at": "2026-09-28T15:45:00.000Z"
}
```

- `pause_until` — obrigatório se `released=true`; ISO UTC.
- `reason` — obrigatório se `released=true`; após sanitize 1–120.
- `pause_started_at` — obrigatório no set; âncora para **G5** (offline não farmá o intervalo pausado).

**Pausa efetiva (aluno)**

```text
playBlocked =
  !isAdmin
  && (
    !published
    || (classroom_pause.released === true && Date(pause_until) > serverNow)
  )
```

**Códigos de erro (distintos)**

| Código | Quando | UI |
| --- | --- | --- |
| `despertar_sealed` | `!published` | Véu “Acheron ainda está selado” (hoje) |
| `despertar_paused` | published mas pausa efetiva | Véu da Aula (timer + motivo) |

Admin (`role === admin`) **nunca** é bloqueado por pause nem por published (igual hoje).

**Defaults / API**

- `LESSON_GATES.despertar` passa a `{ published: false, classroom_pause: false }`.
- Actions admin dedicadas (preferência A1): `despertarPauseSet` / `despertarPauseClear` em `/api/despertar` **ou** progress — desde que invalidem cache.
- Cache: memo + KV chave separada `fjd:gate:despertar:classroom_pause` (espelho serializado `{released, meta, serverNow?}`); invalidate no set/clear.
- `stateGet` **sempre** permitido com sessão válida: devolve `{ pause, published, serverNow }` mesmo se `playBlocked` (monta o véu). Actions mutantes → 403 + código acima.
- Pausar **não** altera `published`. Liberar pausa **não** publica o Acheron.

**Presets de motivo (A-D3)**

| Id | Label UI | `reason` gravado |
| --- | --- | --- |
| `aula` | Aula em andamento | `Aula em andamento` |
| `explicacao` | Explicação do Mestre | `O Mestre está explicando — o Acheron aguarda.` |
| `intervalo` | Intervalo | `Intervalo — o Submundo faz silêncio.` |
| `custom` | Outro… | texto livre (1–120) |

**Presets de duração (A3)**

`15` · `30` · `45` · `60` minutos + “até horário” (datetime-local → UTC no server). Máximo: **4 h** a partir de `serverNow` (rejeitar `pause_until` além disso).

### Copy do véu (aprovada)

| Peça | Texto |
| --- | --- |
| Título | O Acheron guarda silêncio |
| Motivo default | Aula em andamento |
| Corpo | As almas aguardam. **Tua Estela está intacta.** |
| Timer | Reabre em {mm}:{ss} |
| Horário | Liberação prevista: {HH:MM} (horário local) |
| Expirado | O véu se abre… |
| CTA expirado | Retomar o trono |
| Selado (não pausa) | O Acheron ainda está selado. *(inalterado)* |

### Separação destrutiva (congelada)

| Controle | Efeito |
| --- | --- |
| Abrir / Selar Acheron | `published` on/off |
| **Pausar aula** / Liberar agora | `classroom_pause` + meta |
| **Resetar Estelas** (`#btn-reset-despertar`) | Wipe `despertar_states` dos alunos — **outro botão**, outro confirm |

## Task A1 — Schema + API de pausa

**Depende de:** 0A ✅  
**Status:** ✅ **feita** (2026-09-28)

**Faz**

- [x] Migration: `ALTER TABLE lesson_gates ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}'::jsonb;` + espelho em `db/setup.sql`.
- [x] `LESSON_GATES.despertar.classroom_pause` default `false`; `isGateable` aceita a chave.
- [x] `api/_lib/despertar-gate.js`: `getDespertarPauseState()`, `isDespertarPauseActive(pause, now)`, `isDespertarPlayBlocked(user, published, pause)`; cache KV da pausa + invalidate.
- [x] Actions admin: `pauseSet` / `pauseClear` em `/api/despertar` (body: `minutes` **ou** `pauseUntil`, `reasonPreset` / `reason`); helpers `despertarPauseSet` / `despertarPauseClear` em `js/api.js`.
- [x] Clamp: `pause_until` ∈ `(now, now+4h]`; reason 1–120.
- [x] Actions mutantes em `api/despertar.js` respeitam `despertar_paused` / `despertar_sealed` (admin bypass).
- [x] `stateGet` com Acheron **publicado** devolve `pause` + `serverNow` mesmo sob pausa (read-only). Selado continua 403 `despertar_sealed` (não cria Estela).

**Não faz:** apagar saves; alterar `published`; cron Edge; UI do véu (A2); dashboard Mestre (A3).

**Testes:** `tests/despertar-pause-smoke.mjs` — verde (helpers + wiring). No `npm run check`.

**Ops:** aplicar `db/migrate-2026-09-28-despertar-classroom-pause.sql` no Supabase antes de usar `pauseSet` em Preview/Prod.

**Pronto quando:** admin set 2 min → aluno mutação `despertar_paused`; após clock mock ≥ `pause_until` → mutação ok. *(helpers cobertos no smoke; E2E com DB fica para QA A2/A3.)*

## Task A2 — UI do Véu (aluno)

**Depende de:** A1 ✅  
**Status:** ✅ **feita** (2026-09-28)

**Faz**

- [x] Estender selado via `presentSealedVeil` + pausa via `presentClassroomPauseVeil` (`js/hades-despertar/ui/pauseVeil.js`).
- [x] Boot: após `published`, `stateGet` probe → se `pause.active`, mostra Véu (aluno); admin segue jogando.
- [x] Countdown com `serverOffset` (`serverNow − Date.now()`); copy 0A (“Tua Estela está intacta.”).
- [x] Ao zerar: re-`stateGet` → se `!pause.active`, `location.reload()` (boot limpo sem F5 manual).
- [x] Sync/`onRejected` com `despertar_paused` abre o mesmo Véu mid-session.
- [x] `prefers-reduced-motion`: sem pulse (classe `--pulse` desligada).

**Testes:** `tests/despertar-pause-ui-smoke.mjs` — verde. No `npm run check`.

## Task A3 — Controles do Mestre (dashboard)

**Depende de:** A1 ✅  
**Status:** ✅ **feita** (2026-09-28)

**Faz**

- [x] Painel `#master-despertar-pause` no dashboard (separado de Limpar Estelas).
- [x] Pausar 15 / 30 / 45 / 60 min + até horário (`datetime-local` → UTC).
- [x] Motivo: presets 0A + custom (1–120).
- [x] Liberar agora (confirm leve).
- [x] Status: “Pausado até HH:MM — {reason}” / “Sem pausa de aula” via `stateGet`.

**Testes:** `tests/despertar-pause-admin-smoke.mjs` — verde. No `npm run check`.

## Task A4 — Offline / heartbeat durante pausa

**Depende de:** A1 + A2

**Faz**

- [x] Enquanto `pause.active`, cliente **não** aplica catch-up de SPS.
- [x] Ao reabrir: catch-up **exclui** `[pause_started_at, pause_until]` (usar `pause_started_at` do meta; se ausente, clamp conservador = não creditar desde `last_sync_at` se intersecta pausa).
- [x] Bootstrap/nav: flag opcional `despertarPauseActive` para badge “Em aula” (P1 visual; pode ser stub no A4).

**Testes:** `tests/despertar-pause-offline-smoke.mjs` — verde. No `npm run check`.

**Aceite Fase A**

- [x] Pausa 30 min em sala: alunos veem timer; admin joga; F5 não apaga save.
- [x] Timer expira → alunos entram sem ação do Mestre.
- [x] `despertarResetStudents` continua só no botão destrutivo.
- [x] `published=false` ainda mostra selado (não o véu de aula), mesmo com pause row residual.
# Fase B — Códice Livro (widget no canto)

**Estado da fase:** Task **0B congelada** · **B1–B3 feitas** (2026-09-28) · Fase B completa

## Objetivo

O Códice deixa de ser “mais uma aba esquecida” e vira um **livro no canto** que:

1. Pulsa / brilha quando há log **novo**.
2. Mostra **dica curta** da mecânica recém-encontrada.
3. Abre um painel/drawer com o histórico (conteúdo atual do Códice).
4. Continua alimentando `despertar_arquiteto_do_loop`.

## Task 0B — decisões

**Status:** ✅ **congelada** (2026-09-28)

| # | Tema | Decisão congelada | Status |
| --- | --- | --- | --- |
| **B-D1** | Posição / camada | Botão `#despertar-codex-book` no **canto inferior-esquerdo da coluna Mundo** (`.despertar-col--realm` / world mount), `position: absolute` (ou sticky no mount), `left`/`bottom` com `max(..., env(safe-area-inset-*))`. **z-index: 35** — acima do mundo/órbita (≤4), **abaixo** de toast tutorial (48), Juízo CTA/modais e overlays Lethe/harvest (**80**). Nunca cobre modal. | **Congelado** |
| **B-D2** | Aba Codex | **Manter** `#tab-codex` + `#panel-codex` no tablist. Label da aba → **Arquivo** (aria: “Arquivo do Códice”). Livro = atalho: abre o **mesmo** conteúdo (drawer ou troca para o painel). Não remover a aba no MVP. | **Congelado** |
| **B-D3** | Dica no unlock | Popover/toast ancorado ao livro (**5 s** default, faixa 4–6). Mapa `EDU_LOG_TIP` em `edu-logs.js` (1 frase, **≤90** chars). Badge `N` no livro enquanto houver unseen. `prefers-reduced-motion`: **só badge** (sem pulse/bounce). Preferir tip no livro; `interruptTicker` só se já existir path para o id (não obrigar ticker para todos). | **Congelado** |
| **B-D4** | Conteúdo novo | **+5** logs de mecânica (ids abaixo). Entrar em `EDU_LOGS` + `GameState.unlockLogs` + `computeEligibleEduLogs`. Hidden **Arquiteto** exige **todos** os ids (16 atuais + 5). Sem estourar XP do Arquiteto (continua 30). | **Congelado** |
| **B-D5** | Unseen / badge | `unseenCount` = ids em `eduLogsSeen` ainda não “lidos” no widget. Persistência **local** `localStorage` chave `despertar:codex:seenDrawer:{userId}` (JSON array de ids). Abrir drawer **ou** aba Arquivo → marca os unlocked atuais como vistos (zera badge). Não vai na Estela/server. | **Congelado** |

**Checklist Task 0B**

- [x] B-D1…B-D5 congelados
- [x] Catálogo dos 5 logs novos + tips rascunho (abaixo)
- [x] G6 alinhado a estas decisões
- [x] Confirmado: Arquiteto = `EDU_LOG_IDS.length` completo (server `computeEligible` ∩ seen)

### Contrato B-D1 (widget)

| Peça | Valor |
| --- | --- |
| Id | `#despertar-codex-book` |
| Tipo | `<button type="button">` |
| Ícone | SVG/CSS livro simples (sem emoji); estado `is-pulse` quando `unseenCount > 0` |
| Badge | filho `.despertar-codex-book__badge` — número `1`…`9+` |
| `aria-label` | `Códice do Loop` se N=0; `Códice do Loop — {n} páginas novas` se N>0 |
| Clique | Abre drawer `#despertar-codex-drawer` (preferido) **ou** seleciona `#tab-codex` se drawer adiado na mesma PR — **B1 deve entregar drawer** |
| Esc / backdrop | Fecha drawer; focus volta ao botão |
| Focus trap | Sim, enquanto drawer aberto (padrão Juízo leve) |

Drawer lista = mesma fonte que `#renderCodex` (`buildCodexView` / `EDU_LOGS` + seen). Não duplicar copy divergente.

### Contrato B-D2 (aba)

| Antes | Depois |
| --- | --- |
| Label `Códice` | Label **Arquivo** |
| `aria-controls="panel-codex"` | Inalterado |
| Painel | Continua lista locked/unlocked |

Smoke `despertar-pages-smoke` / `despertar-codex-smoke`: atualizar string da aba.

### Contrato B-D3 (tips)

```js
// edu-logs.js — shape congelado
export const EDU_LOG_TIP = Object.freeze({
  log_input: 'Cada clique altera o estado — começo do loop.',
  // … ≤90 chars; tip ausente ⇒ sem popover (só badge)
});
```

| Regra | Valor |
| --- | --- |
| Duração | **5000** ms (constante `CODEX_TIP_MS`) |
| Fila | Uma tip por vez; unlocks em rajada → tip do **mais recente** pedagógico; badge soma todos |
| Set com tip obrigatória (B2) | `log_input` + os 5 novos (B-D4) + reusar frase curta nos ticker ids existentes se couber |
| Reduced motion | Sem `is-pulse`; badge permanece |

### Catálogo B-D4 (5 logs novos)

| Id | Título | Body (1 linha) | Elegibilidade server (rascunho B3) |
| --- | --- | --- | --- |
| `log_reap_power` | A Foice e o clique | O clique é input; potência da Foice multiplica o ganho por ação. | `clickCount ≥ 25` **ou** `milestones.reap` (após tip de `log_input`) |
| `log_buy_modes` | Modos de compra | Mercado: ×1 / ×10 / máx. — o input muda o quanto você gasta. | 1 compra de gerador **ou** `buyMode` ≠ `'1'` já usado |
| `log_sealed_juramentos` | Juramentos selados | Alguns juramentos ficam selados até a máquina crescer. | `upgrades.length ≥ 1` **ou** Styx aberto (`log_styx_open` elegível) |
| `log_verdicts_milestone` | Vereditos do Juízo | Vereditos compram sentenças na Bancada — meta-moeda do loop. | `verdictCount ≥ 1` **ou** 1ª compra Bancada |
| `log_obols_bonus` | Óbolos e memória | Óbolos vêm do Lethe; alimentam bônus permanente entre corridas. | `prestigeCount ≥ 1` **ou** `obols > 0` |

**Tips rascunho (≤90 chars)**

| Id | Tip |
| --- | --- |
| `log_reap_power` | A Foice multiplica o clique — potencia o input. |
| `log_buy_modes` | Troca ×1 / ×10 / máx. no Mercado para gastar melhor. |
| `log_sealed_juramentos` | Juramentos selados abrem conforme a máquina cresce. |
| `log_verdicts_milestone` | Vereditos do Juízo compram sentenças na Bancada. |
| `log_obols_bonus` | Óbolos do Lethe são memória entre catábases. |

**Arquiteto:** após B3, `EDU_LOG_IDS.length === 21`. Client `unlockLogs` + server `computeEligibleEduLogs` + smokes Arquiteto/codex atualizados na mesma entrega B3 (pode ir na PR de B1–B2 se couber).

### Contrato B-D5 (unseen)

```text
unseen = eduLogsSeen.filter(id => !drawerSeenSet.has(id))
badge  = unseen.length === 0 ? hidden : min(unseen.length, 9) + (unseen.length > 9 ? '+' : '')
```

- Não sincronizar `drawerSeen` com o servidor.
- Troca de userId → outra chave (não vazar badge entre contas no mesmo browser).

## Task B1 — Widget livro + badge

**Depende de:** 0B ✅  
**Status:** ✅ **feita** (2026-09-28)

**Faz**

- [x] HTML/CSS: `#despertar-codex-book` (botão, ícone livro, badge) — contrato B-D1.
- [x] Estado: `unseenCount` per B-D5.
- [x] Clique → abre drawer/painel (focus trap, Esc fecha).
- [x] `aria-label`: “Códice do Loop — {n} páginas novas”.
- [x] Aba relabel **Arquivo** (B-D2).

**Testes:** `tests/despertar-codex-book-smoke.mjs` — verde. No `npm run check`.

## Task B2 — Dicas no unlock

**Depende de:** 0B ✅ · B1  
**Status:** ✅ **feita** (2026-09-28)

**Faz**

- [x] No `unlockLogs` / render: se log novo ∈ set pedagógico, tip no livro (B-D3).
- [x] Mapa `EDU_LOG_TIP` (1 frase, ≤90 chars) em `edu-logs.js`.
- [x] Reduced-motion: só badge, sem bounce.

**Testes:** `tests/despertar-codex-book-smoke.mjs` (seção B2) — verde.

## Task B3 — Logs extras de mecânica (opcional na mesma PR)

**Depende de:** 0B ✅  
**Status:** ✅ **feita** (2026-09-28)

**Faz**

- [x] Ids congelados: `log_reap_power`, `log_buy_modes`, `log_sealed_juramentos`, `log_verdicts_milestone`, `log_obols_bonus`.
- [x] Elegibilidade server em `computeEligibleEduLogs` + smoke Arquiteto atualizado.
- [x] Atualizar hidden: **todos** os ids (antigos + novos) para Arquiteto.

**Testes:** `tests/despertar-codex-smoke.mjs` · `tests/despertar-achievements-smoke.mjs` — verdes.

**Aceite Fase B**

- [x] Aluno ceifa → livro pulsa → abre → lê “O clique é o input”.
- [x] Aba Arquivo ainda lista tudo.
- [x] Juízo/modal cobrem o livro (z-index).

---

# Fase C — Subabas Disponíveis / Comprados

**Estado da fase:** Task **0C congelada** · **C1–C2 feitas** (2026-09-28) · Fase C completa

## Objetivo

Permanentes (Panteão Mnemosyne + Bancada do Juiz) em duas subabas:

| Subaba | Conteúdo |
| --- | --- |
| **Disponíveis** | Ainda não comprados (affordable primeiro; pobres depois; locked por custo no fim) |
| **Comprados** | Já em `talents` / `verdictPurchases` — só leitura + efeito ativo |

## Task 0C — decisões

**Status:** ✅ **congelada** (2026-09-28)

| # | Tema | Decisão congelada | Status |
| --- | --- | --- | --- |
| **C-D1** | Onde | Sub-`role="tablist"` **dentro** do bloco Panteão (`#panel-lethe` / `#lethe-open`, sob `#pantheon-heading`) **e** dentro de `#panel-bancada` (sob o HUD de Vereditos / hint). **Não** criar abas de domínio novas. Ids: `#pantheon-subtabs` / `#bancada-subtabs`. | **Congelado** |
| **C-D2** | Styx | **Fora** desta fase. Strip `#styx-upgrade-strip` + Selados em Stats **inalterados**. Juramentos continuam one-shot selados — sem subabas no Mercado/Styx no MVP C. | **Congelado** |
| **C-D3** | Empty Disponíveis | Panteão: **“O Panteão está completo.”** · Bancada: **“A Bancada não tem mais sentenças.”** (só quando catálogo inteiro está em Comprados). | **Congelado** |
| **C-D4** | Ordenação Disponíveis | 1) **Affordable** (pode comprar agora) · 2) **Vistos mas pobres** (conhecido / unlocked por essência|vereditos insuficientes) · 3) **Locked** (requisito não cumprido, se houver). Empate: ordem do catálogo (`TALENTS` / `VERDICT_SHOP`). | **Congelado** |
| **C-D5** | Default + memória | Ao abrir o painel: subaba **Disponíveis** se `countDisponiveis > 0`, senão **Comprados**. Sem persistir subaba em `localStorage` (sessão UI só). Contadores no label: `Disponíveis (n)` / `Comprados (n)`. | **Congelado** |
| **C-D6** | Comprados UX | Card **só leitura**: nome + blurb/efeito + badge **“Ativo”**. Sem botão comprar. Empty Comprados: Panteão **“Ainda não selaste nenhum talento.”** · Bancada **“Nenhuma sentença comprada.”** | **Congelado** |

**Checklist Task 0C**

- [x] C-D1…C-D6 congelados
- [x] Copy empty (Disponíveis + Comprados) aprovada
- [x] G7 alinhado a estas decisões
- [x] Confirmado: Styx/Mercado fora do escopo C

### Contrato C-D1 (markup)

**Panteão** (sob `#pantheon-heading`, só quando Lethe aberto):

```html
<div class="despertar-subtabs" id="pantheon-subtabs" role="tablist" aria-label="Panteão de Mnemosyne">
  <button role="tab" id="pantheon-tab-available" aria-controls="pantheon-panel-available">Disponíveis (n)</button>
  <button role="tab" id="pantheon-tab-owned" aria-controls="pantheon-panel-owned">Comprados (n)</button>
</div>
<div role="tabpanel" id="pantheon-panel-available" aria-labelledby="pantheon-tab-available">
  <p class="despertar-empty" id="pantheon-empty-available" hidden></p>
  <ul class="despertar-market-list" id="pantheon-list-available"></ul>
</div>
<div role="tabpanel" id="pantheon-panel-owned" aria-labelledby="pantheon-tab-owned" hidden>
  <p class="despertar-empty" id="pantheon-empty-owned" hidden></p>
  <ul class="despertar-market-list" id="pantheon-list-owned"></ul>
</div>
```

**Bancada:** espelho com prefixo `bancada-` (`#bancada-subtabs`, `#bancada-list-available`, …).

- Reusar classes de card atuais (`.despertar-market-list` / tip hover) onde couber.
- `#pantheon-list` / `#bancada-list` legados: **substituir** pelos dois lists (C1/C2 atualizam smokes que referenciam o id antigo).
- Lethe **fechado** (`#lethe-locked`): subtabs do Panteão **não** aparecem (só mensagem de parede).

### Contrato teclado / a11y

| Regra | Valor |
| --- | --- |
| Setas | ←/→ ou ↑/↓ entre subabas do **mesmo** tablist (padrão `bindTabs`) |
| Home / End | primeira / última subaba |
| Esc | **não** fecha subaba (só drawer/modais) |
| `aria-selected` / `tabindex` | igual abas do Domínio |

Helper sugerido: `bindSubTabs(root)` em `index.js` ou módulo UI compartilhado — **dois** tablists independentes (Panteão ≠ Bancada).

### Contrato C-D4 (filtro)

```text
ownedPantheon  = state.talents.includes(id)
ownedBancada   = state.verdictPurchases.includes(id)

disponiveis    = catálogo.filter(!owned)
comprados      = catálogo.filter(owned)  // ordem = catálogo
```

Affordable = `canBuy` atual (essência / vereditos + requisitos). Locked sem requisito extra no catálogo atual → tratar como “pobre” se `!canBuy`.

### Copy empty (congelada)

| Superfície | Empty |
| --- | --- |
| Panteão · Disponíveis (tudo comprado) | O Panteão está completo. |
| Panteão · Comprados (nenhum) | Ainda não selaste nenhum talento. |
| Bancada · Disponíveis (tudo comprado) | A Bancada não tem mais sentenças. |
| Bancada · Comprados (nenhum) | Nenhuma sentença comprada. |
| Panteão · Lethe fechado | *(inalterado)* `Mnemosyne ainda não bebeu tua memória.` / locked Lethe |

Badge Comprados: texto **Ativo** (não “Comprado” — evita eco com a subaba).

## Task C1 — Panteão subabas

**Depende de:** 0C ✅  
**Status:** ✅ **feita** (2026-09-28)

**Faz**

- [x] Markup: `role="tablist"` `Disponíveis` \| `Comprados` sob o título Mnemosyne — contrato C-D1.
- [x] `UIRenderer.#renderLethe` / pantheon: filtrar por owned + sort C-D4.
- [x] Contadores no tab: `(n)` disponíveis / `(n)` comprados.
- [x] Teclado: setas nas subabas (mesmo padrão `bindTabs`).
- [x] Empty copy C-D3 / C-D6.

**Testes:** `tests/despertar-shop-tabs-smoke.mjs` (C1) — verde. No `npm run check`.

## Task C2 — Bancada subabas

**Depende de:** 0C ✅ · C1 (padrão reutilizado)  
**Status:** ✅ **feita** (2026-09-28)

**Faz**

- [x] Idem para `#panel-bancada`.
- [x] Comprados mostram efeito permanente (blurb + “Ativo”).

**Testes:** `tests/despertar-shop-tabs-smoke.mjs` — verde (C1+C2).

**Aceite Fase C**

- [x] Comprar talento some de Disponíveis e aparece em Comprados sem reload.
- [x] Mobile: subabas usáveis com polegar.

---

# Fase D — Conquistas divertidas

**Estado da fase:** ✅ **feita** (0D · D1 · D2 · D3 — 2026-09-28)

## Objetivo

Expandir o Álbum do Despertar (~12 → **~24** no P0, resto P1) com marcos engraçados / Juízo / economia / hidden, sem rivalizar Soberano.

## Task 0D — decisões

**Status:** ✅ **congelada** (2026-09-28)

| # | Tema | Decisão congelada | Status |
| --- | --- | --- | --- |
| **D-D1** | P0 size | **Exatamente 12 novas** no P0 (11 públicas + 1 hidden). Catálogo total Despertar após D2: **24** ids (12 atuais + 11 + 1). Resto da lista proposta → **P1**. | **Congelado** |
| **D-D2** | Métricas / schema | P0 **só** usa campos já autoritativos (sem migration). `clickCount` / `maxBuyBiggest` / `juizoTieWins` / idle-sem-ceifa → **P1 + Task D1** (`stats jsonb` ou cols). | **Congelado** |
| **D-D3** | Artes | No D2: entradas em `game-catalog.json` + `assets/achievements/catalog.json`; art WebP = **placeholder** (copiar `despertar_primeira_alma.webp` ou arte da mesma raridade) até `PEDIDOS-MESTRE`. Não bloquear grant por arte. | **Congelado** |
| **D-D4** | XP / G8 | Soma XP das **12 novas** = **190**. Teto G8 respeitado (≪ 400 extra). Família `meta.family=despertar`. | **Congelado** |
| **D-D5** | Juízo ladder | P0: `juizo_1` + `juizo_10` (entre existentes `juizo_5` / `juizo_25`). `juizo_40` / `60` / `100` / empate → **P1**. Grant no mesmo path de eval (`juizoBestStreak` / shop). | **Congelado** |

**Checklist Task 0D**

- [x] Escolher **P0 = 12** novas (resto P1) — tabela abaixo
- [x] Confirmar métricas: P0 **sem** coluna nova; D1 (`stats jsonb`) feita antecipada p/ P1
- [x] Artes: placeholder WebP + catalog entries no D2
- [x] G8 alinhado (190 XP novas)

### P0 congelado (12 novas)

| Id | Nome | Gatilho (server) | XP | Raridade | Hidden |
| --- | --- | --- | ---: | --- | --- |
| `despertar_cem_almas` | Centúria | `lifetimeSouls ≥ 100` | 5 | stone | não |
| `despertar_mil_almas` | Milhares | `lifetimeSouls ≥ 1e3` | 10 | copper | não |
| `despertar_milhao` | Lamento em massa | `lifetimeSouls ≥ 1e6` | 20 | silver | não |
| `despertar_styx_primeiro` | Primeiro juramento | `upgrades.length ≥ 1` | 10 | copper | não |
| `despertar_styx_cinco` | Rio jurado | `upgrades.length ≥ 5` | 20 | silver | não |
| `despertar_shiny` | Negativo | `sum(shinyCounts) ≥ 1` | 15 | silver | não |
| `despertar_gold` | Áureo | `sum(goldCounts) ≥ 1` | 15 | silver | não |
| `despertar_catabase_3` | Três Lethes | `prestigeCount ≥ 3` | 30 | gold | não |
| `despertar_juizo_1` | Primeira audiência | `juizoBestStreak ≥ 1` | 5 | stone | não |
| `despertar_juizo_10` | Décima sentença | `juizoBestStreak ≥ 10` | 15 | copper | não |
| `despertar_bancada_cheia` | Bancada esgotada | `verdictPurchases` ⊇ `VERDICT_SHOP_IDS` (atual) | 25 | gold | não |
| `despertar_paciencia` | Colheita na ausência | `milestones.offline === true` **ou** proxy `lifetimeSouls ≥ 1000` já usado em edu-log offline — **preferir** `milestones.offline` (set no catch-up ≥ 1 h no D2) | 20 | silver | **sim** |

**XP P0 novas:** 190 · **Públicas novas:** 11 · **Hidden novas:** 1 (`paciencia`; Arquiteto já existe)

### P1 adiado (não implementar em D1–D3)

| Id | Motivo |
| --- | --- |
| `despertar_cem_cliques` | Exige `stats.clicks` / sync de `clickCount` (D1) |
| `despertar_lote_max` | Exige `stats.maxBuyBiggest` no buy autoritativo |
| `despertar_catabase_10` | Late; XP alto; depois de `catabase_3` estável |
| `despertar_juizo_40` / `_60` / `_100` | Ladder longa; evita diluir Juízo no Álbum cedo |
| `despertar_juizo_empate` | Exige `stats.juizoTieWins` no `juizoGuess` |
| `despertar_sem_clique` | Exige timer idle server-side |

### Contrato D-D2 (métricas P0)

| Conquista | Campo | Já existe? |
| --- | --- | --- |
| cem/mil/milhão | `lifetime_souls` | sim |
| styx_* | `upgrades_state` | sim |
| shiny / gold | `shiny_counts` / `gold_counts` | sim |
| catabase_3 | `prestige_count` | sim |
| juizo_1 / _10 | `juizo_best_streak` | sim |
| bancada_cheia | `verdict_purchases` | sim |
| paciencia | `milestones.offline` (JSON milestones) | sim no cliente; **D2** garantir set no catch-up offline ≥ 3600 s e persistência no sync |

**D1 (feita antecipada p/ P1):** `ALTER` → `stats jsonb NOT NULL DEFAULT '{}'` em `despertar_states` com shape:

```json
{
  "clicks": 0,
  "max_buy_biggest": 0,
  "juizo_tie_wins": 0
}
```

Só quando shipping P1 ids que dependem disso.

### Copy Álbum (rascunho D2 — nomes congelados; desc pode polir)

| Id | desc (1 linha) |
| --- | --- |
| `despertar_cem_almas` | Cem almas ceifadas ao longo das corridas. |
| `despertar_mil_almas` | Mil almas no lifetime do Submundo. |
| `despertar_milhao` | Um milhão de almas — o Lamento ecoa. |
| `despertar_styx_primeiro` | Selou o primeiro Juramento do Styx. |
| `despertar_styx_cinco` | Cinco juramentos selados no rio. |
| `despertar_shiny` | Contratou um servo Negativo. |
| `despertar_gold` | Contratou um servo Áureo. |
| `despertar_catabase_3` | Três vezes bebeu do Lethe. |
| `despertar_juizo_1` | Acertou a primeira sentença no minigame Juízo (≠ Juiz do Tártaro). |
| `despertar_juizo_10` | Melhor streak 10 no Juízo ClassInd. |
| `despertar_bancada_cheia` | Comprou todas as sentenças da Bancada. |
| `despertar_paciencia` | Colheu ao menos 1 h de ausência. |

### Ordem de implementação

1. **D1** ✅ — schema `stats` + hooks autoritativos (P0 não consome).
2. **D2** ✅ — eval + catalog + placeholders (P0 acima); paciencia: set `milestones.offline` no offline ≥ 1 h.
3. **D3** ✅ — ladder Álbum 1/5/10/25; copy Q16; grant early no `juizoGuess`.

## Task D1 — Schema de métricas auxiliares (se necessário)

**Depende de:** 0D ✅ · **só se P1** · **feita antecipada** (schema + hooks; P0 não consome)

**Faz**

- [x] Se P1 incluir empate/cliques/lote max: `stats jsonb` em `despertar_states` (`clicks`, `max_buy_biggest`, `juizo_tie_wins`).
- [x] Server incrementa só em paths autoritativos (`juizoGuess` tie → `juizo_tie_wins`; `validateSync` lote → `max_buy_biggest`; `bumpClicks` pronto, sem path de sync ainda).
- [x] **P0 não precisa desta task** (conquistas P0 usam campos já existentes).

**Entrega:** `db/migrate-2026-09-28-despertar-stats.sql` · `api/_lib/despertar-stats.js` · ROW_SELECT + RPC CASE · smoke `tests/despertar-stats-smoke.mjs`.

## Task D2 — Eval + catálogo + artes

**Depende de:** 0D ✅ · **feita** (2026-09-28)

**Faz**

- [x] 12 ids P0 em `data/game-catalog.json` + `assets/achievements/catalog.json` (+ WebP placeholder).
- [x] Regras em `despertar-achievements.js` (`DESPERTAR_PUBLIC_IDS` / `HIDDEN` + `evaluateDespertarAchievementIds`).
- [x] `milestones.offline` no catch-up ≥ 1 h (cliente + aceito no sanitize de milestones).
- [x] Smokes `despertar-achievements-smoke.mjs` estendidos.
- [x] Toast via `presentGrimoireAwards` (já existe).

**Entrega:** 24 ids Despertar (22 públicas + 2 hidden) · +190 XP · placeholders WebP.

## Task D3 — Juízo milestones ↔ conquistas

**Depende de:** 0D ✅ · D2 ✅ · **feita** (2026-09-28)

**Faz**

- [x] Confirmar limiares: existentes s5/s25 + novos `juizo_1` / `juizo_10`; Vereditos shop inalterados.
- [x] Copy do Álbum diferencia gerador “Juiz do Tártaro” vs minigame (já há blurb Q16).

**Entrega:** `DESPERTAR_JUIZO_STREAK_THRESHOLDS` · copy Álbum Q16 · grant early já em `juizoGuess`.

**Aceite Fase D**

- [x] P0 novas aparecem no Álbum; XP server-side; hidden não vazam nome.
- [x] Teto XP família ainda ≪ Soberano (G8: +190).

---

# Fase E — Cosméticos + VFX (gameplay visual no tempo)

**Estado da fase:** ✅ **feita** (0E · E1 · E2 · E3 — 2026-09-28)

## Objetivo

De ~2 accessories para um **pacote** em que Juramentos (e 1 Bancada) **mudam** Foice, órbita e prateleiras — Cookie-like, sem mentir o saldo.

## Task 0E — decisões

**Status:** ✅ **congelada** (2026-09-28)

| # | Tema | Decisão congelada | Status |
| --- | --- | --- | --- |
| **E-D1** | Escopo P0 | **Exatamente +10 novos** accessories procedurais/CSS (total **12** com os 2 atuais). WebP reais → `PEDIDOS-MESTRE` P3+ / Task E3; **não** bloqueiam E1–E2. | **Congelado** |
| **E-D2** | Gameplay | Cosmético **nunca** altera SPS/clique/custo. O Juramento/Bancada já muda a math; VFX **só comunica** poder. | **Congelado** |
| **E-D3** | Stack | Layers: `hat` · `aura` · `blade` · `trail` · `shelf_fx`. Por `(target, layer)` fica **1** winner = maior `priority`. Targets: `reap` \| `altar` \| `generatorId`. | **Congelado** |
| **E-D4** | Perf / a11y | Sem partículas **novas por unidade** além do budget atual. Foice: **1** classe CSS `has-cosmetic-<accessory>` por accessory ativo. `prefers-reduced-motion: reduce` → desliga `trail` / ember / ripple animados (classes estáticas ok). | **Congelado** |
| **E-D5** | Fontes / Lethe | `source: 'upgrade'` (default) lê `upgrades`; `source: 'verdict'` lê `verdictPurchases`. **P0 sem** `source: 'talent'`. Lethe: cosméticos Styx somem com upgrades; Bancada **persiste**. | **Congelado** |

**Checklist Task 0E**

- [x] E-D1…E-D5 congelados
- [x] Catálogo P0 = tabela abaixo (10 novos + 2 existentes)
- [x] P1 adiado explícito (`world_vignette`)
- [x] G9 alinhado

### P0 congelado (12 accessories)

| Source id | `source` | Accessory | Target | Layer | Pri | Notas |
| --- | --- | --- | --- | ---: | --- |
| `foice_afilada` | upgrade | `blade_glow` | reap | blade | 1 | **já existe** — reforçar slash em E2 |
| `juramento_acheron` | upgrade | `blade_runes` | reap | blade | 2 | runas no cabo |
| `pacto_das_margens` | upgrade | `reap_ripple` | reap | trail | 1 | onda Styx no clique |
| `ceifador_ctoniano` | upgrade | `blade_ember` | reap | blade | 3 | brasas (reduced-motion → glow estático) |
| `colheita_eterna` | upgrade | `orbit_halo` | **altar** | aura | 1 | aureola na órbita (fecho da cadeia Foice) |
| `moeda_no_barquinho` | upgrade | `hat_charon` | `charon_servants` | hat | 1 | **já existe** |
| `frota_de_caronte` | upgrade | `boat_wake` | `charon_servants` | trail | 1 | trilha sob sprites (coverage ≤ 0.5) |
| `umbras_despertas` | upgrade | `shade_wisp` | `wandering_shade` | aura | 1 | fumaça sutil |
| `trela_cerberiana` | upgrade | `hound_chain` | `cerberian_hound` | shelf_fx | 1 | corrente / olhos |
| `tres_cabecas` | upgrade | `hound_triple_aura` | `cerberian_hound` | aura | 2 | tri-glow (ganha de chain na layer aura) |
| `veredito_tartaro` | upgrade | `judge_scale_fx` | `tartarus_judge` | shelf_fx | 1 | balança brilha |
| `selo_do_juiz` | **verdict** | `blade_seal` | reap | blade | 4 | carimbo no slash; **persiste** no Lethe |

**Cobertura (coverage):** `reap` / `altar` → `1`; prateleiras gerador → default **`0.5`** (igual `hat_charon`), salvo nota.

### P1 adiado (não implementar em E1–E3)

| Accessory | Source | Motivo |
| --- | --- | --- |
| `world_vignette` | `olho_do_tartarus` | Vinheta global + toggle; risco a11y/perf; fora do pacote Foice/órbita/prateleira |
| Cosméticos de talentos Mnemosyne | qualquer | P0 sem `source: 'talent'`; reabrir em F se couber |
| 2º Juramento por gerador T5/T6 | Forja/Trono | Escopo; PEDIDOS depois |

### Contrato E-D3 (shape def)

```js
{
  source: 'upgrade' | 'verdict',  // default 'upgrade'
  target: 'reap' | 'altar' | undefined,
  targetGeneratorId: string | undefined,  // se prateleira
  accessory: string,
  coverage: number,   // 0..1
  layer: 'hat' | 'aura' | 'blade' | 'trail' | 'shelf_fx',
  priority: number,
}
```

`activeCosmetics(state)` (E1) une upgrades owned + `verdictPurchases` conforme `source`; resolve layers; **não** lê talentos no P0.

### Contrato E-D4 (reduced-motion)

| Accessory / layer | Com motion | `prefers-reduced-motion: reduce` |
| --- | --- | --- |
| `trail` (`reap_ripple`, `boat_wake`) | animação curta | só tint/classe estática |
| `blade_ember` | brasas piscando | glow estático |
| demais | procedural/CSS leve | mantém pose |

### Ordem de implementação

1. **E1** ✅ — expandir `upgrade-cosmetics.js` (10 defs + `source: verdict` + target `altar`).
2. **E2** ✅ — draw hooks WorldView / AltarOrbit + CSS Foice; reduced-motion.
3. **E3** ✅ — `PEDIDOS-MESTRE` / art-requests (12 WebP) + CosmeticsAtlas fallback.

## Task E1 — Expandir `upgrade-cosmetics.js`

**Depende de:** 0E ✅ · **feita** (2026-09-28)

**Faz**

- [x] Registrar accessories novos + `activeCosmetics` resolve Bancada se `source: 'verdict'`.
- [x] Smoke: owned upgrade → accessory ativo; Lethe remove Styx cosmetics, mantém Bancada (`selo_do_juiz`).

**Entrega:** 12 defs · `cosmeticsForAltar` · layers/priority · smoke 11 cases.

## Task E2 — WorldView / AltarOrbit / CSS juice

**Depende de:** E1 ✅ · **feita** (2026-09-28)

**Faz**

- [x] Draw hooks por `accessory` (procedural mínimo) + target `altar` (`drawOrbitHalo`, shade na órbita).
- [x] Classes CSS na Foice / shelves / órbita.
- [x] `prefers-reduced-motion` desliga trail/ember.

**Entrega:** `drawAccessory` P0 · `drawOrbitHalo` · CSS blade/trail/seal · smoke E2.

## Task E3 — Pedidos de arte

**Depende de:** 0E ✅ · **feita** (2026-09-28)

**Faz**

- [x] Atualizar `PEDIDOS-MESTRE.md` + `art-requests.json` com P3 estendido (12 ids).
- [x] Fallback procedural enquanto WebP open (`CosmeticsAtlas` + `drawAccessory`).

**Entrega:** `art_cosmetics` (B11) · `assets/despertar/cosmetics/` · prefetch no WorldView.

**Testes:** `tests/despertar-cosmetics-smoke.mjs` + `despertar-art-requests-smoke.mjs` estendidos.

**Aceite Fase E**

- [x] Comprar cadeia Foice muda visual a cada degrau (`blade_glow` → runes → ripple → ember → `orbit_halo`).
- [x] 50 Servos + hat não derruba fps smoke (cap + coverage).
- [x] Lethe: chapéu/selo Bancada permanece; glow Styx some.

---

# Fase F — Lethe & Bancada profundos (re-jogabilidade)

**Estado da fase:** Task **0F congelada** · **F1–F3 feitas** (2026-09-28) · Fase F completa

## Objetivo

Cada Catábase e cada streak de Juízo **sentirem** escolha — não só +SPS.

## Task 0F — decisões

**Status:** ✅ **congelada** (2026-09-28)

| # | Tema | Decisão congelada | Status |
| --- | --- | --- | --- |
| **F-D1** | Novos talentos | **Exatamente +5** Mnemosyne (custos 3–5 essência). Sem `mnemosyne_tripla` no P0 (P1). | **Congelado** |
| **F-D2** | Novos Bancada | **Exatamente +4** itens (custos 6–14 V). `arquivo_selado` (B2 sink cosmético) → **P1**. B3 repeat **adiado** até Vereditos sobrarem em playtest. | **Congelado** |
| **F-D3** | Soft prestige | Talento **`eco_do_styx`**: após Lethe, server concede **1** Juramento Styx elegível (menor `cost` entre os **revelados** e não owned que passam `meetsUpgradeRequirement`). **Não** pula cadeia. 1× por ritual. | **Congelado** |
| **F-D4** | Juízo ↔ economia | Item Bancada **`eco_do_veredito`**: na **próxima** claim de milestone de streak ainda não paga, **+1 Veredito** extra (flag `verdictBonusPending` / consome no claim). **Nunca** no acerto avulso. | **Congelado** |
| **F-D5** | Mercy Juízo | `catalogo_vivo`: 1 erro por corrida (`juizo_run.mercyUsed`); server-only; 2º erro encerra. Sem mercy se item não owned. | **Congelado** |

**Checklist Task 0F**

- [x] F-D1…F-D5 congelados
- [x] Tabelas P0 talentos + Bancada abaixo
- [x] P1 adiado explícito (tríplice / arquivo_selado / B3)
- [x] G10 alinhado

### P0 talentos (+5)

| Id | Nome | Custo | Efeito (F1) |
| --- | --- | ---: | --- |
| `margem_generosa` | Margem Generosa | 3 | `startingSouls` += 250 (soma com Memória das Sombras) |
| `pacto_do_silencio` | Pacto do Silêncio | 3 | Offline teto **+2 h** (soma com Noite / Bancada) |
| `olho_da_curva` | Olho da Curva | 4 | QoL: amortização **sempre** visível + tooltip rico (sem math SPS) |
| `eco_do_styx` | Eco do Styx | 4 | Soft prestige (**F-D3**) — 1 Styx pós-Lethe |
| `rebanho_despertado` | Rebanho | 5 | Starting `wandering_shade` qty = **max(atual, 3)** (com Segundo Fôlego → 3, não 4) |

**Total essência novos:** 19 · **Catálogo Mnemosyne após F1:** 13 ids.

### P0 Bancada (+4)

| Id | Nome | Custo V | Efeito (F2) |
| --- | --- | ---: | --- |
| `sentenca_afiada` | Sentença Afiada | 6 | `clickMult ×1.08` (stack multiplicativo com Selo) |
| `eco_do_veredito` | Eco do Veredito | 8 | **F-D4** — +1 V no próximo milestone claim |
| `catalogo_vivo` | Catálogo Vivo | 10 | **F-D5** — 1 mercy / corrida Juízo |
| `peso_das_faixas` | Peso das Faixas | 14 | `spsMult ×1.03` (fraco vs curva 1.15) |

**Custo novos:** 38 V · **Bancada total após F2:** 8 itens · 64 V (26 atuais + 38).

### P1 adiado (não F1–F3)

| Id | Motivo |
| --- | --- |
| `mnemosyne_tripla` | Mult essência alto; reabrir se late-game seco |
| `arquivo_selado` | Sink cosmético B2 (`blade_seal_gold`); após WebP E3 |
| B3 Juízo (+2 V / +25 best pós-s100) | Só se playtest mostrar Vereditos sobrando |

### Contrato F-D3 (`eco_do_styx`)

```text
on applyPrestige (server + cliente espelho):
  if talent owned:
    candidates = UPGRADES.filter(u =>
      !owned.includes(u.id)
      && isRevealed(u)          // mesmo critério da loja Styx
      && meetsUpgradeRequirement(u, postLetheState)
    )
    pick = min(candidates by cost numeric, then id)
    if pick: upgrades.append(pick.id)  // 1×; grátis
```

- “Revelado” = já aparece na UI Styx (mesma regra de unlock visual).
- Não gasta almas; não conta como compra para sync spend.
- Cosmético do juramento concedido aplica-se normalmente (E1).

### Contrato F-D4 / F-D5 (server)

| Flag | Onde | Semântica |
| --- | --- | --- |
| `verdictBonusPending` | row ou derivado de purchase | Se `eco_do_veredito` owned e ainda não consumido neste “próximo milestone”: ao `claimJuizoMilestones` novo, `verdictGain += 1` e consome |
| `juizo_run.mercyUsed` | `juizo_run` jsonb | `false` no start; no 1º erro com `catalogo_vivo` → `true`, streak **não** zera, run continua; 2º erro → fim normal |

### Copy F3 (congelada)

| Momento | Texto |
| --- | --- |
| Preview Lethe (bloco permanentes) | **Memória que permanece** · Óbolos · {n} talentos · {m} sentenças da Bancada |
| Toast pós-ritual | Memória preservada: {n} talentos · {m} sentenças |

### Ordem de implementação

1. **F1** — 5 talentos + `talentEffects` / starting max-rule + `eco_do_styx` no prestige.
2. **F2** — 4 Bancada + mercy + eco veredito (server).
3. **F3** — preview Lethe + toast.

## Task F1 — Talentos novos + fórmulas

**Depende de:** 0F ✅  
**Status:** ✅ **feita** (2026-09-28)

**Faz**

- [x] `talents.js` + `formulas.js` / `economyEffects` / starting max-rule.
- [x] Server `talentBuy` + prestige aplica `eco_do_styx`.
- [x] Smoke fórmulas + prestige (`tests/despertar-talents-f1-smoke.mjs`).

## Task F2 — Bancada nova + anti-cheat Juízo

**Depende de:** 0F ✅ · F1 opcional ∥  
**Status:** ✅ **feita** (2026-09-28)

**Faz**

- [x] `verdict-shop.js` + efeitos (`sentenca_afiada`, `eco_do_veredito`, `catalogo_vivo`, `peso_das_faixas`).
- [x] Mercy: `juizo_run.mercyUsed` só no server (`despertar-juizo.js`).
- [x] Eco veredito no claim de milestone (`ecoVereditoConsumed` sticky; pending derivado).
- [x] Smoke `tests/despertar-bancada-f2-smoke.mjs`.

## Task F3 — UX de re-jogabilidade

**Depende de:** F1 · F2  
**Status:** ✅ **feita** (2026-09-28)

**Faz**

- [x] Preview Lethe lista **benefícios permanentes** (copy 0F).
- [x] Toast pós-ritual “Memória preservada: {n} talentos · {m} sentenças”.
- [x] Smoke `tests/despertar-lethe-f3-smoke.mjs`.

**Aceite Fase F**

- [x] Preview + toast deixam permanentes visíveis a cada Catábase (playtest click vs SPS = manual).
- [x] Bancada não esgota em 1 tarde de Juízo casual (B3 continua adiado).

---

## Ordem de PRs sugerida

1. **A1 + A2 + A3** (Véu) — desbloqueia aula ao vivo com confiança.  
2. **C1 + C2** (subabas) — barato, melhora lojas antes de encher.  
3. **B1 + B2** (livro); B3 logs extras se couber.  
4. **D0 subset + D2** (conquistas P0).  
5. **E1 + E2** (cosméticos).  
6. **F1 + F2** (profundidade).

Paralelo possível: B ∥ C ∥ D após A1 (gate estável).

---

## Arquivos prováveis

| Área | Criar / tocar |
| --- | --- |
| A | `api/_lib/despertar-gate.js`, `api/despertar.js`, `db/migrate-*-despertar-pause.sql`, `js/hades-despertar/index.js`, `css/despertar.css`, `js/dashboard.js`, `pages/dashboard.html` |
| B | `pages/despertar.html`, `ui/CodexBook.js` (novo), `edu-logs.js`, `UIRenderer.js` |
| C | `despertar.html`, `UIRenderer.js`, `despertar.css` |
| D | `data/game-catalog.json`, `despertar-achievements.js`, `assets/achievements/*` |
| E | `upgrade-cosmetics.js`, `WorldView.js`, `AltarOrbit.js`, `despertar.css`, `PEDIDOS-MESTRE.md` |
| F | `talents.js`, `verdict-shop.js`, `formulas.js`, `despertar-juizo.js`, `despertar-validate.js` |

---

## Riscos e mitigações

| Risco | Mitigação |
| --- | --- |
| Aluno perde progresso na pausa | G1: pausa ≠ reset; copy explícita no véu |
| Relógio do cliente mentiroso | A-D3: `serverNow` + `pause_until` |
| Cache KV mostra Acheron aberto após pausar | Invalidar no set (igual published) |
| Conquistas inflacionam XP | G8 teto; raridade baixa no early |
| VFX derruba mobile | Caps + reduced-motion; smoke perf |
| Segunda chance Juízo explotável | Flag só no `juizo_run` server |
| Subabas confundem com Selados | Copy: “Permanentes” ≠ Juramentos do Styx (resetam) |

---

## Critério de “produção profunda feita”

- [ ] Fase **A** em Preview: Mestre pausa 15 min; turma vê timer; saves intactos.  
- [ ] Fase **B**: livro no canto ensina ≥1 mecânica nova sem abrir aba manualmente.  
- [ ] Fase **C**: Disponíveis/Comprados em Panteão e Bancada.  
- [ ] Fase **D**: ≥8 conquistas novas (incl. ≥3 Juízo) no Álbum.  
- [x] Fase **E**: ≥6 accessories além dos 2 atuais com VFX perceptível.  
- [ ] Fase **F**: ≥4 talentos novos **ou** ≥3 Bancada novos + preview Lethe mostra permanentes.

Enquanto isso, o inventário P0 de [`plano-hades-despertar.md`](./plano-hades-despertar.md) (migrations, KV, gate published, pool Juízo ≥30) continua valendo para **abrir** o Acheron — este plano é o **pós-abertura rico**.
