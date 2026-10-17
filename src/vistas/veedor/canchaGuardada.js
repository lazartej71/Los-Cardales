/**
 * El celular del veedor recuerda dónde estaba: en la fecha en juego o en Postergados, la modalidad, el
 * predio y la cancha. Si la página se recarga en medio del partido, vuelve ahí. Si no hay almacenamiento
 * (o falla), simplemente arranca de cero. Lo guardado antes de Fútbol 7 no tiene modalidad: es de Fútbol 11.
 */

import { MODALIDADES, PREDIOS } from '../../datos/constantes.js';
import { canchasDe } from '../../logica/lugar.js';

const CLAVE = 'veedor-cancha';
const MODOS = ['fecha', 'postergados'];

// { modo, modalidad (si se guardó), predio, cancha } con lo que exista (cancha puede ser null), o {}
export function leerCanchaGuardada(almacen) {
  try {
    const guardada = JSON.parse(almacen?.getItem(CLAVE) ?? 'null');
    if (!guardada || typeof guardada !== 'object') return {};
    const modo = MODOS.includes(guardada.modo) ? guardada.modo : 'fecha';
    const modalidad = MODALIDADES.some((m) => m.id === guardada.modalidad) ? guardada.modalidad : null;
    const conModalidad = modalidad ? { modo, modalidad } : { modo };
    const predio = PREDIOS.find((p) => p.id === guardada.predio);
    if (!predio) return conModalidad;
    const cancha = canchasDe(predio.id, modalidad ?? 'f11').includes(guardada.cancha) ? guardada.cancha : null;
    return { ...conModalidad, predio: predio.id, cancha };
  } catch {
    return {};
  }
}

export function guardarCancha(almacen, { modo = 'fecha', modalidad = null, predio = null, cancha = null }) {
  try {
    almacen?.setItem(CLAVE, JSON.stringify(modalidad ? { modo, modalidad, predio, cancha } : { modo, predio, cancha }));
  } catch {
    // Sin almacenamiento: la próxima vez arranca eligiendo el predio
  }
}
