# Plano — Paginas Proprias de Aulas e Conquistas (Album)

## Contexto

A Home ja e introducao (`index.html`). O shell interno ja existe. Aulas e Conquistas ainda vivem como secoes do dashboard:


| Item do shell   | Destino atual (temporario)         | Destino alvo               |
| --------------- | ---------------------------------- | -------------------------- |
| Inicio          | `index.html`                       | permanece                  |
| Painel do Heroi | `dashboard.html`                   | permanece (resumo + altar) |
| Aulas           | `dashboard.html#lessons-list`      | `pages/aulas.html`         |
| Conquistas      | `dashboard.html#achievements-grid` | `pages/conquistas.html`    |


Este plano cobre a **implementacao** das duas paginas dedicadas. Nao reabre a Home nem reformula o shell inteiro.

Documento predecessor: `docs/plano-redefinicao-home-como-introducao.md` e `docs/plano-correcao-alinhamento-home-introducao.md`.

---

## Diagnostico da estrutura atual

### O que ja existe e funciona

- **Progresso server-authoritative** via Supabase (`api/progress.js` + `js/api.js`). Sessao no `localStorage`; XP/conquistas/aulas sempre do servidor.
- **Catalogo de conquistas** em `js/api.js` (`ACHIEVEMENTS`): `id`, `icon`, `name`, `desc`, `difficulty`, `hidden`, `rarity` (Pedra → Arco-iris).
- **Catalogo de modulos/aulas** em `js/api.js` (`MODULES` / `LESSONS`): hoje so **Modulo 1 → aula1**.
- **Render no dashboard**: `renderLessons` e `renderAchievements` em `js/dashboard.js`; estilos em `css/dashboard.css`.
- **Paginas de conteudo**: `aula1` completa; `aula2` parcial; `aula3` placeholder. As tres ja usam app-shell.
- **Raridade + juice**: selos de raridade, VFX rainbow, popup de descoberta na aula1.

### Problemas / acoplamentos a resolver antes (ou durante) a extracao

1. **Catalogo incompleto** — `aula2`/`aula3` existem como paginas, mas nao entram em `MODULES`/`LESSONS` nem no `LESSON_CATALOG` do backend. Uma pagina de Aulas so com aula1 fica visualmente pobre e contradiz o shell.
2. **Lock sequencial morto** — `renderLessons` deixa `locked = false` hardcoded. Se a pagina de Aulas for a “trilha”, o desbloqueio precisa de regra real (ou decisão explicita de liberar tudo).
3. **Render acoplado ao dashboard** — mover sem extrair modulo compartilhado duplica logica de cards, raridade e estados.
4. **Dashboard sem papel claro pos-extracao** — se remover as duas secoes sem substituir por atalhos, o Painel vira so altar + perfil. Precisa definicao de residual.
5. **Conquistas hoje nao sao figurinhas** — sao cards com emoji + raridade. Album/postal/cartao postal exige **novo modelo visual e, idealmente, assets**, nao so mover o grid.
6. **Scroll por hash** — `bindDashboardSectionNav` assume ids no dashboard. Com paginas proprias, vira navegacao de rota (`aulas` / `conquistas` em `mapRouteToNavItem`).
7. **Altar vs colecao** — resgatar codigo no dashboard pode desbloquear conquista; a pagina de Conquistas precisa refletir estado fresco (re-fetch ao abrir ou highlight se vier com query/hash).

---

## Sugestoes de mudanca (antes da implementacao visual)

Estas sugestoes sao recomendacoes tecnicas. As decisoes de produto estao nas perguntas abaixo.

### S1 — Extrair render compartilhado

Criar algo como:

- `js/achievements-ui.js` — catalogo visivel, card/figurinha, estados locked/unlocked/hidden
- `js/lessons-ui.js` — lista/trilha por modulo, link para `pages/{id}.html`, estados completed/locked/available

Dashboard, `aulas.html` e `conquistas.html` consomem os mesmos helpers. Evita drift.

### S2 — Dashboard vira resumo, nao inventario completo

Proposta:

- manter **Altar** e perfil no dashboard;
- trocar Quadro de Honra / Trilha completos por **blocos resumo** (ex.: 3 conquistas recentes + CTA “Abrir album”; proxima aula + CTA “Ver trilha”);
- ou manter preview curto + link, sem grid completo.

