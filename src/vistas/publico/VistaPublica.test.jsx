import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CRITERIOS_POR_DEFECTO } from '../../datos/constantes.js';
import { crearDatosEjemplo } from '../../datos/datosEjemplo.js';
import { conFutbol7 } from '../../datos/datosEjemploFutbol7.js';
import { VistaPublica } from './VistaPublica.jsx';

const ui = (cambios = {}) => ({
  categoriaId: null,
  zonaId: null,
  seccion: 'posiciones',
  fecha: null,
  ...cambios,
});
const dibujar = (db, cambios) => renderToString(<VistaPublica db={db} ui={ui(cambios)} setUi={() => {}} />);

// Los datos de ejemplo con escudo para los equipos nombrados
function conEscudos(...nombres) {
  const db = crearDatosEjemplo();
  db.equipos = db.equipos.map((e) => (nombres.includes(e.nombre) ? { ...e, escudo: `https://x.supabase.co/e/${e.id}.webp` } : e));
  return db;
}

// Categoría de zona única como +45 real: fecha 1 cargada como tabla y un partido postergado
const zonaUnica = {
  categorias: [{ id: 5, nombre: '+45', orden: 5 }],
  zonas: [{ id: 10, categoriaId: 5, nombre: 'Zona única' }],
  equipos: [
    { id: 1, zonaId: 10, nombre: 'CERRAJERIA F.C' },
    { id: 2, zonaId: 10, nombre: 'PUMAS F.C' },
    { id: 3, zonaId: 10, nombre: '28 DE AGOSTO' },
    { id: 4, zonaId: 10, nombre: 'ECUADOR' },
  ],
  tablaInicial: [
    { equipoId: 1, pj: 1, pg: 0, pe: 1, pp: 0, gf: 1, gc: 1 },
    { equipoId: 2, pj: 1, pg: 0, pe: 1, pp: 0, gf: 1, gc: 1 },
  ],
  partidos: [
    { id: 1, categoriaId: 5, fecha: 1, localId: 3, visitanteId: 4, golesLocal: null, golesVisitante: null, postergado: true },
  ],
  configuracion: { nombreCampeonato: 'Copa GP', criteriosDesempate: CRITERIOS_POR_DEFECTO },
};

