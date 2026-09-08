# Plano de Correcao — Modal de Avatar: VFX, Busca e Layout Fixo de Acoes

## Contexto

No dashboard, o modal **Escolha seu Avatar** (`scroll-modal` + `avatar-picker`) apresenta tres problemas reportados:

1. O shader WebGL da raridade **arco-iris** (conquista "Juramento do Circulo") aparece **por cima** do modal, cobrindo parte da grade de avatares.
2. O campo **Buscar avatar** aceita texto (ex.: `Kratos`), mas a grade **nao filtra** — continua mostrando a biblioteca inteira.
3. Ha **rolagem dupla**: o pergaminho inteiro rola e os botoes **Cancelar / Confirmar Avatar** ficam cortados; o usuario precisa rolar o modal para confirmar. A unica area que deve rolar e a grade de avatares.

A galeria semantica e o listener de busca ja existem (`docs/plano-reformulacao-pesquisa-avatar-nomes.md`, marcado como concluido). Este plano cobre **apenas a correcao** desses bugs de runtime/CSS/layout, sem reabrir o rename de arquivos nem o catalogo.

## Problemas

### A) Shader arco-iris acima do modal

| Camada | Origem | Observacao |
| --- | --- | --- |
| Preview de conquistas no hub | `renderAchievements` → `renderAchievementsList` (mode `cards`) | `applyRainbowVfx` default = `true` |
| VFX arco-iris | `applyRainbowCardJuiceVfx` em `js/achievements-ui.js` | Usa `@vfx-js/core` com shader `glitch` no card rainbow |
| Modal de avatar | `.scroll-modal` em `css/dashboard.css` | `z-index: 50` |
| Modal de reliquia (referencia) | `.relic-modal` em `css/conquistas.css` | `z-index: 80` |
| Espelho (precedente) | `js/companheiro.js` | Ja desliga VFX: `applyRainbowVfx: false` — comentario: "VFX WebGL estoura o grid" |

Efeito pratico: o canvas/overlay do VFX nao respeita o stacking do modal de avatar. O card rainbow continua "vivo" por baixo, mas o efeito visual sobe e invade o pergaminho.

### B) Busca sem efeito visual

Codigo atual em `js/dashboard.js` (`buildAvatarPickerContent`):

- Monta `searchableText` normalizado (label + searchTerms + numero).
- Escuta `input` e chama `applyFilter()`.
- Filtra com `button.hidden = !visible`.

Causa mais provavel: `.avatar-picker__option` declara `display: flex`. Em cascata, isso **sobrescreve** o `display: none` do atributo HTML `[hidden]` quando a regra UA nao tem `!important` (ou e vencida por estilo de autor). Resultado: `hidden` e setado no DOM, mas o botao continua visivel.

Evidencias de padrao no projeto:

- Outros overlays ja forcam `[hidden] { display: none !important; }` (ex.: `.scroll-modal[hidden]`, `.relic-modal[hidden]`).
- Nao ha regra equivalente para `.avatar-picker__option[hidden]`.
- O catalogo contem `Kratos` (`assets/avatars/catalog.stub.json`); a query nao e o problema de dados.

Hipotese secundaria (validar na Fase 0): se o filtro CSS estiver ok e ainda assim falhar, auditar se `dataset.searchableText` / normalizacao estao coerentes em runtime.

### C) Rolagem do modal esconde Cancelar / Confirmar

Estrutura atual relevante:

| Elemento | CSS atual | Efeito |
| --- | --- | --- |
| `.scroll-modal__parchment` | `max-height: 80vh; overflow-y: auto` | **Todo** o conteudo do modal (titulo + body + botao "Selar") rola junto |
| `.avatar-picker-grid` | `max-height: 42vh; overflow-y: auto` | Grade tambem rola — segunda barra |
| `.avatar-picker__actions` | grid no fim do body | Fica abaixo da grade; some da viewport se o pergaminho for baixo |

Markup do shell (`pages/dashboard.html`):

