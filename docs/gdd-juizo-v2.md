# GDD curto — Juízo do Tartarus v2 (Higher / Lower)

> **Status:** design atualizado (F3 polish, 2026-09-22)  
> **Pai:** [`gdd-hades-despertar.md`](./gdd-hades-despertar.md) · loop Fase 7 em [`plano-hades-despertar.md`](./plano-hades-despertar.md)  
> **UI Cookie:** [`plano-despertar-ui-cookieclicker.md`](./plano-despertar-ui-cookieclicker.md) §3.3 / Fase D  
> **Polish:** [`plano-despertar-polish-foice-juizo-upgrades.md`](./plano-despertar-polish-foice-juizo-upgrades.md) F3  
> **Escopo desta página:** só o loop dle. Economia, pool e anti-cheat de ratings do desafiante **não** reabrem.

---

## 1. Pitch

Dois títulos ClassInd. O **campeão** mostra a faixa. O **desafiante** mostra `?`. O jogador clica no card que exige a faixa **mais alta**, ou **Empate**. Acerto → streak sobe e o desafiante assume o trono. Erro → corrida acaba com Δ de faixa.

---

## 2. Decisões congeladas (Q19–Q23)

| # | Tema | Decisão |
| --- | --- | --- |
| Q19 | Sucessor no acerto | **Sempre** o desafiante vira o próximo campeão (slide clássico Higher-Lower), inclusive no empate correto |
| Q20 | Faixa do campeão | **Visível antes** do guess (padrão dle) |
| Q21 | Botão Empate | **Sim** — correto só se as faixas forem iguais |
| Q22 | Superfície | **Modal overlay**; GameLoop **não** pausa |
| Q23 | Daily / season | **Não** nesta leva — só endless streak |

---

## 3. Loop de uma rodada

1. `juizoStart` — zera streak da corrida; sorteia campeão + desafiante; devolve cards públicos **com** `rating` do campeão e **sem** `rating` do desafiante.
2. HUD: sequência · recorde · Vereditos.
3. Jogador escolhe `A` | `B` | `tie` (click no card / Empate; aliases `higher`/`lower` ainda aceitos).
4. `juizoGuess` valida no server:
   - **Acerto** → `current++`; milestones de recorde se `best` subir; `championId = challengerId` (Q19); novo desafiante ≠ campeão e ≠ últimos N; devolve faixas da rodada vencida (juice) + próximo par.
   - **Erro** → `current = 0`; limpa run; revela faixas + `deltaLabel` (ex. `12 → 18`); CTAs Recomeçar / Voltar.
5. Esc / Voltar = `juizoAbandon` (zera current, **sem** revelar ratings).

**Ordem de faixa (inalterada):** `L < 10 < 12 < 14 < 16 < 18`.

---

## 4. O que permanece (não mexer na economia)

| Peça | Regra |
| --- | --- |
| **Vereditos** | Moeda exclusiva; ganha só em milestones de **melhor streak** |
| **Milestones** | 5→1 · 10→2 · 15→3 · 25→5 · 40→8 · 60→12 · 100→20 (1× via `juizoMilestonesClaimed`) |
| **Bancada do Juiz** | Catálogo permanente (sobrevive ao Lethe); `verdictBuy` intacto |
| **Pool** | Stub/ready ≥30; capas compartilhadas com ClassInd-dle |
| **Placar** | `juizoBest` no Placar do Domínio — sem mudança |
| **Falha** | Cards com capas + faixas + Δ + streak + recorde; sem rationale ClassInd longo |

---

## 5. Mapa API (preferência D3 — sem migration)

| UI (F3) | Choice canônico | Significado |
| --- | --- | --- |
| Click no campeão | `A` | Campeão tem a faixa **mais alta** |
| Click no desafiante | `B` | Desafiante tem a faixa **mais alta** |
| Empate (`tie`) | `tie` | Faixas iguais |
| Alias legado Maior (`higher`) | `B` | Desafiante > campeão |
| Alias legado Menor (`lower`) | `A` | Desafiante < campeão |

Campos de save (`verdicts`, `juizo_*`, `juizo_run`, compras da Bancada) **não** resetam. Server: `normalizeJuizoChoice` aceita `higher`/`lower`/`tie` e legado `A`/`B`/`tie` — sem migration.

---

## 6. Anti-cheat (amenda J8)

- Ratings do **desafiante** só no DB até o reveal pós-guess (ou falha).
- Rating do **campeão** pode ir no payload público (Q20).
- No **acerto**, o server pode devolver `ratingA`/`ratingB` da rodada vencida só para juice — o próximo desafiante continua sem rating.
- Cliente **nunca** decide acerto; pool ready e sorteio ficam no server.
- Rate limit ~2 guesses/s permanece.

---

## 7. UI alvo (F3)

Cards clicáveis · VS · `?` no desafiante · botão Empate · flip/`?`→faixa no acerto · slide desafiante→campeão · confetti contido · falha com dois cards + Δ · shake/vinheta no erro · `prefers-reduced-motion` → estados finais sem flip/shake.

Teclado: ←/1 campeão · →/2 desafiante · E empate · Esc abandona.

---

## 8. Fora de escopo (esta reforma)

SFX · daily challenge · expor ratings no cliente antes do guess · mudar tabela de Vereditos · novos itens da Bancada · rationale longo na falha.

---

*Amenda o Juízo Fase 7 para o padrão Higher-Lower clássico (desafiante sempre sobe). Implementação: F3 polish.*
