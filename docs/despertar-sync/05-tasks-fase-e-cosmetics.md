# Fase E — Cosméticos de upgrade → sprites / Foice

> **Master Plan:** [`00-master-plan.md`](./00-master-plan.md)  
> **Base:** [`plano-despertar-sync-loja-selados-debug.md`](../plano-despertar-sync-loja-selados-debug.md) §5  
> **Estado do documento:** fechado  
> **Estado da implementação:** Task 0 + E1–E4 feitos  
> **Dependência:** após **Fase D** (árvore de upgrades estável; saber quais ids estão “ativos”)  
> **Fora desta fase:** pack completo de WebP de arte (só pedido em `PEDIDOS-MESTRE.md`); redesign de partículas

---

## Objetivo da fase

Fazer upgrades comprados **alterarem o mundo** visualmente (Cookie-like):

1. Config `upgrade-cosmetics.js` (target, accessory, coverage, layer).
2. Mask determinística Bresenham (`floor((i+1)·c) > floor(i·c)`).
3. Draw procedural nas prateleiras (`WorldView`) + classe/glow na Foice (`AltarOrbit` / `#despertar-reap`).
4. Empilhar layers diferentes; mesma layer → maior `priority`.

---

## Task 0 — Decisões congeladas

**Checklist**

- [x] P5 aceito
- [x] Ordem E1 → E4 congelada
- [x] 1–2 exemplos P0 escolhidos (default: Servos + Foice)

### Decisões

| # | Tema | Decisão | Status |
| --- | --- | --- | --- |
| **P5** | Arte | **Procedural/CSS P0**; WebP em `assets/despertar/cosmetics/` = fase arte depois | **Congelado** |
| **E-D1** | Exemplos | `moeda_no_barquinho` → hat 50% em `charon_servants`; `foice_afilada` → `blade_glow` 100% na foice | **Congelado** |
| **E-D2** | Determinismo | `floor((i+1)·c) > floor(i·c)` (Bresenham) — estável; 10@0.5 → 5 índices | **Congelado** |
| **E-D3** | Perf | Respeitar `visualCap` das prateleiras; sem partículas extras por accessory | **Congelado** |

---

## Task E1 — Config + helper de coverage

**Status:** feito (2026-09-22)

**Arquivos**

- `js/hades-despertar/config/upgrade-cosmetics.js` (**novo**)
- `tests/despertar-cosmetics-smoke.mjs`

**Comportamento**

```js
{
  moeda_no_barquinho: {
    targetGeneratorId: 'charon_servants',
    accessory: 'hat_charon',
    coverage: 0.5,
    layer: 'hat',
  },
  foice_afilada: {
    target: 'reap',
    accessory: 'blade_glow',
    coverage: 1,
  },
}
```

`activeCosmetics(state)` → lista filtrada por upgrades owned (+ resolve de layers).

**Checklist**

- [x] Mask determinística smoke (±0 em re-runs)
- [x] Export limpo para WorldView (`cosmeticsForGenerator` / `cosmeticsForReap`)

**Aceite**

- [x] qty 10 + coverage 0.5 → exatamente 5 índices (`[1,3,5,7,9]`)

---

## Task E2 — `WorldView.#paintShelf` accessories

**Status:** feito (2026-09-22)

**Arquivos**

- `js/hades-despertar/ui/world/WorldView.js` — `drawAccessory`, sync/paint
- `tests/despertar-world-smoke.mjs`

**Comportamento**

- Ao pintar célula `i`, se cosmetic casa e `indexMatches(i, coverage)` → `drawAccessory(ctx, accessory, cellRect, bob)`.
- P0: path simples (triângulo “chapéu”, stroke, cor do tier).

**Checklist**

- [x] Sem accessory se upgrade não owned
- [x] Cap visual existente respeitado

**Aceite**

- [x] Comprar juramento dos Servos altera ~metade dos sprites **sem reload**

---

## Task E3 — Foice / órbita

**Status:** feito (2026-09-22)

**Arquivos**

- `js/hades-despertar/config/upgrade-cosmetics.js` — `applyReapCosmeticClasses`
- `js/hades-despertar/ui/world/AltarOrbit.js` — sync aplica classes no `#despertar-reap`
- `css/despertar.css` — `.has-cosmetic-blade_glow` + reduced-motion
- `tests/despertar-altar-smoke.mjs` / `despertar-cosmetics-smoke.mjs`

**Comportamento**

- Cosméticos `target: 'reap'`: classe CSS `has-cosmetic-<accessory>`.
- Layers: hat + tool empilham; mesma layer = priority (já em E1).

**Checklist**

- [x] `foice_afilada` → glow Styx visível
- [x] Reduced-motion: glow estático ok

**Aceite**

- [x] Foice muda na compra do upgrade

---

## Task E4 — Smokes + nota de arte

**Status:** feito (2026-09-22)

**Arquivos**

- `tests/despertar-world-smoke.mjs` — E4 coverage ~5/10
- `tests/despertar-altar-smoke.mjs` / `despertar-cosmetics-smoke.mjs` (E3)
- `assets/despertar/PEDIDOS-MESTRE.md` — § P3 cosméticos WebP

**Checklist**

- [x] Smoke: upgrade owned + qty 10 → ~5 células com accessory (±1)
- [x] Nota curta para arte WebP depois

**Aceite**

- [x] DoD Fase E fechado

---

## Definition of Done — Fase E

- [x] Task 0 + E1–E4 feitas
- [x] ≥1 upgrade reflete visualmente em sprites/Foice
- [x] Master Plan: marcar Fase E `[x]`
