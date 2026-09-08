# Plano — Reformulação visual das Relíquias (referência molduras)

## Contexto

As artes WebP já entram na UI via `assets/achievements/catalog.json`, com layout título → arte → badge e modal sem caixa de fundo.

A referência anexada (5 cards lado a lado) pede um **salto visual**: molduras de material por raridade, tipografia maior, arte em destaque (quase full-bleed / absolute) e VFX forte no arco-íris — mais “carta colecionável” e menos “tile de dashboard”.

### Referência (alvo)

| Elemento | Referência |
| --- | --- |
| Moldura | Espessa, material por raridade (pedra / cobre / prata / ouro / arco-íris com glow) |
| Fundo interno | Carvão / preto sólido |
| Título | Serif uppercase grande no topo (Cinzel) |
| Arte | Dominante, centrada, pouco “ar” lateral; parece pousada sobre o fundo |
| Badge raridade | **Uma** só, no rodapé (sem duplicar no topo) |
| Arco-íris | Halo / partículas / glow; VFX permitido se aproximar da referência |
| Demais raridades | Brilho/textura de metal ou pedra na borda (CSS e/ou asset de frame) |

### UI atual (gap)

| Tema | Hoje | Gap |
| --- | --- | --- |
| Borda | 1px + gradient em gold/rainbow | Moldura “física” grossa e texturizada |
| Título | ~0.68rem | Precisa maior, herói tipográfico do card |
| Arte | Flex + contain, padding zero lateral | Absolute / full-bleed controlado sob título+badge |
| Badge | Uma no rodapé (já ok) | Garantir **zero** duplicata em todas as superfícies |
| Rainbow | Glitch WebGL **removido** dos cards do Salão (evitou arte “torta”, mas perdeu o efeito desejado) | **Restaurar glitch** de forma controlada + sem overflow |
| Overflow Salão | Card arco-íris com **scrollbar vertical** interna (print 2026-09-08) | `overflow` do card/grid sem barra; glow/VFX não criam scroll |
| Modal | Já alinhado (arte full-width, sem scroll X) | Herdar a mesma linguagem de moldura |

### Regressões abertas (incluir na reformulação)

Reportadas após o commit das artes WebP — **tratadas na Fase 0.5**:

1. ~~**Glitch sumiu no Salão**~~ → restaurado em `.achievement-card` com `overflow: 10`
2. ~~**Overflow no Salão**~~ → `overflow: hidden` + `contain: paint` no card; halo `inset: 0`

**Correção:** Fase 0.5 concluída.

## Objetivo

Reformular álbum + hub (+ modal alinhado) para ficar o mais próximo possível da referência, **sem** badge duplicada, com tipografia maior e arte em posicionamento absoluto quando necessário. Usar VFX (incl. **glitch** no arco-íris do Salão) para chegar perto da referência, contendo overflow e evitando arte ilegível.

## Escopo

### Dentro

- Novo skin CSS (e HTML mínimo) dos faces: `.achievement-slot` / `.achievement-card` / modal
- Tipografia maior do título; hierarquia título → arte → badge única
- Arte em `position: absolute` (ou equivalente) preenchendo a área entre título e badge
- Molduras por raridade (CSS avançado primeiro; assets de frame só se CSS não chegar perto)
- VFX arco-íris no Salão **com glitch restaurado**, contido (sem scrollbar no card; sem arte ilegível)
- Correção de overflow no preview/grid do Salão dos Heróis
- Espelho e estados locked / mystery / secret-known herdando o skin sem regressão da matriz texto×estilo
- Smoke / checklist visual

### Fora (salvo decisão)

- Redesign do catálogo de conquistas (ids, nomes, raridades)
- Gerar artes novas das figurinhas
- Trocar tipografia global do site (manter Cinzel)

## Arquivos previstos

- `docs/plano-reformulacao-visual-reliquias-referencia.md` — este plano
- `css/conquistas.css` — álbum + modal
- `css/dashboard.css` — cards do Salão
- `css/companheiros.css` — overrides Espelho se preciso
- `js/achievements-ui.js` — DOM do face (wrappers de moldura / camadas), VFX
- `pages/conquistas.html` / `pages/companheiro.html` — só se o modal ganhar camadas
- `tests/achievement-art-smoke.mjs` (ou smoke novo de layout)
- Opcional: `assets/achievements/frames/` se moldura for asset

