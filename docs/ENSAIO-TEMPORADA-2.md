# Ensaio da Temporada 2

Ensaio de 2026-10-28. **Não lançar** antes de todos os itens do checklist abaixo.

## Como repetir

```sh
# Troca de temporada num banco DESCARTÁVEL (o script recusa nome sem "ensaio" e recria o banco)
DB_HOST=127.0.0.1 DB_USER=root DB_PASS= DB_NAME=fjd_despertar_ensaio npm run despertar:ensaio-temporada

# Ritmo de um save limpo (jogador simulado; ~30 s)
npm run despertar:ensaio-ritmo -- --cps 5 --seed 7
```

## A. Troca de temporada — 15/15

Rodado contra MariaDB local com `db/mysql/schema.sql` e o código de produção (`DespertarService::openNextSeason`).

| Verificado | Resultado |
| --- | --- |
| Hold da T1 fecha o Despertar até abrir a T2 | ok |
| Confirmação errada não apaga nada | ok |
| "Temporada 2" arquiva o pódio, apaga todos os estados, liga `season_liberated` + `published` | ok |
| Pódio: empate no Juízo desempata por nome; 9,9e30 almas ordena como número; admin fora | ok |
| **Segunda execução** recusada e pódio da T1 intacto | ok — corrigido neste ensaio |
| Aluno começa a T2 zerado, sync aceito, progresso grava e relê | ok |

Corrigido no caminho:
- Rodar "Abrir Temporada 2" duas vezes **sobrescrevia o pódio eterno da T1** com o placar da T2 e apagava a T2 inteira. Agora a segunda vez é recusada.
- A abertura não era atômica; com a transação nova, o `CREATE TABLE IF NOT EXISTS` do arquivo fazia commit implícito e o botão devolveria erro 500 depois de já ter feito tudo. Corrigido (DDL fora da transação).

**Decidido (2026-10-28):** ao abrir a T2, as conquistas `despertar_*` saem de todos os perfis (o Véu recomeça só com as conquistas de aula) e o XP ganho com elas fica. Quais já pagaram XP fica em `despertar_paid_achievements`; reconquistar na T2 devolve a conquista sem pagar o XP de novo. O ensaio confere tudo isso num banco real.

## B. Ritmo de um save limpo

Metas de `paridade-cookieclicker-despertar.md` §8.4. Bot: clica, clica Ecos, compra o juramento mais barato que puder e o gerador de melhor retorno.

| Marco | Meta | 2 cliques/s | 5 cliques/s | 8 cliques/s | 5 c/s, outra semente |
| --- | --- | --- | --- | --- | --- |
| 1ª Sombra | < 30 s | 8 s | 3 s | 2 s | 3 s |
| SPS ≥ 1 | 1–3 min | 1min52 | 46 s | 30 s | 46 s |
| 1º Juramento | 2–5 min | 1min02 | 23 s | 15 s | 23 s |
| 1ª Forja | 15–25 min | 19min | 16min | 17min | 10min |
| 1º Trono | 25–40 min | 31min | 27min | 31min | 21min |
| Preview Lethe (1e8) | 35–50 min | 50min | 50min | 60min | 45min |
| **1ª Catábase (1 óbolo)** | **45–70 min** | 69min | **89min** | **97min** | **89min** |

Leitura:
- O meio do jogo (Forja, Trono) está no alvo; a variação vem dos Ecos (Colheita/Maré).
- O 1º juramento custa 100 almas (como o 1º upgrade do Cookie Clicker): a meta "2–5 min" do doc é que parece desatualizada.
- **A 1ª Catábase passa da meta na maioria dos perfis** (o 1º óbolo exige 4e9 almas na corrida, `PRESTIGE_RUN_DIVISOR`). Se a ideia é a turma chegar à Catábase dentro de uma aula, as opções são baixar o divisor (2e9 → ~75–80 min; 1e9 → ~65–70 min) ou acelerar o fim do 1º terço (Trono → Templo). É decisão de design; mexe em JS e PHP juntos.
- O bot é um jogador "otimizado ingênuo"; números indicativos, não definitivos.

## Checklist de lançamento

- [ ] Arte: `docs/STATUS-DESPERTAR.md` com 0 placeholders (lotes L2–L7 do Cursor).
- [ ] Telas que faltam para mecânicas F8 que já existem no código: **Dragão** (alimentar, escolher auras), **troca de estação** e **Corça de Ártemis** — hoje não há botão para o aluno. Sem isso, os ícones do lote L3 também não aparecem.
- [ ] Ícones de Véu e estágios da Catábase na interface (lotes L4/L5 hoje não têm onde aparecer).
- [x] Decidir conquistas entre temporadas (acima).
- [ ] Decidir o ritmo da 1ª Catábase (acima).
- [ ] `npm run test:despertar` verde e `despertar:ensaio-temporada` 15/15 na véspera.
- [ ] Deploy na HostGator de tudo desde o último envio (PHP do Despertar, `js/hades-despertar/**`, `pages/despertar.html`, `css/despertar.css`, `assets/despertar/sprites/**`).
- [ ] Só então: "Abrir Temporada 2" no painel (uma vez).
