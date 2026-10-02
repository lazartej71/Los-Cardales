import { describe, expect, it } from 'vitest';
import { crearDatosEjemplo } from '../src/datos/datosEjemplo.js';
import {
  validarBorradoMovimiento,
  validarBorradoPartido,
  validarBorradoTarjeta,
  validarCambioEquipo,
  validarCambioExpulsion,
  validarCambioMovimiento,
  validarCambioPartido,
  validarConfiguracion,
  validarExpulsionNueva,
  validarMovimientoNuevo,
  validarPartidoNuevo,
  validarTarjetaNueva,
} from './reglas.js';

const datos = crearDatosEjemplo();
const equipo = (nombre) => datos.equipos.find((e) => e.nombre === nombre).id;
// Libre es la categoría 1 y la fecha 4 no tiene partidos en los datos de ejemplo
const nuevo = (cambios = {}) => ({
  categoriaId: 1,
  fecha: 4,
  localId: equipo('Libre A1'),
  visitanteId: equipo('Libre B1'),
  ...cambios,
});

describe('validarPartidoNuevo', () => {
  it('acepta un partido entre zonas de la misma categoría', () => {
    expect(validarPartidoNuevo(datos, nuevo())).toEqual({
      valor: { categoria_id: 1, fecha: 4, local_id: equipo('Libre A1'), visitante_id: equipo('Libre B1') },
    });
  });

  it('rechaza un equipo de otra categoría', () => {
    expect(validarPartidoNuevo(datos, nuevo({ visitanteId: equipo('+35 A1') })).error).toMatch(/categoría/);
  });

  it('rechaza que un equipo juegue contra sí mismo', () => {
    expect(validarPartidoNuevo(datos, nuevo({ visitanteId: equipo('Libre A1') })).error).toMatch(/sí mismo/);
  });

  it('rechaza un equipo que ya juega esa fecha (doble carga)', () => {
    const resultado = validarPartidoNuevo(datos, nuevo({ fecha: 3 }));
    expect(resultado.estado).toBe(409);
    expect(resultado.error).toBe('Libre A1 ya tiene un partido en la fecha 3.');
  });

  it('rechaza una fecha fuera de rango o un pedido vacío', () => {
    expect(validarPartidoNuevo(datos, nuevo({ fecha: 0 })).error).toMatch(/fecha/);
    expect(validarPartidoNuevo(datos, null).error).toBeTruthy();
  });
});

describe('validarCambioPartido', () => {
  const pendiente = datos.partidos.find((p) => p.golesLocal === null);
  const jugado = datos.partidos.find((p) => p.golesLocal !== null);

  it('carga un resultado y saca el postergado', () => {
    expect(validarCambioPartido(datos, pendiente.id, { golesLocal: 2, golesVisitante: 0 })).toEqual({
      valor: { goles_local: 2, goles_visitante: 0, postergado: false, ausente: null },
    });
  });

  it('quita un resultado', () => {
    expect(validarCambioPartido(datos, jugado.id, { golesLocal: null, golesVisitante: null })).toEqual({
      valor: { goles_local: null, goles_visitante: null, ausente: null },
    });
  });

  it('rechaza goles inválidos', () => {
    for (const goles of [-1, 1.5, 100, '2']) {
      expect(validarCambioPartido(datos, pendiente.id, { golesLocal: goles, golesVisitante: 0 }).error).toMatch(/goles/);
    }
  });

  it('no deja postergar un partido que ya tiene resultado', () => {
    expect(validarCambioPartido(datos, jugado.id, { postergado: true }).error).toMatch(/quitalo/);
    expect(validarCambioPartido(datos, pendiente.id, { postergado: true })).toEqual({ valor: { postergado: true } });
  });

  it('responde 404 si el partido no existe', () => {
    expect(validarCambioPartido(datos, 9999, { postergado: true }).estado).toBe(404);
  });
});

describe('validarBorradoPartido', () => {
  it('no borra un partido con expulsiones', () => {
    expect(validarBorradoPartido(datos, datos.expulsiones[0].partidoId).estado).toBe(409);
  });
});

