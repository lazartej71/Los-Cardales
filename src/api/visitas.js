/**
 * Cuántas personas entran a la vista pública: cada navegador avisa una sola vez por día.
 * No se guarda nada de la persona; en Supabase solo queda un número por día (migración 6).
 */

const CLAVE = 'lc-visita';

export async function avisarVisita({ almacen, hoy, enviar }) {
  try {
    if (almacen.getItem(CLAVE) === hoy) return;
    await enviar();
    almacen.setItem(CLAVE, hoy);
  } catch {
    // Sin red o con el navegador bloqueando el guardado: se cuenta la próxima vez
  }
}
