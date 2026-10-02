/**
 * Corre pedidos asincrónicos y entrega solo el resultado del último. Si una respuesta vieja
 * llega tarde (por ejemplo, al pasar de la vista pública al panel), se descarta.
 */
export function crearUltimoPedido() {
  let ultimo = 0;
  return async function correr(pedido, alResolver, alFallar) {
    const numero = ++ultimo;
    try {
      const valor = await pedido();
      if (numero === ultimo) alResolver(valor);
    } catch (error) {
      if (numero === ultimo) alFallar(error);
    }
  };
}
