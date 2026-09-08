# Plano — Sistema de Amigos (Companheiros de Jornada)

## Contexto

O Painel do Herói (`pages/dashboard.html`) já concentra **perfil** (coluna esquerda), **altar**, prévias do Álbum e da Trilha. Ainda **não existe** relação social entre alunos: listar outros usuários é exclusivo do admin (`pages/souls.html` + `listUsers`).

Este plano cobre a **adição de amigos** no perfil do aluno, com:

1. adicionar / gerenciar companheiros (outros alunos);
2. ver o **perfil público** do amigo;
3. ver as **conquistas** dele (reusando o Álbum / `achievements-ui`).

Documento predecessor: `docs/plano-paginas-aulas-e-conquistas.md` (hub do dashboard + Álbum de Relíquias).

Direção visual obrigatória: **preservar o Design System Hades-like** já definido — tokens `--hades-`*, tipografia Cinzel / Crimson Text, app-shell, botões `btn-gold`, painéis, raridade de conquistas e linguagem narrativa do Domínio. Não introduzir UI genérica de “social network”.

---



## Diagnóstico da estrutura atual



### O que já existe e ajuda


| Peça                            | Onde                                                 | Reuso esperado                                             |
| ------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| Perfil do aluno                 | `profile-panel` em `dashboard.html` + `dashboard.js` | Âncora UX para a seção de amigos                           |
| Avatar + nome + rank + XP       | `avatar-frame`, `rankForXp`, `levelForXp`            | Cards de amigo e perfil visitado                           |
| Catálogo / render de conquistas | `js/achievements-ui.js`, `css/conquistas.css`        | Álbum **somente leitura** no perfil do amigo               |
| Progresso server-authoritative  | `api/progress.js` + `js/api.js`                      | Novas actions no mesmo endpoint (padrão do projeto)        |
| Lista de alunos (admin)         | action `listUsers` / `souls.html`                    | Referência de payload; **não** expor esse endpoint a aluno |
| Turma no cadastro               | `users.turma` (`TCG01` / `TCG02`)                    | Escopo natural de busca / privacidade                      |
| Username único                  | `users.username`                                     | Identificador estável para convite e deep link             |




### Lacunas

1. **Sem modelo de amizade** — não há tabela, status (pendente/aceito) nem API.
2. **Sem perfil público** — `fetchProfile` devolve só o usuário da sessão; aluno não pode ler progresso de outro.
3. **Privacidade** — `conquistas`, XP e `full_name` hoje só aparecem para self ou admin; amigos precisam de um **DTO público** (campos seguros).
4. **UI social no DS** — não há padrões de lista de pessoas, convite ou estados pending; precisam nascer a partir de `profile-panel` / `hub-preview` / `btn-gold`, sem cards genéricos fora do idioma visual.
5. **Shell** — amigos não precisam de item novo no aside (máx. 5–6 destinos); ficam **dentro do Painel do Herói** (+ página de perfil do amigo).
6. **Hidden achievements** — no Espelho, slots secretos **sempre aparecem**; texto e estilo seguem eixos independentes (ver addendum abaixo). O álbum próprio mantém `?` até o herói desbloquear.

---



## Linguagem de produto (congelada — Fase 0)


| Conceito comum    | Nome no Domínio                          | Uso                           |
| ----------------- | ---------------------------------------- | ----------------------------- |
| Amigos            | **Companheiros de Jornada**              | Título da seção no perfil     |
| Adicionar amigo   | **Oferecer vínculo** / **Convidar**      | CTA                           |
| Pedido pendente   | **Convite pendente**                     | Estado                        |
| Aceitar / recusar | **Aceitar vínculo** / **Recusar**        | Ações                         |
| Remover amigo     | **Romper vínculo**                       | Ação destrutiva (confirmação) |
| Perfil do amigo   | **Espelho do Companheiro**               | Página / título               |
| Lista vazia       | “Nenhum companheiro ao seu lado… ainda.” | Empty state narrativo         |


Copy oficial: **Companheiros de Jornada** + **Espelho do Companheiro**.

---



## Sugestões técnicas (antes da UI final)



### S1 — Tabela `friendships` (aditiva)

```text
friendships
  id (ou PK composta)
  requester_id  → users(id)
  addressee_id  → users(id)
  status        ∈ ('pending', 'accepted', 'declined')  -- declined opcional
  created_at
  updated_at
  UNIQUE (requester_id, addressee_id)
  CHECK (requester_id <> addressee_id)
```

Regras:

