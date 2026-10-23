/**
 * Secciones de la vista pública: posiciones, fixture y resultados por fecha.
 */

import { Escudo } from '../../componentes/Escudo.jsx';
import { Marcador, Pill } from '../../componentes/Marcador.jsx';
import { Segmentado } from '../../componentes/Segmentado.jsx';
import { TablaPosiciones } from '../../componentes/TablaPosiciones.jsx';
import { ETIQUETA_ESTADO_FECHA, estadoFecha, ultimaFechaJugada } from '../../logica/consultas.js';
import { fraseDesempate } from '../../logica/desempate.js';
import { equiposDePartidos, hayEscudos } from '../../logica/escudos.js';
import { textoDia, textoLugar } from '../../logica/lugar.js';
import { esWoDoble, tieneResultado } from '../../logica/tabla.js';
import { TarjetaMiEquipo } from './TarjetaMiEquipo.jsx';

// ¿Juega el equipo que sigue la persona? (para resaltar su partido)
const esDeMiEquipo = (partido, miEquipoId) =>
  miEquipoId !== null && (partido.localId === miEquipoId || partido.visitanteId === miEquipoId);

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

// Si algún equipo de estos partidos tiene escudo: si no, la lista se ve como siempre
const conEscudosEn = (partidos, info) => hayEscudos(equiposDePartidos(partidos, info.equipoDe));

// Vistas de la tabla en el celular (en pantallas anchas se ve siempre la completa)
const VISTAS_TABLA = [
  { valor: 'resumen', etiqueta: 'Resumen' },
  { valor: 'completa', etiqueta: 'Completa' },
  { valor: 'racha', etiqueta: 'Racha' },
];

export function SeccionPosiciones({
  activa,
  filas,
  criterios,
  partidos,
  conTablaInicial,
  chip = null,
  vista = 'resumen',
  onVista,
  rachas,
  movimientos,
  resumenEquipo = null,
  miEquipoId = null,
  onMiEquipo,
  onIrAMiEquipo,
  nombreDe,
}) {
  const ultima = ultimaFechaJugada(partidos, conTablaInicial);
  // La regla de desempate, una sola vez y siempre igual (el panel sigue mostrando las notas por pareja)
  const frase = fraseDesempate(criterios);
  return (
    <section
      className={`seccion seccion--posiciones${activa ? ' seccion--activa' : ''}`}
      aria-labelledby="titulo-posiciones"
    >
      <div className="seccion__cab">
        <h2 id="titulo-posiciones" className="seccion__titulo">Posiciones</h2>
        {chip}
        <span className="seccion__meta">{ultima > 0 ? `Hasta la fecha ${ultima}` : 'Todavía sin partidos jugados'}</span>
      </div>
      {resumenEquipo && <TarjetaMiEquipo resumen={resumenEquipo} nombreDe={nombreDe} onIr={onIrAMiEquipo} />}
      <div className="vistas-tabla">
        <Segmentado
          variante="vistas"
          etiquetaGrupo="Vista de la tabla"
          opciones={VISTAS_TABLA}
          valor={vista}
          onCambiar={onVista}
        />
      </div>
      <TablaPosiciones
        filas={filas}
        vista={vista}
        rachas={rachas}
        movimientos={movimientos}
        miEquipoId={miEquipoId}
        onMiEquipo={onMiEquipo}
      />
      {frase && <p className="frase-desempate">{frase}</p>}
      {!resumenEquipo && <p className="frase-desempate">Tocá la estrella de tu equipo para seguirlo.</p>}
    </section>
  );
}

// Postergados reprogramados para un día especial que falta jugar, por día y hora
function reprogramadosPorJugar(fechas) {
  return fechas
    .flatMap((f) => f.partidos)
    .filter((p) => p.postergado && p.dia && p.predio)
    .sort((a, b) => a.dia.localeCompare(b.dia) || a.hora.localeCompare(b.hora) || a.id - b.id);
}

