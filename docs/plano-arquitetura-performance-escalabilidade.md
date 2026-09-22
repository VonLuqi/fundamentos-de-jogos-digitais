# Plano Arquitetural — Performance e Escalabilidade

> **Escopo:** persistência rápida, leitura eficiente e resiliência da API sob concorrência de alunos.  
> **Stack:** HTML/CSS/JS ES-Modules · Vercel Serverless (`api/*`) · Supabase (PostgREST + PostgreSQL).  
> **Persona:** Arquiteto de Software Sênior / Engenheiro de Performance (Vercel + Supabase).  
> **Fora de escopo deste documento:** reescrita de mecânicas de jogo, migração para Supabase Auth, e blocos extensos de código de aplicação.  
> **Relacionados:** [`plano-ops-nav-email-perf-admin.md`](./plano-ops-nav-email-perf-admin.md) (ciclo ops já fechado: rate limit de auth, TTL de sessões, batch de gates).  
> **Implementação:** [`otimizacoes/00-master-plan.md`](./otimizacoes/00-master-plan.md) · Fase A [`otimizacoes/01-tasks-fase-a-contencao.md`](./otimizacoes/01-tasks-fase-a-contencao.md) · Fase B [`otimizacoes/02-tasks-fase-b-rtt-batching.md`](./otimizacoes/02-tasks-fase-b-rtt-batching.md) · k6 [`otimizacoes/04-tasks-k6-carga.md`](./otimizacoes/04-tasks-k6-carga.md).

---

## 1. Visão da arquitetura atual

```text
┌─────────────┐   fetch /api/*    ┌──────────────────────────────┐
│  Browser    │ ───────────────► │  Vercel Serverless (Node)     │
│  js/api.js  │                  │  api/auth|progress|despertar  │
│  páginas    │                  │  memory 256 MB · max 10 s     │
└─────────────┘                  │  Cache-Control: no-store      │
                                 └──────────────┬───────────────┘
                                                │ HTTPS · service role
                                                ▼
                                 ┌──────────────────────────────┐
                                 │  Supabase PostgREST          │
                                 │  (sem pool PG na app)        │
                                 └──────────────┬───────────────┘
                                                ▼
                                 ┌──────────────────────────────┐
                                 │  PostgreSQL (Supabase)       │
                                 │  sessions · users · progress │
                                 │  despertar_states · rate     │
                                 └──────────────────────────────┘
```

| Camada | Padrão atual | Implicação de performance |
| --- | --- | --- |
| Cliente | `requireSession` + POSTs por ação; Despertar sync 5–30 s | Tráfego chatty em boot e em sessão de jogo |
| Edge / CDN | Headers `no-store` em `/api/*`; sem middleware de cache | Toda leitura autenticada paga cold path + DB |
| Serverless | Um isolate por invocação (warm reuso parcial); monólitos (`progress.js`, `despertar.js`) | Cold start amplificado por parse + `scryptSync` + N round-trips |
| Dados | `@supabase/supabase-js` com **service role**; `DATABASE_URL` só em migrates | Cada `.from().select/update` = 1 RTT HTTP → PostgREST → PG |
| Rate limit | Auth/e-mail: **DB**; Despertar sync / Juízo / underworld: **Map em memória** | Limites in-memory falham sob multi-isolate e cold start |

**Decisão de base (congelada neste plano):** a autoridade de XP, níveis, conquistas e estado do Despertar permanece no servidor. Otimizações não movem confiança para o cliente; reduzem round-trips, amortizam CPU e protegem o banco.

---

## 2. Mapeamento de gargalos

### 2.1 Matriz de criticidade

