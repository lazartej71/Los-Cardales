/**
 * Tabla de posiciones y notas de desempate.
 */

import { CRITERIOS } from '../datos/constantes.js';
import { hayEscudos } from '../logica/escudos.js';
import { Escudo } from './Escudo.jsx';
import { Icono } from './Icono.jsx';

// Diferencia de gol con signo: +3, 0, −2
const formatoDG = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

// [clave, sigla, nombre, clase]. La clase dice en qué vista de la tabla pública se ve en el celular:
// col-resumen en Resumen y Completa; col-detalle solo en Completa. En el panel no hay vistas.
const COLUMNAS = [
  ['pj', 'PJ', 'Partidos jugados', 'col-resumen'],
  ['pg', 'PG', 'Partidos ganados', 'col-detalle'],
  ['pe', 'PE', 'Partidos empatados', 'col-detalle'],
  ['pp', 'PP', 'Partidos perdidos', 'col-detalle'],
  ['gf', 'GF', 'Goles a favor', 'col-detalle'],
  ['gc', 'GC', 'Goles en contra', 'col-detalle'],
  ['dg', 'DG', 'Diferencia de gol', 'col-resumen'],
];

const PALABRA_RESULTADO = { V: 'ganó', E: 'empató', D: 'perdió' };

// Los últimos resultados en círculos con la letra (no se depende solo del color)
function Racha({ resultados = [] }) {
  if (!resultados.length) {
    return (
      <span className="racha" role="img" aria-label="Sin partidos jugados">
        –
      </span>
    );
  }
  return (
    <span
      className="racha"
      role="img"
      aria-label={`Últimos resultados: ${resultados.map((r) => PALABRA_RESULTADO[r]).join(', ')}`}
    >
      {resultados.map((r, i) => (
        <span key={i} className={`racha__r racha__r--${r.toLowerCase()}`} aria-hidden="true">
          {r}
        </span>
      ))}
    </span>
  );
}

// ▲ o ▼ junto al puesto, con el texto para lectores de pantalla
function Movimiento({ puestos }) {
  if (!puestos) return null;
  const sube = puestos > 0;
  const n = Math.abs(puestos);
  return (
    <>
      <span className={`mov ${sube ? 'mov--sube' : 'mov--baja'}`} aria-hidden="true">
        {sube ? '▲' : '▼'}
      </span>
      <span className="visualmente-oculto">{`${sube ? 'Subió' : 'Bajó'} ${n} ${n === 1 ? 'puesto' : 'puestos'}`}</span>
    </>
  );
}

/* ---------- Tabla de posiciones ----------
   resaltar: { ids: Set, version } para destacar las filas que cambiaron.
   Solo en la vista pública: vista ('resumen' | 'completa' | 'racha'), rachas (Map equipoId → ['V', 'E'…])
   y movimientos (Map equipoId → puestos que subió o bajó). Sin ellas se ve como siempre. */
export function TablaPosiciones({ filas, resaltar, etiqueta = 'Tabla de posiciones', vista, rachas, movimientos }) {
  // Escudos solo si algún equipo de la tabla tiene: si no, se ve como siempre
  const conEscudos = hayEscudos(filas.map((f) => f.equipo));
  const conRacha = vista === 'racha' && Boolean(rachas);
  return (
    <div className="tabla-scroll" role="region" aria-label={etiqueta} tabIndex={0} data-vista={vista}>
      <table className={conEscudos ? 'tabla tabla--escudos' : 'tabla'}>
        <thead>
          <tr>
            <th scope="col" className="col-pos"><abbr title="Posición">Pos</abbr></th>
            <th scope="col" className="col-equipo">Equipo</th>
            {COLUMNAS.map(([clave, corto, largo, clase]) => (
              <th key={clave} scope="col" className={clase}><abbr title={largo}>{corto}</abbr></th>
            ))}
            {conRacha && (
              <th scope="col" className="col-racha"><abbr title="Últimos partidos">Últimos</abbr></th>
            )}
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
                  {movimientos && <Movimiento puestos={movimientos.get(f.equipo.id)} />}
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
                {COLUMNAS.map(([clave, , , clase]) => (
                  <td key={clave} className={clase}>{clave === 'dg' ? formatoDG(f.dg) : f[clave]}</td>
                ))}
                {conRacha && (
                  <td className="col-racha">
                    <Racha resultados={rachas.get(f.equipo.id)} />
                  </td>
                )}
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
