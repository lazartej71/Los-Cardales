import { describe, expect, it } from 'vitest';
import { normalizarPartido } from './repositorio.js';

describe('partidos leídos de Supabase', () => {
  it('sin las columnas de la migración 3, llegan sin lugar ni hora', () => {
    expect(normalizarPartido({ id: 1, local_id: 2, goles_local: null })).toEqual({
      id: 1,
      localId: 2,
      golesLocal: null,
      predio: null,
      cancha: null,
      hora: null,
    });
  });

  it('la hora llega sin segundos', () => {
    expect(normalizarPartido({ id: 1, predio: 'los_cardales', cancha: 2, hora: '13:40:00' })).toEqual({
      id: 1,
      predio: 'los_cardales',
      cancha: 2,
      hora: '13:40',
    });
  });
});