describe('validarExpulsionNueva', () => {
  const partido = datos.partidos[0];

  it('acepta un equipo que jugó el partido y limpia el nombre', () => {
    const cuerpo = { partidoId: partido.id, equipoId: partido.localId, numeroCamiseta: 7, nombreJugador: '  Juan  ' };
    expect(validarExpulsionNueva(datos, cuerpo)).toEqual({
      valor: { partido_id: partido.id, equipo_id: partido.localId, numero_camiseta: 7, nombre_jugador: 'Juan' },
    });
  });

  it('rechaza un equipo que no jugó ese partido', () => {
    const cuerpo = { partidoId: partido.id, equipoId: 99, numeroCamiseta: 7 };
    expect(validarExpulsionNueva(datos, cuerpo).error).toMatch(/jugaron/);
  });

  it('exige el número de camiseta', () => {
    expect(validarExpulsionNueva(datos, { partidoId: partido.id, equipoId: partido.localId }).error).toMatch(/camiseta/);
  });
});

describe('validarCambioExpulsion', () => {
  // Expulsión 1: 2 fechas de suspensión, 1 cumplida. Expulsión 2: sin definir.
  it('ajusta las cumplidas si se baja la suspensión', () => {
    expect(validarCambioExpulsion(datos, 1, { fechasSuspension: 0 })).toEqual({
      valor: { fechas_suspension: 0, fechas_cumplidas: 0 },
    });
  });

  it('no deja cumplir más fechas que la suspensión', () => {
    expect(validarCambioExpulsion(datos, 1, { fechasCumplidas: 3 }).error).toMatch(/2 fechas/);
  });

  it('pide la suspensión antes de sumar fechas cumplidas', () => {
    expect(validarCambioExpulsion(datos, 2, { fechasCumplidas: 1 }).error).toMatch(/tribunal/);
  });
});

describe('validarCambioEquipo', () => {
  const id = equipo('Libre A1');

  it('limpia el teléfono y permite el delegado vacío', () => {
    const cuerpo = { nombre: ' Branca ', delegado: '', telefonoDelegado: '+54 9 11 5100-1234' };
    expect(validarCambioEquipo(datos, id, cuerpo)).toEqual({
      valor: { equipo: { nombre: 'Branca' }, delegado: { equipo_id: id, nombre: '', telefono: '5491151001234' } },
    });
  });

  it('rechaza un teléfono corto y un nombre vacío', () => {
    expect(validarCambioEquipo(datos, id, { nombre: 'X', telefonoDelegado: '1234' }).error).toMatch(/WhatsApp/);
    expect(validarCambioEquipo(datos, id, { nombre: '  ' }).error).toMatch(/nombre del equipo/);
  });
});

describe('validarConfiguracion', () => {
  it('acepta un orden completo de criterios', () => {
    const criteriosDesempate = ['puntos', 'gf', 'dg', 'enfrentamiento'];
    expect(validarConfiguracion({ criteriosDesempate })).toEqual({ valor: { criterios_desempate: criteriosDesempate } });
  });

  it('rechaza criterios repetidos o faltantes', () => {
    expect(validarConfiguracion({ criteriosDesempate: ['puntos', 'puntos', 'dg', 'gf'] }).error).toMatch(/una sola vez/);
  });

  it('rechaza un pedido sin cambios', () => {
    expect(validarConfiguracion({}).error).toMatch(/cambios/);
  });
});

let ultimoMovimiento = 100;
const pagoDe = (equipoId, partidoId = null, cambios = {}) => ({
  id: ++ultimoMovimiento,
  equipoId,
  partidoId,
  tipo: 'pago',
  monto: 105000,
  metodo: 'efectivo',
  fecha: '2026-10-15',
  nota: '',
  ...cambios,
});

describe('W.O.', () => {
  const pendiente = datos.partidos.find((p) => p.golesLocal === null);

  it('el que no se presentó pierde 3 a 0', () => {
    expect(validarCambioPartido(datos, pendiente.id, { ausente: 'visitante' })).toEqual({
      valor: { goles_local: 3, goles_visitante: 0, postergado: false, ausente: 'visitante' },
    });
    expect(validarCambioPartido(datos, pendiente.id, { ausente: 'local' })).toEqual({
      valor: { goles_local: 0, goles_visitante: 3, postergado: false, ausente: 'local' },
    });
  });

  it('rechaza un ausente que no es el local ni el visitante', () => {
    expect(validarCambioPartido(datos, pendiente.id, { ausente: 'los dos' }).error).toMatch(/no se presentó/);
  });

  it('no deja marcar W.O. si el que faltó ya pagó ese partido', () => {
    const conPago = { ...datos, movimientos: [pagoDe(pendiente.visitanteId, pendiente.id)] };
    const resultado = validarCambioPartido(conPago, pendiente.id, { ausente: 'visitante' });
    expect(resultado.estado).toBe(409);
    expect(resultado.error).toMatch(/tiene un pago anotado/);
    // La plata que ya pagó no se pierde: se pasa a un pago suelto
    expect(resultado.error).toMatch(/anotalo como pago suelto en Cuentas/);
  });
});

