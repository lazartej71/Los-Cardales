import { describe, expect, it } from 'vitest';
import {
  canchasDe,
  nombreCancha,
  normalizarHora,
  numeroVisible,
  textoDia,
  textoLugar,
  textoLugarCorto,
  validarLugar,
} from './lugar.js';

describe('lugar del partido', () => {
  it('cada predio tiene sus canchas', () => {
    expect(canchasDe('los_cardales')).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(canchasDe('cura_borges')).toEqual([1, 4, 5, 6, 7, 8, 9]);
    expect(canchasDe('otro')).toEqual([]);
  });

  it('Fútbol 7 tiene sus canchas: en la base, de la 21 en adelante', () => {
    expect(canchasDe('los_cardales', 'f7')).toEqual([21, 22]);
    expect(canchasDe('cura_borges', 'f7')).toEqual([21, 22, 23]);
    expect(canchasDe('cura_borges', 'f11')).toEqual([1, 4, 5, 6, 7, 8, 9]);
    expect(numeroVisible(23)).toBe(3);
    expect(numeroVisible(4)).toBe(4);
    expect(nombreCancha(21)).toBe('Cancha 1');
    expect(nombreCancha(9)).toBe('Cancha 9');
  });

  it('el lugar tiene que ser una cancha de la modalidad del partido', () => {
    const lugar = (cancha) => ({ predio: 'los_cardales', cancha, hora: '15:30' });
    expect(validarLugar(lugar(21), 'f7')).toEqual({ valor: { predio: 'los_cardales', cancha: 21, hora: '15:30' } });
    expect(validarLugar(lugar(21))).toEqual({ error: 'Elegí una cancha de Los Cardales.' });
    expect(validarLugar(lugar(1), 'f7')).toEqual({ error: 'Elegí una cancha de Fútbol 7 de Los Cardales.' });
  });

  it('una cancha de Fútbol 7 se ve con su número, no con el de la base', () => {
    const partido = { predio: 'cura_borges', cancha: 23, hora: '16:30', dia: null };
    expect(textoLugar(partido)).toBe('Cura Borges · Cancha 3 · 16:30');
    expect(textoLugarCorto(partido)).toBe('Cura Borges · C3 · 16:30');
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

  it('un postergado reprogramado suma el día', () => {
    const partido = { predio: 'los_cardales', cancha: 2, hora: '13:40', dia: '2026-10-12' };
    expect(textoLugar(partido)).toBe('Lunes 12/10 · Los Cardales · Cancha 2 · 13:40');
    expect(textoLugarCorto(partido)).toBe('Lunes 12/10 · Los Cardales · C2 · 13:40');
  });

  it('nombra el día como en el calendario', () => {
    expect(textoDia('2026-10-12')).toBe('Lunes 12/10');
    expect(textoDia('2026-10-13')).toBe('Martes 13/10');
    expect(textoDia('2026-11-01')).toBe('Domingo 01/11');
    expect(textoDia(null)).toBe('');
  });
});
