import { describe, expect, it } from 'vitest';
import { armarDatos, generarSql } from './importacion.js';

// Una hoja chica con el formato del Excel: POS, CLUB, PUNTOS, GF, GC, DIF, PJ, ZONA
const encabezado = ['POS', 'CLUB', 'PUNTOS', 'GOL A FAV', 'GOL EN CON', 'DIFERENCIA', 'PAR JUG', 'ZONA'];
const opciones = {
  categorias: [
    { id: 1, nombre: 'Libre', orden: 1, hoja: 'Hoja1' },
    { id: 2, nombre: '+45', orden: 2, hoja: 'Hoja4' },
  ],
  postergados: [{ categoria: '+45', local: 'ECUADOR', visitante: 'PORTEROS' }],
};
const hojas = {
  Hoja1: [
    encabezado,
    [1, 'BRANCA', 3, 8, 2, 6, 1, 'A'],
    [2, 'SANTA ROSA', 0, 2, 8, 6, 1, 'A'],
    encabezado,
    [1, 'CILINDRO', 1, 1, 1, 0, 1, 'B'],
    [null, 'POSTERGADO FECHA 1'],
  ],
  Hoja4: [
    encabezado.slice(0, 7),
    [1, 'ECUAD0R', 0, 0, 0, 0, 0],
    [2, 'PORTEROS', 0, 0, 'O', 0, 0],
  ],
};

describe('armarDatos', () => {
  it('arma una zona por letra y "Zona única" cuando no hay letra', () => {
    const { zonas } = armarDatos(hojas, opciones);
    expect(zonas).toEqual([
      { id: 1, categoriaId: 1, nombre: 'Zona A' },
      { id: 2, categoriaId: 1, nombre: 'Zona B' },
      { id: 3, categoriaId: 2, nombre: 'Zona única' },
    ]);
  });

  it('deduce ganados, empatados y perdidos de los puntos', () => {
    const { equipos, tablaInicial } = armarDatos(hojas, opciones);
    const de = (nombre) => tablaInicial.find((t) => t.equipoId === equipos.find((e) => e.nombre === nombre).id);
    expect(de('BRANCA')).toMatchObject({ pj: 1, pg: 1, pe: 0, pp: 0, gf: 8, gc: 2 });
    expect(de('SANTA ROSA')).toMatchObject({ pj: 1, pg: 0, pe: 0, pp: 1, gf: 2, gc: 8 });
    expect(de('CILINDRO')).toMatchObject({ pj: 1, pg: 0, pe: 1, pp: 0 });
  });

  it('corrige los errores de tipeo conocidos', () => {
    const { equipos, tablaInicial } = armarDatos(hojas, opciones);
    expect(equipos.map((e) => e.nombre)).toContain('ECUADOR');
    const porteros = equipos.find((e) => e.nombre === 'PORTEROS');
    expect(tablaInicial.find((t) => t.equipoId === porteros.id).gc).toBe(0);
  });

  it('arma los partidos postergados de la fecha 1', () => {
    const { equipos, partidos } = armarDatos(hojas, opciones);
    const id = (nombre) => equipos.find((e) => e.nombre === nombre).id;
    expect(partidos).toEqual([
      { categoriaId: 2, fecha: 1, localId: id('ECUADOR'), visitanteId: id('PORTEROS'), postergado: true },
    ]);
  });

  it('frena si los puntos no cierran con los partidos jugados', () => {
    const malas = { ...hojas, Hoja1: [encabezado, [1, 'BRANCA', 2, 8, 2, 6, 1, 'A']] };
    expect(() => armarDatos(malas, opciones)).toThrow(/BRANCA/);
  });

  it('frena si un postergado nombra a un equipo que no existe', () => {
    const otras = { ...opciones, postergados: [{ categoria: '+45', local: 'NADIE', visitante: 'PORTEROS' }] };
    expect(() => armarDatos(hojas, otras)).toThrow(/NADIE/);
  });
});

describe('generarSql', () => {
  it('genera los inserts, escapa comillas y ajusta la secuencia de equipos', () => {
    const datos = armarDatos(hojas, opciones);
    datos.equipos[0].nombre = "L'EQUIPO";
    const sql = generarSql(datos, { nombreCampeonato: 'Copa GP' });
    expect(sql).toContain("(1, 1, 'L''EQUIPO')");
    expect(sql).toContain("(1, 'Copa GP', array['puntos', 'dg', 'gf', 'enfrentamiento'])");
    expect(sql).toContain("setval(pg_get_serial_sequence('public.equipos', 'id')");
    expect(sql.trim().startsWith('--')).toBe(true);
    expect(sql).toMatch(/begin;[\s\S]*commit;/);
  });
});
