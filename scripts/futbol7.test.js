import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { crearDatosEjemplo } from '../src/datos/datosEjemplo.js';
import { armarFutbol7, leerCsv, sqlFutbol7, sumarFutbol7Simulado } from './futbol7.js';

const equiposReales = () => leerCsv(readFileSync(new URL('../datos/futbol7-equipos.csv', import.meta.url), 'utf8'));

describe('leerCsv', () => {
  it('lee cada fila con los nombres del encabezado, sin espacios de más ni líneas vacías', () => {
    expect(leerCsv('categoria,zona,equipo,baja\n Libre , Zona A ,LOS AMIGOS,\n\n+30,Zona única,EL CHAÑAR,si\n')).toEqual([
      { categoria: 'Libre', zona: 'Zona A', equipo: 'LOS AMIGOS', baja: '' },
      { categoria: '+30', zona: 'Zona única', equipo: 'EL CHAÑAR', baja: 'si' },
    ]);
  });

  it('una fila con otra cantidad de columnas es un error', () => {
    expect(() => leerCsv('categoria,zona,equipo,baja\nLibre,Zona A,LOS, AMIGOS,')).toThrow(
      'La fila 2 tiene 5 columnas y el encabezado 4.'
    );
  });
});

describe('armarFutbol7', () => {
  it('arma las categorías, zonas y equipos de Gaby', () => {
    const armado = armarFutbol7({ equipos: equiposReales() });
    expect(armado.errores).toEqual([]);
    expect(armado.categorias).toEqual([
      { id: 6, nombre: 'Libre', orden: 6, modalidad: 'f7', arancel: 65000 },
      { id: 7, nombre: '+30', orden: 7, modalidad: 'f7', arancel: 60000 },
    ]);
    expect(armado.zonas).toEqual([
      { id: 11, categoriaId: 6, nombre: 'Zona A' },
      { id: 12, categoriaId: 6, nombre: 'Zona B' },
      { id: 13, categoriaId: 7, nombre: 'Zona única' },
    ]);
    expect(armado.equipos).toHaveLength(25);
    expect(armado.equipos.filter((e) => e.baja)).toEqual([
      { categoria: '+30', zona: 'Zona única', nombre: 'EL CHAÑAR', baja: true },
    ]);
  });

  it('avisa los nombres repetidos en una categoría, aunque cambien acentos o mayúsculas', () => {
    const equipos = [
      { categoria: 'Libre', zona: 'Zona A', equipo: 'SAN RAMÓN FC', baja: '' },
      { categoria: 'Libre', zona: 'Zona A', equipo: 'San Ramon FC', baja: '' },
      { categoria: 'Libre', zona: 'Zona B', equipo: 'SAN RAMON FC', baja: '' },
      { categoria: '+30', zona: 'Zona única', equipo: 'SAN RAMÓN FC', baja: '' },
    ];
    expect(armarFutbol7({ equipos }).errores).toEqual([
      'San Ramon FC repite a SAN RAMÓN FC en Libre.',
      'SAN RAMON FC está en dos zonas de Libre (Zona A y Zona B).',
    ]);
  });

  it('avisa una categoría sin arancel', () => {
    const equipos = [{ categoria: '+40', zona: 'Zona única', equipo: 'NUEVO', baja: '' }];
    expect(armarFutbol7({ equipos }).errores).toEqual(['La categoría +40 no tiene arancel (ARANCELES_F7).']);
  });
});

describe('sumarFutbol7Simulado', () => {
  const armado = armarFutbol7({ equipos: equiposReales() });

  it('suma F7 a los datos con una fecha 1 de prueba, sin repetir lugar ni hora', () => {
    const datos = sumarFutbol7Simulado(crearDatosEjemplo(), armado);
    expect(datos.categorias.map((c) => c.id)).toEqual([1, 2, 3, 4, 6, 7]);
    const equiposF7 = datos.equipos.filter((e) => e.id > 32);
    expect(equiposF7[0]).toEqual({ id: 33, zonaId: 11, nombre: 'LA COLOMBIA FC', escudo: null, baja: false });
    expect(equiposF7).toHaveLength(25);
    const fecha1 = datos.partidos.filter((p) => p.categoriaId >= 6);
    expect(fecha1).toHaveLength(12);
    expect(new Set(fecha1.map((p) => `${p.predio}-${p.cancha}-${p.hora}`)).size).toBe(12);
    expect(fecha1.every((p) => p.fecha === 1 && p.golesLocal === null && p.cancha >= 21)).toBe(true);
    const chanar = equiposF7.find((e) => e.nombre === 'EL CHAÑAR').id;
    expect(fecha1.some((p) => p.localId === chanar || p.visitanteId === chanar)).toBe(false);
    expect(fecha1[0]).toMatchObject({ localId: 33, visitanteId: 34, predio: 'los_cardales', cancha: 21, hora: '15:30' });
  });

  it('si ya hay F7 cargado, no suma nada', () => {
    const una = sumarFutbol7Simulado(crearDatosEjemplo(), armado);
    expect(sumarFutbol7Simulado(una, armado)).toBe(una);
  });
});

