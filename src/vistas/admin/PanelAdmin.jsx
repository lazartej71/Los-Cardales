/**
 * Estructura del panel de administración.
 */

import { useEffect } from 'react';
import { Icono } from '../../componentes/Icono.jsx';
import { Logo } from '../../componentes/Logo.jsx';
import { zonaElegida } from '../../logica/consultas.js';
import { estadoExpulsion } from '../../logica/expulsiones.js';
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

export function PanelAdmin({ db, acciones, ui, setUi, almacen = null, onVerSitio, onSalir }) {
  const cambiar = (cambios) => setUi((u) => ({ ...u, ...cambios }));
  const secciones = db.rol === 'superadmin' ? [...SECCIONES_ADMIN, SECCION_CONTROL] : SECCIONES_ADMIN;
  const actual = [...secciones, SECCION_AJUSTES].find((s) => s.id === ui.seccion) || secciones[0];
  const pendientesTribunal = db.expulsiones.filter((e) => estadoExpulsion(e).tipo === 'pendiente').length;
  const categorias = [...db.categorias].sort((a, b) => a.orden - b.orden);
  const categoria = categorias.find((c) => c.id === ui.categoriaId) || categorias[0] || null;
  const zona = categoria ? zonaElegida(db.zonas, categoria.id, ui.zonaId) : null;
  const equipoCuentaId = ui.equipoCuentaId ?? null;

  // Categoría y zona elegidas: se comparten entre las secciones del panel
  const filtro = {
    categoriaId: categoria ? categoria.id : null,
    zonaId: zona ? zona.id : null,
    onCategoria: (id) => cambiar({ categoriaId: id, zonaId: null, fecha: null, equipoCuentaId: null }),
    onZona: (id) => cambiar({ zonaId: id }),
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [actual.id, equipoCuentaId]);

  const comunes = { db, acciones, filtro };
  let contenido;
  if (actual.id === 'control') {
    contenido = <AdminControl db={db} acciones={acciones} />;
  } else if (actual.id === 'cargar') {
    // Solo el resultado (y el W.O.): rojas, arancel, postergar y lugar se hacen en Partidos
    contenido = <CargaPorCancha db={db} acciones={acciones} encabezado={actual.titulo} almacen={almacen} soloResultado />;
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
    contenido = <AdminConfiguracion {...comunes} />;
  }

  return (
    <div className="admin">
      <header className="admin-cabecera">
        <div className="contenedor admin-cabecera__inner">
          <div className="admin-cabecera__marca">
            <Logo className="admin-cabecera__logo" />
            <div>
              <p className="admin-cabecera__sub">{db.configuracion.nombreCampeonato}</p>
              <h1 className="admin-cabecera__titulo">Panel de administración</h1>
            </div>
          </div>
          <div className="admin-cabecera__acciones">
            <button type="button" className="btn-cabecera" onClick={onVerSitio}>
              <Icono nombre="ojo" tamano={18} />
              <span>Ver sitio</span>
            </button>
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
          {/* Cargar arma su propio título, con la fecha en juego */}
          {actual.id !== 'cargar' && <h2 className="admin-main__titulo">{actual.titulo}</h2>}
          {contenido}
        </main>
      </div>
    </div>
  );
}
