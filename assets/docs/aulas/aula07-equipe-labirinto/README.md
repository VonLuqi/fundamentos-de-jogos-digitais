# Aula 07 — Minha Equipe, Meu Escopo (Godot 4)

> **Página da aula:** `pages/aula7.html`  
> **Quadro imprimível:** [`quadro-atribuicao.md`](./quadro-atribuicao.md)  
> **Árvore canônica:** [`estrutura-pastas.txt`](./estrutura-pastas.txt)  
> **Plano:** `docs/plano-aula7-papeis-workflow-versionamento.md`

Passo a passo para formar a **equipe de 3** do projeto integrador **“O Labirinto de Moedas 2D”**, preencher o quadro de papéis, criar o projeto Godot **`LabirintoDeMoedas`** com pastas e cenas-esqueleto, e organizar a **pasta compartilhada** sem sobrescrever o trabalho do colega.

Esta aula é de **processo + organização**. O labirinto jogável completo e a loja da Aula 06 **não** entram hoje.

---

## Fora do escopo (obrigatório lembrar)

| Permitido hoje | Proibido hoje |
| :--- | :--- |
| Equipe de 3 + quadro + cronograma | Labirinto jogável completo (movimento/coleta) |
| Projeto novo `LabirintoDeMoedas` + stubs `.tscn` | Integrar a loja cosmética da Aula 06 |
| Pasta compartilhada + ZIP datado | Dois alunos editando a mesma `.tscn` ao mesmo tempo |
| Lista “fora do escopo” (≥3 itens) | Combate, NPCs, multiplayer, bosses |
| Teaser verbal de que **existe** Git | Git obrigatório / aula de setup de CLI |

**Scope Creep clássico:** “vamos pôr a loja agora”. Resposta da sala: **não** — fica no cercado “fora”.

---

## Checklist do artefato

Ao final, a equipe deve ter:

- [ ] Equipe de 3 nomeada + **produtor do dia**
- [ ] Quadro: cenário · moedas · player com responsáveis
- [ ] ≥3 itens **fora do escopo**
- [ ] Cronograma com ≥3 tarefas e donos
- [ ] Projeto `LabirintoDeMoedas` + três cenas-esqueleto (`player` · `moeda` · `cenario`)
- [ ] Pasta compartilhada ou ZIP de backup criado
- [ ] Anotações + síntese enviadas na página da aula (`aula7`) — **cada aluno**, individualmente

**Projeto canônico:** `LabirintoDeMoedas`  
**Pasta sync sugerida:** `LabirintoDeMoedas_<NomeEquipe>`

---

## Pré-requisitos

- Godot **4.x** instalada e abrindo
- Conta/pasta compartilhada da equipe (Drive, OneDrive, rede da escola, etc.)
- Página da Aula 07 aberta na aba **Oficina** (anotações)
- Lista oficial de equipes do Mestre
- Quadro impresso ou digital: [`quadro-atribuicao.md`](./quadro-atribuicao.md)

### O que NÃO fazer nesta aula

| Evitar | Por quê |
| :--- | :--- |
| Implementar movimento 4 dirs / coleta de moedas | É o integrador das **próximas** aulas |
| Integrar a loja da Aula 06 | Scope Creep; loja fica no projeto antigo |
| Continuar o projeto das Aulas 02–06 como base | Task 0 = projeto **novo** limpo para o Labirinto |
| Editar a mesma `.tscn` em paralelo na pasta sync | Conflito / arquivo corrompido |
| Prometer Git como entrega obrigatória | Desvia os 100 min |

### Vocabulário mínimo

| Termo | Significado operacional |
| :--- | :--- |
| Papel | Responsabilidade nomeada sobre um entregável |
| Workflow | Sequência de etapas do trabalho |
| Scope Creep | Crescimento do escopo sem corte/prioridade |
| MVP | Menor versão que ainda cumpre a meta do jogo |
| Pasta compartilhada | Local único da equipe (sync) para o projeto |
| Versionamento visual | Organização + backups + regras de quem edita o quê |
| `.tscn` | Cena Godot — **não** editar em paralelo sem acordo |
| `.godot/` | Cache local — não precisa ir para o Drive “no grito” |

### Cronograma sugerido (~100 min)

