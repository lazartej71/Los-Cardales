import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from './App.jsx';

describe('App', () => {
  it('muestra la carga mientras llegan los datos', () => {
    expect(renderToString(<App />)).toContain('Cargando el campeonato');
  });

  it('en la simulación muestra el cartel que avisa que nada se guarda', () => {
    expect(renderToString(<App simulacion />)).toContain('MODO SIMULACIÓN');
    expect(renderToString(<App simulacion={false} />)).not.toContain('MODO SIMULACIÓN');
  });
});
