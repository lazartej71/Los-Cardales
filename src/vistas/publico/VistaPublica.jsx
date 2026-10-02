/**
 * Vista pública (sin login). Nunca muestra expulsados, suspendidos ni teléfonos.
 */

import { useMemo, useRef } from 'react';
import { Icono } from '../../componentes/Icono.jsx';
import { Logo } from '../../componentes/Logo.jsx';
import { Segmentado } from '../../componentes/Segmentado.jsx';
import {
  agruparPorFecha,
  equiposDeZona,
  fechaEnJuego,
  fechasConTablaInicial,
  partidosDeEquipos,
  tieneTablaInicial,
  zonaElegida,
  zonasDeCategoria,
} from '../../logica/consultas.js';
import { calcularTabla } from '../../logica/tabla.js';
import { BannerInstalar, SeccionFixture, SeccionPosiciones, SeccionResultados } from './Secciones.jsx';

const SECCIONES_PUBLICAS = [
  { id: 'posiciones', etiqueta: 'Posiciones', icono: 'podio' },
  { id: 'fixture', etiqueta: 'Fixture', icono: 'calendario' },
  { id: 'resultados', etiqueta: 'Resultados', icono: 'marcador' },
];

export function VistaPublica({ db, ui, setUi }) {
  const cambiar = (cambios) => setUi((u) => ({ ...u, ...cambios }));
  const categorias = useMemo(() => [...db.categorias].sort((a, b) => a.orden - b.orden), [db.categorias]);
  const categoria = categorias.find((c) => c.id === ui.categoriaId) || categorias[0] || null;
  const zonas = useMemo(() => (categoria ? zonasDeCategoria(db.zonas, categoria.id) : []), [db.zonas, categoria]);
  const zona = categoria ? zonaElegida(db.zonas, categoria.id, ui.zonaId) : null;
  const criterios = db.configuracion.criteriosDesempate;

  // La tabla se recalcula sola cada vez que llegan datos nuevos
  const equipos = useMemo(() => (zona ? equiposDeZona(db.equipos, zona.id) : []), [db.equipos, zona]);
  const partidos = useMemo(() => partidosDeEquipos(db.partidos, equipos), [db.partidos, equipos]);
  const filas = useMemo(
    () => calcularTabla(equipos, partidos, criterios, db.tablaInicial),
    [equipos, partidos, criterios, db.tablaInicial]
  );
  const conTablaInicial = tieneTablaInicial(db.tablaInicial, equipos);
  const fechas = useMemo(
    () => fechasConTablaInicial(agruparPorFecha(partidos), conTablaInicial),
    [partidos, conTablaInicial]
  );

  // Nombre de cada equipo y, si es de otra zona (partidos entre zonas), el nombre de su zona
  const info = useMemo(() => {
    const equiposPorId = new Map(db.equipos.map((e) => [e.id, e]));
    const zonasPorId = new Map(db.zonas.map((z) => [z.id, z]));
    return {
      nombreDe: (id) => equiposPorId.get(id)?.nombre ?? '—',
      zonaAjena: (id) => {
        const equipo = equiposPorId.get(id);
        return equipo && zona && equipo.zonaId !== zona.id ? zonasPorId.get(equipo.zonaId)?.nombre ?? null : null;
      },
    };
  }, [db.equipos, db.zonas, zona]);

  // Resultados arranca en la fecha que se está jugando (salvo que la persona haya elegido otra)
  const enJuego = fechaEnJuego(fechas);
  const fechaActual = fechas.some((f) => f.fecha === ui.fecha) ? ui.fecha : enJuego;

  // Al cambiar de sección la vista queda justo debajo de la portada, con el contenido a la vista
  const refPortada = useRef(null);
  const irASeccion = (id) => {
    cambiar({ seccion: id });
    window.scrollTo(0, refPortada.current ? refPortada.current.offsetHeight : 0);
  };

  return (
    <div className="publico">
      <header className="cabecera" ref={refPortada}>
        <div className="contenedor cabecera__inner">
          <Logo className="cabecera__logo" />
          <h1 className="cabecera__titulo">{db.configuracion.nombreCampeonato}</h1>
        </div>
      </header>

      {!categoria || !zona ? (
        <main className="contenedor publico__main">
          <p className="vacio-texto">Todavía no hay categorías cargadas.</p>
        </main>
      ) : (
        <>
          <div className="selector">
            <div className="contenedor selector__inner">
              <Segmentado
                etiquetaGrupo="Categoría"
                opciones={categorias.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
                valor={categoria.id}
                onCambiar={(id) => cambiar({ categoriaId: id, zonaId: null, fecha: null })}
              />
              {zonas.length > 1 && (
                <Segmentado
                  variante="zona"
                  etiquetaGrupo="Zona"
                  opciones={zonas.map((z) => ({ valor: z.id, etiqueta: z.nombre }))}
                  valor={zona.id}
                  onCambiar={(id) => cambiar({ zonaId: id, fecha: null })}
                />
              )}
            </div>
          </div>

          <main className="contenedor publico__main">
            {ui.bannerVisible && <BannerInstalar onCerrar={() => cambiar({ bannerVisible: false })} />}
            <div className="secciones">
              <SeccionPosiciones
                activa={ui.seccion === 'posiciones'}
                filas={filas}
                criterios={criterios}
                partidos={partidos}
                conTablaInicial={conTablaInicial}
              />
              <SeccionFixture
                key={zona.id}
                activa={ui.seccion === 'fixture'}
                fechas={fechas}
                fechaEnJuego={enJuego}
                info={info}
                conTablaInicial={conTablaInicial}
              />
              <SeccionResultados
                activa={ui.seccion === 'resultados'}
                fechas={fechas}
                fecha={fechaActual}
                onFecha={(f) => cambiar({ fecha: f })}
                info={info}
                conTablaInicial={conTablaInicial}
              />
            </div>
          </main>

          <nav className="nav-inferior" aria-label="Secciones">
            {SECCIONES_PUBLICAS.map((s) => (
              <button
                key={s.id}
                type="button"
                className="nav-inferior__btn"
                aria-pressed={ui.seccion === s.id}
                onClick={() => irASeccion(s.id)}
              >
                <Icono nombre={s.icono} tamano={22} />
                <span>{s.etiqueta}</span>
              </button>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}