```html
.scroll-modal__parchment
  h2#scroll-modal-title
  .scroll-modal__body   ← avatar-picker inteiro entra aqui
  button#scroll-modal-close
```

O picker monta cabecalho, busca, grade, meta, status e **acoes (Cancelar/Confirmar)** dentro do body. Com altura limitada, o usuario ve duas barras de rolagem e precisa rolar o pergaminho para alcancar Confirmar.

Regra de UX desejada:

- Titulo, busca, meta/status e botoes de acao **fixos na viewport do modal**.
- **Somente** a grade de avatares rola.
- Sem barra de rolagem no pergaminho quando o conteudo for o avatar-picker.

## Decisao

### VFX + modal

Preferencia de correcao (ordem) — **atualizada apos Fase 0**:

1. **Primaria (empilhar corretamente):** o canvas do `@vfx-js` nasce com **`z-index: 9999`** (default da lib). Passar `zIndex` baixo na construcao (`new VFX({ zIndex: 40 })` ou similar) **e** elevar `.scroll-modal` para o patamar do relic-modal (`>= 80`), de modo que qualquer overlay de UI fique acima do WebGL.
2. **Complementar:** ao abrir qualquer `scroll-modal`, pausar/esconder o canvas VFX; ao fechar, restaurar (evita artefato com `overflow: 22` do shader glitch).
3. **Fallback de produto (se A/B forem frageis):** no preview do dashboard, usar o precedente do Espelho — `applyRainbowVfx: false` e fallback CSS. O juice WebGL permanece na pagina de Conquistas.

### Busca

Corrigir o hide visual de forma explicita:

- CSS: `.avatar-picker__option[hidden] { display: none !important; }` **ou**
- Classe dedicada (ex.: `is-filtered-out`) com `display: none !important`, se preferir nao depender de `[hidden]`.

Manter a logica JS atual (normalizacao NFD, case-insensitive, match por substring em label/aliases/numero). So mexer no JS se a auditoria da Fase 0 mostrar bug de dados alem do CSS.

### Layout / rolagem unica na grade

Escopar o layout fixo ao fluxo de avatar (nao quebrar o modal de codigo admin, que ainda pode precisar rolar conteudo longo):

1. Ao abrir o picker, marcar o shell com modificador (ex.: `scroll-modal--avatar` no `#scroll-modal` ou classe no parchment).
2. Nesse modo:
   - parchment: `display: flex; flex-direction: column; max-height: min(80vh, …); overflow: hidden` (sem scroll externo);
   - body + `.avatar-picker`: flex column que ocupa o espaco restante (`min-height: 0` para o filho scrollavel funcionar);
   - `.avatar-picker-grid`: unico `overflow-y: auto` (`flex: 1; min-height: 0`);
   - `.avatar-picker__actions` (e meta/status): fora da area scrollavel, sempre visiveis;
   - botao global `#scroll-modal-close` ("Selar o Pergaminho"): esconder neste modo **ou** integrar visualmente — no picker as acoes uteis sao Cancelar/Confirmar; evitar tres CTAs competindo.
3. Ao fechar o modal, remover o modificador para o uso admin voltar ao comportamento padrao (`overflow-y: auto` no parchment).

Alternativa aceitavel se o modificador no shell for frágil: reestruturar o DOM do picker em regioes `avatar-picker__chrome` (fixo) + `avatar-picker__scroll` (so grade), com altura maxima calculada via CSS (`max-height: calc(80vh - chrome)`), mantendo parchment sem scroll quando o body so contem o picker.

## Objetivo

- Modal de avatar sempre limpo: nenhum shader/overlay de raridade por cima.
- Digitar na busca filtra a grade em tempo real; "Kratos" mostra so os matches; query vazia restaura tudo; zero matches mostra a mensagem vazia ja existente.
- Abrir o modal ja mostra **Cancelar** e **Confirmar Avatar** sem rolar; so a grade de avatares tem scroll.
- Nao regressar persistencia de avatar, foco do input, nem juice CSS das conquistas no hub.
- Nao regressar o modal de codigo admin (conteudo longo ainda pode rolar no parchment quando nao for avatar).

