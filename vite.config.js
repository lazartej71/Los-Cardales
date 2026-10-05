import { fileURLToPath } from 'node:url';
import { getRequestListener } from '@hono/node-server';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// En desarrollo, /api/* lo atiende la misma API Hono que corre en Vercel.
// En la simulación (vite --mode simulacion) usa una copia de los datos en memoria.
function servidorApi() {
  return {
    name: 'servidor-api',
    apply: 'serve',
    configureServer(server) {
      // La API lee la configuración de process.env, igual que en Vercel
      Object.assign(process.env, loadEnv(server.config.mode, process.cwd(), ''));
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next();
        try {
          const instancia = server.config.mode === 'simulacion' ? '/server/instanciaSimulacion.js' : '/server/instancia.js';
          const { app } = await server.ssrLoadModule(instancia);
          await getRequestListener(app.fetch)(req, res);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), servidorApi()],
  build: {
    // Dos páginas con la misma app: la vista pública y el panel, cada una con su tarjeta para compartir
    rollupOptions: {
      input: {
        publico: fileURLToPath(new URL('./index.html', import.meta.url)),
        panel: fileURLToPath(new URL('./admin.html', import.meta.url)),
      },
    },
  },
});