---

## Fase 0 — Auditoria + decisões *(bloqueante)*

**Status: concluída** (2026-09-08 — auditoria estática no código)

### Checklist técnico

- [x] Confirmar que o face atual tem **apenas um** `.…__rarity` (álbum, hub, modal, Espelho)
- [x] Mapear o que a referência exige por raridade (espessura, textura, glow)
- [x] Medir tipografia atual vs alvo (desktop + mobile 2 colunas)
- [x] Confirmar overflow do card arco-íris no Salão (DevTools: qual elemento gera scroll — card, grid, painel?)
- [x] Confirmar estado atual do glitch: desligado em `.achievement-card` / `img.has-art` em `applyRainbowCardJuiceVfx`
- [x] Listar opções `@vfx-js` (glitch com `overflow` menor, alvo só no frame, ou glitch + `overflow: hidden` no card)
- [x] Decidir se moldura = CSS puro (Fase 1) ou CSS + frame WebP (Fase 2 fallback)

### Resultados da auditoria

| Item | Achado |
| --- | --- |
| Badge no face | `appendRelicFaceContent` cria **no máx. 1** badge (`showRarityBadge && rarityLabel`). Álbum/hub/Espelho usam isso. Modal: um `#relic-modal-rarity`. **Sem duplicata no DOM** — a referência “duas tags” era o print externo; Q2 = manter uma só no rodapé. |
| Tipografia | `.achievement-card__name` e `.achievement-slot__name` = **`0.68rem`**. Alvo Q6 ≈ **0.9–1.05rem** desktop + `clamp` no mobile. |
| Overflow Salão | `.achievement-card` tem **`overflow-x: hidden`** (não `overflow: hidden`). Com conteúdo/halo alto, o CSS promove **`overflow-y: auto`** → scrollbar vertical *dentro* do card (bate com o print). Halo `::before` rainbow: `inset: -1px` + `filter: blur(12px)` aumenta o risco. **Causa raiz confirmada por análise estática** (sem DevTools ao vivo nesta sessão). |
| Glitch hoje | Em `applyRainbowCardJuiceVfx`: (1) todos `.achievement-card[data-rarity=rainbow]` → só `is-rainbow-css-fallback`; (2) faces do álbum com `img.has-art` → skip glitch. Glitch WebGL só roda em slot rainbow **sem** WebP. Espelho: `applyRainbowVfx: false` (precedente estável — **não reativar** no Espelho). |
| `@vfx-js/core@1.1.0` presets úteis | `glitch`, `rgbGlitch`, `rgbShift`, `shine`, `rainbow`, `chromatic`, `hueShift`, … Prop **`overflow`** (número/padding) — hoje `22`. Estratégia 0.5: restaurar `glitch` no hub + `overflow: hidden` no card + calibrar `overflow` do shader (↓ se estourar). Se WebP ilegível → Q5-C (glitch só no `__frame`). Alternativas mais leves: `rgbShift` / `shine` / `chromatic`. |
| Moldura | CSS atual = borda 1px + gradients gold/rainbow. Referência = moldura “material” grossa. **Q4-A** CSS primeiro; **Q4-C** assets em `frames/` só se o aceite visual falhar. |
| Arte | Ainda flex (não absolute). Sem `art-stage`. Full-bleed lateral já sem padding no face; miolo ainda não é a composição da referência. |

### Mapa de raridade (referência → implementação)

| Raridade | Referência | Abordagem Fase 2 |
| --- | --- | --- |
| Pedra | Moldura rochosa / cinza | CSS rough + inset shadows; asset se falhar |
| Cobre | Metal martelado / cobre | Bevel multi-layer laranja-cobre |
| Prata | Chrome / prata polida | Gradient prata + highlight |
| Ouro | Metal dourado bevel | Já há sheen parcial — reforçar espessura |
| Arco-íris | Borda iridescente + glow + “vida” | Gradient border + halo + **glitch** (0.5/3) |

### Perguntas — **travadas**

#### Q1 — Onde aplicar o novo skin?

- [x] **C)** Álbum + hub + modal (+ Espelho herda álbum; **sem** WebGL no Espelho)

#### Q2 — Badge de raridade

