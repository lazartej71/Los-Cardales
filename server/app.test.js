import { describe, expect, it, vi } from 'vitest';
import { crearDatosEjemplo } from '../src/datos/datosEjemplo.js';
import { crearApp } from './app.js';
import { crearRepositorioMemoria } from './repositorioMemoria.js';

// Repositorio en memoria: registra lo que la API intenta guardar
function armar({ admin = true, rol = 'admin' } = {}) {
  const datos = crearDatosEjemplo();
  const guardados = [];
  const pedidosActividad = [];
  const publico = () => ({
    categorias: datos.categorias,
    zonas: datos.zonas,
    equipos: datos.equipos.map(({ id, zonaId, nombre }) => ({ id, zonaId, nombre })),
    tablaInicial: datos.tablaInicial,
    partidos: datos.partidos,
    configuracion: datos.configuracion,
  });
  const crearRepositorio = (token) => ({
    leerPublico: async () => publico(),
    leerAdmin: async () => datos,
    usuarioActual: async () => (token === 'token-valido' ? { id: 'u1' } : null),
    esAdmin: async () => admin,
    rol: async () => rol,
    leerActividad: async (rango) => {
      pedidosActividad.push(rango);
      return [{ id: 1, quien: 'Franco', accion: 'alta', tabla: 'tarjetas', fila: {}, cambios: null }];
    },
    insertar: async (tabla, fila) => {
      guardados.push({ accion: 'insertar', tabla, fila });
      return { id: 500, ...fila };
    },
    actualizar: async (tabla, id, cambios) => {
      guardados.push({ accion: 'actualizar', tabla, id, cambios });
      return { id, ...cambios };
    },
    borrar: async (tabla, id) => {
      guardados.push({ accion: 'borrar', tabla, id });
    },
    guardarDelegado: async (fila) => {
      guardados.push({ accion: 'delegado', fila });
    },
  });
  return { app: crearApp({ crearRepositorio }), guardados, datos, pedidosActividad };
}

function pedir(app, ruta, { metodo = 'GET', cuerpo, token = 'token-valido' } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const body = cuerpo === undefined ? undefined : JSON.stringify(cuerpo);
  return app.request(`/api${ruta}`, { method: metodo, headers, body });
}

describe('API pública', () => {
  it('devuelve los datos sin expulsiones ni teléfonos', async () => {
    const respuesta = await pedir(armar().app, '/publico', { token: null });
    expect(respuesta.status).toBe(200);
    // Caché corta: un admin que guarda y mira la vista pública ve el cambio en segundos
    expect(respuesta.headers.get('Cache-Control')).toBe('public, max-age=0, s-maxage=5');
    const cuerpo = await respuesta.json();
    expect(cuerpo.equipos).toHaveLength(32);
    expect(cuerpo.expulsiones).toBeUndefined();
    expect(JSON.stringify(cuerpo)).not.toMatch(/telefono|549115/);
  });

  it('responde en JSON cuando la ruta no existe', async () => {
    const respuesta = await pedir(armar().app, '/nada', { token: null });
    expect(respuesta.status).toBe(404);
    expect(await respuesta.json()).toEqual({ error: 'Esa dirección no existe.' });
  });

  it('responde 500 con un mensaje claro si la base falla', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = crearApp({
      crearRepositorio: () => ({
        leerPublico: async () => {
          throw new Error('caída');
        },
      }),
    });
    const respuesta = await pedir(app, '/publico', { token: null });
    expect(respuesta.status).toBe(500);
    expect((await respuesta.json()).error).toMatch(/Probá de nuevo/);
  });
});

