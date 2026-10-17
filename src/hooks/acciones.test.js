import { describe, expect, it, vi } from 'vitest';
import { ErrorApi } from '../api/cliente.js';
import { crearAcciones } from './useAcciones.js';

// Acciones con un cliente falso: guardar el resultado sale bien o falla con `fallo`
function armar(fallo) {
  const avisos = [];
  const onSesionInvalida = vi.fn();
  const recargar = vi.fn(async () => {});
  const cliente = {
    actualizarPartido: vi.fn(async () => {
      if (fallo) throw fallo;
      return { id: 1 };
    }),
    crearMovimiento: vi.fn(async () => ({ id: 9 })),
    actualizarCategoria: vi.fn(async () => ({ id: 10 })),
    actividad: vi.fn(async () => {
      if (fallo) throw fallo;
      return [{ id: 1 }];
    }),
  };
  const acciones = crearAcciones({
    token: 'tok',
    recargar,
    avisar: (texto, tipo = 'ok') => avisos.push([tipo, texto]),
    onSesionInvalida,
    cliente,
  });
  return { acciones, avisos, onSesionInvalida, recargar, cliente };
}

describe('acciones del panel', () => {
  it('guarda el arancel de una categoría con el token y avisa', async () => {
    const { acciones, avisos, cliente } = armar();
    expect(await acciones.actualizarCategoria(10, { arancel: 70000 }, 'Arancel guardado.')).toEqual({ id: 10 });
    expect(cliente.actualizarCategoria).toHaveBeenCalledWith('tok', 10, { arancel: 70000 });
    expect(avisos).toEqual([['ok', 'Arancel guardado.']]);
  });

  it('lee la actividad sin volver a pedir los datos ni avisar', async () => {
    const { acciones, avisos, recargar, cliente } = armar();
    expect(await acciones.leerActividad('2026-10-03')).toEqual([{ id: 1 }]);
    expect(cliente.actividad).toHaveBeenCalledWith('tok', '2026-10-03');
    expect(recargar).not.toHaveBeenCalled();
    expect(avisos).toEqual([]);
  });

  it('si falla la lectura de actividad avisa el motivo', async () => {
    const { acciones, avisos } = armar(new ErrorApi('No hay conexión.', 0));
    expect(await acciones.leerActividad('2026-10-03')).toBeNull();
    expect(avisos).toEqual([['error', 'No hay conexión.']]);
  });

  it('guarda el lugar y la hora de un partido', async () => {
    const { acciones, cliente } = armar();
    const lugar = { predio: 'cura_borges', cancha: 9, hora: '15:10' };
    await acciones.guardarLugar(1, lugar, 'Lugar guardado.');
    expect(cliente.actualizarPartido).toHaveBeenCalledWith('tok', 1, lugar);
  });

  it('guarda, vuelve a pedir los datos y avisa', async () => {
    const { acciones, avisos, recargar, cliente } = armar();
    expect(await acciones.guardarResultado(1, 2, 0, 'Resultado guardado.')).toEqual({ id: 1 });
    expect(cliente.actualizarPartido).toHaveBeenCalledWith('tok', 1, { golesLocal: 2, golesVisitante: 0 });
    expect(recargar).toHaveBeenCalled();
    expect(avisos).toEqual([['ok', 'Resultado guardado.']]);
  });

  it('si la sesión venció, la cierra en lugar de seguir en el panel', async () => {
    const vencida = new ErrorApi('La sesión venció. Volvé a iniciar sesión.', 401);
    const { acciones, avisos, onSesionInvalida } = armar(vencida);
    expect(await acciones.guardarResultado(1, 2, 0, 'Resultado guardado.')).toBeNull();
    expect(onSesionInvalida).toHaveBeenCalledWith(vencida);
    expect(avisos).toEqual([]);
  });

  it('cualquier otro error se avisa y la sesión sigue abierta', async () => {
    const sinConexion = new ErrorApi('No hay conexión. Revisá internet y probá de nuevo.', 0);
    const { acciones, avisos, onSesionInvalida } = armar(sinConexion);
    expect(await acciones.guardarResultado(1, 2, 0, 'Resultado guardado.')).toBeNull();
    expect(onSesionInvalida).not.toHaveBeenCalled();
    expect(avisos).toEqual([['error', 'No hay conexión. Revisá internet y probá de nuevo.']]);
  });

  it('marcar W.O. manda solo cuál equipo no se presentó', async () => {
    const { acciones, cliente } = armar();
    await acciones.marcarAusente(1, 'visitante', 'W.O. guardado.');
    expect(cliente.actualizarPartido).toHaveBeenCalledWith('tok', 1, { ausente: 'visitante' });
  });

  it('ya no hay acción para cargar amarillas', () => {
    expect(armar().acciones.crearTarjeta).toBeUndefined();
  });

  it('anota un pago y vuelve a pedir los datos', async () => {
    const { acciones, cliente, recargar, avisos } = armar();
    const datos = { tipo: 'pago', equipoId: 1, partidoId: 2, monto: 95000, metodo: 'efectivo', fecha: '2026-10-15' };
    expect(await acciones.crearMovimiento(datos, 'Pago guardado.')).toEqual({ id: 9 });
    expect(cliente.crearMovimiento).toHaveBeenCalledWith('tok', datos);
    expect(recargar).toHaveBeenCalled();
    expect(avisos).toEqual([['ok', 'Pago guardado.']]);
  });

  it('sube y quita el escudo de un equipo, vuelve a pedir los datos y avisa', async () => {
    const { acciones, avisos, recargar, cliente } = armar();
    cliente.subirEscudo = vi.fn(async () => ({ ok: true }));
    cliente.quitarEscudo = vi.fn(async () => ({ ok: true }));
    expect(await acciones.subirEscudo(4, 'data:image/png;base64,AA', 'Escudo guardado en BRANCA.')).toEqual({ ok: true });
    expect(cliente.subirEscudo).toHaveBeenCalledWith('tok', 4, 'data:image/png;base64,AA');
    await acciones.quitarEscudo(4, 'Escudo quitado de BRANCA.');
    expect(cliente.quitarEscudo).toHaveBeenCalledWith('tok', 4);
    expect(recargar).toHaveBeenCalledTimes(2);
    expect(avisos).toEqual([
      ['ok', 'Escudo guardado en BRANCA.'],
      ['ok', 'Escudo quitado de BRANCA.'],
    ]);
  });

  it('agrega un equipo y lo da de baja, y avisa', async () => {
    const { acciones, avisos, cliente, recargar } = armar();
    cliente.crearEquipo = vi.fn(async () => ({ id: 99 }));
    cliente.cambiarBaja = vi.fn(async () => ({ ok: true }));
    expect(await acciones.crearEquipo({ zonaId: 9, nombre: 'CHIVERO F.C' }, 'Agregaste CHIVERO F.C a +40 · Zona C.')).toEqual({ id: 99 });
    expect(cliente.crearEquipo).toHaveBeenCalledWith('tok', { zonaId: 9, nombre: 'CHIVERO F.C' });
    await acciones.cambiarBaja(88, true, 'GOB GUTIERREZ quedó dado de baja.');
    expect(cliente.cambiarBaja).toHaveBeenCalledWith('tok', 88, true);
    expect(recargar).toHaveBeenCalledTimes(2);
    expect(avisos).toEqual([
      ['ok', 'Agregaste CHIVERO F.C a +40 · Zona C.'],
      ['ok', 'GOB GUTIERREZ quedó dado de baja.'],
    ]);
  });
});

