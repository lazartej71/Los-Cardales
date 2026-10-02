/**
 * Datos de ejemplo (los del prototipo) con la misma forma que devuelve la API.
 * Solo se usan en las pruebas: la app real lee los datos de Supabase.
 */

import { CRITERIOS_POR_DEFECTO } from './constantes.js';

const NOMBRES = [
  'Martín', 'Diego', 'Pablo', 'Sebastián', 'Gustavo', 'Fernando', 'Leandro', 'Hernán',
  'Claudio', 'Javier', 'Walter', 'Matías', 'Damián', 'Rodrigo', 'Gabriel', 'Nicolás',
  'Ariel', 'Marcelo', 'Adrián', 'Cristian', 'Esteban', 'Federico', 'Gonzalo', 'Horacio',
  'Ignacio', 'Julio', 'Lucas', 'Mariano', 'Néstor', 'Omar', 'Raúl', 'Sergio',
];
const APELLIDOS = [
  'Gómez', 'Fernández', 'Rodríguez', 'López', 'Martínez', 'Pérez', 'García', 'Sánchez',
  'Romero', 'Sosa', 'Torres', 'Álvarez', 'Ruiz', 'Ramírez', 'Flores', 'Acosta',
  'Benítez', 'Medina', 'Herrera', 'Suárez', 'Aguirre', 'Giménez', 'Molina', 'Castro',
  'Ortiz', 'Silva', 'Núñez', 'Luna', 'Juárez', 'Cabrera', 'Ríos', 'Morales',
];

// Zona de 4 equipos (posiciones 0 a 3): todos contra todos en 3 fechas
const CRUCES = [
  { fecha: 1, local: 0, visitante: 1 },
  { fecha: 1, local: 2, visitante: 3 },
  { fecha: 2, local: 2, visitante: 0 },
  { fecha: 2, local: 3, visitante: 1 },
  { fecha: 3, local: 0, visitante: 3 },
  { fecha: 3, local: 1, visitante: 2 },
];

// Resultados de las fechas 1 y 2, en el orden de CRUCES (la fecha 3 queda pendiente)
const RESULTADOS = {
  'Libre-A': [[3, 2], [2, 0], [1, 1], [2, 2]], // A3 y A1 igualan en puntos: define la diferencia de gol
  'Libre-B': [[2, 1], [0, 0], [1, 0], [0, 1]], // B1 y B2 igualan en todo: define el resultado entre ellos
  '+35-A': [[4, 1], [2, 2], [0, 1], [3, 0]],
  '+35-B': [[1, 1], [3, 1], [2, 2], [2, 1]],
  '+40-A': [[0, 2], [1, 1], [2, 1], [0, 3]],
  '+40-B': [[2, 0], [1, 2], [1, 1], [0, 1]],
  '+45-A': [[1, 0], [0, 0], [2, 3], [1, 1]],
  '+45-B': [[2, 2], [4, 0], [1, 2], [1, 3]],
};

const telefonoFicticio = (i) => '549115' + String(1000000 + ((i * 7919 + 1234) % 9000000));

export function crearDatosEjemplo() {
  const categorias = ['Libre', '+35', '+40', '+45'].map((nombre, i) => ({ id: i + 1, nombre, orden: i + 1 }));
  const zonas = [];
  const equipos = [];
  const partidos = [];

  categorias.forEach((categoria) => {
    ['A', 'B'].forEach((letra) => {
      const zona = { id: zonas.length + 1, categoriaId: categoria.id, nombre: `Zona ${letra}` };
      zonas.push(zona);
      const ids = [1, 2, 3, 4].map((n) => {
        const i = equipos.length;
        equipos.push({
          id: i + 1,
          zonaId: zona.id,
          nombre: `${categoria.nombre} ${letra}${n}`,
          delegado: `${NOMBRES[i]} ${APELLIDOS[(i * 7) % APELLIDOS.length]}`,
          telefonoDelegado: telefonoFicticio(i),
        });
        return i + 1;
      });
      const resultados = RESULTADOS[`${categoria.nombre}-${letra}`];
      CRUCES.forEach((cruce, j) => {
        const resultado = resultados[j];
        partidos.push({
          id: partidos.length + 1,
          categoriaId: categoria.id,
          fecha: cruce.fecha,
          localId: ids[cruce.local],
          visitanteId: ids[cruce.visitante],
          golesLocal: resultado ? resultado[0] : null,
          golesVisitante: resultado ? resultado[1] : null,
          postergado: false,
          ausente: null,
        });
      });
    });
  });

  const idEquipo = (nombre) => equipos.find((e) => e.nombre === nombre).id;
  const idPartido = (local, visitante) =>
    partidos.find((p) => p.localId === idEquipo(local) && p.visitanteId === idEquipo(visitante)).id;
  const expulsiones = [
    { equipo: 'Libre A2', partido: ['Libre A1', 'Libre A2'], numero: 5, nombre: 'Lucas Benítez', suspension: 2, cumplidas: 1 },
    { equipo: '+35 B4', partido: ['+35 B4', '+35 B2'], numero: 9, nombre: '', suspension: null, cumplidas: 0 },
    { equipo: '+40 A1', partido: ['+40 A1', '+40 A2'], numero: 14, nombre: 'Marcelo Ruiz', suspension: 1, cumplidas: 1 },
    { equipo: '+45 B1', partido: ['+45 B1', '+45 B2'], numero: 3, nombre: 'Carlos Medina', suspension: 3, cumplidas: 1 },
  ].map((x, i) => ({
    id: i + 1,
    partidoId: idPartido(x.partido[0], x.partido[1]),
    equipoId: idEquipo(x.equipo),
    numeroCamiseta: x.numero,
    nombreJugador: x.nombre,
    fechasSuspension: x.suspension,
    fechasCumplidas: x.cumplidas,
  }));

  return {
    categorias,
    zonas,
    equipos,
    partidos,
    expulsiones,
    tarjetas: [],
    movimientos: [],
    tablaInicial: [],
    configuracion: {
      nombreCampeonato: 'Campeonato de Fútbol',
      criteriosDesempate: [...CRITERIOS_POR_DEFECTO],
      arancel: 105000,
    },
  };
}
