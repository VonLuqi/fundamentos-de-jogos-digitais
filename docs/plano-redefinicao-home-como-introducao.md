# Plano de Redefinicao da Home como Introducao ao Sistema

## Contexto

A Home atual em `index.html` passou por uma tentativa de virar hub logado da plataforma, acumulando tres papeis ao mesmo tempo:

- introducao/boas-vindas;
- seletor de aulas;
- ponto de navegacao global do usuario autenticado.

Na pratica, isso embaralha o fluxo. O dashboard em `pages/dashboard.html` ja esta mais adequado para ser o centro funcional do sistema, enquanto a Home faz mais sentido como porta de entrada conceitual e visual da plataforma.

**Sucessor:** apos a Home introdutoria, as paginas dedicadas de Aulas/Conquistas foram planejadas e implementadas em `docs/plano-paginas-aulas-e-conquistas.md`.

## Nova Direcao

Redefinir `index.html` para que ela deixe de ser o hub logado e passe a cumprir apenas o papel de introducao ao sistema.

O fluxo principal fica assim:

- `index.html` apresenta a plataforma e conduz o usuario para o sistema;
- `pages/auth.html` continua sendo a entrada para login/cadastro quando necessario;
- `pages/dashboard.html` passa a ser a entrada real da experiencia autenticada;
- `pages/aulas.html` passa a concentrar a exploracao da trilha e dos modulos;
- `pages/conquistas.html` passa a concentrar a colecao de conquistas, como um album de figurinhas/reliquias;
- areas administrativas continuam vivendo dentro do shell interno.

## Objetivo

Simplificar o começo da jornada do usuario e eliminar a ambiguidade de funcao da Home.

Metas praticas:

- remover da Home a responsabilidade de hub de aulas e progresso;
- deixar a Home mais clara, curta e convidativa;
- centralizar a entrada autenticada no dashboard, mas separar responsabilidades em paginas proprias de aulas e conquistas;
- reduzir duplicidade entre Home e shell interno.

## Decisao de Arquitetura

### Papel final de cada rota

- `index.html`: tela de apresentacao e introducao ao sistema.
- `pages/auth.html`: autenticacao quando o usuario ainda nao entrou.
- `pages/dashboard.html`: entrada principal do sistema autenticado e resumo geral do progresso.
- `pages/aulas.html`: pagina propria da trilha, modulos e acesso organizado as aulas.
- `pages/conquistas.html`: pagina propria de conquistas, reliquias e colecao visual do aluno.
- `pages/aula1.html`, `pages/aula2.html`, `pages/aula3.html`: conteudo interno da trilha, acessado a partir da pagina de aulas e do shell.
- `pages/souls.html`: area admin-only dentro do shell.

### Regra de entrada

A Home deve ter um CTA principal unico.

Comportamento esperado:

- se o usuario nao estiver autenticado, o CTA leva para `pages/auth.html`;
- se o usuario ja estiver autenticado, o CTA leva para `pages/dashboard.html`.

## Escopo Tecnico

### Arquivos envolvidos

- `index.html`
- `css/style.css`
- `js/main.js`
- opcionalmente `README.md` ou docs de contexto, se quisermos refletir o novo fluxo oficial

### Fora de escopo

- reestruturar novamente o shell interno;
- implementar ainda nesta fase as paginas definitivas de aulas e conquistas;
- mexer no fluxo das aulas;
- mexer no minigame;
- alterar regras de autenticacao backend.

## Estrutura Desejada para a Nova Home

### Conteudo principal recomendado

1. Titulo forte da plataforma.
2. Subtitulo curto explicando a proposta do sistema.
3. Breve bloco de valor:
   - progresso gamificado;
   - aulas e atividades;
   - conquistas e evolucao.
4. CTA principal:
   - `Entrar no Sistema` ou `Acessar Plataforma`.
5. CTA secundario opcional:
   - `Saiba como funciona` ou `Ver trilha` somente se realmente agregar.

### O que deve sair da Home

- painel lateral do jogador;
- barra de XP;
- estatisticas de aulas/conquistas;
- lista dinamica de aulas;
- logica de `continuar trilha`;
- rodape de comandos no estilo HUD.

## Ajuste de Arquitetura Aprovado Depois do Plano Inicial

Depois da aprovacao inicial, a arquitetura foi refinada com uma separacao mais forte de responsabilidades:

- dashboard nao deve acumular tudo sozinho;
- aulas devem ter uma pagina propria;
- conquistas devem ter uma pagina propria com linguagem de colecao, figurinhas ou reliquias;
- a Home deve apenas introduzir e encaminhar o usuario para o sistema real.

