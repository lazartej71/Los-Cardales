/**
 * Panel: equipos y delegados; agregar equipos y darlos de baja.
 */

import { useState } from 'react';
import { CampoTexto } from '../../componentes/CampoTexto.jsx';
import { Escudo } from '../../componentes/Escudo.jsx';
import { Icono } from '../../componentes/Icono.jsx';
import { FiltroCategoriaZona } from '../../componentes/Segmentado.jsx';
import { partidosPendientes } from '../../logica/bajas.js';
import { equiposDeZona } from '../../logica/consultas.js';
import { soloDigitos } from '../../logica/expulsiones.js';
import { validarTelefono } from '../../logica/validaciones.js';
import { AgregarEquipo } from './AgregarEquipo.jsx';
import { BloqueBaja, DadosDeBaja } from './BajasEquipos.jsx';
import { BloqueEscudo } from './BloqueEscudo.jsx';

export function AdminEquipos({ db, acciones, filtro }) {
  const deZona = equiposDeZona(db.equipos, filtro.zonaId);
  const enJuego = deZona.filter((e) => !e.baja);
  const deBaja = deZona.filter((e) => e.baja);
  const categoria = db.categorias.find((c) => c.id === filtro.categoriaId);
  const zona = db.zonas.find((z) => z.id === filtro.zonaId);
  return (
    <>
      <p className="admin-intro">
        Cargá el delegado de cada equipo y su WhatsApp, con código de país. Se usa para avisarle las expulsiones.
      </p>
      <div className="panel">
        <FiltroCategoriaZona db={db} filtro={filtro} />
      </div>
      {categoria && zona && <AgregarEquipo key={zona.id} categoria={categoria} zona={zona} acciones={acciones} />}
      <div className="equipos">
        {enJuego.map((e) => (
          <EditorEquipo
            key={`${e.id}|${e.nombre}|${e.delegado}|${e.telefonoDelegado}`}
            equipo={e}
            pendientes={partidosPendientes(db.partidos, e.id).length}
            acciones={acciones}
            superadmin={db.rol === 'superadmin'}
          />
        ))}
      </div>
      {deBaja.length > 0 && <DadosDeBaja equipos={deBaja} acciones={acciones} />}
    </>
  );
}

function EditorEquipo({ equipo, pendientes, acciones, superadmin }) {
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
        <span className={`equipo-form__escudo${equipo.escudo ? ' equipo-form__escudo--imagen' : ''}`}>
          {equipo.escudo ? <Escudo equipo={equipo} /> : <Icono nombre="camiseta" />}
        </span>
        <h3 id={`${idBase}-titulo`} className="equipo-form__titulo">{equipo.nombre}</h3>
      </div>
      {superadmin && <BloqueEscudo equipo={equipo} acciones={acciones} />}
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
      <BloqueBaja equipo={equipo} pendientes={pendientes} acciones={acciones} />
    </form>
  );
}
