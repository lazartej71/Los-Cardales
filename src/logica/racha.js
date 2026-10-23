/**
 * Racha de un equipo: cómo le fue en sus últimos partidos jugados (V, E o D).
 * Función pura, sin React: la usan la vista pública y las pruebas.
 */

import { esWoDoble, tieneResultado } from './tabla.js';

/**
 * @param {number} equipoId
 * @param {Array} partidos  Ya ordenados por fecha y hora (como los devuelve partidosDeEquipos).
 * @param {number} max      Cuántos resultados devolver, los más nuevos.
 * @returns {Array<'V'|'E'|'D'>} Del más viejo al más nuevo. Un W.O. cuenta por el resultado cargado;
 *   el W.O. doble (no jugó nadie), los pendientes y los postergados no cuentan.
 */
export function rachaDeEquipo(equipoId, partidos, max = 5) {
  const resultados = partidos
    .filter((p) => (p.localId === equipoId || p.visitanteId === equipoId) && tieneResultado(p) && !esWoDoble(p))
    .map((p) => {
      const esLocal = p.localId === equipoId;
      const aFavor = esLocal ? p.golesLocal : p.golesVisitante;
      const enContra = esLocal ? p.golesVisitante : p.golesLocal;
      if (aFavor > enContra) return 'V';
      return aFavor === enContra ? 'E' : 'D';
    });
  return resultados.slice(-max);
}
