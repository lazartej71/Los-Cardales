/**
 * API del campeonato (Hono). La usan Vercel (api/index.js) y el servidor de desarrollo (vite.config.js).
 * El acceso a la base llega por parámetro (crearRepositorio) para poder probar las rutas sin Supabase.
 */

import { Hono } from 'hono';
import { rangoDelDia } from '../src/logica/actividad.js';
import {
  permisoVeedorBorrarRoja,
  permisoVeedorPago,
  permisoVeedorPagoNuevo,
  permisoVeedorPartido,
  permisoVeedorRojaNueva,
  validarBaja,
  validarBorradoExpulsion,
  validarBorradoMovimiento,
  validarBorradoPartido,
  validarBorradoTarjeta,
  validarCambioEquipo,
  validarCambioExpulsion,
  validarCambioMovimiento,
  validarCambioPartido,
  validarConfiguracion,
  validarEquipoNuevo,
  validarEscudo,
  validarExpulsionNueva,
  validarMovimientoNuevo,
  validarPartidoNuevo,
} from './reglas.js';

const ERROR_INTERNO = 'Algo falló en el servidor. Probá de nuevo en un rato.';
const NO_PUEDE_VEEDOR = 'Tu cuenta de veedor no puede hacer esto.';
const SOLO_SUPERADMIN_ESCUDOS = 'Los escudos los cambia solo el superadmin.';

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

  // Cada navegador avisa una vez por día que entró alguien a la vista pública (solo se suma 1 al día)
  app.post('/visita', async (c) => {
    await crearRepositorio(null).sumarVisita();
    c.header('Cache-Control', 'no-store');
    return c.body(null, 204);
  });

  const admin = new Hono();

  // Solo pasan los pedidos con la sesión de un admin o de un veedor; el rol queda para cada ruta
  admin.use('*', async (c, next) => {
    const token = (c.req.header('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return c.json({ error: 'Iniciá sesión para usar el panel.' }, 401);
    const repositorio = crearRepositorio(token);
    if (!(await repositorio.usuarioActual())) {
      return c.json({ error: 'La sesión venció. Volvé a iniciar sesión.' }, 401);
    }
    const rol = (await repositorio.esAdmin())
      ? await repositorio.rol()
      : (await repositorio.esVeedor())
        ? 'veedor'
        : null;
    if (!rol) return c.json({ error: 'Esta cuenta no tiene permiso para usar el panel.' }, 403);
    c.set('repositorio', repositorio);
    c.set('rol', rol);
    c.header('Cache-Control', 'no-store');
    await next();
  });

  const esVeedor = (c) => c.get('rol') === 'veedor';

  // Lo que un veedor no usa nunca (crear o borrar partidos, sanciones, equipos, ajustes)
  const sinVeedores = async (c, next) => {
    if (esVeedor(c)) return c.json({ error: NO_PUEDE_VEEDOR }, 403);
    await next();
  };

  // Los escudos los sube, cambia y quita solo el superadmin
  const soloSuperadmin = async (c, next) => {
    if (c.get('rol') !== 'superadmin') return c.json({ error: SOLO_SUPERADMIN_ESCUDOS }, 403);
    await next();
  };

  // Si es un veedor, primero su permiso (null si puede); si no, o si puede, la regla de siempre
  const reglaPara = (c, permisoVeedor, regla) => (esVeedor(c) && permisoVeedor()) || regla();

  // Si la regla falla responde el error; si no, guarda y devuelve lo guardado
  const aplicar = async (c, resultado, guardar, estadoOk = 200) => {
    if (resultado.error) return c.json({ error: resultado.error }, resultado.estado);
    return c.json(await guardar(resultado.valor), estadoOk);
  };

  // Borra una fila si la regla lo permite (y, si es un veedor, su permiso)
  const borrarFila = async (c, tabla, validar, permisoVeedor = () => null) => {
    const repo = c.get('repositorio');
    const id = idDeRuta(c);
    const datos = await repo.leerAdmin();
    const resultado = reglaPara(c, () => permisoVeedor(datos, id), () => validar(datos, id));
    return aplicar(c, resultado, async () => {
      await repo.borrar(tabla, id);
      return { ok: true };
    });
  };

  admin.get('/datos', async (c) => {
    const datos = await c.get('repositorio').leerAdmin();
    return c.json({ ...datos, rol: c.get('rol') });
  });

  // Personas por día en la vista pública: solo para el superadmin
  admin.get('/visitas', async (c) => {
    if (c.get('rol') !== 'superadmin') return c.json({ error: 'Esta sección es solo para el superadmin.' }, 403);
    return c.json(await c.get('repositorio').leerVisitas());
  });

  // Registro de actividad de un día (hora de Argentina): solo para el superadmin
  admin.get('/actividad', async (c) => {
    if (c.get('rol') !== 'superadmin') return c.json({ error: 'Esta sección es solo para el superadmin.' }, 403);
    const rango = rangoDelDia(c.req.query('dia'));
    if (!rango) return c.json({ error: 'Elegí un día válido.' }, 400);
    return c.json(await c.get('repositorio').leerActividad(rango));
  });

  admin.post('/partidos', sinVeedores, async (c) => {
    const repo = c.get('repositorio');
    const resultado = validarPartidoNuevo(await repo.leerPublico(), await leerCuerpo(c));
    return aplicar(c, resultado, (valor) => repo.insertar('partidos', valor), 201);
  });

  admin.patch('/partidos/:id', async (c) => {
    const repo = c.get('repositorio');
    const id = idDeRuta(c);
    // Con los datos del panel: para marcar un W.O. hay que mirar los pagos del partido
    const [datos, cuerpo] = [await repo.leerAdmin(), await leerCuerpo(c)];
    const resultado = reglaPara(
      c,
      () => permisoVeedorPartido(datos, id, cuerpo),
      () => validarCambioPartido(datos, id, cuerpo)
    );
    return aplicar(c, resultado, (valor) => repo.actualizar('partidos', id, valor));
  });

  admin.delete('/partidos/:id', sinVeedores, (c) => borrarFila(c, 'partidos', validarBorradoPartido));

  admin.post('/expulsiones', async (c) => {
    const repo = c.get('repositorio');
    const [datos, cuerpo] = [await repo.leerPublico(), await leerCuerpo(c)];
    const resultado = reglaPara(
      c,
      () => permisoVeedorRojaNueva(datos, cuerpo),
      () => validarExpulsionNueva(datos, cuerpo)
    );
    return aplicar(c, resultado, (valor) => repo.insertar('expulsiones', valor), 201);
  });

  admin.patch('/expulsiones/:id', sinVeedores, async (c) => {
    const repo = c.get('repositorio');
    const id = idDeRuta(c);
    const resultado = validarCambioExpulsion(await repo.leerAdmin(), id, await leerCuerpo(c));
    return aplicar(c, resultado, (valor) => repo.actualizar('expulsiones', id, valor));
  });

  admin.delete('/expulsiones/:id', (c) =>
    borrarFila(c, 'expulsiones', validarBorradoExpulsion, permisoVeedorBorrarRoja)
  );

  // Las amarillas ya no se cargan: solo se pueden borrar las que había
  admin.delete('/tarjetas/:id', sinVeedores, (c) => borrarFila(c, 'tarjetas', validarBorradoTarjeta));

  admin.post('/movimientos', async (c) => {
    const repo = c.get('repositorio');
    const [datos, cuerpo] = [await repo.leerAdmin(), await leerCuerpo(c)];
    const resultado = reglaPara(
      c,
      () => permisoVeedorPagoNuevo(datos, cuerpo),
      () => validarMovimientoNuevo(datos, cuerpo)
    );
    return aplicar(c, resultado, (valor) => repo.insertar('movimientos', valor), 201);
  });

  admin.patch('/movimientos/:id', async (c) => {
    const repo = c.get('repositorio');
    const id = idDeRuta(c);
    const [datos, cuerpo] = [await repo.leerAdmin(), await leerCuerpo(c)];
    const resultado = reglaPara(
      c,
      () => permisoVeedorPago(datos, id),
      () => validarCambioMovimiento(datos, id, cuerpo)
    );
    return aplicar(c, resultado, (valor) => repo.actualizar('movimientos', id, valor));
  });

  admin.delete('/movimientos/:id', (c) =>
    borrarFila(c, 'movimientos', validarBorradoMovimiento, permisoVeedorPago)
  );

  admin.patch('/equipos/:id', sinVeedores, async (c) => {
    const repo = c.get('repositorio');
    const id = idDeRuta(c);
    const resultado = validarCambioEquipo(await repo.leerPublico(), id, await leerCuerpo(c));
    return aplicar(c, resultado, async (valor) => {
      await repo.actualizar('equipos', id, valor.equipo);
      await repo.guardarDelegado(valor.delegado);
      return { ok: true };
    });
  });

  // Un equipo nuevo: arranca sin tabla inicial (0 partidos jugados)
  admin.post('/equipos', sinVeedores, async (c) => {
    const repo = c.get('repositorio');
    const resultado = validarEquipoNuevo(await repo.leerPublico(), await leerCuerpo(c));
    return aplicar(c, resultado, async (valor) => ({ id: (await repo.insertar('equipos', valor)).id }), 201);
  });

  // Dar de baja (deja la tabla; lo jugado queda) o volver a dar de alta
  admin.put('/equipos/:id/baja', sinVeedores, async (c) => {
    const repo = c.get('repositorio');
    const id = idDeRuta(c);
    const resultado = validarBaja(await repo.leerPublico(), id, await leerCuerpo(c));
    return aplicar(c, resultado, async (valor) => {
      await repo.actualizar('equipos', id, valor);
      return { ok: true };
    });
  });

  // Escudo de un equipo: llega ya achicado del navegador, como data:image/webp;base64,... (o PNG)
  admin.put('/equipos/:id/escudo', soloSuperadmin, async (c) => {
    const repo = c.get('repositorio');
    const id = idDeRuta(c);
    const resultado = validarEscudo(await repo.leerPublico(), id, await leerCuerpo(c));
    return aplicar(c, resultado, (valor) => repo.subirEscudo(id, valor));
  });

  admin.delete('/equipos/:id/escudo', soloSuperadmin, async (c) => {
    const repo = c.get('repositorio');
    const id = idDeRuta(c);
    if (!(await repo.leerPublico()).equipos.some((e) => e.id === id)) {
      return c.json({ error: 'Ese equipo no existe.' }, 404);
    }
    return c.json(await repo.quitarEscudo(id));
  });

  admin.patch('/configuracion', sinVeedores, async (c) => {
    const repo = c.get('repositorio');
    const resultado = validarConfiguracion(await leerCuerpo(c));
    return aplicar(c, resultado, (valor) => repo.actualizar('configuracion', 1, valor));
  });

  app.route('/admin', admin);
  return app;
}
