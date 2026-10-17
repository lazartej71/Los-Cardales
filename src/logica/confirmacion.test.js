import { describe, expect, it } from 'vitest';
import { conFutbol7 } from '../datos/datosEjemploFutbol7.js';
import { resumenConfirmacion } from './confirmacion.js';

describe('resumen de la hoja de confirmación', () => {
  const db = conFutbol7();
  const deF7 = db.partidos.find((p) => p.id === 201);

  it('un resultado de Fútbol 7, con la modalidad, la categoría, la zona, la fecha y la cancha', () => {
    expect(resumenConfirmacion(db, deF7, { golesLocal: 2, golesVisitante: 1 })).toEqual({
      modalidad: 'FÚTBOL 7',
      categoria: 'Libre',
      zonas: 'Zona A',
      fecha: 'Fecha 1',
      lugar: 'Los Cardales · Cancha 1 · 15:30',
      marcador: 'F7 A1 2 – 1 F7 A2',
    });
  });

  it('un W.O. de Fútbol 11, sin lugar cargado', () => {
    expect(resumenConfirmacion(db, db.partidos[0], { ausente: 'visitante' })).toEqual({
      modalidad: 'FÚTBOL 11',
      categoria: 'Libre',
      zonas: 'Zona A',
      fecha: 'Fecha 1',
      lugar: '',
      marcador: 'No se presentó Libre A2: Libre A1 gana 3 a 0.',
    });
  });

  it('un cruce entre zonas dice las dos', () => {
    expect(resumenConfirmacion(db, { ...deF7, visitanteId: 105 }, { golesLocal: 0, golesVisitante: 0 }).zonas).toBe(
      'Zona A vs Zona B'
    );
  });
});
