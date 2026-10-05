/**
 * Reglas del campeonato y constantes compartidas (las usan la app y el servidor).
 */

// Puntos que otorga cada resultado
export const PUNTOS = { ganado: 3, empatado: 1, perdido: 0 };

// Criterios de desempate disponibles. El orden lo elige el admin.
export const CRITERIOS = {
  puntos: {
    nombre: 'Puntos',
    detalle: 'El que sumó más puntos',
    motivo: 'por puntos',
  },
  dg: {
    nombre: 'Diferencia de gol',
    detalle: 'Goles a favor menos goles en contra',
    motivo: 'por diferencia de gol',
  },
  gf: {
    nombre: 'Goles a favor',
    detalle: 'El que convirtió más goles',
    motivo: 'por goles a favor',
  },
  enfrentamiento: {
    nombre: 'Resultado entre ellos',
    detalle: 'Puntos en los partidos entre los equipos empatados',
    motivo: 'por el resultado entre ellos',
  },
};

export const CRITERIOS_POR_DEFECTO = ['puntos', 'dg', 'gf', 'enfrentamiento'];

// Predios donde se juega y sus canchas (las migraciones 3 y 4 repiten estas listas en la base)
export const PREDIOS = [
  { id: 'los_cardales', nombre: 'Los Cardales', canchas: [1, 2, 3, 4, 5, 6, 7] },
  { id: 'cura_borges', nombre: 'Cura Borges', canchas: [1, 4, 5, 6, 7, 8, 9] },
];

// Simulación: con qué rol se prueba el panel. La sesión simulada lleva el token y la base en memoria
// responde con ese rol (el selector "Ver como" del cartel de la simulación)
export const ROLES_SIMULACION = [
  { valor: 'superadmin', etiqueta: 'Superadmin', token: 'simulacion' },
  { valor: 'admin', etiqueta: 'Admin', token: 'simulacion-admin' },
  { valor: 'veedor', etiqueta: 'Veedor', token: 'simulacion-veedor' },
];

export const tokenSimulado = (rol) => ROLES_SIMULACION.find((r) => r.valor === rol)?.token ?? 'simulacion';

export const rolSimulado = (token) => ROLES_SIMULACION.find((r) => r.token === token)?.valor ?? 'superadmin';
