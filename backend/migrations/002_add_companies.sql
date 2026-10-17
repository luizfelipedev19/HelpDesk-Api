create table if not exists companies (
  id_company uuid primary key default gen_random_uuid(),
  name       varchar(150) not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

insert into companies (name) values ('Empresa teste');

alter table users      add column company_id uuid references companies(id_company);
alter table categories add column company_id uuid references companies(id_company);
alter table tickets    add column company_id uuid references companies(id_company);

update users      set company_id = (select id_company from companies limit 1);
update categories set company_id = (select id_company from companies limit 1);
update tickets    set company_id = (select id_company from companies limit 1);

alter table users      alter column company_id set not null;
alter table categories alter column company_id set not null;
alter table tickets    alter column company_id set not null;

-- o nome da categoria passa a ser único por empresa, e não mais global
alter table categories drop constraint categories_name_key;
alter table categories add constraint categories_company_name_key unique (company_id, name);

create index idx_users_company         on users (company_id);
create index idx_tickets_company_queue on tickets (company_id, status, priority, created_at);