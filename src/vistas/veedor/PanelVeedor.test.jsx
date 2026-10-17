import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { crearDatosEjemplo } from '../../datos/datosEjemplo.js';
import { conFutbol7 } from '../../datos/datosEjemploFutbol7.js';
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

// Además: un postergado de la fecha 2 (+40) reprogramado para el lunes 12/10 en la cancha 4 de Cura Borges,
// y otro (+45) postergado sin reprogramar
function armarDbConPostergados() {
  const db = armarDb();
  const primero = (categoriaId) => db.partidos.find((p) => p.fecha === 2 && p.categoriaId === categoriaId).id;
  const [reprogramado, sinDia] = [primero(3), primero(4)];
  const sinResultado = { golesLocal: null, golesVisitante: null, postergado: true };
  db.partidos = db.partidos.map((p) => {
    if (p.id === reprogramado) return { ...p, ...sinResultado, dia: '2026-10-12', predio: 'cura_borges', cancha: 4, hora: '10:00' };
    if (p.id === sinDia) return { ...p, ...sinResultado };
    return p;
  });
  return db;
}

const dibujar = (inicial = {}, db = armarDb()) =>
  renderToString(
    <PanelVeedor db={db} acciones={acciones} inicial={inicial} almacen={null} usuario="veedor1" onSalir={() => {}} />
  );

