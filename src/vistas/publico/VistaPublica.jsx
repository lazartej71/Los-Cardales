/**
 * Vista pública (sin login). Nunca muestra expulsados, suspendidos ni teléfonos.
 * Con Fútbol 7 cargado, los botones Fútbol 11 | Fútbol 7 de la cabecera eligen la modalidad (el celular
 * la recuerda) y la vista toma su acento (data-modalidad) y su chip. Sin Fútbol 7, se ve como siempre.
 */

import { useMemo, useRef } from 'react';
import { ChipModalidad } from '../../componentes/ChipModalidad.jsx';
import { ConmutadorModalidad } from '../../componentes/ConmutadorModalidad.jsx';
import { Icono } from '../../componentes/Icono.jsx';
import { Logo } from '../../componentes/Logo.jsx';
import { PieSitio } from '../../componentes/PieSitio.jsx';
import { Segmentado } from '../../componentes/Segmentado.jsx';
import {
  agruparPorFecha,
  equiposDeZona,
  fechaEnJuego,
  fechasConTablaInicial,
  partidosDeEquipos,
  tieneTablaInicial,
  ultimaFechaJugada,
  zonaElegida,
  zonasDeCategoria,
} from '../../logica/consultas.js';
import { alternarMiEquipo, guardarMiEquipo, resumenMiEquipo } from '../../logica/miEquipo.js';
import { categoriasDeModalidad, guardarModalidad, hayFutbol7 } from '../../logica/modalidades.js';
import { movimientosDePuestos } from '../../logica/movimiento.js';
import { rachaDeEquipo } from '../../logica/racha.js';
import { calcularTabla } from '../../logica/tabla.js';
import { SeccionFixture, SeccionPosiciones, SeccionResultados } from './Secciones.jsx';

const SIN_EQUIPO = { f11: null, f7: null };

const SECCIONES_PUBLICAS = [
  { id: 'posiciones', etiqueta: 'Posiciones', icono: 'podio' },
  { id: 'fixture', etiqueta: 'Fixture', icono: 'calendario' },
  { id: 'resultados', etiqueta: 'Resultados', icono: 'marcador' },
];