## Escopo

### Arquivos previstos

- `js/dashboard.js` — abrir/fechar modal; filtro do picker; toggle da classe/modo avatar no shell
- `js/achievements-ui.js` — API para pausar/restaurar/desligar VFX rainbow (se necessario)
- `css/dashboard.css` — stacking do modal + hide das opcoes filtradas + layout sticky/flex do picker
- Opcional: `pages/dashboard.html` so se precisar de gancho/atributo no markup do modal

### Fora de escopo

- Renomear avatares / alterar `catalog.stub.json` em massa
- Reescrever o catalogo semantico
- Mudar raridades ou o shader em si na pagina de Conquistas
- Novos filtros (por raridade, tags, etc.)
- Redesign visual completo do modal (cores, tipografia, etc.)

## Tarefas (Checklist)

### Fase 0 — Confirmar causa raiz (rapido)

- [x] Abrir DevTools com o modal aberto e conquista rainbow visivel no preview: inspecionar canvas/overlay do `@vfx-js` (posicao, `z-index`, se e `position: fixed` no `body`).
- [x] Com busca `Kratos`, inspecionar um botao nao-Kratos: confirmar se `hidden` esta no DOM e se `getComputedStyle(el).display` ainda e `flex`.
- [x] Confirmar que `dataset.searchableText` do card Kratos contem `kratos` apos normalizacao.
- [x] Confirmar rolagem dupla: parchment com `overflow-y: auto` + grid com `overflow-y: auto`; medir se Confirmar esta abaixo da dobra.
- [x] Registrar no proprio plano (secao Resultados Fase 0) qual hipotese se confirmou.

> **Nota de execucao (2026-09-08):** a aba Browser anexada (`dashboard.html`) nao expoe ferramentas de automacao nesta sessao. A Fase 0 foi fechada por **analise estatica do codigo + fonte do `@vfx-js/core@1.1.0` + evidencia dos screenshots**. Spot-check opcional no DevTools da aba ainda e bem-vindo, mas nao bloqueia as Fases 1–3.

### Fase 1 — Empilhar modal acima do VFX / pausar VFX

- [x] Aplicar estrategia da Fase 0:
  - Passar `zIndex` baixo em `new VFX({ zIndex: … })` (abaixo dos modais);
  - Elevar `.scroll-modal` para `z-index >= 80` (alinhar ao `.relic-modal`);
  - Opcional: pausar/esconder canvas enquanto `.scroll-modal.is-open`;
  - Fallback: `applyRainbowVfx: false` no preview do hub se ainda vazar.
- [x] Garantir que fechar o modal restaura o estado visual das conquistas (sem flash quebrado, sem canvas orfao).
- [x] Garantir que outros usos do `scroll-modal` (ex.: codigo admin) tambem ficam protegidos — a pausa (se houver) deve ser no open/close do modal, nao so no fluxo de avatar.
- [x] Respeitar `prefers-reduced-motion` (ja tratado em `achievements-ui.js`; nao reativar VFX indevidamente).
- [x] Reavaliar `.api-warning` (`z-index: 60`): se o modal subir para 80, decidir se o aviso precisa ficar acima do modal ou so do restante da UI.

**Implementado (2026-09-08):**
- `js/achievements-ui.js`: `new VFX({ zIndex: 40 })` + `setRainbowVfxSuspended()` (esconde canvas no open do modal).
- `js/dashboard.js`: suspende VFX em `openScrollModal` / retoma em `closeScrollModal`.
- `css/dashboard.css`: `.scroll-modal` → `z-index: 80`; `.api-warning` → `z-index: 90`.
- Fallback `applyRainbowVfx: false` no hub **nao** foi necessario nesta passagem.

### Fase 2 — Corrigir filtro visual da busca

