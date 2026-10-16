/**
 * Lo que ve un veedor, en dos listas (modo):
 * - 'fecha': los partidos en cada cancha de la fecha en juego de su categoría (cada categoría tiene la
 *   suya: puede ir una fecha adelante de otra), de todas las categorías.
 * - 'postergados': los postergados reprogramados para un día especial (con día), jugados o no.
 * Lo usan el panel y la API.
 */

import { fechaEnJuegoPorCategoria } from './consultas.js';
import { tieneResultado } from './tabla.js';

const SIN_HORA = '99:99';
const porHoraEId = (a, b) => (a.hora ?? SIN_HORA).localeCompare(b.hora ?? SIN_HORA) || a.id - b.id;
const porDiaHoraEId = (a, b) => a.dia.localeCompare(b.dia) || porHoraEId(a, b);

// Las fechas en juego de las categorías, sin repetir y en orden (sin partidos, la 1). Para el título.
export function fechasDeVeedores(partidos) {
  const fechas = [...new Set(fechaEnJuegoPorCategoria(partidos).values())].sort((a, b) => a - b);
  return fechas.length ? fechas : [1];
}

// [4, 5] → "4 y 5"; [3, 4, 5] → "3, 4 y 5"
export const listaDeFechas = (fechas) =>
  fechas.length > 1 ? `${fechas.slice(0, -1).join(', ')} y ${fechas.at(-1)}` : String(fechas[0]);

// Un postergado reprogramado para un día especial: tiene día y lugar (jugado o no)
export const esReprogramado = (partido) => Boolean(partido.dia && partido.predio);

export function partidosDeVeedor(partidos, modo = 'fecha') {
  if (modo === 'postergados') return partidos.filter(esReprogramado).sort(porDiaHoraEId);
  const enJuego = fechaEnJuegoPorCategoria(partidos);
  return partidos
    .filter((p) => p.predio && p.cancha && !p.postergado && !p.dia && p.fecha === enJuego.get(p.categoriaId))
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
