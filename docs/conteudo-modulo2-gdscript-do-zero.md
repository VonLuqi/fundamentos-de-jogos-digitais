# Módulo 2 — Introdução ao GDScript “Do Zero”

**Curso:** Fundamentos de Jogos Digitais  
**Aulas:** 06 a 10 · ~10h  
**Papel do módulo:** primeiro contato estruturado com **GDScript**, UI/economia ética e **processo de equipe** na Godot 4, depois das fundações culturais e de classificação do Módulo 1.

Este arquivo reúne a **visão do módulo** e o conteúdo pedagógico das Aulas **06–07** (08–10: TBD quando a ementa oficial as listar).

Alinhado a:

- Aula 06: `pages/aula6.html` · [`plano-aula6-mercado-loja-etica.md`](./plano-aula6-mercado-loja-etica.md) · [`playbook-liberar-aula6.md`](./playbook-liberar-aula6.md)
- Aula 07: `pages/aula7.html` · [`plano-aula7-papeis-workflow-versionamento.md`](./plano-aula7-papeis-workflow-versionamento.md) · [`playbook-liberar-aula7.md`](./playbook-liberar-aula7.md)

---

## Visão do módulo


| Aula | Título | Tópico da ementa | Prática |
| :---: | --- | --- | --- |
| **06** | Mercado, PI e Monetização Ética | Mercado brasileiro e internacional de jogos | Godot 4 · loja UI (`Control` / `Button` / `PanelContainer`) + moedas in-game |
| **07** | Papéis, Workflow e Versionamento Visual | Papéis no desenvolvimento e workflow | Individual ou dupla · arte da moeda × coleta · diário · `LabirintoDeMoedas` |
| **08** | *(a definir)* | — | Continuação Labirinto / GDScript |
| **09** | *(a definir)* | — | … |
| **10** | *(a definir)* | — | … |

**Contrato de experiência (espelho Módulo 1):** abas *I. Fundamentos · II. Oficina · III. Slides*; envio server-authoritative; XP via Altar; 1 conquista pública + secretas por aula; gate `published: false` até o Mestre liberar.

**Pré-requisitos:** Aula 06 → `aula5`; Aula 07 → `aula6`. A Provação do Módulo 1 não bloqueia a trilha automaticamente na v1.

> **Nota:** `Camera2D` / `AnimatedSprite2D` **não** são conteúdo oficial da Aula 06 **nem** da Aula 07. Ficam para aulas posteriores **se** a ementa as listar.

---

## Aula 06 — Mercado, PI e Monetização Ética

### Objetivo

Conectar o **mercado de jogos** e a **monetização ética** à prática de uma **loja interna** na Godot 4: cosméticos com preço fixo, abastecidos só por moedas ganhas jogando — sem IAP real e sem loot box.

### Conceitos-chave

| Conceito | Leitura operacional |
| --- | --- |
| **Mercado BR / internacional** | Quem joga, quem publica, como o dinheiro circula |
| **Original IP** | Você cria e detém o jogo/mundo |
| **Prestação de serviços** | Outsourcing, gamificação, work-for-hire sob contrato |
| **Monetização ética** | Transparente; respeita o tempo do jogador |
| **Loot box ↔ ClassInd** | Simular azar eleva a faixa (eco Aula 05 · frequentemente 18+) |

### Fundamento teórico (~20 min)

- Mercado brasileiro e internacional.
- Como estúdios geram receita de forma sustentável e ética.
- Divisão Original IP × serviços.
- Microtransações aceitáveis vs mecânicas abusivas baseadas em sorte.

### Oficina (~100 min)

Cena `ui/loja.tscn` (raiz `Control`):

1. Árvore com `PanelContainer` / `Button` / `Label` (nomes canônicos).
2. Script `loja.gd` + sinal `pressed` (Forma A: editor).
3. Saldo inicial 10 · coletar +5 · itens 5 / 12 / 20.
4. Bloquear compra sem moedas e item já possuído — **sem** `randi()`.

**Artefato:** interface operacional de loja interna baseada em moedas ganhas jogando.

**Material:** `assets/docs/aulas/aula06-loja-etica/` · slides `aula06_mercado_loja_etica_slides`.

**Conquistas:** `aula6_concluida` (Guardião da Loja Ética) + secretas Mercador do Styx · Balcão sem Azar · Tempo Respeitado.

---

## Aula 07 — Papéis, Workflow e Versionamento Visual

### Objetivo

Enxergar o estúdio como **sistema de papéis**, fechar o **cercado do escopo** (anti–Scope Creep) e kickoff do integrador **Labirinto de Moedas 2D** em **individual ou dupla** (arte da moeda × programação da coleta), com diário compartilhado e versionamento visual.

### Conceitos-chave

| Conceito | Leitura operacional |
| --- | --- |
| **Cinco ofícios** | Programação · Arte · Áudio · Game Design · Produção |
| **Workflow** | Ideia → MVP → produção por papel → integração → playtest |
| **Scope Creep** | Crescer ideias sem cortar tempo/pessoas/features |
| **Versionamento visual** | Pastas canônicas · um dono por `.tscn` · ZIP datado |
| **LabirintoDeMoedas** | Projeto novo do integrador (loja Aula 06 fica no projeto antigo) |

### Fundamento teórico (~30–40 min no Encontro 1)

- Ofícios com entregável e falha típica de sala.
- Workflow com o que entra/sai de cada fase.
- Scope Creep no Labirinto; mapa estúdio → sala (dupla ou solo).

### Oficina (~200 min ao longo de 2 encontros)

1. Solo (os dois ofícios) ou convite de dupla na Oficina.
2. Quadro: Arte da moeda × Programação da coleta + ≥3 itens fora do escopo.
3. Projeto `LabirintoDeMoedas` · sprite + `moeda.tscn` · Player + coleta (`Area2D` / `body_entered`).
4. Pasta compartilhada + diário compartilhado (finalize individual).

**Artefato:** MVP sprite + coleta + diário + pastas versionadas.

**Material:** `assets/docs/aulas/aula07-equipe-labirinto/` · slides `aula07_papeis_workflow_slides`.

**Conquistas:** `aula7_concluida` (Cartógrafo da Dupla) + secretas Cinco Ofícios · Cercado do Escopo · Pasta Sagrada.

---

## Progressão (esboço)

```
Provação M1
        ↓
Aula 06 — Mercado + loja ética (GDScript UI)
        ↓
Aula 07 — Papéis + dupla/solo + coleta Labirinto
        ↓
Aula 08–10 — TBD (ementa)
```

---

## Referências rápidas

| Artefato | Caminho |
| --- | --- |
| Página 06 | `pages/aula6.html` |
| Página 07 | `pages/aula7.html` |
| Plano 06 | [`plano-aula6-mercado-loja-etica.md`](./plano-aula6-mercado-loja-etica.md) |
| Plano 07 | [`plano-aula7-papeis-workflow-versionamento.md`](./plano-aula7-papeis-workflow-versionamento.md) |
| Playbook 06 | [`playbook-liberar-aula6.md`](./playbook-liberar-aula6.md) |
| Playbook 07 | [`playbook-liberar-aula7.md`](./playbook-liberar-aula7.md) |
| Catálogo | `js/api.js` → `MODULES.modulo2` |
| Conteúdo M1 (ponte) | [`conteudo-modulo1-fundacoes-cultura-interface.md`](./conteudo-modulo1-fundacoes-cultura-interface.md) |

---

*Esboço do Módulo 2 — Aulas 06–07 preenchidas; Aulas 08–10 TBD (2026-09-28).*
