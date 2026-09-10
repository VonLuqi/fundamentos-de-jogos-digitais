# Plano — Tags de Filtro no Modal de Avatar

## Contexto

No dashboard, o modal **Escolha seu Avatar** (`scroll-modal` + `avatar-picker`) exibe, abaixo do título do pergaminho:

1. **"Biblioteca de Avatares"** (`.avatar-picker__title`)
2. **"Selecione um avatar da galeria e confirme para aplicar."** (`.avatar-picker__subtitle`)
3. Campo de busca por nome
4. Grade de avatares
5. Meta de seleção + status com **"N avatares disponíveis na biblioteca."**

Com ~63 avatares, a busca por texto sozinha exige lembrar o nome. Tags de categoria (Mitologia, Memes, Jogos, etc.) aceleram a exploração e aproveitam o espaço visual que hoje só descreve o óbvio.

A busca por nome já existe e deve **permanecer** (ver `docs/plano-reformulacao-pesquisa-avatar-nomes.md`). Este plano cobre **somente** tags + limpeza de copy que libera altura para a grade.

## Objetivo

- Remover título interno, subtítulo instrutivo e o contador ocioso da biblioteca.
- Colocar **chips/tags de filtro** no lugar do cabeçalho descritivo.
- Filtrar a grade por tag(s) **em combinação** com a busca por texto.
- Classificar todos os avatares do catálogo sem quebrar `avatar_index` / ordem legada.

## Fora de escopo

- Renomear arquivos WebP ou reordenar o catálogo.
- Mudar raridade, conquistas ou API de progresso.
- Redesign amplo do modal (layout chrome/scroll já tratado em `docs/plano-correcao-modal-avatar-vfx-busca.md`).
- Autocomplete ou tags geradas por IA em runtime.

## Estado atual (referência de código)

| Peça | Onde | Comportamento hoje |
| --- | --- | --- |
| Título / subtítulo | `js/dashboard.js` → `buildAvatarPickerContent()` | Textos estáticos no `.avatar-picker__head` |
| Busca | mesmo bloco + `applyFilter()` | Filtra por `label` / `searchTerms` / número |
| Status ocioso | `applyFilter()` quando query vazia | `"N avatares disponíveis na biblioteca."` |
| Catálogo | `assets/avatars/catalog.stub.json` | `{ file, label, searchTerms }` |
| Normalização | `js/api.js` → `normalizeAvatarCatalog()` | Não lê `tags` ainda |
| Estilos | `css/dashboard.css` (`.avatar-picker__*`) | Sem estilos de chip/tag |

## Decisões de produto

### Copy a remover

| Texto | Ação |
| --- | --- |
| `Biblioteca de Avatares` | Remover do DOM (não só esconder). |
| `Selecione um avatar da galeria e confirme para aplicar.` | Remover do DOM. |
| `N avatares disponíveis na biblioteca.` | Não exibir no estado ocioso (sem busca e sem tag ativa). |

Manter:

- Título do pergaminho: **Escolha seu Avatar** (`#scroll-modal-title`).
- Status útil: falha de carga, galeria vazia, e contagem **só quando houver filtro ativo** (ex.: `12 avatares encontrados.`).
- Meta: `Selecionado: Avatar N - Nome`.

### UX das tags

1. Local: substituir `.avatar-picker__head` (título + subtítulo) por uma faixa de chips **entre** o título do modal e o campo **Buscar avatar**.
2. Chip **Todos** sempre presente; estado inicial = Todos (sem filtro de tag).
3. **Seleção única** na v1 (um chip ativo por vez). Mais simples, cabe no espaço e evita ambiguidade com a busca.
4. Clique no chip já ativo (exceto Todos) → volta para Todos.
5. Tags + busca = **AND**: avatar precisa pertencer à tag ativa **e** casar com o texto (se houver).
6. Teclado/a11y: chips como `button` com `aria-pressed`; grupo com `role="group"` e `aria-label="Filtrar por categoria"`.
7. Mobile: chips em wrap (quebra de linha), sem scroll horizontal obrigatório; priorizar altura compacta.

### Expansão `+` / subtags (v2 — implementado)

Problema: as tags primárias (Mitologia, Memes, Jogos…) concentram muitos avatares. Tags mais específicas (ex.: `gatos`, `mortal-kombat`, `sanrio`) têm poucos itens, mas ajudam a achar rápido — e poluem a faixa principal se ficarem todas visíveis.

