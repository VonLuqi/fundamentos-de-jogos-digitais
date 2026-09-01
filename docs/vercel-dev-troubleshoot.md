# 📚 Guia de Troubleshooting - Autenticação

**Data**: 2026-08-31  
**Status**: ✅ FUNCIONANDO  
**Repositório**: fundamentos-de-jogos-digitais

---

## 🎯 Status Geral

O sistema de autenticação foi implementado com sucesso e testado end-to-end. Todos os testes passaram:

- ✅ Login funciona
- ✅ Logout funciona
- ✅ Páginas protegidas redirecionam para login sem sessão
- ✅ Sessões persistem no banco de dados

---

## 🧪 Testes Realizados (2026-08-31)

### ✅ Teste 1: Login
```
Credenciais: VonLuqi / TaciLucas2002@
Resultado: Token gerado e validado
Redirecionamento: Dashboard carregado
Status: PASSOU
```

### ✅ Teste 2: Logout
```
Ação: Clique em "Encerrar Sessão"
Resultado: Token removido, redirecionado para login
Status: PASSOU
```

### ✅ Teste 3: Acesso Protegido
```
Ação: Tentar acessar dashboard sem sessão
Resultado: Redirecionado para /pages/auth.html
Status: PASSOU
```

### ✅ Teste 4: Login Novamente
```
Ação: Fazer login após logout
Resultado: Nova sessão criada, dashboard funciona
Status: PASSOU
```

---

## 🔧 Ambiente do Desenvolvedor

- **OS**: Windows 10/11
- **Node**: v24.19.0
- **Banco**: Supabase PostgreSQL (vspixnlgtlobwvefibpg.supabase.co)

---

## 🔧 Configuração do Banco de Dados

### Tabela `sessions` (REQUIRED)
```sql
CREATE TABLE IF NOT EXISTS sessions (
  token text PRIMARY KEY,
  user_id int4 REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Características**:
- `token`: Chave primária (texto aleatório de 48 caracteres)
- `user_id`: Foreign key para `users.id` (tipo `int4`, não uuid!)
- `created_at`: Timestamp automático

⚠️ **IMPORTANTE**: A coluna `id` na tabela `users` é `int4`, não `uuid`. Se criar com `uuid`, terá erro de tipo incompatível.

### Tabela `users` (existente)
```
id: int4 PRIMARY KEY
full_name: text (nome real do aluno)
username: varchar
password_hash: varchar (formato: salt:derivedHex com scrypt)
password: varchar (legacy, plaintext - auto-migrado para hash)
role: varchar
xp: int4
...
```

---

## 🔐 Fluxo de Autenticação Completo

### POST `/api/auth` → Login
```javascript
{
  action: 'login',
  username: 'VonLuqi',
  password: 'TaciLucas2002@'
}
```

**Backend**:
1. Busca usuário por `username` (case-insensitive: `ilike`)
2. Verifica senha contra:
   - `password_hash` (scrypt format: `salt:hex`)
   - `password_hash` (bcrypt format: `$2a/$2b/$2y`)
   - `password` (plaintext legacy)
3. Se plaintext encontrado: migra para scrypt, zera `password` column
4. Gera token: `crypto.randomBytes(24).toString('hex')`
5. Insere em `sessions`: `{token, user_id, created_at}`
6. Retorna: `{ok: true, token, user}`

**Frontend**:
1. Armazena em localStorage: `{token, name, role, username}`
2. Redireciona para dashboard

### POST `/api/auth` → Cadastro
```javascript
{
  action: 'register',
  fullName: 'Nome Completo do Aluno',
  username: 'login_do_aluno',
  password: 'senha'
}
```

**Backend**:
1. Valida `fullName`, `username` e senha
2. Salva em `users.full_name` e `users.username`
3. Cria sessão em `sessions`
4. Retorna `user.name` priorizando nome real

### GET `/api/auth?token=XXX` → Validação
**Backend**:
1. Consulta: `SELECT * FROM sessions WHERE token = ?`
2. Se encontra: busca usuário e retorna dados
3. Se não encontra: retorna 401

**Frontend**:
- Usa para validar se página precisa de login
- Se 401: redireciona para `/pages/auth.html`

### POST `/api/auth` → Logout
```javascript
{
  action: 'logout',
  token: 'XXX'
}
```

**Backend**:
1. Deleta token de `sessions`
2. Retorna: `{ok: true}`

**Frontend**:
1. Remove localStorage
2. Redireciona para login

---

## 📁 Arquivos de Código

### Backend
- **[api/auth.js](../api/auth.js)**: Handler principal de autenticação
- **[api/supabaseClient.js](../api/supabaseClient.js)**: Cliente Supabase singleton
- **[local-server.mjs](../local-server.mjs)**: Servidor local para desenvolvimento

### Frontend
- **[pages/auth.html](../pages/auth.html)**: Página de login/registro (Hades aesthetic)
- **[js/auth.js](../js/auth.js)**: Lógica de formulário e evento de submit
- **[js/api.js](../js/api.js)**: Cliente HTTP e gerenciador de sessão
- **[js/dashboard.js](../js/dashboard.js)**: Validação de sessão e proteção
- **[pages/souls.html](../pages/souls.html)**: Página admin de alunos/almas registradas
- **[js/souls.js](../js/souls.js)**: Renderização dos cards com avatar e métricas

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js v24+
- Conta Supabase com credenciais

### Setup
```bash
# 1. Clonar e navegar
git clone https://github.com/VonLuqi/fundamentos-de-jogos-digitais
cd fundamentos-de-jogos-digitais

