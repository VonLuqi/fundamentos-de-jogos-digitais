# Plano de Implementacao - Raridade de Conquistas, Nova UI de Avatar e Pipeline WebP

## Contexto
Este plano cobre tres entregas:
1. Classificacao de raridade para todas as conquistas.
2. Reformulacao da selecao de avatar para uma galeria modal inspirada na UI de referencia (sem upload local).
3. Script de importacao/conversao de imagens para WebP com ordenacao automatica na pasta de avatares.

O projeto ja possui:
- Galeria de avatar em modal no dashboard (grid com selecao).
- Lista explicita de arquivos de avatar no frontend.
- Conquistas com metadados basicos (`id`, `icon`, `name`, `desc`, `hidden`), sem raridade.

## Objetivo
- Introduzir um sistema claro e escalavel de raridade: Pedra (Comum), Cobre (Incomum), Prata (Raro), Ouro (Epico), Arco-iris (Lendario).
- Atualizar UX de selecao de avatar para um fluxo visual de biblioteca (sem opcao de upload pelo usuario).
- Garantir pipeline padrao para avatares em WebP, com nomenclatura sequencial automatica e validacao de quantidade.

## Escopo Tecnico
- `js/api.js`
- `js/dashboard.js`
- `css/dashboard.css`
- `pages/dashboard.html`
- `api/progress.js`
- `assets/avatars/README.md`
- `assets/avatars/` (arquivos)
- `scripts/` (novo script de conversao/importacao)
- `package.json` (dependencia de processamento de imagem e script npm)

## Premissas
- Nao havera upload de avatar pelo usuario final no browser.
- A ordem do avatar deve continuar estavel para nao trocar avatar ja salvo por `avatar_index`.
- Toda imagem de avatar ativa deve estar em WebP ao final.

## Tarefas (Checklist)

### Fase 1 - Modelo de Raridade de Conquistas
- [x] Definir enum/catologo de raridade com chave tecnica e rotulo de exibicao:
  - `stone` -> Pedra (Comum)
  - `copper` -> Cobre (Incomum)
  - `silver` -> Prata (Raro)
  - `gold` -> Ouro (Epico)
  - `rainbow` -> Arco-iris (Lendario)
- [x] Adicionar `rarity` em cada item de `ACHIEVEMENTS` no frontend.
- [x] Definir regra de classificacao por dificuldade no backend para futuras conquistas dinamicas (default e fallback).
- [x] Garantir compatibilidade com conquistas antigas sem `rarity` (fallback para `stone`).

### Fase 2 - Exibicao de Raridade na UI de Conquistas
- [x] Atualizar renderizacao de card de conquista para exibir selo/faixa de raridade.
- [x] Aplicar tokens visuais por raridade (borda, brilho, gradiente, rotulo textual).
- [x] Ajustar contraste/legibilidade em desktop e mobile.
- [x] Garantir acessibilidade: nao depender apenas de cor (mostrar texto da raridade).

### Fase 3 - Refino da UI de Selecao de Avatar (inspirada na referencia)
- [x] Reestruturar o modal de avatar para uma experiencia de biblioteca:
  - cabecalho claro,
  - campo de busca local opcional por nome/numero,
  - grade visual maior,
  - destaque forte no avatar selecionado,
  - CTA principal para confirmar selecao.
- [x] Remover/nao implementar qualquer trecho de upload local na UI.
- [x] Manter fluxo de persistencia atual via `setAvatar(token, avatarIndex)`.
- [x] Incluir estado de carregamento e estado vazio/erro no modal.

### Fase 4 - Pipeline de Importacao e Conversao para WebP
- [x] Criar script Node em `scripts/` para:
  - ler imagens de uma pasta de entrada (configuravel por argumento),
  - converter todas para WebP,
  - redimensionar/padronizar (ex.: 256x256 com crop inteligente ou contain),
  - exportar para `assets/avatars/` em ordem sequencial `avatarN.webp`.
- [x] Definir estrategia de ordenacao (alfabetica natural por nome de arquivo de origem).
- [x] Definir politica de sobrescrita segura:
  - modo append (continua do ultimo indice),
  - modo replace (reconstroi a galeria do zero, opcional com flag).
- [x] Gerar resumo ao final com:
  - total importado,
  - total convertido,
  - indice inicial/final,
  - arquivos ignorados.

### Fase 5 - Sincronizacao de Catalogo de Avatares
- [x] Atualizar automaticamente (ou via comando auxiliar) a lista `AVATAR_FILES` do frontend com todos os `avatarN.webp` existentes.
- [x] Atualizar `assets/avatars/README.md` para refletir a quantidade real.
- [x] Remover legados nao-WebP da pasta de avatares (`.jpg`, `.gif`, `.jfif`) apos validacao.
- [x] Validar consistencia entre:
  - arquivos fisicos,
  - contador exibido no dashboard,
  - total usado em menu principal e Salao dos Herois.

### Fase 6 - Testes e Validacao
- [x] Validar que cards de conquista exibem raridade correta em usuario comum e admin.
- [x] Validar que desbloqueio de conquista continua funcionando sem regressao.
- [x] Validar selecao de avatar no modal (troca, persistencia, recarregamento de pagina).
- [x] Validar que todas as telas que exibem avatar carregam WebP sem 404s.
- [x] Executar `npm run check` e corrigir eventuais erros de sintaxe introduzidos.

## Criterios de Aceite
- Todas as conquistas possuem raridade definida e visivel na UI.
- A interface de escolha de avatar segue padrao de galeria visual e nao possui opcao de upload local.
- Existe script reutilizavel para importar e converter imagens para WebP em sequencia automatica.
- A pasta `assets/avatars/` fica padronizada em WebP para os avatares ativos.
- Contagem de avatares e indices ficam consistentes entre frontend e arquivos reais.

## Riscos e Mitigacoes
- Risco: troca da ordem quebrar avatar de usuarios existentes.
  - Mitigacao: preservar indices atuais por padrao e usar modo `replace` apenas quando explicitamente solicitado.
- Risco: variacao de proporcao das imagens de origem gerar cortes ruins.
  - Mitigacao: permitir estrategia configuravel (`cover` ou `contain`) e revisar amostras apos conversao.
- Risco: discrepancia entre lista hardcoded e pasta real voltar no futuro.
  - Mitigacao: adicionar etapa automatizada de sincronizacao/checagem no script.

## Ordem Recomendada de Execucao
1. Fase 1 (modelo de raridade).
2. Fase 2 (UI de conquistas).
3. Fase 4 (script WebP).
4. Fase 5 (sincronizacao da galeria).
5. Fase 3 (refino visual do modal de avatar, ja com base final de arquivos).
6. Fase 6 (validacao final).

## Status
- Estado atual: Fases 1, 2, 3, 4, 5 e 6 concluidas.
- Proximo passo: opcional - consolidar evidencias em um checklist de release e abrir PR.