### S3 — Alinhar catalogo de aulas em uma unica fonte

Antes ou no inicio da pagina de Aulas:

- incluir `aula2` e `aula3` em `MODULES` (mesmo que “em breve” / locked);
- decidir se backend (`LESSON_CATALOG`, redeem, achievements) acompanha agora ou fica fase posterior;
- documentar que conclusao de aula1 continua via **codigo no altar** (hoje e assim).

### S4 — Conquistas como album, nao grid de cards genéricos

Proposta de linguagem:

- pagina = **Album de Reliquias**;
- cada conquista = **figurinha / cartao** com verso e frente (flip ou modal);
- locked = silhueta / envelope lacrado / slot vazio numerado;
- hidden nao descoberta = slot misterioso (“?”), nao sumir da grade se quisermos sensacao de album completo;
- raridade continua nos tokens ja existentes (`stone`…`rainbow`).

Assets: comecar com emoji/arte tipografica se nao houver ilustracoes; reservar pasta `assets/achievements/` para figurinhas futuras.

### S5 — Rotas e shell

- `data-route="aulas"` e `data-route="conquistas"`;
- `mapRouteToNavItem` ja mapeia `aulaN` → `aulas`; adicionar rotas literais;
- hrefs do shell: `./aulas.html` e `./conquistas.html` em dashboard, aulas 1–3, souls;
- remover (ou reduzir) `bindDashboardSectionNav` para esses itens quando as secoes sumirem do dashboard.

---

## Perguntas (respondidas — historico da Fase 0)

Respostas marcadas com `(X)`. Decisoes finais consolidadas na secao **Decisoes congeladas**.

### Produto / UX

1. **Dashboard residual** — Ao criar as paginas, o Painel deve:
  - (A) remover trilha e quadro por completo e so mostrar atalhos;
  - (X) manter preview curto (recomendado) `(H)`;
  - (C) manter as secoes completas tambem (duplicacao consciente)?
2. **Album de conquistas** — Preferencia visual:
  - (X) grade de figurinhas estilo album (slots fixos, verso/frente) `(H)`;
  - (B) mural de cartoes postais;
  - (C) vitrine de reliquias 3D/pesadas (mais cinematico, mais caro)?
3. **Slots de conquistas ocultas** — No album, segredos nao descobertos:
  - (X) aparecem como “?” / lacuna `(H)`;
  - (B) somem ate desbloquear (comportamento atual do dashboard)?
4. **Interacao da figurinha** — Clique abre:
  - (A) flip no proprio card;
  - (X) modal com arte grande + descricao + data `(H)`;
  - (C) so tooltip/expand inline?
5. **Pagina de Aulas** — Layout:
  - (X) lista por modulo com cards de aula `(H)`;
  - (B) trilha visual vertical/timeline;
  - (C) mapa de nos (mais game-like, mais escopo)?
6. **Aulas 2 e 3 na listagem** — Incluir ja como:
  - (X) “Em breve” / locked `(H)`;
  - (B) acessiveis sem catalogo de XP;
  - (C) so aula1 ate o backend estar pronto?
7. **Desbloqueio sequencial** — Aula N+1 so libera apos N concluida?
  - (A) sim `(H)`;
  - (X) todas liberadas, porém bloqueadas pelo adm, podendo o adm desbloquear quando precisar e for começar uma aula;
  - (C) so aula1 “oficial”, resto sempre locked ate haver codigo?
8. **Assets de figurinha** — Nesta fase:
  - (X) UI tipografica + emoji/raridade, pasta pronta para arte depois (que será colocada pelo dev) `(H)`;
  - (B) ja produzir/ilustrar N figurinhas;
  - (C) reusar avatares/recortes existentes?

### Tecnico

1. **Extracao de JS** — `(X)` dois arquivos: `js/achievements-ui.js` + `js/lessons-ui.js` (consumidores e modos distintos; evita monolito).
2. **CSS** — `(X)` folhas novas `css/aulas.css` + `css/conquistas.css` + tokens existentes; nao inchar `dashboard.css`.
3. **Backend nesta fase** — `(X)` listagem frontend com aula2/3; **sem** novos achievements/XP de aula2–3. Stubs minimos em `LESSON_CATALOG` so se forem necessarios para o gate de liberacao.
4. **Deep link** — `(X)` sim: `conquistas.html#achievementId` abre/foca a figurinha apos dados carregados.

