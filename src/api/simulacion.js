// true cuando la app corre con `npm run simulacion` (vite --mode simulacion). En la versión publicada es siempre false.
export const SIMULACION = import.meta.env.MODE === 'simulacion';
