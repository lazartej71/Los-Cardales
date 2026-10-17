/**
 * Cargar partidos por cancha: se elige el predio, después la cancha, y se cargan los partidos de esa
 * cancha en la fecha en juego de cada categoría. Una barra fija arriba vuelve a elegir otra cancha. Aparte,
 * el botón Postergados lleva a los postergados reprogramados para un día especial, con los mismos pasos.
 * En cada partido: resultado, W.O., rojas y arancel (postergar, borrar y el lugar se hacen en Partidos).
 * La usan los veedores y el panel en la pestaña Cargar (admin: además avisa las rojas por WhatsApp).
 * encabezado: "Veedores" o "Cargar resultados" (el título suma la fecha o "Postergados"). Si una categoría
 * va una fecha adelante, el título dice las dos ("Fechas 4 y 5") y cada partido, la suya.
 * inicial: { modo, predio, cancha, abierto } para arrancar en un paso (si no, lo que recuerda el celular).
 * Con Fútbol 7 cargado trabaja en una modalidad: la que recibe (panel, veedor de una modalidad) o, si no
 * recibe ninguna (veedor sin modalidad), la que se elige en un primer paso. Se ven sus canchas y partidos.
 * registroSinGuardar: antes de cambiar de cancha o cerrar un partido con goles sin guardar, pregunta.
 */

