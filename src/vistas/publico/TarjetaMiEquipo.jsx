/**
 * Tarjeta "Tu equipo" arriba de la tabla: el equipo que la persona sigue, su puesto, sus puntos y su
 * próximo partido. Un toque lleva a la categoría y la zona del equipo.
 */

import { textoProximoPartido } from '../../logica/miEquipo.js';

export function TarjetaMiEquipo({ resumen, nombreDe, onIr }) {
  const { equipo, fila, proximo } = resumen;
  return (
    <button type="button" className="mi-equipo" onClick={onIr}>
      <span className="mi-equipo__titulo">Tu equipo</span>
      <strong className="mi-equipo__nombre">{equipo.nombre}</strong>
      <span className="mi-equipo__puesto">{`${fila.pos}.º · ${fila.pts} ${fila.pts === 1 ? 'punto' : 'puntos'}`}</span>
      <span className="mi-equipo__proximo">
        {proximo ? textoProximoPartido(proximo, equipo.id, nombreDe) : 'No tiene partidos por jugar'}
      </span>
    </button>
  );
}
