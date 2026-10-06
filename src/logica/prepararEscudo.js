/**
 * Prepara en el navegador la imagen grande de un escudo: recorta los bordes vacíos, la achica a 128 px
 * y la pasa a WebP (o a PNG en Safari, que no genera WebP). Devuelve la imagen lista para subir.
 * Usa canvas: se prueba en la simulación con Chrome, no en las pruebas automáticas.
 */

import { PESO_MAXIMO_ESCUDO, medidaFinal, recorteDeContenido } from './escudos.js';

const TIPOS = ['image/png', 'image/jpeg', 'image/webp'];
const PESO_MAXIMO_ORIGINAL = 15 * 1024 * 1024;
// Para encontrar los bordes vacíos alcanza con una copia de hasta 1024 px
const LADO_PARA_RECORTAR = 1024;

function lienzo(ancho, alto) {
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  return canvas;
}

const aBlob = (canvas, tipo) => new Promise((resolver) => canvas.toBlob(resolver, tipo, 0.9));

const aDataUrl = (blob) =>
  new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(lector.result);
    lector.onerror = () => rechazar(lector.error);
    lector.readAsDataURL(blob);
  });

/**
 * @param {File} archivo la imagen que eligió el superadmin
 * @returns {Promise<{ imagen: string, pesoOriginal: number, peso: number }>} imagen: data:image/webp;base64,...
 */
export async function prepararEscudo(archivo) {
  if (archivo.type && !TIPOS.includes(archivo.type)) throw new Error('Elegí una imagen PNG, JPG o WebP.');
  if (archivo.size > PESO_MAXIMO_ORIGINAL) throw new Error('La imagen pesa más de 15 MB. Probá con una más chica.');
  let original;
  try {
    original = await createImageBitmap(archivo);
  } catch {
    throw new Error('No pude abrir esa imagen. Probá con un PNG o un JPG.');
  }

  // 1. En una copia chica, dónde está el contenido (sin los bordes vacíos)
  const escala = Math.min(1, LADO_PARA_RECORTAR / Math.max(original.width, original.height));
  const copia = lienzo(Math.max(1, Math.round(original.width * escala)), Math.max(1, Math.round(original.height * escala)));
  const contextoCopia = copia.getContext('2d', { willReadFrequently: true });
  contextoCopia.drawImage(original, 0, 0, copia.width, copia.height);
  const recorte = recorteDeContenido(contextoCopia.getImageData(0, 0, copia.width, copia.height));

  // 2. Ese recorte, desde la imagen original (mejor calidad), con el lado más largo de 128 px
  const desde = { x: recorte.x / escala, y: recorte.y / escala, ancho: recorte.ancho / escala, alto: recorte.alto / escala };
  const medida = medidaFinal(desde.ancho, desde.alto);
  const final = lienzo(medida.ancho, medida.alto);
  const contexto = final.getContext('2d');
  contexto.imageSmoothingQuality = 'high';
  contexto.drawImage(original, desde.x, desde.y, desde.ancho, desde.alto, 0, 0, medida.ancho, medida.alto);
  original.close?.();

  // 3. WebP; si el navegador no lo sabe generar (Safari), devuelve otra cosa y se usa PNG
  let blob = await aBlob(final, 'image/webp');
  if (!blob || blob.type !== 'image/webp') blob = await aBlob(final, 'image/png');
  if (!blob) throw new Error('No pude abrir esa imagen. Probá con un PNG o un JPG.');
  if (blob.size > PESO_MAXIMO_ESCUDO) throw new Error('El escudo quedó muy pesado. Probá con otra imagen.');
  return { imagen: await aDataUrl(blob), pesoOriginal: archivo.size, peso: blob.size };
}
