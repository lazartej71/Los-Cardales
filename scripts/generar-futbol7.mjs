/**
 * Genera supabase/migracion-10b-futbol7-datos.sql con los datos de Fútbol 7 que pasó Gaby:
 *   datos/futbol7-equipos.csv   categoria,zona,equipo,baja
 *   datos/futbol7-partidos.csv  categoria,fecha,local,visitante,goles_local,goles_visitante,ausente,postergado,predio,cancha,hora
 *                               (opcional; la cancha como la nombra Gaby: 1, 2 o 3)
 * Uso: node scripts/generar-futbol7.mjs [--cobrado-el AAAA-MM-DD]   (por defecto, hoy en Argentina)
 * Si los datos tienen errores, los muestra y no escribe nada.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { hoyEnArgentina } from '../src/logica/cuentas.js';
import { armarFutbol7, leerCsv, sqlFutbol7 } from './futbol7.js';

const ruta = (relativa) => new URL(`../${relativa}`, import.meta.url);
const leer = (relativa) => leerCsv(readFileSync(ruta(relativa), 'utf8'));

const indice = process.argv.indexOf('--cobrado-el');
const cobradoEl = indice > 0 ? process.argv[indice + 1] : hoyEnArgentina();
if (!/^\d{4}-\d{2}-\d{2}$/.test(cobradoEl ?? '')) {
  console.error('La fecha de --cobrado-el tiene que ser AAAA-MM-DD.');
  process.exit(1);
}

const armado = armarFutbol7({
  equipos: leer('datos/futbol7-equipos.csv'),
  partidos: existsSync(ruta('datos/futbol7-partidos.csv')) ? leer('datos/futbol7-partidos.csv') : [],
});

if (armado.errores.length) {
  console.error(`Los datos tienen ${armado.errores.length} errores; no se generó nada:`);
  for (const error of armado.errores) console.error(`  - ${error}`);
  process.exit(1);
}

const destino = 'supabase/migracion-10b-futbol7-datos.sql';
writeFileSync(ruta(destino), sqlFutbol7(armado, { cobradoEl }));

console.log(`Listo: ${destino} (pagos de lo jugado con fecha ${cobradoEl}).\n`);
for (const zona of armado.zonas) {
  const categoria = armado.categorias.find((c) => c.id === zona.categoriaId).nombre;
  const deZona = armado.equipos.filter((e) => e.categoria === categoria && e.zona === zona.nombre);
  const bajas = deZona.filter((e) => e.baja).map((e) => e.nombre);
  console.log(`${categoria} · ${zona.nombre}: ${deZona.length} equipos${bajas.length ? ` (de baja: ${bajas.join(', ')})` : ''}`);
}
const fechas = [...new Set(armado.partidos.map((p) => `${p.categoria}|${p.fecha}`))];
if (fechas.length) console.log('');
for (const clave of fechas) {
  const [categoria, fecha] = clave.split('|');
  const lista = armado.partidos.filter((p) => p.categoria === categoria && String(p.fecha) === fecha);
  const jugados = lista.filter((p) => p.golesLocal !== null).length;
  const postergados = lista.filter((p) => p.postergado).length;
  console.log(
    `${categoria} · fecha ${fecha}: ${jugados} jugados, ${lista.length - jugados - postergados} pendientes, ${postergados} postergados`
  );
}
