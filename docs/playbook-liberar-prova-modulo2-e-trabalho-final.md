# Playbook — Prova do Módulo 2 e Trabalho Final

Operação do **Mestre** para os dois exames novos. Ambos nascem **fechados** e são liberados, corrigidos e resetados no **mesmo hub** da Provação do Módulo 1: [`pages/prova-admin.html`](../pages/prova-admin.html) (URL limpa `/prova-admin/`).

| Exame | `examId` | Tipo | Regras |
|-------|----------|------|--------|
| Provação do Módulo 1 | `modulo1-provacao` | quiz | 20 questões (12 MC + 8 discursivas), 20 pts, 90 min, 1 tentativa |
| Provação do Módulo 2 · O Balcão e o Labirinto do Submundo | `modulo2-prova` | quiz (só MC) | 10 questões A–E, 2 pts cada, 20 pts, 45 min, 1 tentativa. Corrige e libera a nota no envio (também quem já entregou). **Fechar nota** não é necessário |
| Trabalho Final | `trabalho-final` | project | Sem timer. Aluno envia **1 `.zip`** (máx. 50 MB), pode **reenviar** até o prazo (`closes_at`) ou até você selar; vale o último. Nota 0–30 (Aulas 02–08) + feedback |

Conteúdo: [`avaliacao-modulo2-provacao.md`](./avaliacao-modulo2-provacao.md) (gabarito `B D A E C A D B E C`) · guia do aluno: [`pages/guia-trabalho-final.html`](../pages/guia-trabalho-final.html).

URLs do aluno: `/prova/?exam=modulo2-prova` · `/prova/?exam=trabalho-final` (sem `?exam=` = Módulo 1). Na trilha (Aulas → Módulo 2) as linhas **P** (Prova) e **T** (Trabalho Final) aparecem depois da Aula 08: aluno vê o gate; admin vê o botão **Hub**.

---

## 1. Migrar (uma vez por ambiente)

Arquivo: [`db/migrate-2026-10-29-prova-modulo2-trabalho-final.sql`](../db/migrate-2026-10-29-prova-modulo2-trabalho-final.sql)

- Cria `prova_submissions` (metadados da entrega: nome do arquivo no servidor, nome original, tamanho, SHA-256, nº de envios) e insere os 2 exames com `is_open = 0`.
- Idempotente (`CREATE TABLE IF NOT EXISTS` + `INSERT IGNORE`); sem `DELETE/DROP/UPDATE`. Pode rodar mais de uma vez; não mexe em exame já liberado.
- No HostGator o `MysqlMigrator` aplica `db/migrate-*.sql` automaticamente na primeira requisição da API depois do deploy (o arquivo novo muda a assinatura). Manual: phpMyAdmin → importar o `.sql`.
- Depende da migration do Módulo 1 (`prova_exams`, `prova_attempts`).

## 2. Pasta e limites de upload (Trabalho Final)

Os `.zip` ficam em `uploads/trabalhos/` com nome **gerado no servidor** (uuid). A pasta tem `.htaccess` “negar tudo” e o `.htaccess` da raiz bloqueia `/uploads/trabalhos/` — **não há URL pública**; o único download é `adminDownloadSubmission` (autenticado, só admin). O nome original do aluno é só metadado.

- Pasta precisa ser **gravável** pelo PHP (`chmod 750`/`755`). Alternativa fora do webroot: variável de ambiente `PROVA_UPLOAD_DIR=/home/USUARIO/trabalhos-fjd` (recomendado se a hospedagem permitir).
- **Limites do PHP (HostGator):** o padrão costuma ser `upload_max_filesize` 2–64 MB e `post_max_size` 8–64 MB. Para 50 MB precisa de `upload_max_filesize ≥ 50M` e `post_max_size ≥ 56M`. O `.htaccess` do projeto tenta `php_value` (só vale em mod_php). Em PHP-FPM/FastCGI (padrão do cPanel) crie `.user.ini` **na raiz do site** (a mesma pasta do `index.html`):

  ```ini
  upload_max_filesize = 52M
  post_max_size = 56M
  max_execution_time = 120
  memory_limit = 256M
  ```

  O `.user.ini` demora até ~5 min para valer (`user_ini.cache_ttl`). Alternativa: cPanel → *MultiPHP INI Editor*. Se estourar o limite, o aluno vê “O servidor recusou o envio por tamanho” (HTTP 413) — ajuste e peça para reenviar.
