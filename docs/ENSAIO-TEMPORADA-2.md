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

## A2. Reinício da T2 por bugs (2026-11-02 12:00 Brasília)

A T2 abriu em 2026-11-01 00:00, mas os saves locais (IndexedDB `despertar-db-v2`) da T1 sobreviveram à virada. No boot, `resolveBootAuthority` dá a vitória ao save local quando ele tem progresso e o servidor está vazio (`localAlive && serverEmpty`) e empurra tudo de volta; o sync aceita geradores e upgrades do cliente, mas limita o ganho de almas por um teto de tempo, então o servidor ficou com `run_souls` baixo (daí o Ritual recusar) enquanto a UI seguia mostrando os números da T1. Óbolos e essência nunca vêm do cliente no sync: ficaram só no estado local/UI.

Correção:
- **Tranco**: do deploy até 2026-11-02T12:00:00-03:00 o Despertar fica fechado para aluno (véu com contagem + banner no app-shell). Admin segue com prévia/teste. O servidor recusa toda escrita de aluno (403 `despertar_sealed`, `restartHold: true`).
- **Reinício**: a primeira requisição depois do instante (`DespertarController`, `SessionBootstrapController`) roda `DespertarService::restartSeason2IfDue()`: `GET_LOCK` + gate `season2_restart_done` conferido antes e dentro do lock, `DELETE despertar_states` + conquistas `despertar_*` fora dos perfis (XP fica; `despertar_paid_achievements`) + o gate, tudo numa transação (DDL antes). Não arquiva nada: `despertar_season_archives` (T1) fica como está.
- **Época**: `seasonEpoch` = 1 antes do reinício, 2 depois (derivada do gate, sem migração). Vai em todo estado devolvido e no save local. No boot o cliente descarta o save local de outra época (ou sem época) e o apaga. O servidor recusa `stateSync`, `prestige`, `talentBuy`, `verdictBuy` e `juizo*` de época velha/ausente com 409 `despertar_stale_epoch` + estado novo; a aba antiga congela o `StorageService`, apaga o local e recarrega sem regravar.
- **Tabelas**: só `despertar_states` guarda progresso do jogo (o placar lê dela ao vivo). `users.conquistas` perde `despertar_*`; `users.xp`, `despertar_season_archives` e `despertar_paid_achievements` ficam. `soul_recovery_codes` é recuperação de conta, `site_settings` é o segredo do Caronte e `rate_limit_buckets` é contador: não são progresso.

Ensaio: `despertar:ensaio-temporada` cobre isso com um `php -S` de verdade contra o banco descartável (relógio simulado via `restartSeason2IfDue($now)`), e `tests/despertar-season-epoch-smoke.mjs` cobre o cliente.

Depois do deploy, antes de segunda 12:00: conferir `seasonStatus` (`restartHold: true`, `seasonEpoch: 1`). Depois de 12:00: `restartHold: false`, `seasonEpoch: 2`, `despertar_states` só com linhas novas.

### A3. Reinício independente de tráfego, sem corrida (revisão T2)

- **Quando roda**: `backend/index.php` chama `DespertarService::restartSeason2IfDue()` em TODA requisição da API (ranking, placar, progresso, Despertar...). Antes das 12:00 é só comparar datas; depois do reset, uma leitura por chave primária (e um flag por processo). Se o `GET_LOCK` não for obtido, loga `[season-restart] GET_LOCK não obtido...` e a próxima requisição tenta de novo.
- **Cron (recomendado, garante o horário mesmo sem tráfego)**: `backend/cron-season-restart.php`, idempotente, mesmo reset. No cPanel > Cron Jobs, 2026-11-02 15:00 UTC (12:00 de Brasília):

  ```
  0 15 2 11 * /usr/local/bin/php /home/SEU_USUARIO_CPANEL/SEU_SUBDOMINIO/backend/cron-season-restart.php >> /home/SEU_USUARIO_CPANEL/season-restart.log 2>&1
  ```

  O cPanel usa o fuso do servidor: se não for UTC, ajuste a hora (Brasília = UTC-3, então 12:00 BRT). Mais robusto contra fuso: `*/10 * 2,3 11 *` (a cada 10 min nos dias 2 e 3; o script só age depois do instante e é no-op depois de feito). Saída: uma linha JSON (`ran`, `done`, `due`, `seasonEpoch`); código 1 se passou do instante e ainda não está feito. O usuário configura; nada foi configurado no servidor.