- um par de usuários tem no máximo **um** vínculo ativo (normalizar ordem ou bloquear inverso duplicado);
- só `role = student` (ou qualquer não-admin) pode ser alvo de convite de aluno; admin fica de fora da rede social do aluno;
- ao aceitar, `status = accepted`; quem remove apaga a linha (ou soft-delete — preferir **DELETE** simples no v1).

Migração em `db/migrate-YYYY-MM-DD-friendships.sql` + espelho em `db/setup.sql`.

### S2 — API pública mínima via `api/progress.js`

Actions sugeridas (mesmo padrão `POST` com `token` + `action`):


| Action          | Quem                     | Efeito                                                              |
| --------------- | ------------------------ | ------------------------------------------------------------------- |
| `friendsList`   | self                     | lista aceitos + pendentes (enviados/recebidos)                                         |
| `friendSearch`  | self                     | autocomplete por username (mesma turma) + match **exato** de username (global)         |
| `friendRequest` | self                     | cria `pending`                                                                         |
| `friendRespond` | addressee                | `accept` / `decline`                                                |
| `friendRemove`  | qualquer lado (accepted) | remove vínculo                                                      |
| `friendProfile` | self + vínculo accepted  | DTO público do amigo + conquistas                                   |


DTO público proposto (nunca senha / tokens / códigos / role admin detalhado):

```json
{
  "id": 12,
  "username": "almaX",
  "fullName": "Nome Exibido",
  "turma": "TCG01",
  "avatarIndex": 2,
  "xp": 140,
  "rank": "…",
  "level": 3,
  "achievements": ["id1", "id2"],
  "completedLessonsCount": 1
}
```

- **Não** expor `redeemed_codes`, hashes, `lesson_paragraphs`, telemetria de views.
- Conquistas: lista de **ids** desbloqueados; o front monta o álbum com `ACHIEVEMENTS` + `achievements-ui` em modo read-only.



### S3 — UI no Painel (perfil) + página do Espelho

1. **Seção no** `profile-panel` (abaixo das quickstats):
  - lista compacta de companheiros (avatar + username);
  - campo de convite com **autocomplete** de username;
  - badge de convites recebidos;
  - CTA “Ver todos” se a lista crescer (limite soft **25**).
2. **Página** `pages/companheiro.html?u=<username>` (**decidido** — não modal):
  - app-shell (`data-route="dashboard"` ativo — ainda é área do Painel);
  - layout espelhando o perfil: avatar, nome, username, turma, rank, nível/XP, contador de relíquias;
  - grade do álbum **somente leitura** (reusar `achievements-ui` / modo `album`);
  - hidden no Espelho: matriz texto (observador) × estilo (espelhado) — ver addendum;
  - sem altar, sem troca de avatar, sem admin tools.

### S4 — Design System (regras de implementação visual)

- Reusar tokens de `css/style.css` / folhas internas (`--hades-bg`, `--hades-gold`, `--font-title`, etc.).
- Tipografia: títulos Cinzel; corpo Crimson Text.
- Controles: `btn-gold` / `btn-gold--ghost` / inputs no estilo do altar (`altar__input` como referência de campo).
- Listas: linguagem de **painel / laço**, não feed social; evitar pills genéricas, chips empilhados e cards flutuantes fora do idioma do Salão.
- Atmosfera: fundos com vinheta / painel já usados no shell; sem redesign paralelo.
- Folha nova sugerida: `css/companheiros.css` (não inchar `dashboard.css` além do necessário no profile-panel).
- Motion: 2–3 microinterações (hover no avatar do amigo, feedback ao aceitar vínculo, entrada da lista) via padrões já usados (`gamefeel` só se couber; senão CSS `--transition-*`).



### S5 — Cliente `js/api.js` + helpers

- Wrappers: `listFriends`, `searchStudents`, `requestFriend`, `respondFriend`, `removeFriend`, `fetchFriendProfile`.
- Opcional: `js/friends-ui.js` para render da lista / convites (espelha o padrão `achievements-ui` / `lessons-ui`).

---



## Perguntas (respondidas — histórico da Fase 0)

Respostas marcadas com `(X)`. Hipótese original: `(H)`. Decisões finais na seção **Decisões congeladas**.

### Produto / UX

1. **Onde vive a gestão de amigos?**
  - (X) seção no `profile-panel` do dashboard `(H)`;
  - (B) bloco na coluna direita (`hall-content`);
  - (C) item novo no shell (“Companheiros”)?
2. **Como ver o perfil do amigo?**
  - (X) página `pages/companheiro.html?u=…` `(H)`;
  - (B) modal/drawer no dashboard;
  - (C) só preview inline sem álbum completo?