// Una Libre de F7 chica: 4 equipos en una zona y uno dado de baja, con la fecha 1 jugada (un W.O.) y un pendiente
const equiposChicos = [
  { categoria: 'Libre', zona: 'Zona A', equipo: 'UNO FC', baja: '' },
  { categoria: 'Libre', zona: 'Zona A', equipo: "D'ALESSANDRO", baja: '' },
  { categoria: 'Libre', zona: 'Zona A', equipo: 'TRES FC', baja: '' },
  { categoria: 'Libre', zona: 'Zona A', equipo: 'CUATRO FC', baja: '' },
  { categoria: 'Libre', zona: 'Zona A', equipo: 'SE FUE FC', baja: 'si' },
];
const fila = (fecha, local, visitante, extra = {}) => ({
  categoria: 'Libre',
  fecha: String(fecha),
  local,
  visitante,
  goles_local: '',
  goles_visitante: '',
  ausente: '',
  postergado: '',
  predio: 'Los Cardales',
  cancha: '1',
  hora: '15:30',
  ...extra,
});
const partidosChicos = [
  fila(1, 'UNO FC', "D'ALESSANDRO", { goles_local: '2', goles_visitante: '1' }),
  fila(1, 'TRES FC', 'SE FUE FC', { ausente: 'visitante', predio: 'Cura Borges', cancha: '3' }),
  fila(2, 'Uno FC', 'TRES FC', { predio: '', cancha: '', hora: '', postergado: 'si' }),
];

describe('partidos de Fútbol 7 desde el CSV', () => {
  it('lee resultado, W.O., postergado y la cancha de F7 (con el número de la base)', () => {
    const { partidos, errores } = armarFutbol7({ equipos: equiposChicos, partidos: partidosChicos });
    expect(errores).toEqual([]);
    expect(partidos).toEqual([
      { categoria: 'Libre', fecha: 1, local: 'UNO FC', visitante: "D'ALESSANDRO", golesLocal: 2, golesVisitante: 1, ausente: null, postergado: false, predio: 'los_cardales', cancha: 21, hora: '15:30' },
      { categoria: 'Libre', fecha: 1, local: 'TRES FC', visitante: 'SE FUE FC', golesLocal: 3, golesVisitante: 0, ausente: 'visitante', postergado: false, predio: 'cura_borges', cancha: 23, hora: '15:30' },
      { categoria: 'Libre', fecha: 2, local: 'UNO FC', visitante: 'TRES FC', golesLocal: null, golesVisitante: null, ausente: null, postergado: true, predio: null, cancha: null, hora: null },
    ]);
  });

  it('avisa equipos que no son de la categoría, canchas que no son de F7 y resultados a medias', () => {
    const malos = [
      fila(1, 'UNO FC', 'NADIE FC'),
      fila(1, 'TRES FC', 'CUATRO FC', { predio: 'Los Cardales', cancha: '3' }),
      fila(1, 'TRES FC', 'CUATRO FC', { goles_local: '1' }),
      fila(1, 'TRES FC', 'CUATRO FC', { predio: 'Otro predio' }),
    ];
    expect(armarFutbol7({ equipos: equiposChicos, partidos: malos }).errores).toEqual([
      'Fecha 1: NADIE FC no es un equipo de Libre.',
      'Fecha 1: Los Cardales no tiene la cancha 3 de Fútbol 7.',
      'Fecha 1: TRES FC vs CUATRO FC tiene el resultado a medias.',
      'Fecha 1: no existe el predio Otro predio.',
    ]);
  });
});

describe('sqlFutbol7', () => {
  const sql = sqlFutbol7(armarFutbol7({ equipos: equiposChicos, partidos: partidosChicos }), { cobradoEl: '2026-10-16' });

  it('primero controla que esté la 10a y después carga en orden, en una sola transacción', () => {
    const orden = [
      'begin;',
      'Falta correr la migración 10a',
      'insert into public.categorias',
      'insert into public.zonas',
      'insert into public.equipos',
      'insert into public.partidos',
      'insert into public.movimientos',
      'update public.equipos set baja = true',
      'commit;',
    ].map((texto) => sql.indexOf(texto));
    expect(orden.every((posicion) => posicion >= 0)).toBe(true);
    expect([...orden].sort((a, b) => a - b)).toEqual(orden);
  });

  it('escapa los apóstrofos y pone las canchas de F7 y los pagos del día', () => {
    expect(sql).toContain("'D''ALESSANDRO'");
    expect(sql).toContain("'cura_borges', 23,");
    expect(sql).toContain("'2026-10-16', 'Cobrado antes de pasar F7 al sistema'");
  });
});
