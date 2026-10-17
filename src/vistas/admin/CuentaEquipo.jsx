/**
 * Cuenta corriente de un equipo: deudas anteriores, partidos y pagos sueltos, y los formularios
 * para anotar un pago suelto o una deuda anterior.
 */

import { useState } from 'react';
import { Icono } from '../../componentes/Icono.jsx';
import { Segmentado } from '../../componentes/Segmentado.jsx';
import {
  arancelDe,
  describirPartidoEnCuenta,
  detalleCuenta,
  estadoSaldo,
  formatearFecha,
  formatearPesos,
  hoyEnArgentina,
  leerMonto,
  METODOS_PAGO,
  montoAlEscribir,
} from '../../logica/cuentas.js';

export function CuentaEquipo({ db, equipo, acciones, onVolver }) {
  const [formulario, setFormulario] = useState(null); // 'pago' | 'deuda' | null
  const [aBorrar, setABorrar] = useState(null);
  const [borrando, setBorrando] = useState(false);
  const detalle = detalleCuenta({
    equipoId: equipo.id,
    equipos: db.equipos,
    partidos: db.partidos,
    movimientos: db.movimientos,
    arancel: db.configuracion.arancel,
    arancelDe: arancelDe(db),
  });
  const estado = estadoSaldo(detalle.saldo);
  const nombreDe = (id) => db.equipos.find((e) => e.id === id)?.nombre ?? '';
  const vacia = !detalle.deudas.length && !detalle.partidos.length && !detalle.pagosSueltos.length;

  const borrar = async (movimiento) => {
    setBorrando(true);
    const que = movimiento.tipo === 'pago' ? 'el pago suelto' : 'la deuda anterior';
    const hecho = await acciones.borrarMovimiento(movimiento.id, `Se borró ${que} de ${formatearPesos(movimiento.monto)}.`);
    setBorrando(false);
    if (hecho) setABorrar(null);
  };

  // Deudas anteriores y pagos sueltos: se pueden borrar, con confirmación
  const renglonMovimiento = (m, titulo) => (
    <li key={`m-${m.id}`} className="cuenta-lista__item">
      <span className="cuenta-lista__titulo">{titulo}</span>
      <span className="cuenta-lista__detalle">{formatearPesos(m.monto)}</span>
      <button
        type="button"
        className="btn-icono"
        aria-label={`Borrar: ${titulo}`}
        disabled={borrando}
        onClick={() => setABorrar(m.id)}
      >
        <Icono nombre="basura" tamano={16} />
      </button>
      {aBorrar === m.id && (
        <div className="confirmar" role="alert">
          <p>{`¿Borrar este movimiento de ${formatearPesos(m.monto)}? Usalo si se cargó por error.`}</p>
          <button type="button" className="btn btn--peligro btn--chico" onClick={() => borrar(m)} disabled={borrando}>
            Sí, borrar
          </button>
          <button type="button" className="btn btn--fantasma btn--chico" onClick={() => setABorrar(null)}>
            Cancelar
          </button>
        </div>
      )}
    </li>
  );

  return (
    <>
      <button type="button" className="enlace volver" onClick={onVolver}>
        ‹ Volver a la lista
      </button>

      <section className="panel" aria-labelledby="titulo-cuenta">
        <div className="panel__cab">
          <h3 id="titulo-cuenta" className="panel__titulo">
            {equipo.nombre}
          </h3>
          <span className={`saldo saldo--grande saldo--${estado.tipo}`}>{estado.texto}</span>
        </div>
        {vacia ? (
          <p className="vacio-texto">Todavía no tiene partidos ni pagos.</p>
        ) : (
          <ul className="cuenta-lista">
            {detalle.deudas.map((m) => renglonMovimiento(m, `Deuda anterior${m.nota ? ` · ${m.nota}` : ''}`))}
            {detalle.partidos.map((fila) => (
              <li key={`p-${fila.partido.id}`} className="cuenta-lista__item">
                <span className="cuenta-lista__titulo">{`Fecha ${fila.partido.fecha} vs ${nombreDe(fila.rivalId)}`}</span>
                <span className="cuenta-lista__detalle">{describirPartidoEnCuenta(fila)}</span>
              </li>
            ))}
            {detalle.pagosSueltos.map((m) =>
              renglonMovimiento(m, `${formatearFecha(m.fecha)} · pago suelto · ${m.metodo}${m.nota ? ` · ${m.nota}` : ''}`)
            )}
          </ul>
        )}
      </section>

      {formulario ? (
        <FormMovimiento tipo={formulario} equipo={equipo} acciones={acciones} onListo={() => setFormulario(null)} />
      ) : (
        <div className="cuenta-botones">
          <button type="button" className="btn btn--primario" onClick={() => setFormulario('pago')}>
            Anotar pago suelto
          </button>
          <button type="button" className="btn btn--secundario" onClick={() => setFormulario('deuda')}>
            Anotar deuda anterior
          </button>
        </div>
      )}
    </>
  );
}

