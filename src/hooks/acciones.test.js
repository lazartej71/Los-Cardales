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

  it('anota un pago y vuelve a pedir los datos', async () => {
    const { acciones, cliente, recargar, avisos } = armar();
    const datos = { tipo: 'pago', equipoId: 1, partidoId: 2, monto: 95000, metodo: 'efectivo', fecha: '2026-10-15' };
    expect(await acciones.crearMovimiento(datos, 'Pago guardado.')).toEqual({ id: 9 });
    expect(cliente.crearMovimiento).toHaveBeenCalledWith('tok', datos);
    expect(recargar).toHaveBeenCalled();
    expect(avisos).toEqual([['ok', 'Pago guardado.']]);
  });
});