import { useState } from 'react';
import { Icono } from '../../componentes/Icono.jsx';
import { MODALIDADES, PREDIOS } from '../../datos/constantes.js';
import { equiposDePartidos, hayEscudos } from '../../logica/escudos.js';
import { canchasDe, nombreCancha, nombrePredio } from '../../logica/lugar.js';
import { filtrarPorModalidad, hayFutbol7, nombreModalidad } from '../../logica/modalidades.js';
import { confirmarDescarte } from '../../logica/sinGuardar.js';
import { tieneResultado } from '../../logica/tabla.js';
import {
  fechasDeVeedores,
  listaDeFechas,
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

export function CargaPorCancha({
  db: dbCompleta,
  acciones,
  encabezado,
  inicial = {},
  almacen = null,
  admin = false,
  modalidad = null,
  registroSinGuardar = null,
}) {
  const [eleccion, setEleccion] = useState(() => {
    const guardada = leerCanchaGuardada(almacen);
    // Un predio guardado sin modalidad es de antes de Fútbol 7: de Fútbol 11
    const deGuardada = guardada.modalidad ?? (guardada.predio ? 'f11' : null);
    return {
      modo: 'fecha',
      predio: null,
      cancha: null,
      abierto: null,
      ...guardada,
      modalidad: deGuardada ?? modalidad ?? null,
      ...inicial,
    };
  });
  const conFutbol7 = hayFutbol7(dbCompleta.categorias);
  // Un veedor sin modalidad elige primero en cuál carga
  const falteModalidad = !modalidad && conFutbol7 && !eleccion.modalidad;
  const activa = modalidad ?? (conFutbol7 ? (eleccion.modalidad ?? 'f11') : 'f11');
  // El predio y la cancha elegidos (o guardados) son de una modalidad: en la otra no sirven
  const deEstaModalidad = !falteModalidad && (eleccion.modalidad ?? 'f11') === activa;
  const { modo, abierto } = eleccion;
  const predio = deEstaModalidad ? eleccion.predio : null;
  const cancha = predio ? eleccion.cancha : null;
  const db = filtrarPorModalidad(dbCompleta, activa);
  const fechas = fechasDeVeedores(db.partidos);
  const postergados = modo === 'postergados';
  const reprogramados = partidosDeVeedor(db.partidos, 'postergados');

  const elegir = (cambios) => {
    if (!confirmarDescarte(registroSinGuardar)) return;
    const nueva = { ...eleccion, modalidad: activa, predio, cancha, abierto: null, ...cambios };
    setEleccion(nueva);
    guardarCancha(almacen, nueva);
    window.scrollTo(0, 0);
  };
  const abrir = (id) => {
    if (!confirmarDescarte(registroSinGuardar)) return;
    setEleccion((e) => ({ ...e, abierto: e.abierto === id ? null : id }));
  };

  let contenido;
  if (falteModalidad) {
    contenido = (
      <>
        <p className="admin-intro">Elegí la modalidad.</p>
        <div className="veedor-opciones">
          {MODALIDADES.map((m) => {
            const resumen = resumenPartidos(partidosDeVeedor(filtrarPorModalidad(dbCompleta, m.id).partidos, modo));
            return (
              <Opcion
                key={m.id}
                titulo={m.nombre}
                detalle={textoResumen(resumen)}
                onElegir={() => elegir({ modalidad: m.id, predio: null, cancha: null })}
              />
            );
          })}
        </div>
      </>
    );
  } else if (!predio) {
    contenido = (
      <>
        {postergados && (
          <Barra texto="Volver" lugar="Postergados" onVolver={() => elegir({ modo: 'fecha', predio: null, cancha: null })} />
        )}
        {!postergados && !modalidad && conFutbol7 && (
          <Barra
            texto="Modalidad"
            lugar={nombreModalidad(activa)}
            onVolver={() => elegir({ modalidad: null, predio: null, cancha: null })}
          />
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
          {canchasDe(predio, activa).map((numero) => {
            const resumen = resumenPartidos(partidosDeCancha(db.partidos, predio, numero, modo));
            return (
              <Opcion
                key={numero}
                titulo={nombreCancha(numero)}
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
          lugar={`${nombrePredio(predio)} · ${nombreCancha(cancha)}`}
          onVolver={() => elegir({ cancha: null })}
        />
        <PartidosDeCancha
          db={db}
          partidos={partidosDeCancha(db.partidos, predio, cancha, modo)}
          postergados={postergados}
          fechas={fechas}
          abierto={abierto}
          onAbrir={abrir}
          acciones={acciones}
          admin={admin}
          registroSinGuardar={registroSinGuardar}
        />
      </>
    );
  }

  // Con Fútbol 7 cargado, el título dice la modalidad: "Cargar resultados · Fútbol 7 · Fecha 3"
  const conModalidad = conFutbol7 && !falteModalidad ? `${encabezado} · ${nombreModalidad(activa)}` : encabezado;
  let titulo = `${conModalidad} · ${fechas.length > 1 ? 'Fechas' : 'Fecha'} ${listaDeFechas(fechas)}`;
  if (falteModalidad) titulo = encabezado;
  else if (postergados) titulo = `${conModalidad} · Postergados`;

  return (
    <>
      <h2 className="admin-main__titulo">{titulo}</h2>
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

function PartidosDeCancha({ db, partidos, postergados, fechas, abierto, onAbrir, acciones, admin, registroSinGuardar }) {
  const variasFechas = fechas.length > 1;
  if (!partidos.length) {
    const enFecha = `${variasFechas ? 'las fechas' : 'la fecha'} ${listaDeFechas(fechas)}`;
    const vacio = postergados ? 'No hay postergados en esta cancha.' : `No hay partidos en esta cancha en ${enFecha}.`;
    return <p className="vacio-texto">{vacio}</p>;
  }

  const equipo = (id) => db.equipos.find((e) => e.id === id);
  // Escudos en los renglones si algún equipo de esta cancha tiene
  const conEscudos = hayEscudos(equiposDePartidos(partidos, equipo));
  const categoria = (p) => db.categorias.find((c) => c.id === p.categoriaId)?.nombre ?? '';
  // Un postergado dice de qué fecha es (suma en esa fecha al cargarle el resultado). Si las categorías van
  // por fechas distintas, cada partido dice la suya.
  const detalle = (p) => {
    if (postergados) return `${categoria(p)} · Postergado de la fecha ${p.fecha}`;
    return variasFechas ? `${categoria(p)} · Fecha ${p.fecha}` : categoria(p);
  };
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
        registroSinGuardar={registroSinGuardar}
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