| Bloco | Tempo | Atividade | Resultado visível |
| :--- | :--- | :--- | :--- |
| 0. Formação | 10 min | Equipes de 3 · produtor do dia | Trio + nome da equipe |
| 1. Quadro | 20 min | Atribuições + fora do escopo | Quadro completo |
| 2. Cronograma | 15 min | 3–5 tarefas com dono | Cronograma no artefato |
| 3. Pastas Godot | 25 min | Projeto + 3 stubs | FileSystem alinhado |
| 4. Pasta sync | 15 min | Regras · ZIP backup | Pasta da equipe ok |
| 5. Registro | 15 min | Anotações · finalizar | Entrega na plataforma |

**Buffer:** se a formação atrasar, encurtar Bloco 2 (cronograma “3 linhas”) e proteger Blocos 1 + 3–4.

---

## Nomes de pastas e cenas são contrato

Use **exatamente** os nomes abaixo. Maiúsculas/caminhos importam: `cenas/player.tscn` ≠ `Player.tscn` na raiz.

| Cena | Tipo raiz | Dono típico |
| :--- | :--- | :--- |
| `cenas/player.tscn` | `CharacterBody2D` | Programação |
| `cenas/moeda.tscn` | `Area2D` *(preferencial)* ou `Node2D` | Game Design / moedas |
| `cenas/cenario.tscn` | `Node2D` | Arte |

---

## Bloco 0 — Formação de equipes (10 min)

1. O Mestre anuncia a **lista oficial** de equipes (3 alunos fixos).
2. Ímpar na turma: dupla + “produtor itinerante” **ou** grupo de 4 com 2 na arte.
3. Escolham o **Produtor do dia** (dono do quadro e da pasta compartilhada).
4. Registrem o nome da equipe no quadro (ex.: *Três Moedas*, *Styx Runners*).

**Checkpoint 0:** três nomes + produtor do dia preenchidos.

---

## Bloco 1 — Quadro de atribuição (20 min)

Abram [`quadro-atribuicao.md`](./quadro-atribuicao.md) (imprimir ou copiar para doc compartilhado) e preencham:

```text
Equipe: ____________________    Data: __________
Produtor do dia: ____________________

| Entrega              | Aluno responsável | Papel de estúdio (chapéu) | Feito nesta aula? |
| Arte do cenário      |                   | Arte                      | pastas / cena stub |
| Moedas (props+regra) |                   | Game Design (+ arte prop) | pastas / cena stub |
| Movimentação Player  |                   | Programação               | pastas / cena stub |
| Áudio (depois)       | (a definir)       | Áudio                     | só pasta vazia     |

FORA DO ESCOPO (cercado) — listar ≥3 itens que NÃO faremos agora:
1) …
2) …
3) …
```

**Checkpoint 1:** três entregas com dono + lista “fora do escopo” com ≥3 itens.

---

## Bloco 2 — Cronograma de tarefas (15 min)

No mesmo artefato, 3–5 linhas:

| Tarefa | Dono | Alvo (aula / data) | Status |
| :--- | :--- | :--- | :--- |
| Stub `player.tscn` | … | Aula 07 | |
| Stub `moeda.tscn` | … | Aula 07 | |
| Stub `cenario.tscn` | … | Aula 07 | |
| Movimento 4 dirs | … | Aula 08+ | |
| Coleta + HUD moedas | … | Aula 08+ | |

Mensagem: o cronograma **protege** o cercado — se algo novo aparecer, ou entra no fim da fila, ou **sai** outra coisa.

**Checkpoint 2:** pelo menos 3 tarefas com dono.

---

## Bloco 3 — Estrutura Godot (25 min)

Árvore canônica (também em [`estrutura-pastas.txt`](./estrutura-pastas.txt)):

```text
LabirintoDeMoedas/
├── project.godot
├── cenas/
│   ├── player.tscn         ← dono: Programação · raiz CharacterBody2D
│   ├── moeda.tscn          ← dono: Moedas / Design · raiz Area2D (ou Node2D)
│   └── cenario.tscn        ← dono: Arte · raiz Node2D
├── sprites/                ← arte (placeholders ok)
├── audio/                  ← vazia por enquanto
├── scripts/                ← .gd futuros (Aula 08+)
└── ui/                     ← HUD depois (não obrigatório hoje)
```

### Passos

