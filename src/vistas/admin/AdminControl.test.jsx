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
  // Hoy es 2026-10-03 (sábado): el viernes no hubo visitas y la primera fue el lunes 28
  const visitasIniciales = [
    { dia: '2026-10-03', personas: 40 },
    { dia: '2026-10-01', personas: 12 },
    { dia: '2026-09-28', personas: 5 },
  ];
  const html = renderToString(
    <AdminControl db={db} acciones={acciones} inicial={inicial} visitasIniciales={visitasIniciales} hoy="2026-10-03" />
  );

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

  it('muestra cuántas personas entraron hoy, ayer, en la semana y en total', () => {
    const cifras = [...html.matchAll(/class="visitas__cifra">(?:<!-- -->)?(\d+)/g)].map((m) => Number(m[1]));
    expect(cifras).toEqual([40, 0, 57, 57]);
    expect(html).toContain('Personas que entraron a la página');
  });

  it('dibuja una barra por cada uno de los últimos 7 días, con 0 en los días sin visitas', () => {
    expect([...html.matchAll(/class="visitas__barra"/g)]).toHaveLength(7);
    expect(html).toContain('sáb 3: 40 personas');
    expect(html).toContain('vie 2: 0 personas');
    expect(html).toContain('dom 27: 0 personas');
  });

  it('el detalle de las visitas sigue estando en Vercel', () => {
    expect(html).toContain('href="https://vercel.com/van-wqs-projects/los-cardales/analytics"');
  });

  it('avisa si en el día no hubo actividad', () => {
    expect(renderToString(<AdminControl db={db} acciones={acciones} inicial={[]} />)).toContain(
      'Ese día no hubo cambios.'
    );
  });
});
