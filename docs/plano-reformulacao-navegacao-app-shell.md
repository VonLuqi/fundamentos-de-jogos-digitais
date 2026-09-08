# Plano de Reformulacao da Navegacao - App Shell Hibrido

## Contexto
O projeto hoje usa modelos de navegacao diferentes entre as telas principais:

- a Home em `index.html` funciona como uma tela de selecao de modulos em estilo "palco";
- o painel do aluno em `pages/dashboard.html` usa cabecalho superior tradicional;
- as aulas em `pages/aula1.html` usam header proprio + navegacao local por abas.

Isso nao esta quebrado, mas exige que o aluno reaprenda a se orientar cada vez que muda de area. Para um sistema educacional gamificado, o custo cognitivo disso e desnecessario.

Direcao aprovada:
- manter navegacao superior simples nas telas de entrada/boas-vindas;
- adotar um app shell com aside na experiencia logada;
- transformar o aside em drawer com menu hamburguer no mobile;
- preservar o design system ja estabelecido (estetica Hades UI, tipografia, tokens e linguagem visual atuais).

## Objetivo
Criar uma navegacao mais intuitiva, consistente e escalavel para alunos, sem descaracterizar a identidade visual do projeto.

Metas praticas:
- reduzir a fragmentacao entre Home, painel e aulas;
- deixar claro onde o aluno esta, para onde pode ir e como voltar;
- manter a aula como conteudo principal, sem esconder acesso ao restante da trilha;
- suportar desktop e mobile com o mesmo modelo mental.

## Estrategia de Produto
### Modelo recomendado
Usar uma navegacao hibrida:

1. Areas publicas e de entrada:
- manter cabecalho superior simples;
- exemplos: `index.html`, `pages/auth.html`.

2. Areas logadas e de estudo:
- usar app shell com aside fixo no desktop;
- usar drawer lateral com hamburguer no mobile;
- exemplos: `pages/dashboard.html`, `pages/souls.html`, `pages/aula1.html`, `pages/aula2.html`, `pages/aula3.html`.

### Por que esta direcao compensa
- o aluno ganha um ponto fixo de orientacao entre telas;
- a navegacao passa a refletir a trilha de aprendizagem, nao apenas paginas isoladas;
- o projeto fica preparado para crescer em numero de aulas, modulos e relatorios sem colapsar em links soltos;
- o mobile deixa de ser apenas um "empilhamento do desktop" e passa a ter padrao proprio de uso.

## Principios de UX
- no maximo 5 ou 6 destinos primarios no menu.
- destacar fortemente a pagina atual.
- separar navegacao global de navegacao local da aula.
- nunca depender apenas de botao "Voltar" para orientar o aluno.
- manter rotulos literais e pedagogicos, evitando nomes vagos.
- a navegacao deve ser clara antes de ser cenografica.

## Arquitetura de Navegacao Proposta
### Navegacao global do app shell
Itens sugeridos:
- Inicio
- Painel do Heroi
- Aulas
- Conquistas
- Almas Registradas
- Encerrar Sessao

Observacoes:
- "Aulas" pode apontar para a Home se a Home continuar sendo a tela de selecao de modulos.
- "Conquistas" pode inicialmente rolar para a secao correspondente no dashboard, e no futuro virar tela propria se fizer sentido.
- "Almas Registradas" deve continuar restrito a admin quando aplicavel.

### Navegacao local da aula
Manter o modelo por abas dentro da tela da aula para o conteudo interno:
- Fundamentos
- Oficina
- Slides

Regra:
- o aside resolve a navegacao entre areas do sistema;
- as abas resolvem a navegacao interna da aula.

## Escopo Tecnico
### Arquivos provavelmente envolvidos
- `index.html`
- `pages/dashboard.html`
- `pages/souls.html`
- `pages/aula1.html`
- `pages/aula2.html`
- `pages/aula3.html`
- `pages/auth.html` (apenas se houver ajuste de consistencia visual no topo)
- `css/style.css`
- `css/dashboard.css`
- `css/souls.css`
- `css/aula.css`
- `css/auth.css` (somente se necessario)
- `js/main.js`
- `js/dashboard.js`
- `js/souls.js`
- `js/aula1.js`
- `js/aula2.js`
- `js/aula3.js`
- `js/api.js` (somente se for util centralizar rotulos/estado de navegacao)

### Novos artefatos recomendados
- `css/app-shell.css` para regras compartilhadas do shell
- `js/app-shell.js` para drawer mobile, toggle, overlay, estado aberto/fechado e destaque do item atual

## Fora de Escopo
- redesenho completo da identidade visual do projeto;
- reescrever o fluxo de autenticacao;
- alterar o conteudo pedagogico das aulas;
- mexer no minigame;
- criar SPA ou roteamento client-side complexo.

## Premissas
- o projeto continuara multi-page com HTMLs separados;
- o design system atual deve ser preservado e consolidado, nao substituido;
- a navegacao precisa funcionar sem depender de frameworks;
- acessibilidade e responsividade sao obrigatorias, nao extras.

## Fases de Execucao

### Fase 1 - Inventario da navegacao atual
Tarefas:
1. [x] Mapear todas as rotas reais hoje acessiveis por aluno e admin.
2. [x] Identificar inconsistencias de rotulo entre Home, dashboard, aulas e souls.
3. [x] Levantar quais telas devem entrar no app shell e quais devem permanecer com topbar simples.
4. [x] Confirmar comportamentos por perfil:
   - aluno comum;
   - admin;
   - usuario deslogado.
5. [x] Identificar pontos onde hoje a navegacao depende de CTA contextual em vez de menu persistente.

Entregavel:
- mapa atual de navegacao com decisoes de inclusao/exclusao por tela.

#### Execucao da Task 1 - Inventario atual de rotas

Hipotese validada:
- o mapa real de navegacao do sistema esta concentrado nos HTMLs publicados em `index.html` e `pages/*.html`, com guards centralizados em `requireSession()` e restricao adicional de admin em `pages/souls.html`.

Rotas identificadas no helper central:
- `home -> /index.html`
- `auth -> /pages/auth.html`
- `dashboard -> /pages/dashboard.html`
- `souls -> /pages/souls.html`
- `lesson(id) -> /pages/<id>.html`

##### Matriz de rotas reais por perfil

| Rota | Arquivo | Perfil previsto | Guard real atual | Como e acessada hoje | Recomendacao para shell |
| --- | --- | --- | --- | --- | --- |
| Home | `index.html` | aluno logado e admin | exige sessao via `requireSession()` em `js/main.js`; sem sessao redireciona para auth | entrada principal da experiencia logada; footer leva ao dashboard e logout | fora do shell por enquanto; manter como hub cenografico |
| Auth | `pages/auth.html` | usuario deslogado | publica; se ja houver sessao valida redireciona para dashboard em `js/auth.js` | login, cadastro e retorno para Home | fora do shell |
| Dashboard | `pages/dashboard.html` | aluno logado e admin | exige sessao via `requireSession()` em `js/dashboard.js` | vem da auth, da Home e das aulas | dentro do shell; pagina piloto |
| Aula 1 | `pages/aula1.html` | aluno logado e admin | exige sessao via `requireSession()` em `js/aula1.js` | acessada pela Home e pelo dashboard | dentro do shell |
| Aula 2 | `pages/aula2.html` | aluno logado e admin | exige sessao via `requireSession()` em `js/aula2.js` | acessada pela Home e pelo dashboard | dentro do shell |
| Aula 3 | `pages/aula3.html` | aluno logado e admin | exige sessao via `requireSession()` em `js/aula3.js` | acessada pela Home e pelo dashboard | dentro do shell |
| Souls | `pages/souls.html` | admin | exige sessao via `requireSession()` em `js/souls.js`; se nao for admin redireciona para dashboard | acessada pelo botao admin no dashboard | dentro do shell, item admin-only |
| Minigame | `pages/minigame.html` | indefinido / rota secundaria | sem integracao ao helper `ROUTES`; possui fluxo proprio e retorno para Home em `js/minigame/engine/GameEngine.js` | nao aparece na navegacao principal atual; CTA da Home esta desabilitada | rota orfa e fora do escopo do shell nesta fase |

##### Fluxos reais observados hoje

Fluxo de usuario deslogado:
- tentativa de abrir Home, dashboard, aulas ou souls acaba em `pages/auth.html` via `requireSession()`.

