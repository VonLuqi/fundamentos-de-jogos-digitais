## Contexto da Aplicação **Fundamentos de Jogos Digitais**

### 1. Visão geral
A aplicação é uma plataforma web educacional que ensina design e desenvolvimento de jogos digitais usando estética inspirada em *Hades* (dark‑mode, tipografia clássica e efeitos “game‑feel”).
- **Frontend**: HTML5, CSS3 (variáveis de design) e JavaScript ES‑Modules.
- **Backend**: Rotas serverless em `/api` (Node.js) executadas via `local-server.mjs` ou no Vercel.
- **Persistência**: Supabase (PostgreSQL) via `@supabase/supabase-js`.
- **Segurança**: Senhas hash `scrypt`; migração automática de senhas legadas (`migrate‑passwords.js`).

### 2. Ideia e objetivo
Criar um **hub gamificado** onde o aluno avança por módulos, ganha XP, sobe de nível e desbloqueia conquistas. O progresso é *authoritative*: o servidor valida recompensas, evitando trapaças.

### 3. O que já foi concluído
| Área | Status | Principais artefatos |
|------|--------|----------------------|
| Autenticação | ✅ | `api/auth.js`, UI em `js/auth.js` e `pages/auth.html` |
| Progressão | ✅ | XP, nível, conquistas em `api/progress.js`, UI em `js/dashboard.js` |
| Admin | ✅ | Gerenciamento de códigos, visualização de alunos (`js/souls.js`, `pages/souls.html`) |
| Módulo 01 | ✅ | Aula interativa (`js/aula1.js`) com simulação de MDA |
| Infraestrutura | ✅ | Script `local-server.mjs`, migrations SQL em `db/` |
| Documentação | ✅ | README detalhado, guias de setup e troubleshooting |
| Testes básicos | ✅ | Smoke test `tests/login-check.mjs`, integração `tests/integration-check.mjs` |
| CI / lint | ✅ | Script `npm run check` verifica sintaxe de todos os módulos |

### 4. Pontos críticos atuais
- **Cobertura de testes** ainda limitada; falta de unit tests para lógica de XP, avatar e geração de códigos.
- **Modularização**: arquivos JS grandes podem ser divididos em serviços reutilizáveis.
- **Documentação de API**: não há especificação OpenAPI nem exemplos de chamadas `curl`.
- **Gerenciamento de ambiente**: variáveis sensíveis em `.env` não são validadas; falta script de validação.
- **Escalabilidade**: ausência de caching ou rate‑limiting nas autenticações.

### 5. Roadmap para tornar o projeto completo
| Sprint | Meta | Tarefas chave |
|--------|------|----------------|
| **1 – Testes automatizados** | Cobertura > 80 % | - Jest/Mocha + supertest para rotas API.<br>- Unit tests para cálculo de XP/nível (`utils/level.js`).<br>- Testes UI com Playwright (login, dashboard, aula). |
| **2 – Refatoração & modularização** | Código mais legível e reutilizável | - Extrair lógica de sessão em `src/services/session.js`.<br>- Camada “service” para progressão (`src/services/progressService.js`).<br>- Converter módulos JS globais em ES‑modules nomeados. |
| **3 – Documentação formal da API** | OpenAPI 3.0 + exemplos | - Gerar `api/openapi.yaml` com todas as rotas (`auth`, `progress`).<br>- Incluir README com `curl` exemplos e SDK JS opcional. |
| **4 – Segurança & rate‑limiting** | Proteção contra abuso | - Middleware `express-rate-limit`.<br>- Revogação automática de tokens expirados.<br>- Auditoria de chaves Supabase. |
| **5 – CI/CD** | Integração contínua | - GitHub Actions: lint, test, build.<br>- Deploy automático para Vercel ao merge na branch `main`. |
| **6 – Experiência do usuário** | Polimento visual e acessibilidade | - Ajustes de contraste (WCAG 2.1 AA).<br>- Tema light/dark toggle.<br>- i18n para PT e EN. |
| **7 – Extensões de conteúdo** | Mais módulos de aula | - Estrutura de módulos (`src/lessons/*`).<br>- Integração de vídeos via Vimeo/YouTube.<br>- Sistema de avaliações (quiz) com pontuação. |

### 6. Como começar a contribuir
1. **Fork** o repositório.
2. Crie uma branch `feature/<nome‑da‑feature>`.
3. Execute `npm install` e `npm run dev` (ou `node local-server.mjs`).
4. Rode os testes existentes: `npm test`.
5. Siga o padrão de commits (`feat: add unit tests for XP calculation`).

### 7. Integração opcional com 9Router
O skill **9router** oferece um gateway AI compatível com OpenAI que pode gerar documentação automática, exemplos de `curl` e testes de integração a partir de descrições de rotas. Configure `NINEROUTER_URL` e `NINEROUTER_KEY` conforme o README do skill e invoque os modelos desejados (`/v1/models/web`, `/v1/models/chat`).

---

**Próximos passos**
- Autorizar ajustes mais profundos (refatoração, novos testes, OpenAPI).
- Indicar prioridade entre testes, documentação ou segurança.

*Aguardo seu “go” ou detalhes adicionais.*