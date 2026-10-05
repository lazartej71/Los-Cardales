import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { crearDatosEjemplo } from '../../datos/datosEjemplo.js';
import { PanelAdmin } from './PanelAdmin.jsx';
import { PantallaLogin } from './PantallaLogin.jsx';

const nada = () => {};
// Cualquier acción "sale bien" sin hacer nada
const acciones = new Proxy({}, { get: () => async () => true });

function dibujar(
  seccion,
  { db = crearDatosEjemplo(), equipoCuentaId = null, busquedaCuentas = '', fecha = null, partidoAbiertoId = null } = {}
) {
  const ui = { seccion, categoriaId: null, zonaId: null, fecha, equipoCuentaId, busquedaCuentas, partidoAbiertoId };
  return renderToString(
    <PanelAdmin db={db} acciones={acciones} ui={ui} setUi={nada} onVerSitio={nada} onSalir={nada} />
  );
}

// Libre A1 (equipo 1) jugó las fechas 1 y 2 y tiene pendiente la 3
const movimientosDeLibreA1 = [
  { id: 1, equipoId: 1, partidoId: null, tipo: 'deuda_anterior', monto: 10000, metodo: null, fecha: '2026-10-01', nota: 'fecha 1' },
  { id: 2, equipoId: 1, partidoId: 1, tipo: 'pago', monto: 95000, metodo: 'efectivo', fecha: '2026-10-08', nota: '' },
  { id: 3, equipoId: 1, partidoId: null, tipo: 'pago', monto: 10000, metodo: 'transferencia', fecha: '2026-10-15', nota: '' },
];