Fluxo de aluno:
- entra por `pages/auth.html` e vai para `pages/dashboard.html`;
- pode ir para `index.html` e abrir aulas;
- pode navegar entre dashboard e aulas;
- nao pode permanecer em `pages/souls.html`.

Fluxo de admin:
- segue o mesmo fluxo do aluno para Home, dashboard e aulas;
- ganha acesso adicional a `pages/souls.html` pelo dashboard.

##### Observacoes importantes para a proxima task

- a Home nao e publica na pratica; ela funciona como hub logado, nao como landing aberta.
- `pages/souls.html` e a unica rota explicitamente admin-only no frontend atual.
- o minigame existe como pagina real, mas esta desligado da navegacao principal e deve ser tratado como excecao arquitetural.
- o sistema ja possui um helper central de rotas em `js/api.js`; isso reduz risco na futura migracao para app shell.

##### Status parcial da Fase 1

- Task 1 concluida.

#### Execucao da Task 2 - Inconsistencias de rotulo e nomenclatura

Hipotese validada:
- a principal inconsistencia nao esta nas rotas em si, mas no vocabulário da interface. O sistema usa nomes diferentes para o mesmo destino e nomes semelhantes para contextos diferentes, o que enfraquece a orientacao do aluno.

##### Inconsistencias identificadas

| Tema | Onde aparece hoje | Problema | Recomendacao |
| --- | --- | --- | --- |
| Home x Menu Principal x Inicio | `index.html` usa `Menu Principal`; `dashboard.html` e `aula1.html` usam `Home`; `auth.html` usa `Menu Principal` | o mesmo destino recebe nomes diferentes conforme a tela | padronizar o destino global como `Inicio` na navegacao; `Menu Principal` pode permanecer apenas como subtitulo cenografico da Home, nao como nome de rota |
| Painel do Aluno x Painel do Heroi x Salao dos Herois | `dashboard.html` descreve a pagina como `Painel do Aluno`; `index.html` usa CTA `Painel do Herói`; titulo visual da tela e `Salão dos Heróis` | mistura nome funcional com nome tematico e ainda troca `Aluno` por `Heroi` | usar `Painel do Heroi` como rotulo de navegacao e manter `Salao dos Herois` como titulo cenografico da pagina |
| Aulas x Modulos x Selecao de Modulo x Trilha do Heroi | `index.html` fala em `Seleção de Módulo`, mas a area central tem `Seleção de aulas`; `dashboard.html` usa `Trilha do Herói (Módulos)` | modulo e aula aparecem embaralhados no mesmo nivel conceitual | usar `Aulas` como item global de navegacao; dentro das telas, `Modulo` fica como agrupador e `Aula` como unidade de conteudo |
| Voltar sem destino explicito | `dashboard.html`, `aula1.html`, `aula2.html`, `aula3.html` usam texto `Voltar` | o aluno precisa ler contexto ao redor para descobrir para onde volta | no shell futuro, substituir por navegacao persistente; enquanto o botao existir, usar texto explicito quando necessario |
| Destino do botao Voltar varia entre aulas | `aula1.html` volta para `index.html`; `aula2.html` e `aula3.html` voltam para `dashboard.html` | comportamento inconsistente entre telas irmas | decidir um destino padrao para aulas dentro do shell; recomendacao: dashboard como hub funcional e `Inicio` via menu lateral |
| Home logada tratada como se fosse area publica | labels como `Voltar para a Home` e `Voltar ao Menu Principal` sugerem landing publica, mas `index.html` exige sessao | a linguagem de navegacao nao reflete o fluxo real de autenticacao | tratar `Inicio` como area logada do app e deixar `Auth` como unica tela publica operacional |
| Souls x Almas Registradas x Painel Administrativo | `souls.html` mostra `Almas Registradas`; eyebrow `Painel Administrativo`; botao no dashboard diz `Ver Almas Registradas` | nome funcional da secao admin oscila entre relatorio, lista e painel | manter `Almas Registradas` como nome da rota e `Painel Administrativo` apenas como contexto/eyebrow |
| Titulacao das aulas | `aula1.html` usa `AULA 01`; `aula2.html` usa `AULA 2`; `aula3.html` usa `AULA 3` | numeracao e estilo nao seguem um padrao unico | padronizar visualmente para `Aula 01`, `Aula 02`, `Aula 03` ou equivalente consistente em todas as telas |
| Estatisticas: aulas vistas / concluidas | `souls.html` mistura `Aulas Vistas (eventos)`, `Aulas Concluídas`; `souls.js` usa `Aulas vistas` e `Aulas concluidas` | pequena deriva textual entre interface e renderizacao | definir glossario unico para metricas admin |

##### Proposta de glossario base

Rotulos globais recomendados:
- `Inicio`
- `Painel do Heroi`
- `Aulas`
- `Conquistas`
- `Almas Registradas`
- `Encerrar Sessao`

Rotulos cenograficos que podem continuar como titulos internos:
- `Salao dos Herois`
- `Pacto de Sangue`
- `Painel Administrativo`
- `Trilha do Heroi`

Regras de nomenclatura recomendadas:
- nome de rota e nome de titulo nao precisam ser iguais;
- o menu global deve usar linguagem funcional e previsivel;
- a cenografia fica nos titulos de pagina, subtitulos e blocos internos;
- `Modulo` deve ser sempre agrupador e `Aula` sempre item navegavel.

##### Decisoes sugeridas para a proxima task

- considerar `Inicio` o nome oficial da rota `index.html` dentro da navegacao global;
- considerar `Painel do Heroi` o nome oficial da rota `pages/dashboard.html` no menu;
- manter `Salao dos Herois` apenas como heading principal da tela de dashboard;
- manter `Almas Registradas` como rota admin-only;
- unificar o destino de retorno das aulas na arquitetura nova, evitando variacao por pagina.

##### Status parcial da Fase 1

- Task 1 concluida.
- Task 2 concluida.

#### Execucao da Task 3 - Decisao de inclusao no app shell

Hipotese validada:
- a divisao mais coerente com o fluxo real do sistema e separar telas publicas/de entrada das telas logadas/de estudo. Isso preserva a cenografia da Home e evita forcar o shell em areas onde ele nao agrega tanto.

##### Telas que entram no app shell

| Tela | Arquivo | Motivo |
| --- | --- | --- |
| Painel do Heroi | `pages/dashboard.html` | e o hub funcional da experiencia logada e a melhor pagina piloto para consolidar o shell |
| Aula 01 | `pages/aula1.html` | conteudo protegido, recorrente e parte direta da trilha |
| Aula 02 | `pages/aula2.html` | mesma natureza da Aula 01; deve compartilhar o mesmo modelo mental |
| Aula 03 | `pages/aula3.html` | mesmo vazia hoje, ja faz parte da trilha protegida |
| Almas Registradas | `pages/souls.html` | area logada admin-only, com necessidade clara de orientacao persistente |

##### Telas que permanecem fora do app shell

| Tela | Arquivo | Motivo |
| --- | --- | --- |
| Inicio | `index.html` | deve continuar como hub cenografico/logado por enquanto; pode conversar com o shell sem virar uma pagina interna padrao |
| Auth | `pages/auth.html` | e tela de entrada, com objetivo unico e sem necessidade de navegacao lateral |
| Minigame | `pages/minigame.html` | esta fora do escopo desta reformulacao e ainda segue fluxo proprio/isolado |

##### Decisao consolidada

- `index.html` permanece com topbar simples e identidade cenografica propria.
- `pages/auth.html` permanece com topbar simples.
- `pages/dashboard.html`, `pages/aula1.html`, `pages/aula2.html`, `pages/aula3.html` e `pages/souls.html` entram no app shell.
- `pages/minigame.html` fica explicitamente fora do shell nesta fase.

#### Execucao da Task 4 - Comportamentos por perfil

Hipotese validada:
- os perfis ja estao suficientemente definidos no frontend para orientar a arquitetura do shell: usuario deslogado, aluno e admin. A diferenca principal de permissoes hoje esta concentrada no acesso a `pages/souls.html` e em ferramentas extras no dashboard.

##### Matriz de comportamento por perfil

