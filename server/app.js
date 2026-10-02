/**
 * API del campeonato (Hono). La usan Vercel (api/index.js) y el servidor de desarrollo (vite.config.js).
 * El acceso a la base llega por parámetro (crearRepositorio) para poder probar las rutas sin Supabase.
 */

import { Hono } from 'hono';
import {
  validarBorradoExpulsion,
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

const ERROR_INTERNO = 'Algo falló en el servidor. Probá de nuevo en un rato.';

// Cuerpo JSON del pedido, o null si no vino o está mal formado
async function leerCuerpo(c) {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

// Id numérico de la ruta (/partidos/:id), o null si no es válido
function idDeRuta(c) {
  const id = Number(c.req.param('id'));
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * @param {{ crearRepositorio: (token: string | null) => object }} dependencias
 *   crearRepositorio(null) lee como público; con el token de la sesión, como ese usuario.
 */
export function crearApp({ crearRepositorio }) {
  const app = new Hono().basePath('/api');

  app.onError((error, c) => {
    console.error(error);
    return c.json({ error: ERROR_INTERNO }, 500);
  });
  app.notFound((c) => c.json({ error: 'Esa dirección no existe.' }, 404));

  // Lo que ve cualquiera: sin expulsiones, tarjetas, pagos ni teléfonos
  app.get('/publico', async (c) => {
    const datos = await crearRepositorio(null).leerPublico();
    c.header('Cache-Control', 'public, max-age=0, s-maxage=5');
    return c.json(datos);
  });

  const admin = new Hono();

  // Solo pasan los pedidos con la sesión de un admin
  admin.use('*', async (c, next) => {
    const token = (c.req.header('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return c.json({ error: 'Iniciá sesión para usar el panel.' }, 401);
    const repositorio = crearRepositorio(token);
    if (!(await repositorio.usuarioActual())) {
      return c.json({ error: 'La sesión venció. Volvé a iniciar sesión.' }, 401);
    }
    if (!(await repositorio.esAdmin())) {
      return c.json({ error: 'Esta cuenta no tiene permiso de administrador.' }, 403);
    }
    c.set('repositorio', repositorio);
    c.header('Cache-Control', 'no-store');
    await next();
  });

  // Si la regla falla responde el error; si no, guarda y devuelve lo guardado
  const aplicar = async (c, resultado, guardar, estadoOk = 200) => {
    if (resultado.error) return c.json({ error: resultado.error }, resultado.estado);
    return c.json(await guardar(resultado.valor), estadoOk);
  };

  // Borra una fila si la regla lo permite
  const borrarFila = async (c, tabla, validar) => {
    const repo = c.get('repositorio');
    const id = idDeRuta(c);
    return aplicar(c, validar(await repo.leerAdmin(), id), async () => {
      await repo.borrar(tabla, id);
      return { ok: true };
    });
  };

  admin.get('/datos', async (c) => c.json(await c.get('repositorio').leerAdmin()));

  admin.post('/partidos', async (c) => {
    const repo = c.get('repositorio');
    const resultado = validarPartidoNuevo(await repo.leerPublico(), await leerCuerpo(c));
    return aplicar(c, resultado, (valor) => repo.insertar('partidos', valor), 201);
  });

  admin.patch('/partidos/:id', async (c) => {
    const repo = c.get('repositorio');
    const id = idDeRuta(c);
    // Con los datos del panel: para marcar un W.O. hay que mirar los pagos del partido
    const resultado = validarCambioPartido(await repo.leerAdmin(), id, await leerCuerpo(c));
    return aplicar(c, resultado, (valor) => repo.actualizar('partidos', id, valor));
  });

  admin.delete('/partidos/:id', (c) => borrarFila(c, 'partidos', validarBorradoPartido));

  admin.post('/expulsiones', async (c) => {
    const repo = c.get('repositorio');
    const resultado = validarExpulsionNueva(await repo.leerPublico(), await leerCuerpo(c));
    return aplicar(c, resultado, (valor) => repo.insertar('expulsiones', valor), 201);
  });

  admin.patch('/expulsiones/:id', async (c) => {
    const repo = c.get('repositorio');
    const id = idDeRuta(c);
    const resultado = validarCambioExpulsion(await repo.leerAdmin(), id, await leerCuerpo(c));
    return aplicar(c, resultado, (valor) => repo.actualizar('expulsiones', id, valor));
  });

  admin.delete('/expulsiones/:id', (c) => borrarFila(c, 'expulsiones', validarBorradoExpulsion));

  admin.post('/tarjetas', async (c) => {
    const repo = c.get('repositorio');
    const resultado = validarTarjetaNueva(await repo.leerPublico(), await leerCuerpo(c));
    return aplicar(c, resultado, (valor) => repo.insertar('tarjetas', valor), 201);
  });

  admin.delete('/tarjetas/:id', (c) => borrarFila(c, 'tarjetas', validarBorradoTarjeta));

  admin.post('/movimientos', async (c) => {
    const repo = c.get('repositorio');
    const resultado = validarMovimientoNuevo(await repo.leerAdmin(), await leerCuerpo(c));
    return aplicar(c, resultado, (valor) => repo.insertar('movimientos', valor), 201);
  });

  admin.patch('/movimientos/:id', async (c) => {
    const repo = c.get('repositorio');
    const id = idDeRuta(c);
    const resultado = validarCambioMovimiento(await repo.leerAdmin(), id, await leerCuerpo(c));
    return aplicar(c, resultado, (valor) => repo.actualizar('movimientos', id, valor));
  });

  admin.delete('/movimientos/:id', (c) => borrarFila(c, 'movimientos', validarBorradoMovimiento));

  admin.patch('/equipos/:id', async (c) => {
    const repo = c.get('repositorio');
    const id = idDeRuta(c);
    const resultado = validarCambioEquipo(await repo.leerPublico(), id, await leerCuerpo(c));
    return aplicar(c, resultado, async (valor) => {
      await repo.actualizar('equipos', id, valor.equipo);
      await repo.guardarDelegado(valor.delegado);
      return { ok: true };
    });
  });

  admin.patch('/configuracion', async (c) => {
    const repo = c.get('repositorio');
    const resultado = validarConfiguracion(await leerCuerpo(c));
    return aplicar(c, resultado, (valor) => repo.actualizar('configuracion', 1, valor));
  });

  app.route('/admin', admin);
  return app;
}
