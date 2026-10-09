import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { crearDatosEjemplo } from '../../datos/datosEjemplo.js';
import { AdminEquipos } from './AdminEquipos.jsx';
import { ConfirmarBaja } from './BajasEquipos.jsx';

const nada = () => {};
const acciones = new Proxy({}, { get: () => async () => true });
// Libre · Zona A: Libre A1 a Libre A4 (ids 1 a 4)
const filtro = { categoriaId: 1, zonaId: 1, onCategoria: nada, onZona: nada };
const dibujar = (db = crearDatosEjemplo()) => renderToString(<AdminEquipos db={db} acciones={acciones} filtro={filtro} />);
const conBaja = (nombre) => {
  const db = crearDatosEjemplo();
  db.equipos = db.equipos.map((e) => (e.nombre === nombre ? { ...e, baja: true } : e));
  return db;
};

describe('panel → Equipos: altas y bajas', () => {
  it('ofrece agregar un equipo a la zona elegida', () => {
    const html = dibujar();
    expect(html).toMatch(/Agregar equipo a Libre · Zona A/);
    expect(html).toContain('Nombre del equipo nuevo');
    expect(html).toContain('Arranca con 0 partidos jugados.');
    expect(html).toContain('>Agregar equipo</button>');
  });

  it('cada equipo en juego tiene su botón Dar de baja, y no hay lista de dados de baja', () => {
    const html = dibujar();
    expect(html.match(/>Dar de baja<\/button>/g)).toHaveLength(4);
    expect(html).not.toContain('Dados de baja');
  });

  it('un dado de baja sale de la lista de edición y va plegado a Dados de baja, con Volver a dar de alta', () => {
    const html = dibujar(conBaja('Libre A2'));
    expect(html).not.toContain('id="equipo-2-titulo"');
    expect(html.match(/>Dar de baja<\/button>/g)).toHaveLength(3);
    expect(html).toMatch(/<details class="panel equipos-baja"><summary class="equipos-baja__cab">Dados de baja \(1\)<\/summary>/);
    expect(html).toContain('Libre A2');
    expect(html).toContain('>Volver a dar de alta</button>');
  });

  it('la confirmación explica qué pasa con lo jugado', () => {
    const html = renderToString(<ConfirmarBaja nombre="GOB GUTIERREZ" ocupado={false} onSi={nada} onCancelar={nada} />);
    expect(html).toContain('¿Dar de baja a GOB GUTIERREZ? Deja de aparecer en la tabla; sus partidos jugados quedan como están.');
    expect(html).toContain('>Sí, dar de baja</button>');
    expect(html).toContain('>Cancelar</button>');
  });
});
