import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CamposLugar, cambiarPredio } from './CamposLugar.jsx';
import { RenglonPartido } from './RenglonPartido.jsx';

const dibujar = (lugar) => renderToString(<CamposLugar idBase="prueba" lugar={lugar} onCambiar={() => {}} />);

describe('campos de lugar y hora', () => {
  it('al cambiar de predio se borra la cancha si el otro no la tiene', () => {
    expect(cambiarPredio({ predio: 'los_cardales', cancha: '2', hora: '13:40' }, 'cura_borges')).toEqual({
      predio: 'cura_borges',
      cancha: '',
      hora: '13:40',
    });
    expect(cambiarPredio({ predio: 'los_cardales', cancha: '4', hora: '' }, 'cura_borges').cancha).toBe('4');
  });

  it('ofrece solo las canchas del predio elegido', () => {
    const html = dibujar({ predio: 'cura_borges', cancha: '', hora: '' });
    expect(html).toContain('>Cancha 9</option>');
    expect(html).not.toContain('>Cancha 2</option>');
  });

  it('sin predio elegido pide elegirlo antes de la cancha', () => {
    const html = dibujar({ predio: '', cancha: '', hora: '' });
    expect(html).toContain('Primero elegí el predio');
    expect(html).toContain('Los Cardales');
    expect(html).toContain('Cura Borges');
  });
});

describe('renglón del partido', () => {
  it('muestra el lugar y la hora', () => {
    const partido = { id: 1, fecha: 2, localId: 1, visitanteId: 2, golesLocal: null, golesVisitante: null, postergado: false, predio: 'los_cardales', cancha: 2, hora: '13:40' };
    const html = renderToString(
      <RenglonPartido partido={partido} local={{ nombre: 'BRANCA' }} visitante={{ nombre: 'BARRIO POLICIAL' }} abierto={false} onTocar={() => {}} />
    );
    expect(html).toContain('Los Cardales · C2 · 13:40');
  });
});
