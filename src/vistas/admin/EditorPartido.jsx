/**
 * Un partido en el panel: resultado (o W.O.), postergar o borrar, lugar y hora, tarjetas y arancel.
 */

import { useState } from 'react';
import { Icono } from '../../componentes/Icono.jsx';
import { Pill } from '../../componentes/Marcador.jsx';
import { Stepper } from '../../componentes/Stepper.jsx';
import { estadoPartido } from '../../logica/consultas.js';
import { tieneResultado } from '../../logica/tabla.js';
import { validarGoles } from '../../logica/validaciones.js';
import { BloqueArancel } from './BloqueArancel.jsx';
import { BloqueLugar } from './BloqueLugar.jsx';
import { BloqueTarjetas } from './BloqueTarjetas.jsx';

export function EditorPartido({ db, partido, numero, local, visitante, zonaLocal, zonaVisitante, acciones, onCambio }) {
  const inicial = (v) => (v === null ? '' : String(v));
  const [golesLocal, setGolesLocal] = useState(inicial(partido.golesLocal));
  const [golesVisitante, setGolesVisitante] = useState(inicial(partido.golesVisitante));
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const jugado = tieneResultado(partido);
  const sinCambios =
    golesLocal === inicial(partido.golesLocal) && golesVisitante === inicial(partido.golesVisitante);
  const idBase = `partido-${partido.id}`;
  const cruce = `${local.nombre} vs ${visitante.nombre}`;
  const [ausente, presente] =
    partido.ausente === 'local' ? [local, visitante] : partido.ausente === 'visitante' ? [visitante, local] : [null, null];

  // Corre un cambio en el servidor; si salió bien, la tabla resalta a los dos equipos
  const ejecutar = async (accion) => {
    setGuardando(true);
    const resultado = await accion();
    setGuardando(false);
    if (resultado) onCambio(partido);
  };

  const guardar = () => {
    const gl = validarGoles(golesLocal);
    const gv = validarGoles(golesVisitante);
    if (gl === null || gv === null) {
      setError('Completá los goles de los dos equipos con números enteros, de 0 en adelante.');
      return;
    }
    setError('');
    const mensaje = `Resultado guardado: ${local.nombre} ${gl}–${gv} ${visitante.nombre}. La tabla ya se actualizó.`;
    ejecutar(() => acciones.guardarResultado(partido.id, gl, gv, mensaje));
  };
  const quitar = () =>
    ejecutar(() => acciones.quitarResultado(partido.id, 'Resultado quitado. El partido volvió a quedar pendiente.'));
  const postergar = () => {
    const mensaje = partido.postergado ? `${cruce} ya no está postergado.` : `${cruce} quedó postergado.`;
    ejecutar(() => acciones.marcarPostergado(partido.id, !partido.postergado, mensaje));
  };
  const borrar = () => ejecutar(() => acciones.borrarPartido(partido.id, `Se borró el partido ${cruce}.`));
  const marcarAusente = (lado) => {
    const [falto, gano] = lado === 'local' ? [local, visitante] : [visitante, local];
    const mensaje = `W.O. guardado: no se presentó ${falto.nombre}. ${gano.nombre} gana 3 a 0.`;
    ejecutar(() => acciones.marcarAusente(partido.id, lado, mensaje));
  };

  const lados = [
    { rol: 'Local', equipo: local, zona: zonaLocal, valor: golesLocal, cambiar: setGolesLocal, id: `${idBase}-local` },
    {
      rol: 'Visitante',
      equipo: visitante,
      zona: zonaVisitante,
      valor: golesVisitante,
      cambiar: setGolesVisitante,
      id: `${idBase}-visitante`,
    },
  ];
  const [tipoEstado, textoEstado] = estadoPartido(partido);

  return (
    <article className="editor" aria-labelledby={`${idBase}-titulo`}>
      <div className="editor__cab">
        <h3 id={`${idBase}-titulo`} className="editor__titulo">
          Fecha {partido.fecha}, partido {numero}
        </h3>
        <Pill tipo={tipoEstado}>{textoEstado}</Pill>
      </div>

      {lados.map((lado) => (
        <div key={lado.rol} className="editor__equipo">
          <label htmlFor={lado.id} className="editor__nombre">
            {lado.equipo.nombre}
            <span className="editor__rol">{lado.zona ? `${lado.rol}, ${lado.zona}` : lado.rol}</span>
          </label>
          <Stepper
            id={lado.id}
            valor={lado.valor}
            etiqueta={`goles de ${lado.equipo.nombre}`}
            invalido={Boolean(error) && validarGoles(lado.valor) === null}
            onCambiar={(v) => {
              lado.cambiar(v);
              setError('');
            }}
          />
        </div>
      ))}

      {error && (
        <p className="campo__error" role="alert">
          {error}
        </p>
      )}

      {ausente ? (
        <p className="editor__wo">{`No se presentó ${ausente.nombre}: ${presente.nombre} gana 3 a 0.`}</p>
      ) : (
        !partido.postergado && (
          <details className="wo">
            <summary>¿No se presentó alguien?</summary>
            <div className="wo__botones">
              {[
                ['local', local],
                ['visitante', visitante],
              ].map(([lado, equipo]) => (
                <button
                  key={lado}
                  type="button"
                  className="btn btn--secundario btn--chico"
                  disabled={guardando}
                  onClick={() => marcarAusente(lado)}
                >
                  {`No se presentó ${equipo.nombre}`}
                </button>
              ))}
            </div>
          </details>
        )
      )}

      <div className="editor__acciones">
        <button type="button" className="btn btn--primario" onClick={guardar} disabled={guardando || (jugado && sinCambios)}>
          {guardando ? (
            'Guardando…'
          ) : jugado && sinCambios ? (
            <>
              <Icono nombre="check" tamano={18} /> Guardado
            </>
          ) : (
            'Guardar'
          )}
        </button>
        {jugado ? (
          <button type="button" className="btn btn--fantasma btn--chico" onClick={quitar} disabled={guardando}>
            Quitar resultado
          </button>
        ) : (
          <>
            <button type="button" className="btn btn--fantasma btn--chico" onClick={postergar} disabled={guardando}>
              {partido.postergado ? 'Quitar postergación' : 'Postergar'}
            </button>
            <button
              type="button"
              className="btn btn--fantasma btn--chico btn--texto-peligro"
              onClick={() => setConfirmarBorrado(true)}
              disabled={guardando || confirmarBorrado}
            >
              <Icono nombre="basura" tamano={16} /> Borrar
            </button>
          </>
        )}
      </div>

      {confirmarBorrado && (
        <div className="confirmar" role="alert">
          <p>¿Borrar el partido {cruce}? Usalo si se cargó por error.</p>
          <button type="button" className="btn btn--peligro btn--chico" onClick={borrar} disabled={guardando}>
            Sí, borrar
          </button>
          <button type="button" className="btn btn--fantasma btn--chico" onClick={() => setConfirmarBorrado(false)}>
            Cancelar
          </button>
        </div>
      )}

      <BloqueLugar partido={partido} acciones={acciones} />
      <BloqueTarjetas db={db} partido={partido} local={local} visitante={visitante} acciones={acciones} />
      <BloqueArancel db={db} partido={partido} local={local} visitante={visitante} acciones={acciones} />
    </article>
  );
}
