/**
 * Formulario para agregar un partido a la fecha: local y visitante de cualquier zona de la categoría.
 */

import { useState } from 'react';

export function NuevoPartido({ categoria, fecha, zonas, equipos, partidos, acciones }) {
  const [localId, setLocalId] = useState('');
  const [visitanteId, setVisitanteId] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Solo se ofrecen los equipos que todavía no juegan en esta fecha
  const ocupados = new Set(partidos.filter((p) => p.fecha === fecha).flatMap((p) => [p.localId, p.visitanteId]));
  const libres = equipos.filter((e) => !ocupados.has(e.id));
  const nombreDe = (id) => equipos.find((e) => String(e.id) === id)?.nombre;

  const agregar = async (e) => {
    e.preventDefault();
    if (!localId || !visitanteId) {
      setError('Elegí el equipo local y el visitante.');
      return;
    }
    setError('');
    setGuardando(true);
    const creado = await acciones.crearPartido(
      { categoriaId: categoria.id, fecha, localId: Number(localId), visitanteId: Number(visitanteId) },
      `Partido agregado: ${nombreDe(localId)} vs ${nombreDe(visitanteId)}.`
    );
    setGuardando(false);
    if (creado) {
      setLocalId('');
      setVisitanteId('');
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
