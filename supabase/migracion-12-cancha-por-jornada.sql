-- =====================================================================
-- Migración 12: la cancha ocupada se controla por jornada, no por número de fecha.
-- Ejecutar UNA vez en Supabase: SQL Editor → New query → pegar todo → Run.
-- No cambia ni borra datos. Si se corre dos veces, no falla ni cambia nada.
-- Las categorías pueden ir desfasadas (Libre recuperó una fecha y juega su 6 el mismo sábado que
-- las demás su 5). La regla de la migración 7 comparaba por número de fecha: no dejaba usar la cancha
-- de un partido de Libre que ya se había jugado, y no veía los choques entre la 6 de Libre y la 5 de
-- las demás. Ahora lo controla la app, que compara los partidos por jugar del mismo sábado.
-- Sigue en la base la regla de los postergados que se recuperan en un día especial.
-- =====================================================================

drop index if exists public.partidos_cancha_ocupada_idx;
