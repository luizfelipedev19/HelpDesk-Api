create extension if not exists pgcrypto;

create type user_role       as enum ('atendente', 'gestor', 'admin');
create type ticket_status   as enum ('aberto', 'em_atendimento', 'aguardando_cliente', 'resolvido', 'fechado');
create type ticket_priority as enum ('baixa', 'media', 'alta', 'urgente');
create type ticket_source as enum ('manual');

create table if not exists users (
  id_user            uuid primary key default gen_random_uuid(),
  name          varchar(150) not null,
  email         varchar(150) not null unique,
  password_hash varchar(255) not null,
  role          user_role not null,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz
);

create table if not exists categories (
  id_categories         uuid primary key default gen_random_uuid(),
  name       varchar(50) not null unique,
  color      varchar(7)  -- ex.: #FF8800
);

create table if not exists tickets (
  id_ticket           uuid primary key default gen_random_uuid(),
  subject      varchar(150) not null,
  description  text not null,
  status       ticket_status   not null default 'aberto',
  priority     ticket_priority not null default 'media',
  source ticket_source not null default 'manual',
  category_id  uuid references categories(id_categories) on delete set null,
  contact_name varchar(150),
  contact_email varchar(150),
  contact_phone varchar(30),
  created_by uuid references users(id_user) on delete set null,
  assigned_to  uuid references users(id_user) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz,
  closed_at    timestamptz
);

create table if not exists ticket_comments (
  id_comment         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references tickets(id_ticket) on delete cascade,
  author_id  uuid not null references users(id_user),
  body       text not null,
  internal   boolean not null default false, -- nota interna, só a equipe vê
  created_at timestamptz not null default now()
);

-- histórico (audit log): só inserção
create table if not exists ticket_events (
  id_event         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references tickets(id_ticket) on delete cascade,
  actor_id   uuid references users(id_user) on delete set null,
  event_type varchar(50) not null,  -- 'status_changed', 'assigned', 'priority_changed'...
  old_value  text,
  new_value  text,
  created_at timestamptz not null default now()
);

create index idx_tickets_created_by on tickets (created_by);
create index idx_tickets_status_priority on tickets (status, priority, created_at);
create index idx_tickets_assigned_to     on tickets (assigned_to);
create index idx_comments_ticket         on ticket_comments (ticket_id, created_at);
create index idx_events_ticket           on ticket_events (ticket_id, created_at);