describe('API de admin', () => {
  it('pide iniciar sesión si no hay token', async () => {
    expect((await pedir(armar().app, '/admin/datos', { token: null })).status).toBe(401);
  });

  it('rechaza una sesión vencida', async () => {
    const respuesta = await pedir(armar().app, '/admin/datos', { token: 'viejo' });
    expect(respuesta.status).toBe(401);
    expect((await respuesta.json()).error).toMatch(/venció/);
  });

  it('rechaza una cuenta que no es admin', async () => {
    expect((await pedir(armar({ admin: false }).app, '/admin/datos')).status).toBe(403);
  });

  it('le da los datos privados al admin', async () => {
    const cuerpo = await (await pedir(armar().app, '/admin/datos')).json();
    expect(cuerpo.expulsiones).toHaveLength(4);
    expect(cuerpo.rol).toBe('admin');
  });

  it('el registro de actividad es solo para el superadmin', async () => {
    const respuesta = await pedir(armar().app, '/admin/actividad?dia=2026-10-03');
    expect(respuesta.status).toBe(403);
    expect((await respuesta.json()).error).toBe('Esta sección es solo para el superadmin.');
  });

  it('al superadmin le da la actividad del día pedido, en hora de Argentina', async () => {
    const { app, pedidosActividad } = armar({ rol: 'superadmin' });
    const respuesta = await pedir(app, '/admin/actividad?dia=2026-10-03');
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual([expect.objectContaining({ quien: 'Franco', tabla: 'tarjetas' })]);
    expect(pedidosActividad).toEqual([{ desde: '2026-10-03T00:00:00-03:00', hasta: '2026-10-04T00:00:00-03:00' }]);
  });

  it('pide el día bien escrito', async () => {
    const respuesta = await pedir(armar({ rol: 'superadmin' }).app, '/admin/actividad?dia=hoy');
    expect(respuesta.status).toBe(400);
  });

  it('crea un partido válido', async () => {
    const { app, guardados, datos } = armar();
    const [local, visitante] = datos.equipos; // Libre A1 y Libre A2
    const lugar = { predio: 'cura_borges', cancha: 4, hora: '15:10' };
    const cuerpo = { categoriaId: 1, fecha: 4, localId: local.id, visitanteId: visitante.id, ...lugar };
    const respuesta = await pedir(app, '/admin/partidos', { metodo: 'POST', cuerpo });
    expect(respuesta.status).toBe(201);
    expect(guardados).toEqual([
      {
        accion: 'insertar',
        tabla: 'partidos',
        fila: { categoria_id: 1, fecha: 4, local_id: local.id, visitante_id: visitante.id, ...lugar },
      },
    ]);
  });

  it('no guarda nada si la regla falla', async () => {
    const { app, guardados, datos } = armar();
    const id = datos.equipos[0].id;
    const cuerpo = { categoriaId: 1, fecha: 4, localId: id, visitanteId: id };
    const respuesta = await pedir(app, '/admin/partidos', { metodo: 'POST', cuerpo });
    expect(respuesta.status).toBe(400);
    expect((await respuesta.json()).error).toMatch(/sí mismo/);
    expect(guardados).toEqual([]);
  });

  it('carga un resultado', async () => {
    const { app, guardados, datos } = armar();
    const pendiente = datos.partidos.find((p) => p.golesLocal === null);
    const cuerpo = { golesLocal: 1, golesVisitante: 1 };
    const respuesta = await pedir(app, `/admin/partidos/${pendiente.id}`, { metodo: 'PATCH', cuerpo });
    expect(respuesta.status).toBe(200);
    expect(guardados).toEqual([
      {
        accion: 'actualizar',
        tabla: 'partidos',
        id: pendiente.id,
        cambios: { goles_local: 1, goles_visitante: 1, postergado: false, ausente: null },
      },
    ]);
  });

  it('no borra un partido con expulsiones', async () => {
    const { app, guardados, datos } = armar();
    const respuesta = await pedir(app, `/admin/partidos/${datos.expulsiones[0].partidoId}`, { metodo: 'DELETE' });
    expect(respuesta.status).toBe(409);
    expect(guardados).toEqual([]);
  });

  it('guarda el equipo y su delegado', async () => {
    const { app, guardados, datos } = armar();
    const id = datos.equipos[0].id;
    const cuerpo = { nombre: 'Branca', delegado: 'Ana', telefonoDelegado: '5491151001234' };
    const respuesta = await pedir(app, `/admin/equipos/${id}`, { metodo: 'PATCH', cuerpo });
    expect(respuesta.status).toBe(200);
    expect(guardados).toEqual([
      { accion: 'actualizar', tabla: 'equipos', id, cambios: { nombre: 'Branca' } },
      { accion: 'delegado', fila: { equipo_id: id, nombre: 'Ana', telefono: '5491151001234' } },
    ]);
  });

  it('marca un W.O.', async () => {
    const { app, guardados, datos } = armar();
    const pendiente = datos.partidos.find((p) => p.golesLocal === null);
    const cuerpo = { ausente: 'visitante' };
    const respuesta = await pedir(app, `/admin/partidos/${pendiente.id}`, { metodo: 'PATCH', cuerpo });
    expect(respuesta.status).toBe(200);
    expect(guardados).toEqual([
      {
        accion: 'actualizar',
        tabla: 'partidos',
        id: pendiente.id,
        cambios: { goles_local: 3, goles_visitante: 0, postergado: false, ausente: 'visitante' },
      },
    ]);
  });

  it('no marca W.O. si el equipo que faltó ya tiene un pago en ese partido', async () => {
    const { app, guardados, datos } = armar();
    const pendiente = datos.partidos.find((p) => p.golesLocal === null);
    datos.movimientos.push({
      id: 8, equipoId: pendiente.visitanteId, partidoId: pendiente.id, tipo: 'pago', monto: 105000, metodo: 'efectivo', fecha: '2026-10-15', nota: '',
    });
    const respuesta = await pedir(app, `/admin/partidos/${pendiente.id}`, { metodo: 'PATCH', cuerpo: { ausente: 'visitante' } });
    expect(respuesta.status).toBe(409);
    expect(guardados).toEqual([]);
  });

  it('anota el pago de un equipo en un partido', async () => {
    const { app, guardados, datos } = armar();
    const jugado = datos.partidos.find((p) => p.golesLocal !== null);
    const cuerpo = {
      tipo: 'pago',
      equipoId: jugado.localId,
      partidoId: jugado.id,
      monto: 95000,
      metodo: 'efectivo',
      fecha: '2026-10-15',
    };
    const respuesta = await pedir(app, '/admin/movimientos', { metodo: 'POST', cuerpo });
    expect(respuesta.status).toBe(201);
    expect(guardados).toEqual([
      {
        accion: 'insertar',
        tabla: 'movimientos',
        fila: {
          tipo: 'pago',
          equipo_id: jugado.localId,
          partido_id: jugado.id,
          monto: 95000,
          metodo: 'efectivo',
          fecha: '2026-10-15',
          nota: '',
        },
      },
    ]);
  });

  it('corrige y borra un movimiento', async () => {
    const { app, guardados, datos } = armar();
    datos.movimientos.push({
      id: 7, equipoId: 1, partidoId: null, tipo: 'pago', monto: 5000, metodo: 'efectivo', fecha: '2026-10-15', nota: '',
    });
    expect((await pedir(app, '/admin/movimientos/7', { metodo: 'PATCH', cuerpo: { monto: 6000 } })).status).toBe(200);
    expect((await pedir(app, '/admin/movimientos/7', { metodo: 'DELETE' })).status).toBe(200);
    expect(guardados).toEqual([
      { accion: 'actualizar', tabla: 'movimientos', id: 7, cambios: { monto: 6000 } },
      { accion: 'borrar', tabla: 'movimientos', id: 7 },
    ]);
  });

  it('agrega y borra una amarilla', async () => {
    const { app, guardados, datos } = armar();
    const jugado = datos.partidos[0];
    const cuerpo = { partidoId: jugado.id, equipoId: jugado.localId, numeroCamiseta: 7 };
    expect((await pedir(app, '/admin/tarjetas', { metodo: 'POST', cuerpo })).status).toBe(201);
    datos.tarjetas.push({ id: 3, partidoId: jugado.id, equipoId: jugado.localId, numeroCamiseta: 7, nombreJugador: '' });
    expect((await pedir(app, '/admin/tarjetas/3', { metodo: 'DELETE' })).status).toBe(200);
    expect(guardados).toEqual([
      {
        accion: 'insertar',
        tabla: 'tarjetas',
        fila: { partido_id: jugado.id, equipo_id: jugado.localId, numero_camiseta: 7, nombre_jugador: '' },
      },
      { accion: 'borrar', tabla: 'tarjetas', id: 3 },
    ]);
  });

  it('la plata y las tarjetas piden una sesión de admin', async () => {
    expect((await pedir(armar({ admin: false }).app, '/admin/movimientos', { metodo: 'POST', cuerpo: {} })).status).toBe(403);
    expect((await pedir(armar().app, '/admin/tarjetas', { metodo: 'POST', cuerpo: {}, token: null })).status).toBe(401);
  });
});

