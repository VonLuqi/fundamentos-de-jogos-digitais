# Pasta de Avatares

Esta pasta guarda a galeria fixa de avatares do projeto. O frontend
carrega cada imagem por caminho exato, sem testar extensoes em serie.
A galeria foi padronizada para WebP para reduzir peso e simplificar a
resolucao. O indice salvo no banco (avatar_index) continua sendo
0-based e corresponde a ordem abaixo.

Total de avatares ativos: 33

Galeria atual:

```
assets/avatars/avatar1.webp
assets/avatars/avatar2.webp
assets/avatars/avatar3.webp
assets/avatars/avatar4.webp
assets/avatars/avatar5.webp
assets/avatars/avatar6.webp
assets/avatars/avatar7.webp
assets/avatars/avatar8.webp
assets/avatars/avatar9.webp
assets/avatars/avatar10.webp
assets/avatars/avatar11.webp
assets/avatars/avatar12.webp
assets/avatars/avatar13.webp
assets/avatars/avatar14.webp
assets/avatars/avatar15.webp
assets/avatars/avatar16.webp
assets/avatars/avatar17.webp
assets/avatars/avatar18.webp
assets/avatars/avatar19.webp
assets/avatars/avatar20.webp
assets/avatars/avatar21.webp
assets/avatars/avatar22.webp
assets/avatars/avatar23.webp
assets/avatars/avatar24.webp
assets/avatars/avatar25.webp
assets/avatars/avatar26.webp
assets/avatars/avatar27.webp
assets/avatars/avatar28.webp
assets/avatars/avatar29.webp
assets/avatars/avatar30.webp
assets/avatars/avatar31.webp
assets/avatars/avatar32.webp
assets/avatars/avatar33.webp
```

Recomendacoes:
- manter nomes e ordem estaveis para nao alterar o avatar de usuarios
  que ja escolheram um indice;
- usar imagens quadradas, de preferencia 256x256px;
- manter WebP como formato padrao para os avatares;
- ao importar novos avatares, usar o script scripts/import-avatars-webp.mjs;
- apos importar/limpar, executar scripts/sync-avatar-catalog.mjs para
  manter js/api.js e este README sincronizados.
