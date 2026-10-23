/**
 * Botones Fútbol 11 | Fútbol 7 de la cabecera pública, a lo ancho y debajo del nombre: un toque para
 * pasar de una modalidad a la otra.
 */

import { MODALIDADES } from '../datos/constantes.js';

export function ConmutadorModalidad({ valor, onCambiar }) {
  return (
    <div className="conmutador" role="group" aria-label="Modalidad">
      {MODALIDADES.map((m) => (
        <button
          key={m.id}
          type="button"
          className="conmutador__btn"
          aria-pressed={m.id === valor}
          onClick={() => onCambiar(m.id)}
        >
          {m.nombre}
        </button>
      ))}
    </div>
  );
}