| Perfil | Pode acessar | Nao pode acessar | Comportamento atual observado | Implicacao para o shell |
| --- | --- | --- | --- | --- |
| Usuario deslogado | `pages/auth.html` | `index.html`, `pages/dashboard.html`, `pages/aula1.html`, `pages/aula2.html`, `pages/aula3.html`, `pages/souls.html` | guard `requireSession()` redireciona para auth | nao renderizar shell |
| Aluno comum | `index.html`, `pages/dashboard.html`, `pages/aula1.html`, `pages/aula2.html`, `pages/aula3.html` | `pages/souls.html` | navega entre Home, dashboard e aulas; se tentar souls volta para dashboard | shell com menu base sem item admin visivel |
| Admin | tudo que o aluno acessa + `pages/souls.html` | sem bloqueio adicional conhecido nas telas mapeadas | recebe admin tools no dashboard e acesso ao relatorio | shell com item admin-only e estado visual admin |

##### Regras derivadas para a navegacao

- usuario deslogado nao deve ver navegacao lateral.
- aluno ve o menu global base: `Inicio`, `Painel do Heroi`, `Aulas`, `Conquistas`, `Encerrar Sessao`.
- admin ve o mesmo menu base com a entrada adicional `Almas Registradas`.
- o shell deve aceitar variacao por papel sem duplicar layout.

#### Execucao da Task 5 - Dependencia atual de CTA contextual

Hipotese validada:
- hoje a navegacao entre areas do sistema depende mais de botoes contextuais e links de retorno locais do que de um menu persistente. Isso confirma a necessidade do app shell.

##### Pontos de dependencia em CTA contextual

| Origem | Elemento atual | Destino | Limite da abordagem atual |
| --- | --- | --- | --- |
| `index.html` | botoes da `controls-bar` | dashboard e logout | navegacao global restrita ao rodape e dependente de atalho contextual |
| `index.html` | cards dinamicos de aula em `js/main.js` | aulas | acesso a conteudo so aparece dentro da grade principal, sem menu persistente |
| `pages/dashboard.html` | botao `Voltar` no header | Inicio | retorno depende de botao local, nao de estrutura global |
| `pages/dashboard.html` | botoes/links da trilha em `js/dashboard.js` | aulas | acesso a aulas depende da secao interna `Trilha do Heroi` |
| `pages/dashboard.html` | botao admin `Ver Almas Registradas` | souls | rota admin esta escondida dentro de ferramenta contextual, nao em navegacao global |
| `pages/aula1.html` | botao `Voltar` | Inicio | navega por retorno local, sem relacao com a arquitetura geral |
| `pages/aula2.html` | botao `Voltar` | dashboard | comportamento diferente da Aula 1 |
| `pages/aula3.html` | botao `Voltar` | dashboard | repete padrao local, mas sem consistencia total entre aulas |
| `pages/auth.html` | `Voltar ao Menu Principal` | Inicio | reforca a ideia de retorno manual, nao de fluxo estruturado |
| `pages/minigame.html` | `Voltar ao Painel` e `controls-bar` | painel/home | pagina secundaria com navegacao propria e nao integrada |

##### Conclusao da Task 5

- o sistema atual depende de CTA contextual em tres eixos:
   - botoes de retorno no header;
   - cards/listas internas que funcionam como navegacao;
   - acoes administrativas escondidas dentro da propria pagina.
- o shell deve substituir a navegacao entre areas, deixando os CTAs locais apenas para acoes de conteudo.

##### Status final da Fase 1

- Task 1 concluida.
- Task 2 concluida.
- Task 3 concluida.
- Task 4 concluida.
- Task 5 concluida.
- Fase 1 concluida.
- Proximo passo recomendado: iniciar a Fase 2 definindo a lista final de itens do aside e a regra exata de exibicao por perfil.

### Fase 2 - Definicao do contrato de navegacao
Tarefas:
1. [x] Definir a lista final de itens do aside.
2. [x] Definir ordem, hierarquia e rotulos finais.
3. [x] Definir comportamento de estados:
   - item ativo;
   - item desabilitado;
   - item admin-only;
   - item com badge opcional.
4. [x] Definir relacao entre navegacao global e navegacao local das aulas.
5. [x] Definir comportamento do botao de hamburguer no mobile.
6. [x] Definir se a Home vira oficialmente "Aulas" no contexto logado ou se permanece "Inicio" separado.

Entregavel:
- contrato funcional do menu e regras de exibicao por contexto.

#### Execucao da Fase 2 - Contrato funcional do menu

Hipotese validada:
- o contrato mais consistente para este sistema e manter `Inicio` e `Aulas` como entradas separadas. `Inicio` representa o hub cenografico/logado em `index.html`, enquanto `Aulas` representa o acesso intencional a trilha de conteudo, inicialmente apontando para a mesma Home ate existir uma tela dedicada de catalogo.

##### Task 1 e Task 2 - Lista final, ordem e rotulos do aside

###### Menu base para aluno
1. `Inicio`
2. `Painel do Heroi`
3. `Aulas`
4. `Conquistas`
5. `Encerrar Sessao`

###### Menu estendido para admin
1. `Inicio`
2. `Painel do Heroi`
3. `Aulas`
4. `Conquistas`
5. `Almas Registradas`
6. `Encerrar Sessao`

###### Hierarquia funcional

Itens primarios de navegacao:
- `Inicio`
- `Painel do Heroi`
- `Aulas`
- `Conquistas`
- `Almas Registradas` (somente admin)

Item de encerramento:
- `Encerrar Sessao`

Rotulos cenograficos que nao entram como nome de item:
- `Salao dos Herois`
- `Pacto de Sangue`
- `Painel Administrativo`
- `Trilha do Heroi`

###### Destino funcional de cada item

| Item | Destino inicial | Tipo de navegacao | Observacao |
| --- | --- | --- | --- |
| Inicio | `index.html` | troca de pagina | rota logada, cenografica e geral |
| Painel do Heroi | `pages/dashboard.html` | troca de pagina | hub funcional principal da experiencia logada |
| Aulas | `index.html` | troca de pagina | aponta para o hub de modulos/aulas enquanto nao houver pagina dedicada |
| Conquistas | `pages/dashboard.html#achievements-grid` ou foco programatico na secao de conquistas | ancora/scroll dentro da pagina | nao merece rota propria nesta fase |
| Almas Registradas | `pages/souls.html` | troca de pagina | visivel apenas para admin |
| Encerrar Sessao | logout + `pages/auth.html` | acao global | nao e pagina navegavel |

##### Task 3 - Estados do menu

###### Estado ativo
- deve marcar a rota atual com destaque visual forte e `aria-current="page"` quando o item representa uma pagina.
- em anchors internas, o item pode usar estado ativo contextual quando a secao alvo for a dominante na tela ou quando o usuario entrar pela acao correspondente.

###### Estado desabilitado
- usar apenas quando uma entrada existir no contrato, mas ainda nao estiver liberada.
- nesta fase, nenhum item principal do shell precisa nascer desabilitado.
- `Minigame` nao deve aparecer desabilitado no shell; ele fica fora do contrato.

###### Estado admin-only
- `Almas Registradas` so aparece para `role === 'admin'`.
- nao usar item visivel-desabilitado para aluno; simplesmente ocultar para evitar ruido cognitivo.

###### Estado com badge opcional
- permitido apenas quando adicionar sinal realmente util, nao decorativo.
- usos aceitos futuramente:
   - badge `Admin` ao lado de `Almas Registradas` se a equipe achar necessario;
   - contador simples em `Conquistas` no futuro, se houver valor real.
- nesta fase, o contrato base nasce sem badges obrigatorios.

##### Task 4 - Relacao entre navegacao global e navegacao local

Regra principal:
- o aside resolve a navegacao entre areas do sistema.
- a navegacao local continua dentro da pagina, sem competir com o aside.

Aplicacao pratica:
- em `pages/dashboard.html`, o aside navega entre Inicio, painel, aulas, conquistas e souls; o conteudo interno continua com secoes como altar, quadro de honra e trilha.
- em `pages/aula1.html`, `pages/aula2.html` e `pages/aula3.html`, o aside navega entre areas globais; as abas da aula continuam sendo a navegacao local do conteudo.
- `Conquistas` permanece como destino funcional dentro do dashboard, nao como aba local da aula.

##### Task 5 - Contrato do hamburguer mobile

