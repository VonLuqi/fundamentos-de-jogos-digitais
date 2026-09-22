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

## Como marcar entrega

1. Substituir o arquivo no path indicado.  
2. Em `art-requests.json`, mudar `"status": "open"` → `"delivered"`.  
3. Atualizar a tabela §11 do `docs/plano-despertar-ui-cookieclicker.md`.

O jogo permanece jogável com fallbacks (WebP → SVG → letra / silhueta canvas).
