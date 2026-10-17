/**
 * Base en memoria de la simulación (npm run simulacion): arranca con una copia de los datos reales
 * y todo lo que se cambia queda acá, hasta cerrar la simulación. Nunca escribe en Supabase.
 * Tiene la misma forma que crearRepositorioSupabase, así la API no nota la diferencia.
 */

import { modalidadSimulada, rolSimulado } from '../src/datos/constantes.js';
import { hoyEnArgentina } from '../src/logica/cuentas.js';
import { filtrarPorModalidad } from '../src/logica/modalidades.js';
import { aCamel, armarDatosAdmin } from './repositorio.js';

// Lo que completa la base sola al insertar (los valores por defecto de esquema.sql y las migraciones)
const POR_DEFECTO = {
  partidos: {
    golesLocal: null,
    golesVisitante: null,
    postergado: false,
    ausente: null,
    predio: null,
    cancha: null,
    hora: null,
    dia: null,
  },
  expulsiones: { nombreJugador: '', fechasSuspension: null, fechasCumplidas: 0, tipo: null },
  tarjetas: { nombreJugador: '' },
  movimientos: { partidoId: null, metodo: null, nota: '' },
  equipos: { escudo: null, baja: false },
};
// Tablas privadas: la simulación las arranca vacías
const PRIVADAS = ['delegados', 'expulsiones', 'tarjetas', 'movimientos'];

const copia = (valor) => structuredClone(valor);
// "goles_local" → "golesLocal"
const aClave = (columna) => columna.replace(/_([a-z])/g, (_, letra) => letra.toUpperCase());
const porFechaEId = (a, b) => a.fecha - b.fecha || a.id - b.id;

/**
 * @param {() => Promise<object>} cargarDatosReales devuelve lo mismo que leerPublico() de la base real
 */
