-- =====================================================================
-- Migración 4: Cura Borges suma la cancha 6.
-- Ejecutar UNA vez en Supabase, después de migracion-3-predios.sql:
-- SQL Editor → New query → pegar todo → Run.
-- Solo cambia la regla de canchas: no toca ningún partido.
-- Las canchas de cada predio son las mismas que PREDIOS en src/datos/constantes.js.
-- =====================================================================

begin;

alter table public.partidos
  drop constraint partidos_cancha_check,
  add constraint partidos_cancha_check check (
    cancha is null
    or (predio = 'los_cardales' and cancha in (1, 2, 3, 4, 5, 6, 7))
    or (predio = 'cura_borges' and cancha in (1, 4, 5, 6, 7, 8, 9))
  );

commit;
