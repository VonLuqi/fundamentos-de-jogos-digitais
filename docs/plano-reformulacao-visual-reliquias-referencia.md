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
| Rainbow | CSS glow + glitch WebGL desligado em cards com WebP (evita arte “torta”) | VFX **não-destrutivo** (halo, sparkle, shine) sem distorcer a figurinha |
| Modal | Já alinhado (arte full-width, sem scroll X) | Herdar a mesma linguagem de moldura |

## Objetivo

Reformular álbum + hub (+ modal alinhado) para ficar o mais próximo possível da referência, **sem** badge duplicada, com tipografia maior e arte em posicionamento absoluto quando necessário. Usar VFX onde ajudar (especialmente arco-íris), desde que não distorça a WebP.

## Escopo

### Dentro

- Novo skin CSS (e HTML mínimo) dos faces: `.achievement-slot` / `.achievement-card` / modal
- Tipografia maior do título; hierarquia título → arte → badge única
- Arte em `position: absolute` (ou equivalente) preenchendo a área entre título e badge
- Molduras por raridade (CSS avançado primeiro; assets de frame só se CSS não chegar perto)
- VFX arco-íris seguro (sem shader `glitch` na figurinha)
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

### Checklist técnico

- [ ] Confirmar que o face atual tem **apenas um** `.…__rarity` (álbum, hub, modal, Espelho)
- [ ] Mapear o que a referência exige por raridade (espessura, textura, glow)
- [ ] Medir tipografia atual vs alvo (desktop + mobile 2 colunas)
- [ ] Listar VFX disponíveis no `@vfx-js` que **não** distorcem bitmap (evitar `glitch` na arte)
- [ ] Decidir se moldura = CSS puro (Fase 1) ou CSS + frame WebP (Fase 2 fallback)

### Perguntas — respostas propostas (travar na Fase 0)

#### Q1 — Onde aplicar o novo skin?

- [ ] **A)** Só álbum  
- [ ] **B)** Álbum + hub  
- [x] **C)** Álbum + hub + modal (+ Espelho herda álbum)

#### Q2 — Badge de raridade

- [x] **A)** Só no rodapé (remover qualquer duplicata no topo / chrome embutido na arte)

#### Q3 — Arte no card

- [x] **A)** Absolute fill entre título e badge (`inset` + `object-fit: contain`), z-index sob o texto  
- [ ] **B)** Continuar só flex sem absolute

#### Q4 — Moldura

- [x] **A)** CSS primeiro (border-image / multi-layer / gradients / pseudo-elementos)  
- [ ] **B)** Asset `{rarity}-frame.webp` por raridade desde o início  
- [ ] **C)** Híbrido: CSS agora; assets só se o aceite falhar

#### Q5 — VFX arco-íris

- [x] **A)** Halo/glow/sparkle **fora** da `<img>` (pseudos + opcional VFX no chrome); nunca `glitch` na WebP  
- [ ] **B)** Reativar glitch no card inteiro  
- [ ] **C)** Só CSS, sem `@vfx-js`

#### Q6 — Tipografia do título

- [x] **A)** Aumentar forte no face (ex. ~0.9–1.05rem desktop; clamp no mobile), line-height apertado, 2 linhas ok  
- [ ] **B)** Manter tamanho atual

### Contrato (pós-Fase 0)

| Tema | Regra |
| --- | --- |
| Badge | Exatamente 1 por face; só rodapé |
| Arte | Absolute (ou camada dedicada) full área útil; `contain`; sem caixa de fundo |
| Título | Maior; acima da arte (z-index); sem competir com badge |
| Moldura | Visual “material” por `data-rarity` |
| Rainbow VFX | Decorativo, não destrutivo na figurinha |
| Estados | Locked / mystery / secret-known: P&B na arte; chrome de estilo Espelho intacto |
| Superfícies | Álbum, hub, modal, Espelho |

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

## Fase 1 — Estrutura DOM + tipografia + arte absolute

**Aceite:** título grande; arte preenchendo o miolo; **uma** badge no rodapé; sem regressão de cliques/a11y.

Tasks:

1. Introduzir wrapper `…__art-stage` (álbum + hub) em `appendRelicFaceContent` / render
2. CSS: face `position: relative`; stage `position: absolute; inset: …` (deixar faixas para título/badge)
3. Aumentar fonte do título (`clamp` / media queries)
4. Garantir grep/smoke: nenhum segundo badge no face
5. Modal: espelhar hierarquia (moldura fina alinhada; arte já full-width)

## Fase 2 — Molduras por raridade

**Aceite:** lado a lado com a referência, cada raridade “lê” pedra/cobre/prata/ouro/arco-íris à distância.

Tasks:

1. Tokens CSS por `data-rarity` (espessura, highlight, sombra interna)
2. Pedra: borda irregular / rough via gradient + noise sutil (CSS)
3. Cobre / prata / ouro: bevel metálico (multi-border, inset highlights)
4. Arco-íris: borda gradient + outer glow (base da referência)
5. Se CSS não chegar perto → Q4-C: `assets/achievements/frames/{rarity}.webp` + `border-image` / mask

## Fase 3 — VFX (arco-íris e polish)

**Aceite:** Juramento com presença “viva” sem arte torta; demais raridades com micro-motion sutil opcional.

Tasks:

1. Rainbow: partículas/halo em camada `…__frame` ou `::before/::after` (fora da img)
2. Avaliar shader `@vfx-js` **só no chrome** (não no card inteiro com img) — se a lib não permitir escopo, ficar em CSS/canvas leve
3. Micro-shine ouro/prata (sem scale na WebP)
4. `prefers-reduced-motion`: desligar animações ornamentais
5. Confirmar Espelho: VFX não estoura grid (já houve regressão antes)

## Fase 4 — Estados + superfícies + validação

**Aceite:** locked/mystery/secret-known corretos; hub = álbum = modal na linguagem; mobile legível.

Tasks:

1. Locked / P&B: arte grayscale; moldura pode ficar “apagada”
2. Mystery styled (Espelho): chrome de raridade do amigo + arte P&B + `???`
3. Hub preview e discovery toast: herdar o que couber sem quebrar toast
4. Smoke: um badge; presença de `art-stage`; catalog.json intacto
5. Checklist visual desktop + mobile vs print de referência
6. Atualizar `assets/achievements/README.md` se frames entrarem

### Checklist de aceite global

- [ ] Visual próximo da referência (moldura + tipografia + arte dominante)
- [ ] **Sem** tag de raridade duplicada
- [ ] Arte sem distorção (sem glitch na WebP)
- [ ] Título maior e legível
- [ ] Modal coerente com o card
- [ ] Matriz Espelho texto×estilo preservada
- [ ] Mobile (2 colunas) sem overflow horizontal
- [ ] Reduced motion ok

## Ordem sugerida

1. Fase 0 — travar Q1–Q6  
2. Fase 1 — DOM + absolute art + tipo  
3. Fase 2 — molduras  
4. Fase 3 — VFX seguro  
5. Fase 4 — estados + check  

## Status

| Fase | Status |
| --- | --- |
| 0 — Auditoria + perguntas | Pronta para iniciar (Q1–Q6 propostas) |
| 1 — DOM / tipo / arte absolute | Pendente |
| 2 — Molduras | Pendente |
| 3 — VFX | Pendente |
| 4 — Estados + validação | Pendente |

## Dependências já entregues

- WebP + `catalog.json`
- Layout título → arte → badge
- Modal full-width sem scroll X
- Glitch desligado em cards com arte (base para VFX não-destrutivo)
