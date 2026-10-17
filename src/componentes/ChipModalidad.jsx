/**
 * Chip con la modalidad ("FÚTBOL 7") junto al título de cada sección: la dice también con texto, no solo
 * con el color del acento.
 */

import { MODALIDADES } from '../datos/constantes.js';
import { Icono } from './Icono.jsx';

export function ChipModalidad({ modalidad }) {
  return (
    <span className="chip-modalidad">
      <Icono nombre="pelota" tamano={14} />
      {MODALIDADES.find((m) => m.id === modalidad)?.chip}
    </span>
  );
}