Solução: um único chip **`+` no final** da faixa principal abre um **modal interno** com as subtags nicho, selecionáveis.

#### Comportamento

1. Faixa principal: **Todos** + tags primárias + um chip **`+`** no fim (só se houver ≥ 1 subtag com avatares).
2. Clique numa tag primária → filtra por ela (igual à v1).
3. Clique no **`+`** → abre modal overlay dentro do picker (`role="dialog"`) listando subtags agrupadas pelo pai.
4. Clique numa **subtag** no modal → aplica o filtro e **fecha** o modal.
5. Clique de novo na subtag ativa (se reabrir o modal) → volta para **Todos** (mesmo toggle da v1).
6. Busca + subtag = **AND**.
7. Subtag só aparece no modal se tiver **≥ 1** avatar.
8. Fechar: botão Fechar, clique no backdrop, ou ao confirmar/cancelar o avatar.
9. Enquanto uma subtag estiver ativa, o chip **`+`** fica em destaque e o pai ganha estado `is-context` (borda) sem mudar o filtro.

#### Modelo de dados

Manter um único array `tags` no stub (sem campo novo obrigatório). Distinguir primária vs sub via definições no frontend:

```js
// Exemplo de contrato em js/api.js
{
  id: 'jogos',
  label: 'Jogos',
  kind: 'primary',
  children: ['mortal-kombat', 'indie', 'plataforma']
}
{
  id: 'mortal-kombat',
  label: 'Mortal Kombat',
  kind: 'sub',
  parent: 'jogos'
}
```

No JSON do avatar, subtags entram no mesmo `tags[]`:

```json
{
  "file": "scorpion.webp",
  "label": "Scorpion",
  "searchTerms": [],
  "tags": ["jogos", "mortal-kombat"]
}
```

Regras:

- Avatar com subtag **deve** também carregar a tag primária pai (facilita filtro e contagens).
- `normalizeAvatarCatalog` aceita ids primários **e** sub ids conhecidos.
- Scripts de sync/import continuam preservando `tags` manuais.

#### Taxonomia de subtags proposta (rascunho — curar na Fase 6)

| parent | sub id | Label UI | Exemplos / critério |
| --- | --- | --- | --- |
| `mitologia` | `olimpo` | Olimpo | Zeus, Afrodite, Hades, Zagreus |
| `mitologia` | `norse-god` | Nórdicos / God of War | Kratos, Kratos Madruga |
| `memes` | `br-memes` | Memes BR | Manoel Gomes, Grandão, Rusbé, Vini Jr. |
| `memes` | `chad` | Chad | Giga Chad, Giga Chad Transcendente |
| `jogos` | `mortal-kombat` | Mortal Kombat | Mileena, Scorpion, Sub-Zero |
| `jogos` | `indie` | Indie | Chara (Undertale), Zagreus |
| `anime` | `shonen` | Shonen | Itadori, Goku Sombrio, Mano Motoserra |
| `anime` | `kawaii` | Kawaii / Chibi | Neko*, chibi*, dino/rena hoodie, sami |
| `animais` | `gatos` | Gatos | Catioro, gatinhos, nekos animais, Tangirina |
| `animais` | `caes` | Cães | Filhote Boné, menina-golden/samoyed |
| `cultura-pop` | `disney-sanrio` | Disney / Sanrio | Stitch*, Cinnamoroll |
| `cultura-pop` | `cartoon` | Cartoon | Shrek, Snoopy, Patolino, Tio Patinhas, Snowball |

Lista final pode encolher: preferir poucas subtags úteis a dezenas vazias. Só criar subtag se houver **pelo menos 2** avatares (exceto exceção explícita).

### Taxonomia proposta (v1)

IDs estáveis em kebab-case ASCII (vão no JSON). Labels em PT para a UI.

| id | Label UI | Critério / exemplos |
| --- | --- | --- |
| `todos` | Todos | Pseudo-tag de UI; não grava no JSON. |
| `mitologia` | Mitologia | Hades, Afrodite, Zagreus, Zeus, Kratos, Kratos Madruga… |
| `memes` | Memes | Giga Chad, Crying Jordan, Beluga, Fry, Manoel Gomes, Vini Jr., IShowSpeed, Blinking White Guy, Roblox Man Face, Grandão, Rusbé… |
| `jogos` | Jogos | Tails, Chara, Lara Croft, Mileena, Scorpion, Sub-Zero, Omni-Man, Homem-Aranha, Itadori (jogo/anime — ver nota), Cellbitos… |
| `anime` | Anime | Itadori, Goku Sombrio, chibis/neko claramente anime, Menininha, Cry Girl… |
| `animais` | Animais | Catioro, Snoopy, Tangirina, Snowball, gatos/cães/filhotes novos… |
| `cultura-pop` | Cultura Pop | Capitao Picard, Michael Jackson, Shrek, Patolino, Tio Patinhas, O Mago, Lloyd, Stitch/Cinnamoroll temáticos… |

