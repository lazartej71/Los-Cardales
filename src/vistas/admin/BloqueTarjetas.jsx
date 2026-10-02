/**
 * Tarjetas de un partido: amarillas (solo registro) y rojas (expulsiones, con aviso por WhatsApp).
 * Las rojas se suspenden y se borran en Suspendidos.
 */

import { useState } from 'react';
import { Icono } from '../../componentes/Icono.jsx';
import { validarCamiseta } from '../../logica/validaciones.js';
import { AvisoWhatsApp } from './AvisoWhatsApp.jsx';

const contar = (cantidad, una, varias) => (cantidad === 0 ? '' : `${cantidad} ${cantidad === 1 ? una : varias}`);
const conNombre = (base, nombre) => (nombre ? `${base} (${nombre})` : base);

export function BloqueTarjetas({ db, partido, local, visitante, acciones }) {
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
          />
        ))}
      </div>
    </details>
  );
}

function TarjetasDeEquipo({ db, partido, equipo, amarillas, rojas, acciones }) {
  const [nueva, setNueva] = useState(null); // 'amarilla' | 'roja' | null
  const [aviso, setAviso] = useState(null); // id de la roja con el aviso abierto
  const [borrando, setBorrando] = useState(null);

  const borrarAmarilla = async (tarjeta) => {
    setBorrando(tarjeta.id);
    await acciones.borrarTarjeta(tarjeta.id, `Se borró la amarilla del N° ${tarjeta.numeroCamiseta} de ${equipo.nombre}.`);
    setBorrando(null);
  };

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
                disabled={borrando === t.id}
                onClick={() => borrarAmarilla(t)}
              >
                <Icono nombre="basura" tamano={16} />
              </button>
            </li>
          ))}
          {rojas.map((e) => (
            <li key={`r-${e.id}`} className="tarjetas-lista__item">
              <span className="tarjeta-mini tarjeta-mini--roja" aria-hidden="true" />
              <span className="tarjetas-lista__texto">{conNombre(`Roja · N° ${e.numeroCamiseta}`, e.nombreJugador)}</span>
              <button
                type="button"
                className="btn btn--whatsapp btn--chico"
                aria-expanded={aviso === e.id}
                onClick={() => setAviso(aviso === e.id ? null : e.id)}
              >
                Avisar
              </button>
              {aviso === e.id && (
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
      {nueva ? (
        <FormTarjeta tipo={nueva} partido={partido} equipo={equipo} acciones={acciones} onListo={() => setNueva(null)} />
      ) : (
        <div className="tarjetas-equipo__botones">
          <button type="button" className="btn btn--secundario btn--chico" onClick={() => setNueva('amarilla')}>
            + Amarilla
          </button>
          <button type="button" className="btn btn--secundario btn--chico" onClick={() => setNueva('roja')}>
            + Roja
          </button>
        </div>
      )}
    </div>
  );
}

function FormTarjeta({ tipo, partido, equipo, acciones, onListo }) {
  const [numero, setNumero] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const roja = tipo === 'roja';
  const idBase = `tarjeta-${partido.id}-${equipo.id}`;

  const guardar = async (e) => {
    e.preventDefault();
    const camiseta = validarCamiseta(numero);
    if (camiseta === null) {
      setError('El número de camiseta es obligatorio (de 1 a 99).');
      return;
    }
    setGuardando(true);
    const datos = { partidoId: partido.id, equipoId: equipo.id, numeroCamiseta: camiseta, nombreJugador: nombre.trim() };
    const jugador = `N° ${camiseta} de ${equipo.nombre}`;
    const hecho = roja
      ? await acciones.crearExpulsion(datos, `Roja guardada: ${jugador}. Ya figura en Suspendidos.`)
      : await acciones.crearTarjeta(datos, `Amarilla guardada: ${jugador}.`);
    setGuardando(false);
    if (hecho) onListo();
  };

  return (
    <form className="form-tarjeta" onSubmit={guardar} noValidate aria-label={`${roja ? 'Roja' : 'Amarilla'} para ${equipo.nombre}`}>
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
        <button type="submit" className={`btn btn--chico ${roja ? 'btn--peligro' : 'btn--primario'}`} disabled={guardando}>
          {guardando ? 'Guardando…' : roja ? 'Guardar roja' : 'Guardar amarilla'}
        </button>
        <button type="button" className="btn btn--fantasma btn--chico" onClick={onListo}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
