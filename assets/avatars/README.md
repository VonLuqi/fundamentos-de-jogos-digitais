# Pasta de Avatares

Coloque aqui os arquivos de imagem dos avatares jogáveis, nomeados
sequencialmente como `avatar1`, `avatar2`, ... `avatar6` — **qualquer
extensão de imagem comum é aceita** (`.png`, `.jpg`, `.jpeg`, `.webp`,
`.gif`, `.svg`). O cliente tenta cada extensão em ordem até achar o
arquivo existente, então não é preciso usar a mesma extensão para
todos os avatares:

```
assets/avatars/avatar1.jpg
assets/avatars/avatar2.png
assets/avatars/avatar3.webp
assets/avatars/avatar4.png
assets/avatars/avatar5.png
assets/avatars/avatar6.png
```

Recomendações:
- Formato quadrado (ex.: 256x256px), fundo transparente (PNG/WebP) ou
  fundo sólido que combine com o tema dark/cyber-gótico do painel.
- Se quiser aceitar outras extensões, edite `AVATAR_EXTENSIONS` em
  `js/api.js`.
- O `avatarIndex` salvo no banco (coluna `avatar_index`) é o índice
  (0-based) desta lista — trocar a ordem dos arquivos muda o avatar
  exibido para jogadores que já escolheram um índice específico.
