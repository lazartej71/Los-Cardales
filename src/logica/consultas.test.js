import { describe, expect, it } from 'vitest';
import { fechaEnJuego, fechaEnJuegoPorCategoria, partidosDeCategoria, ultimaFechaJugada } from './consultas.js';

let ultimoId = 0;
const pendiente = (fecha, cambios = {}) => ({
  id: ++ultimoId,
  fecha,
  golesLocal: null,
  golesVisitante: null,
  postergado: false,
  ...cambios,
});
const jugado = (fecha) => pendiente(fecha, { golesLocal: 1, golesVisitante: 0 });
const postergado = (fecha) => pendiente(fecha, { postergado: true });
const fechas = (...grupos) => grupos.map(([fecha, partidos]) => ({ fecha, partidos }));

describe('fechaEnJuego', () => {
  it('los postergados de la fecha 1 no la frenan: si la 2 está pendiente, es la 2', () => {
    expect(fechaEnJuego(fechas([1, [postergado(1)]], [2, [pendiente(2), pendiente(2)]]))).toBe(2);
  });

  it('con la fecha 2 completa y la 3 armada, es la 3', () => {
    expect(fechaEnJuego(fechas([1, []], [2, [jugado(2), postergado(2)]], [3, [pendiente(3)]]))).toBe(3);
  });

  it('una fecha a medio cargar sigue siendo la fecha en juego', () => {
    expect(fechaEnJuego(fechas([2, [jugado(2), pendiente(2)]], [3, [pendiente(3)]]))).toBe(2);
  });

  // Un postergado que se reprograma deja de estar postergado, pero sigue en su fecha original
  it('un postergado de la fecha 1 que se recupera no la hace volver a la 1', () => {
    expect(fechaEnJuego(fechas([1, [pendiente(1)]], [2, [jugado(2)]], [3, [jugado(3), pendiente(3)]]))).toBe(3);
    expect(fechaEnJuego(fechas([1, [pendiente(1)]], [2, [jugado(2)]], [3, [pendiente(3)]]))).toBe(3);
    expect(fechaEnJuego(fechas([1, [pendiente(1)]], [2, [jugado(2)]]))).toBe(2);
  });

  it('si todo está cargado es la última, y sin fechas es la 1', () => {
    expect(fechaEnJuego(fechas([1, [jugado(1)]], [2, [jugado(2)]]))).toBe(2);
    expect(fechaEnJuego([])).toBe(1);
  });
});

describe('fecha en juego de cada categoría', () => {
  const de = (categoriaId, partido) => ({ ...partido, categoriaId });

  // Como el fin de semana del 17/10: Libre jugó toda la fecha 4 un feriado y ya va por la 5; el resto, por la 4
  it('cada categoría tiene la suya, aunque una vaya una fecha adelante', () => {
    const partidos = [
      de(1, jugado(3)),
      de(1, jugado(4)),
      de(1, pendiente(5)),
      de(2, jugado(3)),
      de(2, pendiente(4)),
      de(5, jugado(3)),
      de(5, postergado(3)),
      de(5, pendiente(4)),
    ];
    expect(fechaEnJuegoPorCategoria(partidos)).toEqual(
      new Map([
        [1, 5],
        [2, 4],
        [5, 4],
      ])
    );
  });

  it('sin partidos no hay ninguna', () => {
    expect(fechaEnJuegoPorCategoria([])).toEqual(new Map());
  });
});

describe('orden de los partidos', () => {
  it('dentro de cada fecha van por hora y los que no tienen hora al final', () => {
    const partidos = [
      { id: 1, categoriaId: 1, fecha: 2, hora: null },
      { id: 2, categoriaId: 1, fecha: 2, hora: '15:10' },
      { id: 3, categoriaId: 1, fecha: 2, hora: '13:40' },
      { id: 4, categoriaId: 1, fecha: 1, hora: '18:00' },
    ];
    expect(partidosDeCategoria(partidos, 1).map((p) => p.id)).toEqual([4, 3, 2, 1]);
  });
});

describe('ultimaFechaJugada', () => {
  it('es la fecha más alta con algún resultado', () => {
    expect(ultimaFechaJugada([jugado(2), jugado(3), pendiente(4)], false)).toBe(3);
  });

  it('con solo la tabla inicial es la fecha 1, y sin nada jugado es 0', () => {
    expect(ultimaFechaJugada([pendiente(2)], true)).toBe(1);
    expect(ultimaFechaJugada([pendiente(2)], false)).toBe(0);
  });
});
