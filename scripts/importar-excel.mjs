// Uso: npm run importar
// Lee Excel/TABLAS GP FECHA N1.xlsx y genera supabase/datos-iniciales.sql
import ExcelJS from 'exceljs';
import { writeFileSync } from 'node:fs';
import { armarDatos, generarSql } from './importacion.js';

const ARCHIVO = 'Excel/TABLAS GP FECHA N1.xlsx';
const DESTINO = 'supabase/datos-iniciales.sql';

// Valor "plano" de una celda: resultado de fórmula o texto con formato
function valorDe(celda) {
  const v = celda.value;
  if (v && typeof v === 'object') {
    if ('result' in v) return v.result;
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join('');
    if ('text' in v) return v.text;
  }
  return v;
}

const libro = new ExcelJS.Workbook();
await libro.xlsx.readFile(ARCHIVO);
const hojas = {};
for (const hoja of libro.worksheets) {
  const filas = [];
  hoja.eachRow({ includeEmpty: false }, (fila) => {
    filas.push(Array.from({ length: 8 }, (_, i) => valorDe(fila.getCell(i + 1))));
  });
  hojas[hoja.name] = filas;
}

const datos = armarDatos(hojas);
writeFileSync(DESTINO, generarSql(datos, { nombreCampeonato: 'Copa GP' }));

// Resumen para revisar a ojo contra el Excel
for (const categoria of datos.categorias) {
  const zonas = datos.zonas.filter((z) => z.categoriaId === categoria.id);
  const detalle = zonas.map((z) => `${z.nombre}: ${datos.equipos.filter((e) => e.zonaId === z.id).length}`);
  console.log(`${categoria.nombre.padEnd(6)} ${detalle.join(' | ')}`);
}
console.log(`Total: ${datos.equipos.length} equipos y ${datos.partidos.length} partidos postergados → ${DESTINO}`);
