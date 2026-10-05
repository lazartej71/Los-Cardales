/**
 * Tarjetas de un partido: rojas (expulsiones, con su tipo y el aviso por WhatsApp). Las amarillas ya no
 * se cargan: las que había se siguen viendo y se pueden borrar.
 * Una roja sin sanción se borra acá; con sanción, se maneja en Suspendidos.
 * conAviso: false para los veedores, que no avisan por WhatsApp.
 */

import { useState } from 'react';
import { Icono } from '../../componentes/Icono.jsx';
import { Segmentado } from '../../componentes/Segmentado.jsx';
import { nombreRoja, TIPOS_ROJA } from '../../logica/expulsiones.js';
import { validarCamiseta } from '../../logica/validaciones.js';
import { AvisoWhatsApp } from './AvisoWhatsApp.jsx';

const contar = (cantidad, una, varias) => (cantidad === 0 ? '' : `${cantidad} ${cantidad === 1 ? una : varias}`);
const conNombre = (base, nombre) => (nombre ? `${base} (${nombre})` : base);

export function BloqueTarjetas({ db, partido, local, visitante, acciones, conAviso = true }) {
  const amarillas = db.tarjetas.filter((t) => t.partidoId === partido.id);
  const rojas = db.expulsiones.filter((e) => e.partidoId === partido.id);
  const resumen =
    [contar(amarillas.length, 'amarilla', 'amarillas'), contar(rojas.length, 'roja', 'rojas')]
      .filter(Boolean)
      .join(' · ') || 'Sin tarjetas';

  return (
    <details className="bloque">
      <summary className="bloque__cab">
        <span className="bloque__titulo">Tarjetas</span>
        <span className="bloque__resumen">{resumen}</span>
      </summary>
      <div className="bloque__cuerpo">
        {[local, visitante].map((equipo) => (
          <TarjetasDeEquipo
            key={equipo.id}
            db={db}
            partido={partido}
            equipo={equipo}
            amarillas={amarillas.filter((t) => t.equipoId === equipo.id)}
            rojas={rojas.filter((e) => e.equipoId === equipo.id)}
            acciones={acciones}
            conAviso={conAviso}
          />
        ))}
      </div>
    </details>
  );
}

