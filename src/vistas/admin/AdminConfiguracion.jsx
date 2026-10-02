/**
 * Panel: nombre del campeonato y criterios de desempate.
 */

import { useMemo, useState } from 'react';
import { Icono } from '../../componentes/Icono.jsx';
import { FiltroCategoriaZona } from '../../componentes/Segmentado.jsx';
import { NotasDesempate, TablaPosiciones } from '../../componentes/TablaPosiciones.jsx';
import { CRITERIOS, CRITERIOS_POR_DEFECTO } from '../../datos/constantes.js';
import { equiposDeZona, partidosDeEquipos } from '../../logica/consultas.js';
import { calcularTabla } from '../../logica/tabla.js';
import { formatearMiles, formatearPesos, leerMonto } from '../../logica/cuentas.js';

function FormNombreCampeonato({ nombreActual, onGuardar }) {
  const [nombre, setNombre] = useState(nombreActual);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    const limpio = nombre.trim();
    if (!limpio) {
      setError('Escribí el nombre del campeonato.');
      return;
    }
    setGuardando(true);
    await onGuardar(limpio);
    setGuardando(false);
  };

  return (
    <form className="panel" onSubmit={guardar} noValidate aria-labelledby="titulo-nombre">
      <h3 id="titulo-nombre" className="panel__titulo">Nombre del campeonato</h3>
      <div className="fila-form">
        <div className="campo">
          <label className="campo__label" htmlFor="cfg-nombre">Se muestra debajo del logo</label>
          <input
            id="cfg-nombre"
            className="input"
            maxLength={60}
            value={nombre}
            aria-invalid={Boolean(error) || undefined}
            onChange={(e) => {
              setNombre(e.target.value);
              setError('');
            }}
          />
        </div>
        <button type="submit" className="btn btn--primario" disabled={guardando || nombre.trim() === nombreActual}>
          {guardando ? 'Guardando…' : 'Guardar nombre'}
        </button>
      </div>
      {error && (
        <p className="campo__error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function FormArancel({ arancelActual, onGuardar }) {
  const [monto, setMonto] = useState(formatearMiles(arancelActual));
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const valor = leerMonto(monto);

  const guardar = async (e) => {
    e.preventDefault();
    if (valor === null) {
      setError('Escribí el arancel en pesos, por ejemplo 105.000.');
      return;
    }
    setGuardando(true);
    await onGuardar(valor);
    setGuardando(false);
  };

  return (
    <form className="panel" onSubmit={guardar} noValidate aria-labelledby="titulo-arancel">
      <h3 id="titulo-arancel" className="panel__titulo">Arancel por equipo y partido</h3>
      <div className="fila-form">
        <div className="campo">
          <label className="campo__label" htmlFor="cfg-arancel">En pesos</label>
          <div className="pago__monto">
            <span className="pago__signo" aria-hidden="true">$</span>
            <input
              id="cfg-arancel"
              className="input"
              inputMode="numeric"
              autoComplete="off"
              value={monto}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby="cfg-arancel-ayuda"
              onChange={(e) => {
                setMonto(e.target.value.replace(/[^\d.,]/g, ''));
                setError('');
              }}
            />
          </div>
          <p id="cfg-arancel-ayuda" className="campo__ayuda">Cambiarlo recalcula todas las cuentas del torneo.</p>
        </div>
        <button type="submit" className="btn btn--primario" disabled={guardando || valor === arancelActual}>
          {guardando ? 'Guardando…' : 'Guardar arancel'}
        </button>
      </div>
      {error && (
        <p className="campo__error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

export function AdminConfiguracion({ db, acciones, filtro }) {
  const [guardando, setGuardando] = useState(false);
  const criterios = db.configuracion.criteriosDesempate;
  const esOrdenPorDefecto = criterios.join() === CRITERIOS_POR_DEFECTO.join();

  // Vista previa: la tabla de la zona elegida con el orden actual
  const categoria = db.categorias.find((c) => c.id === filtro.categoriaId);
  const zona = db.zonas.find((z) => z.id === filtro.zonaId);
  const equipos = useMemo(() => equiposDeZona(db.equipos, zona.id), [db.equipos, zona.id]);
  const partidos = useMemo(() => partidosDeEquipos(db.partidos, equipos), [db.partidos, equipos]);
  const filas = useMemo(
    () => calcularTabla(equipos, partidos, criterios, db.tablaInicial),
    [equipos, partidos, criterios, db.tablaInicial]
  );

  const guardarCriterios = async (lista, mensaje) => {
    setGuardando(true);
    await acciones.actualizarConfiguracion({ criteriosDesempate: lista }, mensaje);
    setGuardando(false);
  };

  const mover = (indice, delta) => {
    const destino = indice + delta;
    if (destino < 0 || destino >= criterios.length) return;
    const lista = [...criterios];
    [lista[indice], lista[destino]] = [lista[destino], lista[indice]];
    guardarCriterios(lista);
  };

  return (
    <>
      <FormNombreCampeonato
        key={db.configuracion.nombreCampeonato}
        nombreActual={db.configuracion.nombreCampeonato}
        onGuardar={(nombre) =>
          acciones.actualizarConfiguracion({ nombreCampeonato: nombre }, 'Nombre del campeonato guardado.')
        }
      />

      <FormArancel
        key={db.configuracion.arancel}
        arancelActual={db.configuracion.arancel}
        onGuardar={(arancel) =>
          acciones.actualizarConfiguracion({ arancel }, `Arancel guardado: ${formatearPesos(arancel)} por equipo y partido.`)
        }
      />

      <section className="panel" aria-labelledby="titulo-criterios">
        <div className="panel__cab">
          <h3 id="titulo-criterios" className="panel__titulo">Criterios de desempate</h3>
          {!esOrdenPorDefecto && (
            <button
              type="button"
              className="enlace"
              disabled={guardando}
              onClick={() => guardarCriterios([...CRITERIOS_POR_DEFECTO], 'Se restableció el orden de desempate.')}
            >
              Restablecer orden
            </button>
          )}
        </div>
        <p className="panel__texto">
          La tabla se ordena por el primer criterio. Si dos equipos quedan iguales, se usa el siguiente, y así hasta
          el último. Si empatan en todo, se ordenan por nombre.
        </p>
        <ol className="criterios">
          {criterios.map((c, i) => (
            <li key={c} className="criterio">
              <span className="criterio__num" aria-hidden="true">{i + 1}</span>
              <div className="criterio__texto">
                <strong>{CRITERIOS[c].nombre}</strong>
                <span>{CRITERIOS[c].detalle}</span>
              </div>
              <div className="criterio__botones">
                <button
                  type="button"
                  className="btn-icono"
                  aria-label={`Subir ${CRITERIOS[c].nombre}`}
                  disabled={guardando || i === 0}
                  onClick={() => mover(i, -1)}
                >
                  <Icono nombre="arriba" tamano={18} />
                </button>
                <button
                  type="button"
                  className="btn-icono"
                  aria-label={`Bajar ${CRITERIOS[c].nombre}`}
                  disabled={guardando || i === criterios.length - 1}
                  onClick={() => mover(i, 1)}
                >
                  <Icono nombre="abajo" tamano={18} />
                </button>
              </div>
            </li>
          ))}
        </ol>

        <div className="vista-previa">
          <div className="panel__cab">
            <h4 className="panel__titulo">Vista previa</h4>
            <span className="panel__meta">
              {categoria.nombre}, {zona.nombre}
            </span>
          </div>
          <FiltroCategoriaZona db={db} filtro={filtro} />
          <TablaPosiciones filas={filas} etiqueta="Vista previa de la tabla" />
          <NotasDesempate filas={filas} criterios={criterios} />
        </div>
      </section>
    </>
  );
}