| ID | Gargalo | Evidência no sistema | Impacto sob carga | Severidade |
| --- | --- | --- | --- | --- |
| G1 | **Multi-RTT em `stateSync` (Despertar)** | Sessão + user + gate + state + update + achievements ≈ **5–7** idas ao PostgREST por sync | Com 50 alunos syncando a cada 5–30 s → centenas de RPS efetivos no banco | **Crítica** |
| G2 | **Validação authoritative de progressão** | Todo POST em `progress` revalida sessão + `users`; awards recalculam e persistem conquistas/XP | Pico no início de aula (redeem, paragraphs, views) satura conexões PostgREST | **Alta** |
| G3 | **`scryptSync` em auth + cold start** | `crypto.scryptSync` com defaults Node (`N=16384`, `r=8`, `p=1`, keylen 64); bloqueia o event loop | Login em massa (abertura de turma) + cold isolates → latência p99 explosiva | **Alta** |
| G4 | **Rate limit in-memory frágil** | `Map` em `despertar.js` / underworld; não compartilha entre isolates | Bypass efetivo sob escala horizontal; proteção irregular | **Alta** |
| G5 | **Ausência de cache de leitura** | `Cache-Control: no-store`; gate `lesson_gates` relido a cada sync | Latência desnecessária em dados quase-estáticos | **Média–Alta** |
| G6 | **`purgeExpiredSessions` oportunista** | DELETE amplo de expirados em tráfego de auth | Contenção de escrita em `sessions` nos picos de login | **Média** |
| G7 | **Leaderboard full-scan em Node** | Carrega alunos (+ juízo) e ordena em memória | Cresce O(n) com turma; piora p95 do ranking | **Média** |
| G8 | **Boot duplicado auth + progress** | `requireSession` (GET auth) + `fetchProfile` (GET progress) por página | 2× custo de sessão/usuário a cada navegação | **Média** |
| G9 | **Monólitos serverless** | `progress.js` grande; muitos imports no cold path | Cold start maior; timeout de 10 s mais próximo sob CPU | **Média** |
| G10 | **ClassInd fallback poll** | Poll ~4 s se Realtime cair | Tempestade de leitura se WebSocket falhar em turma cheia | **Baixa–Média** |

### 2.2 Fluxo quente: sync Despertar (pior caso típico)

```text
POST /api/despertar  action=stateSync
  ① loadValidSession          → sessions (± renew)
  ② users (id, role, email…)  → users
  ③ isDespertarPublished      → lesson_gates   ← candidato a cache
  ④ getOrCreateState          → despertar_states (± insert)
  ⑤ validateSync (CPU)        → puro
  ⑥ persistPatch              → despertar_states UPDATE
  ⑦ grantDespertarAchievements→ users SELECT (± UPDATE)
```

**Custo estimado por sync (ordem de grandeza):** 5–7 RTT PostgREST + CPU de validação. Com `SYNC_MAX_PER_MINUTE = 12` por aluno e limite só em memória, o teto teórico por aluno é alto e **não é global**.

### 2.3 Fluxo quente: autenticação e cold start

```text
POST /api/auth  login/register
  ① rate limit DB (COUNT + INSERT em auth_rate_events)
  ② users lookup
  ③ scryptSync (bloqueante)  ← pior amigo do cold start
  ④ createSessionRow
  ⑤ purgeExpiredSessions     ← escrita ampla
```

Em serverless, o cold start já paga: bootstrap do isolate + parse do handler + client Supabase. Somar **scrypt síncrono** no mesmo request concentra latência no p99 e reduz throughput do isolate (um login por vez no event loop).

### 2.4 Progressão authoritative — trade-off consciente

A validação no servidor é **correta** para anti-fraude educacional (códigos, hashes de parágrafo, regras de conquistas). O problema não é a autoridade; é o **custo por mutação**:

| Padrão | Problema | Direção |
| --- | --- | --- |
| 1 ação cliente → 1 POST → N queries | Amplificação | Batch / RPC / menos releituras |
| Sessão revalidada em todo POST | RTT repetido | Cache curto de sessão no isolate + store compartilhado |
| Achievements em update separado | Escritas extras | Combinar XP + conquistas no mesmo patch quando possível |
| Leaderboard sem `ORDER BY … LIMIT` | Transferência + sort Node | Empurrar ordenação/paginação ao SQL |

---

## 3. Estratégias de otimização

### 3.1 Princípios

