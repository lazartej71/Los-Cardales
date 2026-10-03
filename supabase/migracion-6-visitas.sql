-- =====================================================================
-- Migración 6: cuántas personas visitan la vista pública cada día.
-- Ejecutar UNA vez en Supabase, después de migracion-5-control.sql:
-- SQL Editor → New query → pegar todo → Run.
-- Solo se guarda un número por día: nada de la persona (ni IP ni nombre).
-- Si se corre dos veces, falla al principio ("already exists") y no cambia nada.
-- =====================================================================

begin;

create table public.visitas (
  dia date primary key,
  personas integer not null default 0 check (personas >= 0)
);

-- Cada navegador avisa una vez por día; suma 1 al día de hoy en hora de Argentina
create function public.sumar_visita() returns void
language sql volatile security definer set search_path = '' as $$
  insert into public.visitas (dia, personas)
  values ((now() at time zone 'America/Argentina/Buenos_Aires')::date, 1)
  on conflict (dia) do update set personas = public.visitas.personas + 1;
$$;
revoke all on function public.sumar_visita() from public;
grant execute on function public.sumar_visita() to anon, authenticated;

-- Solo el superadmin las lee; nadie las cambia a mano (solo la función)
revoke all on public.visitas from anon, authenticated;
grant select on public.visitas to authenticated;
alter table public.visitas enable row level security;
create policy "Solo el superadmin" on public.visitas
  for select to authenticated using ((select public.es_superadmin()));

commit;