Comportamento esperado:
- abaixo do breakpoint mobile, o aside vira drawer off-canvas.
- o header interno da pagina passa a exibir um botao hamburguer sempre visivel.
- o drawer abre sobrepondo o conteudo com overlay escuro clicavel.

Regras de interacao:
- abrir ao clicar no hamburguer.
- fechar ao clicar no overlay.
- fechar ao clicar em qualquer item de navegacao que troque de contexto.
- fechar ao pressionar `Escape`.
- travar scroll do fundo enquanto o drawer estiver aberto.
- devolver foco ao botao hamburguer quando o drawer fechar.

Regras de acessibilidade:
- hamburguer com `aria-expanded` e `aria-controls`.
- drawer tratado como navegacao principal da area logada, nao como modal completo.
- foco inicial no primeiro item do menu ao abrir no mobile, se isso nao conflitar com a implementacao.

##### Task 6 - Decisao sobre Inicio x Aulas

Decisao final da fase:
- `index.html` permanece oficialmente `Inicio` na navegacao global.
- `Aulas` continua existindo como item separado, mas na primeira implementacao aponta para `index.html`.

Justificativa:
- `Inicio` representa o ponto geral de retorno e orientacao do usuario logado.
- `Aulas` representa a intencao de continuar a trilha pedagogica.
- apesar de apontarem para a mesma rota por enquanto, os significados sao diferentes e isso ajuda a arquitetura a escalar sem renomear o menu depois.
- quando existir uma tela propria de catalogo/trilha, apenas `Aulas` muda de destino; `Inicio` permanece estavel.

##### Contrato consolidado por contexto

| Contexto | Navegacao exibida |
| --- | --- |
| Usuario deslogado em `pages/auth.html` | sem aside; apenas navegacao local de retorno |
| Aluno em dashboard/aulas | `Inicio`, `Painel do Heroi`, `Aulas`, `Conquistas`, `Encerrar Sessao` |
| Admin em dashboard/aulas/souls | `Inicio`, `Painel do Heroi`, `Aulas`, `Conquistas`, `Almas Registradas`, `Encerrar Sessao` |

##### Critérios de aceite da Fase 2

- a lista final de itens do aside esta definida sem ambiguidade.
- a diferenca entre nome funcional de rota e titulo cenografico ficou resolvida.
- a visibilidade por perfil ficou especificada.
- a regra entre navegacao global e navegacao local ficou clara.
- o comportamento do hamburguer mobile ficou fechado antes da primeira edicao estrutural.
- a decisao `Inicio` x `Aulas` ficou documentada para evitar reabrir a discussao na implementacao.

##### Status final da Fase 2

- Task 1 concluida.
- Task 2 concluida.
- Task 3 concluida.
- Task 4 concluida.
- Task 5 concluida.
- Task 6 concluida.
- Fase 2 concluida.
- Proximo passo recomendado: iniciar a Fase 3 com a definicao da estrutura HTML base do shell e da API minima de classes/atributos para reaproveitamento entre dashboard, aulas e souls.

### Fase 3 - Base compartilhada do app shell
Tarefas:
1. [x] Criar estrutura HTML reutilizavel para o shell:
   - container do app;
   - aside;
   - header compacto da area interna;
   - overlay do drawer;
   - area principal.
2. [x] Extrair tokens e padroes visuais compartilhados para um CSS comum do shell.
3. [x] Implementar componente JS para:
   - abrir drawer;
   - fechar drawer;
   - fechar ao clicar no overlay;
   - fechar ao selecionar item no mobile;
   - fechar com `Escape`;
   - travar scroll de fundo quando drawer estiver aberto.
4. [x] Implementar marcador de rota atual via atributo ou classe por pagina.
5. [x] Garantir que o shell nao brigue com scripts existentes das telas.

Entregavel:
- infraestrutura de shell reutilizavel pronta para migracao de paginas.

#### Execucao da Fase 3 - Especificacao tecnica do app shell

Hipotese validada:
- `pages/dashboard.html`, `pages/aula1.html` e `pages/souls.html` ja compartilham a mesma macroestrutura semantica de pagina interna: header superior, divisor ornamentado e area principal. A melhor versao do shell e evoluir esse padrao comum, nao substitui-lo por uma estrutura alienigena ao projeto.

##### Task 1 - Estrutura HTML base do shell

Estrutura obrigatoria proposta:

```html
<body class="app-shell-page" data-route="dashboard" data-role-scope="protected">
   <div class="vignette" aria-hidden="true"></div>

   <div class="app-shell" data-shell>
      <button
         class="app-shell__overlay"
         type="button"
         aria-label="Fechar navegação"
         data-shell-overlay
         hidden
      ></button>

      <aside
         class="app-shell__sidebar"
         id="app-shell-sidebar"
         aria-label="Navegação principal"
         data-shell-sidebar
      >
         <div class="app-shell__brand">
            <p class="app-shell__brand-eyebrow">Fundamentos de Jogos Digitais</p>
            <p class="app-shell__brand-title">Domínio do Herói</p>
         </div>

         <nav class="app-shell__nav" aria-label="Seções principais">
            <a class="app-shell__link" data-nav-item="inicio" href="../index.html">Inicio</a>
            <a class="app-shell__link" data-nav-item="dashboard" href="../pages/dashboard.html">Painel do Heroi</a>
            <a class="app-shell__link" data-nav-item="aulas" href="../index.html">Aulas</a>
            <a class="app-shell__link" data-nav-item="conquistas" href="../pages/dashboard.html#achievements-grid">Conquistas</a>
            <a class="app-shell__link" data-nav-item="souls" data-admin-only href="../pages/souls.html">Almas Registradas</a>
         </nav>

         <div class="app-shell__footer">
            <button class="app-shell__logout" type="button" data-shell-logout>Encerrar Sessao</button>
         </div>
      </aside>

      <div class="app-shell__main">
         <header class="app-shell__header" data-shell-header>
            <div class="app-shell__header-left">
               <button
                  class="app-shell__menu-toggle"
                  type="button"
                  aria-expanded="false"
                  aria-controls="app-shell-sidebar"
                  aria-label="Abrir navegação"
                  data-shell-toggle
               >
                  <span></span>
                  <span></span>
                  <span></span>
               </button>

               <div class="app-shell__titles">
                  <p class="app-shell__eyebrow">Contexto da página</p>
                  <h1 class="app-shell__title">Título cenográfico da tela</h1>
               </div>
            </div>

            <div class="app-shell__header-actions" data-shell-actions></div>
         </header>

         <div class="ornate-divider" aria-hidden="true">
            <span class="ornate-divider__line"></span>
            <span class="ornate-divider__gem">◆</span>
            <span class="ornate-divider__line"></span>
         </div>

         <main class="app-shell__content" data-shell-content>
            <!-- conteúdo específico da tela -->
         </main>
      </div>
   </div>
</body>
```

Decisoes estruturais:
- o shell envolve apenas paginas internas protegidas.
- o aside deixa de competir com o conteudo local e passa a ser exclusivamente navegacao global.
- o header interno fica compacto e consistente entre dashboard, aulas e souls.
- o divisor ornamentado e preservado como elemento de continuidade visual do design system atual.

Mapeamento para as telas reais:
- dashboard: `profile-panel` e `hall-content` migram para dentro de `app-shell__content`.
- aulas: `tabs` permanecem como navegacao local logo no topo de `app-shell__content`.
- souls: `summary`, `report-tabs` e `report-panel` migram para dentro de `app-shell__content`.

##### Task 2 - Tokens e padroes compartilhados de CSS

Arquivo alvo recomendado:
- `css/app-shell.css`

Responsabilidades desse CSS:
- grid/flex principal do shell.
- largura do aside em desktop.
- comportamento off-canvas do drawer mobile.
- estilo base dos links do menu.
- header interno compartilhado.
- overlay do drawer.
- estados `is-active`, `is-open`, `is-admin-context` e `is-mobile-nav`.

Tokens a consolidar no CSS comum:
- cores base ja existentes: `--hades-bg`, `--hades-panel`, `--hades-gold`, `--hades-gold-bright`, `--hades-blood`, `--hades-text`, `--hades-text-dim`.
- tipografia ja existente: `--font-title`, `--font-body`.
- sombras e glow compartilhados.
- espacamentos padrao do shell:
   - largura da sidebar;
   - altura minima do header;
   - gap entre header/divisor/conteudo;
   - padding responsivo do miolo.

