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

/**
 * equipos: filas { categoria, zona, equipo, baja ('si' o vacío) }. Devuelve las categorías (desde la 6)
 * y zonas (desde la 11) en el orden en que aparecen, los equipos sin id y los errores que impiden cargarlos.
 */
export function armarFutbol7({ equipos: filas }) {
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
  return { categorias, zonas, equipos, errores };
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
