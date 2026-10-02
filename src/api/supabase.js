/**
 * Cliente de Supabase en el navegador. Solo se usa para el login de los admins:
 * los datos se piden a /api.
 */

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const clave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
let cliente = null;

// null si faltan las variables de entorno
export function obtenerSupabase() {
  if (!url || !clave) return null;
  if (!cliente) cliente = createClient(url, clave);
  return cliente;
}
