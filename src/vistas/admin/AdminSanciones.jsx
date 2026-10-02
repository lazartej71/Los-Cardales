/**
 * Panel: expulsados y suspendidos (información privada).
 */

import { useMemo, useState } from 'react';
import { Icono } from '../../componentes/Icono.jsx';
import { Marcador, Pill } from '../../componentes/Marcador.jsx';
import { Segmentado } from '../../componentes/Segmentado.jsx';
import { Stepper } from '../../componentes/Stepper.jsx';
import { detalleExpulsion } from '../../logica/consultas.js';
import { estadoExpulsion, linkWhatsApp, mensajeExpulsion, soloDigitos } from '../../logica/expulsiones.js';

const ESTADOS_SANCION = [
  { id: 'pendiente', etiqueta: 'Pendientes de tribunal' },
  { id: 'suspendido', etiqueta: 'Suspendidos' },
  { id: 'habilitado', etiqueta: 'Habilitados' },
];

export function AdminSanciones({ db, acciones, onIrACargar }) {
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [aEliminar, setAEliminar] = useState(null);
  const categorias = [...db.categorias].sort((a, b) => a.orden - b.orden);

  const items = useMemo(
    () =>
      db.expulsiones
        .map((expulsion) => ({ expulsion, detalle: detalleExpulsion(db, expulsion), estado: estadoExpulsion(expulsion) }))
        .filter((x) => x.detalle),
    [db]
  );

  const conteo = { pendiente: 0, suspendido: 0, habilitado: 0 };
  items.forEach((x) => {
    conteo[x.estado.tipo] += 1;
  });

  // Orden estable (fecha más reciente primero) para que las tarjetas no salten al editarlas
  const visibles = items
    .filter((x) => categoriaFiltro === 'todas' || x.detalle.categoria.id === categoriaFiltro)
    .filter((x) => estadoFiltro === 'todos' || x.estado.tipo === estadoFiltro)
    .sort((a, b) => b.detalle.partido.fecha - a.detalle.partido.fecha || b.expulsion.id - a.expulsion.id);

  return (
    <>
      <div className="privado" role="note">
        <Icono nombre="candado" tamano={18} />
        <p>
          <strong>Información privada.</strong> Los expulsados y suspendidos no aparecen en la vista pública.
        </p>
      </div>

      <div className="resumen" role="group" aria-label="Filtrar por estado">
        {ESTADOS_SANCION.map((e) => (
          <button
            key={e.id}
            type="button"
            className={`resumen__item resumen__item--${e.id}`}
            aria-pressed={estadoFiltro === e.id}
            onClick={() => setEstadoFiltro((actual) => (actual === e.id ? 'todos' : e.id))}
          >
            <span className="resumen__num">{conteo[e.id]}</span>
            <span className="resumen__txt">{e.etiqueta}</span>
          </button>
        ))}
      </div>

      <Segmentado
        variante="chips"
        etiquetaGrupo="Categoría"
        opciones={[{ valor: 'todas', etiqueta: 'Todas' }, ...categorias.map((c) => ({ valor: c.id, etiqueta: c.nombre }))]}
        valor={categoriaFiltro}
        onCambiar={setCategoriaFiltro}
      />

      {items.length === 0 ? (
        <div className="panel vacio">
          <p>No hay expulsiones cargadas.</p>
          <button type="button" className="btn btn--primario" onClick={onIrACargar}>Cargar desde Partidos</button>
        </div>
      ) : visibles.length === 0 ? (
        <div className="panel vacio">
          <p>No hay expulsiones con ese filtro.</p>
          <button
            type="button"
            className="btn btn--secundario"
            onClick={() => {
              setCategoriaFiltro('todas');
              setEstadoFiltro('todos');
            }}
          >
            Ver todas
          </button>
        </div>
      ) : (
        <div className="sanciones">
          {visibles.map((x) => (
            <TarjetaSancion
              key={`${x.expulsion.id}-${x.expulsion.fechasSuspension}`}
              {...x}
              acciones={acciones}
              confirmando={aEliminar === x.expulsion.id}
              onPedirEliminar={() => setAEliminar(x.expulsion.id)}
              onCancelarEliminar={() => setAEliminar(null)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function TarjetaSancion({ expulsion, detalle, estado, acciones, confirmando, onPedirEliminar, onCancelarEliminar }) {
  const { fechasSuspension, fechasCumplidas } = expulsion;
  const suspensionGuardada = fechasSuspension === null ? '' : String(fechasSuspension);
  const [suspension, setSuspension] = useState(suspensionGuardada);
  const [guardando, setGuardando] = useState(false);
  const idBase = `sancion-${expulsion.id}`;
  const quien = `N° ${expulsion.numeroCamiseta} de ${detalle.equipo.nombre}`;
  const telefono = soloDigitos(detalle.equipo.telefonoDelegado);

  const ejecutar = async (accion) => {
    setGuardando(true);
    const resultado = await accion();
    setGuardando(false);
    return resultado;
  };
  const actualizar = (cambios, mensaje) => ejecutar(() => acciones.actualizarExpulsion(expulsion.id, cambios, mensaje));

  const guardarSuspension = () => {
    const valor = suspension === '' ? null : Number(suspension);
    const texto = valor === 1 ? '1 fecha' : `${valor} fechas`;
    actualizar(
      { fechasSuspension: valor },
      valor === null ? `${quien} quedó pendiente de tribunal.` : `Suspensión de ${quien}: ${texto}.`
    );
  };
  const sumarCumplida = () => {
    const cumplidas = fechasCumplidas + 1;
    actualizar(
      { fechasCumplidas: cumplidas },
      cumplidas >= fechasSuspension
        ? `${quien} cumplió la suspensión y quedó habilitado.`
        : `Se sumó una fecha cumplida a ${quien}.`
    );
  };
  const eliminar = async () => {
    const ok = await ejecutar(() => acciones.borrarExpulsion(expulsion.id, `Se eliminó la expulsión del ${quien}.`));
    if (ok) onCancelarEliminar();
  };

  return (
    <article className="sancion" aria-labelledby={`${idBase}-nombre`}>
      <header className="sancion__cab">
        <span className="tarjeta-roja" aria-hidden="true">{expulsion.numeroCamiseta}</span>
        <div>
          <h3 id={`${idBase}-nombre`} className="sancion__nombre">
            {expulsion.nombreJugador || 'Jugador sin nombre'}
          </h3>
          <p className="sancion__equipo">
            {quien}, {detalle.categoria.nombre} {detalle.zona.nombre}
          </p>
        </div>
        <span className="sancion__estado">
          <Pill tipo={estado.tipo}>{estado.texto}</Pill>
        </span>
      </header>

      <p className="sancion__partido">
        <span>Fecha {detalle.partido.fecha}:</span>
        <span>{detalle.local.nombre}</span>
        <Marcador partido={detalle.partido} />
        <span>{detalle.visitante.nombre}</span>
      </p>

      <div className="sancion__control">
        <div className="campo">
          <label className="campo__label" htmlFor={`${idBase}-fechas`}>Fechas de suspensión</label>
          <Stepper
            id={`${idBase}-fechas`}
            ancho
            valor={suspension}
            placeholder="Sin definir"
            etiqueta="fechas de suspensión"
            onCambiar={setSuspension}
          />
          {suspension !== suspensionGuardada && (
            <button type="button" className="btn btn--primario btn--chico" onClick={guardarSuspension} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar suspensión'}
            </button>
          )}
          {fechasSuspension === null ? (
            <span className="campo__ayuda">La define el tribunal de faltas.</span>
          ) : (
            <button
              type="button"
              className="enlace"
              style={{ justifySelf: 'start' }}
              disabled={guardando}
              onClick={() => actualizar({ fechasSuspension: null }, `${quien} quedó pendiente de tribunal.`)}
            >
              Dejar pendiente de tribunal
            </button>
          )}
        </div>

        <div className="campo">
          <span className="campo__label">Fechas cumplidas</span>
          <div className="cumplidas">
            <span className="cumplidas__valor">
              {fechasCumplidas}
              {fechasSuspension !== null ? ` de ${fechasSuspension}` : ''}
            </span>
            <button
              type="button"
              className="btn btn--secundario btn--chico"
              disabled={guardando || fechasSuspension === null || fechasCumplidas >= fechasSuspension}
              onClick={sumarCumplida}
            >
              <Icono nombre="mas" tamano={16} /> Sumar fecha
            </button>
            <button
              type="button"
              className="btn-icono"
              aria-label="Restar una fecha cumplida"
              disabled={guardando || fechasCumplidas <= 0}
              onClick={() =>
                actualizar({ fechasCumplidas: fechasCumplidas - 1 }, `Se restó una fecha cumplida a ${quien}.`)
              }
            >
              <Icono nombre="menos" tamano={18} />
            </button>
          </div>
          {fechasSuspension > 0 && (
            <div
              className="progreso"
              role="progressbar"
              aria-label="Fechas cumplidas"
              aria-valuemin={0}
              aria-valuemax={fechasSuspension}
              aria-valuenow={fechasCumplidas}
            >
              <span style={{ width: `${Math.min(100, (fechasCumplidas / fechasSuspension) * 100)}%` }} />
            </div>
          )}
        </div>
      </div>

      <footer className="sancion__acciones">
        {confirmando ? (
          <div className="confirmar" role="alert">
            <p>¿Eliminar esta expulsión? Usalo solo si se cargó por error: no se puede deshacer.</p>
            <button type="button" className="btn btn--peligro btn--chico" onClick={eliminar} disabled={guardando}>
              Sí, eliminar
            </button>
            <button type="button" className="btn btn--fantasma btn--chico" onClick={onCancelarEliminar}>
              Cancelar
            </button>
          </div>
        ) : (
          <>
            {telefono ? (
              <a
                className="btn btn--whatsapp btn--chico"
                href={linkWhatsApp(telefono, mensajeExpulsion(expulsion, detalle))}
                target="_blank"
                rel="noopener noreferrer"
              >
                📲 Reenviar aviso
              </a>
            ) : (
              <span className="campo__ayuda">Sin WhatsApp del delegado (cargalo en Equipos).</span>
            )}
            <button type="button" className="btn btn--fantasma btn--chico btn--texto-peligro" onClick={onPedirEliminar}>
              <Icono nombre="basura" tamano={16} /> Eliminar
            </button>
          </>
        )}
      </footer>
    </article>
  );
}
