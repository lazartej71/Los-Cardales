import { describe, expect, it } from 'vitest';
import { conFutbol7 } from '../datos/datosEjemploFutbol7.js';
import { describirActividad, rangoDelDia, resumirActividad } from './actividad.js';

const db = {
  categorias: [{ id: 1, nombre: 'Libre' }],
  equipos: [
    { id: 1, nombre: 'BRANCA' },
    { id: 2, nombre: 'BARRIO POLICIAL' },
  ],
  partidos: [{ id: 7, categoriaId: 1, fecha: 2, localId: 1, visitanteId: 2 }],
};
const partido = { id: 7, categoriaId: 1, fecha: 2, localId: 1, visitanteId: 2 };
const CRUCE = 'BRANCA vs BARRIO POLICIAL (Libre, fecha 2)';
const texto = (accion, tabla, fila, cambios = null) => describirActividad({ accion, tabla, fila, cambios }, db);

describe('texto del registro de actividad', () => {
  it('partidos', () => {
    expect(texto('alta', 'partidos', partido)).toBe(`Agregó el partido ${CRUCE}`);
    expect(texto('cambio', 'partidos', { ...partido, golesLocal: 2 }, ['goles_local', 'goles_visitante'])).toBe(
      `Cargó el resultado de ${CRUCE}`
    );
    expect(texto('cambio', 'partidos', { ...partido, golesLocal: null }, ['goles_local', 'goles_visitante'])).toBe(
      `Quitó el resultado de ${CRUCE}`
    );
    expect(texto('cambio', 'partidos', { ...partido, ausente: 'local' }, ['ausente', 'goles_local'])).toBe(
      `Marcó W.O. en ${CRUCE}`
    );
    expect(texto('cambio', 'partidos', { ...partido, postergado: true }, ['postergado'])).toBe(`Postergó ${CRUCE}`);
    expect(texto('cambio', 'partidos', { ...partido, postergado: false }, ['postergado'])).toBe(
      `Quitó la postergación de ${CRUCE}`
    );
    expect(texto('cambio', 'partidos', partido, ['cancha', 'hora'])).toBe(`Cambió el lugar y la hora de ${CRUCE}`);
    expect(texto('baja', 'partidos', partido)).toBe(`Borró el partido ${CRUCE}`);
  });

  it('un partido que ya no existe se describe con lo guardado', () => {
    const borrado = { ...partido, id: 99 };
    expect(texto('baja', 'partidos', borrado)).toBe(`Borró el partido ${CRUCE}`);
    expect(texto('alta', 'tarjetas', { partidoId: 1234, equipoId: 1, numeroCamiseta: 4 })).toBe(
      'Cargó la amarilla del N° 4 de BRANCA en un partido borrado'
    );
  });

  it('tarjetas y rojas', () => {
    const tarjeta = { partidoId: 7, equipoId: 1, numeroCamiseta: 10 };
    expect(texto('alta', 'tarjetas', tarjeta)).toBe(`Cargó la amarilla del N° 10 de BRANCA en ${CRUCE}`);
    expect(texto('baja', 'tarjetas', tarjeta)).toBe(`Borró la amarilla del N° 10 de BRANCA en ${CRUCE}`);
    expect(texto('alta', 'expulsiones', tarjeta)).toBe(`Cargó la roja del N° 10 de BRANCA en ${CRUCE}`);
    expect(texto('cambio', 'expulsiones', tarjeta, ['fechas_suspension'])).toBe(
      `Cambió la sanción del N° 10 de BRANCA en ${CRUCE}`
    );
    expect(texto('baja', 'expulsiones', tarjeta)).toBe(`Borró la roja del N° 10 de BRANCA en ${CRUCE}`);
  });

  it('una roja con tipo dice cuál fue', () => {
    const roja = (tipo) => ({ partidoId: 7, equipoId: 1, numeroCamiseta: 10, tipo });
    expect(texto('alta', 'expulsiones', roja('directa'))).toBe(`Cargó la roja directa del N° 10 de BRANCA en ${CRUCE}`);
    expect(texto('baja', 'expulsiones', roja('doble_amarilla'))).toBe(
      `Borró la doble amarilla del N° 10 de BRANCA en ${CRUCE}`
    );
    expect(texto('cambio', 'expulsiones', roja('directa'), ['fechas_suspension'])).toBe(
      `Cambió la sanción del N° 10 de BRANCA en ${CRUCE}`
    );
  });

  it('pagos y deudas', () => {
    const pago = { tipo: 'pago', equipoId: 1, monto: 105000, metodo: 'efectivo' };
    expect(texto('alta', 'movimientos', pago)).toBe('Anotó un pago de $105.000 de BRANCA (efectivo)');
    expect(texto('cambio', 'movimientos', pago, ['monto'])).toBe('Cambió un pago de $105.000 de BRANCA (efectivo)');
    expect(texto('baja', 'movimientos', pago)).toBe('Borró un pago de $105.000 de BRANCA (efectivo)');
    expect(texto('alta', 'movimientos', { tipo: 'deuda_anterior', equipoId: 2, monto: 20000, metodo: null })).toBe(
      'Anotó una deuda anterior de $20.000 de BARRIO POLICIAL'
    );
  });

  it('equipos, delegados y ajustes', () => {
    expect(texto('cambio', 'equipos', { id: 1, nombre: 'BRANCA' }, ['nombre'])).toBe('Cambió los datos de BRANCA');
    expect(texto('cambio', 'equipos', { id: 1, nombre: 'BRANCA', escudo: 'equipo-1-5.webp' }, ['escudo'])).toBe(
      'Cambió el escudo de BRANCA'
    );
    expect(texto('cambio', 'equipos', { id: 1, nombre: 'BRANCA', escudo: null }, ['escudo'])).toBe(
      'Quitó el escudo de BRANCA'
    );
    expect(texto('cambio', 'delegados', { equipoId: 2 }, ['telefono'])).toBe('Cambió el delegado de BARRIO POLICIAL');
    expect(texto('alta', 'delegados', { equipoId: 2 })).toBe('Cambió el delegado de BARRIO POLICIAL');
    expect(texto('cambio', 'configuracion', {}, ['arancel'])).toBe('Cambió los ajustes (arancel)');
    expect(texto('cambio', 'configuracion', {}, ['nombre_campeonato', 'criterios_desempate'])).toBe(
      'Cambió los ajustes (nombre del campeonato, desempate)'
    );
  });

  it('equipos que entran y que se dan de baja', () => {
    expect(texto('alta', 'equipos', { id: 3, nombre: 'CHIVERO F.C', baja: false })).toBe('Agregó el equipo CHIVERO F.C');
    expect(texto('cambio', 'equipos', { id: 1, nombre: 'BRANCA', baja: true }, ['baja'])).toBe('Dio de baja a BRANCA');
    expect(texto('cambio', 'equipos', { id: 1, nombre: 'BRANCA', baja: false }, ['baja'])).toBe(
      'Volvió a dar de alta a BRANCA'
    );
  });
});

