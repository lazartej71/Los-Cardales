/**
 * Fútbol 7 desde los archivos de datos (datos/futbol7-equipos.csv): categorías, zonas y equipos que pasó
 * Gaby. Lo usan la simulación (mientras la base real no tenga F7) y el generador de la migración 10b.
 * Funciones puras.
 */

import { PREDIOS } from '../src/datos/constantes.js';
import { mismoNombre } from '../src/logica/bajas.js';
import { hayFutbol7 } from '../src/logica/modalidades.js';

// Arancel por equipo y partido de cada categoría de Fútbol 7 (lo que cobra Gaby)
export const ARANCELES_F7 = { Libre: 65000, '+30': 60000 };

// Los ids siguen a los de Fútbol 11 (categorías 1 a 5, zonas 1 a 10)
const PRIMERA_CATEGORIA = 6;
const PRIMERA_ZONA = 11;

// CSV simple (los nombres no llevan comas): una fila por línea, con los nombres del encabezado
export function leerCsv(texto) {
  const lineas = texto.split(/\r?\n/).map((l) => l.trim());
  const [encabezado, ...filas] = lineas.filter(Boolean);
  const columnas = encabezado.split(',').map((c) => c.trim());
  return filas.map((linea) => {
    const valores = linea.split(',').map((v) => v.trim());
    if (valores.length !== columnas.length) {
      const numero = lineas.indexOf(linea) + 1;
      throw new Error(`La fila ${numero} tiene ${valores.length} columnas y el encabezado ${columnas.length}.`);
    }
    return Object.fromEntries(columnas.map((c, i) => [c, valores[i]]));
  });
}

const numeroOVacio = (texto) => (texto === '' || texto === undefined ? null : Number(texto));
const PRIMERA_CANCHA_F7 = 21;

/**
 * Una fila del CSV de partidos (como la pasa Gaby: predio por su nombre, cancha 1, 2 o 3) → el partido
 * listo para la base (cancha de Fútbol 7 con el número de la base: 21, 22…), o los errores que tenga.
 */
function armarPartido(fila, equipos) {
  const errores = [];
  const fecha = Number(fila.fecha);
  const delEquipo = (nombre) => {
    const equipo = equipos.find((e) => e.categoria === fila.categoria && mismoNombre(e.nombre, nombre));
    if (!equipo) errores.push(`Fecha ${fecha}: ${nombre} no es un equipo de ${fila.categoria}.`);
    return equipo?.nombre ?? nombre;
  };
  const [local, visitante] = [delEquipo(fila.local), delEquipo(fila.visitante)];

  let lugar = { predio: null, cancha: null, hora: null };
  if (fila.predio) {
    const predio = PREDIOS.find((p) => p.id === fila.predio || mismoNombre(p.nombre, fila.predio));
    const cancha = Number(fila.cancha) + PRIMERA_CANCHA_F7 - 1;
    if (!predio) errores.push(`Fecha ${fecha}: no existe el predio ${fila.predio}.`);
    else if (!predio.canchasF7.includes(cancha)) {
      errores.push(`Fecha ${fecha}: ${predio.nombre} no tiene la cancha ${fila.cancha} de Fútbol 7.`);
    } else lugar = { predio: predio.id, cancha, hora: fila.hora };
  }

  const ausente = ['local', 'visitante'].includes(fila.ausente) ? fila.ausente : null;
  let [golesLocal, golesVisitante] = [numeroOVacio(fila.goles_local), numeroOVacio(fila.goles_visitante)];
  if (ausente) [golesLocal, golesVisitante] = ausente === 'local' ? [0, 3] : [3, 0];
  else if ((golesLocal === null) !== (golesVisitante === null)) {
    errores.push(`Fecha ${fecha}: ${local} vs ${visitante} tiene el resultado a medias.`);
  }
  const partido = {
    categoria: fila.categoria,
    fecha,
    local,
    visitante,
    golesLocal,
    golesVisitante,
    ausente,
    postergado: fila.postergado === 'si',
    ...lugar,
  };
  return { partido, errores };
}

/**
 * equipos: filas { categoria, zona, equipo, baja ('si' o vacío) }. partidos (opcional): filas
 * { categoria, fecha, local, visitante, goles_local, goles_visitante, ausente, postergado, predio, cancha, hora }.
 * Devuelve las categorías (desde la 6) y zonas (desde la 11) en el orden en que aparecen, los equipos sin
 * id, los partidos y los errores que impiden cargarlos.
 */
