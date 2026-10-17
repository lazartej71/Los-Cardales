-- =====================================================================
-- Migración 10a: Fútbol 7 (estructura y permisos).
-- Ejecutar UNA vez en Supabase, después de migracion-9-bajas.sql y ANTES de publicar el código
-- de Fútbol 7: SQL Editor → New query → pegar todo → Run.
-- No toca los datos del campeonato: todo lo que hay queda en Fútbol 11. Los datos de Fútbol 7
-- los carga después la migración 10b. Si se corre dos veces, falla al principio
-- ("already exists") y no cambia nada.
-- Las canchas de Fútbol 7 son las mismas que PREDIOS (canchasF7) en src/datos/constantes.js: en la
-- base llevan 21 y más (no chocan con las de Fútbol 11) y en pantalla se ven como 1, 2, 3.
-- =====================================================================

begin;

-- ---------- Modalidad y arancel de cada categoría ----------

-- La modalidad sale de la categoría: zonas, equipos y partidos la heredan
alter table public.categorias
  add column modalidad text not null default 'f11' check (modalidad in ('f11', 'f7')),
  -- Vacío: en Fútbol 11 vale el arancel de configuracion; en Fútbol 7, no se cobra hasta que se cargue
  add column arancel integer check (arancel between 0 and 10000000);

-- Puede haber una "Libre" en cada modalidad
alter table public.categorias
  drop constraint categorias_nombre_key,
  add constraint categorias_modalidad_nombre_key unique (modalidad, nombre);

-- Vacía: la cuenta ve y toca las dos modalidades
alter table public.administradores
  add column modalidad text check (modalidad in ('f11', 'f7'));

-- ---------- Canchas de Fútbol 7 ----------

alter table public.partidos
  drop constraint partidos_cancha_check,
  add constraint partidos_cancha_check check (
    cancha is null
    or (predio = 'los_cardales' and cancha in (1, 2, 3, 4, 5, 6, 7, 21, 22))
    or (predio = 'cura_borges' and cancha in (1, 4, 5, 6, 7, 8, 9, 21, 22, 23))
  );

-- La de la migración 9, más: la cancha tiene que ser de la modalidad del partido (las de Fútbol 7, de la 21 en adelante)
create or replace function public.validar_partido() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1
    from public.equipos e
    join public.zonas z on z.id = e.zona_id
    where e.id in (new.local_id, new.visitante_id)
      and z.categoria_id <> new.categoria_id
  ) then
    raise exception 'Los dos equipos tienen que ser de la categoría del partido';
  end if;
  if (tg_op = 'INSERT' or new.local_id is distinct from old.local_id or new.visitante_id is distinct from old.visitante_id)
    and exists (select 1 from public.equipos e where e.id in (new.local_id, new.visitante_id) and e.baja) then
    raise exception 'No se puede armar un partido con un equipo dado de baja';
  end if;
  if new.cancha is not null and (new.cancha > 20) <> exists (
    select 1 from public.categorias c where c.id = new.categoria_id and c.modalidad = 'f7'
  ) then
    raise exception 'La cancha tiene que ser de la modalidad del partido';
  end if;
  return new;
end;
$$;

-- El cambio del arancel de una categoría queda en el registro de actividad
create trigger categorias_actividad
after insert or update or delete on public.categorias
for each row execute function public.registrar_actividad();

-- ---------- Permisos por modalidad ----------

-- La modalidad de quien consulta, o vacío si ve las dos (superadmin, admin sin restricción, veedor)
create function public.modalidad_admin() returns text
language sql stable security definer set search_path = '' as $$
  select modalidad from public.administradores where user_id = (select auth.uid());
$$;

-- ¿La cuenta puede tocar esta fila? Sí, si no tiene modalidad o si la fila es de la suya
create function public.puede_categoria(categoria smallint) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.modalidad_admin() is null
    or exists (select 1 from public.categorias c where c.id = categoria and c.modalidad = public.modalidad_admin());
$$;

create function public.puede_zona(zona smallint) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.modalidad_admin() is null
    or exists (
      select 1 from public.zonas z join public.categorias c on c.id = z.categoria_id
      where z.id = zona and c.modalidad = public.modalidad_admin()
    );
$$;