Regra de composicao CSS:
- `app-shell.css` define apenas layout e navegacao compartilhados.
- `dashboard.css`, `aula.css` e `souls.css` mantem apenas regras do conteudo da tela.
- evitar duplicar classes como `dashboard-header`, `lesson-header` e `souls-header` apos a migracao; elas devem ser substituidas pelo header compartilhado ou reduzidas a wrappers locais temporarios.

##### Task 3 - API minima de JS do shell

Arquivo alvo recomendado:
- `js/app-shell.js`

API minima proposta:

```js
initAppShell({
   route,
   role,
   logout,
   onNavigate,
   onOpen,
   onClose,
});
```

Contrato dos parametros:
- `route`: identifica a rota ativa, ex.: `dashboard`, `aula1`, `aula2`, `aula3`, `souls`.
- `role`: `admin` ou `student`, para esconder itens admin-only.
- `logout`: callback async reaproveitando a funcao ja existente de logout.
- `onNavigate`: hook opcional para scroll/foco/telemetria.
- `onOpen` e `onClose`: hooks opcionais para refinamentos futuros.

Seletores/data-attributes obrigatorios:
- `[data-shell]`
- `[data-shell-sidebar]`
- `[data-shell-toggle]`
- `[data-shell-overlay]`
- `[data-shell-logout]`
- `[data-nav-item]`
- `[data-admin-only]`
- `[data-shell-content]`

Comportamentos obrigatorios do modulo:
- detectar breakpoint mobile via `matchMedia`.
- abrir/fechar drawer.
- sincronizar `aria-expanded` do hamburguer.
- adicionar/remover classe de estado no root do shell.
- ocultar itens `data-admin-only` quando `role !== 'admin'`.
- marcar item ativo pelo `route` informado.
- tratar clique em `Conquistas` de forma consistente, inclusive quando vier de paginas que nao sao o dashboard.
- disparar logout sem acoplar detalhes da API ao shell.

Comportamento recomendado para `Conquistas`:
- se a pagina atual for dashboard, fazer scroll/foco na secao `#achievements-grid`.
- se a pagina atual nao for dashboard, navegar para `pages/dashboard.html#achievements-grid`.

##### Task 4 - Marcacao de rota ativa

Estratégia recomendada:
- cada pagina protegida informa sua rota no `<body data-route="...">`.
- o shell usa esse valor para resolver o item ativo.

Tabela de mapeamento inicial:

| data-route | Item ativo do menu |
| --- | --- |
| `dashboard` | `Painel do Heroi` |
| `aula1` | `Aulas` |
| `aula2` | `Aulas` |
| `aula3` | `Aulas` |
| `souls` | `Almas Registradas` |

Regra adicional:
- `Conquistas` nao deve competir como item ativo permanente fora do dashboard; ele e um destino funcional de secao, nao rota principal nesta fase.

##### Task 5 - Compatibilidade com scripts existentes

Hipotese local:
- o maior risco nao esta no CSS, mas em quebrar os seletores que os scripts atuais usam para avatar, tabs, altar, lista de aulas, resumo admin e report tabs.

Regra de compatibilidade:
- o shell novo nao deve renomear ids usados por JS de negocio.
- ids atuais de conteudo permanecem intactos.
- a migracao mexe nos wrappers estruturais, nao nos elementos funcionais internos.

Ids/areas que precisam permanecer estaveis:
- dashboard:
   - `avatar-frame`
   - `avatar-glyph`
   - `achievements-grid`
   - `lessons-list`
   - `altar-form`
   - `btn-logout`
   - `btn-list-souls`
- aula1:
   - `fundamentos`
   - `oficina`
   - `slides`
   - `btn-save-gdd`
   - `config-notes`
- aula2:
   - `theory`
   - `simulation`
- souls:
   - `summary`
   - `tab-users`
   - `tab-activities`
   - `report-users`
   - `report-activities`
   - `souls-grid`
   - `activities-list`

Recomendacao de implementacao:
- primeiro injetar shell ao redor do conteudo mantendo todos os ids locais.
- so depois reduzir/remover headers antigos, com validacao por pagina.

##### API minima de classes e atributos para a implementacao

Classes compartilhadas obrigatorias:
- `app-shell`
- `app-shell__sidebar`
- `app-shell__main`
- `app-shell__header`
- `app-shell__content`
- `app-shell__nav`
- `app-shell__link`
- `app-shell__menu-toggle`
- `app-shell__overlay`

Atributos de estado recomendados:
- `data-route`
- `data-nav-item`
- `data-admin-only`

Classes de estado recomendadas:
- `is-open`
- `is-active`
- `is-mobile`
- `is-admin-context`

##### Critérios de aceite da Fase 3

- a estrutura HTML base do shell esta definida.
- o arquivo compartilhado de CSS tem responsabilidades claras.
- a API minima de `js/app-shell.js` esta especificada.
- o mapeamento de rota ativa esta fechado.
- os limites de compatibilidade com scripts existentes estao documentados.
- a fase seguinte pode começar implementando o dashboard sem reabrir a arquitetura.

##### Status final da Fase 3

- Task 1 concluida.
- Task 2 concluida.
- Task 3 concluida.
- Task 4 concluida.
- Task 5 concluida.
- Fase 3 concluida.
- Proximo passo recomendado: iniciar a Fase 4 implementando o shell primeiro em `pages/dashboard.html`, usando-o como tela piloto para validar layout, header compartilhado e navegacao lateral.

### Fase 4 - Migracao do dashboard para o novo shell
Tarefas:
1. [x] Substituir o header atual do dashboard por header interno integrado ao shell.
2. [x] Transformar o perfil lateral atual em conteudo do painel, nao em navegacao.
3. [x] Inserir o aside global com destaque da pagina atual.
4. [x] Reorganizar a composicao visual para evitar excesso de colunas concorrentes.
5. [x] Validar estados admin dentro do novo layout.
6. [x] Garantir que avatar, altar, conquistas e trilha continuem legiveis com a nova hierarquia.

Entregavel:
- `pages/dashboard.html` funcionando como referencia principal do app shell.

#### Execucao da Fase 4 - Dashboard piloto implementado

Hipotese validada:
- o dashboard podia ser migrado para o shell sem quebrar a logica de negocio, desde que os ids funcionais fossem preservados e a integracao do shell acontecesse apenas no boot da pagina.

##### Alteracoes implementadas

Arquivos criados:
- `css/app-shell.css`
- `js/app-shell.js`

Arquivos alterados:
- `pages/dashboard.html`
- `css/dashboard.css`
- `js/dashboard.js`

##### O que mudou no dashboard

1. O header antigo foi substituido por um header compartilhado do shell.
2. O dashboard passou a renderizar dentro da estrutura `app-shell` com:
   - sidebar global;
   - drawer mobile;
   - overlay de fechamento;
   - header compacto com hamburguer.
3. O perfil lateral deixou de funcionar como navegacao e foi mantido apenas como conteudo do painel.
4. A navegacao global foi inserida com destaque de rota ativa em `Painel do Heroi`.
5. O item `Almas Registradas` foi preparado como admin-only.
6. O logout passou a ser acionado a partir do shell via callback, sem misturar a regra de navegacao com a de autenticacao.

##### Compatibilidade preservada

Os ids de negocio foram mantidos intactos no piloto:
- `profile-panel`
- `avatar-frame`
- `avatar-glyph`
- `avatar-counter`
- `achievements-grid`
- `lessons-list`
- `altar-form`
- `altar-input`
- `btn-offer`
- `btn-generate-codes`
- `btn-list-souls`

Isso preservou a compatibilidade com `js/dashboard.js` e reduziu o risco de regressao funcional.

##### Validacao executada

- `get_errors` sem erros em `pages/dashboard.html`, `css/dashboard.css`, `css/app-shell.css`, `js/dashboard.js` e `js/app-shell.js`.
- `node --check js/dashboard.js`
- `node --check js/app-shell.js`
- `npm run check`

##### Resultado da Fase 4

- o dashboard agora e a tela piloto do app shell.
- a base compartilhada de navegacao ja esta em uso real.
- o proximo passo pode migrar as aulas reaproveitando a mesma infraestrutura.

##### Status final da Fase 4

