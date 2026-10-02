// Configuración de Supabase para el servidor (en Vercel y en desarrollo vienen de process.env)
export function leerEntorno(entorno = process.env) {
  const url = entorno.SUPABASE_URL || entorno.VITE_SUPABASE_URL;
  const clave = entorno.SUPABASE_PUBLISHABLE_KEY || entorno.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !clave) {
    throw new Error('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY (en .env.local o en Vercel).');
  }
  return { url, clave };
}
