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

// Las dos modalidades del campeonato. Cada categoría es de una (la columna modalidad de la base).
export const MODALIDADES = [
  { id: 'f11', nombre: 'Fútbol 11', corto: 'F11', chip: 'FÚTBOL 11' },
  { id: 'f7', nombre: 'Fútbol 7', corto: 'F7', chip: 'FÚTBOL 7' },
];

// Redes del campeonato (las pasó el usuario el 23/10). Una sin url no se muestra en el pie.
export const REDES = [
  { id: 'facebook', nombre: 'Facebook', url: 'https://www.facebook.com/loscardalesfutbol' },
  { id: 'instagram', nombre: 'Instagram', url: 'https://www.instagram.com/loscardalesfut/' },
  { id: 'whatsapp', nombre: 'WhatsApp', url: 'https://wa.me/5493814490189' },
];

// Predios donde se juega y sus canchas (las migraciones 3, 4 y 10a repiten estas listas en la base).
// Las de Fútbol 7 son otras canchas: en la base llevan 21 y más, y se ven como 1, 2, 3.
export const PREDIOS = [
  { id: 'los_cardales', nombre: 'Los Cardales', canchas: [1, 2, 3, 4, 5, 6, 7], canchasF7: [21, 22] },
  { id: 'cura_borges', nombre: 'Cura Borges', canchas: [1, 4, 5, 6, 7, 8, 9], canchasF7: [21, 22, 23] },
];

// Simulación: con qué rol se prueba el panel. La sesión simulada lleva el token y la base en memoria
// responde con ese rol (el selector "Ver como" del cartel de la simulación)
// (los organizadores son admins con la modalidad fija: Franco en Fútbol 11 y Gaby en Fútbol 7)
export const ROLES_SIMULACION = [
  { valor: 'superadmin', etiqueta: 'Superadmin', token: 'simulacion' },
  { valor: 'admin', etiqueta: 'Admin', token: 'simulacion-admin' },
  { valor: 'f11', etiqueta: 'Organizador F11 (Franco)', token: 'simulacion-f11', modalidad: 'f11' },
  { valor: 'f7', etiqueta: 'Organizador F7 (Gaby)', token: 'simulacion-f7', modalidad: 'f7' },
  { valor: 'veedor', etiqueta: 'Veedor', token: 'simulacion-veedor' },
];

export const tokenSimulado = (rol) => ROLES_SIMULACION.find((r) => r.valor === rol)?.token ?? 'simulacion';

export const rolSimulado = (token) => ROLES_SIMULACION.find((r) => r.token === token)?.valor ?? 'superadmin';

export const modalidadSimulada = (token) => ROLES_SIMULACION.find((r) => r.token === token)?.modalidad ?? null;
