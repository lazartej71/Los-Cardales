import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { crearDatosEjemplo } from '../../datos/datosEjemplo.js';
import { AvisoWhatsApp } from './AvisoWhatsApp.jsx';
import { EditorPartido } from './EditorPartido.jsx';

// Cualquier acción "sale bien" sin hacer nada
const acciones = new Proxy({}, { get: () => async () => true });

// Primer partido de los datos de ejemplo: Libre A1 3 – 2 Libre A2, fecha 1 (Libre A2 tiene una expulsión)
function dibujar(cambiosPartido = {}, cambiosDb = {}) {
  const db = { ...crearDatosEjemplo(), ...cambiosDb };
  const partido = { ...db.partidos[0], ...cambiosPartido };
  db.partidos = [partido, ...db.partidos.slice(1)];
  const equipo = (id) => db.equipos.find((e) => e.id === id);
  return renderToString(
    <EditorPartido
      db={db}
      partido={partido}
      numero={1}
      local={equipo(partido.localId)}
      visitante={equipo(partido.visitanteId)}
      zonaLocal={null}
      zonaVisitante={null}
      acciones={acciones}
      onCambio={() => {}}
    />
  );
}

describe('editor del partido', () => {
  it('ofrece marcar que un equipo no se presentó', () => {
    const html = dibujar();
    expect(html).toContain('¿No se presentó alguien?');
    expect(html).toContain('No se presentó Libre A1');
    expect(html).toContain('No se presentó Libre A2');
  });

  it('un W.O. dice quién faltó y le apaga el pago a ese equipo', () => {
    const html = dibujar({ golesLocal: 3, golesVisitante: 0, ausente: 'visitante' });
    expect(html).toContain('No se presentó Libre A2: Libre A1 gana 3 a 0.');
    expect(html).toContain('No se presentó: no paga.');
    expect(html).not.toContain('¿No se presentó alguien?');
  });

  it('resume y lista las tarjetas del partido', () => {
    const tarjetas = [{ id: 1, partidoId: 1, equipoId: 1, numeroCamiseta: 7, nombreJugador: 'Pérez' }];
    const html = dibujar({}, { tarjetas });
    expect(html).toContain('1 amarilla · 1 roja');
    expect(html).toContain('Amarilla · N° 7 (Pérez)');
    expect(html).toContain('Roja · N° 5 (Lucas Benítez)');
  });

  it('muestra lo que pagó cada equipo y cómo queda su cuenta', () => {
    const movimientos = [
      { id: 1, equipoId: 1, partidoId: 1, tipo: 'pago', monto: 95000, metodo: 'efectivo', fecha: '2026-10-15', nota: '' },
    ];
    const html = dibujar({}, { movimientos });
    expect(html).toContain('Arancel ($105.000 por equipo)');
    expect(html).toContain('value="95.000"');
    // Libre A1 jugó 2 partidos ($210.000) y pagó $95.000
    expect(html).toContain('debe $115.000');
  });
});

describe('aviso por WhatsApp de una roja', () => {
  it('trae el link de WhatsApp del delegado', () => {
    const db = crearDatosEjemplo();
    expect(renderToString(<AvisoWhatsApp db={db} expulsion={db.expulsiones[0]} />)).toContain('https://wa.me/');
  });

  it('si el equipo no tiene WhatsApp, explica cómo cargarlo en lugar de un link roto', () => {
    const db = crearDatosEjemplo();
    db.equipos.forEach((e) => {
      e.telefonoDelegado = '';
    });
    const html = renderToString(<AvisoWhatsApp db={db} expulsion={db.expulsiones[0]} />);
    expect(html).not.toContain('https://wa.me/');
    expect(html).toContain('Cargá el WhatsApp del delegado en Equipos');
  });
});

describe('lugar y hora en el editor', () => {
  it('muestra el lugar cargado para cambiarlo', () => {
    const html = dibujar({ predio: 'los_cardales', cancha: 2, hora: '13:40' });
    expect(html).toContain('Lugar y hora');
    expect(html).toContain('value="13:40"');
    expect(html).toContain('Guardar lugar');
  });

  it('un partido sin lugar trae los campos vacíos para completarlo', () => {
    const html = dibujar({ predio: null, cancha: null, hora: null });
    expect(html).toContain('Lugar y hora');
    expect(html).toContain('>Elegí el predio<');
  });
});
