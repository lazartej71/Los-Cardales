/**
 * Lugar y hora dentro del editor del partido: se cambian si mueven el horario
 * y se completan en los partidos viejos que no los tienen.
 */

import { useState } from 'react';
import { textoLugar, validarLugar } from '../../logica/lugar.js';
import { CamposLugar, lugarDePartido, lugarParaGuardar } from './CamposLugar.jsx';

export function BloqueLugar({ partido, acciones }) {
  const inicial = lugarDePartido(partido);
  const [lugar, setLugar] = useState(inicial);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const sinCambios = lugar.predio === inicial.predio && lugar.cancha === inicial.cancha && lugar.hora === inicial.hora;
  const idBase = `lugar-${partido.id}`;

  const guardar = async () => {
    const validado = validarLugar(lugarParaGuardar(lugar));
    if (validado.error) {
      setError(validado.error);
      return;
    }
    setGuardando(true);
    await acciones.guardarLugar(partido.id, validado.valor, `Lugar guardado: ${textoLugar(validado.valor)}.`);
    setGuardando(false);
  };

  return (
    // Viene abierto si al partido todavía le falta el lugar
    <details className="bloque" open={!partido.predio}>
      <summary className="bloque__cab">
        <span className="bloque__titulo">Lugar y hora</span>
        <span className="bloque__resumen">{textoLugar(partido) || 'Sin cargar'}</span>
      </summary>
      <div className="bloque__cuerpo">
        <CamposLugar
          idBase={idBase}
          lugar={lugar}
          invalido={Boolean(error)}
          onCambiar={(nuevo) => {
            setLugar(nuevo);
            setError('');
          }}
        />
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
          {guardando ? 'Guardando…' : 'Guardar lugar'}
        </button>
      </div>
    </details>
  );
}
