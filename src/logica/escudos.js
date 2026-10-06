/**
 * Escudos de los equipos: las iniciales de los que no tienen, si una lista tiene escudos, y las cuentas
 * para preparar la imagen (recorte de los bordes vacíos, medida final y peso). Sin navegador.
 */

// Lo máximo que pesa un escudo ya preparado (lo controlan el navegador, la API y el bucket)
export const PESO_MAXIMO_ESCUDO = 100 * 1024;
// El lado más largo de la imagen final (con un poco de sobra para pantallas de alta densidad)
export const LADO_ESCUDO = 128;

const soloLetras = (texto) => texto.replace(/[^\p{L}\p{N}]/gu, '');

// Primera letra de hasta dos palabras de 3 o más letras: "BARRIO POLICIAL" → "BP", "ALEX F.C" → "A".
// Si no hay ninguna, las dos primeras letras del nombre.
export function iniciales(nombre) {
  const texto = String(nombre ?? '').toUpperCase();
  const palabras = texto.split(/\s+/).map(soloLetras).filter((p) => p.length >= 3);
  if (palabras.length) return palabras.slice(0, 2).map((p) => p[0]).join('');
  return soloLetras(texto).slice(0, 2);
}

// Si algún equipo de la lista tiene escudo. Si ninguno tiene, la lista se ve como siempre (sin iniciales).
export const hayEscudos = (equipos) => equipos.some((e) => Boolean(e?.escudo));

// Los dos equipos de cada partido, con equipoDe(id) → equipo
export const equiposDePartidos = (partidos, equipoDe) =>
  partidos.flatMap((p) => [equipoDe(p.localId), equipoDe(p.visitanteId)]);

// Si la imagen tiene algún píxel transparente. Si no tiene, el logo trae fondo propio (un JPG, o un PNG
// con fondo blanco). Recibe un ImageData (RGBA).
export function tieneTransparencia({ data }) {
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 16) return true;
  }
  return false;
}

// El rectángulo con contenido, sin las filas y columnas de los bordes que no tienen nada. Si la imagen
// tiene transparencia, "nada" es lo transparente (así no se come el aro blanco de un escudo); si no
// (un JPG), es lo casi blanco. Si no queda nada, la imagen entera. Recibe un ImageData (RGBA).
export function recorteDeContenido({ data, width, height }) {
  const vacio = tieneTransparencia({ data })
    ? (i) => data[i + 3] < 16
    : (i) => data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240;
  let [arriba, abajo, izquierda, derecha] = [height, -1, width, -1];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (vacio((y * width + x) * 4)) continue;
      arriba = Math.min(arriba, y);
      abajo = Math.max(abajo, y);
      izquierda = Math.min(izquierda, x);
      derecha = Math.max(derecha, x);
    }
  }
  if (abajo < 0) return { x: 0, y: 0, ancho: width, alto: height };
  return { x: izquierda, y: arriba, ancho: derecha - izquierda + 1, alto: abajo - arriba + 1 };
}

// Medida de la imagen final: el lado más largo mide `lado` px, sin deformar. Si es más chica, no se agranda.
export function medidaFinal(ancho, alto, lado = LADO_ESCUDO) {
  const escala = Math.min(1, lado / Math.max(ancho, alto));
  return { ancho: Math.max(1, Math.round(ancho * escala)), alto: Math.max(1, Math.round(alto * escala)) };
}

// Un logo con fondo propio va dentro de un círculo blanco del tamaño del escudo, así no queda un cuadrado.
// Dónde dibujarlo en el cuadrado de `lado` px para que entre entero: su diagonal mide lo que el círculo.
export function enCirculo(ancho, alto, lado = LADO_ESCUDO) {
  const escala = lado / Math.hypot(ancho, alto);
  const [w, h] = [ancho * escala, alto * escala];
  return { ancho: w, alto: h, x: (lado - w) / 2, y: (lado - h) / 2 };
}

// "9 KB", "2,4 MB"
export function formatearPeso(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