describe('VistaPublica', () => {
  it('muestra la tabla de la primera zona de la primera categoría', () => {
    const html = dibujar(crearDatosEjemplo());
    expect(html).toContain('Libre A3');
    expect(html).toContain('Zona B');
    expect(html).toContain('Seguí al campeonato');
  });

  it('no muestra el aviso para instalar la app', () => {
    expect(dibujar(crearDatosEjemplo())).not.toContain('Instalá la app');
  });

  it('no tiene botón de admin', () => {
    expect(dibujar(crearDatosEjemplo())).not.toMatch(/>(Admin|Panel)</);
  });

  it('nunca muestra expulsados, suspendidos ni teléfonos aunque lleguen en los datos', () => {
    const html = dibujar(crearDatosEjemplo(), { seccion: 'resultados' });
    for (const privado of ['Lucas Benítez', 'Suspendido', 'tribunal', '549115']) {
      expect(html).not.toContain(privado);
    }
  });

  it('oculta el selector de zona cuando la categoría tiene una sola', () => {
    expect(dibujar(zonaUnica)).not.toContain('aria-label="Zona"');
  });

  it('explica la fecha 1 cargada como tabla y marca el postergado', () => {
    const html = dibujar(zonaUnica);
    expect(html).toContain('se cargaron directo en la tabla');
    expect(html).toContain('Postergado');
    expect(html).toMatch(/CERRAJERIA F\.C/);
  });

  it('muestra la zona del rival en un partido entre zonas', () => {
    const db = {
      ...zonaUnica,
      categorias: [{ id: 2, nombre: '+30', orden: 2 }],
      zonas: [
        { id: 4, categoriaId: 2, nombre: 'Zona B' },
        { id: 5, categoriaId: 2, nombre: 'Zona C' },
      ],
      equipos: [
        { id: 1, zonaId: 4, nombre: 'LA MAGIA F.C' },
        { id: 2, zonaId: 5, nombre: 'C.A JAMAICA' },
      ],
      tablaInicial: [],
      partidos: [
        { id: 1, categoriaId: 2, fecha: 2, localId: 1, visitanteId: 2, golesLocal: 2, golesVisitante: 2, postergado: false },
      ],
    };
    const html = dibujar(db, { seccion: 'fixture' });
    expect(html).toContain('C.A JAMAICA');
    expect(html).toMatch(/class="partido-linea__zona">Zona C</);
  });

  it('avisa si todavía no hay categorías cargadas', () => {
    const vacia = { ...zonaUnica, categorias: [], zonas: [], equipos: [], partidos: [], tablaInicial: [] };
    expect(dibujar(vacia)).toContain('Todavía no hay categorías cargadas');
    expect(dibujar(vacia)).toContain('Seguí al campeonato');
  });

  it('muestra un W.O. y quién no se presentó', () => {
    const wo = {
      id: 2,
      categoriaId: 5,
      fecha: 2,
      localId: 1,
      visitanteId: 2,
      golesLocal: 3,
      golesVisitante: 0,
      postergado: false,
      ausente: 'visitante',
    };
    const db = { ...zonaUnica, partidos: [...zonaUnica.partidos, wo] };
    expect(dibujar(db, { seccion: 'fixture' })).toContain('>W.O.<');
    expect(dibujar(db, { seccion: 'resultados', fecha: 2 })).toContain(
      'Ganó CERRAJERIA F.C por W.O.: no se presentó PUMAS F.C'
    );
  });

  it('muestra un W.O. doble sin goles ni ganador', () => {
    const wo = {
      id: 2,
      categoriaId: 5,
      fecha: 2,
      localId: 1,
      visitanteId: 2,
      golesLocal: 0,
      golesVisitante: 0,
      postergado: false,
      ausente: 'ambos',
    };
    const db = { ...zonaUnica, partidos: [...zonaUnica.partidos, wo] };
    const fixture = dibujar(db, { seccion: 'fixture' });
    expect(fixture).toContain('>W.O. doble<');
    expect(fixture).not.toContain('aria-label="0 a 0"');
    const resultados = dibujar(db, { seccion: 'resultados', fecha: 2 });
    expect(resultados).toContain('W.O. doble: no se presentó ninguno');
    expect(resultados).not.toContain('Terminó empatado');
    expect(resultados).not.toContain('resultado__goles">0<');
  });

  // Zona única con la fecha 1 cargada como tabla (y un postergado) y la fecha 2 armada, sin resultados
  const conFecha2Armada = () => ({
    ...zonaUnica,
    partidos: [
      ...zonaUnica.partidos,
      { id: 2, categoriaId: 5, fecha: 2, localId: 1, visitanteId: 2, golesLocal: null, golesVisitante: null, postergado: false },
      { id: 3, categoriaId: 5, fecha: 2, localId: 3, visitanteId: 4, golesLocal: null, golesVisitante: null, postergado: false },
    ],
  });

  it('resultados arranca en la fecha en juego aunque la fecha 1 tenga un postergado', () => {
    expect(dibujar(conFecha2Armada(), { seccion: 'resultados' })).toMatch(/aria-pressed="true"[^>]*>Fecha 2</);
  });

  it('el fixture muestra abierta solo la fecha en juego y las demás plegadas', () => {
    const html = dibujar(conFecha2Armada(), { seccion: 'fixture' });
    expect(html).toContain(
      '<details class="fecha-bloque" open=""><summary class="fecha-bloque__cab"><h3 class="fecha-bloque__titulo">Fecha 2</h3>'
    );
    expect(html).toContain('<details class="fecha-bloque"><summary class="fecha-bloque__cab"><h3 class="fecha-bloque__titulo">Fecha 1</h3>');
    expect(html.match(/<details[^>]* open=""/g)).toHaveLength(1);
  });

  describe('lugar y hora en el fixture', () => {
    const sinResultado = { golesLocal: null, golesVisitante: null, postergado: false };
    const conLugares = {
      ...zonaUnica,
      tablaInicial: [],
      partidos: [
        { id: 1, categoriaId: 5, fecha: 2, localId: 3, visitanteId: 4, ...sinResultado, predio: 'cura_borges', cancha: 9, hora: '15:10' },
        { id: 2, categoriaId: 5, fecha: 2, localId: 1, visitanteId: 2, ...sinResultado, predio: 'los_cardales', cancha: 2, hora: '13:40' },
      ],
    };

    it('muestra el predio, la cancha y la hora, ordenados por hora', () => {
      const html = dibujar(conLugares, { seccion: 'fixture' });
      expect(html).toContain('Los Cardales · Cancha 2 · 13:40');
      expect(html).toContain('class="lugar"');
      expect(html.indexOf('13:40')).toBeLessThan(html.indexOf('15:10'));
    });

    it('en un postergado el lugar aparece tachado', () => {
      const db = { ...conLugares, partidos: [{ ...conLugares.partidos[1], postergado: true }] };
      const html = dibujar(db, { seccion: 'fixture' });
      expect(html).toContain('lugar--tachado');
      expect(html).toContain('Postergado');
    });

    it('un partido sin lugar no lleva la etiqueta', () => {
      expect(dibujar(zonaUnica, { seccion: 'fixture' })).not.toContain('class="lugar');
    });
  });

  describe('postergados que se recuperan en un día especial', () => {
    const postergado = { id: 3, categoriaId: 5, fecha: 1, localId: 3, visitanteId: 4, golesLocal: null, golesVisitante: null, postergado: true };
    const reprogramado = { ...postergado, dia: '2026-10-12', predio: 'los_cardales', cancha: 2, hora: '10:00' };
    const jugadoFecha2 = { id: 9, categoriaId: 5, fecha: 2, localId: 1, visitanteId: 2, golesLocal: 1, golesVisitante: 0, postergado: false };
    const conPartido = (partido) => ({ ...zonaUnica, partidos: [partido, jugadoFecha2] });
    const BLOQUE = /fecha-bloque__titulo">Postergados</;

    it('el fixture los muestra arriba, aparte, con su fecha original, el día y el lugar', () => {
      const html = dibujar(conPartido(reprogramado), { seccion: 'fixture' });
      expect(html).toMatch(BLOQUE);
      expect(html).toContain('Postergado de la fecha 1');
      expect(html).toContain('Lunes 12/10 · Los Cardales · Cancha 2 · 10:00');
      expect(html.search(BLOQUE)).toBeLessThan(html.indexOf('>Fecha 1<'));
      // Nunca como una fecha nueva
      expect(html).not.toContain('>Fecha 3<');
    });

    it('en su fecha original dice cuándo se juega, en vez del lugar tachado', () => {
      const html = dibujar(conPartido(reprogramado), { seccion: 'fixture' });
      expect(html).toContain('Se juega el lunes 12/10');
      expect(html).not.toContain('lugar--tachado');
    });

    it('un postergado sin reprogramar no aparece en el bloque', () => {
      expect(dibujar(conPartido(postergado), { seccion: 'fixture' })).not.toMatch(BLOQUE);
    });

    it('una vez jugado sale del bloque y queda en su fecha', () => {
      const jugado = { ...reprogramado, postergado: false, golesLocal: 2, golesVisitante: 2 };
      expect(dibujar(conPartido(jugado), { seccion: 'fixture' })).not.toMatch(BLOQUE);
    });
  });

  it('Posiciones no muestra a un equipo dado de baja, pero sus partidos siguen en Resultados', () => {
    const db = crearDatosEjemplo();
    db.equipos = db.equipos.map((e) => (e.nombre === 'Libre A2' ? { ...e, baja: true } : e));
    const html = dibujar(db);
    expect(html).not.toContain('title="Libre A2"');
    expect(html).toContain('title="Libre A1"');
    expect(dibujar(db, { seccion: 'resultados', fecha: 1 })).toContain('Libre A2');
  });
});

