/**
 * Fútbol 11 y Fútbol 7: de qué modalidad es cada cosa, qué puede tocar cada cuenta y los datos de una
 * sola modalidad. La modalidad sale de la categoría (zonas, equipos y partidos la heredan). Lo usan la
 * vista pública, el panel y la API.
 */

import { MODALIDADES } from '../datos/constantes.js';

const CLAVE = 'lc-modalidad';
const IDS = MODALIDADES.map((m) => m.id);
const porOrden = (a, b) => a.orden - b.orden;

// Sin la columna (antes de la migración 10a), todo es Fútbol 11
export const modalidadDeCategoria = (categoria) => categoria?.modalidad ?? 'f11';

export const hayFutbol7 = (categorias) => categorias.some((c) => modalidadDeCategoria(c) === 'f7');

export const nombreModalidad = (modalidad) => MODALIDADES.find((m) => m.id === modalidad)?.nombre ?? '';

export const categoriasDeModalidad = (categorias, modalidad) =>
  categorias.filter((c) => modalidadDeCategoria(c) === modalidad).sort(porOrden);

// "Libre", o "F7 · Libre" donde se ven las dos modalidades juntas
export function nombreCategoria(categoria, { conModalidad = false } = {}) {
  if (!conModalidad) return categoria.nombre;
  const corto = MODALIDADES.find((m) => m.id === modalidadDeCategoria(categoria)).corto;
  return `${corto} · ${categoria.nombre}`;
}

export const modalidadDePartido = (db, partido) =>
  modalidadDeCategoria(db.categorias.find((c) => c.id === partido.categoriaId));

export function modalidadDeEquipo(db, equipoId) {
  const equipo = db.equipos.find((e) => e.id === equipoId);
  const zona = equipo && db.zonas.find((z) => z.id === equipo.zonaId);
  return zona ? modalidadDeCategoria(db.categorias.find((c) => c.id === zona.categoriaId)) : null;
}

// Una cuenta sin modalidad (superadmin, admin sin restricción) puede con las dos
export const puedeModalidad = (cuentaModalidad, modalidad) => cuentaModalidad === null || cuentaModalidad === modalidad;

// Las listas privadas no llegan a la vista pública: si no están, siguen sin estar
const filtrar = (lista, quedar) => lista && lista.filter(quedar);

/**
 * Los datos de una modalidad ('f11' o 'f7'): categorías, zonas, equipos, partidos y lo privado de esos
 * equipos y partidos. Con 'todas' están los de las dos, y si hay Fútbol 7 cada categoría dice su
 * modalidad ("F7 · Libre"), porque hay dos con el mismo nombre.
 */
export function filtrarPorModalidad(db, modalidad) {
  if (modalidad === 'todas') {
    if (!hayFutbol7(db.categorias)) return db;
    return { ...db, categorias: db.categorias.map((c) => ({ ...c, nombre: nombreCategoria(c, { conModalidad: true }) })) };
  }
  const categorias = db.categorias.filter((c) => modalidadDeCategoria(c) === modalidad);
  const deCategoria = new Set(categorias.map((c) => c.id));
  const zonas = db.zonas.filter((z) => deCategoria.has(z.categoriaId));
  const deZona = new Set(zonas.map((z) => z.id));
  const equipos = db.equipos.filter((e) => deZona.has(e.zonaId));
  const deEquipo = new Set(equipos.map((e) => e.id));
  const partidos = db.partidos.filter((p) => deCategoria.has(p.categoriaId));
  const dePartido = new Set(partidos.map((p) => p.id));
  return {
    ...db,
    categorias,
    zonas,
    equipos,
    partidos,
    tablaInicial: filtrar(db.tablaInicial, (t) => deEquipo.has(t.equipoId)),
    movimientos: filtrar(db.movimientos, (m) => deEquipo.has(m.equipoId)),
    expulsiones: filtrar(db.expulsiones, (e) => dePartido.has(e.partidoId)),
    tarjetas: filtrar(db.tarjetas, (t) => dePartido.has(t.partidoId)),
  };
}

// La modalidad que eligió la persona en este celular, o null (sin almacenamiento, o si falla)
export function leerModalidadGuardada(almacen) {
  try {
    const guardada = almacen?.getItem(CLAVE) ?? null;
    return IDS.includes(guardada) ? guardada : null;
  } catch {
    return null;
  }
}

export function guardarModalidad(almacen, modalidad) {
  try {
    almacen?.setItem(CLAVE, modalidad);
  } catch {
    // Sin almacenamiento: la próxima vez abre en Fútbol 11
  }
}

/**
 * Qué ajustes cambia la cuenta: los generales (nombre del campeonato y arancel de Fútbol 11), los
 * criterios de desempate (valen para las dos: solo una cuenta sin modalidad) y el arancel de cada
 * categoría de Fútbol 7.
 */
export function ajustesDeCuenta(db, cuentaModalidad) {
  return {
    generales: puedeModalidad(cuentaModalidad, 'f11'),
    criterios: cuentaModalidad === null,
    categoriasConArancel: puedeModalidad(cuentaModalidad, 'f7') ? categoriasDeModalidad(db.categorias, 'f7') : [],
  };
}
