# Plano — Correção: menu mobile, arco-íris escapando e Almas no aluno

## Contexto

Reportes em produção/mobile (`fundamentos-de-jogos-digitais.vercel.app`, 2026-09-08):

1. **Menu lateral no celular** exibe **barra de rolagem vertical** — drawer não cabe no viewport.
2. **Conquista arco-íris** (shader glitch / canvas `@vfx-js`) **passa por cima** de header, conteúdo e, em casos, compete com o drawer.
3. Link **Almas Registradas** aparece no menu para **perfil de aluno** (deveria ser só admin).

Não é falha de `git pull`: o branch local já estava alinhado ao remoto. São regressões de CSS/stacking/VFX no app-shell + relíquias.

Precedente útil: `docs/plano-correcao-modal-avatar-vfx-busca.md` (mesmo padrão `[hidden]` vencido por `display`, e canvas VFX com z-index).

## Objetivo

Corrigir os três bugs com mudanças mínimas e verificáveis, **sem** reabrir a reformulação visual completa das molduras (`docs/plano-reformulacao-visual-reliquias-referencia.md`).

### Critérios de aceite

| # | Critério |
| --- | --- |
| A | No mobile (≤980px), drawer aberto: **sem scrollbar** no sidebar em viewport típico (~640–844 CSS px de altura); conteúdo (brand + nav aluno + logout) cabe em `100dvh` + safe-areas |
| B | Card/slot arco-íris desbloqueado **não** pinta sobre `.app-shell__header`, drawer, overlay nem modal; glitch permanece **visível dentro** do card |
| C | Com `role !== 'admin'`, **Almas Registradas** não aparece (nem FOUC); com admin, aparece e funciona |
| D | Página `souls.html` continua bloqueando aluno (redirect) — defesa em profundidade |

### Fora de escopo

- Redesign de molduras / tipografia das relíquias
- Remover o glitch arco-íris (só **conter** e **empilhar** corretamente)
- Alterar lista de destinos do menu (exceto visibilidade admin)

---

## Problemas e causas prováveis

### A) Menu mobile com rolagem vertical

**Onde:** `css/app-shell.css`

| Peça | Estado atual | Efeito |
| --- | --- | --- |
| `.app-shell__sidebar` | `overflow-y: auto` + `scrollbar-width: thin` (global) | Qualquer overflow gera barra |
| Mobile (`max-width: 980px`) | `height: 100vh` / `100dvh`, paddings com safe-area | Altura útil menor que o somatório dos itens |
| Links | `min-height: 3.45rem` no mobile + `gap: 0.5rem` + brand + logout | ~7 destinos (admin) ou 6 (aluno) + brand estouram em telas curtas / barra do browser |

Evidência (print): scrollbar fina à direita do drawer; lista completa visível só com scroll.

**Hipótese principal:** densidade do aside > altura útil do viewport mobile; `overflow-y: auto` torna o scroll “oficial”.

**Hipótese secundária:** brand + gaps grandes demais; logout com `margin-top: auto` em coluna flex força scroll quando o miolo não comprime.

### B) Arco-íris por cima de tudo

**Onde:** `js/achievements-ui.js` (`applyRainbowCardJuiceVfx` / `@vfx-js`), `css/conquistas.css`, `css/dashboard.css`, stacking do shell

| Camada | z-index / overflow | Observação |
| --- | --- | --- |
| Canvas `@vfx-js` | `RAINBOW_VFX_CANVAS_Z_INDEX = 40` | Lib default seria 9999; 40 **empata** com header sticky mobile (`z-index: 40`) |
| `.app-shell__header` (mobile) | `40` | Empate com canvas → ordem de pintura imprevisível |
| `.app-shell__overlay` / sidebar | `50` / `60` | Em teoria acima do canvas; se lib ignorar `zIndex` ou recriar canvas, invade drawer |
| Slot rainbow álbum | `overflow: visible` no slot + `contain: paint` só no face | Halo/glitch pode escapar do grid |
| `setRainbowVfxSuspended` | só modal de scroll | Drawer **não** suspende VFX ao abrir |

Efeito prático (print Conquistas): card arco-íris “glitchado” cobrindo título do salão/header; arte ilegível e stacking quebrado.

**Hipótese principal:** canvas fullscreen do VFX em `position: fixed` com z-index ≥ header, ou overflow `visible` no slot permitindo escape visual.

**Hipótese secundária:** ao abrir o menu, VFX continua ativo e compete visualmente (mesmo com z-index 60 no sidebar).

### C) Almas Registradas no aluno

**Onde:** markup `data-admin-only` + `hidden` em todas as páginas shell; lógica em `js/app-shell.js` (`initAppShell` → `item.hidden = role !== 'admin'`).