describe('borrar un partido con tarjetas o pagos', () => {
  it('dice qué hay que quitar antes', () => {
    const partido = datos.partidos.find((p) => !datos.expulsiones.some((e) => e.partidoId === p.id));
    const cargado = {
      ...datos,
      tarjetas: [{ id: 1, partidoId: partido.id, equipoId: partido.localId, numeroCamiseta: 7, nombreJugador: '' }],
      movimientos: [pagoDe(partido.localId, partido.id)],
    };
    expect(validarBorradoPartido(cargado, partido.id)).toEqual({
      error: 'No se puede borrar: el partido tiene tarjetas y pagos. Quitalos antes de borrar el partido.',
      estado: 409,
    });
  });
});

describe('validarTarjetaNueva', () => {
  const partido = datos.partidos[0];

  it('acepta una amarilla de un equipo que jugó el partido', () => {
    const cuerpo = { partidoId: partido.id, equipoId: partido.visitanteId, numeroCamiseta: 4, nombreJugador: ' Pérez ' };
    expect(validarTarjetaNueva(datos, cuerpo)).toEqual({
      valor: { partido_id: partido.id, equipo_id: partido.visitanteId, numero_camiseta: 4, nombre_jugador: 'Pérez' },
    });
  });

  it('rechaza un equipo que no jugó o un número inválido', () => {
    const otro = datos.equipos.find((e) => e.id !== partido.localId && e.id !== partido.visitanteId);
    expect(validarTarjetaNueva(datos, { partidoId: partido.id, equipoId: otro.id, numeroCamiseta: 4 }).error).toMatch(
      /uno de los dos/
    );
    expect(validarTarjetaNueva(datos, { partidoId: partido.id, equipoId: partido.localId, numeroCamiseta: 0 }).error).toMatch(
      /camiseta/
    );
  });

  it('responde 404 al borrar una tarjeta que no existe', () => {
    expect(validarBorradoTarjeta({ ...datos, tarjetas: [] }, 5).estado).toBe(404);
  });
});

