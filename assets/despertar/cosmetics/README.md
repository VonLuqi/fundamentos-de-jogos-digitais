# Cosméticos WebP (Fase E / E3)

Pasta de entrega do Mestre. Enquanto o arquivo **não** existir, o jogo usa
**procedural/CSS** (`drawAccessory` / `drawParametricAccessory` / classes `has-cosmetic-*`).

## Naming

`{accessory}.webp` (+ opcional `{accessory}.svg`)

### P0 (12) — `art_cosmetics` delivered

| Accessory | Alvo típico |
| --- | --- |
| `hat_charon` | Servos (prateleira) |
| `boat_wake` | Servos |
| `shade_wisp` | Sombras (órbita) |
| `hound_chain` | Cão |
| `hound_triple_aura` | Cão |
| `judge_scale_fx` | Juiz |
| `blade_glow` | Foice (ou manter CSS) |
| `blade_runes` | Foice |
| `blade_ember` | Foice |
| `blade_seal` | Foice (Bancada) |
| `reap_ripple` | Foice trail (CSS ok) |
| `orbit_halo` | Órbita altar |

### Linha 15×20 (300) — `art_cosmetics_line` delivered

- Accessory id = `upgrade.id` (exceto aliases P0 acima).
- **Prateleira:** `assets/despertar/sprites/habitats/variants/{id}.webp` — troca o sprite da célula.
- **Tip Styx:** mirror em `assets/despertar/cosmetics/{id}.webp`.
- Regenerar: `node scripts/gen-line-cosmetic-variants.mjs` (recolor a partir do habitat base; não sobrescreve P0).