function FormMovimiento({ tipo, equipo, acciones, onListo }) {
  const esPago = tipo === 'pago';
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState('efectivo');
  const [fecha, setFecha] = useState(() => hoyEnArgentina());
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    const valor = leerMonto(monto);
    if (valor === null) {
      setError('Escribí el monto en pesos, por ejemplo 105.000.');
      return;
    }
    if (esPago && !fecha) {
      setError('Elegí la fecha del pago.');
      return;
    }
    setGuardando(true);
    const datos = esPago
      ? { tipo: 'pago', equipoId: equipo.id, monto: valor, metodo, fecha, nota: nota.trim() }
      : { tipo: 'deuda_anterior', equipoId: equipo.id, monto: valor, fecha: hoyEnArgentina(), nota: nota.trim() };
    const mensaje = esPago
      ? `Pago suelto anotado: ${equipo.nombre} pagó ${formatearPesos(valor)}.`
      : `Deuda anterior anotada: ${formatearPesos(valor)} para ${equipo.nombre}.`;
    const hecho = await acciones.crearMovimiento(datos, mensaje);
    setGuardando(false);
    if (hecho) onListo();
  };

  return (
    <form className="panel form-movimiento" onSubmit={guardar} noValidate aria-labelledby="titulo-movimiento">
      <h3 id="titulo-movimiento" className="panel__titulo">
        {esPago ? 'Pago suelto' : 'Deuda anterior'}
      </h3>
      <div className="campo">
        <label className="campo__label" htmlFor="mov-monto">
          Monto
        </label>
        <div className="pago__monto">
          <span className="pago__signo" aria-hidden="true">$</span>
          <input
            id="mov-monto"
            className="input"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            value={monto}
            aria-invalid={Boolean(error) || undefined}
            onChange={(e) => {
              setMonto(montoAlEscribir(e.target.value));
              setError('');
            }}
          />
        </div>
      </div>
      {esPago && (
        <>
          <div className="campo">
            <span className="campo__label">Cómo pagó</span>
            <Segmentado variante="chips" etiquetaGrupo="Cómo pagó" opciones={METODOS_PAGO} valor={metodo} onCambiar={setMetodo} />
          </div>
          <div className="campo">
            <label className="campo__label" htmlFor="mov-fecha">
              Fecha
            </label>
            <input
              id="mov-fecha"
              className="input"
              type="date"
              value={fecha}
              onChange={(e) => {
                setFecha(e.target.value);
                setError('');
              }}
            />
          </div>
        </>
      )}
      <div className="campo">
        <label className="campo__label" htmlFor="mov-nota">
          Nota (opcional)
        </label>
        <input
          id="mov-nota"
          className="input"
          maxLength={100}
          autoComplete="off"
          placeholder={esPago ? 'Por ejemplo: pagó el delegado' : 'Por ejemplo: fecha 1'}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />
      </div>
      {error && (
        <p className="campo__error" role="alert">
          {error}
        </p>
      )}
      <div className="form-tarjeta__acciones">
        <button type="submit" className="btn btn--primario" disabled={guardando}>
          {guardando ? 'Guardando…' : esPago ? 'Guardar pago' : 'Guardar deuda'}
        </button>
        <button type="button" className="btn btn--fantasma" onClick={onListo}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
