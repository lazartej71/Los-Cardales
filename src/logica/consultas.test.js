import { describe, expect, it } from 'vitest';
import { fechaEnJuego, partidosDeCategoria } from './consultas.js';

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

  it('si todo está cargado es la última, y sin fechas es la 1', () => {
    expect(fechaEnJuego(fechas([1, [jugado(1)]], [2, [jugado(2)]]))).toBe(2);
    expect(fechaEnJuego([])).toBe(1);
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
