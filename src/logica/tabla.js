/**
 * Tabla de posiciones. Se calcula a partir de los partidos y nunca se guarda.
 * Funciones puras, sin React: las usan la app y las pruebas.
 */

import { PUNTOS } from '../datos/constantes.js';

export const tieneResultado = (p) => p.golesLocal !== null && p.golesVisitante !== null;

const filaVacia = (equipo) => ({ equipo, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 });

// Fila con lo que el equipo trae de la tabla inicial (la fecha 1 se cargó sin detalle)
function filaInicial(equipo, inicial) {
  const fila = filaVacia(equipo);
  if (!inicial) return fila;
  return Object.assign(fila, {
    pj: inicial.pj,
    pg: inicial.pg,
    pe: inicial.pe,
    pp: inicial.pp,
    gf: inicial.gf,
    gc: inicial.gc,
    dg: inicial.gf - inicial.gc,
    pts: inicial.pg * PUNTOS.ganado + inicial.pe * PUNTOS.empatado + inicial.pp * PUNTOS.perdido,
  });
}

// Suma los partidos jugados en una fila por equipo. En un partido contra otra zona
// solo se suma para el equipo que está en la lista.
function acumularEstadisticas(equipos, partidos, inicialPorEquipo = new Map()) {
  const filas = new Map(equipos.map((equipo) => [equipo.id, filaInicial(equipo, inicialPorEquipo.get(equipo.id))]));
  const sumar = (fila, aFavor, enContra) => {
    fila.pj += 1;
    fila.gf += aFavor;
    fila.gc += enContra;
    fila.dg = fila.gf - fila.gc;
    if (aFavor > enContra) {
      fila.pg += 1;
      fila.pts += PUNTOS.ganado;
    } else if (aFavor === enContra) {
      fila.pe += 1;
      fila.pts += PUNTOS.empatado;
    } else {
      fila.pp += 1;
      fila.pts += PUNTOS.perdido;
    }
  };
  partidos.forEach((p) => {
    const local = filas.get(p.localId);
    const visitante = filas.get(p.visitanteId);
    if (local) sumar(local, p.golesLocal, p.golesVisitante);
    if (visitante) sumar(visitante, p.golesVisitante, p.golesLocal);
  });
  return filas;
}

// Devuelve, para cada equipo del grupo, la "clave" que usa un criterio.
// Las claves son arrays y se comparan en orden (lexicográficamente).
function clavesDelCriterio(criterio, grupo, partidos) {
  if (criterio === 'enfrentamiento') {
    // Mini tabla con los partidos cargados SOLO entre los equipos empatados (sin tabla inicial)
    const ids = new Set(grupo.map((f) => f.equipo.id));
    const entreEllos = partidos.filter((p) => ids.has(p.localId) && ids.has(p.visitanteId));
    const mini = acumularEstadisticas(
      grupo.map((f) => f.equipo),
      entreEllos
    );
    return new Map(
      grupo.map((f) => {
        const m = mini.get(f.equipo.id);
        return [f.equipo.id, [m.pts, m.dg, m.gf]];
      })
    );
  }
  const campo = { puntos: 'pts', dg: 'dg', gf: 'gf' }[criterio];
  return new Map(grupo.map((f) => [f.equipo.id, [f[campo]]]));
}

function compararClaves(a, b) {
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

// Ordena un grupo de filas empatadas aplicando los criterios desde `indice`.
// Devuelve el orden y, entre cada par de filas vecinas, el criterio que las separó.
function ordenarGrupo(grupo, indice, criterios, partidos) {
  if (grupo.length <= 1) return { orden: grupo, motivos: [] };

  if (indice >= criterios.length) {
    // Empate en todos los criterios: se ordena por nombre para que sea estable
    const orden = [...grupo].sort((a, b) => a.equipo.nombre.localeCompare(b.equipo.nombre, 'es'));
    return { orden, motivos: orden.slice(1).map(() => 'alfabetico') };
  }

  const criterio = criterios[indice];
  const claves = clavesDelCriterio(criterio, grupo, partidos);
  const clave = (fila) => claves.get(fila.equipo.id);

  // De mayor a menor y agrupando los que siguen iguales
  const ordenados = [...grupo].sort((a, b) => compararClaves(clave(b), clave(a)));
  const subgrupos = [];
  ordenados.forEach((fila) => {
    const ultimo = subgrupos[subgrupos.length - 1];
    if (ultimo && compararClaves(clave(ultimo[0]), clave(fila)) === 0) ultimo.push(fila);
    else subgrupos.push([fila]);
  });

  const orden = [];
  const motivos = [];
  subgrupos.forEach((sub, i) => {
    // Si el enfrentamiento directo separó solo a una parte del grupo,
    // se vuelve a aplicar entre los que quedaron empatados.
    const siguiente =
      criterio === 'enfrentamiento' && sub.length > 1 && sub.length < grupo.length ? indice : indice + 1;
    const resultado = ordenarGrupo(sub, siguiente, criterios, partidos);
    if (i > 0) motivos.push(criterio);
    orden.push(...resultado.orden);
    motivos.push(...resultado.motivos);
  });
  return { orden, motivos };
}

/**
 * Calcula la tabla de posiciones de una zona.
 * @param {Array} equipos       Equipos de la zona (los dados de baja no tienen fila).
 * @param {Array} partidos      Partidos de esos equipos (cuentan los que tienen resultado).
 * @param {Array} criterios     Orden de desempate, ej: ['puntos', 'dg', 'gf', 'enfrentamiento'].
 * @param {Array} tablaInicial  Lo que cada equipo trae de la fecha 1: { equipoId, pj, pg, pe, pp, gf, gc }.
 * @returns {Array} Filas ordenadas: { equipo, pos, pj, pg, pe, pp, gf, gc, dg, pts, desempate }.
 *   `desempate` es el criterio que dejó a ese equipo por encima del siguiente.
 */
export function calcularTabla(equipos, partidos, criterios, tablaInicial = []) {
  // Los dados de baja no tienen fila; sus partidos les siguen sumando a los rivales
  const enTabla = equipos.filter((e) => !e.baja);
  const jugados = partidos.filter(tieneResultado);
  const inicialPorEquipo = new Map(tablaInicial.map((t) => [t.equipoId, t]));
  const filas = [...acumularEstadisticas(enTabla, jugados, inicialPorEquipo).values()];
  const { orden, motivos } = ordenarGrupo(filas, 0, criterios, jugados);
  return orden.map((fila, i) => ({ ...fila, pos: i + 1, desempate: motivos[i] || null }));
}
