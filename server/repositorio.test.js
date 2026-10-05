import { describe, expect, it } from 'vitest';
import { normalizarExpulsion, normalizarPartido } from './repositorio.js';

describe('partidos leídos de Supabase', () => {
  it('sin las columnas de las migraciones 3 y 7, llegan sin lugar, hora ni día', () => {
    expect(normalizarPartido({ id: 1, local_id: 2, goles_local: null })).toEqual({
      id: 1,
      localId: 2,
      golesLocal: null,
      predio: null,
      cancha: null,
      hora: null,
      dia: null,
    });
  });

  it('una roja llega con su tipo, o sin tipo si la migración 7 no se corrió, y sin la fecha de carga', () => {
    const fila = {
      id: 1,
      partido_id: 2,
      equipo_id: 3,
      numero_camiseta: 10,
      nombre_jugador: '',
      fechas_suspension: null,
      fechas_cumplidas: 0,
      creado_en: '2026-10-05T12:00:00Z',
    };
    const esperada = {
      id: 1,
      partidoId: 2,
      equipoId: 3,
      numeroCamiseta: 10,
      nombreJugador: '',
      fechasSuspension: null,
      fechasCumplidas: 0,
    };
    expect(normalizarExpulsion(fila)).toEqual({ ...esperada, tipo: null });
    expect(normalizarExpulsion({ ...fila, tipo: 'directa' })).toEqual({ ...esperada, tipo: 'directa' });
  });

  it('la hora llega sin segundos', () => {
    expect(normalizarPartido({ id: 1, predio: 'los_cardales', cancha: 2, hora: '13:40:00', dia: '2026-10-12' })).toEqual({
      id: 1,
      predio: 'los_cardales',
      cancha: 2,
      hora: '13:40',
      dia: '2026-10-12',
    });
  });
});
