# Prompt para o Cursor (Grok) — criar, integrar e publicar a arte pendente do Despertar

**Como usar:** abra um **chat novo** no Cursor para cada lote e cole o bloco abaixo, trocando `<LOTE>` pelo lote (veja a tabela no fim).
Se aparecer **"Invalid Image"**, não insista no mesmo chat (a imagem ruim fica presa no contexto): abra um chat novo e cole o prompt de novo com o mesmo lote. As imagens já salvas em `.art-raw/` não se perdem.

```text
Tarefa: criar a arte final de um lote de ícones do jogo "O Despertar" (incremental inspirado em Cookie Clicker, tema do Submundo grego), integrar no repositório e publicar em produção. Lote desta conversa: <LOTE>.
Se <LOTE> ficou sem número, use o primeiro lote que ainda aparece em docs/ARTE-PENDENTE.md.

0. Preparar (terminal)
- git status → precisa estar na branch feat/hostgator-php-mysql. Rode git pull --ff-only.
- Se git status mostrar alterações que não são suas (ex.: um arquivo apagado), NÃO mexa nelas e NÃO as inclua no commit. Não apague, renomeie nem "limpe" nenhum arquivo fora do lote.

1. Ler antes de começar
- docs/ARTE-PENDENTE.md → seção do lote <LOTE>. Cada linha tem o id, o nome no jogo e o que o item faz. Essa é a lista completa: não gere nada fora dela.
  Lotes grandes: faça no máximo ~20 ids por chat, sempre os primeiros da tabela que ainda estão lá (a tabela encolhe sozinha a cada entrega).
- Nunca abra nem anexe: assets/despertar/sprites/hud/moldura-rail-*.webp (1 px de espessura — o provedor rejeita com "Invalid Image"), arquivos .svg, .glb, nem imagens que não sejam ícones quadrados.

2. Direção de arte (igual à arte já aprovada)
- Referências de estilo: anexe como reference image 2 ou 3 destes ícones já pintados (todos quadrados):
  assets/despertar/sprites/generators/obsidian_throne.webp, assets/despertar/sprites/generators/cerberian_hound.webp,
  assets/despertar/sprites/upgrades/ceifador_ctoniano.webp, assets/despertar/sprites/shimmers/eco_dourado.webp,
  assets/despertar/sprites/catabase/sanguessuga_normal.webp.
- Ilustração pintada de ícone de jogo, mitologia grega sombria: contorno escuro marcado, sombras dramáticas em obsidiana, luz de recorte (rim light), um único objeto central que se lê bem em 48–64 px.
- Paleta: ouro antigo #cfa759/#e8d4a8, verde-ciano do Estige #00a896, púrpura do Lethe #7209b7/#a855f7, carmesim do Phlegethon #d90429.
- Composição: quadrado, objeto centralizado ocupando ~80% do quadro, fundo escuro sólido e uniforme (#0a0a0f) em todas as bordas, sem moldura e sem vinheta encostando na borda (o script recorta o fundo a partir das bordas).
- Proibido: texto, letras, números, logos, marcas d'água; personagens ou artes copiados de outros jogos (Hades, Cookie Clicker etc.). Os designs são próprios.
- Use a coluna "O que é" para escolher o objeto. Quando os itens são variações, mantenha a mesma forma base mudando cor/material:
  · Néctares = o mesmo cálice com líquidos diferentes · Sementes = a mesma muda/flor de espécies diferentes
  · Espíritos = bustos/máscaras de cada deus · Feitiços = mão/pergaminho com o efeito · Bens = lingote/frasco/saco de cada material
  · Dragão estágio 0→4 = a mesma criatura crescendo (ovo → serpente → hidra → forma soberana)
  · Auras = um emblema circular por efeito · Estações = um medalhão por festival
  · Véus = o mesmo tecido/névoa em cores diferentes · Catábase estágio 1→3 = o mesmo portal se aprofundando
  · Fortunas = uma moeda/pergaminho de Hermes com o motivo do gerador correspondente (use o ícone do gerador como referência)
  · Talentos = um objeto simbólico por talento, ligado ao nome e ao texto da linha.

3. Gerar
- Uma imagem por id, quadrada (1024×1024 ou 512×512), salva como .art-raw/<pasta>/<id>.png. O nome do arquivo é exatamente o id da tabela; <pasta> é a que aparece no título do lote (ex.: `minigames`).
- Olhe cada imagem gerada e refaça as que tiverem texto, fundo não uniforme na borda ou objeto cortado.

4. Integrar (terminal; rode exatamente estes comandos)
- npm run despertar:art -- --folder <pasta> --in-dir .art-raw/<pasta>
  → recorta o fundo, grava assets/despertar/sprites/<pasta>/<id>.webp (128×128), registra em illustrated.json e atualiza o cache (js/hades-despertar/config/art-versions.js e a versão no importmap de pages/despertar.html). Não edite os .svg: eles são a referência que prova que o WebP foi pintado.
- Abra 3 ou 4 dos .webp gerados e confira o recorte (sem contorno preto destacado, sem pedaço cortado). Sombra escura pintada na borda do objeto é normal. Se algum ficou ruim, refaça só ele e rode de novo com --ids <id>.
- npm run despertar:status -- --sync-requests
- npm run despertar:art-briefs
- npm run test:despertar → tem que terminar com "N/N passaram". Se algo falhar, mostre a saída e PARE (não publique).

5. Commit (só estes arquivos — nunca use git add -A nem git add .)
  git add assets/despertar/sprites/<pasta>/*.webp assets/despertar/sprites/illustrated.json assets/despertar/art-requests.json js/hades-despertar/config/art-versions.js pages/despertar.html docs/STATUS-DESPERTAR.md docs/status-despertar.json docs/ARTE-PENDENTE.md
  git status → confira que só esses estão em "Changes to be committed".
  git commit -m "arte(despertar): lote <LOTE> — <título do lote>"
  Sem art-versions.js e pages/despertar.html no commit, o navegador continua mostrando a arte antiga — eles são obrigatórios.
  Não altere código JS/PHP/CSS à mão neste trabalho (os dois arquivos acima são reescritos pelo script).

6. Publicar (deploy)
- git push origin feat/hostgator-php-mysql → o push dispara o deploy automático para a HostGator (GitHub Actions "Deploy to HostGator (FTP)").
- Acompanhe: gh run list --branch feat/hostgator-php-mysql --limit 1 e depois gh run watch <id> --exit-status. Se o gh não estiver disponível, peça para eu conferir a aba Actions do GitHub.
- Se o deploy falhar, mostre o log (gh run view <id> --log-failed) e PARE.

7. Responder com
- quantos ícones entraram e quais ids precisaram ser refeitos;
- a linha da pasta em docs/STATUS-DESPERTAR.md (placeholders da pasta);
- o resultado dos testes e do deploy (id da run e "success").

Regras gerais: não marque nada como "delivered" à mão (o status é medido pelo script e um teste quebra se divergir). Não rode npm run despertar:sprites. Não use git push --force, git reset nem git clean. Se um comando falhar, mostre a saída e pare em vez de contornar.
```

## Lotes (199 ícones)

| Lote | Pasta | Ícones | Chats | Observação |
| --- | --- | ---: | ---: | --- |
| L2 | `minigames` | 21 | 2 | Néctar + sementes / espíritos + feitiços + bens |
| L4 | `veil` | 5 | 1 | |
| L5 | `catabase` | 5 | 1 | Estágios 1→3, Trégua, Aliança |
| L6 | `upgrades` | 24 | 2 | Fortunas: 12 por chat |
| L3 | `seasons` | 15 | 1 | Dragão 0→4, auras, estações, Corça — aparecem nas abas Dragão e Estações e na Corça da Saturnália |
| L7 | `talents` | 129 | ~7 | Árvore do Rio do Lethe; ~20 por chat |

Ordem sugerida: L2 → L4 → L5 → L6 → L3 → L7 (primeiro o que aparece na tela).
A lista exata, sempre atualizada, está em `docs/ARTE-PENDENTE.md`. Depois de cada lote, recarregue o jogo com **Ctrl+F5** para ver a arte nova.
