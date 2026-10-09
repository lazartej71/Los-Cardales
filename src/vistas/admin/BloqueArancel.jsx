/**
 * Arancel de un partido: lo que pagó cada equipo, en efectivo y por transferencia (puede ser en dos
 * partes), el total del día y cómo queda su cuenta total.
 */

import { useState } from 'react';
import {
  calcularCuentas,
  estadoSaldo,
  formatearMiles,
  formatearPesos,
  hoyEnArgentina,
  leerMonto,
  METODOS_PAGO,
  montoAlEscribir,
  pagosDePartido,
  sumarMontos,
} from '../../logica/cuentas.js';

const conMedio = { efectivo: 'en efectivo', transferencia: 'por transferencia' };

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
          const pagos = pagosDePartido(db.movimientos, partido.id, equipo.id);
          return (
            <PagoDeEquipo
              key={`${equipo.id}-${pagos.map((m) => `${m.id}-${m.monto}-${m.metodo}`).join('-')}`}
              partido={partido}
              equipo={equipo}
              pagos={pagos}
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

function PagoDeEquipo({ partido, equipo, pagos, arancel, saldo, acciones }) {
  const pagoCon = (metodo) => pagos.find((m) => m.metodo === metodo) ?? null;
  const [montos, setMontos] = useState(() =>
    Object.fromEntries(METODOS_PAGO.map(({ valor }) => [valor, pagoCon(valor) ? formatearMiles(pagoCon(valor).monto) : '']))
  );
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
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

  // Cada parte: el monto escrito (null si está vacío) y el pago que ya había con ese medio
  const partes = METODOS_PAGO.map(({ valor: metodo, etiqueta }) => {
    const texto = montos[metodo].trim();
    const monto = texto ? leerMonto(texto) : null;
    return { metodo, etiqueta, texto, monto, mal: Boolean(texto) && monto === null, pago: pagoCon(metodo) };
  });
  const invalida = partes.some((p) => p.mal);
  const total = sumarMontos(partes.filter((p) => p.monto !== null));
  const todoVacio = partes.every((p) => !p.texto);
  const sinCambios = partes.every((p) => (p.pago ? p.monto === p.pago.monto : !p.texto));

  const cambiar = (metodo, texto) => {
    setMontos((m) => ({ ...m, [metodo]: montoAlEscribir(texto) }));
    setError('');
  };

  // Completa en efectivo lo que falta para llegar al arancel
  const completar = () => {
    const transferencia = partes.find((p) => p.metodo === 'transferencia').monto ?? 0;
    cambiar('efectivo', arancel > transferencia ? formatearMiles(arancel - transferencia) : '');
  };

  const guardar = async () => {
    if (invalida) {
      setError('Escribí el monto en pesos, por ejemplo 105.000.');
      return;
    }
    const conMonto = partes.filter((p) => p.monto !== null);
    const detalle =
      conMonto.length === 1
        ? conMedio[conMonto[0].metodo]
        : `(${conMonto.map((p) => `${formatearPesos(p.monto)} ${conMedio[p.metodo]}`).join(' + ')})`;
    const mensaje = todoVacio
      ? `Se quitó el pago de ${equipo.nombre} en este partido.`
      : `Pago guardado: ${equipo.nombre} pagó ${formatearPesos(total)} ${detalle}.`;
    setGuardando(true);
    await acciones.guardarPagos(
      { partidoId: partido.id, equipoId: equipo.id, fecha: hoyEnArgentina(), partes },
      mensaje
    );
    setGuardando(false);
  };

  return (
    <div className="pago">
      <div className="pago__cab">
        <p className="pago__equipo">{equipo.nombre}</p>
        <span className={`saldo saldo--${estado.tipo}`}>{estado.texto}</span>
      </div>
      {partes.map(({ metodo, etiqueta, mal }) => {
        const id = `pago-${partido.id}-${equipo.id}-${metodo}`;
        return (
          <div key={metodo} className="pago__fila pago__medio">
            <label className="pago__etiqueta" htmlFor={id}>
              {etiqueta}
            </label>
            <div className="pago__monto">
              <span className="pago__signo" aria-hidden="true">$</span>
              <input
                id={id}
                className="input"
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                value={montos[metodo]}
                aria-invalid={(Boolean(error) && mal) || undefined}
                onChange={(e) => cambiar(metodo, e.target.value)}
              />
            </div>
            {metodo === 'efectivo' && (
              <button type="button" className="btn btn--secundario btn--chico" onClick={completar}>
                Completo
              </button>
            )}
          </div>
        );
      })}
      <p className="pago__total">{`Total del día: ${formatearPesos(total)}`}</p>
      {error && (
        <p className="campo__error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="btn btn--primario btn--chico" disabled={guardando || sinCambios} onClick={guardar}>
        {guardando ? 'Guardando…' : todoVacio && pagos.length ? 'Quitar pago' : 'Guardar pago'}
      </button>
    </div>
  );
}
