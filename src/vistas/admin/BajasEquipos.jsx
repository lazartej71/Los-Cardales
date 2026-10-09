/**
 * Panel → Equipos: dar de baja un equipo (deja la tabla; lo jugado queda como está) y la lista de los
 * dados de baja, con el botón para volver a darlos de alta.
 */

import { useState } from 'react';
import { textoPendientes } from '../../logica/bajas.js';

export function ConfirmarBaja({ nombre, ocupado, onSi, onCancelar }) {
  return (
    <div className="confirmar" role="alert">
      <p>{`¿Dar de baja a ${nombre}? Deja de aparecer en la tabla; sus partidos jugados quedan como están.`}</p>
      <button type="button" className="btn btn--peligro btn--chico" onClick={onSi} disabled={ocupado}>
        {ocupado ? 'Dando de baja…' : 'Sí, dar de baja'}
      </button>
      <button type="button" className="btn btn--fantasma btn--chico" onClick={onCancelar} disabled={ocupado}>
        Cancelar
      </button>
    </div>
  );
}

// pendientes: cuántos partidos sin resultado tiene (si hay, explica qué falta en lugar de confirmar)
export function BloqueBaja({ equipo, pendientes, acciones }) {
  // null, 'confirmar' o 'pendientes'
  const [paso, setPaso] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const darDeBaja = async () => {
    setOcupado(true);
    const hecho = await acciones.cambiarBaja(equipo.id, true, `${equipo.nombre} quedó dado de baja.`);
    setOcupado(false);
    if (!hecho) setPaso(null);
  };

  if (paso === 'confirmar') {
    return (
      <div className="bloque-baja">
        <ConfirmarBaja nombre={equipo.nombre} ocupado={ocupado} onSi={darDeBaja} onCancelar={() => setPaso(null)} />
      </div>
    );
  }
  return (
    <div className="bloque-baja">
      <button
        type="button"
        className="btn btn--fantasma btn--chico btn--texto-peligro"
        onClick={() => setPaso(pendientes > 0 ? 'pendientes' : 'confirmar')}
      >
        Dar de baja
      </button>
      {paso === 'pendientes' && (
        <p className="campo__error" role="alert">
          {textoPendientes(equipo.nombre, pendientes)}
        </p>
      )}
    </div>
  );
}

function EquipoDeBaja({ equipo, acciones }) {
  const [ocupado, setOcupado] = useState(false);
  const volver = async () => {
    setOcupado(true);
    await acciones.cambiarBaja(equipo.id, false, `${equipo.nombre} volvió a la tabla.`);
    setOcupado(false);
  };
  return (
    <li className="equipos-baja__item">
      <span className="equipos-baja__nombre">{equipo.nombre}</span>
      <button type="button" className="btn btn--secundario btn--chico" onClick={volver} disabled={ocupado}>
        {ocupado ? 'Volviendo…' : 'Volver a dar de alta'}
      </button>
    </li>
  );
}

export function DadosDeBaja({ equipos, acciones }) {
  return (
    <details className="panel equipos-baja">
      <summary className="equipos-baja__cab">{`Dados de baja (${equipos.length})`}</summary>
      <ul className="equipos-baja__lista">
        {equipos.map((e) => (
          <EquipoDeBaja key={e.id} equipo={e} acciones={acciones} />
        ))}
      </ul>
    </details>
  );
}