describe('pantalla del veedor', () => {
  it('arranca eligiendo el predio, con la fecha en juego y cuántos partidos falta cargar', () => {
    const html = dibujar();
    expect(html).toContain('Veedores · Fecha 3');
    expect(html).toContain('Elegí el predio');
    expect(html).toMatch(/Los Cardales<\/span><span[^>]*>3 partidos · 2 por cargar/);
    expect(html).toMatch(/Cura Borges<\/span><span[^>]*>1 partido · 1 por cargar/);
    // Su cuenta en la cabecera, sin Ver sitio
    expect(html).toContain('<span class="cuenta-actual__usuario">veedor1</span><span class="cuenta-actual__rol">Veedor</span>');
    expect(html).not.toContain('Ver sitio');
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

  it('sin postergados reprogramados no aparece el botón Postergados', () => {
    expect(dibujar()).not.toContain('Postergados');
  });

  it('con algún escudo en la cancha, los renglones lo muestran arriba del nombre; sin escudos, como siempre', () => {
    const db = armarDb();
    db.equipos = db.equipos.map((e) => (e.nombre === 'Libre A1' ? { ...e, escudo: 'https://x/e.webp' } : e));
    const html = dibujar({ predio: 'los_cardales', cancha: 2 }, db);
    expect(html).toContain('class="renglon__boton renglon__boton--escudos"');
    expect(html).toContain('src="https://x/e.webp"');
    expect(dibujar({ predio: 'los_cardales', cancha: 2 })).not.toContain('renglon__boton--escudos');
  });
});

describe('postergados en la pantalla del veedor', () => {
  it('la primera pantalla suma el botón Postergados (solo cuenta los reprogramados)', () => {
    const html = dibujar({}, armarDbConPostergados());
    expect(html).toMatch(/Postergados<\/span><span[^>]*>1 partido · 1 por cargar/);
    // La fecha en juego no cambia
    expect(html).toContain('Veedores · Fecha 3');
  });

  it('adentro elige el predio entre los que tienen postergados', () => {
    const html = dibujar({ modo: 'postergados' }, armarDbConPostergados());
    expect(html).toContain('Veedores · Postergados');
    expect(html).toContain('Volver');
    expect(html).toMatch(/Cura Borges<\/span><span[^>]*>1 partido · 1 por cargar/);
    expect(html).toMatch(/disabled=""[^>]*><span[^>]*>Los Cardales<\/span><span[^>]*>Sin partidos/);
  });

  it('en la cancha muestra el postergado con su fecha original y su día, sin los de la fecha en juego', () => {
    const html = dibujar({ modo: 'postergados', predio: 'cura_borges', cancha: 4 }, armarDbConPostergados());
    expect(html).toContain('Cura Borges · Cancha 4');
    expect(html).toContain('Por cargar (1)');
    expect(html).toContain('Postergado de la fecha 2');
    expect(html).toContain('Lunes 12/10');
    expect(html).not.toContain('Libre B1');
  });

  it('una cancha sin postergados lo dice', () => {
    const html = dibujar({ modo: 'postergados', predio: 'cura_borges', cancha: 9 }, armarDbConPostergados());
    expect(html).toContain('No hay postergados en esta cancha.');
  });
});

describe('cancha recordada en el celular', () => {
  const almacenFalso = () => {
    const datos = new Map();
    return { getItem: (k) => datos.get(k) ?? null, setItem: (k, v) => datos.set(k, v) };
  };

  it('guarda y vuelve a leer si estaba en la fecha o en postergados, el predio y la cancha', () => {
    const almacen = almacenFalso();
    guardarCancha(almacen, { modo: 'fecha', predio: 'cura_borges', cancha: 9 });
    expect(leerCanchaGuardada(almacen)).toEqual({ modo: 'fecha', predio: 'cura_borges', cancha: 9 });
    guardarCancha(almacen, { modo: 'postergados', predio: 'los_cardales', cancha: null });
    expect(leerCanchaGuardada(almacen)).toEqual({ modo: 'postergados', predio: 'los_cardales', cancha: null });
    guardarCancha(almacen, { modo: 'postergados', predio: null, cancha: null });
    expect(leerCanchaGuardada(almacen)).toEqual({ modo: 'postergados' });
  });

  it('ignora lo que no es un predio o una cancha que existe', () => {
    const almacen = almacenFalso();
    almacen.setItem('veedor-cancha', JSON.stringify({ predio: 'cura_borges', cancha: 2 }));
    expect(leerCanchaGuardada(almacen)).toEqual({ modo: 'fecha', predio: 'cura_borges', cancha: null });
    almacen.setItem('veedor-cancha', JSON.stringify({ modo: 'cualquiera', predio: 'otro', cancha: 2 }));
    expect(leerCanchaGuardada(almacen)).toEqual({ modo: 'fecha' });
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

describe('veedores con Fútbol 7', () => {
  const dibujarVeedor = (db) =>
    renderToString(<PanelVeedor db={db} acciones={acciones} almacen={null} usuario="veedor1" onSalir={() => {}} />);

  it('un veedor sin modalidad elige primero Fútbol 11 o Fútbol 7', () => {
    const html = dibujarVeedor({ ...conFutbol7(), rol: 'veedor', modalidad: null });
    expect(html).toContain('Elegí la modalidad');
    expect(html).toContain('>Fútbol 11<');
    expect(html).toContain('>Fútbol 7<');
  });

  it('un veedor de F7 va directo a los predios de F7', () => {
    const html = dibujarVeedor({ ...conFutbol7(), rol: 'veedor', modalidad: 'f7' });
    expect(html).toContain('Elegí el predio');
    expect(html).toContain('Veedores · Fútbol 7 · Fecha 1');
    expect(html).toContain('Veedor F7');
  });

  it('lo guardado con la modalidad: un guardado viejo es de F11, y una cancha que no es de la modalidad no se usa', () => {
    const almacen = (valor) => ({ getItem: () => JSON.stringify(valor) });
    expect(leerCanchaGuardada(almacen({ modalidad: 'f7', predio: 'cura_borges', cancha: 23 }))).toEqual({
      modo: 'fecha',
      modalidad: 'f7',
      predio: 'cura_borges',
      cancha: 23,
    });
    expect(leerCanchaGuardada(almacen({ modalidad: 'f7', predio: 'cura_borges', cancha: 9 })).cancha).toBeNull();
    expect(leerCanchaGuardada(almacen({ predio: 'cura_borges', cancha: 9 })).cancha).toBe(9);
  });
});
