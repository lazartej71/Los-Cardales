/**
 * Panel → Equipos: el escudo de un equipo (lo ve solo el superadmin). Se elige la imagen grande, el
 * navegador la recorta y la achica, y se ve cómo queda antes de guardarla.
 */

import { useRef, useState } from 'react';
import { Escudo } from '../../componentes/Escudo.jsx';
import { formatearPeso } from '../../logica/escudos.js';
import { prepararEscudo } from '../../logica/prepararEscudo.js';

export function BloqueEscudo({ equipo, acciones }) {
  // La imagen elegida, ya preparada y todavía sin guardar: { imagen, pesoOriginal, peso }
  const [previa, setPrevia] = useState(null);
  const [error, setError] = useState('');
  // null, o qué está haciendo: 'preparando', 'guardando' o 'quitando'
  const [ocupado, setOcupado] = useState(null);
  const [confirmarQuitar, setConfirmarQuitar] = useState(false);
  const entrada = useRef(null);

  const elegir = async (evento) => {
    const archivo = evento.target.files?.[0];
    evento.target.value = ''; // así se puede volver a elegir el mismo archivo
    if (!archivo) return;
    setError('');
    setOcupado('preparando');
    try {
      setPrevia(await prepararEscudo(archivo));
    } catch (e) {
      setError(e.message);
    }
    setOcupado(null);
  };

  const guardar = async () => {
    setOcupado('guardando');
    const guardado = await acciones.subirEscudo(equipo.id, previa.imagen, `Escudo guardado en ${equipo.nombre}.`);
    setOcupado(null);
    if (guardado) setPrevia(null);
  };

  const quitar = async () => {
    setOcupado('quitando');
    await acciones.quitarEscudo(equipo.id, `Escudo quitado de ${equipo.nombre}.`);
    setOcupado(null);
    setConfirmarQuitar(false);
  };

  const elegirArchivo = () => entrada.current?.click();
  const textoElegir = (texto) => (ocupado === 'preparando' ? 'Preparando…' : texto);

  let contenido;
  if (previa) {
    contenido = (
      <>
        <div className="bloque-escudo__previa">
          <img className="bloque-escudo__grande" src={previa.imagen} alt={`Escudo nuevo de ${equipo.nombre}`} />
          <p className="bloque-escudo__peso">
            {`${formatearPeso(previa.pesoOriginal)} → `}
            <strong>{formatearPeso(previa.peso)}</strong>
          </p>
        </div>
        <p className="bloque-escudo__ayuda">Así se ve en la tabla:</p>
        <div className="bloque-escudo__fila">
          <span className="pos pos--1">1</span>
          <Escudo equipo={{ ...equipo, escudo: previa.imagen }} />
          <span>{equipo.nombre}</span>
        </div>
        <div className="bloque-escudo__acciones">
          <button type="button" className="btn btn--primario btn--chico" onClick={guardar} disabled={ocupado !== null}>
            {ocupado === 'guardando' ? 'Guardando…' : 'Guardar escudo'}
          </button>
          <button
            type="button"
            className="btn btn--fantasma btn--chico"
            onClick={() => setPrevia(null)}
            disabled={ocupado !== null}
          >
            Cancelar
          </button>
        </div>
      </>
    );
  } else if (confirmarQuitar) {
    contenido = (
      <div className="confirmar" role="alert">
        <p>{`¿Quitar el escudo de ${equipo.nombre}?`}</p>
        <button type="button" className="btn btn--peligro btn--chico" onClick={quitar} disabled={ocupado !== null}>
          {ocupado === 'quitando' ? 'Quitando…' : 'Sí, quitar'}
        </button>
        <button type="button" className="btn btn--fantasma btn--chico" onClick={() => setConfirmarQuitar(false)}>
          Cancelar
        </button>
      </div>
    );
  } else if (equipo.escudo) {
    contenido = (
      <div className="bloque-escudo__acciones">
        <button type="button" className="btn btn--secundario btn--chico" onClick={elegirArchivo} disabled={ocupado !== null}>
          {textoElegir('Cambiar escudo')}
        </button>
        <button
          type="button"
          className="btn btn--fantasma btn--chico btn--texto-peligro"
          onClick={() => setConfirmarQuitar(true)}
          disabled={ocupado !== null}
        >
          Quitar
        </button>
      </div>
    );
  } else {
    contenido = (
      <>
        <p className="bloque-escudo__ayuda">
          Todavía no tiene. Subí la imagen grande y la app la achica sola. Si podés, que sea PNG con fondo transparente.
        </p>
        <div className="bloque-escudo__acciones">
          <button type="button" className="btn btn--secundario btn--chico" onClick={elegirArchivo} disabled={ocupado !== null}>
            {textoElegir('Subir escudo')}
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="bloque-escudo">
      <p className="bloque-escudo__titulo">{previa ? 'Escudo · vista previa' : 'Escudo'}</p>
      <input
        ref={entrada}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="visualmente-oculto"
        tabIndex={-1}
        aria-hidden="true"
        onChange={elegir}
      />
      {contenido}
      {error && (
        <p className="campo__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