**Nota de classificação:** alguns avatares cabem em mais de uma categoria (ex.: Itadori = anime + jogos). Na v1 o avatar pode ter **1+ tags** no JSON; o chip mostra o avatar se **qualquer** tag do avatar bater com o chip ativo (OR no avatar, AND com a busca). Isso evita forçar uma única caixa errada.

Casos duvidosos: marcar na tabela de inventário e resolver na Fase 2 antes de fechar o stub.

### Schema do catálogo

Estender cada entrada de `catalog.stub.json`:

```json
{
  "file": "hades.webp",
  "label": "Hades",
  "searchTerms": [],
  "tags": ["mitologia"]
}
```

Regras:

- `tags` é array de ids da taxonomia (sem `todos`).
- Entrada sem `tags` ou `tags: []` → aparece **somente** em Todos (e na busca por texto). Preferível evitar: na Fase 2 todo avatar ativo deve ter ≥ 1 tag.
- `normalizeAvatarCatalog` em `js/api.js` passa a expor `tags: string[]` (normalizadas, deduplicadas, só ids conhecidos).
- Scripts `import-avatars-webp.mjs` / `sync-avatar-catalog.mjs`: ao mesclar stub, **não** apagar `tags` manuais (mesmo padrão de `label` / `searchTerms`). Novos imports entram com `tags: []` até curadoria.

## Escopo técnico

| Arquivo | Mudança |
| --- | --- |
| `docs/plano-tags-filtro-avatar.md` | Este plano. |
| `assets/avatars/catalog.stub.json` | Campo `tags` em todas as entradas. |
| `js/api.js` | Ler/normalizar `tags`; opcional helper `getAvatarTagDefinitions()`. |
| `js/dashboard.js` | Remover title/subtitle/status ocioso; montar chips; filtrar por tag + busca. |
| `css/dashboard.css` | Estilos `.avatar-picker__tags` / `__tag`; remover ou deixar mortos estilos de title/subtitle não usados. |
| `assets/avatars/README.md` | Documentar campo `tags` e taxonomia. |
| `scripts/import-avatars-webp.mjs` | Preservar `tags` no merge do stub; default `[]` em itens novos. |
| `scripts/sync-avatar-catalog.mjs` | Idem preservação no merge. |
| Teste smoke (opcional) | Assertivas mínimas de schema (`tags` array) e/ou lista de ids válidos. |

## Tarefas (checklist)

### Fase 0 — Limpeza de copy (rápida, independente)

- [x] Remover criação de `.avatar-picker__title` e `.avatar-picker__subtitle` em `buildAvatarPickerContent()`.
- [x] Remover (ou esvaziar) o ramo de status ocioso `"…disponíveis na biblioteca."`.
- [x] Manter status apenas para: carregando, erro, galeria vazia, e resultados quando busca/tag filtrarem.
- [x] Ajustar CSS: remover regras mortas de title/subtitle **ou** reaproveitar o container do head para as tags.
- [x] Validar visual: mais espaço para a grade; título do pergaminho intacto.

### Fase 1 — Contrato de dados e constantes

- [x] Definir lista canônica de tags (ids + labels) em um único lugar no frontend (ex.: `AVATAR_TAG_DEFINITIONS` em `js/api.js` ou constante no dashboard alimentada pela API).
- [x] Estender `normalizeAvatarCatalog` para incluir `tags` (filtrar ids desconhecidos; dedupe).
- [x] Atualizar `defaultAvatarCatalog()` com `tags: ['mitologia']` (ou `[]`) no fallback Hades.
- [x] Garantir que scripts de sync/import **não** sobrescrevem `tags` existentes ao mesclar.
- [x] Atualizar `assets/avatars/README.md` com a regra do campo `tags`.

### Fase 2 — Inventário e curadoria do stub