function TarjetasDeEquipo({ db, partido, equipo, amarillas, rojas, acciones, conAviso }) {
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState(null); // id de la roja con el aviso abierto
  const [borrando, setBorrando] = useState(null);

  const borrar = async (clave, accion) => {
    setBorrando(clave);
    await accion();
    setBorrando(null);
  };
  const borrarAmarilla = (t) =>
    borrar(`a-${t.id}`, () =>
      acciones.borrarTarjeta(t.id, `Se borró la amarilla del N° ${t.numeroCamiseta} de ${equipo.nombre}.`)
    );
  const borrarRoja = (e) =>
    borrar(`r-${e.id}`, () =>
      acciones.borrarExpulsion(e.id, `Se borró la roja del N° ${e.numeroCamiseta} de ${equipo.nombre}.`)
    );

  return (
    <div className="tarjetas-equipo">
      <p className="tarjetas-equipo__nombre">{equipo.nombre}</p>
      {amarillas.length + rojas.length > 0 ? (
        <ul className="tarjetas-lista">
          {amarillas.map((t) => (
            <li key={`a-${t.id}`} className="tarjetas-lista__item">
              <span className="tarjeta-mini tarjeta-mini--amarilla" aria-hidden="true" />
              <span className="tarjetas-lista__texto">
                {conNombre(`Amarilla · N° ${t.numeroCamiseta}`, t.nombreJugador)}
              </span>
              <button
                type="button"
                className="btn-icono"
                aria-label={`Borrar la amarilla del N° ${t.numeroCamiseta}`}
                disabled={borrando === `a-${t.id}`}
                onClick={() => borrarAmarilla(t)}
              >
                <Icono nombre="basura" tamano={16} />
              </button>
            </li>
          ))}
          {rojas.map((e) => (
            <li key={`r-${e.id}`} className="tarjetas-lista__item">
              <span className="tarjeta-mini tarjeta-mini--roja" aria-hidden="true" />
              <span className="tarjetas-lista__texto">
                {conNombre(`${nombreRoja(e.tipo)} · N° ${e.numeroCamiseta}`, e.nombreJugador)}
              </span>
              {e.fechasSuspension === null && (
                <button
                  type="button"
                  className="btn-icono"
                  aria-label={`Borrar la roja del N° ${e.numeroCamiseta}`}
                  disabled={borrando === `r-${e.id}`}
                  onClick={() => borrarRoja(e)}
                >
                  <Icono nombre="basura" tamano={16} />
                </button>
              )}
              {conAviso && (
                <button
                  type="button"
                  className="btn btn--whatsapp btn--chico"
                  aria-expanded={aviso === e.id}
                  onClick={() => setAviso(aviso === e.id ? null : e.id)}
                >
                  Avisar
                </button>
              )}
              {conAviso && aviso === e.id && (
                <div className="tarjetas-lista__aviso">
                  <AvisoWhatsApp db={db} expulsion={e} />
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="campo__ayuda">Sin tarjetas.</p>
      )}
      {cargando ? (
        <FormRoja partido={partido} equipo={equipo} acciones={acciones} onListo={() => setCargando(false)} />
      ) : (
        <div className="tarjetas-equipo__botones">
          <button type="button" className="btn btn--secundario btn--chico" onClick={() => setCargando(true)}>
            + Roja
          </button>
        </div>
      )}
    </div>
  );
}

export function FormRoja({ partido, equipo, acciones, onListo }) {
  const [tipo, setTipo] = useState(null);
  const [numero, setNumero] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const idBase = `roja-${partido.id}-${equipo.id}`;

  const guardar = async (e) => {
    e.preventDefault();
    if (!tipo) {
      setError('Elegí si fue doble amarilla o roja directa.');
      return;
    }
    const camiseta = validarCamiseta(numero);
    if (camiseta === null) {
      setError('El número de camiseta es obligatorio (de 1 a 99).');
      return;
    }
    setGuardando(true);
    const datos = { partidoId: partido.id, equipoId: equipo.id, numeroCamiseta: camiseta, nombreJugador: nombre.trim(), tipo };
    const mensaje = `${nombreRoja(tipo)} guardada: N° ${camiseta} de ${equipo.nombre}. Ya figura en Suspendidos.`;
    const hecho = await acciones.crearExpulsion(datos, mensaje);
    setGuardando(false);
    if (hecho) onListo();
  };

  return (
    <form className="form-tarjeta" onSubmit={guardar} noValidate aria-label={`Roja para ${equipo.nombre}`}>
      <div className="campo">
        <span className="campo__label">Tipo de roja</span>
        <Segmentado
          variante="chips"
          etiquetaGrupo={`Tipo de roja para ${equipo.nombre}`}
          opciones={TIPOS_ROJA}
          valor={tipo}
          onCambiar={(valor) => {
            setTipo(valor);
            setError('');
          }}
        />
      </div>
      <div className="fila-campos">
        <div className="campo">
          <label className="campo__label" htmlFor={`${idBase}-numero`}>N° de camiseta</label>
          <input
            id={`${idBase}-numero`}
            className="input"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            autoComplete="off"
            value={numero}
            aria-invalid={Boolean(error) || undefined}
            onChange={(e) => {
              setNumero(e.target.value.replace(/\D/g, '').slice(0, 2));
              setError('');
            }}
          />
        </div>
        <div className="campo">
          <label className="campo__label" htmlFor={`${idBase}-nombre`}>Nombre (opcional)</label>
          <input
            id={`${idBase}-nombre`}
            className="input"
            autoComplete="off"
            maxLength={60}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>
      </div>
      {error && (
        <p className="campo__error" role="alert">
          {error}
        </p>
      )}
      <div className="form-tarjeta__acciones">
        <button type="submit" className="btn btn--chico btn--peligro" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar roja'}
        </button>
        <button type="button" className="btn btn--fantasma btn--chico" onClick={onListo}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
