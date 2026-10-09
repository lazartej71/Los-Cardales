/**
 * Panel → Equipos: agregar un equipo a la zona elegida (por ejemplo, el que reemplaza a uno dado de baja).
 * Arranca sin tabla inicial: 0 partidos jugados.
 */

import { useState } from 'react';
import { CampoTexto } from '../../componentes/CampoTexto.jsx';

export function AgregarEquipo({ categoria, zona, acciones }) {
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const agregar = async (e) => {
    e.preventDefault();
    const limpio = nombre.trim();
    if (!limpio) {
      setError('Escribí el nombre del equipo.');
      return;
    }
    setError('');
    setGuardando(true);
    const creado = await acciones.crearEquipo(
      { zonaId: zona.id, nombre: limpio },
      `Agregaste ${limpio} a ${categoria.nombre} · ${zona.nombre}.`
    );
    setGuardando(false);
    if (creado) setNombre('');
  };

  return (
    <form className="panel" onSubmit={agregar} noValidate aria-labelledby="agregar-equipo-titulo">
      <h3 id="agregar-equipo-titulo" className="panel__titulo">{`Agregar equipo a ${categoria.nombre} · ${zona.nombre}`}</h3>
      <CampoTexto
        id="agregar-equipo-nombre"
        etiqueta="Nombre del equipo nuevo"
        valor={nombre}
        error={error}
        ayuda="Arranca con 0 partidos jugados."
        maxLength={60}
        autoComplete="off"
        onCambiar={(v) => {
          setNombre(v);
          setError('');
        }}
      />
      <button type="submit" className="btn btn--primario" disabled={guardando}>
        {guardando ? 'Agregando…' : 'Agregar equipo'}
      </button>
    </form>
  );
}
