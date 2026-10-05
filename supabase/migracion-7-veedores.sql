-- =====================================================================
-- Migración 7: cuentas de veedores, rojas con tipo y pago del arancel en dos partes.
-- Ejecutar UNA vez en Supabase, después de migracion-6-visitas.sql:
-- SQL Editor → New query → pegar todo → Run.
-- No toca los datos del campeonato. Si se corre dos veces, falla al principio
-- ("already exists") y no cambia nada.
-- =====================================================================

begin;

-- ---------- Rol veedor ----------

-- veedor: desde la cancha carga resultado, W.O., rojas y pagos de los partidos, y nada más
create function public.es_veedor() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.administradores where user_id = (select auth.uid()) and rol = 'veedor'
  );
$$;
grant execute on function public.es_veedor() to authenticated;

alter table public.administradores
  drop constraint administradores_rol_check,
  add constraint administradores_rol_check check (rol in ('admin', 'superadmin', 'veedor'));

-- Un veedor no es admin: todas las reglas "Solo admins" lo dejan afuera
create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.administradores where user_id = (select auth.uid()) and rol <> 'veedor'
  );
$$;

-- ---------- Rojas con tipo y pago en dos partes ----------

-- Las rojas viejas quedan sin tipo
alter table public.expulsiones
  add column tipo text check (tipo in ('doble_amarilla', 'directa'));

-- Un pago por medio (efectivo y transferencia) por equipo en cada partido
drop index public.movimientos_pago_partido_idx;
create unique index movimientos_pago_partido_metodo_idx on public.movimientos (partido_id, equipo_id, metodo)
  where partido_id is not null;

-- ---------- Lo que puede hacer un veedor ----------

-- En un partido, solo el resultado y el W.O.
create function public.validar_cambio_veedor() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select public.es_veedor())
    and to_jsonb(new) - 'goles_local' - 'goles_visitante' - 'ausente'
      is distinct from to_jsonb(old) - 'goles_local' - 'goles_visitante' - 'ausente' then
    raise exception 'Un veedor solo puede cargar el resultado o el W.O.';
  end if;
  return new;
end;
$$;

create trigger partidos_veedor
before update on public.partidos
for each row execute function public.validar_cambio_veedor();

create policy "Veedores cargan resultados" on public.partidos
  for update to authenticated using ((select public.es_veedor())) with check ((select public.es_veedor()));

-- Rojas: las ve todas, las agrega (sin sanción: la pone el organizador) y borra las que todavía no la tienen
create policy "Veedores leen rojas" on public.expulsiones
  for select to authenticated using ((select public.es_veedor()));
create policy "Veedores agregan rojas" on public.expulsiones
  for insert to authenticated
  with check ((select public.es_veedor()) and fechas_suspension is null and fechas_cumplidas = 0);
create policy "Veedores borran rojas sin sanción" on public.expulsiones
  for delete to authenticated using ((select public.es_veedor()) and fechas_suspension is null);

-- Pagos: ve todos (para saber si un equipo debe de antes) y maneja solo los pagos de partidos
create policy "Veedores leen pagos" on public.movimientos
  for select to authenticated using ((select public.es_veedor()));
create policy "Veedores anotan pagos de partidos" on public.movimientos
  for insert to authenticated
  with check ((select public.es_veedor()) and tipo = 'pago' and partido_id is not null);
create policy "Veedores cambian pagos de partidos" on public.movimientos
  for update to authenticated
  using ((select public.es_veedor()) and tipo = 'pago' and partido_id is not null)
  with check ((select public.es_veedor()) and tipo = 'pago' and partido_id is not null);
create policy "Veedores borran pagos de partidos" on public.movimientos
  for delete to authenticated
  using ((select public.es_veedor()) and tipo = 'pago' and partido_id is not null);

commit;
