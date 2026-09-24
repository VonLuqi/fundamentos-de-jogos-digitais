# Fase F — Juramentos Selados (grade Cookie + tooltip)

> **Master Plan:** [`00-master-plan.md`](./00-master-plan.md)  
> **Base:** [`plano-despertar-sync-loja-selados-debug.md`](../plano-despertar-sync-loja-selados-debug.md) §6  
> **Estado do documento:** fechado  
> **Estado da implementação:** Task 0 + F1–F3 feitos  
> **Dependência:** independente após **Fase A**; tip pode compartilhar helpers da strip Styx (Fase D ajuda mas não bloqueia)  
> **Paralelo:** pode rodar junto com C–E  
> **Fora desta fase:** mudar economia dos juramentos; nova aba Stats

---

## Objetivo da fase

Transformar `#despertar-sealed-juramentos` de “lista de chips com nome” em **grade densa de ícones** (Cookie Clicker), com detalhe no hover:

1. Ícones ~32×32, `gap: 2px`, sem label de nome no chip.
2. Tooltip (`#sealed-tooltip` ou reuso `#styx-tooltip`) com nome + blurb.
3. A11y: `aria-label`, teclado, Esc fecha tip.

---

## Task 0 — Decisões congeladas

**Checklist**

- [x] P6 aceito
- [x] Ordem F1 → F3 congelada

### Decisões

| # | Tema | Decisão | Status |
| --- | --- | --- | --- |
| **P6** | Tooltip | **`#sealed-tooltip`** + classes `.despertar-upgrade-tooltip` (tip próprio evita conflito com Styx; hide no leave) | **Congelado** |
| **F-D1** | Tamanho | **32×32 CSS px** (2rem), gap **2px** | **Congelado** |
| **F-D2** | Conteúdo tip | Nome + `upgradeBlurb` + marca “Selado” | **Congelado** |

---

## Task F1 — Refator `#renderSealed` / mount

**Status:** feito (2026-09-22)

**Arquivos**

- `js/hades-despertar/ui/UIRenderer.js`
- `pages/despertar.html` (estrutura `ul` sealed)
- `css/despertar.css` (grade densa; tip wire fica em F2)
- `tests/despertar-selados-smoke.mjs`

**Comportamento**

```
[■][■][■][■][■][■][■][■]
[■][■][■] …
```

- Botão ícone **sem** `<span>` de nome.
- Nome só no tip / `aria-label`.
- Ordem estável: `UPGRADES.filter(owned)` (catálogo ∩ owned).

**Checklist**

- [x] Owned juramentos ainda listados (só layout muda)
- [x] Ordem estável (catálogo / owned order)

**Aceite**

- [x] Visual próximo da grade Cookie (ícones colados)

---

## Task F2 — CSS denso + tooltip wire

**Status:** feito (2026-09-22)

**Arquivos**

- `css/despertar.css`
- `UIRenderer.js` (`#positionFixedTip` compartilhado + `#showSealedTip` / `#hideSealedTip`)
- `pages/despertar.html` (`#sealed-tooltip`)
- `tests/despertar-selados-smoke.mjs`

**Comportamento**

- `ul.despertar-sealed-icons` flex wrap; gap 2px; sem chip largo.
- pointerenter/focus → tip; leave/Esc → hide (paridade Styx).
- Um tip ativo por vez (hide no leave / ao abrir o outro tip evita conflito com Styx).
- Tip: nome + `upgradeBlurb` + marca “Selado”.

**Checklist**

- [x] Hover = tip com nome + efeito
- [x] Print-test 360px: wrap sem estourar coluna (`max-width: 100%` + flex wrap)
- [x] Gap ≤ 4px assertável no CSS/smoke

**Aceite**

- [x] Área Selados parece grade Cookie; tip útil

---

## Task F3 — A11y + smokes

**Status:** feito (2026-09-22)

**Arquivos**

- `tests/despertar-a11y-smoke.mjs`
- `tests/despertar-styx-smoke.mjs`
- `tests/despertar-selados-smoke.mjs`

**Checklist**

- [x] `aria-label={name}`; tip `aria-describedby` se aplicável
- [x] Tab entre ícones (`type=button`, sem `tabindex=-1`); Esc fecha
- [x] Smoke: sealed usa classes de tooltip; gap ≤ 4px

**Aceite**

- [x] DoD Fase F fechado

---

## Definition of Done — Fase F

- [x] Task 0 + F1–F3 feitas
- [x] Grade densa + tooltip; a11y ok
- [x] Master Plan: marcar Fase F `[x]`
- [x] Se último item do guia: marcar **aceite global** no Master Plan