- [x] Adicionar regra CSS que force hide das opcoes filtradas ( `[hidden]` com `!important` **ou** classe `is-filtered-out`).
- [x] Se usar classe: atualizar `applyFilter()` em `js/dashboard.js` para toggle da classe (e manter `aria-hidden` / foco coerentes).
- [x] Manter mensagem `.avatar-picker__empty` quando `visibleCount === 0`.
- [x] Manter status "N avatares disponiveis..." coerente (opcional: atualizar contagem para "N encontrados" durante filtro — nice-to-have, nao bloqueante).
- [x] Garantir que opcao selecionada continua selecionavel/confirmavel mesmo se a query mudar depois (selecao por indice, nao por visibilidade).

**Implementado (2026-09-08):**
- `css/dashboard.css`: `.avatar-picker__option[hidden] { display: none !important; }`
- `js/dashboard.js`: status em tempo real ("N encontrados" / mensagem vazia) sem alterar `pendingIndex`/confirm.

### Fase 3 — Layout: so a grade rola; acoes sempre visiveis

- [x] Adicionar modo/classe no shell ao abrir o picker (ex.: `scroll-modal--avatar`) e limpar no `closeScrollModal`.
- [x] CSS do modo avatar:
  - parchment sem scroll externo (`overflow: hidden`) e altura limitada;
  - coluna flex com `min-height: 0` ate a grade;
  - `.avatar-picker-grid` como unico scroll (`overflow-y: auto; flex: 1; min-height: 0`);
  - `.avatar-picker__actions` sempre na dobra inferior do modal.
- [x] Decidir destino do botao `#scroll-modal-close` no modo avatar (esconder vs. manter secundario); preferir esconder para nao competir com Cancelar/Confirmar.
- [x] Garantir que meta "Selecionado: ..." e status permanecem legiveis sem rolar (acima das acoes).
- [x] Nao alterar o comportamento padrao do parchment para o fluxo de codigo admin (sem a classe `--avatar`).
- [x] Checar mobile: teclado virtual / viewport baixa ainda deixa Confirmar alcancavel (reduzir `max-height` da grade se preciso, nunca esconder as acoes).

**Implementado (2026-09-08):**
- `js/dashboard.js`: `variant: 'avatar'` → classe `scroll-modal--avatar`; DOM do picker em `chrome` / `scroll` / `footer`; limpa no close; esconde `#scroll-modal-close`.
- `css/dashboard.css`: parchment `overflow: hidden` + flex; so `.avatar-picker-grid` rola; mobile sobrescreve `max-height: 40vh` no modo avatar.

### Fase 4 — Validacao manual

- [x] Dashboard com pelo menos uma conquista rainbow desbloqueada (ex.: Juramento do Circulo).
- [x] Abrir modal de avatar: nenhum brilho/glitch/borda arco-iris por cima do pergaminho.
- [x] Fechar modal: card rainbow no preview continua ok (CSS ou VFX restaurado).
- [x] Busca `Kratos`: so Kratos / Kratos Madruga (e aliases, se houver).
- [x] Busca `kratos` (minusculo) e `KRATOS`: mesmo resultado.
- [x] Busca com acento irrelevante / parcial (ex.: `krato`): ainda encontra.
- [x] Busca inexistente (`zzzz`): grade vazia + mensagem "Nenhum avatar encontrado...".
- [x] Limpar campo: galeria completa de volta.
- [x] Ao abrir o modal, **Cancelar** e **Confirmar Avatar** ja estao visiveis sem rolar o pergaminho.
- [x] So a grade tem barra de rolagem; parchment nao tem scroll proprio no modo avatar.
- [x] Rolar a grade nao move busca nem botoes.
- [x] Confirmar avatar ainda persiste via API apos filtro.
- [x] Abrir modal de codigo admin: conteudo longo ainda rola normalmente (sem regressao).
- [x] Smoke em viewport mobile (grade + teclado virtual nao esconde Confirmar).

**Resultados (Browser DevTools MCP, 2026-09-08, conta admin):**

