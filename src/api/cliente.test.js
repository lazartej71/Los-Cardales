import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ErrorApi } from './cliente.js';

const respuestaJson = (estado, cuerpo) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('cliente de la API', () => {
  it('manda el token y el cuerpo en JSON', async () => {
    const fetchFalso = vi.fn(async () => respuestaJson(200, { ok: true }));
    vi.stubGlobal('fetch', fetchFalso);
    await api.actualizarPartido('tok', 7, { golesLocal: 1, golesVisitante: 0 });
    const [url, opciones] = fetchFalso.mock.calls[0];
    expect(url).toBe('/api/admin/partidos/7');
    expect(opciones.method).toBe('PATCH');
    expect(opciones.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer tok' });
    expect(JSON.parse(opciones.body)).toEqual({ golesLocal: 1, golesVisitante: 0 });
  });

  it('devuelve el mensaje y el estado del error del servidor', async () => {
    vi.stubGlobal('fetch', async () => respuestaJson(401, { error: 'La sesión venció. Volvé a iniciar sesión.' }));
    await expect(api.datosAdmin('viejo')).rejects.toMatchObject({
      name: 'ErrorApi',
      estado: 401,
      message: 'La sesión venció. Volvé a iniciar sesión.',
    });
  });

  it('avisa cuando no hay conexión', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch');
    });
    const error = await api.publico().catch((e) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect(error).toMatchObject({ estado: 0, message: 'No hay conexión. Revisá internet y probá de nuevo.' });
  });

  it('usa un mensaje general si el servidor no responde JSON', async () => {
    vi.stubGlobal('fetch', async () => new Response('<html>', { status: 502 }));
    await expect(api.publico()).rejects.toMatchObject({
      estado: 502,
      message: 'Algo falló en el servidor. Probá de nuevo en un rato.',
    });
  });

  it('anota un movimiento con POST y borra una tarjeta con DELETE', async () => {
    const fetchFalso = vi.fn(async () => respuestaJson(200, { ok: true }));
    vi.stubGlobal('fetch', fetchFalso);
    await api.crearMovimiento('tok', { tipo: 'pago' });
    await api.borrarTarjeta('tok', 3);
    expect(fetchFalso.mock.calls.map(([url, opciones]) => [url, opciones.method])).toEqual([
      ['/api/admin/movimientos', 'POST'],
      ['/api/admin/tarjetas/3', 'DELETE'],
    ]);
  });

  it('ya no carga amarillas', () => {
    expect(api.crearTarjeta).toBeUndefined();
  });
});
