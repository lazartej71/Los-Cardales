/**
 * Lugar y hora de un partido: predio, cancha y hora. Lo usan la API, el panel y la vista pública.
 */

import { PREDIOS } from '../datos/constantes.js';

const predioPorId = (id) => PREDIOS.find((p) => p.id === id) || null;

export const nombrePredio = (predioId) => predioPorId(predioId)?.nombre ?? '';

export const canchasDe = (predioId) => predioPorId(predioId)?.canchas ?? [];

// "9:05", "09:05" o "09:05:00" (como la devuelve Postgres) → "09:05"; cualquier otra cosa → null
export function normalizarHora(texto) {
  if (typeof texto !== 'string') return null;
  const partes = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(texto.trim());
  if (!partes) return null;
  const [hora, minutos] = [Number(partes[1]), Number(partes[2])];
  if (hora > 23 || minutos > 59) return null;
  return `${String(hora).padStart(2, '0')}:${partes[2]}`;
}

export function validarLugar(lugar) {
  const { predio, cancha, hora } = lugar || {};
  const elegido = predioPorId(predio);
  if (!elegido) return { error: 'Elegí el predio.' };
  if (!elegido.canchas.includes(cancha)) return { error: `Elegí una cancha de ${elegido.nombre}.` };
  const horaNormal = normalizarHora(hora);
  if (!horaNormal) return { error: 'Escribí la hora como 13:40.' };
  return { valor: { predio, cancha, hora: horaNormal } };
}

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// "2026-10-12" → "Lunes 12/10" (el día en que se recupera un postergado)
export function textoDia(dia) {
  if (!dia) return '';
  const [anio, mes, numero] = dia.split('-').map(Number);
  const semana = DIAS[new Date(Date.UTC(anio, mes - 1, numero)).getUTCDay()];
  return `${semana} ${String(numero).padStart(2, '0')}/${String(mes).padStart(2, '0')}`;
}

// Un postergado reprogramado suma el día: "Lunes 12/10 · Los Cardales · Cancha 2 · 13:40"
const armarTexto = (partido, cancha) => {
  const predio = predioPorId(partido.predio);
  if (!predio) return '';
  const lugar = `${predio.nombre} · ${cancha}${partido.cancha} · ${partido.hora}`;
  return partido.dia ? `${textoDia(partido.dia)} · ${lugar}` : lugar;
};

export const textoLugar = (partido) => armarTexto(partido, 'Cancha ');
export const textoLugarCorto = (partido) => armarTexto(partido, 'C');
