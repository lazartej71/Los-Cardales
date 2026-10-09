/**
 * Cargar partidos por cancha: se elige el predio, después la cancha, y se cargan los partidos de esa
 * cancha en la fecha en juego. Una barra fija arriba vuelve a elegir otra cancha. Aparte, el botón
 * Postergados lleva a los postergados reprogramados para un día especial, con los mismos pasos.
 * En cada partido: resultado, W.O., rojas y arancel (postergar, borrar y el lugar se hacen en Partidos).
 * La usan los veedores y el panel en la pestaña Cargar (admin: además avisa las rojas por WhatsApp).
 * encabezado: "Veedores" o "Cargar resultados" (el título suma la fecha o "Postergados").
 * inicial: { modo, predio, cancha, abierto } para arrancar en un paso (si no, lo que recuerda el celular).
 */

import { useState } from 'react';
import { Icono } from '../../componentes/Icono.jsx';
import { PREDIOS } from '../../datos/constantes.js';
import { equiposDePartidos, hayEscudos } from '../../logica/escudos.js';
import { canchasDe, nombrePredio } from '../../logica/lugar.js';
import { tieneResultado } from '../../logica/tabla.js';
import {
  fechaDeVeedores,
  partidosDeCancha,
  partidosDePredio,
  partidosDeVeedor,
  resumenPartidos,
} from '../../logica/veedores.js';
import { EditorPartido } from '../admin/EditorPartido.jsx';
import { RenglonPartido } from '../admin/RenglonPartido.jsx';
import { guardarCancha, leerCanchaGuardada } from './canchaGuardada.js';

// "3 partidos · 1 por cargar", "1 partido · todos cargados", "Sin partidos"
function textoResumen({ total, porCargar }) {
  if (total === 0) return 'Sin partidos';
  return `${total} ${total === 1 ? 'partido' : 'partidos'} · ${porCargar ? `${porCargar} por cargar` : 'todos cargados'}`;
}

export function CargaPorCancha({ db, acciones, encabezado, inicial = {}, almacen = null, admin = false }) {
  const [eleccion, setEleccion] = useState(() => ({
    modo: 'fecha',
    predio: null,
    cancha: null,
    abierto: null,
    ...leerCanchaGuardada(almacen),
    ...inicial,
  }));
  const { modo, predio, cancha, abierto } = eleccion;
  const fecha = fechaDeVeedores(db.partidos);
  const postergados = modo === 'postergados';
  const reprogramados = partidosDeVeedor(db.partidos, 'postergados');

  const elegir = (cambios) => {
    const nueva = { ...eleccion, abierto: null, ...cambios };
    setEleccion(nueva);
    guardarCancha(almacen, nueva);
    window.scrollTo(0, 0);
  };

  let contenido;
  if (!predio) {
    contenido = (
      <>
        {postergados && (
          <Barra texto="Volver" lugar="Postergados" onVolver={() => elegir({ modo: 'fecha', predio: null, cancha: null })} />
        )}
        <p className="admin-intro">Elegí el predio donde estás.</p>
        <div className="veedor-opciones">
          {PREDIOS.map((p) => {
            const resumen = resumenPartidos(partidosDePredio(db.partidos, p.id, modo));
            return (
              <Opcion
                key={p.id}
                titulo={p.nombre}
                detalle={textoResumen(resumen)}
                apagada={resumen.total === 0}
                onElegir={() => elegir({ predio: p.id, cancha: null })}
              />
            );
          })}
          {!postergados && reprogramados.length > 0 && (
            <Opcion
              titulo="Postergados"
              detalle={textoResumen(resumenPartidos(reprogramados))}
              destacada
              onElegir={() => elegir({ modo: 'postergados', predio: null, cancha: null })}
            />
          )}
        </div>
      </>
    );
  } else if (!cancha) {
    contenido = (
      <>
        <Barra
          texto="Predios"
          lugar={postergados ? `Postergados · ${nombrePredio(predio)}` : nombrePredio(predio)}
          onVolver={() => elegir({ predio: null, cancha: null })}
        />
        <p className="admin-intro">{`Elegí la cancha de ${nombrePredio(predio)}.`}</p>
        <div className="veedor-opciones veedor-opciones--canchas">
          {canchasDe(predio).map((numero) => {
            const resumen = resumenPartidos(partidosDeCancha(db.partidos, predio, numero, modo));
            return (
              <Opcion
                key={numero}
                titulo={`Cancha ${numero}`}
                detalle={textoResumen(resumen)}
                apagada={resumen.total === 0}
                onElegir={() => elegir({ cancha: numero })}
              />
            );
          })}
        </div>
      </>
    );
  } else {
    contenido = (
      <>
        <Barra
          texto="Cambiar cancha"
          lugar={`${nombrePredio(predio)} · Cancha ${cancha}`}
          onVolver={() => elegir({ cancha: null })}
        />
        <PartidosDeCancha
          db={db}
          partidos={partidosDeCancha(db.partidos, predio, cancha, modo)}
          postergados={postergados}
          fecha={fecha}
          abierto={abierto}
          onAbrir={(id) => setEleccion((e) => ({ ...e, abierto: e.abierto === id ? null : id }))}
          acciones={acciones}
          admin={admin}
        />
      </>
    );
  }

  return (
    <>
      <h2 className="admin-main__titulo">{postergados ? `${encabezado} · Postergados` : `${encabezado} · Fecha ${fecha}`}</h2>
      {contenido}
    </>
  );
}

