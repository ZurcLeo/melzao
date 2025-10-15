# 🐘 Guia de Migração para PostgreSQL

Este guia explica como configurar e usar o novo sistema de banco de dados que suporta tanto SQLite (desenvolvimento) quanto PostgreSQL (produção).

---

## 📋 Índice

1. [Mudanças Realizadas](#mudanças-realizadas)
2. [Setup Local (SQLite)](#setup-local-sqlite)
3. [Setup Local com PostgreSQL](#setup-local-com-postgresql)
4. [Deploy em Produção (Render)](#deploy-em-produção-render)
5. [Migração de Dados Existentes](#migração-de-dados-existentes)
6. [Troubleshooting](#troubleshooting)

---

## 🔄 Mudanças Realizadas

### Arquivos Criados

- `/server/databaseAdapter.js` - Adapter universal (SQLite + PostgreSQL)
- `/server/migrations/001_multi_user_schema.js` - Migration compatível com ambos
- `/server/scripts/migrateSQLiteToPostgres.js` - Script de migração de dados
- Este guia (`POSTGRESQL_MIGRATION_GUIDE.md`)

### Arquivos Modificados

- `/server/database.js` - Agora re-exporta o `databaseAdapter`
- `/server/package.json` - Adicionada dependência `pg`
- `/server/.env.example` - Documentação de configurações

### Como Funciona

O sistema **detecta automaticamente** qual banco usar baseado nas variáveis de ambiente:

```javascript
// Se DATABASE_URL existe e começa com 'postgres://' → PostgreSQL
// Caso contrário → SQLite
```

---

## 💻 Setup Local (SQLite)

**Recomendado para desenvolvimento rápido**

### 1. Instalar Dependências

```bash
cd server
npm install
```

### 2. Configurar .env

```bash
# Copiar o exemplo
cp .env.example .env

# Editar .env e garantir que está assim:
DATABASE_PATH=./game.db
# DATABASE_URL deve estar comentado ou removido
```

### 3. Executar

```bash
npm run dev
```

O SQLite será usado automaticamente. O arquivo `game.db` será criado na pasta `server/`.

**Vantagens:**
- ✅ Setup instantâneo (sem instalações)
- ✅ Dados persistem localmente
- ✅ Perfeito para desenvolvimento

---

## 🐘 Setup Local com PostgreSQL

**Recomendado para testar comportamento de produção**

### Opção 1: Docker (Recomendado)

```bash
# 1. Rodar PostgreSQL em container
docker run -d \
  --name melzao-postgres \
  -e POSTGRES_DB=melzao_dev \
  -e POSTGRES_USER=dev \
  -e POSTGRES_PASSWORD=dev123 \
  -p 5432:5432 \
  postgres:15-alpine

# 2. Verificar que está rodando
docker ps | grep melzao-postgres
```

### Opção 2: PostgreSQL Nativo

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
createdb melzao_dev
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb melzao_dev
```

**Windows:**
- Baixar instalador: https://www.postgresql.org/download/windows/
- Seguir wizard de instalação
- Criar database via pgAdmin

### 3. Configurar .env

```bash
# Editar server/.env:
DATABASE_URL=postgresql://dev:dev123@localhost:5432/melzao_dev

# OU usar variáveis individuais:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=melzao_dev
DB_USER=dev
DB_PASSWORD=dev123
DB_SSL=false
```

### 4. Executar

```bash
cd server
npm run dev
```

Você verá:
```
✅ Conectado ao banco de dados: POSTGRES
🐘 PostgreSQL conectado
```

---

## 🚀 Deploy em Produção (Render)

### 1. Criar PostgreSQL no Render

1. **Acesse:** https://dashboard.render.com/
2. **New** → **PostgreSQL**
3. **Configurações:**
   - Name: `melzao-database`
   - Database: `melzao_db`
   - User: `melzao_user`
   - Region: `Oregon (US West)` (mesma do servidor)
   - Plan: **Free**

4. **Create Database**

### 2. Conectar ao Web Service

1. Vá para seu Web Service (`melzao-backend`)
2. **Environment** → **Add Environment Variable**
3. Adicionar:

```bash
# Render fornece automaticamente DATABASE_URL
# Mas você pode adicionar manualmente se necessário:
DATABASE_URL=<cole a Internal Database URL do PostgreSQL>

# Outras variáveis importantes:
NODE_ENV=production
JWT_SECRET=<gere uma chave segura>
```

**IMPORTANTE:** Use a **Internal Database URL**, não a External!

Exemplo:
```
postgresql://melzao_user:abc123@dpg-xxxxx-a/melzao_db
```

### 3. Deploy

```bash
git add .
git commit -m "feat: migração para PostgreSQL"
git push origin main
```

O Render irá:
1. Detectar `DATABASE_URL`
2. Usar PostgreSQL automaticamente
3. Criar todas as tabelas via migrations
4. Aplicação pronta! 🎉

---

## 📦 Migração de Dados Existentes

Se você já tem dados no SQLite local e quer migrá-los para PostgreSQL:

### 1. Preparar PostgreSQL

```bash
# Garantir que PostgreSQL está rodando e vazio
# (ou criar novo database)
createdb melzao_production
```

### 2. Configurar .env Temporário

Crie um arquivo `.env.migration`:

```bash
# SQLite source
SQLITE_PATH=./game.db

# PostgreSQL destination
DATABASE_URL=postgresql://user:password@localhost:5432/melzao_production
```

### 3. Executar Migração

```bash
cd server
node scripts/migrateSQLiteToPostgres.js
```

Você verá:

```
🔧 Iniciando migração de dados SQLite → PostgreSQL

✅ SQLite conectado: /path/to/game.db
✅ PostgreSQL conectado

📊 Migrando game_sessions...
  ✅ 45 registros migrados

👥 Migrando participants...
  ✅ 123 registros migrados

💬 Migrando answers...
  ✅ 890 registros migrados

🔄 Atualizando sequences do PostgreSQL...

═══════════════════════════════════════
  RESUMO DA MIGRAÇÃO
═══════════════════════════════════════

📊 Registros migrados por tabela:
  - game_sessions: 45 registros
  - participants: 123 registros
  - answers: 890 registros

✅ Total de registros migrados: 1058

🎉 Migração concluída sem erros!
```

---

## 🛠️ Troubleshooting

### Problema: "ERROR: role does not exist"

**Solução:**
```bash
# Criar o usuário no PostgreSQL
psql -U postgres
CREATE USER dev WITH PASSWORD 'dev123';
GRANT ALL PRIVILEGES ON DATABASE melzao_dev TO dev;
\q
```

### Problema: "Connection refused" no Docker

**Solução:**
```bash
# Verificar se container está rodando
docker ps -a

# Se parado, iniciar:
docker start melzao-postgres

# Ver logs:
docker logs melzao-postgres
```

### Problema: Migrations não rodam

**Solução:**
```bash
# Deletar tabela de migrations e rodar novamente
psql -U dev -d melzao_dev
DROP TABLE IF EXISTS migrations;
\q

# Reiniciar servidor
npm run dev
```

### Problema: "Column does not exist" no PostgreSQL

**Causa:** Diferença de case-sensitivity entre SQLite e PostgreSQL

**Solução:**
PostgreSQL é case-sensitive para nomes de colunas. Se você tinha `userId` no SQLite, deve ser `userid` ou `"userId"` no PostgreSQL. As migrations já tratam isso corretamente.

### Problema: Dados não persistem no Render

**Verificações:**

1. **Confirmar que DATABASE_URL está configurado:**
```bash
# No dashboard do Render → Environment
DATABASE_URL=postgresql://...
```

2. **Ver logs do Render:**
```bash
# Deve aparecer:
✅ Conectado ao banco de dados: POSTGRES
🐘 PostgreSQL conectado
```

3. **Testar conexão ao banco:**
```bash
# No Render Shell (disponível no dashboard)
psql $DATABASE_URL
\dt  # listar tabelas
SELECT COUNT(*) FROM game_sessions;
\q
```

### Problema: "Too many connections"

**Causa:** Atingiu limite do connection pool (20 conexões)

**Solução:**
```javascript
// Em databaseAdapter.js, reduzir pool:
max: 10,  // ao invés de 20
```

---

## 📊 Monitoramento

### Verificar qual banco está em uso

```javascript
// No código:
const Database = require('./database');
console.log('Tipo de banco:', Database.getDatabaseType());
// Output: 'sqlite' ou 'postgres'
```

### Ver estatísticas do PostgreSQL

```bash
# Conectar ao banco
psql $DATABASE_URL

# Ver tamanho do banco
SELECT pg_size_pretty(pg_database_size('melzao_db'));

# Ver número de conexões ativas
SELECT count(*) FROM pg_stat_activity;

# Ver tabelas e tamanhos
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## ✅ Checklist de Deploy

- [ ] PostgreSQL criado no Render
- [ ] DATABASE_URL configurado no Web Service
- [ ] NODE_ENV=production configurado
- [ ] JWT_SECRET atualizado (produção)
- [ ] Deploy realizado (git push)
- [ ] Logs verificados (sem erros de conexão)
- [ ] Teste de criação de sessão
- [ ] Teste de salvamento de dados
- [ ] Dados persistem após restart do serviço

---

## 🎯 Próximos Passos

1. **Backups Automáticos:**
   - Render Free faz backup diário automático
   - Retenção: 7 dias
   - Para backups manuais: `pg_dump $DATABASE_URL > backup.sql`

2. **Monitoramento:**
   - Configurar alertas de uso de disco (Render dashboard)
   - Monitorar tempo de queries lentas

3. **Otimização:**
   - Criar índices adicionais se necessário
   - Analisar query plans: `EXPLAIN ANALYZE SELECT ...`

---

## 📚 Recursos Úteis

- [PostgreSQL no Render](https://render.com/docs/databases)
- [Node-Postgres Docs](https://node-postgres.com/)
- [PostgreSQL vs SQLite](https://www.sqlite.org/whentouse.html)

---

**Criado para o projeto Show do Melzão** 🎮🏳️‍🌈