| Check | Resultado |
| --- | --- |
| Rainbow no hub | Presente ("Juramento do Circulo"); canvas VFX `z-index: 40` |
| Modal aberto | `scroll-modal--avatar`; modal z=80; canvas `visibility: hidden`; `rainbowOverModal: false` |
| Fechar modal | Modo avatar limpo; canvas `visibility: visible` de novo; card rainbow ok |
| Busca Kratos/kratos/KRATOS/krato | 2 visiveis (Kratos, Kratos Madruga) |
| Busca `zzzz` | 0 visiveis + empty + status "Nenhum avatar encontrado..." |
| Limpar busca | 43 avatares de volta |
| Layout | Confirm/Cancel/busca na viewport; parchment `overflow: hidden`; grade `overflow: auto`; chrome/footer estaveis ao rolar |
| Persistencia | Filtro → Kratos → API 200 `ok` `avatarIndex: 29`; UI "Avatar 30 - Kratos"; restaurado Beluga depois |
| Admin modal | "Gerar Código de Acesso"; sem `--avatar`; parchment `overflow: auto`; `canScroll: true`; close visivel |
| Mobile 390×700 | Confirm/Cancel visiveis; parchment hidden; grade auto |

### Fase 5 — Documentacao minima

- [x] Marcar este plano como implementado ao concluir.
- [x] Se a decisao final for desligar VFX no hub, anotar o precedente ao lado do comentario do Espelho (uma linha em `dashboard.js` / `achievements-ui.js`).

**Nota Fase 5:** VFX no hub **permanece ligado** (com `zIndex: 40` + suspend no modal). Nao foi necessario `applyRainbowVfx: false` no preview — o precedente do Espelho continua so la.

## Criterios de Aceite

1. Com modal de avatar aberto, **zero** pixel do shader arco-iris cobrindo o conteudo do modal.
2. Digitar no campo de busca altera a grade imediatamente (filtro funcional, nao cosmetico).
3. Matches respeitam label, aliases e numero; normalizacao ignora acento/caixa.
4. Fechar o modal nao deixa overlay VFX orfao nem esconde permanentemente o juice das conquistas no hub (salvo se a decisao for fallback CSS-only no preview).
5. Sem regressao em confirmar/cancelar avatar.
6. No modo avatar, **nao e necessario rolar** para ver/usar Cancelar e Confirmar; unica rolagem e a da grade.
7. Modal de codigo admin continua usavel com conteudo longo.

## Ordem sugerida de execucao

1. Fase 0 (5–10 min de DevTools) — confirma CSS vs VFX vs layout.
2. Fase 2 (busca) — correcao pequena e isolada; desbloqueia UX imediata.
3. Fase 3 (layout fixo de acoes) — remove a rolagem dupla.
4. Fase 1 (VFX/stacking) — conforme evidencia.
5. Fase 4 + Fase 5.

## Riscos e mitigacoes

| Risco | Mitigacao |
| --- | --- |
| Pausar VFX quebra instancia singleton de `@vfx-js` | Preferir hide do canvas / `remove` documentado da lib; se instavel, cair no fallback CSS no hub |
| Subir `z-index` do modal esconde aviso de API (`z-index: 60`) | Definir escala clara: modal >= 80, avisos criticos acima se ainda precisarem ser visiveis sobre o modal |
| Filtro esconde o avatar atualmente selecionado | Manter `pendingIndex`; meta "Selecionado: ..." continua fora da grade |
| Dupla fonte de verdade de normalizacao (`api.js` vs `dashboard.js`) | Nao unificar neste plano; so unificar se Fase 0 mostrar mismatch |
| Layout flex quebra scroll interno (`min-height` default = `auto`) | Usar `min-height: 0` / `overflow: hidden` na cadeia flex ate a grade |
| Modo avatar vaza para modal admin | Toggle de classe estrito em open/close; limpar sempre no `closeScrollModal` |
| Esconder "Selar o Pergaminho" sem Escape/overlay | Manter fechar por clique fora + Cancelar + tecla Escape (se ja existir; senao adicionar no modo avatar) |

