/**
 * El panel se abre en /admin (la portada no tiene botón de admin).
 * Cada parte tiene su manifiesto, así la vista pública y el panel se instalan como dos apps.
 */

import { useCallback, useEffect, useState } from 'react';

export const esPanel = (pathname) => pathname === '/admin' || pathname === '/admin/';

export const manifiestoDe = (pathname) => (esPanel(pathname) ? '/admin.webmanifest' : '/publico.webmanifest');

// Los links y accesos viejos usaban /#admin
export const direccionDelPanelViejo = ({ search, hash }) => (hash === '#admin' ? `/admin${search}` : null);

const leerRuta = () => (typeof window === 'undefined' ? '/' : window.location.pathname);

export function useRutaAdmin() {
  const [ruta, setRuta] = useState(leerRuta);

  // Chrome ofrece instalar la app que corresponde a la parte abierta
  useEffect(() => {
    let enlace = document.querySelector('link[rel="manifest"]');
    if (!enlace) {
      enlace = document.createElement('link');
      enlace.rel = 'manifest';
      document.head.appendChild(enlace);
    }
    enlace.href = manifiestoDe(ruta);
  }, [ruta]);

  useEffect(() => {
    const alCambiar = () => setRuta(leerRuta());
    window.addEventListener('popstate', alCambiar);
    return () => window.removeEventListener('popstate', alCambiar);
  }, []);

  // Vuelve a la vista pública
  const salirDelPanel = useCallback(() => {
    window.history.pushState(null, '', '/' + window.location.search);
    setRuta('/');
  }, []);

  return { enAdmin: esPanel(ruta), salirDelPanel };
}
