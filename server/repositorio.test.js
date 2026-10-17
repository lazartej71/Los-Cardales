import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  crearRepositorioSupabase,
  normalizarCategoria,
  normalizarConfiguracion,
  normalizarEquipo,
  normalizarExpulsion,
  normalizarPartido,
} from './repositorio.js';

describe('categorías, configuración y cuenta leídas de Supabase', () => {
  it('sin la migración 10a, cada categoría es de Fútbol 11 y sin arancel propio', () => {
    expect(normalizarCategoria({ id: 1, nombre: 'Libre', orden: 1 })).toEqual({
      id: 1,
      nombre: 'Libre',
      orden: 1,
      modalidad: 'f11',
      arancel: null,
    });
    expect(normalizarCategoria({ id: 6, nombre: 'Libre', orden: 6, modalidad: 'f7', arancel: 65000 })).toEqual({
      id: 6,
      nombre: 'Libre',
      orden: 6,
      modalidad: 'f7',
      arancel: 65000,
    });
  });

  it('la configuración llega sin el id de la fila', () => {
    const fila = { id: 1, nombre_campeonato: 'Copa GP', criterios_desempate: ['puntos'], arancel: 105000 };
    expect(normalizarConfiguracion(fila)).toEqual({
      nombreCampeonato: 'Copa GP',
      criteriosDesempate: ['puntos'],
      arancel: 105000,
    });
  });

  // Supabase falso que responde la fila propia de administradores
  const repoConCuenta = (respuesta) => {
    const armador = { select: () => armador, maybeSingle: async () => respuesta };
    const cliente = { from: () => armador };
    return crearRepositorioSupabase({ url: 'https://base.supabase.co', clave: 'publica', crearCliente: () => cliente })('tok');
  };

  it('la modalidad de la cuenta: la de su fila, o ninguna si no tiene o si falta la columna', async () => {
    expect(await repoConCuenta({ data: { rol: 'admin', modalidad: 'f7' }, error: null }).modalidad()).toBe('f7');
    expect(await repoConCuenta({ data: { rol: 'admin' }, error: null }).modalidad()).toBeNull();
    expect(await repoConCuenta({ data: null, error: { message: 'falla' } }).modalidad()).toBeNull();
  });
});

describe('partidos leídos de Supabase', () => {
  it('sin las columnas de las migraciones 3 y 7, llegan sin lugar, hora ni día', () => {
    expect(normalizarPartido({ id: 1, local_id: 2, goles_local: null })).toEqual({
      id: 1,
      localId: 2,
      golesLocal: null,
      predio: null,
      cancha: null,
      hora: null,
      dia: null,
    });
  });

  it('una roja llega con su tipo, o sin tipo si la migración 7 no se corrió, y sin la fecha de carga', () => {
    const fila = {
      id: 1,
      partido_id: 2,
      equipo_id: 3,
      numero_camiseta: 10,
      nombre_jugador: '',
      fechas_suspension: null,
      fechas_cumplidas: 0,
      creado_en: '2026-10-05T12:00:00Z',
    };
    const esperada = {
      id: 1,
      partidoId: 2,
      equipoId: 3,
      numeroCamiseta: 10,
      nombreJugador: '',
      fechasSuspension: null,
      fechasCumplidas: 0,
    };
    expect(normalizarExpulsion(fila)).toEqual({ ...esperada, tipo: null });
    expect(normalizarExpulsion({ ...fila, tipo: 'directa' })).toEqual({ ...esperada, tipo: 'directa' });
  });

  it('la hora llega sin segundos', () => {
    expect(normalizarPartido({ id: 1, predio: 'los_cardales', cancha: 2, hora: '13:40:00', dia: '2026-10-12' })).toEqual({
      id: 1,
      predio: 'los_cardales',
      cancha: 2,
      hora: '13:40',
      dia: '2026-10-12',
    });
  });
});

describe('equipos leídos de Supabase', () => {
  const direccion = (archivo) => `https://base.supabase.co/storage/v1/object/public/escudos/${archivo}`;
  const fila = { id: 1, zona_id: 2, nombre: 'BRANCA' };

  it('llegan con la dirección de su escudo (o null) y si están dados de baja, aunque las migraciones 8 y 9 no se hayan corrido', () => {
    expect(normalizarEquipo({ ...fila, escudo: 'equipo-1-5.webp', baja: true }, direccion)).toEqual({
      id: 1,
      zonaId: 2,
      nombre: 'BRANCA',
      escudo: 'https://base.supabase.co/storage/v1/object/public/escudos/equipo-1-5.webp',
      baja: true,
    });
    expect(normalizarEquipo({ ...fila, escudo: null }, direccion).escudo).toBeNull();
    expect(normalizarEquipo(fila, direccion)).toEqual({ id: 1, zonaId: 2, nombre: 'BRANCA', escudo: null, baja: false });
  });
});