describe('tabla pública', () => {
  it('abre en Resumen, con el selector de vistas', () => {
    const html = dibujar(crearDatosEjemplo());
    expect(html).toContain('aria-label="Vista de la tabla"');
    expect(html).toMatch(/aria-pressed="true"[^>]*>Resumen</);
    expect(html).toContain('data-vista="resumen"');
  });

  it('en Racha muestra los últimos resultados de cada equipo', () => {
    const html = dibujar(crearDatosEjemplo(), { vistaTabla: 'racha' });
    expect(html).toContain('data-vista="racha"');
    expect(html).toContain('aria-label="Últimos resultados: ganó, empató"');
    expect(html).toContain('class="racha__r racha__r--v"');
  });

  it('una sola frase de desempate reemplaza a las notas', () => {
    const html = dibujar(crearDatosEjemplo());
    expect(html).toContain(
      'Si dos equipos empatan en puntos, se ordenan por diferencia de gol, después por goles a favor y después por el resultado entre ellos.'
    );
    expect(html).not.toContain('queda arriba de');
  });

  it('las flechitas dicen quién subió y quién bajó desde la fecha anterior', () => {
    const db = {
      ...zonaUnica,
      equipos: [
        { id: 1, zonaId: 10, nombre: 'ALFA' },
        { id: 2, zonaId: 10, nombre: 'BETA' },
        { id: 3, zonaId: 10, nombre: 'GAMA' },
      ],
      tablaInicial: [],
      partidos: [
        { id: 1, categoriaId: 5, fecha: 1, localId: 1, visitanteId: 2, golesLocal: 1, golesVisitante: 0, postergado: false },
        { id: 2, categoriaId: 5, fecha: 2, localId: 3, visitanteId: 1, golesLocal: 2, golesVisitante: 0, postergado: false },
      ],
    };
    const html = dibujar(db);
    expect(html).toContain('Subió 1 puesto');
    expect(html).toContain('Bajó 1 puesto');
  });
});

