import { describe, expect, it, vi } from 'vitest';
import { confirmarDescarte, crearRegistroSinGuardar } from './sinGuardar.js';

describe('resultados sin guardar', () => {
  it('sin nada pendiente no pregunta', () => {
    const confirmar = vi.fn(() => false);
    expect(confirmarDescarte(crearRegistroSinGuardar(), confirmar)).toBe(true);
    expect(confirmarDescarte(null, confirmar)).toBe(true);
    expect(confirmar).not.toHaveBeenCalled();
  });

  it('con un resultado sin guardar pregunta; si no lo descarta, sigue pendiente', () => {
    const registro = crearRegistroSinGuardar();
    registro.marcar(7, true);
    const confirmar = vi.fn(() => false);
    expect(confirmarDescarte(registro, confirmar)).toBe(false);
    expect(confirmar).toHaveBeenCalledWith('¿Descartar el resultado sin guardar?');
    expect(registro.hay()).toBe(true);
  });

  it('si lo descarta, queda limpio', () => {
    const registro = crearRegistroSinGuardar();
    registro.marcar(7, true);
    registro.marcar(8, true);
    registro.marcar(8, false);
    expect(confirmarDescarte(registro, () => true)).toBe(true);
    expect(registro.hay()).toBe(false);
  });
});
