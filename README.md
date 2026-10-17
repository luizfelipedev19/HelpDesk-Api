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
- **Containerização**: Docker / Docker Compose

## Estrutura do projeto

```
Helpdesk/
├── database/
│   └── init.sql              # Schema inicial do banco (tabelas, enums, índices)
├── backend/
│   ├── migrations/           # Migrations incrementais, aplicadas em ordem
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
│   │   └── scripts/          # Scripts utilitários (migrate)
│   └── Dockerfile
└── docker-compose.yml
```

## Pré-requisitos

- Node.js 20+
- Docker e Docker Compose (para rodar via container, incluindo o banco)
- Uma instância PostgreSQL 16, caso não use o Docker Compose

## Variáveis de ambiente

Criar um arquivo `.env` dentro de `backend/` com:

| Variável      | Descrição                                      |
|---------------|-------------------------------------------------|
| `DB_HOST`     | Host do PostgreSQL                               |
| `DB_PORT`     | Porta do PostgreSQL                              |
| `DB_USUARIO`  | Usuário do banco                                 |
| `DB_PASSWORD` | Senha do banco                                   |
| `DB_NAME`     | Nome do banco de dados                           |
| `JWT_SECRET`  | Segredo usado para assinar e validar os tokens JWT |

## Subindo o projeto

### Com Docker Compose (recomendado)

```bash
docker compose up --build
```

Isso sobe o backend (porta `3000`) e o PostgreSQL, já aplicando `database/init.sql` na primeira inicialização do banco.

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

## Autenticação

A API usa JWT. O token é obtido via login e deve ser enviado em todas as rotas protegidas no header:

```
Authorization: Bearer <token>
```

O token carrega `sub` (id do usuário), `role` e `companyId`, usados pelo middleware de autenticação para popular o usuário autenticado em cada requisição e aplicar isolamento por empresa.

Papéis de usuário (`role`): `atendente`, `gestor`, `admin`.

### Login

| Método | Caminho            | Papel aceito | Descrição                              |
|--------|---------------------|--------------|------------------------------------------|
| POST   | `/auth/login`        | `atendente`  | Login de atendente                        |
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
- **ticket_comments** — estrutura já existe no banco, mas ainda sem endpoints (ver [Limitações conhecidas](#limitações-conhecidas)).

## Endpoints

Todas as rotas abaixo, exceto as marcadas como públicas, exigem o header `Authorization: Bearer <token>`.

### Empresas (`/companies`)

| Método | Caminho          | Autenticação | Descrição                     |
|--------|-------------------|--------------|----------------------------------|
| POST   | `/companies`       | Pública       | Cadastra uma nova empresa e seu usuário responsável |
| GET    | `/companies/:id`   | Pública       | Busca uma empresa pelo id       |

### Usuários (`/users`)

Exige papel `admin`.

| Método | Caminho                  | Descrição                         |
|--------|---------------------------|--------------------------------------|
| POST   | `/users`                   | Cria um usuário na empresa do token |
| GET    | `/users`                   | Lista usuários da empresa            |
| GET    | `/users/:id`                | Busca um usuário pelo id             |
| PUT    | `/users/desativar/:id`      | Desativa um usuário                  |

### Categorias (`/categories`)

| Método | Caminho              | Descrição                    |
|--------|------------------------|---------------------------------|
| POST   | `/categories`           | Cria uma categoria              |
| GET    | `/categories`           | Lista categorias da empresa     |
| GET    | `/categories/:id`        | Busca uma categoria pelo id     |
| PUT    | `/categories`           | Atualiza uma categoria          |
| DELETE | `/categories`           | Remove uma categoria            |

### Tickets (`/tickets`)

| Método | Caminho               | Descrição                                         |
|--------|-------------------------|------------------------------------------------------|
| POST   | `/tickets`               | Cria um ticket                                       |
| GET    | `/tickets`               | Lista tickets da empresa                             |
| GET    | `/tickets/:id`            | Busca um ticket pelo id                               |
| GET    | `/tickets/:id/events`     | Histórico de mudanças do ticket (status, prioridade, atribuição) |
| DELETE | `/tickets/delete/:id`     | Remove um ticket                                      |

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

- **Comentários de ticket (`ticket_comments`)**: a tabela existe no banco, mas não há controller, service nem rota implementados ainda.
- **Atualização de ticket**: o service (`ticketService.updateTicket`, com geração de evento de auditoria) já existe, mas ainda não há uma rota HTTP (`PUT /tickets/:id`) ligada a ele.
- **Empresas**: só é possível criar e buscar por id. Não há listagem, atualização ou desativação de empresa.
- **Login de gestor**: o papel `gestor` existe no modelo de usuário, mas nenhuma rota de login aceita esse papel atualmente — só `atendente` (`/auth/login`) e `admin` (`/superadmin/login`).