| Peça | Estado | Efeito |
| --- | --- | --- |
| HTML | `<a … data-admin-only … hidden>` | Intenção correta |
| `.app-shell__link { display: inline-flex }` | CSS de autor | **Vence** o `display: none` da UA em `[hidden]` |
| `dashboard.css` | Já força `[hidden]` em `.master-tools`, `.avatar-picker__option` | App-shell **não** tem regra equivalente |
| JS | Seta `hidden` corretamente | Atributo existe, mas o link **continua visível** |

É o **mesmo bug** documentado no plano do modal de avatar (`display` autor > `[hidden]` UA).

Defesa já existente (manter): `js/api.js` / guard de `souls` redireciona aluno — mas o link não deveria aparecer.

---

## Arquivos previstos

| Arquivo | Mudança |
| --- | --- |
| `css/app-shell.css` | Densidade mobile do drawer; `[hidden]` em links admin; opcional `overflow` / scrollbar |
| `js/app-shell.js` | Suspender VFX ao abrir drawer (opcional mas recomendado); reforço de hide admin-only |
| `js/achievements-ui.js` | Baixar z-index do canvas; clip/contain; suspender com drawer |
| `css/conquistas.css` | Slot rainbow: `overflow: hidden` + contain; z-index sob controle |
| `css/dashboard.css` | Cards rainbow do hub: garantir contain (já parcialmente feito) |
| `pages/*.html` (shell) | Só se faltar `data-admin-only` / `hidden` em alguma página |
| Este doc | Plano + checklist |

---

## Fases

### Fase 0 — Confirmação rápida *(≤30 min)*

**Status: concluída** (2026-09-08 — auditoria estática no código + cascata CSS + medições de altura; sem sessão autenticada no device)

#### Checklist

- [x] **Almas / `[hidden]`:** markup tem `data-admin-only` + `hidden` em todas as páginas shell; JS seta `item.hidden`; **não há** regra autor `.app-shell__link[hidden] { display: none }`. `.app-shell__link { display: inline-flex }` (autor, spec `(0,1,0)`) **vence** UA `[hidden] { display: none }` → link **visível** com `hidden` no DOM. Hipótese **confirmada**.
- [x] **Canvas VFX / stacking:** `RAINBOW_VFX_CANVAS_Z_INDEX = 40` em `js/achievements-ui.js`; header mobile `.app-shell__header` também `z-index: 40` → **empate**. Overlay `50`, sidebar `60`, modal relíquia `80`. `setRainbowVfxSuspended` só no scroll-modal / `prefers-reduced-motion` — **drawer não suspende**. Slot rainbow álbum: `overflow: visible` (`css/conquistas.css` ~572–575). Hipótese **confirmada** (z-index + overflow); runtime do canvas da lib não inspecionado logado (auth).
- [x] **Altura drawer vs `100dvh`:** com **6** itens (aluno correto) cabe em SE/Android médio (~602px). Com **7** itens (Almas sempre visível por bug A/C) + safe-area notch: **~746–768px** → overflow em 667/640/740. Prints do reporte batem com aluno vendo Almas. Hipótese principal **confirmada e agravada pelo bug do `[hidden]`**.

#### Evidências numéricas (root 16px, mobile `min-height: 3.45rem`)

| Cenário | Altura miolo (approx.) | 667 CSS px | 640 | 740 |
| --- | --- | --- | --- | --- |
| Aluno 6 links (sem Almas) | ~602px | cabe | cabe | cabe |
| Aluno/admin 7 links (bug) | ~665px | limite | overflow | cabe |
| 7 + safe-area notch (~47+34) | ~746px | overflow | overflow | overflow |
| 7 + brand wrap + safe | ~768px | overflow | overflow | overflow |

#### Defesa Almas (página)

- `pages/souls.html` **não** usa app-shell; `js/souls.js` chama `requireAdmin()` → aluno redirecionado ao dashboard. Critério D já atendido no código; manter na Fase 1.

#### Implicação para Fases 1–2

1. **Fase 1 primeiro** também reduz scroll do menu no aluno (some 1 item ≈ 55px+gap).
2. Fase 2 ainda necessária para **admin (7 itens)** + safe-area / telas curtas.
3. Fase 3: baixar z-index do canvas **abaixo de 40**, clipar slot, suspender VFX no drawer.

### Fase 1 — Almas só para admin *(prioridade alta, baixo risco)*

**Status: concluída** (2026-09-08)

1. ~~Em `css/app-shell.css`, forçar `[hidden]` com `display: none !important`~~ — feito em `.app-shell__link[hidden]` / `[data-admin-only][hidden]` (escopo `.app-shell` para não afetar outros módulos).
2. Smoke manual: login aluno → menu sem Almas; login admin → Almas visível.
3. `souls.html` / `requireAdmin()` — **inalterado** (defesa em profundidade mantida).

