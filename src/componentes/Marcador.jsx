/**
 * Marcador de un partido y etiquetas de estado.
 */

import { esWoDoble, tieneResultado } from '../logica/tabla.js';

/* ---------- Partidos ---------- */
export function Marcador({ partido }) {
  if (!tieneResultado(partido)) return <span className="marcador marcador--vs">vs</span>;
  // W.O. doble: queda 0 a 0 en la base, pero no hubo partido
  if (esWoDoble(partido)) return <span className="marcador marcador--vs">–</span>;
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
