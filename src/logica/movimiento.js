/**
 * Cuántos puestos subió o bajó cada equipo desde la tabla de antes de la última fecha con resultados.
 * Función pura, sin React: la usan la vista pública y las pruebas.
 */

import { calcularTabla } from './tabla.js';

/**
 * @param {Array} filas  La tabla de hoy (de calcularTabla).
 * @param {object} contexto  { equipos, partidos, criterios, tablaInicial, ultimaFecha } con los que se armó.
 * @returns {Map<number, number>} equipoId → puestos: positivo si subió, negativo si bajó. Los que no se
 *   movieron no están. Con una sola fecha jugada (o ninguna) no hay con qué comparar: queda vacío.
 */
export function movimientosDePuestos(filas, { equipos, partidos, criterios, tablaInicial, ultimaFecha }) {
  const movimientos = new Map();
  if (ultimaFecha <= 1) return movimientos;
  const anteriores = calcularTabla(
    equipos,
    partidos.filter((p) => p.fecha < ultimaFecha),
    criterios,
    tablaInicial
  );
  const puestoAnterior = new Map(anteriores.map((f) => [f.equipo.id, f.pos]));
  filas.forEach((f) => {
    const antes = puestoAnterior.get(f.equipo.id);
    if (antes !== undefined && antes !== f.pos) movimientos.set(f.equipo.id, antes - f.pos);
  });
  return movimientos;
}
