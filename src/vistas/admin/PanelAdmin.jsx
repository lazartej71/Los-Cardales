/**
 * Estructura del panel de administración. Con Fútbol 7 cargado, cada sección (menos Control) ve los datos
 * de la modalidad activa: la de la cuenta (Franco, Gaby) o la que elige el superadmin en el filtro.
 */

import { useEffect, useState } from 'react';
import { BannerModalidad } from '../../componentes/BannerModalidad.jsx';
import { CuentaActual } from '../../componentes/CuentaActual.jsx';
import { FiltroModalidad } from '../../componentes/FiltroModalidad.jsx';
import { Icono } from '../../componentes/Icono.jsx';
import { Logo } from '../../componentes/Logo.jsx';
import { zonaElegida } from '../../logica/consultas.js';
import { estadoExpulsion } from '../../logica/expulsiones.js';
import { ajustesDeCuenta, filtrarPorModalidad, hayFutbol7 } from '../../logica/modalidades.js';
import { modalidadDelPanel } from '../../logica/panelModalidad.js';
import { confirmarDescarte, crearRegistroSinGuardar } from '../../logica/sinGuardar.js';
import { AdminConfiguracion } from './AdminConfiguracion.jsx';
import { AdminControl } from './AdminControl.jsx';
import { AdminCuentas } from './AdminCuentas.jsx';
import { AdminEquipos } from './AdminEquipos.jsx';
import { AdminResultados } from './AdminResultados.jsx';
import { AdminSanciones } from './AdminSanciones.jsx';
import { CargaPorCancha } from '../veedor/CargaPorCancha.jsx';

// La primera es la que se abre al entrar
const SECCIONES_ADMIN = [
  { id: 'cargar', etiqueta: 'Cargar', titulo: 'Cargar resultados', icono: 'pelota' },
  { id: 'resultados', etiqueta: 'Partidos', titulo: 'Partidos y resultados', icono: 'marcador' },
  { id: 'cuentas', etiqueta: 'Cuentas', titulo: 'Cuentas de los equipos', icono: 'plata' },
  { id: 'sanciones', etiqueta: 'Suspendidos', titulo: 'Expulsados y suspendidos', icono: 'candado' },
  { id: 'equipos', etiqueta: 'Equipos', titulo: 'Equipos y delegados', icono: 'camiseta' },
];
// No va en la barra (así no crece): se abre con el botón de la cabecera
const SECCION_AJUSTES = { id: 'configuracion', etiqueta: 'Ajustes', titulo: 'Configuración', icono: 'ajustes' };
// Solo la ve el superadmin
const SECCION_CONTROL = { id: 'control', etiqueta: 'Control', titulo: 'Control del sitio', icono: 'control' };

