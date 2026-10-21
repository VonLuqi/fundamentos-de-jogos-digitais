# Guia Completo de Deploy na HostGator + GitHub Actions (FTP Automático)

Este guia traz o passo a passo completo para colocar **`https://projects.vonluqi.com/fundamentos-de-jogos-digitais`** no ar na HostGator (cPanel + PHP 8 + MySQL) e deixar o **GitHub Actions** configurado para atualizar o servidor automaticamente via FTP a cada `git push`.

---

## Parte 1: Ativar o Certificado SSL (HTTPS) de `projects.vonluqi.com`

Na tela **Domínios** do cPanel, o botão *Force HTTPS Redirect* aparece bloqueado com o aviso *"AutoSSL is not currently active for this domain"* porque o subdomínio acabou de ser criado. Para emitir o certificado gratuito:

1. Volte à tela inicial do **cPanel** da HostGator.
2. Na seção **Segurança** (*Security*), clique em **SSL/TLS Status**.
3. Procure **`projects.vonluqi.com`** na lista, marque a caixinha ao lado dele e clique no botão **Run AutoSSL** (*Executar AutoSSL*) no topo da tabela.
   - *Observação*: se o DNS de `vonluqi.com` estiver na Cloudflare ou outro provedor externo, garanta que exista um registro tipo `A` para `projects` apontando para o IP da HostGator.
4. Quando o cadeado ficar **verde (AutoSSL Domain Validated)**, volte em **Domínios** e ative a chave **Force HTTPS Redirect** de `projects.vonluqi.com`.

---

## Parte 2: Garantir PHP 8.2+ no Subdomínio

1. No **cPanel**, vá em **Software** → **Gerenciador de MultiPHP** (*MultiPHP Manager*).
2. Marque a caixinha de **`projects.vonluqi.com`**.
3. No seletor **Versão do PHP** (*PHP Version*) no canto superior direito, selecione **PHP 8.2** (ou **PHP 8.3**) e clique em **Aplicar** (*Apply*).

---

## Parte 3: Criar o Banco de Dados MySQL e Importar os Dados

1. No **cPanel**, vá em **Bancos de Dados** → **Assistente de Banco de Dados MySQL** (*MySQL Database Wizard*):
   - **Passo 1**: Crie o banco, por exemplo `vonluqi_fjd` (anote o nome completo com prefixo, ex.: `vonluq12_fjd`).
   - **Passo 2**: Crie o usuário do banco, por exemplo `vonluqi_fjd_app`, e gere uma **senha forte** (anote o usuário completo e a senha).
   - **Passo 3**: Marque a caixa **TODOS OS PRIVILÉGIOS** (*ALL PRIVILEGES*) e clique em **Próxima Etapa** (*Next Step*).
2. Volte ao **cPanel** e abra o **phpMyAdmin**:
   - Na barra lateral esquerda, clique no banco recém-criado (`..._fjd`).
   - Clique na aba **Importar** (*Import*) no menu superior.
   - Em **Arquivo a importar**, selecione do seu computador o arquivo:
     **`db/mysql/hostgator-full-import.sql`**
   - Role até o final e clique em **Executar** (*Go*).
   - Pronto! Todas as **28 tabelas** e os **3.710 registros** atuais (alunos, senhas, XP, conquistas, Grimório, O Despertar e Prova Módulo 1) estarão importados.

---

## Parte 4: Criar a Pasta do Projeto e a Conta FTP para o GitHub Actions

1. No **cPanel**, abra o **Gerenciador de Arquivos** (*File Manager*):
   - Clique em **Configurações** (canto superior direito) e marque **"Mostrar arquivos ocultos (dotfiles)"** → **Save**.
   - Navegue até **`/projects/public`** e clique em **+ Pasta** (*+ Folder*) no topo para criar a pasta:
     **`fundamentos-de-jogos-digitais`**
   - O caminho completo ficará: `/projects/public/fundamentos-de-jogos-digitais`.
