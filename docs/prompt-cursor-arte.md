# Prompt para o Cursor — arte pendente do Despertar

Cole o bloco abaixo num **chat novo**, trocando `<LOTE>` por `L1`, `L2`… Um lote por chat.

```text
Tarefa: gerar a arte final de um lote de ícones do jogo "O Despertar" (incremental tipo Cookie Clicker com tema do Submundo grego) e integrar no repositório. Lote desta conversa: <LOTE>.
(Se <LOTE> ficou sem número, use o primeiro lote que ainda aparece em docs/ARTE-PENDENTE.md, exceto L7.)

1. Leia antes de começar
- docs/ARTE-PENDENTE.md → seção do lote <LOTE>: cada linha tem o id, o nome no jogo e o que o item faz. Essa é a lista completa; não gere nada fora dela.
- docs/STATUS-DESPERTAR.md → situação atual da arte.
- Não abra nem anexe assets/despertar/sprites/hud/moldura-rail-*.webp (1 px de espessura; o provedor rejeita e o chat trava). Evite anexar qualquer imagem que não seja um ícone quadrado.

2. Direção de arte (igual à arte já aprovada)
- Referências de estilo: use como reference image 2 ou 3 destes ícones já pintados:
  assets/despertar/sprites/generators/obsidian_throne.webp, generators/cerberian_hound.webp,
  upgrades/ceifador_ctoniano.webp, upgrades/colheita_eterna.webp, catabase/sanguessuga_normal.webp.
- Ilustração pintada de ícone de jogo, mitologia grega sombria: contorno escuro marcado, sombras dramáticas em obsidiana, luz de recorte (rim light), um único objeto central que se lê bem em 48–64 px.
- Paleta: ouro antigo #cfa759/#e8d4a8, verde-ciano do Estige #00a896, púrpura do Lethe #7209b7/#a855f7, carmesim do Phlegethon #d90429.
- Composição: objeto centralizado ocupando ~80% do quadro, quadrado, fundo escuro sólido e uniforme (#0a0a0f) em todas as bordas, sem moldura, sem vinheta encostando na borda (o script recorta o fundo a partir das bordas).
- Proibido: texto, letras, números, logos, marcas d'água; personagens ou artes copiados de outros jogos (Hades, Cookie Clicker). Os designs são próprios.
- Coerência de família dentro do lote: mesma forma base com variação de cor/material quando os itens são variações (ex.: os 5 Néctares = o mesmo cálice com líquidos diferentes; Dragão estágio 0→4 = a mesma criatura crescendo; Fortunas por gerador = um pergaminho/moeda de Hermes com o motivo do gerador correspondente, usando o ícone do gerador como referência).

3. Gerar
- Uma imagem por id, quadrada (1024×1024 ou 512×512), salva como .art-raw/<pasta>/<id>.png — o nome do arquivo é exatamente o id da tabela; <pasta> é a indicada no título do lote (shimmers, minigames, seasons, veil, catabase, upgrades).
- Antes de seguir, olhe cada imagem gerada: refaça as que tiverem texto, fundo não uniforme na borda, ou objeto cortado.

4. Integrar (no terminal)
- npm run despertar:art -- --folder <pasta> --in-dir .art-raw/<pasta>
  (recorta o fundo, grava assets/despertar/sprites/<pasta>/<id>.webp em 128×128 e registra em illustrated.json; não edite os .svg — são a referência que prova que o WebP foi pintado)
- Abra 3 ou 4 dos .webp gerados sobre fundo cinza médio e confira o recorte a olho (sem contorno preto destacado do objeto, sem pedaço cortado). Sombra escura pintada na borda do objeto é normal, não é halo; não precisa medir pixel a pixel. Se algum ficou ruim, refaça só aquele id e rode de novo com --ids <id>.
- npm run despertar:status -- --sync-requests
  → em docs/STATUS-DESPERTAR.md, a pasta do lote tem que mostrar 0 placeholders.
- npm run despertar:art-briefs
- npm run test:despertar → tem que terminar com todos passando.

5. Entregar
- Commit só com: assets/despertar/sprites/<pasta>/*.webp, assets/despertar/sprites/illustrated.json, assets/despertar/art-requests.json, docs/STATUS-DESPERTAR.md, docs/status-despertar.json, docs/ARTE-PENDENTE.md.
  Mensagem: "arte(despertar): lote <LOTE> — <título do lote>". Não altere código JS/PHP/CSS neste trabalho.
- Responda com: quantos ícones entraram, a linha da pasta em STATUS-DESPERTAR.md e qualquer id que precisou ser refeito.

Regras gerais: não marque nada como "delivered" à mão (o status é medido pelo script e um teste quebra se divergir). Não rode npm run despertar:sprites. Se um comando falhar, mostre a saída e pare em vez de contornar.
```

## Lotes

| Lote | Pasta | Ícones | Observação |
| --- | --- | ---: | --- |
| L1 | `shimmers` | 2 | Ecos dourado e colérico — os mais vistos |
| L2 | `minigames` | 21 | Pode dividir em 2 chats (Néctar+sementes / espíritos+feitiços+bens) |
| L3 | `seasons` | 15 | Dragão 0→4, auras, estações, Corça |
| L4 | `veil` | 5 | |
| L5 | `catabase` | 5 | Estágios 1→3, Trégua, Aliança |
| L6 | `upgrades` | 24 | Fortunas; dividir em 2 chats de 12 |
| L7 | `talents` | 129 | **Só depois do passo 5** (talentos com nome e texto próprios) |

Os números exatos e a lista atualizada estão sempre em `docs/ARTE-PENDENTE.md`.
