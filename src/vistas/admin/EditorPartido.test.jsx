import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { crearDatosEjemplo } from '../../datos/datosEjemplo.js';
import { AvisoWhatsApp } from './AvisoWhatsApp.jsx';
import { FormRoja } from './BloqueTarjetas.jsx';
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

  it('ya no ofrece cargar amarillas, solo rojas', () => {
    const html = dibujar();
    expect(html).not.toContain('+ Amarilla');
    expect(html).toContain('+ Roja');
  });

  it('cada roja dice su tipo, y la que no tiene sanción se puede borrar desde el partido', () => {
    const db = crearDatosEjemplo();
    const expulsiones = [
      { ...db.expulsiones[0], tipo: 'directa' }, // con 2 fechas de suspensión
      { id: 9, partidoId: 1, equipoId: 1, numeroCamiseta: 8, nombreJugador: '', fechasSuspension: null, fechasCumplidas: 0, tipo: 'doble_amarilla' },
    ];
    const html = dibujar({}, { expulsiones });
    expect(html).toContain('Roja directa · N° 5 (Lucas Benítez)');
    expect(html).toContain('Doble amarilla · N° 8');
    expect(html).toContain('aria-label="Borrar la roja del N° 8"');
    expect(html).not.toContain('aria-label="Borrar la roja del N° 5"');
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

  it('el pago va en dos partes, efectivo y transferencia, con el total del día', () => {
    const movimientos = [
      { id: 1, equipoId: 1, partidoId: 1, tipo: 'pago', monto: 50000, metodo: 'efectivo', fecha: '2026-10-15', nota: '' },
      { id: 2, equipoId: 1, partidoId: 1, tipo: 'pago', monto: 55000, metodo: 'transferencia', fecha: '2026-10-15', nota: '' },
    ];
    const html = dibujar({}, { movimientos });
    expect(html).toMatch(/for="pago-1-1-efectivo"[^>]*>Efectivo</);
    expect(html).toMatch(/id="pago-1-1-efectivo"[^>]*value="50.000"/);
    expect(html).toMatch(/for="pago-1-1-transferencia"[^>]*>Transferencia</);
    expect(html).toMatch(/id="pago-1-1-transferencia"[^>]*value="55.000"/);
    expect(html).toContain('Total del día: $105.000');
    // El rival todavía no pagó nada
    expect(html).toContain('Total del día: $0');
  });
});

describe('formulario de una roja', () => {
  it('pide el tipo (doble amarilla o roja directa), el número y el nombre', () => {
    const db = crearDatosEjemplo();
    const partido = db.partidos[0];
    const html = renderToString(
      <FormRoja partido={partido} equipo={db.equipos[0]} acciones={acciones} onListo={() => {}} />
    );
    expect(html).toContain('Tipo de roja');
    expect(html).toContain('>Doble amarilla<');
    expect(html).toContain('>Roja directa<');
    expect(html).toContain('N° de camiseta');
    expect(html).toContain('Guardar roja');
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
