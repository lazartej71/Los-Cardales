/**
 * La regla de desempate en una sola frase, para mostrar debajo de la tabla pública.
 * Función pura, sin React: la usan la vista pública y las pruebas.
 */

import { CRITERIOS } from '../datos/constantes.js';

/**
 * "Si dos equipos empatan en puntos, se ordenan por diferencia de gol, después por goles a favor y
 * después por el resultado entre ellos." Sigue el orden que eligió el organizador.
 * @param {string[]} criterios  Los criterios de desempate, en orden (los desconocidos no cuentan).
 * @returns {string|null} null si queda menos de dos criterios: no hay nada que explicar.
 */
export function fraseDesempate(criterios) {
  const conocidos = criterios.filter((c) => CRITERIOS[c]);
  if (conocidos.length < 2) return null;
  const [primero, ...resto] = conocidos;
  const motivos = resto.map((c) => CRITERIOS[c].motivo);
  const ultimo = motivos.length > 1 ? ` y después ${motivos.pop()}` : '';
  const orden = motivos.join(', después ');
  return `Si dos equipos empatan en ${CRITERIOS[primero].nombre.toLowerCase()}, se ordenan ${orden}${ultimo}.`;
}
