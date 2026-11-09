# Playbook — Prova do Módulo 2 e Trabalho Final

Operação do **Mestre** para os dois exames novos. Ambos nascem **fechados** e são liberados, corrigidos e resetados no **mesmo hub** da Provação do Módulo 1: [`pages/prova-admin.html`](../pages/prova-admin.html) (URL limpa `/prova-admin/`).

| Exame | `examId` | Tipo | Regras |
|-------|----------|------|--------|
| Provação do Módulo 1 | `modulo1-provacao` | quiz | 20 questões (12 MC + 8 discursivas), 20 pts, 90 min, 1 tentativa |
| Provação do Módulo 2 · O Balcão e o Labirinto do Submundo | `modulo2-prova` | quiz (só MC) | 10 questões A–E, 2 pts cada, 20 pts, 45 min, 1 tentativa. Corrige e libera a nota no envio (também quem já entregou). **Fechar nota** não é necessário |
| Trabalho Final | `trabalho-final` | project | Sem timer. Aluno envia **1 `.zip`** (máx. 200 MB), pode **reenviar** até o prazo (`closes_at`) ou até você selar; vale o último. Nota 0–30 (Aulas 02–08) + feedback |

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
- **Envio em partes (cliente atualizado):** cada requisição envia no máximo **20 MiB** de arquivo, mais o pequeno overhead multipart. O limite total continua **200 MiB (209.715.200 bytes)**. Isso evita um corpo único de 200 MiB diante do limite de 100 MB assumido para o Cloudflare integrado da HostGator; o limite efetivo da hospedagem deve ser conferido pelo responsável no deploy. Não é necessário alterar banco ou fazer migration.
- **Limites do PHP (HostGator):** para o cliente em partes, use `upload_max_filesize ≥ 24M` e `post_max_size ≥ 25M`. Clientes antigos em cache ainda usam `submitProject` e precisam dos valores maiores abaixo; continuam sujeitos ao limite de corpo do proxy. O `.htaccess` do projeto tenta `php_value` (só vale em mod_php). Em PHP-FPM/FastCGI (padrão do cPanel) crie `.user.ini` **na raiz do site** (a mesma pasta do `index.html`):

  ```ini
  upload_max_filesize = 205M
  post_max_size = 210M
  max_execution_time = 300
  max_input_time = 600
  memory_limit = 256M
  ```

  O `.user.ini` demora até ~5 min para valer (`user_ini.cache_ttl`). Alternativa: cPanel → *MultiPHP INI Editor*. Se estourar o limite, o aluno vê “O servidor recusou o envio por tamanho” (HTTP 413) — ajuste e peça para reenviar.
- O app valida: extensão `.zip`, assinatura `PK\x03\x04`, tamanho (200 MiB), usuário autenticado, turma/prazo liberados e trabalho ainda não corrigido. A assinatura não substitui inspeção/antivírus do conteúdo do ZIP.

### Protocolo e operação do envio em partes

