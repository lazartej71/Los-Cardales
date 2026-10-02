import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { emailDeUsuario, useSesion } from './useSesion.js';

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

describe('usuario para ingresar', () => {
  it('convierte el usuario en un email del dominio del campeonato', () => {
    expect(emailDeUsuario('franco1')).toBe('franco1@loscardalesfutbol.com');
  });

  it('ignora mayúsculas y espacios de más', () => {
    expect(emailDeUsuario('  LjDev ')).toBe('ljdev@loscardalesfutbol.com');
  });

  it('si escriben un email completo lo usa tal cual', () => {
    expect(emailDeUsuario(' Alguien@Gmail.com ')).toBe('alguien@gmail.com');
  });
});
