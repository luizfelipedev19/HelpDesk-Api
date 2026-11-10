-- A API trabalha com os valores em MAIÚSCULAS (ABERTO, MEDIA, MANUAL...), mas o init.sql criou os enums em
-- minúsculas, o que faria todo insert de ticket falhar. Renomeia só o que ainda estiver em minúsculas,
-- então é seguro rodar em bancos que já foram ajustados na mão.
do $$
declare
  t record;
begin
  for t in
    select ty.typname, e.enumlabel
    from pg_enum e
    join pg_type ty on ty.oid = e.enumtypid
    where ty.typname in ('ticket_status', 'ticket_priority', 'ticket_source')
      and e.enumlabel <> upper(e.enumlabel)
  loop
    execute format('alter type %I rename value %L to %L', t.typname, t.enumlabel, upper(t.enumlabel));
  end loop;
end $$;
