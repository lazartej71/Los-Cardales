import { describe, expect, it } from 'vitest';
import { crearDatosEjemplo } from '../datos/datosEjemplo.js';
import { detalleExpulsion } from './consultas.js';
import { estadoExpulsion, linkWhatsApp, mensajeExpulsion, nombreRoja } from './expulsiones.js';
import { validarCamiseta, validarGoles } from './validaciones.js';

describe('estadoExpulsion', () => {
  it('sin fechas definidas queda pendiente de tribunal', () => {
    expect(estadoExpulsion({ fechasSuspension: null, fechasCumplidas: 0 }).texto).toBe('Pendiente de tribunal');
  });

  it('muestra las fechas que le quedan', () => {
    expect(estadoExpulsion({ fechasSuspension: 3, fechasCumplidas: 1 }).texto).toBe('Suspendido (quedan 2 fechas)');
    expect(estadoExpulsion({ fechasSuspension: 2, fechasCumplidas: 1 }).texto).toBe('Suspendido (queda 1 fecha)');
  });

  it('queda habilitado al cumplir la suspensión', () => {
    expect(estadoExpulsion({ fechasSuspension: 1, fechasCumplidas: 1 }).tipo).toBe('habilitado');
    expect(estadoExpulsion({ fechasSuspension: 0, fechasCumplidas: 0 }).tipo).toBe('habilitado');
  });
});

describe('aviso por WhatsApp', () => {
  // Expulsión del N° 5 de Libre A2 en la fecha 1 (Libre A1 vs Libre A2)
  const armar = (cambiosExpulsion = {}, delegado = 'Juan') => {
    const db = crearDatosEjemplo();
    const expulsion = { ...db.expulsiones[0], ...cambiosExpulsion };
    const detalle = detalleExpulsion(db, expulsion);
    return mensajeExpulsion(expulsion, { ...detalle, equipo: { ...detalle.equipo, delegado } });
  };

  it('arma el aviso con el jugador, la sanción y la firma del campeonato', () => {
    expect(armar({ nombreJugador: 'Martín Gómez', fechasSuspension: 2 })).toBe(
      [
        '🟥 *LOS CARDALES FÚTBOL · Expulsión*',
        '',
        'Hola Juan, te informamos que en la fecha 1 (Libre · Libre A1 vs Libre A2) fue expulsado un jugador de *Libre A2*:',
        '',
        '👕 N° 5 · Martín Gómez',
        '⛔ Suspensión: *2 fechas*',
        '',
        'No puede jugar hasta cumplir la sanción. Cualquier consulta, respondé este mensaje.',
        '',
        '_Mensaje automático de Los Cardales Fútbol_',
      ].join('\n')
    );
  });

  it('dice si fue por doble amarilla o roja directa (las viejas, sin tipo, no lo dicen)', () => {
    expect(armar({ tipo: 'directa', fechasSuspension: 2 })).toContain('👕 N° 5 · Lucas Benítez\n🟥 Por *roja directa*\n⛔');
    expect(armar({ tipo: 'doble_amarilla', fechasSuspension: 2 })).toContain('\n🟨🟨 Por *doble amarilla*\n');
    expect(armar({ tipo: null, fechasSuspension: 2 })).not.toContain('Por *');
  });

  it('nombre de cada tipo de roja', () => {
    expect([nombreRoja('doble_amarilla'), nombreRoja('directa'), nombreRoja(null)]).toEqual([
      'Doble amarilla',
      'Roja directa',
      'Roja',
    ]);
  });

  it('sin nombre del jugador ni del delegado', () => {
    const mensaje = armar({ nombreJugador: '', fechasSuspension: 1 }, '');
    expect(mensaje).toContain('Hola, te informamos que');
    expect(mensaje).toContain('\n👕 N° 5\n');
    expect(mensaje).toContain('⛔ Suspensión: *1 fecha*');
  });

  it('con la sanción sin definir avisa que la decide el tribunal', () => {
    const mensaje = armar({ fechasSuspension: null });
    expect(mensaje).toContain('⏳ Suspensión: *a definir por el tribunal*. Te avisamos cuando haya resolución.');
    expect(mensaje).not.toContain('No puede jugar hasta cumplir');
  });

  it('sin fechas de suspensión puede jugar la próxima', () => {
    const mensaje = armar({ fechasSuspension: 0 });
    expect(mensaje).toContain('✅ Sin fechas de suspensión: puede jugar la próxima fecha.');
    expect(mensaje).not.toContain('No puede jugar hasta cumplir');
  });

  it('limpia el teléfono y codifica el texto en el link', () => {
    expect(linkWhatsApp('+54 9 11 5100-1234', 'N° 5 (A vs B).')).toBe(
      'https://wa.me/5491151001234?text=N%C2%B0%205%20(A%20vs%20B).'
    );
  });
});

describe('validaciones', () => {
  it('goles: enteros de 0 a 99', () => {
    expect(validarGoles('0')).toBe(0);
    expect(validarGoles('12')).toBe(12);
    ['', '-1', '1.5', 'a', '100'].forEach((valor) => expect(validarGoles(valor)).toBeNull());
  });

  it('camiseta: obligatoria, de 1 a 99', () => {
    expect(validarCamiseta('10')).toBe(10);
    ['', '0', '100', 'x'].forEach((valor) => expect(validarCamiseta(valor)).toBeNull());
  });
});