1. **Proteger o Postgres primeiro** — rate limit efetivo, menos RTT, queries indexadas.
2. **Cachear o que muda pouco** — gates, catálogo, perfil “quente”, sessão validada.
3. **Não cachear o que é autoridade mutável sem invalidação** — XP bruto, inventário Despertar, redeem de código.
4. **CPU caro fora do caminho quente** — scrypt assíncrono / parâmetros calibrados; purge de sessão em job, não no login.
5. **Medir antes de multi-região** — a dor atual é RTT e concorrência, não geo-latência.

### 3.2 Camada de conexão: PostgREST vs PgBouncer

| Abordagem | Como encaixa neste projeto | Prós | Contras | Recomendação |
| --- | --- | --- | --- | --- |
| **Status quo** (JS client → PostgREST) | Já usado em runtime | Simples; connection churn gerido pelo Supabase | N HTTP RTT; sem batch nativo fácil | Manter como transporte principal |
| **Supabase Pooler (PgBouncer) + `pg`** | `DATABASE_URL` já existe para migrates | Menos overhead HTTP; RPC/SQL multi-statement; prepared statements | Mais superfície (SQL na app); cuidado com transaction vs session mode | Usar **só** em paths quentes (sync, leaderboard) via funções SQL |
| **RPC `supabase.rpc('fn')`** | PostgREST chama função PL/pgSQL | **1 RTT** para “sessão+gate+state+update+achievements” | Exige disciplina de migrations e testes | **Prioridade P0** para `stateSync` e awards |
| **Direct Postgres sem pooler** | Conexão por isolate | — | Esgota slots no pico serverless | **Proibido** em runtime |

**Alvo de arquitetura (fase 1):** manter PostgREST, mas colapsar hot paths em **uma RPC** por mutação crítica.  
**Alvo (fase 2):** se RPC ainda for insuficiente, path dedicado com `pg` + **Transaction mode** do pooler Supabase (porta tipicamente 6543), apenas nessas rotas.

Checklist — conexões

- [ ] Confirmar no dashboard Supabase: pooler habilitado, modo Transaction para serverless
- [ ] Documentar que `DATABASE_URL` de runtime (se adotado) ≠ URI de migrate (Session mode)
- [ ] Criar RPC `despertar_state_sync(...)` com validações server-side espelhando `validateSync` (ou validação Node + um único UPDATE via RPC de persistência)
- [ ] Índices: `sessions(token)`, `sessions(expires_at)`, `auth_rate_events(action, key, created_at)`, `despertar_states(user_id)` PK, `lesson_gates(lesson_id, gate_key)`
- [ ] Alertar em `pg_stat_activity` / métricas Supabase: conexões ativas, waiting, errors `too many connections`

### 3.3 Caching — o que cachear e onde

| Dado | Volatilidade | Cache sugerido | TTL / invalidação | Camada |
| --- | --- | --- | --- | --- |
| `lesson_gates` (Despertar published) | Baixa (toggle admin) | Memória do isolate + KV/Redis compartilhado | 30–60 s **ou** invalidate no `setLessonGate` | Serverless + store |
| Catálogo / conquistas estáticas | Quase imutável | CDN / `Cache-Control` longo em assets JSON | Versionamento por hash de arquivo | Edge (estático) |
| Sessão válida (token → userId) | Média | Cache negativo+positivo curto | TTL 30–60 s; invalidate no logout / admin purge | Upstash Redis ou KV |
| Perfil (xp, conquistas) | Alta em aula | Cache curto **só para GET** | 5–15 s; invalidate em qualquer award | Redis opcional |
| Estado Despertar | Muito alta | **Não cachear leitura cross-user**; ETag opcional por `user_id+updated_at` | Invalidação no próprio sync | Cliente já é source of truth local |
| Leaderboard | Média | Snapshot materializado / query SQL paginada | 15–60 s | Redis ou tabela `leaderboard_snapshots` |
| Respostas `/api/*` mutáveis | — | Manter `no-store` por padrão | — | Vercel headers |