describe('panel de administración', () => {
  it.each(['resultados', 'cuentas', 'sanciones', 'equipos', 'configuracion'])('dibuja la sección %s', (seccion) => {
    expect(dibujar(seccion)).toContain('Panel de administración');
  });

  it('en Suspendidos, cada roja dice si fue doble amarilla o directa', () => {
    const db = crearDatosEjemplo();
    db.expulsiones[0] = { ...db.expulsiones[0], tipo: 'doble_amarilla' };
    const html = dibujar('sanciones', { db });
    expect(html).toContain('Doble amarilla · N° 5 de Libre A2');
    // Las viejas, sin tipo, se ven como antes
    expect(html).toContain('>N° 9 de +35 B4, ');
  });

  it('el menú tiene Cuentas en lugar de Expulsión', () => {
    const html = dibujar('resultados');
    expect(html).toContain('<span>Cuentas</span>');
    expect(html).not.toContain('<span>Expulsión</span>');
  });

  it('en partidos ofrece armar la fecha siguiente', () => {
    const html = dibujar('resultados');
    expect(html).toContain('+ Fecha 4');
    expect(html).toContain('Agregar partido');
  });

  it('al agregar un partido pide el predio, la cancha y la hora', () => {
    const html = dibujar('resultados', { fecha: 4 });
    expect(html).toMatch(/Agregar partido a la fecha (<!-- -->)?4/);
    expect(html).toContain('Cura Borges');
    expect(html).toContain('placeholder="13:40"');
  });

  // Fecha 3 de Libre en los datos de ejemplo: 5 (A1-A4), 6 (A2-A3), 11 (B1-B4) y 12 (B2-B3), sin resultado
  const fecha3ConUnoCargadoYUnoPostergado = () => {
    const db = crearDatosEjemplo();
    db.partidos = db.partidos.map((p) => {
      if (p.id === 5) return { ...p, golesLocal: 1, golesVisitante: 0 };
      if (p.id === 6) return { ...p, postergado: true };
      return p;
    });
    return db;
  };

  it('separa los partidos de la fecha en pendientes de carga y cargados', () => {
    const html = dibujar('resultados', { db: fecha3ConUnoCargadoYUnoPostergado(), fecha: 3 });
    expect(html).toContain('2 de 4 cargados');
    const pendientes = html.indexOf('Pendientes de carga (2)');
    const cargados = html.indexOf('Cargados (2)');
    expect(pendientes).toBeGreaterThan(-1);
    expect(cargados).toBeGreaterThan(pendientes);
    // Los pendientes (B1-B4 y B2-B3) van primero; el cargado y el postergado, en Cargados
    expect(html.indexOf('Libre B1')).toBeGreaterThan(pendientes);
    expect(html.indexOf('Libre B1')).toBeLessThan(cargados);
    expect(html.indexOf('Libre A1')).toBeGreaterThan(cargados);
    expect(html.indexOf('Libre A2')).toBeGreaterThan(cargados);
    expect(html).toContain('>Postergado<');
  });

  it('los partidos se ven en renglones cerrados y el que está abierto muestra su editor', () => {
    const db = fecha3ConUnoCargadoYUnoPostergado();
    expect(dibujar('resultados', { db, fecha: 3 })).not.toContain('¿No se presentó alguien?');
    const abierto = dibujar('resultados', { db, fecha: 3, partidoAbiertoId: 11 });
    expect(abierto.match(/¿No se presentó alguien?/g)).toHaveLength(1);
    expect(abierto).toContain('aria-expanded="true"');
  });

  it('cuando no queda nada por cargar, avisa que la fecha está completa', () => {
    const html = dibujar('resultados', { fecha: 2 });
    expect(html).toContain('Listo: cargaste todos los partidos de la fecha 2.');
    expect(html).not.toContain('Pendientes de carga (');
    expect(html).toContain('4 de 4 cargados');
  });

  // Libre con dos postergados en fechas distintas: el 4 (fecha 2, A4-A2) y el 6 (fecha 3, A2-A3)
  const libreConDosPostergados = () => {
    const db = crearDatosEjemplo();
    db.partidos = db.partidos.map((p) => {
      if (p.id === 4) return { ...p, golesLocal: null, golesVisitante: null, postergado: true };
      if (p.id === 6) return { ...p, postergado: true };
      return p;
    });
    return db;
  };

  it('si hay postergados, ofrece verlos juntos con la cantidad', () => {
    expect(dibujar('resultados', { db: libreConDosPostergados() })).toContain('Postergados (2)');
  });

  it('sin postergados, no aparece el botón', () => {
    expect(dibujar('resultados')).not.toContain('Postergados (');
  });

  it('la vista de postergados junta los de distintas fechas, con su fecha al lado', () => {
    const html = dibujar('resultados', { db: libreConDosPostergados(), fecha: 'postergados' });
    expect(html).toContain('Postergados de Libre (2)');
    expect(html).toContain('>Fecha 2<');
    expect(html).toContain('>Fecha 3<');
    expect(html).not.toContain('Agregar partido');
  });

  it('un postergado que se recuperó (con resultado) sale de la lista', () => {
    const db = crearDatosEjemplo();
    db.partidos = db.partidos.map((p) => (p.id === 6 ? { ...p, golesLocal: 1, golesVisitante: 1, postergado: false } : p));
    const html = dibujar('resultados', { db, fecha: 'postergados' });
    expect(html).not.toContain('Postergados de Libre');
    expect(html).not.toContain('Postergados (');
  });

  it('cuentas muestra cuánto se debe en la categoría y cada equipo', () => {
    const html = dibujar('cuentas');
    // Los 8 equipos de Libre jugaron 2 partidos cada uno: 8 × $210.000
    expect(html).toContain('Deben en Libre: $1.680.000');
    expect(html).toContain('debe $210.000');
  });

  it('con "solo los que deben" no aparecen los equipos al día', () => {
    const db = crearDatosEjemplo();
    db.movimientos = [
      { id: 1, equipoId: 1, partidoId: null, tipo: 'pago', monto: 210000, metodo: 'efectivo', fecha: '2026-10-15', nota: '' },
    ];
    const html = dibujar('cuentas', { db });
    expect(html).not.toContain('>Libre A1<');
    expect(html).toContain('>Libre A2<');
  });

  it('el buscador filtra los equipos de la categoría', () => {
    const html = dibujar('cuentas', { busquedaCuentas: 'a2' });
    expect(html).toContain('value="a2"');
    expect(html).toContain('>Libre A2<');
    expect(html).not.toContain('>Libre A1<');
  });

  it('si el equipo buscado está al día, avisa que hay que destildar la casilla', () => {
    const db = crearDatosEjemplo();
    db.movimientos = [
      { id: 1, equipoId: 1, partidoId: null, tipo: 'pago', monto: 210000, metodo: 'efectivo', fecha: '2026-10-15', nota: '' },
    ];
    expect(dibujar('cuentas', { db, busquedaCuentas: 'libre a1' })).toContain(
      'Ningún equipo que deba coincide con «libre a1». Destildá «Solo los que deben» para ver los que están al día.'
    );
  });

  it('si ningún equipo se llama así, lo dice', () => {
    expect(dibujar('cuentas', { busquedaCuentas: 'zzz' })).toContain('Ningún equipo de Libre coincide con «zzz».');
  });

  it('en la cuenta, un pago en dos partes muestra cada medio', () => {
    const db = crearDatosEjemplo();
    db.movimientos = [
      { id: 1, equipoId: 1, partidoId: 1, tipo: 'pago', monto: 50000, metodo: 'efectivo', fecha: '2026-10-15', nota: '' },
      { id: 2, equipoId: 1, partidoId: 1, tipo: 'pago', monto: 55000, metodo: 'transferencia', fecha: '2026-10-15', nota: '' },
    ];
    expect(dibujar('cuentas', { db, equipoCuentaId: 1 })).toContain(
      'pagó $105.000 de $105.000 · $50.000 efectivo + $55.000 transferencia'
    );
  });

  it('la cuenta de un equipo va en orden: deudas, partidos y pagos sueltos', () => {
    const db = crearDatosEjemplo();
    db.movimientos = movimientosDeLibreA1;
    const html = dibujar('cuentas', { db, equipoCuentaId: 1 });
    // Cobrado: 10.000 + 2 × 105.000. Pagado: 95.000 + 10.000
    expect(html).toContain('debe $115.000');
    const renglones = [
      'Deuda anterior · fecha 1',
      'Fecha 1 vs Libre A2',
      'pagó $95.000 de $105.000 · efectivo',
      'Fecha 2 vs Libre A3',
      'sin pago de $105.000',
      'Fecha 3 vs Libre A4',
      'sin pago · se cobra cuando se juegue',
      '15/10 · pago suelto · transferencia',
    ];
    const posiciones = renglones.map((r) => html.indexOf(r));
    expect(posiciones.every((p) => p >= 0)).toBe(true);
    expect([...posiciones].sort((a, b) => a - b)).toEqual(posiciones);
  });

  it('en ajustes se cambia el arancel', () => {
    const html = dibujar('configuracion');
    expect(html).toContain('Arancel por equipo y partido');
    expect(html).toContain('value="105.000"');
    expect(html).toContain('Cambiarlo recalcula todas las cuentas del torneo.');
  });

  it('avisa si la base todavía no tiene categorías', () => {
    const db = { ...crearDatosEjemplo(), categorias: [], zonas: [], equipos: [], partidos: [], expulsiones: [] };
    expect(dibujar('resultados', { db })).toContain('Todavía no hay categorías cargadas');
  });
});

describe('pestaña Control', () => {
  it('Franco (admin) no la ve', () => {
    expect(dibujar('resultados', { db: { ...crearDatosEjemplo(), rol: 'admin' } })).not.toContain('<span>Control</span>');
  });

  it('el superadmin la ve', () => {
    const html = dibujar('control', { db: { ...crearDatosEjemplo(), rol: 'superadmin' } });
    expect(html).toContain('<span>Control</span>');
    expect(html).toContain('Personas que entraron a la página');
  });

  it('un admin que entra a la sección control por la dirección ve Partidos', () => {
    const html = dibujar('control', { db: { ...crearDatosEjemplo(), rol: 'admin' } });
    expect(html).not.toContain('Personas que entraron a la página');
    expect(html).toContain('Partidos y resultados');
  });
});

describe('login', () => {
  it('pide usuario y contraseña, sin credenciales de prueba', () => {
    const html = renderToString(<PantallaLogin nombreCampeonato="Copa GP" onIngresar={nada} onVolver={nada} />);
    expect(html).toContain('>Usuario</label>');
    expect(html).not.toContain('type="email"');
    expect(html).toContain('type="password"');
    expect(html).not.toContain('1234');
  });
});