- O app valida: extensão `.zip`, assinatura `PK\x03\x04`, tamanho (50 MB), usuário autenticado e turma liberada; rate limit de 6 envios/min por aluno.

## 3. Liberar

1. Login **admin** → `/prova-admin/` → seletor **Exame** (M1 / M2 / Trabalho Final).
2. Bloco de gate: **Liberar TCG01** ou **TCG02** (uma turma por vez) · **Selar (fechada)** fecha para todos.
3. Datas opcionais (**Abre em** / **Fecha em** ou **Prazo de entrega**) → *Salvar datas*. Fora da janela o gate fecha sozinho; no Trabalho Final o prazo encerra os reenvios.
4. Alunos da turma liberada veem a linha **P/T** habilitada em *Aulas → Módulo 2*.

> O Painel do Mestre continua tendo o gate rápido do Módulo 1 e links diretos para o hub do M2 e do Trabalho Final.

## 4. Corrigir

**Prova do M2 (só MC):** no envio (ou no tempo esgotado) a nota e o gabarito vão direto para o aluno. Quem já tinha entregue e ainda esperava **Fechar nota** recebe a nota na próxima vez que a prova é aberta. Contestação: igual ao M1 (*Responder* ou *Reabrir correção*).

**Trabalho Final:**

1. Lista por turma (filtro **Turma**): coluna *Arquivo* mostra nome, tamanho e nº de envios.
2. **Abrir** → **Baixar .zip** (nome sugerido `usuario__arquivo.zip`).
3. Digite a **nota (0–30)** e o **feedback** → **Salvar rascunho** (o aluno ainda não vê) ou **Publicar nota** (o aluno vê nota + feedback e não pode mais reenviar).
4. Contestação do aluno: use *Responder* ou *Reabrir correção*; ao republicar, escreva a mensagem da revisão.

## 5. Resetar

- **Resetar** (linha ou detalhe): apaga a tentativa; no Trabalho Final também apaga o `.zip` do disco. O aluno pode fazer/enviar de novo.
- **Resetar todas as tentativas** respeita o exame selecionado e o filtro de turma (digite `RESETAR`).

## 6. Checklist rápido

- [ ] Migration aplicada (`select id, is_open from prova_exams;` → 3 linhas, as novas com `0`)
- [ ] `uploads/trabalhos/` gravável e `https://SEU-SITE/uploads/trabalhos/qualquer.zip` retorna **403/404**
- [ ] `phpinfo`/`.user.ini`: `upload_max_filesize` e `post_max_size` ≥ 52M/56M
- [ ] Testar com uma conta de aluno da turma liberada: enviar `.zip`, reenviar, ver status
- [ ] Hub: baixar o `.zip`, abrir no computador, publicar nota
- [ ] Selar o gate ao fim da janela

---

## 7. Como testar localmente antes do deploy

`npm run dev` (`scripts/dev-server.mjs`) serve o front local, mas **repassa `/api` para o backend de PRODUÇÃO**, que só conhece `modulo2-prova` e `trabalho-final` depois do deploy. Contra o backend antigo, `prova/?exam=modulo2-prova` e `?exam=trabalho-final` mostram o aviso **“Este exame ainda não está disponível no servidor. Avise o Mestre.”** (a página nunca cai na Provação do Módulo 1).

Para testar o backend novo localmente:

1. Tenha um MySQL/MariaDB local com `db/mysql/schema.sql` importado (nunca o de produção) e variáveis `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` apontando para ele.
2. Suba o backend com um roteador que mande `/api/*` para `backend/index.php` (ex.: `php -S 127.0.0.1:8080 router.php`, onde o roteador define `$_GET['_route']` com o trecho depois de `/api/` e faz `require 'backend/index.php'`; use `-d upload_max_filesize=60M -d post_max_size=64M`).
3. Em outro terminal: `DEV_API_BASE=http://127.0.0.1:8080 npm run dev` (PowerShell: `$env:DEV_API_BASE='http://127.0.0.1:8080'; npm run dev`).
