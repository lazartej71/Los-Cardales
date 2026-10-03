/**
 * El panel se abre en /admin (la portada no tiene botón de admin), también desde admin.loscardalesfutbol.com.
 * Cada parte tiene su manifiesto, así la vista pública y el panel se instalan como dos apps.
 */

import { useCallback, useEffect, useState } from 'react';

export const esPanel = (pathname) => pathname === '/admin' || pathname === '/admin/';

export const manifiestoDe = (pathname) => (esPanel(pathname) ? '/admin.webmanifest' : '/publico.webmanifest');

// Los links y accesos viejos usaban /#admin
export const direccionDelPanelViejo = ({ search, hash }) => (hash === '#admin' ? `/admin${search}` : null);

// En el subdominio del panel no se muestra la vista pública: se va al sitio principal.
// Así la app del panel instalada desde admin.loscardalesfutbol.com no tiene ninguna app pública que la tape.
export const sitioPublicoDesde = (hostname) =>
  hostname.startsWith('admin.') ? `https://www.${hostname.slice('admin.'.length)}/` : null;

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
    const sitio = sitioPublicoDesde(window.location.hostname);
    if (sitio) {
      window.location.assign(sitio);
      return;
    }
    window.history.pushState(null, '', '/' + window.location.search);
    setRuta('/');
  }, []);

  return { enAdmin: esPanel(ruta), salirDelPanel };
}
