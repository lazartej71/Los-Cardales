/**
 * Equipos que dejan el torneo (dados de baja) y equipos nuevos. Funciones puras: las usan el panel y la API.
 */

import { tieneResultado } from './tabla.js';

// Partidos del equipo que todavía no tienen resultado: pendientes y postergados (un W.O. ya tiene resultado)
export const partidosPendientes = (partidos, equipoId) =>
  partidos.filter((p) => (p.localId === equipoId || p.visitanteId === equipoId) && !tieneResultado(p));

// Por qué no se puede dar de baja todavía
export function textoPendientes(nombre, cantidad) {
  return cantidad === 1
    ? `${nombre} tiene 1 partido sin resultado. Cargale el resultado o borralo antes de darlo de baja.`
    : `${nombre} tiene ${cantidad} partidos sin resultado. Cargales el resultado o borralos antes de darlo de baja.`;
}

// "chivero  f.c " → "CHIVERO F.C": sin acentos, en mayúsculas y con un solo espacio entre palabras
const comparable = (nombre) =>
  nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

export const mismoNombre = (a, b) => comparable(a) === comparable(b);
