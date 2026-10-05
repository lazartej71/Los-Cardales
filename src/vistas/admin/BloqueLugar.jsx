/**
 * Lugar y hora dentro del editor del partido: se cambian si mueven el horario
 * y se completan en los partidos viejos que no los tienen.
 * En un postergado es "Reprogramar": además pide el día especial en que se recupera
 * (sigue postergado hasta que se le carga el resultado).
 */

import { useState } from 'react';
import { textoLugar, validarLugar } from '../../logica/lugar.js';
import { CamposLugar, lugarDePartido, lugarParaGuardar } from './CamposLugar.jsx';

export function BloqueLugar({ partido, acciones }) {
  const reprogramar = partido.postergado;
  const inicial = { ...lugarDePartido(partido), dia: partido.dia ?? '' };
  const [lugar, setLugar] = useState(inicial);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const sinCambios = ['predio', 'cancha', 'hora', 'dia'].every((clave) => lugar[clave] === inicial[clave]);
  const idBase = `lugar-${partido.id}`;

  const guardar = async () => {
    if (reprogramar && !lugar.dia) {
      setError('Elegí el día.');
      return;
    }
    const validado = validarLugar(lugarParaGuardar(lugar));
    if (validado.error) {
      setError(validado.error);
      return;
    }
    setGuardando(true);
    if (reprogramar) {
      const valor = { dia: lugar.dia, ...validado.valor };
      await acciones.guardarLugar(partido.id, valor, `Reprogramado: ${textoLugar(valor)}. Sigue postergado hasta que se cargue el resultado.`);
    } else {
      await acciones.guardarLugar(partido.id, validado.valor, `Lugar guardado: ${textoLugar(validado.valor)}.`);
    }
    setGuardando(false);
  };

  const cambiar = (nuevo) => {
    setLugar(nuevo);
    setError('');
  };

  return (
    // Viene abierto si al partido todavía le falta el lugar (o, si está postergado, el día)
    <details className="bloque" open={reprogramar ? !partido.dia : !partido.predio}>
      <summary className="bloque__cab">
        <span className="bloque__titulo">{reprogramar ? 'Reprogramar' : 'Lugar y hora'}</span>
        <span className="bloque__resumen">
          {reprogramar ? (partido.dia ? textoLugar(partido) : 'Sin reprogramar') : textoLugar(partido) || 'Sin cargar'}
        </span>
      </summary>
      <div className="bloque__cuerpo">
        {reprogramar && (
          <div className="campo">
            <label className="campo__label" htmlFor={`${idBase}-dia`}>
              Día
            </label>
            <input
              id={`${idBase}-dia`}
              className="input"
              type="date"
              value={lugar.dia}
              aria-invalid={(Boolean(error) && !lugar.dia) || undefined}
              onChange={(e) => cambiar({ ...lugar, dia: e.target.value })}
            />
          </div>
        )}
        <CamposLugar idBase={idBase} lugar={lugar} invalido={Boolean(error)} onCambiar={(nuevo) => cambiar({ ...nuevo, dia: lugar.dia })} />
        {error && (
          <p className="campo__error" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          className="btn btn--secundario btn--chico"
          disabled={guardando || sinCambios}
          onClick={guardar}
        >
          {guardando ? 'Guardando…' : reprogramar ? 'Guardar reprogramación' : 'Guardar lugar'}
        </button>
      </div>
    </details>
  );
}