**Regra:** Edge Cache da Vercel brilha em **GET públicos/versionados**. Endpoints autenticados com side-effects continuam `no-store`; o ganho vem de **cache de dependências** (gate, sessão) dentro do handler, não de cachear a resposta HTTP inteira no CDN.

Checklist — cache

- [ ] Extrair leitura de gate para helper com memoização (isolate) + backing store compartilhado
- [ ] Invalidar gate cache no admin `setLessonGate`
- [ ] Avaliar Upstash Redis (já alinhado ao ecossistema Vercel) para sessão e rate limit
- [ ] Separar assets estáticos de API: garantir cache longo em `/assets/**` e `/data/**` públicos
- [ ] Não remover `no-store` de `/api/*` sem política explícita por rota GET segura

### 3.4 Rate limiting — comparação de estratégias

| Estratégia | Onde roda | Persistência | Adequação ao projeto | Custo / complexidade | Veredito |
| --- | --- | --- | --- | --- | --- |
| **Map in-memory** (atual Despertar) | Isolate Node | Volátil | Ruim sob N isolates | Baixo | Manter só como **fail-soft local**, nunca único |
| **Tabela Postgres** (atual auth) | Handler | Durável | Bom para auth; adiciona RTT | Médio (já existe) | Manter auth; evitar proliferar COUNTs no sync |
| **Middleware Vercel (Edge)** | Edge antes do Node | Precisa store externo (Redis) ou IP coarse | Bom para blindagem global (IP/RPS) | Médio | **Camada 1** — rejeitar abuso cedo |
| **Upstash Redis / Ratelimit SDK** | Node ou Edge | Compartilhado | Ideal sync/Juízo/progress | Médio | **Camada 2** — por `userId` + action |
| **Vercel Firewall / WAF** | Plataforma | Gerenciado | Protege volumétrico L7 | Baixo ops | Complementar, não substitui limites de jogo |
| **RPC com token bucket no PG** | Banco | Durável | Forte consistência | Alto (contenção) | Só se Redis indisponível |

**Modelo recomendado (defesa em profundidade):**

```text
Edge Middleware (IP / path budget)
        ↓
Handler Node (Redis: userId + action)
        ↓
RPC / queries (DB ainda com índices; auth_rate_events para login)
```

Limites sugeridos (ponto de partida — calibrar com carga):

| Rota / ação | Limite inicial | Chave |
| --- | --- | --- |
| `POST /api/auth` login | 10 / 15 min | IP + username |
| `POST /api/despertar` sync | 12 / min (já conceptual) | `userId` **no Redis** |
| Juízo guess | ~2 / s | `userId` |
| `POST /api/progress` mutações | 30–60 / min | `userId` |
| GET auth/progress boot | 120 / min | `userId` ou IP |

Checklist — rate limit

- [ ] Migrar `isSyncRateLimited` / Juízo / underworld de `Map` → store compartilhado
- [ ] Edge Middleware: teto por IP em `/api/despertar` e `/api/auth`
- [ ] Respostas `429` com `Retry-After` estável (cliente Despertar já tem min interval)
- [ ] Métricas: contagem de 429, taxa de bypass (só possível se Map residual)

### 3.5 Batching e redução de RTT na progressão

| Técnica | Aplicação | Efeito |
| --- | --- | --- |
| **RPC única de award** | `xp + conquistas + updated_at` em um UPDATE | Elimina SELECT+UPDATE separados |
| **Batch de eventos de aula** | Cliente enfileira `lessonView` / paragraphs e envia a cada N s ou blur | Menos POSTs no scroll de aula |
| **Boot unificado** | `GET /api/session-bootstrap` → sessão + perfil + gates | Corta G8 (auth+progress duplicados) |
| **Leaderboard SQL** | `ORDER BY xp DESC LIMIT $n` (+ join juízo se necessário) | Corta G7 |
| **Purge assíncrona** | Cron / queue diária para `sessions` expiradas | Corta G6 do path de login |
| **Dirty sync Despertar** | Já existe heartbeat + min interval — endurecer: sync só se `dirty` ou achievements pending | Reduz RPS ocioso |

