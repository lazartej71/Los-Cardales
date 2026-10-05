/**
 * Cuenta corriente de los equipos: se les cobra el arancel de cada partido jugado y las deudas
 * anteriores, y se les descuenta lo que pagaron. Funciones puras: las usan el panel y el servidor.
 */

import { tieneResultado } from './tabla.js';

export const METODOS_PAGO = [
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'transferencia', etiqueta: 'Transferencia' },
];

// Por qué un partido no se le cobra a un equipo
export const TEXTO_SIN_COBRO = {
  postergado: 'postergado',
  ausente: 'no se presentó: no paga',
  pendiente: 'se cobra cuando se juegue',
};

const MONTO_MAXIMO = 10000000;
const miles = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

// 105000 → "105.000"
export const formatearMiles = (monto) => miles.format(monto);

// 105000 → "$105.000"
export const formatearPesos = (monto) => `$${formatearMiles(monto)}`;

// Lo que escribe la persona ("95.000", "$ 95000", "95.000,00", "105,000") → número; null si no es válido.
// Un punto o una coma con 1 o 2 cifras al final son centavos y se descartan; con 3 cifras, son de miles.
export function leerMonto(texto) {
  const limpio = String(texto ?? '').replace(/[^\d.,]/g, '');
  const digitos = limpio.replace(/[.,]\d{1,2}$/, '').replace(/\D/g, '');
  if (!digitos) return null;
  const monto = Number(digitos);
  return monto >= 1 && monto <= MONTO_MAXIMO ? monto : null;
}

// Para comparar nombres sin importar mayúsculas ni tildes: "COLÓN" → "colon"
const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

// ¿El nombre contiene lo buscado? Sin texto, coinciden todos
export const coincideNombre = (nombre, busqueda) => normalizar(nombre).includes(normalizar(busqueda));

// "2026-10-15" → "15/10"
export function formatearFecha(fecha) {
  const [, mes, dia] = fecha.split('-');
  return `${dia}/${mes}`;
}

// Fecha de hoy en la Argentina, con el formato de la base ("2026-10-01")
export function hoyEnArgentina(ahora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(ahora);
}

const ladoDe = (partido, equipoId) => (partido.localId === equipoId ? 'local' : 'visitante');

// null si al equipo se le cobra el arancel de ese partido; si no, el motivo (clave de TEXTO_SIN_COBRO).
// El arancel se cobra al terminar el partido: si el equipo ya anotó un pago, se le cobra aunque
// todavía no esté cargado el resultado.
export function motivoSinCobro(partido, equipoId, conPago = false) {
  if (partido.postergado) return 'postergado';
  if (partido.ausente === ladoDe(partido, equipoId)) return 'ausente';
  if (!tieneResultado(partido) && !conPago) return 'pendiente';
  return null;
}

const ordenMetodo = (metodo) => METODOS_PAGO.findIndex((m) => m.valor === metodo);

// Los pagos anotados en un partido para un equipo: hasta uno por medio (efectivo y transferencia), en ese orden
export function pagosDePartido(movimientos, partidoId, equipoId) {
  return movimientos
    .filter((m) => m.tipo === 'pago' && m.partidoId === partidoId && m.equipoId === equipoId)
    .sort((a, b) => ordenMetodo(a.metodo) - ordenMetodo(b.metodo));
}

export const sumarMontos = (movimientos) => movimientos.reduce((total, m) => total + m.monto, 0);

/**
 * Saldo de cada equipo de la lista: Map equipoId → { cobrado, pagado, saldo }.
 * saldo mayor que 0: debe; 0: al día; menor que 0: a favor.
 */
export function calcularCuentas({ equipos, partidos, movimientos, arancel }) {
  const cuentas = new Map(equipos.map((e) => [e.id, { cobrado: 0, pagado: 0, saldo: 0 }]));
  const pagaron = new Set(
    movimientos.filter((m) => m.tipo === 'pago' && m.partidoId !== null).map((m) => `${m.partidoId}-${m.equipoId}`)
  );
  for (const partido of partidos) {
    for (const equipoId of [partido.localId, partido.visitanteId]) {
      const cuenta = cuentas.get(equipoId);
      const conPago = pagaron.has(`${partido.id}-${equipoId}`);
      if (cuenta && motivoSinCobro(partido, equipoId, conPago) === null) cuenta.cobrado += arancel;
    }
  }
  for (const movimiento of movimientos) {
    const cuenta = cuentas.get(movimiento.equipoId);
    if (!cuenta) continue;
    if (movimiento.tipo === 'pago') cuenta.pagado += movimiento.monto;
    else cuenta.cobrado += movimiento.monto;
  }
  for (const cuenta of cuentas.values()) cuenta.saldo = cuenta.cobrado - cuenta.pagado;
  return cuentas;
}

// Cómo se muestra un saldo: { tipo: 'debe' | 'al-dia' | 'a-favor', texto }
export function estadoSaldo(saldo) {
  if (saldo > 0) return { tipo: 'debe', texto: `debe ${formatearPesos(saldo)}` };
  if (saldo < 0) return { tipo: 'a-favor', texto: `a favor ${formatearPesos(-saldo)}` };
  return { tipo: 'al-dia', texto: 'al día' };
}

const porFechaEId = (a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id;

/**
 * La cuenta de un equipo en el orden de la pantalla: deudas anteriores, partidos (por número de
 * fecha) y pagos sueltos (por fecha del calendario), con el saldo total.
 */
export function detalleCuenta({ equipoId, equipos, partidos, movimientos, arancel }) {
  const propios = movimientos.filter((m) => m.equipoId === equipoId);
  const { saldo } = calcularCuentas({ equipos, partidos, movimientos, arancel }).get(equipoId);
  return {
    saldo,
    deudas: propios.filter((m) => m.tipo === 'deuda_anterior').sort(porFechaEId),
    partidos: partidos
      .filter((p) => p.localId === equipoId || p.visitanteId === equipoId)
      .sort((a, b) => a.fecha - b.fecha || a.id - b.id)
      .map((p) => {
        const pagos = pagosDePartido(propios, p.id, equipoId);
        const motivo = motivoSinCobro(p, equipoId, pagos.length > 0);
        return {
          partido: p,
          rivalId: p.localId === equipoId ? p.visitanteId : p.localId,
          cobrado: motivo === null ? arancel : 0,
          motivo,
          pagos,
        };
      }),
    pagosSueltos: propios.filter((m) => m.tipo === 'pago' && m.partidoId === null).sort(porFechaEId),
  };
}

// Renglón de un partido en la cuenta: "pagó $95.000 de $105.000 · efectivo", "sin pago · postergado",
// "pagó $105.000 de $105.000 · $50.000 efectivo + $55.000 transferencia"…
export function describirPartidoEnCuenta({ cobrado, motivo, pagos }) {
  const partes = [];
  if (pagos.length) {
    const pagado = formatearPesos(sumarMontos(pagos));
    const medios =
      pagos.length === 1 ? pagos[0].metodo : pagos.map((m) => `${formatearPesos(m.monto)} ${m.metodo}`).join(' + ');
    partes.push(motivo ? `pagó ${pagado}` : `pagó ${pagado} de ${formatearPesos(cobrado)}`, medios);
  } else {
    partes.push(motivo ? 'sin pago' : `sin pago de ${formatearPesos(cobrado)}`);
  }
  if (motivo) partes.push(TEXTO_SIN_COBRO[motivo]);
  return partes.join(' · ');
}
