/**
 * Marcador de un partido y etiquetas de estado.
 */

import { tieneResultado } from '../logica/tabla.js';

/* ---------- Partidos ---------- */
export function Marcador({ partido }) {
  if (!tieneResultado(partido)) return <span className="marcador marcador--vs">vs</span>;
  return (
    <span className="marcador" aria-label={`${partido.golesLocal} a ${partido.golesVisitante}`}>
      <span>{partido.golesLocal}</span>
      <span className="marcador__sep" aria-hidden="true">–</span>
      <span>{partido.golesVisitante}</span>
    </span>
  );
}

export function Pill({ tipo, children }) {
  return <span className={`pill pill--${tipo}`}>{children}</span>;
}
