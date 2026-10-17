import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { crearDatosEjemplo } from '../../datos/datosEjemplo.js';
import { conFutbol7 } from '../../datos/datosEjemploFutbol7.js';
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

  it('al abrir un partido muestra resultado, W.O., rojas y arancel, sin postergar ni cambiar el lugar', () => {
    const db = armarDb();
    const html = dibujar({ inicial: { predio: 'los_cardales', cancha: 2, abierto: partidoDeCancha(db).id } }, db);
    expect(html).toContain('Los Cardales · Cancha 2');
    expect(html).toContain('¿No se presentó alguien?');
    expect(html).toContain('+ Roja');
    expect(html).toContain('Total del día');
    expect(html).not.toContain('Postergar');
    expect(html).not.toContain('Lugar y hora');
  });

  // Como el fin de semana del 17/10: Libre ya completó su fecha 3 y juega la 4; el resto sigue en la 3
  it('si una categoría va una fecha adelante, el título dice las dos fechas y cada partido la suya', () => {
    const db = armarDb();
    const id = (nombre) => db.equipos.find((e) => e.nombre === nombre).id;
    const libre = db.categorias.find((c) => c.nombre === 'Libre').id;
    db.partidos = db.partidos.map((p) => {
      if (p.categoriaId === libre && p.fecha === 3) return { ...p, golesLocal: 1, golesVisitante: 0 };
      if (p.fecha === 3 && p.localId === id('+35 A1')) return { ...p, predio: 'los_cardales', cancha: 2, hora: '16:20' };
      return p;
    });
    db.partidos.push({
      id: Math.max(...db.partidos.map((p) => p.id)) + 1,
      categoriaId: libre,
      fecha: 4,
      localId: id('Libre A1'),
      visitanteId: id('Libre A2'),
      golesLocal: null,
      golesVisitante: null,
      postergado: false,
      ausente: null,
      predio: 'los_cardales',
      cancha: 2,
      hora: '15:10',
    });

    const html = dibujar({ inicial: { predio: 'los_cardales', cancha: 2 } }, db);
    expect(html).toContain('>Cargar resultados · Fechas 3 y 4</h2>');
    expect(html).toContain('Libre · Fecha 4');
    expect(html).toContain('+35 · Fecha 3');
    // El de Libre de la fecha 3 (13:40 en esta cancha) ya pasó: no aparece
    expect(html).not.toContain('Libre · Fecha 3');
    expect(dibujar({ inicial: { predio: 'los_cardales', cancha: 1 } }, db)).toContain(
      'No hay partidos en esta cancha en las fechas 3 y 4.'
    );
  });

  it('en el panel (admin) la roja se puede avisar por WhatsApp; el veedor no', () => {
    const db = armarDb();
    const jugado = db.partidos.find((p) => p.fecha === 1);
    db.partidos = db.partidos.map((p) => (p.id === jugado.id ? { ...p, fecha: 3, predio: 'los_cardales', cancha: 2, hora: '15:10' } : p));
    const inicial = { predio: 'los_cardales', cancha: 2, abierto: jugado.id };
    expect(dibujar({ admin: true, inicial }, db)).toContain('>Avisar</button>');
    expect(dibujar({ inicial }, db)).not.toContain('>Avisar</button>');
  });
});

describe('Cargar en Fútbol 7', () => {
  const dibujarF7 = (props) => dibujar({ modalidad: 'f7', ...props }, conFutbol7());

  it('el título dice la modalidad y se ofrecen las canchas de F7 del predio', () => {
    const html = dibujarF7({ inicial: { predio: 'cura_borges' } });
    expect(html).toContain('>Cargar resultados · Fútbol 7 · Fecha 1</h2>');
    expect(html).toContain('>Cancha 1<');
    expect(html).toContain('>Cancha 3<');
    expect(html).not.toContain('>Cancha 9<');
  });

  it('en una cancha de F7 se ven sus partidos y no los de F11', () => {
    const html = dibujarF7({ inicial: { predio: 'los_cardales', cancha: 21 } });
    expect(html).toContain('Los Cardales · Cancha 1');
    expect(html).toContain('F7 A1');
    expect(html).not.toContain('Libre A1');
  });

  it('un predio y una cancha guardados de F11 no se usan en F7: vuelve a elegir el predio', () => {
    const almacen = { getItem: () => JSON.stringify({ modo: 'fecha', predio: 'cura_borges', cancha: 9 }), setItem: () => {} };
    expect(dibujarF7({ almacen })).toContain('Elegí el predio');
  });
});
