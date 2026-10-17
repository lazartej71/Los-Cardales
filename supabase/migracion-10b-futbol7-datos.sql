-- =====================================================================
-- Migración 10b: datos de Fútbol 7 (los pasó Gaby). La genera scripts/generar-futbol7.mjs a partir de
-- datos/futbol7-equipos.csv y datos/futbol7-partidos.csv: no se edita a mano.
-- Ejecutar UNA vez en Supabase, después de migracion-10a-futbol7.sql y de publicar el código de Fútbol 7:
-- SQL Editor → New query → pegar todo → Run.
-- Si se corre dos veces, falla al principio (las categorías ya existen) y no cambia nada.
-- =====================================================================

begin;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'categorias' and column_name = 'modalidad'
  ) then
    raise exception 'Falta correr la migración 10a (migracion-10a-futbol7.sql): no se cambió nada';
  end if;
end;
$$;

insert into public.categorias (id, nombre, orden, modalidad, arancel) values
  (6, 'Libre', 6, 'f7', 65000),
  (7, '+30', 7, 'f7', 60000);

insert into public.zonas (id, categoria_id, nombre) values
  (11, 6, 'Zona A'),
  (12, 6, 'Zona B'),
  (13, 7, 'Zona única');

-- Todos en juego: los que se dieron de baja se marcan al final, después de cargar sus partidos
insert into public.equipos (zona_id, nombre) values
  (11, 'LA COLOMBIA FC'),
  (11, 'SAN RAMÓN FC'),
  (11, 'MALA JUNTA'),
  (11, 'PJE LOLA MORA'),
  (11, 'BAJO LA PÓLVORA'),
  (11, 'LOS PIBES FC'),
  (11, 'CRUZEIRO FC'),
  (12, 'LOS AMIGOS'),
  (12, 'TRIANGULITO FC'),
  (12, 'LA JUJUY FC'),
  (12, 'LA BANDA DE ROJAS'),
  (12, 'EL BAJO FC'),
  (12, 'LAPRIDA FC'),
  (12, 'LA 330 FC'),
  (12, 'SMATA FC'),
  (13, 'SAN RAMÓN'),
  (13, 'LA FLORIDA'),
  (13, 'EL CHAÑAR'),
  (13, 'B° SAN MARTIN'),
  (13, '20 DE JUNIO'),
  (13, 'EL BOSQUE FC'),
  (13, 'BOBBY FC'),
  (13, 'CITY FC');

-- Cada equipo se busca por su nombre dentro de la categoría
insert into public.partidos (categoria_id, fecha, local_id, visitante_id, goles_local, goles_visitante, ausente,
  postergado, predio, cancha, hora)
select p.categoria_id::smallint, p.fecha::smallint, l.id, v.id, p.goles_local::smallint, p.goles_visitante::smallint,
  p.ausente::text, p.postergado::boolean, p.predio::text, p.cancha::smallint, p.hora::time
