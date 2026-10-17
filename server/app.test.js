import { describe, expect, it, vi } from 'vitest';
import { crearDatosEjemplo } from '../src/datos/datosEjemplo.js';
import { conFutbol7 } from '../src/datos/datosEjemploFutbol7.js';
import { crearApp } from './app.js';
import { crearRepositorioMemoria } from './repositorioMemoria.js';

// Repositorio en memoria: registra lo que la API intenta guardar
function armar({ admin = true, veedor = false, rol = 'admin', modalidad = null, datos = crearDatosEjemplo() } = {}) {
  const guardados = [];
  const pedidosActividad = [];
  let visitas = 0;
  const publico = () => ({
    categorias: datos.categorias,
    zonas: datos.zonas,
    equipos: datos.equipos.map(({ id, zonaId, nombre, baja = false }) => ({ id, zonaId, nombre, baja })),
    tablaInicial: datos.tablaInicial,
    partidos: datos.partidos,
    configuracion: datos.configuracion,
  });
  const crearRepositorio = (token) => ({
    leerPublico: async () => publico(),
    leerAdmin: async () => datos,
    usuarioActual: async () => (token === 'token-valido' ? { id: 'u1' } : null),
    esAdmin: async () => admin,
    esVeedor: async () => veedor,
    rol: async () => rol,
    modalidad: async () => modalidad,
    sumarVisita: async () => {
      visitas++;
    },
    leerVisitas: async () => [{ dia: '2026-10-03', personas: 40 }],
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
    subirEscudo: async (equipoId, valor) => {
      guardados.push({ accion: 'escudo', equipoId, tipo: valor.tipo, extension: valor.extension, peso: valor.bytes.length });
      return { ok: true };
    },
    quitarEscudo: async (equipoId) => {
      guardados.push({ accion: 'quitar escudo', equipoId });
      return { ok: true };
    },
  });
  return { app: crearApp({ crearRepositorio }), guardados, datos, pedidosActividad, visitas: () => visitas };
}

function pedir(app, ruta, { metodo = 'GET', cuerpo, token = 'token-valido' } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const body = cuerpo === undefined ? undefined : JSON.stringify(cuerpo);
  return app.request(`/api${ruta}`, { method: metodo, headers, body });
}