---

## Decisoes congeladas (Fase 0 fechada)


| Tema                | Decisao                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| Dashboard           | Preview curto + CTAs (“Ver trilha”, “Abrir album”)                                                     |
| Nomenclatura album  | **Album de Reliquias**                                                                                 |
| Nomenclatura aulas  | **Trilha do Heroi**                                                                                    |
| Conquistas visual   | Grade de figurinhas (slots fixos); hidden = “?”; detalhe em **modal**                                  |
| Contador album      | `X / Y` com Y = tamanho do catalogo (inclui slots “?”); X = descobertas                                |
| Filtros album       | Fora do v1 (evita ruido); so grade + contador + modal                                                  |
| Aulas layout        | Lista por modulo com cards                                                                             |
| Aula2/3 na lista    | Aparecem; estado “Em breve” / locked ate o adm liberar                                                 |
| Desbloqueio         | Sem lock sequencial. Liberacao global por aula via switch booleano do adm                              |
| Mecanismo unlock    | **Reusar** `lesson_gates` (ja existe) com gate_key `published` + `released`; **nao** criar tabela nova |
| UX unlock           | Toggle no admin-tools do dashboard; alunos veem `available` so se `published === true`                 |
| Defaults            | `aula1` published=true; `aula2`/`aula3` published=false ate o adm ligar                                |
| Assets              | UI tipografica + emoji/raridade; pasta `assets/achievements/` pronta para arte do dev                  |
| Extracao JS         | `js/lessons-ui.js` + `js/achievements-ui.js`                                                           |
| CSS                 | `css/aulas.css` + `css/conquistas.css`                                                                 |
| Backend XP/achieves | Sem catalogo de conquistas/XP de aula2–3 nesta fase                                                    |
| Deep link           | Sim (`#id` apos fetch)                                                                                 |


### Nota de escopo — unlock vs catalogo de progresso

O pedido de “switch no banco” fica atendido pela tabela **ja existente** `lesson_gates` (`lesson_id` + `gate_key` + `released`), com API `lessonGates` / `setLessonGate`. Criar outra tabela so para o mesmo booleano seria duplicacao.

- **Nesta fase:** wire do gate `published` + UI admin + estados na Trilha.
- **Fora desta fase:** conteudo completo, redeem/XP e achievements especificos de aula2/3.

---

## Arquitetura alvo

```
index.html (intro)
    → auth.html | dashboard.html

dashboard.html
    perfil + altar + resumos/atalhos
    → aulas.html | conquistas.html

aulas.html
    trilha por modulo
    → aula1.html | aula2.html | aula3.html

conquistas.html
    album de figurinhas/reliquias
    (leitura do user.achievements + catalogo ACHIEVEMENTS)

shell nav
    Inicio → index
    Painel → dashboard
    Aulas → aulas.html
    Conquistas → conquistas.html
```

### Arquivos previstos


| Arquivo                         | Acao                                                 |
| ------------------------------- | ---------------------------------------------------- |
| `pages/aulas.html`              | criar                                                |
| `pages/conquistas.html`         | criar                                                |
| `js/aulas.js`                   | criar (boot + render via helper)                     |
| `js/conquistas.js`              | criar (boot + album + modal)                         |
| `js/lessons-ui.js`              | criar (extrair de dashboard)                         |
| `js/achievements-ui.js`         | criar (extrair de dashboard)                         |
| `css/aulas.css`                 | criar                                                |
| `css/conquistas.css`            | criar                                                |
| `js/dashboard.js`               | reduzir secoes / usar helpers + preview              |
| `pages/dashboard.html`          | resumo + CTAs + toggles admin de liberacao           |
| `css/dashboard.css`             | limpar ou manter so o que o preview usa              |
| `js/app-shell.js`               | rotas `aulas`/`conquistas`; ajustar binds de hash    |
| `pages/*.html` (shell)          | hrefs Aulas/Conquistas                               |
| `js/api.js`                     | enriquecer `MODULES` com aula2/3                     |
| `api/progress.js`               | gate `published` em `LESSON_GATES`; stubs se preciso |
| `README.md`                     | documentar rotas novas                               |
| `assets/achievements/README.md` | opcional: convencao futura de arte                   |


