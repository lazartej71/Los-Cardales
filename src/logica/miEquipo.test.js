import { describe, expect, it } from 'vitest';
import { crearDatosEjemplo } from '../datos/datosEjemplo.js';
import { conFutbol7 } from '../datos/datosEjemploFutbol7.js';
import {
  alternarMiEquipo,
  guardarMiEquipo,
  leerMiEquipoGuardado,
  proximoPartido,
  resumenMiEquipo,
  textoProximoPartido,
} from './miEquipo.js';

// Almacenamiento del navegador en memoria (como en modalidades.test.js)
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
const NINGUNO = { f11: null, f7: null };

describe('Mi equipo guardado en el celular', () => {
  it('guarda y lee un equipo por modalidad', () => {
    const almacen = almacenFalso();
    expect(leerMiEquipoGuardado(almacen)).toEqual(NINGUNO);
    guardarMiEquipo(almacen, { f11: 12, f7: null });
    expect(almacen.datos['lc-mi-equipo']).toBe('{"f11":12,"f7":null}');
    expect(leerMiEquipoGuardado(almacen)).toEqual({ f11: 12, f7: null });
  });

  it('con datos rotos, sin almacenamiento o si falla, no hay equipo y nada se rompe', () => {
    expect(leerMiEquipoGuardado(almacenFalso({ 'lc-mi-equipo': '{roto' }))).toEqual(NINGUNO);
    expect(leerMiEquipoGuardado(almacenFalso({ 'lc-mi-equipo': '{"f11":"x","f7":-3}' }))).toEqual(NINGUNO);
    expect(leerMiEquipoGuardado(almacenRoto)).toEqual(NINGUNO);
    expect(leerMiEquipoGuardado(null)).toEqual(NINGUNO);
    expect(() => guardarMiEquipo(almacenRoto, { f11: 1, f7: null })).not.toThrow();
  });

  it('un toque marca, otro desmarca, y marcar otro reemplaza al de esa modalidad', () => {
    expect(alternarMiEquipo({ f11: null, f7: 5 }, 'f11', 12)).toEqual({ f11: 12, f7: 5 });
    expect(alternarMiEquipo({ f11: 12, f7: 5 }, 'f11', 12)).toEqual({ f11: null, f7: 5 });
    expect(alternarMiEquipo({ f11: 12, f7: 5 }, 'f11', 7)).toEqual({ f11: 7, f7: 5 });
  });
});

describe('próximo partido', () => {
  const p = (id, fecha, extra = {}) => ({
    id,
    fecha,
    localId: 1,
    visitanteId: 2,
    golesLocal: null,
    golesVisitante: null,
    postergado: false,
    predio: null,
    cancha: null,
    hora: null,
    dia: null,
    ...extra,
  });
  const nombreDe = (id) => ({ 1: 'Puerto Argentino', 2: 'La Previa' })[id];

  it('es el primero sin resultado y sin postergar; si solo quedan postergados, el primero de ellos', () => {
    const jugado = p(1, 1, { golesLocal: 1, golesVisitante: 0 });
    const postergado = p(2, 2, { postergado: true });
    expect(proximoPartido([jugado, postergado, p(3, 3), p(4, 4)], 1).id).toBe(3);
    expect(proximoPartido([jugado, postergado], 1).id).toBe(2);
    expect(proximoPartido([jugado], 1)).toBeNull();
    expect(proximoPartido([p(5, 3, { localId: 7, visitanteId: 8 })], 1)).toBeNull();
  });

  it('dice la fecha, el lugar y el rival', () => {
    const lugar = { predio: 'los_cardales', cancha: 3, hora: '16:30' };
    expect(textoProximoPartido(p(1, 5, lugar), 1, nombreDe)).toBe('Fecha 5 · Los Cardales · Cancha 3 · 16:30 · vs La Previa');
    expect(textoProximoPartido(p(1, 6, { localId: 2, visitanteId: 1 }), 1, nombreDe)).toBe('Fecha 6 · vs La Previa');
  });

  it('un postergado dice de qué fecha es y cuándo se juega, o que falta confirmar', () => {
    const lugar = { predio: 'los_cardales', cancha: 2, hora: '10:00' };
    expect(textoProximoPartido(p(1, 2, { ...lugar, postergado: true }), 1, nombreDe)).toBe(
      'Postergado de la fecha 2, a confirmar · vs La Previa'
    );
    expect(textoProximoPartido(p(1, 2, { ...lugar, postergado: true, dia: '2026-10-12' }), 1, nombreDe)).toBe(
      'Postergado de la fecha 2 · Lunes 12/10 · Los Cardales · Cancha 2 · 10:00 · vs La Previa'
    );
  });
});

describe('resumenMiEquipo', () => {
  it('trae el equipo, su puesto y sus puntos en su zona, y el próximo partido', () => {
    const r = resumenMiEquipo(crearDatosEjemplo(), 1, 'f11');
    expect(r.equipo.nombre).toBe('Libre A1');
    expect(r.zona.id).toBe(1);
    expect([r.fila.pos, r.fila.pts]).toEqual([2, 4]);
    expect([r.proximo.fecha, r.proximo.visitanteId]).toEqual([3, 4]);
  });

  it('nada si el equipo no existe, está dado de baja o es de la otra modalidad', () => {
    const db = crearDatosEjemplo();
    expect(resumenMiEquipo(db, 999, 'f11')).toBeNull();
    db.equipos = db.equipos.map((e) => (e.id === 1 ? { ...e, baja: true } : e));
    expect(resumenMiEquipo(db, 1, 'f11')).toBeNull();
    expect(resumenMiEquipo(conFutbol7(), 101, 'f11')).toBeNull();
    expect(resumenMiEquipo(conFutbol7(), 101, 'f7').equipo.nombre).toBe('F7 A1');
  });
});
