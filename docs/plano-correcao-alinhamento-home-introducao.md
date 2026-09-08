# Plano de Correcao — Alinhar o Fluxo Interno a Home Introdutoria

## Contexto

A redefinicao da Home como introducao ja foi implementada em `index.html`, `css/style.css` e `js/main.js`. A Home nao opera mais o sistema: apresenta a plataforma e encaminha o usuario para `pages/auth.html` ou `pages/dashboard.html`.

A auditoria do `docs/plano-redefinicao-home-como-introducao.md` mostrou que o codigo da Home esta correto, mas o restante do produto ainda trata `index.html` como hub de aulas. Isso reabre a ambiguidade que o plano anterior quis eliminar.

Este documento planeja **somente a correcao de alinhamento**. Nao cria ainda as paginas definitivas de Aulas e Conquistas.

**Sucessor (implementado):** `docs/plano-paginas-aulas-e-conquistas.md` — paginas `aulas.html` / `conquistas.html` e dashboard como hub resumido.

## Problema

Hoje existem dois destinos conflitantes para o aluno autenticado:

| Origem | Destino atual | Problema |
| --- | --- | --- |
| CTA da Home | auth ou dashboard, conforme sessao | Correto |
| Item `Inicio` no shell | `../index.html` | Correto: volta a introducao |
| Item `Aulas` no shell | `../index.html` | Incorreto: Aulas e Inicio caem no mesmo lugar |
| Item `Conquistas` no shell | `dashboard.html#achievements-grid` | Aceitavel nesta fase: ancora interna ate existir pagina propria |

Efeito pratico: o usuario logado clica em **Aulas** e sai do sistema autenticado para a landing. A Home volta a parecer seletor de trilha, mesmo sem lista de aulas.

Ha tambem residuos de nomenclatura e documentacao do hub antigo:

- `<title>` de `index.html` ainda diz `Menu Principal`;
- `README.md` ainda descreve a Home como hub gamificado;
- `css/style.css` ainda declara `.screen-fade`, nao usado pela Home.

## Decisao

Enquanto `pages/aulas.html` nao existir, **Aulas** deve apontar para o unico lugar operacional da trilha: a secao `Trilha do Heroi` no dashboard.

Regra temporaria de navegacao:

- `Inicio` → `index.html` (introducao);
- `Painel do Heroi` → `pages/dashboard.html`;
- `Aulas` → `pages/dashboard.html#lessons-list`;
- `Conquistas` → `pages/dashboard.html#achievements-grid`.

Isso nao inventa a pagina definitiva de aulas. So impede que a Home volte a ser destino operacional.

O scroll no dashboard, se o usuario ja estiver nessa pagina, deve seguir o mesmo padrao ja usado em Conquistas em `js/app-shell.js`: prevenir reload, ir ate o alvo, atualizar o hash.

## Objetivo

Eliminar a duplicidade de papel entre Home e item Aulas do shell, sem abrir a fase das paginas proprias.

Metas praticas:

- Aulas deixa de apontar para `index.html`;
- a Home permanece so introducao;
- o titulo e o README passam a descrever o papel real da Home;
- limpar CSS morto da Home, se nao tiver outro consumidor nessa folha.

## Escopo

### Arquivos previstos

- `pages/dashboard.html`
- `pages/aula1.html`
- `pages/aula2.html`
- `pages/aula3.html`
- `js/app-shell.js`
- `index.html`
- `README.md`
- `css/style.css`
- opcionalmente uma nota curta em `docs/plano-redefinicao-home-como-introducao.md` apontando esta correcao

### Fora de escopo

- criar `pages/aulas.html` ou `pages/conquistas.html`;
- tirar a trilha e o quadro de honra do dashboard;
- reformular o app shell;
- alterar CTA, sessao ou visual da Home alem do `<title>`;
- mexer no minigame (`pages/minigame.html` ainda usa `controls-bar` proprio e nao entra nesta correcao);
- alterar backend, aulas, XP ou autenticacao.

## Comportamento Esperado

### Usuario autenticado no dashboard

1. Clica em **Inicio** → vai para a Home introdutoria.
2. Clica em **Aulas** → permanece no dashboard e rola ate `#lessons-list`.
3. Clica em **Conquistas** → permanece no dashboard e rola ate `#achievements-grid` (ja existe).

### Usuario autenticado em uma aula

1. Clica em **Aulas** → vai para `pages/dashboard.html#lessons-list`.
2. Clica em **Inicio** → vai para a Home introdutoria.

### Usuario na Home

1. CTA continua unico: auth se nao houver sessao, dashboard se houver.
2. Nenhum item interno de Aulas reaparece na Home.

## Plano de Execucao

### Fase 1 — Corrigir destinos do item Aulas

- trocar `href="../index.html"` do `data-nav-item="aulas"` para `./dashboard.html#lessons-list` nas paginas internas (`dashboard`, `aula1`, `aula2`, `aula3`);
- confirmar que `id="lessons-list"` permanece no dashboard como alvo estavel;
- nao alterar o item `Inicio`.

### Fase 2 — Scroll interno no shell

- em `js/app-shell.js`, replicar o tratamento de Conquistas para Aulas quando a rota atual for `dashboard`;
- alvo: `#lessons-list`;
- se a rota nao for dashboard, deixar a navegacao normal seguir o href;
- fechar o drawer mobile depois do clique, no mesmo padrao ja existente.

### Fase 3 — Nomenclatura e documentacao da Home

- alterar o `<title>` de `index.html` para refletir introducao, nao menu principal;
- proposta: `Fundamentos de Jogos Digitais — Introducao`;
- atualizar no `README.md` as linhas que ainda chamam `index.html` / `css/style.css` / `js/main.js` de menu principal / hub gamificado.

### Fase 4 — Residuo visual da Home

- remover `.screen-fade` de `css/style.css` se a Home nao o renderiza;
- conferir que nenhum HTML da Home depende dessa classe;
- nao tocar no fade do minigame, que vive no HTML/CSS daquela pagina.

### Fase 5 — Validar

- Home: CTA unico, sem lista de aulas, titulo novo.
- Dashboard: Aulas rola ate a trilha; Conquistas continua no quadro de honra; Inicio vai para a Home.
- Aula 1/2/3: Aulas leva ao dashboard na trilha, nao a `index.html`.
- README descreve a Home como introducao.
- executar `npm run check`.

## Criterios de Aceite

- o item Aulas do shell nunca aponta para `index.html`;
- `Inicio` continua sendo o unico caminho do shell para a Home;
- no dashboard, Aulas e Conquistas usam ancoras internas distintas;
- a Home nao volta a ganhar papel de hub;
- o titulo da Home e o README descrevem introducao, nao menu principal;
- `pages/aulas.html` e `pages/conquistas.html` continuam de fora desta correcao.

## Riscos

### Risco 1 — Usuario esperar uma pagina propria de Aulas

Mitigacao: o destino temporario e a trilha no dashboard. A pagina propria fica para um plano seguinte, ja previsto no plano da Home.

### Risco 2 — Hash `#lessons-list` nao receber o mesmo carinho do scroll de Conquistas

Mitigacao: tratar Aulas em `app-shell.js` com o mesmo padrao de preventDefault + `scrollIntoView` quando ja estiver no dashboard.

### Risco 3 — Expandir demais a correcao

Mitigacao: nao mover conteudo do dashboard nem criar rotas novas neste ciclo.

## Status

- [X] Fase 1 — destinos do item Aulas
- [X] Fase 2 — scroll interno no shell
- [X] Fase 3 — titulo e README
- [X] Fase 4 — CSS morto da Home
- [X] Fase 5 — validacao