- [x] Percorrer os 63 avatares e preencher `tags` em `catalog.stub.json`.
- [x] Usar a tabela abaixo (completar durante a execução); marcar `revisar` quando houver dúvida.
- [x] Garantir: nenhum avatar ativo com `tags` vazio ao final da fase (exceto se explicitamente decidido).
- [x] Não alterar ordem das entradas do stub (índices legados).

#### Tabela de inventário

Contagens (um avatar pode ter várias tags): mitologia 6 · memes 17 · jogos 13 · anime 20 · animais 19 · cultura-pop 17.

Subtags (Fase 6): olimpo 4 · norse-god 2 · br-memes 4 · chad 2 · mortal-kombat 3 · indie 2 · shonen 3 · kawaii 16 · gatos 10 · caes 4 · disney-sanrio 3 · cartoon 6.

| file | label | tags | status |
| --- | --- | --- | --- |
| hades.webp | Hades | mitologia | confirmado |
| afrodite.webp | Afrodite | mitologia | confirmado |
| zagreus.webp | Zagreus | mitologia, jogos | confirmado |
| manoel-gomes.webp | Manoel Gomes | memes | confirmado |
| vini-jr-branco.webp | Vini Jr. Branco | memes | confirmado |
| omni-man.webp | Omni Man | cultura-pop, jogos | confirmado |
| tails.webp | Tails | jogos, animais | confirmado |
| chara.webp | Chara | jogos | confirmado |
| homem-aranha.webp | Homem Aranha | cultura-pop, jogos | confirmado |
| zeus.webp | Zeus | mitologia | confirmado |
| lloyd.webp | Lloyd | cultura-pop | confirmado |
| roblox-man-face.webp | Roblox Man Face | memes, jogos | confirmado |
| beluga.webp | Beluga | memes, animais | confirmado |
| fry.webp | Fry | memes, cultura-pop | confirmado |
| shrek.webp | Shrek | cultura-pop | confirmado |
| crying-jordan.webp | Crying Jordan | memes | confirmado |
| ishowspeed.webp | Ishowspeed | memes | confirmado |
| blinking-white-guy.webp | Blinking White Guy | memes | confirmado |
| capitao-picard.webp | Capitao Picard | cultura-pop | confirmado |
| catioro.webp | Catioro | animais | confirmado |
| mileena.webp | Mileena | jogos | confirmado |
| scorpion.webp | Scorpion | jogos | confirmado |
| sub-zero.webp | Sub Zero | jogos | confirmado |
| giga-chad.webp | Giga Chad | memes | confirmado |
| giga-chad-transcendente.webp | Giga Chad Transcendente | memes | confirmado |
| tio-patinhas.webp | Tio Patinhas | cultura-pop, animais | confirmado |
| patolino-mago.webp | Patolino Mago | cultura-pop, animais | confirmado |
| o-mago.webp | O Mago | cultura-pop | confirmado |
| michael-jackson.webp | Michael Jackson | cultura-pop | confirmado |
| kratos.webp | Kratos | mitologia, jogos | confirmado |
| kratos-madruga.webp | Kratos Madruga | mitologia, jogos, memes | confirmado |
| salsicha-instinto.webp | Salsicha Instinto | memes, cultura-pop | confirmado |
| lara-croft.webp | Lara Croft | jogos | confirmado |
| cellbitos.webp | Cellbitos | anime, memes | confirmado |
| cry-girl.webp | Cry Girl | anime, memes | confirmado |
| goku-sombrio.webp | Goku Sombrio | anime | confirmado |
| grandao.webp | Grandão | memes | confirmado |
| itadori.webp | Itadori | anime, jogos | confirmado |
| mano-motoserra.webp | Mano Motoserra | anime | confirmado |
| menininha.webp | Menininha | anime | confirmado |
| rusbe.webp | Rusbé | memes | confirmado |
| snoopy.webp | Snoopy | cultura-pop, animais | confirmado |
| tangirina.webp | Tangirina | animais | confirmado |
| chibi-gatinho.webp | Chibi Gatinho | anime, animais | confirmado |
| chibi-thug-life.webp | Chibi Thug Life | anime, memes | confirmado |
| cinnamoroll.webp | Cinnamoroll | cultura-pop, anime | confirmado |
| dino-hoodie.webp | Dino Hoodie | anime | confirmado |
| filhote-bone.webp | Filhote Boné | animais | confirmado |
| gatinho-flor.webp | Gatinho Flor | animais | confirmado |
| gatinho-oculos.webp | Gatinho Óculos | animais | confirmado |
| gato-macacao.webp | Gato Macacão | animais | confirmado |
| gato-noite-estrelada.webp | Gato Noite Estrelada | animais, cultura-pop | confirmado |
| menina-golden.webp | Menina Golden | anime, animais | confirmado |
| menina-lilas.webp | Menina Lilás | anime | confirmado |
| menina-samoyed.webp | Menina Samoyed | anime, animais | confirmado |
| neko-coracoes.webp | Neko Corações | anime, animais | confirmado |
| neko-gato.webp | Neko Gato | anime, animais | confirmado |
| neko-rosa.webp | Neko Rosa | anime, animais | confirmado |
| rena-hoodie.webp | Rena Hoodie | anime | confirmado |
| sami-nuvens.webp | Sami Nuvens | anime | confirmado |
| snowball.webp | Snowball | cultura-pop, animais | confirmado |
| stitch-hoodie.webp | Stitch Hoodie | cultura-pop, anime | confirmado |
| stitch-pelucia.webp | Stitch Pelúcia | cultura-pop, anime | confirmado |

