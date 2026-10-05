/**
 * El celular del veedor recuerda el último predio y la última cancha: si la página se recarga en medio
 * del partido, vuelve ahí. Si no hay almacenamiento (o falla), simplemente arranca de cero.
 */

import { PREDIOS } from '../../datos/constantes.js';

const CLAVE = 'veedor-cancha';

// { predio, cancha } si existen (cancha puede ser null), o {} si no hay nada que sirva
export function leerCanchaGuardada(almacen) {
  try {
    const guardada = JSON.parse(almacen?.getItem(CLAVE) ?? 'null');
    const predio = PREDIOS.find((p) => p.id === guardada?.predio);
    if (!predio) return {};
    return { predio: predio.id, cancha: predio.canchas.includes(guardada.cancha) ? guardada.cancha : null };
  } catch {
    return {};
  }
}

export function guardarCancha(almacen, { predio = null, cancha = null }) {
  try {
    almacen?.setItem(CLAVE, JSON.stringify({ predio, cancha }));
  } catch {
    // Sin almacenamiento: la próxima vez arranca eligiendo el predio
  }
}
