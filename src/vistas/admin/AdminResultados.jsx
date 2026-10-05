/**
 * Panel: partidos de cada fecha por categoría. Se arman los cruces (también entre zonas),
 * se cargan los resultados y se marcan los postergados. Los partidos de la fecha se ven en renglones
 * compactos, separados en pendientes de carga y cargados; el que se toca se abre con su editor.
 */

import { useEffect, useMemo, useState } from 'react';
import { Icono } from '../../componentes/Icono.jsx';
import { FiltroCategoriaZona, Segmentado } from '../../componentes/Segmentado.jsx';
import { NotasDesempate, TablaPosiciones } from '../../componentes/TablaPosiciones.jsx';
import {
  agruparPorFecha,
  equiposDeZona,
  ETIQUETA_ESTADO_FECHA,
  estadoFecha,
  fechasConTablaInicial,
  partidosDeCategoria,
  partidosDeEquipos,
  tieneTablaInicial,
  zonasDeCategoria,
} from '../../logica/consultas.js';
import { calcularTabla, tieneResultado } from '../../logica/tabla.js';
import { EditorPartido } from './EditorPartido.jsx';
import { NuevoPartido } from './NuevoPartido.jsx';
import { RenglonPartido } from './RenglonPartido.jsx';

export function AdminResultados({ db, acciones, filtro, fecha: fechaElegida, onFecha, abierto = null, onAbrir }) {
  const categoria = db.categorias.find((c) => c.id === filtro.categoriaId);
  const zonas = useMemo(() => zonasDeCategoria(db.zonas, categoria.id), [db.zonas, categoria.id]);
  const equipos = useMemo(() => {
    const ids = new Set(zonas.map((z) => z.id));
    return db.equipos.filter((e) => ids.has(e.zonaId));
  }, [db.equipos, zonas]);
  const partidos = useMemo(() => partidosDeCategoria(db.partidos, categoria.id), [db.partidos, categoria.id]);
  const conTablaInicial = tieneTablaInicial(db.tablaInicial, equipos);
  const fechas = useMemo(
    () => fechasConTablaInicial(agruparPorFecha(partidos), conTablaInicial),
    [partidos, conTablaInicial]
  );
  const proximaFecha = fechas.reduce((max, f) => Math.max(max, f.fecha), 0) + 1;

  // Por defecto: la primera fecha con partidos sin resultado o, si no hay, la próxima para armar
  const pendiente = fechas.find((f) => f.partidos.some((p) => !p.postergado && !tieneResultado(p)));
  // Postergados por recuperar, de todas las fechas: se ven juntos eligiendo "Postergados"
  const postergados = partidos.filter((p) => p.postergado).sort((a, b) => a.fecha - b.fecha || a.id - b.id);
  const verPostergados = fechaElegida === 'postergados' && postergados.length > 0;
  const elegidaValida =
    fechaElegida !== null && (fechaElegida === proximaFecha || fechas.some((f) => f.fecha === fechaElegida));
  const fecha = verPostergados
    ? 'postergados'
    : elegidaValida
      ? fechaElegida
      : pendiente
        ? pendiente.fecha
        : proximaFecha;
  const partidosFecha = verPostergados ? [] : partidos.filter((p) => p.fecha === fecha);
  // Cargado: con resultado (o W.O.) o postergado, que esa fecha ya no se carga
  const pendientes = partidosFecha.filter((p) => !tieneResultado(p) && !p.postergado);
  const cargados = partidosFecha.filter((p) => tieneResultado(p) || p.postergado);
  // Número de cada partido dentro de su fecha ("Fecha 2, partido 3"), también en la vista de postergados
  const numeroDe = new Map(fechas.flatMap((f) => f.partidos.map((p, i) => [p.id, i + 1])));

  // El partido abierto queda a la vista, también cuando pasa de pendientes a cargados al guardarlo
  const grupoDelAbierto = pendientes.some((p) => p.id === abierto)
    ? 'pendientes'
    : cargados.some((p) => p.id === abierto)
      ? 'cargados'
      : verPostergados && postergados.some((p) => p.id === abierto)
        ? 'postergados'
        : null;
  useEffect(() => {
    if (!grupoDelAbierto) return;
    const fila = document.getElementById(`fila-partido-${abierto}`);
    const reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (fila) fila.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' });
  }, [abierto, grupoDelAbierto]);

  // Resaltado de las filas que cambiaron en la tabla (se apaga al cambiar de categoría)
  const [resaltado, setResaltado] = useState({ ids: new Set(), version: 0 });
  const marcarCambio = (partido) =>
    setResaltado((r) => ({ ids: new Set([partido.localId, partido.visitanteId]), version: r.version + 1 }));
  const filtroSinResaltado = {
    ...filtro,
    onCategoria: (id) => {
      setResaltado((r) => ({ ids: new Set(), version: r.version }));
      filtro.onCategoria(id);
    },
  };

  const equipoPorId = new Map(db.equipos.map((e) => [e.id, e]));
  const zonaPorId = new Map(db.zonas.map((z) => [z.id, z]));
  const zonaDe = (equipoId) => (zonas.length > 1 ? zonaPorId.get(equipoPorId.get(equipoId)?.zonaId)?.nombre : null);

  const opcionesFecha = [
    ...fechas.map((f) => {
      const soloTablaInicial = f.fecha === 1 && conTablaInicial && !f.partidos.some((p) => !p.postergado);
      const estado = soloTablaInicial ? 'jugada' : estadoFecha(f.partidos);
      return {
        valor: f.fecha,
        etiqueta: (
          <>
            Fecha {f.fecha}
            <span className={`punto punto--${estado}`} aria-hidden="true" />
            <span className="visualmente-oculto"> ({ETIQUETA_ESTADO_FECHA[estado]})</span>
          </>
        ),
      };
    }),
    ...(postergados.length > 0 ? [{ valor: 'postergados', etiqueta: `Postergados (${postergados.length})` }] : []),
    { valor: proximaFecha, etiqueta: `+ Fecha ${proximaFecha}` },
  ];

  // detalle: texto chico junto al estado (en la vista de postergados, la fecha original)
  const renglon = (p, detalle) => (
    <RenglonPartido
      key={p.id}
      partido={p}
      detalle={detalle}
      local={equipoPorId.get(p.localId)}
      visitante={equipoPorId.get(p.visitanteId)}
      abierto={abierto === p.id}
      onTocar={() => onAbrir(abierto === p.id ? null : p.id)}
    >
      <EditorPartido
        key={`${p.id}-${p.golesLocal}-${p.golesVisitante}-${p.postergado}-${p.ausente}-${p.predio}-${p.cancha}-${p.hora}`}
        db={db}
        partido={p}
        numero={numeroDe.get(p.id)}
        local={equipoPorId.get(p.localId)}
        visitante={equipoPorId.get(p.visitanteId)}
        zonaLocal={zonaDe(p.localId)}
        zonaVisitante={zonaDe(p.visitanteId)}
        acciones={acciones}
        onCambio={marcarCambio}
      />
    </RenglonPartido>
  );

  return (
    <>
      <p className="admin-intro">
        Elegí la categoría y la fecha. Armá los partidos (también entre zonas), cargá los resultados y marcá los
        postergados.
      </p>

      <div className="panel">
        <FiltroCategoriaZona db={db} filtro={filtroSinResaltado} conZona={false} />
        <div className="campo">
          <span className="campo__label">Fecha</span>
          <Segmentado variante="chips" etiquetaGrupo="Fecha" opciones={opcionesFecha} valor={fecha} onCambiar={onFecha} />
        </div>
      </div>

      {fecha === 1 && conTablaInicial && (
        <p className="nota-fecha">
          La fecha 1 se cargó como tabla inicial. Acá están los partidos que quedaron postergados: cargales el
          resultado cuando se jueguen.
        </p>
      )}

      {verPostergados ? (
        <>
          <p className="nota-fecha">
            Partidos postergados de todas las fechas. Para recuperar uno, abrilo y reprogramalo con el día, la cancha y la
            hora: los veedores lo ven en Postergados. Cuando se juegue, cargale el resultado: queda en su fecha original y
            sale de esta lista.
          </p>
          <GrupoPartidos titulo={`Postergados de ${categoria.nombre} (${postergados.length})`}>
            {postergados.map((p) => renglon(p, `Fecha ${p.fecha}`))}
          </GrupoPartidos>
        </>
      ) : partidosFecha.length > 0 ? (
        <>
          <p className="progreso-fecha">{`${cargados.length} de ${partidosFecha.length} cargados`}</p>
          {pendientes.length > 0 ? (
            <GrupoPartidos titulo={`Pendientes de carga (${pendientes.length})`}>
              {pendientes.map((p) => renglon(p))}
            </GrupoPartidos>
          ) : (
            <p className="fecha-completa">
              <Icono nombre="check" tamano={18} />
              {`Listo: cargaste todos los partidos de la fecha ${fecha}.`}
            </p>
          )}
          {cargados.length > 0 && (
            <GrupoPartidos titulo={`Cargados (${cargados.length})`}>{cargados.map((p) => renglon(p))}</GrupoPartidos>
          )}
        </>
      ) : (
        <p className="vacio-texto">Todavía no hay partidos en la fecha {fecha}. Agregalos acá abajo.</p>
      )}

      {!verPostergados && (
        <NuevoPartido
          key={`${categoria.id}-${fecha}`}
          categoria={categoria}
          fecha={fecha}
          zonas={zonas}
          equipos={equipos}
          partidos={partidos}
          acciones={acciones}
        />
      )}

      <section className="panel" aria-labelledby="titulo-tablas-admin">
        <div className="panel__cab">
          <h3 id="titulo-tablas-admin" className="panel__titulo">Tablas de {categoria.nombre}</h3>
          <span className="panel__meta">Se recalculan solas al guardar</span>
        </div>
        {zonas.map((zona) => (
          <TablaDeZona key={zona.id} db={db} zona={zona} mostrarNombre={zonas.length > 1} resaltar={resaltado} />
        ))}
      </section>
    </>
  );
}