Checklist — fluxo de dados

- [ ] Desenhar contrato de `session-bootstrap` (campos mínimos)
- [ ] Empurrar ordenação do ranking para SQL; paginar
- [ ] Remover `purgeExpiredSessions` do hot path de login (job periódico)
- [ ] Avaliar coalescing no cliente de aula (sem relaxar autoridade)
- [ ] Telemetria: histogram de “RTT PostgREST por request”

### 3.6 Auth / scrypt sob serverless

| Opção | Latência relativa | Segurança | Notas |
| --- | --- | --- | --- |
| `scryptSync` defaults (atual) | Alta + bloqueia loop | Forte | Pior p99 em cold start |
| `scrypt` async (`crypto.scrypt`) | Similar CPU, não bloqueia tanto o isolate para *outros* awaits I/O | Forte | Melhoria operacional imediata |
| Parâmetros calibrados (N menor com review) | Menor CPU | Trade-off explícito | Só com threat model documentado |
| Argon2 via WASM/native | Variável | Moderno | Aumenta cold start binário — avaliar com cuidado |
| Hash offload (Supabase Auth / IdP) | Baixa na app | Delegada | Fora do escopo atual; opção estratégica futura |

Checklist — auth CPU

- [ ] Trocar path de verify/hash para API assíncrona
- [ ] Medir wall time de scrypt isolado (p50/p99) no tamanho de função 256 MB
- [ ] Manter bcrypt legado só no migrate-on-login
- [ ] Separar bundle de auth do monólito `progress` se cold start continuar alto
- [ ] Considerar “warmup” de `/api/auth` antes da abertura de turma (cron ping autenticado de health)

### 3.7 Topologia alvo (faseada)

```text
Fase A — Contenção e cache local
  Edge rate limit (IP) + Redis rate limit (user)
  Cache de gate + bootstrap de sessão
  Purge de sessions fora do login
  scrypt async

Fase B — Colapso de RTT
  RPC despertar_state_sync / award_xp
  Leaderboard SQL
  Cliente: menos polls; sync dirty-only

Fase C — Escala e observabilidade
  Snapshots de ranking
  Alertas de conexão / p99
  (Opcional) path pg+pooler só nos hotspots
```

---

## 4. Plano de testes de estresse e carga

### 4.1 Objetivos do teste

1. Provar que **N alunos simultâneos** (login → dashboard → aula → Despertar) mantêm p95 aceitável.
2. Encontrar o ponto de **exaustão de conexões** / saturação PostgREST antes da sala real.
3. Validar que rate limits **compartilhados** protegem sem falsos positivos em uso legítimo.
4. Comparar baseline (hoje) vs Fase A/B.

### 4.2 Personas e cenários

| Cenário | Mix de ações | Proporção | Por quê |
| --- | --- | --- | --- |
| **C1 — Abertura de turma** | Login + GET bootstrap/dashboard | 100% no minuto 0–2 | Estressa scrypt + sessions + purge |
| **C2 — Aula ativa** | lessonView, paragraphs, redeem esporádico | Steady 15–20 min | Progressão authoritative |
| **C3 — Despertar lab** | stateSync dirty a cada 5–15 s + compras | Steady | Maior amplificação de RTT |
| **C4 — Ranking / Almas** | leaderboardGet + souls filters (admin menor N) | Rajadas | Full-scan atual |
| **C5 — Degradado ClassInd** | Forçar fallback poll | Curto | Tempestade de leitura |
| **C6 — Abuso** | Sync acima do limite / login spray | Controlado | Verificar 429 e estabilidade |

**Capacidades-alvo de dimensionamento (exemplo para calibrar — ajustar à turma real):**

| Etapa | VUs (alunos virtuais) | Duração | Critério de sucesso preliminar |
| --- | --- | --- | --- |
| Smoke | 5 | 2 min | 0 erros 5xx; p95 &lt; 800 ms rotas leves |
| Aula média | 30 | 10 min | p95 sync &lt; 1,5 s; erros &lt; 1% |
| Pico turma | 60–80 | 15 min | p95 login &lt; 2,5 s; sem exaustão de conexões |
| Stress | 120+ | 10 min | Degradação graceful (429), sem cascata 5xx |

