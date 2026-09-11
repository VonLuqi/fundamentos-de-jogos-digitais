# Guia passo a passo — Enigma do Soberano do Submundo (8 fases)

> **Atenção: este documento é um spoiler completo.**  
> Serve para o Mestre, QA e alunos que pediram a solução. O design sem spoilers está em [`enigma-supremo-submundo.md`](./enigma-supremo-submundo.md).

Conquista final: **Soberano do Submundo** (`soberano_do_submundo`) — raridade **Única**, **+1500 XP**.

---

## O que você precisa

| Item | Detalhe |
| --- | --- |
| Conta no Domínio | **Obrigatória** em Elísios (julgamento) e Estige (óbolo). Demais salas abrem sem login. |
| Navegador desktop | Chrome, Edge ou Firefox com **DevTools (F12)** |
| Audacity (ou equivalente) | Asfódelos — visão **Spectrogram** (~2–4 kHz) |
| Ferramenta de estego/PNG | Hécate — metadados `tEXt` + LSB canal R (StegOnline, script Pillow, etc.) |
| Sessão no mesmo site | Login **antes** de Elísios/Estige |

Mapa das URLs limpas (rewrites em `vercel.json` / `local-server.mjs`):

| Fase | URL |
| --- | --- |
| 1 | `/submundo/tartaro-oculto` |
| 2 | `/submundo/asfodelos-sussurros` |
| 3 | `/submundo/hecate-encruzilhada` |
| 4 | `/submundo/elisios-julgamento` |
| 5 | `/submundo/persefone-jardim` |
| 6 | `/submundo/observatorio-sombras` |
| 7 | `/submundo/cocito-espelho` |
| 8 | `/submundo/estige-obolo` |

Progresso entre salas = **conhecer a URL** (estilo Notpron). Não há conquista intermediária por sala.

---

## Visão rápida da jornada

```
Álbum (runas) / Salão (eco) → TARTARO OCULTO
  → /submundo/tartaro-oculto           CERBERUS-UNBOUND
  → /submundo/asfodelos-sussurros       PERSEPHONE_PASS
  → /submundo/hecate-encruzilhada      HECATE_TORCH_KEY_777
  → /submundo/elisios-julgamento       key_elestial_hades
  → /submundo/persefone-jardim         POMEGRANATE_6_SEEDS
  → /submundo/observatorio-sombras     36.4005, 22.4858 | CAPE_MATAPAN_GATE
  → /submundo/cocito-espelho           COCYTUS_REFLECTION_404
  → /submundo/estige-obolo             SHA-256 → redeem → Soberano (+1500 XP)
```

---

## Fase 0 — Trailhead

Igual à versão anterior: runas `trailhead-rune` nas conquistas públicas → anagrama **`TARTARO OCULTO`** + pistas da pasta `/submundo` (Elements `data-path-prefix`, `robots.txt`, comentários HTML/CSS) → `/submundo/tartaro-oculto`.

---

## Fase 1 — Tártaro (CSS)

1. F12 → Elements → `.hidden-rune`.
2. Altere `--shadow-color` para uma cor visível.
3. Chave: **`CERBERUS-UNBOUND`** → `/submundo/asfodelos-sussurros`.

---

## Fase 2 — Asfódelos (espectrograma)

1. Baixe `assets/submundo/asfodelos_echo.wav`.
2. Audacity → Spectrogram (~2–4 kHz).
3. Chave: **`PERSEPHONE_PASS`** → `/submundo/hecate-encruzilhada`.

---

## Fase 3 — Hécate (metadados + LSB)

### Pista na tela

Metáfora sobre entranhas da imagem / tocha — **sem** citar canal ou bit.

### Passo a passo

1. Baixe `hecate_relic.png`.
2. Metadados PNG (`tEXt` Comment / exiftool / CyberChef):  
   `A tocha acende no vermelho mais fraco.`
3. Extraia LSB do **canal vermelho, bit 0** (StegOnline, CacheSleuth, Pillow…).
4. Payload: **`HECATE_TORCH_KEY_777`**.
5. Envie no formulário → `/submundo/elisios-julgamento`.

Regenerar asset: `npm run submundo:hecate`.

---

## Fase 4 — Elísios (Network + Base64)

**Login obrigatório.**