export function armarFutbol7({ equipos: filas, partidos: filasPartidos = [] }) {
  const categorias = [];
  const zonas = [];
  const equipos = [];
  const errores = [];

  for (const fila of filas) {
    let categoria = categorias.find((c) => c.nombre === fila.categoria);
    if (!categoria) {
      const id = PRIMERA_CATEGORIA + categorias.length;
      const arancel = ARANCELES_F7[fila.categoria] ?? null;
      if (arancel === null) errores.push(`La categoría ${fila.categoria} no tiene arancel (ARANCELES_F7).`);
      categoria = { id, nombre: fila.categoria, orden: id, modalidad: 'f7', arancel };
      categorias.push(categoria);
    }
    if (!zonas.some((z) => z.categoriaId === categoria.id && z.nombre === fila.zona)) {
      zonas.push({ id: PRIMERA_ZONA + zonas.length, categoriaId: categoria.id, nombre: fila.zona });
    }
    const anterior = equipos.find((e) => e.categoria === fila.categoria && mismoNombre(e.nombre, fila.equipo));
    if (anterior && anterior.zona === fila.zona) {
      errores.push(`${fila.equipo} repite a ${anterior.nombre} en ${fila.categoria}.`);
    } else if (anterior) {
      errores.push(`${fila.equipo} está en dos zonas de ${fila.categoria} (${anterior.zona} y ${fila.zona}).`);
    }
    equipos.push({ categoria: fila.categoria, zona: fila.zona, nombre: fila.equipo, baja: fila.baja === 'si' });
  }
  const partidos = filasPartidos.map((fila) => {
    const armado = armarPartido(fila, equipos);
    errores.push(...armado.errores);
    return armado.partido;
  });
  return { categorias, zonas, equipos, partidos, errores };
}

// ---------- Migración 10b ----------

const texto = (valor) => (valor === null ? 'null' : `'${String(valor).replace(/'/g, "''")}'`);
const valor = (v) => (v === null ? 'null' : typeof v === 'string' ? texto(v) : String(v));
const lista = (filas) => filas.map((f) => `  (${f.map(valor).join(', ')})`).join(',\n');

/**
 * El SQL de la migración 10b: categorías, zonas y equipos de Fútbol 7, los partidos ya jugados (con su
 * lugar y resultado) y un pago en efectivo por cada equipo que se presentó en un partido jugado (Gaby ya
 * cobró esas fechas), con la fecha `cobradoEl`. Al final da de baja a los que dejaron el torneo.
 */
