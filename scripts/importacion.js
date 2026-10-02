/**
 * Convierte las hojas de "TABLAS GP FECHA N1.xlsx" en los datos iniciales del campeonato
 * y en el SQL para cargarlos en Supabase. Funciones puras: no leen ni escriben archivos.
 */

// Hoja del Excel → categoría (se identificó por los equipos y el color de cada hoja)
export const CATEGORIAS = [
  { id: 1, nombre: 'Libre', orden: 1, hoja: 'Hoja1' },
  { id: 2, nombre: '+30', orden: 2, hoja: 'Hoja2' },
  { id: 3, nombre: '+35', orden: 3, hoja: 'Hoja5' },
  { id: 4, nombre: '+40', orden: 4, hoja: 'Hoja3' },
  { id: 5, nombre: '+45', orden: 5, hoja: 'Hoja4' },
];

// Partidos de la fecha 1 que quedaron postergados (anotados al pie de las hojas)
export const POSTERGADOS_FECHA_1 = [
  { categoria: '+30', local: 'LA FUSION', visitante: 'GARDELITOS' },
  { categoria: '+30', local: 'GRANDECITO F.C', visitante: 'LA PRIMERA' },
  { categoria: '+45', local: 'LOS RUSTICOS', visitante: 'PORTEROS' },
  { categoria: '+45', local: 'LA 78 DEL DK', visitante: 'CHOPEROS F.C' },
  { categoria: '+45', local: '28 DE AGOSTO', visitante: 'ECUADOR' },
];

// Errores de tipeo detectados en el Excel
const NOMBRES_CORREGIDOS = { ECUAD0R: 'ECUADOR' };
// PJ mal cargado: sus goles cierran con un único partido entre ellos (3 a 0)
const PJ_CORREGIDOS = { '+35|PASAJE ROSALES F.C': 1, '+35|ARSENAL F.C': 1 };

const texto = (valor) => String(valor ?? '').replace(/\s+/g, ' ').trim();

// Número entero no negativo; el Excel a veces tiene una letra "O" en lugar de un cero
function numero(valor, contexto) {
  const limpio = texto(valor).replace(/^O$/i, '0');
  const n = Number(limpio);
  if (limpio === '' || !Number.isInteger(n) || n < 0) throw new Error(`Número inválido "${valor}" en ${contexto}`);
  return n;
}

// Con un solo partido jugado, los puntos dicen si ganó, empató o perdió
function resultadosDesdePuntos(pj, puntos, nombre) {
  if (pj === 0 && puntos === 0) return { pg: 0, pe: 0, pp: 0 };
  if (pj === 1 && puntos === 3) return { pg: 1, pe: 0, pp: 0 };
  if (pj === 1 && puntos === 1) return { pg: 0, pe: 1, pp: 0 };
  if (pj === 1 && puntos === 0) return { pg: 0, pe: 0, pp: 1 };
  throw new Error(`No se puede saber cómo le fue a ${nombre}: ${pj} PJ y ${puntos} puntos`);
}

/**
 * hojas: { [nombreHoja]: filas }, cada fila = [POS, CLUB, PUNTOS, GF, GC, DIF, PJ, ZONA].
 * Devuelve { categorias, zonas, equipos, tablaInicial, partidos } con ids desde 1.
 */
