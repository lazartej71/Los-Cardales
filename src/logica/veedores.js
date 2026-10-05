/**
 * Lo que ve un veedor: los partidos de la fecha en juego en cada cancha, de todas las categorías,
 * más los postergados que se recuperan, mientras no tengan resultado. Lo usan el panel y la API.
 */

import { agruparPorFecha, fechaEnJuego } from './consultas.js';
import { tieneResultado } from './tabla.js';

const SIN_HORA = '99:99';
const porHoraEId = (a, b) => (a.hora ?? SIN_HORA).localeCompare(b.hora ?? SIN_HORA) || a.id - b.id;

// La fecha en juego de todo el torneo (todas las categorías juntas)
export const fechaDeVeedores = (partidos) => fechaEnJuego(agruparPorFecha(partidos));

// Los partidos que ven los veedores, en cualquier cancha, por hora
export function partidosDeVeedor(partidos) {
  const fecha = fechaDeVeedores(partidos);
  return partidos
    .filter(
      (p) =>
        p.predio &&
        p.cancha &&
        !p.postergado &&
        (p.fecha === fecha || (p.fecha < fecha && !tieneResultado(p)))
    )
    .sort(porHoraEId);
}

export const partidosDePredio = (partidos, predio) => partidosDeVeedor(partidos).filter((p) => p.predio === predio);

export const partidosDeCancha = (partidos, predio, cancha) =>
  partidosDePredio(partidos, predio).filter((p) => p.cancha === cancha);

// ¿Un veedor puede tocar este partido?
export const esPartidoDeVeedor = (partidos, partidoId) => partidosDeVeedor(partidos).some((p) => p.id === partidoId);

// Para los botones de predio y cancha: "3 partidos · 1 por cargar"
export const resumenPartidos = (lista) => ({
  total: lista.length,
  porCargar: lista.filter((p) => !tieneResultado(p)).length,
});
