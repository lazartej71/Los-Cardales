import { describe, expect, it } from 'vitest';
import { crearDatosEjemplo } from '../src/datos/datosEjemplo.js';
import {
  permisoVeedorBorrarRoja,
  permisoVeedorPago,
  permisoVeedorPagoNuevo,
  permisoVeedorPartido,
  permisoVeedorRojaNueva,
  validarBorradoMovimiento,
  validarBorradoPartido,
  validarBorradoTarjeta,
  validarCambioEquipo,
  validarCambioExpulsion,
  validarCambioMovimiento,
  validarCambioPartido,
  validarConfiguracion,
  validarEscudo,
  validarExpulsionNueva,
  validarMovimientoNuevo,
  validarPartidoNuevo,
} from './reglas.js';

const datos = crearDatosEjemplo();
const equipo = (nombre) => datos.equipos.find((e) => e.nombre === nombre).id;
// Libre es la categoría 1 y la fecha 4 no tiene partidos en los datos de ejemplo
const nuevo = (cambios = {}) => ({
  categoriaId: 1,
  fecha: 4,
  localId: equipo('Libre A1'),
  visitanteId: equipo('Libre B1'),
  predio: 'los_cardales',
  cancha: 2,
  hora: '13:40',
  ...cambios,
});
const LUGAR = { predio: 'los_cardales', cancha: 2, hora: '13:40' };
// Los datos de ejemplo con un partido más en la fecha 4, en la cancha 2 de Los Cardales a las 13:40
const conOcupada = (cambios = {}) => ({
  ...datos,
  partidos: [
    ...datos.partidos,
    { id: 500, categoriaId: 2, fecha: 4, localId: equipo('+35 A1'), visitanteId: equipo('+35 A2'), golesLocal: null, golesVisitante: null, postergado: false, ...LUGAR, ...cambios },
  ],
});

