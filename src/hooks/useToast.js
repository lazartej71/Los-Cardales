/**
 * Estado de los avisos flotantes.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------- Avisos flotantes (toasts) ---------- */
export function useToast() {
  const [toast, setToast] = useState(null);
  const temporizador = useRef(null);
  const avisar = useCallback((texto, tipo = 'ok') => {
    clearTimeout(temporizador.current);
    setToast({ texto, tipo, id: Date.now() });
    temporizador.current = setTimeout(() => setToast(null), 3400);
  }, []);
  useEffect(() => () => clearTimeout(temporizador.current), []);
  return [toast, avisar];
}