describe('API de la simulación (base en memoria)', () => {
  it('aplica las mismas reglas y lo cargado aparece en la vista pública', async () => {
    const datos = crearDatosEjemplo();
    const publico = {
      categorias: datos.categorias,
      zonas: datos.zonas,
      equipos: datos.equipos.map(({ id, zonaId, nombre }) => ({ id, zonaId, nombre })),
      tablaInicial: datos.tablaInicial,
      partidos: datos.partidos,
      configuracion: datos.configuracion,
    };
    const app = crearApp({ crearRepositorio: crearRepositorioMemoria(async () => publico) });
    const [a, b, c] = datos.equipos; // Libre A1, A2 y A3
    const lugar = { predio: 'los_cardales', cancha: 2, hora: '13:40' };
    const cuerpo = { categoriaId: 1, fecha: 9, localId: a.id, visitanteId: b.id, ...lugar };

    expect((await pedir(app, '/admin/partidos', { metodo: 'POST', cuerpo, token: 'simulacion' })).status).toBe(201);
    const repetido = { categoriaId: 1, fecha: 9, localId: c.id, visitanteId: a.id, ...lugar, hora: '15:10' };
    expect((await pedir(app, '/admin/partidos', { metodo: 'POST', cuerpo: repetido, token: 'simulacion' })).status).toBe(409);

    const vista = await (await pedir(app, '/publico', { token: null })).json();
    expect(vista.partidos.filter((p) => p.fecha === 9)).toEqual([
      expect.objectContaining({ localId: a.id, visitanteId: b.id, golesLocal: null, postergado: false, ...lugar }),
    ]);
    // Los datos de partida no se tocan
    expect(publico.partidos.some((p) => p.fecha === 9)).toBe(false);
  });
});
