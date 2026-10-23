import { describe, expect, it } from 'vitest';
import { rachaDeEquipo } from './racha.js';

const p = (id, fecha, localId, visitanteId, golesLocal, golesVisitante, extra = {}) => ({
  id,
  categoriaId: 1,
  fecha,
  localId,
  visitanteId,
  golesLocal,
  golesVisitante,
  postergado: false,
  ausente: null,
  ...extra,
});

// Equipo 1: V, E, D, V (W.O.), [W.O. doble], V, E, [pendiente], [postergado]
const partidos = [
  p(1, 1, 1, 2, 2, 0),
  p(2, 2, 3, 1, 1, 1),
  p(3, 3, 1, 4, 0, 1),
  p(4, 4, 5, 1, 0, 3, { ausente: 'local' }),
  p(5, 5, 1, 6, 0, 0, { ausente: 'ambos' }),
  p(6, 6, 1, 7, 3, 1),
  p(7, 7, 8, 1, 2, 2),
  p(8, 8, 1, 9, null, null),
  p(9, 9, 1, 2, null, null, { postergado: true }),
];

describe('rachaDeEquipo', () => {
  it('devuelve los últimos 5 resultados, del más viejo al más nuevo', () => {
    expect(rachaDeEquipo(1, partidos)).toEqual(['E', 'D', 'V', 'V', 'E']);
  });

  it('el W.O. cuenta por el resultado cargado; el W.O. doble, los pendientes y los postergados no cuentan', () => {
    expect(rachaDeEquipo(1, partidos, 10)).toEqual(['V', 'E', 'D', 'V', 'V', 'E']);
  });

  it('mira cada partido desde el lado del equipo', () => {
    expect(rachaDeEquipo(2, partidos)).toEqual(['D']);
  });

  it('sin partidos jugados devuelve una lista vacía', () => {
    expect(rachaDeEquipo(9, partidos)).toEqual([]);
  });
});