3. **Nomenclatura**
  - (X) **Companheiros de Jornada** `(H)`;
  - (B) Aliados do Domínio;
  - (C) Amigos (literal)?
4. **Escopo de busca / convite**
  - (A) apenas mesma `turma` `(H)`;
  - (B) qualquer aluno da plataforma;
  - (X) mesma turma + busca por username exato global;
5. **Identificador do convite**
  - (A) username exato `(H)`;
  - (X) username com autocomplete;
  - (C) full_name (frágil — homônimos)?
6. **O que o amigo vê no Espelho?**
  - (X) avatar, nome, username, turma, rank, nível/XP, álbum de conquistas `(H)`;
  - (B) sem XP numérico (só rank + álbum);
  - (C) também lista de aulas concluídas detalhada?
7. **Conquistas ocultas no álbum do amigo**
  - (A) slot `?` se o amigo ainda não descobriu `(H)` — igual ao próprio álbum;
  - (X) ocultar slots hidden do visitante sempre;
  - (C) revelar nomes sem ícone (spoilers)?
8. **Limite de companheiros**
  - (X) limite soft (**25**);
  - (B) sem limite;
  - (C) limite baixo (ex.: 8) estilo party?



### Técnico

1. **Persistência** — `(X)` tabela `friendships` + migrate SQL `(H)`.
2. **API** — `(X)` actions em `api/progress.js` `(H)` vs endpoint `api/friends.js` novo.
3. **CSS** — `(X)` `css/companheiros.css` + trechos mínimos no dashboard `(H)`.
4. **JS** — `(X)` `js/friends-ui.js` + boot no `dashboard.js` / `companheiro.js` `(H)`.

---



## Decisões congeladas (Fase 0 fechada)


| Tema | Decisão |
| --- | --- |
| Âncora UX | Seção **Companheiros de Jornada** no `profile-panel` do dashboard |
| Perfil do amigo | Página `pages/companheiro.html?u=<username>` (**Espelho do Companheiro**) |
| Nome de produto | **Companheiros de Jornada** / **Espelho do Companheiro** |
| Escopo de busca | Autocomplete na **mesma turma**; convite também por **username exato global** |
| Identificador | Username com **autocomplete** (não full_name) |
| Visibilidade (Espelho) | avatar, nome, username, turma, rank, nível/XP, álbum read-only |
| DTO público | `id`, `username`, `fullName`, `turma`, `avatarIndex`, `xp`, `rank`, `level`, `achievements[]`, `completedLessonsCount` |
| Hidden (visitante) | Catálogo completo no Espelho. **Texto** ← observador; **estilo** ← espelhado (ver addendum) |
| Limite | Soft **25** companheiros aceitos |
| Backend | Tabela `friendships` + actions em `api/progress.js` |
| CSS / JS | `css/companheiros.css` + `js/friends-ui.js` + `js/companheiro.js` |
| Shell | Sem item novo no aside; nav destaca **Painel do Herói** no Espelho |

### Nota de escopo — busca e hidden

- **Autocomplete:** sugere alunos da mesma `turma` (prefixo de username); não lista a plataforma inteira.
- **Convite global:** se o username existir em outra turma e for digitado **exato**, o convite é permitido.
- **Hidden no Espelho:** ver **Addendum — secretas (matriz texto × estilo)** abaixo. O álbum **próprio** continua com `?` até desbloquear.

### Addendum — secretas (matriz texto × estilo)

Atualiza a decisão antiga de “omitir hidden” / “sempre ?”. Plano: [plano-correcao-espelho-conquistas-secretas.md](./plano-correcao-espelho-conquistas-secretas.md).

| Observador tem? | Espelhado tem? | Texto | Estilo |
| --- | --- | --- | --- |
| Não | Sim | `?` | Raridade secreta |
| Sim | Sim | Nome + ícone | Raridade secreta |
| Sim | Não | Nome + ícone | Bloqueado (`is-secret-known`) |
| Não | Não | `?` | Bloqueado |

- Modal: nome + descrição completa se o observador tem; senão `???` + texto velado. Chrome segue o espelhado.
- Contador `X / Y`: inclui secretas desbloqueadas pelo espelhado.
- Implementação: `resolveMirrorSecretAxes` / `getAlbumSlotModel` em `js/achievements-ui.js`; wire em `js/companheiro.js`.

---



## Arquitetura alvo

