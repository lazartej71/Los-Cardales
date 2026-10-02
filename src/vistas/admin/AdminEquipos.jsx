/**
 * Panel: equipos y delegados.
 */

import { useState } from 'react';
import { CampoTexto } from '../../componentes/CampoTexto.jsx';
import { Icono } from '../../componentes/Icono.jsx';
import { FiltroCategoriaZona } from '../../componentes/Segmentado.jsx';
import { equiposDeZona } from '../../logica/consultas.js';
import { soloDigitos } from '../../logica/expulsiones.js';
import { validarTelefono } from '../../logica/validaciones.js';

export function AdminEquipos({ db, acciones, filtro }) {
  const equipos = equiposDeZona(db.equipos, filtro.zonaId);
  return (
    <>
      <p className="admin-intro">
        Cargá el delegado de cada equipo y su WhatsApp, con código de país. Se usa para avisarle las expulsiones.
      </p>
      <div className="panel">
        <FiltroCategoriaZona db={db} filtro={filtro} />
      </div>
      <div className="equipos">
        {equipos.map((e) => (
          <EditorEquipo key={`${e.id}|${e.nombre}|${e.delegado}|${e.telefonoDelegado}`} equipo={e} acciones={acciones} />
        ))}
      </div>
    </>
  );
}

function EditorEquipo({ equipo, acciones }) {
  const delegadoGuardado = equipo.delegado || '';
  const telefonoGuardado = equipo.telefonoDelegado || '';
  const [nombre, setNombre] = useState(equipo.nombre);
  const [delegado, setDelegado] = useState(delegadoGuardado);
  const [telefono, setTelefono] = useState(telefonoGuardado);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const idBase = `equipo-${equipo.id}`;
  const sinCambios = nombre === equipo.nombre && delegado === delegadoGuardado && telefono === telefonoGuardado;
  const limpiar = (campo) => setErrores((e) => ({ ...e, [campo]: undefined }));

  const guardar = async (e) => {
    e.preventDefault();
    const digitos = soloDigitos(telefono);
    const nuevos = {};
    if (!nombre.trim()) nuevos.nombre = 'Escribí el nombre del equipo.';
    if (digitos && !validarTelefono(digitos)) {
      nuevos.telefono = 'Usá el formato internacional, solo con números. Por ejemplo: 5491123456789.';
    }
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;
    setGuardando(true);
    await acciones.actualizarEquipo(
      equipo.id,
      { nombre: nombre.trim(), delegado: delegado.trim(), telefonoDelegado: digitos },
      `Cambios guardados en ${nombre.trim()}.`
    );
    setGuardando(false);
  };

  return (
    <form className="panel" onSubmit={guardar} noValidate aria-labelledby={`${idBase}-titulo`}>
      <div className="equipo-form__cab">
        <span className="equipo-form__escudo">
          <Icono nombre="camiseta" />
        </span>
        <h3 id={`${idBase}-titulo`} className="equipo-form__titulo">{equipo.nombre}</h3>
      </div>
      <CampoTexto
        id={`${idBase}-nombre`}
        etiqueta="Nombre del equipo"
        valor={nombre}
        error={errores.nombre}
        maxLength={60}
        autoComplete="off"
        onCambiar={(v) => {
          setNombre(v);
          limpiar('nombre');
        }}
      />
      <CampoTexto
        id={`${idBase}-delegado`}
        etiqueta="Delegado"
        valor={delegado}
        maxLength={60}
        autoComplete="off"
        onCambiar={setDelegado}
      />
      <CampoTexto
        id={`${idBase}-telefono`}
        etiqueta="WhatsApp del delegado"
        valor={telefono}
        error={errores.telefono}
        ayuda="Con código de país, sin + ni espacios. Ejemplo: 5491123456789."
        inputMode="tel"
        maxLength={20}
        autoComplete="off"
        onCambiar={(v) => {
          setTelefono(v);
          limpiar('telefono');
        }}
      />
      <button type="submit" className="btn btn--primario" disabled={sinCambios || guardando}>
        {guardando ? 'Guardando…' : sinCambios ? 'Sin cambios' : 'Guardar cambios'}
      </button>
    </form>
  );
}
