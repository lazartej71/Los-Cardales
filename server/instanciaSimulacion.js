// La API de la simulación (npm run simulacion): lee una vez los datos públicos reales, sin sesión,
// y desde ahí todo queda en memoria. Sin token, Supabase no deja escribir nada: la base real no se toca.
// Mientras la base real no tenga Fútbol 7, le suma el de Gaby (datos/futbol7-equipos.csv) con una fecha de prueba.
import { readFileSync } from 'node:fs';
import { armarFutbol7, leerCsv, sumarFutbol7Simulado } from '../scripts/futbol7.js';
import { crearApp } from './app.js';
import { leerEntorno } from './entorno.js';
import { crearRepositorioSupabase } from './repositorio.js';
import { crearRepositorioMemoria } from './repositorioMemoria.js';

const baseReal = crearRepositorioSupabase(leerEntorno());
const futbol7 = armarFutbol7({
  equipos: leerCsv(readFileSync(new URL('../datos/futbol7-equipos.csv', import.meta.url), 'utf8')),
});

export const app = crearApp({
  crearRepositorio: crearRepositorioMemoria(async () => sumarFutbol7Simulado(await baseReal(null).leerPublico(), futbol7)),
});
