/**
 * Qué modalidad muestra el panel. Una cuenta fija (Franco en Fútbol 11, Gaby en Fútbol 7) queda en la
 * suya. El superadmin elige Todas, Fútbol 11 o Fútbol 7, salvo en Cargar, que no tiene Todas: ahí pasa
 * a la última modalidad que eligió. Sin Fútbol 7 cargado, el panel se ve como siempre.
 */

import { nombreModalidad } from './modalidades.js';

// → { activa: 'f11' | 'f7' | 'todas', conFiltro, aviso (o null), banner }
export function modalidadDelPanel({ cuenta, elegida, ultima, seccion, hayF7 }) {
  if (!hayF7) return { activa: cuenta ?? 'todas', conFiltro: false, aviso: null, banner: false };
  if (cuenta) return { activa: cuenta, conFiltro: false, aviso: null, banner: true };
  const activa = elegida ?? 'todas';
  if (seccion === 'cargar' && activa === 'todas') {
    return { activa: ultima, conFiltro: true, aviso: `Cargar no tiene Todas: estás en ${nombreModalidad(ultima)}.`, banner: true };
  }
  return { activa, conFiltro: true, aviso: null, banner: activa !== 'todas' };
}