```
dashboard.html (Painel do Herói)
  profile-panel
    … avatar, rank, XP, quickstats
    … [Companheiros de Jornada]
         lista + convites + campo username
         → companheiro.html?u=<username>

companheiro.html (Espelho do Companheiro)
  perfil público (read-only)
  Álbum de Relíquias do amigo (achievements-ui, read-only)
  Voltar ao Painel

api/progress.js
  friendsList | friendSearch | friendRequest
  friendRespond | friendRemove | friendProfile

db/friendships
  requester_id, addressee_id, status, timestamps
```



### Arquivos previstos


| Arquivo                        | Ação                                                  |
| ------------------------------ | ----------------------------------------------------- |
| `db/migrate-…-friendships.sql` | criar                                                 |
| `db/setup.sql`                 | incluir tabela                                        |
| `api/progress.js`              | actions + DTO público + authz                         |
| `js/api.js`                    | wrappers HTTP                                         |
| `js/friends-ui.js`             | criar (lista, convites, empty/error)                  |
| `js/dashboard.js`              | montar seção no perfil                                |
| `pages/dashboard.html`         | markup da seção Companheiros                          |
| `css/dashboard.css`            | encaixe no profile-panel                              |
| `css/companheiros.css`         | criar (lista + página Espelho)                        |
| `pages/companheiro.html`       | criar (app-shell)                                     |
| `js/companheiro.js`            | boot + álbum read-only                                |
| `js/achievements-ui.js`        | modo read-only / user “visitado” se faltar            |
| `js/app-shell.js`              | rota `companheiro` → highlight Painel (se necessário) |
| `tests/…`                      | smoke API / UI                                        |
| `README.md`                    | documentar feature                                    |
| este doc                       | status das fases                                      |




### Fora de escopo (v1)

- chat, feed, comentários, likes;
- notificações push / e-mail;
- amizade com admin / “seguir” público sem aceite;
- ranking competitivo global entre amigos;
- item novo obrigatório no aside;
- alterar `souls.html` além do necessário;
- redesenho do Design System;
- compartilhar códigos de resgate ou paragrafos de GDD.

---



## Plano de execução (fases)



### Fase 0 — Fechar decisões de produto

- [x] Responder perguntas de produto/UX 1–8.
- [x] Responder perguntas técnicas 1–4.
- [x] Congelar copy (**Companheiros de Jornada** / **Espelho do Companheiro**).
- [x] Congelar DTO público, busca (turma + username global exato) e regra de hidden no Espelho.
- [x] Atualizar tabela **Decisões congeladas** neste documento.



### Fase 1 — Fundação de dados e API

- [x] Criar migração `friendships` + atualizar `setup.sql`.
- [x] Implementar actions: `friendsList`, `friendSearch`, `friendRequest`, `friendRespond`, `friendRemove`, `friendProfile`.
- [x] Authz: só sessão válida; perfil só se `accepted`; autocomplete por turma + match exato global.
- [x] Validar anti-abuso básico: não auto-convite, não duplicar pending, limite **25**, bloqueio de admin como alvo.
- [x] Wrappers em `js/api.js`.
- [x] Smoke manual ou teste mínimo das actions (`tests/friends-phase1-smoke.mjs`).



### Fase 2 — UI no Painel do Herói (perfil)

- [x] Markup da seção **Companheiros** no `profile-panel`.
- [x] Estilos alinhados ao DS (`companheiros.css` + encaixe dashboard).
- [x] Lista de aceitos (avatar + nome/username + link para Espelho).
- [x] Campo de convite com autocomplete + feedback (sucesso / já enviado / não encontrado).
- [x] Inbox de convites recebidos (aceitar / recusar).
- [x] Lista de convites enviados (pending) + cancelar outgoing.
- [x] Empty / error / loading states narrativos.
- [x] Mobile: seção usável dentro do profile-panel (sem quebrar o layout do Salão).



### Fase 3 — Espelho do Companheiro (perfil + conquistas)

- [x] Criar `pages/companheiro.html` no app-shell.
- [x] Criar `js/companheiro.js`: `requireSession`, fetch `friendProfile`, guard se não for amigo → voltar ao dashboard com mensagem.
- [x] Header: título **Espelho do Companheiro** + chip de contexto.
- [x] Bloco de perfil read-only (avatar, rank, nível, contadores).
- [x] Reusar `achievements-ui` em modo álbum read-only + contador `X / Y` (X inclui secretas do espelhado).
- [x] Modal de relíquia reutilizado (sem ações de self).
- [x] Deep link estável: `companheiro.html?u=<username>` (e opcional `#achievementId`).
- [x] Highlight do nav: Painel do Herói ativo.



### Fase 4 — Polimento, acessibilidade e docs