1. Godot → **New Project** → nome/pasta **`LabirintoDeMoedas`** no caminho **local** da máquina (não crie direto dentro do Drive se a sync for lenta — copie depois).
2. No **FileSystem**, botão direito na raiz → **New Folder** para: `cenas`, `sprites`, `audio`, `scripts`, `ui`.
3. Cada aluno cria **só a cena do seu papel**:
   - **Programação:** Scene → New Scene → **Other Node** → `CharacterBody2D` → renomeie a raiz para `Player` → salve `cenas/player.tscn`.
   - **Moedas / Design:** New Scene → `Area2D` (ou `Node2D`) → raiz `Moeda` → salve `cenas/moeda.tscn`. Anote no quadro a regra provisória (ex.: “coletar 10 moedas = vitória”).
   - **Arte:** New Scene → `Node2D` → raiz `Cenario` → salve `cenas/cenario.tscn`. Placeholder de sprite em `sprites/` é opcional.
4. **Não** anexe script de movimento/coleta nesta aula.
5. Confiram juntos no FileSystem se os três arquivos existem com os nomes canônicos.

**Checkpoint 3:** as três `.tscn` existem; pastas `sprites/`, `audio/`, `scripts/` visíveis.

---

## Bloco 4 — Pasta compartilhada e versionamento visual (15 min)

### Regras de sala

1. **Uma** pasta da equipe no Drive/OneDrive/rede; nome: `LabirintoDeMoedas_<NomeEquipe>`.
2. Antes de editar uma `.tscn`, **avise no grupo** (“estou na player.tscn”).
3. Preferir: cada um edita **só a cena do seu papel** nesta fase.
4. Ao fim da aula: **ZIP datado** `backup_AAAA-MM-DD_HHMM.zip` na pasta (rede de segurança).
5. Não sincronizar obsessivamente a pasta `.godot/` — se der conflito de cache, apague `.godot` e reabra o projeto.
6. Nunca “salvar por cima” o ZIP do colega sem renomear.

### O que versionar / o que ignorar

| Levar para a pasta sync | Pode ficar só local |
| :--- | :--- |
| `project.godot` | Pasta `.godot/` (cache) |
| `cenas/*.tscn` (+ `.tscn.uid` se aparecer) | Arquivos temporários do SO |
| `sprites/`, `audio/`, `scripts/`, `ui/` | ZIPs antigos sem data no nome |
| Quadro (PDF/foto/MD) | — |
| ZIP `backup_…` | — |

### Teaser Git (não obrigatório)

Existe controle de versão com **Git** (commits, histórico, branches). Nesta aula a prática é **pasta compartilhada + convenções**. Git pode voltar em aula futura se a ementa pedir.

**Checkpoint 4:** pasta compartilhada tem o projeto (ou o ZIP) + quadro digital/foto.

---

## Bloco 5 — Registro na plataforma (15 min)

1. Cada aluno preenche as anotações na aba **Oficina** da `aula7` — **individual**, mesmo em equipe.
2. Síntese (5–8 linhas): papéis do estúdio → como o trio evita Scope Creep → pastas/cenas + regra da pasta compartilhada.
3. **Finalizar aula e enviar anotações**.
4. Lembrar o **Altar** / código quando o Mestre liberar.

---

## Troubleshooting

| Problema | O que fazer |
| :--- | :--- |
| Drive apagou/alterou `.tscn` | Restaurar do ZIP datado; da próxima vez, um dono por cena |
| Conflito em `.godot/` | Apagar a pasta `.godot` local e reabrir o projeto |
| Alguém criou `Player.tscn` na raiz | Mover/renomear para `cenas/player.tscn` (contrato) |
| Quer programar movimento “só um pouco” | Redirecionar: stubs bastam; movimento = Aula 08+ |
| Quer puxar a loja da Aula 06 | Scope Creep — anotar em FORA DO ESCOPO |
| Projeto criado direto no Drive e trava | Trabalhar local → copiar pasta / ZIP para o sync |

---

## Contrato de escopo do Labirinto (referência)

| No escopo (MVP) | Fora (até o Mestre liberar) |
| :--- | :--- |
| **Hoje:** papéis + pastas + quadro + stubs | Combate, NPCs, diálogos |
| **08+:** player 4 dirs · moedas + contador · 1 fase | Loja Aula 06 · multiplayer · bosses · shaders |

---

## Arquivos deste pacote

| Arquivo | Uso |
| :--- | :--- |
| [`README.md`](./README.md) | Este guia (Blocos 0–5) |
| [`quadro-atribuicao.md`](./quadro-atribuicao.md) | Template imprimível do artefato |
| [`estrutura-pastas.txt`](./estrutura-pastas.txt) | Árvore canônica só texto |

---

*Material da Aula 07 · Módulo 2 · Labirinto de Moedas 2D — kickoff de equipe (2026-09-28).*