// Cada fecha se pliega: viene abierta solo la que se está jugando. Arriba, aparte y abiertos, los
// postergados que se recuperan en un día especial (no son una fecha más)
export function SeccionFixture({ activa, fechas, fechaEnJuego, info, conTablaInicial, chip = null, miEquipoId = null }) {
  const reprogramados = reprogramadosPorJugar(fechas);
  const escudosReprogramados = conEscudosEn(reprogramados, info);
  const claseMio = (p) => (esDeMiEquipo(p, miEquipoId) ? 'partido--mio' : undefined);
  return (
    <section className={`seccion seccion--fixture${activa ? ' seccion--activa' : ''}`} aria-labelledby="titulo-fixture">
      <div className="seccion__cab">
        <h2 id="titulo-fixture" className="seccion__titulo">Fixture</h2>
        {chip}
      </div>
      {fechas.length === 0 && <p className="vacio-texto">Todavía no hay partidos programados.</p>}
      {reprogramados.length > 0 && (
        <details className="fecha-bloque fecha-bloque--postergados" open>
          <summary className="fecha-bloque__cab">
            <h3 className="fecha-bloque__titulo">Postergados</h3>
            <Pill tipo="postergado">{reprogramados.length === 1 ? '1 por jugar' : `${reprogramados.length} por jugar`}</Pill>
          </summary>
          <ul className="lista-partidos">
            {reprogramados.map((p) => (
              <li key={p.id} className={claseMio(p)}>
                <p className="partido-origen">{`Postergado de la fecha ${p.fecha}`}</p>
                <LineaPartido partido={p} info={info} conEscudos={escudosReprogramados} />
                <p className="lugar">
                  <strong>{textoLugar(p)}</strong>
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
      {fechas.map(({ fecha, partidos }) => {
        const esFechaInicial = fecha === 1 && conTablaInicial;
        const estado = esFechaInicial ? 'jugada' : estadoFecha(partidos);
        const conEscudos = conEscudosEn(partidos, info);
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
                  <li key={p.id} className={claseMio(p)}>
                    <LineaPartido partido={p} info={info} conEscudos={conEscudos} />
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
// Si ya se reprogramó para un día especial, cuándo se juega (el detalle está en el bloque Postergados).
function EtiquetaLugar({ partido }) {
  const texto = textoLugar(partido);
  if (!texto) return null;
  if (partido.postergado && partido.dia) {
    const dia = textoDia(partido.dia);
    return (
      <p className="lugar">
        <strong>{`Se juega el ${dia[0].toLowerCase()}${dia.slice(1)}`}</strong>
      </p>
    );
  }
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

// El nombre del equipo y, si la lista tiene escudos, su escudo. Los estilos lo ponen arriba del nombre
// en el fixture y al lado en los resultados.
function EquipoConEscudo({ id, info, conEscudos }) {
  if (!conEscudos) return <NombreEquipo id={id} info={info} />;
  return (
    <>
      <Escudo equipo={info.equipoDe(id)} />
      <span className="equipo-nombre">
        <NombreEquipo id={id} info={info} />
      </span>
    </>
  );
}

// Una línea del fixture: local, marcador (o "vs") y visitante
function LineaPartido({ partido, info, conEscudos = false }) {
  const jugado = tieneResultado(partido);
  const diferencia = jugado ? partido.golesLocal - partido.golesVisitante : 0;
  return (
    <div className={conEscudos ? 'partido-linea partido-linea--escudos' : 'partido-linea'}>
      <span className={`partido-linea__equipo partido-linea__equipo--local${diferencia < 0 ? ' es-perdedor' : ''}`}>
        <EquipoConEscudo id={partido.localId} info={info} conEscudos={conEscudos} />
      </span>
      <span className="partido-linea__centro">
        <Marcador partido={partido} />
        {!jugado && <EtiquetaPendiente partido={partido} />}
        {partido.ausente && <Pill tipo="wo">{esWoDoble(partido) ? 'W.O. doble' : 'W.O.'}</Pill>}
      </span>
      <span className={`partido-linea__equipo${diferencia > 0 ? ' es-perdedor' : ''}`}>
        <EquipoConEscudo id={partido.visitanteId} info={info} conEscudos={conEscudos} />
      </span>
    </div>
  );
}

export function SeccionResultados({
  activa,
  fechas,
  fecha,
  onFecha,
  info,
  conTablaInicial,
  chip = null,
  miEquipoId = null,
}) {
  const actual = fechas.find((f) => f.fecha === fecha) || fechas[0];
  const jugados = actual ? actual.partidos.filter(tieneResultado) : [];
  const goles = jugados.reduce((total, p) => total + p.golesLocal + p.golesVisitante, 0);
  const esFechaInicial = actual && actual.fecha === 1 && conTablaInicial;
  const conEscudos = actual ? conEscudosEn(actual.partidos, info) : false;

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
        {chip}
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
            <TarjetaResultado
              key={p.id}
              partido={p}
              info={info}
              conEscudos={conEscudos}
              mio={esDeMiEquipo(p, miEquipoId)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// Resultado con estilo de tablero: un renglón por equipo con sus goles
function TarjetaResultado({ partido, info, conEscudos = false, mio = false }) {
  const jugado = tieneResultado(partido);
  const diferencia = jugado ? partido.golesLocal - partido.golesVisitante : 0;
  const renglones = [
    { id: partido.localId, lado: 'local', goles: partido.golesLocal, pierde: diferencia < 0 },
    { id: partido.visitanteId, lado: 'visitante', goles: partido.golesVisitante, pierde: diferencia > 0 },
  ];
  const ganador = info.nombreDe(diferencia > 0 ? partido.localId : partido.visitanteId);
  const doble = esWoDoble(partido);
  const ausente = partido.ausente ? info.nombreDe(partido.ausente === 'local' ? partido.localId : partido.visitanteId) : null;
  let final = diferencia === 0 ? 'Terminó empatado' : `Ganó ${ganador}`;
  if (doble) final = 'W.O. doble: no se presentó ninguno';
  else if (ausente) final = `Ganó ${ganador} por W.O.: no se presentó ${ausente}`;
  return (
    <article
      className={`resultado${jugado ? '' : ' resultado--pendiente'}${conEscudos ? ' resultado--escudos' : ''}${mio ? ' resultado--mio' : ''}`}
    >
      {renglones.map((r) => (
        <div key={r.lado} className={`resultado__fila${jugado && r.pierde ? ' resultado__fila--perdedor' : ''}`}>
          <span className="resultado__equipo">
            <EquipoConEscudo id={r.id} info={info} conEscudos={conEscudos} />
          </span>
          <span className="resultado__goles">{jugado && !doble ? r.goles : '–'}</span>
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
