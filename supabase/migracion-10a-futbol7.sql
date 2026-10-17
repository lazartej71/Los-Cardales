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

-- ---------- La cuenta de Franco ----------

update public.administradores set modalidad = 'f11'
where user_id = (select id from auth.users where email = 'franco1@loscardalesfutbol.com');

commit;