**Pronto quando:** aluno nunca vê o item; admin vê.

### Fase 2 — Menu mobile sem scroll *(prioridade alta)*

**Status: concluída** (2026-09-08)

1. Em `@media (max-width: 980px)` (`css/app-shell.css`):
   - Sidebar `gap: 0.75rem`, padding vertical `0.65rem` + safe-area, inline `0.85rem`
   - Brand / nav / footer compactados
   - Links e logout: `min-height: 2.75rem` (antes `3.45rem` no mobile)
2. Extra: `@media (max-width: 980px) and (max-height: 640px)` — densidade ainda menor (`2.55rem`, gaps menores)
3. `overflow-y: auto` mantido só como rede de segurança
4. Estimativa: admin 7 itens + notch ≈ **584px** (cabe em 640/667); short-media ≈ **528px**

**Pronto quando:** em viewport de referência (ex. 390×844 e 360×640) drawer aberto **sem** barra; em SE extremo, short-media cobre.

### Fase 3 — Conter arco-íris / stacking *(prioridade alta)*

**Status: concluída** (2026-09-08)

1. `RAINBOW_VFX_CANVAS_Z_INDEX` → **25** (+ `pinRainbowVfxCanvasLayer` força `style.zIndex` se a lib ignorar)
2. Álbum: `.achievement-slot` e rainbow → `overflow: hidden` + `contain: paint` (removido `overflow: visible`)
3. Hub: cards já tinham `overflow: hidden` + `contain: paint`; regra `1932` é `.dashboard-rail`, não o card — sem mudança necessária
4. Drawer: `syncShellState` chama `setRainbowVfxSuspended(…, 'shell-drawer')`
5. Suspend com **razões** (`shell-drawer` / `scroll-modal` / `reduced-motion`) para overlays concorrentes

**Pronto quando:** prints Conquistas + Painel (preview) em mobile: rainbow “vivo” **dentro** do card; header e menu limpos.

### Fase 4 — Smoke checklist

**Status: concluída** (2026-09-08 — smoke estático `tests/menu-arcoiris-almas-smoke.mjs` + `node --check` nos JS tocados; incluso em `npm run check`)

| Cenário | Esperado | Resultado |
| --- | --- | --- |
| Aluno, mobile, abrir menu | Sem Almas; sem scrollbar (viewport ref.) | **OK estático** — `[hidden]!important` + densidade 2.75rem; *confirmar scrollbar no device* |
| Admin, mobile, abrir menu | Com Almas; cabe ou scroll mínimo | **OK estático** — `allow === admin` + short-media 2.55rem; altura est. ~584px c/ notch |
| Aluno, Conquistas, Juramento | Glitch no card; não cobre header | **OK estático** — canvas z=25 abaixo do header 40; slot `overflow:hidden` |
| Abrir menu sobre Conquistas | Drawer legível; VFX não por cima | **OK estático** — `shell-drawer` suspend |
| Abrir modal relíquia / avatar | VFX não invade | **OK estático** — `scroll-modal` reason + z=80 |
| Desktop admin/aluno | Menu ok; Almas só admin | **OK estático** — markup em 10 páginas shell + `requireAdmin` |

Rodar: `node tests/menu-arcoiris-almas-smoke.mjs`

**Manual no device (opcional pós-deploy):** login aluno e admin no Brave/Android — confirmar ausência visual de scrollbar e glitch “vivo” só dentro do card.

---

## Ordem de implementação sugerida

1. **Fase 1** (Almas) — 1 regra CSS, validação imediata  
2. **Fase 2** (menu) — só `app-shell.css`  
3. **Fase 3** (arco-íris) — JS z-index + CSS contain + suspend no drawer  
4. **Fase 4** — checklist mobile real / emulador  

## Riscos

| Risco | Mitigação |
| --- | --- |
| Densidade mobile “apertada” demais | Compactar paddings antes de fonte; testar 360px |
| Glitch “morto” demais após contain | Preferir baixar z-index + suspend drawer antes de desligar VFX |
| Lib `@vfx-js` ignora `zIndex` | Forçar `canvas.style.zIndex` após `findRainbowVfxCanvas()` |
| FOUC Almas 1 frame | `hidden` no HTML + CSS `!important` (já cobre sem JS) |

## Decisão explícita

- **Não** remover o item Almas do HTML — continua `data-admin-only` + hidden por CSS/JS.  
- **Não** remover o glitch — apenas empilhar e clipar.  
- Scroll do menu: **evitar por layout**; overflow auto só como fallback extremo.
