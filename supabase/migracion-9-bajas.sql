-- =====================================================================
-- Migración 9: equipos que se dan de baja (dejan el torneo) y los tres reemplazos de la fecha 3.
-- Ejecutar UNA vez en Supabase, después de migracion-8-escudos.sql:
-- SQL Editor → New query → pegar todo → Run.
-- Lo ya jugado no se toca: los rivales conservan puntos, goles y partidos jugados.
-- Si se corre dos veces, falla al principio ("already exists") y no cambia nada. Si alguno de los
-- equipos que se dan de baja no es el esperado o tiene partidos sin resultado, falla y no cambia nada.
-- =====================================================================

begin;

-- Dado de baja: deja de aparecer en la tabla, pero sus partidos jugados quedan como están
alter table public.equipos add column baja boolean not null default false;

-- Un partido nuevo, o un cambio de equipo en uno viejo, no puede tener un equipo dado de baja.
-- Los partidos viejos se siguen pudiendo corregir (resultado, W.O., lugar).
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
  return new;
end;
$$;

-- Los tres que dejan el torneo antes de la fecha 3
do $$
begin
  if (select count(*) from public.equipos
      where (id, nombre) in ((88, 'GOB GUTIERREZ'), (69, 'LA MALABIA'), (20, 'BARRIO BELGRANO'))) <> 3 then
    raise exception 'Los equipos 88, 69 y 20 no son GOB GUTIERREZ, LA MALABIA y BARRIO BELGRANO: no se cambió nada';
  end if;
  if exists (
    select 1 from public.partidos
    where (local_id in (88, 69, 20) or visitante_id in (88, 69, 20)) and goles_local is null
  ) then
    raise exception 'Uno de los equipos que se dan de baja tiene partidos sin resultado: no se cambió nada';
  end if;
end;
$$;

update public.equipos set baja = true where id in (88, 69, 20);

-- Los que entran en su lugar: sin tabla inicial, arrancan con 0 PJ
insert into public.equipos (zona_id, nombre) values
  (9, 'CHIVERO F.C'),
  (7, 'LA AGUADITA'),
  (2, 'CLUB PASAJE UNIDOS');

commit;