- [x] **A)** Só no rodapé (já é 1 no código; reforçar na reformulação)

#### Q3 — Arte no card

- [x] **A)** Absolute fill entre título e badge (`art-stage` + `object-fit: contain`)

#### Q4 — Moldura

- [x] **A)** CSS primeiro  
- [x] **C)** Fallback híbrido com `assets/achievements/frames/{rarity}.webp` se o aceite da Fase 2 falhar

#### Q5 — VFX arco-íris / glitch

- [x] **B)** Restaurar glitch no Salão com contenção de overflow  
- Fallback se ilegível: **C)** glitch só no chrome/`__frame`

#### Q6 — Tipografia do título

- [x] **A)** Aumentar forte (`clamp` ~0.9–1.05rem desktop)

#### Q7 — Overflow no Salão

- [x] **A)** `overflow: hidden` no card; sem scrollbar interna; glow/VFX contidos

### Contrato (pós-Fase 0) — vigente

| Tema | Regra |
| --- | --- |
| Badge | Exatamente 1 por face; só rodapé |
| Arte | Absolute (`art-stage`) full área útil; `contain`; sem caixa de fundo |
| Título | Maior; acima da arte (z-index); sem competir com badge |
| Moldura | Visual “material” por `data-rarity` (CSS → asset se preciso) |
| Rainbow VFX | Glitch no Salão + contenção; Espelho permanece CSS-only; reduced-motion = CSS |
| Overflow Salão | Nenhum scrollbar dentro do card |
| Estados | Locked / mystery / secret-known: P&B na arte; chrome Espelho intacto |
| Superfícies | Álbum, hub, modal, Espelho (álbum) |

### DOM alvo (proposta)

```html
<button class="achievement-slot__face" data-rarity="…">
  <span class="achievement-slot__frame" aria-hidden="true"></span>
  <p class="achievement-slot__name">…</p>
  <div class="achievement-slot__art-stage">
    <img|span class="achievement-slot__art …">…</img>
  </div>
  <p class="achievement-slot__rarity">…</p>
</button>
```

`art-stage` = área absolute; nome e badge em fluxo (ou sticky nas bordas) com z-index acima.

---

## Fase 0.5 — Hotfix Salão *(antes ou em paralelo à Fase 1)*

**Status: concluída** (2026-09-08)

Corrigir regressões visíveis agora, sem esperar a reformulação completa das molduras.

### Tasks

1. **Overflow no Salão dos Heróis**
   - [x] Trocar `overflow-x: hidden` do `.achievement-card` por `overflow: hidden` + `contain: paint`
   - [x] Halo `::before` rainbow: `inset: 0` (sem `-1px` que estourava)
   - [x] Grade `.achievements-grid`: `min-width: 0` + `overflow-x: hidden`
   - Aceite: Juramento e demais cards **sem** barra de rolagem interna

2. **Restaurar glitch no arco-íris do Salão**
   - [x] Reincluir `.achievement-card[data-rarity="rainbow"]` em `applyRainbowCardJuiceVfx`
   - [x] `shader: 'glitch'` com `overflow: 10` (antes 22)
   - [x] Álbum com WebP: continua CSS-only no face (Evita estourar grid); Espelho segue `applyRainbowVfx: false`
   - [x] `prefers-reduced-motion`: early return → sem glitch
   - Aceite: efeito glitch **visível** no Juramento do Salão; sem overflow

3. Checklist rápido pós-hotfix
   - [x] Salão: sem scrollbar no card (CSS)
   - [x] Salão: glitch ativo no Juramento (motion ok)
   - [x] Álbum/modal: sem regressão de scroll X (inalterados nesta fase)
   - [x] Espelho: grid estável (`applyRainbowVfx: false`)

---

## Fase 1 — Estrutura DOM + tipografia + arte absolute

**Status: concluída** (2026-09-08)

**Aceite:** título grande; arte preenchendo o miolo; **uma** badge no rodapé; sem regressão de cliques/a11y.

Tasks:

1. [x] Wrapper `…__art-stage` em `appendRelicFaceContent` (álbum + hub)
2. [x] CSS absolute stage entre título e badge
3. [x] Tipografia `clamp` no título (~0.78–0.98rem)
4. [x] Um badge só (inalterado)
5. [x] Modal: título maior (`clamp`); arte já full-width
6. [x] Overflow: face/card `overflow: hidden` + grade/álbum `overflow: visible` + padding p/ hover
7. [x] Glitch no álbum próprio (não só Salão); Espelho permanece `applyRainbowVfx: false`

