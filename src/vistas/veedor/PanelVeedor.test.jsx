import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { crearDatosEjemplo } from '../../datos/datosEjemplo.js';
import { guardarCancha, leerCanchaGuardada } from './canchaGuardada.js';
import { PanelVeedor } from './PanelVeedor.jsx';

const acciones = new Proxy({}, { get: () => async () => true });

// La fecha 3 está en juego. En la cancha 2 de Los Cardales: Libre A1 vs Libre A4 (13:40, sin cargar) y
// Libre A2 vs Libre A3 (15:00, cargado). En la cancha 5: +35 A1 vs +35 A4. En Cura Borges, cancha 1: Libre B1 vs B4.
function armarDb() {
  const db = crearDatosEjemplo();
  const nombre = (id) => db.equipos.find((e) => e.id === id).nombre;
  const lugares = {
    'Libre A1': { predio: 'los_cardales', cancha: 2, hora: '13:40' },
    'Libre A2': { predio: 'los_cardales', cancha: 2, hora: '15:00', golesLocal: 1, golesVisitante: 0 },
    '+35 A1': { predio: 'los_cardales', cancha: 5, hora: '12:00' },
    'Libre B1': { predio: 'cura_borges', cancha: 1, hora: '10:00' },
  };
  db.partidos = db.partidos.map((p) => (p.fecha === 3 && lugares[nombre(p.localId)] ? { ...p, ...lugares[nombre(p.localId)] } : p));
  return { ...db, rol: 'veedor' };
}

const dibujar = (inicial = {}) =>
  renderToString(
    <PanelVeedor db={armarDb()} acciones={acciones} inicial={inicial} almacen={null} onVerSitio={() => {}} onSalir={() => {}} />
  );

describe('pantalla del veedor', () => {
  it('arranca eligiendo el predio, con la fecha en juego y cuántos partidos falta cargar', () => {
    const html = dibujar();
    expect(html).toContain('Veedores · Fecha 3');
    expect(html).toContain('Elegí el predio');
    expect(html).toMatch(/Los Cardales<\/span><span[^>]*>3 partidos · 2 por cargar/);
    expect(html).toMatch(/Cura Borges<\/span><span[^>]*>1 partido · 1 por cargar/);
    // No es el panel del organizador
    expect(html).not.toContain('Secciones del panel');
    expect(html).not.toContain('Cuentas');
  });

  it('después elige la cancha; las que no tienen partidos se ven apagadas', () => {
    const html = dibujar({ predio: 'los_cardales' });
    expect(html).toContain('Elegí la cancha de Los Cardales');
    expect(html).toContain('Predios');
    expect(html).toMatch(/Cancha 2<\/span><span[^>]*>2 partidos · 1 por cargar/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*><span[^>]*>Cancha 1<\/span><span[^>]*>Sin partidos/);
  });

  it('en la cancha ve solo sus partidos, por cargar y cargados, con el botón para cambiar de cancha', () => {
    const html = dibujar({ predio: 'los_cardales', cancha: 2 });
    expect(html).toContain('Cambiar cancha');
    expect(html).toContain('Los Cardales · Cancha 2');
    expect(html).toContain('Por cargar (1)');
    expect(html).toContain('Cargados (1)');
    expect(html).toContain('Libre A1');
    expect(html).toContain('Libre A3');
    expect(html).not.toContain('+35 A1');
    expect(html).not.toContain('Libre B1');
  });

  it('al abrir un partido muestra el editor del veedor', () => {
    const db = armarDb();
    const partido = db.partidos.find((p) => p.fecha === 3 && p.predio === 'los_cardales' && p.cancha === 2 && p.golesLocal === null);
    const html = dibujar({ predio: 'los_cardales', cancha: 2, abierto: partido.id });
    expect(html).toContain('¿No se presentó alguien?');
    expect(html).toContain('Libre · fecha 3');
    expect(html).not.toContain('Postergar');
  });

  it('una cancha sin partidos lo dice', () => {
    expect(dibujar({ predio: 'los_cardales', cancha: 1 })).toContain('No hay partidos en esta cancha en la fecha 3.');
  });
});

describe('cancha recordada en el celular', () => {
  const almacenFalso = () => {
    const datos = new Map();
    return { getItem: (k) => datos.get(k) ?? null, setItem: (k, v) => datos.set(k, v) };
  };

  it('guarda y vuelve a leer el predio y la cancha', () => {
    const almacen = almacenFalso();
    guardarCancha(almacen, { predio: 'cura_borges', cancha: 9 });
    expect(leerCanchaGuardada(almacen)).toEqual({ predio: 'cura_borges', cancha: 9 });
    guardarCancha(almacen, { predio: 'los_cardales', cancha: null });
    expect(leerCanchaGuardada(almacen)).toEqual({ predio: 'los_cardales', cancha: null });
  });

  it('ignora lo que no es un predio o una cancha que existe', () => {
    const almacen = almacenFalso();
    almacen.setItem('veedor-cancha', JSON.stringify({ predio: 'cura_borges', cancha: 2 }));
    expect(leerCanchaGuardada(almacen)).toEqual({ predio: 'cura_borges', cancha: null });
    almacen.setItem('veedor-cancha', '{roto');
    expect(leerCanchaGuardada(almacen)).toEqual({});
  });

  it('sin almacenamiento (o si falla) sigue andando', () => {
    const roto = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(leerCanchaGuardada(roto)).toEqual({});
    expect(() => guardarCancha(roto, { predio: 'los_cardales', cancha: 2 })).not.toThrow();
    expect(leerCanchaGuardada(null)).toEqual({});
  });
});