// Supabase falso para los escudos: anota cada pedido y responde como la base real. El equipo tiene hoy
// `escudoActual`. Con `fallaUpdate`, guardar en el equipo da error; con `sinFila`, no toca ninguna fila
// (como PostgREST: sin error, salvo que se pida .single(), que ahí sí falla).
function clienteFalso({ escudoActual = null, fallaUpdate = false, sinFila = false } = {}) {
  const pedidos = [];
  const consulta = (tabla) => {
    const pedido = { tabla, accion: 'leer' };
    let unaFila = false;
    const respuesta = () => {
      if (pedido.accion === 'leer') return { data: { id: pedido.id, escudo: escudoActual }, error: null };
      if (fallaUpdate) return { data: null, error: { code: '42501', message: 'permiso denegado' } };
      if (sinFila) return unaFila ? { data: null, error: { code: 'PGRST116', message: 'sin filas' } } : { data: null, error: null };
      return { data: unaFila ? { id: pedido.id } : null, error: null };
    };
    const armador = {
      select: () => armador,
      update: (cambios) => Object.assign(pedido, { accion: 'cambiar', cambios }) && armador,
      eq: (_columna, valor) => Object.assign(pedido, { id: valor }) && armador,
      single: () => {
        unaFila = true;
        return armador;
      },
      then: (resolver, rechazar) => {
        pedidos.push({ ...pedido });
        return Promise.resolve(respuesta()).then(resolver, rechazar);
      },
    };
    return armador;
  };
  const archivos = {
    upload: async (archivo, bytes, opciones) => {
      pedidos.push({ storage: 'subir', archivo, tipo: opciones.contentType, cache: opciones.cacheControl, upsert: opciones.upsert });
      return { data: { path: archivo }, error: null };
    },
    remove: async (lista) => {
      pedidos.push({ storage: 'borrar', archivos: lista });
      return { data: [], error: null };
    },
    getPublicUrl: (archivo) => ({ data: { publicUrl: `https://base.supabase.co/escudos/${archivo}` } }),
  };
  return { pedidos, from: consulta, storage: { from: () => archivos } };
}

describe('escudos en Supabase', () => {
  const armar = (opciones) => {
    const cliente = clienteFalso(opciones);
    const repo = crearRepositorioSupabase({ url: 'https://base.supabase.co', clave: 'publica', crearCliente: () => cliente })('tok');
    return { repo, pedidos: cliente.pedidos };
  };
  const ESCUDO = { bytes: new Uint8Array([1, 2, 3]), tipo: 'image/webp', extension: 'webp' };
  const NUEVO = 'equipo-7-1728150000000.webp';
  afterEach(() => vi.restoreAllMocks());

  it('sube el nuevo con versión y caché de un año, lo guarda en el equipo y borra el anterior', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1728150000000);
    const { repo, pedidos } = armar({ escudoActual: 'equipo-7-1.webp' });
    expect(await repo.subirEscudo(7, ESCUDO)).toEqual({ ok: true });
    expect(pedidos).toEqual([
      { tabla: 'equipos', accion: 'leer', id: 7 },
      { storage: 'subir', archivo: NUEVO, tipo: 'image/webp', cache: '31536000', upsert: false },
      { tabla: 'equipos', accion: 'cambiar', cambios: { escudo: NUEVO }, id: 7 },
      { storage: 'borrar', archivos: ['equipo-7-1.webp'] },
    ]);
  });

  it('si no se puede guardar en el equipo, borra el archivo recién subido y avisa el error', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1728150000000);
    const { repo, pedidos } = armar({ escudoActual: 'equipo-7-1.webp', fallaUpdate: true });
    await expect(repo.subirEscudo(7, ESCUDO)).rejects.toThrow(/Supabase: 42501/);
    expect(pedidos.at(-1)).toEqual({ storage: 'borrar', archivos: [NUEVO] });
    expect(pedidos.some((p) => p.archivos?.includes('equipo-7-1.webp'))).toBe(false);
  });

  it('si el equipo no se actualiza (ninguna fila), no dice que se guardó', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1728150000000);
    const { repo, pedidos } = armar({ escudoActual: 'equipo-7-1.webp', sinFila: true });
    await expect(repo.subirEscudo(7, ESCUDO)).rejects.toThrow(/Supabase: PGRST116/);
    expect(pedidos.at(-1)).toEqual({ storage: 'borrar', archivos: [NUEVO] });
  });

  it('quitar deja el equipo sin escudo y borra el archivo; sin escudo no borra nada', async () => {
    const conEscudo = armar({ escudoActual: 'equipo-7-1.webp' });
    expect(await conEscudo.repo.quitarEscudo(7)).toEqual({ ok: true });
    expect(conEscudo.pedidos.slice(1)).toEqual([
      { tabla: 'equipos', accion: 'cambiar', cambios: { escudo: null }, id: 7 },
      { storage: 'borrar', archivos: ['equipo-7-1.webp'] },
    ]);
    const sinEscudo = armar();
    await sinEscudo.repo.quitarEscudo(7);
    expect(sinEscudo.pedidos.some((p) => p.storage === 'borrar')).toBe(false);
  });

  it('si el equipo no se actualiza al quitar, no dice que se quitó ni borra el archivo', async () => {
    const { repo, pedidos } = armar({ escudoActual: 'equipo-7-1.webp', sinFila: true });
    await expect(repo.quitarEscudo(7)).rejects.toThrow(/Supabase: PGRST116/);
    expect(pedidos.some((p) => p.storage === 'borrar')).toBe(false);
  });
});
