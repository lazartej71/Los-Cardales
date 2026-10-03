/**
 * Acceso a Supabase. Usa la clave pública y, si hay sesión, el token del usuario:
 * las reglas RLS de la base se aplican siempre, también acá.
 * Ojo: PostgREST devuelve hasta 1000 filas por consulta; el campeonato está muy lejos de eso.
 */

import { createClient } from '@supabase/supabase-js';
import { normalizarHora } from '../src/logica/lugar.js';

// goles_local → golesLocal
export const aCamel = (fila) =>
  Object.fromEntries(
    Object.entries(fila).map(([clave, valor]) => [clave.replace(/_([a-z])/g, (_, letra) => letra.toUpperCase()), valor])
  );

// Un partido de la base, con lugar y hora aunque la migración 3 todavía no se haya corrido
// (por eso se lee con select('*')). Postgres devuelve la hora con segundos: "13:40:00" → "13:40".
export function normalizarPartido(fila) {
  const partido = { predio: null, cancha: null, hora: null, ...aCamel(fila) };
  return { ...partido, hora: partido.hora === null ? null : normalizarHora(partido.hora) };
}

/**
 * Lo que recibe el panel: lo público más el delegado de cada equipo y las expulsiones.
 * La usa también la base en memoria de la simulación, para que devuelva lo mismo.
 */
export function armarDatosAdmin(publico, { delegados, expulsiones, tarjetas, movimientos }) {
  const porEquipo = new Map(delegados.map((d) => [d.equipoId, d]));
  return {
    ...publico,
    equipos: publico.equipos.map((e) => ({
      ...e,
      delegado: porEquipo.get(e.id)?.nombre ?? '',
      telefonoDelegado: porEquipo.get(e.id)?.telefono ?? '',
    })),
    expulsiones,
    tarjetas,
    movimientos,
  };
}

export function crearRepositorioSupabase({ url, clave }) {
  return function crearRepositorio(token) {
    const cliente = createClient(url, clave, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    });

    async function ejecutar(consulta) {
      const { data, error } = await consulta;
      if (error) throw new Error(`Supabase: ${error.code || ''} ${error.message}`.trim());
      return data;
    }

    async function leerPublico() {
      const [categorias, zonas, equipos, tablaInicial, partidos, configuracion] = await Promise.all([
        ejecutar(cliente.from('categorias').select('id, nombre, orden').order('orden')),
        ejecutar(cliente.from('zonas').select('id, categoria_id, nombre').order('id')),
        ejecutar(cliente.from('equipos').select('id, zona_id, nombre').order('id')),
        ejecutar(cliente.from('tabla_inicial').select('equipo_id, pj, pg, pe, pp, gf, gc')),
        ejecutar(
          cliente
            .from('partidos')
            .select('*')
            .order('fecha')
            .order('id')
        ),
        ejecutar(
          cliente.from('configuracion').select('nombre_campeonato, criterios_desempate, arancel').eq('id', 1).single()
        ),
      ]);
      return {
        categorias,
        zonas: zonas.map(aCamel),
        equipos: equipos.map(aCamel),
        tablaInicial: tablaInicial.map(aCamel),
        partidos: partidos.map(normalizarPartido),
        configuracion: aCamel(configuracion),
      };
    }

    return {
      leerPublico,

      // Lo público más lo privado: delegados (unidos a cada equipo), expulsiones, tarjetas y movimientos
      async leerAdmin() {
        const [publico, delegados, expulsiones, tarjetas, movimientos] = await Promise.all([
          leerPublico(),
          ejecutar(cliente.from('delegados').select('equipo_id, nombre, telefono')),
          ejecutar(
            cliente
              .from('expulsiones')
              .select('id, partido_id, equipo_id, numero_camiseta, nombre_jugador, fechas_suspension, fechas_cumplidas')
              .order('id')
          ),
          ejecutar(cliente.from('tarjetas').select('id, partido_id, equipo_id, numero_camiseta, nombre_jugador').order('id')),
          ejecutar(
            cliente.from('movimientos').select('id, equipo_id, partido_id, tipo, monto, metodo, fecha, nota').order('id')
          ),
        ]);
        return armarDatosAdmin(publico, {
          delegados: delegados.map(aCamel),
          expulsiones: expulsiones.map(aCamel),
          tarjetas: tarjetas.map(aCamel),
          movimientos: movimientos.map(aCamel),
        });
      },

      async usuarioActual() {
        if (!token) return null;
        const { data, error } = await cliente.auth.getUser(token);
        return error ? null : data.user;
      },

      async esAdmin() {
        return (await ejecutar(cliente.rpc('es_admin'))) === true;
      },

      // La fila propia de administradores (la regla de la base deja leer solo esa).
      // Si la migración 5 todavía no se corrió, no hay columna rol: es un admin común.
      async rol() {
        const { data, error } = await cliente.from('administradores').select('rol').maybeSingle();
        return !error && data?.rol === 'superadmin' ? 'superadmin' : 'admin';
      },

      // Hasta 500 registros del rango, del más nuevo al más viejo (la base solo se los da al superadmin)
      async leerActividad({ desde, hasta }) {
        const filas = await ejecutar(
          cliente
            .from('actividad')
            .select('id, creado_en, quien, accion, tabla, fila, cambios')
            .gte('creado_en', desde)
            .lt('creado_en', hasta)
            .order('id', { ascending: false })
            .limit(500)
        );
        return filas.map((e) => ({ ...aCamel(e), fila: e.fila ? aCamel(e.fila) : {} }));
      },

      async insertar(tabla, fila) {
        return aCamel(await ejecutar(cliente.from(tabla).insert(fila).select().single()));
      },

      async actualizar(tabla, id, cambios) {
        return aCamel(await ejecutar(cliente.from(tabla).update(cambios).eq('id', id).select().single()));
      },

      async borrar(tabla, id) {
        await ejecutar(cliente.from(tabla).delete().eq('id', id));
      },

      async guardarDelegado(fila) {
        await ejecutar(cliente.from('delegados').upsert(fila, { onConflict: 'equipo_id' }));
      },
    };
  };
}
