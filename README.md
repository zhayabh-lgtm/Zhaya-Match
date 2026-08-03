# Zhaya Match — Guia de Configuração e Integração com Supabase

Este repositório contém o **Zhaya Match**, a experiência de curadoria e recomendação de tamanhos sob medida para a Zhaya. O painel administrativo é alimentado 100% pelo **Supabase** (Database PostgreSQL e Authentication).

---

## 1. Como Criar o Projeto no Supabase

1. Acesse [https://supabase.com](https://supabase.com) e faça login na sua conta.
2. Clique em **"New Project"** (Novo Projeto).
3. Selecione sua organização, escolha um nome para o projeto (ex: `Zhaya Match`) e defina uma senha forte para o banco de dados.
4. Escolha a região mais próxima dos seus clientes (ex: `South America (São Paulo)`).
5. Clique em **"Create new project"** e aguarde a finalização do provisionamento.

---

## 2. Como Executar o Arquivo SQL Inicial

1. No painel do Supabase, acesse a aba **SQL Editor** no menu lateral esquerdo.
2. Clique em **"New Query"**.
3. Abra o arquivo de migração localizado neste repositório em:
   `supabase/migrations/20260731000000_init_zhaya_fit.sql`
4. Copie todo o conteúdo do arquivo SQL e cole no editor do Supabase.
5. Clique no botão **"Run"** (Executar).
6. O script criará todas as tabelas necessárias (`product_types`, `popup_settings`, `text_settings`, `measurement_guides`, `app_settings`), configurará os índices, ativará o Row Level Security (RLS) e inserirá os dados iniciais padrão (seed data).

---

## 3. Como Criar o Usuário Único do Painel no Supabase Auth

O painel administrativo do Zhaya Match é de acesso restrito ao gestor da loja.

1. No painel do Supabase, acesse a seção **Authentication** > **Users**.
2. Clique no botão **"Add user"** e selecione **"Create user"**.
3. Informe o e-mail do gestor (ex: `admin@zhaya.com.br`) e defina uma senha segura.
4. Marque a opção de confirmação automática de e-mail (**Auto Confirm User**), se disponível, para liberar o acesso imediato.
5. Clique em **"Create user"**.

---

## 4. Como Configurar as Variáveis de Ambiente (`.env`)

1. Na raiz do projeto, copie o arquivo `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```
2. No painel do Supabase, acesse **Project Settings** > **API**.
3. Copie a **URL do Projeto** (`Project URL`) e a chave pública **anon / public** (`Project API key`).
4. Preencha o arquivo `.env` com esses valores:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
   ```

---

## 5. Como Rodar o Projeto Localmente

1. Certifique-se de ter o Node.js instalado (v18+).
2. Instale as dependências do projeto:
   ```bash
   npm install
   ```
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. Acesse a aplicação no navegador em `http://localhost:3000`.

---

## 6. Como Testar e Validar o Login e o Salvamento Real dos Dados

### Testando o Login:
1. Acesse a rota `/login` (ex: `http://localhost:3000/login`).
2. Digite o e-mail e a senha criados na etapa 3 no Supabase Auth.
3. Se as credenciais estiverem corretas, você será redirecionado automaticamente para o painel em `/admin/tipos-medidas`.
4. Se o e-mail ou senha forem incorretos, o sistema exibirá uma mensagem clara de erro.

### Testando a Persistência no Supabase:
1. No painel administrativo em `/admin/tipos-medidas`, crie um novo tipo de peça ou edite um tipo existente e clique em **"Salvar Alterações"**.
2. Altere as configurações em `/admin/aparencia` ou `/admin/textos-imagens` e salve.
3. Recarregue a página no navegador (F5).
4. Verifique que as alterações foram mantidas.
5. No painel do Supabase em **Table Editor**, inspecione as tabelas `product_types`, `popup_settings` e `text_settings` para confirmar que as atualizações estão gravadas diretamente no banco PostgreSQL.
