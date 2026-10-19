-- =====================================================================
-- Migración 11: W.O. doble (no se presentó ninguno de los dos equipos).
-- Ejecutar UNA vez en Supabase, después de la 10b y ANTES de publicar el código del W.O. doble:
-- SQL Editor → New query → pegar todo → Run.
-- No cambia ni borra datos. Si se corre dos veces, no falla ni cambia nada.
-- El partido queda 0 a 0 en la base, pero la tabla les suma a los dos solo el partido jugado
-- (sin ganado, empatado ni perdido, sin goles y sin puntos) y ninguno paga el arancel.
-- =====================================================================

begin;

alter table public.partidos
  drop constraint partidos_ausente_check,
  drop constraint partidos_wo_check,
  add constraint partidos_ausente_check check (ausente in ('local', 'visitante', 'ambos')),
  add constraint partidos_wo_check check (
    ausente is null
    or (not postergado and (
      (ausente = 'visitante' and goles_local = 3 and goles_visitante = 0)
      or (ausente = 'local' and goles_local = 0 and goles_visitante = 3)
      or (ausente = 'ambos' and goles_local = 0 and goles_visitante = 0)
    ))
  );

-- La de la migración 2, más: en un W.O. doble no paga ninguno
create or replace function public.validar_movimiento() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.partido_id is not null and not exists (
    select 1 from public.partidos p
    where p.id = new.partido_id
      and p.ausente is distinct from 'ambos'
      and ((new.equipo_id = p.local_id and p.ausente is distinct from 'local')
        or (new.equipo_id = p.visitante_id and p.ausente is distinct from 'visitante'))
  ) then
    raise exception 'El pago tiene que ser de un equipo que jugó ese partido';
  end if;
  return new;
end;
$$;

commit;