export function PanelAdmin({ db, acciones, ui, setUi, almacen = null, usuario = null, onSalir }) {
  const cambiar = (cambios) => setUi((u) => ({ ...u, ...cambios }));
  const secciones = db.rol === 'superadmin' ? [...SECCIONES_ADMIN, SECCION_CONTROL] : SECCIONES_ADMIN;
  const actual = [...secciones, SECCION_AJUSTES].find((s) => s.id === ui.seccion) || secciones[0];
  const cuenta = db.modalidad ?? null;
  const panel = modalidadDelPanel({
    cuenta,
    elegida: ui.modalidad ?? null,
    ultima: ui.ultimaModalidad ?? 'f11',
    seccion: actual.id,
    hayF7: hayFutbol7(db.categorias),
  });
  // Lo que ven las secciones: solo la modalidad activa (Control ve todo)
  const visible = filtrarPorModalidad(db, panel.activa);
  const pendientesTribunal = visible.expulsiones.filter((e) => estadoExpulsion(e).tipo === 'pendiente').length;
  const categorias = [...visible.categorias].sort((a, b) => a.orden - b.orden);
  const categoria = categorias.find((c) => c.id === ui.categoriaId) || categorias[0] || null;
  const zona = categoria ? zonaElegida(visible.zonas, categoria.id, ui.zonaId) : null;
  const equipoCuentaId = ui.equipoCuentaId ?? null;

  // Categoría y zona elegidas: se comparten entre las secciones del panel
  const filtro = {
    categoriaId: categoria ? categoria.id : null,
    zonaId: zona ? zona.id : null,
    onCategoria: (id) => cambiar({ categoriaId: id, zonaId: null, fecha: null, equipoCuentaId: null }),
    onZona: (id) => cambiar({ zonaId: id }),
  };

  // Goles tocados y sin guardar en Cargar: se pregunta antes de pasar a la otra modalidad
  const [sinGuardar] = useState(crearRegistroSinGuardar);

  // Otra modalidad (superadmin): vuelve a la primera categoría y cierra lo abierto
  const cambiarModalidad = (modalidad) => {
    if (!confirmarDescarte(sinGuardar)) return;
    setUi((u) => ({
      ...u,
      modalidad,
      ultimaModalidad: modalidad === 'todas' ? (u.ultimaModalidad ?? 'f11') : modalidad,
      categoriaId: null,
      zonaId: null,
      fecha: null,
      equipoCuentaId: null,
      partidoAbiertoId: null,
    }));
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [actual.id, equipoCuentaId]);

  const comunes = { db: visible, acciones, filtro };
  let contenido;
  if (actual.id === 'control') {
    contenido = <AdminControl db={db} acciones={acciones} />;
  } else if (actual.id === 'cargar') {
    // Resultado, W.O., rojas y arancel por cancha; postergar, borrar y el lugar se hacen en Partidos
    contenido = (
      <CargaPorCancha
        db={visible}
        acciones={acciones}
        encabezado={actual.titulo}
        almacen={almacen}
        modalidad={panel.activa === 'todas' ? null : panel.activa}
        registroSinGuardar={sinGuardar}
        admin
      />
    );
  } else if (!categoria || !zona) {
    contenido = <p className="vacio-texto">Todavía no hay categorías cargadas en la base.</p>;
  } else if (actual.id === 'resultados') {
    contenido = (
      <AdminResultados
        {...comunes}
        fecha={ui.fecha}
        onFecha={(fecha) => cambiar({ fecha })}
        abierto={ui.partidoAbiertoId ?? null}
        onAbrir={(id) => cambiar({ partidoAbiertoId: id })}
      />
    );
  } else if (actual.id === 'cuentas') {
    contenido = (
      <AdminCuentas
        {...comunes}
        equipoId={equipoCuentaId}
        onEquipo={(id) => cambiar({ equipoCuentaId: id })}
        busqueda={ui.busquedaCuentas ?? ''}
        onBuscar={(texto) => cambiar({ busquedaCuentas: texto })}
      />
    );
  } else if (actual.id === 'sanciones') {
    contenido = <AdminSanciones {...comunes} onIrACargar={() => cambiar({ seccion: 'resultados' })} />;
  } else if (actual.id === 'equipos') {
    contenido = <AdminEquipos {...comunes} />;
  } else {
    contenido = <AdminConfiguracion {...comunes} ajustes={ajustesDeCuenta(db, cuenta)} />;
  }

  const concreta = panel.activa !== 'todas';
  return (
    <div className="admin" data-modalidad={panel.banner && concreta ? panel.activa : undefined}>
      <header className="admin-cabecera">
        <div className="contenedor admin-cabecera__inner">
          <div className="admin-cabecera__marca">
            <Logo className="admin-cabecera__logo" />
            <div>
              <p className="admin-cabecera__sub">
                {panel.activa === 'f7' ? 'Fútbol 7' : db.configuracion.nombreCampeonato}
              </p>
              <h1 className="admin-cabecera__titulo">Panel de administración</h1>
            </div>
          </div>
          <div className="admin-cabecera__acciones">
            <CuentaActual usuario={usuario} rol={db.rol} modalidad={cuenta} />
            <button
              type="button"
              className="btn-cabecera"
              aria-label="Ajustes"
              aria-current={actual.id === SECCION_AJUSTES.id ? 'page' : undefined}
              onClick={() => cambiar({ seccion: SECCION_AJUSTES.id })}
            >
              <Icono nombre="ajustes" tamano={18} />
              <span className="btn-cabecera__texto">Ajustes</span>
            </button>
            <button type="button" className="btn-cabecera" onClick={onSalir}>
              <Icono nombre="salir" tamano={18} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      <div className="contenedor admin-layout">
        <nav className="admin-nav" aria-label="Secciones del panel">
          {secciones.map((s) => (
            <button
              key={s.id}
              type="button"
              className="nav-inferior__btn"
              aria-current={actual.id === s.id ? 'page' : undefined}
              onClick={() => cambiar({ seccion: s.id })}
            >
              <Icono nombre={s.icono} tamano={22} />
              <span>{s.etiqueta}</span>
              {s.id === 'sanciones' && pendientesTribunal > 0 && (
                <span className="admin-nav__badge">
                  {pendientesTribunal}
                  <span className="visualmente-oculto"> pendientes de tribunal</span>
                </span>
              )}
            </button>
          ))}
        </nav>

        <main className="admin-main">
          {panel.conFiltro && <FiltroModalidad valor={panel.activa} onCambiar={cambiarModalidad} />}
          {panel.banner && concreta && <BannerModalidad modalidad={panel.activa} />}
          {panel.aviso && <p className="admin-intro aviso-modalidad">{panel.aviso}</p>}
          {/* Cargar arma su propio título, con la fecha en juego */}
          {actual.id !== 'cargar' && <h2 className="admin-main__titulo">{actual.titulo}</h2>}
          {contenido}
        </main>
      </div>
    </div>
  );
}
