/**
 * Arancel de un partido: lo que pagó cada equipo, con su método, y cómo queda su cuenta total.
 */

import { useState } from 'react';
import { Segmentado } from '../../componentes/Segmentado.jsx';
import {
  calcularCuentas,
  estadoSaldo,
  formatearMiles,
  formatearPesos,
  hoyEnArgentina,
  leerMonto,
  METODOS_PAGO,
  pagoDePartido,
} from '../../logica/cuentas.js';

export function BloqueArancel({ db, partido, local, visitante, acciones }) {
  const arancel = db.configuracion.arancel;
  const equipos = [local, visitante];
  const cuentas = calcularCuentas({ equipos, partidos: db.partidos, movimientos: db.movimientos, arancel });
  const resumen = equipos.map((e) => `${e.nombre} ${estadoSaldo(cuentas.get(e.id).saldo).texto}`).join(' · ');

  return (
    <details className="bloque">
      <summary className="bloque__cab">
        <span className="bloque__titulo">{`Arancel (${formatearPesos(arancel)} por equipo)`}</span>
        <span className="bloque__resumen">{resumen}</span>
      </summary>
      <div className="bloque__cuerpo">
        {equipos.map((equipo) => {
          const pago = pagoDePartido(db.movimientos, partido.id, equipo.id);
          return (
            <PagoDeEquipo
              key={`${equipo.id}-${pago ? `${pago.id}-${pago.monto}-${pago.metodo}` : 'sin-pago'}`}
              partido={partido}
              equipo={equipo}
              pago={pago}
              arancel={arancel}
              saldo={cuentas.get(equipo.id).saldo}
              acciones={acciones}
            />
          );
        })}
      </div>
    </details>
  );
}

function PagoDeEquipo({ partido, equipo, pago, arancel, saldo, acciones }) {
  const [monto, setMonto] = useState(pago ? formatearMiles(pago.monto) : '');
  const [metodo, setMetodo] = useState(pago ? pago.metodo : 'efectivo');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const idMonto = `pago-${partido.id}-${equipo.id}`;
  const lado = partido.localId === equipo.id ? 'local' : 'visitante';
  const estado = estadoSaldo(saldo);

  if (partido.ausente === lado) {
    return (
      <div className="pago pago--apagado">
        <p className="pago__equipo">{equipo.nombre}</p>
        <p className="campo__ayuda">No se presentó: no paga.</p>
      </div>
    );
  }

  const valor = leerMonto(monto);
  const vacio = monto.trim() === '';
  const sinCambios = pago ? valor === pago.monto && metodo === pago.metodo : vacio;

  const guardar = async () => {
    if (!vacio && valor === null) {
      setError('Escribí el monto en pesos, por ejemplo 105.000.');
      return;
    }
    setGuardando(true);
    if (vacio) {
      await acciones.borrarMovimiento(pago.id, `Se quitó el pago de ${equipo.nombre} en este partido.`);
    } else {
      const como = metodo === 'efectivo' ? 'en efectivo' : 'por transferencia';
      const mensaje = `Pago guardado: ${equipo.nombre} pagó ${formatearPesos(valor)} ${como}.`;
      if (pago) {
        await acciones.actualizarMovimiento(pago.id, { monto: valor, metodo }, mensaje);
      } else {
        const datos = { tipo: 'pago', equipoId: equipo.id, partidoId: partido.id, monto: valor, metodo, fecha: hoyEnArgentina() };
        await acciones.crearMovimiento(datos, mensaje);
      }
    }
    setGuardando(false);
  };

  return (
    <div className="pago">
      <div className="pago__cab">
        <label className="pago__equipo" htmlFor={idMonto}>
          {equipo.nombre}
        </label>
        <span className={`saldo saldo--${estado.tipo}`}>{estado.texto}</span>
      </div>
      <div className="pago__fila">
        <div className="pago__monto">
          <span className="pago__signo" aria-hidden="true">$</span>
          <input
            id={idMonto}
            className="input"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            value={monto}
            aria-invalid={Boolean(error) || undefined}
            onChange={(e) => {
              setMonto(e.target.value.replace(/[^\d.,]/g, ''));
              setError('');
            }}
          />
        </div>
        <button
          type="button"
          className="btn btn--secundario btn--chico"
          onClick={() => {
            setMonto(formatearMiles(arancel));
            setError('');
          }}
        >
          Completo
        </button>
      </div>
      <Segmentado
        variante="chips"
        etiquetaGrupo={`Cómo pagó ${equipo.nombre}`}
        opciones={METODOS_PAGO}
        valor={metodo}
        onCambiar={setMetodo}
      />
      {error && (
        <p className="campo__error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="btn btn--primario btn--chico" disabled={guardando || sinCambios} onClick={guardar}>
        {guardando ? 'Guardando…' : vacio && pago ? 'Quitar pago' : 'Guardar pago'}
      </button>
    </div>
  );
}
