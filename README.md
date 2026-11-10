# Helpdesk API

Sistema de helpdesk multiempresa (multi-tenant): cada empresa cadastrada tem seus próprios usuários, categorias e tickets, isolados entre si por `companyId`. A API é construída em Node.js com Express e TypeScript, com PostgreSQL como banco de dados.

## Sumário

- [Arquitetura](#arquitetura)
- [Stack técnica](#stack-técnica)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Pré-requisitos](#pré-requisitos)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Subindo o projeto](#subindo-o-projeto)
- [Scripts disponíveis](#scripts-disponíveis)
- [Testes](#testes)
- [Autenticação](#autenticação)
- [Modelo de dados](#modelo-de-dados)
- [Endpoints](#endpoints)
- [Tratamento de erros](#tratamento-de-erros)
- [Limitações conhecidas](#limitações-conhecidas)

## Arquitetura

O backend segue separação em camadas:

- **Routes** — mapeiam método HTTP e caminho para um método de controller.
- **Controllers** — leem a requisição (params, body, usuário autenticado), chamam o service e formatam a resposta. Não contêm regra de negócio nem SQL.
- **Services** — concentram a regra de negócio: validações que dependem de estado (ex.: checar se um usuário pertence à empresa), orquestração de múltiplas operações e transações.
- **Repositories** — único lugar que fala com o banco de dados. Não têm regra de negócio, só SQL.
- **Schemas** (Zod) — validam e tipam o corpo das requisições antes de chegar ao controller.
- **Models** — tipos de domínio e funções puras de conversão entre o formato de linha do banco e o formato usado pela aplicação.

Multi-tenancy é reforçado em cada consulta ao banco: praticamente toda query de leitura/escrita filtra também por `company_id`, não só pelo id do recurso, para que uma empresa nunca acesse dado de outra.

## Stack técnica

- **Runtime**: Node.js, TypeScript
- **Framework HTTP**: Express 5
- **Banco de dados**: PostgreSQL 16
- **Validação**: Zod
- **Autenticação**: JWT (`jsonwebtoken`), senhas com `argon2`
- **Rate limiting**: `express-rate-limit`
- **Execução em desenvolvimento**: `tsx`
- **Testes**: `node:test` + `node:assert` (runner nativo do Node), executados via `tsx`
- **Containerização**: Docker / Docker Compose

## Estrutura do projeto

```
Helpdesk/
├── database/
│   └── init.sql              # Schema inicial do banco (tabelas, enums, índices)
├── backend/
│   ├── migrations/           # Migrations incrementais, aplicadas em ordem
│   ├── tests/
│   │   ├── unit/             # Testes unitários (sem banco)
│   │   └── integration/      # Testes de integração (API real + Postgres de teste)
│   ├── src/
│   │   ├── app.ts            # Configuração do Express: middlewares, rate limit, rotas
│   │   ├── server.ts         # Sobe o servidor HTTP
│   │   ├── config/           # Conexão com o banco (pool) e helper de transação
│   │   ├── controllers/      # Um controller por recurso
│   │   ├── routes/           # Um router por recurso
│   │   ├── service/          # Regra de negócio
│   │   ├── repository/       # Acesso ao banco (SQL)
│   │   ├── schema/           # Validação de entrada (Zod)
│   │   ├── model/            # Tipos de domínio e mapeamento linha-do-banco → entidade
│   │   ├── middleware/       # Autenticação, autorização, tratamento de erro
│   │   ├── errors/           # Classe de erro de aplicação (AppError)
│   │   └── scripts/          # Scripts utilitários (migrate, seed-admin)
│   ├── tsconfig.json         # Build (só src/)
│   ├── tsconfig.test.json    # Typecheck de src/ + tests/
│   ├── .env.example          # Modelo do .env de desenvolvimento
│   ├── .env.test.example     # Modelo do .env.test (banco de testes)
│   └── Dockerfile
└── docker-compose.yml
```

## Pré-requisitos

- Node.js 20+
- Docker e Docker Compose (para rodar via container, incluindo o banco)
- Uma instância PostgreSQL 16, caso não use o Docker Compose

## Variáveis de ambiente

Copiar `backend/.env.example` para `backend/.env` e preencher. Variáveis:

| Variável      | Descrição                                      |
|---------------|-------------------------------------------------|
| `DB_HOST`     | Host do PostgreSQL                               |
| `DB_PORT`     | Porta do PostgreSQL                              |
| `DB_USUARIO`  | Usuário do banco                                 |
| `DB_PASSWORD` | Senha do banco                                   |
| `DB_NAME`     | Nome do banco de dados                           |
| `JWT_SECRET`  | Segredo usado para assinar e validar os tokens JWT |
| `SEED_*`      | Só para `npm run seed`: `SEED_COMPANY_NAME`, `SEED_COMPANY_CNPJ`, `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` |

Os testes de integração usam um arquivo separado, `backend/.env.test` (ver [Testes](#testes)).

## Subindo o projeto

### Com Docker Compose (recomendado)

```bash
docker compose up --build
```

Isso sobe o backend (porta `3000`) e o PostgreSQL. O `database/init.sql` cria o schema base na primeira inicialização do banco e o container do backend aplica as migrations (`npm run migrate`) antes de subir.

### Localmente

```bash
cd backend
npm install
npm run migrate   # aplica as migrations pendentes em migrations/
npm run dev        # sobe o servidor com reload automático
```

## Scripts disponíveis

Executados a partir de `backend/`:

| Script           | Comando               | Descrição                                               |
|------------------|------------------------|----------------------------------------------------------|
| `dev`            | `npm run dev`          | Sobe o servidor em modo desenvolvimento, com reload       |
| `build`          | `npm run build`        | Compila o TypeScript para `dist/`                         |
| `start`          | `npm start`            | Executa a versão compilada (`dist/server.js`)              |
| `migrate`        | `npm run migrate`      | Aplica as migrations pendentes de `migrations/`, em ordem  |
| `seed`           | `npm run seed`         | Cria empresa + admin inicial a partir das variáveis `SEED_*` (idempotente) |
| `test`           | `npm test`             | Roda unitários e integração                                |
| `test:unit`      | `npm run test:unit`    | Testes unitários (`tests/unit`), sem banco                  |
| `test:integration` | `npm run test:integration` | Testes de integração (`tests/integration`), exigem o banco de teste |
| `typecheck`      | `npm run typecheck`    | Checa os tipos de `src` e `tests`                           |

## Testes

Há dois tipos de teste, ambos com o runner nativo do Node (`node:test`), sem biblioteca extra.

| Tipo | Pasta | Precisa de banco? | Velocidade |
|------|-------|-------------------|------------|
| Unitário | `backend/tests/unit/` | Não | ~2 s |
| Integração | `backend/tests/integration/` | Sim (Postgres de teste) | depende do banco |

### Rodando

```bash
# unitários: não exigem nada além do npm install
cd backend
npm run test:unit

# integração: sobe o banco de teste e roda tudo
docker compose --profile test up -d db_test
cp .env.test.example .env.test    # uma vez
npm test                          # unitários + integração
```

`npm run test:integration` aplica as migrations no banco de teste antes de rodar os arquivos, um por vez (`--test-concurrency=1`). `npm run typecheck` confere os tipos de `src/` e `tests/` (o `tsc` do build só olha `src/`).

O banco de teste (`db_test`, porta `5433`) é descartável: fica em memória (`tmpfs`) e some ao parar o container. Os testes de integração **se recusam a rodar** se `DB_NAME` não terminar em `_test`, para nunca tocarem no banco de desenvolvimento.

### Testes unitários

Testam funções isoladas, sem rede nem banco. Os repositories são substituídos por mocks (`mock.method`).

| Arquivo | O que cobre |
|---------|-------------|
| `*.schema.test.ts` | Regras de entrada (Zod): normalização, limites, enums, campos extras, UUIDs, paginação |
| `models.test.ts` | Mapeadores linha-do-banco → entidade; `toPublicUser` nunca expõe `passwordHash` |
| `ticket.model.test.ts` | `diffTicket` (eventos de auditoria) e `canModifyTicket` (permissão do atendente) |
| `cnpj.test.ts` | CNPJ numérico e alfanumérico |
| `middleware.test.ts` | `authenticate`, `authorize`, `errorMiddleware`, `AppError` |
| `*.service.test.ts` | Regras de negócio de auth, usuários, categorias, empresas, tickets, eventos e comentários |

### Testes de integração

Sobem o `app` em uma porta efêmera e chamam a API com `fetch`, contra o Postgres de teste.

| Arquivo | O que cobre |
|---------|-------------|
| `tenant-isolation.test.ts` | Empresa B não lê, altera, apaga nem comenta em dados da A; sem atribuição entre empresas |
| `permissions.test.ts` | Regras de atendente, gestor e admin; delete por qualquer papel com registro no `/audit` |
| `auth.test.ts` | Login por rota, usuário/empresa desativados caem na hora, mudança de papel sem novo login |
| `users.test.ts` | CRUD de usuários, hash argon2, e-mail único, paginação, desativação |
| `categories.test.ts` | CRUD de categorias, unicidade por empresa, categoria apagada não apaga tickets |
| `tickets.test.ts` | Criação, listagem paginada, update com eventos, `closed_at`, delete com `audit_log`, comentários |
| `companies.test.ts` | Cadastro, CNPJ/e-mail duplicados, `/companies/me`, edição só por admin |
| `api-robustness.test.ts` | `/health`, rotas sem token, JSON inválido, formato de erro e rate limits (login e API) |

`helpers.ts` cria empresas e usuários direto no banco e assina os JWTs, para que os testes não esbarrem nos rate limits de cadastro e de login. Cada teste usa uma empresa nova, então não há limpeza entre eles.

### Escrevendo um teste novo

- Função pura (sem banco): `tests/unit/<nome>.test.ts`, com os repositories mockados se for um service.
- Comportamento que passa por SQL, permissão ou isolamento entre empresas: `tests/integration/`, usando `createTenant()` do `helpers.ts`.
- Ao corrigir um bug, escreva primeiro o teste que o reproduz.
- Cuidado com o rate limit geral da API (60 req/min por empresa para atendente, 100 para admin): em arquivos com muitas requisições, crie uma empresa nova em vez de reaproveitar.

## Autenticação

A API usa JWT. O token é obtido via login e deve ser enviado em todas as rotas protegidas no header:

```
Authorization: Bearer <token>
```

O token carrega `sub` (id do usuário), `role` e `companyId`, usados pelo middleware de autenticação para popular o usuário autenticado em cada requisição e aplicar isolamento por empresa.

Papéis de usuário (`role`):

| Papel       | Pode                                                                                      |
|-------------|----------------------------------------------------------------------------------------------|
| `atendente` | Criar/ver tickets e comentar; alterar apenas tickets seus ou sem responsável (fila), atribuindo só a si mesmo ou devolvendo à fila |
| `gestor`    | Tudo do atendente, em tickets de qualquer pessoa (inclusive reatribuir); gerir categorias; listar usuários; ver `/audit` |
| `admin`     | Tudo do gestor, mais criar/desativar usuários e editar/desativar a empresa                    |

Todo request autenticado confere no banco se usuário e empresa continuam ativos e usa o papel atual do banco, então desativar ou mudar papel vale imediatamente, sem esperar o token expirar.

### Login

| Método | Caminho            | Papel aceito | Descrição                              |
|--------|---------------------|--------------|------------------------------------------|
| POST   | `/auth/login`        | `atendente`, `gestor` | Login de atendente ou gestor     |
| POST   | `/superadmin/login`  | `admin`      | Login de administrador                    |

Corpo da requisição (ambos):

```json
{
  "email": "usuario@empresa.com",
  "password": "senha"
}
```

Resposta:

```json
{
  "token": "<jwt>"
}
```

Essas rotas têm rate limit duplo: por IP (`30` tentativas / 15 min) e por combinação IP + e-mail (`5` tentativas / 15 min), para mitigar força bruta.

## Modelo de dados

Tabelas principais (ver `database/init.sql` e `backend/migrations/`):

- **companies** — empresa (tenant). Cada empresa tem seu próprio conjunto de usuários, categorias e tickets.
- **users** — usuários do sistema, vinculados a uma empresa (`company_id`), com papel (`role`) e flag `active`.
- **categories** — categorias de ticket, únicas por empresa.
- **tickets** — chamados. Têm empresa, categoria, criador (`created_by`), responsável (`assigned_to`, pode ficar nulo — fila sem dono), status, prioridade, origem e dados de contato do cliente final.
- **ticket_events** — trilha de auditoria de um ticket: toda mudança de `status`, `priority` ou `assignedTo` feita via atualização gera um registro aqui, com valor antigo e novo.
- **audit_log** — registro de ações que precisam sobreviver à remoção do recurso (hoje: `ticket_deleted`, com snapshot do ticket). Não tem FK para o ticket, porque `ticket_events` some em cascata quando o ticket é apagado.
- **ticket_comments** — comentários de um ticket, com autor e flag `internal` (nota interna). Não tem `company_id`: o isolamento por empresa é validado via ticket.

## Endpoints

Todas as rotas abaixo, exceto as marcadas como públicas, exigem o header `Authorization: Bearer <token>`.

### Empresas (`/companies`)

| Método | Caminho                  | Autenticação | Descrição                                           |
|--------|---------------------------|--------------|--------------------------------------------------------|
| POST   | `/companies`               | Pública       | Cadastra uma nova empresa e seu usuário responsável (admin) |
| GET    | `/companies/me`            | Token         | Dados da empresa do token                              |
| PUT    | `/companies/me`            | `admin`       | Atualiza o nome da empresa (`{ "companyName": "..." }`) |
| PUT    | `/companies/me/desativar`  | `admin`       | Desativa a empresa; novos logins passam a ser recusados |

### Usuários (`/users`)

Listar e buscar: `admin` ou `gestor`. Criar e desativar: apenas `admin`.

| Método | Caminho                  | Descrição                         |
|--------|---------------------------|--------------------------------------|
| POST   | `/users`                   | Cria um usuário na empresa do token |
| GET    | `/users`                   | Lista usuários da empresa            |
| GET    | `/users/:id`                | Busca um usuário pelo id             |
| PUT    | `/users/desativar/:id`      | Desativa um usuário                  |

### Categorias (`/categories`)

Leitura: qualquer papel. Criar, atualizar e remover: `admin` ou `gestor`.

| Método | Caminho              | Descrição                    |
|--------|------------------------|---------------------------------|
| POST   | `/categories`           | Cria uma categoria              |
| GET    | `/categories`           | Lista categorias da empresa     |
| GET    | `/categories/:id`        | Busca uma categoria pelo id     |
| PUT    | `/categories/:id`        | Atualiza nome e/ou cor (`#RRGGBB`) |
| DELETE | `/categories/:id`        | Remove uma categoria            |

### Tickets (`/tickets`)

| Método | Caminho               | Descrição                                         |
|--------|-------------------------|------------------------------------------------------|
| POST   | `/tickets`               | Cria um ticket                                       |
| GET    | `/tickets?limit=50&offset=0` | Lista tickets da empresa, mais recentes primeiro (limit máx. 100) |
| GET    | `/tickets/:id`            | Busca um ticket pelo id                               |
| PUT    | `/tickets/:id`            | Atualiza `status`, `priority` e/ou `assignedTo` (`null` devolve à fila); gera eventos de auditoria |
| GET    | `/tickets/:id/events`     | Histórico de mudanças do ticket (status, prioridade, atribuição) |
| GET    | `/tickets/:id/comments`   | Lista os comentários do ticket, do mais antigo ao mais novo |
| POST   | `/tickets/:id/comments`   | Adiciona comentário: `{ "body": "texto", "internal": false }` (autor vem do token) |
| DELETE | `/tickets/delete/:id`     | Remove um ticket (qualquer papel); registra a ação e um snapshot do ticket em `audit_log` |

Corpo da requisição de criação (`POST /tickets`):

```json
{
  "subject": "string",
  "description": "string",
  "categoryId": "uuid",
  "assignedTo": "uuid | omitido (fica na fila, sem responsável)",
  "contactName": "string",
  "contactEmail": "string",
  "contactPhone": "string",
  "priority": "BAIXA | MEDIA | ALTA | URGENTE",
  "status": "ABERTO | EM_ATENDIMENTO | AGUARDANDO_CLIENTE | RESOLVIDO | FECHADO",
  "source": "MANUAL"
}
```

`companyId` e `createdBy` nunca são informados pelo cliente da API: são extraídos do usuário autenticado (token). Se `assignedTo` for informado, o usuário referenciado precisa existir e pertencer à mesma empresa de quem está criando o ticket.

### Auditoria (`/audit`)

| Método | Caminho                      | Descrição                                                   |
|--------|--------------------------------|----------------------------------------------------------------|
| GET    | `/audit?limit=50&offset=0`     | `admin`/`gestor`: ações registradas da empresa, mais recentes primeiro (hoje: `ticket_deleted`) |

## Tratamento de erros

Toda resposta de erro segue o formato:

```json
{ "message": "descrição do erro" }
```

Erros de validação de corpo de requisição (Zod) retornam `400` com detalhamento por campo:

```json
{
  "message": "Dados inválidos",
  "errors": [
    { "field": "contactEmail", "message": "Invalid email" }
  ]
}
```

## Limitações conhecidas

- **Atualização de ticket**: só `status`, `priority` e `assignedTo` são editáveis; assunto, descrição e dados de contato não.
- **Sem refresh token**: o JWT vive 8h; a revogação é feita pela checagem no banco a cada request (uma query extra por requisição, sem cache).
- **Testes de integração**: exigem o Postgres de teste rodando; não há pipeline de CI configurado.
