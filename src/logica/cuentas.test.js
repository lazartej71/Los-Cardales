import { describe, expect, it } from 'vitest';
import {
  calcularCuentas,
  coincideNombre,
  describirPartidoEnCuenta,
  detalleCuenta,
  estadoSaldo,
  formatearFecha,
  formatearPesos,
  hoyEnArgentina,
  leerMonto,
  motivoSinCobro,
  pagoDePartido,
} from './cuentas.js';

const ARANCEL = 105000;
const equipos = [
  { id: 1, zonaId: 1, nombre: 'BRANCA' },
  { id: 2, zonaId: 1, nombre: 'BARRIO POLICIAL' },
  { id: 3, zonaId: 1, nombre: 'LA PLAZA' },
];
const partido = (id, fecha, localId, visitanteId, cambios = {}) => ({
  id,
  categoriaId: 1,
  fecha,
  localId,
  visitanteId,
  golesLocal: null,
  golesVisitante: null,
  postergado: false,
  ausente: null,
  ...cambios,
});
// Los partidos del ejemplo del diseño, vistos desde BRANCA (equipo 1)
const partidos = [
  partido(1, 2, 1, 2, { golesLocal: 2, golesVisitante: 1 }), // fecha 2, jugado
  partido(2, 3, 3, 1, { golesLocal: 0, golesVisitante: 0 }), // fecha 3, jugado (BRANCA de visitante)
  partido(3, 4, 1, 3, { postergado: true }), // fecha 4, postergado
];
let ultimoId = 0;
const pago = (equipoId, monto, cambios = {}) => ({
  id: ++ultimoId,
  equipoId,
  partidoId: null,
  tipo: 'pago',
  monto,
  metodo: 'efectivo',
  fecha: '2026-10-15',
  nota: '',
  ...cambios,
});
const deuda = (equipoId, monto, nota = 'fecha 1') => ({
  id: ++ultimoId,
  equipoId,
  partidoId: null,
  tipo: 'deuda_anterior',
  monto,
  metodo: null,
  fecha: '2026-10-01',
  nota,
});

// Deuda anterior, fecha 2 (95.000), fecha 3 (115.000), pago suelto y fecha 4 postergada ya pagada
const movimientosDelEjemplo = [
  deuda(1, 10000),
  pago(1, 95000, { partidoId: 1 }),
  pago(1, 115000, { partidoId: 2, metodo: 'transferencia' }),
  pago(1, 10000, { metodo: 'transferencia' }),
  pago(1, 105000, { partidoId: 3 }),
];
const saldoDeBranca = (movimientos, lista = partidos, arancel = ARANCEL) =>
  calcularCuentas({ equipos, partidos: lista, movimientos, arancel }).get(1).saldo;

describe('calcularCuentas', () => {
  it('sigue el ejemplo del diseño paso a paso', () => {
    const [anterior, fecha2, fecha3, suelto] = movimientosDelEjemplo;
    expect(saldoDeBranca([anterior], [])).toBe(10000);
    expect(saldoDeBranca([anterior, fecha2], partidos.slice(0, 1))).toBe(20000);
    expect(saldoDeBranca([anterior, fecha2, fecha3], partidos.slice(0, 2))).toBe(10000);
    expect(saldoDeBranca([anterior, fecha2, fecha3, suelto], partidos.slice(0, 2))).toBe(0);
    expect(saldoDeBranca(movimientosDelEjemplo)).toBe(-105000);
  });

  it('en un W.O. paga solo el que se presentó', () => {
    const wo = [partido(9, 5, 2, 1, { golesLocal: 3, golesVisitante: 0, ausente: 'visitante' })];
    const cuentas = calcularCuentas({ equipos, partidos: wo, movimientos: [], arancel: ARANCEL });
    expect(cuentas.get(1)).toEqual({ cobrado: 0, pagado: 0, saldo: 0 });
    expect(cuentas.get(2)).toEqual({ cobrado: ARANCEL, pagado: 0, saldo: ARANCEL });
  });

  it('un pago anotado en un partido sin resultado ya le cobra el arancel a ese equipo', () => {
    // Se cobra al terminar el partido: puede anotarse el pago antes de cargar el resultado
    const pendiente = [partido(9, 6, 1, 2)];
    const movimientos = [pago(1, 90000, { partidoId: 9 })];
    const cuentas = calcularCuentas({ equipos, partidos: pendiente, movimientos, arancel: ARANCEL });
    expect(cuentas.get(1)).toEqual({ cobrado: ARANCEL, pagado: 90000, saldo: 15000 });
    // El rival todavía no pagó ni hay resultado: no debe nada hasta que se cargue
    expect(cuentas.get(2)).toEqual({ cobrado: 0, pagado: 0, saldo: 0 });
    const [fila] = detalleCuenta({ equipoId: 1, equipos, partidos: pendiente, movimientos, arancel: ARANCEL }).partidos;
    expect(describirPartidoEnCuenta(fila)).toBe('pagó $90.000 de $105.000 · efectivo');
  });

  it('si el partido se posterga, lo que pagó queda a favor', () => {
    const postergado = [partido(9, 6, 1, 2, { postergado: true })];
    expect(saldoDeBranca([pago(1, ARANCEL, { partidoId: 9 })], postergado)).toBe(-ARANCEL);
  });

  it('si cambia el arancel, se recalcula todo', () => {
    expect(saldoDeBranca([], partidos.slice(0, 2), 120000)).toBe(240000);
  });

  it('ignora los movimientos de equipos que no están en la lista', () => {
    const cuentas = calcularCuentas({ equipos: [equipos[0]], partidos, movimientos: [pago(99, 5000)], arancel: ARANCEL });
    expect([...cuentas.keys()]).toEqual([1]);
  });
});