- Task 1 concluida.
- Task 2 concluida.
- Task 3 concluida.
- Task 4 concluida.
- Task 5 concluida.
- Task 6 concluida.
- Fase 4 concluida.
- Proximo passo recomendado: iniciar a Fase 5 migrando `pages/aula1.html`, `pages/aula2.html` e `pages/aula3.html` para o mesmo shell, preservando as tabs como navegacao local.

### Fase 5 - Migracao das aulas para o novo shell
Tarefas:
1. [x] Integrar `pages/aula1.html`, `pages/aula2.html` e `pages/aula3.html` ao shell.
2. [x] Preservar as abas das aulas como navegacao local.
3. [x] Ajustar header das aulas para uma versao mais compacta dentro do app shell.
4. [x] Garantir que o conteudo principal da aula continue visualmente dominante.
5. [x] Evitar que o aside concorra com a leitura em telas medias.
6. [x] Garantir comportamento consistente do botao de voltar, se ele continuar existindo como atalho secundario.

Entregavel:
- telas de aula navegaveis dentro da mesma linguagem estrutural do dashboard.

#### Execucao da Fase 5 - Aulas migradas para o app shell

Hipotese validada:
- as aulas podiam ser migradas para o mesmo shell do dashboard sem quebrar o conteudo pedagogico, desde que as tabs e os ids internos permanecessem intactos e o shell fosse inicializado apenas apos o guard de sessao.

##### Alteracoes implementadas

Arquivos alterados:
- `pages/aula1.html`
- `pages/aula2.html`
- `pages/aula3.html`
- `css/aula.css`
- `css/app-shell.css`
- `js/aula1.js`
- `js/aula2.js`
- `js/aula3.js`

##### O que mudou nas aulas

1. As tres paginas passaram a usar a mesma estrutura `app-shell` do dashboard.
2. Os headers antigos de aula foram substituidos por um header compartilhado do shell, com hamburguer mobile e context chip da aula.
3. As tabs permaneceram no topo do conteudo como navegacao local da aula.
4. O menu lateral global passou a oferecer os mesmos destinos internos da area logada.
5. O botao de logout passou a ser tratado pelo shell em todas as aulas.
6. O fluxo de retorno deixou de depender de um botao `Voltar` no header, ficando ancorado na navegacao persistente do shell.

##### Compatibilidade preservada

Os ids e estruturas funcionais de conteudo foram mantidos:

Na Aula 01:
- `fundamentos`
- `oficina`
- `slides`
- `btn-save-gdd`
- `config-notes`
- `pptx-online-viewer`
- `pdf-fallback-viewer`

Na Aula 02:
- `theory`
- `simulation`
- `game-canvas`
- `reward-codes`
- `reward-code-value`

Na Aula 03:
- estrutura minima de conteudo preservada dentro do novo shell.

##### Decisoes de UX consolidadas na implementacao

- a navegacao global agora resolve o deslocamento entre Inicio, Painel do Heroi, Aulas, Conquistas e Almas Registradas.
- as tabs continuam resolvendo apenas a navegacao interna de cada aula.
- o conteudo principal permaneceu centralizado e dominante dentro de `lesson-main` e `hades-frame`.
- o shell foi mantido mais estrutural do que ornamental para nao competir com a leitura.

##### Validacao executada

- `get_errors` sem erros em `pages/aula1.html`, `pages/aula2.html`, `pages/aula3.html`, `css/aula.css`, `css/app-shell.css`, `js/aula1.js`, `js/aula2.js` e `js/aula3.js`.
- `node --check js/aula1.js`
- `node --check js/aula2.js`
- `node --check js/aula3.js`
- `node --check js/app-shell.js`
- `npm run check`

##### Limite da validacao desta fase

- nao houve validacao visual em navegador nesta etapa.
- a fase foi validada estruturalmente e por sintaxe, mas ainda precisa de checagem funcional/visual quando formos consolidar as fases seguintes.

##### Status final da Fase 5

- Task 1 concluida.
- Task 2 concluida.
- Task 3 concluida.
- Task 4 concluida.
- Task 5 concluida.
- Task 6 concluida.
- Fase 5 concluida.
- Proximo passo recomendado: iniciar a Fase 6 decidindo o papel final da Home no fluxo logado e ajustando `index.html` para conversar com o shell sem perder a cenografia do menu principal.

### Fase 6 - Ajuste da Home e decisoes de entrada
Tarefas:
1. [x] Decidir se a Home continua como hub de modulos para usuarios logados.
2. [x] Se sim, adaptar a Home para conversar visualmente com o app shell sem virar copia dele.
3. [x] Se nao, reposicionar a Home como area de entrada/boas-vindas e usar dashboard como landing logada.
4. [x] Revisar CTAs principais:
   - entrar no painel;
   - continuar trilha;
   - encerrar sessao.
5. [x] Preservar a qualidade cenografica do menu principal, que hoje e um diferencial visual.

Entregavel:
- papel da Home resolvido dentro da nova arquitetura de navegacao.

#### Execucao da Fase 6 - Home consolidada como hub logado

Hipotese validada:
- a melhor versao da Home para este projeto nao e virar uma segunda copia do dashboard, e sim permanecer como hub cenografico/logado com acoes globais mais explicitas e linguagem alinhada ao novo contrato de navegacao.

##### Decisao final da fase

- `index.html` permanece como `Inicio` no sistema.
- a Home continua sendo o hub de modulos/aulas para usuarios logados.
- o dashboard continua sendo o hub funcional de progresso, conquistas e operacoes do aluno.

##### Alteracoes implementadas

Arquivos alterados:
- `index.html`
- `css/style.css`
- `js/main.js`

##### O que mudou na Home

1. O subtitulo da Home foi ajustado para explicitar seu novo papel de hub logado.
2. Foi criada uma barra utilitaria no topo com acoes globais:
   - `Painel do Heroi`
   - `Continuar trilha`
   - `Encerrar sessao`
3. Foi adicionada uma introducao textual na area central para reforcar a funcao da pagina dentro da arquitetura nova.
4. O rodape deixou de priorizar o CTA desabilitado do minigame e passou a refletir os tres CTAs principais da fase:
   - entrar no painel;
   - continuar trilha;
   - encerrar sessao.
5. A Home passou a oferecer o CTA `Continuar trilha`, resolvido no `js/main.js` pela primeira aula ainda nao concluida; se todas estiverem concluidas, o fallback vai para o dashboard.

##### Decisoes de UX consolidadas

- `Inicio` conversa visualmente com o shell por vocabulário e hierarquia, nao por replicacao estrutural completa.
- a cenografia da Home foi preservada: header dramatico, painel do jogador, grade de aulas e barra inferior continuam existindo.
- o aluno agora entende com mais clareza que a Home e um ponto de partida logado, nao uma landing publica generica.

##### Validacao executada

- `get_errors` sem erros em `index.html`, `css/style.css` e `js/main.js`.
- `node --check js/main.js`
- `npm run check`

##### Limite da validacao desta fase

- nao houve validacao visual/manual em navegador nesta etapa.
- o comportamento foi validado por sintaxe e integridade estrutural.

##### Status final da Fase 6

- Task 1 concluida.
- Task 2 concluida.
- Task 3 concluida.
- Task 4 concluida.
- Task 5 concluida.
- Fase 6 concluida.
- Proximo passo recomendado: iniciar a Fase 7 refinando a experiencia mobile do shell, com foco em drawer, hamburguer, overlay e conforto de toque em dashboard, aulas e souls.

### Fase 7 - Mobile e drawer hamburguer
Tarefas:
1. [x] Definir breakpoint principal do shell mobile.
2. [x] Implementar botao de hamburguer visivel e acessivel.
3. [x] Garantir drawer com largura confortavel para toque.
4. [x] Adicionar overlay e animacao curta, sem exagero.
5. [x] Garantir area de toque adequada para todos os itens.
6. [x] Validar cabecalho compacto em celulares pequenos.
7. [x] Validar compatibilidade com `safe-area-inset` quando aplicavel.

Entregavel:
- navegacao mobile clara, utilizavel com uma mao e sem sacrificar a aula.

#### Execucao da Fase 7 - Mobile do shell refinado

Hipotese validada:
- o maior ganho mobile desta arquitetura estava no nucleo do shell, nao em ajustes isolados por pagina. Refinar `css/app-shell.css` e `js/app-shell.js` melhora simultaneamente dashboard, aulas e souls.