### Fora de escopo (esta fase)

- criar conteudo completo de aula2/aula3;
- novos achievements / XP / redeem especificos de aula2/3;
- criar tabela nova so para liberacao (usar `lesson_gates`);
- filtros do album;
- minigame / souls;
- redesign do altar;
- upload de figurinhas pelo aluno;
- troca da Home.

---

## Plano de execucao

### Fase 0 — Fechar decisoes de produto

- [x] Responder perguntas de produto/UX 1–8 (marcadas com X).
- [x] Responder perguntas tecnicas 1–4 (decisoes agent + contexto do repo).
- [x] Congelar copy: **Album de Reliquias** + **Trilha do Heroi**.
- [x] Definir residual do dashboard (preview curto).
- [x] Mecanismo de liberacao: gate `published` em `lesson_gates` + toggle admin.

### Fase 1 — Fundacao tecnica (extracao)

- [x] Extrair `renderLessons` → `js/lessons-ui.js` (API estavel: `renderLessonsList(container, user, options)`).
- [x] Extrair `renderAchievements` → `js/achievements-ui.js` (API estavel + suporte a modo `album`).
- [x] Fazer o dashboard consumir os helpers sem regressao visual.
- [x] Garantir `npm run check` / smoke do dashboard.

### Fase 2 — Pagina de Aulas

- [x] Criar `pages/aulas.html` no app-shell (`data-route="aulas"`).
- [x] Criar `js/aulas.js` + `css/aulas.css`.
- [x] Layout: cabecalho da trilha + lista por modulo.
- [x] Estados: `completed` / `available` / `locked` / `coming-soon`.
- [x] Incluir aula2/aula3 no catalogo frontend conforme decisao (padrao: em breve).
- [x] Wire `published` em `LESSON_GATES` + fetch gates na Trilha.
- [x] Toggle admin para liberar/bloquear aula2/3.
- [x] Regra de liberacao via gate `published` (sem lock sequencial).
- [x] CTA de cada aula → `pages/{id}.html`.
- [x] Atualizar hrefs do shell (`data-nav-item="aulas"`) em todas as paginas internas.
- [x] Destacar item ativo via `mapRouteToNavItem` (rota `aulas` e `aulaN`).

### Fase 3 — Pagina de Conquistas (album)

- [x] Criar `pages/conquistas.html` no app-shell (`data-route="conquistas"`).
- [x] Criar `js/conquistas.js` + `css/conquistas.css`.
- [x] Layout album: grade de slots fixos baseada no catalogo.
- [x] Figurinha: frente (arte/icone + nome + raridade); locked/hidden conforme regra.
- [x] Modal (ou flip) com descricao completa.
- [x] Contador de colecao (`X / Y`; Y = catalogo completo, incl. “?”).
- [x] Filtros: fora do v1 (decisao Fase 0).
- [x] Deep link `#achievementId` para focar/abrir slot.
- [x] Atualizar hrefs do shell (`data-nav-item="conquistas"`).
- [x] Remover dependencia de `#achievements-grid` no dashboard para navegacao do shell.

### Fase 4 — Dashboard como hub resumido

- [x] Substituir grids completos por previews + CTAs (“Abrir trilha”, “Abrir album”).
- [x] Manter altar, perfil, stats, admin tools.
- [x] Remover `bindDashboardSectionNav` para aulas/conquistas **ou** redirecionar esses cliques para as paginas novas.
- [x] Atualizar textos do README / intro cards se ainda prometerem “pagina propria” sem link real.

### Fase 5 — Polimento e validacao

- [x] Mobile: drawer, grade do album, lista de aulas.
- [x] Acessibilidade: foco no modal, `aria` nos slots, raridade com texto (nao so cor).
- [x] Fluxos:
  - shell Aulas → `aulas.html`;
  - shell Conquistas → `conquistas.html`;
  - Inicio → Home;
  - de `aula1`, item Aulas ativo e volta para `aulas.html`;
  - resgate no altar continua no dashboard; album reflete ao reabrir.