- **Sem corrida escrita × reset**: o reset pega a linha `season2_restart_done` de `lesson_gates` `FOR UPDATE`; toda escrita (`persistPatch`, `persistPatchAndAward`, heal do Lethe, rotas debug de admin) relê essa linha `LOCK IN SHARE MODE` dentro da própria transação e, se a época mudou desde que a requisição foi admitida, aborta (`StaleSeasonEpochException` → 409 `despertar_stale_epoch`). O reset espera as escritas em andamento terminarem; as seguintes veem a época nova.
- **Cliente**: o boot recebe a época do `seasonStatus` e, sem confirmar a época (stateGet caiu), não monta o jogo nem regrava: véu "Reconectando ao Acheron" e recarrega a cada 8 s. Só segue com o save local se a época confirmada for igual à dele. A rechecagem do banner depois das 12:00 consulta o servidor de verdade.
- **Testes**: `tests/despertar-t2-aceite-client.mjs` e `tests/despertar-t2-aceite-concorrencia.mjs` (+ `.php`: 8 processos, escrita tardia, escritor bloqueado, reset esperando escritor, HTTP 409). O ensaio ganhou "reset por requisição de ranking" e "reset via cron/CLI" com relógio simulado (`FJD_ENSAIO_NOW`, ignorado fora de banco com "ensaio" no nome).

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
| **1ª Catábase (1 óbolo)** | **45–70 min** | 68min 11s | **70min 01s** | 57min 06s | 89min |

Leitura:
- O meio do jogo (Forja, Trono) está no alvo na medição de 2026-10-29 (5 cliques/s, semente 7); a variação antiga vinha dos Ecos e de um `Math.random` na cópia que escolhe o gerador. Essa cópia agora usa aleatório fixo.
- O 1º juramento custa 100 almas (como o 1º upgrade do Cookie Clicker): a meta "2–5 min" do doc é que parece desatualizada. A 2 e a 8 cliques/s o juramento continua antes da meta; isso já era assim e não muda com o piso da Catábase. A 8 cliques/s o Trono chega 37 s antes da faixa (24min 23s). Sombra, Forja e Lethe ficam dentro.
- **Decidido (2026-10-29):** a 1ª Catábase espera `FIRST_CATABASE_RUN_SOULS = 5,1e8` (JS e PHP). A 5 cliques/s, semente 7, o óbolo sai em 70min 01s. O divisor `PRESTIGE_RUN_DIVISOR = 4e9` fica: de 5,1e8 até 4e9 a primeira Catábase continua rendendo 1 óbolo, e da 2ª em diante a conta não muda.
- O bot é um jogador "otimizado ingênuo"; números indicativos, não definitivos.

## Checklist de lançamento

- [ ] Arte: `docs/STATUS-DESPERTAR.md` com 0 placeholders (lotes L2–L7 do Cursor).
- [ ] Telas que faltam para mecânicas F8 que já existem no código: **Dragão** (alimentar, escolher auras), **troca de estação** e **Corça de Ártemis** — hoje não há botão para o aluno. Sem isso, os ícones do lote L3 também não aparecem.
- [ ] Ícones de Véu e estágios da Catábase na interface (lotes L4/L5 hoje não têm onde aparecer).
- [x] Decidir conquistas entre temporadas (acima).
- [x] Decidir o ritmo da 1ª Catábase (acima).
- [ ] `npm run test:despertar` verde e `despertar:ensaio-temporada` 15/15 na véspera.
- [ ] Deploy na HostGator de tudo desde o último envio (PHP do Despertar, `js/hades-despertar/**`, `pages/despertar.html`, `css/despertar.css`, `assets/despertar/sprites/**`).
- [ ] Só então: "Abrir Temporada 2" no painel (uma vez).
