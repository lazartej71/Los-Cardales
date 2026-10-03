import { describe, expect, it } from 'vitest';
import { debeContarVisitas } from './analiticas.js';

describe('visitas (Vercel Web Analytics)', () => {
  it('se cuentan solo en el sitio publicado, nunca en la simulación ni en desarrollo', () => {
    expect(debeContarVisitas({ produccion: true, simulacion: false })).toBe(true);
    expect(debeContarVisitas({ produccion: true, simulacion: true })).toBe(false);
    expect(debeContarVisitas({ produccion: false, simulacion: false })).toBe(false);
  });
});