create function public.puede_equipo(equipo bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.modalidad_admin() is null
    or exists (
      select 1 from public.equipos e
      join public.zonas z on z.id = e.zona_id
      join public.categorias c on c.id = z.categoria_id
      where e.id = equipo and c.modalidad = public.modalidad_admin()
    );
$$;

create function public.puede_partido(partido bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.modalidad_admin() is null
    or exists (
      select 1 from public.partidos p join public.categorias c on c.id = p.categoria_id
      where p.id = partido and c.modalidad = public.modalidad_admin()
    );
$$;

grant execute on function public.modalidad_admin(), public.puede_categoria(smallint), public.puede_zona(smallint),
  public.puede_equipo(bigint), public.puede_partido(bigint) to anon, authenticated;

-- Reglas restrictivas: se suman a las de siempre (que no cambian) y las dos tienen que cumplirse
do $$
declare
  par text[];
begin
  -- Lo público lo sigue leyendo cualquiera: se controla solo lo que se escribe
  foreach par slice 1 in array array[
    ['partidos', 'public.puede_categoria(categoria_id)'],
    ['equipos', 'public.puede_zona(zona_id)'],
    ['tabla_inicial', 'public.puede_equipo(equipo_id)'],
    ['zonas', 'public.modalidad_admin() is null']
  ] loop
    execute format('create policy "Modalidad: agregar" on public.%I as restrictive for insert to authenticated '
      'with check (%s)', par[1], par[2]);
    execute format('create policy "Modalidad: cambiar" on public.%I as restrictive for update to authenticated '
      'using (%s) with check (%s)', par[1], par[2], par[2]);
    execute format('create policy "Modalidad: borrar" on public.%I as restrictive for delete to authenticated '
      'using (%s)', par[1], par[2]);
  end loop;
  -- Lo privado, también para leer: cada organizador ve solo lo de su modalidad
  foreach par slice 1 in array array[
    ['delegados', 'public.puede_equipo(equipo_id)'],
    ['movimientos', 'public.puede_equipo(equipo_id)'],
    ['expulsiones', 'public.puede_partido(partido_id)'],
    ['tarjetas', 'public.puede_partido(partido_id)']
  ] loop
    execute format('create policy "Modalidad" on public.%I as restrictive for all to authenticated '
      'using (%s) with check (%s)', par[1], par[2], par[2]);
  end loop;
end;
$$;

-- Categorías: crearlas o borrarlas, solo una cuenta sin modalidad; cambiarlas, solo las de la suya
create policy "Modalidad: agregar" on public.categorias as restrictive for insert to authenticated
  with check (public.modalidad_admin() is null);
create policy "Modalidad: cambiar" on public.categorias as restrictive for update to authenticated
  using (public.puede_categoria(id)) with check (public.puede_categoria(id));
create policy "Modalidad: borrar" on public.categorias as restrictive for delete to authenticated
  using (public.modalidad_admin() is null);

-- Desde la app, una cuenta con modalidad cambia solo el arancel de sus categorías (el SQL Editor, todo)
create function public.validar_cambio_categoria() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') and public.modalidad_admin() is not null
    and to_jsonb(new) - 'arancel' is distinct from to_jsonb(old) - 'arancel' then
    raise exception 'Desde tu cuenta solo se cambia el arancel de la categoría.';
  end if;
  return new;
end;
$$;

create trigger categorias_modalidad
before update on public.categorias
for each row execute function public.validar_cambio_categoria();

-- Ajustes: el nombre del campeonato y el arancel son de Fútbol 11; los criterios de desempate valen
-- para las dos modalidades y los cambia solo una cuenta sin modalidad
create function public.validar_cambio_configuracion() returns trigger
language plpgsql set search_path = '' as $$
declare
  modalidad text;
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  modalidad := public.modalidad_admin();
  if modalidad = 'f7' then
    raise exception 'Tu cuenta es de Fútbol 7: los ajustes de Fútbol 11 los cambia su organizador.';
  end if;
  if modalidad = 'f11' and new.criterios_desempate is distinct from old.criterios_desempate then
    raise exception 'Los criterios de desempate los cambia solo el superadmin.';
  end if;
  return new;
end;
$$;

create trigger configuracion_modalidad
before update on public.configuracion
for each row execute function public.validar_cambio_configuracion();

-- ---------- La cuenta de Franco ----------

update public.administradores set modalidad = 'f11'
where user_id = (select id from auth.users where email = 'franco1@loscardalesfutbol.com');

commit;
