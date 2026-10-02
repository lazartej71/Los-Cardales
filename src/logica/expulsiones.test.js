import { describe, expect, it } from 'vitest';
import { crearDatosEjemplo } from '../datos/datosEjemplo.js';
import { detalleExpulsion } from './consultas.js';
import { estadoExpulsion, linkWhatsApp, mensajeExpulsion } from './expulsiones.js';
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
  it('arma el mensaje con equipo, número, fecha y partido', () => {
    const db = crearDatosEjemplo();
    const expulsion = db.expulsiones[0];
    expect(mensajeExpulsion(expulsion, detalleExpulsion(db, expulsion))).toBe(
      'Aviso del Campeonato: del equipo Libre A2 fue expulsado el jugador N° 5 en la fecha 1 (Libre A1 vs Libre A2).'
    );
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