- [x] A11y: labels, `aria-live` em feedbacks, foco em diálogos de confirmação (romper vínculo).
- [x] Confirmação antes de **Romper vínculo**.
- [x] Estados de raridade legíveis (texto + estilo), igual ao álbum próprio.
- [x] `npm run check` + smoke (HTML/JS novos).
- [x] Atualizar `README.md` (feature + rota).
- [x] Marcar fases/tasks neste documento.

---



## Tasks granulares (checklist de implementação)



### Fase 0

- [x] T0.1 Respostas produto/UX
- [x] T0.2 Respostas técnicas
- [x] T0.3 Congelar decisões neste MD



### Dados / API

- [x] T1. Migração `friendships`
- [x] T2. `friendsList` + shape de resposta (accepted / incoming / outgoing)
- [x] T3. `friendSearch` (autocomplete mesma turma + username exato global)
- [x] T4. `friendRequest`
- [x] T5. `friendRespond` (accept / decline)
- [x] T6. `friendRemove`
- [x] T7. `friendProfile` (DTO + authz)
- [x] T8. Wrappers em `js/api.js`



### Painel

- [x] T9. Markup seção Companheiros no `profile-panel`
- [x] T10. `js/friends-ui.js` (render lista + convites)
- [x] T11. Wire em `dashboard.js`
- [x] T12. CSS DS (`companheiros.css` + ajustes dashboard)
- [x] T13. Fluxos: convidar, aceitar, recusar, remover



### Espelho

- [x] T14. `pages/companheiro.html` + shell
- [x] T15. `js/companheiro.js`
- [x] T16. Álbum read-only do amigo
- [x] T17. Guards (não amigo / usuário inexistente / self)
- [x] T18. Deep link + nav ativa



### Fechamento

- [x] T19. A11y + empty/error
- [x] T20. Testes/smoke + `npm run check`
- [x] T21. README + status neste plano

---



## Critérios de aceite

- [x] No Painel do Herói, o aluno vê e gerencia **Companheiros** a partir do perfil.
- [x] É possível convidar outro aluno (autocomplete mesma turma + username exato global).
- [x] Convite pendente pode ser aceito ou recusado pelo destinatário.
- [x] Amigo aceito abre o **Espelho** com perfil público e **Álbum de Relíquias** read-only.
- [x] Sem amizade aceita, `friendProfile` não vaza dados (403/404 seguro).
- [x] Conquistas `hidden` no Espelho seguem a matriz texto (observador) × estilo (espelhado); slots secretos permanecem visíveis.
- [x] Visual consistente com o Design System (tokens, tipografia, shell, sem UI “social genérica”).
- [x] Sem item novo no aside; no Espelho o nav destaca Painel do Herói.
- [x] Admin tools / altar / troca de avatar **não** aparecem no Espelho.
- [x] Limite soft de **25** companheiros aceitos.
- [x] `npm run check` passa com os artefatos novos.

---



## Riscos


| Risco                                         | Mitigação                                                               |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| Vazamento de dados via “perfil público” amplo | DTO mínimo + exigir `accepted`; nunca reusar `listUsers`                |
| Busca vira enumeração de usernames            | Autocomplete só na turma; global só com match **exato**; rate limit; “não encontrado” genérico |
| UI social quebra o idioma Hades               | Seguir S4; naming narrativo; reusar componentes do Salão                |
| Duplicar lógica do álbum                      | Só `achievements-ui`; não copiar markup                                 |
| Escopo explode (chat, ranking)                | Fora de escopo explícito no v1                                          |
| Self-view por engano (`?u=meuuser`)           | Redirect para dashboard / álbum próprio                                 |
| Convites spam                                 | Limite de outgoing pending + limite total de amigos                     |


---



## Ordem recomendada de trabalho

1. ~~Fase 0 — fechar decisões.~~ **feito**
2. ~~Fase 1 — migrate + API (bloqueante).~~ **feito**
3. ~~Fase 2 — seção no perfil (valor imediato no Painel).~~ **feito**
4. ~~Fase 3 — Espelho + álbum do amigo.~~ **feito**
5. ~~Fase 4 — a11y, testes, docs.~~ **feito**

---



## Status

- [x] Fase 0 — decisões (congeladas)
- [x] Fase 1 — dados + API
- [x] Fase 2 — UI no perfil (Painel do Herói)
- [x] Fase 3 — Espelho do Companheiro + conquistas
- [x] Fase 4 — polimento e validação

---



## Próximo passo

Sistema de Companheiros **completo no código**. Aplicar `db/migrate-2026-09-08-friendships.sql` no Supabase (se ainda não rodou) e validar o fluxo com dois alunos reais.