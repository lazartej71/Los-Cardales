/**
 * Mi equipo: el equipo que cada persona sigue en la vista pública (uno por modalidad), guardado solo en
 * su celular, y lo que se muestra de él: su puesto, sus puntos y su próximo partido.
 * Funciones puras, sin React: las usan la vista pública y las pruebas.
 */

import { equiposDeZona, partidosDeEquipos } from './consultas.js';
import { textoLugar } from './lugar.js';
import { modalidadDeEquipo } from './modalidades.js';
import { calcularTabla, tieneResultado } from './tabla.js';

const CLAVE = 'lc-mi-equipo';
const NINGUNO = { f11: null, f7: null };
const idValido = (valor) => (Number.isInteger(valor) && valor > 0 ? valor : null);

// El equipo de cada modalidad que la persona marcó en este celular (null si no marcó, o sin almacenamiento)
export function leerMiEquipoGuardado(almacen) {
  try {
    const guardado = JSON.parse(almacen?.getItem(CLAVE) ?? 'null');
    if (!guardado || typeof guardado !== 'object') return { ...NINGUNO };
    return { f11: idValido(guardado.f11), f7: idValido(guardado.f7) };
  } catch {
    return { ...NINGUNO };
  }
}

export function guardarMiEquipo(almacen, miEquipo) {
  try {
    almacen?.setItem(CLAVE, JSON.stringify({ f11: miEquipo.f11 ?? null, f7: miEquipo.f7 ?? null }));
  } catch {
    // Sin almacenamiento: vale mientras dura la visita
  }
}

// Un toque marca el equipo de esa modalidad; otro toque sobre el mismo lo desmarca
export function alternarMiEquipo(miEquipo, modalidad, equipoId) {
  return { ...miEquipo, [modalidad]: miEquipo[modalidad] === equipoId ? null : equipoId };
}

const juega = (partido, equipoId) => partido.localId === equipoId || partido.visitanteId === equipoId;

/**
 * El próximo partido del equipo: el primero sin resultado y sin postergar; si solo le quedan postergados,
 * el primero de ellos; si no, null. Recibe los partidos ordenados como los devuelve partidosDeEquipos.
 */
export function proximoPartido(partidos, equipoId) {
  const pendientes = partidos.filter((p) => juega(p, equipoId) && !tieneResultado(p));
  return pendientes.find((p) => !p.postergado) ?? pendientes[0] ?? null;
}

// "Fecha 5 · Los Cardales · Cancha 3 · 16:30 · vs La Previa". Un postergado dice de qué fecha es y, si ya
// tiene día, cuándo se juega; si no, que falta confirmar (su lugar viejo ya no vale).
export function textoProximoPartido(partido, equipoId, nombreDe) {
  const rival = `vs ${nombreDe(partido.localId === equipoId ? partido.visitanteId : partido.localId)}`;
  let partes;
  if (!partido.postergado) partes = [`Fecha ${partido.fecha}`, textoLugar(partido)];
  else if (partido.dia) partes = [`Postergado de la fecha ${partido.fecha}`, textoLugar(partido)];
  else partes = [`Postergado de la fecha ${partido.fecha}, a confirmar`];
  return [...partes, rival].filter(Boolean).join(' · ');
}

/**
 * Lo que se muestra del equipo marcado: { equipo, zona, fila, proximo }. null si el equipo ya no existe,
 * se dio de baja, no tiene zona o es de la otra modalidad.
 */
export function resumenMiEquipo(db, equipoId, modalidad) {
  const equipo = db.equipos.find((e) => e.id === equipoId);
  if (!equipo || equipo.baja || modalidadDeEquipo(db, equipoId) !== modalidad) return null;
  const zona = db.zonas.find((z) => z.id === equipo.zonaId);
  if (!zona) return null;
  const equipos = equiposDeZona(db.equipos, zona.id);
  const partidos = partidosDeEquipos(db.partidos, equipos);
  const filas = calcularTabla(equipos, partidos, db.configuracion.criteriosDesempate, db.tablaInicial);
  return {
    equipo,
    zona,
    fila: filas.find((f) => f.equipo.id === equipoId),
    proximo: proximoPartido(partidos, equipoId),
  };
}
