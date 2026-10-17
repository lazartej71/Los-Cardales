/**
 * Pantalla de los veedores: eligen el predio, después la cancha, y cargan los partidos de esa cancha en la
 * fecha en juego (resultado, W.O., rojas y arancel). El recorrido está en CargaPorCancha, que también usa
 * el panel en la pestaña Cargar. Un veedor fijo en una modalidad ve solo esa; sin modalidad, con Fútbol 7
 * cargado, elige primero en cuál carga.
 * inicial: { modo, predio, cancha, abierto } para arrancar en un paso (si no, lo que recuerda el celular).
 */

import { useState } from 'react';
import { CuentaActual } from '../../componentes/CuentaActual.jsx';
import { Icono } from '../../componentes/Icono.jsx';
import { Logo } from '../../componentes/Logo.jsx';
import { crearRegistroSinGuardar } from '../../logica/sinGuardar.js';
import { CargaPorCancha } from './CargaPorCancha.jsx';

export function PanelVeedor({ db, acciones, inicial = {}, almacen = null, usuario = null, onSalir }) {
  const [sinGuardar] = useState(crearRegistroSinGuardar);
  const modalidad = db.modalidad ?? null;
  return (
    <div className="admin veedor" data-modalidad={modalidad ?? undefined}>
      <header className="admin-cabecera">
        <div className="contenedor admin-cabecera__inner">
          <div className="admin-cabecera__marca">
            <Logo className="admin-cabecera__logo" />
            <div>
              <p className="admin-cabecera__sub">
                {modalidad === 'f7' ? 'Fútbol 7' : db.configuracion.nombreCampeonato}
              </p>
              <h1 className="admin-cabecera__titulo">Veedores</h1>
            </div>
          </div>
          <div className="admin-cabecera__acciones">
            <CuentaActual usuario={usuario} rol="veedor" modalidad={modalidad} />
            <button type="button" className="btn-cabecera" onClick={onSalir}>
              <Icono nombre="salir" tamano={18} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      <main className="contenedor veedor-main">
        <CargaPorCancha
          db={db}
          acciones={acciones}
          encabezado="Veedores"
          inicial={inicial}
          almacen={almacen}
          modalidad={modalidad}
          registroSinGuardar={sinGuardar}
        />
      </main>
    </div>
  );
}
