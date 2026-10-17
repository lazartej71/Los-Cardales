/**
 * Formulario para agregar un partido a la fecha: local y visitante de cualquier zona de la categoría,
 * predio, cancha y hora.
 */

import { useState } from 'react';
import { validarLugar } from '../../logica/lugar.js';
import { modalidadDeCategoria } from '../../logica/modalidades.js';
import { CamposLugar, LUGAR_VACIO, lugarParaGuardar } from './CamposLugar.jsx';

export function NuevoPartido({ categoria, fecha, zonas, equipos, partidos, acciones }) {
  const [localId, setLocalId] = useState('');
  const [visitanteId, setVisitanteId] = useState('');
  const [lugar, setLugar] = useState(LUGAR_VACIO);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const modalidad = modalidadDeCategoria(categoria);

  // Solo se ofrecen los equipos en juego que todavía no juegan en esta fecha
  const ocupados = new Set(partidos.filter((p) => p.fecha === fecha).flatMap((p) => [p.localId, p.visitanteId]));
  const libres = equipos.filter((e) => !e.baja && !ocupados.has(e.id));
  const nombreDe = (id) => equipos.find((e) => String(e.id) === id)?.nombre;

  const agregar = async (e) => {
    e.preventDefault();
    if (!localId || !visitanteId) {
      setError('Elegí el equipo local y el visitante.');
      return;
    }
    const validado = validarLugar(lugarParaGuardar(lugar), modalidad);
    if (validado.error) {
      setError(validado.error);
      return;
    }
    setError('');
    setGuardando(true);
    const creado = await acciones.crearPartido(
      { categoriaId: categoria.id, fecha, localId: Number(localId), visitanteId: Number(visitanteId), ...validado.valor },
      `Partido agregado: ${nombreDe(localId)} vs ${nombreDe(visitanteId)}.`
    );
    setGuardando(false);
    // Quedan el predio y la hora, para cargar rápido los otros partidos de ese turno
    if (creado) {
      setLocalId('');
      setVisitanteId('');
      setLugar((l) => ({ ...l, cancha: '' }));
    }
  };

  // Equipos agrupados por zona; se saca el que ya está elegido del otro lado
  const opciones = (excluido) =>
    zonas.map((zona) => {
      const deZona = libres.filter((e) => e.zonaId === zona.id && String(e.id) !== excluido);
      if (!deZona.length) return null;
      return (
        <optgroup key={zona.id} label={zona.nombre}>
          {deZona.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </optgroup>
      );
    });

  if (libres.length < 2) {
    return (
      <section className="panel" aria-labelledby={`nuevo-${fecha}`}>
        <h3 id={`nuevo-${fecha}`} className="panel__titulo">Agregar partido</h3>
        <p className="panel__texto">
          Todos los equipos de {categoria.nombre} ya tienen partido en la fecha {fecha}.
        </p>
      </section>
    );
  }

  return (
    <form className="panel" onSubmit={agregar} noValidate aria-labelledby={`nuevo-${fecha}`}>
      <h3 id={`nuevo-${fecha}`} className="panel__titulo">Agregar partido a la fecha {fecha}</h3>
      <div className="nuevo-partido">
        <div className="campo">
          <label className="campo__label" htmlFor="nuevo-local">Local</label>
          <select
            id="nuevo-local"
            className="input select"
            value={localId}
            onChange={(e) => {
              setLocalId(e.target.value);
              setError('');
            }}
          >
            <option value="">Elegí un equipo</option>
            {opciones(visitanteId)}
          </select>
        </div>
        <div className="campo">
          <label className="campo__label" htmlFor="nuevo-visitante">Visitante</label>
          <select
            id="nuevo-visitante"
            className="input select"
            value={visitanteId}
            onChange={(e) => {
              setVisitanteId(e.target.value);
              setError('');
            }}
          >
            <option value="">Elegí un equipo</option>
            {opciones(localId)}
          </select>
        </div>
      </div>
      <CamposLugar
        idBase={`nuevo-${fecha}`}
        lugar={lugar}
        modalidad={modalidad}
        invalido={Boolean(error) && Boolean(localId && visitanteId)}
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
      <button type="submit" className="btn btn--primario" disabled={guardando}>
        {guardando ? 'Agregando…' : 'Agregar partido'}
      </button>
    </form>
  );
}