describe('pago de un partido en dos partes', () => {
  // Cliente falso que anota cada pedido; `fallarEn` hace fallar ese número de pedido (1, 2…)
  function armarPagos(fallarEn = 0) {
    const pedidos = [];
    const avisos = [];
    const recargar = vi.fn(async () => {});
    const anotar = (nombre) =>
      vi.fn(async (...args) => {
        pedidos.push([nombre, ...args.slice(1)]);
        if (pedidos.length === fallarEn) throw new ErrorApi('Ya tiene un pago en efectivo.', 409);
        return { id: 50 };
      });
    const cliente = {
      crearMovimiento: anotar('crear'),
      actualizarMovimiento: anotar('cambiar'),
      borrarMovimiento: anotar('borrar'),
    };
    const acciones = crearAcciones({
      token: 'tok',
      recargar,
      avisar: (texto, tipo = 'ok') => avisos.push([tipo, texto]),
      onSesionInvalida: vi.fn(),
      cliente,
    });
    return { acciones, pedidos, avisos, recargar };
  }
  const base = { partidoId: 2, equipoId: 1, fecha: '2026-10-15' };

  it('anota las dos partes y avisa una sola vez', async () => {
    const { acciones, pedidos, avisos, recargar } = armarPagos();
    const partes = [
      { metodo: 'efectivo', monto: 50000, pago: null },
      { metodo: 'transferencia', monto: 55000, pago: null },
    ];
    expect(await acciones.guardarPagos({ ...base, partes }, 'Pago guardado.')).toBe(true);
    expect(pedidos).toEqual([
      ['crear', { tipo: 'pago', equipoId: 1, partidoId: 2, monto: 50000, metodo: 'efectivo', fecha: '2026-10-15' }],
      ['crear', { tipo: 'pago', equipoId: 1, partidoId: 2, monto: 55000, metodo: 'transferencia', fecha: '2026-10-15' }],
    ]);
    expect(recargar).toHaveBeenCalledTimes(1);
    expect(avisos).toEqual([['ok', 'Pago guardado.']]);
  });

  it('cambia una parte, quita la otra y no manda la que no cambió', async () => {
    const { acciones, pedidos } = armarPagos();
    const partes = [
      { metodo: 'efectivo', monto: 60000, pago: { id: 1, monto: 50000 } },
      { metodo: 'transferencia', monto: null, pago: { id: 2, monto: 55000 } },
    ];
    await acciones.guardarPagos({ ...base, partes }, 'Pago guardado.');
    expect(pedidos).toEqual([
      ['cambiar', 1, { monto: 60000 }],
      ['borrar', 2],
    ]);
    pedidos.length = 0;
    await acciones.guardarPagos({ ...base, partes: [{ metodo: 'efectivo', monto: 5, pago: { id: 1, monto: 5 } }] }, 'Listo.');
    expect(pedidos).toEqual([]);
  });

  it('si falla a mitad de camino, vuelve a pedir los datos (lo primero ya quedó) y avisa el motivo', async () => {
    const { acciones, avisos, recargar } = armarPagos(2);
    const partes = [
      { metodo: 'efectivo', monto: 50000, pago: null },
      { metodo: 'transferencia', monto: 55000, pago: null },
    ];
    expect(await acciones.guardarPagos({ ...base, partes }, 'Pago guardado.')).toBeNull();
    expect(recargar).toHaveBeenCalledTimes(1);
    expect(avisos).toEqual([['error', 'Ya tiene un pago en efectivo.']]);
  });
});
