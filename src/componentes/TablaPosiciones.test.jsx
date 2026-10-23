import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { crearDatosEjemplo } from '../datos/datosEjemplo.js';
import { equiposDeZona, partidosDeEquipos } from '../logica/consultas.js';
import { calcularTabla } from '../logica/tabla.js';
import { NotasDesempate, TablaPosiciones } from './TablaPosiciones.jsx';

const db = crearDatosEjemplo();
const equipos = equiposDeZona(db.equipos, 1);
const filas = calcularTabla(equipos, partidosDeEquipos(db.partidos, equipos), db.configuracion.criteriosDesempate);

describe('TablaPosiciones en el panel', () => {
  it('sin vista se ve como siempre', () => {
    const html = renderToString(<TablaPosiciones filas={filas} />);
    expect(html).toContain('class="tabla"');
    for (const nuevo of ['data-vista', 'col-racha', 'Subió', 'Bajó']) expect(html).not.toContain(nuevo);
  });

  it('las notas de desempate siguen en el panel', () => {
    const html = renderToString(<NotasDesempate filas={filas} criterios={db.configuracion.criteriosDesempate} />);
    // React separa con <!-- --> las partes del texto armado con variables
    expect(html.replaceAll('<!-- -->', '')).toContain('Libre A3 queda arriba de Libre A1 por diferencia de gol.');
  });
});
