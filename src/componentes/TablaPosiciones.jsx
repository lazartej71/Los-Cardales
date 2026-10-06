/**
 * Tabla de posiciones y notas de desempate.
 */

import { CRITERIOS } from '../datos/constantes.js';
import { hayEscudos } from '../logica/escudos.js';
import { Escudo } from './Escudo.jsx';
import { Icono } from './Icono.jsx';

// Diferencia de gol con signo: +3, 0, −2
const formatoDG = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

/* ---------- Tabla de posiciones ----------
   resaltar: { ids: Set, version } para destacar las filas que cambiaron. */
export function TablaPosiciones({ filas, resaltar, etiqueta = 'Tabla de posiciones' }) {
  const columnas = [
    ['pj', 'PJ', 'Partidos jugados'],
    ['pg', 'PG', 'Partidos ganados'],
    ['pe', 'PE', 'Partidos empatados'],
    ['pp', 'PP', 'Partidos perdidos'],
    ['gf', 'GF', 'Goles a favor'],
    ['gc', 'GC', 'Goles en contra'],
    ['dg', 'DG', 'Diferencia de gol'],
  ];
  // Escudos solo si algún equipo de la tabla tiene: si no, se ve como siempre
  const conEscudos = hayEscudos(filas.map((f) => f.equipo));
  return (
    <div className="tabla-scroll" role="region" aria-label={etiqueta} tabIndex={0}>
      <table className={conEscudos ? 'tabla tabla--escudos' : 'tabla'}>
        <thead>
          <tr>
            <th scope="col" className="col-pos"><abbr title="Posición">Pos</abbr></th>
            <th scope="col" className="col-equipo">Equipo</th>
            {columnas.map(([clave, corto, largo]) => (
              <th key={clave} scope="col"><abbr title={largo}>{corto}</abbr></th>
            ))}
            <th scope="col" className="col-pts"><abbr title="Puntos">Pts</abbr></th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const destacada = resaltar && resaltar.ids.has(f.equipo.id);
            const clases = [f.pos <= 2 ? 'fila--top' : '', destacada ? 'fila--flash' : ''].join(' ').trim();
            return (
              <tr key={destacada ? `${f.equipo.id}-${resaltar.version}` : f.equipo.id} className={clases || undefined}>
                <td className="col-pos">
                  <span className={`pos pos--${f.pos}`}>{f.pos}</span>
                </td>
                <th scope="row" className="col-equipo" title={f.equipo.nombre}>
                  {conEscudos ? (
                    <span className="equipo-celda">
                      <Escudo equipo={f.equipo} />
                      <span className="equipo-celda__nombre">{f.equipo.nombre}</span>
                    </span>
                  ) : (
                    f.equipo.nombre
                  )}
                </th>
                {columnas.map(([clave]) => (
                  <td key={clave}>{clave === 'dg' ? formatoDG(f.dg) : f[clave]}</td>
                ))}
                <td className="col-pts">{f.pts}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Explica los desempates que no se resolvieron por el primer criterio
export function NotasDesempate({ filas, criterios }) {
  const notas = filas
    .slice(0, -1)
    .map((fila, i) => ({ arriba: fila, abajo: filas[i + 1], motivo: fila.desempate }))
    .filter((n) => n.motivo && n.motivo !== criterios[0] && CRITERIOS[n.motivo]);
  if (!notas.length) return null;
  return (
    <ul className="notas" aria-label="Desempates">
      {notas.map((n) => (
        <li key={n.arriba.equipo.id}>
          <Icono nombre="info" tamano={16} />
          <span>
            {n.arriba.equipo.nombre} queda arriba de {n.abajo.equipo.nombre} {CRITERIOS[n.motivo].motivo}.
          </span>
        </li>
      ))}
    </ul>
  );
}
