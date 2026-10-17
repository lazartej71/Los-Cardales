import { describe, expect, it } from 'vitest';
import { crearDatosEjemplo } from '../datos/datosEjemplo.js';
import { conFutbol7 } from '../datos/datosEjemploFutbol7.js';
import {
  ajustesDeCuenta,
  categoriasDeModalidad,
  filtrarPorModalidad,
  guardarModalidad,
  hayFutbol7,
  leerModalidadGuardada,
  modalidadDeCategoria,
  modalidadDeEquipo,
  modalidadDePartido,
  nombreCategoria,
  nombreModalidad,
  puedeModalidad,
} from './modalidades.js';

// Almacenamiento del navegador en memoria
function almacenFalso(inicial = {}) {
  const datos = { ...inicial };
  return {
    datos,
    getItem: (clave) => datos[clave] ?? null,
    setItem: (clave, valor) => {
      datos[clave] = valor;
    },
  };
}
const almacenRoto = {
  getItem: () => {
    throw new Error('bloqueado');
  },
  setItem: () => {
    throw new Error('bloqueado');
  },
};

describe('modalidades', () => {
  const db = conFutbol7();
  const libreF7 = db.categorias.find((c) => c.id === 10);
  const libreF11 = db.categorias.find((c) => c.id === 1);

  it('la modalidad de una categoría: sin la columna, Fútbol 11', () => {
    expect(modalidadDeCategoria(libreF7)).toBe('f7');
    expect(modalidadDeCategoria({ id: 1, nombre: 'Libre', orden: 1 })).toBe('f11');
    expect(modalidadDeCategoria(undefined)).toBe('f11');
  });

  it('sabe si hay Fútbol 7 cargado', () => {
    expect(hayFutbol7(db.categorias)).toBe(true);
    expect(hayFutbol7(crearDatosEjemplo().categorias)).toBe(false);
  });

  it('el nombre de cada modalidad', () => {
    expect(nombreModalidad('f11')).toBe('Fútbol 11');
    expect(nombreModalidad('f7')).toBe('Fútbol 7');
  });

  it('las categorías de una modalidad, en orden', () => {
    const desordenadas = [...db.categorias].reverse();
    expect(categoriasDeModalidad(desordenadas, 'f7').map((c) => c.id)).toEqual([10]);
    expect(categoriasDeModalidad(desordenadas, 'f11').map((c) => c.id)).toEqual([1, 2, 3, 4]);
  });

  it('el nombre de una categoría, con la modalidad si hace falta distinguir', () => {
    expect(nombreCategoria(libreF7)).toBe('Libre');
    expect(nombreCategoria(libreF7, { conModalidad: true })).toBe('F7 · Libre');
    expect(nombreCategoria(libreF11, { conModalidad: true })).toBe('F11 · Libre');
  });

  it('la modalidad de un partido y de un equipo', () => {
    expect(modalidadDePartido(db, db.partidos.find((p) => p.id === 201))).toBe('f7');
    expect(modalidadDePartido(db, db.partidos[0])).toBe('f11');
    expect(modalidadDeEquipo(db, 101)).toBe('f7');
    expect(modalidadDeEquipo(db, 1)).toBe('f11');
    expect(modalidadDeEquipo(db, 9999)).toBeNull();
  });

  it('una cuenta sin modalidad puede con las dos; una fija, solo con la suya', () => {
    expect(puedeModalidad(null, 'f7')).toBe(true);
    expect(puedeModalidad('f7', 'f7')).toBe(true);
    expect(puedeModalidad('f7', 'f11')).toBe(false);
    expect(puedeModalidad('f11', 'f7')).toBe(false);
  });

  it('con Fútbol 7 deja solo lo de esa modalidad, también lo privado', () => {
    const f7 = filtrarPorModalidad(db, 'f7');
    expect(f7.categorias.map((c) => c.id)).toEqual([10]);
    expect(f7.zonas.map((z) => z.id)).toEqual([20, 21]);
    expect(f7.equipos).toHaveLength(8);
    expect(f7.partidos.map((p) => p.id)).toEqual([201, 202, 203, 204]);
    expect(f7.movimientos.map((m) => m.id)).toEqual([900]);
    expect(f7.expulsiones.map((e) => e.id)).toEqual([900]);
    expect(f7.configuracion).toBe(db.configuracion);
  });

  it('con Fútbol 11 deja exactamente lo de siempre', () => {
    const base = crearDatosEjemplo();
    const f11 = filtrarPorModalidad(conFutbol7(base), 'f11');
    // oxlint-disable-next-line no-unused-vars
    const categorias = f11.categorias.map(({ modalidad, arancel, ...c }) => c);
    expect({ ...f11, categorias }).toEqual(base);
  });

  it('con Todas nombra cada categoría con su modalidad (hay dos Libre)', () => {
    expect(filtrarPorModalidad(db, 'todas').categorias.map((c) => c.nombre)).toEqual([
      'F11 · Libre',
      'F11 · +35',
      'F11 · +40',
      'F11 · +45',
      'F7 · Libre',
    ]);
    const soloF11 = crearDatosEjemplo();
    expect(filtrarPorModalidad(soloF11, 'todas')).toBe(soloF11);
  });

  it('el celular recuerda la modalidad elegida', () => {
    const almacen = almacenFalso();
    expect(leerModalidadGuardada(almacen)).toBeNull();
    guardarModalidad(almacen, 'f7');
    expect(almacen.datos['lc-modalidad']).toBe('f7');
    expect(leerModalidadGuardada(almacen)).toBe('f7');
    expect(leerModalidadGuardada(almacenFalso({ 'lc-modalidad': 'f5' }))).toBeNull();
    expect(leerModalidadGuardada(almacenRoto)).toBeNull();
    expect(leerModalidadGuardada(null)).toBeNull();
    expect(() => guardarModalidad(almacenRoto, 'f7')).not.toThrow();
  });

  it('qué ajustes ve cada cuenta', () => {
    expect(ajustesDeCuenta(db, null)).toEqual({ generales: true, criterios: true, categoriasConArancel: [libreF7] });
    expect(ajustesDeCuenta(db, 'f11')).toEqual({ generales: true, criterios: false, categoriasConArancel: [] });
    expect(ajustesDeCuenta(db, 'f7')).toEqual({ generales: false, criterios: false, categoriasConArancel: [libreF7] });
  });
});