describe('validarMovimientoNuevo', () => {
  const jugado = datos.partidos.find((p) => p.golesLocal !== null);
  const pagoDelPartido = (cambios = {}) => ({
    tipo: 'pago',
    equipoId: jugado.localId,
    partidoId: jugado.id,
    monto: 95000,
    metodo: 'efectivo',
    fecha: '2026-10-15',
    ...cambios,
  });

  it('anota el pago de un partido', () => {
    expect(validarMovimientoNuevo(datos, pagoDelPartido())).toEqual({
      valor: {
        tipo: 'pago',
        equipo_id: jugado.localId,
        partido_id: jugado.id,
        monto: 95000,
        metodo: 'efectivo',
        fecha: '2026-10-15',
        nota: '',
      },
    });
  });

  it('anota un pago suelto y una deuda anterior', () => {
    const suelto = validarMovimientoNuevo(datos, pagoDelPartido({ partidoId: null, nota: ' pagó el delegado ' }));
    expect(suelto.valor).toMatchObject({ partido_id: null, nota: 'pagó el delegado' });
    const deuda = { tipo: 'deuda_anterior', equipoId: jugado.localId, monto: 10000, fecha: '2026-10-01', nota: 'fecha 1' };
    expect(validarMovimientoNuevo(datos, deuda)).toEqual({
      valor: {
        tipo: 'deuda_anterior',
        equipo_id: jugado.localId,
        partido_id: null,
        monto: 10000,
        metodo: null,
        fecha: '2026-10-01',
        nota: 'fecha 1',
      },
    });
  });

  it('rechaza montos que no son pesos enteros mayores que 0', () => {
    for (const monto of [0, -5, 1.5, '1000', 20000000, undefined]) {
      expect(validarMovimientoNuevo(datos, pagoDelPartido({ monto })).error).toMatch(/monto/);
    }
  });

  it('el pago necesita método y la deuda anterior no lleva', () => {
    const sinMetodo = { tipo: 'pago', equipoId: jugado.localId, monto: 95000, fecha: '2026-10-15' };
    expect(validarMovimientoNuevo(datos, sinMetodo).error).toMatch(/efectivo o por transferencia/);
    expect(validarMovimientoNuevo(datos, pagoDelPartido({ metodo: 'cheque' })).error).toMatch(/efectivo o por transferencia/);
    const deudaConMetodo = { tipo: 'deuda_anterior', equipoId: jugado.localId, monto: 10, fecha: '2026-10-01', metodo: 'efectivo' };
    expect(validarMovimientoNuevo(datos, deudaConMetodo).error).toMatch(/solo en los pagos/);
  });

  it('rechaza fechas que no existen o con otro formato', () => {
    for (const fecha of ['2026-02-30', '15/10/2026', '', undefined]) {
      expect(validarMovimientoNuevo(datos, pagoDelPartido({ fecha })).error).toMatch(/fecha/);
    }
  });

  it('una deuda anterior no va en un partido', () => {
    const deuda = { tipo: 'deuda_anterior', equipoId: jugado.localId, partidoId: jugado.id, monto: 10, fecha: '2026-10-01' };
    expect(validarMovimientoNuevo(datos, deuda).error).toMatch(/no va en un partido/);
  });

  it('un solo pago por equipo y partido', () => {
    const conPago = { ...datos, movimientos: [pagoDe(jugado.localId, jugado.id)] };
    const resultado = validarMovimientoNuevo(conPago, pagoDelPartido());
    expect(resultado.estado).toBe(409);
    expect(resultado.error).toMatch(/ya tiene un pago anotado/);
  });

  it('no le anota un pago al equipo que no se presentó', () => {
    const wo = { ...jugado, golesLocal: 0, golesVisitante: 3, ausente: 'local' };
    const conWo = { ...datos, partidos: datos.partidos.map((p) => (p.id === jugado.id ? wo : p)) };
    expect(validarMovimientoNuevo(conWo, pagoDelPartido()).error).toMatch(/no se presentó/);
  });

  it('el equipo tiene que haber jugado ese partido', () => {
    const otro = datos.equipos.find((e) => e.id !== jugado.localId && e.id !== jugado.visitanteId);
    expect(validarMovimientoNuevo(datos, pagoDelPartido({ equipoId: otro.id })).error).toMatch(/uno de los dos/);
  });

  it('pide el tipo y un equipo que exista', () => {
    expect(validarMovimientoNuevo(datos, pagoDelPartido({ tipo: 'regalo' })).error).toMatch(/pago o una deuda/);
    expect(validarMovimientoNuevo(datos, pagoDelPartido({ equipoId: 9999 })).error).toMatch(/equipo/);
    expect(validarMovimientoNuevo(datos, null).error).toBeTruthy();
  });
});

describe('validarCambioMovimiento', () => {
  const conMovimientos = {
    ...datos,
    movimientos: [
      pagoDe(1, null, { id: 1 }),
      { id: 2, equipoId: 1, partidoId: null, tipo: 'deuda_anterior', monto: 10000, metodo: null, fecha: '2026-10-01', nota: '' },
    ],
  };

  it('corrige el monto y el método de un pago', () => {
    expect(validarCambioMovimiento(conMovimientos, 1, { monto: 100000, metodo: 'transferencia' })).toEqual({
      valor: { monto: 100000, metodo: 'transferencia' },
    });
  });

  it('una deuda anterior no lleva método', () => {
    expect(validarCambioMovimiento(conMovimientos, 2, { metodo: 'efectivo' }).error).toMatch(/solo en los pagos/);
  });

  it('responde 404 si no existe y avisa si no hay cambios', () => {
    expect(validarCambioMovimiento(conMovimientos, 99, { monto: 5 }).estado).toBe(404);
    expect(validarCambioMovimiento(conMovimientos, 1, {}).error).toMatch(/No hay cambios/);
    expect(validarBorradoMovimiento(conMovimientos, 99).estado).toBe(404);
    expect(validarBorradoMovimiento(conMovimientos, 2)).toEqual({ valor: 2 });
  });
});

describe('arancel en la configuración', () => {
  it('acepta pesos enteros y rechaza lo demás', () => {
    expect(validarConfiguracion({ arancel: 120000 })).toEqual({ valor: { arancel: 120000 } });
    for (const arancel of [-1, 1.5, '105000', 20000000]) {
      expect(validarConfiguracion({ arancel }).error).toMatch(/arancel/);
    }
  });
});