describe('motivoSinCobro', () => {
  it('dice por qué un partido no se cobra', () => {
    expect(motivoSinCobro(partidos[0], 1)).toBeNull();
    expect(motivoSinCobro(partidos[2], 1)).toBe('postergado');
    expect(motivoSinCobro(partido(9, 6, 1, 2), 1)).toBe('pendiente');
    expect(motivoSinCobro(partido(9, 6, 1, 2), 1, true)).toBeNull();
    const wo = partido(9, 5, 2, 1, { golesLocal: 3, golesVisitante: 0, ausente: 'visitante' });
    expect(motivoSinCobro(wo, 1)).toBe('ausente');
    expect(motivoSinCobro(wo, 2)).toBeNull();
  });
});

describe('detalleCuenta', () => {
  it('ordena las deudas, los partidos por fecha y los pagos sueltos', () => {
    const detalle = detalleCuenta({ equipoId: 1, equipos, partidos, movimientos: movimientosDelEjemplo, arancel: ARANCEL });
    expect(detalle.saldo).toBe(-105000);
    expect(detalle.deudas.map((m) => m.monto)).toEqual([10000]);
    expect(detalle.partidos.map((p) => [p.partido.fecha, p.rivalId, p.cobrado, p.motivo, p.pago?.monto])).toEqual([
      [2, 2, ARANCEL, null, 95000],
      [3, 3, ARANCEL, null, 115000],
      [4, 3, 0, 'postergado', 105000],
    ]);
    expect(detalle.pagosSueltos.map((m) => m.monto)).toEqual([10000]);
  });
});

describe('textos', () => {
  it('describe cada partido de la cuenta', () => {
    const efectivo = { monto: 95000, metodo: 'efectivo' };
    const transferencia = { monto: ARANCEL, metodo: 'transferencia' };
    expect(describirPartidoEnCuenta({ cobrado: ARANCEL, motivo: null, pago: efectivo })).toBe(
      'pagó $95.000 de $105.000 · efectivo'
    );
    expect(describirPartidoEnCuenta({ cobrado: ARANCEL, motivo: null, pago: null })).toBe('sin pago de $105.000');
    expect(describirPartidoEnCuenta({ cobrado: 0, motivo: 'pendiente', pago: null })).toBe(
      'sin pago · se cobra cuando se juegue'
    );
    expect(describirPartidoEnCuenta({ cobrado: 0, motivo: 'postergado', pago: transferencia })).toBe(
      'pagó $105.000 · transferencia · postergado'
    );
    expect(describirPartidoEnCuenta({ cobrado: 0, motivo: 'ausente', pago: null })).toBe(
      'sin pago · no se presentó: no paga'
    );
  });

  it('muestra saldos, pesos y fechas como en la Argentina', () => {
    expect(formatearPesos(105000)).toBe('$105.000');
    expect(estadoSaldo(10000)).toEqual({ tipo: 'debe', texto: 'debe $10.000' });
    expect(estadoSaldo(0)).toEqual({ tipo: 'al-dia', texto: 'al día' });
    expect(estadoSaldo(-5000)).toEqual({ tipo: 'a-favor', texto: 'a favor $5.000' });
    expect(formatearFecha('2026-10-15')).toBe('15/10');
  });

  it('la fecha de hoy es la de la Argentina, aunque en UTC ya sea el día siguiente', () => {
    expect(hoyEnArgentina(new Date('2026-10-02T02:30:00Z'))).toBe('2026-10-01');
  });
});

describe('leerMonto', () => {
  it('entiende los montos como los escribe la gente', () => {
    expect(leerMonto('95000')).toBe(95000);
    expect(leerMonto('95.000')).toBe(95000);
    expect(leerMonto('$ 95.000')).toBe(95000);
    expect(leerMonto('95.000,00')).toBe(95000);
  });

  it('no confunde los centavos ni la coma de miles (teclados de celular)', () => {
    expect(leerMonto('95000.00')).toBe(95000);
    expect(leerMonto('95.000.00')).toBe(95000);
    expect(leerMonto('105,000')).toBe(105000);
    expect(leerMonto('95,000')).toBe(95000);
  });

  it('rechaza vacíos, ceros y montos absurdos', () => {
    for (const texto of ['', '0', 'abc', '20.000.000']) expect(leerMonto(texto)).toBeNull();
  });
});

describe('pagoDePartido', () => {
  it('encuentra el pago de ese equipo en ese partido', () => {
    expect(pagoDePartido(movimientosDelEjemplo, 1, 1).monto).toBe(95000);
    expect(pagoDePartido(movimientosDelEjemplo, 1, 2)).toBeNull();
  });
});

describe('coincideNombre', () => {
  it('encuentra una parte del nombre sin importar mayúsculas ni tildes', () => {
    expect(coincideNombre('LA PLAZA', 'plaza')).toBe(true);
    expect(coincideNombre('COLÓN F.C', 'colon')).toBe(true);
    expect(coincideNombre('Colon', 'COLÓN')).toBe(true);
    expect(coincideNombre('BRANCA', 'plaza')).toBe(false);
  });

  it('sin texto coinciden todos', () => {
    expect(coincideNombre('BRANCA', '')).toBe(true);
    expect(coincideNombre('BRANCA', '   ')).toBe(true);
  });
});
