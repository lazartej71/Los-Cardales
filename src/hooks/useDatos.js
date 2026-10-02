/**
 * Datos del campeonato. En modo 'publico' pide /api/publico y se actualiza solo;
 * en modo 'admin' pide /api/admin/datos con el token de la sesión.
 * Si un pedido falla, se conservan los datos que ya había y se informa el error.
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/cliente.js';
import { crearUltimoPedido } from './ultimoPedido.js';

// La vista pública no recibe lo privado: el panel lo trae siempre
const conValoresPorDefecto = (datos) => ({ expulsiones: [], tarjetas: [], movimientos: [], tablaInicial: [], ...datos });

export function useDatos({ modo, token }) {
  const [estado, setEstado] = useState({ db: null, modoCargado: null, error: null });
  // Si una respuesta vieja llega tarde (por ejemplo, la pública después de entrar al panel), se descarta
  const [correr] = useState(crearUltimoPedido);

  const recargar = useCallback(
    () =>
      correr(
        () => (modo === 'admin' ? api.datosAdmin(token) : api.publico()),
        (datos) => setEstado({ db: conValoresPorDefecto(datos), modoCargado: modo, error: null }),
        (error) => setEstado((anterior) => ({ ...anterior, error }))
      ),
    [correr, modo, token]
  );

  useEffect(() => {
    // Pedir los datos al servidor al abrir la pantalla es sincronizar con un sistema externo:
    // el estado se actualiza recién cuando llega la respuesta.
    // oxlint-disable-next-line react/set-state-in-effect
    recargar();
  }, [recargar]);

  // La vista pública se actualiza cada minuto y al volver a la pestaña
  useEffect(() => {
    if (modo !== 'publico') return undefined;
    const intervalo = setInterval(recargar, 60000);
    const alVolver = () => {
      if (document.visibilityState === 'visible') recargar();
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [modo, recargar]);

  // Mientras llegan los datos del modo nuevo (por ejemplo, al entrar al panel) no se muestran los viejos
  return { db: estado.modoCargado === modo ? estado.db : null, error: estado.error, recargar };
}
