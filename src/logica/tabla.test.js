import { describe, expect, it } from 'vitest';
import { CRITERIOS_POR_DEFECTO } from '../datos/constantes.js';
import { crearDatosEjemplo } from '../datos/datosEjemplo.js';
import { equiposDeZona, partidosDeEquipos, zonasDeCategoria } from './consultas.js';
import { calcularTabla } from './tabla.js';

// Tabla de una zona de los datos de ejemplo
function tablaDe(categoria, letra, criterios = CRITERIOS_POR_DEFECTO, datos = crearDatosEjemplo()) {
  const cat = datos.categorias.find((c) => c.nombre === categoria);
  const zona = zonasDeCategoria(datos.zonas, cat.id).find((z) => z.nombre === `Zona ${letra}`);
  const equipos = equiposDeZona(datos.equipos, zona.id);
  return calcularTabla(equipos, partidosDeEquipos(datos.partidos, equipos), criterios, datos.tablaInicial);
}
const nombres = (filas) => filas.map((f) => f.equipo.nombre);
const partido = (id, localId, visitanteId, golesLocal, golesVisitante, extra = {}) => ({
  id,
  fecha: 2,
  localId,
  visitanteId,
  golesLocal,
  golesVisitante,
  postergado: false,
  ...extra,
});

describe('calcularTabla', () => {
  it('suma partidos, goles y puntos (3 por ganar, 1 por empatar)', () => {
    const [primero] = tablaDe('Libre', 'A');
    expect(primero.equipo.nombre).toBe('Libre A3');
    expect(primero).toMatchObject({ pos: 1, pj: 2, pg: 1, pe: 1, pp: 0, gf: 3, gc: 1, dg: 2, pts: 4 });
  });

  it('desempata por diferencia de gol con el orden por defecto', () => {
    const filas = tablaDe('Libre', 'A');
    expect(nombres(filas)).toEqual(['Libre A3', 'Libre A1', 'Libre A2', 'Libre A4']);
    expect(filas[0].desempate).toBe('dg');
  });

  it('respeta el orden de criterios que elige el admin', () => {
    const filas = tablaDe('Libre', 'A', ['puntos', 'gf', 'dg', 'enfrentamiento']);
    expect(nombres(filas).slice(0, 2)).toEqual(['Libre A1', 'Libre A3']);
    expect(filas[0].desempate).toBe('gf');
  });

  it('usa el resultado entre ellos si empatan en puntos, diferencia y goles', () => {
    const filas = tablaDe('Libre', 'B');
    expect(nombres(filas)).toEqual(['Libre B3', 'Libre B1', 'Libre B2', 'Libre B4']);
    expect(filas[1].desempate).toBe('enfrentamiento');
  });

  it('se recalcula al cargar un resultado', () => {
    const datos = crearDatosEjemplo();
    const a1 = datos.equipos.find((e) => e.nombre === 'Libre A1').id;
    const pendiente = datos.partidos.find((p) => p.fecha === 3 && p.localId === a1);
    pendiente.golesLocal = 2;
    pendiente.golesVisitante = 0;
    const [primero] = tablaDe('Libre', 'A', CRITERIOS_POR_DEFECTO, datos);
    expect(primero.equipo.nombre).toBe('Libre A1');
    expect(primero).toMatchObject({ pj: 3, pts: 7, dg: 3 });
  });

  it('sin partidos jugados deja a todos en cero, ordenados por nombre', () => {
    const datos = crearDatosEjemplo();
    datos.partidos.forEach((p) => {
      p.golesLocal = null;
      p.golesVisitante = null;
    });
    const filas = tablaDe('+35', 'B', CRITERIOS_POR_DEFECTO, datos);
    expect(nombres(filas)).toEqual(['+35 B1', '+35 B2', '+35 B3', '+35 B4']);
    expect(filas.every((f) => f.pj === 0 && f.pts === 0)).toBe(true);
  });

  it('con tres empatados arma una mini tabla con los partidos entre ellos', () => {
    // A, B y C se ganan en ronda (A 2-0 B, B 1-0 C, C 1-0 A) y los tres le ganan 1-0 a D
    const equipos = ['A', 'B', 'C', 'D'].map((nombre, i) => ({ id: i + 1, nombre }));
    const partidos = [
      partido(1, 1, 2, 2, 0),
      partido(2, 2, 3, 1, 0),
      partido(3, 3, 1, 1, 0),
      partido(4, 1, 4, 1, 0),
      partido(5, 2, 4, 1, 0),
      partido(6, 3, 4, 1, 0),
    ];
    const filas = calcularTabla(equipos, partidos, ['puntos', 'enfrentamiento', 'dg', 'gf']);
    // Entre ellos: A +1, C 0, B -1 de diferencia
    expect(nombres(filas)).toEqual(['A', 'C', 'B', 'D']);
    expect(filas[0].desempate).toBe('enfrentamiento');
    expect(filas[1].desempate).toBe('enfrentamiento');
  });

  it('suma la tabla inicial a los partidos cargados', () => {
    const equipos = [{ id: 1, nombre: 'A' }, { id: 2, nombre: 'B' }];
    const tablaInicial = [
      { equipoId: 1, pj: 1, pg: 1, pe: 0, pp: 0, gf: 8, gc: 2 },
      { equipoId: 2, pj: 1, pg: 0, pe: 1, pp: 0, gf: 1, gc: 1 },
    ];
    const filas = calcularTabla(equipos, [partido(1, 2, 1, 2, 0)], CRITERIOS_POR_DEFECTO, tablaInicial);
    expect(nombres(filas)).toEqual(['B', 'A']);
    expect(filas[0]).toMatchObject({ pj: 2, pg: 1, pe: 1, pp: 0, gf: 3, gc: 1, dg: 2, pts: 4 });
    expect(filas[1]).toMatchObject({ pj: 2, pg: 1, pe: 0, pp: 1, gf: 8, gc: 4, dg: 4, pts: 3 });
  });

  it('en un partido entre zonas suma solo para el equipo de la zona', () => {
    // La Magia (zona B) empató 2 a 2 con un equipo de la zona C (id 9)
    const zonaB = [{ id: 1, nombre: 'LA MAGIA' }, { id: 2, nombre: 'EL FORTIN' }];
    const filas = calcularTabla(zonaB, [partido(1, 1, 9, 2, 2)], CRITERIOS_POR_DEFECTO);
    expect(filas.find((f) => f.equipo.id === 1)).toMatchObject({ pj: 1, pe: 1, gf: 2, gc: 2, pts: 1 });
    expect(filas.find((f) => f.equipo.id === 2)).toMatchObject({ pj: 0, pts: 0 });
  });

  it('no cuenta los partidos postergados', () => {
    const equipos = [{ id: 1, nombre: 'A' }, { id: 2, nombre: 'B' }];
    const postergado = partido(1, 1, 2, null, null, { postergado: true });
    expect(calcularTabla(equipos, [postergado], CRITERIOS_POR_DEFECTO).every((f) => f.pj === 0)).toBe(true);
  });

  it('en un W.O. doble los dos suman solo el partido jugado: sin resultado, goles ni puntos', () => {
    const equipos = [{ id: 1, nombre: 'BOBY' }, { id: 2, nombre: 'TALLER JUAREZ' }];
    const filas = calcularTabla(equipos, [partido(1, 1, 2, 0, 0, { ausente: 'ambos' })], CRITERIOS_POR_DEFECTO);
    for (const fila of filas) expect(fila).toMatchObject({ pj: 1, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 });
  });

  it('el resultado entre ellos no usa la tabla inicial, que no tiene detalle', () => {
    const equipos = [{ id: 1, nombre: 'B' }, { id: 2, nombre: 'A' }];
    const igual = { pj: 1, pg: 1, pe: 0, pp: 0, gf: 1, gc: 0 };
    const tablaInicial = [{ equipoId: 1, ...igual }, { equipoId: 2, ...igual }];
    const filas = calcularTabla(equipos, [], CRITERIOS_POR_DEFECTO, tablaInicial);
    expect(nombres(filas)).toEqual(['A', 'B']);
    expect(filas[0].desempate).toBe('alfabetico');
  });

  it('un equipo dado de baja no tiene fila y los demás conservan lo que sumaron contra él', () => {
    const antes = tablaDe('Libre', 'A');
    const datos = crearDatosEjemplo();
    datos.equipos = datos.equipos.map((e) => (e.nombre === 'Libre A2' ? { ...e, baja: true } : e));
    const despues = tablaDe('Libre', 'A', CRITERIOS_POR_DEFECTO, datos);
    expect(nombres(despues)).not.toContain('Libre A2');
    expect(despues).toHaveLength(3);
    for (const fila of despues) {
      const { pj, pts, gf, gc } = antes.find((f) => f.equipo.id === fila.equipo.id);
      expect({ pj: fila.pj, pts: fila.pts, gf: fila.gf, gc: fila.gc }).toEqual({ pj, pts, gf, gc });
    }
  });

  it('un equipo nuevo, sin tabla inicial, arranca con 0 partidos aunque los demás traigan la fecha 1', () => {
    const equipos = [{ id: 1, nombre: 'VIEJO' }, { id: 2, nombre: 'CHIVERO F.C' }];
    const inicial = [{ equipoId: 1, pj: 1, pg: 1, pe: 0, pp: 0, gf: 3, gc: 0 }];
    const filas = calcularTabla(equipos, [], CRITERIOS_POR_DEFECTO, inicial);
    expect(filas.find((f) => f.equipo.id === 2)).toMatchObject({ pj: 0, pts: 0, gf: 0, gc: 0 });
  });
});
