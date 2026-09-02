# 🚀 Guia de Deploy SisFrete Pro (Vercel + Turso libSQL)

Este guia explica como conectar o **SisFrete Pro** ao banco de dados em nuvem **Turso** e publicar o aplicativo (Frontend + Backend) na **Vercel**.

---

## 1. Configurar o Banco de Dados no Turso

Acesse seu painel do Turso: **[https://app.turso.tech/leo-r-b](https://app.turso.tech/leo-r-b)**

### Passo a Passo no Turso:
1. Clique em **Create Database** (ou crie pelo CLI `turso db create sisfrete-db`);
2. Nomeie o banco, por exemplo: `sisfrete-db`;
3. Copie a **Database URL** gerada (exemplo: `libsql://sisfrete-db-leo-r-b.turso.io`);
4. Gere um token de autenticação clicando em **Create Token** (ou `turso db tokens create sisfrete-db`);
5. Copie o **Auth Token** gerado.

### Executar a Migração Inicial das Tabelas para o Turso:
No arquivo `backend/.env`, preencha:
```env
TURSO_DATABASE_URL=libsql://sisfrete-db-leo-r-b.turso.io
TURSO_AUTH_TOKEN=seu_token_gerado_no_turso
```

Em seguida, execute no terminal da pasta `backend`:
```bash
npm run db:push:turso
```
> O script criará automaticamente todas as tabelas fiscais (`fretes`, `motoristas`, `clientes`, `adiantamentos_historico`, `empresa_config`, `users`) e o usuário administrador padrão (`admin@sisfrete.com` / senha: `admin123`).

---

## 2. Fazer o Deploy na Vercel

Acesse seu painel da Vercel: **[https://vercel.com/leonardos-projects-4a30a148](https://vercel.com/leonardos-projects-4a30a148)**

### Opção A: Deploy via Vercel CLI (Direto pelo terminal)
Na pasta raiz do projeto (`sisfrete-pro`), execute:
```bash
npx vercel
```
1. Faça login na sua conta Vercel (`leonardos-projects-4a30a148`);
2. Confirme o deploy das configurações padrão detectadas pelo `vercel.json`;
3. Para publicar em produção:
```bash
npx vercel --prod
```

### Opção B: Deploy via GitHub / Vercel Dashboard
1. Suba o projeto para o seu repositório no GitHub;
2. Na Vercel, clique em **Add New...** ➔ **Project**;
3. Importe o repositório `sisfrete-pro`;
4. Em **Environment Variables** (Variáveis de Ambiente), adicione:
   - `TURSO_DATABASE_URL` = `libsql://sisfrete-db-leo-r-b.turso.io`
   - `TURSO_AUTH_TOKEN` = `<seu_token_turso>`
   - `JWT_SECRET` = `sisfrete_pro_super_secret_jwt_2026`
5. Clique em **Deploy**!

---

## 3. Botão de Redefinição / Limpeza do Banco de Dados

Dentro do sistema:
1. Acesse o menu **Configurações & Acesso**;
2. Clique na aba **Banco de Dados** (exclusiva para Administradores);
3. Na seção **Zona de Perigo**, clique em **Excluir Todos os Dados do Banco**;
4. Digite `LIMPAR BANCO` no modal de segurança para confirmar.
5. **Resultado:** Todos os fretes, clientes e motoristas serão excluídos, mantendo a estrutura do banco e os usuários de acesso intactos.