describe('Mi equipo', () => {
  const conMiEquipo = (id) => ({ miEquipo: { f11: id, f7: null } });

  it('cada equipo tiene su estrella y, sin equipo marcado, se explica para qué sirve', () => {
    const html = dibujar(crearDatosEjemplo());
    expect(html).toContain('aria-label="Seguir a Libre A1"');
    expect(html).toContain('Tocá la estrella de tu equipo para seguirlo.');
    expect(html).not.toContain('Tu equipo');
  });

  it('con un equipo marcado: tarjeta con su puesto y su próximo partido, y la fila resaltada', () => {
    const html = dibujar(crearDatosEjemplo(), conMiEquipo(1));
    expect(html).toContain('Tu equipo');
    expect(html).toContain('2.º · 4 puntos');
    expect(html).toContain('Fecha 3 · vs Libre A4');
    expect(html).toMatch(
      /aria-pressed="true"[^>]*aria-label="Dejar de seguir a Libre A1"|aria-label="Dejar de seguir a Libre A1"[^>]*aria-pressed="true"/
    );
    expect(html).toContain('fila--mia');
    expect(html).not.toContain('Tocá la estrella de tu equipo para seguirlo.');
  });

  it('resalta su partido en el fixture y en resultados', () => {
    expect(dibujar(crearDatosEjemplo(), { ...conMiEquipo(1), seccion: 'fixture' })).toContain('partido--mio');
    expect(dibujar(crearDatosEjemplo(), { ...conMiEquipo(1), seccion: 'resultados', fecha: 1 })).toContain(
      'resultado--mio'
    );
  });

  it('sin tarjeta si el equipo marcado es de la otra modalidad o se dio de baja', () => {
    expect(dibujar(conFutbol7(), { modalidad: 'f11', miEquipo: { f11: null, f7: 101 } })).not.toContain('Tu equipo');
    const db = crearDatosEjemplo();
    db.equipos = db.equipos.map((e) => (e.id === 1 ? { ...e, baja: true } : e));
    expect(dibujar(db, conMiEquipo(1))).not.toContain('Tu equipo');
  });
});

