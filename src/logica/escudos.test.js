import { describe, expect, it } from 'vitest';
import { equiposDePartidos, formatearPeso, hayEscudos, iniciales, medidaFinal, recorteDeContenido } from './escudos.js';

// Imagen de prueba (como ImageData): ancho × alto píxeles de `fondo`, con un rectángulo de `tinta`
function imagen(ancho, alto, fondo, tinta, { x, y, w, h }) {
  const data = new Uint8ClampedArray(ancho * alto * 4);
  for (let fila = 0; fila < alto; fila++) {
    for (let col = 0; col < ancho; col++) {
      const dentro = col >= x && col < x + w && fila >= y && fila < y + h;
      data.set(dentro ? tinta : fondo, (fila * ancho + col) * 4);
    }
  }
  return { data, width: ancho, height: alto };
}
const TRANSPARENTE = [0, 0, 0, 0];
const BLANCO = [255, 255, 255, 255];
const ROJO = [200, 16, 46, 255];

describe('iniciales', () => {
  it('toma la primera letra de hasta dos palabras de 3 o más letras', () => {
    expect(iniciales('BARRIO POLICIAL')).toBe('BP');
    expect(iniciales('ALEX F.C')).toBe('A');
    expect(iniciales('SAN RAMON BRS')).toBe('SR');
    expect(iniciales('4 DE JUNIO')).toBe('J');
    expect(iniciales('Libre A2')).toBe('L');
  });

  it('si no hay palabras así, usa las dos primeras letras', () => {
    expect(iniciales('F.C')).toBe('FC');
    expect(iniciales('')).toBe('');
    expect(iniciales(undefined)).toBe('');
  });
});

describe('listas con escudos', () => {
  const conEscudo = { id: 1, nombre: 'BRANCA', escudo: 'https://x/e.webp' };
  const sinEscudo = { id: 2, nombre: 'ALEX F.C', escudo: null };

  it('hay escudos si al menos un equipo de la lista tiene', () => {
    expect(hayEscudos([sinEscudo, conEscudo])).toBe(true);
    expect(hayEscudos([sinEscudo, { id: 3, nombre: 'X' }, undefined, null])).toBe(false);
    expect(hayEscudos([])).toBe(false);
  });

  it('junta los dos equipos de cada partido', () => {
    const porId = new Map([
      [1, conEscudo],
      [2, sinEscudo],
    ]);
    expect(equiposDePartidos([{ localId: 1, visitanteId: 2 }], (id) => porId.get(id))).toEqual([conEscudo, sinEscudo]);
  });
});

describe('preparar la imagen', () => {
  it('con transparencia, recorta lo transparente y deja lo blanco del escudo', () => {
    // Un escudo con aro blanco sobre fondo transparente: el aro no se recorta
    const img = imagen(10, 8, TRANSPARENTE, BLANCO, { x: 2, y: 1, w: 5, h: 4 });
    img.data.set(ROJO, (2 * 10 + 3) * 4);
    expect(recorteDeContenido(img)).toEqual({ x: 2, y: 1, ancho: 5, alto: 4 });
  });

  it('sin transparencia (un JPG), recorta el fondo casi blanco', () => {
    const img = imagen(10, 8, [250, 250, 250, 255], ROJO, { x: 3, y: 2, w: 4, h: 3 });
    expect(recorteDeContenido(img)).toEqual({ x: 3, y: 2, ancho: 4, alto: 3 });
  });

  it('si no queda nada, deja la imagen entera', () => {
    expect(recorteDeContenido(imagen(6, 4, TRANSPARENTE, TRANSPARENTE, { x: 0, y: 0, w: 0, h: 0 }))).toEqual({
      x: 0,
      y: 0,
      ancho: 6,
      alto: 4,
    });
    expect(recorteDeContenido(imagen(6, 4, BLANCO, BLANCO, { x: 0, y: 0, w: 0, h: 0 }))).toEqual({
      x: 0,
      y: 0,
      ancho: 6,
      alto: 4,
    });
  });

  it('achica el lado más largo a 128 px sin deformar ni agrandar', () => {
    expect(medidaFinal(2000, 1500)).toEqual({ ancho: 128, alto: 96 });
    expect(medidaFinal(900, 1800)).toEqual({ ancho: 64, alto: 128 });
    expect(medidaFinal(80, 60)).toEqual({ ancho: 80, alto: 60 });
  });

  it('muestra el peso en KB o en MB', () => {
    expect(formatearPeso(9 * 1024)).toBe('9 KB');
    expect(formatearPeso(300)).toBe('1 KB');
    expect(formatearPeso(2.4 * 1024 * 1024)).toBe('2,4 MB');
  });
});
