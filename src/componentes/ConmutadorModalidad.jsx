/**
 * Conmutador F11 | F7 de la cabecera pública: un toque para pasar de una modalidad a la otra.
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
          aria-label={m.nombre}
          aria-pressed={m.id === valor}
          onClick={() => onCambiar(m.id)}
        >
          {m.corto}
        </button>
      ))}
    </div>
  );
}
