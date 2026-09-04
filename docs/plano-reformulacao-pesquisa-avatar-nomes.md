# Plano de Reformulacao - Pesquisa de Avatar por Nome de Personagem

## Contexto
Hoje a galeria de avatares usa nomes tecnicos sequenciais (`avatar1.webp`, `avatar2.webp`, etc.) e a busca no modal filtra apenas por numero/rotulo generico.

Solicitacao:
- Renomear avatares para nome de personagem quando identificado.
- Tornar a pesquisa dinamica em tempo real (nome + variacoes).

## Objetivo
- Evoluir o catalogo de avatares para metadados semanticos (nome real do personagem).
- Permitir busca instantanea por texto digitado, com feedback imediato.
- Preservar compatibilidade com usuarios existentes e com o indice salvo (`avatar_index`).

## Escopo Tecnico
- `js/api.js`
- `js/dashboard.js`
- `css/dashboard.css` (somente se houver ajuste visual de busca)
- `assets/avatars/README.md`
- `scripts/sync-avatar-catalog.mjs`
- `scripts/import-avatars-webp.mjs` (se for necessario incluir suporte a nomes)
- `assets/avatars/` (rename dos arquivos)

## Premissas
- Nem todos os personagens poderao ser identificados de primeira; nesses casos o arquivo permanece como esta ate mapeamento manual.
- A ordem logica da galeria deve permanecer estavel para nao trocar avatar ja escolhido pelos usuarios.
- O formato padrao continua WebP.

## Tarefas (Checklist)

### Fase 1 - Inventario e mapeamento de nomes
- [x] Levantar todos os arquivos `.webp` ativos em `assets/avatars/`.
- [x] Criar tabela de mapeamento: `arquivo_atual -> nome_personagem`.
- [x] Marcar casos incertos como `pendente` (nao renomear automaticamente).
- [x] Definir padrao de nome de arquivo final (ex.: `nome-personagem.webp`, ASCII, kebab-case).

### Fase 2 - Estrutura de catalogo semantico
- [x] Evoluir o catalogo de avatar no frontend para objeto com metadados (em vez de apenas string):
  - `file`
  - `label` (nome exibivel)
  - `searchTerms` (alias/sinonimos)
  - `legacyIndex` (ordem para compatibilidade)
- [x] Garantir fallback para avatares ainda sem nome real (ex.: `Avatar 17`).
- [x] Manter `avatarSafeIndex` funcional para contas antigas.

### Fase 3 - Renomeacao segura de arquivos
- [x] Renomear apenas arquivos com nome de personagem confirmado.
- [x] Nao renomear arquivos pendentes/incertos.
- [x] Validar que todos os caminhos referenciados no catalogo existem apos rename.
- [x] Validar que o avatar carregado por indice continua correto para usuario antigo.

### Fase 4 - Pesquisa dinamica em tempo real
- [x] Atualizar filtro da busca no modal para rodar em `input` com debounce leve (ex.: 80-120ms) ou sem debounce, conforme UX.
- [x] Buscar por:
  - nome do personagem (`label`),
  - aliases (`searchTerms`),
  - identificador numerico (`legacyIndex`/numero visual).
- [x] Destacar resultado vazio com mensagem clara e manter status em tempo real.
- [x] Garantir funcionamento com acentos (normalizacao `NFD`, case-insensitive).

### Fase 5 - Scripts de manutencao
- [x] Atualizar `scripts/sync-avatar-catalog.mjs` para suportar catalogo semantico (nao depender apenas de `avatarN.webp`).
- [x] Opcional: gerar automaticamente stub de `searchTerms` a partir do nome de arquivo.
- [x] Atualizar `scripts/import-avatars-webp.mjs` para permitir nome base opcional quando arquivo de origem tiver nome util.
- [x] Garantir que o script nao sobrescreve metadados manuais sem confirmacao.

### Fase 6 - Documentacao
- [x] Atualizar `assets/avatars/README.md` com:
  - regra de nomenclatura por personagem,
  - fluxo para casos sem nome confirmado,
  - comando de sincronizacao recomendado.
- [x] Documentar no plano como adicionar novos avatares sem quebrar indices antigos.

#### Guia rapido - adicionar novos avatares sem quebrar indice
1. Importar novos arquivos com nome semantico:
  `node scripts/import-avatars-webp.mjs --input <pasta-origem> --naming source --stub-file assets/avatars/catalog.stub.json`
2. Preencher/ajustar metadata manual no stub quando necessario (label e searchTerms).
3. Sincronizar catalogo sem sobrescrever metadata manual:
  `node scripts/sync-avatar-catalog.mjs --stub-file assets/avatars/catalog.stub.json`
4. Confirmar que os novos itens foram adicionados ao final da ordem logica.
5. Nao reordenar/remover entradas antigas de `AVATAR_FILES` sem migracao planejada de `avatar_index`.

### Fase 7 - Validacao funcional
- [x] Validar busca em tempo real no dashboard com:
  - termo exato,
  - termo parcial,
  - alias,
  - busca sem acento para nome acentuado.
- [x] Validar troca de avatar e persistencia apos reload.
- [x] Validar que `index`, `dashboard` e `souls` seguem carregando avatares corretamente.
- [x] Executar `npm run check`.

## Criterios de Aceite
- Busca de avatar responde em tempo real durante digitacao.
- Avatares com personagem identificado exibem e pesquisam pelo nome correto.
- Avatares sem identificacao permanecem estaveis e funcionais.
- Nenhum usuario antigo perde o avatar por quebra de compatibilidade de indice.
- Scripts e documentacao ficam alinhados com o novo catalogo.

## Riscos e Mitigacoes
- Risco: rename de arquivo quebrar o avatar de usuarios existentes.
  - Mitigacao: preservar ordem logica (`legacyIndex`) e validar por amostragem antes de publicar.
- Risco: nomes ambiguos ou desconhecidos causarem classificacao errada.
  - Mitigacao: marcar como `pendente` e manter nome tecnico ate revisao manual.
- Risco: script sobrescrever metadado curado manualmente.
  - Mitigacao: separar campos gerados automaticamente de campos editados manualmente e proteger overwrite.

## Ordem Recomendada de Execucao
1. Fase 1 (inventario e mapeamento).
2. Fase 2 (catalogo semantico).
3. Fase 3 (rename seguro).
4. Fase 4 (busca em tempo real).
5. Fase 5 (scripts).
6. Fase 6 (documentacao).
7. Fase 7 (validacao final).

## Status
- Estado atual: Fases 1, 2, 3, 4, 5, 6 e 7 concluidas.
- Proximo passo: consolidar commit e publicar.
