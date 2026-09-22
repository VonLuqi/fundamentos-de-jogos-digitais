# GDD curto — Juízo do Tartarus v2 (Higher / Lower)

> **Status:** design atualizado (F3 polish + J.2 B1 Soft, 2026-09-22)  
> **Pai:** [`gdd-hades-despertar.md`](./gdd-hades-despertar.md) · loop Fase 7 em [`plano-hades-despertar.md`](./plano-hades-despertar.md)  
> **UI Cookie:** [`plano-despertar-ui-cookieclicker.md`](./plano-despertar-ui-cookieclicker.md) §3.3 / Fase D  
> **Polish:** [`plano-despertar-polish-foice-juizo-upgrades.md`](./plano-despertar-polish-foice-juizo-upgrades.md) F3  
> **Balance:** [`plano-despertar-aureolas-letreiro-shiny-hud-juizo.md`](./plano-despertar-aureolas-letreiro-shiny-hud-juizo.md) J.2  
> **Escopo desta página:** loop dle + tabela de Vereditos/Bancada (B1 Soft). Pool e anti-cheat de ratings do desafiante **não** reabrem.

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

## 4. Economia de Vereditos (J.2 — pacote **B1 Soft**)

| Peça | Regra |
| --- | --- |
| **Vereditos** | Moeda exclusiva; ganha em milestones de **melhor streak** (1× por id; catch-up se o recorde já passou e o marco ainda não foi claimado) |
| **Milestones** | 5→1 · 10→2 · 15→3 · **20→4** · 25→5 · 40→8 · 60→12 · 100→20 (teto **55**) |
| **Bancada do Juiz** | Catálogo permanente (sobrevive ao Lethe); custos B1: Selo **2** · Memória **4** · Olho 8 · Pacto 12 (total **26**) |
| **Naming (Q16)** | **Juízo** = este minigame; **Juiz do Tártaro** = gerador T4; **Veredito do Tártaro** = Juramento do Styx nesse gerador — não são a mesma coisa |
| **Pool** | Stub/ready ≥30; capas compartilhadas com ClassInd-dle |
| **Placar** | `juizoBest` no Placar do Domínio — sem mudança |
| **Falha** | Cards com capas + faixas + Δ + streak + recorde; sem rationale ClassInd longo |

**Adiado:** B2 (novo sink na Bancada) · B3 (Veredito repeat pós-s100).

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

SFX · daily challenge · expor ratings no cliente antes do guess · B2/B3 (sink / repeat) · rationale longo na falha.

---

*Amenda o Juízo Fase 7 para o padrão Higher-Lower clássico (desafiante sempre sobe). Balance J.2 = B1 Soft. Implementação: F3 polish + J.2.*
