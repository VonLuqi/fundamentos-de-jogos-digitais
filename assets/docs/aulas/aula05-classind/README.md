# Aula 05 — ClassInd, IARC e Design Saudável

> **Página da aula:** `pages/aula5.html`  
> **ClassInd-dle:** `pages/classind-dle.html`  
> **Slides:** [`aula05_classind_iarc_slides.pptx`](../aula05_classind_iarc_slides.pptx) · [`aula05_classind_iarc_slides.pdf`](../aula05_classind_iarc_slides.pdf)  
> **Tabela de faixas:** [`faixas-classind.md`](./faixas-classind.md)  
> **Capas do dle:** `assets/classind-dle/covers/` (WebP 600×800 · `npm run classind:covers`)

A oficina **não usa Godot**. As duas práticas acontecem no próprio site: votação live (ClassInd-dle) + wizard IARC de mesa (Patch Note). Entrega do aluno: **Finalizar aula** no wizard (sem textareas de anotações na página).

**Artes de teoria ainda a pedir** (slides usam capas do dle até lá): diagrama faixas L→18; ícones dos 3 eixos; diagrama “mesmo loop, feedbacks diferentes”. Ver [`INVENTARIO.md`](../../classind-dle/covers/INVENTARIO.md).

---

## Na aula (visão rápida)

1. **Fundamentos** (~20 min) — ClassInd, faixas, eixos, IARC.  
2. **ClassInd-dle** — Higher/Lower ao vivo no telão do Mestre.  
3. **Wizard IARC** — higienizar pitch 16+/18+ → Patch Note (mira **Livre** ou **10**).

---

## ClassInd (resumo operacional)

A **Classificação Indicativa** é aviso de conteúdo — não censura de criação. Serve ao consumidor, às lojas e ao designer (cada gore, nudez ou glamourização de droga é decisão de design com custo de público).

### Três eixos

| Eixo | O que a classificação “lê” |
| :--- | :--- |
| **Violência** | Contra quem? Sangue? Cadáveres? Fantasia vs realismo |
| **Sexo** | Insinuação, nudez, atos, recompensa sexual |
| **Drogas** | Menção, uso como mecânica, realismo, glamourização |

### Atenuantes vs agravantes

| Atenuam | Agravam |
| :--- | :--- |
| Fantasia, comicidade, não-humanos | Realismo, gore, cadáveres humanos |
| Sem sangue / sem foco em sofrimento | Tortura, nudez, glamourização de substâncias |
| Cura/recompensa “mágica” | Drogas realistas como mecânica de cura |

Tabela didática completa: [`faixas-classind.md`](./faixas-classind.md).

---

## IARC (selo nas lojas)

O **International Age Rating Coalition** oferece formulário de conteúdo → selos multi-região/loja (caminho digital que alimenta ClassInd e outros sistemas).

- Gratuito e pensado para publicação digital.  
- As perguntas espelham os mesmos eixos.  
- O design deve bater com a declaração — mentir no formulário é risco comercial e ético.

Nesta aula o **wizard IARC de mesa** simula o raciocínio do formulário sem sair do site.

---

## Parte 1 — Como entrar no ClassInd-dle

1. O **Mestre** (admin) abre `pages/classind-dle.html`, cria a sala e mostra o **código** no telão.  
2. Você entra pelo CTA **Abrir ClassInd-dle** na aba Oficina (ou pela mesma URL) e digita o código.  
3. Em cada rodada: compare A vs B → vote **qual exige a idade mais alta** (uma vez).  
4. Placar ao vivo sem spoiler; após o revelar: faixas + descritores + se você acertou.  
5. Anote **1 insight**: um detalhe de design que mudou a faixa na discussão.

Teclado: teclas **A** / **B** no voto. Mobile ok para o aluno; telão para o Mestre.

---

## Parte 2 — Patch Note de Higienização (checklist)

Missão: pegar um pitch **16+/18+** e redesenhar feedbacks até **Livre** ou no máximo **10**, **sem** esvaziar o loop-core.

Use o wizard na Oficina e, ao final, **Aplicar nas anotações + síntese**.

### Checklist do artefato

- [ ] Participei de ao menos uma sessão ClassInd-dle com voto  
- [ ] Anotei 1 insight (detalhe que mudou a faixa)  
- [ ] Pitch escolhido (Necrópole Viral / Sombra do Contrato / App de Destinos / Porão das Horas / outro)  
- [ ] Patch Note: original → higienizado → argumentos ClassInd/IARC → faixa-alvo **L** ou **10**  
- [ ] Mecânica-core preservada (o “verbo” do jogo continua o mesmo)  
- [ ] Anotações + síntese enviadas na página  
- [ ] Código no Altar quando o Mestre liberar

### Estrutura sugerida do Patch Note

```text
## Original (por que 16+/18+)
...

## Higienizado (o que mudou no feedback)
- Visual: ...
- Narrativa: ...
- Cura / recompensa: ...
- Inimigos / alvos: ...

## Mecânica-core preservada
...

## Argumentos ClassInd / IARC → faixa-alvo
...
```

---

## Regenerar slides

```bash
python scripts/build-aula05-slides.py
```

Saídas: `assets/docs/aulas/aula05_classind_iarc_slides.{pptx,pdf}` (PDF via PowerPoint no Windows, se disponível).
