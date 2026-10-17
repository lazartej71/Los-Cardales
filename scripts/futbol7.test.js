import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { crearDatosEjemplo } from '../src/datos/datosEjemplo.js';
import { armarFutbol7, leerCsv, sumarFutbol7Simulado } from './futbol7.js';

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
