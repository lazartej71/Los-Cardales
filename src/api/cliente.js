/**
 * Pedidos a la API del campeonato (/api). Los errores llegan como ErrorApi, con un mensaje
 * para mostrar tal cual y el estado HTTP (0 si no hubo conexión).
 */

export class ErrorApi extends Error {
  constructor(mensaje, estado) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
  }
}

const SIN_CONEXION = 'No hay conexión. Revisá internet y probá de nuevo.';
const ERROR_SERVIDOR = 'Algo falló en el servidor. Probá de nuevo en un rato.';

async function pedir(ruta, { metodo = 'GET', cuerpo, token } = {}) {
  const headers = {};
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  let respuesta;
  try {
    respuesta = await fetch(`/api${ruta}`, {
      method: metodo,
      headers,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorApi(SIN_CONEXION, 0);
  }
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) throw new ErrorApi(datos?.error || ERROR_SERVIDOR, respuesta.status);
  return datos;
}

export const api = {
  publico: () => pedir('/publico'),
  datosAdmin: (token) => pedir('/admin/datos', { token }),
  crearPartido: (token, cuerpo) => pedir('/admin/partidos', { metodo: 'POST', cuerpo, token }),
  actualizarPartido: (token, id, cuerpo) => pedir(`/admin/partidos/${id}`, { metodo: 'PATCH', cuerpo, token }),
  borrarPartido: (token, id) => pedir(`/admin/partidos/${id}`, { metodo: 'DELETE', token }),
  crearExpulsion: (token, cuerpo) => pedir('/admin/expulsiones', { metodo: 'POST', cuerpo, token }),
  actualizarExpulsion: (token, id, cuerpo) => pedir(`/admin/expulsiones/${id}`, { metodo: 'PATCH', cuerpo, token }),
  borrarExpulsion: (token, id) => pedir(`/admin/expulsiones/${id}`, { metodo: 'DELETE', token }),
  borrarTarjeta: (token, id) => pedir(`/admin/tarjetas/${id}`, { metodo: 'DELETE', token }),
  crearMovimiento: (token, cuerpo) => pedir('/admin/movimientos', { metodo: 'POST', cuerpo, token }),
  actualizarMovimiento: (token, id, cuerpo) => pedir(`/admin/movimientos/${id}`, { metodo: 'PATCH', cuerpo, token }),
  borrarMovimiento: (token, id) => pedir(`/admin/movimientos/${id}`, { metodo: 'DELETE', token }),
  actualizarEquipo: (token, id, cuerpo) => pedir(`/admin/equipos/${id}`, { metodo: 'PATCH', cuerpo, token }),
  subirEscudo: (token, id, imagen) => pedir(`/admin/equipos/${id}/escudo`, { metodo: 'PUT', cuerpo: { imagen }, token }),
  quitarEscudo: (token, id) => pedir(`/admin/equipos/${id}/escudo`, { metodo: 'DELETE', token }),
  crearEquipo: (token, cuerpo) => pedir('/admin/equipos', { metodo: 'POST', cuerpo, token }),
  cambiarBaja: (token, id, baja) => pedir(`/admin/equipos/${id}/baja`, { metodo: 'PUT', cuerpo: { baja }, token }),
  actualizarConfiguracion: (token, cuerpo) => pedir('/admin/configuracion', { metodo: 'PATCH', cuerpo, token }),
  visita: () => pedir('/visita', { metodo: 'POST' }),
  visitas: (token) => pedir('/admin/visitas', { token }),
  actividad: (token, dia) => pedir(`/admin/actividad?dia=${encodeURIComponent(dia)}`, { token }),
};
