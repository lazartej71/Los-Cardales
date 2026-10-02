import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { useSesion } from './useSesion.js';

function Mostrar({ simulacion }) {
  const { sesion, cargando } = useSesion({ simulacion });
  return <p>{`${sesion ? sesion.access_token : 'sin sesión'}|${cargando}`}</p>;
}

describe('sesión', () => {
  it('en la simulación el panel abre sin login', () => {
    expect(renderToString(<Mostrar simulacion />)).toContain('simulacion|false');
  });

  it('en la app real arranca sin sesión hasta que el admin ingresa', () => {
    expect(renderToString(<Mostrar simulacion={false} />)).toContain('sin sesión|');
  });
});
