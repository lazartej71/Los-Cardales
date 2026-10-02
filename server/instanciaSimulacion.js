// La API de la simulación (npm run simulacion): lee una vez los datos públicos reales, sin sesión,
// y desde ahí todo queda en memoria. Sin token, Supabase no deja escribir nada: la base real no se toca.
import { crearApp } from './app.js';
import { leerEntorno } from './entorno.js';
import { crearRepositorioSupabase } from './repositorio.js';
import { crearRepositorioMemoria } from './repositorioMemoria.js';

const baseReal = crearRepositorioSupabase(leerEntorno());

export const app = crearApp({ crearRepositorio: crearRepositorioMemoria(() => baseReal(null).leerPublico()) });