export function VistaPublica({ db, ui, setUi, almacen = null }) {
  const cambiar = (cambios) => setUi((u) => ({ ...u, ...cambios }));
  const conFutbol7 = hayFutbol7(db.categorias);
  const modalidad = conFutbol7 ? (ui.modalidad ?? 'f11') : 'f11';
  const categorias = useMemo(() => categoriasDeModalidad(db.categorias, modalidad), [db.categorias, modalidad]);
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
  // Vista de la tabla en el celular, racha de cada equipo y cuántos puestos se movió desde la fecha anterior
  const vistaTabla = ui.vistaTabla ?? 'resumen';
  const rachas = useMemo(
    () => new Map(filas.map((f) => [f.equipo.id, rachaDeEquipo(f.equipo.id, partidos)])),
    [filas, partidos]
  );
  const movimientos = useMemo(
    () =>
      movimientosDePuestos(filas, {
        equipos,
        partidos,
        criterios,
        tablaInicial: db.tablaInicial,
        ultimaFecha: ultimaFechaJugada(partidos, conTablaInicial),
      }),
    [filas, equipos, partidos, criterios, db.tablaInicial, conTablaInicial]
  );
  const fechas = useMemo(
    () => fechasConTablaInicial(agruparPorFecha(partidos), conTablaInicial),
    [partidos, conTablaInicial]
  );

  // Cada equipo (nombre y escudo) y, si es de otra zona (partidos entre zonas), el nombre de su zona
  const info = useMemo(() => {
    const equiposPorId = new Map(db.equipos.map((e) => [e.id, e]));
    const zonasPorId = new Map(db.zonas.map((z) => [z.id, z]));
    return {
      nombreDe: (id) => equiposPorId.get(id)?.nombre ?? '—',
      equipoDe: (id) => equiposPorId.get(id) ?? null,
      zonaAjena: (id) => {
        const equipo = equiposPorId.get(id);
        return equipo && zona && equipo.zonaId !== zona.id ? zonasPorId.get(equipo.zonaId)?.nombre ?? null : null;
      },
    };
  }, [db.equipos, db.zonas, zona]);

  // Mi equipo: el que la persona sigue en esta modalidad. Si ya no existe o se dio de baja, se ignora.
  const miEquipo = ui.miEquipo ?? SIN_EQUIPO;
  const equipoSeguido = miEquipo[modalidad] ?? null;
  const resumenEquipo = useMemo(
    () => (equipoSeguido ? resumenMiEquipo(db, equipoSeguido, modalidad) : null),
    [db, equipoSeguido, modalidad]
  );
  const miEquipoId = resumenEquipo ? equipoSeguido : null;
  const alternarEquipo = (equipoId) => {
    const nuevo = alternarMiEquipo(miEquipo, modalidad, equipoId);
    cambiar({ miEquipo: nuevo });
    guardarMiEquipo(almacen, nuevo);
  };
  const irAMiEquipo = () =>
    cambiar({ categoriaId: resumenEquipo.zona.categoriaId, zonaId: resumenEquipo.zona.id, fecha: null });

  // Resultados arranca en la fecha que se está jugando (salvo que la persona haya elegido otra)
  const enJuego = fechaEnJuego(fechas);
  const fechaActual = fechas.some((f) => f.fecha === ui.fecha) ? ui.fecha : enJuego;

  // Al cambiar de sección la vista queda justo debajo de la portada, con el contenido a la vista
  const refPortada = useRef(null);
  const irASeccion = (id) => {
    cambiar({ seccion: id });
    window.scrollTo(0, refPortada.current ? refPortada.current.offsetHeight : 0);
  };

  // Otra modalidad: su primera categoría y zona, la fecha en juego y la misma sección
  const cambiarModalidad = (nueva) => {
    cambiar({ modalidad: nueva, categoriaId: null, zonaId: null, fecha: null });
    guardarModalidad(almacen, nueva);
  };
  const chip = conFutbol7 ? <ChipModalidad modalidad={modalidad} /> : null;

  return (
    <div className="publico" data-modalidad={modalidad}>
      <header className="cabecera" ref={refPortada}>
        <div className="contenedor cabecera__inner">
          <Logo className="cabecera__logo" />
          {/* El nombre del campeonato en las dos modalidades: el botón activo ya dice cuál se ve */}
          <h1 className="cabecera__titulo">{db.configuracion.nombreCampeonato}</h1>
          {conFutbol7 && <ConmutadorModalidad valor={modalidad} onCambiar={cambiarModalidad} />}
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
            <div className="secciones">
              <SeccionPosiciones
                activa={ui.seccion === 'posiciones'}
                filas={filas}
                criterios={criterios}
                partidos={partidos}
                conTablaInicial={conTablaInicial}
                chip={chip}
                vista={vistaTabla}
                onVista={(v) => cambiar({ vistaTabla: v })}
                rachas={rachas}
                movimientos={movimientos}
                resumenEquipo={resumenEquipo}
                miEquipoId={miEquipoId}
                onMiEquipo={alternarEquipo}
                onIrAMiEquipo={irAMiEquipo}
                nombreDe={info.nombreDe}
              />
              <SeccionFixture
                key={zona.id}
                activa={ui.seccion === 'fixture'}
                fechas={fechas}
                fechaEnJuego={enJuego}
                info={info}
                conTablaInicial={conTablaInicial}
                chip={chip}
                miEquipoId={miEquipoId}
              />
              <SeccionResultados
                activa={ui.seccion === 'resultados'}
                fechas={fechas}
                fecha={fechaActual}
                onFecha={(f) => cambiar({ fecha: f })}
                info={info}
                conTablaInicial={conTablaInicial}
                chip={chip}
                miEquipoId={miEquipoId}
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

      {/* Con categoría y zona está la barra inferior del celular: el pie le deja su espacio */}
      <PieSitio conBarra={Boolean(categoria && zona)} />
    </div>
  );
}