2. Agora volte ao **cPanel** → seção **Arquivos** (*Files*) → **Contas de FTP** (*FTP Accounts*):
   - **Fazer login** (*Log In*): digite `deploy-fjd` (ficará algo como `deploy-fjd@vonluqi.com`).
   - **Domínio**: selecione `vonluqi.com` (ou `projects.vonluqi.com`).
   - **Senha**: crie uma senha forte exclusiva para o deploy e anote.
   - **Diretório** (*Directory*): apague o que estiver preenchido após a barra e aponte **exatamente** para a pasta do projeto:
     `projects/public/fundamentos-de-jogos-digitais`
   - **Cota**: Ilimitado (*Unlimited*).
   - Clique em **Criar conta de FTP** (*Create FTP Account*).

> **Por que criar uma conta FTP exclusiva apontando para `/projects/public/fundamentos-de-jogos-digitais`?**
> Assim o GitHub Actions fica isolado apenas dentro da pasta deste projeto, sem risco de alterar `aura.vonluqi.com` ou `vonluqi.com`.

---

## Parte 5: Criar o Arquivo `.env.local` no Servidor (Feito Apenas 1 Vez)

O arquivo `.env.local` contém a senha do MySQL e do SMTP, por isso ele **não** vai para o GitHub e o workflow de FTP está configurado para **nunca apagar nem sobrescrever** o `.env.local` do servidor.

1. No **Gerenciador de Arquivos** do cPanel, entre em **`/projects/public/fundamentos-de-jogos-digitais`**.
2. Clique em **+ Arquivo** (*+ File*) no topo e crie o arquivo **`.env.local`**.
3. Clique com o botão direito em `.env.local` → **Edit** e cole o conteúdo abaixo (ajustando os dados do seu banco MySQL e e-mail):

```ini
DB_HOST=localhost
DB_PORT=3306
DB_NAME=SEU_PREFIXO_fjd
DB_USER=SEU_PREFIXO_fjd_app
DB_PASS=SUA_SENHA_MYSQL_AQUI

APP_BASE_URL=https://projects.vonluqi.com/fundamentos-de-jogos-digitais
MAIL_FROM="Fundamentos de Jogos Digitais <mensageiro@vonluqi.com>"

# SMTP da HostGator (crie a conta em cPanel -> Contas de E-mail)
SMTP_HOST=mail.vonluqi.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=mensageiro@vonluqi.com
SMTP_PASS=SENHA_DO_EMAIL

CRON_SECRET=troque_por_um_segredo_longo_aleatorio
```

4. Clique em **Salvar alterações** (*Save Changes*).

---

## Parte 6: Configurar os Secrets no GitHub Actions (Deploy Automático via FTP)

O arquivo `.github/workflows/deploy-hostgator.yml` já está pronto no projeto. Ele valida a sintaxe de todos os arquivos PHP (`php -l`) e envia apenas os arquivos que mudaram via FTPS para a HostGator a cada `push`.

1. Abra o repositório do projeto no **GitHub**.
2. Vá em **Settings** → **Secrets and variables** → **Actions** → clique em **New repository secret**.
3. Cadastre os seguintes **Secrets**:

| Nome do Secret | Valor para preencher |
| :--- | :--- |
| **`FTP_SERVER`** | O endereço do servidor FTP da HostGator (ex.: `ftp.vonluqi.com` ou o IP/hostname do servidor exibido no cPanel em *Informações Gerais*) |
| **`FTP_USERNAME`** | O usuário FTP criado na Parte 4 (ex.: `deploy-fjd@vonluqi.com`) |
| **`FTP_PASSWORD`** | A senha da conta FTP criada na Parte 4 |

*(Opcional)*:
- Se a sua conta FTP já tiver sido criada com raiz em `projects/public/fundamentos-de-jogos-digitais`, **não precisa** criar `FTP_SERVER_DIR` (o padrão já é `./`).
- Se você preferir usar a conta FTP principal do cPanel (que abre na raiz `/home/usuario/`), crie também o secret **`FTP_SERVER_DIR`** com o valor `/projects/public/fundamentos-de-jogos-digitais/`.

4. Faça o `git push` da branch para o GitHub:

```bash
git add -A
git commit -m "feat: port backend to PHP 8 + MySQL for HostGator and add FTP deploy workflow"
git push -u origin feat/hostgator-php-mysql
```

5. No GitHub, clique na aba **Actions**: você verá o workflow **"Deploy to HostGator (FTP)"** rodando e enviando os arquivos para `projects.vonluqi.com/fundamentos-de-jogos-digitais`! A partir daí, todo `git push` atualizará o site automaticamente.