export function armarDatos(hojas, opciones = {}) {
  const categorias = opciones.categorias || CATEGORIAS;
  const postergados = opciones.postergados || POSTERGADOS_FECHA_1;
  const zonas = [];
  const equipos = [];
  const tablaInicial = [];

  for (const categoria of categorias) {
    const filas = hojas[categoria.hoja];
    if (!filas) throw new Error(`Falta la hoja ${categoria.hoja} (${categoria.nombre})`);
    for (const fila of filas) {
      const club = texto(fila[1]);
      // Se saltean encabezados, renglones vacíos y notas al pie (no tienen posición)
      if (!club || !/^\d+$/.test(texto(fila[0]))) continue;

      const letra = texto(fila[7]).toUpperCase();
      const nombreZona = letra ? `Zona ${letra}` : 'Zona única';
      let zona = zonas.find((z) => z.categoriaId === categoria.id && z.nombre === nombreZona);
      if (!zona) {
        zona = { id: zonas.length + 1, categoriaId: categoria.id, nombre: nombreZona };
        zonas.push(zona);
      }

      const nombre = NOMBRES_CORREGIDOS[club] || club;
      const equipo = { id: equipos.length + 1, zonaId: zona.id, nombre };
      equipos.push(equipo);

      const contexto = `${categoria.nombre}, ${nombre}`;
      const puntos = numero(fila[2], contexto);
      const pj = PJ_CORREGIDOS[`${categoria.nombre}|${nombre}`] ?? numero(fila[6], contexto);
      tablaInicial.push({
        equipoId: equipo.id,
        pj,
        ...resultadosDesdePuntos(pj, puntos, nombre),
        gf: numero(fila[3], contexto),
        gc: numero(fila[4], contexto),
      });
    }
  }

  const equipoDe = (nombreCategoria, nombre) => {
    const categoria = categorias.find((c) => c.nombre === nombreCategoria);
    const equipo = equipos.find(
      (e) => e.nombre === nombre && zonas.find((z) => z.id === e.zonaId).categoriaId === categoria?.id
    );
    if (!equipo) throw new Error(`No encuentro a ${nombre} en ${nombreCategoria}`);
    if (tablaInicial.find((t) => t.equipoId === equipo.id).pj > 0) {
      throw new Error(`${nombre} figura postergado pero ya tiene un partido jugado`);
    }
    return equipo;
  };
  const partidos = postergados.map((p) => ({
    categoriaId: categorias.find((c) => c.nombre === p.categoria).id,
    fecha: 1,
    localId: equipoDe(p.categoria, p.local).id,
    visitanteId: equipoDe(p.categoria, p.visitante).id,
    postergado: true,
  }));

  return {
    categorias: categorias.map(({ id, nombre, orden }) => ({ id, nombre, orden })),
    zonas,
    equipos,
    tablaInicial,
    partidos,
  };
}

const sqlTexto = (valor) => `'${String(valor).replace(/'/g, "''")}'`;

// SQL para cargar los datos en una base recién creada con esquema.sql
export function generarSql(datos, { nombreCampeonato }) {
  const lineas = [
    '-- Generado por scripts/importar-excel.mjs a partir de "Excel/TABLAS GP FECHA N1.xlsx". No editar a mano.',
    '-- Ejecutar una sola vez en el SQL Editor de Supabase, después de esquema.sql.',
    'begin;',
    '',
  ];
  const insertar = (tabla, columnas, filas) => {
    if (!filas.length) return;
    lineas.push(`insert into public.${tabla} (${columnas.join(', ')}) values`);
    lineas.push(`${filas.map((f) => `  (${f.join(', ')})`).join(',\n')};`, '');
  };
  insertar('categorias', ['id', 'nombre', 'orden'], datos.categorias.map((c) => [c.id, sqlTexto(c.nombre), c.orden]));
  insertar('zonas', ['id', 'categoria_id', 'nombre'], datos.zonas.map((z) => [z.id, z.categoriaId, sqlTexto(z.nombre)]));
  insertar('equipos', ['id', 'zona_id', 'nombre'], datos.equipos.map((e) => [e.id, e.zonaId, sqlTexto(e.nombre)]));
  insertar(
    'tabla_inicial',
    ['equipo_id', 'pj', 'pg', 'pe', 'pp', 'gf', 'gc'],
    datos.tablaInicial.map((t) => [t.equipoId, t.pj, t.pg, t.pe, t.pp, t.gf, t.gc])
  );
  insertar(
    'partidos',
    ['categoria_id', 'fecha', 'local_id', 'visitante_id', 'postergado'],
    datos.partidos.map((p) => [p.categoriaId, p.fecha, p.localId, p.visitanteId, String(p.postergado)])
  );
  insertar(
    'configuracion',
    ['id', 'nombre_campeonato', 'criterios_desempate'],
    [[1, sqlTexto(nombreCampeonato), "array['puntos', 'dg', 'gf', 'enfrentamiento']"]]
  );
  lineas.push("select setval(pg_get_serial_sequence('public.equipos', 'id'), (select max(id) from public.equipos));");
  lineas.push('', 'commit;', '');
  return lineas.join('\n');
}