### 4.3 Métricas obrigatórias

| Métrica | Onde coletar | Limite de alerta (partida) |
| --- | --- | --- |
| **RPS** (por rota) | k6/Artillery + Vercel Analytics | Desvio &gt; 2× do esperado do cenário |
| **Latência p50 / p95 / p99** | Load tool | p95 sync &gt; 1,5 s; p99 login &gt; 3 s |
| **Taxa de erro** 4xx/5xx | Load tool + logs | 5xx &gt; 0,5%; 429 só no C6 ou acima do orçamento |
| **Cold starts** | Vercel logs / OpenTelemetry | Pico correlacionado a p99 |
| **Duração de scrypt** | Log estruturado no auth | p99 CPU hash &gt; 200–400 ms (calibrar) |
| **RTT médios PostgREST / req** | Contador no handler | Sync &gt; 3 RTT após Fase B = regressão |
| **Conexões PG / pooler** | Supabase metrics | Approaching max; waiting locks |
| **Fila / waiting** | Supabase + Vercel | Timeouts próximos de 10 s |
| **429 rate** | Logs | Subida sem C6 = limite mal calibrado |
| **Data consistency spot-check** | Script pós-teste | XP/conquistas não divergem de regras |

### 4.4 Ferramentas recomendadas

| Ferramenta | Uso | Notas |
| --- | --- | --- |
| **k6** | Cenários C1–C6, thresholds em código, CI opcional | Preferido para scripts versionados no repo (`tests/load/`) |
| **Artillery** | Alternativa YAML rápida para workshops | Bom para demos; menos expressivo que k6 para checks complexos |
| **Vercel Observability / logs** | Cold start, duration, status | Correlacionar com `vu` do teste |
| **Supabase Dashboard** | Conexões, query time, erros | Essencial para G1/G7 |
| **Playwright (smoke humano)** | 1–2 browsers reais no meio do load | Detecta UX que métricas não veem |
| **Grafana Cloud / Axiom** (opcional) | Históricos de p95 | Quando o volume de logs crescer |

### 4.5 Metodologia (passo a passo)

1. **Baseline instrumentado** — adicionar logs/métricas: `request_id`, `action`, `db_round_trips`, `duration_ms`, `cold`.
2. **Ambiente** — preview/staging com volume de dados semelhante à produção (N users, conquistas, despertar_states).
3. **Dados sintéticos** — alunos com senhas conhecidas; tokens obtidos no setup do k6 (`setup()`).
4. **Corridas** — Smoke → Média → Pico → Stress; **uma variável por vez** (ex.: só sync, depois só login).
5. **Comparação A/B** — mesma seed de VUs antes/depois de RPC e Redis rate limit.
6. **Chaos leve** — matar Realtime (C5); reiniciar funções (forçar cold) durante C1.
7. **Relatório** — tabela de p95 por rota + gráfico RPS + screenshot de conexões Supabase + lista de regressões.
8. **Gate de release** — não promover Fase B sem: 0 exaustão de conexão no pico turma e p95 sync abaixo do limiar.

### 4.6 Esboço de thresholds (k6)

Conceitualmente (não é código de produção):

- `http_req_failed < 1%` nos cenários legítimos  
- `http_req_duration{name:despertar_sync}` p95 &lt; 1500 ms  
- `http_req_duration{name:auth_login}` p95 &lt; 2500 ms  
- checks de corpo: `ok: true` onde aplicável; respeitar `429` só quando esperado  

Checklist — load tests

- [ ] Criar pasta `tests/load/` com cenários k6 nomeados C1–C6
- [ ] Secrets de staging via env (nunca commitados)
- [ ] Rodar baseline e arquivar resultados em `docs/load-results/` (data + commit)
- [ ] Definir “Definition of Done” numérico por fase (A/B/C)
- [ ] Incluir teste de regressão no checklist de release de mudanças em `api/despertar.js` / `api/progress.js` / auth

