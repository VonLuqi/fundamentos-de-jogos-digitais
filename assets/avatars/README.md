# Pasta de Avatares

Esta pasta guarda a galeria fixa de avatares do projeto. O frontend
carrega cada imagem por caminho exato, sem testar extensoes em serie.
A galeria foi padronizada para WebP para reduzir peso e simplificar a
resolucao. O indice salvo no banco (avatar_index) continua sendo
0-based e corresponde a ordem do catalogo semantico
(`assets/avatars/catalog.stub.json`), nao a ordem alfabetica abaixo.

Total de avatares ativos: 63

Galeria atual:

```
assets/avatars/afrodite.webp
assets/avatars/beluga.webp
assets/avatars/blinking-white-guy.webp
assets/avatars/capitao-picard.webp
assets/avatars/catioro.webp
assets/avatars/cellbitos.webp
assets/avatars/chara.webp
assets/avatars/chibi-gatinho.webp
assets/avatars/chibi-thug-life.webp
assets/avatars/cinnamoroll.webp
assets/avatars/cry-girl.webp
assets/avatars/crying-jordan.webp
assets/avatars/dino-hoodie.webp
assets/avatars/filhote-bone.webp
assets/avatars/fry.webp
assets/avatars/gatinho-flor.webp
assets/avatars/gatinho-oculos.webp
assets/avatars/gato-macacao.webp
assets/avatars/gato-noite-estrelada.webp
assets/avatars/giga-chad-transcendente.webp
assets/avatars/giga-chad.webp
assets/avatars/goku-sombrio.webp
assets/avatars/grandao.webp
assets/avatars/hades.webp
assets/avatars/homem-aranha.webp
assets/avatars/ishowspeed.webp
assets/avatars/itadori.webp
assets/avatars/kratos-madruga.webp
assets/avatars/kratos.webp
assets/avatars/lara-croft.webp
assets/avatars/lloyd.webp
assets/avatars/mano-motoserra.webp
assets/avatars/manoel-gomes.webp
assets/avatars/menina-golden.webp
assets/avatars/menina-lilas.webp
assets/avatars/menina-samoyed.webp
assets/avatars/menininha.webp
assets/avatars/michael-jackson.webp
assets/avatars/mileena.webp
assets/avatars/neko-coracoes.webp
assets/avatars/neko-gato.webp
assets/avatars/neko-rosa.webp
assets/avatars/o-mago.webp
assets/avatars/omni-man.webp
assets/avatars/patolino-mago.webp
assets/avatars/rena-hoodie.webp
assets/avatars/roblox-man-face.webp
assets/avatars/rusbe.webp
assets/avatars/salsicha-instinto.webp
assets/avatars/sami-nuvens.webp
assets/avatars/scorpion.webp
assets/avatars/shrek.webp
assets/avatars/snoopy.webp
assets/avatars/snowball.webp
assets/avatars/stitch-hoodie.webp
assets/avatars/stitch-pelucia.webp
assets/avatars/sub-zero.webp
assets/avatars/tails.webp
assets/avatars/tangirina.webp
assets/avatars/tio-patinhas.webp
assets/avatars/vini-jr-branco.webp
assets/avatars/zagreus.webp
assets/avatars/zeus.webp
```

## Metadados do catalogo (`catalog.stub.json`)

Cada entrada do stub usa:

```json
{
  "file": "hades.webp",
  "label": "Hades",
  "searchTerms": [],
  "tags": ["mitologia"]
}
```

- `file`: nome do WebP em `assets/avatars/`.
- `label`: nome exibido na UI e base da busca.
- `searchTerms`: aliases opcionais para a busca.
- `tags`: ids da taxonomia de filtro (sem `todos`). Ids **primarios**:
  `mitologia`, `memes`, `jogos`, `anime`, `animais`, `cultura-pop`.
  Ids **sub** (chip `+` no fim da faixa abre modal): `olimpo`, `norse-god`, `br-memes`, `chad`,
  `mortal-kombat`, `indie`, `shonen`, `kawaii`, `gatos`, `caes`,
  `disney-sanrio`, `cartoon`.
  Um avatar pode ter varias tags. Subtag exige tambem a primaria pai.
  Sem tags (ou `[]`) so aparece em Todos e na busca por texto
  (ver `docs/plano-tags-filtro-avatar.md`).

Os scripts de import/sync **nao** apagam `label`, `searchTerms` nem `tags`
de entradas existentes no merge. So `--overwrite-stub` recria o stub inteiro.

Recomendacoes:
- manter nomes e ordem estaveis para nao alterar o avatar de usuarios
  que ja escolheram um indice;
- usar imagens quadradas, de preferencia 256x256px;
- manter WebP como formato padrao para os avatares;
- ao importar novos avatares, usar o script scripts/import-avatars-webp.mjs;
- apos importar/limpar, executar scripts/sync-avatar-catalog.mjs para
  manter catalog.stub.json e este README sincronizados;
- apos importar, preencher `tags` no stub antes de publicar o filtro.
