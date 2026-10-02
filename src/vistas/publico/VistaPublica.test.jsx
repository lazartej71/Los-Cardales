import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CRITERIOS_POR_DEFECTO } from '../../datos/constantes.js';
import { crearDatosEjemplo } from '../../datos/datosEjemplo.js';
import { VistaPublica } from './VistaPublica.jsx';

const ui = (cambios = {}) => ({
  categoriaId: null,
  zonaId: null,
  seccion: 'posiciones',
  fecha: null,
  bannerVisible: true,
  ...cambios,
});
const dibujar = (db, cambios) => renderToString(<VistaPublica db={db} ui={ui(cambios)} setUi={() => {}} />);

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
});