describe('validarPartidoNuevo', () => {
  it('acepta un partido entre zonas de la misma categoría', () => {
    expect(validarPartidoNuevo(datos, nuevo())).toEqual({
      valor: { categoria_id: 1, fecha: 4, local_id: equipo('Libre A1'), visitante_id: equipo('Libre B1'), ...LUGAR },
    });
  });

  it('pide el lugar y la hora', () => {
    expect(validarPartidoNuevo(datos, nuevo({ predio: undefined })).error).toBe('Elegí el predio.');
    expect(validarPartidoNuevo(datos, nuevo({ cancha: 9 })).error).toBe('Elegí una cancha de Los Cardales.');
    expect(validarPartidoNuevo(datos, nuevo({ hora: '1340' })).error).toBe('Escribí la hora como 13:40.');
  });

  it('no deja dos partidos en la misma cancha a la misma hora de la misma fecha', () => {
    const resultado = validarPartidoNuevo(conOcupada(), nuevo());
    expect(resultado.estado).toBe(409);
    expect(resultado.error).toBe('La cancha 2 de Los Cardales ya tiene un partido a las 13:40 en la fecha 4.');
    expect(validarPartidoNuevo(conOcupada(), nuevo({ hora: '15:10' })).valor).toBeTruthy();
  });

  it('un postergado no ocupa la cancha', () => {
    expect(validarPartidoNuevo(conOcupada({ postergado: true }), nuevo()).valor).toBeTruthy();
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

  it('cambia el lugar y la hora', () => {
    expect(validarCambioPartido(datos, pendiente.id, { predio: 'cura_borges', cancha: 9, hora: '9:05' })).toEqual({
      valor: { predio: 'cura_borges', cancha: 9, hora: '09:05' },
    });
    expect(validarCambioPartido(datos, pendiente.id, { predio: 'cura_borges', cancha: 2, hora: '13:40' }).error).toBe(
      'Elegí una cancha de Cura Borges.'
    );
  });

  it('no deja quitar la postergación si otro partido ya ocupa su cancha y hora', () => {
    const postergado = { ...pendiente, id: 501, fecha: 4, postergado: true, ...LUGAR };
    const db = { ...conOcupada(), partidos: [...conOcupada().partidos, postergado] };
    const resultado = validarCambioPartido(db, 501, { postergado: false });
    expect(resultado.estado).toBe(409);
    expect(resultado.error).toBe(
      'La cancha 2 de Los Cardales ya tiene un partido a las 13:40 en la fecha 4: cambiale el lugar o la hora a este partido.'
    );
    // Cargarle el resultado también lo saca de postergado
    expect(validarCambioPartido(db, 501, { golesLocal: 1, golesVisitante: 0 }).estado).toBe(409);
    const libre = { ...datos, partidos: [...datos.partidos, postergado] };
    expect(validarCambioPartido(libre, 501, { postergado: false })).toEqual({ valor: { postergado: false } });
  });

  it('al cambiar el lugar no choca consigo mismo, pero sí con otro partido', () => {
    expect(validarCambioPartido(conOcupada(), 500, LUGAR)).toEqual({ valor: LUGAR });
    const enFecha4 = { ...conOcupada(), partidos: [...conOcupada().partidos, { ...pendiente, id: 501, fecha: 4 }] };
    expect(validarCambioPartido(enFecha4, 501, LUGAR).estado).toBe(409);
  });
});

describe('reprogramar un postergado para un día especial', () => {
  const base = datos.partidos.find((p) => p.golesLocal === null);
  const postergado = { ...base, id: 601, fecha: 4, postergado: true, predio: null, cancha: null, hora: null, dia: null };
  const DIA = { dia: '2026-10-12', ...LUGAR };
  const con = (...partidos) => ({ ...datos, partidos: [...datos.partidos, ...partidos] });

  it('guarda el día, el predio, la cancha y la hora, y sigue postergado', () => {
    expect(validarCambioPartido(con(postergado), 601, DIA)).toEqual({ valor: DIA });
  });

  it('el día va solo en los postergados', () => {
    expect(validarCambioPartido(datos, base.id, DIA).error).toBe('El día se carga solo en los postergados.');
  });

  it('pide un día que exista y un lugar válido', () => {
    for (const dia of ['mañana', '2026-02-30', '', null]) {
      expect(validarCambioPartido(con(postergado), 601, { ...DIA, dia }).error).toBe('Elegí el día.');
    }
    expect(validarCambioPartido(con(postergado), 601, { ...DIA, cancha: 9 }).error).toBe('Elegí una cancha de Los Cardales.');
  });

  it('no deja dos partidos en la misma cancha el mismo día a la misma hora', () => {
    const otro = { ...postergado, id: 602, ...DIA };
    const resultado = validarCambioPartido(con(postergado, otro), 601, DIA);
    expect(resultado).toEqual({
      error: 'La cancha 2 de Los Cardales ya tiene un partido el lunes 12/10 a las 13:40.',
      estado: 409,
    });
    expect(validarCambioPartido(con(postergado, otro), 601, { ...DIA, dia: '2026-10-13' }).valor.dia).toBe('2026-10-13');
  });

  it('al cargarle el resultado deja de estar postergado, aunque en su fecha esa cancha esté ocupada a esa hora', () => {
    const reprogramado = { ...postergado, ...DIA };
    const ocupaEnSuFecha = { ...base, id: 603, fecha: 4, ...LUGAR };
    expect(validarCambioPartido(con(reprogramado, ocupaEnSuFecha), 601, { golesLocal: 1, golesVisitante: 0 })).toEqual({
      valor: { goles_local: 1, goles_visitante: 0, postergado: false, ausente: null },
    });
  });

  it('si se le quita el resultado, vuelve a postergado', () => {
    const jugado = { ...postergado, ...DIA, postergado: false, golesLocal: 1, golesVisitante: 0 };
    expect(validarCambioPartido(con(jugado), 601, { golesLocal: null, golesVisitante: null })).toEqual({
      valor: { goles_local: null, goles_visitante: null, ausente: null, postergado: true },
    });
  });
});

describe('validarBorradoPartido', () => {
  it('no borra un partido con expulsiones', () => {
    expect(validarBorradoPartido(datos, datos.expulsiones[0].partidoId).estado).toBe(409);
  });
});

describe('validarExpulsionNueva', () => {
  const partido = datos.partidos[0];

  it('acepta un equipo que jugó el partido, con el tipo de roja, y limpia el nombre', () => {
    const cuerpo = {
      partidoId: partido.id,
      equipoId: partido.localId,
      numeroCamiseta: 7,
      nombreJugador: '  Juan  ',
      tipo: 'directa',
    };
    expect(validarExpulsionNueva(datos, cuerpo)).toEqual({
      valor: { partido_id: partido.id, equipo_id: partido.localId, numero_camiseta: 7, nombre_jugador: 'Juan', tipo: 'directa' },
    });
  });

  it('exige elegir si fue doble amarilla o roja directa', () => {
    const cuerpo = { partidoId: partido.id, equipoId: partido.localId, numeroCamiseta: 7 };
    expect(validarExpulsionNueva(datos, cuerpo).error).toBe('Elegí si la roja fue por doble amarilla o directa.');
    expect(validarExpulsionNueva(datos, { ...cuerpo, tipo: 'naranja' }).error).toMatch(/doble amarilla o directa/);
    expect(validarExpulsionNueva(datos, { ...cuerpo, tipo: 'doble_amarilla' }).valor.tipo).toBe('doble_amarilla');
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

  it('si pagó en dos partes, habla de los dos pagos', () => {
    const movimientos = [
      pagoDe(pendiente.visitanteId, pendiente.id, { monto: 50000 }),
      pagoDe(pendiente.visitanteId, pendiente.id, { monto: 55000, metodo: 'transferencia' }),
    ];
    const resultado = validarCambioPartido({ ...datos, movimientos }, pendiente.id, { ausente: 'visitante' });
    expect(resultado.estado).toBe(409);
    expect(resultado.error).toMatch(/tiene dos pagos anotados en este partido/);
    expect(resultado.error).toMatch(/quitá esos pagos y anotalos como pagos sueltos en Cuentas/);
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

// Las amarillas ya no se cargan: solo se borran las que había
describe('validarBorradoTarjeta', () => {
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

  it('un pago por medio: si ya pagó en efectivo, la otra parte va por transferencia', () => {
    const conPago = { ...datos, movimientos: [pagoDe(jugado.localId, jugado.id)] };
    const resultado = validarMovimientoNuevo(conPago, pagoDelPartido());
    expect(resultado.estado).toBe(409);
    expect(resultado.error).toMatch(/ya tiene un pago en efectivo anotado en este partido/);
    expect(validarMovimientoNuevo(conPago, pagoDelPartido({ metodo: 'transferencia' })).valor).toMatchObject({
      metodo: 'transferencia',
      monto: 95000,
    });
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

  it('no pasa un pago al medio que ya tiene la otra parte del mismo partido', () => {
    const partido = datos.partidos[0];
    const dosPartes = {
      ...datos,
      movimientos: [
        pagoDe(partido.localId, partido.id, { id: 3 }),
        pagoDe(partido.localId, partido.id, { id: 4, metodo: 'transferencia' }),
      ],
    };
    const resultado = validarCambioMovimiento(dosPartes, 3, { metodo: 'transferencia' });
    expect(resultado.estado).toBe(409);
    expect(resultado.error).toMatch(/ya tiene un pago por transferencia anotado en este partido/);
    expect(validarCambioMovimiento(dosPartes, 3, { metodo: 'efectivo', monto: 40000 })).toEqual({
      valor: { metodo: 'efectivo', monto: 40000 },
    });
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

describe('lo que puede hacer un veedor', () => {
  // La fecha 3 está en juego y sus partidos tienen cancha; la fecha 2 ya se jugó
  const conLugar = {
    ...datos,
    partidos: datos.partidos.map((p) => (p.fecha === 3 ? { ...p, predio: 'los_cardales', cancha: 1, hora: '13:40' } : p)),
  };
  const enJuego = conLugar.partidos.find((p) => p.fecha === 3);
  const jugado = conLugar.partidos.find((p) => p.fecha === 2);
  const NO_PUEDE = { error: 'Tu cuenta de veedor no puede hacer esto.', estado: 403 };

  it('carga, cambia o quita el resultado y el W.O. de un partido de la fecha en juego', () => {
    for (const cuerpo of [
      { golesLocal: 2, golesVisitante: 1 },
      { golesLocal: null, golesVisitante: null },
      { ausente: 'visitante' },
    ]) {
      expect(permisoVeedorPartido(conLugar, enJuego.id, cuerpo)).toBeNull();
    }
  });

  it('no posterga ni cambia el lugar', () => {
    expect(permisoVeedorPartido(conLugar, enJuego.id, { postergado: true })).toEqual(NO_PUEDE);
    expect(permisoVeedorPartido(conLugar, enJuego.id, { predio: 'cura_borges', cancha: 1, hora: '10:00' })).toEqual(
      NO_PUEDE
    );
    expect(permisoVeedorPartido(conLugar, enJuego.id, null)).toEqual(NO_PUEDE);
  });

  it('no toca partidos que no ve (otra fecha)', () => {
    const resultado = permisoVeedorPartido(conLugar, jugado.id, { golesLocal: 0, golesVisitante: 0 });
    expect(resultado.estado).toBe(403);
    expect(resultado.error).toBe('Ese partido no es de la fecha en juego: pedile al organizador que lo corrija.');
  });

  it('agrega rojas solo en los partidos que ve', () => {
    expect(permisoVeedorRojaNueva(conLugar, { partidoId: enJuego.id })).toBeNull();
    expect(permisoVeedorRojaNueva(conLugar, { partidoId: jugado.id }).estado).toBe(403);
    expect(permisoVeedorRojaNueva(conLugar, null).estado).toBe(403);
  });

  it('borra una roja de sus partidos solo si todavía no tiene sanción', () => {
    const rojas = [
      { id: 1, partidoId: enJuego.id, equipoId: enJuego.localId, fechasSuspension: null },
      { id: 2, partidoId: enJuego.id, equipoId: enJuego.localId, fechasSuspension: 2 },
      { id: 3, partidoId: jugado.id, equipoId: jugado.localId, fechasSuspension: null },
    ];
    const conRojas = { ...conLugar, expulsiones: rojas };
    expect(permisoVeedorBorrarRoja(conRojas, 1)).toBeNull();
    expect(permisoVeedorBorrarRoja(conRojas, 2)).toEqual({
      error: 'Esa roja ya tiene sanción: para borrarla, hablá con el organizador.',
      estado: 403,
    });
    expect(permisoVeedorBorrarRoja(conRojas, 3).estado).toBe(403);
    // Si no existe, responde la regla de siempre (404)
    expect(permisoVeedorBorrarRoja(conRojas, 99)).toBeNull();
  });

  it('anota pagos de sus partidos, pero no deudas anteriores ni pagos sueltos', () => {
    const pago = { tipo: 'pago', equipoId: enJuego.localId, partidoId: enJuego.id };
    expect(permisoVeedorPagoNuevo(conLugar, pago)).toBeNull();
    expect(permisoVeedorPagoNuevo(conLugar, { ...pago, partidoId: jugado.id }).estado).toBe(403);
    expect(permisoVeedorPagoNuevo(conLugar, { ...pago, partidoId: null })).toEqual(NO_PUEDE);
    expect(permisoVeedorPagoNuevo(conLugar, { ...pago, tipo: 'deuda_anterior', partidoId: null })).toEqual(NO_PUEDE);
  });

  it('cambia o borra pagos de sus partidos y nada más', () => {
    const movimientos = [
      pagoDe(enJuego.localId, enJuego.id, { id: 1 }),
      pagoDe(jugado.localId, jugado.id, { id: 2 }),
      pagoDe(enJuego.localId, null, { id: 3 }),
    ];
    const conPagos = { ...conLugar, movimientos };
    expect(permisoVeedorPago(conPagos, 1)).toBeNull();
    expect(permisoVeedorPago(conPagos, 2).estado).toBe(403);
    expect(permisoVeedorPago(conPagos, 3)).toEqual(NO_PUEDE);
    expect(permisoVeedorPago(conPagos, 99)).toBeNull();
  });
});
describe('escudo de un equipo', () => {
  const id = datos.equipos[0].id;
  const WEBP = `data:image/webp;base64,${btoa('RIFF\x10\x00\x00\x00WEBPVP8 ')}`;
  const PNG = `data:image/png;base64,${btoa('\x89PNG\r\n\x1a\n\x00\x00\x00\x0dIHDR')}`;
  const INVALIDO = { error: 'El escudo tiene que ser una imagen WebP o PNG de hasta 100 KB.', estado: 400 };

  it('acepta un WebP o un PNG y dice cómo guardarlo', () => {
    const webp = validarEscudo(datos, id, { imagen: WEBP });
    expect(webp.valor).toMatchObject({ imagen: WEBP, tipo: 'image/webp', extension: 'webp' });
    expect(webp.valor.bytes).toBeInstanceOf(Uint8Array);
    expect(webp.valor.bytes).toHaveLength(16);
    expect(validarEscudo(datos, id, { imagen: PNG }).valor).toMatchObject({ tipo: 'image/png', extension: 'png' });
  });

  it('mira los primeros bytes: no alcanza con que el texto diga PNG', () => {
    for (const imagen of [
      `data:image/png;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg"></svg>')}`,
      `data:image/png;base64,${btoa('GIF89a')}`,
      WEBP.replace('image/webp', 'image/png'),
    ]) {
      expect(validarEscudo(datos, id, { imagen }), imagen.slice(0, 40)).toEqual(INVALIDO);
    }
  });

  it('rechaza otros formatos, texto suelto y más de 100 KB', () => {
    const pesado = `data:image/webp;base64,${btoa(`RIFF\x00\x00\x00\x00WEBP${'x'.repeat(100 * 1024)}`)}`;
    for (const imagen of ['data:image/gif;base64,R0lGODlh', 'hola', '', undefined, pesado, 'data:image/png;base64,***']) {
      expect(validarEscudo(datos, id, { imagen })).toEqual(INVALIDO);
    }
    expect(validarEscudo(datos, id, null)).toEqual(INVALIDO);
  });

  it('el equipo tiene que existir', () => {
    expect(validarEscudo(datos, 99999, { imagen: WEBP })).toEqual({ error: 'Ese equipo no existe.', estado: 404 });
  });
});