# 2. Criar .env com suas credenciais
echo "SUPABASE_URL=https://vspixnlgtlobwvefibpg.supabase.co" > .env
echo "SUPABASE_KEY=seu_token_aqui" >> .env
echo "SUPABASE_SERVICE_ROLE_KEY=seu_service_role_key" >> .env

# 3. Instalar dependências
npm install

# 4. Iniciar servidor (se usando cópia limpa)
node local-server.mjs
# Ou via Vercel:
npx vercel dev
```

### Acessar
- Login: `http://localhost:3000/pages/auth.html`
- Dashboard: `http://localhost:3000/pages/dashboard.html` (requer sessão)

---

## 🐛 Problemas e Soluções

### ❌ Erro: "Could not find the table 'public.sessions'"
**Causa**: Tabela `sessions` não foi criada no Supabase

**Solução**:
1. Abra Supabase SQL Editor
2. Execute:
```sql
CREATE TABLE IF NOT EXISTS sessions (
  token text PRIMARY KEY,
  user_id int4 REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### ❌ Erro: "Key columns are of incompatible types: uuid and integer"
**Causa**: Tentou criar foreign key com `uuid` quando `users.id` é `int4`

**Solução**: Use `int4` em vez de `uuid`:
```sql
user_id int4 REFERENCES users(id) ON DELETE CASCADE,
```

### ❌ Erro: "Cannot find package 'bcryptjs'"
**Causa**: node_modules corrompidos

**Solução**: Use a cópia limpa:
```bash
cd C:\temp\fundamentos-clean
node local-server.mjs
```

### ❌ Login retorna 401 mesmo com credenciais corretas
**Verificar**:
1. Tabela `sessions` existe?
   - Query: `SELECT * FROM sessions LIMIT 1;`
2. Coluna `id` da tabela `users` é `int4`?
   - Query: `\d users` (psql) ou inspecionar no Supabase UI
3. Token está sendo inserido?
   - Adicionar logging em `api/auth.js` (já feito)

---

## 📊 Logs de Teste Final

Sequência de requisições bem-sucedidas:

```
[2026-08-31T20:13:18.144Z] POST /api/auth
body: { action: 'login', username: 'VonLuqi', password: 'TaciLucas2002@' }
response status: 200
token: '43daee4c6a99ea2780ff7f86092d8b45216c365cddb4aff5'

[2026-08-31T20:13:19.254Z] GET /api/auth
query: { token: '43daee4c6a99ea2780ff7f86092d8b45216c365cddb4aff5' }
sessionError: null
sessionExists: true
response status: 200
```

✅ Token criado, armazenado e validado com sucesso!

---

## 📝 Histórico de Problemas Resolvidos

| Data | Problema | Solução |
|------|----------|---------|
| 2026-08-31 | Tabela sessions não existia | Criada via Supabase SQL Editor com tipo correto (int4) |
| 2026-08-31 | Type mismatch: uuid ≠ int4 | Alterado para `int4 REFERENCES users(id)` |
| 2026-08-31 | Node modules corrompido | Usado cópia limpa em `C:\temp\fundamentos-clean` |
| 2026-08 | Senha plaintext não validava | Adicionado suporte a plaintext + auto-migração |
| 2026-08 | Logout não funcionava | Implementado DELETE de token em `sessions` |

---

## ✨ Próximas Melhorias

- [ ] Implementar token expiration (sessões que expiram)
- [ ] Adicionar refresh tokens
- [ ] Implementar rate limiting em login (anti-brute-force)
- [ ] Adicionar 2FA (autenticação de dois fatores)
- [ ] CSRF protection em formulários
- [ ] OAuth (GitHub, Google login)

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique se a tabela `sessions` existe
2. Confira tipo de `users.id` (deve ser `int4`)
3. Abra DevTools (F12) → Network → veja Request/Response do `/api/auth`
4. Verifique logs do servidor local
