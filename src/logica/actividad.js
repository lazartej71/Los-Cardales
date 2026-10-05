/**
 * Registro de actividad (lo ve solo el superadmin): el texto de cada registro, el resumen por persona
 * y el rango de un día en Argentina. Cada registro es { quien, accion, tabla, fila, cambios }, con la
 * fila en camelCase y los cambios con los nombres de columna de la base (goles_local, hora...).
 */

import { formatearPesos } from './cuentas.js';

const ETIQUETA_AJUSTE = { arancel: 'arancel', nombre_campeonato: 'nombre del campeonato', criterios_desempate: 'desempate' };
const tiene = (cambios, columnas) => (cambios || []).some((c) => columnas.includes(c));
const RESULTADO = ['goles_local', 'goles_visitante', 'ausente'];
const LUGAR = ['predio', 'cancha', 'hora'];

// "BRANCA vs BARRIO POLICIAL (Libre, fecha 2)" con los datos que tenga el partido
function cruce(partido, db) {
  const nombre = (id) => db.equipos.find((e) => e.id === id)?.nombre ?? 'un equipo';
  const categoria = db.categorias.find((c) => c.id === partido.categoriaId)?.nombre;
  const donde = categoria ? `${categoria}, fecha ${partido.fecha}` : `fecha ${partido.fecha}`;
  return `${nombre(partido.localId)} vs ${nombre(partido.visitanteId)} (${donde})`;
}

// Para tarjetas y rojas: el partido todavía cargado, si existe
function enPartido(partidoId, db) {
  const partido = db.partidos.find((p) => p.id === partidoId);
  return partido ? cruce(partido, db) : 'un partido borrado';
}

function textoPartido({ accion, fila, cambios }, db) {
  const nombre = cruce(fila, db);
  if (accion === 'alta') return `Agregó el partido ${nombre}`;
  if (accion === 'baja') return `Borró el partido ${nombre}`;
  if (tiene(cambios, ['ausente']) && fila.ausente) return `Marcó W.O. en ${nombre}`;
  if (tiene(cambios, RESULTADO)) {
    return fila.golesLocal === null || fila.golesLocal === undefined
      ? `Quitó el resultado de ${nombre}`
      : `Cargó el resultado de ${nombre}`;
  }
  if (tiene(cambios, ['postergado'])) {
    return fila.postergado ? `Postergó ${nombre}` : `Quitó la postergación de ${nombre}`;
  }
  if (tiene(cambios, LUGAR)) return `Cambió el lugar y la hora de ${nombre}`;
  return `Cambió el partido ${nombre}`;
}

const VERBO = { alta: 'Cargó', cambio: 'Cambió', baja: 'Borró' };
// Las rojas cargadas antes de la migración 7 no tienen tipo
const ROJA = { directa: 'la roja directa', doble_amarilla: 'la doble amarilla' };

export function describirActividad(entrada, db) {
  const { accion, tabla, fila = {}, cambios } = entrada;
  const equipo = db.equipos.find((e) => e.id === fila.equipoId)?.nombre ?? 'un equipo';
  if (tabla === 'partidos') return textoPartido(entrada, db);
  if (tabla === 'tarjetas') {
    return `${VERBO[accion]} la amarilla del N° ${fila.numeroCamiseta} de ${equipo} en ${enPartido(fila.partidoId, db)}`;
  }
  if (tabla === 'expulsiones') {
    const que = accion === 'cambio' ? 'la sanción' : (ROJA[fila.tipo] ?? 'la roja');
    return `${VERBO[accion]} ${que} del N° ${fila.numeroCamiseta} de ${equipo} en ${enPartido(fila.partidoId, db)}`;
  }
  if (tabla === 'movimientos') {
    const verbo = { alta: 'Anotó', cambio: 'Cambió', baja: 'Borró' }[accion];
    const que = fila.tipo === 'pago' ? 'un pago' : 'una deuda anterior';
    const como = fila.metodo ? ` (${fila.metodo})` : '';
    return `${verbo} ${que} de ${formatearPesos(fila.monto)} de ${equipo}${como}`;
  }
  if (tabla === 'equipos') return `Cambió los datos de ${fila.nombre ?? 'un equipo'}`;
  if (tabla === 'delegados') return `Cambió el delegado de ${equipo}`;
  if (tabla === 'configuracion') {
    const que = (cambios || []).map((c) => ETIQUETA_AJUSTE[c]).filter(Boolean);
    return que.length ? `Cambió los ajustes (${que.join(', ')})` : 'Cambió los ajustes';
  }
  return `${VERBO[accion] ?? 'Cambió'} algo en ${tabla}`;
}

// Cuánto cargó cada persona: resultados (incluye W.O.), tarjetas, rojas, pagos y lo demás
export function resumirActividad(entradas) {
  const porPersona = new Map();
  for (const e of entradas) {
    if (!porPersona.has(e.quien)) {
      porPersona.set(e.quien, { quien: e.quien, resultados: 0, tarjetas: 0, rojas: 0, pagos: 0, otros: 0 });
    }
    const fila = porPersona.get(e.quien);
    if (e.tabla === 'partidos' && e.accion === 'cambio' && tiene(e.cambios, RESULTADO)) fila.resultados++;
    else if (e.tabla === 'tarjetas' && e.accion === 'alta') fila.tarjetas++;
    else if (e.tabla === 'expulsiones' && e.accion === 'alta') fila.rojas++;
    else if (e.tabla === 'movimientos' && e.accion === 'alta' && e.fila?.tipo === 'pago') fila.pagos++;
    else fila.otros++;
  }
  return [...porPersona.values()];
}

// "2026-10-03" → de las 00:00 de ese día a las 00:00 del siguiente, hora de Argentina (UTC-3, sin horario de verano)
export function rangoDelDia(dia) {
  if (typeof dia !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) return null;
  const [anio, mes, numero] = dia.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, numero));
  if (fecha.toISOString().slice(0, 10) !== dia) return null;
  const siguiente = new Date(Date.UTC(anio, mes - 1, numero + 1)).toISOString().slice(0, 10);
  return { desde: `${dia}T00:00:00-03:00`, hasta: `${siguiente}T00:00:00-03:00` };
}
