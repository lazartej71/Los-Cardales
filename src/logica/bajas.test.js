import { describe, expect, it } from 'vitest';
import { mismoNombre, partidosPendientes, textoPendientes } from './bajas.js';

const partido = (id, localId, visitanteId, extra = {}) => ({
  id, fecha: 2, localId, visitanteId, golesLocal: null, golesVisitante: null, postergado: false, ausente: null, ...extra,
});

describe('partidos pendientes de un equipo', () => {
  it('cuenta los sin resultado y los postergados (con o sin día), pero no los jugados ni los W.O.', () => {
    const partidos = [
      partido(1, 7, 8),
      partido(2, 9, 7, { postergado: true }),
      partido(3, 7, 10, { postergado: true, dia: '2026-10-13', predio: 'los_cardales', cancha: 2, hora: '13:40' }),
      partido(4, 7, 11, { golesLocal: 2, golesVisitante: 2 }),
      partido(5, 12, 7, { golesLocal: 3, golesVisitante: 0, ausente: 'visitante' }),
      partido(6, 8, 9),
    ];
    expect(partidosPendientes(partidos, 7).map((p) => p.id)).toEqual([1, 2, 3]);
    expect(partidosPendientes(partidos, 11)).toEqual([]);
  });

  it('explica qué falta antes de darlo de baja', () => {
    expect(textoPendientes('GOB GUTIERREZ', 1)).toBe(
      'GOB GUTIERREZ tiene 1 partido sin resultado. Cargale el resultado o borralo antes de darlo de baja.'
    );
    expect(textoPendientes('GOB GUTIERREZ', 2)).toBe(
      'GOB GUTIERREZ tiene 2 partidos sin resultado. Cargales el resultado o borralos antes de darlo de baja.'
    );
  });
});

describe('nombres repetidos', () => {
  it('no distingue mayúsculas, acentos ni espacios de más', () => {
    expect(mismoNombre('chivero  f.c ', 'CHIVERO F.C')).toBe(true);
    expect(mismoNombre('Unión', 'UNION')).toBe(true);
    expect(mismoNombre('CHIVERO F.C', 'CHIVERO')).toBe(false);
  });
});