export function sqlFutbol7({ categorias, zonas, equipos, partidos }, { cobradoEl }) {
  const categoriaId = (nombre) => categorias.find((c) => c.nombre === nombre).id;
  const zonaId = (e) => zonas.find((z) => z.categoriaId === categoriaId(e.categoria) && z.nombre === e.zona).id;
  const bajas = equipos.filter((e) => e.baja);
  const partes = [
    `-- =====================================================================
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
$$;`,
    `insert into public.categorias (id, nombre, orden, modalidad, arancel) values
${lista(categorias.map((c) => [c.id, c.nombre, c.orden, c.modalidad, c.arancel]))};`,
    `insert into public.zonas (id, categoria_id, nombre) values
${lista(zonas.map((z) => [z.id, z.categoriaId, z.nombre]))};`,
    `-- Todos en juego: los que se dieron de baja se marcan al final, después de cargar sus partidos
insert into public.equipos (zona_id, nombre) values
${lista(equipos.map((e) => [zonaId(e), e.nombre]))};`,
  ];
  if (partidos.length) {
    partes.push(
      `-- Cada equipo se busca por su nombre dentro de la categoría
insert into public.partidos (categoria_id, fecha, local_id, visitante_id, goles_local, goles_visitante, ausente,
  postergado, predio, cancha, hora)
select p.categoria_id::smallint, p.fecha::smallint, l.id, v.id, p.goles_local::smallint, p.goles_visitante::smallint,
  p.ausente::text, p.postergado::boolean, p.predio::text, p.cancha::smallint, p.hora::time
from (values
${lista(
  partidos.map((p) => [
    categoriaId(p.categoria),
    p.fecha,
    p.local,
    p.visitante,
    p.golesLocal,
    p.golesVisitante,
    p.ausente,
    p.postergado,
    p.predio,
    p.cancha,
    p.hora,
  ])
)}
) as p (categoria_id, fecha, local, visitante, goles_local, goles_visitante, ausente, postergado, predio, cancha, hora)
join public.zonas zl on zl.categoria_id = p.categoria_id::smallint
join public.equipos l on l.zona_id = zl.id and l.nombre = p.local
join public.zonas zv on zv.categoria_id = p.categoria_id::smallint
join public.equipos v on v.zona_id = zv.id and v.nombre = p.visitante;

do $$
begin
  if (select count(*) from public.partidos p join public.categorias c on c.id = p.categoria_id where c.modalidad = 'f7')
    <> ${partidos.length} then
    raise exception 'No se cargaron los ${partidos.length} partidos de Fútbol 7: no se cambió nada';
  end if;
end;
$$;`,
      `-- Lo ya jugado está cobrado: un pago en efectivo del arancel de su categoría por cada equipo que se presentó
insert into public.movimientos (equipo_id, partido_id, tipo, monto, metodo, fecha, nota)
select e.equipo_id, p.id, 'pago', c.arancel, 'efectivo', ${texto(cobradoEl)}, 'Cobrado antes de pasar F7 al sistema'
from public.partidos p
join public.categorias c on c.id = p.categoria_id
cross join lateral (values (p.local_id, 'local'), (p.visitante_id, 'visitante')) as e (equipo_id, lado)
where c.modalidad = 'f7' and p.goles_local is not null and p.ausente is distinct from e.lado;`
    );
  }
  if (bajas.length) {
    partes.push(
      `update public.equipos set baja = true
where (zona_id, nombre) in (
${lista(bajas.map((e) => [zonaId(e), e.nombre]))}
);`
    );
  }
  partes.push('commit;');
  return `${partes.join('\n\n')}\n`;
}

// Las canchas de Fútbol 7 en orden y tres turnos: los lugares de la fecha de prueba de la simulación
const LUGARES_DE_PRUEBA = ['15:30', '16:30', '17:30'].flatMap((hora) =>
  PREDIOS.flatMap((p) => p.canchasF7.map((cancha) => ({ predio: p.id, cancha, hora })))
);

/**
 * Simulación: si los datos todavía no tienen Fútbol 7, le suma el de Gaby (ids de equipo después del mayor)
 * y una fecha 1 de prueba sin resultados: en cada zona, 1.º contra 2.º, 3.º contra 4.º… (sin los dados de baja).
 */
export function sumarFutbol7Simulado(datos, armado) {
  if (hayFutbol7(datos.categorias)) return datos;
  let equipoId = Math.max(0, ...datos.equipos.map((e) => e.id));
  let partidoId = Math.max(0, ...datos.partidos.map((p) => p.id));
  const categoriaId = (nombre) => armado.categorias.find((c) => c.nombre === nombre).id;
  const zonaId = (e) => armado.zonas.find((z) => z.categoriaId === categoriaId(e.categoria) && z.nombre === e.zona).id;
  const equipos = armado.equipos.map((e) => ({ id: ++equipoId, zonaId: zonaId(e), nombre: e.nombre, escudo: null, baja: e.baja }));

  const partidos = [];
  for (const zona of armado.zonas) {
    const enJuego = equipos.filter((e) => e.zonaId === zona.id && !e.baja);
    for (let i = 0; i + 1 < enJuego.length; i += 2) {
      partidos.push({
        id: ++partidoId,
        categoriaId: zona.categoriaId,
        fecha: 1,
        localId: enJuego[i].id,
        visitanteId: enJuego[i + 1].id,
        golesLocal: null,
        golesVisitante: null,
        postergado: false,
        ausente: null,
        ...LUGARES_DE_PRUEBA[partidos.length],
        dia: null,
      });
    }
  }
  return {
    ...datos,
    categorias: [...datos.categorias, ...armado.categorias],
    zonas: [...datos.zonas, ...armado.zonas],
    equipos: [...datos.equipos, ...equipos],
    partidos: [...datos.partidos, ...partidos],
  };
}