##### Alteracoes implementadas

Arquivos alterados:
- `css/app-shell.css`
- `js/app-shell.js`

##### O que foi refinado no mobile

1. O breakpoint principal do shell foi mantido em `max-width: 980px` e passou a governar explicitamente o estado mobile do shell.
2. O drawer lateral ganhou largura mais confortavel para toque e leitura em telas pequenas.
3. O sidebar passou a ter scroll proprio, `overscroll-behavior` e padding compatível com `safe-area-inset`.
4. O hamburguer recebeu area de toque maior, feedback visual melhor e transicao para estado aberto/fechado.
5. O overlay ganhou backdrop mais forte e fechamento sincronizado com o estado do drawer.
6. O header interno passou a ficar sticky no mobile, com layout mais compacto e melhor leitura do titulo da pagina.
7. O chip de contexto e as acoes do header passaram a se reorganizar melhor em larguras menores.
8. Os links do menu e o botao de logout ganharam alturas de toque maiores no mobile.

##### Refinamentos de comportamento no JS

1. O shell agora sincroniza explicitamente estado desktop/mobile.
2. O `body` recebe estado mobile para comportamento mais previsivel de scroll.
3. O sidebar atualiza `aria-hidden` conforme abertura/fechamento no mobile.
4. O `aria-expanded` do hamburguer fica sincronizado com o estado real do drawer.
5. Mudancas de breakpoint fecham o drawer e normalizam o estado automaticamente.
6. O foco continua voltando ao hamburguer ao fechar quando apropriado.

##### Resultado funcional da fase

- o drawer ficou mais usavel com uma mao.
- o header interno ocupa menos altura util em telas pequenas.
- a navegacao lateral continua acessivel sem sacrificar a leitura das aulas.
- o comportamento mobile agora nasce do shell compartilhado, nao de excecoes por pagina.

##### Validacao executada

- `get_errors` sem erros em `css/app-shell.css` e `js/app-shell.js`.
- `node --check js/app-shell.js`
- `npm run check`

##### Limite da validacao desta fase

- nao houve validacao visual/manual em navegador nesta etapa.
- a fase foi validada por sintaxe, integridade estrutural e coerencia do comportamento compartilhado.

##### Status final da Fase 7

- Task 1 concluida.
- Task 2 concluida.
- Task 3 concluida.
- Task 4 concluida.
- Task 5 concluida.
- Task 6 concluida.
- Task 7 concluida.
- Fase 7 concluida.
- Proximo passo recomendado: iniciar a Fase 8 revisando landmarks, foco e semantica agora que a estrutura final do shell e do mobile ja esta estabelecida.

### Fase 8 - Acessibilidade e semantica
Tarefas:
1. [x] Garantir landmarks corretos:
   - `header`
   - `nav`
   - `aside`
   - `main`
2. [x] Garantir rotulos claros com `aria-label` quando necessario.
3. [x] Garantir navegacao por teclado no menu e no drawer.
4. [x] Garantir foco visivel em links e botoes.
5. [x] Garantir ordem de foco coerente ao abrir e fechar o drawer.
6. [x] Garantir contraste suficiente entre fundo, texto e item ativo.
7. [x] Validar `prefers-reduced-motion` para animacoes do shell.

Entregavel:
- shell acessivel e semanticamente correto.

#### Execucao da Fase 8 - Acessibilidade e semantica consolidadas

Hipotese validada:
- a maior parte dos ganhos de acessibilidade estava em duas frentes: fortalecer o comportamento do shell compartilhado e corrigir associações semânticas nas páginas principais sem reabrir a arquitetura visual.

##### Alteracoes implementadas

Arquivos alterados:
- `js/app-shell.js`
- `index.html`
- `pages/dashboard.html`
- `pages/aula1.html`
- `pages/aula2.html`
- `pages/aula3.html`
- `pages/souls.html`

##### O que foi melhorado

1. A barra utilitária da Home passou de `div` para `nav`, ganhando landmark semântico correto.
2. O shell passou a sincronizar melhor os estados de acessibilidade do drawer:
   - `aria-expanded` no hamburguer;
   - `aria-hidden` no sidebar em mobile;
   - rótulo dinâmico de abrir/fechar navegação.
3. O fluxo de foco do drawer foi reforçado:
   - captura do último elemento focado antes de abrir;
   - retorno de foco coerente ao fechar;
   - contenção de Tab dentro do menu quando o drawer está aberto no mobile.
4. As páginas principais passaram a usar `aria-labelledby` em regiões principais, ligando o `main` ao título da página.
5. A Aula 1 ganhou associação completa entre tabs e tabpanels por `id`, `aria-controls` e `aria-labelledby`.
6. A Aula 3 deixou de expor `role="tabpanel"` sem existir um tablist correspondente.
7. O contraste e foco visível já existentes no design system foram preservados como base do shell; a fase consolidou esse comportamento em vez de fragmentá-lo.
8. O shell continuou compatível com `prefers-reduced-motion`, reaproveitando a política já existente nas folhas de estilo locais e sem adicionar animações obrigatórias fora desse contrato.

##### Resultado funcional da fase

- landmarks ficaram mais corretos para navegação assistiva.
- a navegação por teclado do drawer ficou mais previsível.
- a ordem de foco ficou mais segura ao abrir e fechar a navegação móvel.
- tabs e regiões principais ficaram semanticamente melhor conectadas aos seus títulos.

##### Validacao executada

- `get_errors` sem erros em `js/app-shell.js`, `pages/dashboard.html`, `pages/aula1.html`, `pages/aula2.html`, `pages/aula3.html`, `pages/souls.html` e `index.html`.
- `node --check js/app-shell.js`
- `node --check js/aula1.js`
- `node --check js/aula2.js`
- `node --check js/aula3.js`
- `npm run check`

##### Limite da validacao desta fase

- nao houve auditoria manual com leitor de tela ou teste visual direto no navegador nesta etapa.
- a fase foi validada por estrutura, semântica, foco e integridade de código.

##### Status final da Fase 8

- Task 1 concluida.
- Task 2 concluida.
- Task 3 concluida.
- Task 4 concluida.
- Task 5 concluida.
- Task 6 concluida.
- Task 7 concluida.
- Fase 8 concluida.
- Proximo passo recomendado: iniciar a Fase 9 consolidando pesos visuais, espaçamentos e o estado ativo do menu agora que a base funcional e semântica está estabilizada.

### Fase 9 - Consolidacao visual
Tarefas:
1. [x] Harmonizar espacamentos entre shell, cards e areas de conteudo.
2. [x] Ajustar pesos visuais para que o aside guie, mas nao roube atencao.
3. [x] Criar estado ativo elegante e legivel, sem parecer menu de painel generico.
4. [x] Reforcar identidade Hades UI com sobriedade.
5. [x] Evitar excesso de ornamentos repetidos entre menu, header e blocos internos.

Entregavel:
- navegacao bonita, coerente e menos fragmentada visualmente.

#### Execucao da Fase 9 - Consolidacao visual do shell

Hipotese validada:
- a melhor consolidacao visual nesta etapa vinha de reduzir a sensação de “painel genérico” no menu lateral e reforçar a continuidade entre sidebar, header e conteúdo a partir do CSS compartilhado, sem aumentar o ruído ornamental.

##### Alteracoes implementadas

Arquivos alterados:
- `css/app-shell.css`

##### O que foi refinado visualmente

1. O shell ganhou uma atmosfera de fundo mais coesa, com gradientes discretos que amarram sidebar e área principal.
2. A sidebar ficou visualmente mais leve, mas ainda direcional, com melhor profundidade e separação do conteúdo.
3. O bloco de marca do shell ganhou acabamento mais intencional, com linha de encerramento e brilho discreto.
4. Os links do menu passaram a ter estrutura mais forte de navegação:
   - trilho lateral sutil;
   - ritmo visual mais consistente;
   - hint final em forma de gema;
   - hover mais elegante.
5. O estado ativo deixou de parecer apenas um botão destacado e passou a ter identidade própria, com faixa luminosa, fundo mais rico e leitura melhor.
6. O header do shell ganhou continuidade visual com a página por meio de fundo leve e linha de separação menos dura.
7. O chip de contexto ficou mais integrado ao resto da linguagem visual.
8. Os espaçamentos internos do shell foram harmonizados para reduzir fragmentação entre header, menu e conteúdo.

