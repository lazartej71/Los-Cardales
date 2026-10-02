// La API lista para usar con la base real (la importan Vercel y el servidor de desarrollo)
import { crearApp } from './app.js';
import { leerEntorno } from './entorno.js';
import { crearRepositorioSupabase } from './repositorio.js';

export const app = crearApp({ crearRepositorio: crearRepositorioSupabase(leerEntorno()) });