- `POST /api/prova?action=projectUploadInit&examId=trabalho-final`: JSON `{fileName,size}`; retorna UUID gerado pelo servidor, `chunkSize=20971520`, `totalChunks`. Há **um envio ativo por aluno**; iniciar outro descarta somente as partes temporárias do anterior. Nenhum envio anterior já entregue é apagado por isso.
- `projectUploadChunk`: multipart `{uploadId,index,file}`. Verifica dono, exame, índice e tamanho exato (inclusive última parte). Aceita partes fora de ordem e reenvio idêntico; conteúdo diferente para índice já recebido exige reinício. O nome/caminho do cliente nunca define o caminho no disco.
- `projectUploadFinish`: JSON `{uploadId}`. Revalida autenticação, turma/prazo e correção; concatena por streaming, confere tamanho e assinatura e usa **a mesma transação** do envio legado. A tentativa é travada contra correção/reenvio; arquivo anterior só é removido depois do commit. Falha no banco remove o arquivo novo; sucesso/falha do finish limpa as partes daquele envio. Finish incompleto exige iniciar novamente.
- `submitProject` permanece disponível para clientes antigos em cache. O limite compartilhado de **6/min por aluno** protege init, finish e envio legado; partes têm bucket separado de **60/min por aluno**, suficiente para 10 partes com até 3 retentativas por parte. Não aumenta a proteção permissiva de outros endpoints.
- O cliente envia as partes sequencialmente, preserva progresso agregado por bytes e faz no máximo **3 retentativas por parte** em falha de rede/timeout, 5xx ou 429, com backoff e `Retry-After` quando informado. Outros 4xx não são repetidos. Init e finish não são repetidos automaticamente; se a resposta do finish se perder, **verifique a entrega atual antes de reenviar**.
- Estado fica em `PROVA_UPLOAD_DIR/.project-parts/user-<hash>/<uuid>/`, sob `.htaccess` deny-all, com metadados do servidor e lock por aluno. Não existe download público. Reserve espaço para partes + arquivo concatenado + cópia final: até aproximadamente **600 MiB transitórios por envio de 200 MiB**, além das entregas já guardadas.
- `backend/cron-purge.php` remove partes inativas há **mais de 24h**, inclusive diretórios órfãos reconhecidos; ignora envios com lock em uso e preserva entregas finais. A limpeza de partes roda antes da limpeza de sessões, inclusive se esta falhar. O resultado inclui `projectUploadsPurged`. Mantenha o cron diário configurado; falhas de cron deixam temporários até a próxima execução.
- Um **413** pode vir do PHP, servidor web ou proxy/Cloudflare, não apenas de `post_max_size`. Confira o limite por parte + overhead, permissões e logs; não peça para reduzir o ZIP abaixo de 100 MB como solução para o cliente atualizado.

### Verificação local antes de liberar o deploy

Sem HTTP externo, FTP, banco real ou credenciais de alunos:

```sh
node tests/prova-multiexam-smoke.mjs
node tests/prova-chunk-upload-smoke.mjs
php -l backend/src/Controllers/ProvaController.php
php -l backend/src/Services/Prova/ProvaProjectUploadService.php
php -l backend/src/Services/Prova/ProvaProjectService.php
php -l backend/cron-purge.php
node --check js/api.js
node --check js/prova/copy.js
```

O novo smoke usa `PROVA_UPLOAD_DIR` exclusivo em temp, PHP CLI e XHR simulado. Cobre ordem trocada, reenvio idêntico/conflitante, dono/exame incorretos, tamanhos, assinatura, partes ausentes, traversal, descarte/reinício, compensação de falha transacional, cron e retry/progresso. A simulação de **200 MiB em 10 partes** percorreu concatenação, validação, cópia e SHA-256 com `memory_limit=32M`; pico medido neste ambiente: **2.097.152 bytes (2 MiB)**. O payload simulado verifica o contrato existente de tamanho/assinatura PK; não é validação completa da estrutura ZIP. Esses testes não comprovam limites reais do HostGator/Cloudflare; o deploy e a validação de homologação ficam com o responsável após QA.

## 3. Liberar

1. Login **admin** → `/prova-admin/` → seletor **Exame** (M1 / M2 / Trabalho Final).
2. Bloco de gate: **Liberar TCG01**, **TCG02** ou **Liberar todas** · **Selar (fechada)** fecha para todos.
3. Datas opcionais (**Abre em** / **Fecha em** ou **Prazo de entrega**) → *Salvar datas*. Fora da janela o gate fecha sozinho; no Trabalho Final o prazo encerra os reenvios.
4. Alunos das turmas liberadas veem a linha **P/T** habilitada em *Aulas → Módulo 2*.

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
- [ ] `phpinfo`/`.user.ini`: `upload_max_filesize` e `post_max_size` ≥ 205M/210M
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