- [x] `npm run check` (+ `tests/phase5-pages-smoke.mjs`).
- [x] Atualizar status neste documento.

---

## Tasks granulares (checklist de implementacao)

### Shared

- [x] T1. Criar `js/lessons-ui.js` e migrar dashboard
- [x] T2. Criar `js/achievements-ui.js` e migrar dashboard
- [x] T3. Atualizar `js/app-shell.js` (rotas + limpar scroll de secoes obsoletas)
- [x] T4. Atualizar hrefs Aulas → `aulas.html` e Conquistas → `conquistas.html`

### Aulas

- [x] T5. `pages/aulas.html` + shell header (“Trilha do Heroi”)
- [x] T6. `js/aulas.js` boot (`requireSession`, `initAppShell`, fetch user, render)
- [x] T7. `css/aulas.css` (atmosfera Hades-like, sem reinventar tokens)
- [x] T8. Estender `MODULES` com aula2/aula3
- [x] T9. Gate `published` + empty/error states
- [x] T9b. Toggle admin de liberacao (dashboard tools)

### Conquistas

- [x] T10. `pages/conquistas.html` + shell header (“Album de Reliquias”)
- [x] T11. `js/conquistas.js` (album, modal, deep link, contador)
- [x] T12. `css/conquistas.css` (slots, figurinha, locked, rarity)
- [x] T13. Pasta `assets/achievements/` + README de convencao (opcional)
- [x] T14. Integrar highlight pos-unlock (query/hash) se necessario

### Dashboard / docs

- [x] T15. Preview + CTAs no dashboard; remover grids completos
- [x] T16. README e nota curta nos planos predecessores apontando este doc
- [x] T17. Validacao final + marcar fases neste arquivo

---

## Criterios de aceite

- [x] Item **Aulas** do shell nunca aponta para `index.html` nem depende de `#lessons-list` no dashboard.
- [x] Item **Conquistas** do shell abre o **Album de Reliquias**.
- [x] Home permanece so introducao.
- [x] Dashboard continua sendo entrada autenticada, sem ser o inventario completo.
- [x] Catalogo e progresso continuam vindos do servidor; sem progresso no `localStorage`.
- [x] `aula1` segue acessivel a partir da pagina de Aulas.
- [x] Conquistas locked/hidden respeitam a regra escolhida na Fase 0.
- [x] Raridade permanece legivel (texto + estilo).
- [x] Mobile usavel no drawer e nas duas paginas.
- [x] `pages/aulas.html` e `pages/conquistas.html` existem e passam no check do projeto.

---

## Riscos


| Risco                                           | Mitigacao                                                 |
| ----------------------------------------------- | --------------------------------------------------------- |
| Album sem arte fica generico                    | Fase tipografica forte + raridade; pasta de assets pronta |
| Duplicar render dashboard/paginas               | Extrair helpers na Fase 1 antes do visual                 |
| Usuario procura trilha no dashboard e nao acha  | Preview + CTA visivel; copy no header do Painel           |
| aula2/3 na lista sem backend                    | Estado “Em breve”/locked via `published`; sem fingir XP   |
| Confundir unlock com nova tabela                | Reusar `lesson_gates`; documentado na Fase 0              |
| Escopo explodir (mapa de nos, flip 3D, filtros) | Seguir hipoteses; mapa/mural ricos ficam fase 2 de UX     |
| Deep link / scroll apos render async            | Abrir modal apos dados carregados, nao no parse HTML      |


---

## Ordem recomendada de trabalho

1. ~~Fechar Fase 0 (respostas).~~ **feito**
2. ~~Fase 1 (extracao) — barata e reduz risco.~~ **feito**
3. ~~Fase 2 (Aulas) — caminho critico do shell hoje.~~ **feito**
4. ~~Fase 3 (Conquistas/album) — maior design.~~ **feito**
5. ~~Fase 4 (dashboard residual).~~ **feito**
6. Fase 5 (validacao).

---

## Status

- [x] Fase 0 — decisoes (congeladas)
- [x] Fase 1 — extracao UI
- [x] Fase 2 — pagina Aulas (+ gate `published` / toggle admin)
- [x] Fase 3 — pagina Conquistas (Album de Reliquias)
- [x] Fase 4 — dashboard resumido
- [x] Fase 5 — validacao