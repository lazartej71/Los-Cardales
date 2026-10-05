/**
 * El celular del veedor recuerda dónde estaba: en la fecha en juego o en Postergados, el predio y la
 * cancha. Si la página se recarga en medio del partido, vuelve ahí. Si no hay almacenamiento (o
 * falla), simplemente arranca de cero.
 */

import { PREDIOS } from '../../datos/constantes.js';

const CLAVE = 'veedor-cancha';
const MODOS = ['fecha', 'postergados'];

// { modo, predio, cancha } con lo que exista (cancha puede ser null), o {} si no hay nada que sirva
export function leerCanchaGuardada(almacen) {
  try {
    const guardada = JSON.parse(almacen?.getItem(CLAVE) ?? 'null');
    if (!guardada || typeof guardada !== 'object') return {};
    const modo = MODOS.includes(guardada.modo) ? guardada.modo : 'fecha';
    const predio = PREDIOS.find((p) => p.id === guardada.predio);
    if (!predio) return { modo };
    return { modo, predio: predio.id, cancha: predio.canchas.includes(guardada.cancha) ? guardada.cancha : null };
  } catch {
    return {};
  }
}

export function guardarCancha(almacen, { modo = 'fecha', predio = null, cancha = null }) {
  try {
    almacen?.setItem(CLAVE, JSON.stringify({ modo, predio, cancha }));
  } catch {
    // Sin almacenamiento: la próxima vez arranca eligiendo el predio
  }
}
