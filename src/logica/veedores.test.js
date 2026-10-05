import { describe, expect, it } from 'vitest';
import {
  esPartidoDeVeedor,
  fechaDeVeedores,
  partidosDeCancha,
  partidosDePredio,
  partidosDeVeedor,
  resumenPartidos,
} from './veedores.js';

let ultimoId = 0;
// Partido de la cancha 2 de Los Cardales, sin resultado
const partido = (fecha, cambios = {}) => ({
  id: ++ultimoId,
  categoriaId: 1,
  fecha,
  golesLocal: null,
  golesVisitante: null,
  postergado: false,
  ausente: null,
  predio: 'los_cardales',
  cancha: 2,
  hora: '13:40',
  ...cambios,
});
const jugado = (fecha, cambios = {}) => partido(fecha, { golesLocal: 2, golesVisitante: 1, ...cambios });

// La fecha 2 está completa y la 3 en juego, en dos categorías
function armarTorneo() {
  const p = {
    jugadoFecha2: jugado(2),
    otraCategoriaFecha2: jugado(2, { categoriaId: 2, cancha: 3 }),
    cargadoFecha3: jugado(3, { hora: '15:00' }),
    pendienteFecha3: partido(3, { hora: '12:30' }),
    sinHoraFecha3: partido(3, { hora: null, predio: null, cancha: null }),
    otraCancha: partido(3, { cancha: 5 }),
    otroPredio: partido(3, { predio: 'cura_borges', cancha: 2 }),
    otraCategoriaFecha3: partido(3, { categoriaId: 2, hora: '14:00' }),
    postergado: partido(3, { hora: '16:00', postergado: true }),
    // Quedó sin cargar en la fecha 1 y no se reprogramó: ya no le aparece al veedor
    sinCargarDeFecha1: partido(1, { hora: '10:00' }),
    proximaFecha: partido(4),
    // Postergados reprogramados para un día especial (con día), jugados o no
    reprogramado: partido(1, { postergado: true, dia: '2026-10-12', hora: '10:00' }),
    reprogramadoJugado: jugado(2, { dia: '2026-10-12', hora: '11:30' }),
    reprogramadoDeFecha3Jugado: jugado(3, { dia: '2026-10-12', hora: '18:00' }),
    reprogramadoOtroDia: partido(1, { postergado: true, dia: '2026-10-19', hora: '09:00' }),
  };
  return { p, partidos: Object.values(p) };
}

describe('fecha de los veedores', () => {
  it('es la fecha en juego mirando todas las categorías juntas', () => {
    expect(fechaDeVeedores(armarTorneo().partidos)).toBe(3);
  });

  it('sin partidos es la 1', () => {
    expect(fechaDeVeedores([])).toBe(1);
  });
});

describe('partidos de una cancha', () => {
  it('trae los de la fecha en juego en esa cancha, de todas las categorías, por hora', () => {
    const { p, partidos } = armarTorneo();
    expect(partidosDeCancha(partidos, 'los_cardales', 2).map((x) => x.id)).toEqual([
      p.pendienteFecha3.id,
      p.otraCategoriaFecha3.id,
      p.cargadoFecha3.id,
    ]);
  });

  it('deja afuera otras canchas, otros predios, postergados, otras fechas y los reprogramados', () => {
    const { p, partidos } = armarTorneo();
    const ids = partidosDeCancha(partidos, 'los_cardales', 2).map((x) => x.id);
    for (const afuera of [
      p.jugadoFecha2,
      p.otraCancha,
      p.otroPredio,
      p.postergado,
      p.proximaFecha,
      p.sinCargarDeFecha1,
      p.reprogramado,
      p.reprogramadoDeFecha3Jugado,
    ]) {
      expect(ids).not.toContain(afuera.id);
    }
  });

  it('los de un predio son los de todas sus canchas', () => {
    const { p, partidos } = armarTorneo();
    expect(partidosDePredio(partidos, 'los_cardales').map((x) => x.id)).toContain(p.otraCancha.id);
    expect(partidosDePredio(partidos, 'los_cardales').map((x) => x.id)).not.toContain(p.otroPredio.id);
  });
});

describe('postergados que se recuperan en un día especial', () => {
  it('van aparte, por día y hora, jugados o no', () => {
    const { p, partidos } = armarTorneo();
    expect(partidosDeCancha(partidos, 'los_cardales', 2, 'postergados').map((x) => x.id)).toEqual([
      p.reprogramado.id,
      p.reprogramadoJugado.id,
      p.reprogramadoDeFecha3Jugado.id,
      p.reprogramadoOtroDia.id,
    ]);
    expect(partidosDePredio(partidos, 'cura_borges', 'postergados')).toEqual([]);
  });

  it('un postergado sin día todavía no se reprogramó: no aparece', () => {
    const { p, partidos } = armarTorneo();
    expect(partidosDeVeedor(partidos, 'postergados').map((x) => x.id)).not.toContain(p.postergado.id);
  });

  it('no mueven la fecha en juego', () => {
    expect(fechaDeVeedores(armarTorneo().partidos)).toBe(3);
  });
});

describe('qué partidos puede tocar un veedor', () => {
  it('los de la fecha en juego y los reprogramados, y ninguno más', () => {
    const { p, partidos } = armarTorneo();
    for (const adentro of [p.pendienteFecha3, p.reprogramado, p.reprogramadoJugado]) {
      expect(esPartidoDeVeedor(partidos, adentro.id)).toBe(true);
    }
    for (const afuera of [p.jugadoFecha2, p.postergado, p.proximaFecha, p.sinHoraFecha3, p.sinCargarDeFecha1]) {
      expect(esPartidoDeVeedor(partidos, afuera.id)).toBe(false);
    }
    expect(esPartidoDeVeedor(partidos, 9999)).toBe(false);
  });
});

describe('resumen para los botones', () => {
  it('cuenta los partidos y los que falta cargar (un W.O. ya está cargado)', () => {
    const lista = [partido(3), jugado(3), partido(3, { golesLocal: 3, golesVisitante: 0, ausente: 'visitante' })];
    expect(resumenPartidos(lista)).toEqual({ total: 3, porCargar: 1 });
    expect(resumenPartidos([])).toEqual({ total: 0, porCargar: 0 });
  });
});
