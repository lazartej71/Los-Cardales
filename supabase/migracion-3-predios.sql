-- =====================================================================
-- Migración 3: predio, cancha y hora de cada partido.
-- Ejecutar UNA vez en Supabase, después de migracion-2-cuentas.sql:
-- SQL Editor → New query → pegar todo → Run.
-- Solo agrega columnas y reglas: los partidos que ya estaban quedan sin lugar ni hora.
-- Si se corre dos veces, falla al principio ("already exists") y no toca nada.
-- Las canchas de cada predio son las mismas que PREDIOS en src/datos/constantes.js.
-- =====================================================================

begin;

alter table public.partidos
  add column predio text check (predio in ('los_cardales', 'cura_borges')),
  add column cancha smallint,
  add column hora time,
  -- Van los tres datos o ninguno
  add constraint partidos_lugar_completo_check check ((predio is null) = (cancha is null) and (predio is null) = (hora is null)),
  add constraint partidos_cancha_check check (
    cancha is null
    or (predio = 'los_cardales' and cancha in (1, 2, 3, 4, 5, 6, 7))
    or (predio = 'cura_borges' and cancha in (1, 4, 5, 7, 8, 9))
  );

-- Una cancha no puede tener dos partidos a la misma hora en la misma fecha (los postergados no la ocupan)
create unique index partidos_cancha_ocupada_idx on public.partidos (fecha, predio, cancha, hora)
  where predio is not null and not postergado;

commit;