### Fase 3 — UI dos chips

- [x] Substituir o conteúdo de `.avatar-picker__head` por `.avatar-picker__tags` (grupo de botões).
- [x] Renderizar chip **Todos** + chips da taxonomia (só tags que tenham ≥ 1 avatar, opcional mas recomendado para não mostrar chip vazio).
- [x] Estado visual: chip ativo (ouro preenchido / `aria-pressed="true"`); inativo (ghost/borda).
- [x] Layout wrap, gap compacto, tipografia alinhada ao dashboard (fonte título, letter-spacing, uppercase).
- [x] Desabilitar chips junto com `setBusy(true)` durante confirmação/carregamento, como a busca.
- [x] Responsivo: 2+ linhas ok; não empurrar Confirmar/Cancelar para fora (respeitar chrome fixo do modal).

### Fase 4 — Lógica de filtro combinado

- [x] Estado `activeTagId` (default `'todos'`).
- [x] Estender `applyFilter()`:
  - texto: igual ao de hoje (`searchableText.includes(query)`);
  - tag: se `activeTagId !== 'todos'`, exigir `avatar.tags.includes(activeTagId)`.
- [x] Guardar `data-tags` (ou lookup por índice) em cada botão da grade.
- [x] Ao trocar tag: chamar `applyFilter()`; atualizar status só se houver query **ou** tag ≠ Todos.
- [x] Empty state: reutilizar `.avatar-picker__empty` (“Nenhum avatar encontrado para esse filtro.”).
- [x] Seleção (`pendingIndex`) sobrevive ao filtro mesmo se o card sumir (comportamento atual da busca).

### Fase 5 — Validação e polish

- [x] Abrir modal: Todos ativo; grade completa; sem texto “biblioteca” / subtítulo / contador ocioso.
- [x] Clicar Mitologia → só avatares da tag; Confirmar ainda funciona.
- [x] Mitologia + busca `kra` → Kratos / Kratos Madruga (se tagueados).
- [x] Chip ativo de novo → volta a Todos.
- [x] Avatar sem a tag ativa some; com busca vazia e Todos, todos voltam.
- [x] Mobile / viewport baixa: chips + busca + meta + ações visíveis; só a grade rola.
- [x] Smoke opcional: validar que todo item do stub tem `tags` array e ids ∈ taxonomia.
- [x] `npm run check` (ou smoke relevante do projeto).

Notas da validação:
- Smoke dedicado: `tests/avatar-tags-smoke.mjs` (ligado ao `npm run check`).
- Cobre schema do stub (63 entradas, tags válidas, webps presentes), filtro AND (`mitologia` + `kra`), remoção de copy antiga, markup/CSS dos chips e chrome fixo do modal.
- Cenários de clique visual no browser ficam cobertos pela lógica espelhada no smoke + layout já travado em `.scroll-modal--avatar`.

### Fase 6 — Subtags via `+` (expansão nicho)

Objetivo: manter a faixa principal limpa e revelar filtros específicos sob demanda.

#### 6.1 — Contrato e taxonomia

