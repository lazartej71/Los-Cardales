/**
 * Escudo de un equipo (los logos con fondo propio ya vienen dentro de un círculo blanco), o sus iniciales
 * si todavía no tiene.
 * Es decorativo: el nombre del equipo siempre está al lado.
 */

import { iniciales } from '../logica/escudos.js';

export function Escudo({ equipo }) {
  if (equipo?.escudo) {
    return <img className="escudo" src={equipo.escudo} alt="" width="28" height="28" loading="lazy" decoding="async" />;
  }
  return (
    <span className="escudo escudo--iniciales" aria-hidden="true">
      {iniciales(equipo?.nombre)}
    </span>
  );
}
