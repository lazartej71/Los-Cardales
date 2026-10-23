import { describe, expect, it } from 'vitest';
import { CRITERIOS_POR_DEFECTO } from '../datos/constantes.js';
import { movimientosDePuestos } from './movimiento.js';
import { calcularTabla } from './tabla.js';

// ALFA gana la fecha 1; en la fecha 2 GAMA le gana 2 a 0 y lo pasa por diferencia de gol
const equipos = [
  { id: 1, zonaId: 10, nombre: 'ALFA' },
  { id: 2, zonaId: 10, nombre: 'BETA' },
  { id: 3, zonaId: 10, nombre: 'GAMA' },
];
const partidos = [
  { id: 1, categoriaId: 5, fecha: 1, localId: 1, visitanteId: 2, golesLocal: 1, golesVisitante: 0, postergado: false },
  { id: 2, categoriaId: 5, fecha: 2, localId: 3, visitanteId: 1, golesLocal: 2, golesVisitante: 0, postergado: false },
];
const contexto = (ultimaFecha) => ({ equipos, partidos, criterios: CRITERIOS_POR_DEFECTO, tablaInicial: [], ultimaFecha });

describe('movimientosDePuestos', () => {
  it('compara con la tabla de antes de la última fecha con resultados', () => {
    const filas = calcularTabla(equipos, partidos, CRITERIOS_POR_DEFECTO);
    expect(movimientosDePuestos(filas, contexto(2))).toEqual(
      new Map([
        [3, 1],
        [1, -1],
      ])
    );
  });

  it('con una sola fecha jugada no hay movimientos', () => {
    const filas = calcularTabla(equipos, partidos.slice(0, 1), CRITERIOS_POR_DEFECTO);
    expect(movimientosDePuestos(filas, contexto(1)).size).toBe(0);
  });
});
