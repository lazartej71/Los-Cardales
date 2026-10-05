/**
 * Lo que ve un veedor, en dos listas (modo):
 * - 'fecha': los partidos de la fecha en juego en cada cancha, de todas las categorías.
 * - 'postergados': los postergados reprogramados para un día especial (con día), jugados o no.
 * Lo usan el panel y la API.
 */

import { agruparPorFecha, fechaEnJuego } from './consultas.js';
import { tieneResultado } from './tabla.js';

const SIN_HORA = '99:99';
const porHoraEId = (a, b) => (a.hora ?? SIN_HORA).localeCompare(b.hora ?? SIN_HORA) || a.id - b.id;
const porDiaHoraEId = (a, b) => a.dia.localeCompare(b.dia) || porHoraEId(a, b);

// La fecha en juego de todo el torneo (todas las categorías juntas)
export const fechaDeVeedores = (partidos) => fechaEnJuego(agruparPorFecha(partidos));

// Un postergado reprogramado para un día especial: tiene día y lugar (jugado o no)
export const esReprogramado = (partido) => Boolean(partido.dia && partido.predio);

export function partidosDeVeedor(partidos, modo = 'fecha') {
  if (modo === 'postergados') return partidos.filter(esReprogramado).sort(porDiaHoraEId);
  const fecha = fechaDeVeedores(partidos);
  return partidos
    .filter((p) => p.predio && p.cancha && !p.postergado && !p.dia && p.fecha === fecha)
    .sort(porHoraEId);
}

export const partidosDePredio = (partidos, predio, modo = 'fecha') =>
  partidosDeVeedor(partidos, modo).filter((p) => p.predio === predio);

export const partidosDeCancha = (partidos, predio, cancha, modo = 'fecha') =>
  partidosDePredio(partidos, predio, modo).filter((p) => p.cancha === cancha);

// ¿Un veedor puede tocar este partido? (si está en alguna de las dos listas)
export const esPartidoDeVeedor = (partidos, partidoId) =>
  ['fecha', 'postergados'].some((modo) => partidosDeVeedor(partidos, modo).some((p) => p.id === partidoId));

// Para los botones de predio y cancha: "3 partidos · 1 por cargar"
export const resumenPartidos = (lista) => ({
  total: lista.length,
  porCargar: lista.filter((p) => !tieneResultado(p)).length,
});
