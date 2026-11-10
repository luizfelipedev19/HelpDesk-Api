-- Log de ações que precisam sobreviver à remoção do recurso. ticket_events some junto com o ticket
-- (on delete cascade), então exclusões são registradas aqui, sem FK para o ticket.
create table if not exists audit_log (
  id_audit    uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id_company),
  actor_id    uuid references users(id_user) on delete set null,
  action      varchar(50) not null,
  entity_type varchar(50) not null,
  entity_id   uuid not null,
  details     jsonb,
  created_at  timestamptz not null default now()
);

create index idx_audit_company on audit_log (company_id, created_at desc);
