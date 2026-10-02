import { describe, expect, it } from 'vitest';
import { crearUltimoPedido } from './ultimoPedido.js';

// Pedido que queda pendiente hasta que la prueba lo suelta
function pedidoDemorado(valor) {
  let soltar;
  const pedido = () => new Promise((resolver) => (soltar = () => resolver(valor)));
  return { pedido, soltar: () => soltar() };
}

describe('crearUltimoPedido', () => {
  it('descarta la respuesta de un pedido viejo que llega tarde', async () => {
    const correr = crearUltimoPedido();
    const recibidos = [];
    const viejo = pedidoDemorado('datos públicos');
    const pendiente = correr(viejo.pedido, (v) => recibidos.push(v), () => {});
    await correr(async () => 'datos del panel', (v) => recibidos.push(v), () => {});
    viejo.soltar();
    await pendiente;
    expect(recibidos).toEqual(['datos del panel']);
  });

  it('informa el error del último pedido y no el de uno viejo', async () => {
    const correr = crearUltimoPedido();
    const errores = [];
    let fallarViejo;
    const viejo = correr(
      () => new Promise((_, rechazar) => (fallarViejo = () => rechazar(new Error('viejo')))),
      () => {},
      (e) => errores.push(e.message)
    );
    await correr(async () => { throw new Error('último'); }, () => {}, (e) => errores.push(e.message));
    fallarViejo();
    await viejo;
    expect(errores).toEqual(['último']);
  });
});