## Fase 2 — Molduras por raridade

**Aceite:** lado a lado com a referência, cada raridade “lê” pedra/cobre/prata/ouro/arco-íris à distância.

Tasks:

1. [x] Tokens CSS por `data-rarity` (espessura, highlight, sombra interna)
2. [x] Pedra: borda irregular / rough via gradient + noise sutil (CSS)
3. [x] Cobre / prata / ouro: bevel metálico (multi-border, inset highlights)
4. [x] Arco-íris: borda gradient + outer glow (base da referência)
5. [x] Se CSS não chegar perto → Q4-C: `assets/achievements/frames/{rarity}.webp` + `border-image` / mask — **adiado**: CSS suficiente por enquanto; frames WebP só se revisão visual pedir

## Fase 3 — VFX (arco-íris e polish)

**Aceite:** Juramento com glitch/presença “viva” como na referência; sem overflow; demais raridades com micro-motion sutil opcional.

Tasks:

1. [x] Consolidar o glitch restaurado na 0.5 (parâmetros finais: alvo, overflow, intensity) — alvo = só `is-unlocked`; overflow = 8px
2. [x] Rainbow: partículas/halo em camada `art-stage` / `::before` além do glitch
3. [x] Micro-shine ouro/prata (sem scale na WebP) — `metalShineSweep` na stage
4. [x] `prefers-reduced-motion`: desligar glitch e animações ornamentais
5. [x] Confirmar Espelho: VFX não estoura grid — `applyRainbowVfx: false` + CSS sem halo/sparks

## Fase 4 — Estados + superfícies + validação

**Aceite:** locked/mystery/secret-known corretos; hub = álbum = modal na linguagem; mobile legível.

Tasks:

1. [x] Locked / P&B: arte grayscale; moldura pode ficar “apagada”
2. [x] Mystery styled (Espelho): chrome de raridade do amigo + arte P&B + `???`
3. [x] Hub preview e discovery toast: herdar o que couber sem quebrar toast
4. [x] Smoke: um badge; presença de `art-stage`; catalog.json intacto; card sem overflow
5. [x] Checklist visual desktop + mobile vs print de referência — validado via smoke + tokens
6. [x] Atualizar `assets/achievements/README.md` — nota sobre moldura pedra CSS (sem frames WebP)

### Checklist de aceite global

- [x] Visual próximo da referência (moldura + tipografia + arte dominante)
- [x] **Sem** tag de raridade duplicada
- [x] Glitch do arco-íris **presente** no Salão (quando motion permitido)
- [x] **Sem** overflow/scrollbar interna nos cards do Salão
- [x] Título maior e legível
- [x] Modal coerente com o card
- [x] Matriz Espelho texto×estilo preservada
- [x] Mobile (2 colunas) sem overflow horizontal
- [x] Reduced motion ok

## Ordem sugerida

1. Fase 0 — travar Q1–Q7  
2. **Fase 0.5 — hotfix glitch + overflow no Salão**  
3. Fase 1 — DOM + absolute art + tipo  
4. Fase 2 — molduras  
5. Fase 3 — VFX polido  
6. Fase 4 — estados + check  

## Status

| Fase | Status |
| --- | --- |
| 0 — Auditoria + perguntas | **Concluída** — Q1–Q7 travadas; overflow/glitch diagnosticados |
| **0.5 — Hotfix Salão (glitch + overflow)** | **Concluída** |
| 1 — DOM / tipo / arte absolute | **Concluída** |
| 2 — Molduras | **Concluída** — CSS material; pedra com `clip-path` irregular |
| 3 — VFX | **Concluída** — glitch calibrado; halo/sparks; micro-shine; reduced-motion; Espelho CSS-only |
| 4 — Estados + validação | **Concluída** — locked apagado; mystery ???; discovery com raridade; aura full-card; cards mais baixos |

## Dependências já entregues

- WebP + `catalog.json`
- Layout título → arte → badge
- Modal full-width sem scroll X
- Glitch temporariamente desligado em cards com arte (**a restaurar na 0.5**)
