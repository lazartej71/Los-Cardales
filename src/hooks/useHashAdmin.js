/**
 * El panel se abre agregando #admin a la dirección (la portada no tiene botón de admin).
 */

import { useCallback, useEffect, useState } from 'react';

const leerHash = () => (typeof window === 'undefined' ? '' : window.location.hash);

export function useHashAdmin() {
  const [hash, setHash] = useState(leerHash);

  useEffect(() => {
    const alCambiar = () => setHash(leerHash());
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);

  // Vuelve a la vista pública sacando el #admin de la dirección
  const salirDelPanel = useCallback(() => {
    window.history.pushState(null, '', window.location.pathname + window.location.search);
    setHash('');
  }, []);

  return { enAdmin: hash === '#admin', salirDelPanel };
}