describe('resumen por persona', () => {
  it('cuenta resultados, tarjetas, rojas, pagos y lo demás', () => {
    const entradas = [
      { quien: 'Franco', accion: 'cambio', tabla: 'partidos', cambios: ['goles_local'], fila: { golesLocal: 1 } },
      { quien: 'Franco', accion: 'cambio', tabla: 'partidos', cambios: ['ausente'], fila: {} },
      { quien: 'Franco', accion: 'alta', tabla: 'tarjetas', fila: {} },
      { quien: 'Franco', accion: 'alta', tabla: 'expulsiones', fila: {} },
      { quien: 'Franco', accion: 'alta', tabla: 'movimientos', fila: { tipo: 'pago' } },
      { quien: 'Jorge', accion: 'baja', tabla: 'partidos', fila: {} },
    ];
    expect(resumirActividad(entradas)).toEqual([
      { quien: 'Franco', resultados: 2, tarjetas: 1, rojas: 1, pagos: 1, otros: 0 },
      { quien: 'Jorge', resultados: 0, tarjetas: 0, rojas: 0, pagos: 0, otros: 1 },
    ]);
  });
});

describe('día en Argentina', () => {
  it('va de la medianoche a la medianoche siguiente, hora de Argentina', () => {
    expect(rangoDelDia('2026-10-03')).toEqual({ desde: '2026-10-03T00:00:00-03:00', hasta: '2026-10-04T00:00:00-03:00' });
    expect(rangoDelDia('2026-10-31').hasta).toBe('2026-11-01T00:00:00-03:00');
    expect(rangoDelDia('2026-12-31').hasta).toBe('2027-01-01T00:00:00-03:00');
  });

  it('rechaza un día mal escrito', () => {
    expect(rangoDelDia('2026-13-01')).toBeNull();
    expect(rangoDelDia('ayer')).toBeNull();
  });
});

describe('registro con Fútbol 7 cargado', () => {
  const datos = conFutbol7();
  const alta = (partido) => describirActividad({ accion: 'alta', tabla: 'partidos', fila: partido }, datos);

  it('cada partido dice su modalidad, porque hay dos Libre', () => {
    expect(alta(datos.partidos.find((p) => p.id === 201))).toBe('Agregó el partido F7 A1 vs F7 A2 (F7 · Libre, fecha 1)');
    expect(alta(datos.partidos[0])).toBe('Agregó el partido Libre A1 vs Libre A2 (F11 · Libre, fecha 1)');
  });

  it('el cambio de arancel de una categoría', () => {
    const cambio = (arancel) =>
      describirActividad({ accion: 'cambio', tabla: 'categorias', fila: { id: 10, arancel }, cambios: ['arancel'] }, datos);
    expect(cambio(70000)).toBe('Cambió el arancel de F7 · Libre ($70.000)');
    expect(cambio(null)).toBe('Cambió el arancel de F7 · Libre (sin arancel)');
  });
});
