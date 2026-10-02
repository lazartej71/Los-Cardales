/**
 * Un partido en la lista del panel: un renglón con los equipos, el resultado y el estado.
 * Al tocarlo se abre (o se cierra) debajo el editor completo, que llega como children.
 */

import { Marcador, Pill } from '../../componentes/Marcador.jsx';
import { estadoPartido } from '../../logica/consultas.js';

export function RenglonPartido({ partido, local, visitante, abierto, onTocar, detalle, children }) {
  const [tipo, texto] = estadoPartido(partido);
  const idEditor = `editor-partido-${partido.id}`;
  return (
    <li className={`renglon${abierto ? ' renglon--abierto' : ''}`} id={`fila-partido-${partido.id}`}>
      <button type="button" className="renglon__boton" aria-expanded={abierto} aria-controls={idEditor} onClick={onTocar}>
        <span className="renglon__equipo">{local.nombre}</span>
        <Marcador partido={partido} />
        <span className="renglon__equipo renglon__equipo--visitante">{visitante.nombre}</span>
        <span className="renglon__flecha" aria-hidden="true">
          {abierto ? '▾' : '›'}
        </span>
        <span className="renglon__estado">
          <Pill tipo={tipo}>{texto}</Pill>
          {detalle && <span className="renglon__detalle">{detalle}</span>}
        </span>
      </button>
      {abierto && (
        <div id={idEditor} className="renglon__editor">
          {children}
        </div>
      )}
    </li>
  );
}
