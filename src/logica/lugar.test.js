import { describe, expect, it } from 'vitest';
import { canchasDe, normalizarHora, textoLugar, textoLugarCorto, validarLugar } from './lugar.js';

describe('lugar del partido', () => {
  it('cada predio tiene sus canchas', () => {
    expect(canchasDe('los_cardales')).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(canchasDe('cura_borges')).toEqual([1, 4, 5, 7, 8, 9]);
    expect(canchasDe('otro')).toEqual([]);
  });

  it('normaliza la hora', () => {
    expect(normalizarHora('13:40')).toBe('13:40');
    expect(normalizarHora(' 9:05 ')).toBe('09:05');
    expect(normalizarHora('13:40:00')).toBe('13:40');
    for (const mala of ['24:00', '13:60', '1340', '', null, 'hola']) expect(normalizarHora(mala)).toBeNull();
  });

  it('acepta un lugar válido', () => {
    expect(validarLugar({ predio: 'cura_borges', cancha: 9, hora: '15:10' })).toEqual({
      valor: { predio: 'cura_borges', cancha: 9, hora: '15:10' },
    });
  });

  it('explica qué falta o está mal', () => {
    expect(validarLugar({ cancha: 2, hora: '13:40' }).error).toBe('Elegí el predio.');
    expect(validarLugar({ predio: 'los_cardales', cancha: 9, hora: '13:40' }).error).toBe(
      'Elegí una cancha de Los Cardales.'
    );
    expect(validarLugar({ predio: 'los_cardales', cancha: 2, hora: '25:00' }).error).toBe('Escribí la hora como 13:40.');
    expect(validarLugar(null).error).toBe('Elegí el predio.');
  });

  it('arma el texto para mostrar', () => {
    const partido = { predio: 'los_cardales', cancha: 2, hora: '13:40' };
    expect(textoLugar(partido)).toBe('Los Cardales · Cancha 2 · 13:40');
    expect(textoLugarCorto(partido)).toBe('Los Cardales · C2 · 13:40');
    expect(textoLugar({ predio: null })).toBe('');
  });
});
