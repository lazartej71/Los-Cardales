/**
 * Consultas sobre los datos: zonas de una categoría, partidos de un grupo de equipos, fechas, etc.
 */

import { tieneResultado } from './tabla.js';

// Por fecha y, dentro de cada fecha, por hora (los que no tienen hora van al final)
const SIN_HORA = '99:99';
const porFechaHoraEId = (a, b) =>
  a.fecha - b.fecha || (a.hora ?? SIN_HORA).localeCompare(b.hora ?? SIN_HORA) || a.id - b.id;

// Estado de un partido para mostrar en el panel: [tipo de la píldora, texto]
export function estadoPartido(partido) {
  if (partido.ausente) return ['wo', 'W.O.'];
  if (tieneResultado(partido)) return ['ok', 'Cargado'];
  if (partido.postergado) return ['postergado', 'Postergado'];
  return ['pendiente', 'Pendiente'];
}

// Zonas de una categoría en orden alfabético ("Zona A", "Zona B"... o "Zona única")
export const zonasDeCategoria = (zonas, categoriaId) =>
  zonas.filter((z) => z.categoriaId === categoriaId).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

// La zona elegida si es de la categoría; si no, la primera de la categoría
export function zonaElegida(zonas, categoriaId, zonaId) {
  const propias = zonasDeCategoria(zonas, categoriaId);
  return propias.find((z) => z.id === zonaId) || propias[0] || null;
}

export const equiposDeZona = (equipos, zonaId) => equipos.filter((e) => e.zonaId === zonaId);

export const partidosDeCategoria = (partidos, categoriaId) =>
  partidos.filter((p) => p.categoriaId === categoriaId).sort(porFechaHoraEId);

// Partidos en los que juega alguno de los equipos (incluye los cruces con otras zonas)
export function partidosDeEquipos(partidos, equipos) {
  const ids = new Set(equipos.map((e) => e.id));
  return partidos.filter((p) => ids.has(p.localId) || ids.has(p.visitanteId)).sort(porFechaHoraEId);
}

// ¿Algún equipo trae partidos de la tabla inicial? (la fecha 1 se cargó sin detalle)
export function tieneTablaInicial(tablaInicial, equipos) {
  const ids = new Set(equipos.map((e) => e.id));
  return tablaInicial.some((t) => ids.has(t.equipoId) && t.pj > 0);
}

// [{ fecha: 1, partidos: [...] }, ...]
export function agruparPorFecha(partidos) {
  const porFecha = new Map();
  partidos.forEach((p) => {
    if (!porFecha.has(p.fecha)) porFecha.set(p.fecha, []);
    porFecha.get(p.fecha).push(p);
  });
  return [...porFecha.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([fecha, lista]) => ({ fecha, partidos: lista }));
}

// Suma la fecha 1 a la lista aunque no tenga partidos, si se cargó como tabla inicial
export function fechasConTablaInicial(fechas, conTablaInicial) {
  if (!conTablaInicial || fechas.some((f) => f.fecha === 1)) return fechas;
  return [{ fecha: 1, partidos: [] }, ...fechas];
}

// Los postergados no cuentan para saber si la fecha se jugó
export function estadoFecha(partidos) {
  const activos = partidos.filter((p) => !p.postergado);
  if (!activos.length) return partidos.length ? 'postergada' : 'pendiente';
  const jugados = activos.filter(tieneResultado).length;
  if (jugados === 0) return 'pendiente';
  return jugados === activos.length ? 'jugada' : 'parcial';
}

export const ETIQUETA_ESTADO_FECHA = {
  jugada: 'Jugada',
  pendiente: 'Pendiente',
  parcial: 'En curso',
  postergada: 'Postergada',
};

// La fecha que se está jugando: la última con resultados o, si esa ya está completa (los postergados
// no cuentan), la siguiente armada. Sin resultados todavía, la primera con partidos por jugar.
export function fechaEnJuego(fechas) {
  const conPendientes = (f) => f.partidos.some((p) => !p.postergado && !tieneResultado(p));
  // La última fecha con algún resultado: un postergado viejo que se recupera no la hace volver atrás
  let i = fechas.length - 1;
  while (i >= 0 && !fechas[i].partidos.some(tieneResultado)) i--;
  if (i >= 0) {
    const siguiente = fechas[i + 1];
    return !conPendientes(fechas[i]) && siguiente ? siguiente.fecha : fechas[i].fecha;
  }
  // Todavía sin resultados: la primera con partidos por jugar
  const primera = fechas.find(conPendientes);
  if (primera) return primera.fecha;
  return fechas.length ? fechas[fechas.length - 1].fecha : 1;
}

// Todo lo que hace falta para mostrar una expulsión
export function detalleExpulsion(db, expulsion) {
  const partido = db.partidos.find((p) => p.id === expulsion.partidoId);
  const equipo = db.equipos.find((e) => e.id === expulsion.equipoId);
  if (!partido || !equipo) return null;
  return {
    partido,
    equipo,
    zona: db.zonas.find((z) => z.id === equipo.zonaId),
    categoria: db.categorias.find((c) => c.id === partido.categoriaId),
    local: db.equipos.find((e) => e.id === partido.localId),
    visitante: db.equipos.find((e) => e.id === partido.visitanteId),
  };
}
