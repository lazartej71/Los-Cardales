// Función de Vercel: todas las rutas /api/* llegan acá (ver vercel.json)
import { app } from '../server/instancia.js';

// vercel.json reescribe /api/<ruta> a /api?__ruta=<ruta>: se rearma la ruta original
async function conRutaOriginal(request) {
  const url = new URL(request.url);
  const ruta = url.searchParams.get('__ruta');
  if (ruta === null) return request;
  url.searchParams.delete('__ruta');
  url.pathname = `/api/${ruta}`;
  const llevaCuerpo = !['GET', 'HEAD'].includes(request.method);
  return new Request(url, {
    method: request.method,
    headers: request.headers,
    body: llevaCuerpo ? await request.arrayBuffer() : undefined,
  });
}

export default {
  async fetch(request) {
    return app.fetch(await conRutaOriginal(request));
  },
};
