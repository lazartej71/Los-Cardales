import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { crearDatosEjemplo } from '../../datos/datosEjemplo.js';
import { CargaPorCancha } from './CargaPorCancha.jsx';

const acciones = new Proxy({}, { get: () => async () => true });

// La fecha 3 está en juego; Libre A1 vs Libre A4 se juega en la cancha 2 de Los Cardales a las 13:40
function armarDb() {
  const db = crearDatosEjemplo();
  const libreA1 = db.equipos.find((e) => e.nombre === 'Libre A1').id;
  db.partidos = db.partidos.map((p) =>
    p.fecha === 3 && p.localId === libreA1 ? { ...p, predio: 'los_cardales', cancha: 2, hora: '13:40' } : p
  );
  return db;
}
const partidoDeCancha = (db) => db.partidos.find((p) => p.fecha === 3 && p.cancha === 2);

const dibujar = (props = {}, db = armarDb()) =>
  renderToString(<CargaPorCancha db={db} acciones={acciones} almacen={null} encabezado="Cargar resultados" {...props} />);

describe('carga por predio y cancha', () => {
  it('lleva el encabezado de quien la usa, con la fecha en juego', () => {
    const html = dibujar();
    expect(html).toContain('>Cargar resultados · Fecha 3</h2>');
    expect(html).toContain('Elegí el predio');
  });

  it('con soloResultado, al abrir un partido muestra solo el resultado y el W.O.', () => {
    const db = armarDb();
    const html = dibujar({ soloResultado: true, inicial: { predio: 'los_cardales', cancha: 2, abierto: partidoDeCancha(db).id } }, db);
    expect(html).toContain('Los Cardales · Cancha 2');
    expect(html).toContain('¿No se presentó alguien?');
    expect(html).not.toContain('+ Roja');
    expect(html).not.toContain('Total del día');
  });

  it('sin soloResultado, el editor es el del veedor (con rojas y arancel)', () => {
    const db = armarDb();
    const html = dibujar({ inicial: { predio: 'los_cardales', cancha: 2, abierto: partidoDeCancha(db).id } }, db);
    expect(html).toContain('+ Roja');
    expect(html).toContain('Total del día');
  });
});