Isso muda a interpretacao correta do fluxo:

- o dashboard continua sendo a porta de entrada autenticada;
- mas `Aulas` e `Conquistas` deixam de ser apenas secoes internas e passam a ser destinos dedicados no shell.

## Plano de Execucao

### Fase 1 - Redefinir o papel da Home no codigo

- remover da Home a ideia de hub logado;
- documentar que o dashboard passa a ser a entrada funcional autenticada, com `Aulas` e `Conquistas` como responsabilidades separadas em paginas proprias;
- alinhar o texto da pagina a essa nova funcao.

### Fase 2 - Simplificar o HTML da Home

- [X] remover `player-panel`;
- [X] remover `stage-select` como centro da pagina;
- [X] remover `controls-bar` com comandos de sistema;
- [X] criar uma estrutura mais curta de landing interna.

### Fase 3 - Ajustar a identidade visual da Home

- [X] preservar a atmosfera Hades-like;
- [X] deixar a composicao mais limpa e menos "painel de jogo";
- [X] destacar o CTA principal como acao dominante.

### Fase 4 - Ajustar a logica do CTA principal

- [X] se houver sessao valida, enviar para `pages/dashboard.html`;
- [X] se nao houver sessao, enviar para `pages/auth.html`;
- [X] remover logicas antigas ligadas a trilha de aulas na Home.

### Fase 5 - Validar fluxo

- [X] abrir Home sem sessao e validar CTA para auth;
- [X] abrir Home com sessao e validar CTA para dashboard;
- [X] garantir que o dashboard continua sendo a entrada funcional do sistema, sem reassumir as responsabilidades completas de Aulas e Conquistas;
- [X] executar `npm run check`.

## Criterios de Aceite

- a Home fica claramente entendida como introducao, nao como hub operacional;
- existe um CTA principal unico e claro;
- o dashboard vira a entrada autenticada sem ambiguidade, mas `Aulas` e `Conquistas` ficam reservadas como paginas proprias;
- o visual da Home continua bonito, mas com funcao mais clara;
- nao sobra duplicidade de papel entre Home e dashboard.

## Status da Fase 1

- [X] Arquitetura redefinida para Home introdutoria.
- [X] Dashboard mantido como entrada autenticada, nao mais como dono unico de todas as responsabilidades.
- [X] Direcao registrada para paginas dedicadas de `Aulas` e `Conquistas`.

## Status da Fase 2

- [X] Home antiga em formato de hub foi removida estruturalmente.
- [X] `index.html` agora renderiza uma landing introdutoria com CTA principal unico.
- [X] `css/style.css` foi simplificado para a nova composicao da Home.
- [X] `js/main.js` deixou de cuidar de painel, progresso e lista de aulas e passou a cuidar apenas do CTA de entrada.
- [X] Validacao executada com `npm run check`.

## Status da Fase 3

- [X] Atmosfera Hades-like preservada.
- [X] Composição limpa, sem painel de jogo.
- [X] CTA principal destacado como ação dominante.

## Status da Fase 4

- [X] CTA redireciona conforme sessão válida.
- [X] Sessão ausente/inválida → `pages/auth.html`.
- [X] Sessão válida → `pages/dashboard.html`.
- [X] Lógicas antigas de trilha/aulas removidas da Home.

## Resultado Atual

A Home agora:

- apresenta a plataforma em vez de operar o sistema;
- explica rapidamente as tres frentes principais: aulas, conquistas e progresso;
- oferece um CTA principal unico para entrar no sistema real;
- deixa de competir com o dashboard e com o shell interno.

## Riscos e Mitigacoes

### Risco 1 - Home ficar genérica demais

Mitigacao:

- manter a identidade visual forte;
- preservar a atmosfera, mas com menos ruído estrutural.

### Risco 2 - Usuario perder contexto do que existe na plataforma

Mitigacao:

- incluir um resumo curto do que o sistema oferece antes do CTA.

### Risco 3 - Dashboard ficar sobrecarregado como unica entrada autenticada

Mitigacao:

- manter o shell interno consistente e o menu lateral claro;
- deixar a Home apenas apresentar, nao operar.

## Status da Fase 5

- [X] Fluxo sem sessão validado: CTA → `pages/auth.html`.
- [X] Fluxo com sessão validada: CTA → `pages/dashboard.html`.
- [X] Dashboard mantido como entrada autenticada, sem reassumir papéis de Aulas/Conquistas.
- [X] `npm run check` executado com sucesso.
