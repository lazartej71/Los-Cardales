/**
 * Secciones de la vista pública: posiciones, fixture y resultados por fecha.
 */

import { Icono } from '../../componentes/Icono.jsx';
import { Marcador, Pill } from '../../componentes/Marcador.jsx';
import { Segmentado } from '../../componentes/Segmentado.jsx';
import { NotasDesempate, TablaPosiciones } from '../../componentes/TablaPosiciones.jsx';
import { ETIQUETA_ESTADO_FECHA, estadoFecha } from '../../logica/consultas.js';
import { textoLugar } from '../../logica/lugar.js';
import { tieneResultado } from '../../logica/tabla.js';

export function BannerInstalar({ onCerrar }) {
  return (
    <aside className="instalar" aria-label="Instalar la app">
      <span className="instalar__icono">
        <Icono nombre="celular" />
      </span>
      <div>
        <p className="instalar__titulo">Instalá la app en tu celular</p>
        <ul className="instalar__pasos">
          <li>
            <strong>Android:</strong> Menú ⋮ → Agregar a pantalla de inicio
          </li>
          <li>
            <strong>iPhone:</strong> Compartir ⬆️ → Agregar a pantalla de inicio
          </li>
        </ul>
      </div>
      <button type="button" className="instalar__cerrar" onClick={onCerrar} aria-label="Cerrar aviso de instalación">
        <Icono nombre="cerrar" tamano={18} />
      </button>
    </aside>
  );
}

// Aclaración de la fecha que se cargó como tabla inicial (sin el detalle de los partidos)
function NotaFechaInicial({ hayPostergados }) {
  return (
    <p className="nota-fecha">
      Los resultados de esta fecha se cargaron directo en la tabla de posiciones.
      {hayPostergados ? ' Estos partidos quedaron postergados:' : ''}
    </p>
  );
}

function EtiquetaPendiente({ partido }) {
  return partido.postergado ? <Pill tipo="postergado">Postergado</Pill> : <Pill tipo="pendiente">Pendiente</Pill>;
}

export function SeccionPosiciones({ activa, filas, criterios, partidos, conTablaInicial }) {
  const fechasJugadas = partidos.filter(tieneResultado).map((p) => p.fecha);
  const ultima = Math.max(conTablaInicial ? 1 : 0, ...fechasJugadas);
  return (
    <section
      className={`seccion seccion--posiciones${activa ? ' seccion--activa' : ''}`}
      aria-labelledby="titulo-posiciones"
    >
      <div className="seccion__cab">
        <h2 id="titulo-posiciones" className="seccion__titulo">Posiciones</h2>
        <span className="seccion__meta">{ultima > 0 ? `Hasta la fecha ${ultima}` : 'Todavía sin partidos jugados'}</span>
      </div>
      <TablaPosiciones filas={filas} />
      <NotasDesempate filas={filas} criterios={criterios} />
    </section>
  );
}

// Cada fecha se pliega: viene abierta solo la que se está jugando
export function SeccionFixture({ activa, fechas, fechaEnJuego, info, conTablaInicial }) {
  return (
    <section className={`seccion seccion--fixture${activa ? ' seccion--activa' : ''}`} aria-labelledby="titulo-fixture">
      <div className="seccion__cab">
        <h2 id="titulo-fixture" className="seccion__titulo">Fixture</h2>
      </div>
      {fechas.length === 0 && <p className="vacio-texto">Todavía no hay partidos programados.</p>}
      {fechas.map(({ fecha, partidos }) => {
        const esFechaInicial = fecha === 1 && conTablaInicial;
        const estado = esFechaInicial ? 'jugada' : estadoFecha(partidos);
        return (
          <details key={fecha} className="fecha-bloque" open={fecha === fechaEnJuego}>
            <summary className="fecha-bloque__cab">
              <h3 className="fecha-bloque__titulo">{`Fecha ${fecha}`}</h3>
              <Pill tipo={estado}>{ETIQUETA_ESTADO_FECHA[estado]}</Pill>
            </summary>
            {esFechaInicial && <NotaFechaInicial hayPostergados={partidos.length > 0} />}
            {partidos.length > 0 && (
              <ul className="lista-partidos">
                {partidos.map((p) => (
                  <li key={p.id}>
                    <LineaPartido partido={p} info={info} />
                    <EtiquetaLugar partido={p} />
                  </li>
                ))}
              </ul>
            )}
          </details>
        );
      })}
    </section>
  );
}

// Dónde y a qué hora se juega, bien visible. Si el partido se postergó, tachado: ese lugar ya no vale.
function EtiquetaLugar({ partido }) {
  const texto = textoLugar(partido);
  if (!texto) return null;
  return (
    <p className={partido.postergado ? 'lugar lugar--tachado' : 'lugar'}>
      <strong>{texto}</strong>
    </p>
  );
}