// Botón grande para elegir un predio, una cancha o los postergados
function Opcion({ titulo, detalle, apagada = false, destacada = false, onElegir }) {
  return (
    <button
      type="button"
      className={`veedor-opcion${destacada ? ' veedor-opcion--destacada' : ''}`}
      disabled={apagada}
      onClick={onElegir}
    >
      <span className="veedor-opcion__titulo">{titulo}</span>
      <span className="veedor-opcion__detalle">{detalle}</span>
    </button>
  );
}

// Barra fija arriba: volver al paso anterior y dónde está el veedor
function Barra({ texto, lugar, onVolver }) {
  return (
    <div className="veedor-barra">
      <button type="button" className="btn btn--secundario btn--chico" onClick={onVolver}>
        <span aria-hidden="true">←</span> {texto}
      </button>
      <span className="veedor-barra__lugar">{lugar}</span>
    </div>
  );
}

function PartidosDeCancha({ db, partidos, postergados, fecha, abierto, onAbrir, acciones, admin }) {
  if (!partidos.length) {
    const vacio = postergados ? 'No hay postergados en esta cancha.' : `No hay partidos en esta cancha en la fecha ${fecha}.`;
    return <p className="vacio-texto">{vacio}</p>;
  }

  const equipo = (id) => db.equipos.find((e) => e.id === id);
  // Escudos en los renglones si algún equipo de esta cancha tiene
  const conEscudos = hayEscudos(equiposDePartidos(partidos, equipo));
  const categoria = (p) => db.categorias.find((c) => c.id === p.categoriaId)?.nombre ?? '';
  // Un postergado dice de qué fecha es (suma en esa fecha al cargarle el resultado)
  const detalle = (p) => (postergados ? `${categoria(p)} · Postergado de la fecha ${p.fecha}` : categoria(p));
  const porCargar = partidos.filter((p) => !tieneResultado(p));
  const cargados = partidos.filter(tieneResultado);

  const renglon = (p) => (
    <RenglonPartido
      key={p.id}
      partido={p}
      detalle={detalle(p)}
      local={equipo(p.localId)}
      visitante={equipo(p.visitanteId)}
      conEscudos={conEscudos}
      abierto={abierto === p.id}
      onTocar={() => onAbrir(p.id)}
    >
      <EditorPartido
        key={`${p.id}-${p.golesLocal}-${p.golesVisitante}-${p.ausente}`}
        db={db}
        partido={p}
        local={equipo(p.localId)}
        visitante={equipo(p.visitanteId)}
        zonaLocal={null}
        zonaVisitante={null}
        acciones={acciones}
        onCambio={() => {}}
        veedor={!admin}
        soloCarga
        titulo={`${categoria(p)} · ${postergados ? 'postergado de la ' : ''}fecha ${p.fecha}`}
      />
    </RenglonPartido>
  );

  return (
    <>
      {porCargar.length > 0 ? (
        <Grupo titulo={`Por cargar (${porCargar.length})`}>{porCargar.map(renglon)}</Grupo>
      ) : (
        <p className="fecha-completa">
          <Icono nombre="check" tamano={18} />
          Listo: cargaste todos los partidos de esta cancha.
        </p>
      )}
      {cargados.length > 0 && <Grupo titulo={`Cargados (${cargados.length})`}>{cargados.map(renglon)}</Grupo>}
    </>
  );
}

function Grupo({ titulo, children }) {
  return (
    <section className="grupo-partidos" aria-label={titulo}>
      <h3 className="grupo-partidos__titulo">{titulo}</h3>
      <ul className="renglones">{children}</ul>
    </section>
  );
}
