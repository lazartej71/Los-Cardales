/**
 * Visitas con Vercel Web Analytics: solo en el sitio publicado (sin cookies ni datos personales).
 * Se ven en Vercel → proyecto los-cardales → Analytics.
 */

import { inject } from '@vercel/analytics';

export const debeContarVisitas = ({ produccion, simulacion }) => produccion && !simulacion;

export function contarVisitas({ produccion, simulacion }) {
  if (debeContarVisitas({ produccion, simulacion })) inject();
}