describe('escudos en la vista pública', () => {
  it('la tabla muestra el escudo de cada equipo y las iniciales de los que no tienen', () => {
    const db = conEscudos('Libre A1');
    const id = db.equipos.find((e) => e.nombre === 'Libre A1').id;
    const html = dibujar(db);
    expect(html).toContain('class="tabla tabla--escudos"');
    expect(html).toContain(`<span class="equipo-celda"><img class="escudo" src="https://x.supabase.co/e/${id}.webp" alt=""`);
    expect(html).toMatch(
      /<span class="escudo escudo--iniciales" aria-hidden="true">L<\/span><span class="equipo-celda__nombre">Libre A2<\/span>/
    );
  });

  it('si ningún equipo de la zona tiene escudo, la tabla se ve como siempre', () => {
    const html = dibujar(conEscudos('Libre B1'));
    expect(html).toContain('class="tabla"');
    expect(html).not.toContain('class="escudo');
  });

  it('el fixture y los resultados llevan los escudos si algún equipo de la fecha tiene', () => {
    const html = dibujar(conEscudos('Libre A1'));
    expect(html).toContain('class="partido-linea partido-linea--escudos"');
    expect(html).toMatch(/class="resultado( resultado--pendiente)? resultado--escudos"/);
    expect(html).toMatch(
      /<span class="escudo escudo--iniciales" aria-hidden="true">L<\/span><span class="equipo-nombre">Libre A2<\/span>/
    );
  });

  it('sin escudos, el fixture y los resultados se ven como siempre', () => {
    const html = dibujar(crearDatosEjemplo());
    expect(html).not.toContain('partido-linea--escudos');
    expect(html).not.toContain('resultado--escudos');
    expect(html).not.toContain('equipo-nombre');
  });
});

describe('Fútbol 11 y Fútbol 7', () => {
  it('sin Fútbol 7 cargado se ve como siempre: sin conmutador ni chip', () => {
    const html = dibujar(crearDatosEjemplo());
    expect(html).not.toContain('conmutador');
    expect(html).not.toContain('chip-modalidad');
    // La cabecera, como siempre: un nombre largo sigue partiéndose en dos renglones en el celular
    expect(html).not.toContain('cabecera__fila');
    expect(html).toContain('data-modalidad="f11"');
    expect(html).toContain('Campeonato de Fútbol');
  });

  it('en Fútbol 7 muestra sus categorías y equipos, con el nombre del campeonato y el acento de F7', () => {
    const html = dibujar(conFutbol7(), { modalidad: 'f7' });
    expect(html).toContain('data-modalidad="f7"');
    expect(html).toMatch(/<h1 class="cabecera__titulo">Campeonato de Fútbol<\/h1>/);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Fútbol 7</);
    expect(html).toMatch(/aria-pressed="false"[^>]*>Fútbol 11</);
    expect(html).toContain('F7 A1');
    expect(html).not.toContain('Libre A1');
    // Una sola categoría (la Libre de F7): no aparece el selector de +35
    expect(html).not.toContain('+35');
    expect(html).toContain('FÚTBOL 7');
  });

  it('si lo elegido era de Fútbol 11, en Fútbol 7 vuelve a su primera categoría', () => {
    const html = dibujar(conFutbol7(), { modalidad: 'f7', categoriaId: 1, zonaId: 1 });
    expect(html).toContain('F7 A1');
    expect(html).not.toContain('Libre A1');
  });

  it('en Fútbol 11, con F7 cargado, el chip dice FÚTBOL 11 y el título es el del campeonato', () => {
    const html = dibujar(conFutbol7(), { modalidad: 'f11' });
    expect(html).toContain('FÚTBOL 11');
    expect(html).toMatch(/<h1 class="cabecera__titulo">Campeonato de Fútbol<\/h1>/);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Fútbol 11</);
    expect(html).toContain('Libre A1');
    expect(html).not.toContain('F7 A1');
  });
});