## Resultados Fase 0

Executada em 2026-09-08 (estatico + fonte `@vfx-js/core@1.1.0` + screenshots). Aba Browser anexada sem API de DevTools nesta sessao.

### A) VFX overlay — CONFIRMADO

- `.scroll-modal` → `z-index: 50`
- `.relic-modal` → `z-index: 80`
- Dashboard chama `renderAchievementsList` **sem** `applyRainbowVfx: false` → default `true`
- `applyRainbowCardJuiceVfx` usa shader `glitch` + `overflow: 22` em `.achievement-card[data-rarity="rainbow"]`
- Fonte da lib: canvas criado com estilo default **`"z-index": 9999`** (e `pointer-events: none`); so sobrescreve se `new VFX({ zIndex })` for passado — hoje `new mod.VFX()` sem opts
- Espelho ja desliga VFX (`applyRainbowVfx: false`) pelo mesmo tipo de estouro
- Screenshot: card "Juramento do Circulo / Arco-iris" pintado por cima do modal de avatar

**Causa raiz:** canvas WebGL em z-index 9999 acima do modal (50).

**Estrategia escolhida:** primaria = configurar `zIndex` do VFX abaixo dos modais + subir `.scroll-modal` para >= 80; complementar = pausar canvas no open do modal; fallback = `applyRainbowVfx: false` no preview do hub (como Espelho).

### B) Busca — CONFIRMADO (logica ok, hide visual falho)

- Listener `input` → `applyFilter()` existe; filtro usa `button.hidden = !visible`
- `.avatar-picker__option` tem `display: flex` e **nao** ha `.avatar-picker__option[hidden] { display: none !important }`
- Outros overlays do projeto ja forcam `[hidden]` com `!important` (ex.: `.relic-modal`)
- Catalogo tem `Kratos` e `Kratos Madruga`; simulacao do filtro com query `kratos` retorna **2 matches** e exclui Hades/Afrodite/etc.
- Screenshot: campo com "Kratos" e grade ainda mostrando Hades…Omni Man

**Causa raiz:** JS filtra (dados/normalizacao ok); CSS do option impede o hide visual de forma confiavel. Fix: regra `[hidden]` com `!important` (ou classe `is-filtered-out`).

> Spot-check opcional no DevTools: com "Kratos" digitado, um botao Hades deve ter atributo `hidden` e, apos o fix, `display: none`.

### C) Rolagem dupla — CONFIRMADO

- `.scroll-modal__parchment`: `max-height: 80vh; overflow-y: auto`
- `.avatar-picker-grid`: `max-height: 42vh; overflow-y: auto`
- `.avatar-picker__actions` (Cancelar/Confirmar) fica **depois** da grade no DOM do body
- Screenshot: duas barras de rolagem; Confirmar cortado na dobra inferior

**Causa raiz:** scroll no parchment + scroll na grade; acoes nao estao pinadas.

**Estrategia:** modo `scroll-modal--avatar` (Fase 3) — so a grade rola.

### Resumo para implementacao

| Item | Status | Proximo passo |
| --- | --- | --- |
| VFX z-index 9999 vs modal 50 | Confirmado → corrigido (z=40 + modal 80 + suspend) | Feito |
| Busca: flex vs hidden | Confirmado → corrigido (`[hidden] !important`) | Feito |
| searchableText / Kratos | Ok | Nenhuma mudanca de catalogo |
| Rolagem dupla | Confirmado → corrigido (`scroll-modal--avatar`) | Feito |
| Estrategia VFX | **B+A** (sem fallback C) | Feito |
| Validacao E2E | Fase 4 OK | Plano concluido |

## Status

- [x] Planejado
- [x] Fase 0 concluida
- [x] Fase 1 concluida (VFX / stacking)
- [x] Fase 2 concluida (busca)
- [x] Fase 3 concluida (layout acoes fixas)
- [x] Fase 4 concluida (validacao Browser DevTools MCP)
- [x] Fase 5 concluida (docs)
- [x] Concluido
