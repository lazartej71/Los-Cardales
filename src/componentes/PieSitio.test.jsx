import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { REDES } from '../datos/constantes.js';
import { PieSitio } from './PieSitio.jsx';

describe('PieSitio', () => {
  it('muestra las tres redes, que abren en otra pestaña, y el año', () => {
    const html = renderToString(<PieSitio anio={2026} />);
    expect(html).toContain('Seguí al campeonato');
    expect(html).toContain('href="https://www.facebook.com/loscardalesfutbol"');
    expect(html).toContain('href="https://www.instagram.com/loscardalesfut/"');
    expect(html).toContain('href="https://wa.me/5493814490189"');
    expect(html.match(/target="_blank" rel="noopener noreferrer"/g)).toHaveLength(3);
    expect(html).toContain('© 2026 Los Cardales');
  });

  it('una red sin dirección no aparece', () => {
    const html = renderToString(<PieSitio anio={2026} redes={[{ ...REDES[0], url: '' }, REDES[1]]} />);
    expect(html).not.toContain('Facebook');
    expect(html).toContain('Instagram');
  });
});