---

## 5. Roadmap priorizado

| Prioridade | Item | Gargalos | Esforço | Risco |
| --- | --- | --- | --- | --- |
| **P0** | Rate limit compartilhado (Redis) para Despertar/progress | G4 | M | Baixo |
| **P0** | Cache de `lesson_gates` + invalidação admin | G1, G5 | P | Baixo |
| **P0** | Instrumentação `db_round_trips` + baseline k6 | Todos | P | Baixo |
| **P1** | RPC colapsando `stateSync` | G1 | G | Médio (validação) |
| **P1** | `session-bootstrap` (auth+perfil+gates) | G8 | M | Baixo |
| **P1** | scrypt async + purge fora do login | G3, G6 | P–M | Baixo |
| **P2** | Leaderboard SQL + cache snapshot | G7 | M | Baixo |
| **P2** | Edge Middleware teto IP | G4 | P | Baixo |
| **P2** | Batch/coalesce de eventos de aula | G2 | M | Médio (UX) |
| **P3** | Split de monólitos / cold start | G9 | G | Médio |
| **P3** | Path `pg`+pooler só se RPC insuficiente | G1 | G | Médio |

---

## 6. Riscos e não-objetivos

| Risco | Mitigação |
| --- | --- |
| Cache de sessão servir user stale após ban/logout | TTL curto + invalidate no logout / `adminInvalidateSessions` |
| RPC complexa divergir de `validateSync` JS | Uma fonte de verdade; testes de paridade; feature flag |
| Rate limit Redis indisponível | Fail policy explícita: fail-open com teto local **ou** fail-closed em rotas abusáveis |
| Load test em produção | Preferir staging; se produção, janela controlada + feature flag de read-only admin |
| Reduzir custo scrypt demais | Threat model escrito; nunca abaixo do mínimo aceitável do curso |

**Não-objetivos deste plano:** migrar para Supabase Auth; multi-região ativa-ativa; cache CDN de POST; relaxar validação authoritative de XP.

---

## 7. Definition of Done (arquitetura)

O plano considera **Fase A concluída** quando:

- [ ] Limites de sync/Juízo/underworld são **cross-isolate**
- [ ] Gate Despertar não gera RTT em todo sync no caminho quente (hit de cache &gt; 95% em lab)
- [ ] Baseline k6 C1–C3 arquivado com p95 documentado
- [ ] Login não dispara purge global de sessions

**Fase B concluída** quando:

- [ ] `stateSync` típico ≤ **2–3** RTT (ideal 1 RPC)
- [ ] Boot de página protegida ≤ **1** round-trip de API para sessão+perfil
- [ ] Pico turma (N acordado) sem exaustão de conexões e com p95 dentro dos limiares

---

## 8. Apêndice — inventário rápido de hotspots

| Componente | Caminho | Papel no desempenho |
| --- | --- | --- |
| Client API | `js/api.js` | Chatty boot (`requireSession` + progress) |
| Despertar sync client | `js/hades-despertar/services/ApiService.js` | Heartbeat / min interval / dirty |
| Auth | `api/auth.js` | scrypt + sessions + rate DB |
| Auth rate | `api/_lib/auth-rate.js` | Modelo durável a reutilizar conceitualmente |
| Sessions | `api/_lib/sessions.js` | Validação + purge oportunista |
| Progress | `api/progress.js` | Monólito; awards; underworld RL memória |
| Despertar API | `api/despertar.js` | Hot path multi-RTT; RL memória |
| Gate | `api/_lib/despertar-gate.js` | Leitura repetida |
| Leaderboard | `api/_lib/leaderboard.js` | Full scan + sort |
| Supabase client | `api/supabaseClient.js` | Service role; sem pool app-side |
| Deploy | `vercel.json` | 256 MB, 10 s, API `no-store` |

---

*Documento vivo: atualizar limiares numéricos após a primeira corrida de baseline k6 e após a introdução do store compartilhado de rate limit.*