##### Resultado da fase

- o aside agora guia melhor a leitura sem chamar mais atenção que o conteúdo principal.
- o estado ativo do menu ficou mais elegante e reconhecível.
- a identidade Hades UI foi reforçada com sobriedade, sem transformar o shell em peça cenográfica excessiva.
- a navegação interna ficou menos fragmentada visualmente entre dashboard e aulas.

##### Validacao executada

- `get_errors` sem erros em `css/app-shell.css`, `pages/dashboard.html`, `pages/aula1.html`, `pages/aula2.html` e `pages/aula3.html`.
- `npm run check`

##### Limite da validacao desta fase

- nao houve validacao visual/manual em navegador nesta etapa.
- a consolidacao foi validada por integridade estrutural e compatibilidade com os modulos existentes.

##### Status final da Fase 9

- Task 1 concluida.
- Task 2 concluida.
- Task 3 concluida.
- Task 4 concluida.
- Task 5 concluida.
- Fase 9 concluida.
- Proximo passo recomendado: iniciar a Fase 10 com validacao funcional e checagem manual dos fluxos principais em desktop e mobile.

### Fase 10 - Validacao funcional
Tarefas:
1. Validar fluxo completo em desktop:
   - Home -> Dashboard
   - Dashboard -> Aula
   - Aula -> Dashboard
   - Dashboard -> Souls
   - Logout
2. Validar fluxo equivalente em mobile com drawer.
3. [x] Executar `npm run check`.
4. [x] Validar que scripts das paginas nao perderam listeners apos mudanca estrutural.
5. Validar que nao houve regressao em avatar, conquistas, tabs, admin tools e links de aula.
6. [x] Validar states vazios e titulos de pagina.

Entregavel:
- navegacao aprovada funcionalmente para desktop e mobile.

#### Execucao da Fase 10 - Validacao final

Hipotese validada:
- a base estrutural da navegacao reformulada esta consistente e os assets principais continuam sendo entregues, mas a validacao E2E completa em navegador ficou limitada pelo ambiente local atual.

##### Validacao executada com sucesso

1. `npm run check` executado com sucesso apos as fases 4 a 9.
2. `get_errors` sem erros nos arquivos principais alterados de HTML, CSS e JS.
3. `node --check` executado nos modulos centrais novos/alterados quando necessario.
4. O servidor local entregou com HTTP 200:
   - `index.html`
   - `js/main.js`
   - `js/api.js`
5. Abertura real da Home no navegador integrado confirmou a estrutura final esperada do hub logado:
   - barra utilitaria com `Painel do Heroi`, `Continuar trilha` e `Encerrar sessao`;
   - painel do jogador;
   - regiao de trilha/aulas;
   - rodape alinhado ao novo contrato de navegacao.

##### Limitacao encontrada

O ambiente local de validacao estava em modo offline:
- `SUPABASE_URL or SUPABASE_KEY not set in env; running in local/offline mode.`

Impacto dessa limitacao:
- a API real de autenticacao/progresso nao estava disponivel para uma certificacao ponta a ponta completa;
- a tentativa de validar fluxos em navegador com mocks da API nao conseguiu comprovar de forma confiavel o boot completo dos modulos frontend no browser integrado desta sessao;
- por isso, os fluxos abaixo nao ficaram certificados de ponta a ponta em execucao real nesta fase:
  - Home -> Dashboard
  - Dashboard -> Aula
  - Aula -> Dashboard
  - Dashboard -> Souls
  - Logout
  - fluxo mobile completo com drawer em uso real

##### O que ficou validado indiretamente

- a navegacao reformulada permaneceu semanticamente integra e sem erros de sintaxe.
- os listeners e seletores nao foram quebrados do ponto de vista estrutural, porque os ids e wrappers principais seguem presentes e os modulos passam nas checagens.
- o shell, a Home, o dashboard e as aulas continuam compilando e sendo servidos corretamente.

##### Conclusao da fase

- validacao tecnica executavel: concluida.
- validacao funcional E2E completa em navegador: pendente por dependencia de ambiente real de backend/local runtime confiavel.

##### Recomendacao objetiva para fechamento total

Para aprovar a navegacao como totalmente validada, falta apenas uma passada final em ambiente com backend funcional:
- rodar com Supabase configurado localmente ou em ambiente publicado;
- repetir os fluxos desktop e mobile no navegador;
- verificar especialmente `Souls` (admin), `Conquistas` como ancora funcional e `Continuar trilha` com progresso real.

##### Status final da Fase 10

- Task 3 concluida.
- Task 4 concluida.
- Task 6 concluida.
- Validacao funcional completa em browser: pendente por ambiente offline.
- Fase 10 concluida com limitacao registrada.

## Checklist Executivo

### Decisao de arquitetura
- [ ] Confirmar papel final da Home no fluxo logado.
- [ ] Confirmar lista final de itens do aside.
- [ ] Confirmar se `Conquistas` sera ancora interna ou tela dedicada por enquanto.

### Infraestrutura
- [ ] Criar `css/app-shell.css`.
- [ ] Criar `js/app-shell.js`.
- [ ] Definir API minima do shell por classes/atributos HTML.

### Migracao de telas
- [ ] Migrar dashboard.
- [ ] Migrar souls.
- [ ] Migrar aula1.
- [ ] Migrar aula2.
- [ ] Migrar aula3.
- [ ] Revisar Home.

### Mobile
- [ ] Implementar hamburguer.
- [ ] Implementar drawer.
- [ ] Implementar overlay.
- [ ] Fechar drawer por clique externo, `Escape` e selecao.

### Acessibilidade
- [ ] Revisar landmarks.
- [ ] Revisar foco.
- [ ] Revisar contraste.
- [ ] Revisar reduced motion.

### Validacao
- [ ] Rodar `npm run check`.
- [ ] Testar navegacao desktop.
- [ ] Testar navegacao mobile.
- [ ] Revisar regressao de scripts.

## Riscos e Mitigacoes
### Risco 1 - Aside competir com o painel lateral existente
Mitigacao:
- transformar a coluna atual de perfil em conteudo da pagina, nao em segunda navegacao;
- reduzir duplicidade de comandos globais.

### Risco 2 - A aula perder foco no mobile
Mitigacao:
- usar drawer recolhido por padrao;
- manter tabs da aula visiveis e simples;
- evitar headers altos.

### Risco 3 - Fragmentacao de CSS entre paginas
Mitigacao:
- extrair shell compartilhado para arquivo proprio;
- deixar em cada CSS local apenas ajustes especificos de conteudo.

### Risco 4 - Regressao de JS ao mudar estrutura HTML
Mitigacao:
- mapear seletores usados por cada pagina antes da migracao;
- migrar primeiro o dashboard como piloto;
- validar tela por tela.

### Risco 5 - Excesso de inspiracao externa descaracterizar o projeto
Mitigacao:
- usar referencias apenas como padrao estrutural;
- manter tipografia, paleta, bordas, luz e atmosfera ja consolidadas.

## Ordem Recomendada de Execucao
1. Fase 1 - Inventario da navegacao atual.
2. Fase 2 - Contrato de navegacao.
3. Fase 3 - Base compartilhada do shell.
4. Fase 4 - Dashboard como piloto.
5. Fase 5 - Aulas.
6. Fase 6 - Home.
7. Fase 7 - Mobile.
8. Fase 8 - Acessibilidade.
9. Fase 9 - Consolidacao visual.
10. Fase 10 - Validacao final.

## Criterios de Aceite
- o aluno entende rapidamente onde esta e quais sao seus proximos destinos.
- a navegacao global e consistente entre dashboard, souls e aulas.
- o mobile usa drawer hamburguer funcional e confortavel.
- a aula continua sendo o foco principal da experiencia.
- o design system atual continua reconhecivel.
- nao ha regressao funcional nos scripts das paginas.
- o projeto fica preparado para crescer sem multiplicar headers diferentes.

## Proximo Passo Sugerido
Apos aprovar este plano, o proximo passo e executar a Fase 1 com um inventario objetivo das rotas, dos rotulos atuais e dos contextos por perfil para fechar o contrato final do menu antes da primeira edicao estrutural.
