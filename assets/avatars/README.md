# Pasta de Avatares

Esta pasta guarda a galeria fixa de avatares do projeto. O frontend
carrega cada imagem por caminho exato, sem testar extensoes em serie.
A galeria foi padronizada para WebP para reduzir peso e simplificar a
resolucao. O indice salvo no banco (avatar_index) continua sendo
0-based e corresponde a ordem abaixo.

Total de avatares ativos: 43

Galeria atual:

```
assets/avatars/afrodite.webp
assets/avatars/beluga.webp
assets/avatars/blinking-white-guy.webp
assets/avatars/capitao-picard.webp
assets/avatars/catioro.webp
assets/avatars/cellbitos.webp
assets/avatars/chara.webp
assets/avatars/cry-girl.webp
assets/avatars/crying-jordan.webp
assets/avatars/fry.webp
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
assets/avatars/menininha.webp
assets/avatars/michael-jackson.webp
assets/avatars/mileena.webp
assets/avatars/o-mago.webp
assets/avatars/omni-man.webp
assets/avatars/patolino-mago.webp
assets/avatars/roblox-man-face.webp
assets/avatars/rusbe.webp
assets/avatars/salsicha-instinto.webp
assets/avatars/scorpion.webp
assets/avatars/shrek.webp
assets/avatars/snoopy.webp
assets/avatars/sub-zero.webp
assets/avatars/tails.webp
assets/avatars/tangirina.webp
assets/avatars/tio-patinhas.webp
assets/avatars/vini-jr-branco.webp
assets/avatars/zagreus.webp
assets/avatars/zeus.webp
```

Recomendacoes:
- manter nomes e ordem estaveis para nao alterar o avatar de usuarios
  que ja escolheram um indice;
- usar imagens quadradas, de preferencia 256x256px;
- manter WebP como formato padrao para os avatares;
- ao importar novos avatares, usar o script scripts/import-avatars-webp.mjs;
- apos importar/limpar, executar scripts/sync-avatar-catalog.mjs para
  manter catalog.stub.json e este README sincronizados.
