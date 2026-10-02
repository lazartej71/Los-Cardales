/**
 * Sesión de los admins con Supabase Auth. Queda guardada en el navegador y se renueva sola.
 * En la simulación no hay login: el panel abre directo y cualquier dato sirve para volver a entrar.
 */

import { useCallback, useEffect, useState } from 'react';
import { SIMULACION } from '../api/simulacion.js';
import { obtenerSupabase } from '../api/supabase.js';

const SESION_SIMULADA = { access_token: 'simulacion' };
const DOMINIO_USUARIOS = 'loscardalesfutbol.com';

// Supabase Auth pide un email: el usuario "franco1" ingresa como franco1@loscardalesfutbol.com.
// Si escriben un email completo, se usa tal cual.
export function emailDeUsuario(usuario) {
  const limpio = usuario.trim().toLowerCase();
  return limpio.includes('@') ? limpio : `${limpio}@${DOMINIO_USUARIOS}`;
}

// Errores de Supabase Auth → mensajes para la persona
function mensajeDeLogin(error) {
  const texto = error?.message || '';
  if (/invalid login credentials/i.test(texto)) return 'Usuario o contraseña incorrectos.';
  if (/email not confirmed/i.test(texto)) return 'Falta confirmar esta cuenta en Supabase.';
  if (/fetch|network/i.test(texto)) return 'No hay conexión. Revisá internet y probá de nuevo.';
  return 'No se pudo iniciar sesión. Probá de nuevo.';
}

export function useSesion({ simulacion = SIMULACION } = {}) {
  const [estado, setEstado] = useState(() =>
    simulacion ? { sesion: SESION_SIMULADA, cargando: false } : { sesion: null, cargando: obtenerSupabase() !== null }
  );

  useEffect(() => {
    if (simulacion) return undefined;
    const supabase = obtenerSupabase();
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => setEstado({ sesion: data.session, cargando: false }));
    const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => setEstado({ sesion, cargando: false }));
    return () => data.subscription.unsubscribe();
  }, [simulacion]);

  const ingresar = useCallback(async (usuario, contrasena) => {
    if (simulacion) {
      setEstado({ sesion: SESION_SIMULADA, cargando: false });
      return { error: null };
    }
    const supabase = obtenerSupabase();
    if (!supabase) return { error: 'Falta configurar Supabase en esta instalación.' };
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: emailDeUsuario(usuario), password: contrasena });
      return { error: error ? mensajeDeLogin(error) : null };
    } catch (error) {
      return { error: mensajeDeLogin(error) };
    }
  }, [simulacion]);

  const salir = useCallback(async () => {
    if (simulacion) {
      setEstado({ sesion: null, cargando: false });
      return;
    }
    const supabase = obtenerSupabase();
    if (supabase) await supabase.auth.signOut();
  }, [simulacion]);

  return { sesion: estado.sesion, cargando: estado.cargando, ingresar, salir };
}