1. F12 → Network → **Solicitar Julgamento**.
2. UI mostra só “Acesso Negado…”.
3. Response JSON (sem `hint`/`encoding` explícitos):
   ```json
   {
     "ok": true,
     "status": "denied",
     "message": "Acesso Negado pelos Juízes",
     "oracle_token": "a2V5X2VsZXN0aWFsX2hhZGVz",
     "echo": "O oráculo murmura em língua que os mortais não leem à vista."
   }
   ```
4. `atob(oracle_token)` → **`key_elestial_hades`** → `/submundo/persefone-jardim`.

---

## Fase 5 — Perséfone (Cookie + localStorage)

1. F12 → Application.
2. Cookie `underworld_role`: `mortal` → **`queen_consort`**.
3. Local Storage `pomegranate_seeds`: `0` → **`6`**.
4. **Consumir Romã & Reivindicar Trono** → revela **`POMEGRANATE_6_SEEDS`**.
5. Envie o selo → `/submundo/observatorio-sombras`.

Nota: cada reload da sala **reinicia** o estado mortal/0.

---

## Fase 6 — Observatório (OSINT / geo)

1. Pesquise a entrada mitológica do Submundo no Peloponeso → **Cabo Matapan / Tênaro**.
2. Coordenadas aceitas (margem ~0,02°): **`36.4005, 22.4858`**.
3. Ou token: **`CAPE_MATAPAN_GATE`**.
4. Clique no mapa próximo do ponto **ou** envie no formulário → `/submundo/cocito-espelho`.

---

## Fase 7 — Cócito (Canvas)

1. Canvas `#cocito-mirror` parece negro/opaco.
2. Console (exemplo) — inverter RGB e forçar alfa:

```javascript
const canvas = document.getElementById('cocito-mirror');
const ctx = canvas.getContext('2d');
const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
const d = imgData.data;
for (let i = 0; i < d.length; i += 4) {
  d[i] = 255 - d[i];
  d[i + 1] = 255 - d[i + 1];
  d[i + 2] = 255 - d[i + 2];
  d[i + 3] = 255;
}
ctx.putImageData(imgData, 0, 0);
```

> O espelho deve parecer **negro vazio**. CSS `filter: invert()` sozinho **não** basta (alfa 0 na runa).

3. Runa: **`COCYTUS_REFLECTION_404`** → `/submundo/estige-obolo`.

---

## Fase 8 — Estige (hash + redeem)

**Login obrigatório.**

Console (ritual, sem citar a API na mesma frase):

> `⚡ [CHARON_SYSTEM]: A string sagrada é "ESTIGE_OBOLO_2026". O óbolo não se conta — se reduz. Traga o selo em hex.`

```javascript
async function calcularObolo(mensagem) {
  const encoder = new TextEncoder();
  const dados = encoder.encode(mensagem);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dados);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
calcularObolo('ESTIGE_OBOLO_2026').then(console.log);
```

Óbolo:

```
18fec91c717e94c6b979a9c288ac1e041fd57101a2a2379b346e3b4fce39083c
```

`underworldRedeem` → **Soberano do Submundo** (+1500 XP, idempotente). Soft fail: “Tributo insuficiente.”

---

## Folha de gabarito

| Elo | Sala | Saída |
| --- | --- | --- |
| 0 | Trailhead | `/submundo/tartaro-oculto` |
| 1 | Tártaro | `CERBERUS-UNBOUND` |
| 2 | Asfódelos | `PERSEPHONE_PASS` |
| 3 | Hécate | `HECATE_TORCH_KEY_777` |
| 4 | Elísios | `key_elestial_hades` |
| 5 | Perséfone | `POMEGRANATE_6_SEEDS` |
| 6 | Observatório | `36.4005, 22.4858` / `CAPE_MATAPAN_GATE` |
| 7 | Cócito | `COCYTUS_REFLECTION_404` |
| 8 | Estige | hash SHA-256 → Soberano |

---

## Referências no repo

| Arquivo | Papel |
| --- | --- |
| [`enigma-supremo-submundo.md`](./enigma-supremo-submundo.md) | Design ARG / soluções |
| `pages/submundo/*` + `js/submundo/*` | 8 salas |
| `api/progress.js` | `underworldJudgment` / `underworldRedeem` |
| `assets/submundo/hecate_relic.png` | Relíquia Hécate |
| `assets/submundo/asfodelos_echo.wav` | Eco Asfódelos |
| `scripts/generate-hecate-relic.mjs` | Regenera PNG LSB |
| `tests/submundo-enigma-smoke.mjs` | Smoke de regressão |

---

*Guia alinhado à implementação de 8 fases (Notpron, spoilers só neste doc / MD de design).*