// Nombre del equipo y, si es de otra zona, cuál
function NombreEquipo({ id, info }) {
  const zonaAjena = info.zonaAjena(id);
  return (
    <>
      {info.nombreDe(id)}
      {zonaAjena && <small className="partido-linea__zona">{zonaAjena}</small>}
    </>
  );
}

// Una línea del fixture: local, marcador (o "vs") y visitante
function LineaPartido({ partido, info }) {
  const jugado = tieneResultado(partido);
  const diferencia = jugado ? partido.golesLocal - partido.golesVisitante : 0;
  return (
    <div className="partido-linea">
      <span className={`partido-linea__equipo partido-linea__equipo--local${diferencia < 0 ? ' es-perdedor' : ''}`}>
        <NombreEquipo id={partido.localId} info={info} />
      </span>
      <span className="partido-linea__centro">
        <Marcador partido={partido} />
        {!jugado && <EtiquetaPendiente partido={partido} />}
        {partido.ausente && <Pill tipo="wo">W.O.</Pill>}
      </span>
      <span className={`partido-linea__equipo${diferencia > 0 ? ' es-perdedor' : ''}`}>
        <NombreEquipo id={partido.visitanteId} info={info} />
      </span>
    </div>
  );
}

export function SeccionResultados({ activa, fechas, fecha, onFecha, info, conTablaInicial }) {
  const actual = fechas.find((f) => f.fecha === fecha) || fechas[0];
  const jugados = actual ? actual.partidos.filter(tieneResultado) : [];
  const goles = jugados.reduce((total, p) => total + p.golesLocal + p.golesVisitante, 0);
  const esFechaInicial = actual && actual.fecha === 1 && conTablaInicial;

  let resumen = 'Esta fecha todavía no se jugó.';
  if (!actual) resumen = 'Todavía no hay partidos programados.';
  else if (esFechaInicial) resumen = '';
  else if (jugados.length > 0) {
    const textoPartidos = jugados.length === 1 ? '1 partido jugado' : `${jugados.length} partidos jugados`;
    const textoGoles = goles === 1 ? '1 gol' : `${goles} goles`;
    resumen = `${textoPartidos} y ${textoGoles} en total.`;
  }

  return (
    <section
      className={`seccion seccion--resultados${activa ? ' seccion--activa' : ''}`}
      aria-labelledby="titulo-resultados"
    >
      <div className="seccion__cab">
        <h2 id="titulo-resultados" className="seccion__titulo">Resultados por fecha</h2>
      </div>
      {fechas.length > 0 && (
        <Segmentado
          variante="chips"
          etiquetaGrupo="Fecha"
          opciones={fechas.map((f) => ({ valor: f.fecha, etiqueta: `Fecha ${f.fecha}` }))}
          valor={actual ? actual.fecha : null}
          onCambiar={onFecha}
        />
      )}
      {esFechaInicial && <NotaFechaInicial hayPostergados={actual.partidos.length > 0} />}
      {resumen && <p className="resumen-fecha">{resumen}</p>}
      {actual && actual.partidos.length > 0 && (
        <div className="resultados-lista">
          {actual.partidos.map((p) => (
            <TarjetaResultado key={p.id} partido={p} info={info} />
          ))}
        </div>
      )}
    </section>
  );
}

// Resultado con estilo de tablero: un renglón por equipo con sus goles
function TarjetaResultado({ partido, info }) {
  const jugado = tieneResultado(partido);
  const diferencia = jugado ? partido.golesLocal - partido.golesVisitante : 0;
  const renglones = [
    { id: partido.localId, lado: 'local', goles: partido.golesLocal, pierde: diferencia < 0 },
    { id: partido.visitanteId, lado: 'visitante', goles: partido.golesVisitante, pierde: diferencia > 0 },
  ];
  const ganador = info.nombreDe(diferencia > 0 ? partido.localId : partido.visitanteId);
  const ausente = partido.ausente ? info.nombreDe(partido.ausente === 'local' ? partido.localId : partido.visitanteId) : null;
  const final = ausente
    ? `Ganó ${ganador} por W.O.: no se presentó ${ausente}`
    : diferencia === 0
      ? 'Terminó empatado'
      : `Ganó ${ganador}`;
  return (
    <article className={`resultado${jugado ? '' : ' resultado--pendiente'}`}>
      {renglones.map((r) => (
        <div key={r.lado} className={`resultado__fila${jugado && r.pierde ? ' resultado__fila--perdedor' : ''}`}>
          <span className="resultado__equipo">
            <NombreEquipo id={r.id} info={info} />
          </span>
          <span className="resultado__goles">{jugado ? r.goles : '–'}</span>
        </div>
      ))}
      <div className="resultado__pie">
        {jugado ? (
          <span>{final}</span>
        ) : (
          <>
            <span>Sin resultado</span>
            <EtiquetaPendiente partido={partido} />
          </>
        )}
      </div>
    </article>
  );
}