// Un WebP mínimo (solo la firma de los primeros bytes) como lo manda el navegador
const WEBP = `data:image/webp;base64,${btoa('RIFF\x10\x00\x00\x00WEBPVP8 ')}`;

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

  it('cualquiera avisa una visita, sin sesión y sin caché', async () => {
    const { app, visitas } = armar();
    const respuesta = await pedir(app, '/visita', { metodo: 'POST', token: null });
    expect(respuesta.status).toBe(204);
    expect(respuesta.headers.get('Cache-Control')).toBe('no-store');
    expect(visitas()).toBe(1);
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

  it('rechaza una cuenta que no es admin ni veedor', async () => {
    const respuesta = await pedir(armar({ admin: false }).app, '/admin/datos');
    expect(respuesta.status).toBe(403);
    expect((await respuesta.json()).error).toBe('Esta cuenta no tiene permiso para usar el panel.');
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

  it('las visitas son solo para el superadmin', async () => {
    expect((await pedir(armar().app, '/admin/visitas')).status).toBe(403);
    const respuesta = await pedir(armar({ rol: 'superadmin' }).app, '/admin/visitas');
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual([{ dia: '2026-10-03', personas: 40 }]);
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

  it('agrega un equipo y devuelve su id', async () => {
    const { app, guardados } = armar();
    const respuesta = await pedir(app, '/admin/equipos', { metodo: 'POST', cuerpo: { zonaId: 1, nombre: ' CHIVERO F.C ' } });
    expect(respuesta.status).toBe(201);
    expect(await respuesta.json()).toEqual({ id: 500 });
    expect(guardados).toEqual([{ accion: 'insertar', tabla: 'equipos', fila: { zona_id: 1, nombre: 'CHIVERO F.C' } }]);
  });

  it('no agrega un nombre repetido en la categoría', async () => {
    const { app, guardados } = armar();
    const respuesta = await pedir(app, '/admin/equipos', { metodo: 'POST', cuerpo: { zonaId: 2, nombre: 'LIBRE A1' } });
    expect(respuesta.status).toBe(409);
    expect((await respuesta.json()).error).toBe('Ya hay un equipo Libre A1 en Libre.');
    expect(guardados).toEqual([]);
  });

  it('da de baja un equipo sin partidos pendientes y lo vuelve a dar de alta', async () => {
    const { app, guardados, datos } = armar();
    datos.partidos = datos.partidos.filter((p) => p.fecha < 3);
    const id = datos.equipos[0].id;
    expect((await pedir(app, `/admin/equipos/${id}/baja`, { metodo: 'PUT', cuerpo: { baja: true } })).status).toBe(200);
    expect((await pedir(app, `/admin/equipos/${id}/baja`, { metodo: 'PUT', cuerpo: { baja: false } })).status).toBe(200);
    expect(guardados).toEqual([
      { accion: 'actualizar', tabla: 'equipos', id, cambios: { baja: true } },
      { accion: 'actualizar', tabla: 'equipos', id, cambios: { baja: false } },
    ]);
  });

  it('no da de baja un equipo con partidos pendientes ni uno que no existe', async () => {
    const { app, guardados, datos } = armar();
    const conPendiente = await pedir(app, `/admin/equipos/${datos.equipos[0].id}/baja`, { metodo: 'PUT', cuerpo: { baja: true } });
    expect(conPendiente.status).toBe(409);
    expect((await conPendiente.json()).error).toMatch(/tiene 1 partido sin resultado/);
    expect((await pedir(app, '/admin/equipos/99999/baja', { metodo: 'PUT', cuerpo: { baja: true } })).status).toBe(404);
    expect(guardados).toEqual([]);
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

  it('ya no se cargan amarillas, pero se pueden borrar las que había', async () => {
    const { app, guardados, datos } = armar();
    const jugado = datos.partidos[0];
    const cuerpo = { partidoId: jugado.id, equipoId: jugado.localId, numeroCamiseta: 7 };
    expect((await pedir(app, '/admin/tarjetas', { metodo: 'POST', cuerpo })).status).toBe(404);
    datos.tarjetas.push({ id: 3, partidoId: jugado.id, equipoId: jugado.localId, numeroCamiseta: 7, nombreJugador: '' });
    expect((await pedir(app, '/admin/tarjetas/3', { metodo: 'DELETE' })).status).toBe(200);
    expect(guardados).toEqual([{ accion: 'borrar', tabla: 'tarjetas', id: 3 }]);
  });

  it('anota una roja con su tipo, y sin tipo no la guarda', async () => {
    const { app, guardados, datos } = armar();
    const jugado = datos.partidos[0];
    const cuerpo = { partidoId: jugado.id, equipoId: jugado.localId, numeroCamiseta: 9 };
    expect((await pedir(app, '/admin/expulsiones', { metodo: 'POST', cuerpo })).status).toBe(400);
    const conTipo = { ...cuerpo, tipo: 'doble_amarilla' };
    expect((await pedir(app, '/admin/expulsiones', { metodo: 'POST', cuerpo: conTipo })).status).toBe(201);
    expect(guardados).toEqual([
      {
        accion: 'insertar',
        tabla: 'expulsiones',
        fila: { partido_id: jugado.id, equipo_id: jugado.localId, numero_camiseta: 9, nombre_jugador: '', tipo: 'doble_amarilla' },
      },
    ]);
  });

  it('la plata pide una sesión del panel', async () => {
    expect((await pedir(armar({ admin: false }).app, '/admin/movimientos', { metodo: 'POST', cuerpo: {} })).status).toBe(403);
    expect((await pedir(armar().app, '/admin/movimientos', { metodo: 'POST', cuerpo: {}, token: null })).status).toBe(401);
  });
});

describe('API para veedores', () => {
  // La fecha 3 está en juego y sus partidos tienen cancha; la 2 ya se jugó
  function armarVeedor() {
    const armado = armar({ admin: false, veedor: true });
    armado.datos.partidos.forEach((p) => {
      if (p.fecha === 3) Object.assign(p, { predio: 'los_cardales', cancha: 1, hora: `1${p.id % 10}:00` });
    });
    const enJuego = armado.datos.partidos.find((p) => p.fecha === 3);
    const jugado = armado.datos.partidos.find((p) => p.fecha === 2);
    return { ...armado, enJuego, jugado };
  }
  const NO_PUEDE = 'Tu cuenta de veedor no puede hacer esto.';

  it('entra al panel y recibe los datos con su rol', async () => {
    const respuesta = await pedir(armarVeedor().app, '/admin/datos');
    expect(respuesta.status).toBe(200);
    expect((await respuesta.json()).rol).toBe('veedor');
  });

  it('carga el resultado de un partido de la fecha en juego', async () => {
    const { app, guardados, enJuego } = armarVeedor();
    const cuerpo = { golesLocal: 2, golesVisitante: 1 };
    expect((await pedir(app, `/admin/partidos/${enJuego.id}`, { metodo: 'PATCH', cuerpo })).status).toBe(200);
    expect(guardados).toEqual([
      {
        accion: 'actualizar',
        tabla: 'partidos',
        id: enJuego.id,
        cambios: { goles_local: 2, goles_visitante: 1, postergado: false, ausente: null },
      },
    ]);
  });

  it('carga el resultado de un postergado reprogramado para un día especial', async () => {
    const { app, guardados, jugado } = armarVeedor();
    Object.assign(jugado, {
      golesLocal: null,
      golesVisitante: null,
      postergado: true,
      dia: '2026-10-12',
      predio: 'cura_borges',
      cancha: 4,
      hora: '10:00',
    });
    const cuerpo = { golesLocal: 0, golesVisitante: 0 };
    expect((await pedir(app, `/admin/partidos/${jugado.id}`, { metodo: 'PATCH', cuerpo })).status).toBe(200);
    expect(guardados[0].cambios).toEqual({ goles_local: 0, goles_visitante: 0, postergado: false, ausente: null });
  });

  it('no posterga ni toca partidos de otra fecha', async () => {
    const { app, guardados, enJuego, jugado } = armarVeedor();
    const postergar = await pedir(app, `/admin/partidos/${enJuego.id}`, { metodo: 'PATCH', cuerpo: { postergado: true } });
    expect(postergar.status).toBe(403);
    expect((await postergar.json()).error).toBe(NO_PUEDE);
    const otraFecha = await pedir(app, `/admin/partidos/${jugado.id}`, {
      metodo: 'PATCH',
      cuerpo: { golesLocal: 0, golesVisitante: 0 },
    });
    expect(otraFecha.status).toBe(403);
    expect((await otraFecha.json()).error).toMatch(/fecha en juego/);
    expect(guardados).toEqual([]);
  });

  it('anota rojas y pagos de sus partidos, pero no deudas', async () => {
    const { app, guardados, enJuego } = armarVeedor();
    const roja = { partidoId: enJuego.id, equipoId: enJuego.localId, numeroCamiseta: 9, tipo: 'directa' };
    expect((await pedir(app, '/admin/expulsiones', { metodo: 'POST', cuerpo: roja })).status).toBe(201);
    const pago = {
      tipo: 'pago',
      equipoId: enJuego.localId,
      partidoId: enJuego.id,
      monto: 50000,
      metodo: 'efectivo',
      fecha: '2026-10-15',
    };
    expect((await pedir(app, '/admin/movimientos', { metodo: 'POST', cuerpo: pago })).status).toBe(201);
    const deuda = { tipo: 'deuda_anterior', equipoId: enJuego.localId, monto: 1000, fecha: '2026-10-01' };
    expect((await pedir(app, '/admin/movimientos', { metodo: 'POST', cuerpo: deuda })).status).toBe(403);
    expect(guardados.map((g) => g.tabla)).toEqual(['expulsiones', 'movimientos']);
  });

  it('borra una roja de sus partidos sin sanción, pero no una que ya la tiene', async () => {
    const { app, guardados, datos, enJuego } = armarVeedor();
    datos.expulsiones.push({
      id: 10, partidoId: enJuego.id, equipoId: enJuego.localId, numeroCamiseta: 4, nombreJugador: '', fechasSuspension: null, fechasCumplidas: 0,
    });
    expect((await pedir(app, '/admin/expulsiones/10', { metodo: 'DELETE' })).status).toBe(200);
    expect((await pedir(app, '/admin/expulsiones/1', { metodo: 'DELETE' })).status).toBe(403);
    expect(guardados).toEqual([{ accion: 'borrar', tabla: 'expulsiones', id: 10 }]);
  });

  it('no entra a nada más', async () => {
    const { app, guardados } = armarVeedor();
    for (const [metodo, ruta, cuerpo] of [
      ['POST', '/admin/partidos', { categoriaId: 1, fecha: 4, localId: 1, visitanteId: 2 }],
      ['DELETE', '/admin/partidos/1'],
      ['PATCH', '/admin/expulsiones/2', { fechasSuspension: 1 }],
      ['DELETE', '/admin/tarjetas/1'],
      ['PATCH', '/admin/equipos/1', { nombre: 'Otro' }],
      ['PATCH', '/admin/configuracion', { arancel: 1 }],
      ['POST', '/admin/equipos', { zonaId: 1, nombre: 'Otro' }],
      ['PUT', '/admin/equipos/1/baja', { baja: true }],
      ['GET', '/admin/visitas'],
      ['GET', '/admin/actividad?dia=2026-10-03'],
    ]) {
      expect((await pedir(app, ruta, { metodo, cuerpo })).status, `${metodo} ${ruta}`).toBe(403);
    }
    expect(guardados).toEqual([]);
  });
});

describe('escudos (solo el superadmin)', () => {
  it('el superadmin sube el escudo de un equipo', async () => {
    const { app, guardados, datos } = armar({ rol: 'superadmin' });
    const id = datos.equipos[0].id;
    const respuesta = await pedir(app, `/admin/equipos/${id}/escudo`, { metodo: 'PUT', cuerpo: { imagen: WEBP } });
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ ok: true });
    expect(guardados).toEqual([{ accion: 'escudo', equipoId: id, tipo: 'image/webp', extension: 'webp', peso: 16 }]);
  });

  it('el superadmin quita el escudo de un equipo', async () => {
    const { app, guardados, datos } = armar({ rol: 'superadmin' });
    const id = datos.equipos[0].id;
    expect((await pedir(app, `/admin/equipos/${id}/escudo`, { metodo: 'DELETE' })).status).toBe(200);
    expect(guardados).toEqual([{ accion: 'quitar escudo', equipoId: id }]);
  });

  it('una imagen inválida no se guarda', async () => {
    const { app, guardados, datos } = armar({ rol: 'superadmin' });
    const respuesta = await pedir(app, `/admin/equipos/${datos.equipos[0].id}/escudo`, {
      metodo: 'PUT',
      cuerpo: { imagen: 'hola' },
    });
    expect(respuesta.status).toBe(400);
    expect(await respuesta.json()).toEqual({ error: 'El escudo tiene que ser una imagen WebP o PNG de hasta 100 KB.' });
    expect(guardados).toEqual([]);
  });

  it('el equipo tiene que existir', async () => {
    const { app, guardados } = armar({ rol: 'superadmin' });
    for (const [metodo, cuerpo] of [
      ['PUT', { imagen: WEBP }],
      ['DELETE', undefined],
    ]) {
      const respuesta = await pedir(app, '/admin/equipos/99999/escudo', { metodo, cuerpo });
      expect(respuesta.status, metodo).toBe(404);
      expect(await respuesta.json()).toEqual({ error: 'Ese equipo no existe.' });
    }
    expect(guardados).toEqual([]);
  });

  it('el admin y el veedor reciben 403 y no se guarda nada', async () => {
    for (const opciones of [{ rol: 'admin' }, { admin: false, veedor: true }]) {
      const { app, guardados, datos } = armar(opciones);
      const ruta = `/admin/equipos/${datos.equipos[0].id}/escudo`;
      for (const [metodo, cuerpo] of [
        ['PUT', { imagen: WEBP }],
        ['DELETE', undefined],
      ]) {
        const respuesta = await pedir(app, ruta, { metodo, cuerpo });
        expect(respuesta.status, `${JSON.stringify(opciones)} ${metodo}`).toBe(403);
        expect(await respuesta.json()).toEqual({ error: 'Los escudos los cambia solo el superadmin.' });
      }
      expect(guardados).toEqual([]);
    }
  });
});

describe('API de la simulación (base en memoria)', () => {
  it('agrega un equipo con el id siguiente al mayor, lo da de baja y la vista pública lo muestra así', async () => {
    const datos = crearDatosEjemplo();
    const publico = {
      categorias: datos.categorias,
      zonas: datos.zonas,
      equipos: datos.equipos.map(({ id, zonaId, nombre }) => ({ id, zonaId, nombre, baja: false })),
      tablaInicial: datos.tablaInicial,
      partidos: datos.partidos,
      configuracion: datos.configuracion,
    };
    const app = crearApp({ crearRepositorio: crearRepositorioMemoria(async () => publico) });
    const token = 'simulacion-admin';
    const creado = await pedir(app, '/admin/equipos', { metodo: 'POST', cuerpo: { zonaId: 1, nombre: 'CHIVERO F.C' }, token });
    expect(creado.status).toBe(201);
    const { id } = await creado.json();
    expect(id).toBe(33);
    expect((await pedir(app, `/admin/equipos/${id}/baja`, { metodo: 'PUT', cuerpo: { baja: true }, token })).status).toBe(200);
    // Libre A1 tiene pendiente la fecha 3
    expect((await pedir(app, '/admin/equipos/1/baja', { metodo: 'PUT', cuerpo: { baja: true }, token })).status).toBe(409);
    const vista = await (await pedir(app, '/publico', { token: null })).json();
    expect(vista.equipos.find((e) => e.id === id)).toEqual({ id, zonaId: 1, nombre: 'CHIVERO F.C', escudo: null, baja: true });
    expect(vista.equipos.find((e) => e.id === 1).baja).toBe(false);
  });

  it('el superadmin sube un escudo y la vista pública lo muestra; con "Ver como" admin, no puede', async () => {
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
    const id = datos.equipos[0].id;
    const ruta = `/admin/equipos/${id}/escudo`;
    const cuerpo = { imagen: WEBP };
    expect((await pedir(app, ruta, { metodo: 'PUT', cuerpo, token: 'simulacion-admin' })).status).toBe(403);
    expect((await pedir(app, ruta, { metodo: 'PUT', cuerpo, token: 'simulacion' })).status).toBe(200);
    const vista = await (await pedir(app, '/publico', { token: null })).json();
    expect(vista.equipos.find((e) => e.id === id).escudo).toBe(WEBP);
  });

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

describe('cada organizador, solo su modalidad', () => {
  const conCuenta = (modalidad) => armar({ modalidad, datos: conFutbol7() });
  const NO_F11 = 'Tu cuenta es de Fútbol 7: no puede cambiar partidos de Fútbol 11.';

  it('la cuenta de F7 no toca un partido de F11, y sí uno de F7', async () => {
    const { app, guardados } = conCuenta('f7');
    const ajeno = await pedir(app, '/admin/partidos/1', { metodo: 'PATCH', cuerpo: { golesLocal: 1, golesVisitante: 0 } });
    expect(ajeno.status).toBe(403);
    expect(await ajeno.json()).toEqual({ error: NO_F11 });
    const propio = await pedir(app, '/admin/partidos/202', { metodo: 'PATCH', cuerpo: { golesLocal: 1, golesVisitante: 0 } });
    expect(propio.status).toBe(200);
    expect(guardados).toHaveLength(1);
  });

  it('la cuenta de F11 no agrega un equipo en una zona de F7', async () => {
    const { app, guardados } = conCuenta('f11');
    const respuesta = await pedir(app, '/admin/equipos', { metodo: 'POST', cuerpo: { zonaId: 20, nombre: 'INTRUSO' } });
    expect(respuesta.status).toBe(403);
    expect(await respuesta.json()).toEqual({ error: 'Tu cuenta es de Fútbol 11: no puede cambiar equipos de Fútbol 7.' });
    expect(guardados).toEqual([]);
  });

  it('el arancel de una categoría de F7 lo cambia su organizador', async () => {
    const { app, guardados } = conCuenta('f7');
    const respuesta = await pedir(app, '/admin/categorias/10', { metodo: 'PATCH', cuerpo: { arancel: 70000 } });
    expect(respuesta.status).toBe(200);
    expect(guardados).toEqual([{ accion: 'actualizar', tabla: 'categorias', id: 10, cambios: { arancel: 70000 } }]);
    const deFranco = await pedir(conCuenta('f11').app, '/admin/categorias/10', { metodo: 'PATCH', cuerpo: { arancel: 1 } });
    expect(deFranco.status).toBe(403);
    expect(await deFranco.json()).toEqual({ error: 'Tu cuenta es de Fútbol 11: no puede cambiar aranceles de Fútbol 7.' });
  });

  it('la cuenta de F7 no cambia los ajustes de F11', async () => {
    const { app, guardados } = conCuenta('f7');
    const respuesta = await pedir(app, '/admin/configuracion', { metodo: 'PATCH', cuerpo: { arancel: 1 } });
    expect(respuesta.status).toBe(403);
    expect(guardados).toEqual([]);
  });

  it('el panel recibe la modalidad de la cuenta', async () => {
    const cuerpo = await (await pedir(conCuenta('f7').app, '/admin/datos')).json();
    expect(cuerpo.modalidad).toBe('f7');
    expect((await (await pedir(armar().app, '/admin/datos')).json()).modalidad).toBeNull();
  });
});