// Tabla de una zona con lo que hay cargado ahora
function TablaDeZona({ db, zona, mostrarNombre, resaltar }) {
  const equipos = useMemo(() => equiposDeZona(db.equipos, zona.id), [db.equipos, zona.id]);
  const partidos = useMemo(() => partidosDeEquipos(db.partidos, equipos), [db.partidos, equipos]);
  const criterios = db.configuracion.criteriosDesempate;
  const filas = useMemo(
    () => calcularTabla(equipos, partidos, criterios, db.tablaInicial),
    [equipos, partidos, criterios, db.tablaInicial]
  );
  return (
    <div className="tabla-zona">
      {mostrarNombre && <h4 className="tabla-zona__titulo">{zona.nombre}</h4>}
      <TablaPosiciones filas={filas} resaltar={resaltar} etiqueta={`Tabla ${zona.nombre}`} />
      <NotasDesempate filas={filas} criterios={criterios} />
    </div>
  );
}

// Uno de los dos grupos de la fecha: pendientes de carga o cargados
function GrupoPartidos({ titulo, children }) {
  return (
    <section className="grupo-partidos" aria-label={titulo}>
      <h3 className="grupo-partidos__titulo">{titulo}</h3>
      <ul className="renglones">{children}</ul>
    </section>
  );
}
