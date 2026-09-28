# Pedidos de arte — O Despertar (Task B4)

Lista aberta para o **Mestre**. Placeholders procedurais já estão em
`assets/despertar/sprites/`; substituir o arquivo no mesmo path basta.

Fonte estruturada: [`art-requests.json`](./art-requests.json)  
Regenerar capa P2: `npm run despertar:art-requests`

## Spec global

| Campo | Valor |
| --- | --- |
| Formato | **WebP** primário; **SVG** fallback (Q16) |
| Fundo | Transparente |
| Estilo | Silhueta flat Hades + 1–2 acentos (não pixel 32², não paint full) |
| Paleta | bg `#0a0a0f` · ouro `#cfa759` / `#e8d4a8` · Styx `#00a896` · Lethe `#a855f7` · fogo `#d90429` · corpo `#0c1218` |
| Naming | = `id` do catálogo (`wandering_shade.webp`, `foice_afilada.webp`, …) |

## 1ª leva (P0) — entregar primeiro

| ID | Peça | Tamanho | Path |
| --- | --- | --- | --- |
| B1 | Foice / Portal (idle + pressed) | 512² | `sprites/foice/foice-idle.webp`, `foice-pressed.webp` |
| B2 | Sombra Vagante | 64² + 128² | `sprites/generators/wandering_shade.webp` (+ `.svg`) |
| B3 | Servos de Caronte | 64² + 128² | `sprites/generators/charon_servants.webp` (+ `.svg`) |

## P1 — segunda leva

| ID | Peça | Tamanho | Path |
| --- | --- | --- | --- |
| B4–B7 | Cão, Juiz, Forja, Trono | 64² + 128² | `sprites/generators/{id}.webp` |
| B8 | Juramentos (12 prioritários ou 19) | 48² (+128²) | `sprites/upgrades/{id}.webp` |
| B9 | Chrome Juízo (VS, moldura, faixa) | SVG | `assets/despertar/juizo/*.svg` |

### Juramentos prioritários (B8)

`foice_afilada`, `juramento_acheron`, `pacto_das_margens`, `ceifador_ctoniano`, `colheita_eterna`, `umbras_despertas`, `cortejo_das_sombras`, `moeda_no_barquinho`, `frota_de_caronte`, `trela_cerberiana`, `tres_cabecas`, `veredito_tartaro`

## P2 — capas Juízo com arquivo ausente

Dropar em `assets/despertar-juizo/covers/` (ou ClassInd compartilhado), **mesmo filename** do stub:

- `minecraft.webp`
- `fortnite.webp`
- `roblox.webp`
- `among-us.webp`
- `elden-ring.webp`
- `hades.webp`
- `stardew-valley.webp`
- `super-mario-odyssey.webp`
- `portal-2.webp`

Tamanho sugerido: **600×800** WebP (padrão ClassInd).

## P3 — Cosméticos de upgrade (Fase E / E3)

P0 do jogo usa **procedural/CSS** (`drawAccessory` + classes `has-cosmetic-*`).  
Quando houver arte, dropar WebP transparente em `assets/despertar/cosmetics/`.  
O runtime tenta WebP → SVG → **fallback procedural** (sem quebrar o jogo).

Pasta: [`cosmetics/`](./cosmetics/) · Naming = id do accessory em `upgrade-cosmetics.js`.

| Accessory | Peça | Tamanho | Path |
| --- | --- | --- | --- |
| `hat_charon` | Chapéu / aba nos Servos (~50% coverage) | 64² | `cosmetics/hat_charon.webp` (+ `.svg`) |
| `boat_wake` | Trilha aquática sob Servos | 64² | `cosmetics/boat_wake.webp` |
| `shade_wisp` | Fumaça / wisp nas Sombras (órbita) | 64² | `cosmetics/shade_wisp.webp` |
| `hound_chain` | Corrente / olhos no Cão | 64² | `cosmetics/hound_chain.webp` |
| `hound_triple_aura` | Tri-glow no Cão | 64² | `cosmetics/hound_triple_aura.webp` |
| `judge_scale_fx` | Balança no Juiz do Tártaro | 64² | `cosmetics/judge_scale_fx.webp` |
| `blade_glow` | Glow Styx na Foice (CSS ok até entrega) | 512² overlay | `cosmetics/blade_glow.webp` |
| `blade_runes` | Runas no cabo | 512² overlay | `cosmetics/blade_runes.webp` |
| `blade_ember` | Brasas / fogo | 512² overlay | `cosmetics/blade_ember.webp` |
| `blade_seal` | Carimbo Bancada (`selo_do_juiz`) | 512² overlay | `cosmetics/blade_seal.webp` |
| `reap_ripple` | Onda Styx no clique (CSS trail ok) | 512² ou CSS | `cosmetics/reap_ripple.webp` |
| `orbit_halo` | Aureola dourada na órbita | 512² ring | `cosmetics/orbit_halo.webp` |

**12 accessories** = catálogo P0 congelado (0E). `world_vignette` e talentos → P1 (não pedir agora).

Prioridade de entrega sugerida: `hat_charon` · `blade_glow` · `orbit_halo` · resto da cadeia Foice · geradores.

## Como marcar entrega

1. Substituir o arquivo no path indicado.  
2. Em `art-requests.json`, mudar `"status": "open"` → `"delivered"`.  
3. Atualizar a tabela §11 do `docs/plano-despertar-ui-cookieclicker.md`.

O jogo permanece jogável com fallbacks (WebP → SVG → letra / silhueta canvas).