from (values
  (6, 1, 'CRUZEIRO FC', 'PJE LOLA MORA', 4, 2, null, false, 'cura_borges', 21, '14:50'),
  (6, 1, 'LOS AMIGOS', 'LA JUJUY FC', 3, 8, null, false, 'cura_borges', 22, '14:50'),
  (6, 1, 'SAN RAMÓN FC', 'BAJO LA PÓLVORA', 2, 3, null, false, 'cura_borges', 21, '15:50'),
  (6, 1, 'EL BAJO FC', 'LA 330 FC', 3, 6, null, false, 'cura_borges', 22, '15:50'),
  (6, 1, 'MALA JUNTA', 'LA COLOMBIA FC', 2, 2, null, false, 'cura_borges', 23, '15:50'),
  (6, 1, 'SMATA FC', 'LA BANDA DE ROJAS', null, null, null, true, null, null, null),
  (7, 1, 'B° SAN MARTIN', 'LA FLORIDA', 3, 4, null, false, 'cura_borges', 23, '17:00'),
  (7, 1, '20 DE JUNIO', 'SAN RAMÓN', 3, 2, null, false, 'cura_borges', 22, '17:45'),
  (7, 1, 'EL BOSQUE FC', 'EL CHAÑAR', null, null, null, true, null, null, null),
  (6, 2, 'MALA JUNTA', 'SAN RAMÓN FC', 3, 2, null, false, 'cura_borges', 22, '14:45'),
  (6, 2, 'LA JUJUY FC', 'EL BAJO FC', 0, 2, null, false, 'cura_borges', 23, '14:45'),
  (6, 2, 'LA COLOMBIA FC', 'PJE LOLA MORA', 3, 4, null, false, 'cura_borges', 21, '15:50'),
  (6, 2, 'LOS PIBES FC', 'CRUZEIRO FC', 4, 2, null, false, null, null, null),
  (6, 2, 'LA 330 FC', 'LAPRIDA FC', null, null, null, true, null, null, null),
  (7, 2, 'SAN RAMÓN', 'LA FLORIDA', 3, 1, null, false, 'cura_borges', 23, '15:50'),
  (6, 2, 'LOS AMIGOS', 'SMATA FC', 1, 8, null, false, 'los_cardales', 21, '14:45'),
  (7, 2, '20 DE JUNIO', 'EL BOSQUE FC', 4, 4, null, false, 'los_cardales', 22, '14:45'),
  (6, 2, 'TRIANGULITO FC', 'LA BANDA DE ROJAS', 4, 2, null, false, 'los_cardales', 21, '16:10'),
  (7, 2, 'EL CHAÑAR', 'B° SAN MARTIN', 9, 3, null, false, 'los_cardales', 22, '16:10'),
  (6, 3, 'LA COLOMBIA FC', 'SAN RAMÓN FC', 0, 3, null, false, 'cura_borges', 21, '15:30'),
  (6, 3, 'LA JUJUY FC', 'LA BANDA DE ROJAS', 2, 1, null, false, 'cura_borges', 22, '15:30'),
  (6, 3, 'MALA JUNTA', 'PJE LOLA MORA', 2, 1, null, false, 'cura_borges', 23, '15:30'),
  (6, 3, 'BAJO LA PÓLVORA', 'LOS PIBES FC', 4, 5, null, false, 'cura_borges', 21, '16:30'),
  (6, 3, 'EL BAJO FC', 'LAPRIDA FC', null, null, null, true, null, null, null),
  (6, 3, 'LA 330 FC', 'SMATA FC', 3, 1, null, false, 'cura_borges', 23, '16:30'),
  (7, 3, 'SAN RAMÓN', 'BOBBY FC', null, null, null, true, null, null, null),
  (6, 3, 'LOS AMIGOS', 'TRIANGULITO FC', 3, 0, 'visitante', false, 'los_cardales', 21, '15:30'),
  (7, 3, 'EL CHAÑAR', '20 DE JUNIO', 2, 2, null, false, 'los_cardales', 21, '16:20'),
  (7, 3, 'EL BOSQUE FC', 'LA FLORIDA', 3, 0, 'visitante', false, 'los_cardales', 22, '16:20'),
  (7, 3, 'B° SAN MARTIN', 'CITY FC', 1, 6, null, false, 'los_cardales', 22, '17:20')
) as p (categoria_id, fecha, local, visitante, goles_local, goles_visitante, ausente, postergado, predio, cancha, hora)
join public.zonas zl on zl.categoria_id = p.categoria_id::smallint
join public.equipos l on l.zona_id = zl.id and l.nombre = p.local
join public.zonas zv on zv.categoria_id = p.categoria_id::smallint
join public.equipos v on v.zona_id = zv.id and v.nombre = p.visitante;

do $$
begin
  if (select count(*) from public.partidos p join public.categorias c on c.id = p.categoria_id where c.modalidad = 'f7')
    <> 30 then
    raise exception 'No se cargaron los 30 partidos de Fútbol 7: no se cambió nada';
  end if;
end;
$$;

-- Lo ya jugado está cobrado: un pago en efectivo del arancel de su categoría por cada equipo que se presentó
insert into public.movimientos (equipo_id, partido_id, tipo, monto, metodo, fecha, nota)
select e.equipo_id, p.id, 'pago', c.arancel, 'efectivo', '2026-10-17', 'Cobrado antes de pasar F7 al sistema'
from public.partidos p
join public.categorias c on c.id = p.categoria_id
cross join lateral (values (p.local_id, 'local'), (p.visitante_id, 'visitante')) as e (equipo_id, lado)
where c.modalidad = 'f7' and p.goles_local is not null and p.ausente is distinct from e.lado;

commit;
