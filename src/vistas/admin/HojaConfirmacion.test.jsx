import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HojaConfirmacion } from './HojaConfirmacion.jsx';

describe('hoja de confirmación', () => {
  it('muestra la modalidad en grande, el partido y los botones', () => {
    const resumen = {
      modalidad: 'FÚTBOL 7',
      categoria: 'Libre',
      zonas: 'Zona A',
      fecha: 'Fecha 1',
      lugar: 'Los Cardales · Cancha 1 · 15:30',
      marcador: 'F7 A1 2 – 1 F7 A2',
    };
    const html = renderToString(<HojaConfirmacion resumen={resumen} guardando={false} onConfirmar={() => {}} onVolver={() => {}} />);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('FÚTBOL 7');
    expect(html).toContain('F7 A1 2 – 1 F7 A2');
    expect(html).toContain('Libre · Zona A · Fecha 1');
    expect(html).toContain('Los Cardales · Cancha 1 · 15:30');
    expect(html).toContain('>Confirmar<');
    expect(html).toContain('>Volver<');
  });
});
