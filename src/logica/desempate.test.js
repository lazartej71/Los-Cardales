import { describe, expect, it } from 'vitest';
import { CRITERIOS_POR_DEFECTO } from '../datos/constantes.js';
import { fraseDesempate } from './desempate.js';

describe('fraseDesempate', () => {
  it('con los criterios por defecto', () => {
    expect(fraseDesempate(CRITERIOS_POR_DEFECTO)).toBe(
      'Si dos equipos empatan en puntos, se ordenan por diferencia de gol, después por goles a favor y después por el resultado entre ellos.'
    );
  });

  it('sigue el orden que eligió el organizador', () => {
    expect(fraseDesempate(['puntos', 'enfrentamiento', 'dg'])).toBe(
      'Si dos equipos empatan en puntos, se ordenan por el resultado entre ellos y después por diferencia de gol.'
    );
    expect(fraseDesempate(['puntos', 'gf'])).toBe('Si dos equipos empatan en puntos, se ordenan por goles a favor.');
  });

  it('con un solo criterio no hay frase', () => {
    expect(fraseDesempate(['puntos'])).toBeNull();
    expect(fraseDesempate(['puntos', 'inventado'])).toBeNull();
  });
});