export function crearRepositorioMemoria(cargarDatosReales) {
  let carga = null;

  // Los datos reales se leen una sola vez; si falla, se reintenta en el próximo pedido
  function base() {
    if (!carga) {
      carga = cargarDatosReales()
        .then((datos) => {
          const db = copia(datos);
          for (const tabla of PRIVADAS) db[tabla] = [];
          // Como el trigger de la migración 5: cada alta, cambio o baja queda anotada
          db.actividad = [];
          db.visitas = new Map(); // día → personas
          // Como las secuencias de la base: los ids no se reusan aunque se borre una fila
          db.ultimoId = {
            partidos: Math.max(0, ...db.partidos.map((p) => p.id)),
            equipos: Math.max(0, ...db.equipos.map((e) => e.id)),
            expulsiones: 0,
            tarjetas: 0,
            movimientos: 0,
          };
          return db;
        })
        .catch((error) => {
          carga = null;
          throw error;
        });
    }
    return carga;
  }

  async function leerPublico() {
    const { categorias, zonas, equipos, tablaInicial, partidos, configuracion } = await base();
    return copia({ categorias, zonas, equipos, tablaInicial, partidos: [...partidos].sort(porFechaEId), configuracion });
  }

  function anotar(db, quien, accion, tabla, fila, cambios = null) {
    db.actividad.push({
      id: db.actividad.length + 1,
      creadoEn: new Date().toISOString(),
      quien,
      accion,
      tabla,
      fila: copia(fila),
      cambios,
    });
  }

  return function crearRepositorio(token) {
    // La sesión simulada dice con qué rol se prueba (el selector "Ver como" del cartel de la simulación)
    const rol = rolSimulado(token);
    const modalidad = modalidadSimulada(token);
    const veedor = rol === 'veedor';
    const quien = rol === 'superadmin' ? 'Simulación' : `Simulación (${rol})`;

    async function actualizar(tabla, id, cambios) {
      const db = await base();
      const fila = tabla === 'configuracion' ? db.configuracion : db[tabla].find((f) => f.id === id);
      if (!fila) throw new Error(`Simulación: no existe ${tabla} ${id}`);
      const distintas = Object.keys(cambios)
        .filter((columna) => JSON.stringify(fila[aClave(columna)]) !== JSON.stringify(cambios[columna]))
        .sort();
      Object.assign(fila, aCamel(cambios));
      if (distintas.length) anotar(db, quien, 'cambio', tabla, fila, distintas);
      return copia(fila);
    }

    return {
      leerPublico,

      // Como las reglas de la base: el veedor no ve los teléfonos de los delegados ni las amarillas, y un
      // organizador ve solo lo privado de su modalidad (lo público, completo)
      async leerAdmin() {
        const publico = await leerPublico();
        const { delegados, expulsiones, tarjetas, movimientos } = await base();
        let privados = veedor ? { delegados: [], expulsiones, tarjetas: [], movimientos } : { delegados, expulsiones, tarjetas, movimientos };
        if (modalidad) {
          const propio = filtrarPorModalidad({ ...publico, ...privados }, modalidad);
          const equipos = new Set(propio.equipos.map((e) => e.id));
          privados = {
            delegados: privados.delegados.filter((d) => equipos.has(d.equipoId)),
            expulsiones: propio.expulsiones,
            tarjetas: propio.tarjetas,
            movimientos: propio.movimientos,
          };
        }
        return armarDatosAdmin(publico, copia(privados));
      },

      // En la simulación no hay login: cualquier sesión entra, con el rol que diga
      async usuarioActual() {
        return token ? { id: token } : null;
      },

      async esAdmin() {
        return !veedor;
      },

      async esVeedor() {
        return veedor;
      },

      async sumarVisita() {
        const db = await base();
        const dia = hoyEnArgentina();
        db.visitas.set(dia, (db.visitas.get(dia) ?? 0) + 1);
      },

      async leerVisitas() {
        const db = await base();
        return [...db.visitas.entries()]
          .map(([dia, personas]) => ({ dia, personas }))
          .sort((a, b) => b.dia.localeCompare(a.dia));
      },

      // Como en la base real: el rol de una cuenta del panel (por defecto se ve todo, también Control)
      async rol() {
        return rol === 'superadmin' ? 'superadmin' : 'admin';
      },

      async modalidad() {
        return modalidad;
      },

      async leerActividad({ desde, hasta }) {
        const db = await base();
        const [inicio, fin] = [Date.parse(desde), Date.parse(hasta)];
        return copia(
          db.actividad.filter((e) => Date.parse(e.creadoEn) >= inicio && Date.parse(e.creadoEn) < fin).reverse()
        );
      },

      async insertar(tabla, fila) {
        const db = await base();
        const id = ++db.ultimoId[tabla];
        const nueva = { id, ...POR_DEFECTO[tabla], ...aCamel(fila) };
        db[tabla].push(nueva);
        anotar(db, quien, 'alta', tabla, nueva);
        return copia(nueva);
      },

      actualizar,

      async borrar(tabla, id) {
        const db = await base();
        const borrada = db[tabla].find((f) => f.id === id);
        db[tabla] = db[tabla].filter((f) => f.id !== id);
        if (borrada) anotar(db, quien, 'baja', tabla, borrada);
      },

      async guardarDelegado(fila) {
        const db = await base();
        const delegado = aCamel(fila);
        db.delegados = [...db.delegados.filter((d) => d.equipoId !== delegado.equipoId), delegado];
        anotar(db, quien, 'cambio', 'delegados', delegado, Object.keys(fila).filter((c) => c !== 'equipo_id').sort());
      },

      // Como en la base real, pero la imagen queda en memoria tal cual llegó (data:image/...;base64,...)
      async subirEscudo(equipoId, { imagen }) {
        await actualizar('equipos', equipoId, { escudo: imagen });
        return { ok: true };
      },

      async quitarEscudo(equipoId) {
        await actualizar('equipos', equipoId, { escudo: null });
        return { ok: true };
      },
    };
  };
}
