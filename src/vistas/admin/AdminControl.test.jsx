import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { crearDatosEjemplo } from '../../datos/datosEjemplo.js';
import { AdminControl } from './AdminControl.jsx';

const acciones = new Proxy({}, { get: () => async () => [] });

describe('pestaña Control', () => {
  const db = crearDatosEjemplo();
  const partido = db.partidos[0]; // Libre A1 vs Libre A2, fecha 1
  const inicial = [
    { id: 2, creadoEn: '2026-10-03T18:42:00Z', quien: 'Franco', accion: 'cambio', tabla: 'partidos', fila: { ...partido, golesLocal: 3 }, cambios: ['goles_local'] },
    { id: 1, creadoEn: '2026-10-03T18:40:00Z', quien: 'Jorge', accion: 'alta', tabla: 'tarjetas', fila: { partidoId: partido.id, equipoId: partido.localId, numeroCamiseta: 7 }, cambios: null },
  ];
  const html = renderToString(<AdminControl db={db} acciones={acciones} inicial={inicial} />);

  it('resume lo que cargó cada persona en el día', () => {
    expect(html).toContain('Resumen del día');
    expect(html).toMatch(/Franco/);
    expect(html).toMatch(/1 resultado/);
    expect(html).toMatch(/1 tarjeta/);
  });

  it('lista la actividad con la hora de Argentina, quién y qué hizo', () => {
    expect(html).toContain('15:42');
    expect(html).toContain('Cargó el resultado de Libre A1 vs Libre A2 (Libre, fecha 1)');
    expect(html).toContain('Cargó la amarilla del N° 7 de Libre A1');
  });

  it('tiene el acceso a las visitas en Vercel', () => {
    expect(html).toContain('href="https://vercel.com/van-wqs-projects/los-cardales/analytics"');
    expect(html).toContain('Ver visitas en Vercel');
  });

  it('avisa si en el día no hubo actividad', () => {
    expect(renderToString(<AdminControl db={db} acciones={acciones} inicial={[]} />)).toContain(
      'Ese día no hubo cambios.'
    );
  });
});
