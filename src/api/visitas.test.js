import { describe, expect, it, vi } from 'vitest';
import { avisarVisita } from './visitas.js';

// Almacén del navegador falso (como localStorage)
const almacen = (inicial = {}) => {
  const datos = { ...inicial };
  return { getItem: (k) => datos[k] ?? null, setItem: (k, v) => (datos[k] = v), datos };
};

describe('aviso de visita', () => {
  it('la primera vez del día avisa y recuerda que ya avisó', async () => {
    const guardado = almacen();
    const enviar = vi.fn(async () => {});
    await avisarVisita({ almacen: guardado, hoy: '2026-10-03', enviar });
    await avisarVisita({ almacen: guardado, hoy: '2026-10-03', enviar });
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(guardado.datos['lc-visita']).toBe('2026-10-03');
  });

  it('al día siguiente vuelve a contar', async () => {
    const enviar = vi.fn(async () => {});
    await avisarVisita({ almacen: almacen({ 'lc-visita': '2026-10-02' }), hoy: '2026-10-03', enviar });
    expect(enviar).toHaveBeenCalledTimes(1);
  });

  it('si el aviso falla, lo intenta la próxima vez que entre', async () => {
    const guardado = almacen();
    await avisarVisita({ almacen: guardado, hoy: '2026-10-03', enviar: async () => Promise.reject(new Error('sin red')) });
    expect(guardado.datos['lc-visita']).toBeUndefined();
  });

  it('si el navegador no deja guardar, no rompe la página', async () => {
    const bloqueado = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
    await expect(avisarVisita({ almacen: bloqueado, hoy: '2026-10-03', enviar: async () => {} })).resolves.toBeUndefined();
  });
});