- [x] Estender `AVATAR_TAG_DEFINITIONS` com `kind: 'primary' | 'sub'` e relação `parent` / `children`.
- [x] Atualizar `normalizeAvatarTags` para aceitar ids de subtags (whitelist unificada).
- [x] Expor helpers: `getAvatarPrimaryTagDefinitions()`, `getAvatarSubTagDefinitions(parentId)`.
- [x] Fechar lista curta de subtags (rascunho na seção “Expansão + / subtags”); descartar ids com < 2 avatares.

#### 6.2 — Curadoria do stub

- [x] Acrescentar subtags nos `tags[]` dos avatares elegíveis **sem remover** a primária.
- [x] Atualizar inventário (tabela) com coluna `subtags`.
- [x] Garantir: toda subtag usada no stub existe nas definições; todo avatar com subtag também tem o `parent`.

#### 6.3 — UI do `+`

- [x] Um único chip **`+` no final** da faixa (não um `+` por tag).
- [x] Clique no `+` abre modal interno com subtags selecionáveis.
- [x] Subtags agrupadas por categoria pai; só com ≥ 1 avatar.
- [x] Selecionar subtag aplica filtro e fecha o modal.
- [x] Estilo do dialog alinhado ao dashboard; não quebra chrome fixo.
- [x] `setBusy` desabilita `+` e chips do modal.

#### 6.4 — Filtro

- [x] `activeTagId` pode ser primária **ou** sub; `applyFilter` inalterado na regra (`tags.includes(activeTagId)` + busca AND).
- [x] Ao filtrar por subtag, opcional: marcar visualmente o pai como “contexto” (borda) sem mudar o filtro.
- [x] Status / empty state iguais à v1 quando filtro ativo.

#### 6.5 — Validação

- [x] `+` no fim abre modal com Mortal Kombat etc.; selecionar filtra a grade; busca ainda AND.
- [x] Fechar modal (Fechar / backdrop) sem limpar filtro já aplicado.
- [x] Estender `tests/avatar-tags-smoke.mjs` (parent/child, subtags no stub, markup do `+`/modal).
- [x] `npm run check`.

Decisão documentada: fechar o modal de subtags **não** limpa o filtro; só Todos / outro chip / toggle da própria subtag limpa.

## Critérios de aceite

1. “Biblioteca de Avatares”, subtítulo instrutivo e “N avatares disponíveis na biblioteca.” **não aparecem** mais.
2. Tags visíveis no lugar do cabeçalho antigo, com chip **Todos** e categorias da taxonomia.
3. Filtro por tag reduz a grade; busca + tag funcionam juntos (AND).
4. Confirmar/Cancelar e persistência de `avatar_index` inalterados.
5. Ordem do catálogo / índices legados preservados.
6. Novos avatares importados não perdem `tags` já curadas no sync.
7. *(Fase 6)* Um **`+` no fim** da faixa abre modal com subtags nicho (≥ 1 avatar).
8. *(Fase 6)* Subtag selecionável no modal filtra a grade; a faixa principal não fica poluída com todas as nicho.

## Riscos e mitigações

| Risco | Mitigação |
| --- | --- |
| Classificação subjetiva (meme vs cultura pop) | Tabela de inventário + status `revisar`; preferir 2 tags a forçar 1 errada. |
| Chip vazio (tag sem avatares) | Só renderizar tags com count > 0. |
| Stub merge apagar tags | Mesmo padrão de proteção de `label`/`searchTerms` nos scripts. |
| Altura dos chips comer espaço da grade | Chips compactos; copy removida libera ~2 linhas; validar em Fase 5. |
| Tag id renomeada no futuro | Ids estáveis; labels só na UI. |
| `+` acidentalmente filtra em vez de expandir | `+` é chip separado no fim; abre modal, não filtra sozinho. |
| Subtags demais / faixa estoura mobile | Subtags só no modal; faixa principal enxuta. |
| Avatar só com subtag sem pai | Validação no smoke: sub ⇒ parent presente no `tags[]`. |

## Ordem recomendada

1. Fase 0 (limpeza visual imediata).
2. Fase 1 (contrato de dados).
3. Fase 2 (curadoria do stub) — pode começar em paralelo com Fase 1 após o schema fechado.
4. Fase 3 (UI).
5. Fase 4 (filtro).
6. Fase 5 (validação).
7. Fase 6 (subtags via `+`: contrato → curadoria → UI → filtro → smoke).

## Status

- Estado atual: **concluído (Fases 0–6)**.
- Próximo passo: validar visualmente no dashboard (opcional) e consolidar commit quando quiser.
