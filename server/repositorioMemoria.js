/**
 * Base en memoria de la simulación (npm run simulacion): arranca con una copia de los datos reales
 * y todo lo que se cambia queda acá, hasta cerrar la simulación. Nunca escribe en Supabase.
 * Tiene la misma forma que crearRepositorioSupabase, así la API no nota la diferencia.
 */

import { aCamel, armarDatosAdmin } from './repositorio.js';

// Lo que completa la base sola al insertar (los valores por defecto de esquema.sql y las migraciones)
const POR_DEFECTO = {
  partidos: { golesLocal: null, golesVisitante: null, postergado: false, ausente: null, predio: null, cancha: null, hora: null },
  expulsiones: { nombreJugador: '', fechasSuspension: null, fechasCumplidas: 0 },
  tarjetas: { nombreJugador: '' },
  movimientos: { partidoId: null, metodo: null, nota: '' },
};
// Tablas privadas: la simulación las arranca vacías
const PRIVADAS = ['delegados', 'expulsiones', 'tarjetas', 'movimientos'];

const copia = (valor) => structuredClone(valor);
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
          // Como las secuencias de la base: los ids no se reusan aunque se borre una fila
          db.ultimoId = {
            partidos: Math.max(0, ...db.partidos.map((p) => p.id)),
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

  return function crearRepositorio(token) {
    return {
      leerPublico,

      async leerAdmin() {
        const publico = await leerPublico();
        const { delegados, expulsiones, tarjetas, movimientos } = await base();
        return armarDatosAdmin(publico, copia({ delegados, expulsiones, tarjetas, movimientos }));
      },

      // En la simulación no hay login: cualquier sesión es la del admin
      async usuarioActual() {
        return token ? { id: 'simulacion' } : null;
      },

      async esAdmin() {
        return true;
      },

      async insertar(tabla, fila) {
        const db = await base();
        const id = ++db.ultimoId[tabla];
        const nueva = { id, ...POR_DEFECTO[tabla], ...aCamel(fila) };
        db[tabla].push(nueva);
        return copia(nueva);
      },

      async actualizar(tabla, id, cambios) {
        const db = await base();
        const fila = tabla === 'configuracion' ? db.configuracion : db[tabla].find((f) => f.id === id);
        if (!fila) throw new Error(`Simulación: no existe ${tabla} ${id}`);
        Object.assign(fila, aCamel(cambios));
        return copia(fila);
      },

      async borrar(tabla, id) {
        const db = await base();
        db[tabla] = db[tabla].filter((f) => f.id !== id);
      },

      async guardarDelegado(fila) {
        const db = await base();
        const delegado = aCamel(fila);
        db.delegados = [...db.delegados.filter((d) => d.equipoId !== delegado.equipoId), delegado];
      },
    };
  };
}
